/* Modèle de document — un JSON, source unique de tous les exports.
   Les textes acceptent **gras**, une ligne = un paragraphe, "- " = puce. */
import { DEFAULT_THEME, GRID } from './tokens.js';
import { newViz } from './viz/index.js';
import { t } from './i18n.js';

export const SCHEMA = 1;
let _id = 0;
export const uid = p => `${p}${Date.now().toString(36)}${(_id++).toString(36)}`;

export const IMAGE_RATIOS = { '16:9': 16 / 9, '4:3': 4 / 3, '1:1': 1, '3:4': 3 / 4 };
export const COL_TYPES = { text: 'Texte', image: 'Image', viz: 'Dataviz' };
/* Les 4 versions du logo ont la même taille (HEADER.logo). `label` = clé de traduction. */
export const LOGO_VARIANTS = { default: 'Défaut', mono: 'Mono', white: 'Blanc (white)', negative: 'Négatif' };
export const newHeaderImage = (n = 1) => ({ id: uid('img'), name: `${t('Image')} ${n}`, src: null });
export const LOCALES = { 'en-GB': 'EN — 1,227.5', 'fr-BE': 'FR — 1 227,5', 'de-DE': 'DE — 1.227,5', 'nl-BE': 'NL — 1.227,5', 'es-ES': 'ES — 1227,5', 'it-IT': 'IT — 1.227,5' };

export const newCol = (type = 'text') => ({
  type,
  text: type === 'text' ? t('Votre texte ici. Une ligne = un paragraphe, **gras** avec les astérisques.') : '',
  src: null, ratio: '4:3', caption: '',
  viz: type === 'viz' ? newViz('bars') : null,   // { kind, opts } — voir viz/index.js
});
export const newSub = (layout = '1') => ({
  id: uid('sub'), title: t('Sous-section'), layout,
  cols: Array.from({ length: GRID.layouts[layout].spans.length }, () => newCol('text')),
});
export const newSection = (page = 'recto') => ({
  id: uid('sec'), title: t('Titre de section'), page, bg: 'none', subs: [newSub('1')],
});

export function defaultDoc() {
  const lorem = 'Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim.';
  const viz = (kind, extra) => ({ ...newCol('viz'), viz: { ...newViz(kind), ...(extra || {}) } });
  const s1 = newSection('recto');
  s1.title = 'Section title';
  s1.subs = [
    { id: uid('sub'), title: 'Subsection title', layout: '1-1', cols: [viz('icons'), viz('figure')] },
    { id: uid('sub'), title: 'Subsection title', layout: '1-1', cols: [
      { ...newCol('text'), text: Array.from({ length: 5 }, () => 'Source regular 3 12pt.').join('\n') + '\n' + lorem },
      viz('bars'),
    ] },
  ];
  const s2 = newSection('verso');
  s2.title = 'Second section'; s2.bg = 'tintSky';
  s2.subs = [{ id: uid('sub'), title: 'EU support', layout: '1', cols: [viz('donut')] }];
  const s3 = newSection('verso');
  s3.title = 'Back-page section'; s3.bg = 'tintYellow';
  s3.subs = [
    { id: uid('sub'), title: 'Text and image', layout: '2-1', cols: [
      { ...newCol('text'), text: `**First point.** ${lorem}\n- First list item\n- Second list item\n${lorem}` },
      { ...newCol('image'), ratio: '4:3', caption: 'Image caption' },
    ] },
    { id: uid('sub'), title: 'Three columns', layout: '1-1-1', cols: [viz('figure'), viz('icons'), viz('bars', { opts: { ...newViz('bars').opts, callout: { on: false, value: '', text: '' }, style: 'grouped' } })] },
  ];
  return {
    schema: SCHEMA, name: 'factsheet', locale: 'en-GB',
    theme: DEFAULT_THEME, colors: {},
    header: {
      bg: 'deep', fg: 'white',
      overline: 'FACTSHEET - MONTH 20YY', title: 'MAIN TITLE', subtitle: 'Subtitle',
      images: [newHeaderImage(1), newHeaderImage(2)], imageId: null,   // bibliothèque d'images du header (autant que l'on veut)
      logos: { default: null, mono: null, white: null, negative: null }, logoVariant: 'default',
      showImage: true, showLogo: true,
    },
    sections: [s1, s2, s3],
  };
}

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
export function saveDoc(doc) { try { localStorage.setItem(KEY, JSON.stringify(doc)); storage.ok = true; } catch (e) { storage.ok = false; } }
export function migrate(j) {
  const d = Object.assign(defaultDoc(), j);
  d.header = Object.assign(defaultDoc().header, j.header || {});
  migrateHeader(d.header, j.header || {});
  d.sections.forEach(s => {
    s.id = s.id || uid('sec'); s.page = s.page === 'verso' ? 'verso' : 'recto'; s.bg = s.bg || 'none';
    (s.subs || (s.subs = [])).forEach(sub => {
      sub.id = sub.id || uid('sub');
      if (!GRID.layouts[sub.layout]) sub.layout = '1';
      const n = GRID.layouts[sub.layout].spans.length;
      sub.cols = (sub.cols || []).slice(0, n);
      while (sub.cols.length < n) sub.cols.push(newCol('text'));
      sub.cols = sub.cols.map(c => { const k = Object.assign(newCol(c.type || 'text'), c); if (k.type === 'viz') { if (!k.viz) k.viz = newViz('bars'); else if (!k.viz.opts) k.viz = newViz(k.viz.kind); } return k; });
    });
  });
  return d;
}

