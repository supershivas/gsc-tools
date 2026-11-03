import { PAGE, cssVars, applyVars, DENSITIES } from './tokens.js';
import { openPalette } from './palette.js';
import { loadDoc, saveDoc, migrate, defaultDoc, blankDoc, LOCALES, moveSection, moveSub, storage, localImageCount, swapCols, removeCol } from './state.js';
import { renderDocument, measure, h, ico, columnWidth } from './render.js';
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
  const sc = scaleValue(), sx = stage.scrollLeft, sy = stage.scrollTop;
  const r = renderDocument(previewDoc || doc);
  stage.innerHTML = '';
  r.pages.forEach(p => {
    const wrap = h('div', { class: 'pwrap', style: { width: PAGE.w * sc + 'px', height: PAGE.h * sc + 'px' } },
      h('span', { class: 'tag', textContent: p.key }),
      h('div', { class: 'pscale', style: { transform: `scale(${sc})` } }, p.el));
    stage.append(wrap);
  });
  stage.scrollLeft = sx; stage.scrollTop = sy;   // une retouche ne doit jamais faire sauter la page
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
  const nLocal = localImageCount(doc);
  if (nLocal) warnEl.append(h('a', { class: 'note', href: 'atelier.html', textContent: nLocal === 1 ? '1 image à publier — ouvrir l’Atelier' : `${nLocal} images à publier — ouvrir l’Atelier` }));
  if (!storage.ok) warnEl.append(h('div', { textContent: 'Espace de stockage du navigateur plein : les dernières modifications ne sont pas enregistrées. Enregistrez le projet (.json) et allégez les images.' }));
  if (hover) hover.hide();
  if (previewDoc && previewMark) stage.querySelectorAll(`[data-sel="${previewMark}"]`).forEach(n => n.classList.add('drag-live'));
  drawSelection(); watchLayout();
}
/* Cadre de sélection : superposé à l'aperçu (pas recadré par le bord de page) ; une section est encadrée à la largeur des marges.
   L'animation d'apparition (SEL_STYLE, voir le Labo) ne joue que quand la sélection change, pas à chaque retouche. */
const SEL_STYLE = 'halo', SEL_GAP = 3;   // variante retenue au Labo ; 3 px d'air entre le contenu et le cadre
let selShown = null;
function drawSelection() {
  stage.querySelectorAll('.sel-layer').forEach(n => n.remove());
  if (!selected || previewDoc) return;
  const fresh = selShown !== selected; selShown = selected;
  stage.querySelectorAll('.pwrap').forEach(w => {
    const el = w.querySelector(`.page [data-sel="${selected}"]`); if (!el) return;
    const wr = w.getBoundingClientRect(), r = el.getBoundingClientRect(), gx = selected.startsWith('sec:') ? 0 : SEL_GAP;   // une section est encadrée sur toute sa largeur, marges comprises
    w.append(h('div', { class: 'sel-layer' }, h('div', { class: `sel-frame v-${SEL_STYLE}` + (fresh ? ' pop' : ''),
      style: { left: r.left - wr.left - gx + 'px', top: r.top - wr.top - SEL_GAP + 'px', width: r.width + 2 * gx + 'px', height: r.height + 2 * SEL_GAP + 'px' } })));
  });
}
/* La mise en page peut bouger après coup (polices, images) : filigrane et cadre suivent */
let layRaf = 0;
const layoutObs = new ResizeObserver(() => { cancelAnimationFrame(layRaf); layRaf = requestAnimationFrame(() => { drawSpacing(); drawSelection(); }); });
const watchLayout = () => { layoutObs.disconnect(); stage.querySelectorAll('.page .content, .page .hd').forEach(c => layoutObs.observe(c)); };

