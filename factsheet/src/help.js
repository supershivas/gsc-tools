/* Petits « ? » d'aide : une icône au trait à côté d'un libellé ; le texte s'affiche en infobulle au survol ou au focus.
   Les textes sont dans HELP, indexés par le libellé (clé française, comme le dictionnaire i18n) : il suffit d'ajouter une entrée
   pour qu'un champ, un interrupteur ou une carte reçoive son « ? » automatiquement (props/kit.js, editor.js, cards.js, vizheight.js). */
import { h, ico } from './render.js';
import { t } from './i18n.js';

export const HELP = {
  /* header */
  Surtitre: 'Petite ligne en capitales au-dessus du titre, suivie d’un filet. Entrée = retour à la ligne.',
  'Titre du header': 'Le titre du header a une taille fixe (30 px). Un avertissement apparaît si le texte déborde du bandeau.',
  'Sous-titre du header': 'Optionnel : vide, il est masqué. Deux lignes tiennent dans le header ; au-delà, un avertissement s’affiche.',
  'Titre de la dataviz':
    'Facultatif, au-dessus du graphique. Une ligne = un paragraphe ; le bouton « Mise en forme » donne les styles (titre 1, titre 2, chiffre clé…).',
  'Source de la dataviz': 'Facultatif, sous le graphique.',
  'Hauteur minimale de la colonne (px)':
    '0 = automatique : la hauteur suit le contenu. Se règle aussi avec la poignée sous la colonne dans l’aperçu.',
  'Nom du fichier': 'Nom utilisé pour les fichiers enregistrés et exportés (titre_AAMMJJ.extension).',
  Espacement: 'Écarts entre sections, sous-sections et colonnes : serré (75 %), actuel, large (125 %).',
  'Afficher l’image': 'Image de 132 px de haut à gauche du header, choisie dans la bibliothèque.',
  'Afficher le logo': 'Logo à droite du header ; quatre versions de même taille sont disponibles.',
  /* section et sous-section */
  'Titre de section (vide = masqué)':
    'Titre de la section. Entrée = retour à la ligne ; vide ou interrupteur éteint = titre masqué (la section se déplace alors par son fond).',
  'Titre de sous-section (vide = masqué)': 'Titre de la sous-section, sous le titre de section. Vide = masqué.',
  'Afficher le titre': 'Masque le titre sans le perdre : il reste saisi, mais n’apparaît ni à l’écran ni à l’export.',
  'Filet au-dessus de la section':
    'Trait de 0,5 pt sur toute la largeur de la page entre cette section et la précédente (sections sur fond blanc, ou deux bandes de couleur côte à côte).',
  'Filet entre les sous-sections': 'Trait de 0,5 pt sur toute la largeur de la page entre deux sous-sections de cette section.',
  'Couleur du filet': 'Par défaut : blanc sur un fond de section, bleu léger (teinte 20 %) sur fond blanc.',
  'Fond de la section': 'Bande de couleur sur toute la largeur de la page, derrière la section.',
  Cadre: 'Contour de 0,5 pt et fond facultatif autour de la section, aligné sur les marges.',
  Contour: 'Trait de 0,5 pt aux coins arrondis ; le contenu est alors en retrait de 12 px.',
  'Alignement vertical dans la colonne': 'Place le contenu en haut, au centre ou en bas quand la colonne est moins haute que sa voisine.',
  'Échanger le contenu avec…': 'Échange de place le contenu de cette colonne avec celui d’une autre (alignements inclus). Annulable.',
  Disposition: 'Alignement vertical du contenu et du texte dans la colonne.',
  'Fond et contour': 'Fond (couleur ou teinte) et contour de la colonne, indépendants l’un de l’autre.',
  /* dataviz */
  'Type de dataviz': 'Change le type du graphique en gardant le titre et, quand la forme est la même, les données.',
  Hauteur:
    'Automatique : hauteur naturelle. Proportion : fraction de la largeur. Fixe : en pixels. Remplir : occupe la place restante de la page.',
  'Hauteur minimale (px)': 'En mode « Remplir », la dataviz ne sera jamais plus basse.',
  'Hauteur maximale (px)': 'En mode « Remplir », la dataviz ne sera jamais plus haute.',
  'Place disponible pour cet aperçu (px)': 'Simule l’espace libre de la page pour voir l’effet du mode « Remplir » (non enregistré).',
  'Titre et source': 'Texte facultatif au-dessus (titre) et sous (source) de la dataviz.',
  Données:
    'Collez un tableau depuis Excel ou Sheets, importez un fichier CSV, TSV ou JSON, ou saisissez directement dans les cellules. Entrée passe à la ligne suivante.',
  Structure: 'Comment le graphique est construit : séries, orientation, forme, grille, axes.',
  Dimensions: 'Épaisseurs, espaces et rayons du graphique.',
  'Accolade et liaison': 'Accolade d’évolution, accolade de liste et trait de liaison vers la colonne voisine.',
  Étiquettes: 'Légende, valeurs affichées, décimales et unité.',
  Couleurs: 'Couleurs du document ; les séries utilisent les clés de la palette, donc suivent le thème.',
  'Format du graphique': 'Proportion hauteur / largeur du graphique (en mode « Proportion »).',
  'Afficher la légende': 'Pastilles de couleur avec le nom des séries ou des groupes sous le graphique.',
  'Décimales des valeurs': 'Nombre de décimales affichées pour les valeurs.',
  'Unité après la valeur (%, M€…)': 'Texte ajouté après chaque valeur, par exemple « % » ou « M€ ».',
  'Texte du centre':
    'Une ligne par paragraphe. « ## » devant une ligne = titre 2, « ### » = texte courant, rien = titre 1. {total} = somme des valeurs.',
  'Répondants par point (0 = automatique)': 'Un point représente N répondants. 0 choisit une valeur pour afficher environ 400 points.',
  'Groupes par ligne (0 = automatique)': 'Nombre de nuages côte à côte quand l’enquête a plusieurs groupes.',
  'Valeur d’un pictogramme': 'Valeur représentée par un pictogramme entier ; le dernier peut être partiel.',
  'Valeur du pictogramme plein (ex. 100)': 'Valeur correspondant à un pictogramme entièrement rempli (ex. 100 pour des pourcentages).',
  'Alterner les événements de part et d’autre de la ligne':
    'Les événements pairs et impairs passent de chaque côté de la ligne : le texte dispose de deux fois plus de largeur.',
  'Chiffre à côté': 'Un chiffre clé (par exemple 14 %) et son texte à côté de la dataviz, qui prend alors la part de largeur choisie.',
  'Adapter à la colonne voisine': 'La dataviz prend la hauteur de la colonne voisine la plus haute de sa rangée.',
  'Position verticale de l’anneau':
    'Quand les textes autour de l’anneau sont plus hauts que lui : l’anneau se place en haut, centré sur le contenu ou en bas ; les traits de repère suivent.',
  'Alignement vertical de la dataviz':
    'Quand le conteneur est plus haut que le contenu : le contenu se place en haut, au centre ou en bas.',
  'Interlignage des textes': 'Espace entre les lignes des libellés : serré, normal (18 px) ou large (21 px).',
  'Extrémités de la ligne':
    'Avant le premier et après le dernier cercle, la ligne se prolonge (un tiers plein puis des tirets) ou non : « Aucune » fait commencer la ligne au premier cercle.',
  'Largeur des nœuds (px)': 'Épaisseur des barres verticales du diagramme de Sankey.',
};

