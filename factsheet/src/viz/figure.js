/* Chiffre clé : encadré 0,5 pt, grand chiffre en Source Serif 4, texte en dessous. */
import { el, mw, SERIF, pxOf, fitSize } from './util.js';
import { TYPE, GAP, STROKE } from '../tokens.js';

export default {
  label: 'Chiffre clé',
  defaults: () => ({ value: '5 000', text: 'Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim' }),
  fields: [
    { k: 'value', t: 'text', label: 'Chiffre (texte libre : « 5 000 », « 64 % »…)' },
    { k: 'text', t: 'area', label: 'Texte' },
  ],
  render(o, W) {
    const inner = (W || 9999) - 2 * GAP.boxPad - 2 * STROKE.px - 1, base = pxOf(TYPE.figure.size);
    const fs = fitSize(o.value || '', TYPE.figure.weight, SERIF, base, inner, 0.4);
    const box = el('div', { class: 'viz-figure' },
      el('div', { class: 'vf-value', textContent: o.value || '', style: fs < base ? { fontSize: fs + 'px', whiteSpace: 'nowrap' } : {} }),
      o.text && o.text.trim() ? el('div', { class: 'vf-text', innerHTML: o.text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\*\*(.+?)\*\*/g, '<b>$1</b>') }) : null);
    return { node: box };
  },
};
