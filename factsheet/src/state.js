/* Modèle de document — un JSON, source unique de tous les exports.
   Les textes acceptent **gras**, une ligne = un paragraphe, "- " = puce. */
import { DEFAULT_THEME, GRID, MAX_EXTRA_COLORS } from './tokens.js';
import { newCard, cardPresetFor } from './cardmodel.js';
import { newViz, withAxesOrigin } from './viz/index.js';
import { t } from './i18n.js';
import { FIGURE_DEFAULTS } from './figure.js';

export const SCHEMA = 1;
let _id = 0;
export const uid = (p) => `${p}${Date.now().toString(36)}${(_id++).toString(36)}`;

export const IMAGE_RATIOS = { '16:9': 16 / 9, '4:3': 4 / 3, '1:1': 1, '3:4': 3 / 4 };
export const COL_TYPES = { text: 'Texte', image: 'Image', figure: 'Chiffre clé', card: 'Carte', viz: 'Dataviz' };
/* Les 4 versions du logo ont la même taille (HEADER.logo). `label` = clé de traduction. */
export const LOGO_VARIANTS = { default: 'Défaut', mono: 'Mono', white: 'Blanc (white)', negative: 'Négatif' };
export const newHeaderImage = (n = 1) => ({ id: uid('img'), name: `${t('Image')} ${n}`, src: null });
/** Applique une famille de logos du dépôt : seules les versions présentes dans le dossier sont remplacées */
export function useLogoFamily(H, family, files) {
  H.logoFamily = family;
  for (const v of Object.keys(LOGO_VARIANTS)) if (files[v]) H.logos[v] = files[v];
}
/** Choisit une image du dépôt pour le header (l'ajoute à la bibliothèque du document si elle n'y est pas) */
export function useHeaderImage(H, path, name) {
  let i = H.images.find((x) => x.src === path);
  if (!i) {
    i = { ...newHeaderImage(H.images.length + 1), name, src: path };
    H.images.push(i);
  }
  H.imageId = i.id;
}
export const VALIGNS = { top: 'align-box-top-center', center: 'align-box-center-middle', bottom: 'align-box-bottom-center' };
export const ALIGNS = { left: 'align-left', center: 'align-center', right: 'align-right', justify: 'align-justified' };
export const LOCALES = {
  'en-GB': 'EN — 1,227.5',
  'fr-BE': 'FR — 1 227,5',
  'de-DE': 'DE — 1.227,5',
  'nl-BE': 'NL — 1.227,5',
  'es-ES': 'ES — 1227,5',
  'it-IT': 'IT — 1.227,5',
};

export const newCol = (type = 'text') => ({
  type,
  text: type === 'text' ? t('Votre texte ici. Une ligne = un paragraphe, **gras** avec les astérisques.') : '',
  src: null,
  ratio: '4:3',
  caption: '',
  valign: 'top', // alignement vertical du contenu dans sa colonne : top | center | bottom
  align: 'left', // alignement du texte : left | center | right | justify
  viz: type === 'viz' ? newViz('bars') : null, // { kind, opts } — voir viz/index.js
  figure: type === 'figure' ? FIGURE_DEFAULTS() : null,
  card: type === 'card' ? newCard() : null, // carte : options + contenu (voir cardmodel.js)   // chiffre clé : { value, icon, iconStyle, text }
  imgMode: 'ratio',
  imgW: 100,
  imgH: 150,
  imgFit: 'cover',
  natural: null, // image : ratio | fit (proportions de l'image) | custom (largeur en %, hauteur en px)
  stroke: false,
  strokeColor: 'text',
  fillColor: 'none', // contour et fond (également sur les sous-sections et sections) ; fond : 'none', 'white', une couleur ou 'tint-<couleur>'
});
export const newSub = (layout = '1') => ({
  id: uid('sub'),
  title: t('Sous-section'),
  showTitle: true,
  layout,
  cols: Array.from({ length: GRID.layouts[layout].spans.length }, () => newCol('text')),
});
export const newSection = (page = 'recto') => ({
  id: uid('sec'),
  title: t('Titre de section'),
  showTitle: true,
  page,
  bg: 'none',
  subs: [newSub('1')],
});

