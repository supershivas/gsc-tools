/* Propriétés du header : textes, couleurs, bibliothèque d'images, logo (4 versions). */
import { exportCard } from './export-card.js';
import { h, ico, headerImage } from '../render.js';
import { t } from '../i18n.js';
import { toneKeys } from '../tokens.js';
import { LOGO_VARIANTS, DEFAULT_LOGOS, DEFAULT_IMAGE_ID, newHeaderImage, useLogoFamily, useHeaderImage } from '../state.js';
import { withAssets, logoFamilies } from '../assetlib.js';
import { assetBrowser } from './assetgrid.js';
import { readImage } from '../editor.js';
import { alertBox, confirmBox, promptBox } from '../dialogs.js';

/* Logo : une famille (dossier de assets/logos/) et 4 versions de même taille ; une rangée de vignettes choisit celle qui s'affiche.
   Les logos d'origine (publiés dans le dépôt) ne se retirent pas : on peut charger une autre image à leur place, puis rétablir l'original. */
function logoPicker(k, H) {
  return withAssets(h('div'), (assets) => logoBody(k, H, assets));
}
function logoBody(k, H, assets) {
  const { ctx, field, struct } = k;
  const families = logoFamilies(assets),
    v = H.logoVariant,
    orig = (families.get(H.logoFamily) || {})[v] || DEFAULT_LOGOS()[v],
    custom = H.logos[v] !== orig;
  const names = [...families.keys()].sort((a, b) => a.localeCompare(b));
  if (!names.includes(H.logoFamily)) names.unshift(H.logoFamily);
  const famSel = h(
    'select',
    {
      onchange: (e) => {
        useLogoFamily(H, e.target.value, families.get(e.target.value) || {});
        ctx.restructure();
      },
    },
    names.map((f) => h('option', { value: f, textContent: f, selected: f === H.logoFamily })),
  );
  const versions = h(
    'div',
    { class: 'logorow' },
    Object.entries(LOGO_VARIANTS).map(([key, l]) =>
      h(
        'button',
        {
          type: 'button',
          class: 'imgtile' + (key === v ? ' on' : ''),
          title: `${t(l)} — ${t(H.logos[key] !== ((families.get(H.logoFamily) || {})[key] || DEFAULT_LOGOS()[key]) ? 'personnalisé' : 'original')}`,
          onclick: () => {
            H.logoVariant = key;
            ctx.restructure();
          },
        },
        h(
          'span',
          { class: 'imgtile-pic' + (key === 'white' || key === 'negative' ? ' dark' : '') },
          h('img', { src: H.logos[key], alt: '' }),
        ),
        h('span', { class: 'imgtile-name', textContent: t(l) }),
      ),
    ),
  );
  const inp = h('input', {
    type: 'file',
    accept: 'image/*',
    hidden: true,
    onchange: async () => {
      const f = inp.files[0];
      inp.value = '';
      if (!f) return;
      try {
        H.logos[v] = await readImage(f, 800);
        ctx.restructure();
      } catch (e) {
        alertBox(t('Image illisible.'));
      }
    },
  });
  return h(
    'div',
    {},
    field('Famille de logos', famSel),
    versions,
    h(
      'div',
      { class: 'f' },
      h('div', { class: 'hint', textContent: `Logo — ${t(LOGO_VARIANTS[v])}` }),
      h(
        'div',
        { class: 'row' },
        h('button', { type: 'button', textContent: 'Charger une autre image…', onclick: () => inp.click() }),
        custom
          ? h('button', {
              type: 'button',
              textContent: 'Rétablir l’original',
              onclick: struct(() => {
                H.logos[v] = orig;
              }),
            })
          : null,
        inp,
      ),
    ),
    h('p', { class: 'hint', textContent: 'Les 4 versions ont la même taille (138 × 42 px). PNG transparent ou SVG.' }),
  );
}

