/* Export de la dataviz ouverte dans l'éditeur : PNG (transparent ou avec le fond de la colonne), JPG et SVG.
   PNG et JPG passent par `rasterizeNode` (raster.js : même rendu que l'aperçu 3D, polices embarquées) à la résolution choisie
   (1 px CSS = 1/96 pouce, donc 300 dpi = ×3,125) ; la densité est écrite dans le fichier (pHYs / JFIF) pour que l'image se place à la bonne taille.
   Le SVG est vectoriel : graphique, titre et source en vrais textes, styles résolus (couleurs, polices) ; sans le chiffre à côté (du HTML). */
import { h, ico } from './render.js';
import { cssVars } from './tokens.js';
import { rasterizeNode, XML_BAD } from './raster.js';
import { alertBox } from './dialogs.js';
import { t } from './i18n.js';

const MARGIN = 4; // px CSS autour du dessin : les traits de bord (légende, axes) ne sont pas rognés
const KEY = 'factsheet-creator-viz-export';
const FORMATS = {
  'png-t': {
    label: 'PNG transparent',
    note: 'Fond transparent, à placer sur un autre document (Illustrator, InDesign, Keynote…).',
    ext: 'png',
  },
  png: { label: 'PNG avec fond', note: 'Image avec le fond de la colonne.', ext: 'png' },
  jpg: { label: 'JPG', note: 'Image sans transparence, avec le fond de la colonne : léger, pour l’impression ou le web.', ext: 'jpg' },
  svg: {
    label: 'SVG vectoriel',
    note: 'Graphique modifiable dans Illustrator ou Figma, titre et source en texte. Le chiffre à côté n’est pas inclus.',
    ext: 'svg',
  },
};
const DPIS = { 150: 'Écran / bureautique · 150 dpi', 300: 'Impression · 300 dpi' };
const pref = () => {
  let p = {};
  try {
    p = JSON.parse(localStorage.getItem(KEY) || '{}');
  } catch (e) {
    /* préférences non lues */
  }
  return { format: FORMATS[p.format] ? p.format : 'png-t', dpi: DPIS[p.dpi] ? +p.dpi : 300, head: p.head !== false };
};
const savePref = (p) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch (e) {
    /* préférence non gardée */
  }
};

/* ---- densité écrite dans le fichier ---- */
const CRC = (() => {
  const T = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    T[n] = c >>> 0;
  }
  return (b) => {
    let c = 0xffffffff;
    for (const x of b) c = T[(c ^ x) & 255] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
})();
/** PNG : insère le bloc pHYs (pixels par mètre) juste après IHDR */
function pngDpi(bytes, dpi) {
  const ppm = Math.round(dpi / 0.0254),
    chunk = new Uint8Array(21),
    dv = new DataView(chunk.buffer);
  dv.setUint32(0, 9);
  chunk.set([0x70, 0x48, 0x59, 0x73], 4); // « pHYs »
  dv.setUint32(8, ppm);
  dv.setUint32(12, ppm);
  chunk[16] = 1; // unité : mètre
  dv.setUint32(17, CRC(chunk.subarray(4, 17)));
  const out = new Uint8Array(bytes.length + 21);
  out.set(bytes.subarray(0, 33)); // signature + IHDR
  out.set(chunk, 33);
  out.set(bytes.subarray(33), 54);
  return out;
}
/** JPG : renseigne la densité dans l'en-tête JFIF (octets 13 à 17) quand il existe */
function jpgDpi(bytes, dpi) {
  const out = bytes.slice();
  if (out[2] === 0xff && out[3] === 0xe0 && String.fromCharCode(...out.subarray(6, 10)) === 'JFIF') {
    out[13] = 1; // points par pouce
    out[14] = out[16] = dpi >> 8;
    out[15] = out[17] = dpi & 255;
  }
  return out;
}

const download = (blob, name) => {
  const a = h('a', { href: URL.createObjectURL(blob), download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
};
const toBlob = (canvas, type, q) => new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('image vide'))), type, q));

