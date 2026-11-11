/* Nuage de points / bulles : x, y, taille facultative, groupe facultatif (une couleur par groupe). */
import { VIZ, TYPE } from '../tokens.js';
import {
  s,
  SW,
  colorRef,
  pxOf,
  mw,
  SANS,
  layoutLegend,
  drawLegendWrap,
  fitText,
  heightOf,
  autoColor,
  ticks,
  tickFmt,
  gridN,
  gridLine,
  scaleTop,
  refVal,
  refTxt,
  refRoom,
  refH,
  refV,
} from './util.js';
import { axesFields, axisTitleFields, refFieldsXY } from './axes.js';
import { t } from '../i18n.js';

/** Aspect d'origine de la carte « Axes et grille » (nuage d'avant la carte : lignes horizontales en pointillé, valeurs et axes affichés) */
const ORIGIN = { grid: 'h', gridStyle: 'dotted', gridTone: 'normal', axisValues: true, baseline: true };

export default {
  label: 'Nuage de points',
  icon: 'chart-dots',
  family: 'compare',
  defaults: () => ({
    ratio: '3:2',
    zeroX: false,
    zeroY: false,
    showLabels: false,
    legend: true,
    maxR: 14,
    xTitle: 'GDP per capita (k€)',
    yTitle: 'Life expectancy',
    decimals: 0,
    suffix: '',
    ...ORIGIN,
    scaleMax: 0,
    gridCount: '0',
    refLineX: false,
    refX: 0,
    refTextX: '',
    refLineY: false,
    refY: 0,
    refTextY: '',
    rows: [
      ['France', 'Europe', 38, 82.5, 67],
      ['Germany', 'Europe', 44, 81.1, 83],
      ['Poland', 'Europe', 17, 77.5, 38],
      ['Japan', 'Asia', 35, 84.5, 125],
      ['India', 'Asia', 2.4, 70.8, 1400],
      ['China', 'Asia', 12, 78.2, 1410],
      ['Nigeria', 'Africa', 2.1, 53.9, 223],
      ['Egypt', 'Africa', 3.6, 71.8, 112],
      ['Brazil', 'Americas', 8.9, 75.9, 215],
    ].map(([label, group, x, y, size]) => ({ label, group, x, y, size })),
  }),
  heights: ['ratio', 'fixed', 'fill'],
  fields: [
    {
      k: 'ratio',
      t: 'select',
      label: 'Format du graphique',
      options: { '2:1': '2:1 (large)', '16:9': '16:9', '3:2': '3:2', '1:1': '1:1 (carré)' },
    },
    ...axesFields(ORIGIN, { sides: true }),
    ...axisTitleFields(),
    ...refFieldsXY(),
    { k: 'zeroX', g: 'axes', t: 'bool', label: 'Axe horizontal démarrant à zéro' },
    { k: 'zeroY', g: 'axes', t: 'bool', label: 'Axe vertical démarrant à zéro' },
    { k: 'maxR', g: 'dims', t: 'number', label: 'Rayon maximal des bulles (px)', min: 3, max: 40 },
    { k: 'showLabels', g: 'labels', t: 'bool', label: 'Afficher le nom des points' },
    { k: 'legend', g: 'labels', t: 'bool', label: 'Afficher la légende (groupes)' },
    {
      k: 'legendPos',
      g: 'labels',
      when: (o) => !!o.legend,
      why: 'Activez « Afficher la légende » pour choisir sa position.',
      t: 'select',
      label: 'Position de la légende',
      options: { bottom: 'En bas', top: 'En haut' },
    },
    { k: 'decimals', g: 'labels', t: 'number', label: 'Décimales des axes', min: 0, max: 4 },
    { k: 'suffix', g: 'labels', t: 'text', label: 'Unité après la valeur (%, M€…)' },
  ],
  data: {
    k: 'rows',
    min: 1,
    cols: [
      { k: 'label', label: 'Nom', t: 'text' },
      { k: 'group', label: 'Groupe', t: 'text' },
      { k: 'x', label: 'X', t: 'number', def: 0 },
      { k: 'y', label: 'Y', t: 'number', def: 0 },
      { k: 'size', label: 'Taille (facultatif)', t: 'number', def: 0 },
    ],
    item: () => ({ label: '', group: '', x: 0, y: 0, size: 0 }),
  },
  dataHint: 'Une ligne par point. Le groupe donne la couleur ; la taille (facultative) en fait une bulle.',
  render(o, W, env) {
    const pts = (o.rows || [])
      .map((r) => ({ ...r, x: +r.x, y: +r.y, size: +r.size || 0, group: String(r.group || '').trim() }))
      .filter((r) => isFinite(r.x) && isFinite(r.y));
    const groups = [...new Set(pts.map((p) => p.group))],
      capPx = pxOf(TYPE.caption.size),
      numPx = pxOf(TYPE.captionNum.size),
      suffix = o.suffix || '';
    const legend = o.legend && groups.filter(Boolean).length > 1,
      LG = legend
        ? layoutLegend(
            groups.filter(Boolean).map((g) => ({ name: g, color: autoColor('', groups.indexOf(g)) })),
            W,
          )
        : null,
      legH = LG ? VIZ.legendGap + LG.h : 0;
    const H = heightOf(o, W, env, null, '3:2');
    const svg = s('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, style: { display: 'block', overflow: 'visible' } });
    if (!pts.length) {
      svg.append(s('text', { x: 0, y: capPx, 'font-size': capPx }, t('Aucune donnée')));
      return { node: svg };
    }
    const hasSize = pts.some((p) => p.size > 0),
      maxSize = Math.max(...pts.map((p) => p.size), 1),
      rOf = (p) => (hasSize ? Math.max(3, Math.sqrt(p.size / maxSize) * (+o.maxR || 14)) : VIZ.pointR * 1.4);
    const xs = pts.map((p) => p.x),
      ys = pts.map((p) => p.y);
    const refX = refVal(o, 'refLineX', 'refX'),
      refY = refVal(o, 'refLineY', 'refY'),
      refTextX = refX != null ? refTxt(o, 'refLineX', 'refTextX') : '',
      refTextY = refY != null ? refTxt(o, 'refLineY', 'refTextY') : '';
    if (refX != null) xs.push(refX); // l'échelle s'étend pour inclure les repères
    if (refY != null) ys.push(refY);
    let xl = Math.min(...xs),
      xh = Math.max(...xs),
      yl = Math.min(...ys),
      yh = Math.max(...ys);
    if (o.zeroX) xl = Math.min(0, xl);
    else {
      const pd = (xh - xl) * 0.06 || 1;
      xl -= pd;
      xh += pd;
    }
    if (o.zeroY) yl = Math.min(0, yl);
    else {
      const pd = (yh - yl) * 0.08 || 1;
      yl -= pd;
      yh += pd;
    }
    yh = scaleTop(o, yh);
    const grid = o.grid ?? ORIGIN.grid,
      axV = o.axisValues ?? ORIGIN.axisValues,
      base = o.baseline ?? ORIGIN.baseline;
    const X = ticks(xl, xh, gridN(o, Math.max(3, Math.floor(W / 80)))),
      Y = ticks(yl, yh, gridN(o, 5));
    const f = (v, tk) => tickFmt(v, tk, env.locale, o.decimals);
    const valsH = axV ? capPx * 1.4 : 0; // ligne des valeurs sous l'axe horizontal
    const ml = axV ? Math.max(...Y.out.map((v) => mw(f(v, Y), 400, SANS, capPx))) + 8 : 6,
      mb = valsH + (o.xTitle ? capPx * 1.5 : 0) + 6,
      mt = (o.yTitle ? capPx * 1.7 : 6) + (refTextX ? capPx * 1.4 : 0); // le texte du repère vertical se pose au-dessus du cadre, sous le titre de l'axe
    const x0 = ml,
      x1 = W - 6 - refRoom(refTextY, capPx, W), // le texte du repère horizontal est posé après le bout de la ligne
      y1 = H - legH - mb,
      y0 = mt;
    const sx = (v) => x0 + ((v - X.lo) / (X.hi - X.lo)) * (x1 - x0),
      sy = (v) => y1 - ((v - Y.lo) / (Y.hi - Y.lo)) * (y1 - y0);
    const gridG = s('g'),
      gO = { gridStyle: ORIGIN.gridStyle, gridTone: ORIGIN.gridTone, ...o };
    const hLines = grid === 'h' || grid === 'both',
      vLines = grid === 'v' || grid === 'both';
    Y.out.forEach((v) => {
      const y = sy(v);
      gridG.append(
        hLines ? gridLine(gO, x0, y, x1, y) : null,
        axV ? s('text', { x: x0 - 6, y: y + 0.33 * capPx, 'text-anchor': 'end', 'font-size': capPx }, f(v, Y)) : null,
      );
    });
    X.out.forEach((v) => {
      const x = sx(v);
      gridG.append(
        vLines ? gridLine(gO, x, y0, x, y1) : null,
        axV ? s('line', { x1: x, x2: x, y1: y1, y2: y1 + 4, stroke: 'currentColor', 'stroke-width': SW }) : null,
        axV ? s('text', { x, y: y1 + 6 + capPx, 'text-anchor': 'middle', 'font-size': capPx }, f(v, X)) : null,
      );
    });
    if (base)
      gridG.append(
        s('line', { x1: x0, x2: x0, y1: y0, y2: y1, stroke: 'currentColor', 'stroke-width': SW }),
        s('line', { x1: x0, x2: x1, y1: y1, y2: y1, stroke: 'currentColor', 'stroke-width': SW }),
      );
    if (o.yTitle)
      gridG.append(s('text', { x: 0, y: capPx, 'font-size': capPx, 'font-weight': 700 }, fitText(o.yTitle, 700, SANS, capPx, W, 0.7).text));
    if (o.xTitle)
      gridG.append(
        s(
          'text',
          { x: (x0 + x1) / 2, y: y1 + 6 + valsH + capPx * 1.2, 'text-anchor': 'middle', 'font-size': capPx, 'font-weight': 700 },
          fitText(o.xTitle, 700, SANS, capPx, W - ml, 0.7).text,
        ),
      );
    if (refX != null) refV(gridG, sx(refX), y0, y1, refTextX, capPx, W); // par-dessus la grille, sous les points
    if (refY != null) refH(gridG, sy(refY), x0, x1, refTextY, capPx, W - 6 - x1);
    svg.append(gridG);
    const dots = s('g'),
      labs = s('g');
    [...pts]
      .sort((a, b) => b.size - a.size)
      .forEach((p) => {
        const c = colorRef(autoColor('', groups.indexOf(p.group))),
          r = rOf(p),
          cx = sx(p.x),
          cy = sy(p.y);
        dots.append(s('circle', { cx, cy, r, fill: c, 'fill-opacity': hasSize ? 0.8 : 1, stroke: 'currentColor', 'stroke-width': SW }));
        if (o.showLabels && p.label) {
          const ft = fitText(p.label, 400, SANS, capPx, 90, 0.7);
          labs.append(
            s(
              'text',
              {
                x: cx + r + 3,
                y: cy + 0.33 * ft.size,
                'font-size': ft.size,
                style: { paintOrder: 'stroke', stroke: '#fff', strokeWidth: '3px', strokeLinejoin: 'round' },
              },
              ft.text,
            ),
          );
        }
      });
    svg.append(dots, labs);
    if (LG) drawLegendWrap(svg, LG, H - LG.h);
    return { node: svg };
  },
};
