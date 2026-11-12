/* Éditeur de tableau : la grille. Vrai rendu du tableau (`renderTable`, calé par `layoutTable`) et, par-dessus, ce qui ne sert
   qu'à l'édition : calque de sélection, en-têtes de colonnes (A, B…) et de lignes (1, 2…), poignées de largeur (moteur commun
   `editor/split.js`) et de hauteur. Rien de tout cela n'est dans le document. La sélection appartient à l'éditeur (`getSel`/`setSel`) :
   { a: { r, c } (cellule active), b: { r, c } (autre coin) } ; le rectangle affiché l'agrandit aux fusions qu'il coupe (`mergeRect`). */
import { h } from '../render.js';
import { t } from '../i18n.js';
import { renderTable, layoutTable, trackEdges } from './render.js';
import { cellAt, mergeRect, moveTracks } from './model.js';
import { dragSplit } from '../editor/split.js';
import { PAGE } from '../tokens.js';

const NARROW_PX = 30; // en dessous, une colonne est trop étroite pour écrire

const letter = (j) => (j < 26 ? String.fromCharCode(65 + j) : 'A' + String.fromCharCode(65 + j - 26));
export const cellName = (r, c) => `${letter(c)}${r + 1}`;

/** Rectangle de la sélection (aux fusions près) ou null */
export function selRect(tb, sel) {
  if (!sel) return null;
  return mergeRect(tb, sel.a.r, sel.a.c, sel.b.r, sel.b.c);
}

