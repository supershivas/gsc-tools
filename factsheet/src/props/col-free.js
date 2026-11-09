/* Textes libres d'une colonne : plusieurs, posés où l'on veut (déplaçables à la souris dans l'aperçu). */
import { h, ico } from '../render.js';
import { t } from '../i18n.js';
import { toneKeys } from '../tokens.js';
import { richEditor } from '../editor.js';

const PLACEMENTS = [
  ['free', 'Libre (glisser dans l’aperçu)'],
  ['above', 'Au-dessus du contenu'],
  ['below', 'En dessous du contenu']
];

export function freeTexts(k, col) {
  const { doc, ctx, field } = k;
  const arr = col.texts || (col.texts = []);
  const num = (label, tx, key, min, max) =>
    field(
      label,
      h('input', {
        type: 'number',
        min,
        max,
        step: 1,
        value: tx[key] ?? 0,
        oninput: e => {
          tx[key] = +e.target.value || 0;
          ctx.changed();
        }
      })
    );
  const placement = tx => {
    const sl = h(
      'select',
      {
        onchange: e => {
          tx.mode = e.target.value;
          ctx.restructure();
        }
      },
      PLACEMENTS.map(([v, l]) => h('option', { value: v, textContent: t(l) }))
    );
    sl.value = tx.mode || 'free';
    return field('Placement', sl);
  };
  const item = (tx, i) =>
    h(
      'div',
      { class: 'col-card' },
      h(
        'div',
        { class: 'chd' },
        h('span', { textContent: `#${i + 1}` }),
        h(
          'button',
          {
            type: 'button',
            class: 'mini danger',
            title: t('Supprimer'),
            onclick: () => {
              arr.splice(i, 1);
              ctx.restructure();
            }
          },
          ico('x')
        )
      ),
      richEditor(
        tx.text || '',
        v => {
          tx.text = v;
          ctx.changed();
        },
        { gallery: true, adv: tx, advChange: () => ctx.changed(), palette: toneKeys(doc) }
      ),
      placement(tx),
      (tx.mode || 'free') === 'free'
        ? h(
            'div',
            { class: 'row' },
            num('X (% de la colonne)', tx, 'x', 0, 100),
            num('Largeur (%)', tx, 'w', 10, 100),
            tx.y == null ? null : num('Y (px)', tx, 'y', 0, 2000)
          )
        : null
    );
  const add = () => {
    arr.push({ x: 0, y: arr.length * 30, w: 50, text: 'Texte libre' });
    ctx.restructure();
  };
  return [
    ...arr.map(item),
    h('button', { type: 'button', class: 'pp-btn', onclick: add }, ico('plus'), h('span', { textContent: t('Ajouter un texte') })),
    h('p', {
      class: 'hint',
      textContent: t(
        'Glisser un texte « libre » dans l’aperçu pour le placer où l’on veut dans la colonne ; « au-dessus » ou « en dessous » le met dans le flux, avant ou après le contenu.'
      )
    })
  ];
}
