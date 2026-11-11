import { PAGE } from '../tokens.js';
import { renderDocument, measure, h, ico } from '../render.js';
import { storage, moveSection } from '../state.js';
import { stripMk } from '../viz/util.js';
import { t } from '../i18n.js';

/* Aperçu : dessin des pages (échelle, jauges, avertissements), zoom, et document candidat d'un glisser-déposer.
   Ajoute à ctx : `schedule`, `preview(fn)`, `shown()`, `previewing()`, `previewMark()`.
   `spacing` et `selection` : calques redessinés avec l'aperçu. */
export function createPreview(ctx, { spacing, selection }) {
  const stage = ctx.stage;
  const gauges = document.getElementById('gauges');
  const warnEl = document.getElementById('warnings');
  let zoomMode = 'fit',
    raf = 0;
  let previewDoc = null,
    previewMark = null; // glisser-déposer : document candidat dessiné pendant le geste

  function scaleValue() {
    if (zoomMode !== 'fit') return parseFloat(zoomMode);
    const avail = stage.clientWidth - 44;
    return Math.max(0.4, Math.min(1, (avail - 24) / (2 * PAGE.w)));
  }

  function draw() {
    stage.classList.toggle('free', zoomMode !== 'fit'); // zoom manuel : de la marge autour des pages, pour pouvoir zoomer sous le curseur même quand tout tient à l'écran
    const sc = scaleValue(),
      sx = stage.scrollLeft,
      sy = stage.scrollTop;
    const doc = ctx.getDoc();
    const r = renderDocument(previewDoc || doc);
    stage.innerHTML = '';
    const wraps = [];
    r.pages.forEach((p) => {
      const wrap = h(
        'div',
        { class: 'pwrap', style: { width: PAGE.w * sc + 'px', height: PAGE.h * sc + 'px' } },
        h('span', { class: 'tag', textContent: p.key }),
        h('div', { class: 'pscale', style: { transform: `scale(${sc})` } }, p.el),
      );
      stage.append(wrap);
      wraps.push(wrap);
    });
    stage.scrollLeft = sx;
    stage.scrollTop = sy; // une retouche ne doit jamais faire sauter la page
    measure(r);
    ctx.overflows = r.overflows;
    ctx.overflowSecs = Object.fromEntries(r.overflows.flatMap((o) => o.secs.map((s) => [s.si, s.state])));
    r.overflows.forEach((o) =>
      showOverflow(
        wraps[o.page === 'recto' ? 0 : 1],
        r.pages.find((p) => p.key === o.page),
        o,
        sc,
      ),
    );
    markTree();
    spacing.draw();
    gauges.innerHTML = '';
    r.pages.forEach((p) => {
      const pct = Math.min(100, Math.round((p.used / p.max) * 100));
      gauges.append(
        h(
          'div',
          { class: 'gauge' + (p.overflow ? ' over' : '') },
          h('span', { textContent: p.key === 'recto' ? 'Recto' : 'Verso' }),
          h('i', {}, h('b', { style: { width: pct + '%' } })),
          h('span', { textContent: Math.round((p.used / p.max) * 100) + ' %' }),
        ),
      );
    });
    warnEl.innerHTML = '';
    r.warnings.forEach((w) => warnEl.append(h('div', { textContent: w })));
    r.overflows.forEach((o) => o.secs.forEach(({ si, state }) => warnEl.append(overflowRow(doc, o, si, state))));
    if (!storage.ok)
      warnEl.append(
        h('div', {
          textContent:
            'Espace de stockage du navigateur plein : les dernières modifications ne sont pas enregistrées. Enregistrez le projet (.json) et allégez les images.',
        }),
      );
    if (ctx.hover) ctx.hover.hide();
    if (previewDoc && previewMark) stage.querySelectorAll(`[data-sel="${previewMark}"]`).forEach((n) => n.classList.add('drag-live'));
    selection.draw();
    watchLayout();
  }

  /* ----- dépassement : rien ne disparaît sans qu'on le voie ----- */
  /* Sous la page, le contenu coupé (estompé, hachuré) et un trait rouge à la limite ; uniquement dans l'aperçu : l'export PDF et l'aperçu 3D redessinent le document sans ce calque */
  function showOverflow(wrap, p, o, sc) {
    /* repère posé sous le bord de la feuille : jamais sur la page elle-même (les captures de la page restent celles du document) */
    wrap.append(
      h('div', { class: 'ovf-flag', style: { top: PAGE.h * sc + 'px' } }, h('span', { textContent: `${t('Dépasse de')} ${o.over} px` })),
    );
    /* le calque ne doit pas faire apparaître une barre de défilement (la largeur du panneau changerait, donc le zoom « Ajuster » et la page sauterait) :
       si l'aperçu ne défile pas encore, il se limite à la place qui reste sous la page */
    let hid = Math.min(o.hidden, 900); // au-delà, le calque s'arrête (le décompte reste exact dans l'avertissement)
    if (stage.scrollHeight <= stage.clientHeight + 1) {
      const room = stage.clientHeight - (wrap.getBoundingClientRect().bottom - stage.getBoundingClientRect().top) - 30;
      hid = Math.min(hid, Math.floor(room / sc));
    }
    if (!hid) return;
    const clone = p.el.cloneNode(true);
    clone.classList.add('ovf-clone');
    clone.removeAttribute('data-page');
    clone.querySelectorAll('[data-sel],[data-path],[id]').forEach((n) => {
      n.removeAttribute('data-sel');
      n.removeAttribute('data-path');
      n.removeAttribute('id');
    });
    Object.assign(clone.style, {
      position: 'absolute',
      left: '0',
      top: -PAGE.h + 'px',
      height: p.top + p.used + 'px',
      overflow: 'visible',
    });
    wrap.append(
      h(
        'div',
        { class: 'ovf', style: { top: PAGE.h * sc + 'px', width: PAGE.w * sc + 'px', height: hid * sc + 'px' }, 'aria-hidden': 'true' },
        h('div', { class: 'pscale', style: { transform: `scale(${sc})` } }, clone),
      ),
    );
  }
  /* Avertissement par section : son état, et de quoi y remédier (aller à la section, la déplacer sur l'autre page : annulable) */
  function overflowRow(doc, o, si, state) {
    const sec = doc.sections[si],
      other = o.page === 'recto' ? 'verso' : 'recto',
      name = stripMk(sec.title || '') || t('Section sans titre');
    return h(
      'div',
      { class: 'ovf-row' },
      h('span', {
        class: 'ovf-txt',
        textContent: `« ${name} » ${state === 'out' ? t('est entièrement hors de la page') : t('est coupée par le bas de la page')}`,
      }),
      h('button', { type: 'button', class: 'mini', textContent: t('Aller à la section'), onclick: () => ctx.select(`sec:${si}`) }),
      h('button', {
        type: 'button',
        class: 'mini',
        textContent: other === 'verso' ? t('La déplacer sur le verso') : t('La déplacer sur le recto'),
        onclick: () =>
          ctx.moved(
            () => `sec:${moveSection(ctx.getDoc(), si, null, false, other)}`,
            other === 'verso' ? 'Section déplacée sur le verso.' : 'Section déplacée sur le recto.',
          ),
      }),
    );
  }
  /* Pastille d'alerte sur les sections touchées dans l'arbre (le dessin de l'arbre précède la mesure : on pose les pastilles après) */
  function markTree() {
    const tree = ctx.treeEl;
    if (!tree) return;
    tree.querySelectorAll('.tn-ovf').forEach((n) => n.remove());
    for (const [si, state] of Object.entries(ctx.overflowSecs || {})) {
      const row = tree.querySelector(`.tn[data-path="sec:${si}"]`);
      if (!row) continue;
      const msg = state === 'out' ? t('Entièrement hors de la page') : t('Coupée par le bas de la page');
      const b = ico('alert-triangle');
      b.classList.add('tn-ovf');
      b.title = msg;
      b.setAttribute('role', 'img');
      b.setAttribute('aria-label', msg);
      row.querySelector('.tn-lab').after(b);
    }
  }
  ctx.markTree = markTree;

  /* La mise en page peut bouger après coup (polices, images) : filigrane et cadre suivent */
  let layRaf = 0;
  const layoutObs = new ResizeObserver(() => {
    cancelAnimationFrame(layRaf);
    layRaf = requestAnimationFrame(() => {
      spacing.draw();
      selection.draw();
    });
  });
  const watchLayout = () => {
    layoutObs.disconnect();
    stage.querySelectorAll('.page:not(.ovf-clone) .content, .page:not(.ovf-clone) .hd').forEach((c) => layoutObs.observe(c));
  };

  const schedule = () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(draw);
  };

  ctx.schedule = schedule;
  ctx.shown = () => previewDoc || ctx.getDoc();
  ctx.previewing = () => !!previewDoc;
  ctx.previewMark = () => previewMark;
  /* Aperçu en direct d'un déplacement : `fn(copie)` l'applique à une copie du document et renvoie le chemin à repérer ; null = retour au vrai document */
  ctx.preview = (fn) => {
    if (!fn) {
      if (previewDoc) {
        previewDoc = null;
        previewMark = null;
        schedule();
      }
      return;
    }
    const c = JSON.parse(JSON.stringify(ctx.getDoc()));
    previewMark = fn(c);
    previewDoc = c;
    schedule();
  };

  return {
    schedule,
    scaleValue,
    getZoom: () => zoomMode,
    setZoom: (v) => {
      zoomMode = v;
    },
    /* redessin immédiat (zoom à la molette) */
    drawNow: () => {
      cancelAnimationFrame(raf);
      draw();
    },
  };
}