/* ---------- Déplacement de sections (glisser-déposer, flèches) ---------- */
/** Déplace la section `from` avant/après la section `to` (et sur sa page), ou en fin de `page` si `to` est null. Retourne son nouvel index. */
export function moveSection(doc, from, to, after, page) {
  const sec = doc.sections[from]; if (!sec) return from;
  const target = to == null ? null : doc.sections[to];
  if (target === sec) return from;
  doc.sections.splice(from, 1);
  if (target) { doc.sections.splice(doc.sections.indexOf(target) + (after ? 1 : 0), 0, sec); sec.page = target.page; }
  else {
    sec.page = page;
    let last = -1; doc.sections.forEach((s, i) => { if (s.page === page) last = i; });
    if (last < 0) doc.sections.push(sec); else doc.sections.splice(last + 1, 0, sec);
  }
  return doc.sections.indexOf(sec);
}
/** Monte / descend une section parmi celles de la même page */
export function stepSection(doc, si, d) {
  const sec = doc.sections[si]; let j = si + d;
  while (j >= 0 && j < doc.sections.length && doc.sections[j].page !== sec.page) j += d;
  if (j < 0 || j >= doc.sections.length) return si;
  [doc.sections[si], doc.sections[j]] = [doc.sections[j], doc.sections[si]];
  return j;
}

/** Anciens fichiers : une seule image (`image`) et un seul logo (`logo`) → bibliothèque d'images et 4 versions du logo */
function migrateHeader(H, src) {
  if (src.image && !Array.isArray(src.images)) { H.images[0].src = src.image; H.imageId = H.images[0].id; }
  delete H.image;
  if (src.logo && !src.logos) H.logos.default = src.logo;
  delete H.logo;
  H.logos = Object.assign({ default: null, mono: null, white: null, negative: null }, H.logos);
  if (!LOGO_VARIANTS[H.logoVariant]) H.logoVariant = 'default';
  H.images = (H.images || []).filter(i => i && typeof i === 'object').map((i, k) => ({ id: i.id || uid('img'), name: i.name || `${t('Image')} ${k + 1}`, src: i.src || null }));
  if (!H.images.length) H.images = [newHeaderImage(1), newHeaderImage(2)];
  if (!H.images.some(i => i.id === H.imageId)) H.imageId = H.images[0].id;
}
