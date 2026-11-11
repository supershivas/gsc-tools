import { migrate, blankDoc, defaultDoc, storage, uid } from '../state.js';
import { t } from '../i18n.js';
import { confirmBox, alertBox } from '../dialogs.js';
import * as store from '../wsstore.js';
import { newHistState } from './history.js';

/* ---------- Espace de travail : plusieurs documents ouverts, un par onglet ----------
   Un onglet = { id, doc, sel, collapsed, hist, view: { zoom, spacing, sx, sy }, cleanSnap, dirtyInit }.
   - `doc` : le document (toujours passé par `migrate` à la lecture) ; `sel` : chemin sélectionné ; `collapsed` : cartes repliées
     de la structure ; `hist` : historique propre à l'onglet (editor/history.js) ; `view` : zoom, filigrane « Marges et espaces »
     et défilement de l'aperçu.
   - « Modifié depuis le dernier export (.json) » : l'instantané courant de l'historique diffère de `cleanSnap`, celui du dernier
     export ou de l'ouverture (annuler jusqu'à l'état exporté efface donc l'indicateur). `dirtyInit` : état relu au lancement.
   Les modules de l'éditeur ne gardent aucune référence au document : ils lisent `ctx.getDoc()` / `ctx.tab()` à chaque appel.
   Brouillons : chaque modification écrit le document dans IndexedDB (src/wsstore.js, anti-rebond `SAVE_DELAY`) et le miroir
   `factsheet-creator-v1` (document actif). Sans IndexedDB : onglets en mémoire, seul le document actif est gardé (miroir). */

const SAVE_DELAY = 300;

const viewOf = (v) => ({
  zoom: (v && typeof v.zoom === 'string' && v.zoom) || 'fit',
  spacing: !!(v && v.spacing),
  sx: 0,
  sy: 0,
  restoreScroll: false,
});
const parseDoc = (text) => {
  try {
    const j = JSON.parse(text);
    if (j && Array.isArray(j.sections) && j.header) return j;
  } catch (e) {}
  return null;
};

/** Lit l'espace de travail enregistré (ou le crée depuis l'ancienne clé `factsheet-creator-v1`). Ne lève jamais d'erreur. */
export async function loadWorkspace() {
  const mirrorText = store.readMirrorText();
  try {
    const { meta, tabs } = await store.readWorkspace();
    if (meta && tabs.length) {
      const active = tabs.find((x) => x.id === meta.active) || tabs[0];
      /* le miroir a changé hors de l'éditeur (Atelier, ancienne version de l'app, session sans IndexedDB) : l'onglet actif l'adopte */
      if (mirrorText && store.sig(mirrorText) !== meta.legacySig && JSON.stringify(active.doc) !== mirrorText) {
        const m = parseDoc(mirrorText);
        if (m) {
          active.doc = m;
          active.dirty = true;
          return { persistent: true, records: tabs, active: active.id, views: meta.views || {}, write: [active.id] };
        }
      }
      return { persistent: true, records: tabs, active: active.id, views: meta.views || {}, write: [] };
    }
    /* première ouverture avec les onglets : l'ancien document devient le premier onglet (la clé reste en place) */
    const id = uid('t');
    return {
      persistent: true,
      records: [{ id, doc: parseDoc(mirrorText) || defaultDoc(), dirty: false }],
      active: id,
      views: {},
      write: [id],
    };
  } catch (e) {
    /* IndexedDB indisponible : comportement d'avant (un document, dans le localStorage) */
    const id = uid('t');
    return {
      persistent: false,
      records: [{ id, doc: parseDoc(mirrorText) || defaultDoc(), dirty: false }],
      active: id,
      views: {},
      write: [],
    };
  }
}