/** Factsheet vierge : header et logos d'origine, une seule section vide au recto */
export function blankDoc() {
  const d = defaultDoc();
  d.sections = [newSection('recto')];
  return d;
}

/** Factsheet d'exemple : recto et verso remplis, texte et dataviz en alternance, tous les gabarits de colonnes et la plupart des types de dataviz */
export function defaultDoc() {
  const lorem =
    'Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam.';
  const short =
    'Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna.';
  const list = '- Lorem ipsum dolor sit amet\n- Consectetuer adipiscing elit\n- Sed diam nonummy nibh euismod';
  const viz = (kind, opts, extra) => {
    const v = withAxesOrigin(newViz(kind)); // la fiche par défaut garde l'aspect d'avant la carte « Axes et grille » (sans grille)
    return { ...newCol('viz'), viz: { ...v, opts: { ...v.opts, ...(opts || {}) } }, ...(extra || {}) };
  };
  const fig = (value, icon, text, iconStyle = 'circle') => ({
    ...newCol('figure'),
    stroke: true,
    fillColor: 'white',
    figure: { ...FIGURE_DEFAULTS(), value, icon, iconStyle, text: text || short },
  });
  const txt = (text) => ({ ...newCol('text'), text });
  const card = (title, text, o = {}) => {
    const c = newCard();
    return { ...newCol('card'), card: { ...c, auto: false, ...o, content: { ...c.content, title, text, tag: 'NEW', link: 'Read more' } } };
  };
  const img = (ratio) => ({ ...newCol('image'), ratio, src: DEFAULT_IMAGE_SRC, caption: 'Lorem ipsum dolor sit amet' });
  const sub = (title, layout, cols) => ({ id: uid('sub'), title, showTitle: true, layout, cols });
  const sec = (page, title, bg, subs) => ({ ...newSection(page), title, bg, subs });

  const tiny = 'Lorem ipsum dolor sit amet, consectetuer adipiscing elit.';
  const s1 = sec('recto', 'Key figures at a glance', 'none', [
    sub('Headline numbers', '1-1-1', [fig('€7.5 bn', 'euro', tiny), fig('27', 'people', tiny), fig('64 %', 'chart', tiny)]),
    sub('Context', '2-1', [
      txt(`**Lorem ipsum.** ${short}\n${list}`),
      card('Digital Europe', tiny, { layout: 'vertical', icon: true, image: false, tag: false, link: false }),
    ]),
  ]);
  const s2 = sec('recto', 'Progress over time', 'tint-sky', [
    sub('Annual results', '1-2', [txt(`${lorem}\n${short}`), viz('line', { ratio: '2:1' })]),
  ]);

  const s3 = sec('verso', 'How the funds are shared', 'none', [sub('Allocation', '1', [viz('donut')])]);
  const s4 = sec('verso', 'Milestones', 'tint-yellow', [
    sub('Roadmap', '1', [viz('timeline', { orientation: 'horizontal', alternate: true })]),
  ]);
  const s5 = sec('verso', 'Deep dive', 'tint-grey', [
    sub('Where the money goes', '2-1', [viz('treemap', { ratio: '16:9' }), txt(`**Lorem ipsum.** ${lorem}\n${short}`)]),
  ]);
  return {
    schema: SCHEMA,
    name: 'factsheet',
    locale: 'en-GB',
    density: 'normal',
    theme: DEFAULT_THEME,
    colors: {},
    colorNames: {},
    header: {
      bg: 'grey',
      fg: 'blue',
      overline: 'FACTSHEET - MONTH 20YY',
      title: 'MAIN TITLE',
      subtitle: 'Subtitle',
      images: [defaultHeaderImage()],
      imageId: DEFAULT_IMAGE_ID, // bibliothèque d'images du header (autant que l'on veut)
      logos: DEFAULT_LOGOS(),
      logoFamily: DEFAULT_LOGO_FAMILY,
      logoVariant: 'default',
      showImage: true,
      showLogo: true,
    },
    sections: [s1, s2, s3, s4, s5],
  };
}

