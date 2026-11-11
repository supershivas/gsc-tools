/* Données hiérarchiques communes (sunburst, bulles, treemap) : colonnes Niveau 1 / 2 / 3 + valeur → arbre pour d3-hierarchy. */
import { hierarchy } from 'd3-hierarchy';
import { t } from '../i18n.js';
import { autoColor, SW } from './util.js';

export const HIER_DATA = {
  k: 'rows',
  min: 1,
  cols: [
    { k: 'l1', label: 'Niveau 1', t: 'text' },
    { k: 'l2', label: 'Niveau 2', t: 'text' },
    { k: 'l3', label: 'Niveau 3', t: 'text' },
    { k: 'value', label: 'Valeur', t: 'number', def: 10 },
    { k: 'color', label: 'Couleur (niveau 1)', t: 'color', auto: true, def: '' },
  ],
  item: () => ({ l1: '', l2: '', l3: '', value: 10, color: '' }),
};
export const hierRows = () =>
  [
    ['Europe', 'France', '', 67, ''],
    ['Europe', 'Germany', '', 83, ''],
    ['Europe', 'Italy', '', 59, ''],
    ['Asia', 'Japan', '', 125, ''],
    ['Asia', 'India', 'Urban', 480, ''],
    ['Asia', 'India', 'Rural', 920, ''],
    ['Africa', 'Nigeria', '', 223, ''],
    ['Africa', 'Egypt', '', 112, ''],
  ].map(([l1, l2, l3, value, color]) => ({ l1, l2, l3, value, color }));

/** { root (hierarchy sommée, sans nœud racine visible), tops: [{ name, color, value }] } */
export function buildHier(rows) {
  const top = { name: '', children: [] };
  for (const r of rows || []) {
    const path = [r.l1, r.l2, r.l3].map((x) => String(x || '').trim()).filter(Boolean),
      v = Math.max(0, +r.value || 0);
    if (!path.length || !v) continue;
    let node = top;
    path.forEach((name, i) => {
      let c = (node.children || (node.children = [])).find((x) => x.name === name);
      if (!c) {
        c = { name };
        node.children.push(c);
      }
      if (i === 0 && r.color && !c.color) c.color = r.color;
      node = c;
    });
    node.value = (node.value || 0) + v;
  }
  const root = hierarchy(top)
    .sum((d) => d.value || 0)
    .sort((a, b) => b.value - a.value);
  const tops = (root.children || []).map((n, i) => {
    n.data.color = autoColor(n.data.color, i);
    return { name: n.data.name, color: n.data.color, value: n.value };
  });
  return { root, tops };
}
export const topOf = (n) => (n.depth <= 1 ? n : n.ancestors().find((a) => a.depth === 1));
/** opacité du fond selon la profondeur (1 = couleur pleine) */
export const depthAlpha = (d) => [1, 1, 0.7, 0.45, 0.3][Math.min(d, 4)];

/* Apparence commune des types hiérarchiques (bulles, treemap, sunburst) : contour et intensité des teintes. Sans clé : l'aspect d'avant
   (trait de 0,5 pt, teintes de `depthAlpha`). */
const TONE_K = { light: 0.75, normal: 1, strong: 1.25 };
export { lineAttrs, LINE_FIELD } from './util.js'; // contour : partagé avec les barres et l'anneau
/** opacité de la teinte d'une forme, selon l'intensité choisie (jamais au-delà de 1) */
export const toneAlpha = (o, a) => Math.min(1, a * (TONE_K[o.fillTone] ?? 1));
export const TONE_FIELD = {
  k: 'fillTone',
  g: 'colors',
  t: 'select',
  label: 'Intensité des teintes',
  options: { light: 'Légère', normal: 'Normale', strong: 'Marquée' },
  def: 'normal',
};
