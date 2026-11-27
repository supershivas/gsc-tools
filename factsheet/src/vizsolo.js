/* Projets dataviz : des dataviz sans factsheet, ouvertes dans l'éditeur de dataviz (option `solo` d'`openVizEditor`).
   Un projet = { id, schemaVersion, name, at, active, palette, items: [{ id, name, width, viz }] } : plusieurs dataviz nommées, chacune
   avec sa largeur. `palette` = { theme, colors, colorNames, cmyk } : les couleurs du projet, enregistrées avec lui (copiées du document
   actif à la création, ou à la première ouverture d'un projet d'avant) ; « Couleurs du document » de l'éditeur les modifie, jamais la
   factsheet ouverte. Police, densité et réglages du texte : ceux du document actif.
   Enregistrement : chaque modification écrit le projet dans IndexedDB (magasin `vizprojects` de `factsheet-creator`, wsstore.js),
   anti-rebond `SAVE_DELAY`, et tout de suite quand la page se ferme. Sans IndexedDB : `localStorage` `factsheet-creator-dataviz-projects-v1`.
   Les projets sont dans l'export des réglages (`vizProjectsExport`, menus.js).
   Ancienne dataviz seule (`localStorage` `factsheet-creator-dataviz-v1` = { schemaVersion, savedAt, width, viz }) : devenue le premier
   projet au premier passage (drapeau `factsheet-creator-dataviz-migrated`), la clé reste en place. */
import { newViz, VIZ_TYPES } from './viz/index.js';
import { migrateViz, uid } from './state.js';
import { openVizEditor } from './vizeditor.js';
import { colWidth, densityGaps } from './tokens.js';
import { stripMk } from './viz/util.js';
import { confirmBox } from './dialogs.js';
import { h, ico } from './render.js';
import * as store from './wsstore.js';
import { t } from './i18n.js';

export const SOLO_KEY = 'factsheet-creator-dataviz-v1';
const MIGRATED_KEY = 'factsheet-creator-dataviz-migrated';
const LS_KEY = 'factsheet-creator-dataviz-projects-v1';
const SCHEMA = 1;
const SAVE_DELAY = 300;

/* ---------- Lecture et migration ---------- */
function migrateItem(it, i) {
  if (!it || typeof it !== 'object' || !it.viz || !VIZ_TYPES[it.viz.kind]) return null;
  return {
    id: typeof it.id === 'string' && it.id ? it.id : uid('v'),
    name: String(it.name || '').trim() || `Dataviz ${i + 1}`,
    width: +it.width > 0 ? +it.width : null,
    viz: migrateViz(it.viz),
  };
}
/** Projet lu (base, fichier d'export), migré ; null s'il est illisible */
export function migrateProject(p) {
  if (!p || typeof p !== 'object' || !Array.isArray(p.items)) return null;
  const items = p.items.map(migrateItem).filter(Boolean);
  if (!items.length) return null;
  return {
    id: typeof p.id === 'string' && p.id ? p.id : uid('p'),
    schemaVersion: SCHEMA,
    name: String(p.name || '').trim() || newProjectName(),
    at: +p.at || Date.now(),
    active: items.some((x) => x.id === p.active) ? p.active : items[0].id,
    palette: p.palette && typeof p.palette === 'object' ? palOf(p.palette) : null,
    items,
  };
}
/** Ancienne dataviz seule ({ viz, width }), migrée, ou null */
export function readSolo() {
  try {
    const j = JSON.parse(localStorage.getItem(SOLO_KEY) || 'null');
    if (!j || typeof j !== 'object' || !j.viz || !VIZ_TYPES[j.viz.kind]) return null;
    return { viz: migrateViz(j.viz), width: +j.width > 0 ? +j.width : null };
  } catch (e) {
    return null;
  }
}
const lsRead = () => {
  try {
    const a = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
    return Array.isArray(a) ? a : [];
  } catch (e) {
    return [];
  }
};
const lsWrite = (list) => {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(list));
  } catch (e) {
    /* stockage plein : le projet reste ouvert, l'export reste possible */
  }
};
let idbOk = true;
async function rawAll() {
  if (idbOk)
    try {
      return await store.readVizProjects();
    } catch (e) {
      idbOk = false;
    }
  return lsRead().sort((a, b) => (b.at || 0) - (a.at || 0));
}
async function rawPut(p) {
  if (idbOk)
    try {
      return await store.putVizProject(JSON.parse(JSON.stringify(p)));
    } catch (e) {
      idbOk = false;
    }
  lsWrite([p, ...lsRead().filter((x) => x.id !== p.id)]);
}
async function rawDelete(id) {
  if (idbOk)
    try {
      return await store.deleteVizProject(id);
    } catch (e) {
      idbOk = false;
    }
  lsWrite(lsRead().filter((x) => x.id !== id));
}
/** Tous les projets, du plus récent au plus ancien (migrés) ; l'ancienne dataviz seule devient un projet au premier appel */
export async function listVizProjects() {
  let all = await rawAll();
  let flag = null;
  try {
    flag = localStorage.getItem(MIGRATED_KEY);
  } catch (e) {}
  if (!flag) {
    const solo = readSolo();
    if (solo) {
      const p = makeProject([{ id: uid('v'), name: 'Dataviz 1', width: solo.width, viz: solo.viz }]);
      await rawPut(p);
      all = [p, ...all];
    }
    try {
      localStorage.setItem(MIGRATED_KEY, '1');
    } catch (e) {}
  }
  return all.map(migrateProject).filter(Boolean);
}
/** Export des réglages : les projets tels qu'enregistrés */
export async function vizProjectsExport() {
  return { schemaVersion: SCHEMA, projects: await listVizProjects() };
}
export async function deleteVizProject(id) {
  await rawDelete(id);
}

