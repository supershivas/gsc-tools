/* Rangement des champs d'un type de dataviz dans les cartes de l'onglet Visualisation.
   Chaque champ déclare sa carte par `g:` ; aucun rangement par défaut (un test refuse un champ sans `g` valide).
   Règle de décision : docs/architecture.md (« Où range-t-on un champ de dataviz ? »). */

/** Cartes de contenu, dans l'ordre du squelette (après Type, Titre et source, Pictogramme ; avant Chiffre à côté et Avancé). */
export const CARDS = [
  { g: 'struct', id: 'dv-struct', icon: 'layout-2', name: 'Structure' },
  { g: 'dims', id: 'dv-dims', icon: 'ruler-2', name: 'Dimensions' },
  { g: 'axes', id: 'dv-axes', icon: 'axis-y', name: 'Axes et grille' },
  { g: 'labels', id: 'dv-labels', icon: 'letter-case', name: 'Étiquettes' },
  { g: 'texts', id: 'dv-texts', icon: 'typography', name: 'Textes' },
  { g: 'colors', id: 'dv-colors', icon: 'palette', name: 'Couleurs' },
  { g: 'bracket', id: 'dv-bracket', icon: 'brackets', name: 'Accolade et liaison' },
];

/** `g` accepté pour un champ de réglage : les cartes ci-dessus, plus `data` (onglet Données) et `ratio` (propriétés › Hauteur, jamais dans l'éditeur). */
export const VALID_G = new Set([...CARDS.map((c) => c.g), 'data', 'ratio']);

/** Ordre unique des champs dans une carte, quel que soit le type (clé absente de la liste : à la fin, dans l'ordre de déclaration). */
export const FIELD_ORDER = [
  // Structure
  'style', 'orient', 'largestAngle', 'startAngle', 'ringAlign', 'orientation', 'alternate', 'tail', 'align', 'shape',
  'cols', 'gridRows', 'total', 'perIcon', 'perDot', 'perRow', 'circle', 'parents', 'curve', 'points', 'area', 'refCol', 'compareTo', 'colorBy', 'hiddenInfo',
  // Dimensions
  'barSize', 'groupSpace', 'rowSpace', 'serSpace', 'rowGap', 'scale', 'pad', 'gap', 'corners', 'nodeW', 'nodePad', 'maxR', 'ringWidth', 'segGap', 'hole', 'lineWidth', 'cellLine', 'pendingStyle', 'nodeLine', 'circleWidth', 'iconStroke', 'ringGap', 'markSize', 'dotSize', 'iconGap', 'pointSize',
  // Axes et grille
  'grid', 'gridStyle', 'gridTone', 'segments', 'axisValues', 'baseline', 'baseWidth', 'xTitle', 'yTitle', 'showRowNames', 'showColNames', 'zero', 'zeroX', 'zeroY', 'scaleMax', 'gridCount',
  'refLine', 'refValue', 'refAvg', 'refLineX', 'refX', 'refAvgX', 'refTextX', 'refLineY', 'refY', 'refAvgY', 'refTextY',
  // Étiquettes
  'legend', 'legendPos', 'legendNote', 'legendNoteText', 'showPercent', 'showValues', 'showPct', 'showDelta', 'valuesIn', 'labelIn', 'showLabels', 'groupLabels', 'showDates', 'showTotal',
  'layout', 'leading', 'totalTpl', 'refText', 'pendingText', 'decimals', 'suffix',
  // Textes (mise en forme des noms et en-têtes)
  'nameWidth', 'nameWrap', 'nameSize', 'nameBold', 'nameAlign', 'headWrap', 'headSize', 'headBold',
  // Couleurs
  'color', 'color2', 'classes', 'emptyStyle', 'fillTone', 'linkOpacity', 'pointOpacity',
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

/** Sous-sections des cartes denses (6 champs ou plus, actions comprises) : titre + filet, sans repli. Un champ garde la même sous-section dans tous les types ;
    un champ absent de la table reste en tête de carte, sans titre. Vocabulaire figé (docs/architecture.md). */
export const SUBS = {
  legend: 'Légende',
  values: 'Valeurs',
  names: 'Noms et textes',
  inbars: 'Texte dans les barres',
  numbers: 'Nombres',
  shape: 'Forme',
  orient: 'Orientation',
  position: 'Position',
  grid: 'Grille',
  axis: 'Axe',
  scale: 'Échelle',
  ref: 'Ligne de référence',
  rownames: 'Noms des lignes',
  colheads: 'En-têtes de colonnes',
};
const SUB_OF = {
  legend: 'legend', legendPos: 'legend', legendNote: 'legend', legendNoteText: 'legend', showPercent: 'legend',
  showValues: 'values', valuesIn: 'values', showTotal: 'values', showPct: 'values', showDelta: 'values',
  showLabels: 'names', groupLabels: 'names', showDates: 'names', layout: 'names', leading: 'names', totalTpl: 'names', refText: 'names', pendingText: 'names',
  labelIn: 'inbars', decimals: 'numbers', suffix: 'numbers',
  style: 'shape', orient: 'orient', largestAngle: 'orient', startAngle: 'orient', ringAlign: 'position',
  grid: 'grid', gridStyle: 'grid', gridTone: 'grid', segments: 'grid',
  axisValues: 'axis', baseline: 'axis', baseWidth: 'axis', xTitle: 'axis', yTitle: 'axis', showRowNames: 'axis', showColNames: 'axis',
  zero: 'scale', zeroX: 'scale', zeroY: 'scale', scaleMax: 'scale', gridCount: 'scale',
  refLine: 'ref', refValue: 'ref', refAvg: 'ref', refLineX: 'ref', refX: 'ref', refAvgX: 'ref', refTextX: 'ref',
  refLineY: 'ref', refY: 'ref', refAvgY: 'ref', refTextY: 'ref',
}; // prettier-ignore
const SUB_RANK = Object.keys(SUBS);
export const subOf = (f) => f.s || SUB_OF[f.k];

/** Découpe les champs d'une carte en groupes [{ s, fields }] (sans titre d'abord, puis dans l'ordre du vocabulaire) ; `extra` : nombre d'actions de la carte (comptées dans le seuil) */
export function subsections(fields, extra = 0) {
  if (fields.length + extra < 6) return [{ s: null, fields }];
  const out = [];
  for (const s of [null, ...SUB_RANK]) {
    const fs = fields.filter((f) => (subOf(f) || null) === s);
    if (fs.length) out.push({ s, fields: fs });
  }
  return out;
}
