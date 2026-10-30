/* ============================================================
   DESIGN TOKENS — source unique de toutes les valeurs de mise en page.
   Aucun composant ne contient de valeur en dur : tout vient d'ici.
   Unité de base : 3 px CSS (A4 = 794 × 1123 px à 96 dpi).
   Les tailles de texte sont en pt, les traits en pt.
   ============================================================ */

export const BASE = 3;
/** u(n) → n unités de base, en px */
export const u = n => n * BASE;

/* ---------- Page ---------- */
export const PAGE = {
  w: 794,                 // A4 largeur (px)
  h: 1123,                // A4 hauteur (px)
  margin: 52,             // marge latérale gauche/droite — valeur imposée (seule exception à la base de 3)
  marginTop: u(12),       // 36 — marge haute (verso, ou recto sans header)
  marginBottom: u(12),    // 36 — marge basse
  bleed: 3 * 96 / 25.4,   // 3 mm exacts (11,34 px) — fond perdu à l'export
  slug: 9 * 96 / 25.4,    // 9 mm — marge de repères autour du fond perdu (traits de coupe)
  cropMark: u(3),         // longueur des traits de coupe
};

/* ---------- Échelle d'espacement (multiples de 3) ---------- */
export const SPACE = {
  0: 0, 1: u(1), 2: u(2), 3: u(3), 4: u(4), 5: u(5), 6: u(6),
  8: u(8), 10: u(10), 12: u(12), 16: u(16),
};

/* Rôles : chaque espacement du document a un nom, jamais un nombre libre */
export const GAP = {
  headerPadX: PAGE.margin,      // 52 — marges latérales du header (alignées sur la page)
  headerPadY: SPACE[12],        // 36
  headerImgText: SPACE[6],      // 18 — entre l'image et le bloc de texte
  headerOverlineRule: SPACE[3], // 9  — surtitre → filet
  headerRuleTitle: SPACE[3],    // 9  — filet → titre
  headerTitleSub: SPACE[1],     // 3  — titre → sous-titre
  headerToBody: SPACE[8],       // 24 — bas du header → 1re section (recto)
  sectionBefore: SPACE[8],      // 24 — entre deux sections
  sectionTitle: SPACE[4],       // 12 — titre de section → 1re sous-section
  subsectionBefore: SPACE[6],   // 18 — entre deux sous-sections
  subsectionTitle: SPACE[3],    // 9  — titre de sous-section → colonnes
  columns: SPACE[6],            // 18 — gouttière entre colonnes
  paragraph: SPACE[2],          // 6  — entre paragraphes / items de liste
  boxPad: SPACE[4],             // 12 — padding des encadrés
  bandPad: SPACE[6],            // 18 — haut/bas d'une section sur fond coloré
};

/* ---------- Grille ---------- */
export const GRID = {
  cols: 3,
  gutter: GAP.columns,
  contentW: PAGE.w - 2 * PAGE.margin,        // 690
  /* Gabarits de sous-section : grille de `cols` colonnes, chaque colonne occupe `spans[i]` */
  layouts: {
    '1':     { label: '1 colonne',              cols: 1, spans: [1] },
    '1-1':   { label: '2 colonnes',             cols: 2, spans: [1, 1] },
    '1-1-1': { label: '3 colonnes',             cols: 3, spans: [1, 1, 1] },
    '2-1':   { label: '2 colonnes (2/3 + 1/3)', cols: 3, spans: [2, 1] },
    '1-2':   { label: '2 colonnes (1/3 + 2/3)', cols: 3, spans: [1, 2] },
  },
};

/** largeur (px) de la colonne i d'un gabarit — sert aux dataviz */
export function colWidth(layoutKey, i) {
  const L = GRID.layouts[layoutKey] || GRID.layouts['1'];
  const unit = (GRID.contentW - (L.cols - 1) * GRID.gutter) / L.cols;
  const s = L.spans[i] || 1;
  return s * unit + (s - 1) * GRID.gutter;
}

/* ---------- Typographie ----------
   size en pt ; lh en px (multiple de 3 : le rythme vertical reste sur la grille). */
export const FONT = {
  sans: '"Source Sans 3", "Source Sans Pro", sans-serif',
  serif: '"Source Serif 4", "Source Serif Pro", serif',
};
export const TYPE = {
  overline:   { family: 'sans',  size: 16, weight: 200, lh: u(9),  upper: true },
  title:      { family: 'sans',  size: 30, weight: 600, lh: u(16) },
  subtitle:   { family: 'sans',  size: 22, weight: 600, lh: u(12) },
  section:    { family: 'sans',  size: 21, weight: 700, lh: u(11) },
  subsection: { family: 'sans',  size: 14, weight: 700, lh: u(8)  },
  body:       { family: 'sans',  size: 12, weight: 400, lh: u(7)  },
  bodyBold:   { family: 'sans',  size: 12, weight: 700, lh: u(7)  },
  figure:     { family: 'serif', size: 24, weight: 700, lh: u(12) },   // chiffres clés
  figureSm:   { family: 'serif', size: 18, weight: 700, lh: u(8)  },
  caption:    { family: 'sans',  size: 8,  weight: 600, lh: u(5)  },   // axes, légendes de dataviz
  captionNum: { family: 'serif', size: 8,  weight: 700, lh: u(5)  },   // valeurs chiffrées des graphiques
  callout:    { family: 'sans',  size: 16, weight: 700, lh: u(7)  },   // « +64 % » à côté d'un graphique
};

