/* Réglages de l'export PDF (le PDF lui-même est écrit par src/pdf/pdf.js, bundle pdfexport.js) :
   formats de feuille (A4 net, fond perdu 3 mm, fond perdu + traits de coupe) et profils de couleur. */
export const A4 = { w: 210, h: 297 };
export const BLEED_MM = 3,
  SLUG_MM = 9;
export const EXPORT_MODES = {
  net: { label: 'A4 net — 210 × 297 mm', note: 'Sans fond perdu ni repères.', offset: 0, bleed: false, marks: false },
  bleed: {
    label: 'Fond perdu 3 mm — 216 × 303 mm',
    note: 'Les fonds colorés débordent de 3 mm sur les 4 côtés.',
    offset: BLEED_MM,
    bleed: true,
    marks: false,
  },
  marks: {
    label: 'Fond perdu 3 mm + traits de coupe — 228 × 315 mm',
    note: 'Pour l’imprimeur : fond perdu et repères de coupe (feuille de 228 × 315 mm).',
    offset: SLUG_MM,
    bleed: true,
    marks: true,
  },
};

/* Profils du PDF (choisis avant l'export) : trois en CMJN pour l'imprimeur, un en RVB pour l'écran (`rgb: true`). Profil de sortie : FOGRA39 (ISO 12647-2:2004, offset, papier couché), profil ECI
   « ISO Coated v2 300 % » incorporé (icc/, librement diffusable). PDF/X-4 garde les transparences, PDF/X-1a les aplatit. */
const FOGRA39 = {
  icc: 'icc/ISOcoated_v2_300_eci.icc',
  iccName: 'ISO Coated v2 300% (ECI)',
  condition: 'FOGRA39',
  conditionText: 'Offset commercial, papier couché (ISO 12647-2:2004, FOGRA39)',
};
export const PDF_PROFILES = {
  x4: {
    label: 'PDF/X-4 — FOGRA39 (ISO Coated v2 300 %)',
    note: 'Recommandé : transparences conservées, profil d’impression incorporé. Liens non cliquables.',
    suffix: '-x4',
    ...FOGRA39,
  },
  x1a: {
    label: 'PDF/X-1a — FOGRA39 (ISO Coated v2 300 %)',
    note: 'Pour un imprimeur qui refuse la transparence : chaque transparence est remplacée par l’aplat équivalent sur son fond. Liens non cliquables.',
    suffix: '-x1a',
    ...FOGRA39,
  },
  none: { label: 'CMJN sans norme', note: 'Sans profil incorporé ; les liens restent cliquables (lecture à l’écran).', suffix: '' },
  rgb: {
    label: 'RVB (écran)',
    note: 'Couleurs de l’écran, sans profil : pour l’envoi par e-mail ou la lecture à l’écran, pas pour l’imprimeur. Liens cliquables.',
    suffix: '-rgb',
    rgb: true,
  },
};

export function sheetSize(mode) {
  const m = EXPORT_MODES[mode];
  return { w: A4.w + 2 * m.offset, h: A4.h + 2 * m.offset };
}
