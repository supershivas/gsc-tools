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
const REF = 200;
export function mw(text, weight, family, sizePx) {
  /* taille de référence fixe : certains navigateurs plafonnent la taille de police du canvas (~2000 px), ce qui sous-mesurait les grands textes (ex. 32 px × 100) */
  mctx.font = `${weight} ${REF}px ${family}`;
  return mctx.measureText(text).width * sizePx / REF;
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

/* ---------- Couleurs automatiques, lisibilité, hauteur ---------- */
/** Ordre des couleurs quand rien n'est choisi (clés de palette) */
export const CYCLE = ['blue', 'sky', 'yellow', 'slate', 'grey'];
export const autoColor = (c, i) => c || CYCLE[i % CYCLE.length];
const lum = hex => { const n = parseInt(String(hex).replace('#', ''), 16); if (isNaN(n)) return 1; const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(n >> 16 & 255) + 0.7152 * f(n >> 8 & 255) + 0.0722 * f(n & 255); };
/** couleur de texte lisible sur le fond `key` (blanc sur fond sombre, sinon la couleur du texte) ; `alpha` = opacité du fond sur du blanc */
export function inkOn(env, key, alpha = 1) {
  const hex = key === 'white' ? '#FFFFFF' : (env && env.pal && env.pal[String(key).replace(/^tint-/, '')]) || null;
  if (!hex) return 'currentColor';
  const l = lum(hex), mixed = 1 - alpha + alpha * l;
  return mixed < 0.45 ? '#FFFFFF' : 'currentColor';
}
/** hauteur d'une dataviz : modes auto | ratio | fixed | fill (voir « Hauteur » de l'éditeur). `auto` = hauteur naturelle du type. */
export function heightOf(o, W, env, auto, ratioDef = '16:9') {
  const mode = o.hmode || 'ratio', ratio = VIZ.ratios[o.ratio || ratioDef] || 0.5625;
  const clamp = v => Math.max(o.hmin || 90, Math.min(o.hmax || 900, v));
  let H;
  if (mode === 'auto' && auto != null) H = auto;
  else if (mode === 'fixed') H = +o.hfixed || round3(W * ratio);
  else if (mode === 'fill' && env && env.fillH) H = clamp(env.fillH);
  else H = W * ratio;
  return Math.max(90, mode === 'fill' ? Math.floor(H / 3) * 3 : round3(H));   // « remplir » arrondit vers le bas : jamais de débordement
}

/* ---------- Légende qui passe à la ligne ---------- */
export function layoutLegend(items, W) {
  const capPx = pxOf(TYPE.caption.size), fixed = VIZ.legendSwatch + VIZ.barGap * 2, gap = VIZ.legendH * 1.2, lines = [[]]; let x = 0;
  for (const it of items) {
    const name = ellipsize(it.name || '', TYPE.caption.weight, SANS, capPx, Math.max(30, W - fixed)), w = fixed + mw(name, TYPE.caption.weight, SANS, capPx);
    if (x > 0 && x + w > W) { lines.push([]); x = 0; }
    lines[lines.length - 1].push({ color: it.color, name, x, w }); x += w + gap;
  }
  return { lines, h: lines.length * VIZ.legendH + (lines.length - 1) * 3, capPx, fixed };
}
export function drawLegendWrap(svg, L, y) {
  L.lines.forEach((line, i) => line.forEach(e => {
    const yy = y + i * (VIZ.legendH + 3);
    svg.append(s('rect', { x: e.x + SW / 2, y: yy + (VIZ.legendH - VIZ.legendSwatch) / 2 + SW / 2, width: VIZ.legendSwatch - SW, height: VIZ.legendSwatch - SW, rx: VIZ.barRadius, fill: colorRef(e.color), stroke: 'currentColor', 'stroke-width': SW }));
    svg.append(s('text', { x: e.x + L.fixed, y: yy + VIZ.legendH / 2 + 0.33 * L.capPx, 'font-size': L.capPx, 'font-weight': TYPE.caption.weight }, e.name));
  }));
}

/* Les mesures de texte (canvas) ne déclenchent pas le chargement des polices : sans cela, un premier rendu mesure avec une police de secours plus étroite
   et le texte déborde une fois la vraie police chargée. À attendre avant tout rendu qui mesure. */
const FONT_SPECS = ['200 16px "Source Sans 3"', '400 16px "Source Sans 3"', '600 16px "Source Sans 3"', '700 16px "Source Sans 3"', 'italic 400 16px "Source Sans 3"', 'italic 700 16px "Source Sans 3"',
  '400 16px "Source Serif 4"', '600 16px "Source Serif 4"', '700 16px "Source Serif 4"'];
let fontsLoaded = null;
export const loadFonts = () => fontsLoaded || (fontsLoaded = (document.fonts && document.fonts.load ? Promise.all(FONT_SPECS.map(f => document.fonts.load(f, 'AaÉé€0123 ').catch(() => {}))).then(() => document.fonts.ready) : Promise.resolve()));
