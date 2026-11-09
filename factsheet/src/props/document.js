/* Propriétés du document (rien de sélectionné) : nom, espacement, typographie, format des nombres, couleurs. */
import { h } from '../render.js';
import { t } from '../i18n.js';
import { DENSITIES } from '../tokens.js';
import { buildPalette } from '../palette.js';
import { LOCALES } from '../state.js';

export function documentPanel(k) {
  const { doc, ctx, root, title, card, field, pair, switchRow, struct } = k;
  const toggle = (key) => () => {
    doc[key] = !doc[key];
  };
  const densities = Object.fromEntries(Object.entries(DENSITIES).map(([key, d]) => [key, t(d.label)]));
  const localeSelect = () => {
    const s = h(
      'select',
      {
        onchange: (e) => {
          doc.locale = e.target.value;
          ctx.restructure();
        },
      },
      Object.entries(LOCALES).map(([v, l]) => h('option', { value: v, textContent: l })),
    );
    s.value = doc.locale || 'en-GB';
    return s;
  };

  /* la palette est dans le panneau lui-même ; elle se redessine seule après un ajout, un import ou une suppression */
  const paletteBox = () => {
    const box = h('div');
    const draw = () => box.replaceChildren(buildPalette(ctx, draw));
    draw();
    return box;
  };

  title(doc.name || 'Document', [], { icon: 'file-text', pill: t('Document') });
  root.append(
    card(
      'doc-main',
      'file-text',
      t('Document'),
      [
        field(
          'Nom du fichier',
          h('input', {
            type: 'text',
            value: doc.name || '',
            oninput: (e) => {
              doc.name = e.target.value;
              ctx.changed();
            },
          }),
        ),
        pair(
          'Espacement',
          doc,
          'density',
          densities,
          struct(() => {}),
        ),
      ],
      null,
      doc.name || '',
    ),
    card('doc-colors', 'palette', t('Couleurs du document'), [paletteBox()]),
    card('doc-advanced', 'adjustments', t('Options avancées'), [
      switchRow('Typographie française', !!doc.frTypo, toggle('frTypo')),
      switchRow('Ordinaux et fractions', !!doc.ordinals, toggle('ordinals')),
      switchRow('Texte ajusté (veuves, orphelines)', !!doc.wrapFix, toggle('wrapFix')),
      h('p', {
        class: 'hint',
        textContent: t(
          'Typographie française : espaces insécables avant ; : ! ? % et dans les guillemets. Ordinaux : 1er, 2e en exposant, ½. Texte ajusté : pas de mot seul en dernière ligne, titres équilibrés.',
        ),
      }),
      field('Format des nombres', localeSelect()),
    ]),
    h('p', {
      class: 'hint',
      textContent: t('Sélectionnez un élément dans la structure (à gauche) ou sur la page pour modifier ses propriétés.'),
    }),
  );
}
