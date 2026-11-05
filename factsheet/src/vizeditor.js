/* Éditeur de dataviz : sous-app plein écran, commune à tous les types.
   - formulaire généré depuis `fields` du type + `actions` optionnelles
   - aperçu à la largeur réelle de la colonne (ou d'un autre gabarit pour tester)
   - interactions à la souris si le type exporte `edit.start(hit, opts, meta, api, pt)` ;
     le rendu pose des `data-hit="kind:index"` sur les éléments saisissables. */
import { h, ico } from './render.js';
import { openPalette } from './palette.js';
import { buildFields, paletteOptions, richEditor } from './editor.js';
import { colWidth, subColWidth, cssVars, applyVars, paletteOf } from './tokens.js';
import { VIZ_TYPES, VIZ_FAMILIES, switchKind, renderVizFull } from './viz/index.js';
import { cardEl, searchBox, applyFilter } from './cards.js';
import { helpBtn } from './help.js';
import { loadFonts } from './viz/util.js';
import { startReorder } from './vizreorder.js';
import { newSide, SIDE_FIELDS } from './viz/index.js';
import { gridEditor, tableAdapter, recordsAdapter } from './vizdata.js';
import { t } from './i18n.js';

let current = null;
const shut = new Set();   // cartes repliées (gardées d'une ouverture à l'autre)
let tab = 'data';
shut.add('dv-type');      // la carte du type est repliée à la première ouverture ; `tab` : 'data' (Données) ou 'viz' (Visualisation)
const acc = { cur: null, first: 'dv-style' }, search = { q: '', focus: false };
const MARKUP = /\*\*|~~|__|\^\^|,,|(^|\n)#{1,5} /;   // accordéon : une seule carte ouverte dans le panneau

/* Rangement des champs d'un type dans les cartes de l'onglet Visualisation (un champ peut forcer `g: 'format' | 'labels' | 'style' | 'data'`) */
const LABEL_KEYS = new Set(['legend', 'showValues', 'decimals', 'suffix', 'totalTpl', 'layout']);
const SERIES_COLORS = ['sky', 'yellow', 'blue', 'slate', 'grey'];
let availH = 360;   // place disponible simulée dans l'aperçu (mode « Remplir »)
const groupOf = f => f.g || (f.t === 'table' || f.t === 'list' ? 'data' : f.k === 'ratio' ? 'ratio' : LABEL_KEYS.has(f.k) ? 'labels' : 'style');

/** Petite fenêtre de choix de couleur à l'endroit du clic : pastilles de la palette du document ; « toute la série » (au lieu du seul élément) et « couleur de la série » (retire la surcharge) */
function openColorPop(host, x, y, cur, options, { series, onPick, onReset }) {
  document.querySelectorAll('.cpop').forEach(n => n.remove());
  let whole = false;
  const away = e => { if (!pop.contains(e.target)) close(); }, close = () => { pop.remove(); document.removeEventListener('pointerdown', away, true); };
  const foot = series ? [h('button', { type: 'button', class: 'cpop-act', onclick: e => { whole = !whole; e.currentTarget.classList.toggle('on', whole); } }, ico('layers-subtract'), h('span', { textContent: t('Toute la série') })),
    h('button', { type: 'button', class: 'cpop-act', onclick: () => { close(); onReset(); } }, ico('arrow-back-up'), h('span', { textContent: t('Couleur de la série') }))] : [];
  const pop = h('div', { class: 'cpop', role: 'listbox' }, ...Object.entries(options).map(([k, l]) => h('button', { type: 'button', role: 'option', class: 'cpop-sw' + (k === cur ? ' on' : ''), title: l, 'aria-label': l, onclick: () => { close(); onPick(k, whole); } }, h('i', { class: 'cs-dot', style: { background: `var(--c-${k})` } }))), ...foot);
  host.append(pop);
  const r = pop.getBoundingClientRect();
  Object.assign(pop.style, { left: Math.max(8, Math.min(window.innerWidth - r.width - 8, x + 8)) + 'px', top: Math.max(8, Math.min(window.innerHeight - r.height - 8, y + 8)) + 'px' });
  setTimeout(() => document.addEventListener('pointerdown', away, true), 0);
}