/* Marges et espaces : filigrane coloré par-dessus l'aperçu (hors des pages, donc jamais exporté) */
const legendEl = h('div', { class: 'sp-legend' });
const spToggle = h('button', { type: 'button', class: 'sp-toggle', title: t('Marges et espaces'), 'aria-pressed': 'false', onclick: () => { showSpacing = !showSpacing; schedule(); syncSpacingCtl(); } }, ico('ruler-measure'), h('span', { textContent: t('Marges et espaces') }));
const densBtns = Object.entries(DENSITIES).map(([k, d]) => h('button', { type: 'button', title: `${t(d.label)} — ${Math.round(d.f * 100)} %`, onclick: () => { doc.density = k; ctx.restructure(); syncSpacingCtl(); } }, d.label));
function syncSpacingCtl() {
  spToggle.classList.toggle('on', showSpacing); spToggle.setAttribute('aria-pressed', String(showSpacing));
  Object.keys(DENSITIES).forEach((k, i) => densBtns[i].classList.toggle('on', (doc.density || 'normal') === k));
}
document.querySelector('.bar').append(h('div', { class: 'sp-ctl' }, spToggle, h('div', { class: 'seg', role: 'group', 'aria-label': t('Espacement') }, densBtns)), legendEl);   // dans la barre (taille fixe) : ne déplace jamais l'aperçu
const SPACING_KINDS = { margin: 'Marges', sec: 'Sections', sub: 'Sous-sections', col: 'Colonnes' };
function drawSpacing() {
  stage.querySelectorAll('.sp-layer').forEach(n => n.remove()); legendEl.replaceChildren();
  if (!showSpacing) return;   // la mise en page peut bouger après coup (polices, images) : le filigrane suit
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
  legendEl.replaceChildren(...Object.entries(SPACING_KINDS).map(([k, l]) => h('span', {}, h('i', { class: 'sp-' + k }), t(l))));
}
/* Petit message en bas à gauche (déplacement, suppression) avec « Annuler » ; disparaît seul */
let noteTimer = 0;
function noteToast(label, undoLabel) {
  document.querySelectorAll('.fs-toast').forEach(n => n.remove()); clearTimeout(noteTimer);
  const el = h('div', { class: 'fs-toast', role: 'status' }, h('span', { textContent: t(label) }), h('button', { type: 'button', textContent: t(undoLabel), onclick: () => { el.remove(); undo(); } }));
  document.body.append(el); noteTimer = setTimeout(() => el.remove(), 6000);
}

/* ---------- Historique (annuler / rétablir) ----------
   Un instantané du document après chaque modification ; la frappe est regroupée (1 s). Les images en data URL sont
   remplacées par un numéro dans les instantanés pour ne pas multiplier les mégaoctets. */
const HIST = { stack: [], meta: [], i: -1, at: 0, burst: false, applying: false, max: 100 };
const imgIds = new Map(), imgById = [];
const tokenOf = v => { let n = imgIds.get(v); if (n == null) { n = imgById.length; imgById.push(v); imgIds.set(v, n); } return `\u0001img${n}`; };
const snapshot = () => JSON.stringify(doc, (k, v) => (typeof v === 'string' && v.length > 300 && v.startsWith('data:') ? tokenOf(v) : v));
const restore = str => JSON.parse(str, (k, v) => (typeof v === 'string' && v.startsWith('\u0001img') ? imgById[+v.slice(4)] : v));
/* Libellé d'un pas d'historique : première différence entre l'état précédent et le nouveau, dite en mots */
const FIELDS = { text: 'texte', title: 'titre', subtitle: 'sous-titre', overline: 'surtitre', bg: 'fond', fg: 'couleur du texte', stroke: 'contour', strokeColor: 'couleur du contour', fillColor: 'fond',
  layout: 'colonnes', page: 'page', valign: 'alignement vertical', align: 'alignement', density: 'espacement', locale: 'format des nombres', src: 'image', caption: 'légende', logoVariant: 'logo',
  logos: 'logo', colors: 'couleurs', colorNames: 'noms des couleurs', viz: 'dataviz', card: 'carte', figure: 'chiffre clé', type: 'type de contenu', imageId: 'image', images: 'images', showImage: 'image', showLogo: 'logo', name: 'nom du fichier' };