/** `init` : résultat de `loadWorkspace`. `onSwitch()` redessine l'éditeur pour l'onglet actif ; `onStatus()` met à jour la barre d'onglets. */
export function createWorkspace(ctx, init, { onSwitch, onStatus }) {
  const tabs = [];
  let activeId = null,
    legacySig = null,
    timer = 0,
    lastError = false,
    recents = [],
    recentsOk = init.persistent;
  const pending = new Set(); // onglets dont le document est à réécrire

  const makeTab = (id, doc, { dirty = false, view, sel = null, collapsed = [] } = {}) => {
    if (!doc.fileId) doc.fileId = uid('f');
    return {
      id,
      doc,
      sel,
      collapsed: new Set(collapsed),
      hist: newHistState(),
      view: viewOf(view),
      cleanSnap: undefined,
      dirtyInit: dirty,
    };
  };
  for (const r of init.records) {
    let doc;
    try {
      doc = migrate(r.doc);
    } catch (e) {
      continue; // onglet illisible : ignoré (son enregistrement reste dans la base)
    }
    const v = init.views[r.id] || {};
    tabs.push(makeTab(r.id, doc, { dirty: !!r.dirty, view: v, sel: v.sel || null, collapsed: v.collapsed || [] }));
  }
  if (!tabs.length) tabs.push(makeTab(uid('t'), defaultDoc()));
  activeId = (tabs.find((x) => x.id === init.active) || tabs[0]).id;

  const get = (id) => tabs.find((x) => x.id === id) || null;
  const active = () => get(activeId);
  const nameOf = (tab) => String((tab && tab.doc.name) || '').trim() || t('Sans titre');

  function isDirty(tab) {
    if (tab.cleanSnap === undefined) {
      if (!tab.hist.stack.length) return tab.dirtyInit;
      tab.cleanSnap = tab.dirtyInit ? null : tab.hist.stack[0];
    }
    return tab.hist.stack[tab.hist.i] !== tab.cleanSnap;
  }

  /* ----- enregistrement ----- */
  const metaRecord = () => ({
    schemaVersion: store.WS_SCHEMA,
    order: tabs.map((x) => x.id),
    active: activeId,
    legacySig,
    views: Object.fromEntries(
      tabs.map((x) => [x.id, { sel: x.sel, zoom: x.view.zoom, spacing: x.view.spacing, collapsed: [...x.collapsed] }]),
    ),
  });
  const tabRecord = (tab) => ({
    id: tab.id,
    schemaVersion: store.WS_SCHEMA,
    doc: tab.doc,
    dirty: isDirty(tab),
    savedAt: Date.now(),
  });
  function setOk(ok) {
    const was = storage.ok;
    storage.ok = ok;
    lastError = !ok;
    if (was !== ok) ctx.schedule(); // l'avertissement « stockage plein » est dans l'aperçu
    onStatus();
  }
  async function flush(removed = []) {
    clearTimeout(timer);
    timer = 0;
    if (!init.persistent) return;
    const put = [...pending].map(get).filter(Boolean).map(tabRecord);
    pending.clear();
    try {
      await store.writeWorkspace({ put, remove: removed, meta: metaRecord() });
      setOk(true);
    } catch (e) {
      put.forEach((r) => pending.add(r.id)); // on réessaiera à la prochaine modification
      setOk(false);
    }
  }
  const later = () => {
    clearTimeout(timer);
    timer = setTimeout(flush, SAVE_DELAY);
  };
  /* miroir du document actif : écrit tout de suite (comme avant les onglets) */
  function mirror() {
    const m = store.writeMirror(active().doc);
    legacySig = m.sig;
    if (!init.persistent) setOk(m.ok);
  }

  function switchTo(id) {
    const tab = get(id);
    if (!tab || id === activeId) return false;
    const cur = active();
    if (cur) {
      cur.view.sx = ctx.stage.scrollLeft;
      cur.view.sy = ctx.stage.scrollTop;
    }
    ctx.preview(null);
    activeId = id;
    tab.view.restoreScroll = true;
    mirror();
    later();
    onSwitch();
    return true;
  }

  const ws = {
    persistent: init.persistent,
    tabs,
    get,
    active,
    nameOf,
    isDirty,
    flush,
    /** l'onglet actif a changé de document : miroir + brouillon (anti-rebond) */
    touch(tab = active()) {
      if (tab === active()) mirror();
      pending.add(tab.id);
      later();
      onStatus();
    },
    /** zoom, sélection, filigrane, cartes repliées : enregistrés avec la liste des onglets (sans réécrire les documents) */
    viewChanged: later,
    /** un pas d'historique vient d'être enregistré ou rejoué */
    historyChanged() {
      const tab = active();
      if (tab.cleanSnap === undefined && tab.hist.stack.length === 1) tab.cleanSnap = tab.dirtyInit ? null : tab.hist.stack[0];
      onStatus();
    },
    /** export .json de l'onglet actif : l'indicateur « modifié » repart de zéro, la copie locale des fichiers récents est mise à jour */
    markExported() {
      const tab = active();
      tab.cleanSnap = tab.hist.stack[tab.hist.i] ?? null;
      tab.dirtyInit = false;
      pending.add(tab.id);
      flush();
      ws.remember(tab.doc);
    },
    /** une modification est-elle en cours (geste, fenêtre, éditeur de dataviz) ? On ne change pas d'onglet à ce moment-là */
    busy: () =>
      !!document.querySelector('dialog[open], .ve, .v3d, .ce') || document.body.classList.contains('dragging') || ctx.previewing(),
    activate(id) {
      if (ws.busy()) return false;
      return switchTo(id);
    },
    /** nouvel onglet (document neuf ou ouvert) ; `clean` : pas « modifié » au départ */
    add(doc, { clean = true } = {}) {
      if (ws.busy()) return null;
      const tab = makeTab(uid('t'), doc, { dirty: !clean });
      const i = tabs.indexOf(active());
      tabs.splice(i + 1, 0, tab);
      pending.add(tab.id);
      switchTo(tab.id);
      return tab;
    },
    newBlank: () => ws.add(blankDoc()),
    /** ferme un onglet (confirmation s'il est modifié depuis le dernier export) ; le dernier onglet fermé laisse place à une factsheet vierge */
    async close(id = activeId) {
      const tab = get(id);
      if (!tab || ws.busy()) return false;
      if (
        isDirty(tab) &&
        !(await confirmBox(
          `« ${nameOf(tab)} » — ${t('Ce document a été modifié depuis le dernier export (.json). Fermer l’onglet quand même ? Son brouillon sera supprimé.')}`,
          { ok: t('Fermer l’onglet'), danger: true },
        ))
      )
        return false;
      const i = tabs.indexOf(tab);
      if (i < 0) return false;
      if (tabs.length === 1) {
        const fresh = makeTab(uid('t'), blankDoc());
        tabs.push(fresh);
        pending.add(fresh.id);
      }
      const wasActive = id === activeId;
      tabs.splice(i, 1);
      pending.delete(id);
      if (wasActive) {
        activeId = null;
        switchTo((tabs[i] || tabs[i - 1]).id);
      }
      await flush([id]);
      onStatus();
      return true;
    },
    /** ouvre un document lu dans un fichier ou une copie locale ; un fichier déjà ouvert bascule sur son onglet */
    async openDoc(json) {
      if (ws.busy()) return;
      const doc = migrate(json);
      const same = tabs.find((x) => x.doc.fileId === doc.fileId);
      if (same) {
        const differs = JSON.stringify(same.doc) !== JSON.stringify(doc);
        switchTo(same.id);
        if (!differs) {
          ctx.note('Ce fichier est déjà ouvert : son onglet est affiché.');
          ws.remember(doc);
          return;
        }
        if (
          !(await confirmBox(
            t('Ce fichier est déjà ouvert dans un onglet, avec un contenu différent. Ouvrir aussi cette version dans un nouvel onglet ?'),
            { ok: t('Ouvrir une copie') },
          ))
        )
          return;
        doc.fileId = uid('f');
      }
      ws.add(doc);
      ws.remember(doc);
    },

    /* ----- fichiers récents : copies locales (IndexedDB), hors export des réglages ----- */
    recents: () => recents,
    recentsOk: () => recentsOk,
    async loadRecents() {
      if (!init.persistent) return;
      try {
        recents = (await store.readRecents()).map(({ fileId, name, at }) => ({ fileId, name, at }));
      } catch (e) {
        recentsOk = false;
      }
    },
    async remember(doc) {
      if (!recentsOk) return;
      try {
        const list = await store.pushRecent({ fileId: doc.fileId, name: String(doc.name || '').trim(), at: Date.now(), doc });
        recents = list.map(({ fileId, name, at }) => ({ fileId, name, at }));
      } catch (e) {
        /* stockage plein : la liste reste celle d'avant */
      }
    },
    async openRecent(fileId) {
      let r = null;
      try {
        r = await store.readRecent(fileId);
      } catch (e) {}
      if (!r || !r.doc) {
        alertBox(t('Cette copie locale n’existe plus.'));
        return;
      }
      await ws.openDoc(r.doc);
    },
    async clearRecents() {
      try {
        await store.clearRecents();
        recents = [];
      } catch (e) {}
    },

    /** état affiché dans la barre d'onglets */
    status() {
      if (!init.persistent) return { kind: storage.ok ? 'local' : 'error', dirty: isDirty(active()) };
      return { kind: lastError ? 'error' : 'saved', dirty: isDirty(active()) };
    },

    /** export des réglages (js/shell.js) : tous les onglets, documents compris */
    exportData() {
      return {
        schemaVersion: store.WS_SCHEMA,
        active: activeId,
        tabs: tabs.map((x) => ({ id: x.id, name: x.doc.name || '', dirty: isDirty(x), doc: x.doc })),
      };
    },
  };

  /* fermer la page : on n'attend pas l'anti-rebond */
  const now = () => {
    if (timer || pending.size) flush();
  };
  window.addEventListener('pagehide', now);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') now();
  });
  /* lancement : documents migrés ou adoptés écrits tout de suite ; le miroir (document actif migré) et la liste des onglets aussi */
  (init.write || []).forEach((id) => get(id) && pending.add(id));
  mirror();
  flush();
  return ws;
}
