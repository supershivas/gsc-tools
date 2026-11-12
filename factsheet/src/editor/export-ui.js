import { h } from '../render.js';
import { EXPORT_MODES, PDF_PROFILES } from '../export.js';
import { t } from '../i18n.js';
import { rasterizeDocument, rasterizeElement, elementSvg } from '../raster.js';
import { pngDpi, jpgDpi, download, toBlob } from '../vizexport.js';
import { alertBox, confirmBox } from '../dialogs.js';

/* Export : nom des fichiers, fenêtre d'export PDF (CMJN ou RVB, tous écrits par pdfexport.js) et aperçu 3D
   (les pages sont dessinées ici, la scène three.js est dans viewer3d.js, chargé à la première ouverture).
   Renvoie `fileStem`, `loadBundle`, `openExport`, `open3d`. */
export function createExport(ctx) {
  /** Nom de fichier à l'enregistrement et à l'export : titre_AAMMJJ_HHMM (heure locale ; l'extension est ajoutée par l'appelant) */
  const stamp = () => {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return String(d.getFullYear()).slice(2) + p(d.getMonth() + 1) + p(d.getDate()) + '_' + p(d.getHours()) + p(d.getMinutes());
  };
  const fileStem = (suffix = '') => (ctx.getDoc().name || 'factsheet').replace(/[\\/:*?"<>|]+/g, '_') + suffix + '_' + stamp();

  /* le bundle est chargé avec la version en paramètre : après une mise à jour, jamais l'ancienne copie du cache du navigateur (GitHub Pages : 10 min) */
  const loadBundle = async (file) => {
    let v = Date.now();
    try {
      v = (await (await fetch('../version.json', { cache: 'no-store' })).json()).version || v;
    } catch (e) {
      /* hors ligne : on garde l'horodatage */
    }
    return new Promise((res, rej) =>
      document.head.append(h('script', { src: `${file}?v=${v}`, onload: res, onerror: () => rej(new Error(file)) })),
    );
  };

  /* Aperçu 3D */
  let viewerLoad = null;
  const loadViewer = () =>
    window.FS3D
      ? Promise.resolve(window.FS3D)
      : (viewerLoad =
          viewerLoad ||
          loadBundle('viewer3d.js').then(
            () => window.FS3D,
            (e) => {
              viewerLoad = null;
              throw e;
            },
          ));
  async function open3d() {
    ctx.hover.hide();
    let viewer;
    try {
      viewer = await loadViewer();
    } catch (e) {
      alertBox(t('Impossible de générer l’aperçu 3D dans ce navigateur.'));
      return;
    }
    viewer.open({
      labels: {
        title: t('Aperçu 3D du document'),
        loading: t('Préparation de l’aperçu…'),
        flip: t('Retourner'),
        spread: t('Deux pages'),
        single: t('Une feuille'),
        reset: t('Recentrer'),
        close: t('Fermer'),
        copy: t('Copier l’erreur'),
        hint: t('Glisser : tourner la feuille · clic droit ou Maj : la déplacer · molette : zoomer'),
        error: t('Impossible de générer l’aperçu 3D dans ce navigateur.'),
        noWebgl: t('WebGL indisponible.'),
        png: t('Exporter en PNG'),
        pngT: t('PNG transparent'),
        filename: (suffix) => fileStem(suffix),
      },
      load: () => rasterizeDocument(ctx.getDoc(), 2),
    });
  }

  /* Export PDF */
  const dlg = document.getElementById('exportDlg');
  let exportMode = 'net';
  /* profil du PDF (PDF/X-4, PDF/X-1a, CMJN sans norme, RVB) : préférence locale de ce navigateur */
  const PROFILE_KEY = 'factsheet-creator-pdf-profile';
  let exportProfile = 'x4';
  try {
    const v = localStorage.getItem(PROFILE_KEY);
    if (PDF_PROFILES[v]) exportProfile = v;
  } catch (e) {
    /* stockage indisponible : PDF/X-4 */
  }
  /* page qui dépasse : le PDF coupe ce qui sort de la feuille, on le dit avant d'exporter */
  const overflowText = () => {
    const ov = ctx.overflows || [];
    if (!ov.length) return '';
    return ov
      .map(
        (o) =>
          `${o.page === 'recto' ? t('Recto') : t('Verso')} : ${t('le contenu dépasse de')} ${o.over} px${o.hidden ? ' — ' + t('une partie sera coupée dans le PDF') : ''}`,
      )
      .join('\n');
  };
  function openExport() {
    let warn = document.getElementById('exportWarn');
    if (!warn) {
      warn = h('p', { id: 'exportWarn', role: 'alert' });
      dlg.querySelector('h3').after(warn);
    }
    warn.textContent = overflowText();
    warn.hidden = !warn.textContent;
    const radios = (id, name, list, cur, set) => {
      const box = document.getElementById(id);
      box.innerHTML = '';
      for (const [k, o] of Object.entries(list)) {
        const r = h('input', { type: 'radio', name, value: k, checked: k === cur, onchange: () => set(k) });
        box.append(h('label', { class: 'opt' }, r, ' ' + t(o.label), h('small', { textContent: t(o.note) })));
      }
    };
    radios('exportOpts', 'xmode', EXPORT_MODES, exportMode, (k) => {
      exportMode = k;
    });
    radios('exportProfile', 'xprofile', PDF_PROFILES, exportProfile, (k) => {
      exportProfile = k;
      try {
        localStorage.setItem(PROFILE_KEY, k);
      } catch (e) {
        /* préférence non gardée */
      }
    });
    dlg.showModal();
  }
  document.getElementById('exportCancel').addEventListener('click', () => dlg.close());
  /* PDF : bundle pdfexport.js (pdf-lib) chargé à la demande ; l'app écrit elle-même le PDF */
  document.getElementById('exportGo').addEventListener('click', async (e) => {
    const btn = e.currentTarget,
      label = btn.textContent;
    btn.disabled = true;
    btn.textContent = t('Génération du PDF…');
    try {
      const ovf = overflowText();
      if (ovf && !(await confirmBox(ovf + '\n\n' + t('Exporter quand même ?'), { ok: t('Exporter') }))) return;
      if (!window.FSPDF) await loadBundle('pdfexport.js');
      const { bytes, missing } = await window.FSPDF.build(ctx.getDoc(), exportMode, { profile: exportProfile });
      /* caractères absents des polices (symboles rares, alphabets non latins hors grec et cyrillique) : ils ne seraient pas imprimés */
      if (
        missing.length &&
        !(await confirmBox(
          t('Ces caractères n’existent pas dans les polices du document et n’apparaîtront pas dans le PDF :') +
            '\n\n' +
            missing.join('  ') +
            '\n\n' +
            t('Télécharger quand même ?'),
          { ok: t('Télécharger') },
        ))
      )
        return;
      const name = fileStem((exportMode === 'net' ? '' : '-' + exportMode) + PDF_PROFILES[exportProfile].suffix) + '.pdf';
      const a = h('a', { href: URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' })), download: name });
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      dlg.close();
    } catch (err) {
      console.error(err);
      alertBox(t('Impossible de générer le PDF.') + ' ' + ((err && err.message) || ''));
    } finally {
      btn.disabled = false;
      btn.textContent = label;
    }
  });

  /** Nom lisible de l'élément dans les fichiers : header, section-1, sous-section-1-2, colonne-1-2-3 */
  const elementSlug = (path) => {
    const [k, ...n] = path.split(':');
    return (
      ({ header: 'header', sec: 'section', sub: 'sous-section', col: 'colonne' }[k] || k) +
      (n.length ? '-' + n.map((x) => +x + 1).join('-') : '')
    );
  };
  /** Export d'un élément (header, section, sous-section, colonne) : opts = { format: png-t|png|jpg|svg|pdf, dpi, profile } */
  async function exportElement(path, opts) {
    const f = opts.format,
      base = '_' + elementSlug(path);
    if (f === 'pdf') {
      if (!window.FSPDF) await loadBundle('pdfexport.js');
      const profile = PDF_PROFILES[opts.profile] ? opts.profile : 'x4';
      const { bytes, missing } = await window.FSPDF.build(ctx.getDoc(), 'net', { profile, only: path, bleed: !!opts.bleed });
      if (
        missing.length &&
        !(await confirmBox(
          t('Ces caractères n’existent pas dans les polices du document et n’apparaîtront pas dans le PDF :') +
            '\n\n' +
            missing.join('  ') +
            '\n\n' +
            t('Télécharger quand même ?'),
          { ok: t('Télécharger') },
        ))
      )
        return false;
      download(
        new Blob([bytes], { type: 'application/pdf' }),
        fileStem(base + (opts.bleed ? '-bleed' : '') + PDF_PROFILES[profile].suffix) + '.pdf',
      );
      return true;
    }
    const doc = ctx.getDoc();
    if (f === 'svg') {
      const { svg } = await elementSvg(doc, path, { transparent: true, bleed: !!opts.bleed });
      download(
        new Blob(['<?xml version="1.0" encoding="UTF-8"?>\n' + svg], { type: 'image/svg+xml' }),
        fileStem(base + (opts.bleed ? '-bleed' : '')) + '.svg',
      );
      return true;
    }
    const dpi = opts.dpi || 300,
      jpg = f === 'jpg';
    const { canvas } = await rasterizeElement(doc, path, {
      scale: dpi / 96,
      fill: f === 'png-t' ? null : '#ffffff',
      transparent: f === 'png-t',
      bleed: !!opts.bleed,
    });
    const blob = await toBlob(canvas, jpg ? 'image/jpeg' : 'image/png', 0.95);
    const raw = new Uint8Array(await blob.arrayBuffer());
    download(
      new Blob([jpg ? jpgDpi(raw, dpi) : pngDpi(raw, dpi)], { type: blob.type }),
      fileStem(base + (opts.bleed ? '-bleed' : '') + (f === 'png-t' ? '-transparent' : '')) + (jpg ? '.jpg' : '.png'),
    );
    return true;
  }

  return { fileStem, loadBundle, openExport, open3d, exportElement };
}
