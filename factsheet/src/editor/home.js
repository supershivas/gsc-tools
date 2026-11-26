import { h, ico, renderDocument, measure } from '../render.js';
import { PAGE, cssVars, applyVars, paletteOf, textSetFor } from '../tokens.js';
import { renderCtx } from '../renderctx.js';
import { migrate } from '../state.js';
import { readRecent } from '../wsstore.js';
import { openSoloViz, readSolo } from '../vizsolo.js';
import { VIZ_TYPES, renderVizFull } from '../viz/index.js';
import { t, getLang } from '../i18n.js';
import { confirmBox } from '../dialogs.js';

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
  /* vignette de la dernière dataviz seule : rendue à sa largeur avec les couleurs du document actif, réduite à la carte */
  function vizThumb(solo) {
    const k = Math.min(1, THUMB_W / (solo.width + 24)),
      box = h('div', { class: 'fh-thumb fh-viz', style: { height: '160px' } });
    queue.push(async () => {
      if (!box.isConnected) return;
      try {
        const doc = ctx.getDoc(),
          r = renderVizFull(solo.viz, solo.width, {
            locale: doc.locale || 'en-GB',
            pal: paletteOf(doc.theme, doc.colors),
            rc: renderCtx(doc).forType('viz'),
          });
        if (!r || !r.node) throw new Error('rendu impossible');
        const sheet = h(
          'div',
          { class: 'page viz-sheet fh-scale', style: { width: solo.width + 24 + 'px', padding: '12px', transform: `scale(${k})` } },
          h('div', { class: 'col col-viz', style: { width: solo.width + 'px' } }, r.node),
        );
        applyVars(sheet, cssVars(doc.theme, doc.colors, doc.density, textSetFor(doc.textSet, 'viz')));
        box.append(sheet);
        box.style.height = Math.ceil(sheet.offsetHeight * k) + 'px'; // le cadre suit la hauteur du graphique
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
  /* sans document ouvert (tous les onglets fermés), l'accueil ne se ferme pas à vide : « Ouvrir… » le garde ouvert tant qu'aucun
     fichier n'est lu (le changement d'onglet le referme), et il revient après la dataviz seule (vizsolo.js) */
  const keep = (fn) => () => (ws.empty() ? fn() : go(fn)());

  function build() {
    const act = ws.active(),
      savedIds = new Set((ws.recentsOk() ? ws.recents() : []).filter((r) => r.saved).map((r) => r.fileId));
    const open = ws.tabs.map((tab) =>
      card({
        name: ws.nameOf(tab),
        sub: tab === act ? t('Onglet actif') : t('Onglet ouvert'),
        badge: ws.isDirty(tab)
          ? t('Modifié depuis le dernier export')
          : savedIds.has(tab.doc.fileId)
            ? t('Enregistré dans ce navigateur.').replace(/\.$/, '')
            : '',
        thumbEl: thumb(() => tab.doc),
        onOpen: go(() => ws.activate(tab.id)),
      }),
    );
    const openIds = new Set(ws.tabs.map((x) => x.doc.fileId));
    const recents = (ws.recentsOk() ? ws.recents() : []).filter((r) => !openIds.has(r.fileId));
    /* copie locale : carte + bouton de suppression (deux boutons voisins, jamais un bouton dans un bouton) */
    const local = (r) =>
      h(
        'div',
        { class: 'fh-cell' },
        card({
          name: r.name || t('Sans titre'),
          sub: when(r.at),
          thumbEl: thumb(async () => {
            const x = await readRecent(r.fileId);
            return x && x.doc ? migrate(x.doc) : null;
          }),
          onOpen: go(() => ws.openRecent(r.fileId)),
        }),
        h(
          'button',
          {
            type: 'button',
            class: 'fh-del',
            title: t('Supprimer cette copie locale'),
            'aria-label': t('Supprimer cette copie locale'),
            onclick: async () => {
              if (
                !(await confirmBox(t('Supprimer la copie locale « {} » ?').replace('{}', r.name || t('Sans titre')), {
                  ok: t('Supprimer'),
                  danger: true,
                }))
              )
                return;
              await ws.deleteRecent(r.fileId);
              if (root) build();
            },
          },
          ico('trash'),
        ),
      );
    const saved = recents.filter((r) => r.saved).map(local);
    const rec = recents.filter((r) => !r.saved).map(local);
    const solo = readSolo();
    const vizCard = solo
      ? card({
          name: t('Dernière dataviz'),
          sub: t((VIZ_TYPES[solo.viz.kind] && VIZ_TYPES[solo.viz.kind].label) || 'Dataviz'),
          thumbEl: vizThumb(solo),
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
            h('button', { type: 'button', onclick: keep(project.open) }, ico('folder-open'), h('span', { textContent: t('Ouvrir…') })),
            ws.empty()
              ? null
              : h(
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
        open.length
          ? [h('h2', { textContent: t('Ouverts') }), h('div', { class: 'fh-grid' }, ...open)]
          : h('p', { class: 'fh-note', textContent: t('Aucun document ouvert : créez ou ouvrez un projet.') }),
        saved.length ? [h('h2', { textContent: t('Enregistrés dans ce navigateur') }), h('div', { class: 'fh-grid' }, ...saved)] : null,
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
    if (e.key !== 'Escape' || !root || document.querySelector('dialog[open]') || ws.empty()) return;
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
