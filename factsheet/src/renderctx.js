/* Contexte de rendu d'un document : ce qui dépend des réglages du document et que le rendu lisait autrefois dans des variables
   de module modifiées à chaque rendu (densité → écarts et gouttière, typographie automatique, bibliothèque d'icônes importées,
   identifiants des clipPath). Construit par renderDocument (ou par qui rend une partie du document : éditeur de dataviz, Labo),
   il descend par `env.rc` jusqu'aux dataviz, chiffres clés, cartes, richText et inlineMk. Deux rendus ne partagent rien. */
import { densityGaps } from './tokens.js';

/** doc : le document (ou {} pour les réglages par défaut : densité normale, pas de typographie automatique, aucune icône importée) */
export function renderCtx(doc) {
  const d = doc || {};
  const gap = densityGaps(d.density);
  const tag = Math.random().toString(36).slice(2, 7); // identifiants uniques dans la page même si plusieurs rendus y cohabitent
  let n = 0;
  return Object.freeze({
    gap, // écarts selon la densité (GAP pour les autres clés)
    gutter: gap.columns, // gouttière entre colonnes
    typo: Object.freeze({ fr: !!d.frTypo, ord: !!d.ordinals }), // typographie automatique (inlineMk)
    icons: Array.isArray(d.customIcons) ? d.customIcons : [], // icônes importées du document (customList, iconNode)
    uid: (prefix) => `${prefix}${tag}-${++n}`, // identifiant d'élément SVG (clipPath…)
  });
}
