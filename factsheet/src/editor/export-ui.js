import { h } from '../render.js';
import { EXPORT_MODES, PDF_PROFILES, preparePrint, cleanupPrint } from '../export.js';
import { t } from '../i18n.js';
import { rasterizeDocument } from '../raster.js';

/* Export : nom des fichiers, fenêtre d'export PDF (RVB par impression, CMJN par pdfexport.js) et aperçu 3D
   (les pages sont dessinées ici, la scène three.js est dans viewer3d.js, chargé à la première ouverture).
   Renvoie `fileStem`, `loadBundle`, `openExport`, `open3d`. */
export function createExport(ctx) {
  /** Nom de fichier à l'enregistrement et à l'export : titre_AAMMJJ (l'extension est ajoutée par l'appelant) */
  const stamp = () => { const d = new Date(); return String(d.getFullYear()).slice(2) + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0'); };
  const fileStem = (suffix = '') => (ctx.getDoc().name || 'factsheet').replace(/[\\/:*?"<>|]+/g, '_') + suffix + '_' + stamp();

  /* le bundle est chargé avec la version en paramètre : après une mise à jour, jamais l'ancienne copie du cache du navigateur (GitHub Pages : 10 min) */
  const loadBundle = async file => {
    let v = Date.now(); try { v = (await (await fetch('../version.json', { cache: 'no-store' })).json()).version || v; } catch (e) { /* hors ligne : on garde l'horodatage */ }
    return new Promise((res, rej) => document.head.append(h('script', { src: `${file}?v=${v}`, onload: res, onerror: () => rej(new Error(file)) })));
  };

  /* Aperçu 3D */
  let viewerLoad = null;
  const loadViewer = () => window.FS3D ? Promise.resolve(window.FS3D) : (viewerLoad = viewerLoad || loadBundle('viewer3d.js').then(() => window.FS3D, e => { viewerLoad = null; throw e; }));
  async function open3d() {
    ctx.hover.hide();
    let viewer;
    try { viewer = await loadViewer(); } catch (e) { alert(t('Impossible de générer l’aperçu 3D dans ce navigateur.')); return; }
    viewer.open({
      labels: { title: t('Aperçu 3D du document'), loading: t('Préparation de l’aperçu…'), flip: t('Retourner'), spread: t('Deux pages'), single: t('Une feuille'),
        reset: t('Recentrer'), close: t('Fermer'), copy: t('Copier l’erreur'), hint: t('Glisser : tourner la feuille · clic droit ou Maj : la déplacer · molette : zoomer'),
        error: t('Impossible de générer l’aperçu 3D dans ce navigateur.'), noWebgl: t('WebGL indisponible.'), png: t('Exporter en PNG'), pngT: t('PNG transparent'), filename: suffix => fileStem(suffix) },
      load: () => rasterizeDocument(ctx.getDoc(), 2),
    });
  }

  /* Export PDF */
  const dlg = document.getElementById('exportDlg');
  let exportMode = 'net';
  /* profil du PDF CMJN (PDF/X-4, PDF/X-1a, sans norme) : préférence locale de ce navigateur */
  const PROFILE_KEY = 'factsheet-creator-pdf-profile';
  let exportProfile = 'x4';
  try { const v = localStorage.getItem(PROFILE_KEY); if (PDF_PROFILES[v]) exportProfile = v; } catch (e) { /* stockage indisponible : PDF/X-4 */ }
  function openExport() {
    const radios = (id, name, list, cur, set) => {
      const box = document.getElementById(id); box.innerHTML = '';
      for (const [k, o] of Object.entries(list)) {
        const r = h('input', { type: 'radio', name, value: k, checked: k === cur, onchange: () => set(k) });
        box.append(h('label', { class: 'opt' }, r, ' ' + t(o.label), h('small', { textContent: t(o.note) })));
      }
    };
    radios('exportOpts', 'xmode', EXPORT_MODES, exportMode, k => { exportMode = k; });
    radios('exportProfile', 'xprofile', PDF_PROFILES, exportProfile, k => { exportProfile = k; try { localStorage.setItem(PROFILE_KEY, k); } catch (e) { /* préférence non gardée */ } });
    dlg.showModal();
  }
  document.getElementById('exportCancel').addEventListener('click', () => dlg.close());
  /* PDF CMJN : bundle pdfexport.js (pdf-lib) chargé à la demande ; l'app écrit elle-même le PDF */
  document.getElementById('exportCmyk').addEventListener('click', async e => {
    const btn = e.currentTarget, label = btn.textContent; btn.disabled = true; btn.textContent = t('Génération du PDF…');
    try {
      if (!window.FSPDF) await loadBundle('pdfexport.js');
      const { bytes, missing } = await window.FSPDF.build(ctx.getDoc(), exportMode, { profile: exportProfile });
      /* caractères absents des polices (symboles rares, alphabets non latins hors grec et cyrillique) : ils ne seraient pas imprimés */
      if (missing.length && !confirm(t('Ces caractères n’existent pas dans les polices du document et n’apparaîtront pas dans le PDF :') + '\n\n' + missing.join('  ') + '\n\n' + t('Télécharger quand même ?'))) return;
      const name = fileStem((exportMode === 'net' ? '' : '-' + exportMode) + PDF_PROFILES[exportProfile].suffix) + '.pdf';
      const a = h('a', { href: URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' })), download: name }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      dlg.close();
    } catch (err) { console.error(err); alert(t('Impossible de générer le PDF CMJN.') + ' ' + (err && err.message || '')); }
    finally { btn.disabled = false; btn.textContent = label; }
  });
  document.getElementById('exportGo').addEventListener('click', async () => {
    dlg.close();
    const prev = document.title; document.title = fileStem(exportMode === 'net' ? '' : '-' + exportMode);
    await preparePrint(ctx.getDoc(), exportMode);
    const done = () => { cleanupPrint(); document.title = prev; window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    window.print();
  });

  return { fileStem, loadBundle, openExport, open3d };
}