/* ---------- Traits ---------- */
export const STROKE = {
  pt: 0.5,
  px: 0.5 * 96 / 72,       // 0,667 px
  radius: u(3),            // 9 — coins des encadrés
};

/* ---------- Header ---------- */
export const HEADER = {
  h: u(80),                // 240
  image: { w: u(32), h: u(44) },   // 96 × 132
  logo:  { w: u(46), h: u(14) },   // 138 × 42
  rule:  { w: u(8) },              // 24 — filet sous le surtitre
};

/* ---------- Dataviz (mêmes règles que les captures) ---------- */
export const VIZ = {
  ratios: { '2:1': 0.5, '16:9': 0.5625, '3:2': 2 / 3, '1:1': 1 },   // hauteur / largeur des graphiques à barres
  barRadius: u(1),         // 3 — arrondi du haut des barres
  barGap: u(1),            // 3 — espace entre barres groupées
  barMaxW: u(10),          // 30 — largeur max d'une barre
  pairOffset: 0.5,         // décalage de la barre arrière (× largeur de barre)
  plotTop: u(6),           // 18 — réserve en haut (valeurs, accolade)
  catH: u(6),              // 18 — ligne des catégories sous l'axe
  legendH: u(5),           // 15 — ligne de légende
  legendGap: u(2),         // 6  — axe/catégories → légende
  legendSwatch: u(3),      // 9  — pastille de légende
  calloutW: u(32),         // 96 — zone du « +64 % »
  calloutGap: u(2),        // 6
  ringPct: 0.16,           // épaisseur de l'anneau / rayon extérieur
  ringMin: u(50),          // 150 — diamètre mini de l'anneau
  ringMax: u(80),          // 240 — diamètre maxi
  ringLegend: u(56),       // 168 — diamètre en mode légende (colonnes étroites)
  aroundMinW: u(200),      // 600 — largeur mini pour des libellés autour de l'anneau (pleine largeur uniquement)
  leaderGap: u(1),         // 3 — écart trait → texte
  leaderRoom: u(8),        // 24 — place réservée aux traits entre anneau et libellés
  blockGap: u(3),          // 9 — entre deux libellés
  pointR: 4.5,             // rayon des points de courbe
  hBar: u(4),              // 12 — épaisseur d'une barre horizontale
  hRowGap: u(3),           // 9 — entre deux lignes de barres horizontales
  iconCircle: u(9),        // 27 — pastille d'icône
  iconGlyph: u(5),         // 15 — pictogramme dans la pastille
  iconGap: u(3),           // 9
  iconRowGap: u(3),        // 9
};

/* ---------- Thèmes (palettes) ----------
   Teintes relevées sur les captures du design system. */
export const THEMES = {
  eu: {
    label: 'Bleu UE',
    colors: {
      blue:     '#0434F8',   // texte, traits, séries principales
      deep:     '#041CEC',   // fond de header
      sky:      '#A4CCFC',   // séries claires
      lavender: '#BCCCFC',
      yellow:   '#FCDC0C',
      slate:    '#5E6566',
      steel:    '#8FA3AD',
      white:    '#FFFFFF',
      /* teintes claires — fonds de section */
      tintSky:    '#ECF4FF',
      tintLav:    '#E6EAFB',
      tintYellow: '#FFF7C4',
      tintGrey:   '#EEF0F1',
    },
    text: 'blue',            // couleur des textes et traits par défaut
  },
};
export const DEFAULT_THEME = 'eu';
/** Couleurs proposées comme fond de section (clés de palette) */
export const SECTION_BGS = ['tintSky', 'tintLav', 'tintYellow', 'tintGrey'];

/* ---------- Application en variables CSS ---------- */
export function cssVars(themeKey, colors) {
  const th = THEMES[themeKey] || THEMES[DEFAULT_THEME];
  const pal = Object.assign({}, th.colors, colors || {});
  const v = {};
  for (const [k, n] of Object.entries(SPACE)) v[`--s${k}`] = n + 'px';
  for (const [k, val] of Object.entries(GAP)) v[`--gap-${k}`] = val + 'px';
  for (const [k, t] of Object.entries(TYPE)) {
    v[`--t-${k}-size`] = t.size + 'pt';
    v[`--t-${k}-lh`] = t.lh + 'px';
    v[`--t-${k}-weight`] = t.weight;
    v[`--t-${k}-family`] = FONT[t.family];
  }
  for (const [k, c] of Object.entries(pal)) v[`--c-${k}`] = c;
  for (const [k, val] of Object.entries(VIZ)) if (typeof val === 'number') v[`--viz-${k}`] = val + 'px';
  v['--c-text'] = pal[th.text];
  v['--stroke'] = STROKE.pt + 'pt';
  v['--radius'] = STROKE.radius + 'px';
  v['--page-w'] = PAGE.w + 'px';
  v['--page-h'] = PAGE.h + 'px';
  v['--margin'] = PAGE.margin + 'px';
  v['--bleed'] = PAGE.bleed + 'px';
  return v;
}
export function applyVars(el, vars) {
  for (const [k, val] of Object.entries(vars)) el.style.setProperty(k, val);
}
