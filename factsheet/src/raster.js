/* Pages du document → images (canvas), pour les textures de l'aperçu 3D.
   Chaque page est mesurée comme à l'écran, puis dessinée via un SVG <foreignObject> autonome :
   CSS du document et polices (latin, en base64) y sont embarquées, car une image SVG ne charge rien d'extérieur. */
import { PAGE, cssVars } from './tokens.js';
import { renderDocument, measure, h } from './render.js';
import { bleedSides } from './bleed.js';
import { loadFonts } from './viz/util.js';

const linkHref = (name) => {
  const l = [...document.querySelectorAll('link[rel=stylesheet]')].find((x) => x.href.split('?')[0].endsWith(name));
  return l ? l.href : new URL('css/' + name, location.href).href;
};
const asDataUrl = (blob) =>
  new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result);
    fr.onerror = rej;
    fr.readAsDataURL(blob);
  });

let cssCache = null;
async function documentCss() {
  if (cssCache) return cssCache;
  const fontsUrl = linkHref('fonts.css');
  const [fonts, doc] = await Promise.all([fetch(fontsUrl).then((r) => r.text()), fetch(linkHref('doc.css')).then((r) => r.text())]);
  // seuls les sous-ensembles latin / latin-ext sont embarqués (le reste alourdirait chaque rendu)
  const blocks = fonts
    .split('@font-face')
    .slice(1)
    .filter((b) => /-latin(-ext)?-wght/.test(b));
  const inlined = await Promise.all(
    blocks.map(async (b) => {
      const m = b.match(/url\(([^)]+)\)/);
      if (!m) return '';
      const url = new URL(m[1].replace(/['"]/g, ''), fontsUrl).href;
      const data = await asDataUrl(await (await fetch(url)).blob());
      return '@font-face' + b.replace(m[0], `url(${data})`);
    }),
  );
  return (cssCache = inlined.join('\n') + '\n' + doc);
}

function loadImage(src) {
  return new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => rej(new Error('image SVG illisible par le navigateur'));
    im.src = src;
  });
}

/** Les images publiées (chemins du dépôt) ne se chargent pas dans une image SVG : on les remplace par leur contenu */
async function inlineImages(root) {
  await Promise.all(
    [...root.querySelectorAll('img')]
      .filter((i) => !/^data:/.test(i.getAttribute('src') || ''))
      .map(async (i) => {
        try {
          i.setAttribute('src', await asDataUrl(await (await fetch(i.src)).blob()));
        } catch (e) {
          /* image manquante : laissée vide */
        }
      }),
  );
}

/* Caractères interdits en XML 1.0 (contrôles, tabulation verticale…, souvent collés depuis InDesign, Illustrator ou un PDF) : une seule suffit à rendre l'image SVG illisible */
export const XML_BAD = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g;
const pageSvg = (vars, css, body, w = PAGE.w, hh = PAGE.h) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${hh}"><foreignObject width="100%" height="100%">` +
  `<div xmlns="http://www.w3.org/1999/xhtml" style="${vars}"><style>${css.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</style>${body.replace(XML_BAD, ' ')}</div></foreignObject></svg>`;
const loads = (svg) =>
  loadImage('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)).then(
    () => true,
    () => false,
  );

/** Nom lisible d'un élément du document : image (fichier, bibliothèque de l'en-tête, logo) ou colonne */
function describe(node, doc) {
  const q = node.closest('[data-sel]'),
    path = q ? q.dataset.sel : '',
    H = doc.header || {};
  const src = (node.getAttribute && node.getAttribute('src')) || '';
  const file = /^data:/.test(src)
    ? `image intégrée ${(src.match(/^data:([^;,]+)/) || [])[1] || ''}, ${Math.round(src.length / 1024)} Ko`
    : decodeURIComponent(src.split('/').pop() || '');
  if (path === 'header') {
    if (node.closest('.hd-logo, [class*=logo]')) return `logo « ${H.logoVariant || ''} » de l’en-tête (${file})`;
    const im = (H.images || []).find((i) => i.id === H.imageId) || (H.images || [])[0];
    return `image de l’en-tête « ${im ? im.name : file} » (${file})`;
  }
  const m = path.match(/^col:(\d+):(\d+):(\d+)$/);
  return m
    ? `colonne ${+m[1] + 1}·${+m[2] + 1}·${+m[3] + 1}${node.tagName === 'IMG' ? ` (image « ${file} »)` : ''}`
    : path || node.tagName.toLowerCase();
}