const firstDiff = (a, b, path = []) => {
  if (a === b) return null;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return { path };
  if (Array.isArray(a) && Array.isArray(b) && a.length !== b.length) return { path, grew: b.length - a.length };
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) { const r = firstDiff(a[k], b[k], [...path, k]); if (r) return r; }
  return null;
};
function describe(prevStr, nextStr) {
  if (prevStr == null) return t('Ouverture du document');
  let d; try { const A = restore(prevStr), B = restore(nextStr); d = firstDiff(A, B); var doc2 = B; } catch (e) { return t('Modification'); }
  if (!d) return t('Modification');
  const p = d.path, name = x => String(x || '').trim().slice(0, 22);
  let where = '', field = '';
  if (p[0] === 'header') { where = t('Header'); field = p[1]; }
  else if (p[0] === 'sections') {
    if (p.length === 1) return d.grew > 0 ? t('Section ajoutée') : d.grew < 0 ? t('Section supprimée') : t('Éléments déplacés');
    const sec = doc2.sections[p[1]]; where = `${t('Section')} « ${name(sec && sec.title)} »`;
    if (p[2] === 'subs') {
      if (p.length === 3) return d.grew > 0 ? t('Sous-section ajoutée') : d.grew < 0 ? t('Sous-section supprimée') : t('Éléments déplacés');
      const sub = sec && sec.subs[p[3]]; where = `${t('Sous-section')} « ${name(sub && sub.title)} »`;
      if (p[4] === 'cols') {
        if (p.length === 5) return d.grew > 0 ? t('Colonne ajoutée') : d.grew < 0 ? t('Colonne supprimée') : t('Éléments déplacés');
        where = `${t('Colonne')} ${+p[5] + 1}`; field = p[6];
      } else field = p[4];
    } else field = p[2];
  } else { where = t('Document'); field = p[0]; }
  if (field === 'id') return t('Éléments déplacés');
  return `${where} · ${FIELDS[field] ? t(FIELDS[field]) : t('réglage')}`;
}
function record(burst) {
  if (HIST.applying) return;
  const sn = snapshot(); if (HIST.i >= 0 && HIST.stack[HIST.i] === sn) return;
  const now = Date.now();
  if (burst && HIST.burst && HIST.i === HIST.stack.length - 1 && HIST.i > 0 && now - HIST.at < 1000) { HIST.stack[HIST.i] = sn; HIST.meta[HIST.i] = { label: describe(HIST.stack[HIST.i - 1], sn), at: HIST.meta[HIST.i].at }; }
  else {
    HIST.stack.length = HIST.i + 1; HIST.meta.length = HIST.i + 1;
    HIST.stack.push(sn); HIST.meta.push({ label: describe(HIST.stack[HIST.i], sn), at: now });
    if (HIST.stack.length > HIST.max) { HIST.stack.shift(); HIST.meta.shift(); }
    HIST.i = HIST.stack.length - 1;
  }
  HIST.at = now; HIST.burst = !!burst; syncCenter();
}
function goTo(i) {
  if (i < 0 || i >= HIST.stack.length) return;
  HIST.i = i; HIST.applying = true;
  try { doc = migrate(restore(HIST.stack[i])); undoSnap = null; ctx.preview(null); ctx.restructure(); } finally { HIST.applying = false; }
  syncCenter();
}
const undo = () => goTo(HIST.i - 1), redo = () => goTo(HIST.i + 1);
const canUndo = () => HIST.i > 0, canRedo = () => HIST.i < HIST.stack.length - 1;

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
  changed() { undoSnap = null; record(true); saveDoc(doc); schedule(); drawTree(); const v = cssVars(doc.theme, doc.colors); applyVars(propsEl, v); applyVars(treeEl, v); },
  refreshProps: drawProps,
  shown: () => previewDoc || doc,
  previewing: () => !!previewDoc,
  previewMark: () => previewMark,
  /* Aperçu en direct d'un déplacement : `fn(copie)` l'applique à une copie du document et renvoie le chemin à repérer ; null = retour au vrai document */
  preview(fn) {
    if (!fn) { if (previewDoc) { previewDoc = null; previewMark = null; schedule(); } return; }
    const c = JSON.parse(JSON.stringify(doc)); previewMark = fn(c); previewDoc = c; schedule();
  },
  refreshTree: drawTree,
  /* Déplacement de contenu : `fn` modifie le document et renvoie le chemin à sélectionner ensuite.
     L'état d'avant est gardé pour « Annuler le déplacement » (jusqu'à la prochaine modification). */
  moved(fn, label = 'Contenu déplacé. Vérifiez le remplissage des pages.', undoLabel = 'Annuler le déplacement') {
    const to = fn();
    selected = to || null; ctx.restructure(); ctx.select(selected); noteToast(label, undoLabel);
  },
  /* Supprime l'élément sélectionné (section, sous-section ou colonne) — annulable */
  remove(path) {
    const q = String(path || '').split(':'), si = +q[1], bi = +q[2], ci = +q[3], sec = doc.sections[si], sub = sec && sec.subs[bi];
    if (q[0] === 'sec' && sec) ctx.moved(() => { doc.sections.splice(si, 1); return null; }, 'Élément supprimé.', 'Annuler la suppression');
    else if (q[0] === 'sub' && sub) ctx.moved(() => { sec.subs.splice(bi, 1); return `sec:${si}`; }, 'Élément supprimé.', 'Annuler la suppression');
    else if (q[0] === 'col' && sub && sub.cols[ci]) ctx.moved(() => removeCol(doc, si, bi, ci), sub.cols.length > 1 ? 'Colonne supprimée : les autres s’étendent.' : 'Élément supprimé.', 'Annuler la suppression');
  },
  restructure() { fixSelection(); record(false); saveDoc(doc); drawTree(); drawProps(); schedule(); },
  select(path) {
    selected = path || null; fixSelection(); drawTree(); drawProps(); schedule();
    const n = treeEl.querySelector('.tn.sel'); if (n) n.scrollIntoView({ block: 'nearest' });
  },
  editViz({ col, sub, ci }) {
    const sec = doc.sections.find(x => x.subs.includes(sub));
    openVizEditor({ col, sub, ci, bg: sec && sec.bg, width: columnWidth(doc, doc.sections.indexOf(sec), sec.subs.indexOf(sub), ci), ctx });
  },
};

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

