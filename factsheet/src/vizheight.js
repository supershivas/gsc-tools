/* Options de hauteur d'une dataviz (mode, proportion, hauteur fixe, bornes du mode « remplir »), communes à l'éditeur de dataviz et au panneau de propriétés.
   Voir heightOf (viz/util.js) et fillPage (render.js). `avail` = { get, set } : place disponible simulée (éditeur seulement). */
import { h } from './render.js';
import { t } from './i18n.js';
import { buildFields } from './editor.js';
import { helpBtn } from './help.js';

export const MODE_LABELS = {
  auto: 'Automatique (hauteur naturelle)',
  ratio: 'Proportion de la largeur',
  fixed: 'Fixe',
  fill: 'Remplir la place disponible',
  match: 'Adapter à la colonne voisine',
};

export function heightNodes(ty, o, { ctx, width, avail }) {
  const modes = [...ty.heights, 'match'],
    mode = modes.includes(o.hmode) ? o.hmode : modes[0],
    rf = (ty.fields || []).find((f) => f.k === 'ratio');
  const sel = h(
    'select',
    {
      onchange: (e) => {
        o.hmode = e.target.value;
        ctx.restructure();
      },
    },
    modes.map((m) => h('option', { value: m, textContent: t(MODE_LABELS[m]), selected: m === mode })),
  );
  const num = (k, label, def, min, max, step = 3) =>
    h(
      'label',
      { class: 'f' },
      t(label),
      helpBtn(label),
      h('input', {
        type: 'number',
        value: o[k] ?? def,
        min,
        max,
        step,
        oninput: (e) => {
          const v = parseFloat(e.target.value);
          if (!isNaN(v)) {
            o[k] = v;
            ctx.changed();
          }
        },
      }),
    );
  const nodes = [h('label', { class: 'f' }, t('Hauteur'), helpBtn('Hauteur'), sel)];
  if (mode === 'ratio' && rf) nodes.push(...buildFields([rf], o, ctx, {}, h));
  if (mode === 'fixed') nodes.push(num('hfixed', 'Hauteur du graphique (px)', Math.round((width * 0.5625) / 3) * 3, 90, 900));
  if (mode === 'fill' || mode === 'match') {
    nodes.push(num('hmin', 'Hauteur minimale (px)', 120, 90, 900), num('hmax', 'Hauteur maximale (px)', 600, 90, 900));
    if (avail)
      nodes.push(
        h(
          'label',
          { class: 'f' },
          t('Place disponible pour cet aperçu (px)'),
          helpBtn('Place disponible pour cet aperçu (px)'),
          h('input', {
            type: 'number',
            value: avail.get(),
            min: 90,
            max: 1200,
            step: 15,
            oninput: (e) => {
              const v = parseFloat(e.target.value);
              if (!isNaN(v)) avail.set(v);
            },
          }),
        ),
      );
    nodes.push(
      h('p', {
        class: 'hint',
        textContent: t(
          'Dans le document, la dataviz occupe la place restante de la page (partagée s’il y en a plusieurs), entre ces deux bornes.',
        ),
      }),
    );
  }
  if (ty.boxed && (mode === 'fixed' || mode === 'fill' || mode === 'match')) {
    const vs = h(
      'select',
      {
        onchange: (e) => {
          o.valign = e.target.value;
          ctx.restructure();
        },
      },
      ['top', 'center', 'bottom'].map((v) =>
        h('option', {
          value: v,
          textContent: t({ top: 'En haut', center: 'Centré', bottom: 'En bas' }[v]),
          selected: (o.valign || 'top') === v,
        }),
      ),
    );
    nodes.push(h('label', { class: 'f' }, t('Alignement vertical de la dataviz'), helpBtn('Alignement vertical de la dataviz'), vs));
  }
  return nodes;
}