/* ---- SVG vectoriel : copie du <svg> rendu, styles calculés écrits en attributs (var(--c-…), currentColor et feuilles de style n'existent plus hors de l'app) ---- */
const SHAPES = new Set(['path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon']);
const TEXTS = new Set(['text', 'tspan']);
function svgClone(live) {
  const clone = live.cloneNode(true);
  const A = [live, ...live.querySelectorAll('*')],
    B = [clone, ...clone.querySelectorAll('*')];
  A.forEach((el, i) => {
    const e = B[i],
      tag = el.localName,
      cs = getComputedStyle(el);
    for (const a of [...e.attributes]) if (a.name === 'style' || a.name.startsWith('data-')) e.removeAttribute(a.name);
    const set = (k, v, skip) => {
      if (v != null && v !== '' && v !== skip) e.setAttribute(k, v);
    };
    if (SHAPES.has(tag) || TEXTS.has(tag)) {
      set('fill', cs.fill);
      set('stroke', cs.stroke);
      if (cs.stroke !== 'none') {
        set('stroke-width', cs.strokeWidth);
        set('stroke-linejoin', cs.strokeLinejoin, 'miter');
        set('stroke-linecap', cs.strokeLinecap, 'butt');
        set('stroke-dasharray', cs.strokeDasharray, 'none');
        set('stroke-opacity', cs.strokeOpacity, '1');
      }
      set('fill-opacity', cs.fillOpacity, '1');
      set('paint-order', cs.paintOrder, 'normal');
    }
    if (TEXTS.has(tag)) {
      set('font-family', cs.fontFamily);
      set('font-size', cs.fontSize);
      set('font-weight', cs.fontWeight);
      set('font-style', cs.fontStyle, 'normal');
      set('letter-spacing', cs.letterSpacing, 'normal');
      set('text-anchor', cs.textAnchor, 'start');
    }
    set('opacity', cs.opacity, '1');
    // conteneurs (svg, g) : un fill / stroke hérité écrit en var() ou currentColor est remplacé par la couleur réelle
    for (const k of ['fill', 'stroke']) if (/currentColor|var\(/.test(e.getAttribute(k) || '')) e.setAttribute(k, cs[k]);
  });
  // le rendu ajoute parfois « null » (zones de réordonnancement absentes hors éditeur) : texte parasite hors des <text>
  const walk = (n) => {
    for (const c of [...n.childNodes]) {
      if (c.nodeType === 3 && !TEXTS.has(n.localName)) c.remove();
      else if (c.nodeType === 1) walk(c);
    }
  };
  walk(clone);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('overflow', 'visible');
  return clone;
}
const NS = 'http://www.w3.org/2000/svg';
const svgEl = (tag, attrs) => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) e.setAttribute(k, v);
  return e;
};
const ctx2d = document.createElement('canvas').getContext('2d');
/** Texte HTML (titre, source) → <text> SVG : une ligne = un <text> positionné au pixel près d'après les rectangles du navigateur (retours à la ligne, exposants, gras, couleurs conservés ; soulignement, barré et surlignage redessinés). */
function htmlTextToSvg(root, origin) {
  const out = [],
    walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT),
    range = document.createRange();
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!n.data.trim()) continue;
    const cs = getComputedStyle(n.parentElement),
      size = parseFloat(cs.fontSize);
    ctx2d.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const asc = ctx2d.measureText('Hg').fontBoundingBoxAscent || size * 0.9;
    const lines = [];
    for (let i = 0; i < n.data.length; i++) {
      range.setStart(n, i);
      range.setEnd(n, i + 1);
      const r = range.getClientRects()[0];
      if (!r || (!r.width && n.data[i] !== ' ')) continue;
      let L = lines[lines.length - 1];
      if (!L || Math.abs(L.top - r.top) > size * 0.4)
        lines.push((L = { top: r.top, left: r.left, right: r.right, bottom: r.bottom, s: '' }));
      L.s += n.data[i];
      L.right = r.right;
    }
    const up = cs.textTransform === 'uppercase';
    for (const L of lines) {
      let str = L.s.replace(/\s+/g, ' ').trim();
      if (!str) continue;
      if (up) str = str.toLocaleUpperCase();
      const x = L.left - origin.left,
        y = L.top - origin.top + asc,
        w = L.right - L.left;
      const bgc = cs.backgroundColor;
      if (bgc && bgc !== 'rgba(0, 0, 0, 0)' && bgc !== 'transparent')
        out.push(svgEl('rect', { x, y: L.top - origin.top, width: w, height: L.bottom - L.top, fill: bgc }));
      const t = svgEl('text', {
        x,
        y,
        fill: cs.color,
        'font-family': cs.fontFamily,
        'font-size': cs.fontSize,
        'font-weight': cs.fontWeight,
        'font-style': cs.fontStyle === 'normal' ? null : cs.fontStyle,
        'letter-spacing': cs.letterSpacing === 'normal' ? null : cs.letterSpacing,
      });
      t.setAttribute('xml:space', 'preserve');
      t.textContent = str;
      out.push(t);
      const deco = cs.textDecorationLine || '';
      const line = (yy) => svgEl('line', { x1: x, x2: x + w, y1: yy, y2: yy, stroke: cs.color, 'stroke-width': Math.max(0.5, size / 16) });
      if (deco.includes('underline')) out.push(line(y + size * 0.12));
      if (deco.includes('line-through')) out.push(line(y - size * 0.3));
    }
  }
  return out;
}
/** SVG autonome d'une dataviz rendue : le graphique seul, ou — quand le rendu a un titre ou une source (`.viz-wrap`) — le tout dans un seul SVG (graphique imbriqué + textes). Le nœud doit être dans le document (styles calculés). */
function vizToSvg(node) {
  let body;
  if (node.localName === 'svg') body = svgClone(node);
  else {
    const chart = node.querySelector('svg');
    if (!chart) throw new Error('pas de dessin vectoriel');
    const o = node.getBoundingClientRect(),
      c = chart.getBoundingClientRect();
    body = svgEl('svg', { xmlns: NS, width: o.width, height: o.height, viewBox: `0 0 ${o.width} ${o.height}`, overflow: 'visible' });
    const inner = svgClone(chart);
    inner.setAttribute('x', c.left - o.left);
    inner.setAttribute('y', c.top - o.top);
    body.append(inner);
    for (const sel of ['.viz-title', '.viz-source']) {
      const el = node.querySelector(sel);
      if (el) body.append(...htmlTextToSvg(el, o));
    }
  }
  return '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(body).replace(XML_BAD, ' ');
}