let tip = null;
const place = (btn) => {
  const r = btn.getBoundingClientRect(),
    w = tip.offsetWidth,
    hgt = tip.offsetHeight;
  let x = Math.max(8, Math.min(r.left + r.width / 2 - w / 2, window.innerWidth - w - 8)),
    y = r.bottom + 8;
  if (y + hgt > window.innerHeight - 8) y = r.top - hgt - 8;
  Object.assign(tip.style, { left: x + 'px', top: y + 'px' });
};
const show = (btn, msg) => {
  if (!tip) {
    tip = h('div', { class: 'hlp-tip', role: 'tooltip' });
    document.body.append(tip);
  }
  tip.textContent = t(msg);
  tip.style.display = 'block';
  place(btn);
};
const hide = () => {
  if (tip) tip.style.display = 'none';
};
window.addEventListener('scroll', hide, true);

/** « ? » pour un libellé (ou pour un texte donné) ; null s'il n'y a rien à dire */
export function helpBtn(label, text) {
  const msg = text || HELP[label];
  if (!msg) return null;
  const b = h('button', { type: 'button', class: 'hlp', 'aria-label': t('Aide'), tabindex: 0 }, ico('help-circle'));
  b.addEventListener('pointerenter', () => show(b, msg));
  b.addEventListener('pointerleave', hide);
  b.addEventListener('focus', () => show(b, msg));
  b.addEventListener('blur', hide);
  b.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    tip && tip.style.display === 'block' ? hide() : show(b, msg);
  });
  return b;
}
