/* Pictogrammes : quatre variantes (barres, barres verticales, simple vertical, simple horizontal), un pictogramme au choix
   (bibliothèque ou SVG importé, stocké dans le JSON de la dataviz). */
import { VIZ, TYPE } from '../tokens.js';
import { reorderHit, s, el, SW, colorRef, pxOf, fmt, SANS, drawLegend, fitText, mw, heightOf, round3 } from './util.js';
import { ICONS, customList, customChoices, ctxIcons } from './icons.js';
import { iconSelect } from '../iconselect.js';
import { t } from '../i18n.js';
import { alertBox } from '../dialogs.js';

/* ---------- pictogrammes pleins ---------- */
export const PICTOS = {
  person: { label: 'Personne', vb: [0, 0, 24, 24], d: 'M12 2.5a4 4 0 1 0 0 8a4 4 0 1 0 0-8zM4.5 22v-5a7.5 7.5 0 0 1 15 0v5z' },
  circle: { label: 'Rond', vb: [0, 0, 24, 24], d: 'M12 2a10 10 0 1 0 0 20a10 10 0 1 0 0-20z' },
  square: { label: 'Carré', vb: [0, 0, 24, 24], d: 'M3 3h18v18H3z' },
  heart: { label: 'Cœur', vb: [0, 0, 24, 24], d: 'M12 21C5 15.5 2 12 2 8.2A5.2 5.2 0 0 1 12 6a5.2 5.2 0 0 1 10 2.2C22 12 19 15.5 12 21z' },
  house: { label: 'Maison', vb: [0, 0, 24, 24], d: 'M12 2.5L2 11.5h3V21h5.5v-6h3v6H19v-9.5h3z' },
  star: { label: 'Étoile', vb: [0, 0, 24, 24], d: 'M12 2l3 6.6 7.2.8-5.4 4.8 1.6 7.1L12 17.6 5.6 21.3l1.6-7.1L1.8 9.4 9 8.6z' },
};
export const pictoChoices = (o, icons) => ({
  ...Object.fromEntries(Object.entries(PICTOS).map(([k, v]) => [`picto:${k}`, t(v.label)])),
  ...customChoices(o, icons),
  ...Object.fromEntries(Object.entries(ICONS).map(([k, v]) => [`icon:${k}`, `${t('Trait')} · ${t(v.label)}`])),
});

/* ---------- import d'un SVG : nettoyage (ni script, ni image distante) puis stockage du contenu ---------- */
/** retire d'un arbre SVG tout ce qui exécute du code ou charge une ressource externe ; appelé à l'import ET à chaque rendu
    (un document ouvert depuis un fichier ou publié par l'Atelier n'est pas passé par l'import) */
