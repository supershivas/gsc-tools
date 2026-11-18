/* Fenêtre « Styles de paragraphe » (menu Texte) : corps et interlignage de chaque style pour tout le document, taille de tous
   les textes et crans d'interlignage, avec l'aperçu de la page en direct.
   Les réglages se font sur un brouillon de `doc.textSet` dessiné par `ctx.previewAs` (le document n'est pas modifié) ;
   « Appliquer » l'écrit en une seule étape d'historique, « Annuler » ou Échap reviennent au document. Le header n'en fait pas partie.
   Plan : docs/plan-texte.md (phase 2). */
import { h, ico } from '../render.js';
import { t, getLang } from '../i18n.js';
import { PSTYLES, GROUPS } from '../textstyles.js';
import { fitScale } from './fit.js';
import {
  TYPE,
  FONT,
  LEADS,
  LEAD_STEP,
  STYLE_SIZE,
  TEXT_SCALE_MIN,
  TEXT_SCALE_MAX,
  TEXT_SKIP_KEYS,
  textSetOf,
  textSetIsDefault,
  baseType,
  typeOf,
} from '../tokens.js';

/* éléments du document qui portent chaque style (pour compter ses usages dans la page dessinée) */
const USES = {
  section: '.sec-title, .rich .p-h1',
  subsection: '.sub-title, .card-title, .rich .p-h2',
  lead: '.p-lead',
  body: '.rich p:not([class]), .rich li',
  bodyBold: '.p-bold',
  small: '.p-small, .tbl',
  quote: '.p-quote',
  caption: '.p-cap, .cap, .viz-title, .viz-source, .card-tag',
  label: '.p-label',
  source: '.p-source, .page-footer',
  note: '.p-note',
  figure: '.p-fig, .vf-value',
  figureSm: '.p-figsm',
};
/* ce que le style règle en plus de ses paragraphes (une ligne sous le nom) */
const ALSO = {
  section: 'Titres de section',
  subsection: 'Titres de sous-section et de carte',
  small: 'Tableaux',
  caption: 'Titres et sources des dataviz, légendes d’image',
  source: 'Pied de page',
  figure: 'Chiffres clés',
};
/* libellés de « Appliquer aux » (clés de traduction) */
export const APPLY_TO = { text: 'Textes', figure: 'Chiffres clés', card: 'Cartes', viz: 'Dataviz', table: 'Tableaux' };
const NOTES = ['caption', 'label', 'source', 'note']; // petits textes : seuil de lisibilité plus bas
const MIN_PT = { text: 8, note: 6 };

const num = (n, d = 2) => String(+(+n).toFixed(d)).replace('.', getLang() === 'fr' ? ',' : '.');
const readNum = (v) => parseFloat(String(v).replace(',', '.'));
const pt = (px) => (px * 3) / 4;

