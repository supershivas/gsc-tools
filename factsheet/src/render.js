/* Rendu du document en pages A4 (HTML). Aucune valeur de mise en page en dur :
   tout vient de tokens.js via les variables CSS (--s*, --gap-*, --t-*, --c-*). */
import { PAGE, GRID, HEADER, GAP, cssVars, applyVars, colWidth, insetW, setDensity, paletteOf } from './tokens.js';
import { IMAGE_RATIOS } from './state.js';
import { renderViz, composeSide } from './viz/index.js';
import { inlineMk } from './viz/util.js';
import { renderFigure } from './figure.js';
import { renderCard } from './card.js';

export const ico = name => h('i', { class: 'ti ti-' + name });
export function h(tag, props = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'dataset') Object.assign(e.dataset, v);
    else if (k in e && k !== 'list') e[k] = v;
    else e.setAttribute(k, v);
  }
  for (const k of kids.flat()) if (k != null && k !== false) e.append(k);
  return e;
}

const esc = t => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export const inline = inlineMk;

/** Texte à balisage léger → éléments <p> / <ul> */
export function richText(text, align) {
  const root = h('div', { class: 'rich', style: align && align !== 'left' ? { textAlign: align } : {} });
  let ul = null;
  for (const raw of String(text || '').replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.trim();
    if (!line) { ul = null; continue; }
    const m = line.match(/^[-•]\s+(.*)$/);
    if (m) {
      if (!ul) { ul = h('ul'); root.append(ul); }
      ul.append(h('li', { innerHTML: inline(m[1]) }));
    } else { ul = null; root.append(h('p', { innerHTML: inline(line) })); }
  }
  return root;
}

/** Image du header actuellement choisie dans la bibliothèque */
export const headerImage = H => (H.images || []).find(i => i.id === H.imageId) || (H.images || [])[0] || null;

function renderHeader(doc) {
  const H = doc.header, sel = { 'data-sel': 'header' };
  const el = h('header', { class: 'hd', style: { background: `var(--c-${H.bg})`, color: `var(--c-${H.fg})` }, dataset: { sel: 'header' } });
  const inner = h('div', { class: 'hd-inner' });
  const img = headerImage(H), logo = (H.logos || {})[H.logoVariant];
  if (H.showImage) inner.append(img && img.src ? h('img', { class: 'hd-img', src: img.src, alt: '' }) : h('div', { class: 'hd-img ph', textContent: 'image' }));
  const top = h('div', { class: 'hd-top' },
    h('div', { class: 'hd-over', innerHTML: inline(H.overline) }), h('div', { class: 'hd-rule' }));
  const bottom = h('div', { class: 'hd-bottom' },
    h('div', { class: 'hd-title', innerHTML: inline(H.title) }),
    H.subtitle && H.subtitle.trim() ? h('div', { class: 'hd-sub', innerHTML: inline(H.subtitle) }) : null);
  inner.append(h('div', { class: 'hd-text' }, top, bottom));
  if (H.showLogo) inner.append(logo ? h('img', { class: 'hd-logo', src: logo, alt: '' }) : h('div', { class: 'hd-logo ph', textContent: 'logo' }));
  el.append(inner);
  return el;
}

/* Cadre : contour (trait 0,5 pt, coins de 3 px) et/ou fond de couleur. Un fond sans contour garde le même retrait (trait transparent),
   donc le même calcul de largeur : le retrait intérieur est déduit des largeurs transmises aux enfants (voir insetW). */
const hasFill = o => !!o.fillColor && o.fillColor !== 'none';
export const isBox = o => !!(o.stroke || hasFill(o));
const strokeStyle = node => o => {
  if (!isBox(o)) return;
  node.classList.add('stroked');
  node.style.setProperty('--stroke-color', o.stroke ? `var(--c-${o.strokeColor || 'text'})` : 'transparent');
  if (hasFill(o)) node.style.background = `var(--c-${o.fillColor})`;
};

/** Image selon le mode choisi : ratio fixe (défaut), « fit » = largeur de la colonne et proportions de l'image, ou taille personnalisée */
function renderImage(col, w) {
  const mode = col.imgMode || 'ratio';
  const img = col.src ? h('img', { src: col.src, alt: '', onload: e => {
    const n = Math.round(e.target.naturalWidth / e.target.naturalHeight * 1000) / 1000;
    if (n && col.natural !== n) { col.natural = n; document.dispatchEvent(new Event('fs-natural')); }
  } }) : null;
  if (mode === 'fit') {
    const box = h('div', { class: 'img-box fit' + (col.src ? ' has' : ''), style: { aspectRatio: String(col.natural || 4 / 3) } }, img || h('span', { textContent: 'image' }));
    return box;
  }
  if (mode === 'custom') {
    const pct = Math.max(5, Math.min(100, +col.imgW || 100)), hgt = Math.max(3, Math.round((+col.imgH || 150) / 3) * 3);
    const box = h('div', { class: 'img-box custom', style: { width: pct + '%', height: hgt + 'px', marginLeft: col.align === 'center' || col.align === 'right' ? 'auto' : '0', marginRight: col.align === 'center' ? 'auto' : '0' } },
      img || h('span', { textContent: 'image' }));
    if (img) img.style.objectFit = col.imgFit === 'contain' ? 'contain' : 'cover';
    return box;
  }
  const r = IMAGE_RATIOS[col.ratio] || 4 / 3;
  return h('div', { class: 'img-box', style: { height: Math.round(w / r / 3) * 3 + 'px' } }, img || h('span', { textContent: 'image' }));
}