const getPath = (o, p) => p.reduce((q, k) => (q == null ? q : q[k]), o);
const setPath = (o, p, v) => { let q = o; p.slice(0, -1).forEach((k, i) => { if (q[k] == null) q[k] = /^\d+$/.test(p[i + 1]) && p[i] !== 'colors' ? [] : {}; q = q[k]; }); q[p[p.length - 1]] = v; };
const delPath = (o, p) => { const q = getPath(o, p.slice(0, -1)); if (q) delete q[p[p.length - 1]]; };

export function openVizEditor({ col, sub, ci, bg, width: colW, ctx }) {
  if (current) return;
  const doc = ctx.getDoc();
  const snapshot = JSON.stringify(col.viz);
  const baseW = colW || subColWidth(sub, ci);
  const ui = { sel: -1, drag: null };
  let width = baseW, zoom = 'fit', meta = null, svgW = baseW;

  const root = h('div', { class: 've' });
  applyVars(root, cssVars(doc.theme, doc.colors));
  const sheet = h('div', { class: 'page viz-sheet', style: { background: bg && bg !== 'none' ? `var(--c-${bg})` : '#fff' } });
  const holder = h('div', { class: 'col col-viz' });
  sheet.append(holder);
  const scaler = h('div', { class: 've-scaler' }, sheet);
  const stage = h('div', { class: 've-stage' }, scaler);
  const dataPane = h('div', { class: 've-data' }), miniHold = h('div', { class: 've-mini' });
  const form = h('aside', { class: 'panel ve-form' });
  const hint = h('div', { class: 've-hint' });
  const body = h('div', { class: 've-body' }), main = h('div', { class: 've-main' });
  const tabBtns = [['data', 'table', 'Données'], ['viz', 'adjustments', 'Visualisation']].map(([k, ic, l]) => h('button', { type: 'button', class: 've-tab', dataset: { tab: k }, onclick: () => { tab = k; buildForm(); draw(); } }, ico(ic), h('span', { textContent: t(l) })));
  const tabs = h('div', { class: 've-tabs', role: 'tablist' }, ...tabBtns);
  const syncTabs = hasData => { tabs.style.display = hasData ? '' : 'none'; tabBtns.forEach(b => { const on = b.dataset.tab === tab; b.classList.toggle('on', on); b.setAttribute('aria-selected', String(on)); }); };

  /* ----- rendu ----- */
  function scale() {
    if (zoom !== 'fit') return parseFloat(zoom);
    return Math.max(0.5, Math.min(2, (stage.clientWidth - 80) / (width + 48)));
  }
  function draw() {
    const r = renderVizFull(col.viz, width, { locale: doc.locale || 'en-GB', ui, pal: paletteOf(doc.theme, doc.colors), fillH: availH });
    holder.innerHTML = '';
    if (r && r.node) { holder.append(r.node); meta = r.meta || null; svgW = width; }
    hiliteSel();
    if (miniHold.isConnected) drawMini();
    const t = VIZ_TYPES[col.viz.kind];
    hint.textContent = holder.querySelector('[data-reorder]') ? 'Glisser un élément pour changer son ordre : les autres se réajustent en gardant des écarts proportionnels.' : t && t.edit
      ? 'Cliquer un segment ou un libellé pour le sélectionner · glisser l’anneau pour le tourner · glisser un libellé (verticalement, ou de l’autre côté) · glisser le point blanc pour déplacer l’ancrage du trait'
      : '';
    const k = scale();
    sheet.style.width = width + 48 + 'px'; holder.style.width = width + 'px';
    scaler.style.transform = `scale(${k})`;
    stage.style.setProperty('--ve-h', '0px');
    requestAnimationFrame(() => { scaler.style.marginBottom = (sheet.offsetHeight * (k - 1)) + 'px'; scaler.style.marginRight = ((width + 48) * (k - 1)) + 'px'; });
  }
  /* Aperçu réduit du panneau de l'onglet Données : la dataviz à la largeur choisie, mise à l'échelle du panneau */
  function drawMini() {
    const r = renderVizFull(col.viz, width, { locale: doc.locale || 'en-GB', pal: paletteOf(doc.theme, doc.colors), fillH: availH });
    miniHold.innerHTML = '';
    if (!r || !r.node) return;
    const k = Math.min(1, 270 / (width + 48)), box = h('div', { class: 'page viz-sheet ve-mini-sheet', style: { width: width + 48 + 'px', transform: `scale(${k})`, transformOrigin: '0 0', background: bg && bg !== 'none' ? `var(--c-${bg})` : '#fff' } }, h('div', { class: 'col col-viz', style: { width: width + 'px' } }, r.node));
    miniHold.append(h('div', { class: 've-mini-box' }, box));
    requestAnimationFrame(() => { miniHold.firstChild.style.height = Math.ceil(box.offsetHeight * k) + 'px'; });
  }
  /* Historique propre à l'éditeur : chaque changement de type (ou autre restructuration) est un pas à part, la frappe est regroupée sur 1 s */
  const hist = { s: [snapshot], i: 0, at: 0, burst: false };
  const rec = burst => {
    const sn = JSON.stringify(col.viz); if (sn === hist.s[hist.i]) return;
    const now = Date.now();
    if (burst && hist.burst && hist.i === hist.s.length - 1 && hist.i > 0 && now - hist.at < 1000) hist.s[hist.i] = sn;
    else { hist.s.length = hist.i + 1; hist.s.push(sn); hist.i = hist.s.length - 1; if (hist.s.length > 100) { hist.s.shift(); hist.i--; } }
    hist.at = now; hist.burst = burst;
  };
  const syncHist = () => { undoBtn.disabled = hist.i <= 0; redoBtn.disabled = hist.i >= hist.s.length - 1; };
  const goHist = i => {
    if (i < 0 || i >= hist.s.length) return;
    hist.i = i; hist.burst = false; col.viz = JSON.parse(hist.s[i]); ui.sel = -1;
    buildForm(); draw(); ctx.changed(); syncHist();
  };
  const changed = () => { draw(); rec(true); ctx.changed(); syncHist(); };

  /* ----- formulaire ----- */
  const fctx = { changed, restructure: () => { buildForm(); draw(); rec(false); ctx.changed(); syncHist(); } };
  /* La fenêtre des couleurs agit sur le document : l'éditeur se redessine avec les nouvelles couleurs */
  const palCtx = { getDoc: ctx.getDoc,
    changed: () => { applyVars(root, cssVars(doc.theme, doc.colors)); draw(); ctx.changed(); },
    restructure: () => { applyVars(root, cssVars(doc.theme, doc.colors)); buildForm(); draw(); } };
  const refreshForm = () => buildForm();
  const card = (id, icon, name, nodes, sum) => cardEl(id, icon, name, nodes, { shut, refresh: refreshForm, acc, sum, q: search.q });
  /* Titre et source : un champ simple par défaut (une ligne) ; l'éditeur riche (gras, styles de paragraphe…) s'ouvre avec le bouton, ou d'office si le texte est déjà mis en forme */
  const softField = (obj, k, label, opts) => {
    const box = h('div', { class: 'f' }), val = () => obj[k] || '';
    let rich = MARKUP.test(val()) || val().includes('\n');
    const draw = () => box.replaceChildren(
      h('div', { class: 'hint pp-fh' }, label, helpBtn(label), h('span', { class: 'pp-sp' }), h('button', { type: 'button', class: 'mini' + (rich ? ' on' : ''), title: t('Mise en forme'), 'aria-label': t('Mise en forme'), 'aria-pressed': String(rich), onclick: () => { rich = !rich; draw(); } }, ico('typography'))),
      rich ? richEditor(val(), v => { obj[k] = v; fctx.changed(); }, opts) : h('input', { type: 'text', value: val(), oninput: e => { obj[k] = e.target.value; fctx.changed(); } }));
    draw(); return box;
  };
  /* Choix du type : sa propre carte repliable en tête de colonne, dont l'en-tête affiche le type courant (icône + nom) ;
     repliée par défaut et après chaque choix, pour ne pas alourdir la page */
  const typeCard = () => {
    const cur = VIZ_TYPES[col.viz.kind], list = h('div', { class: 've-typelist', role: 'listbox' });
    for (const [fk, fl] of Object.entries(VIZ_FAMILIES)) {
      const items = Object.entries(VIZ_TYPES).filter(([, v]) => v.family === fk);
      if (!items.length) continue;
      list.append(h('div', { class: 've-typefam', textContent: t(fl) }), ...items.map(([k, v]) => h('button', { type: 'button', role: 'option', class: 've-typeopt' + (col.viz.kind === k ? ' on' : ''), 'aria-selected': String(col.viz.kind === k),
        onclick: () => { shut.add('dv-type'); if (col.viz.kind !== k) { col.viz = switchKind(col.viz, k); ui.sel = -1; fctx.restructure(); } else buildForm(); } }, ico(v.icon || 'chart-bar'), h('span', { textContent: t(v.label) }))));
    }
    const el = cardEl('dv-type', cur.icon || 'chart-bar', `${t('Type')} · ${t(cur.label)}`, [list], { shut, refresh: refreshForm });
    el.classList.add('ve-typecard'); return el;
  };
  function buildForm() {
    const top = form.scrollTop;
    form.innerHTML = ''; dataPane.innerHTML = '';
    const ty = VIZ_TYPES[col.viz.kind], fields = ty.fields || [], F = g => fields.filter(f => groupOf(f) === g);
    const head = col.viz.head || (col.viz.head = { title: '', source: '' });
    const dataFields = F('data'), hasData = !!ty.data || dataFields.length > 0;
    if (!hasData) tab = 'viz';
    syncTabs(hasData);
    main.classList.toggle('is-data', tab === 'data');
    const gen = list => buildFields(list, col.viz.opts, fctx, paletteOptions(doc), h);
    if (tab === 'data') {
      const nodes = [];
      for (const f of dataFields) {
        if (f.t === 'table') nodes.push(gridEditor(tableAdapter(f, col.viz.opts, paletteOptions(doc), SERIES_COLORS), fctx, { downloadName: col.viz.kind }));
        else nodes.push(...gen([f]));
      }
      if (ty.data) nodes.push(gridEditor(recordsAdapter(ty.data, col.viz.opts, paletteOptions(doc)), fctx, { downloadName: col.viz.kind }), ty.dataHint ? h('p', { class: 'hint', textContent: t(ty.dataHint) }) : null);
      dataPane.append(h('div', { class: 've-data-in' }, h('h3', {}, ico('table'), h('span', { textContent: t('Données') })), ...nodes.flat().filter(Boolean)));
      form.append(h('div', { class: 've-sech', textContent: t('Aperçu') }), miniHold, h('button', { type: 'button', class: 'pp-btn', onclick: () => { tab = 'viz'; buildForm(); draw(); } }, ico('chart-line'), h('span', { textContent: t('Retour à l’aperçu') })));
      drawMini();
    } else {
      const ids = ['dv-head', ty.panel && 'dv-picto', 'dv-side', F('format').length && 'dv-format', 'dv-colors', F('labels').length && 'dv-labels', (F('style').length || ty.actions) && 'dv-style'].filter(Boolean);
      acc.first = ['dv-style', 'dv-labels', 'dv-colors'].find(x => ids.includes(x)); if (acc.cur && !ids.includes(acc.cur)) acc.cur = null;
      form.append(searchBox(search, refreshForm), typeCard(), ...[
        card('dv-head', 'typography', t('Titre et source'), [softField(head, 'title', 'Titre de la dataviz', {}), softField(head, 'source', 'Source de la dataviz', { bullets: false })], null, [head.title, head.source].filter(Boolean).length ? t('Renseigné') : t('Aucun')),
        ty.panel ? card('dv-picto', 'mood-smile', t(ty.panelTitle || 'Pictogramme'), ty.panel(col.viz.opts, fctx)) : null,
        card('dv-side', 'number', t('Chiffre à côté'), buildFields(SIDE_FIELDS, col.viz.side || (col.viz.side = newSide(col.viz.kind)), fctx, {}, h)),
        F('format').length ? card('dv-format', 'ruler-2', t('Dimensions'), gen(F('format'))) : null,
        card('dv-colors', 'palette', t('Couleurs'), [h('button', { type: 'button', class: 'pp-btn', onclick: e => openPalette(e.currentTarget, palCtx) }, ico('palette'), h('span', { textContent: t('Couleurs du document') }))]),
        F('labels').length ? card('dv-labels', 'letter-case', t('Étiquettes'), gen(F('labels'))) : null,
        F('style').length || ty.actions ? card('dv-style', 'adjustments', t('Options'), [
          ty.actions ? h('div', { class: 'pp-actions' }, ty.actions.map(a => h('button', { type: 'button', class: 'pp-btn', textContent: a.label, title: a.title || '', onclick: () => { a.run(col.viz.opts); ui.sel = -1; fctx.restructure(); } }))) : null,
          ...gen(F('style'))]) : null].filter(Boolean));
    }
    applyFilter(form, search);
    form.scrollTop = top;
  }
  const focusItem = path => {
    form.querySelectorAll('.col-card.sel').forEach(n => n.classList.remove('sel'));
    const n = form.querySelector(`[data-path="${path}"]`);
    if (n) { n.classList.add('sel'); n.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
  };

  /* ----- interactions souris ----- */
  const api = { ui, select(i) { ui.sel = i; focusItem(`segments.${i}`); }, redraw: changed };
  let drag = null;
  const toPt = e => {
    const svg = holder.querySelector('svg'); if (!svg) return { x: 0, y: 0 };
    const r = svg.getBoundingClientRect(), k = r.width / (+svg.getAttribute('width') || svgW) || 1;
    return { x: (e.clientX - r.left) / k, y: (e.clientY - r.top) / k };
  };
  /* Clic sur un élément (barre, segment, point…) : choisir sa couleur. Un glissement (réordonner, tourner) n'ouvre rien. */
  let suppressClick = false, dragMoved = false, down0 = null; const bases = new Map();
  const selEls = new Set();   // éléments choisis (chemins `data-color`) : Maj ou Cmd + clic pour en ajouter
  const hiliteSel = () => holder.querySelectorAll('[data-color]').forEach(n => { if (selEls.has(n.getAttribute('data-color'))) { n.setAttribute('stroke', '#F28C28'); n.setAttribute('stroke-width', 2.4); } });
  const colorAt = ev => {
    const n = document.elementsFromPoint(ev.clientX, ev.clientY).find(x => x.getAttribute && x.getAttribute('data-color'));
    if (!n) { if (selEls.size) { selEls.clear(); draw(); } return; }
    const path = n.getAttribute('data-color'), base = n.getAttribute('data-color-base');
    if (ev.shiftKey || ev.metaKey || ev.ctrlKey) { if (selEls.has(path)) selEls.delete(path); else selEls.add(path); } else { selEls.clear(); selEls.add(path); }
    bases.set(path, base); draw();
    if (!selEls.size) return;
    const o = col.viz.opts, first = [...selEls][0].split('.');
    const cur = getPath(o, first) || (bases.get([...selEls][0]) && getPath(o, bases.get([...selEls][0]).split('.')));
    openColorPop(root, ev.clientX, ev.clientY, cur, paletteOptions(doc), { series: [...selEls].some(p => bases.get(p)),
      onPick: (key, whole) => {
        selEls.forEach(p => {
          const b = bases.get(p);
          if (whole && b) { setPath(o, b.split('.'), key); const j = p.split('.').pop(); (o.rows || []).forEach(r => { if (r.colors) delete r.colors[j]; }); } else setPath(o, p.split('.'), key);
        });
        fctx.restructure();
      },
      onReset: () => { selEls.forEach(p => { if (bases.get(p)) delPath(o, p.split('.')); }); fctx.restructure(); } });
  };
  stage.addEventListener('click', e => { if (suppressClick) { suppressClick = false; return; } colorAt(e); });
  stage.addEventListener('pointerdown', e => {
    suppressClick = false; dragMoved = false; down0 = { x: e.clientX, y: e.clientY };
    /* réordonner à la souris (barres, lignes, frise, pictogrammes, liste) : voir vizreorder.js */
    const rn = e.target.closest && e.target.closest('[data-reorder]');
    if (rn && e.button === 0 && startReorder(e, rn, { opts: col.viz.opts, root: holder, redraw: draw, click: ev => { suppressClick = true; colorAt(ev); }, done: ch => { if (ch) { suppressClick = true; changed(); } else draw(); } })) return;
    const t = VIZ_TYPES[col.viz.kind];
    const n = e.target.closest && e.target.closest('[data-hit]');
    if (!t || !t.edit || !n || e.button !== 0) { if (t && t.edit && ui.sel !== -1 && !n) { ui.sel = -1; draw(); focusItem('none'); } return; }
    const [kind, i] = n.getAttribute('data-hit').split(':');
    drag = t.edit.start({ kind, i: +i }, col.viz.opts, meta, api, toPt(e));
    if (drag) { e.preventDefault(); stage.setPointerCapture(e.pointerId); }
    draw();
  });
  stage.addEventListener('pointermove', e => { if (drag) { if (down0 && Math.hypot(e.clientX - down0.x, e.clientY - down0.y) > 3) dragMoved = true; drag.move(toPt(e)); } });
  const up = () => { if (!drag) return; if (dragMoved) suppressClick = true; const d = drag; drag = null; if (d.end) d.end(); ui.drag = null; changed(); };
  stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', up);

  /* ----- barre ----- */
  const wOpts = [[baseW, `Colonne actuelle (${Math.round(baseW)} px)`], ...[['1-1-1', '1/3'], ['1-1', '1/2'], ['2-1', '2/3'], ['1', 'Pleine largeur']].map(([k, l]) => [colWidth(k, 0), `${l} (${Math.round(colWidth(k, 0))} px)`])];
  const wSel = h('select', { onchange: e => { width = parseFloat(e.target.value); draw(); } }, wOpts.map(([v, l]) => h('option', { value: v, textContent: l })));
  const zSel = h('select', { onchange: e => { zoom = e.target.value; draw(); } }, [['fit', 'Ajuster'], ['1', '100 %'], ['1.5', '150 %'], ['2', '200 %']].map(([v, l]) => h('option', { value: v, textContent: l })));
  const close = keep => {
    if (!keep) { col.viz = JSON.parse(snapshot); }
    window.removeEventListener('keydown', onKey); root.remove(); current = null; document.body.classList.remove('ve-open');
    ctx.restructure();
  };
  const onKey = e => {
    if (e.key === 'Escape') { close(false); return; }
    const tg = e.target;
    if (!(e.metaKey || e.ctrlKey) || e.altKey || /INPUT|TEXTAREA|SELECT/.test(tg.tagName || '') || tg.isContentEditable) return;
    const k = e.key.toLowerCase();
    if (k === 'z') { e.preventDefault(); goHist(hist.i + (e.shiftKey ? 1 : -1)); } else if (k === 'y') { e.preventDefault(); goHist(hist.i + 1); }
  };
  window.addEventListener('keydown', onKey);

  const undoBtn = h('button', { type: 'button', class: 've-hist', title: t('Annuler (Cmd/Ctrl + Z)'), 'aria-label': t('Annuler la dernière modification'), onclick: () => goHist(hist.i - 1) }, ico('arrow-back-up'));
  const redoBtn = h('button', { type: 'button', class: 've-hist', title: t('Rétablir (Cmd/Ctrl + Maj + Z)'), 'aria-label': t('Rétablir la modification annulée'), onclick: () => goHist(hist.i + 1) }, ico('arrow-forward-up'));
  syncHist();
  /* Mise en page : barre (titre + historique | onglets | Annuler / Terminer), aperçu ou données à gauche, panneau de largeur fixe à droite dans les deux onglets */
  root.append(
    h('div', { class: 've-bar' }, h('div', { class: 've-bl' }, h('strong', { textContent: 'Éditeur de dataviz' }), undoBtn, redoBtn), tabs,
      h('div', { class: 've-br' }, h('button', { type: 'button', textContent: 'Annuler', onclick: () => close(false) }),
        h('button', { type: 'button', class: 'primary', textContent: 'Terminer', onclick: () => close(true) }))),
    body);
  main.append(h('div', { class: 've-viewbar' }, h('label', { class: 'zoom' }, 'Aperçu à la largeur ', wSel), h('label', { class: 'zoom' }, 'Zoom ', zSel), hint), stage, dataPane);
  body.append(main, form);
  document.body.append(root); document.body.classList.add('ve-open'); current = root;
  new ResizeObserver(() => { if (zoom === 'fit') draw(); }).observe(stage);
  buildForm(); draw();
  loadFonts().then(() => { if (current === root) draw(); });
}
