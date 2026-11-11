/* Barres horizontales : libellés à gauche, valeur au bout de la barre. Groupées ou empilées. */
import { VIZ, TYPE } from '../tokens.js';
import {
  reorderHit,
  heightOf,
  s,
  SW,
  colorRef,
  pxOf,
  fmt,
  mw,
  SANS,
  drawLegend,
  numVal,
  fitText,
  elColor,
  ticks,
  tickFmt,
  gridOn,
  gridN,
  gridLine,
  scaleTop,
  refVal,
  refTxt,
  refV,
} from './util.js';
import { iconNode, iconImportPanel } from './picto.js';
import { axesFields, refFields } from './axes.js';
import { t } from '../i18n.js';

/** Aspect d'origine de la carte « Axes et grille » (barres horizontales d'avant la carte : ligne de base à gauche, sans grille) */
const ORIGIN = { grid: false, gridStyle: 'solid', gridTone: 'light', axisValues: false, baseline: true };

const hPath = (x, y, w, h, r) => {
  r = Math.max(0, Math.min(r, h / 2, w));
  return `M${x},${y}H${x + w - r}A${r},${r} 0 0 1 ${x + w},${y + r}V${y + h - r}A${r},${r} 0 0 1 ${x + w - r},${y + h}H${x}Z`;
};