/** w = largeur de la colonne (avant son propre retrait) */
function renderCol(col, w, path, env) {
  const wrap = h('div', { class: `col col-${col.type}`, dataset: { sel: path } });
  const al = { top: 'start', center: 'center', bottom: 'end' }[col.valign] || 'start';
  if (isBox(col) && col.type !== 'card') { strokeStyle(wrap)(col); wrap.style.justifyContent = { start: 'flex-start', center: 'center', end: 'flex-end' }[al]; w = insetW(w); }
  else wrap.style.alignSelf = al;
  const strip = x => String(x || '').replace(/\*\*|__|~~/g, '').replace(/^[-•]\s+/gm, '').split('\n').find(l => l.trim()) || '';
  const side = (label, core) => composeSide(col.side, w, env, { pct: '', value: '', total: '', label }, core).node;
  if (col.type === 'text') wrap.append(side(strip(col.text), ww => ({ node: col.side && col.side.pos !== 'none' ? h('div', { style: { width: ww + 'px' } }, richText(col.text, col.align)) : richText(col.text, col.align) })));
  else if (col.type === 'image') {
    wrap.append(renderImage(col, w));
    if (col.caption && col.caption.trim()) wrap.append(h('div', { class: 'cap', innerHTML: inline(col.caption) }));
  } else if (col.type === 'card' && col.card) {
    wrap.append(side(strip(col.card.content && col.card.content.title), ww => ({ node: renderCard(col.card, ww) })));
  } else if (col.type === 'figure') {
    wrap.append(renderFigure(col.figure || {}, w, col.align));
  } else {
    const node = renderViz(col.viz, w, env);
    wrap.append(node || h('div', { class: 'viz-ph' }, h('span', { textContent: 'dataviz' })));
    if (node && env.fills && col.viz.opts && (col.viz.opts.hmode === 'fill' || col.viz.opts.hmode === 'match')) env.fills.push({ page: env.page, col, w, node, wrap, env, mode: col.viz.opts.hmode });
  }
  if (col.type !== 'viz' && +col.minH > 0) {   // hauteur minimale réglée à la poignée : le contenu se place dans la colonne selon valign
    Object.assign(wrap.style, { minHeight: col.minH + 'px', display: 'flex', flexDirection: 'column', alignSelf: isBox(col) ? 'stretch' : 'start', justifyContent: { start: 'flex-start', center: 'center', end: 'flex-end' }[al] });
  }
  return wrap;
}

/** W = largeur disponible pour la sous-section (déjà réduite par le contour de la section) */
function renderSub(sub, si, bi, env, W) {
  const L = GRID.layouts[sub.layout];
  const el = h('div', { class: 'sub', dataset: { sel: `sub:${si}:${bi}` } });
  if (bi > 0) el.append(h('div', { class: 'sub-rule' }));   // filet entre sous-sections (vrai élément : l'export PDF le lit)
  strokeStyle(el)(sub); if (isBox(sub)) W = insetW(W);
  if (sub.title && sub.title.trim() && sub.showTitle !== false) el.append(h('h3', { class: 'sub-title', innerHTML: inline(sub.title) }));
  const cols = h('div', { class: 'cols', style: { gridTemplateColumns: `repeat(${L.cols}, minmax(0, 1fr))` } });
  sub.cols.forEach((c, i) => {
    const node = renderCol(c, colWidth(sub.layout, i, W), `col:${si}:${bi}:${i}`, env);
    node.style.gridColumn = `span ${L.spans[i]}`;
    cols.append(node);
  });
  el.append(cols);
  return el;
}

/** Largeur réelle (px) de la colonne ci de la sous-section bi de la section si : tient compte des contours emboîtés */
export function columnWidth(doc, si, bi, ci) {
  setDensity(doc.density);
  const sec = doc.sections[si], sub = sec && sec.subs[bi], col = sub && sub.cols[ci];
  if (!col) return GRID.contentW;
  let W = GRID.contentW;
  if (isBox(sec)) W = insetW(W);
  if (isBox(sub)) W = insetW(W);
  const w = colWidth(sub.layout, ci, W);
  return isBox(col) && col.type !== 'card' ? insetW(w) : w;
}

