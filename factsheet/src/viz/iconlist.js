/* Liste à icônes : pastille ronde 0,5 pt + pictogramme + texte. */
import { VIZ } from '../tokens.js';
import { s, el, SW } from './util.js';
import { ICONS, ICON_OPTIONS } from './icons.js';

export default {
  label: 'Liste à icônes',
  defaults: () => ({ items: [
    { icon: 'sliders', text: 'Premier élément de liste' },
    { icon: 'send', text: 'Deuxième élément de liste' },
    { icon: 'pencil', text: 'Troisième élément de liste' },
  ] }),
  fields: [
    { k: 'items', t: 'list', label: 'Éléments', min: 1, max: 8, item: () => ({ icon: 'check', text: 'Nouvel élément' }),
      fields: [{ k: 'icon', t: 'select', label: 'Icône', options: ICON_OPTIONS }, { k: 'text', t: 'text', label: 'Texte' }] },
  ],
  render(o) {
    const C = VIZ.iconCircle, G = VIZ.iconGlyph;
    const list = el('div', { class: 'viz-icons' });
    for (const it of o.items || []) {
      const ic = ICONS[it.icon] || ICONS.check;
      const k = G / 24;
      const svg = s('svg', { width: C, height: C, viewBox: `0 0 ${C} ${C}`, class: 'vi-ic' },
        s('circle', { cx: C / 2, cy: C / 2, r: C / 2 - SW / 2, fill: 'none', stroke: 'currentColor', 'stroke-width': SW }),
        s('path', { d: ic.d, fill: 'none', stroke: 'currentColor', 'stroke-width': SW / k, 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
          transform: `translate(${(C - G) / 2} ${(C - G) / 2}) scale(${k})` }));
      list.append(el('div', { class: 'vi-row' }, svg, el('div', { class: 'vi-text', innerHTML: String(it.text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\*\*(.+?)\*\*/g, '<b>$1</b>') })));
    }
    return { node: list };
  },
};
