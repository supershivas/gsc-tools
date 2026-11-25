import { h, ico, renderDocument, measure } from '../render.js';
import { PAGE } from '../tokens.js';
import { migrate } from '../state.js';
import { readRecent } from '../wsstore.js';
import { openSoloViz, readSolo } from '../vizsolo.js';
import { VIZ_TYPES } from '../viz/index.js';
import { t, getLang } from '../i18n.js';

/* ---------- Écran d'accueil : les projets gardés dans ce navigateur, en grille ----------
   Affiché au lancement (case « Afficher l'accueil au lancement », `localStorage` `factsheet-creator-home` = '0' pour ne plus
   l'afficher), et depuis le menu Fichier ou l'icône maison de la barre d'onglets.
   - « Ouverts » : les onglets de l'espace de travail (un clic bascule sur l'onglet) ;
   - « Récents » : les copies locales des fichiers récents qui ne sont pas ouverts (un clic les ouvre dans un onglet) ;
   - la dernière dataviz seule, et les gestes de départ (nouvelle factsheet, nouvelle dataviz, ouvrir un fichier).
   Vignette : le recto rendu par `renderDocument` à l'échelle (une par image d'animation, pour ne pas figer l'écran).
   Superposé sous l'en-tête : la barre d'onglets et l'éditeur sont inertes tant qu'il est ouvert ; il se referme dès que l'onglet
   actif change (`close` appelé par main.js) ou à Échap. */

const PREF = 'factsheet-creator-home';
export const homeAtLaunch = () => {
  try {
    return localStorage.getItem(PREF) !== '0';
  } catch (e) {
    return true;
  }
};
const setAtLaunch = (on) => {
  try {
    localStorage.setItem(PREF, on ? '1' : '0');
  } catch (e) {
    /* préférence non gardée */
  }
};
const THUMB_W = 200; // largeur de la vignette, px

