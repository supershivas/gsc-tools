import { PAGE, cssVars, applyVars, DENSITIES } from './tokens.js';
import { loadDoc, saveDoc, migrate, defaultDoc, blankDoc, moveSection, moveSub, storage, localImageCount, swapCols, removeCol } from './state.js';
import { renderDocument, measure, h, columnWidth } from './render.js';
import { buildTree } from './tree.js';
import { buildProps } from './props.js';
import { openVizEditor } from './vizeditor.js';
import { initHover } from './hover.js';
import { EXPORT_MODES, preparePrint, cleanupPrint } from './export.js';
import { t, initI18n, getLang, LANGS } from './i18n.js';
import { rasterizeDocument } from './raster.js';

let doc = loadDoc();
let selected = null;
const collapsed = new Set();
const treeEl = document.getElementById('tree'), propsEl = document.getElementById('props');
const stage = document.getElementById('stage');
const gauges = document.getElementById('gauges');
const warnEl = document.getElementById('warnings');
let zoomMode = 'fit', showSpacing = false;
let raf = 0, hover = null, undoSnap = null;
let previewDoc = null, previewMark = null;   // glisser-déposer : document candidat dessiné pendant le geste

function scaleValue() {
  if (zoomMode !== 'fit') return parseFloat(zoomMode);
  const avail = stage.clientWidth - 44;
  return Math.max(0.4, Math.min(1, (avail - 24) / (2 * PAGE.w)));
}

