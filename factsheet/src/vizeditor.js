/* Éditeur de dataviz : sous-app plein écran, commune à tous les types.
   - formulaire généré depuis `fields` du type + `actions` optionnelles
   - aperçu à la largeur réelle de la colonne (ou d'un autre gabarit pour tester)
   - interactions à la souris si le type exporte `edit.start(hit, opts, meta, api, pt)` ;
     le rendu pose des `data-hit="kind:index"` sur les éléments saisissables. */
import { h, ico } from './render.js';
import { openPalette } from './palette.js';
import { buildFields, paletteOptions } from './editor.js';
import { colWidth, cssVars, applyVars, paletteOf } from './tokens.js';
import { VIZ_TYPES, VIZ_FAMILIES, newViz, renderVizFull } from './viz/index.js';
import { cardEl } from './cards.js';
import { gridEditor, tableAdapter, recordsAdapter } from './vizdata.js';
import { t } from './i18n.js';

let current = null;
const shut = new Set();   // cartes repliées (gardées d'une ouverture à l'autre)
let tab = 'viz';          // onglet : 'data' (Données) ou 'viz' (Visualisation)

/* Rangement des champs d'un type dans les cartes de l'onglet Visualisation (un champ peut forcer `g: 'format' | 'labels' | 'style' | 'data'`) */
const LABEL_KEYS = new Set(['legend', 'showValues', 'decimals', 'suffix', 'totalTpl', 'layout']);
const SERIES_COLORS = ['sky', 'yellow', 'blue', 'slate', 'grey'];
const MODE_LABELS = { auto: 'Automatique (hauteur naturelle)', ratio: 'Proportion de la largeur', fixed: 'Fixe', fill: 'Remplir la place disponible' };
let availH = 360;   // place disponible simulée dans l'aperçu (mode « Remplir »)
const groupOf = f => f.g || (f.t === 'table' || f.t === 'list' ? 'data' : f.k === 'ratio' ? 'ratio' : LABEL_KEYS.has(f.k) ? 'labels' : 'style');

