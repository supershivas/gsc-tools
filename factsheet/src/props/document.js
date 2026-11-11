/* Propriétés du document (rien de sélectionné) : nom, espacement, typographie, format des nombres, couleurs. */
import { h } from '../render.js';
import { t } from '../i18n.js';
import { DENSITIES } from '../tokens.js';
import { buildPalette } from '../palette.js';
import { LOCALES, useLogoFamily, useHeaderImage } from '../state.js';
import { withAssets, logoFamilies, logoVariantOf } from '../assetlib.js';
import { assetBrowser, assetDialog, localEntries } from './assetgrid.js';

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

  /* toutes les images : celles du dépôt (assets/) et celles qui ne sont que dans ce navigateur (marquées) */
  const imagesBox = () => {
    const H = doc.header;
    const browser = (assets, done, open) =>
      assetBrowser({
        doc,
        assets,
        open,
        isOn: (e) =>
          e.kind === 'logos'
            ? H.logoFamily === e.folder && logoVariantOf(e.stem) === H.logoVariant
            : e.kind === 'header'
              ? !!H.images.find((i) => i.id === H.imageId && i.src === e.path)
              : false,
        onPick: (e) => {
          if (e.local) return null;
          if (e.kind === 'logos')
            return () => {
              useLogoFamily(H, e.folder, logoFamilies(assets).get(e.folder) || {});
              done();
              ctx.restructure();
            };
          if (e.kind === 'header')
            return () => {
              useHeaderImage(H, e.path, e.stem);
              done();
              ctx.restructure();
            };
          return null; /* images du corps : choisies dans la colonne image */
        },
      });
    return withAssets(h('div'), (assets) => {
      const nLocal = ['logos', 'header', 'others'].reduce((n, kd) => n + localEntries(doc, kd).length, 0);
      return h(
        'div',
        {},
        h('p', {
          class: 'hint',
          textContent: t('Logo ou image du header : un clic l’applique. Les images du corps se choisissent dans la colonne image.'),
        }),
        browser(assets, () => {}),
        nLocal
          ? h('p', {
              class: 'hint',
              textContent: t(
                'L’icône nuage barré marque une image qui n’est que dans ce navigateur : déposez-la dans assets/ sur GitHub pour la conserver.',
              ),
            })
          : null,
        h('button', {
          type: 'button',
          textContent: t('Parcourir…'),
          onclick: () => assetDialog(t('Images du document'), (close) => browser(assets, close, true)),
        }),
      );
    });
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
    card('doc-images', 'photos', t('Images du document'), [imagesBox()]),
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
