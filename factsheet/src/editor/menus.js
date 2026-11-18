import { DENSITIES, TEXT_SCALES, TEXT_SCALE_MIN, TEXT_SCALE_MAX, LEADS, LEAD_STEP, textSetOf, textSetIsDefault } from '../tokens.js';
import { h } from '../render.js';
import { openPalette } from '../palette.js';
import { openMedia } from '../media.js';
import { LOCALES } from '../state.js';
import { initI18n, getLang, LANGS, t } from '../i18n.js';
import { promptBox, alertBox } from '../dialogs.js';
import { openTextStyles } from './textstyles-ui.js';
import { MAC, MOD, TAB_KEYS } from './keys.js';

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

/* Menu Texte : réglages du texte de tout le document (`doc.textSet`, voir tokens.js) pour gagner de la place sans changer le dessin.
   Taille de tous les styles (échelle), crans d'interlignage de 1,5 px, césure automatique, retour au gabarit. */
const pct = (f) => String(Math.round(f * 1000) / 10).replace('.', getLang() === 'fr' ? ',' : '.') + ' %';
function textItems(ctx) {
  const cur = () => textSetOf(ctx.getDoc().textSet);
  const set = (patch) => {
    const doc = ctx.getDoc();
    doc.textSet = { ...textSetOf(doc.textSet), ...patch };
    ctx.restructure();
  };
  const other = async () => {
    const v = await promptBox(t('Taille de tous les textes, en % (50 à 150) :'), String(Math.round(cur().scale * 1000) / 10));
    if (v == null) return;
    const n = parseFloat(String(v).replace(',', '.').replace('%', ''));
    if (!(n >= TEXT_SCALE_MIN * 100 && n <= TEXT_SCALE_MAX * 100)) return alertBox(t('Indiquez un nombre entre 50 et 150.'));
    set({ scale: Math.round(n * 10) / 1000 });
  };
  const leadLabel = { 0: 'Normal', [-1]: 'Serré', [-2]: 'Très serré' };
  return [
    { label: 'Styles de paragraphe…', icon: 'typography', run: () => openTextStyles(ctx) },
    '-',
    { heading: 'Taille des textes' },
    ...TEXT_SCALES.map((f) => ({ label: pct(f), checked: () => cur().scale === f, run: () => set({ scale: f }) })),
    {
      label: 'Autre taille…',
      checked: () => !TEXT_SCALES.includes(cur().scale),
      hint: TEXT_SCALES.includes(cur().scale) ? '' : pct(cur().scale),
      run: other,
    },
    { heading: 'Interlignage' },
    ...LEADS.map((n) => ({
      label: leadLabel[n],
      hint: n ? `−${String(-n * LEAD_STEP).replace('.', getLang() === 'fr' ? ',' : '.')} px` : '',
      checked: () => cur().lead === n,
      run: () => set({ lead: n }),
    })),
    '-',
    { label: 'Césure automatique partout', checked: () => cur().hyph, run: () => set({ hyph: !cur().hyph }) },
    '-',
    {
      label: 'Réinitialiser le texte',
      icon: 'restore',
      run: () => set({ scale: 1, lead: 0, hyph: false, styles: {} }),
      disabled: () => textSetIsDefault(ctx.getDoc().textSet),
    },
  ];
}

/* Fichier / Édition / Affichage : menus de l'en-tête (rendus par js/shell.js, lus dans `window.FS_UI` par factsheet/index.html) ;
   la langue est dans les réglages. Chaque entrée appelle les modules de l'éditeur reçus en paramètres. */
export function declareMenus({ ctx, history, historyUi, preview, spacing, hand, project, exporter, langSel, ws }) {
  /* Fichiers récents : copies locales (IndexedDB) des 10 derniers fichiers ouverts ou enregistrés, propres à ce navigateur */
  const when = (at) =>
    new Date(at).toLocaleString(getLang() === 'fr' ? 'fr-FR' : 'en-GB', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  const recentItems = () => {
    if (!ws.recentsOk()) return [{ label: 'Fichiers récents indisponibles dans ce navigateur', icon: 'clock-off', disabled: () => true }];
    const list = ws.recents();
    if (!list.length) return [{ label: 'Aucun fichier récent', icon: 'clock', disabled: () => true }];
    return [
      ...list.map((r) => ({
        label: r.name || 'Sans titre',
        icon: 'file-time',
        hint: when(r.at),
        run: () => ws.openRecent(r.fileId),
      })),
      { label: 'Vider la liste', icon: 'trash', run: () => ws.clearRecents() },
    ];
  };
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
        /* liste recalculée à chaque ouverture du menu (fichiers récents) */
        items: () => [
          { label: 'Nouvelle factsheet vierge', icon: 'file-plus', hint: TAB_KEYS.add, run: project.newBlank },
          { label: 'Ouvrir…', icon: 'folder-open', run: project.open },
          { heading: 'Ouvrir récent (copie locale)' },
          ...recentItems(),
          '-',
          { label: 'Enregistrer (.json)', icon: 'device-floppy', run: project.save },
          { label: 'Exporter PDF…', icon: 'file-type-pdf', hint: MOD + 'P', run: () => exporter.openExport() },
          '-',
          { label: 'Fermer l’onglet', icon: 'x', hint: TAB_KEYS.close, run: () => ws.close() },
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
          /* copier-coller de structure (editor/clip.js) : section, sous-section ou colonne sélectionnée, vers n'importe quel onglet */
          {
            label: 'Copier l’élément sélectionné',
            icon: 'clipboard-copy',
            hint: MOD + 'C',
            run: () => ctx.clip.copy(),
            disabled: () => !ctx.clip.canCopy(),
          },
          { label: 'Coller l’élément', icon: 'clipboard-plus', hint: MOD + 'V', run: () => ctx.clip.paste() },
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
      { label: 'Texte', items: () => textItems(ctx) },
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
    /* export des réglages (js/shell.js) : les documents des onglets sont dans IndexedDB, pas dans le localStorage */
    exportData: async () => ({ 'factsheet-creator-workspace': ws.exportData() }),
  };
}
