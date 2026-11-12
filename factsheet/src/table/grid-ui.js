/* Éditeur de tableau : la grille. Vrai rendu du tableau (`renderTable`, calé par `layoutTable`) et, par-dessus, ce qui ne sert
   qu'à l'édition : calque de sélection, en-têtes de colonnes (A, B…) et de lignes (1, 2…), poignées de largeur (moteur commun
   `editor/split.js`) et de hauteur. Rien de tout cela n'est dans le document. La sélection appartient à l'éditeur (`getSel`/`setSel`) :
   { a: { r, c } (cellule active), b: { r, c } (autre coin) } ; le rectangle affiché l'agrandit aux fusions qu'il coupe (`mergeRect`). */
import { h } from '../render.js';
import { t } from '../i18n.js';
import { renderTable, layoutTable, trackEdges } from './render.js';
import { cellAt, mergeRect } from './model.js';
import { dragSplit } from '../editor/split.js';

const letter = (j) => (j < 26 ? String.fromCharCode(65 + j) : 'A' + String.fromCharCode(65 + j - 26));
export const cellName = (r, c) => `${letter(c)}${r + 1}`;

/** Rectangle de la sélection (aux fusions près) ou null */
export function selRect(tb, sel) {
  if (!sel) return null;
  return mergeRect(tb, sel.a.r, sel.a.c, sel.b.r, sel.b.c);
}

