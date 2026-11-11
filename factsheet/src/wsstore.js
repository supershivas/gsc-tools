/* Stockage de l'espace de travail du Factsheet creator (onglets, brouillons, fichiers récents) dans IndexedDB.
   Le localStorage plafonne à ~5 Mo : des images en data URL le remplissent vite ; IndexedDB n'a pas cette limite.

   Base `factsheet-creator` (version 1) :
   - `tabs`    (clé `id`)     : { id, schemaVersion, doc, dirty, sel, view: { zoom, spacing }, collapsed: [], savedAt }
   - `meta`    (clé externe)  : 'workspace' → { schemaVersion, order: [id], active, legacySig }
   - `recents` (clé `fileId`) : { fileId, name, at, doc } — copies locales des 10 derniers fichiers ouverts ou enregistrés.

   La clé `factsheet-creator-v1` du localStorage reste le miroir du document de l'onglet actif (Atelier, ancienne version de l'app,
   repli sans IndexedDB). `legacySig` est l'empreinte du dernier miroir écrit : si la clé a changé hors de l'éditeur,
   l'onglet actif l'adopte au lancement. Toute lecture d'un document passe par `migrate` (appelant). */

export const DB_NAME = 'factsheet-creator';
export const LEGACY_KEY = 'factsheet-creator-v1';
export const WS_SCHEMA = 1;
export const MAX_RECENTS = 10;
const DB_VERSION = 1;

/** Empreinte rapide d'une chaîne (longueur + FNV-1a 32 bits) : sert à savoir si le miroir a changé hors de l'éditeur */
export function sig(s) {
  if (typeof s !== 'string') return null;
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return s.length.toString(36) + '.' + (h >>> 0).toString(36);
}

