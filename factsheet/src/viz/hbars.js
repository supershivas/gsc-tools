/* Barres horizontales : libellés à gauche, valeur au bout de la barre. Groupées ou empilées. */
import { VIZ } from '../tokens.js';
import {
  reorderHit,
  heightOf,
  s,
  SW,
  STROKE_K,
  LINE_FIELD,
  lineAttrs,
  colorRef,
  pxOf,
  fmt,
  mw,
  SANS,
  drawLegend,
  layoutLegend,
  drawLegendWrap,
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
  typeIn,
  wrapLabel,
  labelW,
  labelLh,
  drawLabel,
  stripMk,
} from './util.js';
import { styleOf, needsRich, styledLines, styledW, drawStyled, tagText, LABEL_FIELDS } from './labelstyle.js';
import { iconNode, iconImportPanel } from './picto.js';
import { axesFields, refFields } from './axes.js';
import { t } from '../i18n.js';

/** Aspect d'origine de la carte « Axes et grille » (barres horizontales d'avant la carte : ligne de base à gauche, sans grille) */
const ORIGIN = { grid: false, gridStyle: 'solid', gridTone: 'light', axisValues: false, baseline: true };

/** Largeur des libellés (`nameWidth`) : `auto` = largeur du plus long, 40 % au plus ; sinon part de la largeur, icône comprise */
const NAME_W = [10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70];
const NAME_W_OPTIONS = { auto: 'Auto', ...Object.fromEntries(NAME_W.map((p) => [p, p + ' %'])) };

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
  /** textes saisis montrés dans la carte Textes (champ simple ou texte riche), en plus du tableau de données */
  textItems: (o) => (o.rows || []).map((r, i) => ({ obj: r, k: 'label', label: `${t('Libellé')} ${i + 1}` })),
  fields: [
    { k: 'style', g: 'struct', t: 'select', label: 'Plusieurs colonnes', options: { grouped: 'Côte à côte', stacked: 'Empilées' } },
    {
      k: 'barSize',
      g: 'dims',
      t: 'select',
      label: 'Épaisseur des barres',
      options: { thin: 'Fine', normal: 'Normale', thick: 'Épaisse', xthick: 'Très épaisse' },
      def: 'normal',
    },
    { ...LINE_FIELD, label: 'Contour des barres' },
    {
      k: 'baseWidth',
      g: 'axes',
      when: (o) => o.baseline ?? ORIGIN.baseline,
      why: 'Activez « Ligne de base » pour régler son trait.',
      t: 'select',
      label: 'Trait de la ligne de base',
      options: { thin: 'Fin', medium: 'Moyen', thick: 'Épais' },
      def: 'thin',
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
      k: 'nameWidth',
      g: 'texts',
      t: 'select',
      label: 'Largeur des libellés (se règle aussi en tirant le trait entre libellés et barres)',
      options: NAME_W_OPTIONS,
      def: 'auto',
      when: (o) => !o.labelIn,
      why: 'Désactivez « Libellés dans les barres » pour régler leur largeur.',
    },
    ...LABEL_FIELDS({ when: (o) => !o.labelIn, why: 'Désactivez « Libellés dans les barres » pour mettre en forme les libellés.' }),
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
      label: 'Position de la légende (« Dans les barres » : noms des colonnes écrits dans chaque barre, sans légende séparée)',
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
    { t: 'table', k: 'rows', series: 'series', maxSeries: 4, label: 'Données', icons: true, softBreak: true },
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
  /* Interactions de l'éditeur : tirer le trait entre libellés et barres règle `nameWidth` (pas de 5 %) */
  edit: {
    start(hit, o, meta, api, pt0) {
      if (hit.kind !== 'split' || !meta) return null;
      const w0 = meta.labW;
      return {
        move(pt) {
          const p = Math.round(((w0 + pt.x - pt0.x) / meta.W) * 20) * 5;
          o.nameWidth = String(Math.max(NAME_W[0], Math.min(NAME_W[NAME_W.length - 1], p)));
          api.redraw();
        },
      };
    },
  },
  render(o, W, env) {
    const T = typeIn(env); // styles du document (menu Texte)
    const legIn = o.legendPos === 'inside' || o.legendIn; // noms des séries écrits dans les barres (legendIn : ancien réglage)
    const series = o.series || [],
      rows = o.rows || [],
      k = Math.max(1, series.length);
    const stacked = o.style === 'stacked';
    const capPx = pxOf(T.caption.size),
      numPx = pxOf(T.captionNum.size),
      suffix = o.suffix || '';
    const icW = rows.some((r) => r.icon && r.icon !== 'none') ? 24 + VIZ.iconGap : 0; // icône ou image (drapeau…) à gauche du libellé
    const share = NAME_W.includes(+o.nameWidth) ? +o.nameWidth / 100 : 0;
    /* style des libellés : tous (carte Textes, `names`) puis chacun (`rows[i].st`, barre au-dessus du libellé cliqué) ; stylé = texte riche */
    const stOf = rows.map((r) => styleOf(o, r)),
      richOf = (i) => needsRich(rows[i].label, stOf[i]),
      natW = (r, i) => (richOf(i) ? styledW(r.label, stOf[i], capPx, T.caption.weight) : labelW(r.label, T.caption.weight, capPx));
    const labW = o.labelIn
      ? icW
      : share
        ? Math.max(icW + VIZ.iconGap + 20, W * share)
        : Math.min(W * 0.4, Math.max(0, ...rows.map(natW)) + VIZ.iconGap) + icW;
    /* libellés à gauche : sur plusieurs lignes s'il le faut (retours saisis, puis largeur), jamais coupés ni réduits */
    const labLh = labelLh(capPx),
      labMax = Math.max(10, labW - icW - VIZ.iconGap),
      labLines = rows.map((r, i) =>
        o.labelIn
          ? []
          : richOf(i)
            ? styledLines(r.label, stOf[i], capPx, T.caption.weight, labMax)
            : wrapLabel(r.label, T.caption.weight, capPx, labMax),
      ),
      /* hauteur d'un libellé plus haut qu'une ligne simple (plusieurs lignes, ou corps plus grand) ; 0 = celle des barres */
      labH = labLines.map((l, i) => {
        const hh = richOf(i) ? l.reduce((a, x) => a + x.lh, 0) : l.length * labLh;
        return hh > labLh ? hh : 0;
      });
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
    const LG = o.legend && !legIn ? layoutLegend(series, W, T) : null,
      legBlock = LG ? VIZ.legendGap + LG.h : 0,
      gaps = Math.max(0, rows.length - 1) * rGap;
    const natBh = VIZ.hBar * ({ thin: 0.6, thick: 1.5, xthick: 2 }[o.barSize] ?? 1),
      natBody = rows.length * (stacked ? natBh : k * natBh + (k - 1) * sGap) + gaps;
    /* hauteur fixe ou « remplir » : les barres s'épaississent (ou s'amincissent) pour occuper la hauteur demandée ; automatique = hauteur naturelle */
    const rowH = (b) => (stacked ? b : k * b + (k - 1) * sGap),
      extraOf = (b) => labH.reduce((a, h) => a + Math.max(0, h - rowH(b)), 0); // lignes plus hautes que leurs barres (libellé sur plusieurs lignes)
    let bh = natBh;
    if (o.hmode === 'fixed' || o.hmode === 'fill' || o.hmode === 'match') {
      const target = heightOf(o, W, env, natBody + extraOf(natBh) + axH + legBlock + refTop) - refTop;
      for (let pass = 0; pass < 2; pass++) {
        const f = Math.max(0.5, Math.min(4, (target - legBlock - axH - gaps - extraOf(bh)) / Math.max(1, natBody - gaps)));
        bh = Math.max(3, natBh * f);
      }
    }
    const rh = rowH(bh),
      slots = labH.map((h) => Math.max(rh, h)),
      rowY = [];
    slots.reduce((y, h, i) => ((rowY[i] = y), y + h + rGap), 0);
    const bodyH = slots.reduce((a, h) => a + h, 0) + gaps;
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
    if (base)
      svg.append(
        s('line', { x1: x0, y1: 0, x2: x0, y2: bodyH, stroke: 'currentColor', 'stroke-width': SW * (STROKE_K[o.baseWidth] || 1) }),
      );
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
        lw = lab ? mw(lab, T.caption.weight, SANS, capPx) : 0;
      const fitsVal = vw > 0 && w >= (lw ? lw + VIZ.iconGap : 0) + vw + VIZ.iconGap * 2; // la valeur rentre dans la barre, après le libellé
      if (lab) {
        const f = fitText(lab, T.caption.weight, SANS, capPx, Math.max(20, w - VIZ.iconGap * 2 - (fitsVal ? vw + VIZ.iconGap : 0)), 0.6);
        svg.append(
          s('text', { x: x0 + VIZ.iconGap, y: yy + bh / 2 + 0.33 * f.size, 'font-size': f.size, 'font-weight': T.caption.weight }, f.text),
        );
      }
      if (fitsVal) svg.append(s('text', { ...NUMF, x: x0 + w - VIZ.iconGap, y: yy + bh / 2 + 0.33 * numPx, 'text-anchor': 'end' }, valTxt));
      return fitsVal;
    };
    rows.forEach((r, i) => {
      const y = rowY[i] + (slots[i] - rh) / 2; // barres centrées sur la hauteur du libellé
      if (r.icon && r.icon !== 'none') svg.append(iconNode(o, r.icon, 0, y + rh / 2 - 12, 24, 24, 'blue', env.rc.icons));
      if (!o.labelIn) {
        if (richOf(i)) svg.append(tagText(drawStyled(labLines[i], icW, y + rh / 2), env, `rows.${i}`));
        else {
          const g = s('g');
          drawLabel(g, labLines[i], icW, y + rh / 2, labLh, capPx, T.caption.weight);
          svg.append(tagText(g, env, `rows.${i}`));
        }
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
              ...lineAttrs(o),
              'stroke-linejoin': 'round',
            }),
          );
          if ((legIn || (o.labelIn && !r.label)) && sr.name && w > mw(sr.name, T.caption.weight, SANS, capPx) + VIZ.iconGap * 2)
            svg.append(
              s(
                'text',
                {
                  x: xa + w / 2,
                  y: y + bh / 2 + 0.33 * capPx,
                  'text-anchor': 'middle',
                  'font-size': capPx,
                  'font-weight': T.caption.weight,
                },
                sr.name,
              ),
            );
        });
        inside = decor(y, end - x0, o.labelIn ? stripMk(r.label) : '', o.showValues ? fmt(total(r), env.locale, o.decimals) + suffix : '');
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
              ...lineAttrs(o),
              'stroke-linejoin': 'round',
            }),
          );
          const ins = decor(
            yy,
            w,
            [j === 0 && o.labelIn ? stripMk(r.label) : '', legIn || (o.labelIn && !r.label) ? sr.name : ''].filter(Boolean).join(' · '),
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
    if (LG) {
      if (LG.lines.length > 1)
        drawLegendWrap(svg, LG, H - LG.h); // noms trop longs pour une ligne : la légende passe à la ligne, au même corps
      else drawLegend(svg, series, H - VIZ.legendH, W, null, null, T);
    }
    rows.forEach((_, i) => svg.append(reorderHit(env, 'rows', i, 'y', 0, rowY[i] - rGap / 2, W, slots[i] + rGap)));
    /* éditeur : trait à tirer entre libellés et barres (largeur des libellés), jamais exporté */
    if (env.ui && !o.labelIn)
      svg.append(
        s(
          'g',
          { class: 'viz-split', 'data-hit': 'split:0', style: { cursor: 'col-resize' } },
          s('rect', { x: x0 - 5, y: -3, width: 10, height: bodyH + 6, fill: 'rgba(0,0,0,0)' }),
          s('line', {
            class: 'viz-split-line', // visible au survol seulement (app.css)
            x1: x0,
            y1: -3,
            x2: x0,
            y2: bodyH + 3,
            stroke: 'var(--handle, #F28C28)',
            'stroke-width': 1.5,
            'stroke-dasharray': '3 2',
          }),
        ),
      );
    return { node: root, meta: { W, labW } };
  },
};
