/* Export PDF vectoriel : pages recto/verso recomposées sur des feuilles calibrées en mm,
   puis impression du navigateur (« Enregistrer au format PDF »). Texte, courbes et SVG restent vectoriels,
   les polices sont incorporées. Trois modes : A4 net, fond perdu 3 mm, fond perdu + traits de coupe. */
import { PAGE } from './tokens.js';
import { renderDocument, measure, h } from './render.js';

const MM = 96 / 25.4;
export const A4 = { w: 210, h: 297 };
export const BLEED_MM = 3, SLUG_MM = 9;
export const EXPORT_MODES = {
  net:   { label: 'A4 net — 210 × 297 mm', note: 'Sans fond perdu ni repères.', offset: 0, bleed: false, marks: false },
  bleed: { label: 'Fond perdu 3 mm — 216 × 303 mm', note: 'Les fonds colorés débordent de 3 mm sur les 4 côtés.', offset: BLEED_MM, bleed: true, marks: false },
  marks: { label: 'Fond perdu 3 mm + traits de coupe — 228 × 315 mm', note: 'Pour l’imprimeur : fond perdu et repères de coupe (feuille de 228 × 315 mm).', offset: SLUG_MM, bleed: true, marks: true },
};

export function sheetSize(mode) { const m = EXPORT_MODES[mode]; return { w: A4.w + 2 * m.offset, h: A4.h + 2 * m.offset }; }

function cropMarks(offset) {
  // deux traits par coin, à 3 mm du format fini (au bord du fond perdu), longs de 3 mm, 0,25 pt
  const g = h('div', { class: 'marks' }), L = 3, gap = BLEED_MM;
  const line = (x, y, w, hh) => g.append(h('i', { style: { left: x + 'mm', top: y + 'mm', width: w + 'mm', height: hh + 'mm' } }));
  const X = [offset, offset + A4.w], Y = [offset, offset + A4.h];
  for (const [xi, x] of X.entries()) for (const [yi, y] of Y.entries()) {
    const sx = xi ? 1 : -1, sy = yi ? 1 : -1;
    line(sx < 0 ? x - gap - L : x + gap, y, L, 0);      // horizontal
    line(x, sy < 0 ? y - gap - L : y + gap, 0, L);      // vertical
  }
  return g;
}

/** Construit #print-root + la règle @page. Retourne une fonction de nettoyage. */
export async function preparePrint(doc, mode) {
  const m = EXPORT_MODES[mode] || EXPORT_MODES.net, size = sheetSize(mode);
  if (document.fonts && document.fonts.ready) await document.fonts.ready;
  cleanupPrint();
  const root = h('div', { id: 'print-root', class: m.bleed ? 'print-bleed' : '' });
  // mesure hors écran (les dernières sections colorées descendent jusqu'au bas de page)
  Object.assign(root.style, { display: 'block', position: 'absolute', left: '-20000px', top: '0' });
  const result = renderDocument(doc);
  const k = (A4.w * MM) / PAGE.w;                         // 793,7 px réels pour 210 mm
  for (const p of result.pages) {
    const holder = h('div', { class: 'print-page', style: { left: m.offset + 'mm', top: m.offset + 'mm', transform: `scale(${k})` } }, p.el);
    root.append(h('div', { class: 'print-sheet', style: { width: size.w + 'mm', height: size.h + 'mm' } }, holder, m.marks ? cropMarks(m.offset) : null));
  }
  document.body.append(root);
  measure(result);
  root.removeAttribute('style');                          // retour au CSS : visible seulement à l'impression
  const st = h('style', { id: 'print-page-style', textContent: `@page{size:${size.w}mm ${size.h}mm;margin:0}` });
  document.head.append(st);
  return { cleanup: cleanupPrint, size, result };
}
export function cleanupPrint() {
  for (const id of ['print-root', 'print-page-style']) { const n = document.getElementById(id); if (n) n.remove(); }
}
