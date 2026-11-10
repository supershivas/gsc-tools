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

/** Valeurs d'origine des traits et des points (aspect d'avant les réglages : trait 0,5 pt, un point rond par valeur, segments droits) */
const LOOK = { lineWidth: 'thin', points: 'all', pointSize: 'medium', curve: 'linear', area: false };
/** épaisseur du trait en multiples de 0,5 pt */
const WIDTH_K = { thin: 1, medium: 2, thick: 3, xthick: 5 };
/** rayon des points en px ; « Moyen » est le rayon d'avant (VIZ.pointR) */
const POINT_R = { small: 3, medium: VIZ.pointR, large: 6.5 };
const AREA_OPACITY = 0.15;
const r2 = (n) => Math.round(n * 100) / 100;

/** Tracé d'une série : segments droits, courbe monotone (aucun dépassement des données, tangentes de Fritsch–Carlson) ou escalier (palier centré sur chaque point) */
export function curvePath(pts, mode) {
  const n = pts.length,
    P = (p) => `${r2(p[0])},${r2(p[1])}`;
  if (!n) return '';
  let d = `M${P(pts[0])}`;
  if (mode === 'step') {
    for (let i = 1; i < n; i++) {
      const mx = (pts[i - 1][0] + pts[i][0]) / 2;
      d += `L${r2(mx)},${r2(pts[i - 1][1])}L${r2(mx)},${r2(pts[i][1])}L${P(pts[i])}`;
    }
    return d;
  }
  if (mode !== 'smooth' || n < 3) {
    for (let i = 1; i < n; i++) d += `L${P(pts[i])}`;
    return d;
  }
  const h = [],
    dl = [];
  for (let i = 0; i < n - 1; i++) {
    h[i] = pts[i + 1][0] - pts[i][0];
    dl[i] = h[i] ? (pts[i + 1][1] - pts[i][1]) / h[i] : 0;
  }
  const m = pts.map((_, i) => (i === 0 ? dl[0] : i === n - 1 ? dl[n - 2] : dl[i - 1] * dl[i] <= 0 ? 0 : (dl[i - 1] + dl[i]) / 2));
  for (let i = 0; i < n - 1; i++) {
    if (!dl[i]) m[i] = m[i + 1] = 0;
    else {
      const a = m[i] / dl[i],
        b = m[i + 1] / dl[i],
        q = a * a + b * b;
      if (q > 9) {
        const k = 3 / Math.sqrt(q);
        m[i] = k * a * dl[i];
        m[i + 1] = k * b * dl[i];
      }
    }
  }
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = pts[i],
      [x1, y1] = pts[i + 1];
    d += `C${r2(x0 + h[i] / 3)},${r2(y0 + (m[i] * h[i]) / 3)},${r2(x1 - h[i] / 3)},${r2(y1 - (m[i + 1] * h[i]) / 3)},${r2(x1)},${r2(y1)}`;
  }
  return d;
}

