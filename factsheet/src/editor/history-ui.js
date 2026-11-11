import { h, ico } from '../render.js';
import { t } from '../i18n.js';
import { MAC, MOD } from './keys.js';

/* Historique : interface. Annuler / rétablir et nom du fichier au centre de l'en-tête, panneau « Historique des modifications »
   (un clic revient à ce pas) et petit message en bas à gauche après un déplacement / une suppression.
   `onSync` : redessin des contrôles voisins (espacement) quand l'historique change. */
export function createHistoryUi(ctx, history, { onSync }) {
  const undoBtn = h(
    'button',
    {
      type: 'button',
      class: 'icon-btn fs-hbtn',
      title: `${t('Annuler l’action')} (${MOD}Z)`,
      'aria-label': t('Annuler l’action'),
      onclick: () => history.undo(),
    },
    ico('arrow-back-up'),
  );
  const redoBtn = h(
    'button',
    {
      type: 'button',
      class: 'icon-btn fs-hbtn',
      title: `${t('Rétablir')} (${MAC ? '⇧⌘Z' : 'Ctrl+Y'})`,
      'aria-label': t('Rétablir'),
      onclick: () => history.redo(),
    },
    ico('arrow-forward-up'),
  );
  const histBtn = h(
    'button',
    {
      type: 'button',
      class: 'icon-btn fs-hbtn',
      title: t('Historique des modifications'),
      'aria-label': t('Historique des modifications'),
      onclick: () => toggleHistory(),
    },
    ico('history'),
  );
  const nameIn = h('input', {
    type: 'text',
    class: 'fs-name',
    spellcheck: false,
    'aria-label': t('Nom du fichier'),
    title: t('Nom du fichier'),
    oninput: (e) => {
      ctx.getDoc().name = e.target.value;
      fitName();
      ctx.changed();
    },
  });
  const fitName = () => {
    nameIn.style.width = Math.max(10, nameIn.value.length + 1) + 'ch';
  };
  const centerEl = h('div', { class: 'fs-center' }, undoBtn, redoBtn, histBtn, nameIn);
  function syncCenter() {
    undoBtn.disabled = !history.canUndo();
    redoBtn.disabled = !history.canRedo();
    if (document.activeElement !== nameIn) nameIn.value = ctx.getDoc().name || '';
    fitName();
    if (histPop) drawHistory();
    onSync();
  }
  history.onChange = syncCenter;

  /* Historique des modifications : liste des pas (le plus récent en haut) ; un clic revient à cet état */
  let histPop = null;
  const clock = (ms) => new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  function drawHistory() {
    const HIST = history.steps;
    const list = h('ul', { class: 'hist-list' });
    for (let k = HIST.stack.length - 1; k >= 0; k--) {
      const m = HIST.meta[k] || {};
      list.append(
        h(
          'li',
          {},
          h(
            'button',
            {
              type: 'button',
              class: 'hist-item' + (k === HIST.i ? ' on' : '') + (k > HIST.i ? ' future' : ''),
              onclick: () => history.goTo(k),
            },
            h('span', { class: 'hist-dot' }),
            h('span', { class: 'hist-lab', textContent: m.label || '' }),
            h('time', { textContent: clock(m.at || Date.now()) }),
          ),
        ),
      );
    }
    histPop.body.replaceChildren(list);
  }
  function toggleHistory() {
    if (histPop) {
      histPop.close();
      return;
    }
    const el = h(
      'div',
      { class: 'hist-pop', role: 'dialog', 'aria-label': t('Historique des modifications') },
      h(
        'div',
        { class: 'hist-head' },
        h('b', { textContent: t('Historique des modifications') }),
        h('button', { type: 'button', class: 'mini', 'aria-label': t('Fermer'), onclick: () => histPop.close() }, ico('x')),
      ),
      h('div', { class: 'hist-body' }),
    );
    document.body.append(el);
    const r = histBtn.getBoundingClientRect();
    el.style.left = Math.max(8, r.left - 40) + 'px';
    el.style.top = r.bottom + 6 + 'px';
    const away = (e) => {
      if (!el.contains(e.target) && !histBtn.contains(e.target)) histPop.close();
    };
    const key = (e) => {
      if (e.key === 'Escape') histPop.close();
    };
    document.addEventListener('pointerdown', away, true);
    document.addEventListener('keydown', key, true);
    histPop = {
      body: el.querySelector('.hist-body'),
      close() {
        document.removeEventListener('pointerdown', away, true);
        document.removeEventListener('keydown', key, true);
        el.remove();
        histPop = null;
      },
    };
    drawHistory();
  }

  /* Petit message en bas à gauche (déplacement, suppression) avec « Annuler » (si `undoLabel`) ; disparaît seul */
  let noteTimer = 0;
  function noteToast(label, undoLabel) {
    document.querySelectorAll('.fs-toast').forEach((n) => n.remove());
    clearTimeout(noteTimer);
    const el = h(
      'div',
      { class: 'fs-toast', role: 'status' },
      h('span', { textContent: t(label) }),
      undoLabel
        ? h('button', {
            type: 'button',
            textContent: t(undoLabel),
            onclick: () => {
              el.remove();
              history.undo();
            },
          })
        : null,
    );
    document.body.append(el);
    noteTimer = setTimeout(() => el.remove(), 6000);
  }

  return { centerEl, nameIn, syncCenter, toggleHistory, noteToast };
}
