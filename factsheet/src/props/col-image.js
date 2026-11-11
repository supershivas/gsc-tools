/* Colonne image : fichier, taille (format fixe, ajustée, personnalisée), position, légende. */
import { h } from '../render.js';
import { IMAGE_RATIOS, ALIGNS } from '../state.js';
import { t } from '../i18n.js';
import { withAssets, byFolder } from '../assetlib.js';

export function imageEditor(k, col) {
  const { ctx, live, field, text, select, segmented, imgPicker } = k;
  const mode = col.imgMode || 'ratio';
  const custom = mode === 'custom';
  const sizeInput = (key, min, max, step, fallback, clamp) =>
    h('input', {
      type: 'number',
      min,
      max,
      step,
      value: col[key] ?? fallback,
      oninput: live((v) => {
        col[key] = clamp(parseFloat(v) || fallback);
      }),
    });
  return [
    imgPicker(
      'Image',
      () => col.src,
      (v) => {
        col.src = v;
        col.natural = null;
      },
      1600,
    ),
    field(
      'Image du dépôt',
      withAssets(h('div'), (assets) => {
        const sel = h(
          'select',
          {
            onchange: (e) => {
              col.src = e.target.value || col.src;
              col.natural = null;
              ctx.restructure();
            },
          },
          h('option', { value: '', textContent: t('Choisir…') }),
          [...byFolder(assets, 'others')].map(([folder, es]) =>
            h(
              'optgroup',
              { label: folder || t('Racine') },
              es.map((e) => h('option', { value: e.path, textContent: e.stem, selected: col.src === e.path })),
            ),
          ),
        );
        return sel;
      }),
    ),
    select(
      col,
      'imgMode',
      'Taille de l’image',
      { ratio: 'Format fixe (recadrée)', fit: 'Ajustée au conteneur (proportions conservées)', custom: 'Taille personnalisée' },
      () => ctx.restructure(),
    ),
    mode === 'ratio' ? select(col, 'ratio', 'Format', Object.fromEntries(Object.keys(IMAGE_RATIOS).map((key) => [key, key]))) : null,
    custom
      ? h(
          'div',
          { class: 'row2' },
          field(
            'Largeur (% de la colonne)',
            sizeInput('imgW', 5, 100, 1, 100, (n) => Math.max(5, Math.min(100, n))),
          ),
          field(
            'Hauteur (px)',
            sizeInput('imgH', 3, 600, 3, 150, (n) => Math.max(3, n)),
          ),
        )
      : null,
    custom ? select(col, 'imgFit', 'Remplissage', { cover: 'Recadrer pour remplir', contain: 'Image entière' }) : null,
    custom && (col.imgW ?? 100) < 100
      ? segmented(
          'Position dans la colonne',
          col,
          'align',
          { left: ALIGNS.left, center: ALIGNS.center, right: ALIGNS.right },
          { left: t('Gauche'), center: t('Centré'), right: t('Droite') },
        )
      : null,
    text(col, 'caption', 'Légende (optionnelle)'),
  ];
}
