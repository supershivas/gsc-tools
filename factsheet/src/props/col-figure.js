/* Colonne chiffre clé : champs décrits par FIGURE_FIELDS (figure.js), rangés par carte — le chiffre et son texte dans « Contenu »,
   puis icône, barre de progression, en-tête et chiffres à côté, chacune repliée avec sa valeur en résumé. */
import { h } from '../render.js';
import { t } from '../i18n.js';
import { buildFields } from '../editor.js';
import { FIGURE_DEFAULTS, FIGURE_FIELDS } from '../figure.js';
import { ICON_OPTIONS } from '../viz/icons.js';
import { stripMk } from '../viz/util.js';

const of = (c) => FIGURE_FIELDS.filter((f) => f.c === c);
const iconName = (key) =>
  !key || key === 'none' ? t('Aucune') : String(key).startsWith('custom:') ? t('Importée') : t(ICON_OPTIONS[key] || key);

/** Renvoie `{ content, cards }` : les champs de la carte « Contenu » et les cartes de réglages à placer à la suite */
export function figureEditor(k, col) {
  if (!col.figure) col.figure = FIGURE_DEFAULTS();
  const F = col.figure,
    fields = (c) => buildFields(of(c), F, k.ctx, k.palOpts, h),
    more = Array.isArray(F.more) ? F.more.length : 0,
    head = stripMk(String(F.headText || '')).trim();
  return {
    content: fields('main'),
    cards: [
      k.card('col-fig-icon', 'icons', t('Icône'), fields('icon'), null, iconName(F.icon)),
      k.card('col-fig-bar', 'progress', t('Barre de progression'), fields('bar'), null, +F.bar > 0 ? `${+F.bar} %` : t('Aucune')),
      k.card(
        'col-fig-head',
        'heading',
        t('En-tête des chiffres'),
        fields('head'),
        null,
        head
          ? head.length > 18
            ? head.slice(0, 17) + '…'
            : head
          : F.headIcon && F.headIcon !== 'none'
            ? iconName(F.headIcon)
            : t('Aucun'),
      ),
      k.card('col-fig-more', 'columns-3', t('Chiffres à côté'), fields('more'), null, more ? String(more) : t('Aucun')),
    ],
  };
}
