import { blankDoc } from '../state.js';
import { h } from '../render.js';
import { t } from '../i18n.js';
import { alertBox } from '../dialogs.js';

/* Menu Fichier : nouvelle factsheet vierge (nouvel onglet), enregistrer et ouvrir un projet (.json), fichiers récents.
   `fileStem` : nom des fichiers (export-ui.js) ; `ws` : espace de travail (workspace.js).
   Firefox n'a pas l'API File System Access : enregistrer = télécharger, ouvrir = <input type="file">. */
export function createProjectFile(ctx, fileStem) {
  const ws = () => ctx.workspace;
  const newBlank = () => ws().add(blankDoc());
  const file = h('input', { type: 'file', accept: '.json,application/json', hidden: true });
  document.body.append(file);
  /* téléchargement du .json : l'indicateur « modifié » repart de zéro et la copie locale des fichiers récents est mise à jour */
  const save = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(ctx.getDoc(), null, 2)], { type: 'application/json' }));
    const a = h('a', { href: url, download: fileStem() + '.json' });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    ws().markExported();
  };
  file.addEventListener('change', async () => {
    const f = file.files[0];
    file.value = '';
    if (!f) return;
    let j;
    try {
      j = JSON.parse(await f.text());
      if (!Array.isArray(j.sections)) throw 0;
    } catch (e) {
      alertBox(t('Fichier de projet invalide.'));
      return;
    }
    try {
      await ws().openDoc(j);
    } catch (e) {
      alertBox(t('Fichier de projet invalide.'));
    }
  });
  return { newBlank, save, open: () => file.click() };
}
