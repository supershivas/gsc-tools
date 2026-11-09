import { moveSection, moveSub, swapCols } from '../state.js';

/* Cibles du glisser-déposer : où le geste en cours déposerait l'élément pris.
   Chaque fonction lit la position du pointeur et renvoie `{ key, apply(copie) }` (ou null) : `key` identifie la cible (pour ne
   redessiner que si elle change), `apply` fait le déplacement sur un document et renvoie le chemin à sélectionner ensuite.
   Les cibles sont désignées par identifiant (`id` de section et de sous-section), donc valables dans la copie comme dans le vrai document.
   `TARGETS` lit la page, `TREE_TARGETS` la colonne de gauche (nœuds portant l'identifiant de la section / sous-section). */
export const secIdx = (d, id) => d.sections.findIndex((x) => x.id === id);
export const subIdx = (d, id) => {
  for (let si = 0; si < d.sections.length; si++) {
    const bi = d.sections[si].subs.findIndex((x) => x.id === id);
    if (bi >= 0) return { si, bi };
  }
  return null;
};
const secOf = (el) => +el.dataset.sel.split(':')[1];

const mkSec = (dg, page, ref, after) => ({
  key: [page, ref, after],
  apply: (c) => `sec:${moveSection(c, secIdx(c, dg.id), ref == null ? null : secIdx(c, ref), after, page)}`,
});
const mkSub = (dg, sid, ref, after) => ({
  key: [sid, ref, after],
  apply: (c) => {
    const n = moveSub(c, subIdx(c, dg.id), { si: secIdx(c, sid), bi: ref == null ? null : subIdx(c, ref).bi }, after);
    return `sub:${n.si}:${n.bi}`;
  },
});
const mkCol = (dg, si, bi, ci) => ({
  key: [si, bi, ci],
  apply: (c) => {
    swapCols(c, dg.from, { si, bi, ci });
    return `col:${si}:${bi}:${ci}`;
  },
});