/* ---------- Images publiées dans le dépôt (factsheet/assets/, rangées en logos/, header/, others/) ---------- */
export const DEFAULT_LOGO_FAMILY = 'gsc';
export const DEFAULT_LOGOS = () => ({
  default: 'assets/logos/gsc/default.png',
  mono: 'assets/logos/gsc/mono.png',
  white: 'assets/logos/gsc/white.png',
  negative: 'assets/logos/gsc/negative.png',
});
/** Image du header toujours disponible (première de la bibliothèque, non modifiable) */
export const DEFAULT_IMAGE_ID = 'img-default';
export const DEFAULT_IMAGE_SRC = 'assets/header/default/illustration.svg';
export const defaultHeaderImage = () => ({ id: DEFAULT_IMAGE_ID, name: 'Image par défaut', src: DEFAULT_IMAGE_SRC });
/** Anciens chemins (dossier à plat) → nouveaux : les projets enregistrés avant le rangement gardent leurs images (voir `migrate`) */
const LEGACY_ASSETS = {
  'assets/d9742f1219.png': 'assets/logos/gsc/default.png',
  'assets/c069bffefa.png': 'assets/logos/gsc/mono.png',
  'assets/4a5a41080e.png': 'assets/logos/gsc/white.png',
  'assets/5ec5fb8b6a.png': 'assets/logos/gsc/negative.png',
  'assets/Asset 1.svg': DEFAULT_IMAGE_SRC,
  'assets/2a3ba63bd5.png': 'assets/others/lantern-emblem.png',
};
export const upgradeAsset = (v) => (typeof v === 'string' && LEGACY_ASSETS[v]) || v;

/* ---------- Persistance locale + fichier ---------- */
const KEY = 'factsheet-creator-v1';
export function loadDoc() {
  try {
    const j = JSON.parse(localStorage.getItem(KEY));
    if (j && Array.isArray(j.sections) && j.header) return migrate(j);
  } catch (e) {}
  return defaultDoc();
}
/** false quand le navigateur refuse d'écrire (stockage plein : images trop lourdes) */
export const storage = { ok: true };
export function saveDoc(doc) {
  try {
    localStorage.setItem(KEY, JSON.stringify(doc));
    storage.ok = true;
  } catch (e) {
    storage.ok = false;
  }
}
export function migrate(j) {
  const d = Object.assign(defaultDoc(), j);
  /* icônes importées : anciennes icônes propres à une dataviz → bibliothèque du document */
  d.customIcons = Array.isArray(j.customIcons) ? j.customIcons : [];
  /* ancien texte libre de colonne (col.free) → textes libres positionnables (col.texts) */
  for (const sec of d.sections || [])
    for (const sb of sec.subs || [])
      for (const cl of sb.cols || [])
        if (cl.free) {
          if (cl.free.on && String(cl.free.text || '').trim()) {
            const f = cl.free,
              w = f.pos === 'left' || f.pos === 'right' ? +f.share || 35 : 100;
            (cl.texts = cl.texts || []).push(
              f.pos === 'top' || f.pos === 'bottom'
                ? { mode: f.pos === 'top' ? 'above' : 'below', text: f.text }
                : { x: f.pos === 'right' ? 100 - w : 0, y: 0, w, text: f.text },
            );
          }
          delete cl.free;
        }
  for (const sec of d.sections || [])
    for (const sb of sec.subs || [])
      for (const cl of sb.cols || [])
        for (const ic of (cl.viz && cl.viz.opts && cl.viz.opts.customIcons) || [])
          if (!d.customIcons.some((x) => x.id === ic.id)) d.customIcons.push(ic);
  d.header = Object.assign(defaultDoc().header, j.header || {});
  migrateHeader(d.header, j.header || {});
  d.sections.forEach((s) => {
    s.id = s.id || uid('sec');
    s.page = s.page === 'verso' ? 'verso' : 'recto';
    s.bg = s.bg || 'none';
    (s.subs || (s.subs = [])).forEach((sub) => {
      sub.id = sub.id || uid('sub');
      if (!GRID.layouts[sub.layout]) sub.layout = '1';
      if (sub.layout === 'custom' && !(Array.isArray(sub.widths) && sub.widths.length >= 2 && sub.widths.every((f) => f > 0)))
        sub.layout = '1';
      const n = sub.layout === 'custom' ? sub.widths.length : GRID.layouts[sub.layout].spans.length;
      sub.cols = (sub.cols || []).slice(0, n);
      while (sub.cols.length < n) sub.cols.push(newCol('text'));
      sub.cols = sub.cols.map((c) => {
        c = oldFigure(c);
        const k = Object.assign(newCol(c.type || 'text'), c);
        if (k.type === 'figure' && !k.figure) k.figure = FIGURE_DEFAULTS();
        if (k.type === 'card' && !k.card) k.card = newCard();
        if (k.src && !safeImgSrc(k.src)) k.src = null;
        if (k.card && k.card.src && !safeImgSrc(k.card.src)) k.card.src = null;
        if (k.src) k.src = upgradeAsset(k.src);
        if (k.card && k.card.src) k.card.src = upgradeAsset(k.card.src);
        if (k.type === 'viz') {
          if (!k.viz) k.viz = newViz('bars');
          else if (!k.viz.opts) k.viz = newViz(k.viz.kind);
          /* clés de « Axes et grille » absentes (fichier d'avant la carte) : écrites avec l'aspect d'alors, le panneau montre ce qui est dessiné */
          withAxesOrigin(k.viz, true);
        }
        return k;
      });
    });
  });
  oldBoxes(d);
  oldColors(d);
  return d;
}

