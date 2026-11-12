/* Fond perdu : de combien déborde le fond d'un élément de page (header, bande de section) sur les bords de la feuille.
   Une seule règle, partagée par l'export PDF (pdf.js, `bleedFor`) et l'export d'un élément en image (raster.js). */
import { BLEED_MM } from './export.js';

export const BLEED_PX = (BLEED_MM * 96) / 25.4;

/** → { l, r, t, b } en px, ou null si l'élément n'a pas de fond qui touche le bord. `pageEl` : la page qui le contient. */
export function bleedSides(el, pageEl) {
  const isHd = el.classList.contains('hd'),
    isBand = el.classList.contains('sec-band');
  if (!isHd && !isBand) return null;
  /* vers le haut : le header, ou la 1re bande d'une page SANS header (au recto, elle touche le header : elle le recouvrirait de 3 mm) */
  const top = isHd || (el.classList.contains('sec-first') && !pageEl.querySelector('.hd'));
  return { l: BLEED_PX, r: BLEED_PX, t: top ? BLEED_PX : 0, b: el.classList.contains('sec-last') && isBand ? BLEED_PX : 0 };
}