const req = (r) =>
  new Promise((res, rej) => {
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
const done = (tx) =>
  new Promise((res, rej) => {
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
    tx.onabort = () => rej(tx.error || new Error('abort'));
  });

let dbp = null;
/** Ouvre la base ; rejette si IndexedDB est indisponible (navigation privée ancienne, stockage bloqué) */
export function openDb() {
  if (dbp) return dbp;
  dbp = new Promise((res, rej) => {
    let r;
    try {
      r = indexedDB.open(DB_NAME, DB_VERSION);
    } catch (e) {
      rej(e);
      return;
    }
    r.onupgradeneeded = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains('tabs')) db.createObjectStore('tabs', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta');
      if (!db.objectStoreNames.contains('recents')) db.createObjectStore('recents', { keyPath: 'fileId' });
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
    r.onblocked = () => rej(new Error('blocked'));
  });
  dbp.catch(() => {
    dbp = null;
  });
  return dbp;
}

/** Tout l'espace de travail : { meta, tabs } (tabs dans l'ordre de `meta.order`, les orphelins à la fin) */
export async function readWorkspace() {
  const db = await openDb();
  const tx = db.transaction(['meta', 'tabs'], 'readonly');
  const [meta, tabs] = await Promise.all([req(tx.objectStore('meta').get('workspace')), req(tx.objectStore('tabs').getAll())]);
  const order = (meta && Array.isArray(meta.order) && meta.order) || [];
  tabs.sort((a, b) => {
    const i = order.indexOf(a.id),
      j = order.indexOf(b.id);
    return (i < 0 ? 1e9 : i) - (j < 0 ? 1e9 : j);
  });
  return { meta: meta || null, tabs };
}

/** Écrit des onglets, en retire d'autres et met à jour `meta`, en une transaction */
export async function writeWorkspace({ put = [], remove = [], meta }) {
  const db = await openDb();
  const tx = db.transaction(['meta', 'tabs'], 'readwrite');
  const ts = tx.objectStore('tabs');
  put.forEach((r) => ts.put(r));
  remove.forEach((id) => ts.delete(id));
  if (meta) tx.objectStore('meta').put(meta, 'workspace');
  await done(tx);
}

/* ---------- Fichiers récents (copies locales, hors export des réglages) ---------- */
export async function readRecents() {
  const db = await openDb();
  const all = await req(db.transaction('recents').objectStore('recents').getAll());
  return all.sort((a, b) => b.at - a.at);
}
/** Ajoute ou met à jour un fichier récent ; garde les `MAX_RECENTS` plus récents. Renvoie la liste à jour (sans les documents) */
export async function pushRecent(entry) {
  const db = await openDb();
  const tx = db.transaction('recents', 'readwrite'),
    st = tx.objectStore('recents');
  st.put(entry);
  const all = (await req(st.getAll())).sort((a, b) => b.at - a.at);
  all.slice(MAX_RECENTS).forEach((r) => st.delete(r.fileId));
  await done(tx);
  return all.slice(0, MAX_RECENTS);
}
export async function readRecent(fileId) {
  const db = await openDb();
  return req(db.transaction('recents').objectStore('recents').get(fileId));
}
export async function clearRecents() {
  const db = await openDb();
  const tx = db.transaction('recents', 'readwrite');
  tx.objectStore('recents').clear();
  await done(tx);
}

/* ---------- Miroir localStorage du document actif ---------- */
/** Écrit le miroir ; en cas d'échec (stockage plein) le retire pour qu'il ne reste jamais une copie périmée. Renvoie { ok, sig } */
export function writeMirror(doc) {
  try {
    const s = JSON.stringify(doc);
    localStorage.setItem(LEGACY_KEY, s);
    return { ok: true, sig: sig(s) };
  } catch (e) {
    try {
      localStorage.removeItem(LEGACY_KEY);
    } catch (e2) {}
    return { ok: false, sig: null };
  }
}
/** Texte brut du miroir (null s'il n'existe pas) */
export function readMirrorText() {
  try {
    return localStorage.getItem(LEGACY_KEY);
  } catch (e) {
    return null;
  }
}

/* ---------- Accès au document de l'onglet actif (Atelier) ---------- */
/** Document (brut, non migré) de l'onglet actif, ou du miroir si IndexedDB est indisponible ou vide */
export async function readActiveDoc() {
  try {
    const { meta, tabs } = await readWorkspace();
    const tab = tabs.find((x) => meta && x.id === meta.active) || tabs[0];
    /* le miroir a changé hors de l'éditeur : c'est lui que l'éditeur adoptera au prochain lancement */
    const mirror = readMirrorText();
    if (mirror && meta && sig(mirror) !== meta.legacySig) return JSON.parse(mirror);
    if (tab) return tab.doc;
  } catch (e) {}
  try {
    return JSON.parse(readMirrorText());
  } catch (e) {
    return null;
  }
}
/** Remplace le document de l'onglet actif (Atelier : images publiées) ; écrit aussi le miroir */
export async function writeActiveDoc(doc) {
  const m = writeMirror(doc);
  try {
    const { meta, tabs } = await readWorkspace();
    const tab = tabs.find((x) => meta && x.id === meta.active) || tabs[0];
    if (!tab) return;
    tab.doc = doc;
    tab.dirty = true;
    tab.savedAt = Date.now();
    await writeWorkspace({ put: [tab], meta: { ...meta, legacySig: m.sig } });
  } catch (e) {
    if (!m.ok) throw e;
  }
}
/** Ouvre un document dans un nouvel onglet actif (Atelier : « Ouvrir dans l'éditeur ») ; repli : remplace le miroir */
export async function openInNewTab(doc, id) {
  try {
    const { meta, tabs } = await readWorkspace();
    if (!meta) throw new Error('vide'); // pas encore d'espace de travail : le miroir sera migré en premier onglet
    const rec = {
      id,
      schemaVersion: WS_SCHEMA,
      doc,
      dirty: false,
      sel: null,
      view: { zoom: 'fit', spacing: false },
      collapsed: [],
      savedAt: Date.now(),
    };
    const m = writeMirror(doc);
    await writeWorkspace({ put: [rec], meta: { ...meta, order: [...tabs.map((x) => x.id), id], active: id, legacySig: m.sig } });
  } catch (e) {
    const m = writeMirror(doc);
    if (!m.ok) throw e;
  }
}
