/* Tableau : rendu. Cellules = `div` d'une grille CSS (les fusions sont des `span`, la hauteur des lignes suit le contenu) ;
   traits = un calque SVG de `<line>` (épaisseur exacte jusqu'à 0,25 pt, pointillés, trait centré sur l'arête comme dans InDesign),
   dont la topologie vient du modèle (`tableSegments`) et la position de la mise en page réelle (`layoutTable`, appelé par measure()).
   Tout est un vrai élément HTML/SVG : l'export PDF et l'aperçu 3D le lisent tels quels. */
import { h, richText } from '../render.js';
import { s } from '../viz/util.js';
import { fillOf, fgOf, headCount, tableSegments, padOf, ahOf, isNumCol } from './model.js';
import { prefixOf, parseLine } from '../textstyles.js';

const PX = 96 / 72; // pt → px
const AV = { top: 'flex-start', center: 'center', bottom: 'flex-end' };

/** Style de paragraphe de la cellule appliqué aux lignes qui n'en ont pas (les puces et listes numérotées restent du texte courant) */
function styled(text, st) {
  if (!st || st === 'body') return text;
  const pre = prefixOf(st);
  return String(text || '')
    .split('\n')
    .map((l) => (l.trim() && !parseLine(l.trim()).key && !/^([-•]|\d{1,2}\.)\s/.test(l.trim()) ? pre + l.trim() : l))
    .join('\n');
}

/** Nœud du tableau, à la largeur de sa colonne */
export function renderTable(tb, env) {
  const grid = h('div', {
    class: 'tbl',
    style: {
      gridTemplateColumns: tb.cols.map((c) => `minmax(0, ${+c.w > 0 ? +c.w : 1}fr)`).join(' '),
      gridTemplateRows: tb.rows.map((r) => (+r.h > 0 ? `minmax(${+r.h}px, auto)` : 'auto')).join(' '),
    },
  });
  for (const cl of tb.cells) {
    const kind = (tb.rows[cl.r] || {}).kind,
      fill = fillOf(tb, cl),
      fg = fgOf(tb, cl),
      [py, px] = padOf(cl);
    const el = h(
      'div',
      {
        class: 'tbl-cell' + (isNumCol(tb, cl.c) ? ' tbl-num' : '') + (kind === 'head' ? ' tbl-head' : kind === 'foot' ? ' tbl-foot' : ''),
        style: {
          gridRow: `${cl.r + 1} / span ${cl.rs}`,
          gridColumn: `${cl.c + 1} / span ${cl.cs}`,
          justifyContent: AV[cl.av] || AV.top,
          ...(cl.pad && cl.pad !== 'normal' ? { padding: `${py}px ${px}px`, minHeight: `calc(var(--t-small-lh) + ${2 * py}px)` } : {}),
        },
        dataset: { cell: cl.id },
      },
      richText(styled(cl.text, cl.st), ahOf(tb, cl), cl.adv || null, env),
    );
    if (fill !== 'none') el.style.background = `var(--c-${fill})`;
    if (fg !== 'none') {
      el.style.color = `var(--c-${fg})`;
      el.style.setProperty('--c-text', `var(--c-${fg})`);
    }
    grid.append(el);
  }
  const lines = tableSegments(tb).map((g) =>
    s('line', {
      fill: 'none',
      stroke: `var(--c-${g.s.color})`,
      'stroke-width': +(g.s.w * PX).toFixed(4),
      'stroke-dasharray': g.s.dash ? g.s.dash.map((v) => +(v * PX).toFixed(4)).join(' ') : null,
      'data-o': g.o,
      'data-i': g.i,
      'data-a': g.a,
      'data-b': g.b,
      'data-e0': +(g.e0 * PX).toFixed(4),
      'data-e1': +(g.e1 * PX).toFixed(4),
    }),
  );
  grid.append(s('svg', { class: 'tbl-lines', width: 0, height: 0, 'aria-hidden': 'true' }, ...lines));
  grid.dataset.head = headCount(tb);
  return grid;
}

/** Positions des limites de pistes (px, depuis le bord du tableau) d'après les tailles calculées par la grille (non arrondies, hors zoom de l'aperçu) */
function edgesOf(list, n) {
  const sizes = String(list || '')
    .trim()
    .split(/\s+/)
    .map(parseFloat);
  if (sizes.length !== n || sizes.some((v) => !Number.isFinite(v))) return null;
  const out = [0];
  sizes.forEach((v) => out.push(out[out.length - 1] + v));
  return out;
}
/** Limites des colonnes (xs) et des lignes (ys) du tableau rendu, en px non zoomés depuis son bord ; null avant la mise en page */
export function trackEdges(tbl) {
  const cs = getComputedStyle(tbl),
    xs = edgesOf(cs.gridTemplateColumns, cs.gridTemplateColumns.trim().split(/\s+/).length),
    ys = edgesOf(cs.gridTemplateRows, cs.gridTemplateRows.trim().split(/\s+/).length);
  return xs && ys ? { xs, ys } : null;
}
/** Cale les traits du calque sur la mise en page réelle (après le rendu, comme les contours en pointillés) */
export function layoutTable(tbl) {
  const svg = tbl.querySelector(':scope > .tbl-lines');
  if (!svg) return;
  const e = trackEdges(tbl);
  if (!e) return;
  const { xs, ys } = e;
  svg.setAttribute('width', xs[xs.length - 1]);
  svg.setAttribute('height', ys[ys.length - 1]);
  for (const ln of svg.children) {
    const d = ln.dataset,
      i = +d.i,
      a = +d.a,
      b = +d.b,
      e0 = +d.e0 || 0,
      e1 = +d.e1 || 0;
    const set = (x1, y1, x2, y2) =>
      [
        ['x1', x1],
        ['y1', y1],
        ['x2', x2],
        ['y2', y2],
      ].forEach(([k, v]) => ln.setAttribute(k, +v.toFixed(3)));
    if (d.o === 'h') set(xs[a] - e0, ys[i], xs[b] + e1, ys[i]);
    else set(xs[i], ys[a] - e0, xs[i], ys[b] + e1);
  }
}