/* Cmd/Ctrl + molette (ou pincement du pavé tactile) : zoom continu de l'aperçu */
stage.addEventListener('wheel', e => {
  if (!(e.ctrlKey || e.metaKey)) return;
  e.preventDefault();
  zoomMode = String(Math.min(4, Math.max(0.25, scaleValue() * Math.exp(-e.deltaY * 0.002))).toFixed(3)); schedule();
}, { passive: false });

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
const mkSec = (dg, page, ref, after) => ({ key: [page, ref, after], apply: c => `sec:${moveSection(c, secIdx(c, dg.id), ref == null ? null : secIdx(c, ref), after, page)}` });
const mkSub = (dg, sid, ref, after) => ({ key: [sid, ref, after], apply: c => { const n = moveSub(c, subIdx(c, dg.id), { si: secIdx(c, sid), bi: ref == null ? null : subIdx(c, ref).bi }, after); return `sub:${n.si}:${n.bi}`; } });
const mkCol = (dg, si, bi, ci) => ({ key: [si, bi, ci], apply: c => { swapCols(c, dg.from, { si, bi, ci }); return `col:${si}:${bi}:${ci}`; } });

/* Mêmes cibles, lues dans la colonne de gauche (nœuds portant l'identifiant de la section / sous-section) */
const inTree = e => { const r = treeEl.getBoundingClientRect(); return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom; };
function treeSecTarget(e) {
  const dg = drag; if (!inTree(e)) return null;
  for (const z of treeEl.querySelectorAll('.pg-zone[data-page]')) {
    const r = z.getBoundingClientRect(); if (e.clientY < r.top || e.clientY > r.bottom) continue;
    const secs = [...z.querySelectorAll(':scope > .tn-sec[data-sid]')].filter(x => x.dataset.sid !== dg.id);
    for (const x of secs) { const q = x.getBoundingClientRect(); if (e.clientY < q.top + q.height / 2) return mkSec(dg, z.dataset.page, x.dataset.sid, false); }
    return secs.length ? mkSec(dg, z.dataset.page, secs[secs.length - 1].dataset.sid, true) : mkSec(dg, z.dataset.page, null, false);
  }
  return null;
}
function treeSubTarget(e) {
  const dg = drag; if (!inTree(e)) return null;
  const secs = [...treeEl.querySelectorAll('.tn-sec[data-sid]')]; if (!secs.length) return null;
  const sec = secs.find(x => { const r = x.getBoundingClientRect(); return e.clientY >= r.top && e.clientY <= r.bottom; })
    || secs.reduce((b, x) => { const r = x.getBoundingClientRect(), d = Math.min(Math.abs(e.clientY - r.top), Math.abs(e.clientY - r.bottom)); return !b || d < b.d ? { x, d } : b; }, null).x;
  const subs = [...sec.querySelectorAll('.tn-subcard[data-bid]')].filter(x => x.dataset.bid !== dg.id);
  for (const x of subs) { const r = x.getBoundingClientRect(); if (e.clientY < r.top + r.height / 2) return mkSub(dg, sec.dataset.sid, x.dataset.bid, false); }
  return subs.length ? mkSub(dg, sec.dataset.sid, subs[subs.length - 1].dataset.bid, true) : mkSub(dg, sec.dataset.sid, null, false);
}
function treeColTarget(e) {
  const dg = drag, n = document.elementFromPoint(e.clientX, e.clientY), r = n && n.closest && n.closest('.col-row[data-path]'); if (!r) return null;
  const [, si, bi, ci] = r.dataset.path.split(':').map(Number);
  return si === dg.from.si && bi === dg.from.bi && ci === dg.from.ci ? null : mkCol(dg, si, bi, ci);
}
const TARGETS = { sec: secTarget, sub: subTarget, col: colTarget };
const TREE_TARGETS = { sec: treeSecTarget, sub: treeSubTarget, col: treeColTarget };
/* L'élément est « pris » comme un objet : son rendu réel suit le pointeur (surélevé), pendant que le reste de la page se réorganise en direct */
function dragSource() {
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
  drag.active = true; hover.hide(); document.body.classList.add('dragging');
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
  d.ghost.remove(); document.body.classList.remove('dragging'); ctx.preview(null); drawTree();
  suppressClick = true; setTimeout(() => { suppressClick = false; }, 0);
  if (commit && d.drop) ctx.moved(() => d.drop.apply(doc)); else schedule();
}
window.addEventListener('pointermove', e => {
  if (!drag) return;
  if (!drag.active) { if (!drag.pending || Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 6) return; dragActivate(); }
  if (drag.grab) { drag.ghost.style.left = e.clientX - drag.grab.dx + 'px'; drag.ghost.style.top = e.clientY - drag.grab.dy + 'px'; }
  if (drag.tree) { const tr = treeEl.getBoundingClientRect(); if (e.clientY < tr.top + 36) treeEl.scrollTop -= 14; else if (e.clientY > tr.bottom - 36) treeEl.scrollTop += 14; }   // défilement aux bords
  const t = (drag.tree ? TREE_TARGETS : TARGETS)[drag.kind](e), key = t ? JSON.stringify(t.key) : '';
  if (key === drag.key) return;
  drag.key = key; drag.drop = t;
  ctx.preview(t ? t.apply : null); drawTree();   // la page et la structure se réorganisent ensemble
});
window.addEventListener('pointerup', () => dragEnd(true));
window.addEventListener('pointercancel', () => dragEnd(false));
window.addEventListener('keydown', e => { if (e.key === 'Escape') dragEnd(false); });
/* Le titre d'une section ou d'une sous-section sert de poignée (seuil de 6 px pour ne pas gêner le clic) */
stage.addEventListener('pointerdown', e => {
  if (e.button !== 0) return;
  const st = e.target.closest('.sec-title'), bt = e.target.closest('.sub-title'), bg = !st && !bt && (e.target.classList.contains('sec') || e.target.classList.contains('sec-box')) ? e.target.closest('.sec') : null;
  const n = st || bt || bg; if (!n) return;   // titre de section / de sous-section, ou fond de la section (une section sans titre se prend par son fond)
  const el = n.closest(bt ? '.sub' : '.sec'), q = el.dataset.sel.split(':').map(Number);
  drag = { kind: bt ? 'sub' : 'sec', id: bt ? doc.sections[q[1]].subs[q[2]].id : doc.sections[q[1]].id, x: e.clientX, y: e.clientY, pending: true, active: false };
});
/* Poignées de la barre au survol : le geste commence tout de suite */
ctx.startColDrag = (e, from) => { drag = { kind: 'col', from, x: e.clientX, y: e.clientY, pending: true, active: false }; };
ctx.startTreeDrag = (e, d) => { drag = { ...d, tree: true, x: e.clientX, y: e.clientY, pending: true, active: false }; };
ctx.startSecDrag = (e, from) => { drag = { kind: 'sec', id: doc.sections[from.si].id, x: e.clientX, y: e.clientY, pending: true, active: false }; };
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