export function openVizEditor({ col, sub, ci, bg, width: colW, ctx }) {
  if (current) return;
  const doc = ctx.getDoc();
  const snapshot = JSON.stringify(col.viz);
  const baseW = colW || colWidth(sub.layout, ci);
  const ui = { sel: -1, drag: null };
  let width = baseW, zoom = 'fit', meta = null, svgW = baseW;

  const root = h('div', { class: 've' });
  applyVars(root, cssVars(doc.theme, doc.colors));
  const sheet = h('div', { class: 'page viz-sheet', style: { background: bg && bg !== 'none' ? `var(--c-${bg})` : '#fff' } });
  const holder = h('div', { class: 'col col-viz' });
  sheet.append(holder);
  const scaler = h('div', { class: 've-scaler' }, sheet);
  const stage = h('div', { class: 've-stage' }, scaler);
  const form = h('aside', { class: 'panel ve-form' });
  const hint = h('div', { class: 've-hint' });
  const body = h('div', { class: 've-body' });
  const tabBtns = [['viz', 'adjustments', 'Visualisation'], ['data', 'table', 'Données']].map(([k, ic, l]) => h('button', { type: 'button', class: 've-tab', dataset: { tab: k }, onclick: () => { tab = k; buildForm(); } }, ico(ic), h('span', { textContent: t(l) })));
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
    const t = VIZ_TYPES[col.viz.kind];
    hint.textContent = t && t.edit
      ? 'Cliquer un segment ou un libellé pour le sélectionner · glisser l’anneau pour le tourner · glisser un libellé (verticalement, ou de l’autre côté) · glisser le point blanc pour déplacer l’ancrage du trait'
      : 'Les modifications du formulaire s’appliquent en direct.';
    const k = scale();
    sheet.style.width = width + 48 + 'px'; holder.style.width = width + 'px';
    scaler.style.transform = `scale(${k})`;
    stage.style.setProperty('--ve-h', '0px');
    requestAnimationFrame(() => { scaler.style.marginBottom = (sheet.offsetHeight * (k - 1)) + 'px'; scaler.style.marginRight = ((width + 48) * (k - 1)) + 'px'; });
  }
  const changed = () => { draw(); ctx.changed(); };

  /* ----- formulaire ----- */
  const fctx = { changed, restructure: () => { buildForm(); changed(); } };
  /* La fenêtre des couleurs agit sur le document : l'éditeur se redessine avec les nouvelles couleurs */
  const palCtx = { getDoc: ctx.getDoc,
    changed: () => { applyVars(root, cssVars(doc.theme, doc.colors)); draw(); ctx.changed(); },
    restructure: () => { applyVars(root, cssVars(doc.theme, doc.colors)); buildForm(); draw(); } };
  const refreshForm = () => buildForm();
  const card = (id, icon, name, nodes) => cardEl(id, icon, name, nodes, { shut, refresh: refreshForm });
  function typePicker() {
    const box = h('div', { class: 've-types' });
    for (const [fk, fl] of Object.entries(VIZ_FAMILIES)) {
      const list = Object.entries(VIZ_TYPES).filter(([, v]) => v.family === fk);
      if (!list.length) continue;
      box.append(h('div', { class: 'hint', textContent: t(fl) }), h('div', { class: 've-tgrid' }, list.map(([k, v]) => h('button', { type: 'button', class: 've-type' + (col.viz.kind === k ? ' on' : ''), title: t(v.label), 'aria-pressed': String(col.viz.kind === k),
        onclick: () => {
          if (col.viz.kind === k) return;
          const nv = newViz(k), o = col.viz.opts, n = nv.opts;
          nv.head = col.viz.head;
          if (o.rows && o.series && n.rows && n.series) { n.rows = o.rows; n.series = o.series; }   // les données tabulaires suivent d'un type à l'autre
          const dk = VIZ_TYPES[col.viz.kind].data, nk = v.data;
          if (dk && nk && dk.k === nk.k && dk.cols.map(c => c.k).join() === nk.cols.map(c => c.k).join()) n[nk.k] = o[dk.k];
          col.viz = nv; ui.sel = -1; fctx.restructure();
        } }, ico(v.icon || 'chart-bar'), h('span', { textContent: t(v.label) })))));
    }
    return box;
  }
  /* Carte « Hauteur » : comment la dataviz occupe la hauteur (voir heightOf dans viz/util.js, fillPage dans render.js) */
  function heightCard(ty) {
    const o = col.viz.opts, modes = ty.heights, mode = modes.includes(o.hmode) ? o.hmode : modes[0], rf = (ty.fields || []).find(f => f.k === 'ratio');
    const set = (k, v) => { o[k] = v; ui.sel = -1; };
    const sel = h('select', { onchange: e => { set('hmode', e.target.value); fctx.restructure(); } }, modes.map(m => h('option', { value: m, textContent: t(MODE_LABELS[m]), selected: m === mode })));
    const num = (k, label, def, min, max, step = 3) => h('label', { class: 'f' }, label, h('input', { type: 'number', value: o[k] ?? def, min, max, step, oninput: e => { const v = parseFloat(e.target.value); if (!isNaN(v)) { o[k] = v; changed(); } } }));
    const nodes = [h('label', { class: 'f' }, t('Hauteur'), sel)];
    if (mode === 'ratio' && rf) nodes.push(...buildFields([rf], o, fctx, {}, h));
    if (mode === 'fixed') nodes.push(num('hfixed', t('Hauteur du graphique (px)'), Math.round(width * 0.5625 / 3) * 3, 90, 900));
    if (mode === 'fill') nodes.push(num('hmin', t('Hauteur minimale (px)'), 120, 90, 900), num('hmax', t('Hauteur maximale (px)'), 600, 90, 900),
      h('label', { class: 'f' }, t('Place disponible pour cet aperçu (px)'), h('input', { type: 'number', value: availH, min: 90, max: 1200, step: 15, oninput: e => { const v = parseFloat(e.target.value); if (!isNaN(v)) { availH = v; draw(); } } })),
      h('p', { class: 'hint', textContent: t('Dans le document, la dataviz occupe la place restante de la page (partagée s’il y en a plusieurs), entre ces deux bornes.') }));
    return card('dv-height', 'ruler-2', t('Hauteur'), nodes);
  }
  function buildForm() {
    const top = form.scrollTop;
    form.innerHTML = '';
    const ty = VIZ_TYPES[col.viz.kind], fields = ty.fields || [], F = g => fields.filter(f => groupOf(f) === g);
    const head = col.viz.head || (col.viz.head = { title: '', source: '' });
    const dataFields = F('data'), hasData = !!ty.data || dataFields.length > 0;
    if (!hasData) tab = 'viz';
    syncTabs(hasData);
    body.classList.toggle('data', tab === 'data');
    const gen = list => buildFields(list, col.viz.opts, fctx, paletteOptions(doc), h);
    if (tab === 'data') {
      const nodes = [];
      for (const f of dataFields) {
        if (f.t === 'table') nodes.push(gridEditor(tableAdapter(f, col.viz.opts, paletteOptions(doc), SERIES_COLORS), fctx, { downloadName: col.viz.kind }));
        else nodes.push(...gen([f]));
      }
      if (ty.data) nodes.push(gridEditor(recordsAdapter(ty.data, col.viz.opts, paletteOptions(doc)), fctx, { downloadName: col.viz.kind }), ty.dataHint ? h('p', { class: 'hint', textContent: t(ty.dataHint) }) : null);
      form.append(card('dv-data', 'table', t('Données'), nodes));
    } else {
      form.append(
        card('dv-type', 'chart-dots', t('Type'), [typePicker()]),
        card('dv-head', 'typography', t('Titre et source'), buildFields([{ k: 'title', t: 'text', label: 'Titre de la dataviz (facultatif)' }, { k: 'source', t: 'text', label: 'Source (facultatif)' }], head, fctx, {}, h)),
        ty.panel ? card('dv-picto', 'mood-smile', t('Pictogramme'), ty.panel(col.viz.opts, fctx)) : null,
        ty.heights ? heightCard(ty) : null,
        F('format').length ? card('dv-format', 'ruler-2', t('Dimensions'), gen(F('format'))) : null,
        card('dv-colors', 'palette', t('Couleurs'), [h('button', { type: 'button', class: 'pp-btn', onclick: e => openPalette(e.currentTarget, palCtx) }, ico('palette'), h('span', { textContent: t('Couleurs du document') }))]),
        F('labels').length ? card('dv-labels', 'letter-case', t('Étiquettes'), gen(F('labels'))) : null,
        F('style').length || ty.actions ? card('dv-style', 'adjustments', t('Options'), [
          ty.actions ? h('div', { class: 'pp-actions' }, ty.actions.map(a => h('button', { type: 'button', class: 'pp-btn', textContent: a.label, title: a.title || '', onclick: () => { a.run(col.viz.opts); ui.sel = -1; fctx.restructure(); } }))) : null,
          ...gen(F('style'))]) : null);
    }
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
    const r = svg.getBoundingClientRect(), k = r.width / svgW || 1;
    return { x: (e.clientX - r.left) / k, y: (e.clientY - r.top) / k };
  };
  stage.addEventListener('pointerdown', e => {
    const t = VIZ_TYPES[col.viz.kind];
    const n = e.target.closest && e.target.closest('[data-hit]');
    if (!t || !t.edit || !n || e.button !== 0) { if (t && t.edit && ui.sel !== -1 && !n) { ui.sel = -1; draw(); focusItem('none'); } return; }
    const [kind, i] = n.getAttribute('data-hit').split(':');
    drag = t.edit.start({ kind, i: +i }, col.viz.opts, meta, api, toPt(e));
    if (drag) { e.preventDefault(); stage.setPointerCapture(e.pointerId); }
    draw();
  });
  stage.addEventListener('pointermove', e => { if (drag) drag.move(toPt(e)); });
  const up = () => { if (!drag) return; const d = drag; drag = null; if (d.end) d.end(); ui.drag = null; changed(); };
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
  const onKey = e => { if (e.key === 'Escape') close(false); };
  window.addEventListener('keydown', onKey);

  root.append(
    h('div', { class: 've-bar' }, h('strong', { textContent: 'Éditeur de dataviz' }),
      tabs, h('label', { class: 'zoom' }, 'Aperçu à la largeur ', wSel), h('label', { class: 'zoom' }, 'Zoom ', zSel),
      h('span', { style: { flex: 1 } }),
      h('button', { type: 'button', textContent: 'Annuler', onclick: () => close(false) }),
      h('button', { type: 'button', class: 'primary', textContent: 'Terminer', onclick: () => close(true) })),
    body);
  body.append(form, h('div', { class: 've-main' }, hint, stage));
  document.body.append(root); document.body.classList.add('ve-open'); current = root;
  new ResizeObserver(() => { if (zoom === 'fit') draw(); }).observe(stage);
  buildForm(); draw();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (current === root) draw(); });
}
