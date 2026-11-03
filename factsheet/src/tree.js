/* Colonne de gauche : la structure du document en cartes repliables (header, sections, sous-sections, colonnes).
   Clic = sélection (propriétés à droite) · glisser une poignée = déplacer, avec aperçu en direct sur la page. */
import { h, ico } from './render.js';
import { cssVars, applyVars } from './tokens.js';
import { moveSection, newSection, newSub, swapCols, moveSub } from './state.js';
import { VIZ_TYPES } from './viz/index.js';

const strip = t => String(t || '').replace(/\*\*|__|~~/g, '').replace(/^[-•]\s+/gm, '').replace(/\s+/g, ' ').trim();
const ICON = { text: 'text-size', image: 'photo', figure: 'number', card: 'layout-cards', viz: 'chart-bar' };

function colLabel(col) {
  if (col.type === 'text') return strip(col.text).slice(0, 34) || 'Texte vide';
  if (col.type === 'image') return col.caption ? 'Image · ' + col.caption : 'Image';
  if (col.type === 'card') return 'Carte · ' + (strip(col.card && col.card.content && col.card.content.title) || '—');
  if (col.type === 'figure') return 'Chiffre clé · ' + ((col.figure && col.figure.value) || '—');
  const t = col.viz && VIZ_TYPES[col.viz.kind];
  return 'Dataviz · ' + (t ? t.label : '—');
}

