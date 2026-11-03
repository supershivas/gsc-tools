/* Bulles hiérarchiques (pack) : un cercle par feuille, proportionnel à sa valeur, regroupé dans le cercle de son parent. */
import { layoutLegend, drawLegendWrap } from './util.js';
import { pack } from 'd3-hierarchy';
import { VIZ, TYPE } from '../tokens.js';
import { s, SW, colorRef, pxOf, fmt, mw, SANS, drawLegend, fitText, heightOf, inkOn } from './util.js';
import { HIER_DATA, hierRows, buildHier, topOf, depthAlpha } from './hier.js';
import { t } from '../i18n.js';

export default {
  label: 'Bulles hiérarchiques', icon: 'chart-bubble', family: 'hier',
  defaults: () => ({ ratio: '1:1', pad: 6, showLabels: true, showValues: true, parents: true, legend: true, decimals: 0, suffix: '', rows: hierRows() }),
  fields: [
    { k: 'ratio', t: 'select', label: 'Format du graphique', options: { '1:1': '1:1 (carré)', '3:2': '3:2', '16:9': '16:9' } },
    { k: 'pad', t: 'number', label: 'Espace entre les bulles (px)', min: 0, max: 24 },
    { k: 'parents', t: 'bool', label: 'Afficher le contour des groupes' },
    { k: 'showLabels', t: 'bool', label: 'Afficher les noms' },
    { k: 'showValues', t: 'bool', label: 'Afficher les valeurs' },
    { k: 'legend', t: 'bool', label: 'Afficher la légende (niveau 1)' },
    { k: 'decimals', t: 'number', label: 'Décimales des valeurs', min: 0, max: 4 },
    { k: 'suffix', t: 'text', label: 'Unité après la valeur (%, M€…)' },
  ],
  data: HIER_DATA,
  dataHint: 'Une ligne par feuille ; laissez vides les niveaux inutiles. La couleur du niveau 1 s’applique à toute sa branche.',
  render(o, W, env) {
    const { root, tops } = buildHier(o.rows), capPx = pxOf(TYPE.caption.size), numPx = pxOf(TYPE.captionNum.size), LG = o.legend ? layoutLegend(buildHier(o.rows).tops.map(x => ({ name: x.name, color: x.color })), W) : null, legH = LG ? VIZ.legendGap + LG.h : 0;
    const H = heightOf(o, W, env, null, '1:1');
    const svg = s('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, style: { display: 'block', overflow: 'visible' } });
    if (!root.children) { svg.append(s('text', { x: 0, y: capPx, 'font-size': capPx }, t('Aucune donnée'))); return { node: svg }; }
    const ph = H - legH; pack().size([W, ph]).padding(Math.max(0, +o.pad || 0))(root);
    const g = s('g'), labels = s('g');
    for (const n of root.descendants()) {
      if (!n.depth) continue;
      const key = topOf(n).data.color, leaf = !n.children, a = leaf ? depthAlpha(n.depth) : 0.14;
      if (!leaf && !o.parents) continue;
      g.append(s('circle', { cx: n.x, cy: n.y, r: Math.max(0.5, n.r), fill: colorRef(key), 'fill-opacity': a, stroke: 'currentColor', 'stroke-width': SW }));
      if (leaf && o.showLabels && n.r > 12) {
        const maxW = n.r * 1.7, f = fitText(n.data.name, 400, SANS, capPx, maxW, 0.6), ink = inkOn(env, key, a);
        if (f.text !== n.data.name || mw(f.text, 400, SANS, f.size) > maxW) continue;
        const withV = o.showValues && n.r > capPx * 1.6, dy = withV ? -0.15 * f.size : 0.33 * f.size;
        labels.append(s('text', { x: n.x, y: n.y + dy, 'text-anchor': 'middle', 'font-size': f.size, fill: ink }, f.text));
        if (withV) labels.append(s('text', { x: n.x, y: n.y + dy + numPx * 1.05, 'text-anchor': 'middle', 'font-size': Math.min(numPx, f.size), 'font-weight': 700, fill: ink, style: { fontFamily: 'var(--t-captionNum-family)' } }, fmt(n.value, env.locale, o.decimals) + (o.suffix || '')));
      }
    }
    svg.append(g, labels);
    if (LG) drawLegendWrap(svg, LG, H - LG.h);
    return { node: svg };
  },
};
