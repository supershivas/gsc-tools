/* Chiffre clé : type de contenu à part (pas une dataviz). Grand chiffre en Source Serif 4, éventuellement précédé d'une icône,
   texte en dessous. Le contour éventuel est celui de la colonne (voir render.js). */
import { el, s, SW, SERIF, pxOf, fitSize } from './viz/util.js';
import { ICONS, ICON_OPTIONS } from './viz/icons.js';
import { TYPE, VIZ } from './tokens.js';

export const FIGURE_DEFAULTS = () => ({
  value: '5 000', icon: 'none', iconStyle: 'plain',
  text: 'Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim',
});
export const FIGURE_FIELDS = [
  { k: 'value', t: 'text', label: 'Chiffre (texte libre : « 5 000 », « 64 % »…)' },
  { k: 'icon', t: 'select', label: 'Icône devant le chiffre', options: { none: 'Aucune', ...ICON_OPTIONS } },
  { k: 'iconStyle', t: 'select', label: 'Style de l’icône', options: { plain: 'Pictogramme seul', circle: 'Dans une pastille' } },
  { k: 'text', t: 'area', label: 'Texte' },
];

const esc = t => String(t || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');

/** Icône au trait, à la hauteur de ligne du chiffre ; pastille ronde 0,5 pt en option */
export function figureIcon(key, size, circle) {
  const ic = ICONS[key]; if (!ic) return null;
  const G = circle ? size * 0.58 : size * 0.82, k = G / 24, o = (size - G) / 2;
  return s('svg', { width: size, height: size, viewBox: `0 0 ${size} ${size}`, class: 'vi-ic fg-ic' },
    circle ? s('circle', { cx: size / 2, cy: size / 2, r: size / 2 - SW / 2, fill: 'none', stroke: 'currentColor', 'stroke-width': SW }) : null,
    s('path', { d: ic.d, fill: 'none', stroke: 'currentColor', 'stroke-width': SW / k, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', transform: `translate(${o} ${o}) scale(${k})` }));
}

/** W = largeur utile (px), align = alignement du texte de la colonne (left | center | right | justify) */
export function renderFigure(o, W, align) {
  const base = pxOf(TYPE.figure.size), lh = TYPE.figure.lh, icon = o.icon && o.icon !== 'none' ? figureIcon(o.icon, lh, o.iconStyle === 'circle') : null;
  const avail = (W || 9999) - (icon ? lh + VIZ.iconGap : 0) - 1;
  const fs = fitSize(o.value || '', TYPE.figure.weight, SERIF, base, avail, 0.4);
  const jc = { center: 'center', right: 'flex-end' }[align] || 'flex-start';
  const head = el('div', { class: 'fg-head', style: { justifyContent: jc } }, icon,
    el('div', { class: 'vf-value', textContent: o.value || '', style: fs < base ? { fontSize: fs + 'px', whiteSpace: 'nowrap' } : {} }));
  return el('div', { class: 'fg', style: align && align !== 'left' ? { textAlign: align } : {} }, head,
    o.text && o.text.trim() ? el('div', { class: 'vf-text', innerHTML: esc(o.text) }) : null);
}