/* `getDrag()` : le geste en cours (kind, id, from…) ; le document affiché et les zones viennent de ctx */
export function makeTargets(ctx, getDrag) {
  const stage = ctx.stage,
    treeEl = ctx.treeEl;

  /* Section : on cherche, parmi les autres sections de la page visée, celle devant laquelle on se trouve */
  function secTarget(e) {
    const sd = ctx.shown(),
      dg = getDrag();
    for (const page of stage.querySelectorAll('.page:not(.ovf-clone)')) {
      const pr = page.getBoundingClientRect();
      if (e.clientX < pr.left || e.clientX > pr.right || e.clientY < pr.top || e.clientY > pr.bottom) continue;
      const key = page.dataset.page,
        id = (el) => sd.sections[secOf(el)].id;
      const secs = [...page.querySelectorAll('.sec')].filter((x) => id(x) !== dg.id);
      const mk = (ref, after) => ({
        key: [key, ref, after],
        apply: (c) => {
          const ni = moveSection(c, secIdx(c, dg.id), ref == null ? null : secIdx(c, ref), after, key);
          return `sec:${ni}`;
        },
      });
      for (const x of secs) {
        const r = x.getBoundingClientRect();
        if (e.clientY < r.top + r.height / 2) return mk(id(x), false);
      }
      return secs.length ? mk(id(secs[secs.length - 1]), true) : mk(null, false);
    }
    return null;
  }
  /* Sous-section : la section visée est celle sous le pointeur (la plus proche sinon), puis la sous-section devant laquelle on se trouve */
  function subTarget(e) {
    const sd = ctx.shown(),
      dg = getDrag();
    for (const page of stage.querySelectorAll('.page:not(.ovf-clone)')) {
      const pr = page.getBoundingClientRect();
      if (e.clientX < pr.left || e.clientX > pr.right || e.clientY < pr.top || e.clientY > pr.bottom) continue;
      const secs = [...page.querySelectorAll('.sec')];
      if (!secs.length) return null;
      let sec = secs.find((x) => {
        const r = x.getBoundingClientRect();
        return e.clientY >= r.top && e.clientY <= r.bottom;
      });
      if (!sec) sec = e.clientY < secs[0].getBoundingClientRect().top ? secs[0] : secs[secs.length - 1];
      const sid = sd.sections[secOf(sec)].id;
      const subs = [...sec.querySelectorAll('.sub[data-sel]')].filter((x) => {
        const q = x.dataset.sel.split(':');
        return sd.sections[+q[1]].subs[+q[2]].id !== dg.id;
      });
      const idOf = (el) => {
        const q = el.dataset.sel.split(':');
        return sd.sections[+q[1]].subs[+q[2]].id;
      };
      const mk = (ref, after) => ({
        key: [sid, ref, after],
        apply: (c) => {
          const from = subIdx(c, dg.id),
            si = secIdx(c, sid),
            n = moveSub(c, from, { si, bi: ref == null ? null : subIdx(c, ref).bi }, after);
          return `sub:${n.si}:${n.bi}`;
        },
      });
      for (const x of subs) {
        const r = x.getBoundingClientRect();
        if (e.clientY < r.top + r.height / 2) return mk(idOf(x), false);
      }
      return subs.length ? mk(idOf(subs[subs.length - 1]), true) : mk(null, false);
    }
    return null;
  }
  /* Colonne : toute la hauteur de la rangée compte, pas seulement le contenu (une colonne courte reste visée sur toute sa cellule) */
  function colTarget(e) {
    const dg = getDrag();
    for (const sub of stage.querySelectorAll('.sub[data-sel]')) {
      const cols = sub.querySelector(':scope > .cols');
      if (!cols) continue;
      const r = cols.getBoundingClientRect();
      if (e.clientY < r.top || e.clientY > r.bottom || e.clientX < r.left || e.clientX > r.right) continue;
      const list = [...cols.children].filter((x) => x.dataset && x.dataset.sel);
      const hit =
        list.find((x) => {
          const b = x.getBoundingClientRect();
          return e.clientX >= b.left && e.clientX <= b.right;
        }) ||
        list.reduce((best, x) => {
          const b = x.getBoundingClientRect(),
            d = Math.min(Math.abs(e.clientX - b.left), Math.abs(e.clientX - b.right));
          return !best || d < best.d ? { x, d } : best;
        }, null).x;
      const [, si, bi, ci] = hit.dataset.sel.split(':').map(Number);
      if (si === dg.from.si && bi === dg.from.bi && ci === dg.from.ci) return null;
      return {
        key: [si, bi, ci],
        apply: (c) => {
          swapCols(c, dg.from, { si, bi, ci });
          return `col:${si}:${bi}:${ci}`;
        },
      };
    }
    return null;
  }

  const inTree = (e) => {
    const r = treeEl.getBoundingClientRect();
    return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
  };
  function treeSecTarget(e) {
    const dg = getDrag();
    if (!inTree(e)) return null;
    for (const z of treeEl.querySelectorAll('.pg-zone[data-page]')) {
      const r = z.getBoundingClientRect();
      if (e.clientY < r.top || e.clientY > r.bottom) continue;
      const secs = [...z.querySelectorAll(':scope > .tn-sec[data-sid]')].filter((x) => x.dataset.sid !== dg.id);
      for (const x of secs) {
        const q = x.getBoundingClientRect();
        if (e.clientY < q.top + q.height / 2) return mkSec(dg, z.dataset.page, x.dataset.sid, false);
      }
      return secs.length ? mkSec(dg, z.dataset.page, secs[secs.length - 1].dataset.sid, true) : mkSec(dg, z.dataset.page, null, false);
    }
    return null;
  }
  function treeSubTarget(e) {
    const dg = getDrag();
    if (!inTree(e)) return null;
    const secs = [...treeEl.querySelectorAll('.tn-sec[data-sid]')];
    if (!secs.length) return null;
    const sec =
      secs.find((x) => {
        const r = x.getBoundingClientRect();
        return e.clientY >= r.top && e.clientY <= r.bottom;
      }) ||
      secs.reduce((b, x) => {
        const r = x.getBoundingClientRect(),
          d = Math.min(Math.abs(e.clientY - r.top), Math.abs(e.clientY - r.bottom));
        return !b || d < b.d ? { x, d } : b;
      }, null).x;
    const subs = [...sec.querySelectorAll('.tn-subcard[data-bid]')].filter((x) => x.dataset.bid !== dg.id);
    for (const x of subs) {
      const r = x.getBoundingClientRect();
      if (e.clientY < r.top + r.height / 2) return mkSub(dg, sec.dataset.sid, x.dataset.bid, false);
    }
    return subs.length ? mkSub(dg, sec.dataset.sid, subs[subs.length - 1].dataset.bid, true) : mkSub(dg, sec.dataset.sid, null, false);
  }
  function treeColTarget(e) {
    const dg = getDrag(),
      n = document.elementFromPoint(e.clientX, e.clientY),
      r = n && n.closest && n.closest('.col-row[data-path]');
    if (!r) return null;
    const [, si, bi, ci] = r.dataset.path.split(':').map(Number);
    return si === dg.from.si && bi === dg.from.bi && ci === dg.from.ci ? null : mkCol(dg, si, bi, ci);
  }

  return {
    TARGETS: { sec: secTarget, sub: subTarget, col: colTarget },
    TREE_TARGETS: { sec: treeSecTarget, sub: treeSubTarget, col: treeColTarget },
  };
}