/** Tirets d'une série (`dash: 'dashed'`) proportionnels à l'épaisseur du trait ; null = trait plein */
const dashOf = (sr, lw) => (sr && sr.dash === 'dashed' ? `${r2(4 + 2 * lw)} ${r2(3 + 1.5 * lw)}` : null);

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
    {
      k: 'curve',
      g: 'struct',
      t: 'select',
      label: 'Forme du trait',
      options: { linear: 'Droit', smooth: 'Lissé', step: 'En escalier' },
      def: LOOK.curve,
    },
    {
      k: 'points',
      g: 'struct',
      t: 'select',
      label: 'Points',
      options: { all: 'Tous', last: 'Dernier seulement', none: 'Aucun' },
      def: LOOK.points,
    },
    { k: 'area', g: 'struct', t: 'bool', label: 'Aire sous la courbe', def: LOOK.area },
    {
      k: 'lineWidth',
      g: 'dims',
      t: 'select',
      label: 'Épaisseur du trait',
      options: { thin: 'Fin', medium: 'Moyen', thick: 'Épais', xthick: 'Très épais' },
      def: LOOK.lineWidth,
    },
    {
      k: 'pointSize',
      g: 'dims',
      when: (o) => (o.points ?? LOOK.points) !== 'none',
      why: 'Choisissez « Tous » ou « Dernier seulement » pour régler la taille des points.',
      t: 'select',
      label: 'Taille des points',
      options: { small: 'Petit', medium: 'Moyen', large: 'Grand' },
      def: LOOK.pointSize,
    },
    { k: 'zero', g: 'axes', t: 'bool', label: 'Axe vertical démarrant à zéro' },
    { k: 'legend', g: 'labels', t: 'bool', label: 'Afficher la légende' },
    {
      k: 'legendPos',
      g: 'labels',
      when: (o) => !!o.legend || o.legendPos === 'end',
      why: 'Activez « Afficher la légende » pour choisir sa position.',
      t: 'select',
      label: 'Position de la légende (« En bout de courbe » : nom de chaque série écrit après son dernier point, sans légende séparée)',
      options: { bottom: 'En bas', top: 'En haut', end: 'En bout de courbe' },
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
    { t: 'table', k: 'rows', series: 'series', maxSeries: 4, dash: true, label: 'Données' },
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
    const lw = SW * (WIDTH_K[o.lineWidth] ?? WIDTH_K[LOOK.lineWidth]),
      R = POINT_R[o.pointSize] ?? POINT_R[LOOK.pointSize],
      pointsMode = o.points || LOOK.points,
      curve = o.curve || LOOK.curve;
    const atEnd = o.legendPos === 'end', // noms écrits après le dernier point, sans légende séparée
      legend = !!o.legend && !atEnd;
    const baseY = H - (legend ? VIZ.legendGap + VIZ.legendH : 0) - VIZ.catH - xT,
      top = (o.showValues ? VIZ.plotTop : 0) + R + yT,
      plotH = baseY - top - R;
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
    /* réserve à droite pour les noms : le dernier point est déjà à une demi-case du bord, la réserve ne compte que ce qui dépasse */
    let endR = 0;
    if (atEnd && series.length) {
      const wide = Math.max(...series.map((sr) => mw(sr.name || '', 400, SANS, capPx))),
        k = 1 - 1 / (2 * n);
      endR = Math.min(0.4 * (W - px0), Math.max(0, (wide + R + 6 - (W - px0) / (2 * n)) / k));
    }
    const slot = (W - px0 - endR) / n;
    const xOf = (i) => px0 + slot * (i + 0.5),
      yOf = (v) => baseY - R - ((v - lo) / (hi - lo)) * plotH;
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
    const paths = series.map((_, j) =>
      curvePath(
        rows.map((r, i) => [xOf(i), yOf(numVal(r, j))]),
        curve,
      ),
    );
    if (o.area && rows.length > 1)
      // aire sous la courbe, du tracé jusqu'à la ligne de base ; fill-opacity est lu par l'export PDF
      series.forEach((sr, j) =>
        svg.append(
          s('path', {
            d: `${paths[j]}L${r2(xOf(rows.length - 1))},${r2(baseY)}L${r2(xOf(0))},${r2(baseY)}Z`,
            fill: colorRef(sr.color),
            'fill-opacity': AREA_OPACITY,
            stroke: 'none',
          }),
        ),
      );
    series.forEach((sr, j) => {
      const dash = dashOf(sr, lw);
      svg.append(
        s('path', {
          d: paths[j],
          fill: 'none',
          stroke: 'currentColor',
          'stroke-width': lw,
          'stroke-linejoin': 'round',
          'stroke-linecap': dash ? 'butt' : 'round',
          'stroke-dasharray': dash,
        }),
      );
    });
    series.forEach((sr, j) =>
      rows.forEach((r, i) => {
        if (pointsMode === 'all' || (pointsMode === 'last' && i === rows.length - 1))
          svg.append(
            s('circle', {
              'data-color': env.ui ? `rows.${i}.colors.${j}` : null,
              'data-color-base': env.ui ? `series.${j}.color` : null,
              cx: xOf(i),
              cy: yOf(numVal(r, j)),
              r: R,
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
                y: yOf(numVal(r, j)) - R - 3, // au-dessus du point, même sans point
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
    if (atEnd) {
      /* noms après le dernier point, écartés d'une ligne s'ils se chevauchent (de haut en bas, puis remontés s'ils sortent du graphique) */
      const gap = capPx * 1.15,
        x = xOf(rows.length - 1) + R + 4,
        room = Math.max(10, W - x),
        last = rows[rows.length - 1] || {};
      const lab = series.map((sr, j) => ({ sr, y: yOf(numVal(last, j)) })).sort((a, b) => a.y - b.y);
      lab.forEach((l, i) => {
        if (i) l.y = Math.max(l.y, lab[i - 1].y + gap);
      });
      for (let i = lab.length - 1; i >= 0; i--) {
        const maxY = i === lab.length - 1 ? baseY - gap / 2 : lab[i + 1].y - gap;
        if (lab[i].y > maxY) lab[i].y = maxY;
      }
      lab.forEach((l) =>
        svg.append(
          s(
            'text',
            { x, y: l.y + 0.33 * capPx, 'font-size': capPx, 'font-weight': 400 },
            fitText(l.sr.name || '', 400, SANS, capPx, room, 0.7).text,
          ),
        ),
      );
    }
    if (legend)
      drawLegend(svg, series, H - VIZ.legendH, W, series.some((sr) => dashOf(sr, lw)) ? { dashOf: (sr) => dashOf(sr, lw), w: lw } : null);
    rows.forEach((_, i) => svg.append(reorderHit(env, 'rows', i, 'x', px0 + slot * i, 0, slot, baseY + VIZ.catH)));
    return { node: svg };
  },
};
