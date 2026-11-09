/* Propriétés d'une section : titre, filets, page, fond et contour. */
import { t } from '../i18n.js';
import { toneKeys } from '../tokens.js';
import { defaultRuleColor } from '../render.js';
import { stepSection } from '../state.js';

export function sectionPanel(k, { si, sec }) {
  const { doc, ctx, root, title, card, text, pair, swatches, switchRow, boxControls, sumColor, sumBox, struct } = k;
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
    }
  };

  title(sec.title || 'Section', [], {
    icon: 'layout-rows',
    pill: sec.page === 'recto' ? t('Recto') : t('Verso'),
    acts: [
      ['arrow-up', t('Monter'), struct(() => stepSection(doc, si, -1))],
      ['arrow-down', t('Descendre'), struct(() => stepSection(doc, si, 1))],
      ['trash', t('Supprimer'), () => ctx.remove(`sec:${si}`), 'danger']
    ]
  });
  root.append(
    card('sec-main', 'layout-rows', t('Section'), [
      text(sec, 'title', 'Titre de section'),
      switchRow(t('Afficher le titre'), sec.showTitle !== false, flip(sec, 'showTitle')),
      switchRow(t('Filet au-dessus de la section'), sec.secRule !== false, flip(sec, 'secRule')),
      switchRow(t('Filet entre les sous-sections'), sec.subRules !== false, flip(sec, 'subRules')),
      sec.subRules !== false ? swatches('Couleur du filet', ruleColor, 'ruleColor', toneKeys(doc)) : null,
      pair('Page', sec, 'page', { recto: t('Recto'), verso: t('Verso') }, () => ctx.restructure())
    ]),
    card(
      'sec-bg',
      'color-swatch',
      t('Fond et contour'),
      [swatches('Fond', sec, 'bg', toneKeys(doc), true), ...boxControls(sec, 'Fond du cadre')],
      null,
      [sumColor(sec.bg), sumBox(sec)].filter(x => x !== t('Aucun')).join(' · ') || t('Aucun')
    )
  );
}
