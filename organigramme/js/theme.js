/* Couleurs et polices du document (le produit, pas l’interface de l’app).
   Chaque couleur a sa valeur d’impression (CMJN, 0 à 1) et sa valeur d’écran (relevée dans le gabarit). */

export const COLORS = {
  blue: { cmyk: [1, 0.8, 0, 0], rgb: '#034EA2' }, // EU Blue 100-80-0-0
  mid: { cmyk: [0.6, 0.48, 0, 0], rgb: '#668CC8' }, // EU Blue à 60 % (en-tête des cadres secondaires)
  light: { cmyk: [0.25, 0.2, 0, 0], rgb: '#C7CBE7' }, // EU Blue à 25 % (barre de sous-section)
  white: { cmyk: [0, 0, 0, 0], rgb: '#FFFFFF' },
};

/* Motif des traits en tirets (points PDF) : mêmes valeurs à l’écran et dans le PDF. */
export const DASH = [2.5, 2];

/* Polices statiques d’Adobe (organigramme/fonts, licence OFL), celles du gabarit : le même fichier sert
   à l’écran (@font-face, css/organigramme.css) et dans le PDF, donc mêmes dessins, largeurs et crénage.
   Celles de factsheet/fonts/pdf ne conviennent pas : autre taille optique, sans crénage. */
export const FONTS = {
  sansB: { file: 'SourceSans3-Bold', family: 'PEC Sans Bold' },
  serifSBI: { file: 'SourceSerif4-SemiboldIt', family: 'PEC Serif SemiboldIt' },
  serifI: { file: 'SourceSerif4-It', family: 'PEC Serif It' },
};

export const FONT_DIR = new URL('../fonts/', import.meta.url).href;
export const ICC_URL = new URL('../../factsheet/icc/ISOcoated_v2_300_eci.icc', import.meta.url).href;
export const ICC_NAME = 'ISO Coated v2 300% (ECI)';
