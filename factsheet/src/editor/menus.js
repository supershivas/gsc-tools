import { DENSITIES } from '../tokens.js';
import { h } from '../render.js';
import { openPalette } from '../palette.js';
import { openMedia } from '../media.js';
import { LOCALES } from '../state.js';
import { initI18n, getLang, LANGS } from '../i18n.js';
import { MAC, MOD } from './keys.js';

/* Langue de l'interface (anglais par défaut) : sélecteur des réglages, renvoyé pour `declareMenus` */
export function initLang(ctx) {
  const langSel = h(
    'select',
    { 'aria-label': 'Langue' },
    Object.entries(LANGS).map(([k, l]) => h('option', { value: k, textContent: l })),
  );
  langSel.value = getLang();
  const i18n = initI18n(() => ctx.restructure());
  langSel.addEventListener('change', () => i18n.set(langSel.value));
  return langSel;
}

/* Fichier / Édition / Affichage : menus de l'en-tête (rendus par js/shell.js, lus dans `window.FS_UI` par factsheet/index.html) ;
   la langue est dans les réglages. Chaque entrée appelle les modules de l'éditeur reçus en paramètres. */
export function declareMenus({ ctx, history, historyUi, preview, spacing, hand, project, exporter, langSel }) {
  const zoomItem = (label, v) => ({
    label,
    checked: () => preview.getZoom() === v,
    run: () => {
      preview.setZoom(v);
      preview.schedule();
    },
  });
  window.FS_UI = {
    menus: [
      {
        label: 'Fichier',
        items: [
          { label: 'Nouvelle factsheet vierge', icon: 'file-plus', run: project.newBlank },
          { label: 'Enregistrer (.json)', icon: 'device-floppy', run: project.save },
          { label: 'Ouvrir…', icon: 'folder-open', run: project.open },
          { label: 'Exporter PDF…', icon: 'file-type-pdf', hint: MOD + 'P', run: () => exporter.openExport() },
          '-',
          { label: 'Atelier', icon: 'brush', href: 'atelier.html' },
        ],
      },
      {
        label: 'Édition',
        items: [
          {
            label: 'Annuler l’action',
            icon: 'arrow-back-up',
            hint: MOD + 'Z',
            run: () => history.undo(),
            disabled: () => !history.canUndo(),
          },
          {
            label: 'Rétablir',
            icon: 'arrow-forward-up',
            hint: MAC ? '⇧⌘Z' : 'Ctrl+Y',
            run: () => history.redo(),
            disabled: () => !history.canRedo(),
          },
          { label: 'Historique des modifications…', icon: 'history', run: () => historyUi.toggleHistory() },
          '-',
          { label: 'Couleurs du document…', icon: 'palette', run: () => openPalette(historyUi.nameIn, ctx) },
          { label: 'Médias importés…', icon: 'photo', run: () => openMedia(ctx) },
          { heading: 'Format des nombres' },
          ...Object.entries(LOCALES).map(([k, l]) => ({
            label: l,
            checked: () => ctx.getDoc().locale === k,
            run: () => {
              ctx.getDoc().locale = k;
              ctx.restructure();
            },
          })),
        ],
      },
      {
        label: 'Affichage',
        items: [
          { heading: 'Zoom' },
          zoomItem('Ajuster', 'fit'),
          zoomItem('50 %', '0.5'),
          zoomItem('75 %', '0.75'),
          zoomItem('100 %', '1'),
          zoomItem('200 %', '2'),
          zoomItem('400 %', '4'),
          '-',
          { heading: 'Espacement' },
          { label: 'Marges et espaces', icon: 'ruler-measure', checked: () => spacing.isOn(), run: () => spacing.toggle() },
          ...Object.entries(DENSITIES).map(([k, d]) => ({
            label: `${d.label} — ${Math.round(d.f * 100)} %`,
            checked: () => (ctx.getDoc().density || 'normal') === k,
            run: () => {
              ctx.getDoc().density = k;
              ctx.restructure();
              spacing.sync();
            },
          })),
          '-',
          { label: 'Outil main (Espace ou H)', icon: 'hand-stop', checked: () => hand.tool(), run: () => hand.toggle() },
          { label: 'Aperçu 3D', icon: '3d-cube-sphere', run: () => exporter.open3d() },
        ],
      },
    ],
    center: historyUi.centerEl,
    settings: [{ title: 'Langue', node: langSel }],
  };
}