/* ---------- Couleurs du projet ---------- */
const PAL_KEYS = ['theme', 'colors', 'colorNames', 'cmyk'];
/** copie des réglages de couleur d'un document (ou d'une palette enregistrée) */
export const palOf = (d) => ({
  colors: {},
  ...JSON.parse(JSON.stringify(Object.fromEntries(PAL_KEYS.filter((k) => d && d[k] !== undefined).map((k) => [k, d[k]])))),
});
/** document de rendu du projet : celui du document actif (police, densité, texte) avec les couleurs du projet ; ni sections ni
    header partagés, pour qu'aucune opération sur les couleurs (`remapColors`) ne touche la factsheet ouverte */
const projectDoc = (real, palette) => ({ ...real, sections: [], header: { ...(real.header || {}) }, colors: {}, ...palOf(palette) });

/* ---------- Création ---------- */
export function newProjectName(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return String(d.getFullYear()).slice(2) + p(d.getMonth() + 1) + p(d.getDate()) + '_dataviz';
}
function makeProject(items, palette = null) {
  return { id: uid('p'), schemaVersion: SCHEMA, name: newProjectName(), at: Date.now(), active: items[0].id, palette, items };
}
const defaultWidth = (ctx) => colWidth('1-1', 0, densityGaps(ctx.getDoc().density).columns);
const newItem = (n, width) => ({ id: uid('v'), name: `Dataviz ${n}`, width, viz: newViz('bars') });