export function createHome({ ctx, ws, project }) {
  let root = null,
    muted = [],
    queue = [],
    raf = 0;

  const when = (at) =>
    new Date(at).toLocaleString(getLang() === 'fr' ? 'fr-FR' : 'en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  /* vignette du recto : rendue plus tard (file d'attente), à l'échelle de la carte */
  function thumb(getDoc) {
    const k = THUMB_W / PAGE.w,
      box = h('div', { class: 'fh-thumb', style: { height: Math.round(PAGE.h * k) + 'px' } });
    queue.push(async () => {
      if (!box.isConnected) return;
      try {
        const doc = await getDoc();
        if (!doc || !box.isConnected) return;
        const r = renderDocument(doc),
          page = r.pages[0];
        box.append(h('div', { class: 'fh-scale', style: { transform: `scale(${k})` } }, page.el));
        r.pages.slice(1).forEach((p) => p.el.remove());
        measure({ ...r, pages: [page] });
      } catch (e) {
        box.classList.add('empty');
      }
    });
    return box;
  }
  function pump() {
    raf = 0;
    const job = queue.shift();
    if (!job) return;
    job().finally(() => {
      if (queue.length && root) raf = requestAnimationFrame(pump);
    });
  }

  const card = ({ name, sub, badge, thumbEl, onOpen, icon }) =>
    h(
      'button',
      { type: 'button', class: 'fh-card', onclick: onOpen },
      thumbEl || h('div', { class: 'fh-thumb fh-icon' }, ico(icon || 'file')),
      h(
        'span',
        { class: 'fh-meta' },
        h('span', { class: 'fh-name no-i18n', textContent: name }),
        sub ? h('span', { class: 'fh-sub', textContent: sub }) : null,
        badge ? h('span', { class: 'fh-badge', textContent: badge }) : null,
      ),
    );

  /** ouvre un projet : l'accueil se ferme d'abord (le changement d'onglet est refusé tant qu'une fenêtre est ouverte) */
  const go = (fn) => () => {
    close();
    fn();
  };

  function build() {
    const act = ws.active();
    const open = ws.tabs.map((tab) =>
      card({
        name: ws.nameOf(tab),
        sub: tab === act ? t('Onglet actif') : t('Onglet ouvert'),
        badge: ws.isDirty(tab) ? t('Modifié depuis le dernier export') : '',
        thumbEl: thumb(() => tab.doc),
        onOpen: go(() => ws.activate(tab.id)),
      }),
    );
    const openIds = new Set(ws.tabs.map((x) => x.doc.fileId));
    const recents = (ws.recentsOk() ? ws.recents() : []).filter((r) => !openIds.has(r.fileId));
    const rec = recents.map((r) =>
      card({
        name: r.name || t('Sans titre'),
        sub: when(r.at),
        thumbEl: thumb(async () => {
          const x = await readRecent(r.fileId);
          return x && x.doc ? migrate(x.doc) : null;
        }),
        onOpen: go(() => ws.openRecent(r.fileId)),
      }),
    );
    const solo = readSolo();
    const vizCard = solo
      ? card({
          name: t('Dernière dataviz'),
          sub: t((VIZ_TYPES[solo.viz.kind] && VIZ_TYPES[solo.viz.kind].label) || 'Dataviz'),
          icon: 'chart-bar',
          onOpen: go(() => openSoloViz(ctx)),
        })
      : null;
    const atLaunch = h('input', { type: 'checkbox', checked: homeAtLaunch(), onchange: (e) => setAtLaunch(e.target.checked) });
    root.replaceChildren(
      h(
        'div',
        { class: 'fh-in' },
        h(
          'div',
          { class: 'fh-head' },
          h('h1', { textContent: t('Projets') }),
          h(
            'div',
            { class: 'fh-acts' },
            h(
              'button',
              { type: 'button', class: 'primary', onclick: go(() => ws.newBlank()) },
              ico('file-plus'),
              h('span', { textContent: t('Nouvelle factsheet') }),
            ),
            h(
              'button',
              { type: 'button', onclick: go(() => openSoloViz(ctx, { fresh: true })) },
              ico('chart-bar'),
              h('span', { textContent: t('Nouvelle dataviz') }),
            ),
            h('button', { type: 'button', onclick: go(project.open) }, ico('folder-open'), h('span', { textContent: t('Ouvrir…') })),
            h(
              'button',
              {
                type: 'button',
                class: 'fh-close',
                title: t('Fermer l’accueil (Échap)'),
                'aria-label': t('Fermer l’accueil'),
                onclick: close,
              },
              ico('x'),
            ),
          ),
        ),
        h('h2', { textContent: t('Ouverts') }),
        h('div', { class: 'fh-grid' }, ...open),
        rec.length || vizCard
          ? [h('h2', { textContent: t('Récents (copies locales)') }), h('div', { class: 'fh-grid' }, ...(vizCard ? [vizCard] : []), ...rec)]
          : null,
        h('p', {
          class: 'fh-note',
          textContent: t('Ces projets sont gardés dans ce navigateur seulement. Enregistrez un fichier (.json) pour le garder ailleurs.'),
        }),
        h('label', { class: 'fh-pref' }, atLaunch, ' ' + t('Afficher l’accueil au lancement')),
      ),
    );
  }

  const onKey = (e) => {
    if (e.key !== 'Escape' || !root || document.querySelector('dialog[open]')) return;
    e.preventDefault();
    e.stopPropagation();
    close();
  };

  async function show() {
    if (root || document.querySelector('.ve')) return;
    if (ws.recentsOk() && !ws.recents().length) await ws.loadRecents();
    if (root) return;
    root = h('div', { class: 'fs-home', role: 'dialog', 'aria-modal': 'true', 'aria-label': t('Accueil'), tabindex: -1 });
    muted = ['fsTabs'].map((id) => document.getElementById(id)).concat([...document.querySelectorAll('body > .app')]);
    muted = muted.filter((n) => n && !n.inert);
    muted.forEach((n) => (n.inert = true));
    document.body.append(root);
    document.body.classList.add('fs-home-open');
    build();
    window.addEventListener('keydown', onKey, true);
    root.focus({ preventScroll: true });
    if (!raf) raf = requestAnimationFrame(pump);
  }
  function close() {
    if (!root) return;
    root.remove();
    root = null;
    queue = [];
    cancelAnimationFrame(raf);
    raf = 0;
    muted.forEach((n) => (n.inert = false));
    muted = [];
    document.body.classList.remove('fs-home-open');
    window.removeEventListener('keydown', onKey, true);
    ctx.schedule();
  }
  return { show, close, isOpen: () => !!root };
}