/* En-tête central : annuler / rétablir et nom du fichier (modifiable) */
const MAC = /Mac|iPhone|iPad/.test(navigator.platform || '');
const MOD = MAC ? '⌘' : 'Ctrl+', SHIFT = MAC ? '⇧' : 'Shift+';
const undoBtn = h('button', { type: 'button', class: 'icon-btn fs-hbtn', title: `${t('Annuler l’action')} (${MOD}Z)`, 'aria-label': t('Annuler l’action'), onclick: () => undo() }, ico('arrow-back-up'));
const redoBtn = h('button', { type: 'button', class: 'icon-btn fs-hbtn', title: `${t('Rétablir')} (${MAC ? '⇧⌘Z' : 'Ctrl+Y'})`, 'aria-label': t('Rétablir'), onclick: () => redo() }, ico('arrow-forward-up'));
const histBtn = h('button', { type: 'button', class: 'icon-btn fs-hbtn', title: t('Historique des modifications'), 'aria-label': t('Historique des modifications'), onclick: () => toggleHistory() }, ico('history'));
const nameIn = h('input', { type: 'text', class: 'fs-name', spellcheck: false, 'aria-label': t('Nom du fichier'), title: t('Nom du fichier'),
  oninput: e => { doc.name = e.target.value; fitName(); ctx.changed(); } });