/* ---------- Nom de fichier ---------- */
const stamp = () => {
  const d = new Date(),
    p = (n) => String(n).padStart(2, '0');
  return String(d.getFullYear()).slice(2) + p(d.getMonth() + 1) + p(d.getDate()) + '_' + p(d.getHours()) + p(d.getMinutes());
};
const clean = (s) =>
  stripMk(String(s || ''))
    .replace(/^#+\s*/, '')
    .replace(/[\\/:*?"<>|\n]+/g, '_')
    .replace(/\s+/g, '-')
    .trim()
    .slice(0, 60);
/** Nom de fichier : nom de la dataviz (sinon son titre, sinon « dataviz ») + type + AAMMJJ_HHMM ; l'export passe `_dataviz-<type>` */
const itemStem =
  (it) =>
  (suffix = '') =>
    (clean(it.name) || clean(it.viz.head && it.viz.head.title) || 'dataviz') + String(suffix).replace(/^_dataviz/, '') + '_' + stamp();

/* ---------- Session ouverte ---------- */
let session = null; // { ctx, p, ed, timer, switching }
function flush() {
  if (!session) return;
  clearTimeout(session.timer);
  session.timer = 0;
  session.p.at = Date.now();
  return rawPut(session.p);
}
const touch = () => {
  if (!session) return;
  clearTimeout(session.timer);
  session.timer = setTimeout(flush, SAVE_DELAY);
};
window.addEventListener('pagehide', () => session && session.timer && flush());

/** Ouvre un projet (`id`), ou un nouveau projet (sans `id`) ; `item` = dataviz à afficher (sinon la dernière ouverte) */
export async function openVizProject(ctx, id = null, { item } = {}) {
  if (document.querySelector('.ve')) return;
  let p = null;
  if (id) p = (await listVizProjects()).find((x) => x.id === id) || null;
  if (!p) {
    p = makeProject([newItem(1, defaultWidth(ctx))], palOf(ctx.getDoc()));
    await rawPut(p);
  }
  if (!p.palette) p.palette = palOf(ctx.getDoc()); // projet d'avant les couleurs enregistrées : il garde celles d'aujourd'hui
  /* contexte de l'éditeur : le document du projet ; une modification des couleurs est enregistrée dans le projet */
  const pdoc = projectDoc(ctx.getDoc(), p.palette);
  const savePal = () => {
    p.palette = palOf(pdoc);
    touch();
  };
  const vctx = { ...ctx, getDoc: () => pdoc, changed: savePal, restructure: savePal };
  session = { ctx, vctx, p, ed: null, timer: 0, switching: false };
  openItem(item || p.active);
}
/** Reprend le projet le plus récent (nouveau projet s'il n'y en a pas) */
export async function openLastVizProject(ctx) {
  const all = await listVizProjects();
  return openVizProject(ctx, all[0] ? all[0].id : null);
}

function openItem(itemId) {
  const { ctx, vctx, p } = session;
  const it = p.items.find((x) => x.id === itemId) || p.items[0];
  p.active = it.id;
  if (!it.width) it.width = defaultWidth(ctx);
  const col = { type: 'viz', viz: it.viz };
  touch();
  session.ed = openVizEditor({
    col,
    bg: 'none',
    width: it.width,
    ctx: vctx,
    fileStem: (x) => itemStem(it)(x),
    solo: {
      save: (viz, w) => {
        it.viz = viz;
        it.width = w;
        touch();
      },
      side: () => sidebar(it),
      onClose: () => {
        if (session && session.switching) return;
        flush();
        session = null;
        if (ctx.workspace && ctx.workspace.empty() && ctx.home) ctx.home.show(); // aucun document ouvert : retour à l'accueil
      },
    },
  });
}
/** passe à une autre dataviz du projet : l'éditeur se referme (tout est déjà enregistré) et se rouvre sur elle */
function switchTo(itemId) {
  if (!session || !session.ed) return;
  session.switching = true;
  session.ed.close(true);
  session.switching = false;
  openItem(itemId);
}

/* ---------- Colonne de gauche : nom du projet et ses dataviz ---------- */
function sidebar(cur) {
  const { p } = session;
  const nameIn = h('input', {
    type: 'text',
    class: 'vp-name',
    value: p.name,
    'aria-label': t('Nom du projet'),
    title: t('Nom du projet'),
    oninput: (e) => {
      p.name = e.target.value;
      touch();
    },
  });
  const typeIco = (it) => ico((VIZ_TYPES[it.viz.kind] && VIZ_TYPES[it.viz.kind].icon) || 'chart-bar');
  const row = (it) => {
    if (it !== cur)
      return h(
        'li',
        {},
        h(
          'button',
          { type: 'button', class: 'vp-item', title: t('Ouvrir cette dataviz'), onclick: () => switchTo(it.id) },
          typeIco(it),
          h('span', { class: 'no-i18n', textContent: it.name }),
        ),
      );
    return h(
      'li',
      { class: 'on' },
      h(
        'div',
        { class: 'vp-item vp-cur' },
        typeIco(it),
        h('input', {
          type: 'text',
          value: it.name,
          'aria-label': t('Nom de la dataviz'),
          title: t('Nom de la dataviz (nom du fichier exporté)'),
          oninput: (e) => {
            it.name = e.target.value;
            touch();
          },
          onchange: (e) => {
            if (!e.target.value.trim()) {
              it.name = `Dataviz ${p.items.indexOf(it) + 1}`;
              e.target.value = it.name;
              touch();
            }
          },
        }),
      ),
      h(
        'div',
        { class: 'vp-acts' },
        h(
          'button',
          {
            type: 'button',
            class: 'mini',
            title: t('Dupliquer la dataviz'),
            'aria-label': t('Dupliquer la dataviz'),
            onclick: () => {
              const copy = { ...JSON.parse(JSON.stringify(it)), id: uid('v'), name: `${it.name} (${t('copie')})` };
              p.items.splice(p.items.indexOf(it) + 1, 0, copy);
              touch();
              switchTo(copy.id);
            },
          },
          ico('copy'),
        ),
        h(
          'button',
          {
            type: 'button',
            class: 'mini danger',
            title: t('Supprimer la dataviz'),
            'aria-label': t('Supprimer la dataviz'),
            disabled: p.items.length < 2,
            onclick: async () => {
              if (p.items.length < 2) return;
              if (!(await confirmBox(t('Supprimer la dataviz « {} » ?').replace('{}', it.name), { ok: t('Supprimer'), danger: true })))
                return;
              const i = p.items.indexOf(it);
              p.items.splice(i, 1);
              touch();
              switchTo(p.items[Math.max(0, i - 1)].id);
            },
          },
          ico('trash'),
        ),
      ),
    );
  };
  return h(
    'div',
    { class: 'vp-side' },
    h('div', { class: 'vp-head' }, h('span', { class: 'hint', textContent: t('Projet dataviz') }), nameIn),
    h('ul', { class: 'vp-list', 'aria-label': t('Dataviz du projet') }, ...p.items.map(row)),
    h(
      'button',
      {
        type: 'button',
        class: 'pp-btn',
        onclick: () => {
          const it = newItem(p.items.length + 1, cur.width);
          p.items.push(it);
          touch();
          switchTo(it.id);
        },
      },
      ico('plus'),
      h('span', { textContent: t('Nouvelle dataviz') }),
    ),
  );
}
