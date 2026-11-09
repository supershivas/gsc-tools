/* Colonne carte : le contenu d'abord, puis toutes les options (cochables) ; tant qu'on n'y touche pas, le type de carte suit la largeur de la colonne. */
import { h } from '../render.js';
import { t } from '../i18n.js';
import { newCard, cardPresetFor, CARD_CHECKS } from '../cardmodel.js';
import { buildFields } from '../editor.js';
import { ICON_OPTIONS, customChoices, ctxIcons } from '../viz/icons.js';
import { iconSelect } from '../iconselect.js';

const CONTENT_FIELDS = [
  { k: 'tag', t: 'text', rich: true, label: 'Étiquette' },
  { k: 'title', t: 'text', rich: true, label: 'Titre' },
  { k: 'figure', t: 'text', rich: true, label: 'Chiffre' },
  { k: 'text', t: 'area', label: 'Texte' },
  { k: 'bullets', t: 'lines', rich: true, label: 'Puces (une par ligne)' },
  { k: 'link', t: 'text', rich: true, label: 'Lien' },
];

export function cardEditor(k, col, W) {
  const { ctx, palOpts, field, imgPicker } = k;
  const C = col.card || (col.card = newCard(W)),
    ct = C.content;
  const chosen = (fn) => {
    fn();
    C.auto = false;
    ctx.restructure();
  };
  const check = ([key, label]) =>
    h(
      'label',
      { class: 'row' },
      h('input', {
        type: 'checkbox',
        checked: !!C[key],
        onchange: (e) =>
          chosen(() => {
            C[key] = e.target.checked;
          }),
      }),
      label,
    );
  const sel = (key, label, opts) => {
    const s = h(
      'select',
      {
        onchange: (e) =>
          chosen(() => {
            C[key] = e.target.value;
          }),
      },
      Object.entries(opts).map(([v, l]) => h('option', { value: v, textContent: l })),
    );
    s.value = C[key];
    return field(label, s);
  };
  const iconChoice = () =>
    h(
      'div',
      { class: 'f' },
      h('div', { class: 'hint', textContent: t('Icône choisie') }),
      iconSelect({
        value: C.iconName || Object.keys(ICON_OPTIONS)[0],
        options: { ...ICON_OPTIONS, ...customChoices(null, ctxIcons(ctx)) },
        text: true,
        icons: ctxIcons(ctx),
        refresh: () => ctx.restructure(),
        onChange: (v) =>
          chosen(() => {
            C.iconName = v;
          }),
      }),
    );

  return h(
    'div',
    {},
    ...buildFields(CONTENT_FIELDS, ct, ctx, palOpts, h),
    C.image
      ? imgPicker(
          'Image de la carte',
          () => C.src,
          (v) => {
            C.src = v;
          },
          1200,
        )
      : null,
    h(
      'details',
      { class: 'opts', open: true },
      h('summary', { textContent: 'Options de la carte' }),
      h(
        'label',
        { class: 'row' },
        h('input', {
          type: 'checkbox',
          checked: !!C.auto,
          onchange: (e) => {
            C.auto = e.target.checked;
            if (C.auto) Object.assign(C, cardPresetFor(W));
            ctx.restructure();
          },
        }),
        'Type de carte selon la largeur de la colonne',
      ),
      sel('layout', 'Position de l’image', { vertical: t('En haut'), left: t('À gauche'), right: t('À droite') }),
      sel('align', 'Alignement', { left: t('Gauche'), center: t('Centré') }),
      C.icon ? iconChoice() : null,
      CARD_CHECKS.map(check),
    ),
  );
}
