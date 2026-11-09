/* Colonne chiffre clé : champs décrits par FIGURE_FIELDS (figure.js). */
import { h } from '../render.js';
import { buildFields } from '../editor.js';
import { FIGURE_DEFAULTS, FIGURE_FIELDS } from '../figure.js';

export function figureEditor(k, col) {
  if (!col.figure) col.figure = FIGURE_DEFAULTS();
  return buildFields(FIGURE_FIELDS, col.figure, k.ctx, k.palOpts, h);
}