const isBand = s => !!(s.bg && s.bg !== 'none');
/** couleur du filet entre sous-sections par défaut : blanc sur un fond de section, bleu léger (teinte 20 %) sur fond blanc */
export const defaultRuleColor = s => (!isBand(s) || s.bg === 'white') ? 'tint-blue' : 'white';

/** pos : { key: 'recto'|'verso', first, last, prevBand }
    Règles d'espacement : un fond de section touche le fond précédent (pas de bande blanche), le premier fond
    d'une page va jusqu'au bord haut (ou colle au header), le dernier jusqu'au bord bas (voir measure()). */
function renderSection(sec, si, env, pos) {
  const band = isBand(sec), style = {};
  const firstGap = pos.key === 'recto' ? GAP.headerToBody : PAGE.marginTop;
  style.marginTop = (pos.first ? (band ? 0 : firstGap) : (band && pos.prevBand ? 0 : GAP.sectionBefore)) + 'px';
  if (band) {
    style.background = `var(--c-${sec.bg})`;
    style.paddingTop = (pos.first ? firstGap : GAP.bandPad) + 'px';
    style.paddingBottom = (pos.last ? PAGE.marginBottom : GAP.bandPad) + 'px';
  }
  const cls = ['sec', band && 'sec-band', pos.first && 'sec-first', pos.last && 'sec-last', sec.subRules === false && 'sec-norules'].filter(Boolean).join(' ');
  const el = h('section', { class: cls, style, dataset: { sel: `sec:${si}` } });
  el.style.setProperty('--rule', `var(--c-${sec.ruleColor || defaultRuleColor(sec)})`);
  /* filet entre sections (vrai élément : l'export PDF le lit) : au milieu de l'écart entre deux sections sur fond blanc, ou à la jonction de deux bandes de couleur ;
     entre un fond blanc et une bande, le changement de fond sert déjà de séparation */
  if (!pos.first && sec.secRule !== false && band === pos.prevBand) el.prepend(h('div', { class: 'sec-rule', style: { top: band ? '0px' : `calc(${-GAP.sectionBefore / 2}px - var(--stroke) / 2)` } }));
  let host = el, W = GRID.contentW;
  if (isBox(sec)) { host = h('div', { class: 'sec-box' }); strokeStyle(host)(sec); el.append(host); W = insetW(W); }
  if (sec.title && sec.title.trim() && sec.showTitle !== false) host.append(h('h2', { class: 'sec-title', innerHTML: inline(sec.title) }));
  sec.subs.forEach((sub, bi) => host.append(renderSub(sub, si, bi, env, W)));
  return el;
}

/** → { pages: [{el, key, content, top, max, used, overflow}], warnings: [] } */
export function renderDocument(doc) {
  setDensity(doc.density);
  const vars = cssVars(doc.theme, doc.colors);
  const env = { locale: doc.locale || 'en-GB', pal: paletteOf(doc.theme, doc.colors), fills: [], page: '' };
  const pages = [];
  for (const key of ['recto', 'verso']) {
    env.page = key;
    const page = h('div', { class: `page page-${key}`, dataset: { page: key } });
    applyVars(page, vars);
    const top = key === 'recto' ? HEADER.h : 0;
    if (key === 'recto') page.append(renderHeader(doc));
    const content = h('div', { class: 'content', style: { top: top + 'px' } });
    const list = doc.sections.map((s, si) => ({ s, si })).filter(x => x.s.page === key);
    list.forEach((x, k) => content.append(renderSection(x.s, x.si, env, { key, first: k === 0, last: k === list.length - 1, prevBand: k > 0 && isBand(list[k - 1].s) })));
    page.append(content);
    const lastBand = list.length && isBand(list[list.length - 1].s);
    pages.push({ el: page, key, content, top, lastBand, max: PAGE.h - top - (lastBand ? 0 : PAGE.marginBottom) });
  }
  return { pages, warnings: [], fills: env.fills };
}

/** hauteur du graphique lui-même (sans titre ni source) : celle du conteneur `data-viz-h`, sinon l'attribut `height` du SVG, sinon celle de l'élément */
export function vizChartH(n) {
  const bx = n.dataset && n.dataset.vizH ? n : n.querySelector && n.querySelector('[data-viz-h]'); if (bx) return +bx.dataset.vizH;
  const sv = n.tagName.toLowerCase() === 'svg' ? n : n.querySelector('svg'); return +(sv && sv.getAttribute('height')) || n.offsetHeight || 0;
}
/** Hauteur que doit avoir le graphique pour égaler la colonne voisine la plus haute de sa rangée (null s'il n'y a pas de voisine) :
    on masque la dataviz, la rangée prend alors la hauteur des autres colonnes, moins les marges de la colonne et le titre/source de la dataviz */
