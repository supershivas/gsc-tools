/* Champs de la carte « Axes et grille » (barres, barres horizontales, courbes, nuage de points).
   Chaque `def` est l'aspect d'avant la carte : une fiche existante ne change pas, et ↺ y revient toujours. */
import { gridOn, numVal } from './util.js';
import { t } from '../i18n.js';

const GRID_WHY = 'Activez la grille pour régler ses lignes.';
const VALUES_WHY = 'Activez la grille ou « Valeurs de l’axe » pour régler le nombre de lignes.';

/** Grille : interrupteur (l'orientation suit l'axe des valeurs), ou sens au choix pour le nuage de points (`sides`) */
export const gridField = (def, sides) =>
  sides
    ? {
        k: 'grid',
        g: 'axes',
        t: 'select',
        label: 'Grille',
        options: { none: 'Aucune', h: 'Horizontale', v: 'Verticale', both: 'Les deux' },
        def,
      }
    : { k: 'grid', g: 'axes', t: 'bool', label: 'Grille', def };

/** Champs communs ; `d` = valeurs d'origine du type ({ grid, gridStyle, gridTone, axisValues, baseline }), `sides` = nuage de points */
export function axesFields(d, { sides = false, baselineWhen = null } = {}) {
  return [
    gridField(d.grid, sides),
    {
      k: 'gridStyle',
      g: 'axes',
      t: 'select',
      label: 'Style des lignes',
      options: { solid: 'Plein', dashed: 'Tirets', dotted: 'Pointillé' },
      def: d.gridStyle,
      when: gridOn,
      why: GRID_WHY,
    },
    {
      k: 'gridTone',
      g: 'axes',
      t: 'select',
      label: 'Intensité',
      options: { light: 'Discrète', normal: 'Normale', strong: 'Marquée' },
      def: d.gridTone,
      when: gridOn,
      why: GRID_WHY,
    },
    { k: 'axisValues', g: 'axes', t: 'bool', label: 'Valeurs de l’axe', def: d.axisValues },
    {
      k: 'baseline',
      g: 'axes',
      t: 'bool',
      label: 'Ligne de base (axe zéro)',
      def: d.baseline,
      ...(baselineWhen || {}),
    },
    { k: 'scaleMax', g: 'axes', t: 'number', label: 'Maximum de l’échelle', min: 0, def: 0 },
    {
      k: 'gridCount',
      g: 'axes',
      t: 'select',
      label: 'Nombre de lignes de la grille',
      options: { 0: 'Auto', 3: '3', 5: '5', 10: '10' },
      def: '0',
      when: (o) => gridOn(o) || !!o.axisValues,
      why: VALUES_WHY,
    },
  ];
}

const REF_WHY = 'Activez « Ligne de repère » pour régler ce repère.';
const REF_WHY_X = 'Activez « Repère vertical (X) » pour régler ce repère.';
const REF_WHY_Y = 'Activez « Repère horizontal (Y) » pour régler ce repère.';
const mean = (a) => (a.length ? Math.round((a.reduce((x, y) => x + y, 0) / a.length) * 100) / 100 : 0);

/** Moyenne des données d'un type à séries (barres, barres horizontales, courbes) : empilées = moyenne des totaux par ligne, sinon toutes les valeurs */
export function seriesAverage(o) {
  const rows = o.rows || [],
    k = (o.series || []).length;
  if (o.style === 'stacked') return mean(rows.map((r) => Array.from({ length: k }, (_, j) => numVal(r, j)).reduce((a, b) => a + b, 0)));
  return mean(rows.flatMap((r) => Array.from({ length: Math.max(1, k) }, (_, j) => numVal(r, j))));
}
/** Moyenne des X ou des Y d'un nuage de points (points valides seulement) */
export function pointsAverage(o, axis) {
  return mean((o.rows || []).map((r) => +r[axis]).filter((v) => isFinite(v)));
}

