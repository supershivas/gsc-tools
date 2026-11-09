/* Propriétés du header : textes, couleurs, bibliothèque d'images, logo (4 versions). */
import { h, ico, headerImage } from '../render.js';
import { t } from '../i18n.js';
import { toneKeys } from '../tokens.js';
import { LOGO_VARIANTS, DEFAULT_LOGOS, DEFAULT_IMAGE_ID, newHeaderImage } from '../state.js';
import { readImage } from '../editor.js';

/* Logo : 4 versions de même taille, une liste déroulante choisit celle qui s'affiche.
   Les logos d'origine (publiés dans le dépôt) ne se retirent pas : on peut charger une autre image à leur place, puis rétablir l'original. */
function logoPicker(k, H) {
  const { ctx, field, struct } = k;
  const v = H.logoVariant,
    orig = DEFAULT_LOGOS()[v],
    custom = H.logos[v] !== orig;
  const sel = h(
    'select',
    {
      onchange: (e) => {
        H.logoVariant = e.target.value;
        ctx.restructure();
      },
    },
    Object.entries(LOGO_VARIANTS).map(([key, l]) =>
      h('option', {
        value: key,
        textContent: `${t(l)} — ${t(H.logos[key] !== DEFAULT_LOGOS()[key] ? 'personnalisé' : 'original')}`,
        selected: v === key,
      }),
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
        alert(t('Image illisible.'));
      }
    },
  });
  return h(
    'div',
    {},
    field('Version du logo', sel),
    h(
      'div',
      { class: 'f' },
      h('div', { class: 'hint', textContent: `Logo — ${t(LOGO_VARIANTS[v])}` }),
      h(
        'div',
        { class: 'row' },
        h('img', { class: 'thumb' + (v === 'white' || v === 'negative' ? ' dark' : ''), src: H.logos[v], alt: '' }),
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
      alert(t('Image illisible.'));
    }
  };
  const rename = (img) => () => {
    const n = prompt(t('Nom de l’image :'), img.name);
    if (n && n.trim()) {
      img.name = n.trim();
      ctx.restructure();
    }
  };
  const remove = (img) => () => {
    if (!confirm(t('Supprimer cette image ?'))) return;
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
  );
}