function drawPreview() {
  const sc = scaleValue();
  const r = renderDocument(previewDoc || doc);
  stage.innerHTML = '';
  r.pages.forEach(p => {
    const wrap = h('div', { class: 'pwrap', style: { width: PAGE.w * sc + 'px', height: PAGE.h * sc + 'px' } },
      h('span', { class: 'tag', textContent: p.key }),
      h('div', { class: 'pscale', style: { transform: `scale(${sc})` } }, p.el));
    stage.append(wrap);
  });
  measure(r);
  drawSpacing();
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
  if (undoSnap) warnEl.append(h('div', { class: 'note moved' }, h('span', { textContent: undoSnap.label }), h('button', { type: 'button', class: 'mini', textContent: undoSnap.undoLabel, onclick: undo })));
  const nLocal = localImageCount(doc);
  if (nLocal) warnEl.append(h('a', { class: 'note', href: 'atelier.html', textContent: nLocal === 1 ? '1 image à publier — ouvrir l’Atelier' : `${nLocal} images à publier — ouvrir l’Atelier` }));
  if (!storage.ok) warnEl.append(h('div', { textContent: 'Espace de stockage du navigateur plein : les dernières modifications ne sont pas enregistrées. Enregistrez le projet (.json) et allégez les images.' }));
  if (hover) hover.hide();
  if (previewDoc) { if (previewMark) stage.querySelectorAll(`[data-sel="${previewMark}"]`).forEach(n => n.classList.add('drag-live')); }
  else if (selected) stage.querySelectorAll(`[data-sel="${selected}"]`).forEach(n => n.classList.add('is-sel'));
}
/* Marges et espaces : filigrane coloré par-dessus l'aperçu (hors des pages, donc jamais exporté) */
const SPACING_KINDS = { margin: 'Marges de page', sec: 'Entre sections', sub: 'Entre sous-sections', col: 'Entre colonnes' };
function drawSpacing() {
  if (!showSpacing) return;
  stage.querySelectorAll('.pwrap').forEach(w => {
    const page = w.querySelector('.page'); if (!page) return;
    const wr = w.getBoundingClientRect(), sc = wr.width / PAGE.w, layer = h('div', { class: 'sp-layer' });
    const rel = el => { const r = el.getBoundingClientRect(); return { l: r.left - wr.left, t: r.top - wr.top, r: r.right - wr.left, b: r.bottom - wr.top }; };
    const add = (l, t, wd, ht, kind) => { if (wd < 1 || ht < 1) return; const px = Math.round((kind === 'col' ? wd : kind === 'margin' ? Math.min(wd, ht) : ht) / sc); layer.append(h('div', { class: 'sp sp-' + kind, style: { left: l + 'px', top: t + 'px', width: wd + 'px', height: ht + 'px' } }, wd >= 14 && ht >= 12 || kind === 'col' && ht >= 12 ? h('span', { textContent: String(px) }) : null)); };
    const m = PAGE.margin * sc, W = wr.width, H = wr.height, hd = page.querySelector('.hd'), top0 = hd ? rel(hd).b : 0;
    const secs = [...page.querySelectorAll('.content > .sec')];
    add(0, top0, m, H - top0, 'margin'); add(W - m, top0, m, H - top0, 'margin'); add(m, H - PAGE.marginBottom * sc, W - 2 * m, PAGE.marginBottom * sc, 'margin');
    if (secs.length) add(m, top0, W - 2 * m, rel(secs[0]).t - top0, 'margin');
    secs.forEach((sec, i) => {
      if (i) add(m, rel(secs[i - 1]).b, W - 2 * m, rel(sec).t - rel(secs[i - 1]).b, 'sec');
      const subs = [...sec.querySelectorAll('.sub')].filter(x => x.closest('.sec') === sec);
      subs.forEach((sb, j) => { if (j) { const a = rel(subs[j - 1]), b = rel(sb); add(b.l, a.b, b.r - b.l, b.t - a.b, 'sub'); } });
    });
    page.querySelectorAll('.cols').forEach(cols => {
      const ch = [...cols.children].filter(x => x.dataset && x.dataset.sel), cr = rel(cols);
      ch.forEach((c, j) => { if (j) add(rel(ch[j - 1]).r, cr.t, rel(c).l - rel(ch[j - 1]).r, cr.b - cr.t, 'col'); });
    });
    w.append(layer);
  });
  warnEl.append(h('div', { class: 'note sp-legend' }, Object.entries(SPACING_KINDS).map(([k, l]) => h('span', {}, h('i', { class: 'sp-' + k }), t(l)))));
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
  changed() { undoSnap = null; saveDoc(doc); schedule(); drawTree(); const v = cssVars(doc.theme, doc.colors); applyVars(propsEl, v); applyVars(treeEl, v); },
  refreshProps: drawProps,
  shown: () => previewDoc || doc,
  /* Aperçu en direct d'un déplacement : `fn(copie)` l'applique à une copie du document et renvoie le chemin à repérer ; null = retour au vrai document */
  preview(fn) {
    if (!fn) { if (previewDoc) { previewDoc = null; previewMark = null; schedule(); } return; }
    const c = JSON.parse(JSON.stringify(doc)); previewMark = fn(c); previewDoc = c; schedule();
  },
  refreshTree: drawTree,
  /* Déplacement de contenu : `fn` modifie le document et renvoie le chemin à sélectionner ensuite.
     L'état d'avant est gardé pour « Annuler le déplacement » (jusqu'à la prochaine modification). */
  moved(fn, label = 'Contenu déplacé. Vérifiez le remplissage des pages.', undoLabel = 'Annuler le déplacement') {
    const snap = JSON.stringify(doc), to = fn();
    undoSnap = { snap, label, undoLabel }; selected = to || null; ctx.restructure(); ctx.select(selected);
  },
  /* Supprime l'élément sélectionné (section, sous-section ou colonne) — annulable */
  remove(path) {
    const q = String(path || '').split(':'), si = +q[1], bi = +q[2], ci = +q[3], sec = doc.sections[si], sub = sec && sec.subs[bi];
    if (q[0] === 'sec' && sec) ctx.moved(() => { doc.sections.splice(si, 1); return null; }, 'Élément supprimé.', 'Annuler la suppression');
    else if (q[0] === 'sub' && sub) ctx.moved(() => { sec.subs.splice(bi, 1); return `sec:${si}`; }, 'Élément supprimé.', 'Annuler la suppression');
    else if (q[0] === 'col' && sub && sub.cols[ci]) ctx.moved(() => removeCol(doc, si, bi, ci), sub.cols.length > 1 ? 'Colonne supprimée : les autres s’étendent.' : 'Élément supprimé.', 'Annuler la suppression');
  },
  restructure() { fixSelection(); saveDoc(doc); drawTree(); drawProps(); schedule(); },
  select(path) {
    selected = path || null; fixSelection(); drawTree(); drawProps(); schedule();
    const n = treeEl.querySelector('.tn.sel'); if (n) n.scrollIntoView({ block: 'nearest' });
  },
  editViz({ col, sub, ci }) {
    const sec = doc.sections.find(x => x.subs.includes(sub));
    openVizEditor({ col, sub, ci, bg: sec && sec.bg, width: columnWidth(doc, doc.sections.indexOf(sec), sec.subs.indexOf(sub), ci), ctx });
  },
};

