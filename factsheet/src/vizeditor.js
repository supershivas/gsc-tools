/* Éditeur de dataviz : sous-app plein écran, commune à tous les types.
   - formulaire généré depuis `fields` du type + `actions` optionnelles
   - aperçu à la largeur réelle de la colonne (ou d'un autre gabarit pour tester)
   - interactions à la souris si le type exporte `edit.start(hit, opts, meta, api, pt)` ;
     le rendu pose des `data-hit="kind:index"` sur les éléments saisissables. */
import { h } from './render.js';
import { buildFields, paletteOptions } from './editor.js';
import { colWidth, cssVars, applyVars } from './tokens.js';
import { VIZ_TYPES, VIZ_OPTIONS, newViz, renderVizFull } from './viz/index.js';

let current = null;

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

  /* ----- rendu ----- */
  function scale() {
    if (zoom !== 'fit') return parseFloat(zoom);
    return Math.max(0.5, Math.min(2, (stage.clientWidth - 80) / (width + 48)));
  }
  function draw() {
    const r = renderVizFull(col.viz, width, { locale: doc.locale || 'en-GB', ui });
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
  function buildForm() {
    const top = form.scrollTop;
    form.innerHTML = '';
    const t = VIZ_TYPES[col.viz.kind];
    const kindSel = h('select', { onchange: e => { col.viz = newViz(e.target.value); ui.sel = -1; fctx.restructure(); } },
      Object.entries(VIZ_OPTIONS).map(([v, l]) => h('option', { value: v, textContent: l, selected: col.viz.kind === v })));
    form.append(h('label', { class: 'f' }, 'Type de dataviz', kindSel));
    if (t.actions) form.append(h('div', { class: 'row', style: { flexWrap: 'wrap', marginBottom: '10px' } },
      t.actions.map(a => h('button', { type: 'button', textContent: a.label, title: a.title || '', onclick: () => { a.run(col.viz.opts); ui.sel = -1; fctx.restructure(); } }))));
    form.append(...buildFields(t.fields || [], col.viz.opts, fctx, paletteOptions(doc), h));
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
      h('label', { class: 'zoom' }, 'Aperçu à la largeur ', wSel), h('label', { class: 'zoom' }, 'Zoom ', zSel),
      h('span', { style: { flex: 1 } }),
      h('button', { type: 'button', textContent: 'Annuler', onclick: () => close(false) }),
      h('button', { type: 'button', class: 'primary', textContent: 'Terminer', onclick: () => close(true) })),
    h('div', { class: 've-body' }, form, h('div', { class: 've-main' }, hint, stage)));
  document.body.append(root); document.body.classList.add('ve-open'); current = root;
  new ResizeObserver(() => { if (zoom === 'fit') draw(); }).observe(stage);
  buildForm(); draw();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (current === root) draw(); });
}