/** L'image SVG de la page n'a pas pu être lue : on teste chaque image, puis chaque colonne, séparément, pour trouver la fautive */
async function diagnose(pageEl, vars, css, doc) {
  const SVGNS = 'http://www.w3.org/2000/svg';
  const one = (el) => {
    // un élément SVG ne peut pas être seul dans la page : on le replace dans un <svg> (et un tspan dans un <text>)
    let x = new XMLSerializer().serializeToString(el);
    if (el.namespaceURI === SVGNS && el.localName !== 'svg') {
      if (el.localName === 'tspan') x = `<text xmlns="${SVGNS}">${x}</text>`;
      x = `<svg xmlns="${SVGNS}" width="400" height="400">${x}</svg>`;
    }
    return pageSvg(vars, css, x);
  };
  const bad = [];
  for (const im of pageEl.querySelectorAll('img')) {
    if (!(await loads(one(im)))) bad.push(describe(im, doc));
  }
  if (!bad.length)
    for (const c of pageEl.querySelectorAll('[data-sel^="col:"], [data-sel="header"]')) {
      if (!(await loads(one(c)))) {
        const deep = await deepFault(c, one);
        bad.push(describe(c, doc) + (deep ? ' → ' + deep : ''));
      }
    }
  return bad.length ? 'élément(s) fautif(s) : ' + bad.join(' ; ') : 'aucun élément seul n’est en cause (page trop lourde ou combinaison)';
}