/** Ouvre la boîte d'export. `render(viz)` → { node } : rendu de l'éditeur (sans `ui`) à la largeur choisie ; `bg` : fond de la colonne (`var(--c-…)` ou blanc). */
export function openVizExport({ root, viz, doc, width, bgCss, render, fileStem }) {
  const p = pref(),
    hasHead = !!((viz.head && viz.head.title) || (viz.head && viz.head.source)),
    vars = cssVars(doc.theme, doc.colors, doc.density);
  const dlg = h('dialog', { class: 'vexp', 'aria-label': t('Exporter la dataviz') });
  const go = h('button', { type: 'button', class: 'primary' });
  const info = h('p', { class: 'tip', role: 'status' });
  const sizeNote = () => {
    const f = FORMATS[p.format];
    if (f.ext === 'svg')
      return t(
        'Dessin vectoriel : sans perte à toutes les tailles. Les polices ne sont pas incorporées (Source Sans 3 et Source Serif 4 doivent être installées).',
      );
    const full = width + 2 * MARGIN,
      w = Math.round((full * p.dpi) / 96);
    return `${w} px de large · ${((full / 96) * 2.54).toFixed(1).replace('.', ',')} cm à ${p.dpi} dpi`;
  };
  function build() {
    const f = FORMATS[p.format];
    dlg.replaceChildren(
      ...[
        h('h3', { textContent: t('Exporter la dataviz') }),
        h('h4', { textContent: t('Format du fichier') }),
        ...Object.entries(FORMATS).map(([k, o]) =>
          h(
            'label',
            { class: 'opt' },
            h('input', { type: 'radio', name: 'vexp-f', checked: k === p.format, onchange: () => ((p.format = k), savePref(p), build()) }),
            ' ' + t(o.label),
            h('small', { textContent: t(o.note) }),
          ),
        ),
        ...(f.ext !== 'svg'
          ? [
              h('h4', { textContent: t('Résolution') }),
              ...Object.entries(DPIS).map(([k, l]) =>
                h(
                  'label',
                  { class: 'opt' },
                  h('input', {
                    type: 'radio',
                    name: 'vexp-d',
                    checked: +k === p.dpi,
                    onchange: () => ((p.dpi = +k), savePref(p), build()),
                  }),
                  ' ' + t(l),
                ),
              ),
            ]
          : []),
        hasHead
          ? h(
              'label',
              { class: 'opt' },
              h('input', { type: 'checkbox', checked: p.head, onchange: (e) => ((p.head = e.target.checked), savePref(p)) }),
              ' ' + t('Inclure le titre et la source'),
            )
          : null,
        ((info.textContent = sizeNote()), info),
        h('div', { class: 'row' }, h('button', { type: 'button', textContent: t('Annuler'), onclick: () => dlg.close() }), go),
      ].filter(Boolean), // replaceChildren écrirait « null » pour une valeur vide
    );
    go.replaceChildren(ico('download'), h('span', { textContent: t('Télécharger') + ' ' + f.ext.toUpperCase() }));
  }
  go.onclick = async () => {
    const f = FORMATS[p.format],
      label = go.innerHTML;
    go.disabled = true;
    go.textContent = t('Génération…');
    try {
      const v = { ...viz };
      if (!p.head) v.head = { ...(viz.head || {}), title: '', source: '' };
      if (f.ext === 'svg' && viz.side) v.side = { ...viz.side, pos: 'none' };
      const r = render(v);
      if (!r || !r.node) throw new Error('rendu impossible');
      const name = fileStem('_dataviz-' + viz.kind) + '.' + f.ext;
      // couleur réelle du fond de la colonne (la variable CSS n'existe pas hors de l'app)
      const probe = h('div', { style: { background: bgCss, display: 'none' } });
      Object.entries(vars).forEach(([k, x]) => probe.style.setProperty(k, x));
      root.append(probe);
      probe.style.display = 'block';
      const bg = getComputedStyle(probe).backgroundColor;
      probe.remove();
      const solid = p.format !== 'png-t' ? bg : null;
      if (f.ext === 'svg') {
        const stage = h(
          'div',
          { class: 'page', style: { position: 'absolute', left: '-20000px', top: '0', width: width + 'px', height: 'auto' } },
          r.node,
        );
        Object.entries(vars).forEach(([k, x]) => stage.style.setProperty(k, x));
        document.body.append(stage);
        let text;
        try {
          text = vizToSvg(r.node);
        } finally {
          stage.remove();
        }
        download(new Blob([text], { type: 'image/svg+xml' }), name);
      } else {
        const { canvas } = await rasterizeNode(r.node, { width, vars, scale: p.dpi / 96, fill: solid, margin: MARGIN });
        const jpg = f.ext === 'jpg';
        const blob = await toBlob(canvas, jpg ? 'image/jpeg' : 'image/png', 0.95);
        const bytes = new Uint8Array(await blob.arrayBuffer());
        download(new Blob([jpg ? jpgDpi(bytes, p.dpi) : pngDpi(bytes, p.dpi)], { type: blob.type }), name);
      }
      dlg.close();
    } catch (e) {
      console.error('export dataviz', e);
      await alertBox(t('Impossible d’exporter la dataviz dans ce navigateur.') + ' (' + (e && e.message) + ')');
    } finally {
      go.disabled = false;
      go.innerHTML = label;
    }
  };
  dlg.addEventListener('close', () => dlg.remove());
  root.append(dlg);
  build();
  dlg.showModal();
}