export function cleanSvgTree(root) {
  root
    .querySelectorAll('script,foreignObject,iframe,object,embed,animate,animateTransform,animateMotion,set,image,audio,video')
    .forEach((n) => n.remove());
  root.querySelectorAll('style').forEach((n) => {
    if (/@import|url\((?!\s*['"]?#)/i.test(n.textContent)) n.remove();
  });
  [root, ...root.querySelectorAll('*')].forEach((n) =>
    [...n.attributes].forEach((a) => {
      const ln = a.name.toLowerCase();
      if (ln.startsWith('on')) n.removeAttribute(a.name);
      else if ((ln === 'href' || ln.endsWith(':href')) && !a.value.startsWith('#')) n.removeAttribute(a.name);
      else if (/url\((?!\s*['"]?#)/i.test(a.value) || /javascript:/i.test(a.value)) n.removeAttribute(a.name);
    }),
  );
  return root;
}
const SAFE_IMG = /^data:image\/(png|jpe?g|gif|webp);base64,/i;
export function sanitizeSvg(text, name = 'icon') {
  if (text.length > 400000) throw new Error('trop lourd');
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml'),
    svg = doc.documentElement;
  if (!svg || svg.nodeName.toLowerCase() !== 'svg' || doc.querySelector('parsererror')) throw new Error('svg illisible');
  cleanSvgTree(doc.documentElement);
  let vb = (svg.getAttribute('viewBox') || '').split(/[\s,]+/).map(Number);
  if (vb.length !== 4 || vb.some(isNaN)) {
    const w = parseFloat(svg.getAttribute('width')),
      h = parseFloat(svg.getAttribute('height'));
    vb = [0, 0, w || 24, h || 24];
  }
  const inner = [...svg.childNodes]
    .map((n) => new XMLSerializer().serializeToString(n))
    .join('')
    .replace(/ xmlns(:\w+)?="[^"]*"/g, '');
  return { id: 'c' + Math.random().toString(36).slice(2, 8), name: name.replace(/\.svg$/i, '').slice(0, 40), vb, markup: inner };
}

/** Nœud <svg> imbriqué (x, y, w, h) contenant le pictogramme, de couleur `color` ; icons : bibliothèque du document (rc.icons) */
export function iconNode(o, key, x, y, w, h, color, icons) {
  const [kind, id] = String(key || 'picto:person').split(':');
  let vb = [0, 0, 24, 24],
    inner = null;
  const col = colorRef(color);
  const svg = s('svg', {
    x,
    y,
    width: w,
    height: h,
    viewBox: '0 0 24 24',
    preserveAspectRatio: 'xMidYMid meet',
    style: { overflow: kind === 'custom' ? 'hidden' : 'visible' },
  });
  if (kind === 'icon')
    svg.append(
      s('path', {
        d: (ICONS[id] || ICONS.check).d,
        fill: 'none',
        stroke: col,
        'stroke-width': 1.6,
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
      }),
    );
  else if (kind === 'custom') {
    const c = customList(o, icons).find((k) => k.id === id);
    if (c && c.img && SAFE_IMG.test(c.img)) {
      svg.setAttribute('viewBox', c.vb.join(' '));
      svg.append(s('image', { href: c.img, x: 0, y: 0, width: c.vb[2], height: c.vb[3], preserveAspectRatio: 'xMidYMid meet' }));
    } else if (c) {
      svg.setAttribute('viewBox', c.vb.join(' '));
      svg.setAttribute('fill', col);
      const tmp = cleanSvgTree(
        new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg">${c.markup}</svg>`, 'image/svg+xml').documentElement,
      );
      if (o.recolor !== false)
        tmp.querySelectorAll('*').forEach((n) => {
          const f = n.getAttribute('fill'),
            st = n.getAttribute('stroke');
          if (f && f !== 'none') n.removeAttribute('fill');
          if (st && st !== 'none') n.setAttribute('stroke', col);
          n.removeAttribute('style');
        });
      [...tmp.childNodes].forEach((n) => svg.append(document.importNode(n, true)));
    }
  } else {
    const p = PICTOS[id] || PICTOS.person;
    svg.append(s('path', { d: p.d, fill: col }));
  }
  return svg;
}
/** pictogramme rempli à `frac` (0–1) : fond estompé + copie découpée ; dir = 'v' (de bas en haut) ou 'h' (de gauche à droite) ;
    env.rc : icônes du document et identifiant du clipPath */
function partial(o, key, x, y, w, h, color, frac, dir, env) {
  const icons = env.rc.icons;
  frac = Math.max(0, Math.min(1, frac));
  const g = s('g');
  g.append(s('g', { opacity: 0.22 }, iconNode(o, key, x, y, w, h, color, icons)));
  if (frac <= 0) return g;
  if (frac >= 1) {
    g.append(iconNode(o, key, x, y, w, h, color, icons));
    return g;
  }
  const id = env.rc.uid('pc');
  const r = dir === 'v' ? { x, y: y + h * (1 - frac), width: w, height: h * frac } : { x, y, width: w * frac, height: h };
  g.append(s('clipPath', { id }, s('rect', r)), s('g', { 'clip-path': `url(#${id})` }, iconNode(o, key, x, y, w, h, color, icons)));
  return g;
}

/** Importe un fichier SVG dans la bibliothèque du document `icons` (doc.customIcons, nettoyé) ; renvoie l'icône ou null */
export async function importSvgFile(file, icons) {
  try {
    let c;
    if (/^image\/(png|jpe?g|webp|gif)$/i.test(file.type) || /\.(png|jpe?g|webp|gif)$/i.test(file.name))
      c = await rasterIcon(file); // image (drapeau…) : réduite à 256 px, stockée en data URL
    else c = sanitizeSvg(await file.text(), file.name);
    icons.push(c);
    return c;
  } catch (e) {
    alertBox(t('Image illisible ou trop lourde.'));
    return null;
  }
}
/** Image PNG / JPEG… → icône de la bibliothèque : { id, name, vb, img } */
async function rasterIcon(file) {
  const url = URL.createObjectURL(file);
  try {
    const im = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    const k = Math.min(1, 256 / Math.max(im.naturalWidth, im.naturalHeight)),
      w = Math.max(1, Math.round(im.naturalWidth * k)),
      h = Math.max(1, Math.round(im.naturalHeight * k));
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    cv.getContext('2d').drawImage(im, 0, 0, w, h);
    return {
      id: 'c' + Math.random().toString(36).slice(2, 8),
      name: file.name.replace(/\.\w+$/, '').slice(0, 40),
      vb: [0, 0, w, h],
      img: cv.toDataURL('image/png'),
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}
/** Bouton d'import + liste des icônes importées (retrait) + recoloration : commun à tous les types */
function importParts(o, ctx, hint) {
  const ico = (n) => el('i', { class: 'ti ti-' + n });
  const inp = el('input', {
    type: 'file',
    accept: '.svg,image/svg+xml,image/png,image/jpeg,image/webp,image/gif',
    hidden: true,
    onchange: async () => {
      const f = inp.files[0];
      inp.value = '';
      if (f && (await importSvgFile(f, ctxIcons(ctx)))) ctx.restructure();
    },
  });
  return [
    el(
      'button',
      { type: 'button', class: 'pp-btn', onclick: () => inp.click() },
      ico('upload'),
      el('span', { textContent: t('Importer une icône ou une image…') }),
    ),
    inp,
    el(
      'label',
      { class: 'row' },
      el('input', {
        type: 'checkbox',
        checked: o.recolor !== false,
        onchange: (e) => {
          o.recolor = e.target.checked;
          ctx.changed();
        },
      }),
      t('Recolorer le SVG importé avec la couleur choisie'),
    ),
    hint ? el('p', { class: 'hint', textContent: t(hint) }) : null,
  ].filter(Boolean);
}
/** Carte « Pictogramme » de l'éditeur : choix du pictogramme et import d'un SVG */
export function pictoPanel(o, ctx) {
  const sel = iconSelect({
    value: o.icon || 'picto:person',
    options: pictoChoices(o, ctxIcons(ctx)),
    text: true,
    root: o,
    icons: ctxIcons(ctx),
    refresh: () => ctx.restructure(),
    onChange: (v) => {
      o.icon = v;
      ctx.changed();
    },
  });
  return [el('div', { class: 'f' }, el('div', { class: 'hint', textContent: t('Pictogramme') }), sel), ...importParts(o, ctx)];
}
/** Import d'icônes SVG (liste à icônes, barres…) : les icônes importées sont communes à tout le document */
export function iconImportPanel(o, ctx) {
  return importParts(o, ctx);
}

const VARIANTS = {
  rows: { label: 'Pictogrammes · barres', icon: 'layout-list' },
  cols: { label: 'Pictogrammes · barres verticales', icon: 'layout-columns' },
  single_v: { label: 'Pictogramme simple vertical', icon: 'arrow-bar-up' },
  single_h: { label: 'Pictogramme simple horizontal', icon: 'arrow-bar-right' },
};

function make(variant) {
  const multi = variant === 'rows' || variant === 'cols';
  return {
    label: VARIANTS[variant].label,
    icon: VARIANTS[variant].icon,
    family: 'picto',
    boxed: variant === 'rows' || variant === 'cols',
    defaults: () => ({
      icon: 'picto:person',
      color: 'blue',
      recolor: true,
      customIcons: [],
      perIcon: multi ? 10 : 100,
      showValues: true,
      decimals: 0,
      suffix: multi ? '' : ' %',
      ratio: '3:2',
      rows: [
        ['Women', 62, ''],
        ['Men', 48, ''],
        ['Young people', 35, ''],
        ['Seniors', 21, ''],
      ].map(([label, value, color]) => ({ label, value, color })),
    }),
    heights: multi ? ['auto', 'fixed', 'fill'] : ['ratio', 'fixed', 'fill'],
    fields: [
      {
        k: 'perIcon',
        g: 'struct',
        t: 'number',
        label: multi ? 'Valeur d’un pictogramme' : 'Valeur du pictogramme plein (ex. 100)',
        min: 0.0001,
        step: 'any',
      },
      { k: 'color', g: 'colors', t: 'color', label: 'Couleur des pictogrammes' },
      { k: 'showValues', g: 'labels', t: 'bool', label: 'Afficher les valeurs' },
      { k: 'decimals', g: 'labels', t: 'number', label: 'Décimales des valeurs', min: 0, max: 4 },
      { k: 'suffix', g: 'labels', t: 'text', label: 'Unité après la valeur (%, M€…)' },
    ].concat(
      multi
        ? []
        : [
            {
              k: 'ratio',
              t: 'select',
              label: 'Format du graphique',
              options: { '2:1': '2:1 (large)', '16:9': '16:9', '3:2': '3:2', '1:1': '1:1 (carré)' },
            },
          ],
    ),
    data: {
      k: 'rows',
      min: 1,
      cols: [
        { k: 'label', label: 'Libellé', t: 'text' },
        { k: 'value', label: 'Valeur', t: 'number', def: 10 },
        { k: 'color', label: 'Couleur', t: 'color', auto: true, def: '' },
      ],
      item: () => ({ label: '', value: 10, color: '' }),
    },
    /* choix du pictogramme et import SVG (carte « Pictogramme » de l'éditeur) */
    panel: pictoPanel,
    render(o, W, env) {
      const rows = (o.rows || []).map((r) => ({
        label: String(r.label || ''),
        value: Math.max(0, +r.value || 0),
        color: r.color || o.color || 'blue',
      }));
      const capPx = pxOf(TYPE.caption.size),
        numPx = pxOf(TYPE.captionNum.size),
        suffix = o.suffix || '',
        per = +o.perIcon > 0 ? +o.perIcon : 1,
        G = 3;
      const val = (v) => fmt(v, env.locale, o.decimals) + suffix,
        valTxt = (x, y, v, anchor = 'start') =>
          s(
            'text',
            { x, y, 'text-anchor': anchor, 'font-size': numPx, 'font-weight': 700, style: { fontFamily: 'var(--t-captionNum-family)' } },
            val(v),
          );
      const mk = (H) => s('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, style: { display: 'block', overflow: 'visible' } });
      if (!rows.length) {
        const v = mk(40);
        v.append(s('text', { x: 0, y: capPx, 'font-size': capPx }, t('Aucune donnée')));
        return { node: v };
      }
      const label = (txt, x, y, maxW, anchor = 'start') => {
        const f = fitText(txt, TYPE.caption.weight, SANS, capPx, maxW, 0.7);
        return s('text', { x, y: y + 0.33 * f.size, 'text-anchor': anchor, 'font-size': f.size }, f.text);
      };

      if (variant === 'rows') {
        const labW = Math.min(W * 0.35, Math.max(0, ...rows.map((r) => mw(r.label, TYPE.caption.weight, SANS, capPx))) + VIZ.iconGap),
          valW = o.showValues ? mw(val(1000), 700, '"Source Serif 4", serif', numPx) + 6 : 0;
        const span = Math.max(40, W - labW - valW),
          maxN = Math.max(1, ...rows.map((r) => Math.ceil(r.value / per)));
        const sz = Math.max(14, Math.min(27, Math.floor((span + G) / maxN - G))),
          perLine = Math.max(1, Math.floor((span + G) / (sz + G)));
        const lines = (r) => Math.max(1, Math.ceil(Math.ceil(r.value / per) / perLine)),
          rowH = (r) => lines(r) * (sz + G) - G;
        const H = rows.reduce((a, r) => a + rowH(r), 0) + (rows.length - 1) * (G * 3);
        const svg = mk(H);
        let y = 0;
        for (const r of rows) {
          const n = r.value / per,
            h = rowH(r);
          svg.append(label(r.label, 0, y + sz / 2, labW - VIZ.iconGap));
          for (let i = 0; i < Math.ceil(n); i++)
            svg.append(
              partial(
                o,
                o.icon,
                labW + (i % perLine) * (sz + G),
                y + Math.floor(i / perLine) * (sz + G),
                sz,
                sz,
                r.color,
                Math.min(1, n - i),
                'h',
                env,
              ),
            );
          if (o.showValues) svg.append(valTxt(labW + Math.min(Math.ceil(n), perLine) * (sz + G) + 3, y + sz / 2 + 0.33 * numPx, r.value));
          svg.append(reorderHit(env, 'rows', rows.indexOf(r), 'y', 0, y - G, W, h + 2 * G));
          y += h + G * 3;
        }
        return { node: svg };
      }
      if (variant === 'cols') {
        const cw = W / rows.length,
          sz = Math.max(12, Math.min(27, Math.floor(cw - 6))),
          maxN = Math.max(1, ...rows.map((r) => Math.ceil(r.value / per)));
        const top = o.showValues ? numPx * 1.5 : 0,
          stackH = maxN * (sz + G) - G,
          labH = capPx * 2.6;
        const H = top + stackH + 6 + labH,
          svg = mk(H);
        rows.forEach((r, i) => {
          const cx = cw * (i + 0.5),
            n = r.value / per,
            base = top + stackH;
          for (let k = 0; k < Math.ceil(n); k++)
            svg.append(partial(o, o.icon, cx - sz / 2, base - (k + 1) * sz - k * G, sz, sz, r.color, Math.min(1, n - k), 'v', env));
          if (o.showValues) svg.append(valTxt(cx, base - Math.ceil(n) * (sz + G) + G - 3, r.value, 'middle'));
          svg.append(label(r.label, cx, base + 6 + capPx * 0.6, cw - 4, 'middle'));
          svg.append(reorderHit(env, 'rows', i, 'x', cw * i, 0, cw, H));
        });
        return { node: svg };
      }
      if (variant === 'single_v') {
        const cw = W / rows.length,
          top = o.showValues ? numPx * 1.6 : 0,
          labH = capPx * 2.2;
        const H = heightOf(o, W, env, null, '3:2'),
          box = Math.max(24, H - top - labH - 6),
          sz = Math.min(box, cw - 12),
          svg = mk(H);
        rows.forEach((r, i) => {
          const cx = cw * (i + 0.5),
            y = top + (box - sz) / 2 + 0;
          svg.append(partial(o, o.icon, cx - sz / 2, y, sz, sz, r.color, r.value / per, 'v', env));
          if (o.showValues) svg.append(valTxt(cx, numPx, r.value, 'middle'));
          svg.append(label(r.label, cx, top + box + 6 + capPx * 0.6, cw - 4, 'middle'));
          svg.append(reorderHit(env, 'rows', i, 'x', cw * i, 0, cw, H));
        });
        return { node: svg };
      }
      /* single_h : un pictogramme par ligne, rempli de gauche à droite */
      const labW = Math.min(W * 0.32, Math.max(0, ...rows.map((r) => mw(r.label, TYPE.caption.weight, SANS, capPx))) + VIZ.iconGap),
        valW = o.showValues ? mw(val(1000), 700, '"Source Serif 4", serif', numPx) + 6 : 0;
      const H = heightOf(o, W, env, null, '3:2'),
        rh = Math.max(24, (H - (rows.length - 1) * 9) / rows.length),
        sz = Math.min(rh, 96),
        svg = mk(H);
      rows.forEach((r, i) => {
        const y = i * (rh + 9) + (rh - sz) / 2;
        svg.append(label(r.label, 0, i * (rh + 9) + rh / 2, labW - VIZ.iconGap));
        svg.append(partial(o, o.icon, labW, y, sz, sz, r.color, r.value / per, 'h', env));
        if (o.showValues) svg.append(valTxt(labW + sz + 6, i * (rh + 9) + rh / 2 + 0.33 * numPx, r.value));
        svg.append(reorderHit(env, 'rows', i, 'y', 0, i * (rh + 9) - 4, W, rh + 8));
      });
      return { node: svg };
    },
    variant,
  };
}
export const pictoTypes = { pictoBars: make('rows'), pictoCols: make('cols'), pictoV: make('single_v'), pictoH: make('single_h') };