const fitName = () => { nameIn.style.width = Math.max(10, nameIn.value.length + 1) + 'ch'; };
const centerEl = h('div', { class: 'fs-center' }, undoBtn, redoBtn, histBtn, nameIn);
function syncCenter() {
  undoBtn.disabled = !canUndo(); redoBtn.disabled = !canRedo();
  if (document.activeElement !== nameIn) nameIn.value = doc.name || ''; fitName();
  if (histPop) drawHistory();
  syncSpacingCtl();
}

/* Historique des modifications : liste des pas (le plus récent en haut) ; un clic revient à cet état */
let histPop = null;
const clock = ms => new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
function drawHistory() {
  const list = h('ul', { class: 'hist-list' });
  for (let k = HIST.stack.length - 1; k >= 0; k--) {
    const m = HIST.meta[k] || {};
    list.append(h('li', {}, h('button', { type: 'button', class: 'hist-item' + (k === HIST.i ? ' on' : '') + (k > HIST.i ? ' future' : ''), onclick: () => goTo(k) },
      h('span', { class: 'hist-dot' }), h('span', { class: 'hist-lab', textContent: m.label || '' }), h('time', { textContent: clock(m.at || Date.now()) }))));
  }
  histPop.body.replaceChildren(list);
}
function toggleHistory() {
  if (histPop) { histPop.close(); return; }
  const el = h('div', { class: 'hist-pop', role: 'dialog', 'aria-label': t('Historique des modifications') }, h('div', { class: 'hist-head' }, h('b', { textContent: t('Historique des modifications') }),
    h('button', { type: 'button', class: 'mini', 'aria-label': t('Fermer'), onclick: () => histPop.close() }, ico('x'))), h('div', { class: 'hist-body' }));
  document.body.append(el);
  const r = histBtn.getBoundingClientRect(); el.style.left = Math.max(8, r.left - 40) + 'px'; el.style.top = r.bottom + 6 + 'px';
  const away = e => { if (!el.contains(e.target) && !histBtn.contains(e.target)) histPop.close(); };
  const key = e => { if (e.key === 'Escape') histPop.close(); };
  document.addEventListener('pointerdown', away, true); document.addEventListener('keydown', key, true);
  histPop = { body: el.querySelector('.hist-body'), close() { document.removeEventListener('pointerdown', away, true); document.removeEventListener('keydown', key, true); el.remove(); histPop = null; } };
  drawHistory();
}

