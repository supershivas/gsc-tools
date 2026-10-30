/* Utilitaires partagés par les dataviz (SVG, mesure de texte, couleurs, nombres). */
import { FONT, TYPE, STROKE, VIZ } from '../tokens.js';

const NS = 'http://www.w3.org/2000/svg';
export function s(tag, attrs = {}, ...kids) {
  const e = document.createElementNS(NS, tag);
  if (tag === 'svg') e.setAttribute('fill', 'currentColor');   // texte et formes héritent de la couleur du thème
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'style' && typeof v === 'object') Object.assign(e.style, v); else e.setAttribute(k, v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) e.append(typeof c === 'string' ? document.createTextNode(c) : c);
  return e;
}
export function el(tag, props = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
    else if (k in e) e[k] = v; else e.setAttribute(k, v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) e.append(c);
  return e;
}

export const pxOf = pt => pt * 96 / 72;
export const SW = STROKE.px;                           // épaisseur de trait : 0,5 pt
export const colorRef = c => (/^(#|rgb|var\()/.test(c || '') ? c : `var(--c-${c || 'blue'})`);
export const round3 = n => Math.round(n / 3) * 3;      // reste sur la grille de 3 px

/* ---------- Mesure ---------- */
const mctx = document.createElement('canvas').getContext('2d');
export function mw(text, weight, family, sizePx) {
  mctx.font = `${weight} ${sizePx * 100}px ${family}`;
  return mctx.measureText(text).width / 100;
}
export const SANS = FONT.sans, SERIF = FONT.serif;

/* ---------- Tenir dans la place disponible : réduction ponctuelle de la taille, puis ellipse en dernier recours ---------- */
export function fitSize(text, weight, family, size, maxW, minK = 0.6) {
  const w = mw(text, weight, family, size);
  return !w || w <= maxW ? size : Math.max(size * minK, size * maxW / w * 0.98);
}
export function ellipsize(text, weight, family, size, maxW) {
  if (mw(text, weight, family, size) <= maxW + 0.5) return text;
  let t = String(text); while (t.length > 1 && mw(t + '…', weight, family, size) > maxW) t = t.slice(0, -1);
  return t + '…';
}
/** { size, text } : texte d'une ligne qui ne dépasse jamais maxW */
export function fitText(text, weight, family, size, maxW, minK = 0.6) {
  const sz = fitSize(text, weight, family, size, maxW, minK);
  return { size: sz, text: ellipsize(text, weight, family, sz, maxW) };
}

/* ---------- Texte riche (**gras**) ---------- */
function paragraphs(text) {
  const paras = [[]]; let cur = [];
  const flush = () => { if (cur.length) { paras[paras.length - 1].push(cur); cur = []; } };
  let b = false, i = false, u = false;
  String(text || '').replace(/\r\n?/g, '\n').split(/(\*\*|__|~~)/).forEach(seg => {
    if (seg === '**') { b = !b; return; } if (seg === '__') { u = !u; return; } if (seg === '~~') { i = !i; return; }
    for (const part of (seg.match(/\n|[^\S\n]+|\S+/g) || [])) {
      if (part === '\n') { flush(); paras.push([]); }
      else if (/^\s+$/.test(part)) flush();
      else cur.push({ t: part, b, i, u });
    }
  });
  flush();
  return paras;
}
export const runsW = (runs, size) => runs.reduce((a, r) => a + mw(r.t, r.b ? 700 : 400, SANS, size), 0);

/** Coupe un mot plus large que maxW en morceaux qui tiennent */
function splitWord(runs, size, maxW) {
  const out = []; let cur = [], cw = 0;
  for (const r of runs) for (const ch of r.t) {
    const c = mw(ch, r.b ? 700 : 400, SANS, size);
    if (cur.length && cw + c > maxW) { out.push(cur); cur = []; cw = 0; }
    const l = cur[cur.length - 1]; if (l && l.b === r.b && l.i === r.i && l.u === r.u) l.t += ch; else cur.push({ ...r, t: ch });
    cw += c;
  }
  if (cur.length) out.push(cur);
  return out;
}

/** Retourne des lignes [{runs:[{t,b}], head}] : titre en gras puis texte, césure sur maxW */
export function textLines(title, text, size, maxW) {
  const out = [], sp = mw(' ', 400, SANS, size);
  const add = (src, head) => {
    for (const words of paragraphs(src)) {
      if (!words.length) continue;
      let cur = [], cw = 0;
      for (let w of words.flatMap(x => (maxW > 0 && runsW(x, size) > maxW ? splitWord(x, size, maxW) : [x]))) {
        const w1 = runsW(w, size);
        if (!cur.length) { cur = [...w]; cw = w1; }
        else if (cw + sp + w1 <= maxW) { cur.push({ t: ' ', b: false }, ...w); cw += sp + w1; }
        else { out.push({ runs: cur, head }); cur = [...w]; cw = w1; }
      }
      out.push({ runs: cur, head });
    }
  };
  if (title && title.trim()) add('**' + title.replace(/\*\*|__|~~/g, '') + '**', true);
  if (text && text.trim()) add(text, false);
  return out;
}

/** <g> de lignes : x, haut y0, interligne lh. align: start | middle | end */
export function drawLines(lines, x, y0, lh, size, align = 'start') {
  const g = s('g', { 'font-size': size });
  lines.forEach((l, i) => {
    const t = s('text', { x, y: y0 + i * lh + lh / 2 + 0.33 * size, 'text-anchor': align, style: { whiteSpace: 'pre' } });
    for (const r of l.runs) t.append(s('tspan', { 'font-weight': r.b ? 700 : 400, 'font-style': r.i ? 'italic' : null, 'text-decoration': r.u ? 'underline' : null }, r.t));
    g.append(t);
  });
  return g;
}

/* ---------- Nombres ---------- */
export function fmt(v, locale, decimals) {
  const d = Math.max(0, Math.min(6, Math.round(+decimals || 0)));
  try { return new Intl.NumberFormat(locale || 'en-GB', { minimumFractionDigits: d, maximumFractionDigits: d }).format(v); }
  catch (e) { return String(v); }
}
export const typePx = k => ({ size: pxOf(TYPE[k].size), lh: TYPE[k].lh, weight: TYPE[k].weight });

/** Légende commune (pastille arrondie 0,5 pt + libellé), posée à la hauteur y */
export function drawLegend(svg, series, y, W = Infinity) {
  const base = pxOf(TYPE.caption.size), fixed = VIZ.legendSwatch + VIZ.barGap * 2, gap = VIZ.legendH * 1.2;
  const names = series.map(sr => sr.name || '');
  const need = size => names.reduce((a, t) => a + fixed + mw(t, TYPE.caption.weight, SANS, size), 0) + gap * Math.max(0, names.length - 1);
  let capPx = base; if (need(base) > W) capPx = Math.max(base * 0.7, base * (W - names.length * fixed - gap * (names.length - 1)) / (need(base) - names.length * fixed - gap * (names.length - 1)));
  const room = names.length ? Math.max(20, (W - gap * (names.length - 1)) / names.length - fixed) : 0;
  let x = 0;
  series.forEach((sr, i) => {
    svg.append(s('rect', { x: x + SW / 2, y: y + (VIZ.legendH - VIZ.legendSwatch) / 2 + SW / 2, width: VIZ.legendSwatch - SW, height: VIZ.legendSwatch - SW, rx: VIZ.barRadius, fill: colorRef(sr.color), stroke: 'currentColor', 'stroke-width': SW }));
    const lx = x + fixed, t = need(base) > W ? ellipsize(names[i], TYPE.caption.weight, SANS, capPx, room) : names[i];
    svg.append(s('text', { x: lx, y: y + VIZ.legendH / 2 + 0.33 * capPx, 'font-size': capPx, 'font-weight': TYPE.caption.weight }, t));
    x = lx + mw(t, TYPE.caption.weight, SANS, capPx) + gap;
  });
}
export const numVal = (r, j) => Math.max(0, +(r.v || [])[j] || 0);
