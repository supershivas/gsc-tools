/* Dataviz seule : l'éditeur de dataviz ouvert depuis le menu Fichier, sans colonne ni factsheet à remplir.
   Tous les types, réglages et l'export (PNG, JPG, SVG à la largeur voulue) ; couleurs, police et densité du document actif.
   La dernière dataviz seule est gardée dans le navigateur, enregistrée à chaque modification :
   `localStorage` clé `factsheet-creator-dataviz-v1` = { schemaVersion: 1, savedAt, width, viz } (comprise dans l'export des réglages). */
import { newViz, VIZ_TYPES } from './viz/index.js';
import { migrateViz } from './state.js';
import { openVizEditor } from './vizeditor.js';
import { colWidth, densityGaps } from './tokens.js';
import { stripMk } from './viz/util.js';
import { confirmBox } from './dialogs.js';
import { t } from './i18n.js';

export const SOLO_KEY = 'factsheet-creator-dataviz-v1';
const SCHEMA = 1;

/** Dataviz seule enregistrée, migrée ({ viz, width }), ou null */
export function readSolo() {
  try {
    const j = JSON.parse(localStorage.getItem(SOLO_KEY) || 'null');
    if (!j || typeof j !== 'object' || !j.viz || !VIZ_TYPES[j.viz.kind]) return null;
    const width = +j.width > 0 ? +j.width : null;
    return { viz: migrateViz(j.viz), width };
  } catch (e) {
    return null;
  }
}
function writeSolo(viz, width) {
  try {
    localStorage.setItem(SOLO_KEY, JSON.stringify({ schemaVersion: SCHEMA, savedAt: new Date().toISOString(), width, viz }));
  } catch (e) {
    /* stockage plein : la dataviz reste ouverte, l'export reste possible */
  }
}

const stamp = () => {
  const d = new Date(),
    p = (n) => String(n).padStart(2, '0');
  return String(d.getFullYear()).slice(2) + p(d.getMonth() + 1) + p(d.getDate()) + '_' + p(d.getHours()) + p(d.getMinutes());
};
/** Nom de fichier : titre de la dataviz (ou « dataviz ») + type + AAMMJJ_HHMM ; l'export passe `_dataviz-<type>` */
const soloStem =
  (viz) =>
  (suffix = '') => {
    const title = stripMk(String((viz.head && viz.head.title) || ''))
      .replace(/^#+\s*/, '')
      .replace(/[\\/:*?"<>|\n]+/g, '_')
      .trim()
      .slice(0, 60);
    return (title || 'dataviz') + String(suffix).replace(/^_dataviz/, '') + '_' + stamp();
  };

/** Ouvre la dataviz seule : `fresh` = nouvelle dataviz (à barres), sinon la dernière enregistrée */
export async function openSoloViz(ctx, { fresh = false } = {}) {
  if (document.querySelector('.ve')) return;
  const saved = readSolo();
  if (fresh && saved && !(await confirmBox(t('Remplacer la dernière dataviz seule par une nouvelle ?'), { ok: t('Nouvelle dataviz') })))
    return;
  const doc = ctx.getDoc(),
    gutter = densityGaps(doc.density).columns;
  const col = { type: 'viz', viz: !fresh && saved ? saved.viz : newViz('bars') };
  const width = (!fresh && saved && saved.width) || colWidth('1-1', 0, gutter);
  writeSolo(col.viz, width);
  openVizEditor({
    col,
    bg: 'none',
    width,
    ctx,
    fileStem: (x) => soloStem(col.viz)(x),
    solo: { save: (viz, w) => writeSolo(viz, w), onClose: () => ctx.workspace && ctx.workspace.empty() && ctx.home && ctx.home.show() }, // aucun document ouvert : retour à l'accueil
  });
}