export function buildTree(root, ctx) {
  const doc = ctx.getDoc(), sel = ctx.getSel(), collapsed = ctx.collapsed;
  root.innerHTML = ''; applyVars(root, cssVars(doc.theme, doc.colors));
  const row = (path, cls, kids) => h('div', { class: 'tn ' + cls + (sel === path ? ' sel' : ''), dataset: { path: path || '' },
    onclick: e => { if (e.target.closest('.grip,.tn-tog,.tn-add')) return; ctx.select(path); } }, ...kids);
  const tog = key => h('button', { type: 'button', class: 'tn-tog', 'aria-label': collapsed.has(key) ? 'Déplier' : 'Replier', 'aria-expanded': String(!collapsed.has(key)), onclick: () => { collapsed.has(key) ? collapsed.delete(key) : collapsed.add(key); ctx.refreshTree(); } }, ico(collapsed.has(key) ? 'chevron-down' : 'chevron-up'));
  const add = (label, fn) => h('button', { type: 'button', class: 'tn-add', onclick: () => { fn(); ctx.restructure(); } }, ico('plus'), h('span', { textContent: label }));

  root.append(row(null, 'tn-doc', [ico('file-text'), h('strong', { textContent: doc.name || 'Document' }), h('span', { class: 'tn-sub', textContent: 'document' })]));

  let dragFrom = null, drag = null, pKey = '';     // dragFrom : section ; drag : { kind: 'sub' | 'col', si, bi, ci } — sous-section ou contenu de colonne
  const clearDrop = () => root.querySelectorAll('.drop-before,.drop-after,.drop-zone,.drop-swap').forEach(n => n.classList.remove('drop-before', 'drop-after', 'drop-zone', 'drop-swap'));
  /* Aperçu en direct sur la page : la copie du document avec le déplacement appliqué (les indices sont ceux du vrai document) */
  const preview = (key, apply) => { if (key === pKey) return; pKey = key; ctx.preview(apply); };
  const endDrag = () => { pKey = ''; ctx.preview(null); clearDrop(); document.body.classList.remove('dragging'); };
  const startDrag = () => { document.body.classList.add('dragging'); };

  /* Poignée + cible de dépôt d'une ligne : une sous-section se range avant/après une autre (ou en fin de section),
     un contenu de colonne s'échange avec celui de la colonne visée. */
  const gripFor = d => h('span', { class: 'grip', draggable: true, title: d.kind === 'sub' ? 'Glisser la sous-section (autre section possible)' : 'Glisser le contenu sur une autre colonne pour l’échanger',
    ondragstart: e => { e.stopPropagation(); drag = d; startDrag(); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', d.kind); },
    ondragend: () => { drag = null; endDrag(); } }, ico('grip-vertical'));
  const dropOn = (rowEl, target) => {
    rowEl.addEventListener('dragover', ev => {
      if (!drag) return;
      if (target.kind === 'col' && drag.kind === 'col') {
        ev.preventDefault(); ev.stopPropagation(); clearDrop(); rowEl.classList.add('drop-swap');
        const same = target.si === drag.si && target.bi === drag.bi && target.ci === drag.ci;
        preview(same ? '' : `col:${target.si}:${target.bi}:${target.ci}`, same ? null : c => { swapCols(c, drag, target); return `col:${target.si}:${target.bi}:${target.ci}`; });
      } else if (target.kind === 'sub' && drag.kind === 'sub') {
        ev.preventDefault(); ev.stopPropagation(); const r = rowEl.getBoundingClientRect(), after = ev.clientY > r.top + r.height / 2; clearDrop(); rowEl.classList.add(after ? 'drop-after' : 'drop-before'); rowEl.dataset.after = after ? '1' : '';
        const d = drag; preview(`sub:${target.si}:${target.bi}:${after}`, c => { const n = moveSub(c, d, target, after); return `sub:${n.si}:${n.bi}`; });
      } else if (target.kind === 'sec' && drag.kind === 'sub') {
        ev.preventDefault(); ev.stopPropagation(); clearDrop(); rowEl.classList.add('drop-zone');
        const d = drag; preview(`subsec:${target.si}`, c => { const n = moveSub(c, d, { si: target.si, bi: null }); return `sub:${n.si}:${n.bi}`; });
      }
    });
    rowEl.addEventListener('drop', ev => {
      if (!drag) return; const d = drag; drag = null; endDrag();
      if (target.kind === 'col' && d.kind === 'col') { ev.preventDefault(); ev.stopPropagation(); ctx.moved(() => { swapCols(doc, d, target); return `col:${target.si}:${target.bi}:${target.ci}`; }); }
      else if (target.kind === 'sub' && d.kind === 'sub') { ev.preventDefault(); ev.stopPropagation(); const after = !!rowEl.dataset.after; ctx.moved(() => { const n = moveSub(doc, d, target, after); return `sub:${n.si}:${n.bi}`; }); }
      else if (target.kind === 'sec' && d.kind === 'sub') { ev.preventDefault(); ev.stopPropagation(); ctx.moved(() => { const n = moveSub(doc, d, { si: target.si, bi: null }); return `sub:${n.si}:${n.bi}`; }); }
    });
    return rowEl;
  };

  const secNode = (sec, si) => {
    const key = sec.id || 'sec' + si, closed = collapsed.has(key), band = sec.bg && sec.bg !== 'none';
    const grip = h('span', { class: 'grip', draggable: true, title: 'Glisser pour réordonner ou changer de page',
      ondragstart: e => { dragFrom = si; startDrag(); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(si)); },
      ondragend: () => { dragFrom = null; endDrag(); } }, ico('grip-vertical'));
    const dot = h('span', { class: 'tn-dot' + (band ? '' : ' none'), style: band ? { background: `var(--c-${sec.bg})` } : {} });
    const node = h('div', { class: 'tn-sec' });
    node.append(dropOn(row(`sec:${si}`, 'sec-row', [grip, dot, h('strong', { class: 'tn-lab', textContent: sec.title || 'Section sans titre' }), h('span', { class: 'tn-sub', textContent: String(sec.subs.length) }), tog(key)]), { kind: 'sec', si }));
    if (!closed) {
      const body = h('div', { class: 'tn-body' });
      sec.subs.forEach((sub, bi) => {
        const sk = sub.id || `sub${si}${bi}`, sClosed = collapsed.has(sk), subCard = h('div', { class: 'tn-subcard' });
        subCard.append(dropOn(row(`sub:${si}:${bi}`, 'sub-row', [gripFor({ kind: 'sub', si, bi }), ico('columns'), h('span', { class: 'tn-lab', textContent: sub.title || 'Sous-section' }), h('span', { class: 'tn-sub', textContent: sub.layout }), tog(sk)]), { kind: 'sub', si, bi }));
        if (!sClosed) sub.cols.forEach((col, ci) => subCard.append(dropOn(row(`col:${si}:${bi}:${ci}`, 'col-row', [gripFor({ kind: 'col', si, bi, ci }), ico(ICON[col.type] || 'text-size'), h('span', { class: 'tn-lab', textContent: colLabel(col) })]), { kind: 'col', si, bi, ci })));
        body.append(subCard);
      });
      body.append(add('Sous-section', () => { sec.subs.push(newSub('1')); }));
      node.append(body);
    }
    node.addEventListener('dragover', ev => {
      if (dragFrom == null) return; ev.preventDefault(); ev.stopPropagation();
      const r = node.getBoundingClientRect(), after = ev.clientY > r.top + Math.min(r.height / 2, 24);
      clearDrop(); node.classList.add(after ? 'drop-after' : 'drop-before'); node.dataset.after = after ? '1' : '';
      const from = dragFrom; preview(`sec:${si}:${after}`, c => `sec:${moveSection(c, from, si, after)}`);
    });
    node.addEventListener('drop', ev => {
      if (dragFrom == null) return; ev.preventDefault(); ev.stopPropagation();
      const from = dragFrom, after = !!node.dataset.after; dragFrom = null; endDrag();
      const ni = moveSection(doc, from, si, after); ctx.restructure(); ctx.select(`sec:${ni}`);
    });
    return node;
  };

  for (const pg of ['recto', 'verso']) {
    const zone = h('div', { class: 'pg-zone' }, h('div', { class: 'pg-head', textContent: pg === 'recto' ? 'Recto' : 'Verso' }));
    if (pg === 'recto') zone.append(h('div', { class: 'tn-sec tn-head' }, row('header', 'head-row', [ico('layout-navbar'), h('strong', { class: 'tn-lab', textContent: 'Header' }), h('span', { class: 'tn-sub', textContent: strip(doc.header.title).slice(0, 18) })])));
    let n = 0;
    doc.sections.forEach((sec, si) => { if (sec.page === pg) { zone.append(secNode(sec, si)); n++; } });
    if (!n) zone.append(h('div', { class: 'hint', textContent: 'Aucune section — glissez-en une ici.' }));
    zone.append(add('Section', () => { doc.sections.push(newSection(pg)); }));
    zone.addEventListener('dragover', ev => { if (dragFrom == null) return; ev.preventDefault(); clearDrop(); zone.classList.add('drop-zone'); const from = dragFrom; preview(`page:${pg}`, c => `sec:${moveSection(c, from, null, false, pg)}`); });
    zone.addEventListener('drop', ev => { if (dragFrom == null) return; ev.preventDefault(); const from = dragFrom; dragFrom = null; endDrag(); const ni = moveSection(doc, from, null, false, pg); ctx.restructure(); ctx.select(`sec:${ni}`); });
    root.append(zone);
  }
}
