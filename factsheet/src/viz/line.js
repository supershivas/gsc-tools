/* Courbes : trait 0,5 pt (design system), points remplis de la couleur de la série et cerclés 0,5 pt. */
import { VIZ, TYPE } from '../tokens.js';
import { s, SW, colorRef, pxOf, fmt, round3, drawLegend, numVal, fitText, SANS, SERIF } from './util.js';

export default {
  label: 'Courbes',
  defaults: () => ({
    ratio: '16:9', legend: true, showValues: false, decimals: 0, suffix: '', zero: true,
    series: [{ name: 'Série 1', color: 'blue' }, { name: 'Série 2', color: 'yellow' }],
    rows: [{ label: '2021', v: [20, 45] }, { label: '2022', v: [34, 40] }, { label: '2023', v: [52, 38] }, { label: '2024', v: [60, 49] }, { label: '2025', v: [78, 55] }],
  }),
  fields: [
    { k: 'ratio', t: 'select', label: 'Format du graphique', options: { '2:1': '2:1 (large)', '16:9': '16:9', '3:2': '3:2', '1:1': '1:1 (carré)' } },
    { k: 'zero', t: 'bool', label: 'Axe vertical démarrant à zéro' },
    { k: 'legend', t: 'bool', label: 'Afficher la légende' },
    { k: 'showValues', t: 'bool', label: 'Afficher les valeurs' },
    { k: 'decimals', t: 'number', label: 'Décimales des valeurs', min: 0, max: 4 },
    { k: 'suffix', t: 'text', label: 'Unité après la valeur (%, M€…)' },
    { t: 'table', k: 'rows', series: 'series', maxSeries: 4, label: 'Données' },
  ],
  render(o, W, env) {
    const series = o.series || [], rows = o.rows || [], n = Math.max(1, rows.length);
    const H = Math.max(round3(W * (VIZ.ratios[o.ratio] || 0.5625)), 120);
    const baseY = H - (o.legend ? VIZ.legendGap + VIZ.legendH : 0) - VIZ.catH, top = (o.showValues ? VIZ.plotTop : 0) + VIZ.pointR, plotH = baseY - top - VIZ.pointR;
    const all = rows.flatMap(r => series.map((_, j) => numVal(r, j)));
    let lo = o.zero === false ? Math.min(...all) : 0, hi = Math.max(...all, lo + 1e-9);
    if (o.zero === false) { const pad = (hi - lo) * 0.1 || 1; lo -= pad; hi += pad; }
    const slot = W / n, capPx = pxOf(TYPE.caption.size), numPx = pxOf(TYPE.captionNum.size), suffix = o.suffix || '';
    const xOf = i => slot * (i + 0.5), yOf = v => baseY - VIZ.pointR - (v - lo) / (hi - lo) * plotH;
    const svg = s('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, style: { display: 'block', overflow: 'visible' } });
    svg.append(s('line', { x1: 0, y1: baseY, x2: W, y2: baseY, stroke: 'currentColor', 'stroke-width': SW }));
    series.forEach((sr, j) => {
      const d = rows.map((r, i) => `${i ? 'L' : 'M'}${xOf(i)},${yOf(numVal(r, j))}`).join('');
      svg.append(s('path', { d, fill: 'none', stroke: 'currentColor', 'stroke-width': SW, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
    });
    series.forEach((sr, j) => rows.forEach((r, i) => {
      svg.append(s('circle', { cx: xOf(i), cy: yOf(numVal(r, j)), r: VIZ.pointR, fill: colorRef(sr.color), stroke: 'currentColor', 'stroke-width': SW }));
      if (o.showValues) { const f = fitText(fmt(numVal(r, j), env.locale, o.decimals) + suffix, 700, SERIF, numPx, slot - 2, 0.5); svg.append(s('text', { x: xOf(i), y: yOf(numVal(r, j)) - VIZ.pointR - 3, 'text-anchor': 'middle', 'font-size': f.size, 'font-weight': 700, style: { fontFamily: 'var(--t-captionNum-family)' } }, f.text)); }
    }));
    rows.forEach((r, i) => { const f = fitText(r.label || '', TYPE.caption.weight, SANS, capPx, slot - 3, 0.6); svg.append(s('text', { x: xOf(i), y: baseY + VIZ.catH / 2 + 0.33 * f.size + 1, 'text-anchor': 'middle', 'font-size': f.size, 'font-weight': TYPE.caption.weight }, f.text)); });
    if (o.legend) drawLegend(svg, series, H - VIZ.legendH, W);
    return { node: svg };
  },
};