export function createGridUi({ holder, host, getTable, getEnv, getSel, setSel, scale, onEdit, onLive, onDone, onPreview, onReorder }) {
  let tbl = null,
    chrome = null,
    edges = null,
    dropMark = null, // pendant un déplacement : { axis, start, len } de la piste prise, à sa place d'arrivée
    reorder = null; // geste en cours (fonction d'annulation)

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
      rect = dropMark ? null : selRect(tb, getSel());
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
    const box = (cls, r0, c0, r1, c1) =>
      h('div', {
        class: cls,
        style: { left: xs[c0] + 'px', top: ys[r0] + 'px', width: xs[c1 + 1] - xs[c0] + 'px', height: ys[r1 + 1] - ys[r0] + 'px' },
      });
    if (dropMark) {
      const { axis, start, len } = dropMark;
      kids.push(axis === 'row' ? box('te-drop', start, 0, start + len - 1, C - 1) : box('te-drop', 0, start, R - 1, start + len - 1));
    }
    if (rect) {
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
    const ro = hd && reorderable(hd);
    if (ro) return startReorder(e, ro, hd);
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
  /* ----- réordonner : glisser une en-tête de ligne ou de colonne déjà sélectionnée (avec toute la sélection voisine) ----- */
  function reorderable(hd) {
    const tb = getTable(),
      rect = selRect(tb, getSel());
    if (!rect) return null;
    const R = tb.rows.length,
      C = tb.cols.length;
    if (hd.col != null) {
      const ok = rect.r0 === 0 && rect.r1 === R - 1 && hd.col >= rect.c0 && hd.col <= rect.c1 && rect.c1 - rect.c0 + 1 < C;
      return ok ? { axis: 'col', i: hd.col, a: rect.c0, b: rect.c1 } : null;
    }
    const ok = rect.c0 === 0 && rect.c1 === C - 1 && hd.row >= rect.r0 && hd.row <= rect.r1 && rect.r1 - rect.r0 + 1 < R;
    return ok ? { axis: 'row', i: hd.row, a: rect.r0, b: rect.r1 } : null;
  }
  function startReorder(e, { axis, a, b }, hd) {
    e.preventDefault();
    const tb = getTable(),
      n = (axis === 'row' ? tb.rows : tb.cols).length,
      L = b - a + 1,
      off = (axis === 'row' ? hd.row : hd.col) - a,
      k = scale(),
      box = tbl.getBoundingClientRect(),
      { xs, ys } = edges,
      track = axis === 'row' ? ys : xs;
    let active = false,
      ghost = null,
      to = a,
      valid = true;
    const grab = axis === 'row' ? e.clientY - (box.top + ys[a] * k) : e.clientX - (box.left + xs[a] * k);
    const activate = () => {
      active = true;
      document.body.classList.add('dragging');
      const w = axis === 'row' ? xs[xs.length - 1] : xs[b + 1] - xs[a],
        hh = axis === 'row' ? ys[b + 1] - ys[a] : ys[ys.length - 1];
      const inner = tbl.cloneNode(true);
      inner.removeAttribute('data-cell');
      Object.assign(inner.style, {
        position: 'absolute',
        left: -(axis === 'col' ? xs[a] * k : 0) + 'px',
        top: -(axis === 'row' ? ys[a] * k : 0) + 'px',
        width: xs[xs.length - 1] + 'px',
        transform: `scale(${k})`,
        transformOrigin: '0 0',
      });
      ghost = h('div', { class: 'drag-obj te-ghost', style: { width: w * k + 'px', height: hh * k + 'px', overflow: 'hidden' } }, inner);
      host.append(ghost);
    };
    const place = (ev) => {
      ghost.style.left = (axis === 'col' ? ev.clientX - grab : box.left) + 'px';
      ghost.style.top = (axis === 'row' ? ev.clientY - grab : box.top) + 'px';
    };
    const move = (ev) => {
      if (!active) {
        if (Math.hypot(ev.clientX - e.clientX, ev.clientY - e.clientY) < 6) return;
        activate();
      }
      place(ev);
      const p = (axis === 'row' ? ev.clientY - box.top : ev.clientX - box.left) / k,
        last = track.length - 2;
      let j = 0;
      while (j < last && p >= track[j + 1]) j++;
      const start = Math.max(0, Math.min(n - L, j - off));
      if (start === to) return;
      to = start;
      const copy = JSON.parse(JSON.stringify(tb));
      valid = start === a || moveTracks(copy, axis, a, b, start);
      dropMark = valid && start !== a ? { axis, start, len: L } : null;
      onPreview(valid && start !== a ? copy : null);
    };
    const end = (commit) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancel);
      window.removeEventListener('keydown', key, true);
      reorder = null;
      document.body.classList.remove('dragging');
      if (ghost) ghost.remove();
      const moved = active && commit && valid && to !== a;
      dropMark = null;
      onPreview(null);
      if (!active) setSel(lineSel(hd));
      else if (moved) onReorder({ axis, a, b, to });
    };
    const up = () => end(true),
      cancel = () => end(false),
      key = (ev) => {
        if (ev.key !== 'Escape') return;
        ev.preventDefault();
        end(false);
      };
    reorder = cancel;
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancel);
    window.addEventListener('keydown', key, true);
  }
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

  const cellEl = (id) => (tbl ? tbl.querySelector(`[data-cell="${CSS.escape(id)}"]`) : null);
  return {
    draw,
    refresh,
    drawChrome,
    dragging: () => !!reorder,
    /** Hauteurs des lignes (px, mesurées) */
    rowHeights: () => (edges ? edges.ys.slice(1).map((y, i) => y - edges.ys[i]) : []),
    /** Largeur naturelle du contenu de chaque colonne (px, cellules non fusionnées), cellule comprise */
    contentWidths() {
      const tb = getTable(),
        out = tb.cols.map(() => 0);
      for (const cl of tb.cells) {
        const el = cl.cs === 1 && cellEl(cl.id);
        if (!el) continue;
        const w0 = el.style.width,
          js = el.style.justifySelf;
        el.style.width = 'max-content';
        el.style.justifySelf = 'start';
        out[cl.c] = Math.max(out[cl.c], el.offsetWidth);
        el.style.width = w0;
        el.style.justifySelf = js;
      }
      return out;
    },
    /** Colonnes trop étroites (largeur < NARROW_PX ou texte qui déborde) et dépassement de la hauteur d'une page */
    diagnose() {
      if (!tbl || !edges) return { narrow: [], tall: false };
      const tb = getTable(),
        narrow = new Set();
      edges.xs.slice(1).forEach((x, j) => x - edges.xs[j] < NARROW_PX && narrow.add(j));
      for (const cl of tb.cells) {
        const el = cl.cs === 1 && cellEl(cl.id);
        if (el && el.scrollWidth > el.clientWidth + 1) narrow.add(cl.c);
      }
      return {
        narrow: [...narrow].sort((x, y) => x - y),
        tall: edges.ys[edges.ys.length - 1] > PAGE.h - PAGE.marginTop - PAGE.marginBottom,
      };
    },
    cellEl,
  };
}
