/* Colonne tableau : réglages minimaux (taille de la grille, lignes d'en-tête, préréglage d'habillage) et bouton de l'éditeur
   de tableau (texte des cellules, fusions, lignes et colonnes, collage ; voir table/editor.js et docs/plan-tableau.md). */
import { h, ico } from '../render.js';
import { t } from '../i18n.js';
import { richSelect } from '../colorselect.js';
import {
  TABLE_MAX,
  TABLE_PRESETS,
  HEAD_MAX,
  FOOT_MAX,
  headCount,
  footCount,
  resizeTable,
  setHeadRows,
  setFootRows,
  applyPreset,
  newTable,
} from '../table/model.js';
import { PRESET_ICONS } from '../table/panel-style.js';
import { confirmBox } from '../dialogs.js';

export { PRESET_ICONS };

export function tableEditor(k, col, sub, ci) {
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
  const heads = { n: String(headCount(tb)) },
    foots = { n: String(footCount(tb)) };
  const footChoices = Object.fromEntries(Array.from({ length: FOOT_MAX + 1 }, (_, i) => [String(i), String(i)]));
  const choices = Object.fromEntries(Array.from({ length: HEAD_MAX + 1 }, (_, i) => [String(i), String(i)]));
  const presets = Object.fromEntries(Object.entries(TABLE_PRESETS).map(([key, p]) => [key, p.label]));
  if (!TABLE_PRESETS[tb.look && tb.look.preset]) presets.custom = 'Personnalisé';
  return [
    h(
      'button',
      { type: 'button', class: 'primary', style: { width: '100%' }, onclick: () => ctx.editTable({ col, sub, ci }) },
      ico('pencil'),
      ' Ouvrir l’éditeur de tableau',
    ),
    h('p', {
      class: 'hint',
      textContent: t('Double-clic sur le tableau de l’aperçu : même éditeur (texte, fusions, collage depuis Excel ou Word).'),
    }),
    h('div', { class: 'row2' }, size('Lignes', 'rows', TABLE_MAX.rows), size('Colonnes', 'cols', TABLE_MAX.cols)),
    pair('Lignes d’en-tête', heads, 'n', choices, () => {
      setHeadRows(tb, +heads.n);
      ctx.restructure();
    }),
    pair('Lignes de pied', foots, 'n', footChoices, () => {
      setFootRows(tb, +foots.n);
      ctx.restructure();
    }),
    k.fieldDiv(
      'Préréglage',
      richSelect({
        value: (tb.look && tb.look.preset) || 'custom',
        options: presets,
        text: true,
        lead: (key) => ico(PRESET_ICONS[key] || 'table'),
        onChange: async (v) => {
          if (v === 'custom') return;
          if (
            Object.keys(tb.edges || {}).length &&
            !(await confirmBox(t('Les traits réglés sur des arêtes seront oubliés. Appliquer le préréglage ?'), { ok: t('Appliquer') }))
          )
            return;
          applyPreset(tb, v);
          ctx.restructure();
        },
      }),
    ),
    h('p', { class: 'hint', textContent: t('Le préréglage remplace les traits et les fonds du tableau.') }),
  ];
}