export function matchTarget(wrap, node) {
  const row = wrap.parentElement; if (!row || row.children.length < 2) return null;
  const chart = vizChartH(node), extra = Math.max(0, (node.offsetHeight || chart) - chart), cs = getComputedStyle(wrap);
  const own = ['paddingTop', 'paddingBottom', 'borderTopWidth', 'borderBottomWidth'].reduce((a, k) => a + (parseFloat(cs[k]) || 0), 0);
  const prev = node.style.display; node.style.display = 'none';
  const rowH = row.offsetHeight; node.style.display = prev;
  const target = rowH - own - extra;
  return target >= 60 ? Math.floor(target / 3) * 3 : null;
}
/** Hauteur de la voisine la plus haute de la rangée, pour une colonne qui n'est pas une dataviz (null sans voisine) :
    on vide la colonne le temps de mesurer, la rangée prend alors la hauteur des autres */
export function matchColTarget(wrap) {
  const row = wrap.parentElement; if (!row || row.children.length < 2) return null;
  const kids = [...wrap.children], prev = wrap.style.minHeight; kids.forEach(k => { k._d = k.style.display; k.style.display = 'none'; }); wrap.style.minHeight = '0px';
  const rowH = row.offsetHeight; kids.forEach(k => { k.style.display = k._d; }); wrap.style.minHeight = prev;
  return rowH >= 30 ? Math.round(rowH / 3) * 3 : null;
}
/** Dataviz en mode « Adapter à la colonne voisine » : redessinées à la hauteur de la voisine la plus haute */
function matchRows(fills) {
  for (const f of fills) {
    if (f.mode !== 'match') continue;
    const o = f.col.viz.opts, t = matchTarget(f.wrap, f.node); if (!t) continue;
    const target = Math.max(o.hmin || 90, Math.min(o.hmax || 900, t)), n = renderViz(f.col.viz, f.w, { ...f.env, fills: null, fillH: target });
    if (n) { f.node.replaceWith(n); f.node = n; }
  }
}

/** À appeler une fois les pages dans le DOM (mesures réelles). */
/** Dataviz en mode « Remplir la place disponible » : elles se partagent l'espace libre de leur page (quelques passes, bornées par hmin/hmax) */
function fillPage(p, fills) {
  const mine = fills.filter(f => f.page === p.key && f.mode === 'fill');
  if (!mine.length) return;
  const chartH = f => vizChartH(f.node);
  mine.forEach(f => { f.h = chartH(f); });
  for (let pass = 0; pass < 6; pass++) {
    const free = p.max - p.content.offsetHeight;
    if (free >= 0 && free < 3.5) break;
    let moved = 0;
    for (const f of mine) {
      const o = f.col.viz.opts, target = Math.max(o.hmin || 90, Math.min(o.hmax || 900, f.h + free / mine.length));
      if (Math.abs(target - f.h) < 0.5) continue;
      const n = renderViz(f.col.viz, f.w, { ...f.env, fills: null, fillH: target });
      if (!n) continue;
      f.node.replaceWith(n); f.node = n; f.h = chartH(f); moved++;
    }
    if (!moved) break;
  }
}

export function measure(result) {
  const warnings = [];
  if (result.fills && result.fills.length) matchRows(result.fills);
  for (const p of result.pages) {
    if (result.fills && result.fills.length) fillPage(p, result.fills);
    p.used = p.content.offsetHeight;
    p.overflow = p.used > p.max + 0.5;
    if (p.overflow) warnings.push(`${p.key === 'recto' ? 'Recto' : 'Verso'} : le contenu dépasse de ${Math.ceil(p.used - p.max)} px — déplacez une section vers l’autre page ou raccourcissez-la.`);
    // le dernier fond de la page descend jusqu'au bas de page (et au fond perdu à l'export)
    const last = p.content.querySelector('.sec-last.sec-band');
    if (last) last.style.minHeight = Math.max(0, PAGE.h - p.top - last.offsetTop) + 'px';
    if (p.key === 'recto') {
      const top = p.el.querySelector('.hd-top'), bot = p.el.querySelector('.hd-bottom'), inner = p.el.querySelector('.hd-inner');
      /* le texte est calé sur la bande de 132 px de l'image, mais il peut déborder dessous : seul le bas du header (moins GAP.boxPad × 2) est une vraie limite */
      const hd = p.el.querySelector('.hd'), room = inner && hd ? inner.clientHeight + (hd.clientHeight - inner.clientHeight) / 2 - GAP.boxPad : 0;
      if (top && bot && inner && bot.offsetTop + bot.offsetHeight > room + 0.5) warnings.push('Header : titre trop long, il ne tient pas dans la hauteur du header.');
    }
  }
  result.warnings = warnings;
  return result;
}