window.FS_UI = {
  menus: [
    { label: 'Fichier', items: [
      { label: 'Nouvelle factsheet vierge', icon: 'file-plus', run: newBlank },
      { label: 'Enregistrer (.json)', icon: 'device-floppy', run: saveProject },
      { label: 'Ouvrir…', icon: 'folder-open', run: () => file.click() },
      { label: 'Exporter PDF…', icon: 'file-type-pdf', run: () => openExport() },
      '-',
      { label: 'Atelier', icon: 'brush', href: 'atelier.html' }] },
    { label: 'Édition', items: [
      { label: 'Annuler l’action', icon: 'arrow-back-up', hint: MOD + 'Z', run: () => undo(), disabled: () => !canUndo() },
      { label: 'Rétablir', icon: 'arrow-forward-up', hint: MAC ? '⇧⌘Z' : 'Ctrl+Y', run: () => redo(), disabled: () => !canRedo() },
      { label: 'Historique des modifications…', icon: 'history', run: () => toggleHistory() },
      '-',
      { label: 'Couleurs du document…', icon: 'palette', run: () => openPalette(nameIn, ctx) },
      { heading: 'Format des nombres' },
      ...Object.entries(LOCALES).map(([k, l]) => ({ label: l, checked: () => doc.locale === k, run: () => { doc.locale = k; ctx.restructure(); } }))] },
    { label: 'Affichage', items: [
      { heading: 'Zoom' }, zoomItem('Ajuster', 'fit'), zoomItem('50 %', '0.5'), zoomItem('75 %', '0.75'), zoomItem('100 %', '1'), zoomItem('200 %', '2'), zoomItem('400 %', '4'),
      '-',
      { heading: 'Espacement' },
      { label: 'Marges et espaces', icon: 'ruler-measure', checked: () => showSpacing, run: () => { showSpacing = !showSpacing; schedule(); syncSpacingCtl(); } },
      ...Object.entries(DENSITIES).map(([k, d]) => ({ label: `${d.label} — ${Math.round(d.f * 100)} %`, checked: () => (doc.density || 'normal') === k, run: () => { doc.density = k; ctx.restructure(); syncSpacingCtl(); } })),
      '-',
      { label: 'Aperçu 3D', icon: '3d-cube-sphere', run: () => open3d() }] },
  ],
  center: centerEl,
  settings: [{ title: 'Langue', node: langSel }],
};

/* Cmd/Ctrl + Z : annuler ; + Maj (ou Ctrl + Y) : rétablir — sauf dans un champ de saisie, qui garde son propre annuler */
window.addEventListener('keydown', e => {
  if (!(e.metaKey || e.ctrlKey) || e.altKey) return;
  const tg = e.target, tag = tg.tagName || '';
  if (/INPUT|TEXTAREA|SELECT/.test(tag) || tg.isContentEditable || document.querySelector('dialog[open], .ve, .v3d')) return;
  const k = e.key.toLowerCase();
  if (k === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
  else if (k === 'y') { e.preventDefault(); redo(); }
});

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

syncSpacingCtl(); record(false); syncCenter();   // état de départ de l'historique
