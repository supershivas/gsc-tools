/* Médias importés du document : les icônes SVG (doc.customIcons, communes à tout le document) ; un seul endroit, dans le menu Édition */
import { h, ico } from './render.js';
import { t } from './i18n.js';
import { iconLib } from './viz/icons.js';
import { iconGlyph } from './iconselect.js';
import { importSvgFile } from './viz/picto.js';

export function openMedia(ctx) {
  const dlg = h('dialog', { class: 'media-dlg' });
  const inp = h('input', { type: 'file', accept: '.svg,image/svg+xml,image/png,image/jpeg,image/webp,image/gif', multiple: true, hidden: true, onchange: async () => {
    const files = [...inp.files]; inp.value = ''; for (const f of files) await importSvgFile(f); ctx.changed(); draw(); } });
  const draw = () => {
    const rows = iconLib.list.map(c => h('div', { class: 'media-row' }, h('span', { class: 'media-prev' }, iconGlyph('custom:' + c.id, null, 28)),
      h('input', { type: 'text', value: c.name, 'aria-label': t('Nom'), oninput: e => { c.name = e.target.value; ctx.changed(); } }),
      h('button', { type: 'button', class: 'mini danger', title: t('Retirer'), 'aria-label': t('Retirer'), onclick: () => { const i = iconLib.list.findIndex(k => k.id === c.id); if (i >= 0) iconLib.list.splice(i, 1); ctx.changed(); draw(); } }, ico('x'))));
    dlg.replaceChildren(h('h3', { textContent: t('Médias importés') }),
      h('p', { class: 'hint', textContent: t('Icônes et images importées (SVG, PNG, JPEG…) : disponibles dans chaque choix d’icône du document, par exemple comme drapeau sous une barre. Les retirer les retire partout.') }),
      ...(rows.length ? rows : [h('p', { class: 'hint', textContent: t('Aucun média importé.') })]),
      h('div', { class: 'row', style: { justifyContent: 'space-between', marginTop: '12px' } },
        h('button', { type: 'button', class: 'pp-btn', onclick: () => inp.click() }, ico('upload'), h('span', { textContent: t('Importer une icône ou une image…') })), inp,
        h('button', { type: 'button', class: 'primary', textContent: t('Fermer'), onclick: () => dlg.close() })));
  };
  dlg.addEventListener('close', () => dlg.remove());
  draw(); document.body.append(dlg); dlg.showModal();
}
