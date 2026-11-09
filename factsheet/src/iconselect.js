/* Choix d'une icône : le bouton montre l'icône choisie (et son nom quand il y a la place), la liste montre chaque icône avec son nom.
   Clés reconnues : « none », « cross », « dot », « check » (repères), une clé de la bibliothèque (ICONS), « icon:<clé> », « picto:<clé> » (pictogrammes pleins),
   « custom:<id> » (icône SVG importée, dans root.customIcons). */
import { s, el } from './viz/util.js';
import { t } from './i18n.js';
import { ICONS } from './viz/icons.js';
import { PICTOS, iconNode, importSvgFile } from './viz/picto.js';
import { richSelect } from './colorselect.js';

/** icons : bibliothèque d'icônes du document (ctxIcons) */
export function iconGlyph(key, root, size = 20, icons) {
  const svg = s('svg', { width: size, height: size, viewBox: '0 0 24 24', class: 'cs-glyph', 'aria-hidden': 'true' });
  const stroke = (d) =>
    s('path', { d, fill: 'none', stroke: 'currentColor', 'stroke-width': 1.7, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
  const k = String(key ?? '');
  if (k === 'none' || k === '') {
    svg.append(
      s('circle', { cx: 12, cy: 12, r: 8, fill: 'none', stroke: 'currentColor', 'stroke-width': 1.5, opacity: 0.45 }),
      s('path', { d: 'M6.5 17.5l11-11', stroke: 'currentColor', 'stroke-width': 1.5, opacity: 0.45 }),
    );
  } else if (k === 'cross') svg.append(stroke('M6 6l12 12M18 6L6 18'));
  else if (k === 'dot') svg.append(s('circle', { cx: 12, cy: 12, r: 4.5, fill: 'currentColor' }));
  else if (k === 'check') svg.append(stroke('M5 12.5l4.5 4.5L19 7.5'));
  else if (k.startsWith('picto:')) {
    const p = PICTOS[k.slice(6)];
    if (p) svg.append(s('path', { d: p.d, fill: 'currentColor' }));
  } else if (k.startsWith('custom:')) svg.append(iconNode(root || {}, k, 0, 0, 24, 24, 'text', icons));
  else {
    const ic = ICONS[k.startsWith('icon:') ? k.slice(5) : k];
    if (ic) svg.append(stroke(ic.d));
  }
  return svg;
}

/** options : { clé → libellé } ; root : options de la dataviz (anciennes icônes importées) ; icons : bibliothèque du document (ctxIcons),
    où « Importer… » range l'icône */
export function iconSelect({ root, icons, refresh, ...o }) {
  const footer = ({ close, pick }) => {
    // « Importer un SVG… » au bas de la liste : partout où l'on choisit une icône
    const inp = el('input', {
      type: 'file',
      accept: '.svg,image/svg+xml,image/png,image/jpeg,image/webp,image/gif',
      hidden: true,
      onchange: async () => {
        const f = inp.files[0];
        inp.value = '';
        if (!f) return;
        const c = await importSvgFile(f, icons);
        if (!c) return;
        o.options['custom:' + c.id] = `${t('Importé')} · ${c.name}`;
        pick('custom:' + c.id);
        if (refresh) refresh();
      },
    });
    return el(
      'div',
      { class: 'cs-foot' },
      el(
        'button',
        { type: 'button', class: 'cs-opt', onclick: () => inp.click() },
        el('i', { class: 'ti ti-upload' }),
        el('span', { textContent: t('Importer une icône ou une image…') }),
      ),
      inp,
    );
  };
  return richSelect({ ...o, footer, lead: (k) => iconGlyph(k, root, 20, icons) });
}
