/* Stockage local, historique (annuler / rétablir) et fichiers JSON.
   Les images (data URL) vivent dans doc.assets et restent hors des instantanés de l’historique. */
import { APP_ID, SCHEMA_VERSION, migrate, defaultDoc } from 'org/model.js';

export const STORAGE_KEY = 'pec-organigramme-v1';
const MAX_HISTORY = 200;

/* Ne garde que les images encore utilisées (au moment d’enregistrer ou d’exporter). */
export function pruned(doc) {
  const used = new Set([doc.logo && doc.logo.asset, doc.image && doc.image.asset]);
  return { ...doc, assets: Object.fromEntries(Object.entries(doc.assets).filter(([k]) => used.has(k))) };
}

export function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { doc: migrate(JSON.parse(raw).doc), error: null };
  } catch (e) {
    // Stockage illisible ou indisponible : on repart du gabarit, sans écraser tant que rien n’est modifié.
    return { doc: defaultDoc(), error: e };
  }
  return { doc: defaultDoc(), error: null };
}

/* Rend false si le navigateur refuse (stockage plein, navigation privée). */
export function save(doc) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: SCHEMA_VERSION, savedAt: new Date().toISOString(), doc: pruned(doc) }));
    return true;
  } catch {
    return false;
  }
}

export const toFile = (doc) => ({ app: APP_ID, schemaVersion: SCHEMA_VERSION, exportedAt: new Date().toISOString(), doc: pruned(doc) });

/* Accepte un fichier de l’outil, ou l’export général des réglages de GSC tools qui le contient. */
export function fromFile(json) {
  if (json && json.app === APP_ID && json.doc) return migrate(json.doc);
  if (json && json.data && json.data[STORAGE_KEY] && json.data[STORAGE_KEY].doc) return migrate(json.data[STORAGE_KEY].doc);
  if (json && Array.isArray(json.levels)) return migrate(json);
  throw new Error('format');
}

const snap = (doc) => JSON.stringify({ ...doc, assets: undefined });

export function createHistory(doc) {
  let last = snap(doc);
  let lastKey = null;
  const undo = [];
  const redo = [];
  return {
    /* À appeler après chaque modification. `key` regroupe la frappe d’un même champ en une seule étape. */
    record(doc, key = null) {
      const now = snap(doc);
      if (now === last) return;
      if (!(key && key === lastKey && undo.length)) {
        undo.push(last);
        if (undo.length > MAX_HISTORY) undo.shift();
      }
      redo.length = 0;
      last = now;
      lastKey = key;
    },
    canUndo: () => undo.length > 0,
    canRedo: () => redo.length > 0,
    step(doc, back) {
      const from = back ? undo : redo;
      if (!from.length) return null;
      (back ? redo : undo).push(last);
      last = from.pop();
      lastKey = null;
      return { ...JSON.parse(last), assets: doc.assets };
    },
  };
}