/* Images du header : une bibliothèque sans limite (on démarre avec deux), la vignette cliquée est affichée */
function imageLibrary(k, H) {
  const { ctx } = k;
  const cur = headerImage(H);
  const pick = (e) => async () => {
    const inp = e.input;
    const f = inp.files[0];
    inp.value = '';
    if (!f) return;
    try {
      e.img.src = await readImage(f, 800);
      H.imageId = e.img.id;
      ctx.restructure();
    } catch (x) {
      alertBox(t('Image illisible.'));
    }
  };
  const rename = (img) => async () => {
    const n = await promptBox(t('Nom de l’image :'), img.name);
    if (n && n.trim()) {
      img.name = n.trim();
      ctx.restructure();
    }
  };
  const remove = (img) => async () => {
    if (!(await confirmBox(t('Supprimer cette image ?'), { ok: t('Supprimer'), danger: true }))) return;
    H.images.splice(H.images.indexOf(img), 1);
    if (H.imageId === img.id) H.imageId = H.images[0].id;
    ctx.restructure();
  };
  const tile = (img) => {
    const inp = h('input', { type: 'file', accept: 'image/*', hidden: true });
    inp.addEventListener('change', pick({ input: inp, img }));
    return h(
      'div',
      { class: 'imgtile' + (cur && cur.id === img.id ? ' on' : '') },
      h(
        'button',
        {
          type: 'button',
          class: 'imgtile-pic',
          title: img.name,
          onclick: () => {
            H.imageId = img.id;
            ctx.restructure();
          },
        },
        img.src ? h('img', { src: img.src, alt: '' }) : h('span', { textContent: 'Pas d’image' }),
      ),
      h('div', { class: 'imgtile-name', textContent: img.id === DEFAULT_IMAGE_ID ? t('Image par défaut') : img.name }),
      img.id === DEFAULT_IMAGE_ID
        ? null
        : h(
            'div',
            { class: 'row imgtile-act' },
            h(
              'button',
              { type: 'button', class: 'mini', title: img.src ? 'Remplacer…' : 'Importer…', onclick: () => inp.click() },
              ico('upload'),
            ),
            h('button', { type: 'button', class: 'mini', title: 'Renommer', onclick: rename(img) }, ico('pencil')),
            h('button', { type: 'button', class: 'mini danger', title: 'Supprimer', onclick: remove(img) }, ico('x')),
          ),
      inp,
    );
  };
  const add = () => {
    const n = newHeaderImage(H.images.length + 1);
    H.images.push(n);
    H.imageId = n.id;
    ctx.restructure();
  };
  return h(
    'div',
    { class: 'f' },
    h('div', { class: 'hint', textContent: 'Image affichée (132 px de haut, largeur selon l’image) — choisissez dans la bibliothèque :' }),
    h(
      'div',
      { class: 'imggrid' },
      H.images.map(tile),
      h('button', { type: 'button', class: 'imgtile-add', onclick: add }, ico('plus'), h('span', { textContent: 'Ajouter une image' })),
    ),
    h('div', { class: 'hint', textContent: t('Bibliothèque du dépôt (assets/header/) :') }),
    withAssets(h('div'), (assets) =>
      assetBrowser({
        doc: k.doc,
        assets,
        kinds: ['header'],
        open: true,
        isOn: (e) => !!cur && cur.src === e.path,
        onPick: (e) =>
          e.local
            ? null
            : () => {
                useHeaderImage(H, e.path, e.stem);
                ctx.restructure();
              },
      }),
    ),
  );
}

export function headerPanel(k) {
  const { doc, root, title, card, text, swatches, sumColor } = k;
  const H = doc.header;
  title('Header', [], { icon: 'layout-navbar', pill: t('En-tête') });
  root.append(
    card('hd-text', 'typography', t('Texte'), [
      text(H, 'overline', 'Surtitre'),
      text(H, 'title', 'Titre du header'),
      text(H, 'subtitle', 'Sous-titre du header'),
    ]),
    card(
      'hd-colors',
      'palette',
      t('Couleurs'),
      [swatches('Couleur de fond', H, 'bg', toneKeys(doc)), swatches('Couleur du texte', H, 'fg', toneKeys(doc))],
      null,
      sumColor(H.bg),
    ),
    card('hd-image', 'photo', t('Image'), [imageLibrary(k, H)], {
      on: H.showImage,
      set: () => {
        H.showImage = !H.showImage;
      },
    }),
    card('hd-logo', 'certificate', t('Logo'), [logoPicker(k, H)], {
      on: H.showLogo,
      set: () => {
        H.showLogo = !H.showLogo;
      },
    }),
    exportCard(k, 'header'),
  );
}
