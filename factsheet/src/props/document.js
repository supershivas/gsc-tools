/* Propriétés du document (rien de sélectionné) : nom, espacement, typographie, format des nombres, couleurs. */
import { h } from '../render.js';
import { t } from '../i18n.js';
import { DENSITIES } from '../tokens.js';
import { openPalette } from '../palette.js';
import { LOCALES } from '../state.js';

export function documentPanel(k) {
  const { doc, ctx, root, title, card, field, pair, switchRow, btn, struct } = k;
  const toggle = key => () => {
    doc[key] = !doc[key];
  };
  const densities = Object.fromEntries(Object.entries(DENSITIES).map(([key, d]) => [key, t(d.label)]));
  const localeSelect = () => {
    const s = h(
      'select',
      {
        onchange: e => {
          doc.locale = e.target.value;
          ctx.restructure();
        }
      },
      Object.entries(LOCALES).map(([v, l]) => h('option', { value: v, textContent: l }))
    );
    s.value = doc.locale || 'en-GB';
    return s;
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
            oninput: e => {
              doc.name = e.target.value;
              ctx.changed();
            }
          })
        ),
        pair('Espacement', doc, 'density', densities, struct(() => {})),
        switchRow('Typographie française', !!doc.frTypo, toggle('frTypo')),
        switchRow('Ordinaux et fractions', !!doc.ordinals, toggle('ordinals')),
        switchRow('Texte ajusté (veuves, orphelines)', !!doc.wrapFix, toggle('wrapFix')),
        h('p', {
          class: 'hint',
          textContent: t(
            'Typographie française : espaces insécables avant ; : ! ? % et dans les guillemets. Ordinaux : 1er, 2e en exposant, ½. Texte ajusté : pas de mot seul en dernière ligne, titres équilibrés.'
          )
        }),
        field('Format des nombres', localeSelect()),
        btn('palette', t('Couleurs du document'), e => openPalette(e.currentTarget, ctx))
      ],
      null,
      doc.name || ''
    ),
    h('p', { class: 'hint', textContent: t('Sélectionnez un élément dans la structure (à gauche) ou sur la page pour modifier ses propriétés.') })
  );
}
