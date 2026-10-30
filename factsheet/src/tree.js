/* Colonne de gauche : la structure du document (header, sections, sous-sections, colonnes).
   Clic = sélection (propriétés à droite) · glisser la poignée d'une section = réordonner / changer de page. */
import { h, ico } from './render.js';
import { cssVars, applyVars } from './tokens.js';
import { moveSection, newSection, newSub, COL_TYPES } from './state.js';
import { VIZ_TYPES } from './viz/index.js';

const strip = t => String(t || '').replace(/\*\*|__|~~/g, '').replace(/^[-•]\s+/gm, '').replace(/\s+/g, ' ').trim();
const GLYPH = { text: '¶', image: '▨', viz: '▦' };

function colLabel(col) {
  if (col.type === 'text') return strip(col.text).slice(0, 34) || 'Texte vide';
  if (col.type === 'image') return col.caption ? 'Image · ' + col.caption : 'Image';
  const t = col.viz && VIZ_TYPES[col.viz.kind];
  return 'Dataviz · ' + (t ? t.label : '—');
}

export function buildTree(root, ctx) {
  const doc = ctx.getDoc(), sel = ctx.getSel(), collapsed = ctx.collapsed;
  root.innerHTML = ''; applyVars(root, cssVars(doc.theme, doc.colors));
  const row = (path, depth, kids, extra = '') => h('div', { class: 'tn' + (sel === path ? ' sel' : '') + extra, dataset: { path: path || '' }, style: { paddingLeft: 8 + depth * 14 + 'px' },
    onclick: e => { if (e.target.closest('.grip,.tn-tog,.tn-add')) return; ctx.select(path); } }, ...kids);
  const tog = key => h('span', { class: 'tn-tog', onclick: () => { collapsed.has(key) ? collapsed.delete(key) : collapsed.add(key); ctx.refreshTree(); } }, ico(collapsed.has(key) ? 'chevron-right' : 'chevron-down'));
  const add = (label, fn, depth) => h('button', { type: 'button', class: 'tn-add', textContent: label, style: { marginLeft: 8 + depth * 14 + 'px' }, onclick: () => { fn(); ctx.restructure(); } });

  root.append(row(null, 0, [h('span', { class: 'tn-ico', textContent: '▤' }), h('strong', { textContent: doc.name || 'Document' }), h('span', { class: 'tn-sub', textContent: 'document' })]));

  let dragFrom = null;
  const clearDrop = () => root.querySelectorAll('.drop-before,.drop-after,.drop-zone').forEach(n => n.classList.remove('drop-before', 'drop-after', 'drop-zone'));

  const secNode = (sec, si) => {
    const key = sec.id || 'sec' + si, closed = collapsed.has(key);
    const grip = h('span', { class: 'grip', draggable: true, title: 'Glisser pour réordonner ou changer de page', 
      ondragstart: e => { dragFrom = si; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(si)); },
      ondragend: () => { dragFrom = null; clearDrop(); } }, ico('grip-vertical'));
    const node = h('div', { class: 'tn-sec' }, row(`sec:${si}`, 0, [grip, tog(key), h('span', { class: 'tn-ico', textContent: sec.bg && sec.bg !== 'none' ? '◼' : '◻', style: sec.bg && sec.bg !== 'none' ? { color: `var(--c-${sec.bg})`, textShadow: '0 0 0 #0005', WebkitTextStroke: '1px #0004' } : {} }), h('strong', { textContent: sec.title || 'Section sans titre' })]));
    if (!closed) {
      sec.subs.forEach((sub, bi) => {
        const sk = sub.id || `sub${si}${bi}`, sClosed = collapsed.has(sk);
        node.append(row(`sub:${si}:${bi}`, 1, [tog(sk), h('span', { textContent: sub.title || 'Sous-section' }), h('span', { class: 'tn-sub', textContent: sub.layout })]));
        if (!sClosed) sub.cols.forEach((col, ci) => node.append(row(`col:${si}:${bi}:${ci}`, 2, [h('span', { class: 'tn-ico', textContent: GLYPH[col.type] || '·' }), h('span', { class: 'tn-lab', textContent: colLabel(col) })])));
      });
      node.append(add('+ sous-section', () => { sec.subs.push(newSub('1')); }, 1));
    }
    node.addEventListener('dragover', ev => {
      if (dragFrom == null) return; ev.preventDefault(); ev.stopPropagation();
      const r = node.getBoundingClientRect(), after = ev.clientY > r.top + Math.min(r.height / 2, 24);
      clearDrop(); node.classList.add(after ? 'drop-after' : 'drop-before'); node.dataset.after = after ? '1' : '';
    });
    node.addEventListener('drop', ev => {
      if (dragFrom == null) return; ev.preventDefault(); ev.stopPropagation();
      const from = dragFrom, after = !!node.dataset.after; dragFrom = null; clearDrop();
      const ni = moveSection(doc, from, si, after); ctx.restructure(); ctx.select(`sec:${ni}`);
    });
    return node;
  };

  for (const pg of ['recto', 'verso']) {
    const zone = h('div', { class: 'pg-zone' }, h('div', { class: 'pg-head', textContent: pg === 'recto' ? 'Recto' : 'Verso' }));
    if (pg === 'recto') zone.append(row('header', 0, [h('span', { class: 'tn-ico', textContent: '▬' }), h('strong', { textContent: 'Header' }), h('span', { class: 'tn-sub', textContent: strip(doc.header.title).slice(0, 18) })]));
    let n = 0;
    doc.sections.forEach((sec, si) => { if (sec.page === pg) { zone.append(secNode(sec, si)); n++; } });
    if (!n) zone.append(h('div', { class: 'hint', textContent: 'Aucune section — glissez-en une ici.' }));
    zone.append(add('+ section', () => { doc.sections.push(newSection(pg)); }, 0));
    zone.addEventListener('dragover', ev => { if (dragFrom == null) return; ev.preventDefault(); clearDrop(); zone.classList.add('drop-zone'); });
    zone.addEventListener('drop', ev => { if (dragFrom == null) return; ev.preventDefault(); const from = dragFrom; dragFrom = null; clearDrop(); const ni = moveSection(doc, from, null, false, pg); ctx.restructure(); ctx.select(`sec:${ni}`); });
    root.append(zone);
  }
}
