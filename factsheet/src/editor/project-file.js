import { migrate, blankDoc } from '../state.js';
import { h } from '../render.js';
import { t } from '../i18n.js';

/* Menu Fichier : nouvelle factsheet vierge, enregistrer et ouvrir un projet (.json). `fileStem` : nom des fichiers (export-ui.js). */
export function createProjectFile(ctx, fileStem) {
  const newBlank = () => {
    if (!confirm(t('Créer une factsheet vierge ? Le document actuel sera remplacé : enregistrez-le d’abord (.json) si besoin.'))) return;
    ctx.setDoc(blankDoc(), true); ctx.restructure();
  };
  const file = h('input', { type: 'file', accept: '.json,application/json', hidden: true });
  document.body.append(file);
  const save = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(ctx.getDoc(), null, 2)], { type: 'application/json' }));
    const a = h('a', { href: url, download: fileStem() + '.json' });
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
  };
  file.addEventListener('change', async () => {
    const f = file.files[0]; file.value = ''; if (!f) return;
    try { const j = JSON.parse(await f.text()); if (!Array.isArray(j.sections)) throw 0; ctx.setDoc(migrate(j), true); ctx.restructure(); }
    catch (e) { alert(t('Fichier de projet invalide.')); }
  });
  return { newBlank, save, open: () => file.click() };
}
