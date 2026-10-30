/* Rendu du document en pages A4 (HTML). Aucune valeur de mise en page en dur :
   tout vient de tokens.js via les variables CSS (--s*, --gap-*, --t-*, --c-*). */
import { PAGE, GRID, HEADER, GAP, cssVars, applyVars, colWidth } from './tokens.js';
import { IMAGE_RATIOS } from './state.js';
import { renderViz } from './viz/index.js';

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
export const inline = t => esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/__(.+?)__/g, '<u>$1</u>').replace(/~~(.+?)~~/g, '<i>$1</i>');

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
    h('div', { class: 'hd-over', textContent: H.overline }), h('div', { class: 'hd-rule' }));
  const bottom = h('div', { class: 'hd-bottom' },
    h('div', { class: 'hd-title', textContent: H.title }),
    H.subtitle && H.subtitle.trim() ? h('div', { class: 'hd-sub', textContent: H.subtitle }) : null);
  inner.append(h('div', { class: 'hd-text' }, top, bottom));
  if (H.showLogo) inner.append(logo ? h('img', { class: 'hd-logo', src: logo, alt: '' }) : h('div', { class: 'hd-logo ph', textContent: 'logo' }));
  el.append(inner);
  return el;
}

function renderCol(col, layoutKey, i, path, env) {
  const w = colWidth(layoutKey, i);
  const wrap = h('div', { class: `col col-${col.type}`, dataset: { sel: path } });
  wrap.style.alignSelf = { top: 'start', center: 'center', bottom: 'end' }[col.valign] || 'start';
  if (col.type === 'text') wrap.append(richText(col.text, col.align));
  else if (col.type === 'image') {
    const r = IMAGE_RATIOS[col.ratio] || 4 / 3;
    const box = h('div', { class: 'img-box', style: { height: Math.round(w / r / 3) * 3 + 'px' } },
      col.src ? h('img', { src: col.src, alt: '' }) : h('span', { textContent: 'image' }));
    wrap.append(box);
    if (col.caption && col.caption.trim()) wrap.append(h('div', { class: 'cap', textContent: col.caption }));
  } else {
    const node = renderViz(col.viz, w, env);
    wrap.append(node || h('div', { class: 'viz-ph' }, h('span', { textContent: 'dataviz' })));
  }
  return wrap;
}

function renderSub(sub, si, bi, env) {
  const L = GRID.layouts[sub.layout];
  const el = h('div', { class: 'sub', dataset: { sel: `sub:${si}:${bi}` } });
  if (sub.title && sub.title.trim()) el.append(h('h3', { class: 'sub-title', textContent: sub.title }));
  const cols = h('div', { class: 'cols', style: { gridTemplateColumns: `repeat(${L.cols}, minmax(0, 1fr))` } });
  sub.cols.forEach((c, i) => {
    const node = renderCol(c, sub.layout, i, `col:${si}:${bi}:${i}`, env);
    node.style.gridColumn = `span ${L.spans[i]}`;
    cols.append(node);
  });
  el.append(cols);
  return el;
}

const isBand = s => !!(s.bg && s.bg !== 'none');

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
  const cls = ['sec', band && 'sec-band', pos.first && 'sec-first', pos.last && 'sec-last'].filter(Boolean).join(' ');
  const el = h('section', { class: cls, style, dataset: { sel: `sec:${si}` } });
  if (sec.title && sec.title.trim()) el.append(h('h2', { class: 'sec-title', textContent: sec.title }));
  sec.subs.forEach((sub, bi) => el.append(renderSub(sub, si, bi, env)));
  return el;
}

/** → { pages: [{el, key, content, top, max, used, overflow}], warnings: [] } */
export function renderDocument(doc) {
  const vars = cssVars(doc.theme, doc.colors);
  const env = { locale: doc.locale || 'en-GB' };
  const pages = [];
  for (const key of ['recto', 'verso']) {
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
  return { pages, warnings: [] };
}

/** À appeler une fois les pages dans le DOM (mesures réelles). */
export function measure(result) {
  const warnings = [];
  for (const p of result.pages) {
    p.used = p.content.offsetHeight;
    p.overflow = p.used > p.max + 0.5;
    if (p.overflow) warnings.push(`${p.key === 'recto' ? 'Recto' : 'Verso'} : le contenu dépasse de ${Math.ceil(p.used - p.max)} px — déplacez une section vers l’autre page ou raccourcissez-la.`);
    // le dernier fond de la page descend jusqu'au bas de page (et au fond perdu à l'export)
    const last = p.content.querySelector('.sec-last.sec-band');
    if (last) last.style.minHeight = Math.max(0, PAGE.h - p.top - last.offsetTop) + 'px';
    if (p.key === 'recto') {
      const top = p.el.querySelector('.hd-top'), bot = p.el.querySelector('.hd-bottom'), inner = p.el.querySelector('.hd-inner');
      if (top && bot && inner && top.offsetHeight + bot.offsetHeight > inner.clientHeight + 0.5) warnings.push('Header : titre trop long, il ne tient pas dans la hauteur du header.');
    }
  }
  result.warnings = warnings;
  return result;
}
