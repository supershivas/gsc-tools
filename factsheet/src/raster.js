/* Pages du document → images (canvas), pour les textures de l'aperçu 3D.
   Chaque page est mesurée comme à l'écran, puis dessinée via un SVG <foreignObject> autonome :
   CSS du document et polices (latin, en base64) y sont embarquées, car une image SVG ne charge rien d'extérieur. */
import { PAGE, cssVars } from './tokens.js';
import { renderDocument, measure, h } from './render.js';

const linkHref = name => { const l = [...document.querySelectorAll('link[rel=stylesheet]')].find(x => x.href.endsWith(name)); return l ? l.href : new URL('css/' + name, location.href).href; };
const asDataUrl = blob => new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(blob); });

let cssCache = null;
async function documentCss() {
  if (cssCache) return cssCache;
  const fontsUrl = linkHref('fonts.css');
  const [fonts, doc] = await Promise.all([fetch(fontsUrl).then(r => r.text()), fetch(linkHref('doc.css')).then(r => r.text())]);
  // seuls les sous-ensembles latin / latin-ext sont embarqués (le reste alourdirait chaque rendu)
  const blocks = fonts.split('@font-face').slice(1).filter(b => /-latin(-ext)?-wght/.test(b));
  const inlined = await Promise.all(blocks.map(async b => {
    const m = b.match(/url\(([^)]+)\)/); if (!m) return '';
    const url = new URL(m[1].replace(/['"]/g, ''), fontsUrl).href;
    const data = await asDataUrl(await (await fetch(url)).blob());
    return '@font-face' + b.replace(m[0], `url(${data})`);
  }));
  return (cssCache = inlined.join('\n') + '\n' + doc);
}

function loadImage(src) {
  return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('raster')); im.src = src; });
}

/** Les images publiées (chemins du dépôt) ne se chargent pas dans une image SVG : on les remplace par leur contenu */
async function inlineImages(root) {
  await Promise.all([...root.querySelectorAll('img')].filter(i => !/^data:/.test(i.getAttribute('src') || '')).map(async i => {
    try { i.setAttribute('src', await asDataUrl(await (await fetch(i.src)).blob())); } catch (e) { /* image manquante : laissée vide */ }
  }));
}

/** → [{ key, canvas }] pour le recto et le verso, à `scale` × la taille A4 en px CSS */
export async function rasterizeDocument(doc, scale = 2) {
  if (document.fonts && document.fonts.ready) await document.fonts.ready;
  const css = await documentCss();
  const stage = h('div', { style: { position: 'absolute', left: '-20000px', top: '0' } });
  document.body.append(stage);
  try {
    const result = renderDocument(doc);
    result.pages.forEach(p => stage.append(p.el));
    measure(result);
    await inlineImages(stage);
    const out = [];
    for (const p of result.pages) {
      const vars = Object.entries(cssVars(doc.theme, doc.colors)).map(([k, v]) => `${k}:${v}`).join(';').replace(/&/g, '&amp;').replace(/"/g, '&quot;');
      const body = new XMLSerializer().serializeToString(p.el);
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${PAGE.w}" height="${PAGE.h}"><foreignObject width="100%" height="100%">`
        + `<div xmlns="http://www.w3.org/1999/xhtml" style="${vars}"><style>${css.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</style>${body}</div></foreignObject></svg>`;
      const im = await loadImage('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg));
      const canvas = document.createElement('canvas');
      canvas.width = PAGE.w * scale; canvas.height = PAGE.h * scale;
      canvas.getContext('2d').drawImage(im, 0, 0, canvas.width, canvas.height);
      out.push({ key: p.key, canvas });
    }
    return out;
  } finally { stage.remove(); }
}