/** Bouton « Moyenne des données » : remplit la valeur du repère (une action, un pas d'historique : `restructure` rafraîchit le champ) */
const avgButton = (k, valueKey, label, avg, when, why) => ({
  t: 'node',
  k,
  g: 'axes',
  when,
  why,
  build: (opts, ctx) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pp-btn';
    b.textContent = t(label);
    b.onclick = () => {
      opts[valueKey] = avg(opts);
      ctx.restructure();
    };
    return b;
  },
});

/** Sous-section « Repère » : une ligne de référence (objectif, moyenne…), interrupteur + valeur + texte + moyenne des données */
export const refFields = () => {
  const on = (o) => !!o.refLine;
  return [
    { k: 'refLine', g: 'axes', t: 'bool', label: 'Ligne de repère', def: false },
    { k: 'refValue', g: 'axes', t: 'number', step: 'any', label: 'Valeur du repère', def: 0, when: on, why: REF_WHY },
    { k: 'refText', g: 'axes', s: 'ref', t: 'text', fmt: 'plain', label: 'Texte du repère (Objectif, Moyenne…)', when: on, why: REF_WHY },
    avgButton('refAvg', 'refValue', 'Moyenne des données', seriesAverage, on, REF_WHY),
  ];
};
/** Nuage de points : un repère par axe, mêmes réglages (X = ligne verticale, Y = ligne horizontale) */
export const refFieldsXY = () => {
  const onX = (o) => !!o.refLineX,
    onY = (o) => !!o.refLineY;
  return [
    { k: 'refLineX', g: 'axes', t: 'bool', label: 'Repère vertical (X)', def: false },
    { k: 'refX', g: 'axes', t: 'number', step: 'any', label: 'Valeur du repère vertical (X)', def: 0, when: onX, why: REF_WHY_X },
    { k: 'refTextX', g: 'axes', t: 'text', fmt: 'plain', label: 'Texte du repère vertical (X)', when: onX, why: REF_WHY_X },
    avgButton('refAvgX', 'refX', 'Moyenne des X', (o) => pointsAverage(o, 'x'), onX, REF_WHY_X),
    { k: 'refLineY', g: 'axes', t: 'bool', label: 'Repère horizontal (Y)', def: false },
    { k: 'refY', g: 'axes', t: 'number', step: 'any', label: 'Valeur du repère horizontal (Y)', def: 0, when: onY, why: REF_WHY_Y },
    { k: 'refTextY', g: 'axes', t: 'text', fmt: 'plain', label: 'Texte du repère horizontal (Y)', when: onY, why: REF_WHY_Y },
    avgButton('refAvgY', 'refY', 'Moyenne des Y', (o) => pointsAverage(o, 'y'), onY, REF_WHY_Y),
  ];
};

/** Titres d'axes : texte simple, mesuré par `fitText` (jamais de mise en forme) */
export const axisTitleFields = () => [
  { k: 'xTitle', g: 'axes', t: 'text', fmt: 'plain', label: 'Titre de l’axe horizontal' },
  { k: 'yTitle', g: 'axes', t: 'text', fmt: 'plain', label: 'Titre de l’axe vertical' },
];

/** Clés ajoutées par la carte : `migrate` (state.js) les écrit avec leur `def` quand elles manquent, pour que le panneau montre ce qui est dessiné */
export const NEW_AXES_KEYS = [
  'grid',
  'gridStyle',
  'gridTone',
  'axisValues',
  'baseline',
  'scaleMax',
  'gridCount',
  'refLine',
  'refValue',
  'refLineX',
  'refX',
  'refLineY',
  'refY',
];

/** Aspect d'origine des clés de la carte d'un type (champs `g: 'axes'` qui ont un `def`) */
export function axesOrigin(ty) {
  const out = {};
  for (const f of (ty && ty.fields) || []) if (f.g === 'axes' && f.def !== undefined && NEW_AXES_KEYS.includes(f.k)) out[f.k] = f.def;
  return out;
}