export function createGridUi({ holder, getTable, getEnv, getSel, setSel, scale, onEdit, onLive, onDone }) {
  let tbl = null,
    chrome = null,
    edges = null;

  function draw() {
    const tb = getTable();
    tbl = renderTable(tb, getEnv());
    chrome = h('div', { class: 'te-chrome' });
    holder.replaceChildren(tbl, chrome);
    refresh();
  }
  /** Recale les traits, les en-têtes et la sélection sur la mise en page actuelle (après une saisie qui change la hauteur d'une ligne) */
  function refresh() {
    if (!tbl) return;
    layoutTable(tbl);
    edges = trackEdges(tbl);
    drawChrome();
  }
  function drawChrome() {
    if (!edges) return;
    const tb = getTable(),
      { xs, ys } = edges,
      R = tb.rows.length,
      C = tb.cols.length,
      rect = selRect(tb, getSel());
    const kids = [
      h('button', {
        type: 'button',
        class: 'te-corner',
        title: t('Tout sélectionner (Cmd/Ctrl + A)'),
        'aria-label': t('Tout sélectionner'),
        dataset: { all: '1' },
      }),
    ];
    for (let j = 0; j < C; j++)
      kids.push(
        h('button', {
          type: 'button',
          class: 'te-ch' + (rect && j >= rect.c0 && j <= rect.c1 ? ' on' : ''),
          style: { left: xs[j] + 'px', width: xs[j + 1] - xs[j] + 'px' },
          textContent: letter(j),
          title: t('Sélectionner la colonne'),
          dataset: { col: j },
        }),
      );
    for (let i = 0; i < R; i++)
      kids.push(
        h('button', {
          type: 'button',
          class: 'te-rhd' + (rect && i >= rect.r0 && i <= rect.r1 ? ' on' : ''),
          style: { top: ys[i] + 'px', height: ys[i + 1] - ys[i] + 'px' },
          textContent: String(i + 1),
          title: t('Sélectionner la ligne'),
          dataset: { row: i },
        }),
      );
    for (let j = 1; j < C; j++)
      kids.push(
        h('div', { class: 'te-cw', style: { left: xs[j] + 'px' }, title: t('Glisser pour régler la largeur'), dataset: { split: j - 1 } }),
      );
    for (let i = 0; i < R; i++)
      kids.push(
        h('div', {
          class: 'te-rh',
          style: { top: ys[i + 1] + 'px' },
          title: t('Glisser pour régler la hauteur minimale (double-clic : selon le contenu)'),
          dataset: { hrow: i },
        }),
      );
    if (rect) {
      const box = (cls, r0, c0, r1, c1) =>
        h('div', {
          class: cls,
          style: { left: xs[c0] + 'px', top: ys[r0] + 'px', width: xs[c1 + 1] - xs[c0] + 'px', height: ys[r1 + 1] - ys[r0] + 'px' },
        });
      kids.push(box('te-sel', rect.r0, rect.c0, rect.r1, rect.c1));
      const a = cellAt(tb, getSel().a.r, getSel().a.c);
      if (a) kids.push(box('te-cur', a.r, a.c, a.r + a.rs - 1, a.c + a.cs - 1));
    }
    chrome.replaceChildren(...kids);
  }

  /* ----- pointeur ----- */
  const posOf = (el) => {
    const n = el && el.closest && el.closest('[data-cell]');
    if (!n || !tbl || !tbl.contains(n)) return null;
    const cl = getTable().cells.find((x) => x.id === n.dataset.cell);
    return cl ? { r: cl.r, c: cl.c } : null;
  };
  const headOf = (el) => {
    const n = el && el.closest && el.closest('.te-ch, .te-rhd');
    return n ? (n.dataset.col != null ? { col: +n.dataset.col } : { row: +n.dataset.row }) : null;
  };
  const lineSel = (hd, from) => {
    const tb = getTable(),
      R = tb.rows.length,
      C = tb.cols.length;
    if (hd.col != null) return { a: { r: 0, c: from ? from.c : hd.col }, b: { r: R - 1, c: hd.col } };
    return { a: { r: from ? from.r : hd.row, c: 0 }, b: { r: hd.row, c: C - 1 } };
  };
  holder.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const tg = e.target;
    if (tg.closest('.te-edit')) return; // saisie en cours : le curseur se place dans le texte
    if (tg.closest('.te-cw')) return colResize(e, tg.closest('.te-cw'));
    if (tg.closest('.te-rh')) return rowResize(e, tg.closest('.te-rh'));
    if (tg.closest('[data-all]')) {
      e.preventDefault();
      const tb = getTable();
      setSel({ a: { r: 0, c: 0 }, b: { r: tb.rows.length - 1, c: tb.cols.length - 1 } });
      return;
    }
    const hd = headOf(tg),
      p = hd ? null : posOf(tg);
    if (!hd && !p) return;
    e.preventDefault(); // pas de sélection de texte du navigateur pendant le glissement
    const cur = getSel();
    if (hd) setSel(lineSel(hd, e.shiftKey && cur ? cur.a : null));
    else setSel(e.shiftKey && cur ? { a: cur.a, b: p } : { a: p, b: p });
    const start = getSel();
    const move = (ev) => {
      const el = document.elementFromPoint(ev.clientX, ev.clientY);
      if (hd) {
        const h2 = headOf(el);
        if (h2 && (h2.col != null) === (hd.col != null)) {
          const s = lineSel(h2, start.a);
          setSel(hd.col != null ? { a: { r: 0, c: start.a.c }, b: s.b } : { a: { r: start.a.r, c: 0 }, b: s.b });
        }
        return;
      }
      const q = posOf(el);
      if (q) setSel({ a: start.a, b: q });
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  });
  holder.addEventListener('dblclick', (e) => {
    if (e.target.closest('.te-edit')) return;
    const rh = e.target.closest('.te-rh');
    if (rh) {
      getTable().rows[+rh.dataset.hrow].h = 0;
      onDone();
      return;
    }
    const p = posOf(e.target);
    if (p) onEdit(p);
  });

  /* largeur : poignée entre deux en-têtes de colonnes (fractions, collées aux douzièmes) */
  function colResize(e, sp) {
    const tb = getTable(),
      n = tb.cols.length;
    dragSplit(e, +sp.dataset.split, [...chrome.querySelectorAll('.te-ch')], {
      scale: scale(),
      min: 0.04,
      apply: (f) => f.forEach((v, k) => (tb.cols[k].w = Math.round(v * n * 1000) / 1000)),
      live: onLive,
      done: onDone,
    });
  }
  /* hauteur minimale : poignée sous l'en-tête de la ligne (grille de 3 px ; la ligne ne descend jamais sous son contenu) */
  function rowResize(e, sp) {
    e.preventDefault();
    e.stopPropagation();
    const tb = getTable(),
      i = +sp.dataset.hrow,
      h0 = edges ? edges.ys[i + 1] - edges.ys[i] : 0,
      y0 = e.clientY,
      k = scale();
    let moved = false;
    document.body.style.cursor = 'row-resize';
    const move = (ev) => {
      moved = true;
      tb.rows[i].h = Math.max(0, Math.round((h0 + (ev.clientY - y0) / k) / 3) * 3);
      onLive();
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      document.body.style.cursor = '';
      if (moved) onDone();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  return {
    draw,
    refresh,
    drawChrome,
    cellEl: (id) => (tbl ? tbl.querySelector(`[data-cell="${CSS.escape(id)}"]`) : null),
  };
}
