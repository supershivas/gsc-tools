/* Documents de référence des tests de non-régression (construits dans la page, avec les vrais modules de l'app). */
import { defaultDoc, newSection, newSub, newCol } from '../src/state.js';
import { newViz, VIZ_TYPES } from '../src/viz/index.js';

/** 1. Le document par défaut. */
export const docDefault = () => defaultDoc();

/** 2. Document « caractères » : latin étendu, grec, cyrillique, fond tint-sky, dataviz avec source (aucun ≥ ni ‰ : absents des polices). */
export function docChars() {
  const d = defaultDoc();
  d.name = 'caracteres';
  d.header.title = 'ŁÓDŹ — ČESKÝ ŘEŠENÍ';
  d.header.subtitle = 'Ελλάδα · Україна';
  const first = d.sections.find(s => s.page === 'recto');
  first.bg = 'tint-sky';
  const viz = newViz('bars');
  viz.head = { title: 'Łódź · Česko · Ελλάδα · Україна', source: 'Źródło : Główny Urząd Statystyczny — Český statistický úřad — Ελληνική Στατιστική Αρχή — Держстат' };
  first.subs[1].cols[0] = { ...newCol('viz'), viz };
  return d;
}

/** 3. Trois documents qui contiennent ensemble les 17 types de dataviz, 3 par page (recto et verso). */
export function docsViz() {
  const kinds = Object.keys(VIZ_TYPES);
  const docs = [];
  for (let i = 0; i < kinds.length; i += 6) {
    const chunk = kinds.slice(i, i + 6), d = defaultDoc();
    d.name = `dataviz-${docs.length + 1}`;
    d.sections = ['recto', 'verso'].map((page, p) => {
      const ks = chunk.slice(p * 3, p * 3 + 3);
      const sub = newSub(ks.length === 3 ? '1-1-1' : ks.length === 2 ? '1-1' : '1');
      sub.title = ks.join(' · ');
      sub.cols = ks.map(k => ({ ...newCol('viz'), viz: newViz(k) }));
      const sec = newSection(page);
      sec.title = page === 'recto' ? 'Recto' : 'Verso';
      sec.subs = [sub];
      return sec;
    }).filter(s => s.subs[0].cols.length);
    docs.push(d);
  }
  return docs;
}

/** Sécurité : icône SVG importée qui tente d'exécuter du code, utilisée par une liste à icônes. */
export function docEvilIcon() {
  const d = defaultDoc();
  d.name = 'evil';
  d.customIcons = [{ id: 'evil', name: 'evil', vb: [0, 0, 24, 24], markup: '<image href="x" onerror="window.__pwn=1"/>' }];
  const viz = newViz('icons');
  viz.opts.items = viz.opts.items.map(it => ({ ...it, icon: 'custom:evil' }));
  const sec = newSection('recto');
  sec.subs[0].cols[0] = { ...newCol('viz'), viz };
  d.sections = [sec];
  return d;
}

/** Document pour l'interface : un exemplaire de chaque sorte de colonne (texte, image, chiffre clé, carte, dataviz de plusieurs types). */
export function docUi() {
  const d = defaultDoc();
  d.name = 'interface';
  const sec = newSection('recto');
  const sub = (layout, cols) => { const s = newSub(layout); s.cols = cols; return s; };
  sec.subs = [
    sub('1-1-1', [{ ...newCol('image'), src: 'assets/Asset 1.svg' }, newCol('text'), newCol('figure')]),
    sub('1-1', [newCol('card'), { ...newCol('viz'), viz: newViz('donut') }]),
  ];
  d.sections = [sec, ...d.sections.filter(s => s.page === 'verso').slice(0, 1)];
  return d;
}

export const DOCS = {
  ui: docUi,
  default: docDefault,
  chars: docChars,
  ...Object.fromEntries([0, 1, 2].map(i => [`dataviz-${i + 1}`, () => docsViz()[i]])),
};
export const DOC_NAMES = Object.keys(DOCS);