/** Ouvre la fenêtre ; une seule à la fois */
export function openTextStyles(ctx) {
  if (document.querySelector('dialog.tsd')) return;
  const doc = ctx.getDoc(),
    start = textSetOf(doc.textSet);
  let draft = JSON.parse(JSON.stringify(start)),
    applied = false;

  const dlg = h('dialog', { class: 'modal tsd', 'aria-label': t('Styles de paragraphe') });
  const status = h('div', { class: 'tsd-status', 'aria-live': 'polite' });
  const list = h('div', { class: 'tsd-list' });
  const resetAll = h(
    'button',
    { type: 'button', class: 'btn tsd-resetall', onclick: () => set(textSetOf(null)) },
    ico('restore'),
    t('Tout rétablir (gabarit)'),
  );

  /* ----- taille de tous les textes et interlignage ----- */
  const scaleIn = h('input', {
    type: 'number',
    class: 'pp-num',
    min: TEXT_SCALE_MIN * 100,
    max: TEXT_SCALE_MAX * 100,
    step: 1,
    'aria-label': t('Taille de tous les textes (%)'),
  });
  const setScale = (pct) => {
    const n = Math.min(TEXT_SCALE_MAX * 100, Math.max(TEXT_SCALE_MIN * 100, pct));
    set({ ...draft, scale: Math.round(n * 10) / 1000 });
  };
  scaleIn.addEventListener('change', () => {
    const n = readNum(scaleIn.value);
    if (n > 0) setScale(n);
    else sync();
  });
  const scaleStep = (d, icon, label) =>
    h(
      'button',
      { type: 'button', class: 'mini pp-step', 'aria-label': t(label), onclick: () => setScale(Math.round(draft.scale * 100 + d)) },
      ico(icon),
    );
  const leadNames = { 0: 'Normal', [-1]: 'Serré', [-2]: 'Très serré' };
  const leadSeg = h(
    'div',
    { class: 'seg seg-text', role: 'radiogroup', 'aria-label': t('Interlignage') },
    LEADS.map((n) =>
      h('button', {
        type: 'button',
        role: 'radio',
        dataset: { lead: n },
        textContent: t(leadNames[n]),
        title: n ? `−${num(-n * LEAD_STEP, 1)} px` : '',
        onclick: () => set({ ...draft, lead: n }),
      }),
    ),
  );
  const hyphBox = h('input', { type: 'checkbox', id: 'tsdHyph', onchange: () => set({ ...draft, hyph: hyphBox.checked }) });
  /* « Appliquer aux » : une case par type de colonne ; décochée = ce type garde les styles du gabarit (`textSet.skip`) */
  const skipBoxes = TEXT_SKIP_KEYS.map((k) => {
    const box = h('input', {
      type: 'checkbox',
      id: 'tsdOn-' + k,
      dataset: { type: k },
      onchange: () => set({ ...draft, skip: box.checked ? draft.skip.filter((x) => x !== k) : [...draft.skip, k] }),
    });
    return h('label', { class: 'tsd-check', for: 'tsdOn-' + k }, box, h('span', { textContent: t(APPLY_TO[k]) }));
  });

  /* « Ajuster pour tenir » sur le brouillon : plus grande taille où le recto et le verso tiennent (editor/fit.js) */
  const fitNote = h('span', { class: 'tsd-fitnote', 'aria-live': 'polite' });
  const fitDraft = () => {
    const r = fitScale({ ...ctx.getDoc(), textSet: draft });
    fitNote.textContent = r.fits ? '' : t('Même à 80 %, le contenu dépasse.');
    if (r.fits) set({ ...draft, scale: r.scale });
  };

  /* ----- un style ----- */
  const rows = {};
  const styleRow = (p) => {
    const k = p.type;
    const sizeIn = h('input', {
      type: 'number',
      class: 'pp-num',
      min: STYLE_SIZE.min,
      max: STYLE_SIZE.max,
      step: 0.5,
      'aria-label': `${t(p.n)} — ${t('Corps (pt)')}`,
    });
    const lhIn = h('input', {
      type: 'number',
      class: 'pp-num',
      min: 3,
      max: 112,
      step: 0.375,
      'aria-label': `${t(p.n)} — ${t('Interlignage (pt)')}`,
    });
    const own = () => draft.styles[k] || {};
    const put = (v) => {
      const styles = { ...draft.styles };
      const st = { ...own(), ...v };
      for (const x of Object.keys(st)) if (st[x] == null || st[x] === TYPE[k][x]) delete st[x];
      if (Object.keys(st).length) styles[k] = st;
      else delete styles[k];
      set({ ...draft, styles });
    };
    const setSize = (v) => {
      if (!(v > 0)) return sync();
      put({ size: Math.round(Math.min(STYLE_SIZE.max, Math.max(STYLE_SIZE.min, v)) * 10) / 10 });
    };
    const setLh = (px) => {
      if (!(px > 0)) return sync();
      put({ lh: Math.max(LEAD_STEP * 2, Math.round(px / LEAD_STEP) * LEAD_STEP) });
    };
    sizeIn.addEventListener('change', () => setSize(readNum(sizeIn.value)));
    lhIn.addEventListener('change', () => setLh((readNum(lhIn.value) * 4) / 3));
    const step = (label, icon, fn) =>
      h('button', { type: 'button', class: 'mini pp-step', 'aria-label': `${t(p.n)} — ${t(label)}`, onclick: fn }, ico(icon));
    const sizeCtl = h(
      'div',
      { class: 'pp-stepper' },
      step('Corps plus petit', 'minus', () => setSize(baseType(k, draft).size - 0.5)),
      sizeIn,
      step('Corps plus grand', 'plus', () => setSize(baseType(k, draft).size + 0.5)),
    );
    const lhCtl = h(
      'div',
      { class: 'pp-stepper' },
      step('Interlignage plus serré', 'minus', () => setLh(baseType(k, draft).lh - LEAD_STEP)),
      lhIn,
      step('Interlignage plus large', 'plus', () => setLh(baseType(k, draft).lh + LEAD_STEP)),
    );
    const ty = TYPE[k];
    const sample = h('span', {
      class: 'tsd-sample',
      textContent: t(p.n),
      style: {
        fontFamily: FONT[ty.family],
        fontWeight: ty.weight,
        fontStyle: p.italic ? 'italic' : '',
        textTransform: p.upper ? 'uppercase' : '',
        letterSpacing: p.upper ? '.08em' : '',
      },
    });
    const uses = h('small', { class: 'tsd-uses' });
    const eff = h('small', { class: 'tsd-eff' });
    const warn = h('small', { class: 'tsd-warn', hidden: true }, ico('alert-triangle'), h('span'));
    const reset = h('button', {
      type: 'button',
      class: 'mini tsd-reset',
      title: t('Revenir au style du gabarit'),
      'aria-label': `${t(p.n)} — ${t('Revenir au style du gabarit')}`,
      onclick: () => put({ size: null, lh: null }),
    });
    reset.append(ico('restore'));
    const row = h(
      'div',
      { class: 'tsd-row', dataset: { style: k } },
      h(
        'div',
        { class: 'tsd-name' },
        sample,
        ALSO[k] ? h('small', { class: 'tsd-also', textContent: t(ALSO[k]) }) : null,
        h('span', { class: 'tsd-meta' }, uses, eff),
        warn,
      ),
      h('div', { class: 'tsd-ctl' }, h('span', { textContent: t('Corps') }), sizeCtl),
      h('div', { class: 'tsd-ctl' }, h('span', { textContent: t('Interlignage') }), lhCtl),
      reset,
    );
    rows[k] = { row, sizeIn, lhIn, sample, uses, eff, warn, reset };
    return row;
  };
  for (const g of GROUPS)
    list.append(h('section', { class: 'tsd-group' }, h('h3', { textContent: t(g) }), PSTYLES.filter((p) => p.g === g).map(styleRow)));

  /* ----- brouillon, aperçu, affichage ----- */
  function sync() {
    const T = typeOf(draft);
    scaleIn.value = Math.round(draft.scale * 1000) / 10;
    leadSeg.querySelectorAll('button').forEach((b) => {
      const on = +b.dataset.lead === draft.lead;
      b.classList.toggle('on', on);
      b.setAttribute('aria-checked', String(on));
    });
    hyphBox.checked = draft.hyph;
    skipBoxes.forEach((l) => {
      const box = l.querySelector('input');
      box.checked = !draft.skip.includes(box.dataset.type);
    });
    for (const [k, r] of Object.entries(rows)) {
      const b = baseType(k, draft),
        e = T[k],
        mod = !!draft.styles[k];
      if (document.activeElement !== r.sizeIn) r.sizeIn.value = b.size;
      if (document.activeElement !== r.lhIn) r.lhIn.value = +pt(b.lh).toFixed(2);
      r.sample.style.fontSize = Math.min((e.size * 4) / 3, 24) + 'px';
      r.row.classList.toggle('mod', mod);
      r.reset.disabled = !mod;
      r.eff.textContent = draft.scale !== 1 || draft.lead !== 0 ? `${t('Dans la page')} : ${num(e.size, 1)} / ${num(pt(e.lh))} pt` : '';
      const min = NOTES.includes(k) ? MIN_PT.note : MIN_PT.text;
      r.warn.hidden = e.size >= min;
      r.warn.lastChild.textContent = `${t('Moins de')} ${min} pt : ${t('lisibilité à l’impression')}`;
    }
    resetAll.disabled = textSetIsDefault(draft);
  }
  function set(next) {
    draft = textSetOf(next);
    sync();
    const same = JSON.stringify(draft) === JSON.stringify(start);
    ctx.previewAs(same ? null : { ...ctx.getDoc(), textSet: draft });
  }
  /* après chaque dessin : place dans les pages et nombre d'usages de chaque style */
  const off = ctx.onDrawn((r) => {
    status.replaceChildren(
      ...r.pages.map((p) => {
        const o = r.overflows.find((x) => x.page === p.key);
        return h(
          'span',
          { class: 'tsd-page' + (o ? ' over' : '') },
          h('b', { textContent: p.key === 'recto' ? 'Recto' : 'Verso' }),
          o ? `${t('Dépasse de')} ${o.over} px` : `${t('Tient')} · ${Math.round((p.used / p.max) * 100)} %`,
        );
      }),
    );
    const pages = [...ctx.stage.querySelectorAll('.page:not(.ovf-clone)')];
    for (const [k, rw] of Object.entries(rows)) {
      const n = pages.reduce((a, pg) => a + pg.querySelectorAll(USES[k]).length, 0);
      rw.uses.textContent = n ? `${n} × ${t('dans le document')}` : t('Non utilisé');
      rw.row.classList.toggle('unused', !n);
    }
  });

  /* ----- fermeture ----- */
  const close = () => dlg.close();
  const apply = () => {
    applied = true;
    ctx.previewAs(null);
    if (JSON.stringify(draft) !== JSON.stringify(start)) {
      ctx.getDoc().textSet = draft;
      ctx.restructure();
    }
    close();
  };
  dlg.addEventListener('close', () => {
    off();
    if (!applied) ctx.previewAs(null);
    dlg.remove();
  });

  dlg.append(
    h(
      'div',
      { class: 'tsd-head' },
      h('h2', { textContent: t('Styles de paragraphe') }),
      h('button', { type: 'button', class: 'mini', 'aria-label': t('Fermer'), onclick: close }, ico('x')),
    ),
    h(
      'div',
      { class: 'tsd-top' },
      h(
        'div',
        { class: 'tsd-ctl' },
        h('span', { textContent: t('Taille de tous les textes') }),
        h(
          'div',
          { class: 'pp-stepper' },
          scaleStep(-5, 'minus', 'Diminuer'),
          scaleIn,
          scaleStep(5, 'plus', 'Augmenter'),
          h('span', { class: 'tsd-unit', textContent: '%' }),
          h('button', { type: 'button', class: 'btn tsd-fit', onclick: fitDraft }, ico('arrows-minimize'), t('Ajuster pour tenir')),
        ),
      ),
      h('div', { class: 'tsd-ctl' }, h('span', { textContent: t('Interlignage') }), leadSeg),
      h('label', { class: 'tsd-check', for: 'tsdHyph' }, hyphBox, h('span', { textContent: t('Césure automatique partout') })),
      h(
        'div',
        { class: 'tsd-apply', role: 'group', 'aria-label': t('Appliquer aux') },
        h('span', { textContent: t('Appliquer aux') }),
        skipBoxes,
      ),
      status,
      fitNote,
    ),
    h('p', {
      class: 'tsd-lead',
      textContent: t('Le header garde toujours ses styles. Un type décoché garde ceux du gabarit.'),
    }),
    list,
    h(
      'div',
      { class: 'tsd-foot' },
      resetAll,
      h('span', { class: 'tsd-gap' }),
      h('button', { type: 'button', class: 'btn', textContent: t('Annuler'), onclick: close }),
      h('button', { type: 'button', class: 'btn primary', textContent: t('Appliquer'), onclick: apply }),
    ),
  );
  document.body.append(dlg);
  sync();
  dlg.showModal();
  ctx.schedule(); // premier dessin : place dans les pages et usages
}
