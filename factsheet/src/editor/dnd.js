import { PAGE } from '../tokens.js';
import { h } from '../render.js';
import { makeTargets, secIdx, subIdx } from './dnd-targets.js';

/* ---------- Glisser-déposer dans l'aperçu et dans la structure, avec aperçu en direct ----------
   Pendant le geste, une copie du document avec le déplacement appliqué est dessinée à la place du vrai (jauges et
   avertissements compris, voir `ctx.preview`) ; relâcher valide (annulable), Échap annule.
   L'élément est « pris » comme un objet : son rendu réel (clone) suit le pointeur (surélevé), pendant que le reste de la page se réorganise en direct.
   Ajoute à ctx : `startColDrag`, `startTreeDrag`, `startSecDrag`, `startSubDrag` (poignées de la barre au survol et de la structure).
   Renvoie `dragging()` : un geste est en préparation ou en cours. */
export function createDnd(ctx) {
  const stage = ctx.stage, treeEl = ctx.treeEl;
  let drag = null;
  const { TARGETS, TREE_TARGETS } = makeTargets(ctx, () => drag);

  function dragSource() {
    const doc = ctx.getDoc();
    if (drag.kind === 'sec') return stage.querySelector(`.sec[data-sel="sec:${secIdx(doc, drag.id)}"]`);
    if (drag.kind === 'sub') { const p = subIdx(doc, drag.id); return p && stage.querySelector(`.sub[data-sel="sub:${p.si}:${p.bi}"]`); }
    return stage.querySelector(`.col[data-sel="col:${drag.from.si}:${drag.from.bi}:${drag.from.ci}"]`);
  }
  function treeSource() {
    if (drag.kind === 'sec') return treeEl.querySelector(`.tn-sec[data-sid="${drag.id}"]`);
    if (drag.kind === 'sub') return treeEl.querySelector(`.tn-subcard[data-bid="${drag.id}"]`);
    return treeEl.querySelector(`.col-row[data-path="col:${drag.from.si}:${drag.from.bi}:${drag.from.ci}"]`);
  }
  function dragActivate() {
    drag.active = true; ctx.hover.hide(); document.body.classList.add('dragging');
    if (drag.tree) {   // carte de la colonne de gauche : on la soulève telle quelle
      const el = treeSource(); if (!el) { drag.ghost = h('div'); return; }
      const r = el.getBoundingClientRect(), ghost = h('div', { class: 'drag-obj tree-obj', style: { width: r.width + 'px' } });
      ghost.setAttribute('style', `${treeEl.getAttribute('style') || ''};width:${r.width}px`);
      const clone = el.cloneNode(true); clone.style.margin = '0'; ghost.append(clone); document.body.append(ghost);
      drag.grab = { dx: Math.min(Math.max(drag.x - r.left, 10), Math.max(10, r.width - 10)), dy: Math.min(Math.max(drag.y - r.top, 10), Math.max(10, r.height - 10)) };
      drag.ghost = ghost; return;
    }
    const el = dragSource(); if (!el) { drag.ghost = h('div'); return; }
    const r = el.getBoundingClientRect(), page = el.closest('.page'), sc = page.getBoundingClientRect().width / PAGE.w;
    const holder = h('div', { class: 'page drag-page', style: { width: r.width / sc + 'px', transform: `scale(${sc})` } });
    holder.setAttribute('style', (page.getAttribute('style') || '') + `;width:${r.width / sc}px;transform:scale(${sc})`);
    const clone = el.cloneNode(true); clone.classList.remove('drag-live'); clone.style.margin = '0'; clone.removeAttribute('data-sel'); holder.append(clone);
    drag.grab = { dx: Math.min(Math.max(drag.x - r.left, 10), Math.max(10, r.width - 10)), dy: Math.min(Math.max(drag.y - r.top, 10), Math.max(10, r.height - 10)) };
    drag.ghost = h('div', { class: 'drag-obj', style: { width: r.width + 'px', height: r.height + 'px' } }, holder);
    document.body.append(drag.ghost);
  }
  function dragEnd(commit) {
    if (!drag) return; const d = drag; drag = null;
    if (!d.active) return;
    d.ghost.remove(); document.body.classList.remove('dragging'); ctx.preview(null); ctx.refreshTree();
    ctx.suppressNextClick();
    if (commit && d.drop) ctx.moved(() => d.drop.apply(ctx.getDoc())); else ctx.schedule();
  }
  window.addEventListener('pointermove', e => {
    if (!drag) return;
    if (!drag.active) { if (!drag.pending || Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 6) return; dragActivate(); }
    if (drag.grab) { drag.ghost.style.left = e.clientX - drag.grab.dx + 'px'; drag.ghost.style.top = e.clientY - drag.grab.dy + 'px'; }
    if (drag.tree) { const tr = treeEl.getBoundingClientRect(); if (e.clientY < tr.top + 36) treeEl.scrollTop -= 14; else if (e.clientY > tr.bottom - 36) treeEl.scrollTop += 14; }   // défilement aux bords
    const t = (drag.tree ? TREE_TARGETS : TARGETS)[drag.kind](e), key = t ? JSON.stringify(t.key) : '';
    if (key === drag.key) return;
    drag.key = key; drag.drop = t;
    ctx.preview(t ? t.apply : null); ctx.refreshTree();   // la page et la structure se réorganisent ensemble
  });
  window.addEventListener('pointerup', () => dragEnd(true));
  window.addEventListener('pointercancel', () => dragEnd(false));
  window.addEventListener('keydown', e => { if (e.key === 'Escape') dragEnd(false); });
  /* Le titre d'une section ou d'une sous-section sert de poignée (seuil de 6 px pour ne pas gêner le clic) */
  stage.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    const st = e.target.closest('.sec-title'), bt = e.target.closest('.sub-title'), bg = !st && !bt && (e.target.classList.contains('sec') || e.target.classList.contains('sec-box')) ? e.target.closest('.sec') : null;
    const n = st || bt || bg; if (!n) return;   // titre de section / de sous-section, ou fond de la section (une section sans titre se prend par son fond)
    const el = n.closest(bt ? '.sub' : '.sec'), q = el.dataset.sel.split(':').map(Number), doc = ctx.getDoc();
    drag = { kind: bt ? 'sub' : 'sec', id: bt ? doc.sections[q[1]].subs[q[2]].id : doc.sections[q[1]].id, x: e.clientX, y: e.clientY, pending: true, active: false };
  });
  /* Poignées de la barre au survol : le geste commence tout de suite */
  ctx.startColDrag = (e, from) => { drag = { kind: 'col', from, x: e.clientX, y: e.clientY, pending: true, active: false }; };
  ctx.startTreeDrag = (e, d) => { drag = { ...d, tree: true, x: e.clientX, y: e.clientY, pending: true, active: false }; };
  ctx.startSecDrag = (e, from) => { drag = { kind: 'sec', id: ctx.getDoc().sections[from.si].id, x: e.clientX, y: e.clientY, pending: true, active: false }; };
  ctx.startSubDrag = (e, from) => { drag = { kind: 'sub', id: ctx.getDoc().sections[from.si].subs[from.bi].id, x: e.clientX, y: e.clientY, pending: true, active: false }; };

  return { dragging: () => !!drag };
}