/** Anciens fichiers : `fill` (fond blanc du contour) → `fillColor` */
function oldBoxes(d) {
  const f = (o) => {
    if (o.fill === true && (!o.fillColor || o.fillColor === 'none')) o.fillColor = 'white';
    if (!o.fillColor) o.fillColor = 'none';
    delete o.fill;
  };
  d.sections.forEach((sec) => {
    f(sec);
    sec.subs.forEach((sub) => {
      f(sub);
      sub.cols.forEach(f);
    });
  });
}

/** Anciens fichiers : le chiffre clé était une dataviz → type de contenu à part, avec son cadre devenu contour */
function oldFigure(c) {
  if (c.type !== 'viz' || !c.viz || c.viz.kind !== 'figure') return c;
  const o = c.viz.opts || {};
  return {
    ...c,
    type: 'figure',
    viz: null,
    figure: { ...FIGURE_DEFAULTS(), value: o.value ?? '', text: o.text ?? '' },
    stroke: true,
    fillColor: 'white',
  };
}

/* ---------- Déplacement de sections (glisser-déposer, flèches) ---------- */
/** Déplace la section `from` avant/après la section `to` (et sur sa page), ou en fin de `page` si `to` est null. Retourne son nouvel index. */
export function moveSection(doc, from, to, after, page) {
  const sec = doc.sections[from];
  if (!sec) return from;
  const target = to == null ? null : doc.sections[to];
  if (target === sec) return from;
  doc.sections.splice(from, 1);
  if (target) {
    doc.sections.splice(doc.sections.indexOf(target) + (after ? 1 : 0), 0, sec);
    sec.page = target.page;
  } else {
    sec.page = page;
    let last = -1;
    doc.sections.forEach((s, i) => {
      if (s.page === page) last = i;
    });
    if (last < 0) doc.sections.push(sec);
    else doc.sections.splice(last + 1, 0, sec);
  }
  return doc.sections.indexOf(sec);
}
/** Monte / descend une section parmi celles de la même page */
export function stepSection(doc, si, d) {
  const sec = doc.sections[si];
  let j = si + d;
  while (j >= 0 && j < doc.sections.length && doc.sections[j].page !== sec.page) j += d;
  if (j < 0 || j >= doc.sections.length) return si;
  [doc.sections[si], doc.sections[j]] = [doc.sections[j], doc.sections[si]];
  return j;
}

/** Une image n'est acceptée que si elle est incorporée (`data:image/…`) ou locale (chemin relatif du dépôt, ex. `assets/…`) :
    une adresse distante (`https://…`, `//…`, `javascript:`…) ferait charger un site tiers à l'ouverture d'un projet reçu. */
