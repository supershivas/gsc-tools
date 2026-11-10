/* Champs de la carte « Axes et grille » (barres, barres horizontales, courbes, nuage de points).
   Chaque `def` est l'aspect d'avant la carte : une fiche existante ne change pas, et ↺ y revient toujours. */
import { gridOn } from './util.js';

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

/** Titres d'axes : texte simple, mesuré par `fitText` (jamais de mise en forme) */
export const axisTitleFields = () => [
  { k: 'xTitle', g: 'axes', t: 'text', fmt: 'plain', label: 'Titre de l’axe horizontal' },
  { k: 'yTitle', g: 'axes', t: 'text', fmt: 'plain', label: 'Titre de l’axe vertical' },
];

/** Clés ajoutées par la carte : `migrate` (state.js) les écrit avec leur `def` quand elles manquent, pour que le panneau montre ce qui est dessiné */
export const NEW_AXES_KEYS = ['grid', 'gridStyle', 'gridTone', 'axisValues', 'baseline', 'scaleMax', 'gridCount'];

/** Aspect d'origine des clés de la carte d'un type (champs `g: 'axes'` qui ont un `def`) */
export function axesOrigin(ty) {
  const out = {};
  for (const f of (ty && ty.fields) || []) if (f.g === 'axes' && f.def !== undefined && NEW_AXES_KEYS.includes(f.k)) out[f.k] = f.def;
  return out;
}
