/* Treemap : rectangles proportionnels aux valeurs, groupés par niveau 1 (étiquette de groupe en tête). */
import { layoutLegend, drawLegendWrap } from './util.js';
import { treemap, treemapSquarify } from 'd3-hierarchy';
import { VIZ, TYPE } from '../tokens.js';
import { s, SW, colorRef, pxOf, fmt, mw, SANS, drawLegend, fitText, heightOf, inkOn, round3 } from './util.js';
import { HIER_DATA, hierRows, buildHier, topOf, depthAlpha, lineAttrs, toneAlpha, LINE_FIELD, TONE_FIELD } from './hier.js';
import { t } from '../i18n.js';

export default {
  label: 'Treemap',
  icon: 'chart-treemap',
  family: 'hier',
  defaults: () => ({
    ratio: '3:2',
    pad: 3,
    showLabels: true,
    showValues: true,
    groupLabels: true,
    legend: false,
    decimals: 0,
    suffix: '',
    rows: hierRows(),
  }),
  heights: ['ratio', 'fixed', 'fill'],
  fields: [
    {
      k: 'ratio',
      t: 'select',
      label: 'Format du graphique',
      options: { '2:1': '2:1 (large)', '16:9': '16:9', '3:2': '3:2', '1:1': '1:1 (carré)' },
    },
    LINE_FIELD,
    TONE_FIELD,
    { k: 'corners', g: 'dims', t: 'select', label: 'Coins des cases', options: { round: 'Arrondis', square: 'Droits' }, def: 'round' },
    { k: 'pad', g: 'dims', t: 'number', label: 'Espace entre les cases (px)', min: 0, max: 12 },
    { k: 'groupLabels', g: 'labels', t: 'bool', label: 'Afficher le nom des groupes (niveau 1)' },
    { k: 'showLabels', g: 'labels', t: 'bool', label: 'Afficher les noms' },
    { k: 'showValues', g: 'labels', t: 'bool', label: 'Afficher les valeurs' },
    { k: 'legend', g: 'labels', t: 'bool', label: 'Afficher la légende (niveau 1)' },
    {
      k: 'legendPos',
      g: 'labels',
      when: (o) => !!o.legend,
      why: 'Activez « Afficher la légende » pour choisir sa position.',
      t: 'select',
      label: 'Position de la légende',
      options: { bottom: 'En bas', top: 'En haut' },
    },
    {
      k: 'decimals',
      g: 'labels',
      when: (o) => !!o.showValues,
      why: 'Activez « Afficher les valeurs » pour régler ce format.',
      t: 'number',
      label: 'Décimales des valeurs',
      min: 0,
      max: 4,
    },
    {
      k: 'suffix',
      g: 'labels',
      when: (o) => !!o.showValues,
      why: 'Activez « Afficher les valeurs » pour régler ce format.',
      t: 'text',
      label: 'Unité après la valeur (%, M€…)',
    },
  ],
  data: HIER_DATA,
  dataHint: 'Une ligne par feuille ; laissez vides les niveaux inutiles. La couleur du niveau 1 s’applique à toute sa branche.',
  render(o, W, env) {
    const { root, tops } = buildHier(o.rows),
      capPx = pxOf(TYPE.caption.size),
      numPx = pxOf(TYPE.captionNum.size),
      LG = o.legend
        ? layoutLegend(
            buildHier(o.rows).tops.map((x) => ({ name: x.name, color: x.color })),
            W,
          )
        : null,
      legH = LG ? VIZ.legendGap + LG.h : 0;
    const H = heightOf(o, W, env, null, '3:2');
    const svg = s('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, style: { display: 'block', overflow: 'visible' } });
    if (!root.children) {
      svg.append(s('text', { x: 0, y: capPx, 'font-size': capPx }, t('Aucune donnée')));
      return { node: svg };
    }
    const pad = Math.max(0, +o.pad || 0),
      head = Math.ceil(capPx * 1.45) + 2;
    treemap()
      .tile(treemapSquarify)
      .size([W, H - legH])
      .paddingInner(pad)
      .paddingOuter(pad)
      .paddingTop((d) => (d.depth === 1 && d.children && o.groupLabels ? head : pad))(root);
    const g = s('g'),
      labels = s('g');
    for (const n of root.descendants()) {
      if (!n.depth) continue;
      const w = n.x1 - n.x0,
        h = n.y1 - n.y0,
        key = topOf(n).data.color,
        leaf = !n.children,
        a = toneAlpha(o, leaf ? depthAlpha(n.depth) : 0.16);
      if (w < 1 || h < 1) continue;
      g.append(
        s('rect', {
          x: n.x0,
          y: n.y0,
          width: w,
          height: h,
          rx: o.corners === 'square' ? 0 : Math.min(VIZ.barRadius, w / 2, h / 2),
          fill: colorRef(key),
          'fill-opacity': a,
          ...lineAttrs(o),
        }),
      );
      const ink = inkOn(env, key, a);
      if (!leaf && n.depth === 1 && o.groupLabels) {
        const f = fitText(n.data.name, 700, SANS, capPx, w - 8, 0.7);
        labels.append(s('text', { x: n.x0 + 5, y: n.y0 + head / 2 + 0.33 * f.size, 'font-size': f.size, 'font-weight': 700 }, f.text));
      } else if (leaf && o.showLabels && w > 28 && h > capPx * 1.3) {
        const f = fitText(n.data.name, 400, SANS, capPx, w - 8, 0.6);
        labels.append(s('text', { x: n.x0 + 4, y: n.y0 + 3 + 0.9 * f.size, 'font-size': f.size, fill: ink }, f.text));
        if (o.showValues && h > capPx * 2.7)
          labels.append(
            s(
              'text',
              {
                x: n.x0 + 4,
                y: n.y0 + 3 + 0.9 * f.size + numPx * 1.1,
                'font-size': Math.min(numPx, f.size),
                'font-weight': 700,
                fill: ink,
                style: { fontFamily: 'var(--t-captionNum-family)' },
              },
              fmt(n.value, env.locale, o.decimals) + (o.suffix || ''),
            ),
          );
      }
    }
    svg.append(g, labels);
    if (LG) drawLegendWrap(svg, LG, H - LG.h);
    return { node: svg };
  },
};
