/* Liste à icônes : pastille ronde 0,5 pt + pictogramme + texte. */
import { VIZ, TYPE } from '../tokens.js';
import { s, el, SW, pxOf } from './util.js';
import { ICONS, ICON_OPTIONS } from './icons.js';
import { iconNode, iconImportPanel } from './picto.js';
import { t } from '../i18n.js';

export default {
  label: 'Liste à icônes',
  icon: 'list-check', family: 'list',
  defaults: () => ({ scale: '1', items: [
    { icon: 'sliders', text: t('Premier élément de liste') },
    { icon: 'send', text: t('Deuxième élément de liste') },
    { icon: 'pencil', text: t('Troisième élément de liste') },
  ] }),
  fields: [
    { k: 'scale', t: 'select', label: 'Taille des icônes et du texte', options: { 1: 'Normal', 1.5: 'Grand', 2: 'Très grand' } },
    { k: 'items', t: 'list', label: 'Éléments', min: 1, max: 8, item: () => ({ icon: 'check', text: t('Nouvel élément') }),
      fields: [{ k: 'icon', t: 'select', label: 'Icône', options: root => ({ ...ICON_OPTIONS, ...Object.fromEntries(((root && root.customIcons) || []).map(c => ['custom:' + c.id, `${t('Importé')} · ${c.name}`])) }) }, { k: 'text', t: 'text', label: 'Texte' }] },
  ],
  panel: iconImportPanel, panelTitle: 'Icônes importées',
  render(o, W, env) {
    const sc = +o.scale || 1, C = VIZ.iconCircle * sc, G = VIZ.iconGlyph * sc, bodyPx = pxOf(TYPE.body.size) * sc;
    const list = el('div', { class: 'viz-icons' });
    (o.items || []).forEach((it, idx) => {
      const k = G / 24, isCustom = String(it.icon || '').startsWith('custom:');
      const ic = ICONS[it.icon] || ICONS.check;
      const svg = s('svg', { width: C, height: C, viewBox: `0 0 ${C} ${C}`, class: 'vi-ic' },
        s('circle', { cx: C / 2, cy: C / 2, r: C / 2 - SW / 2, fill: 'none', stroke: 'currentColor', 'stroke-width': SW }),
        isCustom ? iconNode(o, it.icon, (C - G) / 2, (C - G) / 2, G, G, 'text')
          : s('path', { d: ic.d, fill: 'none', stroke: 'currentColor', 'stroke-width': SW / k, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', transform: `translate(${(C - G) / 2} ${(C - G) / 2}) scale(${k})` }));
      list.append(el('div', { class: 'vi-row', style: { ...(sc !== 1 ? { minHeight: C + 'px' } : {}), ...(env && env.ui ? { cursor: 'grab' } : {}) }, ...(env && env.ui ? { 'data-reorder': `items:${idx}`, 'data-axis': 'y' } : {}) }, svg, el('div', { class: 'vi-text', style: sc !== 1 ? { fontSize: bodyPx + 'px', lineHeight: TYPE.body.lh * sc + 'px' } : null, innerHTML: String(it.text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\*\*(.+?)\*\*/g, '<b>$1</b>') })));
    });
    return { node: list };
  },
};