function undo() {
  if (!undoSnap) return;
  doc = migrate(JSON.parse(undoSnap.snap)); undoSnap = null; selected = null; ctx.restructure();
}
/* Suppr / Retour arrière : supprime l'élément sélectionné, sauf pendant une saisie ou quand une fenêtre est ouverte */
window.addEventListener('keydown', e => {
  if (e.key !== 'Delete' && e.key !== 'Backspace') return;
  const a = document.activeElement, tag = (e.target.tagName || '');
  if (/INPUT|TEXTAREA|SELECT/.test(tag) || e.target.isContentEditable || (a && a.isContentEditable)) return;
  if (document.querySelector('dialog[open], .ve, .v3d, .ce') || !selected || selected === 'header') return;
  e.preventDefault(); ctx.remove(selected);
});

hover = initHover({ stage, getDoc: () => doc, ctx, canShow: () => !drag && !document.body.classList.contains('ve-open') && !document.body.classList.contains('dragging'),
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

/* ---------- Glisser-déposer dans l'aperçu, avec aperçu en direct ----------
   Pendant le geste, une copie du document avec le déplacement appliqué est dessinée à la place du vrai (jauges et
   avertissements compris) ; relâcher valide (annulable), Échap annule. Les cibles sont désignées par identifiant,
   donc valables dans la copie comme dans le vrai document. */
let drag = null, suppressClick = false;
const secIdx = (d, id) => d.sections.findIndex(x => x.id === id);
const subIdx = (d, id) => { for (let si = 0; si < d.sections.length; si++) { const bi = d.sections[si].subs.findIndex(x => x.id === id); if (bi >= 0) return { si, bi }; } return null; };
const secOf = el => +el.dataset.sel.split(':')[1];

/* Section : on cherche, parmi les autres sections de la page visée, celle devant laquelle on se trouve */
function secTarget(e) {
  const sd = ctx.shown(), dg = drag;
  for (const page of stage.querySelectorAll('.page')) {
    const pr = page.getBoundingClientRect();
    if (e.clientX < pr.left || e.clientX > pr.right || e.clientY < pr.top || e.clientY > pr.bottom) continue;
    const key = page.dataset.page, id = el => sd.sections[secOf(el)].id;
    const secs = [...page.querySelectorAll('.sec')].filter(x => id(x) !== dg.id);
    const mk = (ref, after) => ({ key: [key, ref, after], apply: c => { const ni = moveSection(c, secIdx(c, dg.id), ref == null ? null : secIdx(c, ref), after, key); return `sec:${ni}`; } });
    for (const x of secs) { const r = x.getBoundingClientRect(); if (e.clientY < r.top + r.height / 2) return mk(id(x), false); }
    return secs.length ? mk(id(secs[secs.length - 1]), true) : mk(null, false);
  }
  return null;
}
/* Sous-section : la section visée est celle sous le pointeur (la plus proche sinon), puis la sous-section devant laquelle on se trouve */
function subTarget(e) {
  const sd = ctx.shown(), dg = drag;
  for (const page of stage.querySelectorAll('.page')) {
    const pr = page.getBoundingClientRect();
    if (e.clientX < pr.left || e.clientX > pr.right || e.clientY < pr.top || e.clientY > pr.bottom) continue;
    const secs = [...page.querySelectorAll('.sec')]; if (!secs.length) return null;
    let sec = secs.find(x => { const r = x.getBoundingClientRect(); return e.clientY >= r.top && e.clientY <= r.bottom; });
    if (!sec) sec = e.clientY < secs[0].getBoundingClientRect().top ? secs[0] : secs[secs.length - 1];
    const sid = sd.sections[secOf(sec)].id, subs = [...sec.querySelectorAll('.sub[data-sel]')].filter(x => { const q = x.dataset.sel.split(':'); return sd.sections[+q[1]].subs[+q[2]].id !== dg.id; });
    const idOf = el => { const q = el.dataset.sel.split(':'); return sd.sections[+q[1]].subs[+q[2]].id; };
    const mk = (ref, after) => ({ key: [sid, ref, after], apply: c => { const from = subIdx(c, dg.id), si = secIdx(c, sid), n = moveSub(c, from, { si, bi: ref == null ? null : subIdx(c, ref).bi }, after); return `sub:${n.si}:${n.bi}`; } });
    for (const x of subs) { const r = x.getBoundingClientRect(); if (e.clientY < r.top + r.height / 2) return mk(idOf(x), false); }
    return subs.length ? mk(idOf(subs[subs.length - 1]), true) : mk(null, false);
  }
  return null;
}
/* Colonne : toute la hauteur de la rangée compte, pas seulement le contenu (une colonne courte reste visée sur toute sa cellule) */
function colTarget(e) {
  const dg = drag;
  for (const sub of stage.querySelectorAll('.sub[data-sel]')) {
    const cols = sub.querySelector(':scope > .cols'); if (!cols) continue;
    const r = cols.getBoundingClientRect();
    if (e.clientY < r.top || e.clientY > r.bottom || e.clientX < r.left || e.clientX > r.right) continue;
    const list = [...cols.children].filter(x => x.dataset && x.dataset.sel);
    const hit = list.find(x => { const b = x.getBoundingClientRect(); return e.clientX >= b.left && e.clientX <= b.right; })
      || list.reduce((best, x) => { const b = x.getBoundingClientRect(), d = Math.min(Math.abs(e.clientX - b.left), Math.abs(e.clientX - b.right)); return !best || d < best.d ? { x, d } : best; }, null).x;
    const [, si, bi, ci] = hit.dataset.sel.split(':').map(Number);
    if (si === dg.from.si && bi === dg.from.bi && ci === dg.from.ci) return null;
    return { key: [si, bi, ci], apply: c => { swapCols(c, dg.from, { si, bi, ci }); return `col:${si}:${bi}:${ci}`; } };
  }
  return null;
}
const TARGETS = { sec: secTarget, sub: subTarget, col: colTarget };
const dragLabel = () => drag.kind === 'sec' ? (doc.sections[secIdx(doc, drag.id)] || {}).title || 'Section' : drag.kind === 'sub' ? (() => { const p = subIdx(doc, drag.id); return (p && doc.sections[p.si].subs[p.bi].title) || 'Sous-section'; })() : 'Contenu';
function dragActivate() {
  drag.active = true; hover.hide(); document.body.classList.add('dragging');
  drag.ghost = h('div', { class: 'drag-ghost', textContent: dragLabel() }); document.body.append(drag.ghost);
}
function dragEnd(commit) {
  if (!drag) return; const d = drag; drag = null;
  if (!d.active) return;
  d.ghost.remove(); document.body.classList.remove('dragging'); ctx.preview(null);
  suppressClick = true; setTimeout(() => { suppressClick = false; }, 0);
  if (commit && d.drop) ctx.moved(() => d.drop.apply(doc)); else schedule();
}
window.addEventListener('pointermove', e => {
  if (!drag) return;
  if (!drag.active) { if (!drag.pending || Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 6) return; dragActivate(); }
  drag.ghost.style.left = e.clientX + 14 + 'px'; drag.ghost.style.top = e.clientY + 10 + 'px';
  const t = TARGETS[drag.kind](e), key = t ? JSON.stringify(t.key) : '';
  if (key === drag.key) return;
  drag.key = key; drag.drop = t;
  ctx.preview(t ? t.apply : null);
});
window.addEventListener('pointerup', () => dragEnd(true));
window.addEventListener('pointercancel', () => dragEnd(false));
window.addEventListener('keydown', e => { if (e.key === 'Escape') dragEnd(false); });
/* Le titre d'une section ou d'une sous-section sert de poignée (seuil de 6 px pour ne pas gêner le clic) */
stage.addEventListener('pointerdown', e => {
  if (e.button !== 0) return;
  const st = e.target.closest('.sec-title'), bt = e.target.closest('.sub-title'), n = st || bt; if (!n) return;
  const el = n.closest(st ? '.sec' : '.sub'), q = el.dataset.sel.split(':').map(Number);
  drag = { kind: st ? 'sec' : 'sub', id: st ? doc.sections[q[1]].id : doc.sections[q[1]].subs[q[2]].id, x: e.clientX, y: e.clientY, pending: true, active: false };
});
/* Poignées de la barre au survol : le geste commence tout de suite */
ctx.startColDrag = (e, from) => { drag = { kind: 'col', from, x: e.clientX, y: e.clientY, pending: true, active: false }; };
ctx.startSubDrag = (e, from) => { drag = { kind: 'sub', id: doc.sections[from.si].subs[from.bi].id, x: e.clientX, y: e.clientY, pending: true, active: false }; };

/* Fichier / Affichage : menus de l'en-tête (rendus par js/shell.js) ; la langue est dans les réglages */
const newBlank = () => {
  if (!confirm(t('Créer une factsheet vierge ? Le document actuel sera remplacé : enregistrez-le d’abord (.json) si besoin.'))) return;
  doc = blankDoc(); selected = null; undoSnap = null; ctx.restructure();
};
const file = h('input', { type: 'file', accept: '.json,application/json', hidden: true });
document.body.append(file);
const saveProject = () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' }));
  const a = h('a', { href: url, download: (doc.name || 'factsheet').replace(/[\\/:*?"<>|]+/g, '_') + '.json' });
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
};
file.addEventListener('change', async () => {
  const f = file.files[0]; file.value = ''; if (!f) return;
  try { const j = JSON.parse(await f.text()); if (!Array.isArray(j.sections)) throw 0; doc = migrate(j); selected = null; ctx.restructure(); }
  catch (e) { alert(t('Fichier de projet invalide.')); }
});

document.addEventListener('fs-natural', () => { saveDoc(doc); schedule(); });   // proportions d'une image « ajustée » connues après chargement

/* Langue de l'interface (anglais par défaut) */
const langSel = h('select', { 'aria-label': 'Langue' }, Object.entries(LANGS).map(([k, l]) => h('option', { value: k, textContent: l })));
langSel.value = getLang();
const i18n = initI18n(() => ctx.restructure());
langSel.addEventListener('change', () => i18n.set(langSel.value));

const zoomItem = (label, v) => ({ label, checked: () => zoomMode === v, run: () => { zoomMode = v; schedule(); } });
window.FS_UI = {
  menus: [
    { label: 'Fichier', items: [
      { label: 'Nouvelle factsheet vierge', icon: 'file-plus', run: newBlank },
      { label: 'Enregistrer (.json)', icon: 'device-floppy', run: saveProject },
      { label: 'Ouvrir…', icon: 'folder-open', run: () => file.click() },
      { label: 'Exporter PDF…', icon: 'file-type-pdf', run: () => openExport() },
      '-',
      { label: 'Atelier', icon: 'brush', href: 'atelier.html' }] },
    { label: 'Affichage', items: [
      { heading: 'Zoom' }, zoomItem('Ajuster', 'fit'), zoomItem('50 %', '0.5'), zoomItem('75 %', '0.75'), zoomItem('100 %', '1'),
      '-',
      { heading: 'Espacement' },
      { label: 'Marges et espaces', icon: 'ruler-measure', checked: () => showSpacing, run: () => { showSpacing = !showSpacing; schedule(); } },
      ...Object.entries(DENSITIES).map(([k, d]) => ({ label: `${d.label} — ${Math.round(d.f * 100)} %`, checked: () => (doc.density || 'normal') === k, run: () => { doc.density = k; ctx.restructure(); } })),
      '-',
      { label: 'Aperçu 3D', icon: '3d-cube-sphere', run: () => open3d() }] },
  ],
  settings: [{ title: 'Langue', node: langSel }],
};

/* Aperçu 3D : les pages sont dessinées ici, la scène three.js est dans viewer3d.js (chargé à la première ouverture) */
let viewerLoad = null;
const loadViewer = () => window.FS3D ? Promise.resolve(window.FS3D) : (viewerLoad = viewerLoad || new Promise((res, rej) => {
  const s = h('script', { src: 'viewer3d.js', onload: () => res(window.FS3D), onerror: () => { viewerLoad = null; rej(new Error('viewer3d')); } });
  document.head.append(s);
}));
async function open3d() {
  hover.hide();
  let viewer;
  try { viewer = await loadViewer(); } catch (e) { alert(t('Impossible de générer l’aperçu 3D dans ce navigateur.')); return; }
  viewer.open({
    labels: { title: t('Aperçu 3D du document'), loading: t('Préparation de l’aperçu…'), flip: t('Retourner'), spread: t('Deux pages'), single: t('Une feuille'),
      reset: t('Recentrer'), close: t('Fermer'), hint: t('Clic gauche : tourner · clic droit : déplacer · molette : zoomer'), error: t('Impossible de générer l’aperçu 3D dans ce navigateur.'), noWebgl: t('WebGL indisponible.') },
    load: () => rasterizeDocument(doc, 2),
  });
}
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
