/* Documents de référence des tests de non-régression (construits dans la page, avec les vrais modules de l'app). */
import { defaultDoc, newSection, newSub, newCol } from '../src/state.js';
import { newViz as freshViz, VIZ_TYPES, withAxesOrigin } from '../src/viz/index.js';
import { newTable, mergeCells, applyPreset, stroke, setFootRows, setEdges } from '../src/table/model.js';

/* Les captures de référence montrent l'aspect d'avant la carte « Axes et grille » (une fiche existante ne change pas) :
   les dataviz des documents de test le gardent ; la grille des nouvelles dataviz est vérifiée par tests/vizsidebar.spec.js. */
const newViz = (kind) => withAxesOrigin(freshViz(kind));

/** 1. Le document par défaut. */
export const docDefault = () => defaultDoc();

/** 2. Document « caractères » : latin étendu, grec, cyrillique, fond tint-sky, dataviz avec source (aucun ≥ ni ‰ : absents des polices). */
export function docChars() {
  const d = defaultDoc();
  d.name = 'caracteres';
  d.header.title = 'ŁÓDŹ — ČESKÝ ŘEŠENÍ';
  d.header.subtitle = 'Ελλάδα · Україна';
  const first = d.sections.find((s) => s.page === 'recto');
  first.bg = 'tint-sky';
  const viz = newViz('bars');
  viz.head = {
    title: 'Łódź · Česko · Ελλάδα · Україна',
    source: 'Źródło : Główny Urząd Statystyczny — Český statistický úřad — Ελληνική Στατιστική Αρχή — Держстат',
  };
  first.subs[1].cols[0] = { ...newCol('viz'), viz };
  return d;
}

