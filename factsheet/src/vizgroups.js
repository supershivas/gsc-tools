/* Rangement des champs d'un type de dataviz dans les cartes de l'onglet Visualisation.
   Chaque champ déclare sa carte par `g:` ; aucun rangement par défaut (un test refuse un champ sans `g` valide).
   Règle de décision : docs/architecture.md (« Où range-t-on un champ de dataviz ? »). */

/** Cartes de contenu, dans l'ordre du squelette (après Type, Titre et source, Pictogramme ; avant Chiffre à côté et Avancé). */
export const CARDS = [
  { g: 'struct', id: 'dv-struct', icon: 'layout-2', name: 'Structure' },
  { g: 'dims', id: 'dv-dims', icon: 'ruler-2', name: 'Dimensions' },
  { g: 'labels', id: 'dv-labels', icon: 'letter-case', name: 'Étiquettes' },
  { g: 'colors', id: 'dv-colors', icon: 'palette', name: 'Couleurs' },
  { g: 'bracket', id: 'dv-bracket', icon: 'brackets', name: 'Accolade et liaison' },
];

/** `g` accepté pour un champ de réglage : les cartes ci-dessus, plus `data` (onglet Données) et `ratio` (propriétés › Hauteur, jamais dans l'éditeur). */
export const VALID_G = new Set([...CARDS.map((c) => c.g), 'data', 'ratio']);

/** Ordre unique des champs dans une carte, quel que soit le type (clé absente de la liste : à la fin, dans l'ordre de déclaration). */
export const FIELD_ORDER = [
  // Structure
  'style', 'orient', 'largestAngle', 'startAngle', 'ringAlign', 'orientation', 'alternate', 'tail', 'align', 'shape',
  'cols', 'gridRows', 'total', 'perIcon', 'perDot', 'perRow', 'segments', 'circle', 'parents', 'zero', 'zeroX', 'zeroY',
  // Dimensions
  'barSize', 'groupSpace', 'rowSpace', 'serSpace', 'rowGap', 'scale', 'pad', 'gap', 'nodeW', 'nodePad', 'maxR', 'hole',
  // Étiquettes
  'legend', 'legendPos', 'showPercent', 'showValues', 'valuesIn', 'labelIn', 'showLabels', 'groupLabels', 'showDates', 'showTotal',
  'layout', 'leading', 'totalTpl', 'xTitle', 'yTitle', 'decimals', 'suffix',
  // Couleurs
  'color',
  // Accolade et liaison
  'callout.on', 'callout.value', 'callout.text', 'bracket', 'bracketGap', 'bracketLink', 'linkExtra', 'linkColor',
]; // prettier-ignore

/** Carte d'un champ : `g` explicite, sinon les données (tableau, liste) ou le format (`ratio`) ; `undefined` si le champ n'est pas rangé (refusé par le test). */
export const groupOf = (f) => f.g || (f.t === 'table' || f.t === 'list' ? 'data' : f.k === 'ratio' ? 'ratio' : undefined);

/** Champs d'une carte, dans l'ordre de `FIELD_ORDER`. */
export const fieldsOf = (fields, g) => {
  const rank = (f) => {
    const i = FIELD_ORDER.indexOf(f.k);
    return i < 0 ? FIELD_ORDER.length : i;
  };
  return fields
    .map((f, i) => [f, i])
    .filter(([f]) => groupOf(f) === g)
    .sort((a, b) => rank(a[0]) - rank(b[0]) || a[1] - b[1])
    .map(([f]) => f);
};
