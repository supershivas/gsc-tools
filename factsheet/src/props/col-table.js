/* Colonne tableau : réglages minimaux (taille de la grille, lignes d'en-tête, préréglage d'habillage).
   Texte des cellules, fusions et contours par arête : éditeur de tableau (voir docs/plan-tableau.md). */
import { h, ico } from '../render.js';
import { t } from '../i18n.js';
import { richSelect } from '../colorselect.js';
import { TABLE_MAX, TABLE_PRESETS, HEAD_MAX, headCount, resizeTable, setHeadRows, applyPreset, newTable } from '../table/model.js';

export const PRESET_ICONS = {
  rules: 'border-horizontal',
  zebra: 'layout-rows',
  headfill: 'layout-navbar',
  grid: 'border-all',
  none: 'border-none',
};

export function tableEditor(k, col) {
  const { ctx, field, pair } = k;
  if (!col.table) col.table = newTable();
  const tb = col.table;
  const size = (label, key, max) =>
    field(
      label,
      h('input', {
        type: 'number',
        min: 1,
        max,
        step: 1,
        value: tb[key].length,
        onchange: (e) => {
          const n = Math.max(1, Math.min(max, Math.round(+e.target.value) || 1));
          resizeTable(tb, key === 'rows' ? n : tb.rows.length, key === 'cols' ? n : tb.cols.length);
          ctx.restructure();
        },
      }),
    );
  const heads = { n: String(headCount(tb)) };
  const choices = Object.fromEntries(Array.from({ length: HEAD_MAX + 1 }, (_, i) => [String(i), String(i)]));
  const presets = Object.fromEntries(Object.entries(TABLE_PRESETS).map(([key, p]) => [key, p.label]));
  if (!TABLE_PRESETS[tb.look && tb.look.preset]) presets.custom = 'Personnalisé';
  return [
    h('div', { class: 'row2' }, size('Lignes', 'rows', TABLE_MAX.rows), size('Colonnes', 'cols', TABLE_MAX.cols)),
    pair('Lignes d’en-tête', heads, 'n', choices, () => {
      setHeadRows(tb, +heads.n);
      ctx.restructure();
    }),
    k.fieldDiv(
      'Préréglage',
      richSelect({
        value: (tb.look && tb.look.preset) || 'custom',
        options: presets,
        text: true,
        lead: (key) => ico(PRESET_ICONS[key] || 'table'),
        onChange: (v) => {
          if (v === 'custom') return;
          applyPreset(tb, v);
          ctx.restructure();
        },
      }),
    ),
    h('p', { class: 'hint', textContent: t('Le préréglage remplace les traits et les fonds du tableau.') }),
  ];
}
