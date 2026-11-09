import { PAGE } from '../tokens.js';
import { renderDocument, measure, h } from '../render.js';
import { localImageCount, storage } from '../state.js';

/* Aperçu : dessin des pages (échelle, jauges, avertissements), zoom, et document candidat d'un glisser-déposer.
   Ajoute à ctx : `schedule`, `preview(fn)`, `shown()`, `previewing()`, `previewMark()`.
   `spacing` et `selection` : calques redessinés avec l'aperçu. */
export function createPreview(ctx, { spacing, selection }) {
  const stage = ctx.stage;
  const gauges = document.getElementById('gauges');
  const warnEl = document.getElementById('warnings');
  let zoomMode = 'fit', raf = 0;
  let previewDoc = null, previewMark = null;   // glisser-déposer : document candidat dessiné pendant le geste

  function scaleValue() {
    if (zoomMode !== 'fit') return parseFloat(zoomMode);
    const avail = stage.clientWidth - 44;
    return Math.max(0.4, Math.min(1, (avail - 24) / (2 * PAGE.w)));
  }

  function draw() {
    stage.classList.toggle('free', zoomMode !== 'fit');   // zoom manuel : de la marge autour des pages, pour pouvoir zoomer sous le curseur même quand tout tient à l'écran
    const sc = scaleValue(), sx = stage.scrollLeft, sy = stage.scrollTop;
    const doc = ctx.getDoc();
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
    spacing.draw();
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
    if (ctx.hover) ctx.hover.hide();
    if (previewDoc && previewMark) stage.querySelectorAll(`[data-sel="${previewMark}"]`).forEach(n => n.classList.add('drag-live'));
    selection.draw(); watchLayout();
  }

  /* La mise en page peut bouger après coup (polices, images) : filigrane et cadre suivent */
  let layRaf = 0;
  const layoutObs = new ResizeObserver(() => { cancelAnimationFrame(layRaf); layRaf = requestAnimationFrame(() => { spacing.draw(); selection.draw(); }); });
  const watchLayout = () => { layoutObs.disconnect(); stage.querySelectorAll('.page .content, .page .hd').forEach(c => layoutObs.observe(c)); };

  const schedule = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(draw); };

  ctx.schedule = schedule;
  ctx.shown = () => previewDoc || ctx.getDoc();
  ctx.previewing = () => !!previewDoc;
  ctx.previewMark = () => previewMark;
  /* Aperçu en direct d'un déplacement : `fn(copie)` l'applique à une copie du document et renvoie le chemin à repérer ; null = retour au vrai document */
  ctx.preview = fn => {
    if (!fn) { if (previewDoc) { previewDoc = null; previewMark = null; schedule(); } return; }
    const c = JSON.parse(JSON.stringify(ctx.getDoc())); previewMark = fn(c); previewDoc = c; schedule();
  };

  return {
    schedule, scaleValue,
    getZoom: () => zoomMode,
    setZoom: v => { zoomMode = v; },
    /* redessin immédiat (zoom à la molette) */
    drawNow: () => { cancelAnimationFrame(raf); draw(); },
  };
}
