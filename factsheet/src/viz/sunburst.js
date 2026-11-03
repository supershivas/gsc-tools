/* Sunburst : anneaux concentriques, un par niveau de la hiérarchie ; la couleur est celle du niveau 1, de plus en plus claire vers l'extérieur. */
import { layoutLegend, drawLegendWrap } from './util.js';
import { partition } from 'd3-hierarchy';
import { VIZ, TYPE } from '../tokens.js';
import { s, SW, colorRef, pxOf, fmt, mw, SANS, drawLegend, fitText, heightOf, inkOn } from './util.js';
import { HIER_DATA, hierRows, buildHier, topOf, depthAlpha } from './hier.js';
import { t } from '../i18n.js';

const pt = (r, a) => [r * Math.sin(a), -r * Math.cos(a)];
function arc(a0, a1, r0, r1) {
  if (a1 - a0 >= Math.PI * 2 - 1e-4) a1 = a0 + Math.PI * 2 - 1e-4;
  const [x0, y0] = pt(r1, a0), [x1, y1] = pt(r1, a1), [x2, y2] = pt(r0, a1), [x3, y3] = pt(r0, a0), big = a1 - a0 > Math.PI ? 1 : 0;
  return `M${x0},${y0}A${r1},${r1} 0 ${big} 1 ${x1},${y1}` + (r0 > 0.5 ? `L${x2},${y2}A${r0},${r0} 0 ${big} 0 ${x3},${y3}Z` : `L0,0Z`);
}

export default {
  label: 'Sunburst', icon: 'chart-arcs', family: 'hier',
  defaults: () => ({ ratio: '1:1', hole: 0.22, showLabels: true, showTotal: true, legend: true, decimals: 0, suffix: '', rows: hierRows() }),
  fields: [
    { k: 'ratio', t: 'select', label: 'Format du graphique', options: { '1:1': '1:1 (carré)', '3:2': '3:2', '16:9': '16:9' } },
    { k: 'hole', t: 'number', label: 'Trou central (0 à 0,6 du rayon)', min: 0, max: 0.6, step: 0.02 },
    { k: 'showLabels', t: 'bool', label: 'Afficher les noms sur les arcs' },
    { k: 'showTotal', t: 'bool', label: 'Afficher le total au centre' },
    { k: 'legend', t: 'bool', label: 'Afficher la légende (niveau 1)' },
    { k: 'decimals', t: 'number', label: 'Décimales des valeurs', min: 0, max: 4 },
    { k: 'suffix', t: 'text', label: 'Unité après la valeur (%, M€…)' },
  ],
  data: HIER_DATA,
  dataHint: 'Une ligne par feuille ; laissez vides les niveaux inutiles. La couleur du niveau 1 s’applique à toute sa branche.',
  render(o, W, env) {
    const { root, tops } = buildHier(o.rows), capPx = pxOf(TYPE.caption.size), LG = o.legend ? layoutLegend(buildHier(o.rows).tops.map(x => ({ name: x.name, color: x.color })), W) : null, legH = LG ? VIZ.legendGap + LG.h : 0;
    const H = heightOf(o, W, env, null, '1:1');
    const svg = s('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, style: { display: 'block', overflow: 'visible' } });
    if (!root.children) { svg.append(s('text', { x: 0, y: capPx, 'font-size': capPx }, t('Aucune donnée'))); return { node: svg }; }
    const R = Math.max(30, Math.min(W / 2, (H - legH) / 2) - 1), hole = Math.max(0, Math.min(0.6, +o.hole || 0)) * R;
    const depth = root.height, ring = (R - hole) / depth;
    partition().size([Math.PI * 2, 1])(root);
    const g = s('g', { transform: `translate(${W / 2},${R + 1})` }), labels = s('g');
    for (const n of root.descendants()) {
      if (!n.depth) continue;
      const r0 = hole + (n.depth - 1) * ring, r1 = r0 + ring, key = topOf(n).data.color, a = depthAlpha(n.depth);
      g.append(s('path', { d: arc(n.x0, n.x1, r0, r1), fill: colorRef(key), 'fill-opacity': a, stroke: 'currentColor', 'stroke-width': SW, 'stroke-linejoin': 'round' }));
      if (o.showLabels) {
        const mid = (n.x0 + n.x1) / 2, rm = (r0 + r1) / 2, arcLen = (n.x1 - n.x0) * rm, name = n.data.name;
        if (arcLen < 14 || ring < 14) continue;
        const f = fitText(name, 400, SANS, capPx, Math.min(ring * 1.5, arcLen - 6), 0.62);
        if (f.text !== name || mw(f.text, 400, SANS, f.size) > arcLen - 4) continue;
        const [x, y] = pt(rm, mid);
        labels.append(s('text', { x, y: y + 0.33 * f.size, 'text-anchor': 'middle', 'font-size': f.size, fill: inkOn(env, key, a), style: { pointerEvents: 'none' } }, f.text));
      }
    }
    svg.append(g); g.append(labels);
    if (o.showTotal && hole > 28) {
      const total = fmt(root.value, env.locale, o.decimals) + (o.suffix || ''), f = fitText(total, 700, SANS, pxOf(TYPE.captionNum.size) * 1.2, hole * 1.7, 0.5);
      g.append(s('text', { x: 0, y: 0.33 * f.size, 'text-anchor': 'middle', 'font-size': f.size, 'font-weight': 700 }, f.text));
    }
    if (LG) drawLegendWrap(svg, LG, H - LG.h);
    return { node: svg };
  },
};
