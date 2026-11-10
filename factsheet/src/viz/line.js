/* Courbes : trait 0,5 pt (design system), points remplis de la couleur de la série et cerclés 0,5 pt. */
import { VIZ, TYPE } from '../tokens.js';
import {
  reorderHit,
  heightOf,
  s,
  SW,
  colorRef,
  pxOf,
  fmt,
  drawLegend,
  numVal,
  fitText,
  mw,
  SANS,
  SERIF,
  elColor,
  ticks,
  tickFmt,
  gridOn,
  gridN,
  gridLine,
  scaleTop,
} from './util.js';
import { axesFields, axisTitleFields } from './axes.js';
import { t } from '../i18n.js';

/** Aspect d'origine de la carte « Axes et grille » (courbes d'avant la carte : ligne de base seule) */
const ORIGIN = { grid: false, gridStyle: 'solid', gridTone: 'light', axisValues: false, baseline: true };

export default {
  label: 'Courbes',
  icon: 'chart-line',
  family: 'trend',
  defaults: () => ({
    ratio: '16:9',
    legend: true,
    showValues: false,
    decimals: 0,
    suffix: '',
    zero: true,
    grid: true,
    gridStyle: 'solid',
    gridTone: 'light',
    axisValues: true,
    baseline: true,
    scaleMax: 0,
    gridCount: '0',
    series: [
      { name: `${t('Série')} 1`, color: 'blue' },
      { name: `${t('Série')} 2`, color: 'yellow' },
    ],
    rows: [
      { label: '2021', v: [20, 45] },
      { label: '2022', v: [34, 40] },
      { label: '2023', v: [52, 38] },
      { label: '2024', v: [60, 49] },
      { label: '2025', v: [78, 55] },
    ],
  }),
  heights: ['ratio', 'fixed', 'fill'],
  fields: [
    {
      k: 'ratio',
      t: 'select',
      label: 'Format du graphique',
      options: { '2:1': '2:1 (large)', '16:9': '16:9', '3:2': '3:2', '1:1': '1:1 (carré)' },
    },
    ...axesFields(ORIGIN),
    ...axisTitleFields(),
    { k: 'zero', g: 'axes', t: 'bool', label: 'Axe vertical démarrant à zéro' },
    { k: 'legend', g: 'labels', t: 'bool', label: 'Afficher la légende' },
    {
      k: 'legendPos',
      g: 'labels',
      when: (o) => !!o.legend,
      why: 'Activez « Afficher la légende » pour choisir sa position.',
      t: 'select',
      label: 'Position de la légende',
      options: { bottom: 'En bas', top: 'En haut' },
    },
    { k: 'showValues', g: 'labels', t: 'bool', label: 'Afficher les valeurs' },
    {
      k: 'decimals',
      g: 'labels',
      when: (o) => !!o.showValues || !!o.axisValues,
      why: 'Activez « Afficher les valeurs » ou « Valeurs de l’axe » pour régler ce format.',
      t: 'number',
      label: 'Décimales des valeurs',
      min: 0,
      max: 4,
    },
    {
      k: 'suffix',
      g: 'labels',
      when: (o) => !!o.showValues || !!o.axisValues,
      why: 'Activez « Afficher les valeurs » ou « Valeurs de l’axe » pour régler ce format.',
      t: 'text',
      label: 'Unité après la valeur (%, M€…)',
    },
    { t: 'table', k: 'rows', series: 'series', maxSeries: 4, label: 'Données' },
  ],
  render(o, W, env) {
    const series = o.series || [],
      rows = o.rows || [],
      n = Math.max(1, rows.length);
    const H = Math.max(120, heightOf(o, W, env, null));
    const capPx = pxOf(TYPE.caption.size),
      numPx = pxOf(TYPE.captionNum.size),
      suffix = o.suffix || '';
    const yT = o.yTitle ? capPx * 1.7 : 0, // titre de l'axe vertical, au-dessus du graphique
      xT = o.xTitle ? capPx * 1.5 : 0; // titre de l'axe horizontal, sous les catégories
    const baseY = H - (o.legend ? VIZ.legendGap + VIZ.legendH : 0) - VIZ.catH - xT,
      top = (o.showValues ? VIZ.plotTop : 0) + VIZ.pointR + yT,
      plotH = baseY - top - VIZ.pointR;
    const all = rows.flatMap((r) => series.map((_, j) => numVal(r, j)));
    let lo = o.zero === false ? Math.min(...all) : 0,
      hi = Math.max(...all, lo + 1e-9);
    if (o.zero === false) {
      const pad = (hi - lo) * 0.1 || 1;
      lo -= pad;
      hi += pad;
    }
    hi = scaleTop(o, hi);
    /* graduations : grille et valeurs de l'axe (à gauche, la réserve décale le graphique) */
    const axV = !!o.axisValues,
      grid = gridOn(o),
      base = o.baseline ?? ORIGIN.baseline;
    const tk = grid || axV ? ticks(lo, hi, gridN(o, 5)) : null,
      tickTxt = (v) => tickFmt(v, tk, env.locale, o.decimals) + suffix;
    const px0 = axV ? Math.max(0, ...tk.out.map((v) => mw(tickTxt(v), 400, SANS, capPx))) + 8 : 0;
    const slot = (W - px0) / n;
    const xOf = (i) => px0 + slot * (i + 0.5),
      yOf = (v) => baseY - VIZ.pointR - ((v - lo) / (hi - lo)) * plotH;
    const svg = s('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, style: { display: 'block', overflow: 'visible' } });
    if (tk)
      tk.out.forEach((v) => {
        const y = yOf(v);
        if (grid && !(base && v <= lo)) svg.append(gridLine(o, px0, y, W, y)); // la ligne de base remplace celle du bas de l'échelle
        if (axV) svg.append(s('text', { x: px0 - 6, y: y + 0.33 * capPx, 'text-anchor': 'end', 'font-size': capPx }, tickTxt(v)));
      });
    if (base) svg.append(s('line', { x1: px0, y1: baseY, x2: W, y2: baseY, stroke: 'currentColor', 'stroke-width': SW }));
    if (o.yTitle)
      svg.append(s('text', { x: 0, y: capPx, 'font-size': capPx, 'font-weight': 700 }, fitText(o.yTitle, 700, SANS, capPx, W, 0.7).text));
    if (o.xTitle)
      svg.append(
        s(
          'text',
          { x: (px0 + W) / 2, y: baseY + VIZ.catH + capPx * 1.2, 'text-anchor': 'middle', 'font-size': capPx, 'font-weight': 700 },
          fitText(o.xTitle, 700, SANS, capPx, W - px0, 0.7).text,
        ),
      );
    series.forEach((sr, j) => {
      const d = rows.map((r, i) => `${i ? 'L' : 'M'}${xOf(i)},${yOf(numVal(r, j))}`).join('');
      svg.append(
        s('path', { d, fill: 'none', stroke: 'currentColor', 'stroke-width': SW, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }),
      );
    });
    series.forEach((sr, j) =>
      rows.forEach((r, i) => {
        svg.append(
          s('circle', {
            'data-color': env.ui ? `rows.${i}.colors.${j}` : null,
            'data-color-base': env.ui ? `series.${j}.color` : null,
            cx: xOf(i),
            cy: yOf(numVal(r, j)),
            r: VIZ.pointR,
            fill: colorRef(elColor(r, j, sr)),
            stroke: 'currentColor',
            'stroke-width': SW,
          }),
        );
        if (o.showValues) {
          const f = fitText(fmt(numVal(r, j), env.locale, o.decimals) + suffix, 700, SERIF, numPx, slot - 2, 0.5);
          svg.append(
            s(
              'text',
              {
                x: xOf(i),
                y: yOf(numVal(r, j)) - VIZ.pointR - 3,
                'text-anchor': 'middle',
                'font-size': f.size,
                'font-weight': 700,
                style: { fontFamily: 'var(--t-captionNum-family)' },
              },
              f.text,
            ),
          );
        }
      }),
    );
    rows.forEach((r, i) => {
      const f = fitText(r.label || '', TYPE.caption.weight, SANS, capPx, slot - 3, 0.6);
      svg.append(
        s(
          'text',
          {
            x: xOf(i),
            y: baseY + VIZ.catH / 2 + 0.33 * f.size + 1,
            'text-anchor': 'middle',
            'font-size': f.size,
            'font-weight': TYPE.caption.weight,
          },
          f.text,
        ),
      );
    });
    if (o.legend) drawLegend(svg, series, H - VIZ.legendH, W);
    rows.forEach((_, i) => svg.append(reorderHit(env, 'rows', i, 'x', px0 + slot * i, 0, slot, baseY + VIZ.catH)));
    return { node: svg };
  },
};
