/* Carte (card) : prototype pour le Labo — pas encore branchée dans l'éditeur.
   Toutes les options sont des interrupteurs : image (haut / gauche / droite, avec ou sans marge), icône (au-dessus ou à côté du titre,
   pictogramme ou pastille), étiquette, titre, chiffre, texte, puces, lien, contour, fond blanc, alignement. */
import { h, richText } from './render.js';
import { figureIcon } from './figure.js';
import { insetW, GAP } from './tokens.js';

export const CARD_DEFAULTS = () => ({
  layout: 'vertical',                       // vertical | left | right (position de l'image)
  image: false, bleed: false,               // bleed : l'image va jusqu'au bord du contour
  icon: false, iconName: 'globe', iconCircle: true, iconInline: false,
  tag: false, title: true, figure: false, text: true, bullets: false, link: false,
  stroke: true, fill: false, align: 'left',
});

export const SAMPLE = {
  tag: 'NEW', title: 'Digital Europe Programme', figure: '€7.5 billion',
  text: 'Lorem ipsum dolor sit amet, **consectetuer** adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat.',
  bullets: ['First key point', 'Second key point', 'Third key point'], link: 'Read more',
};
/* Image d'exemple (paysage neutre aux couleurs du thème), en dur : le labo ne lit rien ailleurs */
export const SAMPLE_IMG = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice"><rect width="400" height="300" fill="#A4CCFC"/><circle cx="300" cy="80" r="34" fill="#FCDC0C"/><path d="M0 300V210c60-50 120-50 190-10s140 40 210-20v120z" fill="#0434F8"/><path d="M0 300v-50c80-40 150-30 230 5s120 20 170-10v55z" fill="#041CEC"/></svg>');

/** W = largeur de la carte (px) */
export function renderCard(o, W) {
  const card = h('div', { class: `card card-${o.layout}` + (o.stroke ? ' stroked' + (o.fill ? ' filled' : '') : '') + (o.align === 'center' ? ' center' : '') + (o.bleed && o.stroke ? ' bleed' : '') });
  const pic = o.image ? h('div', { class: 'card-img' }, h('img', { src: SAMPLE_IMG, alt: '' })) : null;
  const iconAbove = o.icon && !o.iconInline ? h('div', { class: 'card-ico' }, figureIcon(o.iconName, GAP.boxPad * 4, o.iconCircle)) : null;
  const iconInline = o.icon && o.iconInline ? figureIcon(o.iconName, GAP.boxPad * 2, o.iconCircle) : null;
  const body = h('div', { class: 'card-body' },
    o.tag ? h('div', { class: 'card-tag', textContent: SAMPLE.tag }) : null,
    iconAbove,
    o.title || iconInline ? h('div', { class: 'card-head' }, iconInline, o.title ? h('h3', { class: 'card-title', textContent: SAMPLE.title }) : null) : null,
    o.figure ? h('div', { class: 'vf-value', textContent: SAMPLE.figure }) : null,
    o.text ? richText(SAMPLE.text, o.align === 'center' ? 'center' : 'left') : null,
    o.bullets ? h('ul', { class: 'card-list' }, SAMPLE.bullets.map(b => h('li', { textContent: b }))) : null,
    o.link ? h('div', { class: 'card-link' }, SAMPLE.link, h('i', { class: 'ti ti-arrow-right' })) : null);
  if (o.layout === 'vertical' || !pic) card.append(pic, body);
  else card.append(...(o.layout === 'left' ? [pic, body] : [body, pic]));
  card.style.width = W + 'px';
  return card;
}
export { insetW };