export const safeImgSrc = (v) => {
  if (typeof v !== 'string') return false;
  if (/^data:image\//i.test(v)) return true;
  const w = v.replace(/[\u0000-\u0020]/g, ''); // le navigateur ignore espaces, tabulations et retours en début d'adresse ou dans le schéma
  return !(/^[a-z][a-z0-9+.-]*:/i.test(w) || /^[\\/]{2}/.test(w));
};
/** Anciens fichiers : une seule image (`image`) et un seul logo (`logo`) → bibliothèque d'images et 4 versions du logo */
function migrateHeader(H, src) {
  if (safeImgSrc(src.image) && !Array.isArray(src.images)) {
    const n = { ...newHeaderImage(1), src: src.image };
    H.images = [n];
    H.imageId = n.id;
  }
  delete H.image;
  if (safeImgSrc(src.logo) && !src.logos) H.logos.default = src.logo;
  delete H.logo;
  // une version vide reprend le logo publié (document créé avant la publication, autre appareil)
  const def = DEFAULT_LOGOS(),
    cur = Object.fromEntries(Object.entries(H.logos || {}).map(([k, v]) => [k, upgradeAsset(v)]));
  if (typeof H.logoFamily !== 'string' || !H.logoFamily) H.logoFamily = DEFAULT_LOGO_FAMILY;
  // les logos « défaut » et « mono » avaient été publiés à l'envers : on remet les bons fichiers
  if (cur.default === def.mono) cur.default = def.default;
  if (cur.mono === def.default) cur.mono = def.mono;
  H.logos = Object.assign({}, def, Object.fromEntries(Object.entries(cur).filter(([, v]) => v && safeImgSrc(v))));
  if (!LOGO_VARIANTS[H.logoVariant]) H.logoVariant = 'default';
  H.images = (H.images || [])
    .filter((i) => i && typeof i === 'object' && i.src && safeImgSrc(i.src) && i.id !== DEFAULT_IMAGE_ID)
    .map((i, k) => ({ id: i.id || uid('img'), name: i.name || `${t('Image')} ${k + 1}`, src: upgradeAsset(i.src) }));
  H.images.unshift(defaultHeaderImage()); // l'image par défaut reste toujours la première
  if (!H.images.some((i) => i.id === H.imageId)) H.imageId = H.images[0].id;
}

/* ---------- Images du document (pour l'Atelier : publication dans le dépôt) ---------- */
/** Toutes les images du document : { label, get(), set(v) } — logos, bibliothèque du header, images de colonnes */
export function docImages(doc) {
  const out = [],
    H = doc.header || {};
  (H.images || []).forEach((i) =>
    out.push({
      label: `Header — ${i.name}`,
      kind: 'header',
      get: () => i.src,
      set: (v) => {
        i.src = v;
      },
    }),
  );
  Object.keys(H.logos || {}).forEach((k) =>
    out.push({
      label: `Logo — ${LOGO_VARIANTS[k] || k}`,
      kind: 'logos',
      get: () => H.logos[k],
      set: (v) => {
        H.logos[k] = v;
      },
    }),
  );
  (doc.sections || []).forEach((sec) =>
    (sec.subs || []).forEach((sub) =>
      (sub.cols || []).forEach((c, ci) => {
        if (c.type === 'image')
          out.push({
            label: `${sec.title || 'Section'} › ${sub.title || 'Subsection'} › ${ci + 1}`,
            kind: 'others',
            get: () => c.src,
            set: (v) => {
              c.src = v;
            },
          });
      }),
    ),
  );
  return out.filter((x) => x.get());
}

/* ---------- Déplacement de contenus (colonnes) et de sous-sections ---------- */
/** Échange le contenu de deux colonnes (n'importe où dans le document). L'alignement voyage avec le contenu. */
export function swapCols(doc, a, b) {
  const ca = doc.sections[a.si].subs[a.bi].cols,
    cb = doc.sections[b.si].subs[b.bi].cols;
  [ca[a.ci], cb[b.ci]] = [cb[b.ci], ca[a.ci]];
}
/** Toutes les colonnes du document : { si, bi, ci, label, page } — pour les listes « échanger avec… » */
export function allCols(doc) {
  const out = [];
  doc.sections.forEach((sec, si) =>
    sec.subs.forEach((sub, bi) =>
      sub.cols.forEach((col, ci) =>
        out.push({ si, bi, ci, page: sec.page, label: `${sec.title || 'Section'} › ${sub.title || 'Subsection'} › ${ci + 1}` }),
      ),
    ),
  );
  return out;
}
/** Déplace la sous-section `from` avant/après la sous-section `to` (autre section possible), ou en fin de la section `to.si` si `to.bi` est null.
    Retourne son nouveau chemin { si, bi }. Une section laissée vide reste en place (titre seul). */
export function moveSub(doc, from, to, after) {
  const src = doc.sections[from.si],
    sub = src.subs[from.bi],
    dst = doc.sections[to.si];
  if (!sub || !dst) return from;
  const ref = to.bi == null ? null : dst.subs[to.bi];
  if (ref === sub) return from;
  src.subs.splice(from.bi, 1);
  if (ref) dst.subs.splice(dst.subs.indexOf(ref) + (after ? 1 : 0), 0, sub);
  else dst.subs.push(sub);
  return { si: to.si, bi: dst.subs.indexOf(sub) };
}

/* ---------- Couleurs : migration, ajout, suppression ---------- */
/** Parcourt toutes les références de couleur du document (header, fonds et contours, séries des dataviz) ; fn(clé) → nouvelle clé, bg(clé) pour les fonds de section */
export function remapColors(doc, fn, bg = fn, fill = bg) {
  const H = doc.header || {};
  H.bg = fn(H.bg);
  H.fg = fn(H.fg);
  const walk = (o) => {
    if (o && typeof o === 'object')
      for (const k of Object.keys(o)) {
        if (k === 'color' && typeof o[k] === 'string') o[k] = fn(o[k]);
        else walk(o[k]);
      }
  };
  (doc.sections || []).forEach((sec) => {
    sec.bg = bg(sec.bg);
    if (sec.strokeColor) sec.strokeColor = fn(sec.strokeColor);
    if (sec.fillColor) sec.fillColor = fill(sec.fillColor);
    (sec.subs || []).forEach((sub) => {
      if (sub.strokeColor) sub.strokeColor = fn(sub.strokeColor);
      if (sub.fillColor) sub.fillColor = fill(sub.fillColor);
      (sub.cols || []).forEach((c) => {
        if (c.strokeColor) c.strokeColor = fn(c.strokeColor);
        if (c.fillColor) c.fillColor = fill(c.fillColor);
        walk(c.viz);
      });
    });
  });
}
/** Anciennes palettes (12 couleurs) → 5 couleurs : les clés supprimées prennent la plus proche */
const OLD_COLORS = {
  lavender: 'grey',
  'tint-lavender': 'tint-grey',
  deep: 'blue',
  steel: 'slate',
  tintSky: 'tint-sky',
  tintLav: 'tint-blue',
  tintYellow: 'tint-yellow',
  tintGrey: 'tint-slate',
};
function oldColors(d) {
  const f = (k) => OLD_COLORS[k] || k;
  remapColors(d, f);
  d.colors = Object.fromEntries(Object.entries(d.colors || {}).filter(([k]) => !OLD_COLORS[k] && !/^tint/.test(k) && k !== 'white'));
  d.colorNames = d.colorNames || {};
  delete d.colorNames.lavender;
}
export const extraColorKeys = (doc) => Object.keys(doc.colors || {}).filter((k) => /^x\d+$/.test(k));
export const canAddColor = (doc) => extraColorKeys(doc).length < MAX_EXTRA_COLORS;
/** Ajoute une couleur au document ; retourne sa clé */
export function addColor(doc, hex) {
  let n = 1;
  while ((doc.colors || {})['x' + n]) n++;
  const k = 'x' + n;
  doc.colors = doc.colors || {};
  doc.colorNames = doc.colorNames || {};
  doc.colors[k] = hex;
  doc.colorNames[k] = `${t('Couleur')} ${5 + extraColorKeys(doc).length}`;
  return k;
}
/** Nombre de références à une couleur (ou à sa teinte) dans le document : header, fonds, contours, séries */
export function colorUses(doc, key) {
  let n = 0;
  const count = (k) => {
    if (k === key || k === 'tint-' + key) n++;
    return k;
  };
  remapColors(doc, count);
  return n;
}
/** Retire une couleur : ajoutée → supprimée ; du thème → marquée absente (`null`). Ce qui l'utilisait passe à `replacement` (EU Blue par défaut) */
export function removeColor(doc, key, replacement = 'blue') {
  if (extraColorKeys(doc).includes(key)) delete doc.colors[key];
  else (doc.colors || (doc.colors = {}))[key] = null;
  delete (doc.colorNames || {})[key];
  delete (doc.cmyk || {})[key];
  const tint = replacement === 'white' ? 'white' : replacement === 'none' ? 'none' : 'tint-' + replacement;
  const f = (k) => (k === key ? replacement : k === 'tint-' + key ? tint : k);
  remapColors(doc, f);
}

/** Cartes « automatiques » : suivent la largeur de leur colonne tant qu'on n'a pas touché à leurs options (voir cardPresetFor) */
export function refreshAutoCards(sub, widthOf) {
  sub.cols.forEach((c, i) => {
    if (c.type === 'card' && c.card && c.card.auto) Object.assign(c.card, cardPresetFor(widthOf(i)));
  });
}

/* ---------- Suppression ---------- */
/** Supprime la colonne ci ; les autres s'étendent (3 → 2 colonnes égales, 2 → 1 pleine largeur). Si c'était la seule, la sous-section disparaît.
    Retourne le chemin à sélectionner ensuite. */
export function removeCol(doc, si, bi, ci) {
  const sec = doc.sections[si],
    sub = sec.subs[bi];
  if (sub.cols.length <= 1) {
    sec.subs.splice(bi, 1);
    return `sec:${si}`;
  }
  sub.cols.splice(ci, 1);
  sub.layout = { 1: '1', 2: '1-1', 3: '1-1-1', 4: '1-1-1-1', 5: '1-1-1-1-1', 6: '1-1-1-1-1-1' }[sub.cols.length] || '1';
  return `col:${si}:${bi}:${Math.min(ci, sub.cols.length - 1)}`;
}

/* ---------- Duplication d'une colonne ---------- */
const EQUAL_LAYOUT = { 1: '1', 2: '1-1', 3: '1-1-1', 4: '1-1-1-1', 5: '1-1-1-1-1' };
/** Gabarit à colonnes égales pour n colonnes */
export const equalLayout = (n) => EQUAL_LAYOUT[n] || '1';
/** Nombre maximal de colonnes proposées par les gabarits */
export const MAX_COLS = 5;
/** Une colonne « libre » ne contient rien à perdre : texte vide ou texte d'origine, image sans fichier */
export const isFreeCol = (col) =>
  !col ||
  (col.type === 'text' && (!String(col.text || '').trim() || col.text === newCol('text').text)) ||
  (col.type === 'image' && !col.src);
/** Duplique la colonne ci de la sous-section bi. `mode` : `replace` (la copie prend la place de la colonne suivante), `insert` (la copie s'ajoute à droite, les colonnes deviennent égales,
    comme à la suppression d'une colonne), `sub` (nouvelle sous-section dessous, même gabarit, la copie à la même place). Retourne le chemin de la copie. */
export function duplicateCol(doc, si, bi, ci, mode) {
  const sec = doc.sections[si],
    sub = sec.subs[bi],
    copy = JSON.parse(JSON.stringify(sub.cols[ci]));
  if (mode === 'replace' && sub.cols[ci + 1]) {
    sub.cols[ci + 1] = copy;
    return `col:${si}:${bi}:${ci + 1}`;
  }
  if (mode === 'sub') {
    const n = JSON.parse(JSON.stringify(sub));
    n.id = uid('sub');
    n.cols = n.cols.map((c, i) => (i === ci ? copy : newCol('text')));
    sec.subs.splice(bi + 1, 0, n);
    return `col:${si}:${bi + 1}:${ci}`;
  }
  sub.cols.splice(ci + 1, 0, copy);
  sub.layout = EQUAL_LAYOUT[sub.cols.length] || sub.layout;
  delete sub.widths;
  return `col:${si}:${bi}:${ci + 1}`;
}
