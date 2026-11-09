/* Colonne dataviz : choix du type et bouton d'ouverture de l'éditeur de dataviz (tous les réglages s'y font). */
import { h, ico } from '../render.js';
import { richSelect } from '../colorselect.js';
import { VIZ_TYPES, VIZ_FAMILIES, newViz, switchKind } from '../viz/index.js';

export function vizEditor(k, col, sub, ci) {
  const { ctx, fieldDiv } = k;
  if (!col.viz) col.viz = newViz('bars');
  const kinds = {};
  Object.keys(VIZ_FAMILIES).forEach(family =>
    Object.entries(VIZ_TYPES)
      .filter(([, v]) => v.family === family)
      .forEach(([key, v]) => {
        kinds[key] = v.label;
      })
  );
  const kindSel = richSelect({
    value: col.viz.kind,
    options: kinds,
    text: true,
    lead: key => ico((VIZ_TYPES[key] || {}).icon || 'chart-bar'),
    onChange: v => {
      col.viz = switchKind(col.viz, v);
      ctx.restructure();
    }
  });
  return [
    fieldDiv('Type de dataviz', kindSel),
    h('button', { type: 'button', class: 'primary', style: { width: '100%' }, onclick: () => ctx.editViz({ col, sub, ci }) }, ico('pencil'), ' Ouvrir l’éditeur de dataviz'),
    h('p', { class: 'hint', textContent: 'Tous les réglages de la dataviz (type, données, couleurs, options) se font dans l’éditeur.' })
  ];
}
