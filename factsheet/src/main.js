import { PAGE } from './tokens.js';
import { loadDoc, saveDoc, migrate, defaultDoc, moveSection } from './state.js';
import { renderDocument, measure, h } from './render.js';
import { buildTree } from './tree.js';
import { buildProps } from './props.js';
import { openVizEditor } from './vizeditor.js';
import { initHover } from './hover.js';
import { EXPORT_MODES, preparePrint, cleanupPrint } from './export.js';

let doc = loadDoc();
let selected = null;
const collapsed = new Set();
const treeEl = document.getElementById('tree'), propsEl = document.getElementById('props');
const stage = document.getElementById('stage');
const gauges = document.getElementById('gauges');
const warnEl = document.getElementById('warnings');
const zoomSel = document.getElementById('zoom');
let raf = 0, hover = null;

function scaleValue() {
  if (zoomSel.value !== 'fit') return parseFloat(zoomSel.value);
  const avail = stage.clientWidth - 44;
  return Math.max(0.4, Math.min(1, (avail - 24) / (2 * PAGE.w)));
}

function drawPreview() {
  const sc = scaleValue();
  const r = renderDocument(doc);
  stage.innerHTML = '';
  r.pages.forEach(p => {
    const wrap = h('div', { class: 'pwrap', style: { width: PAGE.w * sc + 'px', height: PAGE.h * sc + 'px' } },
      h('span', { class: 'tag', textContent: p.key }),
      h('div', { class: 'pscale', style: { transform: `scale(${sc})` } }, p.el));
    stage.append(wrap);
  });
  measure(r);
  gauges.innerHTML = '';
  r.pages.forEach(p => {
    const pct = Math.min(100, Math.round(p.used / p.max * 100));
    gauges.append(h('div', { class: 'gauge' + (p.overflow ? ' over' : '') },
      h('span', { textContent: p.key === 'recto' ? 'Recto' : 'Verso' }),
      h('i', {}, h('b', { style: { width: pct + '%' } })),
      h('span', { textContent: Math.round(p.used / p.max * 100) + ' %' })));
  });
  warnEl.innerHTML = '';
  r.warnings.forEach(w => warnEl.append(h('div', { textContent: w })));
  if (hover) hover.hide();
  if (selected) stage.querySelectorAll(`[data-sel="${selected}"]`).forEach(n => n.classList.add('is-sel'));
}
const schedule = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(drawPreview); };

const pathOk = p => { if (!p) return true; const q = p.split(':'), sec = doc.sections[+q[1]];
  if (q[0] === 'header') return true; if (!sec) return false; if (q[0] === 'sec') return true;
  const sub = sec.subs[+q[2]]; if (!sub) return false; return q[0] === 'sub' || !!sub.cols[+q[3]]; };
const parentOf = p => { const q = p.split(':'); return q[0] === 'col' ? `sub:${q[1]}:${q[2]}` : q[0] === 'sub' ? `sec:${q[1]}` : null; };
function fixSelection() { while (selected && !pathOk(selected)) selected = parentOf(selected); }
function drawTree() { const top = treeEl.scrollTop; buildTree(treeEl, ctx); treeEl.scrollTop = top; }
function drawProps() { const top = propsEl.scrollTop; buildProps(propsEl, ctx); propsEl.scrollTop = top; }

const ctx = {
  getDoc: () => doc, getSel: () => selected, collapsed,
  changed() { saveDoc(doc); schedule(); drawTree(); },
  refreshTree: drawTree,
  restructure() { fixSelection(); saveDoc(doc); drawTree(); drawProps(); schedule(); },
  select(path) {
    selected = path || null; fixSelection(); drawTree(); drawProps(); schedule();
    const n = treeEl.querySelector('.tn.sel'); if (n) n.scrollIntoView({ block: 'nearest' });
  },
  editViz({ col, sub, ci }) {
    const sec = doc.sections.find(x => x.subs.includes(sub));
    openVizEditor({ col, sub, ci, bg: sec && sec.bg, ctx });
  },
};

hover = initHover({ stage, getDoc: () => doc, ctx, canShow: () => !sdrag && !document.body.classList.contains('ve-open') && !document.body.classList.contains('dragging'),
  select: path => ctx.select(path) });

/* Clic dans l'aperçu → sélection (structure à gauche, propriétés à droite) */
stage.addEventListener('click', e => {
  if (suppressClick) { suppressClick = false; return; }
  const n = e.target.closest('[data-sel]');
  ctx.select(n ? n.dataset.sel : null);
});

/* Double-clic sur une dataviz de l'aperçu → éditeur */
stage.addEventListener('dblclick', e => {
  const n = e.target.closest('.col-viz[data-sel]'); if (!n) return;
  const [, si, bi, ci] = n.dataset.sel.split(':').map(Number);
  const sec = doc.sections[si], sub = sec && sec.subs[bi], col = sub && sub.cols[ci];
  if (col) ctx.editViz({ col, sub, ci });
});

