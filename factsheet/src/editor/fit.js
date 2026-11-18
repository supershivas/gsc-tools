/* Gagner de la place quand le contenu dépasse (menu Texte, barre d'alertes, fenêtre des styles ; plan : docs/plan-texte.md, phase 4).
   - `fitScale(doc)` : plus grande taille de tous les textes (100 % → 80 %, pas de 2,5 %) où le recto et le verso tiennent ; le
     document est dessiné hors écran pour chaque essai (même rendu et même mesure que l'aperçu), il n'est jamais modifié.
   - `nextSaving(doc)` : le geste suivant de « Gagner de la place » (espacement serré → interlignage serré → taille −5 %), ou null. */
import { renderDocument, measure, h } from '../render.js';
import { textSetOf } from '../tokens.js';
import { t, getLang } from '../i18n.js';
import { alertBox } from '../dialogs.js';

export const FIT = { max: 1, min: 0.8, step: 0.025 };
const SAVE_MIN = 0.8; // « Gagner de la place » ne descend pas sous 80 %

/** le document (avec ces réglages du texte) dépasse-t-il d'une page ? */
function overflows(doc) {
  const host = h('div', { style: { position: 'absolute', left: '-20000px', top: '0', visibility: 'hidden' } });
  document.body.append(host);
  try {
    const r = renderDocument(doc);
    r.pages.forEach((p) => host.append(p.el));
    measure(r);
    return r.overflows.length > 0;
  } finally {
    host.remove();
  }
}

/** → { scale, fits } : la plus grande échelle (≤ 100 %) où tout tient ; `fits` faux si même 80 % dépasse (scale = 80 %) */
export function fitScale(doc) {
  const ts = textSetOf(doc.textSet);
  for (let s = FIT.max; s >= FIT.min - 1e-9; s -= FIT.step) {
    const scale = Math.round(s * 1000) / 1000;
    if (!overflows({ ...doc, textSet: { ...ts, scale } })) return { scale, fits: true };
  }
  return { scale: FIT.min, fits: false };
}

/** prochain geste pour gagner de la place : { label, apply(doc) } ou null s'il n'y en a plus */
export function nextSaving(doc) {
  const ts = textSetOf(doc.textSet);
  if ((doc.density || 'normal') !== 'tight') return { label: 'Espacement serré', apply: (d) => (d.density = 'tight') };
  if (ts.lead > -1) return { label: 'Interlignage serré', apply: (d) => (d.textSet = textSetOf({ ...textSetOf(d.textSet), lead: -1 })) };
  if (ts.scale > SAVE_MIN + 1e-9) {
    const scale = Math.max(SAVE_MIN, Math.round((Math.ceil(ts.scale * 20 - 1e-6) - 1) * 5) / 100);
    return {
      label: 'Texte à',
      pct: scale,
      apply: (d) => (d.textSet = textSetOf({ ...textSetOf(d.textSet), scale })),
    };
  }
  return null;
}

/* ----- gestes de l'éditeur (annulables par le toast et l'historique : `ctx.moved`) ----- */

export const pctLabel = (f) => String(Math.round(f * 1000) / 10).replace('.', getLang() === 'fr' ? ',' : '.') + ' %';

/** « Ajuster pour tenir » : applique la plus grande taille de texte où tout tient */
export async function fitText(ctx) {
  const doc = ctx.getDoc(),
    cur = textSetOf(doc.textSet).scale,
    r = fitScale(doc);
  if (!r.fits) return alertBox(t('Même à 80 %, le contenu dépasse. Essayez « Gagner de la place » ou déplacez une section.'));
  if (r.scale === cur) return ctx.note(`${t('Le texte est déjà à la plus grande taille qui tient')} (${pctLabel(cur)}).`);
  ctx.moved(
    () => {
      doc.textSet = textSetOf({ ...textSetOf(doc.textSet), scale: r.scale });
      return ctx.getSel();
    },
    `${t('Texte ajusté à')} ${pctLabel(r.scale)}.`,
    'Annuler',
  );
}

/** « Gagner de la place » : un geste de plus (espacement, interlignage, puis taille −5 %) */
export function saveSpace(ctx) {
  const doc = ctx.getDoc(),
    step = nextSaving(doc);
  if (!step) return alertBox(t('Plus rien à resserrer : déplacez une section ou raccourcissez un texte.'));
  ctx.moved(
    () => {
      step.apply(doc);
      return ctx.getSel();
    },
    step.pct ? `${t(step.label)} ${pctLabel(step.pct)}.` : `${t(step.label)}.`,
    'Annuler',
  );
}