/** Descend dans un élément fautif jusqu'à l'élément le plus petit qui fait échouer le chargement ; le décrit (balise, classe, début du texte) */
async function deepFault(el, one) {
  let budget = 50;
  const short = (n) => {
    // balise, attributs, début du texte et caractères hors ASCII (code Unicode) : de quoi voir ce que le navigateur refuse
    const raw = n.textContent || '',
      t = raw.replace(/\s+/g, ' ').trim().slice(0, 40);
    const attrs = [...(n.attributes || [])].map((x) => `${x.name}="${String(x.value).slice(0, 30)}"`).join(' ');
    const odd = [
      ...new Set(
        [...raw]
          .filter((c) => c.charCodeAt(0) > 126 || (c.charCodeAt(0) < 32 && c !== '\n' && c !== '\t'))
          .map((c) => 'U+' + c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')),
      ),
    ].join(',');
    return `<${n.tagName.toLowerCase()}${attrs ? ' ' + attrs : ''}>${t ? ' « ' + t + ' »' : ''}${odd ? ' [' + odd + ']' : ''}`;
  };
  const walk = async (n) => {
    const bad = [];
    for (const c of n.children) {
      if (budget-- <= 0) break;
      if (!(await loads(one(c)))) bad.push(c);
    }
    if (!bad.length) return [short(n)];
    const out = [];
    for (const c of bad) out.push(...(await walk(c)));
    return out;
  };
  const r = await walk(el);
  return r.slice(0, 4).join(' ; ');
}

/** → [{ key, canvas }] pour le recto et le verso, à `scale` × la taille A4 en px CSS */
export async function rasterizeDocument(doc, scale = 2) {
  await loadFonts();
  const css = await documentCss();
  const stage = h('div', { style: { position: 'absolute', left: '-20000px', top: '0' } });
  document.body.append(stage);
  try {
    const result = renderDocument(doc);
    result.pages.forEach((p) => stage.append(p.el));
    measure(result);
    await inlineImages(stage);
    const out = [];
    for (const p of result.pages) {
      const vars = Object.entries(cssVars(doc.theme, doc.colors, doc.density))
        .map(([k, v]) => `${k}:${v}`)
        .join(';')
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;');
      const body = new XMLSerializer().serializeToString(p.el);
      const svg = pageSvg(vars, css, body);
      let im;
      try {
        im = await loadImage('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg));
      } catch (e) {
        throw new Error(`${e.message} — ${await diagnose(p.el, vars, css, doc)} (${Math.round(svg.length / 1024)} Ko)`);
      }
      if (im.decode) {
        try {
          await im.decode();
        } catch (e) {
          /* Firefox : decode() peut refuser une image SVG déjà chargée */
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = PAGE.w * scale;
      canvas.height = PAGE.h * scale;
      const g = canvas.getContext('2d');
      try {
        g.drawImage(im, 0, 0, canvas.width, canvas.height);
      } catch (e) {
        await new Promise((r) => setTimeout(r, 150));
        g.drawImage(im, 0, 0, canvas.width, canvas.height);
      } // Firefox : l'image SVG n'est parfois pas encore prête au premier dessin
      out.push({ key: p.key, canvas });
    }
    return out;
  } finally {
    stage.remove();
  }
}

/** Un élément du document (une dataviz) → { canvas, width, height }, à `scale` × sa taille en px CSS (1 px CSS = 1/96 pouce).
    `fill` : couleur de fond (sinon transparent). `node` est déplacé dans un conteneur éphémère hors écran. */
export async function rasterizeNode(node, { width, vars, scale = 2, fill = null, margin = 0 }) {
  await loadFonts();
  const css = await documentCss();
  const wrap = h(
    'div',
    {
      class: 'page',
      style: {
        position: 'absolute',
        left: '-20000px',
        top: '0',
        width: width + 'px',
        height: 'auto',
        overflow: 'visible',
        background: 'none',
      },
    },
    h('div', { class: 'col col-viz', style: { width: width + 'px' } }, node),
  );
  for (const [k, v] of Object.entries(vars)) wrap.style.setProperty(k, v);
  document.body.append(wrap);
  try {
    await inlineImages(wrap);
    const W = width + 2 * margin,
      H = Math.max(1, Math.ceil(wrap.getBoundingClientRect().height));
    wrap.style.position = 'static';
    const body = new XMLSerializer().serializeToString(wrap);
    const im = await loadImage('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(pageSvg('', css, body, W, H)));
    if (im.decode) await im.decode().catch(() => {});
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(W * scale);
    canvas.height = Math.round(H * scale);
    const g = canvas.getContext('2d');
    if (fill) {
      g.fillStyle = fill;
      g.fillRect(0, 0, canvas.width, canvas.height);
    }
    try {
      g.drawImage(im, 0, 0, canvas.width, canvas.height);
    } catch (e) {
      await new Promise((r) => setTimeout(r, 150));
      g.drawImage(im, 0, 0, canvas.width, canvas.height);
    }
    return { canvas, width: W, height: H };
  } finally {
    wrap.remove();
  }
}

/** Un élément du document (en-tête, section, sous-section, colonne) → SVG autonome de sa taille exacte (`data-sel`, ex. `sec:0`).
    La page est rendue comme à l'écran, puis décalée pour que seul l'élément reste visible ; `transparent` retire le fond de la page.
    → { svg, width, height } (px CSS) */
export async function elementSvg(doc, path, { transparent = false, bleed = false } = {}) {
  await loadFonts();
  const css = await documentCss();
  const stage = h('div', { style: { position: 'absolute', left: '-20000px', top: '0' } });
  document.body.append(stage);
  try {
    const result = renderDocument(doc);
    result.pages.forEach((p) => stage.append(p.el));
    measure(result);
    await inlineImages(stage);
    const page = result.pages.find((p) => p.el.querySelector(`[data-sel="${path}"]`));
    if (!page) throw new Error('élément introuvable : ' + path);
    const target = page.el.querySelector(`[data-sel="${path}"]`),
      P = page.el.getBoundingClientRect(),
      r = target.getBoundingClientRect();
    if (transparent) page.el.style.background = 'none';
    /* fond perdu : le fond de l'élément est prolongé de 3 mm sur les côtés qui touchent le bord de la feuille */
    const bl = (bleed && bleedSides(target, page.el)) || { l: 0, r: 0, t: 0, b: 0 },
      fillBleed = bl.l + bl.r + bl.t + bl.b ? getComputedStyle(target).backgroundColor : 'transparent';
    const width = Math.max(1, Math.ceil(r.width + bl.l + bl.r)),
      height = Math.max(1, Math.ceil(r.height + bl.t + bl.b));
    const vars = Object.entries(cssVars(doc.theme, doc.colors, doc.density))
      .map(([k, v]) => `${k}:${v}`)
      .join(';')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;');
    const inner = new XMLSerializer().serializeToString(page.el);
    const body =
      `<div xmlns="http://www.w3.org/1999/xhtml" style="position:relative;width:${width}px;height:${height}px;overflow:hidden;background:${fillBleed}">` +
      `<div style="position:absolute;left:${P.left - r.left + bl.l}px;top:${P.top - r.top + bl.t}px;width:${P.width}px;height:${P.height}px">${inner}</div></div>`;
    return { svg: pageSvg(vars, css, body, width, height), width, height };
  } finally {
    stage.remove();
  }
}

/** Idem, en image : → { canvas, width, height } à `scale` × la taille en px CSS ; `fill` : couleur de fond (sinon transparent) */
export async function rasterizeElement(doc, path, { scale = 2, fill = null, transparent = false } = {}) {
  const { svg, width, height } = await elementSvg(doc, path, { transparent });
  const im = await loadImage('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg));
  if (im.decode) await im.decode().catch(() => {});
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const g = canvas.getContext('2d');
  if (fill) {
    g.fillStyle = fill;
    g.fillRect(0, 0, canvas.width, canvas.height);
  }
  try {
    g.drawImage(im, 0, 0, canvas.width, canvas.height);
  } catch (e) {
    await new Promise((r) => setTimeout(r, 150));
    g.drawImage(im, 0, 0, canvas.width, canvas.height);
  }
  return { canvas, width, height };
}