/** 3. Trois documents qui contiennent ensemble les 17 types de dataviz, 3 par page (recto et verso). */
export function docsViz() {
  /* types ajoutés après les captures de référence : testés à part (tests/heatmap.spec.js), pour ne pas décaler les 17 types des captures */
  const LATER = ['heatmap'];
  const kinds = Object.keys(VIZ_TYPES).filter((k) => !LATER.includes(k));
  const docs = [];
  for (let i = 0; i < kinds.length; i += 6) {
    const chunk = kinds.slice(i, i + 6),
      d = defaultDoc();
    d.name = `dataviz-${docs.length + 1}`;
    d.sections = ['recto', 'verso']
      .map((page, p) => {
        const ks = chunk.slice(p * 3, p * 3 + 3);
        const sub = newSub(ks.length === 3 ? '1-1-1' : ks.length === 2 ? '1-1' : '1');
        sub.title = ks.join(' · ');
        sub.cols = ks.map((k) => ({ ...newCol('viz'), viz: newViz(k) }));
        const sec = newSection(page);
        sec.title = page === 'recto' ? 'Recto' : 'Verso';
        sec.subs = [sub];
        return sec;
      })
      .filter((s) => s.subs[0].cols.length);
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
  viz.opts.items = viz.opts.items.map((it) => ({ ...it, icon: 'custom:evil' }));
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
  const sub = (layout, cols) => {
    const s = newSub(layout);
    s.cols = cols;
    return s;
  };
  sec.subs = [
    sub('1-1-1', [
      { ...newCol('image'), src: 'assets/header/default/factsheet_illu_lantern_default.svg' },
      newCol('text'),
      newCol('figure'),
    ]),
    sub('1-1', [newCol('card'), { ...newCol('viz'), viz: newViz('donut') }]),
  ];
  d.sections = [sec, ...d.sections.filter((s) => s.page === 'verso').slice(0, 1)];
  return d;
}

/** Indépendance des rendus : deux documents de même structure, réglages opposés (densité, typographie automatique, icône importée
    de même identifiant mais de dessin différent). La dernière dataviz du verso (barres horizontales à icônes, titre à typographie)
    est en mode « remplir » : elle est redessinée par measure(), après le rendu. */
function docIso(density, typo, markup) {
  const d = defaultDoc();
  d.name = `iso-${density}`;
  d.density = density;
  d.frTypo = d.ordinals = typo;
  d.customIcons = [{ id: 'iso', name: 'iso', vb: [0, 0, 24, 24], markup }];
  d.header.title = 'Le 1er bilan : 3/4 des « cas » ?';
  const viz = newViz('hbars');
  viz.opts.hmode = 'fill';
  viz.opts.rows.forEach((r) => {
    r.icon = 'custom:iso';
  });
  viz.head = { title: 'Bilan : le 1er trimestre ?', source: 'Source : 2e vague' };
  const last = d.sections.filter((s) => s.page === 'verso').pop();
  last.subs = [{ ...newSub('1'), cols: [{ ...newCol('viz'), viz }] }];
  const pic = newViz('pictoBars');
  pic.opts.icon = 'custom:iso';
  d.sections.find((s) => s.page === 'verso').subs[0].cols[0] = { ...newCol('viz'), viz: pic };
  return d;
}
export const docIsoTight = () => docIso('tight', true, '<path d="M12 2l3 7h7l-6 5 2 8-6-4-6 4 2-8-6-5h7z"/>');
export const docIsoLoose = () => docIso('loose', false, '<circle cx="12" cy="12" r="9"/>');

/** Tableaux : grille avec fusions (2 colonnes, 2 lignes, 2 × 2), filets de 0,25 pt, en-tête en tirets ; un tableau zébré et un à en-tête coloré. */
export function docTable() {
  const d = defaultDoc();
  d.name = 'tableau';
  const grid = newTable(5, 4, 1);
  applyPreset(grid, 'grid');
  grid.look.top = grid.look.bottom = grid.look.sides = stroke(1);
  grid.look.head = stroke(0.5, 'blue', [2, 1.5]);
  const txt = (r, c, v) => (grid.cells.find((x) => x.r === r && x.c === c).text = v);
  ['Country', 'Budget', 'Share', 'Trend'].forEach((v, c) => txt(0, c, v));
  txt(1, 0, 'Belgium');
  txt(1, 1, '€1.2 bn');
  txt(2, 0, 'France');
  txt(3, 0, 'Germany and Austria');
  txt(3, 2, '**12 %**');
  mergeCells(grid, 1, 2, 1, 3); // 2 colonnes
  mergeCells(grid, 2, 1, 3, 1); // 2 lignes
  mergeCells(grid, 3, 2, 4, 3); // 2 × 2
  grid.cells.find((x) => x.r === 4 && x.c === 0).fill = 'tint-sky';
  const zebra = newTable(5, 2, 1);
  applyPreset(zebra, 'zebra');
  const head = newTable(4, 3, 1);
  applyPreset(head, 'headfill');
  const tableCol = (tb) => ({ ...newCol('table'), table: tb });
  const sec = newSection('recto');
  sec.title = 'Tables';
  const a = newSub('1');
  a.title = 'Merged cells';
  a.cols = [tableCol(grid)];
  const b = newSub('1-1');
  b.title = 'Presets';
  b.cols = [tableCol(zebra), tableCol(head)];
  sec.subs = [a, b];
  d.sections = [sec, ...d.sections.filter((x) => x.page === 'verso').slice(0, 1)];
  return d;
}

/** Tableau habillé (phase 3) : en-tête et pied colorés, fond de cellule, de ligne et de colonne, contour en tirets sur une sélection, filets de 0,25 / 1,5 / 3 pt. */
export function docTableStyle() {
  const d = defaultDoc();
  d.name = 'tableau-habille';
  const tb = newTable(6, 3, 1);
  applyPreset(tb, 'rules');
  setFootRows(tb, 1);
  Object.assign(tb.look, { headFill: 'slate', headFg: 'white', footFill: 'grey', foot: stroke(1.5, 'blue') });
  tb.cells.forEach((cl) => (cl.text = `${cl.r}.${cl.c}`));
  tb.rows[2].fill = 'sky'; // ligne entière
  tb.cols[2].fill = 'tint-sky'; // colonne entière (sous la ligne)
  tb.cells.find((cl) => cl.r === 3 && cl.c === 0).fill = 'yellow'; // cellule
  setEdges(tb, { r0: 1, c0: 0, r1: 3, c1: 1 }, ['top', 'bottom', 'left', 'right'], stroke(1, 'slate', [3, 2]));
  setEdges(tb, { r0: 4, c0: 0, r1: 4, c1: 2 }, ['top'], stroke(3, 'blue'));
  const sec = newSection('recto');
  sec.title = 'Styled table';
  const a = newSub('1');
  a.title = 'Fills and borders';
  a.cols = [{ ...newCol('table'), table: tb }];
  sec.subs = [a];
  d.sections = [sec, ...d.sections.filter((x) => x.page === 'verso').slice(0, 1)];
  return d;
}

export const DOCS = {
  ui: docUi,
  default: docDefault,
  chars: docChars,
  ...Object.fromEntries([0, 1, 2].map((i) => [`dataviz-${i + 1}`, () => docsViz()[i]])),
  'iso-tight': docIsoTight,
  'iso-loose': docIsoLoose,
  table: docTable,
  'table-style': docTableStyle,
};
export const DOC_NAMES = Object.keys(DOCS);