/* Glisser une section par son titre : réordonner, ou passer d'une page à l'autre */
let sdrag = null, suppressClick = false;
stage.addEventListener('pointerdown', e => {
  if (e.button !== 0) return;
  const t = e.target.closest('.sec-title'); if (!t) return;
  const sec = t.closest('.sec');
  sdrag = { si: +sec.dataset.sel.split(':')[1], x: e.clientX, y: e.clientY, active: false, el: sec, target: null };
});
function dropTarget(x, y) {
  for (const page of stage.querySelectorAll('.page')) {
    const pr = page.getBoundingClientRect();
    if (x < pr.left || x > pr.right || y < pr.top || y > pr.bottom) continue;
    const secs = [...page.querySelectorAll('.sec')].filter(s => s !== sdrag.el);
    const key = page.dataset.page;
    for (const s of secs) { const r = s.getBoundingClientRect(); if (y < r.top + r.height / 2) return { page: key, si: +s.dataset.sel.split(':')[1], after: false, y: r.top - 2 }; }
    if (secs.length) { const last = secs[secs.length - 1], r = last.getBoundingClientRect(); return { page: key, si: +last.dataset.sel.split(':')[1], after: true, y: r.bottom + 2, x: r.left, w: r.width }; }
    const c = page.querySelector('.content').getBoundingClientRect();
    return { page: key, si: null, after: false, y: c.top + 2, x: c.left, w: c.width };
  }
  return null;
}
window.addEventListener('pointermove', e => {
  if (!sdrag) return;
  if (!sdrag.active) {
    if (Math.hypot(e.clientX - sdrag.x, e.clientY - sdrag.y) < 6) return;
    sdrag.active = true; document.body.classList.add('dragging'); sdrag.el.classList.add('drag-src');
    sdrag.line = h('div', { class: 'drop-line' }); sdrag.ghost = h('div', { class: 'drag-ghost', textContent: doc.sections[sdrag.si].title || 'Section' });
    document.body.append(sdrag.line, sdrag.ghost);
  }
  sdrag.ghost.style.left = e.clientX + 14 + 'px'; sdrag.ghost.style.top = e.clientY + 10 + 'px';
  const t = sdrag.target = dropTarget(e.clientX, e.clientY);
  if (t) {
    const pr = stage.querySelector(`.page[data-page="${t.page}"]`).getBoundingClientRect();
    const sc = pr.width / PAGE.w, x = pr.left + PAGE.margin * sc, w = pr.width - 2 * PAGE.margin * sc;
    Object.assign(sdrag.line.style, { display: 'block', left: x + 'px', width: w + 'px', top: t.y - 1 + 'px' });
  } else sdrag.line.style.display = 'none';
});
function endSectionDrag() {
  if (!sdrag) return;
  const d = sdrag; sdrag = null;
  if (!d.active) return;
  document.body.classList.remove('dragging'); d.line.remove(); d.ghost.remove();
  suppressClick = true; setTimeout(() => { suppressClick = false; }, 0);
  const t = d.target; if (!t) { schedule(); return; }
  const ni = moveSection(doc, d.si, t.si, t.after, t.page);
  ctx.restructure(); ctx.select(`sec:${ni}`);
}
window.addEventListener('pointerup', endSectionDrag);
window.addEventListener('pointercancel', () => { if (sdrag && sdrag.active) { sdrag.line.remove(); sdrag.ghost.remove(); document.body.classList.remove('dragging'); } sdrag = null; schedule(); });

/* Barre d'outils : projet + impression */
const bar = document.querySelector('.bar');
const file = h('input', { type: 'file', accept: '.json,application/json', hidden: true });
bar.append(
  h('button', { type: 'button', textContent: 'Enregistrer (.json)', onclick: () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' }));
    const a = h('a', { href: url, download: (doc.name || 'factsheet').replace(/[\\/:*?"<>|]+/g, '_') + '.json' });
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
  } }),
  h('button', { type: 'button', textContent: 'Ouvrir…', onclick: () => file.click() }),
  h('button', { type: 'button', class: 'primary', textContent: 'Exporter PDF…', onclick: () => openExport() }),
  file);
file.addEventListener('change', async () => {
  const f = file.files[0]; file.value = ''; if (!f) return;
  try { const j = JSON.parse(await f.text()); if (!Array.isArray(j.sections)) throw 0; doc = migrate(j); selected = null; ctx.restructure(); }
  catch (e) { alert('Fichier de projet invalide.'); }
});

zoomSel.addEventListener('change', schedule);
new ResizeObserver(schedule).observe(stage);

drawTree(); drawProps();
schedule();
(document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(schedule);

/* ---------- Export PDF ---------- */
const dlg = document.getElementById('exportDlg');
let exportMode = 'net';
function openExport() {
  const box = document.getElementById('exportOpts'); box.innerHTML = '';
  for (const [k, o] of Object.entries(EXPORT_MODES)) {
    const r = h('input', { type: 'radio', name: 'xmode', value: k, checked: k === exportMode, onchange: () => { exportMode = k; } });
    box.append(h('label', { class: 'opt' }, r, ' ' + o.label, h('small', { textContent: o.note })));
  }
  dlg.showModal();
}
document.getElementById('exportCancel').addEventListener('click', () => dlg.close());
document.getElementById('exportGo').addEventListener('click', async () => {
  dlg.close();
  const prev = document.title; document.title = (doc.name || 'factsheet') + (exportMode === 'net' ? '' : '-' + exportMode);
  await preparePrint(doc, exportMode);
  const done = () => { cleanupPrint(); document.title = prev; window.removeEventListener('afterprint', done); };
  window.addEventListener('afterprint', done);
  window.print();
});
