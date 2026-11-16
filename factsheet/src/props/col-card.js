/* Colonne carte : le contenu d'abord (un champ par élément affiché), puis trois cartes de réglages — éléments affichés (dans l'ordre du rendu,
   chaque sous-réglage sous son interrupteur), image, style. Tant qu'on n'y touche pas, le type de carte suit la largeur de la colonne. */
import { h } from '../render.js';
import { t } from '../i18n.js';
import { toneKeys } from '../tokens.js';
import { helpBtn } from '../help.js';
import { newCard, cardPresetFor } from '../cardmodel.js';
import { cardFill } from '../card.js';
import { buildFields } from '../editor.js';
import { ICON_OPTIONS, customChoices, ctxIcons } from '../viz/icons.js';
import { iconSelect } from '../iconselect.js';

const CONTENT_FIELDS = [
  { k: 'tag', t: 'text', rich: true, label: 'Étiquette' },
  { k: 'title', t: 'text', rich: true, label: 'Titre' },
  { k: 'figure', t: 'text', rich: true, label: 'Chiffre' },
  { k: 'text', t: 'area', label: 'Texte' },
  { k: 'link', t: 'text', rich: true, label: 'Libellé du lien' },
];
/* éléments affichés, dans l'ordre où la carte les dessine */
const PARTS = [
  ['tag', 'Étiquette'],
  ['icon', 'Icône'],
  ['title', 'Titre'],
  ['figure', 'Chiffre'],
  ['text', 'Texte'],
  ['link', 'Lien'],
];
const POSITIONS = { vertical: 'En haut', left: 'À gauche', right: 'À droite' };

/** Renvoie `{ content, cards }` : les champs de la carte « Contenu » et les cartes de réglages à placer à la suite */
export function cardEditor(k, col, W) {
  const { ctx, doc, palOpts, imgPicker, switchRow, swatches, card, sumBox } = k;
  const C = col.card || (col.card = newCard(W)),
    ct = C.content || (C.content = {});
  if (C.fillColor === undefined) C.fillColor = cardFill(C); // carte d'avant le choix de couleur : « fond blanc » avec contour
  const chosen = (fn) => () => {
    fn();
    C.auto = false;
  };
  let autoRow = null;
  /* saisir du contenu, c'est déjà choisir sa carte : elle ne change plus toute seule avec la largeur de la colonne */
  const leaveAuto = () => {
    if (!C.auto) return;
    C.auto = false;
    const sw = autoRow && autoRow.querySelector('.pp-switch');
    if (sw) {
      sw.classList.remove('on');
      sw.setAttribute('aria-checked', 'false');
    }
  };
  const typing = Object.create(ctx);
  typing.changed = () => {
    leaveAuto();
    ctx.changed();
  };

  /* choix entre deux ou trois valeurs courtes (même aspect que `pair`), pour une option qui n'est pas une simple clé de texte */
  const choice = (label, current, choices, set) =>
    h(
      'div',
      { class: 'f' },
      h('div', { class: 'hint' }, label, helpBtn(label)),
      h(
        'div',
        { class: 'seg seg-text' },
        Object.entries(choices).map(([v, l]) =>
          h('button', {
            type: 'button',
            class: v === current ? 'on' : '',
            'aria-pressed': String(v === current),
            textContent: l,
            onclick: () => {
              set(v);
              C.auto = false;
              ctx.restructure();
            },
          }),
        ),
      ),
    );
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
        onChange: (v) => {
          C.iconName = v;
          C.auto = false;
          ctx.restructure();
        },
      }),
    );
  const part = ([key, label]) => [
    switchRow(
      label,
      !!C[key],
      chosen(() => {
        C[key] = !C[key];
      }),
    ),
    key === 'icon' && C.icon
      ? h(
          'div',
          { class: 'pp-nest' },
          iconChoice(),
          choice(
            'Style de l’icône',
            C.iconCircle ? 'circle' : 'plain',
            { plain: t('Pictogramme seul'), circle: t('Dans une pastille') },
            (v) => {
              C.iconCircle = v === 'circle';
            },
          ),
          choice(
            'Place de l’icône',
            C.iconInline ? 'inline' : 'above',
            { above: t('Au-dessus du titre'), inline: t('À côté du titre') },
            (v) => {
              C.iconInline = v === 'inline';
            },
          ),
        )
      : null,
  ];

  const url = h('input', {
    type: 'text',
    value: ct.url || '',
    placeholder: 'https://…',
    dataset: { plain: '1' },
    oninput: (e) => {
      ct.url = e.target.value.trim();
      typing.changed();
    },
  });
  const content = [
    /* un élément masqué garde son texte dans le document, seul son champ disparaît */
    ...buildFields(
      CONTENT_FIELDS.filter((f) => C[f.k]),
      ct,
      typing,
      palOpts,
      h,
    ),
    C.link
      ? h('div', { class: 'f', dataset: { fk: 'url' } }, h('div', { class: 'hint' }, 'Adresse du lien', helpBtn('Adresse du lien')), url)
      : null,
  ];

  autoRow = switchRow('Adapter à la largeur de la colonne', !!C.auto, () => {
    C.auto = !C.auto;
    if (C.auto) Object.assign(C, cardPresetFor(W));
  });
  const boxed = C.stroke || C.fillColor !== 'none',
    shownParts = PARTS.filter(([key]) => C[key]).length;
  const cards = [
    card(
      'col-card-parts',
      'list-check',
      t('Éléments de la carte'),
      [autoRow, ...PARTS.flatMap(part)],
      null,
      `${shownParts} / ${PARTS.length}`,
    ),
    card(
      'col-card-img',
      'photo',
      t('Image de la carte'),
      [
        imgPicker(
          'Fichier',
          () => C.src,
          (v) => {
            C.src = v;
            C.auto = false;
          },
          1200,
        ),
        choice(
          'Position de l’image',
          C.layout || 'vertical',
          Object.fromEntries(Object.entries(POSITIONS).map(([v, l]) => [v, t(l)])),
          (v) => {
            C.layout = v;
          },
        ),
        choice('Coins de l’image', C.imageCorners || 'round', { round: t('Arrondis'), square: t('Droits') }, (v) => {
          C.imageCorners = v;
        }),
        boxed
          ? switchRow(
              'Image jusqu’au bord',
              !!C.bleed,
              chosen(() => {
                C.bleed = !C.bleed;
              }),
            )
          : h('p', { class: 'hint', textContent: t('Avec un contour ou un fond, l’image peut aller jusqu’au bord de la carte.') }),
      ],
      {
        on: !!C.image,
        set: chosen(() => {
          C.image = !C.image;
        }),
      },
      C.image ? t(POSITIONS[C.layout] || POSITIONS.vertical) : t('Aucune'),
    ),
    card(
      'col-card-style',
      'border-all',
      t('Style de la carte'),
      [
        choice('Alignement', C.align || 'left', { left: t('Gauche'), center: t('Centré') }, (v) => {
          C.align = v;
        }),
        switchRow(t('Contour'), !!C.stroke, () => {
          C.stroke = !C.stroke;
        }),
        C.stroke ? swatches('Couleur du contour', C, 'strokeColor', toneKeys(doc)) : null,
        swatches('Fond', C, 'fillColor', toneKeys(doc), true),
      ],
      null,
      sumBox(C),
    ),
  ];
  return { content, cards };
}