export default {
  label: 'Barres horizontales',
  icon: 'align-box-left-middle',
  family: 'compare',
  defaults: () => ({
    style: 'grouped',
    legend: false,
    showValues: true,
    decimals: 0,
    suffix: '%',
    grid: true,
    gridStyle: 'solid',
    gridTone: 'light',
    axisValues: false,
    baseline: true,
    scaleMax: 0,
    gridCount: '0',
    refLine: false,
    refValue: 0,
    refText: '',
    series: [{ name: t('Valeur'), color: 'blue' }],
    rows: [
      { label: t('Premier critère'), v: [72] },
      { label: t('Deuxième critère'), v: [58] },
      { label: t('Troisième critère'), v: [41] },
      { label: t('Quatrième critère'), v: [23] },
    ],
  }),
  heights: ['auto', 'fixed', 'fill'],
  fields: [
    { k: 'style', g: 'struct', t: 'select', label: 'Plusieurs séries', options: { grouped: 'Côte à côte', stacked: 'Empilées' } },
    {
      k: 'barSize',
      g: 'dims',
      t: 'select',
      label: 'Épaisseur des barres',
      options: { thin: 'Fine', normal: 'Normale', thick: 'Épaisse', xthick: 'Très épaisse' },
      def: 'normal',
    },
    {
      k: 'corners',
      g: 'dims',
      t: 'select',
      label: 'Coins des barres',
      options: { round: 'Arrondis', square: 'Droits' },
      def: 'round',
    },
    {
      k: 'rowSpace',
      g: 'dims',
      t: 'select',
      label: 'Espace entre les lignes',
      options: { none: 'Aucun', tight: 'Réduit', normal: 'Normal', loose: 'Large' },
      def: 'normal',
    },
    {
      k: 'serSpace',
      g: 'dims',
      t: 'select',
      label: 'Espace entre les barres d’une même ligne',
      options: { none: 'Aucun', tight: 'Réduit', normal: 'Normal', loose: 'Large' },
      def: 'normal',
    },
    { k: 'labelIn', g: 'labels', t: 'bool', label: 'Libellés dans les barres' },
    {
      k: 'valuesIn',
      g: 'labels',
      when: (o) => !!o.showValues,
      why: 'Activez « Afficher les valeurs » pour les écrire dans les barres.',
      t: 'bool',
      label: 'Valeurs dans les barres (si affichées ; sinon après la barre quand ça ne rentre pas)',
    },
    ...axesFields(ORIGIN, {
      baselineWhen: {
        when: (o) => !o.labelIn,
        why: 'Désactivez « Libellés dans les barres » pour afficher la ligne de base.',
      },
    }),
    ...refFields(),
    { k: 'segments', g: 'axes', t: 'number', label: 'Graduations dans les barres', min: 0, max: 20, def: 0 },
    { k: 'legend', g: 'labels', t: 'bool', label: 'Afficher la légende' },
    {
      k: 'legendPos',
      g: 'labels',
      when: (o) => !!o.legend || o.legendPos === 'inside',
      why: 'Activez « Afficher la légende » pour choisir sa position.',
      t: 'select',
      label: 'Position de la légende (« Dans les barres » : noms des séries écrits dans chaque barre, sans légende séparée)',
      options: { bottom: 'En bas', top: 'En haut', inside: 'Dans les barres' },
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
    { t: 'table', k: 'rows', series: 'series', maxSeries: 4, label: 'Données', icons: true },
    {
      t: 'node',
      g: 'data',
      build: (root, ctx) => {
        const n = document.createElement('div');
        n.className = 'f';
        n.append(...iconImportPanel(root, ctx));
        return n;
      },
    },
  ],
  render(o, W, env) {
    const legIn = o.legendPos === 'inside' || o.legendIn; // noms des séries écrits dans les barres (legendIn : ancien réglage)
    const series = o.series || [],
      rows = o.rows || [],
      k = Math.max(1, series.length);
    const stacked = o.style === 'stacked';
    const capPx = pxOf(TYPE.caption.size),
      numPx = pxOf(TYPE.captionNum.size),
      suffix = o.suffix || '';
    const icW = rows.some((r) => r.icon && r.icon !== 'none') ? 24 + VIZ.iconGap : 0; // icône ou image (drapeau…) à gauche du libellé
    const labW =
      (o.labelIn
        ? 0
        : Math.min(W * 0.4, Math.max(0, ...rows.map((r) => mw(r.label || '', TYPE.caption.weight, SANS, capPx))) + VIZ.iconGap)) + icW;
    const total = (r) => series.reduce((a, _, j) => a + numVal(r, j), 0);
    const valW =
      o.showValues && !o.valuesIn
        ? mw(fmt(1000, env.locale, o.decimals) + suffix, 700, '"Source Serif 4", serif', numPx) + VIZ.barGap * 2
        : 0;
    const x0 = labW,
      span = Math.max(30, W - labW - valW);
    let max = 0;
    rows.forEach((r) => {
      max = Math.max(max, stacked ? total(r) : Math.max(0, ...series.map((_, j) => numVal(r, j))));
    });
    const ref = refVal(o),
      refOk = ref != null && ref >= 0, // pas de valeur négative sur des barres
      refText = refOk ? refTxt(o) : '',
      refTop = refText ? Math.round(capPx * 1.5) : 0; // bande en haut pour le texte, sans toucher aux barres ni à leurs valeurs
    if (refOk) max = Math.max(max, ref); // l'échelle s'étend pour inclure le repère
    if (!max) max = 1;
    max = scaleTop(o, max);
    /* graduations : grille (verticale) et valeurs de l'axe (sous les barres, réserve comptée dans la hauteur) */
    const axV = !!o.axisValues,
      grid = gridOn(o),
      base = (o.baseline ?? ORIGIN.baseline) && !o.labelIn,
      square = o.corners === 'square'; // coins droits (def : arrondis)
    const tk = grid || axV ? ticks(0, max, gridN(o, Math.max(3, Math.floor(span / 80)))) : null,
      tickTxt = (v) => tickFmt(v, tk, env.locale, o.decimals) + suffix,
      axH = axV ? Math.round(capPx * 1.4 + 3) : 0;
    const GF = { none: 0, tight: 0.5, normal: 1, loose: 2 },
      rGap = VIZ.hRowGap * (GF[o.rowSpace] ?? 1),
      sGap = VIZ.barGap * (GF[o.serSpace] ?? 1);
    const legBlock = o.legend && !legIn ? VIZ.legendGap + VIZ.legendH : 0,
      gaps = Math.max(0, rows.length - 1) * rGap;
    const natBh = VIZ.hBar * ({ thin: 0.6, thick: 1.5, xthick: 2 }[o.barSize] ?? 1),
      natBody = rows.length * (stacked ? natBh : k * natBh + (k - 1) * sGap) + gaps;
    /* hauteur fixe ou « remplir » : les barres s'épaississent (ou s'amincissent) pour occuper la hauteur demandée ; automatique = hauteur naturelle */
    let bh = natBh;
    if (o.hmode === 'fixed' || o.hmode === 'fill' || o.hmode === 'match') {
      const target = heightOf(o, W, env, natBody + axH + legBlock + refTop) - refTop,
        f = Math.max(0.5, Math.min(4, (target - legBlock - axH - gaps) / Math.max(1, natBody - gaps)));
      bh = Math.max(3, natBh * f);
    }
    const rh = stacked ? bh : k * bh + (k - 1) * sGap;
    const bodyH = rows.length * rh + gaps;
    const H = bodyH + axH + legBlock;
    const root = s('svg', {
      width: W,
      height: H + refTop,
      viewBox: `0 0 ${W} ${H + refTop}`,
      style: { display: 'block', overflow: 'visible' },
    });
    const svg = refTop ? s('g', { transform: `translate(0 ${refTop})` }) : root; // contenu décalé sous la bande du texte
    if (refTop) root.append(svg);
    if (tk)
      tk.out.forEach((v) => {
        const x = x0 + (v / max) * span;
        if (grid && !(base && v === 0)) svg.append(gridLine(o, x, 0, x, bodyH));
        if (axV) {
          const txt = tickTxt(v),
            w = mw(txt, 400, SANS, capPx),
            anchor = x + w / 2 > W ? 'end' : x - w / 2 < 0 ? 'start' : 'middle';
          svg.append(
            s(
              'text',
              { x: anchor === 'end' ? W : anchor === 'start' ? 0 : x, y: bodyH + 3 + capPx, 'text-anchor': anchor, 'font-size': capPx },
              txt,
            ),
          );
        }
      });
    if (base) svg.append(s('line', { x1: x0, y1: 0, x2: x0, y2: bodyH, stroke: 'currentColor', 'stroke-width': SW }));
    if (refOk) refV(svg, x0 + (ref / max) * span, 0, bodyH, refText, capPx, W); // par-dessus la grille, sous les barres
    const nSeg = Math.max(0, Math.min(20, Math.floor(+o.segments || 0)));
    /* graduations (traits de séparation des segments) et libellé dans la barre */
    const NUMF = { 'font-size': numPx, 'font-weight': 700, style: { fontFamily: 'var(--t-captionNum-family)' } };
    const decor = (yy, w, lab, valTxt) => {
      for (let q = 1; q < nSeg; q++) {
        const xx = x0 + (span * q) / nSeg;
        if (xx < x0 + w - 0.5) svg.append(s('line', { x1: xx, y1: yy, x2: xx, y2: yy + bh, stroke: 'currentColor', 'stroke-width': SW }));
      }
      const vw = valTxt && o.valuesIn ? mw(valTxt, 700, '"Source Serif 4", serif', numPx) : 0,
        lw = lab ? mw(lab, TYPE.caption.weight, SANS, capPx) : 0;
      const fitsVal = vw > 0 && w >= (lw ? lw + VIZ.iconGap : 0) + vw + VIZ.iconGap * 2; // la valeur rentre dans la barre, après le libellé
      if (lab) {
        const f = fitText(lab, TYPE.caption.weight, SANS, capPx, Math.max(20, w - VIZ.iconGap * 2 - (fitsVal ? vw + VIZ.iconGap : 0)), 0.6);
        svg.append(
          s(
            'text',
            { x: x0 + VIZ.iconGap, y: yy + bh / 2 + 0.33 * f.size, 'font-size': f.size, 'font-weight': TYPE.caption.weight },
            f.text,
          ),
        );
      }
      if (fitsVal) svg.append(s('text', { ...NUMF, x: x0 + w - VIZ.iconGap, y: yy + bh / 2 + 0.33 * numPx, 'text-anchor': 'end' }, valTxt));
      return fitsVal;
    };
    rows.forEach((r, i) => {
      const y = i * (rh + rGap);
      if (r.icon && r.icon !== 'none') svg.append(iconNode(o, r.icon, 0, y + rh / 2 - 12, 24, 24, 'blue', env.rc.icons));
      if (!o.labelIn) {
        const f = fitText(r.label || '', TYPE.caption.weight, SANS, capPx, labW - icW - VIZ.iconGap, 0.7);
        svg.append(s('text', { x: icW, y: y + rh / 2 + 0.33 * f.size, 'font-size': f.size, 'font-weight': TYPE.caption.weight }, f.text));
      }
      let end = x0,
        inside = false;
      if (stacked) {
        let acc = 0;
        series.forEach((sr, j) => {
          const v = numVal(r, j);
          if (!v) return;
          const xa = x0 + (acc / max) * span,
            w = (v / max) * span;
          acc += v;
          end = xa + w;
          svg.append(
            s('path', {
              'data-color': env.ui ? `rows.${i}.colors.${j}` : null,
              'data-color-base': env.ui ? `series.${j}.color` : null,
              d: acc >= total(r) && !square ? hPath(xa, y, w, bh, VIZ.barRadius) : `M${xa},${y}h${w}v${bh}h${-w}Z`,
              fill: colorRef(elColor(r, j, sr)),
              stroke: 'currentColor',
              'stroke-width': SW,
              'stroke-linejoin': 'round',
            }),
          );
          if ((legIn || (o.labelIn && !r.label)) && sr.name && w > mw(sr.name, TYPE.caption.weight, SANS, capPx) + VIZ.iconGap * 2)
            svg.append(
              s(
                'text',
                {
                  x: xa + w / 2,
                  y: y + bh / 2 + 0.33 * capPx,
                  'text-anchor': 'middle',
                  'font-size': capPx,
                  'font-weight': TYPE.caption.weight,
                },
                sr.name,
              ),
            );
        });
        inside = decor(y, end - x0, o.labelIn ? r.label : '', o.showValues ? fmt(total(r), env.locale, o.decimals) + suffix : '');
      } else
        series.forEach((sr, j) => {
          const w = (numVal(r, j) / max) * span,
            yy = y + j * (bh + sGap);
          end = Math.max(end, x0 + w);
          svg.append(
            s('path', {
              'data-color': env.ui ? `rows.${i}.colors.${j}` : null,
              'data-color-base': env.ui ? `series.${j}.color` : null,
              d: square
                ? `M${x0},${yy}h${Math.max(w, 0.0001)}v${bh}h${-Math.max(w, 0.0001)}Z`
                : hPath(x0, yy, Math.max(w, 0.0001), bh, VIZ.barRadius),
              fill: colorRef(elColor(r, j, sr)),
              stroke: 'currentColor',
              'stroke-width': SW,
              'stroke-linejoin': 'round',
            }),
          );
          const ins = decor(
            yy,
            w,
            [j === 0 && o.labelIn ? r.label : '', legIn || (o.labelIn && !r.label) ? sr.name : ''].filter(Boolean).join(' · '),
            o.showValues ? fmt(numVal(r, j), env.locale, o.decimals) + suffix : '',
          );
          if (o.showValues && !ins)
            svg.append(
              s(
                'text',
                {
                  x: x0 + w + VIZ.barGap * 1.5,
                  y: yy + bh / 2 + 0.33 * numPx,
                  'font-size': numPx,
                  'font-weight': 700,
                  style: { fontFamily: 'var(--t-captionNum-family)' },
                },
                fmt(numVal(r, j), env.locale, o.decimals) + suffix,
              ),
            );
        });
      if (stacked && o.showValues && !inside)
        svg.append(
          s(
            'text',
            {
              x: end + VIZ.barGap * 1.5,
              y: y + bh / 2 + 0.33 * numPx,
              'font-size': numPx,
              'font-weight': 700,
              style: { fontFamily: 'var(--t-captionNum-family)' },
            },
            fmt(total(r), env.locale, o.decimals) + suffix,
          ),
        );
    });
    if (o.legend && !legIn) drawLegend(svg, series, H - VIZ.legendH, W);
    rows.forEach((_, i) => svg.append(reorderHit(env, 'rows', i, 'y', 0, i * (rh + rGap) - rGap / 2, W, rh + rGap)));
    return { node: root };
  },
};
