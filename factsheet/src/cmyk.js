/* Couleurs d'impression. Les couleurs du document sont stockées en RVB (écran) ; les couleurs de la palette ont en plus une valeur CMJN
   exacte (`THEMES[...].cmyk`, ou `doc.cmyk[clé]` quand elle a été saisie dans l'onglet CMJN) : c'est elle qui part dans le PDF CMJN.
   Tout le reste (couleur hors palette, pixels d'une image) passe par la conversion simple sans profil ICC. */
import { THEMES, DEFAULT_THEME, paletteOf, tintOf, TINT, WHITE } from './tokens.js';

const hex2rgb = (h) => {
  const n = parseInt(String(h).replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const key = (rgb) => rgb.map((v) => Math.round(v)).join(',');

/** conversion simple, sans profil : [r, g, b] 0–255 → [c, m, y, k] 0–100 ; noir et gris restent en noir seul (jamais de noir riche) */
export function rgb2cmyk([r, g, b]) {
  const k = 1 - Math.max(r, g, b) / 255;
  if (k >= 1) return [0, 0, 0, 100];
  const f = (v) => ((1 - v / 255 - k) / (1 - k)) * 100;
  return [f(r), f(g), f(b), k * 100];
}
export const cmyk2rgb = ([c, m, y, k]) => [
  255 * (1 - c / 100) * (1 - k / 100),
  255 * (1 - m / 100) * (1 - k / 100),
  255 * (1 - y / 100) * (1 - k / 100),
];

/** CMJN de chaque couleur de la palette du document : { clé → [c, m, y, k] } */
export function paletteCmyk(doc) {
  const th = THEMES[doc.theme] || THEMES[DEFAULT_THEME],
    pal = paletteOf(doc.theme, doc.colors),
    out = {};
  for (const k of Object.keys(pal))
    out[k] =
      (doc.cmyk && doc.cmyk[k]) ||
      (th.cmyk && th.cmyk[k] && (!doc.colors || !doc.colors[k] || doc.colors[k].toLowerCase() === th.colors[k].toLowerCase())
        ? th.cmyk[k]
        : null) ||
      rgb2cmyk(hex2rgb(pal[k]));
  return out;
}

/** → fonction « couleur CSS rgb(r, g, b) → [c, m, y, k] 0–1 » : les couleurs de la palette (et leurs teintes à 20 %) retombent sur leurs valeurs exactes */
export function makeCmykResolver(doc) {
  const pal = paletteOf(doc.theme, doc.colors),
    cm = paletteCmyk(doc),
    exact = new Map();
  exact.set(key(hex2rgb(WHITE)), [0, 0, 0, 0]);
  for (const [k, hex] of Object.entries(pal)) {
    exact.set(key(hex2rgb(hex)), cm[k]);
    exact.set(
      key(hex2rgb(tintOf(hex))),
      cm[k].map((v) => v * TINT),
    ); // teinte = encres à 20 %
  }
  return (rgb) => {
    const hit = exact.get(key(rgb));
    return (hit || rgb2cmyk(rgb)).map((v) => Math.max(0, Math.min(100, v)) / 100);
  };
}
