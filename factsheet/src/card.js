/* Carte (card) : prototype pour le Labo — pas encore branchée dans l'éditeur.
   Toutes les options sont des interrupteurs : image (haut / gauche / droite, avec ou sans marge), icône (au-dessus ou à côté du titre,
   pictogramme ou pastille), étiquette, titre, chiffre, texte, puces, lien, contour, fond blanc, alignement. */
import { h, richText, inline } from './render.js';
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

/** W = largeur de la carte (px) */
/** env : environnement de rendu (env.rc : typographie, icônes importées) */
export function renderCard(o, W, env) {
  const C = o.content || SAMPLE,
    src = o.src || SAMPLE_IMG;
  const bullets = (Array.isArray(C.bullets) ? C.bullets : String(C.bullets || '').split('\n')).map((x) => x.trim()).filter(Boolean);
  const card = h('div', {
    class:
      `card card-${o.layout}` +
      (o.stroke ? ' stroked' + (o.fill ? ' filled' : '') : '') +
      (o.align === 'center' ? ' center' : '') +
      (o.imageCorners === 'square' ? ' img-square' : '') +
      (o.bleed && o.stroke ? ' bleed' : ''),
  });
  const pic = o.image ? h('div', { class: 'card-img' }, h('img', { src, alt: '' })) : null;
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
    o.bullets
      ? h(
          'ul',
          { class: 'card-list' },
          bullets.map((b) => h('li', { innerHTML: inline(b, env) })),
        )
      : null,
    o.link ? h('div', { class: 'card-link' }, h('span', { innerHTML: inline(C.link, env) }), h('i', { class: 'ti ti-arrow-right' })) : null,
  );
  if (o.layout === 'vertical' || !pic) card.append(...[pic, body].filter(Boolean));
  else card.append(...(o.layout === 'left' ? [pic, body] : [body, pic]));
  card.style.width = W + 'px';
  return card;
}
