/* Modèle des cartes (sans rendu) : options, contenu, et type de carte « logique » selon la largeur de la colonne. */
import { t } from './i18n.js';

export const CARD_DEFAULTS = () => ({
  layout: 'vertical',                       // vertical | left | right (position de l'image)
  image: false, bleed: false,               // bleed : l'image va jusqu'au bord du contour
  icon: false, iconName: 'globe', iconCircle: true, iconInline: false,
  tag: false, title: true, figure: false, text: true, bullets: false, link: false,
  stroke: true, fill: false, align: 'left',
});

/** Texte d'exemple du Labo (en dur) */
export const SAMPLE = {
  tag: 'NEW', title: 'Digital Europe Programme', figure: '€7.5 billion',
  text: 'Lorem ipsum dolor sit amet, **consectetuer** adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat.',
  bullets: 'First key point\nSecond key point\nThird key point', link: 'Read more',
};

/** Type de carte par défaut selon la largeur de la colonne (px) : large → image à côté, moyenne → image en haut, étroite → icône en tête */
export function cardPresetFor(W) {
  if (W >= 450) return { layout: 'left', image: true, bleed: false, icon: false, tag: false, link: true, bullets: false, figure: false, align: 'left' };
  if (W >= 300) return { layout: 'vertical', image: true, bleed: false, icon: false, tag: true, link: true, bullets: false, figure: false, align: 'left' };
  return { layout: 'vertical', image: false, bleed: false, icon: true, iconCircle: true, iconInline: false, tag: false, link: false, bullets: false, figure: false, align: 'left' };
}

/** `auto` : tant que l'utilisateur n'a pas touché aux options, la carte suit la largeur de sa colonne */
export const newCard = (W = 336) => ({
  ...CARD_DEFAULTS(), ...cardPresetFor(W), auto: true, src: null,
  content: { tag: t('NOUVEAU'), title: t('Titre de la carte'), figure: '5 000', text: t('Texte de la carte. Une ligne = un paragraphe, **gras** avec les astérisques.'),
    bullets: [t('Premier point'), t('Deuxième point'), t('Troisième point')].join('\n'), link: t('En savoir plus') },
});

/** Options à cocher (clé, libellé) — communes à l'éditeur et au Labo */
export const CARD_CHECKS = [['image', 'Image'], ['bleed', 'Image jusqu’au bord du contour'], ['icon', 'Icône'], ['iconCircle', 'Icône dans une pastille'], ['iconInline', 'Icône à côté du titre'],
  ['tag', 'Étiquette'], ['title', 'Titre'], ['figure', 'Chiffre'], ['text', 'Texte'], ['bullets', 'Puces'], ['link', 'Lien'], ['stroke', 'Contour'], ['fill', 'Fond blanc']];
