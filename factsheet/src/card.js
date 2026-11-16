/* Carte (card) : type de contenu de l'éditeur, et sujet du Labo.
   Toutes les options sont des interrupteurs : image (haut / gauche / droite, avec ou sans marge), icône (au-dessus ou à côté du titre,
   pictogramme ou pastille), étiquette, titre, chiffre, texte, lien, contour, fond, alignement. */
import { h, richText, inline } from './render.js';
import { s } from './viz/util.js';
import { figureIcon } from './figure.js';
import { insetW, GAP } from './tokens.js';
import { SAMPLE } from './cardmodel.js';
export { CARD_DEFAULTS, SAMPLE } from './cardmodel.js';

/* Image d'exemple (paysage neutre aux couleurs du thème), en dur : le labo ne lit rien ailleurs */
export const SAMPLE_IMG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice"><rect width="400" height="300" fill="#A4CCFC"/><circle cx="300" cy="80" r="34" fill="#FCDC0C"/><path d="M0 300V210c60-50 120-50 190-10s140 40 210-20v120z" fill="#0434F8"/><path d="M0 300v-50c80-40 150-30 230 5s120 20 170-10v55z" fill="#041CEC"/></svg>',
  );

/** Fond de la carte : `fillColor` (clé de couleur ou 'none') ; les cartes d'avant n'ont que `fill` (fond blanc, seulement avec un contour) */
export const cardFill = (o) => (o.fillColor !== undefined ? o.fillColor || 'none' : o.fill && o.stroke ? 'white' : 'none');
/** Adresse du lien de la carte, si elle est sûre (mêmes protocoles que les liens du texte) */
export const cardUrl = (C) => {
  const u = String((C && C.url) || '').trim();
  return /^(https?:\/\/|mailto:)\S+$/i.test(u) ? u : '';
};

/* Flèche du lien : vrai SVG au trait (une icône de webfont est un pseudo-élément, absent du PDF) */
const linkArrow = () =>
  s(
    'svg',
    { width: 15, height: 15, viewBox: '0 0 24 24', class: 'card-arrow' },
    s('path', {
      d: 'M5 12H19M13 6L19 12L13 18',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': 2,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
    }),
  );

/** W = largeur de la carte (px) */
/** env : environnement de rendu (env.rc : typographie, icônes importées ; env.sampleImg : image d'exemple, Labo seulement) */
export function renderCard(o, W, env) {
  const C = o.content || SAMPLE,
    src = o.src || env.sampleImg,
    fill = cardFill(o),
    boxed = o.stroke || fill !== 'none';
  const card = h('div', {
    class:
      `card card-${o.layout}` +
      (o.stroke ? ' stroked' : '') +
      (fill !== 'none' ? ' filled' : '') +
      (o.align === 'center' ? ' center' : '') +
      (o.imageCorners === 'square' ? ' img-square' : '') +
      (o.bleed && boxed ? ' bleed' : ''),
  });
  if (o.stroke && o.strokeColor && o.strokeColor !== 'text') card.style.setProperty('--stroke-color', `var(--c-${o.strokeColor})`);
  if (fill !== 'none') card.style.background = `var(--c-${fill})`;
  /* image cochée mais pas encore choisie : emplacement gris, comme une colonne image vide (jamais d'image d'exemple dans le document) */
  const pic = o.image
    ? src
      ? h('div', { class: 'card-img' }, h('img', { src, alt: '' }))
      : h('div', { class: 'card-img card-img-empty' }, h('span', { textContent: 'image' }))
    : null;
  const iconAbove =
    o.icon && !o.iconInline ? h('div', { class: 'card-ico' }, figureIcon(o.iconName, GAP.boxPad * 4, o.iconCircle, env.rc.icons)) : null;
  const iconInline = o.icon && o.iconInline ? figureIcon(o.iconName, GAP.boxPad * 2, o.iconCircle, env.rc.icons) : null;
  const body = h(
    'div',
    { class: 'card-body' },
    o.tag ? h('div', { class: 'card-tag', innerHTML: inline(C.tag, env) }) : null,
    iconAbove,
    o.title || iconInline
      ? h('div', { class: 'card-head' }, iconInline, o.title ? h('h3', { class: 'card-title', innerHTML: inline(C.title, env) }) : null)
      : null,
    o.figure ? h('div', { class: 'vf-value', innerHTML: inline(C.figure, env) }) : null,
    o.text ? richText(C.text, o.align === 'center' ? 'center' : 'left', undefined, env) : null,
    o.link ? linkNode(C, env) : null,
  );
  if (o.layout === 'vertical' || !pic) card.append(...[pic, body].filter(Boolean));
  else card.append(...(o.layout === 'left' ? [pic, body] : [body, pic]));
  card.style.width = W + 'px';
  return card;
}

/* Lien : libellé + flèche ; avec une adresse (`content.url`), c'est un vrai lien (cliquable dans le PDF, comme les liens du texte) */
function linkNode(C, env) {
  const url = cardUrl(C),
    label = url ? h('a', { href: url, class: 'card-a', innerHTML: inline(C.link, env) }) : h('span', { innerHTML: inline(C.link, env) });
  return h('div', { class: 'card-link' }, label, linkArrow());
}
