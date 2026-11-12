/* Propriétés d'une section : titre, filets, page, fond et contour. */
import { exportCard } from './export-card.js';
import { t } from '../i18n.js';
import { h } from '../render.js';
import { toneKeys } from '../tokens.js';
import { defaultRuleColor } from '../render.js';
import { stepSection } from '../state.js';

/** Carte « Couleur du texte » commune aux sections, sous-sections et colonnes : `fg`, « Aucun » = celle du niveau au-dessus */
export function textColorCard(k, obj) {
  const { doc, card, swatches, sumColor } = k;
  return card(
    'text-color',
    'palette',
    t('Couleur du texte'),
    [
      swatches('Couleur du texte', obj, 'fg', toneKeys(doc), true),
      h('p', {
        class: 'hint',
        textContent: t('Aucun : le texte garde la couleur du niveau au-dessus. Une couleur choisie dans le texte l’emporte.'),
      }),
    ],
    null,
    sumColor(obj.fg),
  );
}

export function sectionPanel(k, { si, sec }) {
  const { doc, ctx, root, title, card, text, pair, swatches, switchRow, boxControls, sumColor, sumBox, struct } = k;
  const isLast = doc.sections.filter((x) => x.page === sec.page).pop() === sec;
  const flip = (obj, key) => () => {
    obj[key] = obj[key] === false;
  };
  /* Le filet a une couleur par défaut tant qu'on n'en a pas choisi */
  const ruleColor = {
    get ruleColor() {
      return sec.ruleColor || defaultRuleColor(sec);
    },
    set ruleColor(v) {
      sec.ruleColor = v;
    },
  };

  title(sec.title || 'Section', [], {
    icon: 'layout-rows',
    pill: sec.page === 'recto' ? t('Recto') : t('Verso'),
    acts: [
      ['arrow-up', t('Monter'), struct(() => stepSection(doc, si, -1))],
      ['arrow-down', t('Descendre'), struct(() => stepSection(doc, si, 1))],
      ['trash', t('Supprimer'), () => ctx.remove(`sec:${si}`), 'danger'],
    ],
  });
  root.append(
    card('sec-main', 'layout-rows', t('Section'), [
      text(sec, 'title', 'Titre de section'),
      switchRow(t('Afficher le titre'), sec.showTitle !== false, flip(sec, 'showTitle')),
      switchRow(t('Filet au-dessus de la section'), sec.secRule !== false, flip(sec, 'secRule')),
      switchRow(t('Filet entre les sous-sections'), sec.subRules !== false, flip(sec, 'subRules')),
      sec.subRules !== false ? swatches('Couleur du filet', ruleColor, 'ruleColor', toneKeys(doc)) : null,
      pair('Page', sec, 'page', { recto: t('Recto'), verso: t('Verso') }, () => ctx.restructure()),
      /* dernière section de sa page seulement */
      ...(isLast
        ? [
            switchRow(t('Aligner en bas de la page'), !!sec.alignBottom, () => {
              sec.alignBottom = !sec.alignBottom;
            }),
            sec.alignBottom
              ? pair('Fond', sec, 'bottomFit', { fill: t('Toute la hauteur'), fit: t('Hauteur de la section') }, () => ctx.restructure())
              : null,
          ]
        : []),
    ]),
    card(
      'sec-bg',
      'color-swatch',
      t('Fond et contour'),
      [swatches('Fond', sec, 'bg', toneKeys(doc), true), ...boxControls(sec, 'Fond du cadre')],
      null,
      [sumColor(sec.bg), sumBox(sec)].filter((x) => x !== t('Aucun')).join(' · ') || t('Aucun'),
    ),
    textColorCard(k, sec),
    exportCard(k, `sec:${si}`),
  );
}
