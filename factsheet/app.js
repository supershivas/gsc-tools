(() => {
  // src/tokens.js
  var BASE = 3;
  var u = (n) => n * BASE;
  var PAGE = {
    w: 794,
    // A4 largeur (px)
    h: 1123,
    // A4 hauteur (px)
    margin: 52,
    // marge latérale gauche/droite — valeur imposée (seule exception à la base de 3)
    marginTop: u(12),
    // 36 — marge haute (verso, ou recto sans header)
    marginBottom: u(12),
    // 36 — marge basse
    bleed: 3 * 96 / 25.4,
    // 3 mm exacts (11,34 px) — fond perdu à l'export
    slug: 9 * 96 / 25.4,
    // 9 mm — marge de repères autour du fond perdu (traits de coupe)
    cropMark: u(3)
    // longueur des traits de coupe
  };
  var SPACE = {
    0: 0,
    1: u(1),
    2: u(2),
    3: u(3),
    4: u(4),
    5: u(5),
    6: u(6),
    8: u(8),
    10: u(10),
    12: u(12),
    16: u(16)
  };
  var GAP = {
    headerPadX: PAGE.margin,
    // 52 — marges latérales du header (alignées sur la page)
    headerPadY: SPACE[12],
    // 36
    headerImgText: SPACE[6],
    // 18 — entre l'image et le bloc de texte
    headerOverlineRule: SPACE[3],
    // 9  — surtitre → filet
    headerRuleTitle: SPACE[3],
    // 9  — filet → titre
    headerTitleSub: SPACE[1],
    // 3  — titre → sous-titre
    headerToBody: SPACE[12],
    // 36 — bas du header → 1re section (recto)
    sectionBefore: SPACE[8],
    // 24 — entre deux sections
    sectionTitle: SPACE[4],
    // 12 — titre de section → 1re sous-section
    subsectionBefore: SPACE[6],
    // 18 — entre deux sous-sections
    subsectionTitle: SPACE[3],
    // 9  — titre de sous-section → colonnes
    columns: SPACE[6],
    // 18 — gouttière entre colonnes
    paragraph: SPACE[2],
    // 6  — entre paragraphes / items de liste
    boxPad: SPACE[4],
    // 12 — padding des encadrés
    bandPad: SPACE[6]
    // 18 — haut/bas d'une section sur fond coloré
  };
  var DENSITIES = { tight: { label: "Serr\xE9", f: 0.75 }, normal: { label: "Actuel", f: 1 }, loose: { label: "Large", f: 1.25 } };
  var DENSE_KEYS = ["sectionBefore", "sectionTitle", "subsectionBefore", "subsectionTitle", "columns", "bandPad"];
  var BASE_GAP = Object.fromEntries(DENSE_KEYS.map((k) => [k, GAP[k]]));
  function setDensity(key) {
    const f = (DENSITIES[key] || DENSITIES.normal).f;
    for (const k of DENSE_KEYS) GAP[k] = Math.max(BASE, Math.round(BASE_GAP[k] * f / BASE) * BASE);
    GRID.gutter = GAP.columns;
  }
  var GRID = {
    cols: 3,
    gutter: GAP.columns,
    contentW: PAGE.w - 2 * PAGE.margin,
    // 690
    /* Gabarits de sous-section : grille de `cols` colonnes, chaque colonne occupe `spans[i]` */
    layouts: {
      "1": { label: "1 colonne", cols: 1, spans: [1] },
      "1-1": { label: "2 colonnes", cols: 2, spans: [1, 1] },
      "1-1-1": { label: "3 colonnes", cols: 3, spans: [1, 1, 1] },
      "2-1": { label: "2 colonnes (2/3 + 1/3)", cols: 3, spans: [2, 1] },
      "1-2": { label: "2 colonnes (1/3 + 2/3)", cols: 3, spans: [1, 2] },
      "1-1-1-1": { label: "4 colonnes", cols: 4, spans: [1, 1, 1, 1] },
      "1-1-1-1-1": { label: "5 colonnes", cols: 5, spans: [1, 1, 1, 1, 1] },
      "1-1-1-1-1-1": { label: "6 colonnes", cols: 6, spans: [1, 1, 1, 1, 1, 1], hidden: true },
      // plus proposé (gardé pour les fichiers qui l'utilisent)
      "3-1": { label: "2 colonnes (3/4 + 1/4)", cols: 4, spans: [3, 1] },
      "1-3": { label: "2 colonnes (1/4 + 3/4)", cols: 4, spans: [1, 3] },
      "3-2": { label: "2 colonnes (3/5 + 2/5)", cols: 5, spans: [3, 2] },
      "2-3": { label: "2 colonnes (2/5 + 3/5)", cols: 5, spans: [2, 3] },
      "2-1-1": { label: "3 colonnes (1/2 + 1/4 + 1/4)", cols: 4, spans: [2, 1, 1] },
      "1-2-1": { label: "3 colonnes (1/4 + 1/2 + 1/4)", cols: 4, spans: [1, 2, 1] },
      "1-1-2": { label: "3 colonnes (1/4 + 1/4 + 1/2)", cols: 4, spans: [1, 1, 2] }
    }
  };
  function colWidth(layoutKey, i, W = GRID.contentW) {
    const L = GRID.layouts[layoutKey] || GRID.layouts["1"];
    const unit = (W - (L.cols - 1) * GRID.gutter) / L.cols;
    const s2 = L.spans[i] || 1;
    return s2 * unit + (s2 - 1) * GRID.gutter;
  }
  var FONT = {
    sans: '"Source Sans 3", "Source Sans Pro", sans-serif',
    serif: '"Source Serif 4", "Source Serif Pro", serif'
  };
  var TYPE = {
    overline: { family: "sans", size: 16, weight: 200, lh: u(9), upper: true },
    title: { family: "sans", size: 30, weight: 600, lh: u(16) },
    subtitle: { family: "sans", size: 22, weight: 600, lh: u(10) },
    // 30 : un sous-titre sur 2 lignes reste dans le header
    section: { family: "sans", size: 21, weight: 700, lh: u(11) },
    subsection: { family: "sans", size: 14, weight: 700, lh: u(8) },
    body: { family: "sans", size: 12, weight: 400, lh: u(7) },
    bodyBold: { family: "sans", size: 12, weight: 700, lh: u(7) },
    figure: { family: "serif", size: 24, weight: 700, lh: u(12) },
    // chiffres clés
    figureSm: { family: "serif", size: 18, weight: 700, lh: u(8) },
    caption: { family: "sans", size: 8, weight: 600, lh: u(5) },
    // axes, légendes de dataviz
    captionNum: { family: "serif", size: 8, weight: 700, lh: u(5) },
    // valeurs chiffrées des graphiques
    callout: { family: "sans", size: 16, weight: 700, lh: u(7) }
    // « +64 % » à côté d'un graphique
  };
  var STROKE = {
    pt: 0.5,
    px: 0.5 * 96 / 72,
    // 0,667 px
    radius: u(1)
    // 3 — coins des contours (sections, sous-sections, colonnes, encadrés)
  };
  var insetW = (W) => W - 2 * (GAP.boxPad + STROKE.px);
  var HEADER = {
    h: u(80),
    // 240
    image: { w: u(32), h: u(44) },
    // 96 × 132
    logo: { w: u(46), h: u(14) },
    // 138 × 42
    rule: { w: u(8) }
    // 24 — filet sous le surtitre
  };
  var VIZ = {
    ratios: { "2:1": 0.5, "16:9": 0.5625, "3:2": 2 / 3, "1:1": 1 },
    // hauteur / largeur des graphiques à barres
    barRadius: u(1),
    // 3 — arrondi du haut des barres
    barGap: u(1),
    // 3 — espace entre barres groupées
    barMaxW: u(10),
    // 30 — largeur max d'une barre
    pairOffset: 0.5,
    // décalage de la barre arrière (× largeur de barre)
    plotTop: u(6),
    // 18 — réserve en haut (valeurs, accolade)
    catH: u(6),
    // 18 — ligne des catégories sous l'axe
    legendH: u(5),
    // 15 — ligne de légende
    legendGap: u(2),
    // 6  — axe/catégories → légende
    legendSwatch: u(3),
    // 9  — pastille de légende
    calloutW: u(32),
    // 96 — zone du « +64 % »
    calloutGap: u(2),
    // 6
    ringPct: 0.16,
    // épaisseur de l'anneau / rayon extérieur
    ringMin: u(50),
    // 150 — diamètre mini de l'anneau
    ringMax: u(80),
    // 240 — diamètre maxi
    ringLegend: u(56),
    // 168 — diamètre en mode légende (colonnes étroites)
    aroundMinW: u(200),
    // 600 — largeur mini pour des libellés autour de l'anneau (pleine largeur uniquement)
    leaderGap: u(1),
    // 3 — écart trait → texte
    leaderRoom: u(8),
    // 24 — place réservée aux traits entre anneau et libellés
    blockGap: u(3),
    // 9 — entre deux libellés
    pointR: 4.5,
    // rayon des points de courbe
    hBar: u(4),
    // 12 — épaisseur d'une barre horizontale
    hRowGap: u(3),
    // 9 — entre deux lignes de barres horizontales
    iconCircle: u(9),
    // 27 — pastille d'icône
    iconGlyph: u(5),
    // 15 — pictogramme dans la pastille
    iconGap: u(3),
    // 9
    iconRowGap: u(3)
    // 9
  };
  var THEMES = {
    eu: {
      label: "Bleu UE",
      colors: {
        blue: "#003399",
        // texte, traits, fond de header, séries principales — Reflex Blue, CMJN 100/80/0/0
        sky: "#A8CBEF",
        // séries claires — CMJN 35/12/0/0
        yellow: "#FFCC00",
        // CMJN 0/0/100/0
        slate: "#5E6566",
        grey: "#DADDE3"
        // gris clair : fonds et séries neutres
      },
      /* valeurs CMJN d'imprimeur (0–100) : celles du PDF exporté ; le RVB ci-dessus est l'équivalent écran */
      cmyk: { blue: [100, 80, 0, 0], sky: [35, 12, 0, 0], yellow: [0, 0, 100, 0], slate: [62, 48, 47, 30], grey: [14, 9, 7, 0] },
      names: { blue: "Bleu", sky: "Bleu ciel", yellow: "Jaune", slate: "Ardoise", grey: "Gris clair" },
      text: "blue"
      // couleur des textes et traits par défaut
    }
  };
  var DEFAULT_THEME = "eu";
  var WHITE = "#FFFFFF";
  var MAX_EXTRA_COLORS = 7;
  var TINT = 0.2;
  var hex2rgb = (h2) => {
    const n = parseInt(h2.replace("#", ""), 16);
    return [n >> 16 & 255, n >> 8 & 255, n & 255];
  };
  var rgb2hex = (r, g, b) => "#" + [r, g, b].map((x) => Math.round(x).toString(16).padStart(2, "0")).join("").toUpperCase();
  var tintOf = (hex) => rgb2hex(...hex2rgb(hex).map((c2) => c2 * TINT + 255 * (1 - TINT)));
  var paletteOf = (themeKey, colors) => Object.assign({}, (THEMES[themeKey] || THEMES[DEFAULT_THEME]).colors, colors || {});
  var paletteKeys = (doc2, white = true) => [...Object.keys(paletteOf(doc2.theme, doc2.colors)), ...white ? ["white"] : []];
  var sectionBgs = (doc2) => Object.keys(paletteOf(doc2.theme, doc2.colors)).map((k) => "tint-" + k);
  var toneKeys = (doc2) => [...paletteKeys(doc2), ...sectionBgs(doc2)];
  function colorLabel(doc2, key) {
    const th = THEMES[doc2.theme] || THEMES[DEFAULT_THEME];
    if (key === "white") return "Blanc";
    if (key.startsWith("tint-")) return "Teinte \xB7 " + colorLabel(doc2, key.slice(5));
    return doc2.colorNames && doc2.colorNames[key] || th.names[key] || key;
  }
  function cssVars(themeKey, colors) {
    const th = THEMES[themeKey] || THEMES[DEFAULT_THEME];
    const pal = paletteOf(themeKey, colors);
    const v = {};
    for (const [k, n] of Object.entries(SPACE)) v[`--s${k}`] = n + "px";
    for (const [k, val] of Object.entries(GAP)) v[`--gap-${k}`] = val + "px";
    for (const [k, t2] of Object.entries(TYPE)) {
      v[`--t-${k}-size`] = t2.size + "pt";
      v[`--t-${k}-lh`] = t2.lh + "px";
      v[`--t-${k}-weight`] = t2.weight;
      v[`--t-${k}-family`] = FONT[t2.family];
    }
    for (const [k, c2] of Object.entries(pal)) {
      v[`--c-${k}`] = c2;
      v[`--c-tint-${k}`] = tintOf(c2);
    }
    v["--c-white"] = WHITE;
    for (const [k, val] of Object.entries(VIZ)) if (typeof val === "number") v[`--viz-${k}`] = val + "px";
    v["--c-text"] = pal[th.text];
    v["--stroke"] = STROKE.pt + "pt";
    v["--radius"] = STROKE.radius + "px";
    v["--page-w"] = PAGE.w + "px";
    v["--page-h"] = PAGE.h + "px";
    v["--margin"] = PAGE.margin + "px";
    v["--bleed"] = PAGE.bleed + "px";
    return v;
  }
  function applyVars(el2, vars) {
    for (const [k, val] of Object.entries(vars)) el2.style.setProperty(k, val);
  }

  // src/i18n.js
  var LANGS = { en: "English", fr: "Fran\xE7ais" };
  var KEY = "factsheet-creator-lang";
  var lang = "en";
  try {
    const v = localStorage.getItem(KEY);
    if (v && LANGS[v]) lang = v;
  } catch (e) {
  }
  var getLang = () => lang;
  var EN = {
    /* page */
    "Zoom": "Zoom",
    "Ajuster": "Fit",
    "Langue": "Language",
    "Couleurs": "Colours",
    "Cadre": "Frame",
    "Fond du cadre": "Frame background",
    "Fond": "Background",
    "Fond et contour": "Background and outline",
    "Disposition": "Layout",
    "Replier": "Collapse",
    "D\xE9plier": "Expand",
    "Modifier, renommer ou ajouter des couleurs": "Edit, rename or add colours",
    "Nom de la couleur": "Colour name",
    "Couleurs du document": "Document colours",
    "Chaque choix de couleur du document propose aussi \xAB + \xBB pour modifier, renommer ou ajouter une couleur.": "Every colour choice in the document also offers \u201C+\u201D to edit, rename or add a colour.",
    "Type de contenu": "Content type",
    "Espacement": "Spacing",
    "Marges et espaces": "Margins and spacing",
    "Serr\xE9 \u2014 75 %": "Tight \u2014 75 %",
    "Actuel \u2014 100 %": "Current \u2014 100 %",
    "Large \u2014 125 %": "Wide \u2014 125 %",
    "Ajouter une colonne": "Add a column",
    "Nouvelle section": "New section",
    "Nouvelle sous-section": "New subsection",
    "Gris clair": "Light grey",
    "Marges de page": "Page margins",
    "Entre sections": "Between sections",
    "Entre sous-sections": "Between subsections",
    "Entre colonnes": "Between columns",
    "Annuler l\u2019action": "Undo",
    "Ton l\xE9ger (20 %)": "Light tone (20 %)",
    "\xC9dition": "Edit",
    "R\xE9tablir": "Redo",
    "Couleurs du document\u2026": "Document colours\u2026",
    "Format des nombres": "Number format",
    "S\xE9lectionnez un \xE9l\xE9ment dans la structure (\xE0 gauche) ou sur la page pour modifier ses propri\xE9t\xE9s.": "Select an element in the structure (left) or on the page to edit its properties.",
    "Les couleurs, le format des nombres et le nom du fichier sont dans le menu \xC9dition.": "Colours, number format and file name are in the Edit menu.",
    "Historique des modifications": "Edit history",
    "Historique des modifications\u2026": "Edit history\u2026",
    "Ouverture du document": "Document opened",
    "Modification": "Edit",
    "Section ajout\xE9e": "Section added",
    "Section supprim\xE9e": "Section deleted",
    "Sous-section ajout\xE9e": "Subsection added",
    "Sous-section supprim\xE9e": "Subsection deleted",
    "Colonne ajout\xE9e": "Column added",
    "Colonne supprim\xE9e": "Column deleted",
    "\xC9l\xE9ments d\xE9plac\xE9s": "Items moved",
    "r\xE9glage": "setting",
    "Colonne": "Column",
    "texte": "text",
    "titre": "title",
    "sous-titre": "subtitle",
    "surtitre": "overline",
    "fond": "background",
    "couleur du texte": "text colour",
    "contour": "outline",
    "couleur du contour": "outline colour",
    "colonnes": "columns",
    "page": "page",
    "alignement vertical": "vertical alignment",
    "alignement": "alignment",
    "espacement": "spacing",
    "format des nombres": "number format",
    "image": "image",
    "l\xE9gende": "caption",
    "logo": "logo",
    "couleurs": "colours",
    "noms des couleurs": "colour names",
    "dataviz": "dataviz",
    "carte": "card",
    "chiffre cl\xE9": "key figure",
    "type de contenu": "content type",
    "images": "images",
    "nom du fichier": "file name",
    "\xC9l\xE9ment supprim\xE9.": "Item deleted.",
    "Annuler la suppression": "Undo deletion",
    "Contenu d\xE9plac\xE9. V\xE9rifiez le remplissage des pages.": "Content moved. Check page fill.",
    "Annuler le d\xE9placement": "Undo move",
    "Marges": "Margins",
    "Sections": "Sections",
    "Sous-sections": "Subsections",
    "Colonnes": "Columns",
    "Serr\xE9": "Tight",
    "Actuel": "Current",
    "Large": "Wide",
    "Titre de section (vide = masqu\xE9)": "Section title (empty = hidden)",
    "Glisser la section (ou la page)": "Drag the section (to reorder or change page)",
    "Afficher le titre": "Show title",
    "affichage du titre": "title visibility",
    "Titre de sous-section": "Subsection title",
    "Nouvelle factsheet vierge": "New blank factsheet",
    "Cr\xE9er une factsheet vierge ? Le document actuel sera remplac\xE9 : enregistrez-le d\u2019abord (.json) si besoin.": "Create a blank factsheet? The current document will be replaced: save it first (.json) if needed.",
    "Enregistrer (.json)": "Save (.json)",
    "Ouvrir\u2026": "Open\u2026",
    "Exporter PDF\u2026": "Export PDF\u2026",
    "Aper\xE7u 3D": "3D preview",
    "Fichier de projet invalide.": "Invalid project file.",
    "Image illisible.": "Unreadable image.",
    "Recto": "Front",
    "Verso": "Back",
    "recto": "front",
    "verso": "back",
    "Exporter en PDF": "Export to PDF",
    "Annuler": "Cancel",
    "Exporter": "Export",
    "Terminer": "Done",
    "M\xE9dias import\xE9s\u2026": "Imported media\u2026",
    "M\xE9dias import\xE9s": "Imported media",
    "Aucun m\xE9dia import\xE9.": "No imported media.",
    "Ic\xF4nes SVG import\xE9es : disponibles dans chaque choix d\u2019ic\xF4ne du document. Les retirer les retire partout.": "Imported SVG icons: available in every icon choice of the document. Removing one removes it everywhere.",
    "Copier l\u2019erreur": "Copy the error",
    "Placement": "Placement",
    "Libre (glisser dans l\u2019aper\xE7u)": "Free (drag in the preview)",
    "Au-dessus du contenu": "Above the content",
    "En dessous du contenu": "Below the content",
    "Glisser un texte \xAB libre \xBB dans l\u2019aper\xE7u pour le placer o\xF9 l\u2019on veut dans la colonne ; \xAB au-dessus \xBB ou \xAB en dessous \xBB le met dans le flux, avant ou apr\xE8s le contenu.": "Drag a \u201Cfree\u201D text in the preview to place it anywhere in the column; \u201Cabove\u201D or \u201Cbelow\u201D puts it in the flow, before or after the content.",
    "Titre de la dataviz (facultatif) \u2014 styles de paragraphe : titre 1, titre 2, chiffre cl\xE9\u2026": "Dataviz title (optional) \u2014 paragraph styles: heading 1, heading 2, key figure\u2026",
    "Textes libres": "Free texts",
    "Ajouter un texte": "Add a text",
    "Glisser un texte dans l\u2019aper\xE7u pour le placer o\xF9 l\u2019on veut dans la colonne.": "Drag a text in the preview to place it anywhere in the column.",
    "X (% de la colonne)": "X (% of the column)",
    "Largeur (%)": "Width (%)",
    "Y (px)": "Y (px)",
    "Chiffre cl\xE9 (petit)": "Key figure (small)",
    "Position de la l\xE9gende (\xAB Dans les barres \xBB : noms des s\xE9ries \xE9crits dans chaque barre, sans l\xE9gende s\xE9par\xE9e)": "Legend position (\u201CInside the bars\u201D: series names written in each bar, no separate legend)",
    "Style de paragraphe": "Paragraph style",
    "Titre 1": "Heading 1",
    "Titre 2": "Heading 2",
    "L\xE9gende": "Caption",
    "Texte libre": "Free text",
    "Position": "Position",
    "En dessous": "Below",
    "Largeur du texte (% de la colonne)": "Text width (% of the column)",
    "Un texte li\xE9 \xE0 cette colonne, quel que soit son contenu : titres, paragraphes, puces, l\xE9gende.": "A text attached to this column, whatever its content: headings, paragraphs, bullets, caption.",
    "Position de la l\xE9gende": "Legend position",
    "Dans les barres": "Inside the bars",
    "\xC9paisseur des barres": "Bar thickness",
    "Fine": "Thin",
    "Normale": "Normal",
    "\xC9paisse": "Thick",
    "Tr\xE8s \xE9paisse": "Extra thick",
    "Espace entre les lignes": "Space between rows",
    "Espace entre les barres d\u2019une m\xEAme ligne": "Space between bars of the same row",
    "Espace entre les groupes de barres": "Space between bar groups",
    "Espace entre les barres d\u2019un m\xEAme groupe": "Space between bars of the same group",
    "Valeurs dans les barres (si elles rentrent)": "Values inside the bars (if they fit)",
    "Libell\xE9s dans les barres (au pied de la barre)": "Labels inside the bars (at the foot of the bar)",
    "Noms des s\xE9ries dans les barres (\xE9crits \xE0 la verticale)": "Series names inside the bars (written vertically)",
    "Noms des s\xE9ries (l\xE9gende) dans les barres": "Series names (legend) inside the bars",
    "Valeurs dans les barres (si affich\xE9es ; sinon apr\xE8s la barre quand \xE7a ne rentre pas)": "Values inside the bars (if shown; otherwise after the bar when they do not fit)",
    "Exposant": "Superscript",
    "Indice": "Subscript",
    "Entr\xE9e = nouveau paragraphe \xB7 Maj + Entr\xE9e = retour \xE0 la ligne": "Enter = new paragraph \xB7 Shift + Enter = line break",
    "Cercle autour de l\u2019ic\xF4ne": "Circle around the icon",
    "Espace entre les \xE9l\xE9ments": "Space between items",
    "R\xE9duit": "Reduced",
    "Accolade : espace avant la liste": "Bracket: space before the list",
    "Accolade : trait de liaison vers l\u2019ext\xE9rieur, longueur au-del\xE0 de la colonne (px, 0 = aucun)": "Bracket: link line outwards, length beyond the column (px, 0 = none)",
    "Aucun (anneau seul)": "None (ring only)",
    "Trait de liaison : longueur au-del\xE0 de la colonne (px)": "Link line: length beyond the column (px)",
    "Trait de liaison : couleur": "Link line: colour",
    "Trait de liaison vers l\u2019ext\xE9rieur (jusqu\u2019au bord de la colonne et au-del\xE0)": "Link line outwards (to the column edge and beyond)",
    "Au-dessus": "Above",
    "Libell\xE9s dans les barres": "Labels inside the bars",
    "Graduations : nombre de segments dans la barre la plus longue (0 = aucune)": "Graduations: number of segments in the longest bar (0 = none)",
    "Accolade \xE0 gauche": "Bracket on the left",
    "Hachures": "Stripes",
    "Barre de progression sous le chiffre (% ; 0 = pas de barre)": "Progress bar under the figure (%; 0 = no bar)",
    "Autres chiffres \xE0 c\xF4t\xE9 (jusqu\u2019\xE0 2)": "Other figures beside (up to 2)",
    "Barre de progression (% ; 0 = pas de barre)": "Progress bar (%; 0 = no bar)",
    "Couleur de la barre": "Bar colour",
    "Couleur du reste de la barre": "Colour of the rest of the bar",
    "En-t\xEAte (petites capitales, ex. \xAB Sous occupation \xBB)": "Heading (capitals, e.g. \u201CUnder occupation\u201D)",
    "Ic\xF4ne de l\u2019en-t\xEAte": "Heading icon",
    "Hauteur minimale (px, 0 = automatique)": "Minimum height (px, 0 = automatic)",
    "Ou glisser la poign\xE9e sous la colonne dans l\u2019aper\xE7u : elle se cale sur la colonne voisine.": "Or drag the handle under the column in the preview: it snaps to the neighbouring column.",
    "Glisser : hauteur du contenu (se cale sur la colonne voisine) \xB7 double-clic : adapter \xE0 la colonne voisine": "Drag: content height (snaps to the neighbouring column) \xB7 double-click: match the neighbouring column",
    "Hauteur du contenu": "Content height",
    "Annuler (Cmd/Ctrl + Z)": "Undo (Cmd/Ctrl + Z)",
    "Annuler la derni\xE8re modification": "Undo the last change",
    "R\xE9tablir (Cmd/Ctrl + Maj + Z)": "Redo (Cmd/Ctrl + Shift + Z)",
    "R\xE9tablir la modification annul\xE9e": "Redo the undone change",
    "Le navigateur ouvre sa fen\xEAtre d\u2019impression : choisissez": "The browser opens its print window: choose",
    "Enregistrer au format PDF": "Save as PDF",
    "comme destination,": "as destination,",
    "Marges : aucune": "Margins: none",
    ", et cochez": ", and tick",
    "Graphiques d\u2019arri\xE8re-plan": "Background graphics",
    ". Le PDF contient 2 pages (recto, verso) en vectoriel avec polices incorpor\xE9es.": ". The PDF has 2 pages (front, back), vector, with embedded fonts.",
    "A4 net \u2014 210 \xD7 297 mm": "A4 trimmed \u2014 210 \xD7 297 mm",
    "Sans fond perdu ni rep\xE8res.": "No bleed or marks.",
    "Fond perdu 3 mm \u2014 216 \xD7 303 mm": "3 mm bleed \u2014 216 \xD7 303 mm",
    "Les fonds color\xE9s d\xE9bordent de 3 mm sur les 4 c\xF4t\xE9s.": "Coloured backgrounds extend 3 mm past all four edges.",
    "Fond perdu 3 mm + traits de coupe \u2014 228 \xD7 315 mm": "3 mm bleed + crop marks \u2014 228 \xD7 315 mm",
    "Pour l\u2019imprimeur : fond perdu et rep\xE8res de coupe (feuille de 228 \xD7 315 mm).": "For the printer: bleed and crop marks (228 \xD7 315 mm sheet).",
    "Espace de stockage du navigateur plein : les derni\xE8res modifications ne sont pas enregistr\xE9es. Enregistrez le projet (.json) et all\xE9gez les images.": "Browser storage is full: the latest changes are not saved. Save the project (.json) and use lighter images.",
    /* panneau document */
    "Document": "Document",
    "document": "document",
    "Nom du fichier": "File name",
    "Th\xE8me": "Theme",
    "Bleu UE": "EU blue",
    "Format des nombres": "Number format",
    "Palette du th\xE8me": "Theme palette",
    "S\xE9lectionnez un \xE9l\xE9ment dans la structure (\xE0 gauche) ou sur la page pour modifier ses propri\xE9t\xE9s.": "Select an element in the structure (left) or on the page to edit its properties.",
    "Bleu": "Blue",
    "Bleu profond": "Deep blue",
    "Bleu ciel": "Sky blue",
    "Lavande": "Lavender",
    "Jaune": "Yellow",
    "Ardoise": "Slate",
    "Acier": "Steel",
    "Blanc": "White",
    "Teinte ciel": "Sky tint",
    "Teinte lavande": "Lavender tint",
    "Teinte jaune": "Yellow tint",
    "Teinte grise": "Grey tint",
    /* header */
    "Surtitre": "Overline",
    "Titre (taille fixe)": "Title (fixed size)",
    "Sous-titre (optionnel \u2014 vide = masqu\xE9)": "Subtitle (optional \u2014 empty = hidden)",
    "Couleur de fond": "Background colour",
    "Couleur du texte": "Text colour",
    "Afficher l\u2019image": "Show image",
    "Afficher le logo": "Show logo",
    "Logo": "Logo",
    "Version du logo": "Logo version",
    "Les 4 versions ont la m\xEAme taille (138 \xD7 42 px). PNG transparent ou SVG.": "The 4 versions share the same size (138 \xD7 42 px). Transparent PNG or SVG.",
    "personnalis\xE9": "custom",
    "original": "original",
    "Charger une autre image\u2026": "Load another image\u2026",
    "R\xE9tablir l\u2019original": "Restore the original",
    "Image par d\xE9faut": "Default image",
    "D\xE9faut": "Default",
    "Mono": "Mono",
    "Blanc (white)": "White",
    "N\xE9gatif": "Negative",
    "import\xE9": "uploaded",
    "vide": "empty",
    "Images du header": "Header images",
    "Image affich\xE9e (132 px de haut, largeur selon l\u2019image) \u2014 choisissez dans la biblioth\xE8que :": "Image shown (132 px high, width follows the image) \u2014 pick one from the library:",
    "Ajouter une image": "Add an image",
    "Renommer": "Rename",
    "Nom de l\u2019image :": "Image name:",
    "Supprimer cette image ?": "Delete this image?",
    "Image du header": "Header image",
    "Image": "Image",
    "Remplacer\u2026": "Replace\u2026",
    "Importer\u2026": "Import\u2026",
    "Retirer": "Remove",
    "Aucun": "None",
    "Pas d\u2019image": "No image",
    /* section / sous-section / colonne */
    "Section": "Section",
    "Titre de section": "Section title",
    "Fond de la section": "Section background",
    "Page": "Page",
    "\u2191 Monter": "\u2191 Move up",
    "\u2193 Descendre": "\u2193 Move down",
    "Supprimer": "Delete",
    "Supprimer cette section ?": "Delete this section?",
    "Sous-section": "Subsection",
    "Titre de sous-section": "Subsection title",
    "Titre de sous-section (vide = masqu\xE9)": "Subsection title (empty = hidden)",
    "Colonnes": "Columns",
    "Dupliquer": "Duplicate",
    "Supprimer cette sous-section ?": "Delete this subsection?",
    "1 colonne": "1 column",
    "2 colonnes": "2 columns",
    "3 colonnes": "3 columns",
    "2 colonnes (2/3 + 1/3)": "2 columns (2/3 + 1/3)",
    "2 colonnes (1/3 + 2/3)": "2 columns (1/3 + 2/3)",
    "Contenu": "Content",
    "Texte": "Text",
    "Dataviz": "Dataviz",
    "Image (recadr\xE9e au format choisi)": "Image (cropped to the chosen ratio)",
    "Format": "Ratio",
    "L\xE9gende (optionnelle)": "Caption (optional)",
    "Ouvrir l\u2019\xE9diteur de dataviz": "Open the dataviz editor",
    "Type de dataviz": "Dataviz type",
    "\xC9l\xE9ment introuvable": "Element not found",
    "Votre texte ici. Une ligne = un paragraphe, **gras** avec les ast\xE9risques.": "Your text here. One line = one paragraph, **bold** with asterisks.",
    /* structure */
    "Header": "Header",
    "Aucune section \u2014 glissez-en une ici.": "No sections \u2014 drag one here.",
    "+ sous-section": "+ subsection",
    "+ section": "+ section",
    "Section sans titre": "Untitled section",
    "Texte vide": "Empty text",
    "Glisser pour r\xE9ordonner ou changer de page": "Drag to reorder or change page",
    /* survol */
    "\xC9diter": "Edit",
    "Afficher les propri\xE9t\xE9s": "Show properties",
    "Colonne": "Column",
    "Dataviz\u2026": "Dataviz\u2026",
    "Monter": "Move up",
    "Descendre": "Move down",
    "Sans fond": "No background",
    /* éditeur de texte et de tableaux */
    "Gras": "Bold",
    "Italique": "Italic",
    "Soulign\xE9": "Underline",
    "Liste \xE0 puces": "Bullet list",
    "+ Ajouter": "+ Add",
    "+ S\xE9rie": "+ Series",
    "Libell\xE9": "Label",
    "+ Ligne": "+ Row",
    "S\xE9rie": "Series",
    "Coller un tableau": "Paste a table",
    "Remplacer les donn\xE9es": "Replace data",
    "Collez un tableau depuis Excel ou un CSV : libell\xE9 \u21E5 s\xE9rie 1 \u21E5 s\xE9rie 2\u2026  (la 1re ligne peut contenir les noms de s\xE9ries)": "Paste a table from Excel or a CSV: label \u21E5 series 1 \u21E5 series 2\u2026  (the first row may hold the series names)",
    /* éditeur de dataviz */
    "\xC9diteur de dataviz": "Dataviz editor",
    "Aper\xE7u \xE0 la largeur": "Preview at width",
    "Pleine largeur": "Full width",
    "Cliquer un segment ou un libell\xE9 pour le s\xE9lectionner \xB7 glisser l\u2019anneau pour le tourner \xB7 glisser un libell\xE9 (verticalement, ou de l\u2019autre c\xF4t\xE9) \xB7 glisser le point blanc pour d\xE9placer l\u2019ancrage du trait": "Click a segment or a label to select it \xB7 drag the ring to rotate it \xB7 drag a label (vertically, or to the other side) \xB7 drag the white dot to move the leader line anchor",
    "Les modifications du formulaire s\u2019appliquent en direct.": "Changes made in the form apply live.",
    /* éditeur de dataviz : cartes et données */
    "Visualisation": "Visualisation",
    "Comparaison": "Comparison",
    "Proportions": "Proportions",
    "\xC9volution": "Trend",
    "Listes": "Lists",
    "Type": "Type",
    "Titre et source": "Title and source",
    "Titre de la dataviz (facultatif)": "Dataviz title (optional)",
    "Source (facultatif)": "Source (optional)",
    "Dimensions": "Dimensions",
    "\xC9tiquettes": "Labels",
    "Fichier illisible.": "Unreadable file.",
    "Collez ici un tableau copi\xE9 depuis Excel, Sheets ou un CSV (la 1re ligne peut contenir les en-t\xEAtes)": "Paste a table copied from Excel, Sheets or a CSV here (the first row can hold headers)",
    "Glissez un fichier CSV, TSV ou JSON ici, ou": "Drop a CSV, TSV or JSON file here, or",
    "importez-le\u2026": "import it\u2026",
    "Exporter en CSV": "Export as CSV",
    "Donut / camembert": "Donut / pie",
    /* nouveaux types de dataviz */
    "Afficher la l\xE9gende (groupes)": "Show legend (groups)",
    "Afficher la l\xE9gende (niveau 1)": "Show legend (level 1)",
    "Afficher le nom des groupes (niveau 1)": "Show group names (level 1)",
    "Afficher le nom des groupes": "Show group names",
    "Afficher les noms": "Show names",
    "Afficher les noms sur les arcs": "Show names on the arcs",
    "Afficher le total au centre": "Show the total in the centre",
    "Afficher le contour des groupes": "Show group outlines",
    "Afficher le nom des points": "Show point names",
    "Alignement des n\u0153uds": "Node alignment",
    "Aucune donn\xE9e": "No data",
    "Axe horizontal d\xE9marrant \xE0 z\xE9ro": "Horizontal axis starting at zero",
    "Bulles hi\xE9rarchiques": "Hierarchy bubbles",
    "Carr\xE9": "Square",
    "Couleur (niveau 1)": "Colour (level 1)",
    "Couleur de la r\xE9ponse": "Answer colour",
    "Couleur du flux": "Flow colour",
    "Couleur des pictogrammes": "Pictogram colour",
    "C\u0153ur": "Heart",
    "D\xE9cimales des axes": "Axis decimals",
    "D\xE9cimales des pourcentages": "Percentage decimals",
    "Espace entre les bulles (px)": "Space between bubbles (px)",
    "Espace entre les cases (px)": "Space between cells (px)",
    "Espace entre les n\u0153uds (px)": "Space between nodes (px)",
    "Groupe (facultatif)": "Group (optional)",
    "Groupes par ligne (0 = automatique)": "Groups per row (0 = automatic)",
    "Importer un SVG\u2026": "Import an SVG\u2026",
    "Import\xE9": "Imported",
    "Largeur des n\u0153uds (px)": "Node width (px)",
    "Pictogrammes \xB7 barres": "Pictograms \xB7 bars",
    "Pictogrammes \xB7 barres verticales": "Pictograms \xB7 vertical bars",
    "Pictogramme simple vertical": "Simple vertical pictogram",
    "Pictogramme simple horizontal": "Simple horizontal pictogram",
    "Pictogramme": "Pictogram",
    "Pictogrammes": "Pictograms",
    "Pourcentages dans la l\xE9gende": "Percentages in the legend",
    "Rayon maximal des bulles (px)": "Maximum bubble radius (px)",
    "Recolorer le SVG import\xE9 avec la couleur choisie": "Recolour the imported SVG with the chosen colour",
    "R\xE9pondants": "Respondents",
    "R\xE9pondants par point (0 = automatique)": "Respondents per dot (0 = automatic)",
    "R\xE9ponse": "Answer",
    "R\xE9sultats d\u2019enqu\xEAte": "Survey results",
    "SVG illisible ou trop lourd.": "Unreadable or too heavy SVG.",
    "Taille (facultatif)": "Size (optional)",
    "Titre de l\u2019axe horizontal": "Horizontal axis title",
    "Titre de l\u2019axe vertical": "Vertical axis title",
    "Trou central (0 \xE0 0,6 du rayon)": "Central hole (0 to 0.6 of the radius)",
    "Une ligne par feuille ; laissez vides les niveaux inutiles. La couleur du niveau 1 s\u2019applique \xE0 toute sa branche.": "One row per leaf; leave unused levels empty. The level 1 colour applies to its whole branch.",
    "Une ligne par flux. Les n\u0153uds sont cr\xE9\xE9s d\u2019apr\xE8s les noms ; la couleur d\u2019un flux est celle de sa source si elle n\u2019est pas choisie.": "One row per flow. Nodes are created from the names; a flow takes its source colour unless one is chosen.",
    "Une ligne par groupe et par r\xE9ponse. L\u2019ordre des r\xE9ponses va du centre vers l\u2019ext\xE9rieur ; laissez le groupe vide pour un seul nuage.": "One row per group and answer. Answers run from the centre outwards; leave the group empty for a single cloud.",
    "Une ligne par point. Le groupe donne la couleur ; la taille (facultative) en fait une bulle.": "One row per point. The group sets the colour; the (optional) size makes it a bubble.",
    "Nuage de points": "Scatter plot",
    "Hi\xE9rarchies": "Hierarchies",
    "Flux": "Flows",
    "Nom": "Name",
    "Cible": "Target",
    "Niveau 1": "Level 1",
    "Niveau 2": "Level 2",
    "Niveau 3": "Level 3",
    "Groupe": "Group",
    "Rond": "Circle",
    "Personne": "Person",
    "Maison": "House",
    "Trait": "Outline",
    "Flux circulaires non pris en charge": "Circular flows are not supported",
    "Importer": "Import",
    /* hauteur des dataviz */
    "Automatique (hauteur naturelle)": "Automatic (natural height)",
    "Proportion de la largeur": "Proportion of the width",
    "Fixe": "Fixed",
    "Remplir la place disponible": "Fill the available space",
    "Hauteur": "Height",
    "Hauteur du graphique (px)": "Chart height (px)",
    "Hauteur minimale (px)": "Minimum height (px)",
    "Hauteur maximale (px)": "Maximum height (px)",
    "Place disponible pour cet aper\xE7u (px)": "Available space for this preview (px)",
    "Dans le document, la dataviz occupe la place restante de la page (partag\xE9e s\u2019il y en a plusieurs), entre ces deux bornes.": "In the document, the dataviz takes the remaining space on the page (shared if there are several), between these two limits.",
    "Filet entre les sous-sections": "Rule between subsections",
    "Couleur du filet": "Rule colour",
    /* texte du centre du donut */
    "Texte du centre": "Centre text",
    "Titre 1 (grand)": "Heading 1 (large)",
    "Titre 2 (moyen)": "Heading 2 (medium)",
    "Texte courant": "Body text",
    "Une ligne par paragraphe. {total} = somme des valeurs. Le texte passe \xE0 la ligne et ne d\xE9passe jamais l\u2019anneau.": "One line per paragraph. {total} = sum of the values. The text wraps and never exceeds the ring.",
    /* frise chronologique */
    "Frise chronologique": "Timeline",
    "Orientation": "Orientation",
    "Verticale": "Vertical",
    "Horizontale": "Horizontal",
    "Alterner les \xE9v\xE9nements de part et d\u2019autre de la ligne": "Alternate events on both sides of the line",
    "Afficher les dates": "Show dates",
    "Date": "Date",
    "Une ligne par \xE9v\xE9nement, dans l\u2019ordre d\u2019affichage. Entr\xE9e = retour \xE0 la ligne dans le titre et le texte.": "One row per event, in display order. Enter = line break in the title and the text.",
    /* aide « ? » */
    "Petite ligne en capitales au-dessus du titre, suivie d\u2019un filet. Entr\xE9e = retour \xE0 la ligne.": "Small line in capitals above the title, followed by a rule. Enter = line break.",
    "Le titre du header a une taille fixe (30 px). Un avertissement appara\xEEt si le texte d\xE9borde du bandeau.": "The header title has a fixed size (30 px). A warning appears if the text overflows the banner.",
    "Deux lignes tiennent dans le header ; au-del\xE0, un avertissement s\u2019affiche. Vide = masqu\xE9.": "Two lines fit in the header; beyond that a warning is shown. Empty = hidden.",
    "Image de 132 px de haut \xE0 gauche du header, choisie dans la biblioth\xE8que.": "132 px high image on the left of the header, picked from the library.",
    "Logo \xE0 droite du header ; quatre versions de m\xEAme taille sont disponibles.": "Logo on the right of the header; four versions of the same size are available.",
    "Titre de la section. Entr\xE9e = retour \xE0 la ligne ; vide ou interrupteur \xE9teint = titre masqu\xE9 (la section se d\xE9place alors par son fond).": "Section title. Enter = line break; empty or switched off = title hidden (the section is then dragged by its background).",
    "Titre de la sous-section, sous le titre de section. Vide = masqu\xE9.": "Subsection title, below the section title. Empty = hidden.",
    "Masque le titre sans le perdre : il reste saisi, mais n\u2019appara\xEEt ni \xE0 l\u2019\xE9cran ni \xE0 l\u2019export.": "Hides the title without losing it: it stays typed in but appears neither on screen nor in the export.",
    "Trait de 0,5 pt sur toute la largeur de la page entre deux sous-sections de cette section.": "0.5 pt line across the full page width between two subsections of this section.",
    "Par d\xE9faut : blanc sur un fond de section, bleu l\xE9ger (teinte 20 %) sur fond blanc.": "Default: white on a section background, light blue (20 % tint) on white.",
    "Bande de couleur sur toute la largeur de la page, derri\xE8re la section.": "Colour band across the full page width, behind the section.",
    "Contour de 0,5 pt et fond facultatif autour de la section, align\xE9 sur les marges.": "0.5 pt outline and optional background around the section, aligned with the margins.",
    "Trait de 0,5 pt aux coins arrondis ; le contenu est alors en retrait de 12 px.": "0.5 pt line with rounded corners; the content is then inset by 12 px.",
    "Place le contenu en haut, au centre ou en bas quand la colonne est moins haute que sa voisine.": "Places the content at the top, centre or bottom when the column is shorter than its neighbour.",
    "\xC9change de place le contenu de cette colonne avec celui d\u2019une autre (alignements inclus). Annulable.": "Swaps this column\u2019s content with another\u2019s (alignments included). Can be undone.",
    "Alignement vertical du contenu et du texte dans la colonne.": "Vertical alignment of the content and text inside the column.",
    "Fond (couleur ou teinte) et contour de la colonne, ind\xE9pendants l\u2019un de l\u2019autre.": "Background (colour or tint) and outline of the column, independent of each other.",
    "Change le type du graphique en gardant le titre et, quand la forme est la m\xEAme, les donn\xE9es.": "Changes the chart type, keeping the title and, when the shape is the same, the data.",
    "Automatique : hauteur naturelle. Proportion : fraction de la largeur. Fixe : en pixels. Remplir : occupe la place restante de la page.": "Automatic: natural height. Proportion: fraction of the width. Fixed: in pixels. Fill: takes the remaining space on the page.",
    "En mode \xAB Remplir \xBB, la dataviz ne sera jamais plus basse.": "In \u201CFill\u201D mode the dataviz will never be shorter.",
    "En mode \xAB Remplir \xBB, la dataviz ne sera jamais plus haute.": "In \u201CFill\u201D mode the dataviz will never be taller.",
    "Simule l\u2019espace libre de la page pour voir l\u2019effet du mode \xAB Remplir \xBB (non enregistr\xE9).": "Simulates the free space on the page to preview \u201CFill\u201D mode (not saved).",
    "Texte facultatif au-dessus (titre) et sous (source) de la dataviz.": "Optional text above (title) and below (source) the dataviz.",
    "Collez un tableau depuis Excel ou Sheets, importez un fichier CSV, TSV ou JSON, ou saisissez directement dans les cellules. Entr\xE9e passe \xE0 la ligne suivante.": "Paste a table from Excel or Sheets, import a CSV, TSV or JSON file, or type straight into the cells. Enter moves to the next row.",
    "Proportions du graphique.": "Chart proportions.",
    "L\xE9gende, valeurs affich\xE9es, d\xE9cimales et unit\xE9.": "Legend, displayed values, decimals and unit.",
    "Couleurs du document ; les s\xE9ries utilisent les cl\xE9s de la palette, donc suivent le th\xE8me.": "Document colours; series use palette keys, so they follow the theme.",
    "Proportion hauteur / largeur du graphique (en mode \xAB Proportion \xBB).": "Height / width ratio of the chart (in \u201CProportion\u201D mode).",
    "Pastilles de couleur avec le nom des s\xE9ries ou des groupes sous le graphique.": "Colour swatches with the series or group names below the chart.",
    "Nombre de d\xE9cimales affich\xE9es pour les valeurs.": "Number of decimals shown for values.",
    "Texte ajout\xE9 apr\xE8s chaque valeur, par exemple \xAB % \xBB ou \xAB M\u20AC \xBB.": "Text added after each value, e.g. \u201C%\u201D or \u201CM\u20AC\u201D.",
    "Une ligne par paragraphe. \xAB ## \xBB devant une ligne = titre 2, \xAB ### \xBB = texte courant, rien = titre 1. {total} = somme des valeurs.": "One line per paragraph. \u201C##\u201D before a line = heading 2, \u201C###\u201D = body text, nothing = heading 1. {total} = sum of the values.",
    "Un point repr\xE9sente N r\xE9pondants. 0 choisit une valeur pour afficher environ 400 points.": "One dot stands for N respondents. 0 picks a value that shows about 400 dots.",
    "Nombre de nuages c\xF4te \xE0 c\xF4te quand l\u2019enqu\xEAte a plusieurs groupes.": "Number of clouds side by side when the survey has several groups.",
    "Valeur repr\xE9sent\xE9e par un pictogramme entier ; le dernier peut \xEAtre partiel.": "Value represented by one whole pictogram; the last one can be partial.",
    "Valeur correspondant \xE0 un pictogramme enti\xE8rement rempli (ex. 100 pour des pourcentages).": "Value matching a fully filled pictogram (e.g. 100 for percentages).",
    "Les \xE9v\xE9nements pairs et impairs passent de chaque c\xF4t\xE9 de la ligne : le texte dispose de deux fois plus de largeur.": "Even and odd events go on either side of the line: the text gets twice the width.",
    "\xC9paisseur des barres verticales du diagramme de Sankey.": "Thickness of the Sankey diagram\u2019s vertical bars.",
    "Aide": "Help",
    /* export CMJN */
    "G\xE9n\xE9ration du PDF\u2026": "Generating the PDF\u2026",
    "Impossible de g\xE9n\xE9rer le PDF CMJN.": "Unable to generate the CMYK PDF.",
    "T\xE9l\xE9charger le PDF CMJN": "Download the CMYK PDF",
    "PDF RVB (impression)": "RGB PDF (browser print)",
    "PDF RVB (impression du navigateur)": "RGB PDF (browser print)",
    /* boîte d'export */
    "PDF CMJN": "CMYK PDF",
    " (pour l\u2019imprimeur) : fichier vectoriel g\xE9n\xE9r\xE9 par l\u2019app, couleurs en CMJN, polices incorpor\xE9es, TrimBox et BleedBox renseign\xE9es. Les images import\xE9es sont converties en CMJN sans profil ICC.": " (for the printer): vector file generated by the app, CMYK colours, embedded fonts, TrimBox and BleedBox set. Imported images are converted to CMYK without an ICC profile.",
    "Le navigateur ouvre sa fen\xEAtre d\u2019impression : choisissez ": "The browser opens its print window: choose ",
    " comme destination, ": " as destination, ",
    ". Le PDF contient 2 pages (recto, verso) en vectoriel avec polices incorpor\xE9es, mais en RVB.": ". The PDF has 2 pages (front, back), vector, with embedded fonts, but in RGB.",
    /* PNG 3D */
    "Exporter en PNG": "Export as PNG",
    "PNG transparent": "Transparent PNG",
    /* frise : extrémités */
    "Extr\xE9mit\xE9s de la ligne": "Line ends",
    "Prolong\xE9es, en pointill\xE9s": "Extended, dashed",
    "Prolong\xE9es, en trait plein": "Extended, solid",
    "Aucune : la ligne commence au premier cercle": "None: the line starts at the first circle",
    "Avant le premier et apr\xE8s le dernier cercle, la ligne se prolonge (un tiers plein puis des tirets) ou non : \xAB Aucune \xBB fait commencer la ligne au premier cercle.": "Before the first and after the last circle the line extends (a third solid, then dashes) or not: \u201CNone\u201D makes the line start at the first circle.",
    /* alignement et interlignage */
    "Interlignage des textes": "Text line spacing",
    "Serr\xE9 (15 px)": "Tight (15 px)",
    "Normal (18 px)": "Normal (18 px)",
    "Large (21 px)": "Loose (21 px)",
    "Alignement vertical de la dataviz": "Dataviz vertical alignment",
    "En bas": "Bottom",
    "Quand le conteneur est plus haut que le contenu : le contenu se place en haut, au centre ou en bas.": "When the container is taller than the content: the content sits at the top, centre or bottom.",
    "Espace entre les lignes des libell\xE9s : serr\xE9, normal (18 px) ou large (21 px).": "Space between label lines: tight, normal (18 px) or loose (21 px).",
    /* filet entre sections */
    "Filet au-dessus de la section": "Rule above the section",
    "Trait de 0,5 pt sur toute la largeur de la page entre cette section et la pr\xE9c\xE9dente (sections sur fond blanc, ou deux bandes de couleur c\xF4te \xE0 c\xF4te).": "0.5 pt line across the full page width between this section and the previous one (sections on white, or two colour bands side by side).",
    /* hauteur : voisine, anneau */
    "Adapter \xE0 la colonne voisine": "Match the neighbouring column",
    "Position verticale de l\u2019anneau": "Ring vertical position",
    "Centr\xE9 sur le contenu": "Centred on the content",
    "La dataviz prend la hauteur de la colonne voisine la plus haute de sa rang\xE9e.": "The dataviz takes the height of the tallest neighbouring column in its row.",
    "Quand les textes autour de l\u2019anneau sont plus hauts que lui : l\u2019anneau se place en haut, centr\xE9 sur le contenu ou en bas ; les traits de rep\xE8re suivent.": "When the texts around the ring are taller than it: the ring sits at the top, centred on the content or at the bottom; the leader lines follow.",
    /* outil main */
    "Outil main (Espace ou H)": "Hand tool (Space or H)",
    /* poignée de hauteur */
    "Glisser : hauteur de la dataviz (se cale sur la colonne voisine) \xB7 double-clic : adapter \xE0 la colonne voisine": "Drag: dataviz height (snaps to the neighbouring column) \xB7 double-click: match the neighbouring column",
    "Hauteur de la dataviz": "Dataviz height",
    /* grille waffle */
    "Grille de pourcentage (waffle)": "Percentage grid (waffle)",
    "Logements endommag\xE9s ou d\xE9truits": "Housing damaged or destroyed",
    "Cases par ligne": "Cells per row",
    "Nombre de lignes": "Number of rows",
    "Valeur de la grille enti\xE8re (0 = somme des valeurs)": "Value of the whole grid (0 = sum of the values)",
    "Forme des cases": "Cell shape",
    "Carr\xE9e": "Square",
    "Arrondie": "Rounded",
    "Ronde": "Round",
    "Rep\xE8re sur les cases pleines": "Mark on filled cells",
    "Croix": "Cross",
    "Point": "Dot",
    "Coche": "Tick",
    "Couleur du rep\xE8re": "Mark colour",
    "Une ligne par cat\xE9gorie : les cases se remplissent dans cet ordre, ligne par ligne.": "One row per category: cells fill in this order, row by row.",
    /* colonnes et chiffre du waffle */
    "4 colonnes": "4 columns",
    "5 colonnes": "5 columns",
    "6 colonnes": "6 columns",
    "2 colonnes (3/4 + 1/4)": "2 columns (3/4 + 1/4)",
    "2 colonnes (1/4 + 3/4)": "2 columns (1/4 + 3/4)",
    "2 colonnes (3/5 + 2/5)": "2 columns (3/5 + 2/5)",
    "2 colonnes (2/5 + 3/5)": "2 columns (2/5 + 3/5)",
    "3 colonnes (1/2 + 1/4 + 1/4)": "3 columns (1/2 + 1/4 + 1/4)",
    "3 colonnes (1/4 + 1/2 + 1/4)": "3 columns (1/4 + 1/2 + 1/4)",
    "3 colonnes (1/4 + 1/4 + 1/2)": "3 columns (1/4 + 1/4 + 1/2)",
    "Chiffre \xE0 c\xF4t\xE9 de la grille": "Figure beside the grid",
    "Chiffre ({pct} = part de la 1re cat\xE9gorie)": "Figure ({pct} = share of the 1st category)",
    "Texte sous le chiffre (vide = libell\xE9 de la 1re cat\xE9gorie)": "Text under the figure (empty = label of the 1st category)",
    "Largeur de la grille (% de la dataviz)": "Grid width (% of the dataviz)",
    "Position verticale du chiffre": "Figure vertical position",
    /* chiffre à côté, repères du waffle */
    "Chiffre \xE0 c\xF4t\xE9": "Figure beside",
    "Chiffre ({pct} = part de la 1re donn\xE9e)": "Figure ({pct} = share of the 1st item)",
    "Texte sous le chiffre (vide = libell\xE9 de la 1re donn\xE9e)": "Text under the figure (empty = label of the 1st item)",
    "Largeur de la dataviz (% de la largeur)": "Dataviz width (% of the width)",
    "Autres logements": "Other housing",
    "Rep\xE8re": "Mark",
    "Ic\xF4ne \xB7 ": "Icon \xB7 ",
    "Une ligne par cat\xE9gorie : les cases se remplissent dans cet ordre, ligne par ligne ; une cat\xE9gorie blanche reste une case vide. Le rep\xE8re se choisit par cat\xE9gorie.": "One row per category: cells fill in this order, row by row; a white category stays an empty cell. The mark is chosen per category.",
    "Un chiffre cl\xE9 (par exemple 14 %) et son texte \xE0 c\xF4t\xE9 de la dataviz, qui prend alors la part de largeur choisie.": "A key figure (e.g. 14 %) and its text beside the dataviz, which then takes the chosen share of the width.",
    "Taille du chiffre": "Figure size",
    "Normal": "Normal",
    "Grand": "Large",
    "Tr\xE8s grand": "Extra large",
    "Largeur du contenu (% de la largeur)": "Content width (% of the width)",
    /* icônes importées */
    "Ic\xF4nes import\xE9es": "Imported icons",
    "Une fois import\xE9e, l\u2019ic\xF4ne est propos\xE9e dans le choix \xAB Ic\xF4ne \xBB de chaque \xE9l\xE9ment (onglet Donn\xE9es).": "Once imported, the icon is offered in each item\u2019s \u201CIcon\u201D choice (Data tab).",
    "Taille des ic\xF4nes et du texte": "Icon and text size",
    /* types de dataviz */
    "Barres (jumel\xE9es, group\xE9es, empil\xE9es)": "Bars (overlapping, grouped, stacked)",
    "Plusieurs s\xE9ries": "Multiple series",
    "Jumel\xE9es (2 s\xE9ries qui se chevauchent)": "Overlapping (2 series overlap)",
    "C\xF4te \xE0 c\xF4te": "Side by side",
    "Empil\xE9es": "Stacked",
    "Format du graphique": "Chart ratio",
    "2:1 (large)": "2:1 (wide)",
    "1:1 (carr\xE9)": "1:1 (square)",
    "Afficher la l\xE9gende": "Show legend",
    "Afficher les valeurs": "Show values",
    "Afficher les valeurs (empil\xE9es : total)": "Show values (stacked: total)",
    "D\xE9cimales des valeurs": "Value decimals",
    "Unit\xE9 apr\xE8s la valeur (%, M\u20AC\u2026)": "Unit after the value (%, M\u20AC\u2026)",
    "Afficher l\u2019accolade \xAB \xE9volution \xBB": "Show the \u201Cchange\u201D bracket",
    "Valeur de l\u2019accolade (ex. +64 %)": "Bracket value (e.g. +64 %)",
    "Texte de l\u2019accolade": "Bracket text",
    "Donn\xE9es": "Data",
    "Anneau / camembert": "Donut / pie",
    "Forme": "Shape",
    "Anneau (total au centre)": "Donut (total in the centre)",
    "Camembert": "Pie",
    "Texte du centre ({total} = somme des valeurs)": "Centre text ({total} = sum of the values)",
    "D\xE9cimales du total": "Total decimals",
    "Libell\xE9s": "Labels",
    "Auto (selon la largeur)": "Auto (depends on the width)",
    "Autour de l\u2019anneau": "Around the ring",
    "L\xE9gende sous l\u2019anneau": "Legend below the ring",
    "Orientation de l\u2019anneau": "Ring orientation",
    "Plus grand segment \xE0 un angle donn\xE9": "Largest segment at a given angle",
    "1er segment en haut": "1st segment at the top",
    "Manuelle (glisser l\u2019anneau dans l\u2019\xE9diteur)": "Manual (drag the ring in the editor)",
    "Angle du plus grand segment (\xB0 \u2014 0 = haut, 210 = bas gauche)": "Largest segment angle (\xB0 \u2014 0 = top, 210 = bottom left)",
    "Angle de d\xE9part du 1er segment (\xB0 \u2014 mode manuel)": "Start angle of the 1st segment (\xB0 \u2014 manual mode)",
    "Segments (sens horaire)": "Segments (clockwise)",
    "Couleur": "Colour",
    "Valeur": "Value",
    "Titre (gras)": "Title (bold)",
    "C\xF4t\xE9 du libell\xE9": "Label side",
    "Auto": "Auto",
    "Gauche": "Left",
    "Droite": "Right",
    "\u21BA Positions auto": "\u21BA Auto positions",
    "Efface les positions manuelles des libell\xE9s, points d\u2019ancrage et c\xF4t\xE9s": "Clears the manual positions of labels, anchor points and sides",
    "Plus grand en premier": "Largest first",
    "Fait tourner la liste pour que le plus grand segment soit le 1er": "Rotates the list so the largest segment comes first",
    "Titre": "Title",
    "Chiffre cl\xE9": "Key figure",
    "Chiffre (texte libre : \xAB 5 000 \xBB, \xAB 64 % \xBB\u2026)": "Figure (free text: \u201C5,000\u201D, \u201C64 %\u201D\u2026)",
    "Barres horizontales": "Horizontal bars",
    "Premier crit\xE8re": "First criterion",
    "Deuxi\xE8me crit\xE8re": "Second criterion",
    "Troisi\xE8me crit\xE8re": "Third criterion",
    "Quatri\xE8me crit\xE8re": "Fourth criterion",
    "Courbes": "Lines",
    "Axe vertical d\xE9marrant \xE0 z\xE9ro": "Vertical axis starts at zero",
    "Liste \xE0 ic\xF4nes": "Icon list",
    "\xC9l\xE9ments": "Items",
    "Ic\xF4ne": "Icon",
    "Nouvel \xE9l\xE9ment": "New item",
    "Premier \xE9l\xE9ment de liste": "First list item",
    "Deuxi\xE8me \xE9l\xE9ment de liste": "Second list item",
    "Troisi\xE8me \xE9l\xE9ment de liste": "Third list item",
    "Valid\xE9": "Checked",
    "Monde": "World",
    "Personnes": "People",
    "Euro": "Euro",
    "Graphique": "Chart",
    "S\xE9curit\xE9": "Security",
    "Environnement": "Environment",
    "\xC9nergie": "Energy",
    "Logement": "Housing",
    "Protection": "Protection",
    "Objectif": "Goal",
    "Calendrier": "Calendar",
    "Recherche": "Search",
    "Courrier": "Mail",
    "\xC9toile": "Star",
    "R\xE9glages": "Settings",
    "Envoi": "Send",
    "R\xE9daction": "Writing",
    /* menus, réglages, déplacements, alignements */
    "Fichier": "File",
    "Affichage": "View",
    "Version": "Version",
    "Derni\xE8res versions": "Latest versions",
    "Exporter mes donn\xE9es (JSON)": "Export my data (JSON)",
    "Atelier du Factsheet creator": "Factsheet creator Atelier",
    "Cette app est pr\xE9vue pour un \xE9cran d\u2019ordinateur": "This app is designed for a computer screen",
    "Fermer le bandeau": "Close the banner",
    "Alignement vertical dans la colonne": "Vertical alignment in the column",
    "Alignement du texte": "Text alignment",
    "Haut": "Top",
    "Centre": "Middle",
    "Bas": "Bottom",
    "Centr\xE9": "Centred",
    "Justifi\xE9": "Justified",
    "\xC9changer le contenu avec\u2026": "Swap content with\u2026",
    "D\xE9placer vers la section": "Move to section",
    "Annuler le d\xE9placement": "Undo move",
    "Contenu d\xE9plac\xE9. V\xE9rifiez le remplissage des pages.": "Content moved. Check how full the pages are.",
    "Glisser la sous-section (autre section possible)": "Drag the subsection (other sections allowed)",
    "Glisser le contenu sur une autre colonne pour l\u2019\xE9changer": "Drag the content onto another column to swap them",
    /* contours, images, chiffre clé, labo */
    "Contour": "Outline",
    "Couleur du contour": "Outline colour",
    "Fond blanc": "White background",
    "Taille de l\u2019image": "Image size",
    "Format fixe (recadr\xE9e)": "Fixed ratio (cropped)",
    "Ajust\xE9e au conteneur (proportions conserv\xE9es)": "Fit to container (keeps proportions)",
    "Taille personnalis\xE9e": "Custom size",
    "Largeur (% de la colonne)": "Width (% of the column)",
    "Hauteur (px)": "Height (px)",
    "Remplissage": "Fill",
    "Recadrer pour remplir": "Crop to fill",
    "Image enti\xE8re": "Whole image",
    "Position dans la colonne": "Position in the column",
    "Tous les r\xE9glages de la dataviz (type, donn\xE9es, couleurs, options) se font dans l\u2019\xE9diteur.": "All dataviz settings (type, data, colours, options) are in the editor.",
    "Ic\xF4ne devant le chiffre": "Icon before the figure",
    "Aucune": "None",
    "Style de l\u2019ic\xF4ne": "Icon style",
    "Pictogramme seul": "Icon only",
    "Dans une pastille": "In a circle",
    "Cartes": "Cards",
    "Options": "Options",
    "Position de l\u2019image": "Image position",
    "En haut": "Top",
    "\xC0 gauche": "Left",
    "\xC0 droite": "Right",
    "Alignement": "Alignment",
    "Ic\xF4ne choisie": "Chosen icon",
    "Image jusqu\u2019au bord du contour": "Image to the outline edge",
    "Ic\xF4ne dans une pastille": "Icon in a circle",
    "Ic\xF4ne \xE0 c\xF4t\xE9 du titre": "Icon next to the title",
    "\xC9tiquette": "Tag",
    "Chiffre": "Figure",
    "Puces": "Bullets",
    "Lien": "Link",
    "R\xE9initialiser la variante": "Reset the variant",
    "Largeur de colonne": "Column width",
    "Sur fond de section teint\xE9": "On a tinted section background",
    "actuelle": "current",
    "Pr\xE9c\xE9dente": "Previous",
    "Suivante": "Next",
    "Carte simple": "Simple card",
    "Titre et texte dans un contour : le minimum, point de d\xE9part.": "Title and text in an outline: the minimum, a starting point.",
    "Image en haut": "Image on top",
    "Image au-dessus, \xE9tiquette, titre, texte et lien ; l\u2019image reste dans les marges du contour.": "Image above, tag, title, text and link; the image stays inside the outline padding.",
    "Image jusqu\u2019au bord": "Image to the edge",
    "Comme B, mais l\u2019image touche le contour (coins hauts arrondis de 3 px).": "Like B, but the image touches the outline (top corners rounded to 3 px).",
    "Ic\xF4ne en t\xEAte": "Icon first",
    "Pastille d\u2019ic\xF4ne centr\xE9e au-dessus du titre, avec des puces.": "Icon circle centred above the title, with bullets.",
    "Image \xE0 c\xF4t\xE9": "Image beside",
    "Image \xE0 gauche (40 %), contenu \xE0 droite : pour les colonnes larges.": "Image on the left (40 %), content on the right: for wide columns.",
    "Carte statistique : ic\xF4ne \xE0 c\xF4t\xE9 du titre, grand chiffre, texte.": "Stat card: icon next to the title, big figure, text.",
    "Compl\xE8te": "Complete",
    "Toutes les options activ\xE9es ; d\xE9cochez ce que vous ne voulez pas garder.": "All options on; untick what you do not want to keep.",
    "Sans ic\xF4ne": "No icon",
    "Le chiffre cl\xE9 actuel : contour, fond blanc, chiffre et texte.": "The current key figure: outline, white background, figure and text.",
    "Pictogramme au trait \xE0 la hauteur du chiffre.": "Line icon at the height of the figure.",
    "Ic\xF4ne en pastille": "Icon in a circle",
    "M\xEAme ic\xF4ne dans une pastille ronde de 0,5 pt, comme dans la liste \xE0 ic\xF4nes.": "Same icon in a round 0.5 pt circle, as in the icon list.",
    "Centr\xE9, sans contour": "Centred, no outline",
    "Chiffre et ic\xF4ne centr\xE9s, pour une bande de plusieurs chiffres.": "Centred figure and icon, for a row of several figures.",
    /* cmjn */
    "CMJN": "CMYK",
    "J": "Y",
    "N": "K",
    /* suppression */
    "\xC9l\xE9ment supprim\xE9.": "Element deleted.",
    "Colonne supprim\xE9e : les autres s\u2019\xE9tendent.": "Column deleted: the others expand.",
    "Annuler la suppression": "Undo delete",
    "Supprimer (Suppr)": "Delete (Del)",
    "Supprimer la colonne": "Delete the column",
    /* couleurs, cartes */
    "Modifier la couleur": "Edit the colour",
    "R\xE9tablir la couleur du th\xE8me": "Reset to the theme colour",
    "Ajouter une couleur": "Add a colour",
    "Pipette": "Eyedropper",
    "Supprimer cette couleur ? Ce qui l\u2019utilise passera en bleu.": "Delete this colour? Anything using it will turn blue.",
    "Carte": "Card",
    "Options de la carte": "Card options",
    "Type de carte selon la largeur de la colonne": "Card type follows the column width",
    "Puces (une par ligne)": "Bullets (one per line)",
    "Image de la carte": "Card image",
    "NOUVEAU": "NEW",
    "Titre de la carte": "Card title",
    "Texte de la carte. Une ligne = un paragraphe, **gras** avec les ast\xE9risques.": "Card text. One line = one paragraph, **bold** with asterisks.",
    "Premier point": "First point",
    "Deuxi\xE8me point": "Second point",
    "Troisi\xE8me point": "Third point",
    "En savoir plus": "Read more",
    "retenue \u2014 colonnes moyennes": "chosen \u2014 medium columns",
    "retenue \u2014 colonnes \xE9troites": "chosen \u2014 narrow columns",
    "retenue \u2014 colonnes larges": "chosen \u2014 wide columns",
    /* atelier */
    "Connexion \xE0 GitHub": "GitHub connection",
    "Retirer le jeton": "Remove the token",
    "Enregistrer et tester": "Save and test",
    "Connect\xE9 : vous pouvez publier.": "Connected: you can publish.",
    "Jeton invalide ou expir\xE9.": "Invalid or expired token.",
    "Acc\xE8s refus\xE9 \xE0 ce d\xE9p\xF4t.": "Access to this repository denied.",
    "Ce jeton ne peut pas \xE9crire dans le d\xE9p\xF4t (permission \xAB Contents : lecture et \xE9criture \xBB requise).": "This token cannot write to the repository (\u201CContents: read and write\u201D permission required).",
    "acc\xE8s limit\xE9 au d\xE9p\xF4t": "access limited to the repository",
    "permission": "permission",
    "\xC0 publier": "To publish",
    "Toutes les images du document sont publi\xE9es.": "All the document images are published.",
    "Publier": "Publish",
    "image(s)": "image(s)",
    "Rien \xE0 publier": "Nothing to publish",
    "Images publi\xE9es": "Published images",
    "Aucune image publi\xE9e.": "No published images.",
    "Projets": "Projects",
    "Nom du projet": "Project name",
    "Publier le projet en cours": "Publish the current project",
    "Aucun projet publi\xE9.": "No published projects.",
    "Ouvrir dans l\u2019\xE9diteur": "Open in the editor",
    "Publication\u2026": "Publishing\u2026",
    "Publi\xE9": "Published",
    "Projet publi\xE9": "Project published",
    "D\xE9ploiement du site en cours\u2026": "Site deployment in progress\u2026",
    "\xC9chec": "Failed",
    "Image supprim\xE9e": "Image deleted",
    "Projet supprim\xE9": "Project deleted",
    "Supprimer ce projet ?": "Delete this project?",
    "Remplacer le projet en cours dans ce navigateur ?": "Replace the current project in this browser?",
    "Des images ne sont pas encore publi\xE9es.": "Some images are not published yet.",
    "Cette image est utilis\xE9e par le document en cours. La supprimer quand m\xEAme ?": "This image is used by the current document. Delete it anyway?",
    "Fichiers publi\xE9s, mais le site n\u2019est pas encore \xE0 jour. R\xE9essayez dans une minute pour finaliser.": "Files published, but the site is not up to date yet. Try again in a minute to finish.",
    "Limite de requ\xEAtes GitHub atteinte : ajoutez un jeton.": "GitHub request limit reached: add a token.",
    "Impossible de lire le d\xE9p\xF4t.": "Could not read the repository.",
    "Le jeton reste dans ce navigateur, il n\u2019est jamais export\xE9.": "The token stays in this browser and is never exported.",
    "Cr\xE9er un jeton :": "Create a token:",
    "D\xE9p\xF4t :": "Repository:",
    /* aperçu 3D */
    "Aper\xE7u 3D du document": "3D document preview",
    "Fermer": "Close",
    "Recto / verso": "Front / back",
    "Retourner": "Flip",
    "Deux pages": "Both pages",
    "Une feuille": "One sheet",
    "Recentrer": "Reset view",
    "Glisser : tourner la feuille \xB7 clic droit ou Maj : la d\xE9placer \xB7 molette : zoomer": "Drag: turn the sheet \xB7 right click or Shift: move it \xB7 wheel: zoom",
    "Pr\xE9paration de l\u2019aper\xE7u\u2026": "Preparing the preview\u2026",
    "Impossible de g\xE9n\xE9rer l\u2019aper\xE7u 3D dans ce navigateur.": "The 3D preview could not be generated in this browser.",
    "WebGL indisponible.": "WebGL unavailable."
  };
  var DICT = { en: EN };
  var PATTERNS = [
    [/^(Recto|Verso) : le contenu dépasse de (\d+) px — déplacez une section vers l’autre page ou raccourcissez-la\.$/, (_, p, n) => `${p === "Recto" ? "Front" : "Back"}: content overflows by ${n} px \u2014 move a section to the other page or shorten it.`],
    [/^Header : titre trop long, il ne tient pas dans la hauteur du header\.$/, () => "Header: title too long, it does not fit in the header height."],
    [/^Colonne (\d+)$/, (_, n) => `Column ${n}`],
    [/^Colonne actuelle \((\d+) px\)$/, (_, n) => `Current column (${n} px)`],
    [/^Série (\d+)$/, (_, n) => `Series ${n}`],
    [/^Chiffre clé · (.+)$/, (_, x) => `Key figure \xB7 ${x}`],
    [/^Teinte · (.+)$/, (_, x) => `Tint \xB7 ${tr(x)}`],
    [/^Carte · (.+)$/, (_, x) => `Card \xB7 ${x}`],
    [/^Dataviz · (.+)$/, (_, x) => `Dataviz \xB7 ${tr(x)}`],
    [/^(\d+) images? à publier — ouvrir l’Atelier$/, (_, n) => `${n} image${n === "1" ? "" : "s"} to publish \u2014 open the Atelier`],
    [/^Dépôt : (\S+) \(branche main\)\. Le jeton reste dans ce navigateur, il n’est jamais exporté\.$/, (_, r) => `Repository: ${r} (main branch). The token stays in this browser and is never exported.`],
    [/^Header — (.+)$/, (_, x) => `Header \u2014 ${x}`],
    [/^Logo — (.+)$/, (_, x) => `Logo \u2014 ${tr(x)}`],
    [/^Supprime /, (s2) => s2],
    [/^Image · (.+)$/, (_, x) => `Image \xB7 ${x}`]
  ];
  function tr(s2) {
    if (lang === "fr") return s2;
    const d = DICT[lang];
    if (!d) return s2;
    const core = s2.trim();
    if (!core) return s2;
    let out = d[core];
    if (out == null) for (const [re, fn] of PATTERNS) {
      const m2 = core.match(re);
      if (m2) {
        out = fn(...m2);
        break;
      }
    }
    if (out == null) return s2;
    return s2.slice(0, s2.indexOf(core)) + out + s2.slice(s2.indexOf(core) + core.length);
  }
  var t = (s2) => tr(s2);
  var ATTRS = ["placeholder", "title", "aria-label"];
  var SKIP = ".page, [contenteditable], textarea, input, script, style, .no-i18n";
  var seen = /* @__PURE__ */ new WeakMap();
  function fixValue(rec, cur) {
    return rec && rec.out === cur ? rec.src : cur;
  }
  function fixText(n) {
    const el2 = n.parentElement;
    if (!el2 || el2.closest(SKIP)) return;
    const src = fixValue(seen.get(n), n.nodeValue), out = lang === "fr" ? src : tr(src);
    seen.set(n, { src, out });
    if (out !== n.nodeValue) n.nodeValue = out;
  }
  function fixAttrs(el2) {
    if (el2.closest(SKIP) && el2.tagName !== "TEXTAREA" && el2.tagName !== "INPUT") return;
    if (el2.closest(".page, [contenteditable]")) return;
    let recs = seen.get(el2);
    if (!recs) seen.set(el2, recs = {});
    for (const a2 of ATTRS) {
      if (!el2.hasAttribute(a2)) continue;
      const src = fixValue(recs[a2], el2.getAttribute(a2)), out = lang === "fr" ? src : tr(src);
      recs[a2] = { src, out };
      if (out !== el2.getAttribute(a2)) el2.setAttribute(a2, out);
    }
  }
  function walk(root) {
    if (root.nodeType === 3) return fixText(root);
    if (root.nodeType !== 1 || root.closest && root.closest(".page, [contenteditable]") && !root.matches(".page")) return;
    if (root.matches && root.matches(".page, [contenteditable], script, style")) return;
    fixAttrs(root);
    for (const c2 of root.childNodes) walk(c2);
  }
  var observer = null;
  var pending = /* @__PURE__ */ new Set();
  var queued = false;
  function flush() {
    queued = false;
    const batch = pending;
    pending = /* @__PURE__ */ new Set();
    observer.disconnect();
    for (const n of batch) if (n.isConnected) walk(n);
    observe();
  }
  function observe() {
    observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }
  function initI18n(onChange) {
    document.documentElement.lang = lang;
    walk(document.body);
    observer = new MutationObserver((list) => {
      for (const m2 of list) {
        if (m2.type === "childList") m2.addedNodes.forEach((n) => pending.add(n));
        else pending.add(m2.type === "attributes" ? m2.target : m2.target);
      }
      if (!queued) {
        queued = true;
        queueMicrotask(flush);
      }
    });
    observe();
    return {
      set(l) {
        if (!LANGS[l] || l === lang) return;
        lang = l;
        try {
          localStorage.setItem(KEY, l);
        } catch (e) {
        }
        document.documentElement.lang = l;
        observer.disconnect();
        walk(document.body);
        observe();
        if (onChange) onChange(l);
      }
    };
  }

  // src/cardmodel.js
  var CARD_DEFAULTS = () => ({
    layout: "vertical",
    // vertical | left | right (position de l'image)
    image: false,
    bleed: false,
    // bleed : l'image va jusqu'au bord du contour
    icon: false,
    iconName: "globe",
    iconCircle: true,
    iconInline: false,
    tag: false,
    title: true,
    figure: false,
    text: true,
    bullets: false,
    link: false,
    stroke: true,
    fill: false,
    align: "left"
  });
  var SAMPLE = {
    tag: "NEW",
    title: "Digital Europe Programme",
    figure: "\u20AC7.5 billion",
    text: "Lorem ipsum dolor sit amet, **consectetuer** adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat.",
    bullets: "First key point\nSecond key point\nThird key point",
    link: "Read more"
  };
  function cardPresetFor(W) {
    if (W >= 450) return { layout: "left", image: true, bleed: false, icon: false, tag: false, link: true, bullets: false, figure: false, align: "left" };
    if (W >= 300) return { layout: "vertical", image: true, bleed: false, icon: false, tag: true, link: true, bullets: false, figure: false, align: "left" };
    return { layout: "vertical", image: false, bleed: false, icon: true, iconCircle: true, iconInline: false, tag: false, link: false, bullets: false, figure: false, align: "left" };
  }
  var newCard = (W = 336) => ({
    ...CARD_DEFAULTS(),
    ...cardPresetFor(W),
    auto: true,
    src: null,
    content: {
      tag: t("NOUVEAU"),
      title: t("Titre de la carte"),
      figure: "5 000",
      text: t("Texte de la carte. Une ligne = un paragraphe, **gras** avec les ast\xE9risques."),
      bullets: [t("Premier point"), t("Deuxi\xE8me point"), t("Troisi\xE8me point")].join("\n"),
      link: t("En savoir plus")
    }
  });
  var CARD_CHECKS = [
    ["image", "Image"],
    ["bleed", "Image jusqu\u2019au bord du contour"],
    ["icon", "Ic\xF4ne"],
    ["iconCircle", "Ic\xF4ne dans une pastille"],
    ["iconInline", "Ic\xF4ne \xE0 c\xF4t\xE9 du titre"],
    ["tag", "\xC9tiquette"],
    ["title", "Titre"],
    ["figure", "Chiffre"],
    ["text", "Texte"],
    ["bullets", "Puces"],
    ["link", "Lien"],
    ["stroke", "Contour"],
    ["fill", "Fond blanc"]
  ];

  // src/viz/util.js
  var NS = "http://www.w3.org/2000/svg";
  function s(tag, attrs = {}, ...kids) {
    const e = document.createElementNS(NS, tag);
    if (tag === "svg") e.setAttribute("fill", "currentColor");
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === "style" && typeof v === "object") Object.assign(e.style, v);
      else e.setAttribute(k, v);
    }
    for (const c2 of kids.flat()) if (c2 != null && c2 !== false) e.append(typeof c2 === "string" ? document.createTextNode(c2) : c2);
    return e;
  }
  function el(tag, props = {}, ...kids) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === "class") e.className = v;
      else if (k === "style" && typeof v === "object") Object.assign(e.style, v);
      else if (k in e) e[k] = v;
      else e.setAttribute(k, v);
    }
    for (const c2 of kids.flat()) if (c2 != null && c2 !== false) e.append(c2);
    return e;
  }
  var pxOf = (pt2) => pt2 * 96 / 72;
  var SW = STROKE.px;
  var colorRef = (c2) => /^(#|rgb|var\()/.test(c2 || "") ? c2 : `var(--c-${c2 || "blue"})`;
  var round3 = (n) => Math.round(n / 3) * 3;
  var mctx = document.createElement("canvas").getContext("2d");
  var REF = 200;
  function mw(text, weight, family, sizePx) {
    mctx.font = `${weight} ${REF}px ${family}`;
    return mctx.measureText(text).width * sizePx / REF;
  }
  var SANS = FONT.sans;
  var SERIF = FONT.serif;
  function fitSize(text, weight, family, size, maxW, minK = 0.6) {
    const w = mw(text, weight, family, size);
    return !w || w <= maxW ? size : Math.max(size * minK, size * maxW / w * 0.98);
  }
  function ellipsize(text, weight, family, size, maxW) {
    if (mw(text, weight, family, size) <= maxW + 0.5) return text;
    let t2 = String(text);
    while (t2.length > 1 && mw(t2 + "\u2026", weight, family, size) > maxW) t2 = t2.slice(0, -1);
    return t2 + "\u2026";
  }
  function fitText(text, weight, family, size, maxW, minK = 0.6) {
    const sz = fitSize(text, weight, family, size, maxW, minK);
    return { size: sz, text: ellipsize(text, weight, family, sz, maxW) };
  }
  function paragraphs(text) {
    const paras = [[]];
    let cur = [];
    const flush2 = () => {
      if (cur.length) {
        paras[paras.length - 1].push(cur);
        cur = [];
      }
    };
    let b = false, i = false, u2 = false;
    String(text || "").replace(/\r\n?/g, "\n").split(/(\*\*|__|~~)/).forEach((seg) => {
      if (seg === "**") {
        b = !b;
        return;
      }
      if (seg === "__") {
        u2 = !u2;
        return;
      }
      if (seg === "~~") {
        i = !i;
        return;
      }
      for (const part of seg.match(/\n|[^\S\n]+|\S+/g) || []) {
        if (part === "\n") {
          flush2();
          paras.push([]);
        } else if (/^\s+$/.test(part)) flush2();
        else cur.push({ t: part, b, i, u: u2 });
      }
    });
    flush2();
    return paras;
  }
  var runsW = (runs, size) => runs.reduce((a2, r) => a2 + mw(r.t, r.b ? 700 : 400, SANS, size), 0);
  function splitWord(runs, size, maxW) {
    const out = [];
    let cur = [], cw = 0;
    for (const r of runs) for (const ch of r.t) {
      const c2 = mw(ch, r.b ? 700 : 400, SANS, size);
      if (cur.length && cw + c2 > maxW) {
        out.push(cur);
        cur = [];
        cw = 0;
      }
      const l = cur[cur.length - 1];
      if (l && l.b === r.b && l.i === r.i && l.u === r.u) l.t += ch;
      else cur.push({ ...r, t: ch });
      cw += c2;
    }
    if (cur.length) out.push(cur);
    return out;
  }
  function textLines(title, text, size, maxW) {
    const out = [], sp = mw(" ", 400, SANS, size);
    const add = (src, head) => {
      for (const words of paragraphs(src)) {
        if (!words.length) continue;
        let cur = [], cw = 0;
        for (let w of words.flatMap((x) => maxW > 0 && runsW(x, size) > maxW ? splitWord(x, size, maxW) : [x])) {
          const w1 = runsW(w, size);
          if (!cur.length) {
            cur = [...w];
            cw = w1;
          } else if (cw + sp + w1 <= maxW) {
            cur.push({ t: " ", b: false }, ...w);
            cw += sp + w1;
          } else {
            out.push({ runs: cur, head });
            cur = [...w];
            cw = w1;
          }
        }
        out.push({ runs: cur, head });
      }
    };
    if (title && title.trim()) add("**" + title.replace(/\*\*|__|~~|\^\^|,,/g, "") + "**", true);
    if (text && text.trim()) add(text, false);
    return out;
  }
  function drawLines(lines, x, y0, lh, size, align = "start") {
    const g = s("g", { "font-size": size });
    lines.forEach((l, i) => {
      const t2 = s("text", { x, y: y0 + i * lh + lh / 2 + 0.33 * size, "text-anchor": align, style: { whiteSpace: "pre" } });
      for (const r of l.runs) t2.append(s("tspan", { "font-weight": r.b ? 700 : 400, "font-style": r.i ? "italic" : null, "text-decoration": r.u ? "underline" : null }, r.t));
      g.append(t2);
    });
    return g;
  }
  function fmt(v, locale, decimals) {
    const d = Math.max(0, Math.min(6, Math.round(+decimals || 0)));
    try {
      return new Intl.NumberFormat(locale || "en-GB", { minimumFractionDigits: d, maximumFractionDigits: d }).format(v);
    } catch (e) {
      return String(v);
    }
  }
  function drawLegend(svg, series, y, W = Infinity) {
    const base = pxOf(TYPE.caption.size), fixed = VIZ.legendSwatch + VIZ.barGap * 2, gap = VIZ.legendH * 1.2;
    const names = series.map((sr) => sr.name || "");
    const need = (size) => names.reduce((a2, t2) => a2 + fixed + mw(t2, TYPE.caption.weight, SANS, size), 0) + gap * Math.max(0, names.length - 1);
    let capPx = base;
    if (need(base) > W) capPx = Math.max(base * 0.7, base * (W - names.length * fixed - gap * (names.length - 1)) / (need(base) - names.length * fixed - gap * (names.length - 1)));
    const room = names.length ? Math.max(20, (W - gap * (names.length - 1)) / names.length - fixed) : 0;
    const g = s("g", { class: "lg", "data-y": y, "data-reserve": VIZ.legendH + VIZ.legendGap });
    let x = 0;
    series.forEach((sr, i) => {
      g.append(s("rect", { x: x + SW / 2, y: y + (VIZ.legendH - VIZ.legendSwatch) / 2 + SW / 2, width: VIZ.legendSwatch - SW, height: VIZ.legendSwatch - SW, rx: VIZ.barRadius, fill: colorRef(sr.color), stroke: "currentColor", "stroke-width": SW }));
      const lx = x + fixed, t2 = need(base) > W ? ellipsize(names[i], TYPE.caption.weight, SANS, capPx, room) : names[i];
      g.append(s("text", { x: lx, y: y + VIZ.legendH / 2 + 0.33 * capPx, "font-size": capPx, "font-weight": TYPE.caption.weight }, t2));
      x = lx + mw(t2, TYPE.caption.weight, SANS, capPx) + gap;
    });
    svg.append(g);
  }
  var numVal = (r, j) => Math.max(0, +(r.v || [])[j] || 0);
  var CYCLE = ["blue", "sky", "yellow", "slate", "grey"];
  var autoColor = (c2, i) => c2 || CYCLE[i % CYCLE.length];
  var lum = (hex) => {
    const n = parseInt(String(hex).replace("#", ""), 16);
    if (isNaN(n)) return 1;
    const f = (v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * f(n >> 16 & 255) + 0.7152 * f(n >> 8 & 255) + 0.0722 * f(n & 255);
  };
  function inkOn(env, key, alpha = 1) {
    const hex = key === "white" ? "#FFFFFF" : env && env.pal && env.pal[String(key).replace(/^tint-/, "")] || null;
    if (!hex) return "currentColor";
    const l = lum(hex), mixed = 1 - alpha + alpha * l;
    return mixed < 0.45 ? "#FFFFFF" : "currentColor";
  }
  function heightOf(o, W, env, auto, ratioDef = "16:9") {
    const mode = o.hmode || "ratio", ratio = VIZ.ratios[o.ratio || ratioDef] || 0.5625;
    const clamp2 = (v) => Math.max(o.hmin || 90, Math.min(o.hmax || 900, v));
    let H;
    if (mode === "auto" && auto != null) H = auto;
    else if (mode === "fixed") H = +o.hfixed || round3(W * ratio);
    else if ((mode === "fill" || mode === "match") && env && env.fillH) H = clamp2(env.fillH);
    else H = W * ratio;
    return Math.max(90, mode === "fill" || mode === "match" ? Math.floor(H / 3) * 3 : round3(H));
  }
  function layoutLegend(items, W) {
    const capPx = pxOf(TYPE.caption.size), fixed = VIZ.legendSwatch + VIZ.barGap * 2, gap = VIZ.legendH * 1.2, lines = [[]];
    let x = 0;
    for (const it of items) {
      const name = ellipsize(it.name || "", TYPE.caption.weight, SANS, capPx, Math.max(30, W - fixed)), w = fixed + mw(name, TYPE.caption.weight, SANS, capPx);
      if (x > 0 && x + w > W) {
        lines.push([]);
        x = 0;
      }
      lines[lines.length - 1].push({ color: it.color, name, x, w });
      x += w + gap;
    }
    return { lines, h: lines.length * VIZ.legendH + (lines.length - 1) * 3, capPx, fixed };
  }
  function drawLegendWrap(svg, L, y) {
    const g = s("g", { class: "lg", "data-y": y, "data-reserve": L.lines.length * (VIZ.legendH + 3) + VIZ.legendGap });
    L.lines.forEach((line, i) => line.forEach((e) => {
      const yy = y + i * (VIZ.legendH + 3);
      g.append(s("rect", { x: e.x + SW / 2, y: yy + (VIZ.legendH - VIZ.legendSwatch) / 2 + SW / 2, width: VIZ.legendSwatch - SW, height: VIZ.legendSwatch - SW, rx: VIZ.barRadius, fill: colorRef(e.color), stroke: "currentColor", "stroke-width": SW }));
      g.append(s("text", { x: e.x + L.fixed, y: yy + VIZ.legendH / 2 + 0.33 * L.capPx, "font-size": L.capPx, "font-weight": TYPE.caption.weight }, e.name));
    }));
    svg.append(g);
  }
  var FONT_SPECS = [
    '200 16px "Source Sans 3"',
    '400 16px "Source Sans 3"',
    '600 16px "Source Sans 3"',
    '700 16px "Source Sans 3"',
    'italic 400 16px "Source Sans 3"',
    'italic 700 16px "Source Sans 3"',
    '400 16px "Source Serif 4"',
    '600 16px "Source Serif 4"',
    '700 16px "Source Serif 4"'
  ];
  var fontsLoaded = null;
  var loadFonts = () => fontsLoaded || (fontsLoaded = document.fonts && document.fonts.load ? Promise.all(FONT_SPECS.map((f) => document.fonts.load(f, "Aa\xC9\xE9\u20AC0123 ").catch(() => {
  }))).then(() => document.fonts.ready) : Promise.resolve());
  function reorderHit(env, key, i, axis, x, y, w, h2) {
    if (!env || !env.ui) return null;
    return s("rect", { x, y, width: Math.max(1, w), height: Math.max(1, h2), fill: "rgba(0,0,0,0)", "data-reorder": `${key}:${i}`, "data-axis": axis, style: { cursor: "grab" } });
  }
  var inlineMk = (t2) => String(t2 ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/__(.+?)__/g, "<u>$1</u>").replace(/~~(.+?)~~/g, "<i>$1</i>").replace(/\^\^(.+?)\^\^/g, "<sup>$1</sup>").replace(/,,(.+?),,/g, "<sub>$1</sub>").replace(/\u2028/g, "<br>");
  var stripMk = (t2) => String(t2 ?? "").replace(/\u2028/g, " ").replace(/\*\*|__|~~|\^\^|,,/g, "");

  // src/viz/donut.js
  var BODY = pxOf(TYPE.body.size);
  var LEAD = { tight: 15, normal: 18, loose: 21 };
  var rad = (d) => d * Math.PI / 180;
  function resolveColumn(items, topLim, gap) {
    items.sort((a2, b) => a2.want - b.want);
    let prev = -1e9;
    for (const it of items) {
      it.top = Math.max(it.want, prev === -1e9 ? topLim : prev + gap, topLim);
      prev = it.top + it.h;
    }
  }
  function clearManual(o) {
    (o.segments || []).forEach((g) => {
      delete g.pin;
      delete g.anchorT;
      delete g.side;
    });
  }
  var norm = (a2) => (a2 % 360 + 360) % 360;
  var hasLabel = (g) => !!(String(g.title || "").trim() || String(g.text || "").trim());
  var ORANGE = "#F28C28";
  var donut_default = {
    label: "Anneau / camembert",
    icon: "chart-donut",
    family: "part",
    boxed: true,
    heights: ["auto", "fixed", "fill"],
    defaults: () => ({
      style: "donut",
      linkExtra: 24,
      linkColor: "blue",
      totalTpl: "\u20AC{total}\nbillion",
      decimals: 1,
      layout: "auto",
      orient: "largest",
      largestAngle: 210,
      startAngle: 0,
      segments: [
        { color: "grey", value: 114.4, title: "\u20AC114.4 billion", text: "provided from or guaranteed by the EU budget (including **\u20AC43.9 billion** within Ukraine Facility and **\u20AC16.9 billion** from Ukraine Support Loan)" },
        { color: "blue", value: 77.9, title: "\u20AC77.9 billion", text: "in military support from Member States" },
        { color: "slate", value: 17, title: "\u20AC17 billion", text: "in support for Ukrainian refugees in the EU" },
        { color: "yellow", value: 15.5, title: "\u20AC15.5 billion", text: "of grants, loans and guarantees provided by EU Member States for non-military support" },
        { color: "sky", value: 3.8, title: "\u20AC3.8 billion", text: "in proceeds from immobilised Russian assets" }
      ]
    }),
    fields: [
      { k: "style", t: "select", label: "Forme", options: { donut: "Anneau (total au centre)", pie: "Camembert" } },
      { k: "totalTpl", t: "ctext", label: "Texte du centre" },
      { k: "decimals", t: "number", label: "D\xE9cimales du total", min: 0, max: 4 },
      { k: "ringAlign", t: "select", label: "Position verticale de l\u2019anneau", options: { top: "En haut", center: "Centr\xE9 sur le contenu", bottom: "En bas" } },
      { k: "leading", t: "select", label: "Interlignage des textes", options: { tight: "Serr\xE9 (15 px)", normal: "Normal (18 px)", loose: "Large (21 px)" } },
      { k: "layout", t: "select", label: "Libell\xE9s", options: { auto: "Auto (selon la largeur)", around: "Autour de l\u2019anneau", legend: "L\xE9gende sous l\u2019anneau", none: "Aucun (anneau seul)" } },
      { k: "linkExtra", t: "number", label: "Trait de liaison : longueur au-del\xE0 de la colonne (px)", min: 0, max: 120 },
      { k: "linkColor", t: "color", label: "Trait de liaison : couleur", def: "blue" },
      { k: "orient", t: "select", label: "Orientation de l\u2019anneau", options: { largest: "Plus grand segment \xE0 un angle donn\xE9", first: "1er segment en haut", manual: "Manuelle (glisser l\u2019anneau dans l\u2019\xE9diteur)" } },
      { k: "largestAngle", t: "number", label: "Angle du plus grand segment (\xB0 \u2014 0 = haut, 210 = bas gauche)", min: 0, max: 359 },
      { k: "startAngle", t: "number", label: "Angle de d\xE9part du 1er segment (\xB0 \u2014 mode manuel)", min: 0, max: 359, step: "any" },
      {
        k: "segments",
        t: "list",
        label: "Segments (sens horaire)",
        min: 1,
        max: 10,
        item: () => ({ color: "sky", value: 10, title: t("Titre"), text: t("Texte") }),
        fields: [
          { k: "color", t: "color", label: "Couleur" },
          { k: "value", t: "number", label: "Valeur", min: 0, step: "any" },
          { k: "title", t: "text", label: "Titre (gras)" },
          { k: "text", t: "area", label: "Texte" },
          { k: "side", t: "select", label: "C\xF4t\xE9 du libell\xE9", options: { auto: "Auto", left: "Gauche", right: "Droite" } },
          { k: "link", t: "bool", label: "Trait de liaison vers l\u2019ext\xE9rieur (jusqu\u2019au bord de la colonne et au-del\xE0)" }
        ]
      }
    ],
    actions: [
      { label: "\u21BA Positions auto", title: "Efface les positions manuelles des libell\xE9s, points d\u2019ancrage et c\xF4t\xE9s", run(o) {
        clearManual(o);
      } },
      { label: "Plus grand en premier", title: "Fait tourner la liste pour que le plus grand segment soit le 1er", run(o) {
        const a2 = o.segments || [];
        let mi = 0;
        a2.forEach((g, i) => {
          if (+g.value > +a2[mi].value) mi = i;
        });
        o.segments = a2.slice(mi).concat(a2.slice(0, mi));
        clearManual(o);
      } }
    ],
    /* Interactions de l'éditeur : retourne un gestionnaire de glissement { move(pt), end() } (pt en px du SVG) */
    edit: {
      start(hit, o, meta, api, pt0) {
        const seg = (o.segments || [])[hit.i];
        if (!seg) return null;
        api.select(hit.i);
        const { cx, cy } = meta, ang = (pt2) => norm(Math.atan2(pt2.x - cx, -(pt2.y - cy)) * 180 / Math.PI);
        const dist = (pt2) => Math.hypot(pt2.x - pt0.x, pt2.y - pt0.y);
        let moved = false;
        if (hit.kind === "ring") {
          const a0 = ang(pt0);
          return { move(pt2) {
            if (!moved && dist(pt2) < 3) return;
            if (!moved) {
              moved = true;
              clearManual(o);
            }
            o.orient = "manual";
            o.startAngle = Math.round(norm(meta.start + ang(pt2) - a0) * 10) / 10;
            api.redraw();
          } };
        }
        if (hit.kind === "label") {
          const it = meta.items.find((x) => x.i === hit.i);
          if (!it) return null;
          const grab = pt0.y - it.top;
          return {
            move(pt2) {
              if (!moved && dist(pt2) < 3) return;
              if (!moved) {
                moved = true;
                api.ui.drag = "label";
              }
              seg.pin = Math.round(pt2.y - grab - cy);
              const want = pt2.x < cx ? "left" : "right", auto = it.autoSide < 0 ? "left" : "right";
              seg.side = want === auto ? "auto" : want;
              api.redraw();
            },
            end() {
              api.ui.drag = null;
              api.redraw();
            }
          };
        }
        if (hit.kind === "anchor") {
          const arc2 = meta.arcs.find((x) => x.i === hit.i), sw = arc2.a1 - arc2.a0;
          return { move(pt2) {
            if (!moved && dist(pt2) < 2) return;
            moved = true;
            const rel = norm(ang(pt2) - arc2.a0);
            let t2 = rel / sw;
            if (t2 > 1) t2 = rel - sw < 360 - rel ? 1 : 0;
            seg.anchorT = Math.round(Math.min(0.96, Math.max(0.04, t2)) * 1e3) / 1e3;
            api.redraw();
          } };
        }
        return null;
      }
    },
    render(o, W, env) {
      const LH = LEAD[o.leading] || LEAD.normal;
      const segs = (o.segments || []).filter((g) => +g.value > 0);
      const total = segs.reduce((a3, g) => a3 + +g.value, 0);
      const bare = o.layout === "none", around = !bare && (o.layout === "around" || o.layout !== "legend" && W >= VIZ.aroundMinW);
      if (!segs.length) return { node: s("svg", { width: W, height: 60 }) };
      const sweeps = segs.map((g) => g.value / total * 360);
      let mi = 0;
      sweeps.forEach((w, i) => {
        if (w > sweeps[mi] + 1e-9) mi = i;
      });
      let before = 0;
      for (let i = 0; i < mi; i++) before += sweeps[i];
      let a2 = o.orient === "manual" ? o.startAngle ?? 0 : o.orient === "first" ? 0 : (o.largestAngle ?? 210) - (before + sweeps[mi] / 2);
      const start = a2, ui = env.ui, sel = ui ? ui.sel : -1, idxOf = (g) => (o.segments || []).indexOf(g);
      const arcs = segs.map((g, i) => {
        const r = { g, a0: a2, a1: a2 + sweeps[i] };
        a2 += sweeps[i];
        return r;
      });
      const D = around ? Math.max(VIZ.ringMin, Math.min(VIZ.ringMax, round3(W * 0.3))) : bare ? Math.min(VIZ.ringMax, round3(W - 6)) : Math.min(VIZ.ringLegend, round3(W - 6));
      const pie = o.style === "pie";
      const Ro = D / 2 - SW, Ri = pie ? 0 : Ro * (1 - VIZ.ringPct);
      const sector = (cx2, cy2, p) => {
        const pt2 = (r, ang) => [cx2 + r * Math.sin(rad(ang)), cy2 - r * Math.cos(rad(ang))];
        if (p.a1 - p.a0 >= 359.99) return pie ? `M${cx2 + Ro},${cy2}A${Ro},${Ro} 0 1 1 ${cx2 - Ro},${cy2}A${Ro},${Ro} 0 1 1 ${cx2 + Ro},${cy2}Z` : `M${cx2 + Ro},${cy2}A${Ro},${Ro} 0 1 1 ${cx2 - Ro},${cy2}A${Ro},${Ro} 0 1 1 ${cx2 + Ro},${cy2}ZM${cx2 + Ri},${cy2}A${Ri},${Ri} 0 1 0 ${cx2 - Ri},${cy2}A${Ri},${Ri} 0 1 0 ${cx2 + Ri},${cy2}Z`;
        const [x0, y0] = pt2(Ro, p.a0), [x1, y1] = pt2(Ro, p.a1), [x2, y2] = pt2(Ri, p.a1), [x3, y3] = pt2(Ri, p.a0);
        const big = p.a1 - p.a0 > 180 ? 1 : 0;
        if (pie) return `M${cx2},${cy2}L${x0},${y0}A${Ro},${Ro} 0 ${big} 1 ${x1},${y1}Z`;
        return `M${x0},${y0}A${Ro},${Ro} 0 ${big} 1 ${x1},${y1}L${x2},${y2}A${Ri},${Ri} 0 ${big} 0 ${x3},${y3}Z`;
      };
      const centerNode = (cx2, cy2) => {
        if (pie) return s("g");
        const n = fmt(total, env.locale, o.decimals), BASE2 = pxOf(TYPE.figure.size);
        const LV = { 1: { k: 1, w: 700, f: SERIF, fam: "var(--t-figure-family)" }, 2: { k: 0.62, w: 700, f: SERIF, fam: "var(--t-figure-family)" }, 3: { k: 0, w: 400, f: SANS, fam: "inherit" } };
        const paras = String(o.totalTpl || "").replace(/\{total\}/g, n).split("\n").map((l) => {
          const m2 = l.match(/^(#{1,3}) ?(.*)$/);
          return { lv: m2 ? m2[1].length : 1, text: (m2 ? m2[2] : l).trim() };
        }).filter((p) => p.text);
        const sizeOf = (lv, k2) => (lv === 3 ? BODY : BASE2 * LV[lv].k) * k2;
        const wrap = (text, lv, z, maxW) => {
          const out = [];
          let cur = "";
          const put = (w) => {
            const t2 = cur ? cur + " " + w : w;
            if (!cur || mw(t2, LV[lv].w, LV[lv].f, z) <= maxW) {
              cur = t2;
              return;
            }
            out.push(cur);
            cur = w;
          };
          for (const word of text.split(/ +/)) {
            if (mw(word, LV[lv].w, LV[lv].f, z) <= maxW) {
              put(word);
              continue;
            }
            let part = "";
            for (const ch of word) {
              if (part && mw(part + ch, LV[lv].w, LV[lv].f, z) > maxW) {
                put(part);
                out.push(cur);
                cur = "";
                part = "";
              }
              part += ch;
            }
            if (part) put(part);
          }
          if (cur) out.push(cur);
          return out;
        };
        const chord = (y) => 2 * Math.sqrt(Math.max(0, (Ri * 0.9) ** 2 - y * y));
        const maxC = 2 * Ri * 0.8;
        let k = 1, lines = [], tot = 0;
        for (let i = 0; i < 70; i++) {
          lines = paras.flatMap((p) => {
            const z = sizeOf(p.lv, k);
            return wrap(p.text, p.lv, z, maxC).map((text) => ({ text, lv: p.lv, z }));
          });
          let y = 0;
          lines.forEach((l) => {
            l.h = l.z * (l.lv === 3 ? 1.25 : 1.05);
            l.y0 = y;
            y += l.h;
          });
          tot = y;
          const ok = lines.every((l) => {
            const a3 = l.y0 - tot / 2, b2 = a3 + l.h;
            return mw(l.text, LV[l.lv].w, LV[l.lv].f, l.z) <= chord(Math.max(Math.abs(a3), Math.abs(b2)));
          });
          if (ok || k < 0.25) break;
          k *= 0.94;
        }
        const g = s("g", { "text-anchor": "middle" });
        lines.forEach((l) => g.append(s("text", { x: cx2, y: cy2 - tot / 2 + l.y0 + l.h / 2 + 0.33 * l.z, "font-size": l.z, "font-weight": LV[l.lv].w, style: { fontFamily: LV[l.lv].fam } }, l.text)));
        return g;
      };
      const ringNodes = (cx2, cy2) => {
        const out = arcs.map((p) => s("path", { d: sector(cx2, cy2, p), fill: colorRef(p.g.color), stroke: "currentColor", "stroke-width": SW, "stroke-linejoin": "round", "data-hit": ui ? `ring:${idxOf(p.g)}` : null, style: ui ? { cursor: "grab" } : null }));
        if (ui) arcs.forEach((p) => {
          if (idxOf(p.g) === sel) out.push(s("path", { d: sector(cx2, cy2, p), fill: "none", stroke: ORANGE, "stroke-width": 2, "stroke-linejoin": "round", "pointer-events": "none" }));
        });
        return out;
      };
      const linkNodes = (cx2, cy2) => arcs.filter((p) => p.g.link).map((p) => {
        const th = p.g.anchorT != null ? p.a0 + (p.a1 - p.a0) * p.g.anchorT : (p.a0 + p.a1) / 2, dir = Math.sin(rad(th)) >= 0 ? 1 : -1;
        const x = cx2 + Ro * Math.sin(rad(th)), y = cy2 - Ro * Math.cos(rad(th)), x2 = dir > 0 ? W + (+o.linkExtra || 0) : -(+o.linkExtra || 0);
        return s("path", { d: `M${x},${y}H${x2}`, fill: "none", stroke: colorRef(o.linkColor || "blue"), "stroke-width": SW, "stroke-linecap": "round" });
      });
      const metaBase = { start, arcs: arcs.map((p) => ({ i: idxOf(p.g), a0: p.a0, a1: p.a1 })), Ro, Ri, W };
      if (!around) {
        const cx2 = W / 2, cy2 = Ro + SW, svg2 = s("svg", { width: W, height: 10, style: { display: "block", overflow: "visible" } });
        svg2.append(...ringNodes(cx2, cy2), centerNode(cx2, cy2), ...linkNodes(cx2, cy2));
        let y = cy2 + Ro + GAP.subsectionTitle * 2;
        const sw = VIZ.legendSwatch, tx = sw + VIZ.iconGap;
        for (const p of bare ? [] : arcs.filter((q) => hasLabel(q.g))) {
          const lines = textLines(p.g.title, p.g.text, BODY, W - tx);
          svg2.append(s("rect", { x: SW / 2, y: y + (LH - sw) / 2 + SW / 2, width: sw - SW, height: sw - SW, rx: VIZ.barRadius, fill: colorRef(p.g.color), stroke: "currentColor", "stroke-width": SW }));
          svg2.append(drawLines(lines, tx, y, LH, BODY));
          y += lines.length * LH + VIZ.blockGap;
        }
        const H2 = bare || !arcs.some((q) => hasLabel(q.g)) ? Math.ceil(cy2 + Ro + SW) : Math.ceil(y - VIZ.blockGap);
        svg2.setAttribute("height", H2);
        svg2.setAttribute("viewBox", `0 0 ${W} ${H2}`);
        return { node: svg2, meta: { ...metaBase, cx: cx2, cy: cy2, H: H2, around: false, items: [] } };
      }
      const room = (W - D) / 2, labelW = Math.max(60, Math.min(room - VIZ.leaderRoom, 264));
      const cx = W / 2;
      const items = arcs.filter((p) => hasLabel(p.g)).map((p) => {
        const mid = norm((p.a0 + p.a1) / 2);
        const autoSide = mid < 180 ? 1 : -1;
        const side = p.g.side === "left" ? -1 : p.g.side === "right" ? 1 : autoSide;
        const th = p.g.anchorT != null ? p.a0 + (p.a1 - p.a0) * p.g.anchorT : mid;
        const lines = textLines(p.g.title, p.g.text, BODY, labelW);
        return { p, mid, th, autoSide, side, lines, h: lines.length * LH, first: 0 };
      });
      items.forEach((it) => {
        const r0 = it.lines[0];
        it.first = r0 ? r0.runs.reduce((q, r) => q + mw(r.t, r.b ? 700 : 400, '"Source Sans 3", sans-serif', BODY), 0) : 0;
      });
      const place3 = (cy2) => {
        for (const it of items) {
          const th = it.th, P = { x: cx + Ro * Math.sin(rad(th)), y: cy2 - Ro * Math.cos(rad(th)) };
          it.P = P;
          it.want = it.p.g.pin != null ? cy2 + it.p.g.pin : P.y - LH / 2;
        }
        for (const side of [1, -1]) resolveColumn(items.filter((i) => i.side === side), 0, VIZ.blockGap);
        return Math.max(2 * Ro + 2 * SW, ...items.map((i) => i.top + i.h));
      };
      let cy = Ro + SW;
      let H = place3(cy);
      const cy0 = cy, ra = o.ringAlign || "top";
      if (ra === "center") cy = Math.max(cy0, H / 2);
      else if (ra === "bottom") cy = Math.max(cy0, H - Ro - SW);
      if (cy !== cy0) for (const it of items) it.P.y = cy - Ro * Math.cos(rad(it.th));
      H = Math.ceil(Math.max(H, cy + Ro + SW));
      const svg = s("svg", { width: W, height: H, viewBox: `0 0 ${W} ${H}`, style: { display: "block", overflow: "visible" } });
      if (ui && ui.drag === "label") for (const sd of [-1, 1]) svg.append(s("rect", { x: sd > 0 ? W - labelW : 0, y: 0, width: labelW, height: H, fill: ORANGE, "fill-opacity": 0.08, stroke: ORANGE, "stroke-dasharray": "4 3", "stroke-width": 1, "pointer-events": "none" }));
      svg.append(...ringNodes(cx, cy), centerNode(cx, cy), ...linkNodes(cx, cy));
      for (const it of items) {
        const right2 = it.side > 0, x = right2 ? W - labelW : 0, ly = it.top + LH / 2;
        const E = { x: right2 ? x - VIZ.leaderGap : x + it.first + VIZ.leaderGap, y: ly };
        const dy = ly - it.P.y;
        let dx = Math.abs(dy);
        const roomX = Math.abs(E.x - it.P.x) - 3;
        if (dx > roomX) dx = Math.max(0, roomX);
        const K = Math.abs(dy) < 0.05 ? null : { x: it.P.x + it.side * dx, y: it.P.y + Math.sign(dy) * dx };
        svg.append(s("path", { d: `M${it.P.x},${it.P.y}${K ? `L${K.x},${K.y}` : ""}L${E.x},${E.y}`, fill: "none", stroke: "currentColor", "stroke-width": SW, "stroke-linejoin": "round" }));
        svg.append(drawLines(it.lines, x, it.top, LH, BODY));
        it.x = x;
      }
      if (ui) {
        for (const it of items) {
          const i = idxOf(it.p.g), on = i === sel;
          svg.append(s("rect", { x: it.x - 3, y: it.top - 2, width: labelW + 6, height: it.h + 4, rx: 3, fill: "transparent", stroke: on ? ORANGE : "none", "stroke-dasharray": "4 3", "stroke-width": 1, "data-hit": `label:${i}`, style: { cursor: "ns-resize" } }));
        }
        const si = items.find((it) => idxOf(it.p.g) === sel);
        if (si) svg.append(s("circle", { cx: si.P.x, cy: si.P.y, r: 6, fill: "#fff", stroke: ORANGE, "stroke-width": 2, "data-hit": `anchor:${sel}`, style: { cursor: "grab" } }));
      }
      return { node: svg, meta: { ...metaBase, cx, cy, H, around: true, labelW, items: items.map((it) => ({ i: idxOf(it.p.g), top: it.top, h: it.h, x: it.x, P: it.P, autoSide: it.autoSide })) } };
    }
  };

  // src/viz/icons.js
  var ICONS = {
    check: { label: "Valid\xE9", d: "M5 12.5l4.5 4.5L19 7.5" },
    globe: { label: "Monde", d: "M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18z M12 3c-3 2.5-4 5.5-4 9s1 6.5 4 9c3-2.5 4-5.5 4-9s-1-6.5-4-9z M3 12h18" },
    people: { label: "Personnes", d: "M9 5a3 3 0 1 0 0 6a3 3 0 1 0 0-6z M3.5 19c0-3.2 2.5-5.5 5.5-5.5s5.5 2.3 5.5 5.5 M17 6.5a2.4 2.4 0 1 0 0 4.8a2.4 2.4 0 1 0 0-4.8z M16.2 13.8c2.6 0 4.3 1.9 4.3 4.7" },
    euro: { label: "Euro", d: "M17.5 6.5a7 7 0 1 0 0 11 M4 10h9 M4 14h9" },
    document: { label: "Document", d: "M7 3h7l4 4v14H7z M14 3v4h4 M9.5 12h6 M9.5 15.5h6" },
    chart: { label: "Graphique", d: "M4 20V4 M4 20h16 M8 16v-5 M12 16V8 M16 16v-3" },
    lock: { label: "S\xE9curit\xE9", d: "M6 11h12v9H6z M8.5 11V8a3.5 3.5 0 0 1 7 0v3" },
    leaf: { label: "Environnement", d: "M5 19c0-8 5-14 14-14 0 9-6 14-14 14z M5 19c3-4 6-7 10-9" },
    bolt: { label: "\xC9nergie", d: "M13 3L6 13h5l-1 8 7-10h-5z" },
    home: { label: "Logement", d: "M4 11l8-7 8 7 M6 10v10h12V10 M10 20v-5h4v5" },
    shield: { label: "Protection", d: "M12 3l7 3v5.5c0 4.5-3 7.5-7 9.5-4-2-7-5-7-9.5V6z" },
    flag: { label: "Objectif", d: "M6 21V4 M6 5h11l-2 4 2 4H6" },
    calendar: { label: "Calendrier", d: "M4 6h16v14H4z M4 10h16 M8 3v4 M16 3v4" },
    search: { label: "Recherche", d: "M11 5a6 6 0 1 0 0 12a6 6 0 1 0 0-12z M15.5 15.5L20 20" },
    mail: { label: "Courrier", d: "M3 5h18v14H3z M3.5 6.5l8.5 7 8.5-7" },
    star: { label: "\xC9toile", d: "M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.9l-5.2 2.8 1-5.9L3.5 9.7l5.9-.8z" },
    sliders: { label: "R\xE9glages", d: "M4 7h10 M18 7h2 M16 5a2 2 0 1 0 0 4a2 2 0 1 0 0-4z M4 17h2 M10 17h10 M8 15a2 2 0 1 0 0 4a2 2 0 1 0 0-4z" },
    send: { label: "Envoi", d: "M21 3L3 10.5l7 3 3 7z M10 13.5L21 3" },
    alert: { label: "Alerte", d: "M12 4L3 19.5h18z M12 10v4.5 M12 17.2v.1" },
    pencil: { label: "R\xE9daction", d: "M4 20l1-4L16 5l3 3L8 19z M14 7l3 3" }
  };
  var ICON_OPTIONS = Object.fromEntries(Object.entries(ICONS).map(([k, v]) => [k, v.label]));
  var iconLib = { list: [] };
  var customList = (o) => {
    const a2 = [...iconLib.list];
    (o && o.customIcons || []).forEach((c2) => {
      if (!a2.some((x) => x.id === c2.id)) a2.push(c2);
    });
    return a2;
  };
  var customChoices = (o) => Object.fromEntries(customList(o).map((c2) => [`custom:${c2.id}`, `${t("Import\xE9")} \xB7 ${c2.name}`]));

  // src/colorselect.js
  var FALLBACK = cssVars(DEFAULT_THEME, {});
  var dot = (k) => h("i", { class: "cs-dot" + (k === "" ? " auto" : ""), style: k === "" ? {} : { background: `var(--c-${k}, ${FALLBACK["--c-" + k] || "transparent"})` } });
  var open = null;
  var close = () => {
    if (!open) return;
    const o = open;
    open = null;
    document.removeEventListener("pointerdown", o.away, true);
    document.removeEventListener("keydown", o.key, true);
    o.pop.remove();
    o.btn.setAttribute("aria-expanded", "false");
  };
  function richSelect({ value: value2, options, onChange, text = false, lead, footer }) {
    let cur = value2;
    const label = (k) => k === "" ? t("Auto") : t(options[k] ?? k);
    const btn = h("button", { type: "button", class: "cs" + (text ? " cs-text" : ""), "aria-haspopup": "listbox", "aria-expanded": "false", title: label(cur) });
    const paint = () => {
      btn.replaceChildren(...[lead(cur), text ? h("span", { class: "cs-lab", textContent: label(cur) }) : null, ico("chevron-down")].filter(Boolean));
      btn.title = label(cur);
    };
    paint();
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (open && open.btn === btn) {
        close();
        return;
      }
      close();
      const pop2 = h("div", { class: "cs-pop", role: "listbox" }, Object.keys(options).map((k) => h("button", {
        type: "button",
        role: "option",
        class: "cs-opt" + (k === cur ? " on" : ""),
        "aria-selected": String(k === cur),
        onclick: () => {
          cur = k;
          paint();
          close();
          onChange(k);
        }
      }, lead(k), h("span", { textContent: label(k) }))));
      if (footer) pop2.append(footer({ close, pick: (k) => {
        cur = k;
        paint();
        close();
        onChange(k);
      } }));
      (btn.closest(".ve, .props, .panel, .labo-opts") || document.body).append(pop2);
      const r = btn.getBoundingClientRect(), w = Math.min(320, Math.max(300, r.width)), hh = pop2.offsetHeight;
      Object.assign(pop2.style, { width: w + "px", left: Math.max(8, Math.min(window.innerWidth - w - 8, r.left)) + "px", top: (r.bottom + hh + 12 > window.innerHeight ? Math.max(8, r.top - hh - 4) : r.bottom + 4) + "px" });
      btn.setAttribute("aria-expanded", "true");
      const away = (ev) => {
        if (!pop2.contains(ev.target) && !btn.contains(ev.target)) close();
      }, key = (ev) => {
        if (ev.key === "Escape") {
          ev.stopPropagation();
          close();
        }
      };
      document.addEventListener("pointerdown", away, true);
      document.addEventListener("keydown", key, true);
      open = { pop: pop2, btn, away, key };
    });
    return btn;
  }
  var colorSelect = (o) => richSelect({ ...o, lead: dot });

  // src/iconselect.js
  function iconGlyph(key, root, size = 20) {
    const svg = s("svg", { width: size, height: size, viewBox: "0 0 24 24", class: "cs-glyph", "aria-hidden": "true" });
    const stroke = (d) => s("path", { d, fill: "none", stroke: "currentColor", "stroke-width": 1.7, "stroke-linecap": "round", "stroke-linejoin": "round" });
    const k = String(key ?? "");
    if (k === "none" || k === "") {
      svg.append(s("circle", { cx: 12, cy: 12, r: 8, fill: "none", stroke: "currentColor", "stroke-width": 1.5, opacity: 0.45 }), s("path", { d: "M6.5 17.5l11-11", stroke: "currentColor", "stroke-width": 1.5, opacity: 0.45 }));
    } else if (k === "cross") svg.append(stroke("M6 6l12 12M18 6L6 18"));
    else if (k === "dot") svg.append(s("circle", { cx: 12, cy: 12, r: 4.5, fill: "currentColor" }));
    else if (k === "check") svg.append(stroke("M5 12.5l4.5 4.5L19 7.5"));
    else if (k.startsWith("picto:")) {
      const p = PICTOS[k.slice(6)];
      if (p) svg.append(s("path", { d: p.d, fill: "currentColor" }));
    } else if (k.startsWith("custom:")) svg.append(iconNode(root || {}, k, 0, 0, 24, 24, "text"));
    else {
      const ic = ICONS[k.startsWith("icon:") ? k.slice(5) : k];
      if (ic) svg.append(stroke(ic.d));
    }
    return svg;
  }
  function iconSelect({ root, refresh, ...o }) {
    const footer = ({ close: close3, pick }) => {
      const inp = el("input", { type: "file", accept: ".svg,image/svg+xml", hidden: true, onchange: async () => {
        const f = inp.files[0];
        inp.value = "";
        if (!f) return;
        const c2 = await importSvgFile(f);
        if (!c2) return;
        o.options["custom:" + c2.id] = `${t("Import\xE9")} \xB7 ${c2.name}`;
        pick("custom:" + c2.id);
        if (refresh) refresh();
      } });
      return el("div", { class: "cs-foot" }, el("button", { type: "button", class: "cs-opt", onclick: () => inp.click() }, el("i", { class: "ti ti-upload" }), el("span", { textContent: t("Importer un SVG\u2026") })), inp);
    };
    return richSelect({ ...o, footer, lead: (k) => iconGlyph(k, root) });
  }

  // src/viz/picto.js
  var PICTOS = {
    person: { label: "Personne", vb: [0, 0, 24, 24], d: "M12 2.5a4 4 0 1 0 0 8a4 4 0 1 0 0-8zM4.5 22v-5a7.5 7.5 0 0 1 15 0v5z" },
    circle: { label: "Rond", vb: [0, 0, 24, 24], d: "M12 2a10 10 0 1 0 0 20a10 10 0 1 0 0-20z" },
    square: { label: "Carr\xE9", vb: [0, 0, 24, 24], d: "M3 3h18v18H3z" },
    heart: { label: "C\u0153ur", vb: [0, 0, 24, 24], d: "M12 21C5 15.5 2 12 2 8.2A5.2 5.2 0 0 1 12 6a5.2 5.2 0 0 1 10 2.2C22 12 19 15.5 12 21z" },
    house: { label: "Maison", vb: [0, 0, 24, 24], d: "M12 2.5L2 11.5h3V21h5.5v-6h3v6H19v-9.5h3z" },
    star: { label: "\xC9toile", vb: [0, 0, 24, 24], d: "M12 2l3 6.6 7.2.8-5.4 4.8 1.6 7.1L12 17.6 5.6 21.3l1.6-7.1L1.8 9.4 9 8.6z" }
  };
  var pictoChoices = (o) => ({
    ...Object.fromEntries(Object.entries(PICTOS).map(([k, v]) => [`picto:${k}`, t(v.label)])),
    ...customChoices(o),
    ...Object.fromEntries(Object.entries(ICONS).map(([k, v]) => [`icon:${k}`, `${t("Trait")} \xB7 ${t(v.label)}`]))
  });
  function sanitizeSvg(text, name = "icon") {
    if (text.length > 4e5) throw new Error("trop lourd");
    const doc2 = new DOMParser().parseFromString(text, "image/svg+xml"), svg = doc2.documentElement;
    if (!svg || svg.nodeName.toLowerCase() !== "svg" || doc2.querySelector("parsererror")) throw new Error("svg illisible");
    doc2.querySelectorAll("script,foreignObject,iframe,object,embed,animate,animateTransform,animateMotion,set,image,audio,video").forEach((n) => n.remove());
    doc2.querySelectorAll("style").forEach((n) => {
      if (/@import|url\((?!\s*['"]?#)/i.test(n.textContent)) n.remove();
    });
    doc2.querySelectorAll("*").forEach((n) => [...n.attributes].forEach((a2) => {
      const ln = a2.name.toLowerCase();
      if (ln.startsWith("on")) n.removeAttribute(a2.name);
      else if ((ln === "href" || ln.endsWith(":href")) && !a2.value.startsWith("#")) n.removeAttribute(a2.name);
      else if (/url\((?!\s*['"]?#)/i.test(a2.value) || /javascript:/i.test(a2.value)) n.removeAttribute(a2.name);
    }));
    let vb = (svg.getAttribute("viewBox") || "").split(/[\s,]+/).map(Number);
    if (vb.length !== 4 || vb.some(isNaN)) {
      const w = parseFloat(svg.getAttribute("width")), h2 = parseFloat(svg.getAttribute("height"));
      vb = [0, 0, w || 24, h2 || 24];
    }
    const inner = [...svg.childNodes].map((n) => new XMLSerializer().serializeToString(n)).join("").replace(/ xmlns(:\w+)?="[^"]*"/g, "");
    return { id: "c" + Math.random().toString(36).slice(2, 8), name: name.replace(/\.svg$/i, "").slice(0, 40), vb, markup: inner };
  }
  function iconNode(o, key, x, y, w, h2, color) {
    const [kind, id] = String(key || "picto:person").split(":");
    let vb = [0, 0, 24, 24], inner = null;
    const col = colorRef(color);
    const svg = s("svg", { x, y, width: w, height: h2, viewBox: "0 0 24 24", preserveAspectRatio: "xMidYMid meet", style: { overflow: "hidden" } });
    if (kind === "icon") svg.append(s("path", { d: (ICONS[id] || ICONS.check).d, fill: "none", stroke: col, "stroke-width": 1.6, "stroke-linecap": "round", "stroke-linejoin": "round" }));
    else if (kind === "custom") {
      const c2 = customList(o).find((k) => k.id === id);
      if (c2) {
        svg.setAttribute("viewBox", c2.vb.join(" "));
        svg.setAttribute("fill", col);
        const tmp = new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg">${c2.markup}</svg>`, "image/svg+xml").documentElement;
        if (o.recolor !== false) tmp.querySelectorAll("*").forEach((n) => {
          const f = n.getAttribute("fill"), st = n.getAttribute("stroke");
          if (f && f !== "none") n.removeAttribute("fill");
          if (st && st !== "none") n.setAttribute("stroke", col);
          n.removeAttribute("style");
        });
        [...tmp.childNodes].forEach((n) => svg.append(document.importNode(n, true)));
      }
    } else {
      const p = PICTOS[id] || PICTOS.person;
      svg.append(s("path", { d: p.d, fill: col }));
    }
    return svg;
  }
  var clipN = 0;
  function partial(o, key, x, y, w, h2, color, frac, dir) {
    frac = Math.max(0, Math.min(1, frac));
    const g = s("g");
    g.append(s("g", { opacity: 0.22 }, iconNode(o, key, x, y, w, h2, color)));
    if (frac <= 0) return g;
    if (frac >= 1) {
      g.append(iconNode(o, key, x, y, w, h2, color));
      return g;
    }
    const id = "pc" + ++clipN;
    const r = dir === "v" ? { x, y: y + h2 * (1 - frac), width: w, height: h2 * frac } : { x, y, width: w * frac, height: h2 };
    g.append(s("clipPath", { id }, s("rect", r)), s("g", { "clip-path": `url(#${id})` }, iconNode(o, key, x, y, w, h2, color)));
    return g;
  }
  async function importSvgFile(file2) {
    try {
      const c2 = sanitizeSvg(await file2.text(), file2.name);
      iconLib.list.push(c2);
      return c2;
    } catch (e) {
      alert(t("SVG illisible ou trop lourd."));
      return null;
    }
  }
  function importParts(o, ctx2, hint) {
    const ico2 = (n) => el("i", { class: "ti ti-" + n });
    const inp = el("input", { type: "file", accept: ".svg,image/svg+xml", hidden: true, onchange: async () => {
      const f = inp.files[0];
      inp.value = "";
      if (f && await importSvgFile(f)) ctx2.restructure();
    } });
    return [
      el("button", { type: "button", class: "pp-btn", onclick: () => inp.click() }, ico2("upload"), el("span", { textContent: t("Importer un SVG\u2026") })),
      inp,
      el("label", { class: "row" }, el("input", { type: "checkbox", checked: o.recolor !== false, onchange: (e) => {
        o.recolor = e.target.checked;
        ctx2.changed();
      } }), t("Recolorer le SVG import\xE9 avec la couleur choisie")),
      hint ? el("p", { class: "hint", textContent: t(hint) }) : null
    ].filter(Boolean);
  }
  function pictoPanel(o, ctx2) {
    const sel = iconSelect({ value: o.icon || "picto:person", options: pictoChoices(o), text: true, root: o, refresh: () => ctx2.restructure(), onChange: (v) => {
      o.icon = v;
      ctx2.changed();
    } });
    return [el("div", { class: "f" }, el("div", { class: "hint", textContent: t("Pictogramme") }), sel), ...importParts(o, ctx2)];
  }
  function iconImportPanel(o, ctx2) {
    return importParts(o, ctx2);
  }
  var VARIANTS = {
    rows: { label: "Pictogrammes \xB7 barres", icon: "layout-list" },
    cols: { label: "Pictogrammes \xB7 barres verticales", icon: "layout-columns" },
    single_v: { label: "Pictogramme simple vertical", icon: "arrow-bar-up" },
    single_h: { label: "Pictogramme simple horizontal", icon: "arrow-bar-right" }
  };
  function make(variant) {
    const multi = variant === "rows" || variant === "cols";
    return {
      label: VARIANTS[variant].label,
      icon: VARIANTS[variant].icon,
      family: "picto",
      boxed: variant === "rows" || variant === "cols",
      defaults: () => ({
        icon: "picto:person",
        color: "blue",
        recolor: true,
        customIcons: [],
        perIcon: multi ? 10 : 100,
        showValues: true,
        decimals: 0,
        suffix: multi ? "" : " %",
        ratio: "3:2",
        rows: [["Women", 62, ""], ["Men", 48, ""], ["Young people", 35, ""], ["Seniors", 21, ""]].map(([label, value2, color]) => ({ label, value: value2, color }))
      }),
      heights: multi ? ["auto", "fixed", "fill"] : ["ratio", "fixed", "fill"],
      fields: [
        { k: "perIcon", t: "number", label: multi ? "Valeur d\u2019un pictogramme" : "Valeur du pictogramme plein (ex. 100)", min: 1e-4, step: "any" },
        { k: "color", t: "color", label: "Couleur des pictogrammes" },
        { k: "showValues", t: "bool", label: "Afficher les valeurs" },
        { k: "decimals", t: "number", label: "D\xE9cimales des valeurs", min: 0, max: 4 },
        { k: "suffix", t: "text", label: "Unit\xE9 apr\xE8s la valeur (%, M\u20AC\u2026)" }
      ].concat(multi ? [] : [{ k: "ratio", t: "select", label: "Format du graphique", options: { "2:1": "2:1 (large)", "16:9": "16:9", "3:2": "3:2", "1:1": "1:1 (carr\xE9)" }, g: "format" }]),
      data: {
        k: "rows",
        min: 1,
        cols: [{ k: "label", label: "Libell\xE9", t: "text" }, { k: "value", label: "Valeur", t: "number", def: 10 }, { k: "color", label: "Couleur", t: "color", auto: true, def: "" }],
        item: () => ({ label: "", value: 10, color: "" })
      },
      /* choix du pictogramme et import SVG (carte « Pictogramme » de l'éditeur) */
      panel: pictoPanel,
      render(o, W, env) {
        const rows = (o.rows || []).map((r) => ({ label: String(r.label || ""), value: Math.max(0, +r.value || 0), color: r.color || o.color || "blue" }));
        const capPx = pxOf(TYPE.caption.size), numPx = pxOf(TYPE.captionNum.size), suffix = o.suffix || "", per = +o.perIcon > 0 ? +o.perIcon : 1, G = 3;
        const val = (v) => fmt(v, env.locale, o.decimals) + suffix, valTxt = (x, y, v, anchor = "start") => s("text", { x, y, "text-anchor": anchor, "font-size": numPx, "font-weight": 700, style: { fontFamily: "var(--t-captionNum-family)" } }, val(v));
        const mk = (H2) => s("svg", { width: W, height: H2, viewBox: `0 0 ${W} ${H2}`, style: { display: "block", overflow: "visible" } });
        if (!rows.length) {
          const v = mk(40);
          v.append(s("text", { x: 0, y: capPx, "font-size": capPx }, t("Aucune donn\xE9e")));
          return { node: v };
        }
        const label = (txt, x, y, maxW, anchor = "start") => {
          const f = fitText(txt, TYPE.caption.weight, SANS, capPx, maxW, 0.7);
          return s("text", { x, y: y + 0.33 * f.size, "text-anchor": anchor, "font-size": f.size }, f.text);
        };
        if (variant === "rows") {
          const labW2 = Math.min(W * 0.35, Math.max(0, ...rows.map((r) => mw(r.label, TYPE.caption.weight, SANS, capPx))) + VIZ.iconGap), valW2 = o.showValues ? mw(val(1e3), 700, '"Source Serif 4", serif', numPx) + 6 : 0;
          const span = Math.max(40, W - labW2 - valW2), maxN = Math.max(1, ...rows.map((r) => Math.ceil(r.value / per)));
          const sz2 = Math.max(14, Math.min(27, Math.floor((span + G) / maxN - G))), perLine = Math.max(1, Math.floor((span + G) / (sz2 + G)));
          const lines = (r) => Math.max(1, Math.ceil(Math.ceil(r.value / per) / perLine)), rowH = (r) => lines(r) * (sz2 + G) - G;
          const H2 = rows.reduce((a2, r) => a2 + rowH(r), 0) + (rows.length - 1) * (G * 3);
          const svg2 = mk(H2);
          let y = 0;
          for (const r of rows) {
            const n = r.value / per, h2 = rowH(r);
            svg2.append(label(r.label, 0, y + sz2 / 2, labW2 - VIZ.iconGap));
            for (let i = 0; i < Math.ceil(n); i++) svg2.append(partial(o, o.icon, labW2 + i % perLine * (sz2 + G), y + Math.floor(i / perLine) * (sz2 + G), sz2, sz2, r.color, Math.min(1, n - i), "h"));
            if (o.showValues) svg2.append(valTxt(labW2 + Math.min(Math.ceil(n), perLine) * (sz2 + G) + 3, y + sz2 / 2 + 0.33 * numPx, r.value));
            svg2.append(reorderHit(env, "rows", rows.indexOf(r), "y", 0, y - G, W, h2 + 2 * G));
            y += h2 + G * 3;
          }
          return { node: svg2 };
        }
        if (variant === "cols") {
          const cw = W / rows.length, sz2 = Math.max(12, Math.min(27, Math.floor(cw - 6))), maxN = Math.max(1, ...rows.map((r) => Math.ceil(r.value / per)));
          const top = o.showValues ? numPx * 1.5 : 0, stackH = maxN * (sz2 + G) - G, labH = capPx * 2.6;
          const H2 = top + stackH + 6 + labH, svg2 = mk(H2);
          rows.forEach((r, i) => {
            const cx = cw * (i + 0.5), n = r.value / per, base = top + stackH;
            for (let k = 0; k < Math.ceil(n); k++) svg2.append(partial(o, o.icon, cx - sz2 / 2, base - (k + 1) * sz2 - k * G, sz2, sz2, r.color, Math.min(1, n - k), "v"));
            if (o.showValues) svg2.append(valTxt(cx, base - Math.ceil(n) * (sz2 + G) + G - 3, r.value, "middle"));
            svg2.append(label(r.label, cx, base + 6 + capPx * 0.6, cw - 4, "middle"));
            svg2.append(reorderHit(env, "rows", i, "x", cw * i, 0, cw, H2));
          });
          return { node: svg2 };
        }
        if (variant === "single_v") {
          const cw = W / rows.length, top = o.showValues ? numPx * 1.6 : 0, labH = capPx * 2.2;
          const H2 = heightOf(o, W, env, null, "3:2"), box = Math.max(24, H2 - top - labH - 6), sz2 = Math.min(box, cw - 12), svg2 = mk(H2);
          rows.forEach((r, i) => {
            const cx = cw * (i + 0.5), y = top + (box - sz2) / 2 + 0;
            svg2.append(partial(o, o.icon, cx - sz2 / 2, y, sz2, sz2, r.color, r.value / per, "v"));
            if (o.showValues) svg2.append(valTxt(cx, numPx, r.value, "middle"));
            svg2.append(label(r.label, cx, top + box + 6 + capPx * 0.6, cw - 4, "middle"));
            svg2.append(reorderHit(env, "rows", i, "x", cw * i, 0, cw, H2));
          });
          return { node: svg2 };
        }
        const labW = Math.min(W * 0.32, Math.max(0, ...rows.map((r) => mw(r.label, TYPE.caption.weight, SANS, capPx))) + VIZ.iconGap), valW = o.showValues ? mw(val(1e3), 700, '"Source Serif 4", serif', numPx) + 6 : 0;
        const H = heightOf(o, W, env, null, "3:2"), rh = Math.max(24, (H - (rows.length - 1) * 9) / rows.length), sz = Math.min(rh, 96), svg = mk(H);
        rows.forEach((r, i) => {
          const y = i * (rh + 9) + (rh - sz) / 2;
          svg.append(label(r.label, 0, i * (rh + 9) + rh / 2, labW - VIZ.iconGap));
          svg.append(partial(o, o.icon, labW, y, sz, sz, r.color, r.value / per, "h"));
          if (o.showValues) svg.append(valTxt(labW + sz + 6, i * (rh + 9) + rh / 2 + 0.33 * numPx, r.value));
          svg.append(reorderHit(env, "rows", i, "y", 0, i * (rh + 9) - 4, W, rh + 8));
        });
        return { node: svg };
      },
      variant
    };
  }
  var pictoTypes = { pictoBars: make("rows"), pictoCols: make("cols"), pictoV: make("single_v"), pictoH: make("single_h") };

  // src/viz/bars.js
  var barPath = (x, y, w, h2, r) => {
    r = Math.max(0, Math.min(r, w / 2, h2));
    return `M${x},${y + h2}L${x},${y + r}A${r},${r} 0 0 1 ${x + r},${y}L${x + w - r},${y}A${r},${r} 0 0 1 ${x + w},${y + r}L${x + w},${y + h2}Z`;
  };
  var bars_default = {
    label: "Barres (jumel\xE9es, group\xE9es, empil\xE9es)",
    icon: "chart-bar",
    family: "compare",
    defaults: () => ({
      style: "overlap",
      ratio: "16:9",
      legend: true,
      showValues: false,
      decimals: 0,
      suffix: "",
      series: [{ name: "Label 1", color: "sky" }, { name: "Label 2", color: "yellow" }],
      rows: [
        { label: "2021", v: [50, 48] },
        { label: "2022", v: [56, 54] },
        { label: "2023", v: [72, 34] },
        { label: "2024", v: [80, 38] },
        { label: "2025", v: [82, 36] }
      ],
      callout: { on: true, value: "+64%", text: "text to the figures" }
    }),
    heights: ["ratio", "fixed", "fill"],
    fields: [
      { k: "style", t: "select", label: "Plusieurs s\xE9ries", options: { overlap: "Jumel\xE9es (2 s\xE9ries qui se chevauchent)", grouped: "C\xF4te \xE0 c\xF4te", stacked: "Empil\xE9es" } },
      { k: "ratio", t: "select", label: "Format du graphique", options: { "2:1": "2:1 (large)", "16:9": "16:9", "3:2": "3:2", "1:1": "1:1 (carr\xE9)" } },
      { k: "legend", t: "bool", label: "Afficher la l\xE9gende" },
      { k: "legendPos", t: "select", label: "Position de la l\xE9gende (\xAB Dans les barres \xBB : noms des s\xE9ries \xE9crits dans chaque barre, sans l\xE9gende s\xE9par\xE9e)", options: { bottom: "En bas", top: "En haut", inside: "Dans les barres" } },
      { k: "showValues", t: "bool", label: "Afficher les valeurs (empil\xE9es : total)" },
      { k: "barSize", t: "select", label: "\xC9paisseur des barres", options: { thin: "Fine", normal: "Normale", thick: "\xC9paisse" } },
      { k: "groupSpace", t: "select", label: "Espace entre les groupes de barres", options: { none: "Aucun", tight: "R\xE9duit", normal: "Normal", loose: "Large" } },
      { k: "serSpace", t: "select", label: "Espace entre les barres d\u2019un m\xEAme groupe", options: { none: "Aucun", tight: "R\xE9duit", normal: "Normal", loose: "Large" } },
      { k: "valuesIn", t: "bool", label: "Valeurs dans les barres (si elles rentrent)" },
      { k: "labelIn", t: "bool", label: "Libell\xE9s dans les barres (au pied de la barre)" },
      { k: "decimals", t: "number", label: "D\xE9cimales des valeurs", min: 0, max: 4 },
      { k: "suffix", t: "text", label: "Unit\xE9 apr\xE8s la valeur (%, M\u20AC\u2026)" },
      { k: "callout.on", t: "bool", label: "Afficher l\u2019accolade \xAB \xE9volution \xBB" },
      { k: "callout.value", t: "text", label: "Valeur de l\u2019accolade (ex. +64 %)" },
      { k: "callout.text", t: "text", label: "Texte de l\u2019accolade" },
      { t: "table", k: "rows", series: "series", maxSeries: 4, label: "Donn\xE9es", icons: true },
      { t: "node", g: "data", build: (root, ctx2) => {
        const n = document.createElement("div");
        n.className = "f";
        n.append(...iconImportPanel(root, ctx2));
        return n;
      } }
    ],
    render(o, W, env) {
      const legIn = o.legendPos === "inside" || o.legendIn;
      const series = o.series || [], rows = o.rows || [], k = Math.max(1, series.length), n = Math.max(1, rows.length);
      const stacked = o.style === "stacked", overlap = o.style === "overlap" && k === 2;
      const H = Math.max(120, heightOf(o, W, env, null));
      const co = o.callout && o.callout.on && rows.length > 1 ? o.callout : null;
      const x1 = W - (co ? VIZ.calloutW : 0);
      const hasIcons = rows.some((r) => r.icon && r.icon !== "none"), iconSz = 33, catH = (o.labelIn ? 6 : VIZ.catH) + (hasIcons ? iconSz + 6 : 0);
      const baseY = H - (o.legend && !legIn ? VIZ.legendGap + VIZ.legendH : 0) - catH, plotTop = VIZ.plotTop, plotH = baseY - plotTop;
      const total = (r) => series.reduce((a2, _, j) => a2 + numVal(r, j), 0);
      const metric = (r) => stacked ? total(r) : numVal(r, 0);
      let max2 = 0;
      rows.forEach((r) => {
        if (stacked) max2 = Math.max(max2, total(r));
        else series.forEach((_, j) => {
          max2 = Math.max(max2, numVal(r, j));
        });
      });
      if (!max2) max2 = 1;
      const slot = x1 / n;
      const sGap = VIZ.barGap * ({ none: 0, tight: 0.5, normal: 1, loose: 2 }[o.serSpace] ?? 1), wf = ({ thin: 0.7, thick: 1.3 }[o.barSize] ?? 1) * ({ tight: 1.2, loose: 0.8 }[o.groupSpace] ?? 1), capW = VIZ.barMaxW * Math.max(1, wf);
      const bw = o.groupSpace === "none" ? stacked || overlap ? slot : Math.max(2, (slot - (k - 1) * sGap) / k) : Math.min(slot * 0.92, wf * (stacked ? Math.min(slot * 0.5, VIZ.barMaxW) : overlap ? Math.min(slot * 0.44, VIZ.barMaxW) : Math.min((slot * 0.72 - (k - 1) * sGap) / k, VIZ.barMaxW)));
      const capPx = pxOf(TYPE.caption.size), numPx = pxOf(TYPE.captionNum.size);
      const yOf = (v) => baseY - v / max2 * plotH;
      const suffix = o.suffix || "";
      const svg = s("svg", { width: W, height: H, viewBox: `0 0 ${W} ${H}`, style: { display: "block", overflow: "visible" } });
      const barX = rows.map((_, i) => {
        const cx = slot * (i + 0.5), xs = [];
        if (stacked) series.forEach((_2, j) => {
          xs[j] = cx - bw / 2;
        });
        else if (overlap) {
          const gx = cx - bw * (1 + VIZ.pairOffset) / 2;
          xs[1] = gx;
          xs[0] = gx + bw * VIZ.pairOffset;
        } else {
          const tw = k * bw + (k - 1) * sGap, gx = cx - tw / 2;
          series.forEach((_2, j) => {
            xs[j] = gx + j * (bw + sGap);
          });
        }
        return xs;
      });
      if (co) {
        const yFirst = yOf(metric(rows[0])), yLast = yOf(metric(rows[rows.length - 1]));
        const bx = x1 + VIZ.calloutGap / 2;
        svg.append(s(
          "g",
          { fill: "none", stroke: "currentColor", "stroke-width": SW },
          s("line", { x1: barX[0][0] + bw, y1: yFirst, x2: bx, y2: yFirst, "stroke-dasharray": "1.5 2" }),
          s("path", { d: `M${bx - VIZ.calloutGap},${yLast}H${bx}V${yFirst}` })
        ));
        const cPx = pxOf(TYPE.callout.size), midY = (yFirst + yLast) / 2, tx = bx + VIZ.calloutGap + VIZ.leaderGap;
        const tl = textLines("", co.text || "", capPx, VIZ.calloutW - (tx - x1) - 3);
        const blockH = TYPE.callout.lh + tl.length * TYPE.caption.lh, top = Math.max(0, midY - blockH / 2);
        const cv = fitText(co.value || "", TYPE.callout.weight, SANS, cPx, VIZ.calloutW - (tx - x1) - 3);
        svg.append(s("text", { x: tx, y: top + TYPE.callout.lh / 2 + 0.33 * cv.size, "font-size": cv.size, "font-weight": TYPE.callout.weight }, cv.text));
        svg.append(drawLines(tl.map((l) => ({ ...l, runs: l.runs.map((r) => ({ ...r, b: false })) })), tx, top + TYPE.callout.lh, TYPE.caption.lh, capPx));
      }
      const bar = (x, y, h2, color, round) => s("path", { d: round ? barPath(x, y, bw, Math.max(h2, 1e-4), VIZ.barRadius) : `M${x},${y}h${bw}v${h2}h${-bw}Z`, fill: colorRef(color), stroke: "currentColor", "stroke-width": SW, "stroke-linejoin": "round" });
      rows.forEach((r, i) => {
        if (stacked) {
          let acc = 0;
          series.forEach((sr, j) => {
            const v = numVal(r, j);
            if (!v) return;
            const y0 = yOf(acc + v), h2 = yOf(acc) - y0;
            acc += v;
            svg.append(bar(barX[i][j], y0, h2, sr.color, j === series.length - 1 || acc >= total(r)));
          });
        } else series.forEach((sr, j) => {
          const y = yOf(numVal(r, j));
          svg.append(bar(barX[i][j], y, baseY - y, sr.color, true));
        });
      });
      const inValue = /* @__PURE__ */ new Set();
      const fitIn = (txt, wt, fam, px) => fitText(txt, wt, fam, px, Math.max(8, bw - 4), 0.5);
      const inside = (i, j, v, sr) => {
        const x = barX[i][j], yT = yOf(v), hh = baseY - yT, cx = x + bw / 2;
        let top = yT + 3, bot = baseY - 3;
        if (o.valuesIn && o.showValues) {
          const f = fitIn(fmt(v, env.locale, o.decimals) + suffix, 700, SERIF, numPx);
          if (hh >= f.size + 8) {
            svg.append(s("text", { x: cx, y: top + 0.82 * f.size, "text-anchor": "middle", "font-size": f.size, "font-weight": 700, style: { fontFamily: "var(--t-captionNum-family)" } }, f.text));
            top += f.size + 3;
            inValue.add(i + ":" + j);
          }
        }
        if (o.labelIn && j === 0 && rows[i].label) {
          const f = fitIn(rows[i].label, TYPE.caption.weight, SANS, capPx);
          if (bot - top >= f.size + 2) {
            svg.append(s("text", { x: cx, y: bot - 0.2 * f.size, "text-anchor": "middle", "font-size": f.size, "font-weight": TYPE.caption.weight }, f.text));
            bot -= f.size + 3;
          }
        }
        if (legIn && !stacked && sr && sr.name) {
          const tw = mw(sr.name, TYPE.caption.weight, SANS, capPx);
          if (bot - top >= tw + 6) {
            const cy = (top + bot) / 2;
            svg.append(s("text", { x: cx, y: cy + 0.33 * capPx, "text-anchor": "middle", "font-size": capPx, "font-weight": TYPE.caption.weight, transform: `rotate(-90 ${cx} ${cy})` }, sr.name));
          }
        }
      };
      rows.forEach((r, i) => {
        if (stacked) inside(i, 0, total(r), null);
        else series.forEach((sr, j) => inside(i, j, numVal(r, j), sr));
      });
      const vMax = slot / (stacked ? 1 : k) - 2;
      const valText = (x, y, v) => {
        const f = fitText(fmt(v, env.locale, o.decimals) + suffix, 700, SERIF, numPx, vMax, 0.5);
        svg.append(s("text", { x, y, "text-anchor": "middle", "font-size": f.size, "font-weight": 700, style: { fontFamily: "var(--t-captionNum-family)" } }, f.text));
      };
      if (o.showValues) rows.forEach((r, i) => {
        if (stacked) {
          if (!inValue.has(i + ":0")) valText(barX[i][0] + bw / 2, yOf(total(r)) - 3, total(r));
        } else series.forEach((_, j) => inValue.has(i + ":" + j) ? null : valText(barX[i][j] + bw / 2, yOf(numVal(r, j)) - 3, numVal(r, j)));
      });
      if (!o.labelIn) rows.forEach((r, i) => {
        const f = fitText(r.label || "", TYPE.caption.weight, SANS, capPx, slot - 3, 0.6);
        svg.append(s("text", { x: slot * (i + 0.5), y: baseY + (catH - VIZ.catH) + VIZ.catH / 2 + 0.33 * f.size + 1, "text-anchor": "middle", "font-size": f.size, "font-weight": TYPE.caption.weight }, f.text));
      });
      if (hasIcons) rows.forEach((r, i) => {
        if (r.icon && r.icon !== "none") svg.append(iconNode(o, r.icon, slot * (i + 0.5) - iconSz / 2, baseY + 6, iconSz, iconSz, "blue"));
      });
      if (o.legend && !legIn) drawLegend(svg, series, H - VIZ.legendH, W);
      rows.forEach((_, i) => svg.append(reorderHit(env, "rows", i, "x", slot * i, 0, slot, baseY + catH)));
      return { node: svg };
    }
  };

  // src/viz/iconlist.js
  var iconlist_default = {
    label: "Liste \xE0 ic\xF4nes",
    icon: "list-check",
    family: "list",
    defaults: () => ({ scale: "1", circle: true, items: [
      { icon: "sliders", text: t("Premier \xE9l\xE9ment de liste") },
      { icon: "send", text: t("Deuxi\xE8me \xE9l\xE9ment de liste") },
      { icon: "pencil", text: t("Troisi\xE8me \xE9l\xE9ment de liste") }
    ] }),
    fields: [
      { k: "circle", t: "bool", label: "Cercle autour de l\u2019ic\xF4ne" },
      { k: "rowGap", t: "select", label: "Espace entre les \xE9l\xE9ments", options: { normal: "Normal", tight: "R\xE9duit", none: "Aucun" } },
      { k: "bracket", t: "bool", label: "Accolade \xE0 gauche" },
      { k: "bracketGap", t: "select", label: "Accolade : espace avant la liste", options: { normal: "Normal", tight: "R\xE9duit", none: "Aucun" } },
      { k: "bracketLink", t: "number", label: "Accolade : trait de liaison vers l\u2019ext\xE9rieur, longueur au-del\xE0 de la colonne (px, 0 = aucun)", min: 0, max: 120 },
      { k: "scale", t: "select", label: "Taille des ic\xF4nes et du texte", options: { 1: "Normal", 1.5: "Grand", 2: "Tr\xE8s grand" } },
      {
        k: "items",
        t: "list",
        label: "\xC9l\xE9ments",
        min: 1,
        max: 8,
        item: () => ({ icon: "check", text: t("Nouvel \xE9l\xE9ment") }),
        fields: [{ k: "icon", t: "select", icons: true, label: "Ic\xF4ne", options: (root) => ({ ...ICON_OPTIONS, ...customChoices(root) }) }, { k: "text", t: "text", rich: true, label: "Texte" }]
      },
      { t: "node", g: "data", build: (root, ctx2) => {
        const n = document.createElement("div");
        n.className = "f";
        n.append(...iconImportPanel(root, ctx2));
        return n;
      } }
    ],
    render(o, W, env) {
      const sc = +o.scale || 1, ring = o.circle !== false, C = VIZ.iconCircle * sc, G = (ring ? VIZ.iconGlyph : VIZ.iconCircle * 0.9) * sc, bodyPx = pxOf(TYPE.body.size) * sc;
      const list = el("div", { class: "viz-icons", style: o.rowGap === "tight" ? { gap: "3px" } : o.rowGap === "none" ? { gap: "0" } : {} });
      (o.items || []).forEach((it, idx) => {
        const k = G / 24, isCustom = String(it.icon || "").startsWith("custom:");
        const ic = ICONS[it.icon] || ICONS.check;
        const svg = s(
          "svg",
          { width: C, height: C, viewBox: `0 0 ${C} ${C}`, class: "vi-ic" },
          ring ? s("circle", { cx: C / 2, cy: C / 2, r: C / 2 - SW / 2, fill: "none", stroke: "currentColor", "stroke-width": SW }) : null,
          isCustom ? iconNode(o, it.icon, (C - G) / 2, (C - G) / 2, G, G, "text") : s("path", { d: ic.d, fill: "none", stroke: "currentColor", "stroke-width": SW / k, "stroke-linecap": "round", "stroke-linejoin": "round", transform: `translate(${(C - G) / 2} ${(C - G) / 2}) scale(${k})` })
        );
        list.append(el("div", { class: "vi-row", style: { ...sc !== 1 ? { minHeight: C + "px" } : {}, ...env && env.ui ? { cursor: "grab" } : {} }, ...env && env.ui ? { "data-reorder": `items:${idx}`, "data-axis": "y" } : {} }, svg, el("div", { class: "vi-text", style: sc !== 1 ? { fontSize: bodyPx + "px", lineHeight: TYPE.body.lh * sc + "px" } : null, innerHTML: inlineMk(it.text) })));
      });
      if (o.bracket) {
        const line = `${SW}px solid var(--c-blue)`;
        const bg = { tight: 6, none: 0 }[o.bracketGap] ?? 15, lk = Math.max(0, +o.bracketLink || 0);
        Object.assign(list.style, { position: "relative", paddingLeft: 18 + bg + "px" });
        list.append(
          el("div", { class: "vi-brace", style: { position: "absolute", left: "9px", top: "0", bottom: "0", width: "9px", boxSizing: "border-box", borderLeft: line, borderTop: line, borderBottom: line, borderRadius: "6px 0 0 6px" } }),
          el("div", { class: "vi-brace-tick", style: { position: "absolute", left: -lk + "px", top: "50%", width: 9 + lk + "px", borderTop: line } })
        );
      }
      return { node: list };
    }
  };

  // src/viz/hbars.js
  var hPath = (x, y, w, h2, r) => {
    r = Math.max(0, Math.min(r, h2 / 2, w));
    return `M${x},${y}H${x + w - r}A${r},${r} 0 0 1 ${x + w},${y + r}V${y + h2 - r}A${r},${r} 0 0 1 ${x + w - r},${y + h2}H${x}Z`;
  };
  var hbars_default = {
    label: "Barres horizontales",
    icon: "align-box-left-middle",
    family: "compare",
    defaults: () => ({
      style: "grouped",
      legend: false,
      showValues: true,
      decimals: 0,
      suffix: "%",
      series: [{ name: t("Valeur"), color: "blue" }],
      rows: [{ label: t("Premier crit\xE8re"), v: [72] }, { label: t("Deuxi\xE8me crit\xE8re"), v: [58] }, { label: t("Troisi\xE8me crit\xE8re"), v: [41] }, { label: t("Quatri\xE8me crit\xE8re"), v: [23] }]
    }),
    heights: ["auto", "fixed", "fill"],
    fields: [
      { k: "style", t: "select", label: "Plusieurs s\xE9ries", options: { grouped: "C\xF4te \xE0 c\xF4te", stacked: "Empil\xE9es" } },
      { k: "barSize", t: "select", label: "\xC9paisseur des barres", options: { thin: "Fine", normal: "Normale", thick: "\xC9paisse", xthick: "Tr\xE8s \xE9paisse" } },
      { k: "rowSpace", t: "select", label: "Espace entre les lignes", options: { none: "Aucun", tight: "R\xE9duit", normal: "Normal", loose: "Large" } },
      { k: "serSpace", t: "select", label: "Espace entre les barres d\u2019une m\xEAme ligne", options: { none: "Aucun", tight: "R\xE9duit", normal: "Normal", loose: "Large" } },
      { k: "labelIn", t: "bool", label: "Libell\xE9s dans les barres" },
      { k: "valuesIn", t: "bool", label: "Valeurs dans les barres (si affich\xE9es ; sinon apr\xE8s la barre quand \xE7a ne rentre pas)" },
      { k: "segments", t: "number", label: "Graduations : nombre de segments dans la barre la plus longue (0 = aucune)", min: 0, max: 20 },
      { k: "legend", t: "bool", label: "Afficher la l\xE9gende" },
      { k: "legendPos", t: "select", label: "Position de la l\xE9gende (\xAB Dans les barres \xBB : noms des s\xE9ries \xE9crits dans chaque barre, sans l\xE9gende s\xE9par\xE9e)", options: { bottom: "En bas", top: "En haut", inside: "Dans les barres" } },
      { k: "showValues", t: "bool", label: "Afficher les valeurs" },
      { k: "decimals", t: "number", label: "D\xE9cimales des valeurs", min: 0, max: 4 },
      { k: "suffix", t: "text", label: "Unit\xE9 apr\xE8s la valeur (%, M\u20AC\u2026)" },
      { t: "table", k: "rows", series: "series", maxSeries: 4, label: "Donn\xE9es" }
    ],
    render(o, W, env) {
      const legIn = o.legendPos === "inside" || o.legendIn;
      const series = o.series || [], rows = o.rows || [], k = Math.max(1, series.length);
      const stacked = o.style === "stacked";
      const capPx = pxOf(TYPE.caption.size), numPx = pxOf(TYPE.captionNum.size), suffix = o.suffix || "";
      const labW = o.labelIn ? 0 : Math.min(W * 0.4, Math.max(0, ...rows.map((r) => mw(r.label || "", TYPE.caption.weight, SANS, capPx))) + VIZ.iconGap);
      const total = (r) => series.reduce((a2, _, j) => a2 + numVal(r, j), 0);
      const valW = o.showValues && !o.valuesIn ? mw(fmt(1e3, env.locale, o.decimals) + suffix, 700, '"Source Serif 4", serif', numPx) + VIZ.barGap * 2 : 0;
      const x0 = labW, span = Math.max(30, W - labW - valW);
      let max2 = 0;
      rows.forEach((r) => {
        max2 = Math.max(max2, stacked ? total(r) : Math.max(0, ...series.map((_, j) => numVal(r, j))));
      });
      if (!max2) max2 = 1;
      const GF = { none: 0, tight: 0.5, normal: 1, loose: 2 }, rGap = VIZ.hRowGap * (GF[o.rowSpace] ?? 1), sGap = VIZ.barGap * (GF[o.serSpace] ?? 1);
      const legBlock = o.legend && !legIn ? VIZ.legendGap + VIZ.legendH : 0, gaps = Math.max(0, rows.length - 1) * rGap;
      const natBh = VIZ.hBar * ({ thin: 0.6, thick: 1.5, xthick: 2 }[o.barSize] ?? 1), natBody = rows.length * (stacked ? natBh : k * natBh + (k - 1) * sGap) + gaps;
      let bh = natBh;
      if (o.hmode === "fixed" || o.hmode === "fill" || o.hmode === "match") {
        const target = heightOf(o, W, env, natBody + legBlock), f = Math.max(0.5, Math.min(4, (target - legBlock - gaps) / Math.max(1, natBody - gaps)));
        bh = Math.max(3, natBh * f);
      }
      const rh = stacked ? bh : k * bh + (k - 1) * sGap;
      const bodyH = rows.length * rh + gaps;
      const H = bodyH + legBlock;
      const svg = s("svg", { width: W, height: H, viewBox: `0 0 ${W} ${H}`, style: { display: "block", overflow: "visible" } });
      if (!o.labelIn) svg.append(s("line", { x1: x0, y1: 0, x2: x0, y2: bodyH, stroke: "currentColor", "stroke-width": SW }));
      const nSeg = Math.max(0, Math.min(20, Math.floor(+o.segments || 0)));
      const NUMF = { "font-size": numPx, "font-weight": 700, style: { fontFamily: "var(--t-captionNum-family)" } };
      const decor = (yy, w, lab, valTxt) => {
        for (let q = 1; q < nSeg; q++) {
          const xx = x0 + span * q / nSeg;
          if (xx < x0 + w - 0.5) svg.append(s("line", { x1: xx, y1: yy, x2: xx, y2: yy + bh, stroke: "currentColor", "stroke-width": SW }));
        }
        const vw = valTxt && o.valuesIn ? mw(valTxt, 700, '"Source Serif 4", serif', numPx) : 0, lw = lab ? mw(lab, TYPE.caption.weight, SANS, capPx) : 0;
        const fitsVal = vw > 0 && w >= (lw ? lw + VIZ.iconGap : 0) + vw + VIZ.iconGap * 2;
        if (lab) {
          const f = fitText(lab, TYPE.caption.weight, SANS, capPx, Math.max(20, w - VIZ.iconGap * 2 - (fitsVal ? vw + VIZ.iconGap : 0)), 0.6);
          svg.append(s("text", { x: x0 + VIZ.iconGap, y: yy + bh / 2 + 0.33 * f.size, "font-size": f.size, "font-weight": TYPE.caption.weight }, f.text));
        }
        if (fitsVal) svg.append(s("text", { ...NUMF, x: x0 + w - VIZ.iconGap, y: yy + bh / 2 + 0.33 * numPx, "text-anchor": "end" }, valTxt));
        return fitsVal;
      };
      rows.forEach((r, i) => {
        const y = i * (rh + rGap);
        if (!o.labelIn) {
          const f = fitText(r.label || "", TYPE.caption.weight, SANS, capPx, labW - VIZ.iconGap, 0.7);
          svg.append(s("text", { x: 0, y: y + rh / 2 + 0.33 * f.size, "font-size": f.size, "font-weight": TYPE.caption.weight }, f.text));
        }
        let end = x0, inside = false;
        if (stacked) {
          let acc = 0;
          series.forEach((sr, j) => {
            const v = numVal(r, j);
            if (!v) return;
            const xa = x0 + acc / max2 * span, w = v / max2 * span;
            acc += v;
            end = xa + w;
            svg.append(s("path", { d: acc >= total(r) ? hPath(xa, y, w, bh, VIZ.barRadius) : `M${xa},${y}h${w}v${bh}h${-w}Z`, fill: colorRef(sr.color), stroke: "currentColor", "stroke-width": SW, "stroke-linejoin": "round" }));
            if ((legIn || o.labelIn && !r.label) && sr.name && w > mw(sr.name, TYPE.caption.weight, SANS, capPx) + VIZ.iconGap * 2) svg.append(s("text", { x: xa + w / 2, y: y + bh / 2 + 0.33 * capPx, "text-anchor": "middle", "font-size": capPx, "font-weight": TYPE.caption.weight }, sr.name));
          });
          inside = decor(y, end - x0, o.labelIn ? r.label : "", o.showValues ? fmt(total(r), env.locale, o.decimals) + suffix : "");
        } else series.forEach((sr, j) => {
          const w = numVal(r, j) / max2 * span, yy = y + j * (bh + sGap);
          end = Math.max(end, x0 + w);
          svg.append(s("path", { d: hPath(x0, yy, Math.max(w, 1e-4), bh, VIZ.barRadius), fill: colorRef(sr.color), stroke: "currentColor", "stroke-width": SW, "stroke-linejoin": "round" }));
          const ins = decor(yy, w, [j === 0 && o.labelIn ? r.label : "", legIn || o.labelIn && !r.label ? sr.name : ""].filter(Boolean).join(" \xB7 "), o.showValues ? fmt(numVal(r, j), env.locale, o.decimals) + suffix : "");
          if (o.showValues && !ins) svg.append(s("text", { x: x0 + w + VIZ.barGap * 1.5, y: yy + bh / 2 + 0.33 * numPx, "font-size": numPx, "font-weight": 700, style: { fontFamily: "var(--t-captionNum-family)" } }, fmt(numVal(r, j), env.locale, o.decimals) + suffix));
        });
        if (stacked && o.showValues && !inside) svg.append(s("text", { x: end + VIZ.barGap * 1.5, y: y + bh / 2 + 0.33 * numPx, "font-size": numPx, "font-weight": 700, style: { fontFamily: "var(--t-captionNum-family)" } }, fmt(total(r), env.locale, o.decimals) + suffix));
      });
      if (o.legend && !legIn) drawLegend(svg, series, H - VIZ.legendH, W);
      rows.forEach((_, i) => svg.append(reorderHit(env, "rows", i, "y", 0, i * (rh + rGap) - rGap / 2, W, rh + rGap)));
      return { node: svg };
    }
  };

  // src/viz/line.js
  var line_default = {
    label: "Courbes",
    icon: "chart-line",
    family: "trend",
    defaults: () => ({
      ratio: "16:9",
      legend: true,
      showValues: false,
      decimals: 0,
      suffix: "",
      zero: true,
      series: [{ name: `${t("S\xE9rie")} 1`, color: "blue" }, { name: `${t("S\xE9rie")} 2`, color: "yellow" }],
      rows: [{ label: "2021", v: [20, 45] }, { label: "2022", v: [34, 40] }, { label: "2023", v: [52, 38] }, { label: "2024", v: [60, 49] }, { label: "2025", v: [78, 55] }]
    }),
    heights: ["ratio", "fixed", "fill"],
    fields: [
      { k: "ratio", t: "select", label: "Format du graphique", options: { "2:1": "2:1 (large)", "16:9": "16:9", "3:2": "3:2", "1:1": "1:1 (carr\xE9)" } },
      { k: "zero", t: "bool", label: "Axe vertical d\xE9marrant \xE0 z\xE9ro" },
      { k: "legend", t: "bool", label: "Afficher la l\xE9gende" },
      { k: "legendPos", t: "select", label: "Position de la l\xE9gende", options: { bottom: "En bas", top: "En haut" } },
      { k: "showValues", t: "bool", label: "Afficher les valeurs" },
      { k: "decimals", t: "number", label: "D\xE9cimales des valeurs", min: 0, max: 4 },
      { k: "suffix", t: "text", label: "Unit\xE9 apr\xE8s la valeur (%, M\u20AC\u2026)" },
      { t: "table", k: "rows", series: "series", maxSeries: 4, label: "Donn\xE9es" }
    ],
    render(o, W, env) {
      const series = o.series || [], rows = o.rows || [], n = Math.max(1, rows.length);
      const H = Math.max(120, heightOf(o, W, env, null));
      const baseY = H - (o.legend ? VIZ.legendGap + VIZ.legendH : 0) - VIZ.catH, top = (o.showValues ? VIZ.plotTop : 0) + VIZ.pointR, plotH = baseY - top - VIZ.pointR;
      const all = rows.flatMap((r) => series.map((_, j) => numVal(r, j)));
      let lo = o.zero === false ? Math.min(...all) : 0, hi = Math.max(...all, lo + 1e-9);
      if (o.zero === false) {
        const pad = (hi - lo) * 0.1 || 1;
        lo -= pad;
        hi += pad;
      }
      const slot = W / n, capPx = pxOf(TYPE.caption.size), numPx = pxOf(TYPE.captionNum.size), suffix = o.suffix || "";
      const xOf = (i) => slot * (i + 0.5), yOf = (v) => baseY - VIZ.pointR - (v - lo) / (hi - lo) * plotH;
      const svg = s("svg", { width: W, height: H, viewBox: `0 0 ${W} ${H}`, style: { display: "block", overflow: "visible" } });
      svg.append(s("line", { x1: 0, y1: baseY, x2: W, y2: baseY, stroke: "currentColor", "stroke-width": SW }));
      series.forEach((sr, j) => {
        const d = rows.map((r, i) => `${i ? "L" : "M"}${xOf(i)},${yOf(numVal(r, j))}`).join("");
        svg.append(s("path", { d, fill: "none", stroke: "currentColor", "stroke-width": SW, "stroke-linejoin": "round", "stroke-linecap": "round" }));
      });
      series.forEach((sr, j) => rows.forEach((r, i) => {
        svg.append(s("circle", { cx: xOf(i), cy: yOf(numVal(r, j)), r: VIZ.pointR, fill: colorRef(sr.color), stroke: "currentColor", "stroke-width": SW }));
        if (o.showValues) {
          const f = fitText(fmt(numVal(r, j), env.locale, o.decimals) + suffix, 700, SERIF, numPx, slot - 2, 0.5);
          svg.append(s("text", { x: xOf(i), y: yOf(numVal(r, j)) - VIZ.pointR - 3, "text-anchor": "middle", "font-size": f.size, "font-weight": 700, style: { fontFamily: "var(--t-captionNum-family)" } }, f.text));
        }
      }));
      rows.forEach((r, i) => {
        const f = fitText(r.label || "", TYPE.caption.weight, SANS, capPx, slot - 3, 0.6);
        svg.append(s("text", { x: xOf(i), y: baseY + VIZ.catH / 2 + 0.33 * f.size + 1, "text-anchor": "middle", "font-size": f.size, "font-weight": TYPE.caption.weight }, f.text));
      });
      if (o.legend) drawLegend(svg, series, H - VIZ.legendH, W);
      rows.forEach((_, i) => svg.append(reorderHit(env, "rows", i, "x", slot * i, 0, slot, baseY + VIZ.catH)));
      return { node: svg };
    }
  };

  // node_modules/d3-hierarchy/dist/d3-hierarchy.mjs
  function count(node) {
    var sum2 = 0, children = node.children, i = children && children.length;
    if (!i) sum2 = 1;
    else while (--i >= 0) sum2 += children[i].value;
    node.value = sum2;
  }
  function node_count() {
    return this.eachAfter(count);
  }
  function node_each(callback, that) {
    let index2 = -1;
    for (const node of this) {
      callback.call(that, node, ++index2, this);
    }
    return this;
  }
  function node_eachBefore(callback, that) {
    var node = this, nodes = [node], children, i, index2 = -1;
    while (node = nodes.pop()) {
      callback.call(that, node, ++index2, this);
      if (children = node.children) {
        for (i = children.length - 1; i >= 0; --i) {
          nodes.push(children[i]);
        }
      }
    }
    return this;
  }
  function node_eachAfter(callback, that) {
    var node = this, nodes = [node], next = [], children, i, n, index2 = -1;
    while (node = nodes.pop()) {
      next.push(node);
      if (children = node.children) {
        for (i = 0, n = children.length; i < n; ++i) {
          nodes.push(children[i]);
        }
      }
    }
    while (node = next.pop()) {
      callback.call(that, node, ++index2, this);
    }
    return this;
  }
  function node_find(callback, that) {
    let index2 = -1;
    for (const node of this) {
      if (callback.call(that, node, ++index2, this)) {
        return node;
      }
    }
  }
  function node_sum(value2) {
    return this.eachAfter(function(node) {
      var sum2 = +value2(node.data) || 0, children = node.children, i = children && children.length;
      while (--i >= 0) sum2 += children[i].value;
      node.value = sum2;
    });
  }
  function node_sort(compare) {
    return this.eachBefore(function(node) {
      if (node.children) {
        node.children.sort(compare);
      }
    });
  }
  function node_path(end) {
    var start = this, ancestor = leastCommonAncestor(start, end), nodes = [start];
    while (start !== ancestor) {
      start = start.parent;
      nodes.push(start);
    }
    var k = nodes.length;
    while (end !== ancestor) {
      nodes.splice(k, 0, end);
      end = end.parent;
    }
    return nodes;
  }
  function leastCommonAncestor(a2, b) {
    if (a2 === b) return a2;
    var aNodes = a2.ancestors(), bNodes = b.ancestors(), c2 = null;
    a2 = aNodes.pop();
    b = bNodes.pop();
    while (a2 === b) {
      c2 = a2;
      a2 = aNodes.pop();
      b = bNodes.pop();
    }
    return c2;
  }
  function node_ancestors() {
    var node = this, nodes = [node];
    while (node = node.parent) {
      nodes.push(node);
    }
    return nodes;
  }
  function node_descendants() {
    return Array.from(this);
  }
  function node_leaves() {
    var leaves = [];
    this.eachBefore(function(node) {
      if (!node.children) {
        leaves.push(node);
      }
    });
    return leaves;
  }
  function node_links() {
    var root = this, links = [];
    root.each(function(node) {
      if (node !== root) {
        links.push({ source: node.parent, target: node });
      }
    });
    return links;
  }
  function* node_iterator() {
    var node = this, current3, next = [node], children, i, n;
    do {
      current3 = next.reverse(), next = [];
      while (node = current3.pop()) {
        yield node;
        if (children = node.children) {
          for (i = 0, n = children.length; i < n; ++i) {
            next.push(children[i]);
          }
        }
      }
    } while (next.length);
  }
  function hierarchy(data, children) {
    if (data instanceof Map) {
      data = [void 0, data];
      if (children === void 0) children = mapChildren;
    } else if (children === void 0) {
      children = objectChildren;
    }
    var root = new Node$1(data), node, nodes = [root], child, childs, i, n;
    while (node = nodes.pop()) {
      if ((childs = children(node.data)) && (n = (childs = Array.from(childs)).length)) {
        node.children = childs;
        for (i = n - 1; i >= 0; --i) {
          nodes.push(child = childs[i] = new Node$1(childs[i]));
          child.parent = node;
          child.depth = node.depth + 1;
        }
      }
    }
    return root.eachBefore(computeHeight);
  }
  function node_copy() {
    return hierarchy(this).eachBefore(copyData);
  }
  function objectChildren(d) {
    return d.children;
  }
  function mapChildren(d) {
    return Array.isArray(d) ? d[1] : null;
  }
  function copyData(node) {
    if (node.data.value !== void 0) node.value = node.data.value;
    node.data = node.data.data;
  }
  function computeHeight(node) {
    var height = 0;
    do
      node.height = height;
    while ((node = node.parent) && node.height < ++height);
  }
  function Node$1(data) {
    this.data = data;
    this.depth = this.height = 0;
    this.parent = null;
  }
  Node$1.prototype = hierarchy.prototype = {
    constructor: Node$1,
    count: node_count,
    each: node_each,
    eachAfter: node_eachAfter,
    eachBefore: node_eachBefore,
    find: node_find,
    sum: node_sum,
    sort: node_sort,
    path: node_path,
    ancestors: node_ancestors,
    descendants: node_descendants,
    leaves: node_leaves,
    links: node_links,
    copy: node_copy,
    [Symbol.iterator]: node_iterator
  };
  function optional(f) {
    return f == null ? null : required(f);
  }
  function required(f) {
    if (typeof f !== "function") throw new Error();
    return f;
  }
  function constantZero() {
    return 0;
  }
  function constant(x) {
    return function() {
      return x;
    };
  }
  var a = 1664525;
  var c = 1013904223;
  var m = 4294967296;
  function lcg() {
    let s2 = 1;
    return () => (s2 = (a * s2 + c) % m) / m;
  }
  function array(x) {
    return typeof x === "object" && "length" in x ? x : Array.from(x);
  }
  function shuffle(array2, random) {
    let m2 = array2.length, t2, i;
    while (m2) {
      i = random() * m2-- | 0;
      t2 = array2[m2];
      array2[m2] = array2[i];
      array2[i] = t2;
    }
    return array2;
  }
  function packEncloseRandom(circles, random) {
    var i = 0, n = (circles = shuffle(Array.from(circles), random)).length, B = [], p, e;
    while (i < n) {
      p = circles[i];
      if (e && enclosesWeak(e, p)) ++i;
      else e = encloseBasis(B = extendBasis(B, p)), i = 0;
    }
    return e;
  }
  function extendBasis(B, p) {
    var i, j;
    if (enclosesWeakAll(p, B)) return [p];
    for (i = 0; i < B.length; ++i) {
      if (enclosesNot(p, B[i]) && enclosesWeakAll(encloseBasis2(B[i], p), B)) {
        return [B[i], p];
      }
    }
    for (i = 0; i < B.length - 1; ++i) {
      for (j = i + 1; j < B.length; ++j) {
        if (enclosesNot(encloseBasis2(B[i], B[j]), p) && enclosesNot(encloseBasis2(B[i], p), B[j]) && enclosesNot(encloseBasis2(B[j], p), B[i]) && enclosesWeakAll(encloseBasis3(B[i], B[j], p), B)) {
          return [B[i], B[j], p];
        }
      }
    }
    throw new Error();
  }
  function enclosesNot(a2, b) {
    var dr = a2.r - b.r, dx = b.x - a2.x, dy = b.y - a2.y;
    return dr < 0 || dr * dr < dx * dx + dy * dy;
  }
  function enclosesWeak(a2, b) {
    var dr = a2.r - b.r + Math.max(a2.r, b.r, 1) * 1e-9, dx = b.x - a2.x, dy = b.y - a2.y;
    return dr > 0 && dr * dr > dx * dx + dy * dy;
  }
  function enclosesWeakAll(a2, B) {
    for (var i = 0; i < B.length; ++i) {
      if (!enclosesWeak(a2, B[i])) {
        return false;
      }
    }
    return true;
  }
  function encloseBasis(B) {
    switch (B.length) {
      case 1:
        return encloseBasis1(B[0]);
      case 2:
        return encloseBasis2(B[0], B[1]);
      case 3:
        return encloseBasis3(B[0], B[1], B[2]);
    }
  }
  function encloseBasis1(a2) {
    return {
      x: a2.x,
      y: a2.y,
      r: a2.r
    };
  }
  function encloseBasis2(a2, b) {
    var x1 = a2.x, y1 = a2.y, r1 = a2.r, x2 = b.x, y2 = b.y, r2 = b.r, x21 = x2 - x1, y21 = y2 - y1, r21 = r2 - r1, l = Math.sqrt(x21 * x21 + y21 * y21);
    return {
      x: (x1 + x2 + x21 / l * r21) / 2,
      y: (y1 + y2 + y21 / l * r21) / 2,
      r: (l + r1 + r2) / 2
    };
  }
  function encloseBasis3(a2, b, c2) {
    var x1 = a2.x, y1 = a2.y, r1 = a2.r, x2 = b.x, y2 = b.y, r2 = b.r, x3 = c2.x, y3 = c2.y, r3 = c2.r, a22 = x1 - x2, a3 = x1 - x3, b2 = y1 - y2, b3 = y1 - y3, c22 = r2 - r1, c3 = r3 - r1, d1 = x1 * x1 + y1 * y1 - r1 * r1, d2 = d1 - x2 * x2 - y2 * y2 + r2 * r2, d3 = d1 - x3 * x3 - y3 * y3 + r3 * r3, ab = a3 * b2 - a22 * b3, xa = (b2 * d3 - b3 * d2) / (ab * 2) - x1, xb = (b3 * c22 - b2 * c3) / ab, ya = (a3 * d2 - a22 * d3) / (ab * 2) - y1, yb = (a22 * c3 - a3 * c22) / ab, A = xb * xb + yb * yb - 1, B = 2 * (r1 + xa * xb + ya * yb), C = xa * xa + ya * ya - r1 * r1, r = -(Math.abs(A) > 1e-6 ? (B + Math.sqrt(B * B - 4 * A * C)) / (2 * A) : C / B);
    return {
      x: x1 + xa + xb * r,
      y: y1 + ya + yb * r,
      r
    };
  }
  function place(b, a2, c2) {
    var dx = b.x - a2.x, x, a22, dy = b.y - a2.y, y, b2, d2 = dx * dx + dy * dy;
    if (d2) {
      a22 = a2.r + c2.r, a22 *= a22;
      b2 = b.r + c2.r, b2 *= b2;
      if (a22 > b2) {
        x = (d2 + b2 - a22) / (2 * d2);
        y = Math.sqrt(Math.max(0, b2 / d2 - x * x));
        c2.x = b.x - x * dx - y * dy;
        c2.y = b.y - x * dy + y * dx;
      } else {
        x = (d2 + a22 - b2) / (2 * d2);
        y = Math.sqrt(Math.max(0, a22 / d2 - x * x));
        c2.x = a2.x + x * dx - y * dy;
        c2.y = a2.y + x * dy + y * dx;
      }
    } else {
      c2.x = a2.x + c2.r;
      c2.y = a2.y;
    }
  }
  function intersects(a2, b) {
    var dr = a2.r + b.r - 1e-6, dx = b.x - a2.x, dy = b.y - a2.y;
    return dr > 0 && dr * dr > dx * dx + dy * dy;
  }
  function score(node) {
    var a2 = node._, b = node.next._, ab = a2.r + b.r, dx = (a2.x * b.r + b.x * a2.r) / ab, dy = (a2.y * b.r + b.y * a2.r) / ab;
    return dx * dx + dy * dy;
  }
  function Node(circle) {
    this._ = circle;
    this.next = null;
    this.previous = null;
  }
  function packSiblingsRandom(circles, random) {
    if (!(n = (circles = array(circles)).length)) return 0;
    var a2, b, c2, n, aa, ca, i, j, k, sj, sk;
    a2 = circles[0], a2.x = 0, a2.y = 0;
    if (!(n > 1)) return a2.r;
    b = circles[1], a2.x = -b.r, b.x = a2.r, b.y = 0;
    if (!(n > 2)) return a2.r + b.r;
    place(b, a2, c2 = circles[2]);
    a2 = new Node(a2), b = new Node(b), c2 = new Node(c2);
    a2.next = c2.previous = b;
    b.next = a2.previous = c2;
    c2.next = b.previous = a2;
    pack: for (i = 3; i < n; ++i) {
      place(a2._, b._, c2 = circles[i]), c2 = new Node(c2);
      j = b.next, k = a2.previous, sj = b._.r, sk = a2._.r;
      do {
        if (sj <= sk) {
          if (intersects(j._, c2._)) {
            b = j, a2.next = b, b.previous = a2, --i;
            continue pack;
          }
          sj += j._.r, j = j.next;
        } else {
          if (intersects(k._, c2._)) {
            a2 = k, a2.next = b, b.previous = a2, --i;
            continue pack;
          }
          sk += k._.r, k = k.previous;
        }
      } while (j !== k.next);
      c2.previous = a2, c2.next = b, a2.next = b.previous = b = c2;
      aa = score(a2);
      while ((c2 = c2.next) !== b) {
        if ((ca = score(c2)) < aa) {
          a2 = c2, aa = ca;
        }
      }
      b = a2.next;
    }
    a2 = [b._], c2 = b;
    while ((c2 = c2.next) !== b) a2.push(c2._);
    c2 = packEncloseRandom(a2, random);
    for (i = 0; i < n; ++i) a2 = circles[i], a2.x -= c2.x, a2.y -= c2.y;
    return c2.r;
  }
  function defaultRadius(d) {
    return Math.sqrt(d.value);
  }
  function index$1() {
    var radius = null, dx = 1, dy = 1, padding = constantZero;
    function pack(root) {
      const random = lcg();
      root.x = dx / 2, root.y = dy / 2;
      if (radius) {
        root.eachBefore(radiusLeaf(radius)).eachAfter(packChildrenRandom(padding, 0.5, random)).eachBefore(translateChild(1));
      } else {
        root.eachBefore(radiusLeaf(defaultRadius)).eachAfter(packChildrenRandom(constantZero, 1, random)).eachAfter(packChildrenRandom(padding, root.r / Math.min(dx, dy), random)).eachBefore(translateChild(Math.min(dx, dy) / (2 * root.r)));
      }
      return root;
    }
    pack.radius = function(x) {
      return arguments.length ? (radius = optional(x), pack) : radius;
    };
    pack.size = function(x) {
      return arguments.length ? (dx = +x[0], dy = +x[1], pack) : [dx, dy];
    };
    pack.padding = function(x) {
      return arguments.length ? (padding = typeof x === "function" ? x : constant(+x), pack) : padding;
    };
    return pack;
  }
  function radiusLeaf(radius) {
    return function(node) {
      if (!node.children) {
        node.r = Math.max(0, +radius(node) || 0);
      }
    };
  }
  function packChildrenRandom(padding, k, random) {
    return function(node) {
      if (children = node.children) {
        var children, i, n = children.length, r = padding(node) * k || 0, e;
        if (r) for (i = 0; i < n; ++i) children[i].r += r;
        e = packSiblingsRandom(children, random);
        if (r) for (i = 0; i < n; ++i) children[i].r -= r;
        node.r = e + r;
      }
    };
  }
  function translateChild(k) {
    return function(node) {
      var parent = node.parent;
      node.r *= k;
      if (parent) {
        node.x = parent.x + k * node.x;
        node.y = parent.y + k * node.y;
      }
    };
  }
  function roundNode(node) {
    node.x0 = Math.round(node.x0);
    node.y0 = Math.round(node.y0);
    node.x1 = Math.round(node.x1);
    node.y1 = Math.round(node.y1);
  }
  function treemapDice(parent, x0, y0, x1, y1) {
    var nodes = parent.children, node, i = -1, n = nodes.length, k = parent.value && (x1 - x0) / parent.value;
    while (++i < n) {
      node = nodes[i], node.y0 = y0, node.y1 = y1;
      node.x0 = x0, node.x1 = x0 += node.value * k;
    }
  }
  function partition() {
    var dx = 1, dy = 1, padding = 0, round = false;
    function partition2(root) {
      var n = root.height + 1;
      root.x0 = root.y0 = padding;
      root.x1 = dx;
      root.y1 = dy / n;
      root.eachBefore(positionNode(dy, n));
      if (round) root.eachBefore(roundNode);
      return root;
    }
    function positionNode(dy2, n) {
      return function(node) {
        if (node.children) {
          treemapDice(node, node.x0, dy2 * (node.depth + 1) / n, node.x1, dy2 * (node.depth + 2) / n);
        }
        var x0 = node.x0, y0 = node.y0, x1 = node.x1 - padding, y1 = node.y1 - padding;
        if (x1 < x0) x0 = x1 = (x0 + x1) / 2;
        if (y1 < y0) y0 = y1 = (y0 + y1) / 2;
        node.x0 = x0;
        node.y0 = y0;
        node.x1 = x1;
        node.y1 = y1;
      };
    }
    partition2.round = function(x) {
      return arguments.length ? (round = !!x, partition2) : round;
    };
    partition2.size = function(x) {
      return arguments.length ? (dx = +x[0], dy = +x[1], partition2) : [dx, dy];
    };
    partition2.padding = function(x) {
      return arguments.length ? (padding = +x, partition2) : padding;
    };
    return partition2;
  }
  function TreeNode(node, i) {
    this._ = node;
    this.parent = null;
    this.children = null;
    this.A = null;
    this.a = this;
    this.z = 0;
    this.m = 0;
    this.c = 0;
    this.s = 0;
    this.t = null;
    this.i = i;
  }
  TreeNode.prototype = Object.create(Node$1.prototype);
  function treemapSlice(parent, x0, y0, x1, y1) {
    var nodes = parent.children, node, i = -1, n = nodes.length, k = parent.value && (y1 - y0) / parent.value;
    while (++i < n) {
      node = nodes[i], node.x0 = x0, node.x1 = x1;
      node.y0 = y0, node.y1 = y0 += node.value * k;
    }
  }
  var phi = (1 + Math.sqrt(5)) / 2;
  function squarifyRatio(ratio, parent, x0, y0, x1, y1) {
    var rows = [], nodes = parent.children, row, nodeValue, i0 = 0, i1 = 0, n = nodes.length, dx, dy, value2 = parent.value, sumValue, minValue, maxValue, newRatio, minRatio, alpha, beta;
    while (i0 < n) {
      dx = x1 - x0, dy = y1 - y0;
      do
        sumValue = nodes[i1++].value;
      while (!sumValue && i1 < n);
      minValue = maxValue = sumValue;
      alpha = Math.max(dy / dx, dx / dy) / (value2 * ratio);
      beta = sumValue * sumValue * alpha;
      minRatio = Math.max(maxValue / beta, beta / minValue);
      for (; i1 < n; ++i1) {
        sumValue += nodeValue = nodes[i1].value;
        if (nodeValue < minValue) minValue = nodeValue;
        if (nodeValue > maxValue) maxValue = nodeValue;
        beta = sumValue * sumValue * alpha;
        newRatio = Math.max(maxValue / beta, beta / minValue);
        if (newRatio > minRatio) {
          sumValue -= nodeValue;
          break;
        }
        minRatio = newRatio;
      }
      rows.push(row = { value: sumValue, dice: dx < dy, children: nodes.slice(i0, i1) });
      if (row.dice) treemapDice(row, x0, y0, x1, value2 ? y0 += dy * sumValue / value2 : y1);
      else treemapSlice(row, x0, y0, value2 ? x0 += dx * sumValue / value2 : x1, y1);
      value2 -= sumValue, i0 = i1;
    }
    return rows;
  }
  var squarify = (function custom(ratio) {
    function squarify2(parent, x0, y0, x1, y1) {
      squarifyRatio(ratio, parent, x0, y0, x1, y1);
    }
    squarify2.ratio = function(x) {
      return custom((x = +x) > 1 ? x : 1);
    };
    return squarify2;
  })(phi);
  function index() {
    var tile = squarify, round = false, dx = 1, dy = 1, paddingStack = [0], paddingInner = constantZero, paddingTop = constantZero, paddingRight = constantZero, paddingBottom = constantZero, paddingLeft = constantZero;
    function treemap(root) {
      root.x0 = root.y0 = 0;
      root.x1 = dx;
      root.y1 = dy;
      root.eachBefore(positionNode);
      paddingStack = [0];
      if (round) root.eachBefore(roundNode);
      return root;
    }
    function positionNode(node) {
      var p = paddingStack[node.depth], x0 = node.x0 + p, y0 = node.y0 + p, x1 = node.x1 - p, y1 = node.y1 - p;
      if (x1 < x0) x0 = x1 = (x0 + x1) / 2;
      if (y1 < y0) y0 = y1 = (y0 + y1) / 2;
      node.x0 = x0;
      node.y0 = y0;
      node.x1 = x1;
      node.y1 = y1;
      if (node.children) {
        p = paddingStack[node.depth + 1] = paddingInner(node) / 2;
        x0 += paddingLeft(node) - p;
        y0 += paddingTop(node) - p;
        x1 -= paddingRight(node) - p;
        y1 -= paddingBottom(node) - p;
        if (x1 < x0) x0 = x1 = (x0 + x1) / 2;
        if (y1 < y0) y0 = y1 = (y0 + y1) / 2;
        tile(node, x0, y0, x1, y1);
      }
    }
    treemap.round = function(x) {
      return arguments.length ? (round = !!x, treemap) : round;
    };
    treemap.size = function(x) {
      return arguments.length ? (dx = +x[0], dy = +x[1], treemap) : [dx, dy];
    };
    treemap.tile = function(x) {
      return arguments.length ? (tile = required(x), treemap) : tile;
    };
    treemap.padding = function(x) {
      return arguments.length ? treemap.paddingInner(x).paddingOuter(x) : treemap.paddingInner();
    };
    treemap.paddingInner = function(x) {
      return arguments.length ? (paddingInner = typeof x === "function" ? x : constant(+x), treemap) : paddingInner;
    };
    treemap.paddingOuter = function(x) {
      return arguments.length ? treemap.paddingTop(x).paddingRight(x).paddingBottom(x).paddingLeft(x) : treemap.paddingTop();
    };
    treemap.paddingTop = function(x) {
      return arguments.length ? (paddingTop = typeof x === "function" ? x : constant(+x), treemap) : paddingTop;
    };
    treemap.paddingRight = function(x) {
      return arguments.length ? (paddingRight = typeof x === "function" ? x : constant(+x), treemap) : paddingRight;
    };
    treemap.paddingBottom = function(x) {
      return arguments.length ? (paddingBottom = typeof x === "function" ? x : constant(+x), treemap) : paddingBottom;
    };
    treemap.paddingLeft = function(x) {
      return arguments.length ? (paddingLeft = typeof x === "function" ? x : constant(+x), treemap) : paddingLeft;
    };
    return treemap;
  }
  var resquarify = (function custom2(ratio) {
    function resquarify2(parent, x0, y0, x1, y1) {
      if ((rows = parent._squarify) && rows.ratio === ratio) {
        var rows, row, nodes, i, j = -1, n, m2 = rows.length, value2 = parent.value;
        while (++j < m2) {
          row = rows[j], nodes = row.children;
          for (i = row.value = 0, n = nodes.length; i < n; ++i) row.value += nodes[i].value;
          if (row.dice) treemapDice(row, x0, y0, x1, value2 ? y0 += (y1 - y0) * row.value / value2 : y1);
          else treemapSlice(row, x0, y0, value2 ? x0 += (x1 - x0) * row.value / value2 : x1, y1);
          value2 -= row.value;
        }
      } else {
        parent._squarify = rows = squarifyRatio(ratio, parent, x0, y0, x1, y1);
        rows.ratio = ratio;
      }
    }
    resquarify2.ratio = function(x) {
      return custom2((x = +x) > 1 ? x : 1);
    };
    return resquarify2;
  })(phi);

  // src/viz/hier.js
  var HIER_DATA = {
    k: "rows",
    min: 1,
    cols: [
      { k: "l1", label: "Niveau 1", t: "text" },
      { k: "l2", label: "Niveau 2", t: "text" },
      { k: "l3", label: "Niveau 3", t: "text" },
      { k: "value", label: "Valeur", t: "number", def: 10 },
      { k: "color", label: "Couleur (niveau 1)", t: "color", auto: true, def: "" }
    ],
    item: () => ({ l1: "", l2: "", l3: "", value: 10, color: "" })
  };
  var hierRows = () => [
    ["Europe", "France", "", 67, ""],
    ["Europe", "Germany", "", 83, ""],
    ["Europe", "Italy", "", 59, ""],
    ["Asia", "Japan", "", 125, ""],
    ["Asia", "India", "Urban", 480, ""],
    ["Asia", "India", "Rural", 920, ""],
    ["Africa", "Nigeria", "", 223, ""],
    ["Africa", "Egypt", "", 112, ""]
  ].map(([l1, l2, l3, value2, color]) => ({ l1, l2, l3, value: value2, color }));
  function buildHier(rows) {
    const top = { name: "", children: [] };
    for (const r of rows || []) {
      const path = [r.l1, r.l2, r.l3].map((x) => String(x || "").trim()).filter(Boolean), v = Math.max(0, +r.value || 0);
      if (!path.length || !v) continue;
      let node = top;
      path.forEach((name, i) => {
        let c2 = (node.children || (node.children = [])).find((x) => x.name === name);
        if (!c2) {
          c2 = { name };
          node.children.push(c2);
        }
        if (i === 0 && r.color && !c2.color) c2.color = r.color;
        node = c2;
      });
      node.value = (node.value || 0) + v;
    }
    const root = hierarchy(top).sum((d) => d.value || 0).sort((a2, b) => b.value - a2.value);
    const tops = (root.children || []).map((n, i) => {
      n.data.color = autoColor(n.data.color, i);
      return { name: n.data.name, color: n.data.color, value: n.value };
    });
    return { root, tops };
  }
  var topOf = (n) => n.depth <= 1 ? n : n.ancestors().find((a2) => a2.depth === 1);
  var depthAlpha = (d) => [1, 1, 0.7, 0.45, 0.3][Math.min(d, 4)];

  // src/viz/sunburst.js
  var pt = (r, a2) => [r * Math.sin(a2), -r * Math.cos(a2)];
  function arc(a0, a1, r0, r1) {
    if (a1 - a0 >= Math.PI * 2 - 1e-4) a1 = a0 + Math.PI * 2 - 1e-4;
    const [x0, y0] = pt(r1, a0), [x1, y1] = pt(r1, a1), [x2, y2] = pt(r0, a1), [x3, y3] = pt(r0, a0), big = a1 - a0 > Math.PI ? 1 : 0;
    return `M${x0},${y0}A${r1},${r1} 0 ${big} 1 ${x1},${y1}` + (r0 > 0.5 ? `L${x2},${y2}A${r0},${r0} 0 ${big} 0 ${x3},${y3}Z` : `L0,0Z`);
  }
  var sunburst_default = {
    label: "Sunburst",
    icon: "chart-arcs",
    family: "hier",
    defaults: () => ({ ratio: "1:1", hole: 0.22, showLabels: true, showTotal: true, legend: true, decimals: 0, suffix: "", rows: hierRows() }),
    heights: ["ratio", "fixed", "fill"],
    fields: [
      { k: "ratio", t: "select", label: "Format du graphique", options: { "1:1": "1:1 (carr\xE9)", "3:2": "3:2", "16:9": "16:9" } },
      { k: "hole", t: "number", label: "Trou central (0 \xE0 0,6 du rayon)", min: 0, max: 0.6, step: 0.02 },
      { k: "showLabels", t: "bool", label: "Afficher les noms sur les arcs" },
      { k: "showTotal", t: "bool", label: "Afficher le total au centre" },
      { k: "legend", t: "bool", label: "Afficher la l\xE9gende (niveau 1)" },
      { k: "legendPos", t: "select", label: "Position de la l\xE9gende", options: { bottom: "En bas", top: "En haut" } },
      { k: "decimals", t: "number", label: "D\xE9cimales des valeurs", min: 0, max: 4 },
      { k: "suffix", t: "text", label: "Unit\xE9 apr\xE8s la valeur (%, M\u20AC\u2026)" }
    ],
    data: HIER_DATA,
    dataHint: "Une ligne par feuille ; laissez vides les niveaux inutiles. La couleur du niveau 1 s\u2019applique \xE0 toute sa branche.",
    render(o, W, env) {
      const { root, tops } = buildHier(o.rows), capPx = pxOf(TYPE.caption.size), LG = o.legend ? layoutLegend(buildHier(o.rows).tops.map((x) => ({ name: x.name, color: x.color })), W) : null, legH = LG ? VIZ.legendGap + LG.h : 0;
      const H = heightOf(o, W, env, null, "1:1");
      const svg = s("svg", { width: W, height: H, viewBox: `0 0 ${W} ${H}`, style: { display: "block", overflow: "visible" } });
      if (!root.children) {
        svg.append(s("text", { x: 0, y: capPx, "font-size": capPx }, t("Aucune donn\xE9e")));
        return { node: svg };
      }
      const R2 = Math.max(30, Math.min(W / 2, (H - legH) / 2) - 1), hole = Math.max(0, Math.min(0.6, +o.hole || 0)) * R2;
      const depth = root.height, ring = (R2 - hole) / depth;
      partition().size([Math.PI * 2, 1])(root);
      const g = s("g", { transform: `translate(${W / 2},${R2 + 1})` }), labels = s("g");
      for (const n of root.descendants()) {
        if (!n.depth) continue;
        const r0 = hole + (n.depth - 1) * ring, r1 = r0 + ring, key = topOf(n).data.color, a2 = depthAlpha(n.depth);
        g.append(s("path", { d: arc(n.x0, n.x1, r0, r1), fill: colorRef(key), "fill-opacity": a2, stroke: "currentColor", "stroke-width": SW, "stroke-linejoin": "round" }));
        if (o.showLabels) {
          const mid = (n.x0 + n.x1) / 2, rm = (r0 + r1) / 2, arcLen = (n.x1 - n.x0) * rm, name = n.data.name;
          if (arcLen < 14 || ring < 14) continue;
          const f = fitText(name, 400, SANS, capPx, Math.min(ring * 1.5, arcLen - 6), 0.62);
          if (f.text !== name || mw(f.text, 400, SANS, f.size) > arcLen - 4) continue;
          const [x, y] = pt(rm, mid);
          labels.append(s("text", { x, y: y + 0.33 * f.size, "text-anchor": "middle", "font-size": f.size, fill: inkOn(env, key, a2), style: { pointerEvents: "none" } }, f.text));
        }
      }
      svg.append(g);
      g.append(labels);
      if (o.showTotal && hole > 28) {
        const total = fmt(root.value, env.locale, o.decimals) + (o.suffix || ""), f = fitText(total, 700, SANS, pxOf(TYPE.captionNum.size) * 1.2, hole * 1.7, 0.5);
        g.append(s("text", { x: 0, y: 0.33 * f.size, "text-anchor": "middle", "font-size": f.size, "font-weight": 700 }, f.text));
      }
      if (LG) drawLegendWrap(svg, LG, H - LG.h);
      return { node: svg };
    }
  };

  // src/viz/bubbles.js
  var bubbles_default = {
    label: "Bulles hi\xE9rarchiques",
    icon: "chart-bubble",
    family: "hier",
    defaults: () => ({ ratio: "1:1", pad: 6, showLabels: true, showValues: true, parents: true, legend: true, decimals: 0, suffix: "", rows: hierRows() }),
    heights: ["ratio", "fixed", "fill"],
    fields: [
      { k: "ratio", t: "select", label: "Format du graphique", options: { "1:1": "1:1 (carr\xE9)", "3:2": "3:2", "16:9": "16:9" } },
      { k: "pad", t: "number", label: "Espace entre les bulles (px)", min: 0, max: 24 },
      { k: "parents", t: "bool", label: "Afficher le contour des groupes" },
      { k: "showLabels", t: "bool", label: "Afficher les noms" },
      { k: "showValues", t: "bool", label: "Afficher les valeurs" },
      { k: "legend", t: "bool", label: "Afficher la l\xE9gende (niveau 1)" },
      { k: "legendPos", t: "select", label: "Position de la l\xE9gende", options: { bottom: "En bas", top: "En haut" } },
      { k: "decimals", t: "number", label: "D\xE9cimales des valeurs", min: 0, max: 4 },
      { k: "suffix", t: "text", label: "Unit\xE9 apr\xE8s la valeur (%, M\u20AC\u2026)" }
    ],
    data: HIER_DATA,
    dataHint: "Une ligne par feuille ; laissez vides les niveaux inutiles. La couleur du niveau 1 s\u2019applique \xE0 toute sa branche.",
    render(o, W, env) {
      const { root, tops } = buildHier(o.rows), capPx = pxOf(TYPE.caption.size), numPx = pxOf(TYPE.captionNum.size), LG = o.legend ? layoutLegend(buildHier(o.rows).tops.map((x) => ({ name: x.name, color: x.color })), W) : null, legH = LG ? VIZ.legendGap + LG.h : 0;
      const H = heightOf(o, W, env, null, "1:1");
      const svg = s("svg", { width: W, height: H, viewBox: `0 0 ${W} ${H}`, style: { display: "block", overflow: "visible" } });
      if (!root.children) {
        svg.append(s("text", { x: 0, y: capPx, "font-size": capPx }, t("Aucune donn\xE9e")));
        return { node: svg };
      }
      const ph = H - legH;
      index$1().size([W, ph]).padding(Math.max(0, +o.pad || 0))(root);
      const g = s("g"), labels = s("g");
      for (const n of root.descendants()) {
        if (!n.depth) continue;
        const key = topOf(n).data.color, leaf = !n.children, a2 = leaf ? depthAlpha(n.depth) : 0.14;
        if (!leaf && !o.parents) continue;
        g.append(s("circle", { cx: n.x, cy: n.y, r: Math.max(0.5, n.r), fill: colorRef(key), "fill-opacity": a2, stroke: "currentColor", "stroke-width": SW }));
        if (leaf && o.showLabels && n.r > 12) {
          const maxW = n.r * 1.7, f = fitText(n.data.name, 400, SANS, capPx, maxW, 0.6), ink = inkOn(env, key, a2);
          if (f.text !== n.data.name || mw(f.text, 400, SANS, f.size) > maxW) continue;
          const withV = o.showValues && n.r > capPx * 1.6, dy = withV ? -0.15 * f.size : 0.33 * f.size;
          labels.append(s("text", { x: n.x, y: n.y + dy, "text-anchor": "middle", "font-size": f.size, fill: ink }, f.text));
          if (withV) labels.append(s("text", { x: n.x, y: n.y + dy + numPx * 1.05, "text-anchor": "middle", "font-size": Math.min(numPx, f.size), "font-weight": 700, fill: ink, style: { fontFamily: "var(--t-captionNum-family)" } }, fmt(n.value, env.locale, o.decimals) + (o.suffix || "")));
        }
      }
      svg.append(g, labels);
      if (LG) drawLegendWrap(svg, LG, H - LG.h);
      return { node: svg };
    }
  };

  // src/viz/treemap.js
  var treemap_default = {
    label: "Treemap",
    icon: "chart-treemap",
    family: "hier",
    defaults: () => ({ ratio: "3:2", pad: 3, showLabels: true, showValues: true, groupLabels: true, legend: false, decimals: 0, suffix: "", rows: hierRows() }),
    heights: ["ratio", "fixed", "fill"],
    fields: [
      { k: "ratio", t: "select", label: "Format du graphique", options: { "2:1": "2:1 (large)", "16:9": "16:9", "3:2": "3:2", "1:1": "1:1 (carr\xE9)" } },
      { k: "pad", t: "number", label: "Espace entre les cases (px)", min: 0, max: 12 },
      { k: "groupLabels", t: "bool", label: "Afficher le nom des groupes (niveau 1)" },
      { k: "showLabels", t: "bool", label: "Afficher les noms" },
      { k: "showValues", t: "bool", label: "Afficher les valeurs" },
      { k: "legend", t: "bool", label: "Afficher la l\xE9gende (niveau 1)" },
      { k: "legendPos", t: "select", label: "Position de la l\xE9gende", options: { bottom: "En bas", top: "En haut" } },
      { k: "decimals", t: "number", label: "D\xE9cimales des valeurs", min: 0, max: 4 },
      { k: "suffix", t: "text", label: "Unit\xE9 apr\xE8s la valeur (%, M\u20AC\u2026)" }
    ],
    data: HIER_DATA,
    dataHint: "Une ligne par feuille ; laissez vides les niveaux inutiles. La couleur du niveau 1 s\u2019applique \xE0 toute sa branche.",
    render(o, W, env) {
      const { root, tops } = buildHier(o.rows), capPx = pxOf(TYPE.caption.size), numPx = pxOf(TYPE.captionNum.size), LG = o.legend ? layoutLegend(buildHier(o.rows).tops.map((x) => ({ name: x.name, color: x.color })), W) : null, legH = LG ? VIZ.legendGap + LG.h : 0;
      const H = heightOf(o, W, env, null, "3:2");
      const svg = s("svg", { width: W, height: H, viewBox: `0 0 ${W} ${H}`, style: { display: "block", overflow: "visible" } });
      if (!root.children) {
        svg.append(s("text", { x: 0, y: capPx, "font-size": capPx }, t("Aucune donn\xE9e")));
        return { node: svg };
      }
      const pad = Math.max(0, +o.pad || 0), head = Math.ceil(capPx * 1.45) + 2;
      index().tile(squarify).size([W, H - legH]).paddingInner(pad).paddingOuter(pad).paddingTop((d) => d.depth === 1 && d.children && o.groupLabels ? head : pad)(root);
      const g = s("g"), labels = s("g");
      for (const n of root.descendants()) {
        if (!n.depth) continue;
        const w = n.x1 - n.x0, h2 = n.y1 - n.y0, key = topOf(n).data.color, leaf = !n.children, a2 = leaf ? depthAlpha(n.depth) : 0.16;
        if (w < 1 || h2 < 1) continue;
        g.append(s("rect", { x: n.x0, y: n.y0, width: w, height: h2, rx: Math.min(VIZ.barRadius, w / 2, h2 / 2), fill: colorRef(key), "fill-opacity": a2, stroke: "currentColor", "stroke-width": SW }));
        const ink = inkOn(env, key, a2);
        if (!leaf && n.depth === 1 && o.groupLabels) {
          const f = fitText(n.data.name, 700, SANS, capPx, w - 8, 0.7);
          labels.append(s("text", { x: n.x0 + 5, y: n.y0 + head / 2 + 0.33 * f.size, "font-size": f.size, "font-weight": 700 }, f.text));
        } else if (leaf && o.showLabels && w > 28 && h2 > capPx * 1.3) {
          const f = fitText(n.data.name, 400, SANS, capPx, w - 8, 0.6);
          labels.append(s("text", { x: n.x0 + 4, y: n.y0 + 3 + 0.9 * f.size, "font-size": f.size, fill: ink }, f.text));
          if (o.showValues && h2 > capPx * 2.7) labels.append(s("text", { x: n.x0 + 4, y: n.y0 + 3 + 0.9 * f.size + numPx * 1.1, "font-size": Math.min(numPx, f.size), "font-weight": 700, fill: ink, style: { fontFamily: "var(--t-captionNum-family)" } }, fmt(n.value, env.locale, o.decimals) + (o.suffix || "")));
        }
      }
      svg.append(g, labels);
      if (LG) drawLegendWrap(svg, LG, H - LG.h);
      return { node: svg };
    }
  };

  // node_modules/d3-array/src/max.js
  function max(values, valueof) {
    let max2;
    if (valueof === void 0) {
      for (const value2 of values) {
        if (value2 != null && (max2 < value2 || max2 === void 0 && value2 >= value2)) {
          max2 = value2;
        }
      }
    } else {
      let index2 = -1;
      for (let value2 of values) {
        if ((value2 = valueof(value2, ++index2, values)) != null && (max2 < value2 || max2 === void 0 && value2 >= value2)) {
          max2 = value2;
        }
      }
    }
    return max2;
  }

  // node_modules/d3-array/src/min.js
  function min(values, valueof) {
    let min2;
    if (valueof === void 0) {
      for (const value2 of values) {
        if (value2 != null && (min2 > value2 || min2 === void 0 && value2 >= value2)) {
          min2 = value2;
        }
      }
    } else {
      let index2 = -1;
      for (let value2 of values) {
        if ((value2 = valueof(value2, ++index2, values)) != null && (min2 > value2 || min2 === void 0 && value2 >= value2)) {
          min2 = value2;
        }
      }
    }
    return min2;
  }

  // node_modules/d3-array/src/sum.js
  function sum(values, valueof) {
    let sum2 = 0;
    if (valueof === void 0) {
      for (let value2 of values) {
        if (value2 = +value2) {
          sum2 += value2;
        }
      }
    } else {
      let index2 = -1;
      for (let value2 of values) {
        if (value2 = +valueof(value2, ++index2, values)) {
          sum2 += value2;
        }
      }
    }
    return sum2;
  }

  // node_modules/d3-sankey/src/align.js
  function targetDepth(d) {
    return d.target.depth;
  }
  function left(node) {
    return node.depth;
  }
  function right(node, n) {
    return n - 1 - node.height;
  }
  function justify(node, n) {
    return node.sourceLinks.length ? node.depth : n - 1;
  }
  function center(node) {
    return node.targetLinks.length ? node.depth : node.sourceLinks.length ? min(node.sourceLinks, targetDepth) - 1 : 0;
  }

  // node_modules/d3-sankey/src/constant.js
  function constant2(x) {
    return function() {
      return x;
    };
  }

  // node_modules/d3-sankey/src/sankey.js
  function ascendingSourceBreadth(a2, b) {
    return ascendingBreadth(a2.source, b.source) || a2.index - b.index;
  }
  function ascendingTargetBreadth(a2, b) {
    return ascendingBreadth(a2.target, b.target) || a2.index - b.index;
  }
  function ascendingBreadth(a2, b) {
    return a2.y0 - b.y0;
  }
  function value(d) {
    return d.value;
  }
  function defaultId(d) {
    return d.index;
  }
  function defaultNodes(graph) {
    return graph.nodes;
  }
  function defaultLinks(graph) {
    return graph.links;
  }
  function find(nodeById, id) {
    const node = nodeById.get(id);
    if (!node) throw new Error("missing: " + id);
    return node;
  }
  function computeLinkBreadths({ nodes }) {
    for (const node of nodes) {
      let y0 = node.y0;
      let y1 = y0;
      for (const link of node.sourceLinks) {
        link.y0 = y0 + link.width / 2;
        y0 += link.width;
      }
      for (const link of node.targetLinks) {
        link.y1 = y1 + link.width / 2;
        y1 += link.width;
      }
    }
  }
  function Sankey() {
    let x0 = 0, y0 = 0, x1 = 1, y1 = 1;
    let dx = 24;
    let dy = 8, py;
    let id = defaultId;
    let align = justify;
    let sort;
    let linkSort;
    let nodes = defaultNodes;
    let links = defaultLinks;
    let iterations = 6;
    function sankey() {
      const graph = { nodes: nodes.apply(null, arguments), links: links.apply(null, arguments) };
      computeNodeLinks(graph);
      computeNodeValues(graph);
      computeNodeDepths(graph);
      computeNodeHeights(graph);
      computeNodeBreadths(graph);
      computeLinkBreadths(graph);
      return graph;
    }
    sankey.update = function(graph) {
      computeLinkBreadths(graph);
      return graph;
    };
    sankey.nodeId = function(_) {
      return arguments.length ? (id = typeof _ === "function" ? _ : constant2(_), sankey) : id;
    };
    sankey.nodeAlign = function(_) {
      return arguments.length ? (align = typeof _ === "function" ? _ : constant2(_), sankey) : align;
    };
    sankey.nodeSort = function(_) {
      return arguments.length ? (sort = _, sankey) : sort;
    };
    sankey.nodeWidth = function(_) {
      return arguments.length ? (dx = +_, sankey) : dx;
    };
    sankey.nodePadding = function(_) {
      return arguments.length ? (dy = py = +_, sankey) : dy;
    };
    sankey.nodes = function(_) {
      return arguments.length ? (nodes = typeof _ === "function" ? _ : constant2(_), sankey) : nodes;
    };
    sankey.links = function(_) {
      return arguments.length ? (links = typeof _ === "function" ? _ : constant2(_), sankey) : links;
    };
    sankey.linkSort = function(_) {
      return arguments.length ? (linkSort = _, sankey) : linkSort;
    };
    sankey.size = function(_) {
      return arguments.length ? (x0 = y0 = 0, x1 = +_[0], y1 = +_[1], sankey) : [x1 - x0, y1 - y0];
    };
    sankey.extent = function(_) {
      return arguments.length ? (x0 = +_[0][0], x1 = +_[1][0], y0 = +_[0][1], y1 = +_[1][1], sankey) : [[x0, y0], [x1, y1]];
    };
    sankey.iterations = function(_) {
      return arguments.length ? (iterations = +_, sankey) : iterations;
    };
    function computeNodeLinks({ nodes: nodes2, links: links2 }) {
      for (const [i, node] of nodes2.entries()) {
        node.index = i;
        node.sourceLinks = [];
        node.targetLinks = [];
      }
      const nodeById = new Map(nodes2.map((d, i) => [id(d, i, nodes2), d]));
      for (const [i, link] of links2.entries()) {
        link.index = i;
        let { source, target } = link;
        if (typeof source !== "object") source = link.source = find(nodeById, source);
        if (typeof target !== "object") target = link.target = find(nodeById, target);
        source.sourceLinks.push(link);
        target.targetLinks.push(link);
      }
      if (linkSort != null) {
        for (const { sourceLinks, targetLinks } of nodes2) {
          sourceLinks.sort(linkSort);
          targetLinks.sort(linkSort);
        }
      }
    }
    function computeNodeValues({ nodes: nodes2 }) {
      for (const node of nodes2) {
        node.value = node.fixedValue === void 0 ? Math.max(sum(node.sourceLinks, value), sum(node.targetLinks, value)) : node.fixedValue;
      }
    }
    function computeNodeDepths({ nodes: nodes2 }) {
      const n = nodes2.length;
      let current3 = new Set(nodes2);
      let next = /* @__PURE__ */ new Set();
      let x = 0;
      while (current3.size) {
        for (const node of current3) {
          node.depth = x;
          for (const { target } of node.sourceLinks) {
            next.add(target);
          }
        }
        if (++x > n) throw new Error("circular link");
        current3 = next;
        next = /* @__PURE__ */ new Set();
      }
    }
    function computeNodeHeights({ nodes: nodes2 }) {
      const n = nodes2.length;
      let current3 = new Set(nodes2);
      let next = /* @__PURE__ */ new Set();
      let x = 0;
      while (current3.size) {
        for (const node of current3) {
          node.height = x;
          for (const { source } of node.targetLinks) {
            next.add(source);
          }
        }
        if (++x > n) throw new Error("circular link");
        current3 = next;
        next = /* @__PURE__ */ new Set();
      }
    }
    function computeNodeLayers({ nodes: nodes2 }) {
      const x = max(nodes2, (d) => d.depth) + 1;
      const kx = (x1 - x0 - dx) / (x - 1);
      const columns = new Array(x);
      for (const node of nodes2) {
        const i = Math.max(0, Math.min(x - 1, Math.floor(align.call(null, node, x))));
        node.layer = i;
        node.x0 = x0 + i * kx;
        node.x1 = node.x0 + dx;
        if (columns[i]) columns[i].push(node);
        else columns[i] = [node];
      }
      if (sort) for (const column of columns) {
        column.sort(sort);
      }
      return columns;
    }
    function initializeNodeBreadths(columns) {
      const ky = min(columns, (c2) => (y1 - y0 - (c2.length - 1) * py) / sum(c2, value));
      for (const nodes2 of columns) {
        let y = y0;
        for (const node of nodes2) {
          node.y0 = y;
          node.y1 = y + node.value * ky;
          y = node.y1 + py;
          for (const link of node.sourceLinks) {
            link.width = link.value * ky;
          }
        }
        y = (y1 - y + py) / (nodes2.length + 1);
        for (let i = 0; i < nodes2.length; ++i) {
          const node = nodes2[i];
          node.y0 += y * (i + 1);
          node.y1 += y * (i + 1);
        }
        reorderLinks(nodes2);
      }
    }
    function computeNodeBreadths(graph) {
      const columns = computeNodeLayers(graph);
      py = Math.min(dy, (y1 - y0) / (max(columns, (c2) => c2.length) - 1));
      initializeNodeBreadths(columns);
      for (let i = 0; i < iterations; ++i) {
        const alpha = Math.pow(0.99, i);
        const beta = Math.max(1 - alpha, (i + 1) / iterations);
        relaxRightToLeft(columns, alpha, beta);
        relaxLeftToRight(columns, alpha, beta);
      }
    }
    function relaxLeftToRight(columns, alpha, beta) {
      for (let i = 1, n = columns.length; i < n; ++i) {
        const column = columns[i];
        for (const target of column) {
          let y = 0;
          let w = 0;
          for (const { source, value: value2 } of target.targetLinks) {
            let v = value2 * (target.layer - source.layer);
            y += targetTop(source, target) * v;
            w += v;
          }
          if (!(w > 0)) continue;
          let dy2 = (y / w - target.y0) * alpha;
          target.y0 += dy2;
          target.y1 += dy2;
          reorderNodeLinks(target);
        }
        if (sort === void 0) column.sort(ascendingBreadth);
        resolveCollisions(column, beta);
      }
    }
    function relaxRightToLeft(columns, alpha, beta) {
      for (let n = columns.length, i = n - 2; i >= 0; --i) {
        const column = columns[i];
        for (const source of column) {
          let y = 0;
          let w = 0;
          for (const { target, value: value2 } of source.sourceLinks) {
            let v = value2 * (target.layer - source.layer);
            y += sourceTop(source, target) * v;
            w += v;
          }
          if (!(w > 0)) continue;
          let dy2 = (y / w - source.y0) * alpha;
          source.y0 += dy2;
          source.y1 += dy2;
          reorderNodeLinks(source);
        }
        if (sort === void 0) column.sort(ascendingBreadth);
        resolveCollisions(column, beta);
      }
    }
    function resolveCollisions(nodes2, alpha) {
      const i = nodes2.length >> 1;
      const subject = nodes2[i];
      resolveCollisionsBottomToTop(nodes2, subject.y0 - py, i - 1, alpha);
      resolveCollisionsTopToBottom(nodes2, subject.y1 + py, i + 1, alpha);
      resolveCollisionsBottomToTop(nodes2, y1, nodes2.length - 1, alpha);
      resolveCollisionsTopToBottom(nodes2, y0, 0, alpha);
    }
    function resolveCollisionsTopToBottom(nodes2, y, i, alpha) {
      for (; i < nodes2.length; ++i) {
        const node = nodes2[i];
        const dy2 = (y - node.y0) * alpha;
        if (dy2 > 1e-6) node.y0 += dy2, node.y1 += dy2;
        y = node.y1 + py;
      }
    }
    function resolveCollisionsBottomToTop(nodes2, y, i, alpha) {
      for (; i >= 0; --i) {
        const node = nodes2[i];
        const dy2 = (node.y1 - y) * alpha;
        if (dy2 > 1e-6) node.y0 -= dy2, node.y1 -= dy2;
        y = node.y0 - py;
      }
    }
    function reorderNodeLinks({ sourceLinks, targetLinks }) {
      if (linkSort === void 0) {
        for (const { source: { sourceLinks: sourceLinks2 } } of targetLinks) {
          sourceLinks2.sort(ascendingTargetBreadth);
        }
        for (const { target: { targetLinks: targetLinks2 } } of sourceLinks) {
          targetLinks2.sort(ascendingSourceBreadth);
        }
      }
    }
    function reorderLinks(nodes2) {
      if (linkSort === void 0) {
        for (const { sourceLinks, targetLinks } of nodes2) {
          sourceLinks.sort(ascendingTargetBreadth);
          targetLinks.sort(ascendingSourceBreadth);
        }
      }
    }
    function targetTop(source, target) {
      let y = source.y0 - (source.sourceLinks.length - 1) * py / 2;
      for (const { target: node, width } of source.sourceLinks) {
        if (node === target) break;
        y += width + py;
      }
      for (const { source: node, width } of target.targetLinks) {
        if (node === source) break;
        y -= width;
      }
      return y;
    }
    function sourceTop(source, target) {
      let y = target.y0 - (target.targetLinks.length - 1) * py / 2;
      for (const { source: node, width } of target.targetLinks) {
        if (node === source) break;
        y += width + py;
      }
      for (const { target: node, width } of source.sourceLinks) {
        if (node === target) break;
        y -= width;
      }
      return y;
    }
    return sankey;
  }

  // src/viz/sankey.js
  var ALIGN = { justify, left, right, center };
  var sankey_default = {
    label: "Sankey",
    icon: "chart-sankey",
    family: "flow",
    defaults: () => ({
      ratio: "16:9",
      align: "justify",
      nodeW: 12,
      nodePad: 9,
      showValues: true,
      decimals: 0,
      suffix: "",
      rows: [
        ["Budget", "Research", 50, ""],
        ["Budget", "Education", 30, ""],
        ["Budget", "Health", 20, ""],
        ["Research", "Universities", 35, ""],
        ["Research", "Companies", 15, ""],
        ["Education", "Universities", 10, ""],
        ["Education", "Schools", 20, ""],
        ["Health", "Hospitals", 20, ""]
      ].map(([source, target, value2, color]) => ({ source, target, value: value2, color }))
    }),
    heights: ["ratio", "fixed", "fill"],
    fields: [
      { k: "ratio", t: "select", label: "Format du graphique", options: { "2:1": "2:1 (large)", "16:9": "16:9", "3:2": "3:2", "1:1": "1:1 (carr\xE9)" } },
      { k: "align", t: "select", label: "Alignement des n\u0153uds", options: { justify: "Justifi\xE9", left: "\xC0 gauche", right: "\xC0 droite", center: "Centr\xE9" } },
      { k: "nodeW", t: "number", label: "Largeur des n\u0153uds (px)", min: 3, max: 36 },
      { k: "nodePad", t: "number", label: "Espace entre les n\u0153uds (px)", min: 0, max: 36 },
      { k: "showValues", t: "bool", label: "Afficher les valeurs" },
      { k: "decimals", t: "number", label: "D\xE9cimales des valeurs", min: 0, max: 4 },
      { k: "suffix", t: "text", label: "Unit\xE9 apr\xE8s la valeur (%, M\u20AC\u2026)" }
    ],
    data: {
      k: "rows",
      min: 1,
      cols: [{ k: "source", label: "Source", t: "text" }, { k: "target", label: "Cible", t: "text" }, { k: "value", label: "Valeur", t: "number", def: 10 }, { k: "color", label: "Couleur du flux", t: "color", auto: true, def: "" }],
      item: () => ({ source: "", target: "", value: 10, color: "" })
    },
    dataHint: "Une ligne par flux. Les n\u0153uds sont cr\xE9\xE9s d\u2019apr\xE8s les noms ; la couleur d\u2019un flux est celle de sa source si elle n\u2019est pas choisie.",
    render(o, W, env) {
      const capPx = pxOf(TYPE.caption.size), numPx = pxOf(TYPE.captionNum.size), suffix = o.suffix || "";
      const H = heightOf(o, W, env, null, "16:9");
      const svg = s("svg", { width: W, height: H, viewBox: `0 0 ${W} ${H}`, style: { display: "block", overflow: "visible" } });
      const links = (o.rows || []).map((r) => ({ source: String(r.source || "").trim(), target: String(r.target || "").trim(), value: +r.value || 0, color: r.color || "" })).filter((l) => l.source && l.target && l.source !== l.target && l.value > 0);
      const note = (msg) => {
        svg.append(s("text", { x: 0, y: capPx, "font-size": capPx }, msg));
        return { node: svg };
      };
      if (!links.length) return note(t("Aucune donn\xE9e"));
      const names = [...new Set(links.flatMap((l) => [l.source, l.target]))];
      let g;
      const lab = (name, v) => name + (o.showValues ? ` \xB7 ${fmt(v, env.locale, o.decimals)}${suffix}` : "");
      const probe = Sankey().nodeId((d) => d.name).nodeWidth(+o.nodeW || 12).nodePadding(+o.nodePad || 0).nodeAlign(ALIGN[o.align] || justify).extent([[0, 4], [W, H - 4]]);
      try {
        g = probe({ nodes: names.map((name) => ({ name })), links: links.map((l) => ({ ...l })) });
      } catch (e) {
        return note(t("Flux circulaires non pris en charge"));
      }
      const maxLayer = Math.max(...g.nodes.map((n) => n.layer));
      const wOf = (side) => Math.min(W * 0.28, Math.max(0, ...g.nodes.filter((n) => n.layer === side).map((n) => mw(lab(n.name, n.value), 400, SANS, capPx))) + 6);
      const ml = wOf(0), mr = maxLayer ? wOf(maxLayer) : 0;
      const G = Sankey().nodeId((d) => d.name).nodeWidth(+o.nodeW || 12).nodePadding(+o.nodePad || 0).nodeAlign(ALIGN[o.align] || justify).extent([[ml, 4], [Math.max(ml + 40, W - mr), H - 4]])({ nodes: names.map((name) => ({ name })), links: links.map((l) => ({ ...l })) });
      const color = new Map(G.nodes.map((n, i) => [n.name, autoColor("", i)]));
      const linkG = s("g", { fill: "none" }), nodeG = s("g"), textG = s("g");
      for (const l of G.links) {
        const x0 = l.source.x1, x1 = l.target.x0, xm = (x0 + x1) / 2, key = l.color || color.get(l.source.name);
        linkG.append(s("path", { d: `M${x0},${l.y0}C${xm},${l.y0} ${xm},${l.y1} ${x1},${l.y1}`, stroke: colorRef(key), "stroke-width": Math.max(1, l.width), "stroke-opacity": 0.4 }));
      }
      for (const n of G.nodes) {
        const h2 = Math.max(1, n.y1 - n.y0);
        nodeG.append(s("rect", { x: n.x0, y: n.y0, width: n.x1 - n.x0, height: h2, rx: Math.min(VIZ.barRadius, (n.x1 - n.x0) / 2), fill: colorRef(color.get(n.name)), stroke: "currentColor", "stroke-width": SW }));
        const left2 = n.layer === 0 && maxLayer > 0 ? true : n.layer === maxLayer ? false : n.x0 < W / 2 ? false : true;
        const avail = left2 ? n.x0 - 6 : n.layer === maxLayer ? W - n.x1 - 6 : Math.max(40, (W - n.x1) * 0.9);
        const f = fitText(lab(n.name, n.value), 400, SANS, capPx, Math.max(30, avail), 0.7);
        textG.append(s("text", {
          x: left2 ? n.x0 - 5 : n.x1 + 5,
          y: (n.y0 + n.y1) / 2 + 0.33 * f.size,
          "text-anchor": left2 ? "end" : "start",
          "font-size": f.size,
          style: { paintOrder: "stroke", stroke: "#fff", strokeWidth: "3px", strokeLinejoin: "round" }
        }, f.text));
      }
      svg.append(linkG, nodeG, textG);
      return { node: svg };
    }
  };

  // src/viz/scatter.js
  function ticks(lo, hi, n = 5) {
    if (!(hi > lo)) hi = lo + 1;
    const raw = (hi - lo) / n, p = 10 ** Math.floor(Math.log10(raw)), f = raw / p, step = (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * p;
    const a2 = Math.ceil(lo / step - 1e-9) * step, out = [];
    for (let v = a2; v <= hi + step * 1e-6; v += step) out.push(+v.toFixed(10));
    return { out, step, lo: Math.min(lo, out[0] ?? lo), hi: Math.max(hi, out[out.length - 1] ?? hi) };
  }
  var scatter_default = {
    label: "Nuage de points",
    icon: "chart-dots",
    family: "compare",
    defaults: () => ({
      ratio: "3:2",
      zeroX: false,
      zeroY: false,
      showLabels: false,
      legend: true,
      maxR: 14,
      xTitle: "GDP per capita (k\u20AC)",
      yTitle: "Life expectancy",
      decimals: 0,
      suffix: "",
      rows: [
        ["France", "Europe", 38, 82.5, 67],
        ["Germany", "Europe", 44, 81.1, 83],
        ["Poland", "Europe", 17, 77.5, 38],
        ["Japan", "Asia", 35, 84.5, 125],
        ["India", "Asia", 2.4, 70.8, 1400],
        ["China", "Asia", 12, 78.2, 1410],
        ["Nigeria", "Africa", 2.1, 53.9, 223],
        ["Egypt", "Africa", 3.6, 71.8, 112],
        ["Brazil", "Americas", 8.9, 75.9, 215]
      ].map(([label, group, x, y, size]) => ({ label, group, x, y, size }))
    }),
    heights: ["ratio", "fixed", "fill"],
    fields: [
      { k: "ratio", t: "select", label: "Format du graphique", options: { "2:1": "2:1 (large)", "16:9": "16:9", "3:2": "3:2", "1:1": "1:1 (carr\xE9)" } },
      { k: "xTitle", t: "text", label: "Titre de l\u2019axe horizontal", g: "labels" },
      { k: "yTitle", t: "text", label: "Titre de l\u2019axe vertical", g: "labels" },
      { k: "zeroX", t: "bool", label: "Axe horizontal d\xE9marrant \xE0 z\xE9ro" },
      { k: "zeroY", t: "bool", label: "Axe vertical d\xE9marrant \xE0 z\xE9ro" },
      { k: "maxR", t: "number", label: "Rayon maximal des bulles (px)", min: 3, max: 40 },
      { k: "showLabels", t: "bool", label: "Afficher le nom des points" },
      { k: "legend", t: "bool", label: "Afficher la l\xE9gende (groupes)" },
      { k: "legendPos", t: "select", label: "Position de la l\xE9gende", options: { bottom: "En bas", top: "En haut" } },
      { k: "decimals", t: "number", label: "D\xE9cimales des axes", min: 0, max: 4 },
      { k: "suffix", t: "text", label: "Unit\xE9 apr\xE8s la valeur (%, M\u20AC\u2026)" }
    ],
    data: {
      k: "rows",
      min: 1,
      cols: [{ k: "label", label: "Nom", t: "text" }, { k: "group", label: "Groupe", t: "text" }, { k: "x", label: "X", t: "number", def: 0 }, { k: "y", label: "Y", t: "number", def: 0 }, { k: "size", label: "Taille (facultatif)", t: "number", def: 0 }],
      item: () => ({ label: "", group: "", x: 0, y: 0, size: 0 })
    },
    dataHint: "Une ligne par point. Le groupe donne la couleur ; la taille (facultative) en fait une bulle.",
    render(o, W, env) {
      const pts = (o.rows || []).map((r) => ({ ...r, x: +r.x, y: +r.y, size: +r.size || 0, group: String(r.group || "").trim() })).filter((r) => isFinite(r.x) && isFinite(r.y));
      const groups = [...new Set(pts.map((p) => p.group))], capPx = pxOf(TYPE.caption.size), numPx = pxOf(TYPE.captionNum.size), suffix = o.suffix || "";
      const legend = o.legend && groups.filter(Boolean).length > 1, LG = legend ? layoutLegend(groups.filter(Boolean).map((g) => ({ name: g, color: autoColor("", groups.indexOf(g)) })), W) : null, legH = LG ? VIZ.legendGap + LG.h : 0;
      const H = heightOf(o, W, env, null, "3:2");
      const svg = s("svg", { width: W, height: H, viewBox: `0 0 ${W} ${H}`, style: { display: "block", overflow: "visible" } });
      if (!pts.length) {
        svg.append(s("text", { x: 0, y: capPx, "font-size": capPx }, t("Aucune donn\xE9e")));
        return { node: svg };
      }
      const hasSize = pts.some((p) => p.size > 0), maxSize = Math.max(...pts.map((p) => p.size), 1), rOf = (p) => hasSize ? Math.max(3, Math.sqrt(p.size / maxSize) * (+o.maxR || 14)) : VIZ.pointR * 1.4;
      const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
      let xl = Math.min(...xs), xh = Math.max(...xs), yl = Math.min(...ys), yh = Math.max(...ys);
      if (o.zeroX) xl = Math.min(0, xl);
      else {
        const pd = (xh - xl) * 0.06 || 1;
        xl -= pd;
        xh += pd;
      }
      if (o.zeroY) yl = Math.min(0, yl);
      else {
        const pd = (yh - yl) * 0.08 || 1;
        yl -= pd;
        yh += pd;
      }
      const X = ticks(xl, xh, Math.max(3, Math.floor(W / 80))), Y = ticks(yl, yh, 5);
      const f = (v, tk) => fmt(v, env.locale, Math.max(+o.decimals || 0, tk.step < 1 ? Math.min(3, Math.ceil(-Math.log10(tk.step))) : 0));
      const ml = Math.max(...Y.out.map((v) => mw(f(v, Y), 400, SANS, capPx))) + 8, mb = capPx * 1.4 + (o.xTitle ? capPx * 1.5 : 0) + 6, mt = o.yTitle ? capPx * 1.7 : 6;
      const x0 = ml, x1 = W - 6, y1 = H - legH - mb, y0 = mt;
      const sx = (v) => x0 + (v - X.lo) / (X.hi - X.lo) * (x1 - x0), sy = (v) => y1 - (v - Y.lo) / (Y.hi - Y.lo) * (y1 - y0);
      const grid = s("g");
      Y.out.forEach((v) => {
        const y = sy(v);
        grid.append(s("line", { x1: x0, x2: x1, y1: y, y2: y, stroke: "currentColor", "stroke-width": SW, "stroke-dasharray": "1 3", opacity: 0.55 }), s("text", { x: x0 - 6, y: y + 0.33 * capPx, "text-anchor": "end", "font-size": capPx }, f(v, Y)));
      });
      X.out.forEach((v) => {
        const x = sx(v);
        grid.append(s("line", { x1: x, x2: x, y1, y2: y1 + 4, stroke: "currentColor", "stroke-width": SW }), s("text", { x, y: y1 + 6 + capPx, "text-anchor": "middle", "font-size": capPx }, f(v, X)));
      });
      grid.append(s("line", { x1: x0, x2: x0, y1: y0, y2: y1, stroke: "currentColor", "stroke-width": SW }), s("line", { x1: x0, x2: x1, y1, y2: y1, stroke: "currentColor", "stroke-width": SW }));
      if (o.yTitle) grid.append(s("text", { x: 0, y: capPx, "font-size": capPx, "font-weight": 700 }, fitText(o.yTitle, 700, SANS, capPx, W, 0.7).text));
      if (o.xTitle) grid.append(s("text", { x: (x0 + x1) / 2, y: y1 + 6 + capPx * 2.6, "text-anchor": "middle", "font-size": capPx, "font-weight": 700 }, fitText(o.xTitle, 700, SANS, capPx, W - ml, 0.7).text));
      svg.append(grid);
      const dots = s("g"), labs = s("g");
      [...pts].sort((a2, b) => b.size - a2.size).forEach((p) => {
        const c2 = colorRef(autoColor("", groups.indexOf(p.group))), r = rOf(p), cx = sx(p.x), cy = sy(p.y);
        dots.append(s("circle", { cx, cy, r, fill: c2, "fill-opacity": hasSize ? 0.8 : 1, stroke: "currentColor", "stroke-width": SW }));
        if (o.showLabels && p.label) {
          const ft = fitText(p.label, 400, SANS, capPx, 90, 0.7);
          labs.append(s("text", { x: cx + r + 3, y: cy + 0.33 * ft.size, "font-size": ft.size, style: { paintOrder: "stroke", stroke: "#fff", strokeWidth: "3px", strokeLinejoin: "round" } }, ft.text));
        }
      });
      svg.append(dots, labs);
      if (LG) drawLegendWrap(svg, LG, H - LG.h);
      return { node: svg };
    }
  };

  // src/viz/survey.js
  var SQ3 = Math.sqrt(3);
  function hexDisc(n, d) {
    const R2 = Math.ceil(Math.sqrt(n / 2.6)) + 3, pts = [];
    for (let r = -R2; r <= R2; r++) for (let q = -R2; q <= R2; q++) {
      const x = d * (q + r / 2), y = d * SQ3 / 2 * r;
      pts.push([x, y, Math.round(Math.hypot(x, y) / d * 1e4) / 1e4, Math.atan2(y, x)]);
    }
    pts.sort((a2, b) => a2[2] - b[2] || a2[3] - b[3]);
    return pts.slice(0, n);
  }
  var survey_default = {
    label: "R\xE9sultats d\u2019enqu\xEAte",
    icon: "chart-circles",
    family: "part",
    boxed: true,
    heights: ["auto", "fixed", "fill"],
    defaults: () => ({
      perDot: 0,
      perRow: 0,
      groupLabels: true,
      legend: true,
      showPercent: true,
      decimals: 0,
      rows: [
        ["Female", "Very satisfied", 180],
        ["Female", "Satisfied", 210],
        ["Female", "Neutral", 110],
        ["Female", "Dissatisfied", 70],
        ["Female", "Very dissatisfied", 30],
        ["Male", "Very satisfied", 150],
        ["Male", "Satisfied", 190],
        ["Male", "Neutral", 120],
        ["Male", "Dissatisfied", 90],
        ["Male", "Very dissatisfied", 50]
      ].map(([group, answer, count2]) => ({ group, answer, count: count2, color: "" }))
    }),
    fields: [
      { k: "perDot", t: "number", label: "R\xE9pondants par point (0 = automatique)", min: 0, step: "any" },
      { k: "perRow", t: "number", label: "Groupes par ligne (0 = automatique)", min: 0, max: 6 },
      { k: "groupLabels", t: "bool", label: "Afficher le nom des groupes" },
      { k: "legend", t: "bool", label: "Afficher la l\xE9gende" },
      { k: "legendPos", t: "select", label: "Position de la l\xE9gende", options: { bottom: "En bas", top: "En haut" } },
      { k: "showPercent", t: "bool", label: "Pourcentages dans la l\xE9gende" },
      { k: "decimals", t: "number", label: "D\xE9cimales des pourcentages", min: 0, max: 4 }
    ],
    data: {
      k: "rows",
      min: 1,
      cols: [{ k: "group", label: "Groupe (facultatif)", t: "text" }, { k: "answer", label: "R\xE9ponse", t: "text" }, { k: "count", label: "R\xE9pondants", t: "number", def: 10 }, { k: "color", label: "Couleur de la r\xE9ponse", t: "color", auto: true, def: "" }],
      item: () => ({ group: "", answer: "", count: 10, color: "" })
    },
    dataHint: "Une ligne par groupe et par r\xE9ponse. L\u2019ordre des r\xE9ponses va du centre vers l\u2019ext\xE9rieur ; laissez le groupe vide pour un seul nuage.",
    render(o, W, env) {
      const rows = (o.rows || []).map((r) => ({ group: String(r.group || "").trim(), answer: String(r.answer || "").trim(), count: Math.max(0, +r.count || 0), color: r.color || "" })).filter((r) => r.answer && r.count > 0);
      const capPx = pxOf(TYPE.caption.size);
      const mk = (H2) => s("svg", { width: W, height: H2, viewBox: `0 0 ${W} ${H2}`, style: { display: "block", overflow: "visible" } });
      if (!rows.length) {
        const v = mk(60);
        v.append(s("text", { x: 0, y: capPx, "font-size": capPx }, t("Aucune donn\xE9e")));
        return { node: v };
      }
      const answers = [...new Set(rows.map((r) => r.answer))], groups = [...new Set(rows.map((r) => r.group))];
      const colorOf = (a2) => autoColor((rows.find((r) => r.answer === a2 && r.color) || {}).color, answers.indexOf(a2));
      const sums = groups.map((g) => rows.filter((r) => r.group === g).reduce((a2, r) => a2 + r.count, 0)), maxTotal = Math.max(...sums);
      const perDot = +o.perDot > 0 ? +o.perDot : Math.max(1, Math.ceil(maxTotal / 420));
      const nDots = (g, a2) => {
        const r = rows.find((x) => x.group === g && x.answer === a2);
        return r ? Math.max(1, Math.round(r.count / perDot)) : 0;
      };
      const counts = groups.map((g) => answers.map((a2) => nDots(g, a2))), totals = counts.map((c2) => c2.reduce((a2, b) => a2 + b, 0)), nMax = Math.max(...totals);
      const per = +o.perRow > 0 ? Math.min(+o.perRow, groups.length) : groups.length === 1 ? 1 : Math.min(groups.length, W >= 420 ? 3 : 2), gap = 12;
      const cw = (W - gap * (per - 1)) / per, Rcell = cw / 2, d = Rcell * Math.sqrt(2 * Math.PI / (SQ3 * nMax)) * 0.97, dotR = d / 2 * 0.86;
      const nameH = o.groupLabels && groups.some(Boolean) ? Math.ceil(capPx * 1.5) + 6 : 0, rowsN = Math.ceil(groups.length / per);
      const clusterR = Math.min(Rcell, d * Math.sqrt(nMax * SQ3 / (2 * Math.PI)) + d), rowH = nameH + clusterR * 2 + 6;
      const all = answers.map((a2) => rows.filter((r) => r.answer === a2).reduce((x, r) => x + r.count, 0)), tot = all.reduce((a2, b) => a2 + b, 0);
      const LG = o.legend ? layoutLegend(answers.map((a2, i) => ({ name: o.showPercent ? `${a2} \xB7 ${fmt(all[i] / tot * 100, env.locale, o.decimals)} %` : a2, color: colorOf(a2) })), W) : null, legH = LG ? VIZ.legendGap + LG.h : 0, H = round3(rowsN * rowH + (rowsN - 1) * 6 + legH);
      const svg = mk(H);
      groups.forEach((g, gi) => {
        const col = gi % per, row = Math.floor(gi / per), cx = col * (cw + gap) + Rcell, y0 = row * (rowH + 6);
        if (nameH && g) svg.append(s("text", { x: cx, y: y0 + capPx, "text-anchor": "middle", "font-size": capPx, "font-weight": 700 }, fitText(g, 700, SANS, capPx, cw, 0.7).text));
        const cy = y0 + nameH + clusterR, pts = hexDisc(totals[gi], d), gEl = s("g");
        let i = 0;
        answers.forEach((a2, ai) => {
          const c2 = colorRef(colorOf(a2));
          for (let k = 0; k < counts[gi][ai] && i < pts.length; k++, i++) gEl.append(s("circle", { cx: cx + pts[i][0], cy: cy + pts[i][1], r: dotR, fill: c2 }));
        });
        svg.append(gEl);
      });
      if (LG) drawLegendWrap(svg, LG, H - LG.h);
      return { node: svg };
    }
  };

  // src/viz/waffle.js
  var MARKS = { none: "Aucun", cross: "Croix", dot: "Point", check: "Coche", ...Object.fromEntries(Object.entries(ICONS).map(([k, v]) => ["icon:" + k, `Ic\xF4ne \xB7 ${v.label}`])) };
  var waffle_default = {
    label: "Grille de pourcentage (waffle)",
    icon: "layout-grid",
    family: "part",
    sideShare: 65,
    defaults: () => ({
      cols: 10,
      gridRows: 10,
      total: 100,
      shape: "rounded",
      gap: 3,
      legend: false,
      rows: [{ label: t("Logements endommag\xE9s ou d\xE9truits"), value: 14, color: "blue", mark: "cross", markColor: "yellow" }, { label: t("Autres logements"), value: 86, color: "white", mark: "none", markColor: "yellow" }]
    }),
    fields: [
      { k: "cols", t: "number", label: "Cases par ligne", min: 1, max: 40 },
      { k: "gridRows", t: "number", label: "Nombre de lignes", min: 1, max: 40 },
      { k: "total", t: "number", label: "Valeur de la grille enti\xE8re (0 = somme des valeurs)", min: 0, step: "any" },
      { k: "shape", t: "select", label: "Forme des cases", options: { square: "Carr\xE9e", rounded: "Arrondie", circle: "Ronde" } },
      { k: "gap", t: "number", label: "Espace entre les cases (px)", min: 0, max: 12 },
      { k: "legend", t: "bool", label: "Afficher la l\xE9gende" },
      { k: "legendPos", t: "select", label: "Position de la l\xE9gende", options: { bottom: "En bas", top: "En haut" } }
    ],
    /* chaque catégorie a sa couleur et son repère (croix, point, coche ou une icône), choisis dans le tableau */
    data: {
      k: "rows",
      min: 1,
      cols: [
        { k: "label", label: "Libell\xE9", t: "text" },
        { k: "value", label: "Valeur", t: "number", def: 10 },
        { k: "color", label: "Couleur", t: "color", def: "blue" },
        { k: "mark", label: "Rep\xE8re", t: "select", def: "none", options: (root) => ({ ...MARKS, ...customChoices(root) }), icons: true },
        { k: "markColor", label: "Couleur du rep\xE8re", t: "color", def: "yellow" }
      ],
      item: () => ({ label: "", value: 10, color: "blue", mark: "none", markColor: "yellow" })
    },
    dataHint: "Une ligne par cat\xE9gorie : les cases se remplissent dans cet ordre, ligne par ligne ; une cat\xE9gorie blanche reste une case vide. Le rep\xE8re se choisit par cat\xE9gorie.",
    render(o, W, env) {
      const cols = Math.max(1, Math.round(+o.cols) || 10), rowsN = Math.max(1, Math.round(+o.gridRows) || 10), n = cols * rowsN, gap = Math.max(0, +o.gap || 0);
      const cats = (o.rows || []).map((r) => ({ label: String(r.label || ""), value: Math.max(0, +r.value || 0), color: r.color || "blue", mark: r.mark || "none", markColor: r.markColor || "yellow" }));
      const sum2 = cats.reduce((a2, c2) => a2 + c2.value, 0), total = +o.total > 0 ? +o.total : sum2 || 1;
      const raw = cats.map((c2) => c2.value / total * n), cnt = raw.map(Math.floor);
      let left2 = Math.min(n, Math.round(raw.reduce((a2, b) => a2 + b, 0))) - cnt.reduce((a2, b) => a2 + b, 0);
      raw.map((v, i) => [v - Math.floor(v), i]).sort((a2, b) => b[0] - a2[0]).forEach(([, i]) => {
        if (left2 > 0) {
          cnt[i]++;
          left2--;
        }
      });
      const size = Math.max(4, (W - gap * (cols - 1)) / cols), gridH = rowsN * size + (rowsN - 1) * gap;
      const LG = o.legend && cats.length > 1 ? layoutLegend(cats.map((c2) => ({ name: c2.label, color: c2.color })), W) : null, legH = LG ? VIZ.legendGap + LG.h : 0, H = Math.ceil(gridH + legH);
      const svg = s("svg", { width: W, height: H, viewBox: `0 0 ${W} ${H}`, style: { display: "block", overflow: "visible" } });
      const owner = [];
      cnt.forEach((c2, i) => {
        for (let k = 0; k < c2; k++) owner.push(i);
      });
      const sw = SW * 1.5, rx = { square: 0.5, rounded: Math.min(VIZ.barRadius, size / 3), circle: size / 2 }[o.shape] ?? VIZ.barRadius, inset = size * 0.28;
      const mark = (m2, x, y, mc) => {
        if (m2 === "cross") return s("path", { d: `M${x + inset},${y + inset}L${x + size - inset},${y + size - inset}M${x + size - inset},${y + inset}L${x + inset},${y + size - inset}`, fill: "none", stroke: mc, "stroke-width": Math.max(1, size * 0.1), "stroke-linecap": "round" });
        if (m2 === "dot") return s("circle", { cx: x + size / 2, cy: y + size / 2, r: size * 0.17, fill: mc });
        if (m2 === "check") return s("path", { d: `M${x + size * 0.27},${y + size * 0.52}L${x + size * 0.44},${y + size * 0.68}L${x + size * 0.74},${y + size * 0.33}`, fill: "none", stroke: mc, "stroke-width": Math.max(1, size * 0.1), "stroke-linecap": "round", "stroke-linejoin": "round" });
        if (m2.startsWith("custom:")) return iconNode(o, m2, x + size * 0.18, y + size * 0.18, size * 0.64, size * 0.64, mc);
        const ic = m2.startsWith("icon:") && ICONS[m2.slice(5)];
        if (!ic) return null;
        const k = size * 0.64 / 24;
        return s("path", { d: ic.d, fill: "none", stroke: mc, "stroke-width": Math.max(0.8, size * 0.07) / k, "stroke-linecap": "round", "stroke-linejoin": "round", transform: `translate(${x + size * 0.18} ${y + size * 0.18}) scale(${k})` });
      };
      for (let i = 0; i < n; i++) {
        const x = i % cols * (size + gap), y = Math.floor(i / cols) * (size + gap), on = i < owner.length, c2 = on ? cats[owner[i]] : null;
        svg.append(s("rect", { x: x + sw / 2, y: y + sw / 2, width: size - sw, height: size - sw, rx, fill: on ? colorRef(c2.color) : "none", stroke: on ? "currentColor" : colorRef(cats[0] ? cats[0].color : "blue"), "stroke-width": sw }));
        if (on && c2.mark !== "none") {
          const m2 = mark(c2.mark, x, y, colorRef(c2.markColor));
          if (m2) svg.append(m2);
        }
      }
      if (LG) drawLegendWrap(svg, LG, gridH + VIZ.legendGap);
      return { node: svg };
    }
  };

  // src/viz/timeline.js
  var R = 5;
  var timeline_default = {
    label: "Frise chronologique",
    icon: "timeline",
    family: "trend",
    heights: ["auto", "fixed", "fill"],
    defaults: () => ({
      orientation: "vertical",
      alternate: false,
      showDates: true,
      tail: "dashed",
      rows: [["2021", "Launch", "The programme is announced."], ["2022", "First results", "Early adopters report a clear impact on their daily work."], ["2023", "Extension", "Three new member states join."], ["2025", "Review", "An independent evaluation concludes the first phase."]].map(([date, title, text]) => ({ date, title, text, color: "blue" }))
    }),
    fields: [
      { k: "orientation", t: "select", label: "Orientation", options: { vertical: "Verticale", horizontal: "Horizontale" } },
      { k: "alternate", t: "bool", label: "Alterner les \xE9v\xE9nements de part et d\u2019autre de la ligne" },
      { k: "showDates", t: "bool", label: "Afficher les dates" },
      { k: "tail", t: "select", label: "Extr\xE9mit\xE9s de la ligne", options: { dashed: "Prolong\xE9es, en pointill\xE9s", solid: "Prolong\xE9es, en trait plein", none: "Aucune : la ligne commence au premier cercle" } }
    ],
    data: {
      k: "rows",
      min: 1,
      cols: [{ k: "date", label: "Date", t: "text" }, { k: "title", label: "Titre", t: "text", ml: true }, { k: "text", label: "Texte", t: "text", ml: true }, { k: "color", label: "Couleur", t: "color", def: "blue" }],
      item: () => ({ date: "", title: "", text: "", color: "blue" })
    },
    dataHint: "Une ligne par \xE9v\xE9nement, dans l\u2019ordre d\u2019affichage. Entr\xE9e = retour \xE0 la ligne dans le titre et le texte.",
    render(o, W, env) {
      const items = (o.rows || []).filter((r) => r.date || r.title || r.text), capPx = pxOf(TYPE.caption.size), lh = TYPE.caption.lh, numPx = pxOf(TYPE.captionNum.size);
      const showDates = o.showDates !== false, horizontal = o.orientation === "horizontal";
      const mk = (H2) => s("svg", { width: W, height: H2, viewBox: `0 0 ${W} ${H2}`, style: { display: "block", overflow: "visible" } });
      if (!items.length) {
        const v = mk(40);
        v.append(s("text", { x: 0, y: capPx, "font-size": capPx }, t("Aucune donn\xE9e")));
        return { node: v };
      }
      const dateNode = (txt, x, y, anchor) => s("text", { x, y: y + lh / 2 + 0.33 * numPx, "text-anchor": anchor, "font-size": numPx, "font-weight": 700, style: { fontFamily: "var(--t-captionNum-family)" } }, txt);
      const dot2 = (cx, cy, color) => s("circle", { cx, cy, r: R, fill: colorRef(color || "blue"), stroke: "currentColor", "stroke-width": SW });
      const block = (it, maxW) => ({ lines: textLines(it.title || "", it.text || "", capPx, maxW), dateH: showDates && it.date ? lh : 0 });
      const stretch = (natural2) => o.hmode === "fixed" || o.hmode === "fill" || o.hmode === "match" ? Math.max(0, heightOf(o, W, env, natural2) - natural2) : 0;
      const tail = o.tail || "dashed", TL = 24;
      const line = (svg2, x1, y1, x2, y2, dash) => svg2.append(s("line", { x1, y1, x2, y2, stroke: "currentColor", "stroke-width": SW, "stroke-dasharray": dash || null }));
      const tailSeg = (svg2, xa, ya, xb, yb) => {
        if (Math.hypot(xb - xa, yb - ya) < 1) return;
        if (tail === "solid") {
          line(svg2, xa, ya, xb, yb);
          return;
        }
        const xm = xa + (xb - xa) * 0.35, ym = ya + (yb - ya) * 0.35;
        line(svg2, xa, ya, xm, ym);
        line(svg2, xm, ym, xb, yb, "3 3");
      };
      if (!horizontal) {
        const alt2 = o.alternate && W >= 240, lineX = alt2 ? W / 2 : R + 1, side = alt2 ? W / 2 - R - 12 : W - (2 * R + 14) - 1, top = tail === "none" ? 0 : TL;
        const laid = [];
        const end = { l: 0, r: 0 };
        let prevY = -1e9;
        items.forEach((it, i) => {
          const left2 = alt2 && i % 2 === 1, b = block(it, side), h2 = b.dateH + b.lines.length * lh, k = left2 ? "l" : "r";
          const y = Math.max(end[k], prevY + lh * 1.6);
          end[k] = y + h2 + 12;
          prevY = y;
          laid.push({ it, b, left: left2, y, h: h2 });
        });
        const n2 = laid.length, natural2 = Math.max(...laid.map((l) => l.y + l.h)) + top, extra2 = stretch(natural2);
        const yOf = (l, i) => l.y + top + (n2 > 1 ? extra2 * i / (n2 - 1) : 0), d0 = yOf(laid[0], 0) + lh / 2, d1 = yOf(laid[n2 - 1], n2 - 1) + lh / 2;
        const H2 = Math.max(natural2 + extra2, tail === "none" ? 0 : d1 + TL), svg2 = mk(H2);
        if (n2 > 1) line(svg2, lineX, d0, lineX, d1);
        if (tail !== "none") {
          tailSeg(svg2, lineX, d0 - R, lineX, 0);
          tailSeg(svg2, lineX, d1 + R, lineX, d1 + TL);
        }
        laid.forEach((l, i) => {
          const y = yOf(l, i), x = l.left ? lineX - R - 10 : lineX + R + 10, anchor = l.left ? "end" : "start";
          svg2.append(dot2(lineX, y + lh / 2, l.it.color));
          if (l.b.dateH) svg2.append(dateNode(l.it.date, x, y, anchor));
          svg2.append(drawLines(l.b.lines, x, y + l.b.dateH, lh, capPx, anchor));
        });
        laid.forEach((l, i) => svg2.append(reorderHit(env, "rows", (o.rows || []).indexOf(l.it), "y", 0, yOf(l, i) - 4, W, Math.max(l.h, lh) + 8)));
        return { node: svg2 };
      }
      const n = items.length, none = tail === "none" && n > 1;
      const xs = items.map((_, i) => none ? R + 1 + i * (W - 2 * R - 2) / (n - 1) : W / n * (i + 0.5));
      const pitch = none ? (W - 2 * R - 2) / (n - 1) : W / n, alt = o.alternate && n > 1, tw = Math.max(36, (alt ? 2 * pitch : pitch) - 10);
      const anchorAt = (i) => none && i === 0 ? "start" : none && i === n - 1 ? "end" : "middle", tx = (i, a2) => a2 === "start" ? 0 : a2 === "end" ? W : xs[i];
      const twAt = (i) => anchorAt(i) !== "middle" ? Math.max(36, Math.min(tw, W)) : Math.max(36, Math.min(tw, 2 * Math.min(xs[i], W - xs[i]) - 4));
      const blocks = items.map((it, i) => block(it, twAt(i))), hOf = (b) => b.dateH + b.lines.length * lh;
      const up = alt ? Math.max(0, ...blocks.filter((_, i) => i % 2 === 1).map(hOf)) : showDates ? lh : 0, down = Math.max(0, ...blocks.filter((_, i) => !alt || i % 2 === 0).map((b) => alt ? hOf(b) : b.lines.length * lh));
      const lineY = up + (up ? 10 : 0) + R + 1, natural = lineY + R + 8 + down, extra = stretch(natural), H = natural + extra;
      const svg = mk(H);
      if (n > 1) line(svg, xs[0], lineY, xs[n - 1], lineY);
      if (tail !== "none") {
        tailSeg(svg, xs[0] - R, lineY, 0, lineY);
        tailSeg(svg, xs[n - 1] + R, lineY, W, lineY);
      }
      items.forEach((it, i) => {
        const b = blocks[i], above = alt && i % 2 === 1, an = anchorAt(i), x = tx(i, an);
        svg.append(dot2(xs[i], lineY, it.color));
        if (alt) {
          const y0 = above ? lineY - R - 8 - hOf(b) : lineY + R + 8;
          if (b.dateH) svg.append(dateNode(it.date, x, y0, an));
          svg.append(drawLines(b.lines, x, y0 + b.dateH, lh, capPx, an));
        } else {
          if (b.dateH) svg.append(dateNode(it.date, x, lineY - R - 8 - lh, an));
          svg.append(drawLines(b.lines, x, lineY + R + 8, lh, capPx, an));
        }
      });
      items.forEach((it, i) => svg.append(reorderHit(env, "rows", (o.rows || []).indexOf(it), "x", xs[i] - pitch / 2, 0, pitch, H)));
      return { node: svg };
    }
  };

  // src/figure.js
  var FIGURE_DEFAULTS = () => ({
    value: "5 000",
    icon: "none",
    iconStyle: "plain",
    text: "Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim"
  });
  var FIGURE_FIELDS = [
    { k: "value", t: "text", rich: true, label: "Chiffre (texte libre : \xAB 5 000 \xBB, \xAB 64 % \xBB\u2026)" },
    { k: "icon", t: "select", label: "Ic\xF4ne devant le chiffre", options: () => ({ none: "Aucune", ...ICON_OPTIONS, ...customChoices() }), icons: true },
    { k: "iconStyle", t: "select", label: "Style de l\u2019ic\xF4ne", options: { plain: "Pictogramme seul", circle: "Dans une pastille" } },
    { k: "text", t: "area", label: "Texte" },
    { k: "bar", t: "number", label: "Barre de progression sous le chiffre (% ; 0 = pas de barre)", min: 0, max: 100 },
    {
      k: "more",
      t: "list",
      label: "Autres chiffres \xE0 c\xF4t\xE9 (jusqu\u2019\xE0 2)",
      min: 0,
      max: 2,
      item: () => ({ value: "50 %", text: "Lorem ipsum", bar: 0 }),
      fields: [{ k: "value", t: "text", rich: true, label: "Chiffre" }, { k: "text", t: "text", rich: true, label: "Texte" }, { k: "bar", t: "number", label: "Barre de progression (% ; 0 = pas de barre)", min: 0, max: 100 }]
    },
    { k: "barColor", t: "color", label: "Couleur de la barre", def: "yellow" },
    { k: "barRest", t: "color", label: "Couleur du reste de la barre", def: "tint-blue" },
    { k: "headText", t: "text", label: "En-t\xEAte (petites capitales, ex. \xAB Sous occupation \xBB)" },
    { k: "headIcon", t: "select", label: "Ic\xF4ne de l\u2019en-t\xEAte", options: () => ({ none: "Aucune", ...ICON_OPTIONS, ...customChoices() }), icons: true }
  ];
  function figureIcon(key, size, circle) {
    const custom3 = String(key || "").startsWith("custom:"), ic = ICONS[key];
    if (!ic && !custom3) return null;
    const G = circle ? size * 0.58 : size * 0.82, k = G / 24, o = (size - G) / 2;
    return s(
      "svg",
      { width: size, height: size, viewBox: `0 0 ${size} ${size}`, class: "vi-ic fg-ic" },
      circle ? s("circle", { cx: size / 2, cy: size / 2, r: size / 2 - SW / 2, fill: "none", stroke: "currentColor", "stroke-width": SW }) : null,
      custom3 ? iconNode({}, key, o, o, G, G, "blue") : s("path", { d: ic.d, fill: "none", stroke: "currentColor", "stroke-width": SW / k, "stroke-linecap": "round", "stroke-linejoin": "round", transform: `translate(${o} ${o}) scale(${k})` })
    );
  }
  function progressBar(pct, W, o) {
    const H = 15, p = Math.max(0, Math.min(100, +pct || 0)), w = Math.max(10, W), x = SW / 2, iw = w - SW, r = 4.5, fw = iw * p / 100;
    const hh = H - SW, rr = Math.min(r, fw / 2), fill2 = colorRef(o.barColor || "yellow");
    const part = p >= 100 ? s("rect", { x, y: x, width: iw, height: hh, rx: r, fill: fill2 }) : s("path", { d: `M${x + rr} ${x}H${x + fw}V${x + hh}H${x + rr}A${rr} ${rr} 0 0 1 ${x} ${x + hh - rr}V${x + rr}A${rr} ${rr} 0 0 1 ${x + rr} ${x}Z`, fill: fill2 });
    return s(
      "svg",
      { width: w, height: H, viewBox: `0 0 ${w} ${H}`, class: "fg-bar", style: { display: "block", marginTop: "9px" } },
      s("rect", { x, y: x, width: iw, height: hh, rx: r, fill: colorRef(o.barRest || "tint-blue") }),
      p > 0 ? part : null,
      s("rect", { x, y: x, width: iw, height: H - SW, rx: r, fill: "none", stroke: "var(--c-blue)", "stroke-width": SW })
    );
  }
  function renderFigure(o, W, align) {
    const more = Array.isArray(o.more) ? o.more : [], headText = String(o.headText || "").trim(), headIcon = o.headIcon && o.headIcon !== "none";
    if (!more.length && !headText && !headIcon && !(+o.bar > 0)) return oneFigure(o, W, align, o);
    const gap = 18, n = 1 + more.length, w = ((W || 9999) - gap * (n - 1)) / n;
    const row = el("div", { class: "fg-row", style: { gap: gap + "px" } }, ...[o, ...more].map((it) => el("div", { class: "fg-cell", style: { width: w + "px" } }, oneFigure(it, w, align, o))));
    if (!headText && !headIcon) return row;
    const ic = headIcon ? figureIcon(o.headIcon, 54, false) : null;
    return el(
      "div",
      { class: "fg-all" },
      el("div", { class: "fg-over" }, ic, headText ? el("span", { textContent: headText.toUpperCase() }) : null),
      row
    );
  }
  function oneFigure(o, W, align, g) {
    const base0 = pxOf(TYPE.figure.size), base = base0 * (+o.scale || 1), lh = TYPE.figure.lh, icon = o.icon && o.icon !== "none" ? figureIcon(o.icon, lh, o.iconStyle === "circle") : null;
    const avail = (W || 9999) - (icon ? lh + VIZ.iconGap : 0) - 1;
    const fs = fitSize(stripMk(o.value), TYPE.figure.weight, SERIF, base, avail, 0.4);
    const jc = { center: "center", right: "flex-end" }[align] || "flex-start";
    const head = el(
      "div",
      { class: "fg-head", style: { justifyContent: jc } },
      icon,
      el("div", { class: "vf-value", innerHTML: inlineMk(o.value), style: fs !== base0 ? { fontSize: fs + "px", lineHeight: 1.1, whiteSpace: "nowrap" } : {} })
    );
    return el(
      "div",
      { class: "fg", style: align && align !== "left" ? { textAlign: align } : {} },
      head,
      o.text && o.text.trim() ? el("div", { class: "vf-text", innerHTML: inlineMk(o.text) }) : null,
      +o.bar > 0 ? progressBar(o.bar, W, g) : null
    );
  }

  // src/viz/index.js
  var VIZ_TYPES = { donut: donut_default, bars: bars_default, hbars: hbars_default, line: line_default, timeline: timeline_default, scatter: scatter_default, survey: survey_default, waffle: waffle_default, sunburst: sunburst_default, bubbles: bubbles_default, treemap: treemap_default, sankey: sankey_default, ...pictoTypes, icons: iconlist_default };
  var VIZ_OPTIONS = Object.fromEntries(Object.entries(VIZ_TYPES).map(([k, v]) => [k, v.label]));
  var VIZ_FAMILIES = { compare: "Comparaison", part: "Proportions", trend: "\xC9volution", hier: "Hi\xE9rarchies", flow: "Flux", picto: "Pictogrammes", list: "Listes" };
  var newSide = (kind) => ({ pos: "none", value: "{pct}", text: "", share: (VIZ_TYPES[kind] || {}).sideShare || 60, align: "top", scale: "1.5" });
  var newViz = (kind = "bars") => ({ kind, opts: VIZ_TYPES[kind].defaults(), head: { title: "", source: "" }, side: newSide(kind) });
  function switchKind(viz, k) {
    const nv = newViz(k), o = viz.opts || {}, n = nv.opts, dk = (VIZ_TYPES[viz.kind] || {}).data, nk = VIZ_TYPES[k].data;
    nv.head = viz.head || nv.head;
    if (viz.side) nv.side = { ...nv.side, ...viz.side, share: viz.side.share };
    if (o.rows && o.series && n.rows && n.series) {
      n.rows = o.rows;
      n.series = o.series;
    }
    if (dk && nk && dk.k === nk.k && dk.cols.map((c2) => c2.k).join() === nk.cols.map((c2) => c2.k).join()) n[nk.k] = o[dk.k];
    return nv;
  }
  function boxed(t2, o, W, env, node) {
    if (!t2.boxed || !node || o.hmode !== "fixed" && o.hmode !== "fill" && o.hmode !== "match") return node;
    const natural = +node.getAttribute("height") || 0, H = Math.max(natural, heightOf(o, W, env, natural));
    if (H <= natural + 0.5) return node;
    const box = el("div", { class: "viz-box", style: { height: H + "px", display: "flex", alignItems: { center: "center", bottom: "flex-end" }[o.valign] || "flex-start" } }, node);
    box.dataset.vizH = H;
    return box;
  }
  function withHead(viz, node) {
    const hd = viz.head || {};
    if (!node || !(hd.title || "").trim() && !(hd.source || "").trim()) return node;
    const wrap = el("div", { class: "viz-wrap" });
    if ((hd.title || "").trim()) {
      const T = el("div", { class: "viz-title" });
      String(hd.title).replace(/\r\n?/g, "\n").split("\n").filter((l) => l.trim()).forEach((l) => {
        const m2 = l.trim().match(/^(#{1,5})\s+(.*)$/);
        T.append(el("div", { class: m2 ? "p-" + ["h1", "h2", "cap", "fig", "figsm"][m2[1].length - 1] : "", innerHTML: inlineMk(m2 ? m2[2] : l.trim()) }));
      });
      wrap.append(T);
    }
    wrap.append(node);
    if ((hd.source || "").trim()) wrap.append(el("div", { class: "viz-source", innerHTML: inlineMk(hd.source) }));
    return wrap;
  }
  function sideTokens(o, env) {
    const items = o.rows || o.segments || o.items || [], num2 = (r) => r.value != null ? +r.value : Array.isArray(r.v) ? +r.v[0] : NaN;
    const vals = items.map(num2).filter(Number.isFinite), sum2 = vals.reduce((a2, b) => a2 + b, 0), total = +o.total > 0 ? +o.total : sum2, first = items[0] || {}, v0 = Number.isFinite(num2(first)) ? num2(first) : 0;
    const f = (x) => fmt(x, env.locale, 0);
    return { pct: `${f(total ? v0 / total * 100 : 0)}%`, value: f(v0), total: f(total), label: String(first.label || first.title || first.name || first.text || "") };
  }
  var fill = (str, tk) => String(str ?? "").replace(/\{(pct|value|total|label)\}/g, (_, k) => tk ? tk[k] : "");
  var SIDE_FIELDS = [
    { k: "pos", t: "select", label: "Chiffre \xE0 c\xF4t\xE9", options: { none: "Aucun", right: "\xC0 droite", left: "\xC0 gauche", top: "Au-dessus" } },
    { k: "value", t: "text", rich: true, label: "Chiffre ({pct} = part de la 1re donn\xE9e)" },
    { k: "text", t: "text", rich: true, label: "Texte sous le chiffre (vide = libell\xE9 de la 1re donn\xE9e)" },
    { k: "share", t: "number", label: "Largeur du contenu (% de la largeur)", min: 25, max: 80 },
    { k: "scale", t: "select", label: "Taille du chiffre", options: { 1: "Normal", 1.5: "Grand", 2: "Tr\xE8s grand" } },
    { k: "align", t: "select", label: "Position verticale du chiffre", options: { top: "En haut", center: "Centr\xE9", bottom: "En bas" } }
  ];
  var newColSide = () => ({ pos: "none", value: "14 %", text: "", share: 60, align: "top", scale: "1.5" });
  function composeSide(sd, W, env, tk, core) {
    if (!sd || sd.pos !== "right" && sd.pos !== "left" && sd.pos !== "top") return core(W);
    if (sd.pos === "top") {
      const r2 = core(W);
      if (!r2) return r2;
      const fig2 = renderFigure({ value: fill(sd.value, tk), icon: "none", scale: +sd.scale || 1, text: fill((sd.text || "").trim() || "{label}", tk) }, W, "left");
      return { ...r2, node: el("div", { class: "viz-side-top", style: { width: W + "px", display: "flex", flexDirection: "column", gap: "12px" } }, fig2, r2.node) };
    }
    const GAPF = 18, wv = Math.round(W * Math.max(25, Math.min(80, +sd.share || 60)) / 100), wf = Math.max(40, W - wv - GAPF), r = core(wv);
    if (!r) return r;
    const fig = renderFigure({ value: fill(sd.value, tk), icon: "none", scale: +sd.scale || 1, text: fill((sd.text || "").trim() || "{label}", tk) }, wf, "left");
    const align = { center: "center", bottom: "flex-end" }[sd.align] || "flex-start";
    const box = el(
      "div",
      { class: "viz-side", style: { display: "flex", width: W + "px", gap: GAPF + "px", alignItems: align, flexDirection: sd.pos === "left" ? "row-reverse" : "row" } },
      el("div", { style: { width: wv + "px", flex: "none" } }, r.node),
      el("div", { style: { width: wf + "px", flex: "none" } }, fig)
    );
    return { ...r, node: box };
  }
  var composed = (viz, W, env, core) => composeSide(viz.side, W, env, viz.side && viz.side.pos !== "none" ? sideTokens(viz.opts || {}, env) : null, core);
  function legendTop(node, o) {
    if (!node || !o || o.legendPos !== "top" || !node.querySelector) return node;
    const lg = [...node.children].find((c2) => c2.classList && c2.classList.contains("lg"));
    if (!lg) return node;
    const y = +lg.dataset.y, reserve = +lg.dataset.reserve || 0, body = s("g", { transform: `translate(0 ${reserve})` });
    [...node.childNodes].forEach((c2) => {
      if (c2 !== lg) body.append(c2);
    });
    lg.setAttribute("transform", `translate(0 ${-y})`);
    node.append(body, lg);
    return node;
  }
  function renderViz(viz, width, env) {
    const t2 = viz && VIZ_TYPES[viz.kind];
    if (!t2) return null;
    try {
      const o = viz.opts || t2.defaults(), e = env || {};
      return withHead(viz, composed(viz, width, e, (w) => {
        const r = t2.render(o, w, e);
        r.node = legendTop(r.node, o);
        return { ...r, node: boxed(t2, o, w, e, r.node) };
      }).node);
    } catch (e) {
      console.error("dataviz", viz.kind, e);
      return null;
    }
  }
  function renderVizFull(viz, width, env) {
    const t2 = viz && VIZ_TYPES[viz.kind];
    if (!t2) return null;
    try {
      const o = viz.opts || t2.defaults(), e = env || {}, r = composed(viz, width, e, (w) => {
        const q = t2.render(o, w, e);
        q.node = legendTop(q.node, o);
        return { ...q, node: boxed(t2, o, w, e, q.node) };
      });
      return { ...r, node: withHead(viz, r.node), wrapped: !!(viz.head && (viz.head.title || viz.head.source)) };
    } catch (e) {
      console.error("dataviz", viz.kind, e);
      return null;
    }
  }

  // src/state.js
  var SCHEMA = 1;
  var _id = 0;
  var uid = (p) => `${p}${Date.now().toString(36)}${(_id++).toString(36)}`;
  var IMAGE_RATIOS = { "16:9": 16 / 9, "4:3": 4 / 3, "1:1": 1, "3:4": 3 / 4 };
  var COL_TYPES = { text: "Texte", image: "Image", figure: "Chiffre cl\xE9", card: "Carte", viz: "Dataviz" };
  var LOGO_VARIANTS = { default: "D\xE9faut", mono: "Mono", white: "Blanc (white)", negative: "N\xE9gatif" };
  var newHeaderImage = (n = 1) => ({ id: uid("img"), name: `${t("Image")} ${n}`, src: null });
  var VALIGNS = { top: "align-box-top-center", center: "align-box-center-middle", bottom: "align-box-bottom-center" };
  var ALIGNS = { left: "align-left", center: "align-center", right: "align-right", justify: "align-justified" };
  var LOCALES = { "en-GB": "EN \u2014 1,227.5", "fr-BE": "FR \u2014 1 227,5", "de-DE": "DE \u2014 1.227,5", "nl-BE": "NL \u2014 1.227,5", "es-ES": "ES \u2014 1227,5", "it-IT": "IT \u2014 1.227,5" };
  var newCol = (type = "text") => ({
    type,
    text: type === "text" ? t("Votre texte ici. Une ligne = un paragraphe, **gras** avec les ast\xE9risques.") : "",
    src: null,
    ratio: "4:3",
    caption: "",
    valign: "top",
    // alignement vertical du contenu dans sa colonne : top | center | bottom
    align: "left",
    // alignement du texte : left | center | right | justify
    viz: type === "viz" ? newViz("bars") : null,
    // { kind, opts } — voir viz/index.js
    figure: type === "figure" ? FIGURE_DEFAULTS() : null,
    card: type === "card" ? newCard() : null,
    // carte : options + contenu (voir cardmodel.js)   // chiffre clé : { value, icon, iconStyle, text }
    imgMode: "ratio",
    imgW: 100,
    imgH: 150,
    imgFit: "cover",
    natural: null,
    // image : ratio | fit (proportions de l'image) | custom (largeur en %, hauteur en px)
    stroke: false,
    strokeColor: "text",
    fillColor: "none"
    // contour et fond (également sur les sous-sections et sections) ; fond : 'none', 'white', une couleur ou 'tint-<couleur>'
  });
  var newSub = (layout = "1") => ({
    id: uid("sub"),
    title: t("Sous-section"),
    showTitle: true,
    layout,
    cols: Array.from({ length: GRID.layouts[layout].spans.length }, () => newCol("text"))
  });
  var newSection = (page = "recto") => ({
    id: uid("sec"),
    title: t("Titre de section"),
    showTitle: true,
    page,
    bg: "none",
    subs: [newSub("1")]
  });
  function blankDoc() {
    const d = defaultDoc();
    d.sections = [newSection("recto")];
    return d;
  }
  function defaultDoc() {
    const lorem = "Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam.";
    const short = "Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna.";
    const list = "- Lorem ipsum dolor sit amet\n- Consectetuer adipiscing elit\n- Sed diam nonummy nibh euismod";
    const viz = (kind, opts, extra) => {
      const v = newViz(kind);
      return { ...newCol("viz"), viz: { ...v, opts: { ...v.opts, ...opts || {} } }, ...extra || {} };
    };
    const fig = (value2, icon, text, iconStyle = "circle") => ({ ...newCol("figure"), stroke: true, fillColor: "white", figure: { ...FIGURE_DEFAULTS(), value: value2, icon, iconStyle, text: text || short } });
    const txt = (text) => ({ ...newCol("text"), text });
    const card = (title, text, o = {}) => {
      const c2 = newCard();
      return { ...newCol("card"), card: { ...c2, auto: false, ...o, content: { ...c2.content, title, text, tag: "NEW", link: "Read more" } } };
    };
    const img = (ratio) => ({ ...newCol("image"), ratio, src: "assets/Asset 1.svg", caption: "Lorem ipsum dolor sit amet" });
    const sub = (title, layout, cols) => ({ id: uid("sub"), title, showTitle: true, layout, cols });
    const sec = (page, title, bg, subs) => ({ ...newSection(page), title, bg, subs });
    const tiny = "Lorem ipsum dolor sit amet, consectetuer adipiscing elit.";
    const s1 = sec("recto", "Key figures at a glance", "none", [
      sub("Headline numbers", "1-1-1", [fig("\u20AC7.5 bn", "euro", tiny), fig("27", "people", tiny), fig("64 %", "chart", tiny)]),
      sub("Context", "2-1", [txt(`**Lorem ipsum.** ${short}
${list}`), card("Digital Europe", tiny, { layout: "vertical", icon: true, image: false, tag: false, link: false })])
    ]);
    const s2 = sec("recto", "Progress over time", "tint-sky", [
      sub("Annual results", "1-2", [txt(`${lorem}
${short}`), viz("line", { ratio: "2:1" })])
    ]);
    const s3 = sec("verso", "How the funds are shared", "none", [
      sub("Allocation", "1", [viz("donut")])
    ]);
    const s4 = sec("verso", "Milestones", "tint-yellow", [
      sub("Roadmap", "1", [viz("timeline", { orientation: "horizontal", alternate: true })])
    ]);
    const s5 = sec("verso", "Deep dive", "tint-grey", [
      sub("Where the money goes", "2-1", [viz("treemap", { ratio: "16:9" }), txt(`**Lorem ipsum.** ${lorem}
${short}`)])
    ]);
    return {
      schema: SCHEMA,
      name: "factsheet",
      locale: "en-GB",
      density: "normal",
      theme: DEFAULT_THEME,
      colors: {},
      colorNames: {},
      header: {
        bg: "grey",
        fg: "blue",
        overline: "FACTSHEET - MONTH 20YY",
        title: "MAIN TITLE",
        subtitle: "Subtitle",
        images: [defaultHeaderImage()],
        imageId: DEFAULT_IMAGE_ID,
        // bibliothèque d'images du header (autant que l'on veut)
        logos: DEFAULT_LOGOS(),
        logoVariant: "default",
        showImage: true,
        showLogo: true
      },
      sections: [s1, s2, s3, s4, s5]
    };
  }
  var DEFAULT_LOGOS = () => ({ default: "assets/d9742f1219.png", mono: "assets/c069bffefa.png", white: "assets/4a5a41080e.png", negative: "assets/5ec5fb8b6a.png" });
  var DEFAULT_IMAGE_ID = "img-default";
  var defaultHeaderImage = () => ({ id: DEFAULT_IMAGE_ID, name: "Image par d\xE9faut", src: "assets/Asset 1.svg" });
  var KEY2 = "factsheet-creator-v1";
  function loadDoc() {
    try {
      const j = JSON.parse(localStorage.getItem(KEY2));
      if (j && Array.isArray(j.sections) && j.header) return migrate(j);
    } catch (e) {
    }
    return defaultDoc();
  }
  var storage = { ok: true };
  function saveDoc(doc2) {
    try {
      localStorage.setItem(KEY2, JSON.stringify(doc2));
      storage.ok = true;
    } catch (e) {
      storage.ok = false;
    }
  }
  function migrate(j) {
    const d = Object.assign(defaultDoc(), j);
    d.customIcons = Array.isArray(j.customIcons) ? j.customIcons : [];
    for (const sec of d.sections || []) for (const sb of sec.subs || []) for (const cl of sb.cols || []) if (cl.free) {
      if (cl.free.on && String(cl.free.text || "").trim()) {
        const f = cl.free, w = f.pos === "left" || f.pos === "right" ? +f.share || 35 : 100;
        (cl.texts = cl.texts || []).push(f.pos === "top" || f.pos === "bottom" ? { mode: f.pos === "top" ? "above" : "below", text: f.text } : { x: f.pos === "right" ? 100 - w : 0, y: 0, w, text: f.text });
      }
      delete cl.free;
    }
    for (const sec of d.sections || []) for (const sb of sec.subs || []) for (const cl of sb.cols || []) for (const ic of cl.viz && cl.viz.opts && cl.viz.opts.customIcons || []) if (!d.customIcons.some((x) => x.id === ic.id)) d.customIcons.push(ic);
    d.header = Object.assign(defaultDoc().header, j.header || {});
    migrateHeader(d.header, j.header || {});
    d.sections.forEach((s2) => {
      s2.id = s2.id || uid("sec");
      s2.page = s2.page === "verso" ? "verso" : "recto";
      s2.bg = s2.bg || "none";
      (s2.subs || (s2.subs = [])).forEach((sub) => {
        sub.id = sub.id || uid("sub");
        if (!GRID.layouts[sub.layout]) sub.layout = "1";
        const n = GRID.layouts[sub.layout].spans.length;
        sub.cols = (sub.cols || []).slice(0, n);
        while (sub.cols.length < n) sub.cols.push(newCol("text"));
        sub.cols = sub.cols.map((c2) => {
          c2 = oldFigure(c2);
          const k = Object.assign(newCol(c2.type || "text"), c2);
          if (k.type === "figure" && !k.figure) k.figure = FIGURE_DEFAULTS();
          if (k.type === "card" && !k.card) k.card = newCard();
          if (k.type === "viz") {
            if (!k.viz) k.viz = newViz("bars");
            else if (!k.viz.opts) k.viz = newViz(k.viz.kind);
          }
          return k;
        });
      });
    });
    oldBoxes(d);
    oldColors(d);
    return d;
  }
  function oldBoxes(d) {
    const f = (o) => {
      if (o.fill === true && (!o.fillColor || o.fillColor === "none")) o.fillColor = "white";
      if (!o.fillColor) o.fillColor = "none";
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
  function oldFigure(c2) {
    if (c2.type !== "viz" || !c2.viz || c2.viz.kind !== "figure") return c2;
    const o = c2.viz.opts || {};
    return { ...c2, type: "figure", viz: null, figure: { ...FIGURE_DEFAULTS(), value: o.value ?? "", text: o.text ?? "" }, stroke: true, fillColor: "white" };
  }
  function moveSection(doc2, from, to, after, page) {
    const sec = doc2.sections[from];
    if (!sec) return from;
    const target = to == null ? null : doc2.sections[to];
    if (target === sec) return from;
    doc2.sections.splice(from, 1);
    if (target) {
      doc2.sections.splice(doc2.sections.indexOf(target) + (after ? 1 : 0), 0, sec);
      sec.page = target.page;
    } else {
      sec.page = page;
      let last = -1;
      doc2.sections.forEach((s2, i) => {
        if (s2.page === page) last = i;
      });
      if (last < 0) doc2.sections.push(sec);
      else doc2.sections.splice(last + 1, 0, sec);
    }
    return doc2.sections.indexOf(sec);
  }
  function stepSection(doc2, si, d) {
    const sec = doc2.sections[si];
    let j = si + d;
    while (j >= 0 && j < doc2.sections.length && doc2.sections[j].page !== sec.page) j += d;
    if (j < 0 || j >= doc2.sections.length) return si;
    [doc2.sections[si], doc2.sections[j]] = [doc2.sections[j], doc2.sections[si]];
    return j;
  }
  function migrateHeader(H, src) {
    if (src.image && !Array.isArray(src.images)) {
      const n = { ...newHeaderImage(1), src: src.image };
      H.images = [n];
      H.imageId = n.id;
    }
    delete H.image;
    if (src.logo && !src.logos) H.logos.default = src.logo;
    delete H.logo;
    const def = DEFAULT_LOGOS(), cur = { ...H.logos || {} };
    if (cur.default === def.mono) cur.default = def.default;
    if (cur.mono === def.default) cur.mono = def.mono;
    H.logos = Object.assign({}, def, Object.fromEntries(Object.entries(cur).filter(([, v]) => v)));
    if (!LOGO_VARIANTS[H.logoVariant]) H.logoVariant = "default";
    H.images = (H.images || []).filter((i) => i && typeof i === "object" && i.src && i.id !== DEFAULT_IMAGE_ID).map((i, k) => ({ id: i.id || uid("img"), name: i.name || `${t("Image")} ${k + 1}`, src: i.src }));
    H.images.unshift(defaultHeaderImage());
    if (!H.images.some((i) => i.id === H.imageId)) H.imageId = H.images[0].id;
  }
  function docImages(doc2) {
    const out = [], H = doc2.header || {};
    (H.images || []).forEach((i) => out.push({ label: `Header \u2014 ${i.name}`, get: () => i.src, set: (v) => {
      i.src = v;
    } }));
    Object.keys(H.logos || {}).forEach((k) => out.push({ label: `Logo \u2014 ${LOGO_VARIANTS[k] || k}`, get: () => H.logos[k], set: (v) => {
      H.logos[k] = v;
    } }));
    (doc2.sections || []).forEach((sec) => (sec.subs || []).forEach((sub) => (sub.cols || []).forEach((c2, ci) => {
      if (c2.type === "image") out.push({ label: `${sec.title || "Section"} \u203A ${sub.title || "Subsection"} \u203A ${ci + 1}`, get: () => c2.src, set: (v) => {
        c2.src = v;
      } });
    })));
    return out.filter((x) => x.get());
  }
  var localImageCount = (doc2) => docImages(doc2).filter((x) => /^data:/.test(x.get())).length;
  function swapCols(doc2, a2, b) {
    const ca = doc2.sections[a2.si].subs[a2.bi].cols, cb = doc2.sections[b.si].subs[b.bi].cols;
    [ca[a2.ci], cb[b.ci]] = [cb[b.ci], ca[a2.ci]];
  }
  function allCols(doc2) {
    const out = [];
    doc2.sections.forEach((sec, si) => sec.subs.forEach((sub, bi) => sub.cols.forEach((col, ci) => out.push({ si, bi, ci, page: sec.page, label: `${sec.title || "Section"} \u203A ${sub.title || "Subsection"} \u203A ${ci + 1}` }))));
    return out;
  }
  function moveSub(doc2, from, to, after) {
    const src = doc2.sections[from.si], sub = src.subs[from.bi], dst = doc2.sections[to.si];
    if (!sub || !dst) return from;
    const ref = to.bi == null ? null : dst.subs[to.bi];
    if (ref === sub) return from;
    src.subs.splice(from.bi, 1);
    if (ref) dst.subs.splice(dst.subs.indexOf(ref) + (after ? 1 : 0), 0, sub);
    else dst.subs.push(sub);
    return { si: to.si, bi: dst.subs.indexOf(sub) };
  }
  function remapColors(doc2, fn, bg = fn, fill2 = bg) {
    const H = doc2.header || {};
    H.bg = fn(H.bg);
    H.fg = fn(H.fg);
    const walk2 = (o) => {
      if (o && typeof o === "object") for (const k of Object.keys(o)) {
        if (k === "color" && typeof o[k] === "string") o[k] = fn(o[k]);
        else walk2(o[k]);
      }
    };
    (doc2.sections || []).forEach((sec) => {
      sec.bg = bg(sec.bg);
      if (sec.strokeColor) sec.strokeColor = fn(sec.strokeColor);
      if (sec.fillColor) sec.fillColor = fill2(sec.fillColor);
      (sec.subs || []).forEach((sub) => {
        if (sub.strokeColor) sub.strokeColor = fn(sub.strokeColor);
        if (sub.fillColor) sub.fillColor = fill2(sub.fillColor);
        (sub.cols || []).forEach((c2) => {
          if (c2.strokeColor) c2.strokeColor = fn(c2.strokeColor);
          if (c2.fillColor) c2.fillColor = fill2(c2.fillColor);
          walk2(c2.viz);
        });
      });
    });
  }
  var OLD_COLORS = { lavender: "grey", "tint-lavender": "tint-grey", deep: "blue", steel: "slate", tintSky: "tint-sky", tintLav: "tint-blue", tintYellow: "tint-yellow", tintGrey: "tint-slate" };
  function oldColors(d) {
    const f = (k) => OLD_COLORS[k] || k;
    remapColors(d, f);
    d.colors = Object.fromEntries(Object.entries(d.colors || {}).filter(([k]) => !OLD_COLORS[k] && !/^tint/.test(k) && k !== "white"));
    d.colorNames = d.colorNames || {};
    delete d.colorNames.lavender;
  }
  var extraColorKeys = (doc2) => Object.keys(doc2.colors || {}).filter((k) => /^x\d+$/.test(k));
  var canAddColor = (doc2) => extraColorKeys(doc2).length < MAX_EXTRA_COLORS;
  function addColor(doc2, hex) {
    let n = 1;
    while ((doc2.colors || {})["x" + n]) n++;
    const k = "x" + n;
    doc2.colors = doc2.colors || {};
    doc2.colorNames = doc2.colorNames || {};
    doc2.colors[k] = hex;
    doc2.colorNames[k] = `${t("Couleur")} ${5 + extraColorKeys(doc2).length}`;
    return k;
  }
  function removeColor(doc2, key) {
    delete doc2.colors[key];
    delete (doc2.colorNames || {})[key];
    delete (doc2.cmyk || {})[key];
    const gone = (k) => k === key || k === "tint-" + key ? "none" : k;
    remapColors(doc2, (k) => k === key ? "blue" : k === "tint-" + key ? "tint-blue" : k, gone, gone);
  }
  function refreshAutoCards(sub, widthOf) {
    sub.cols.forEach((c2, i) => {
      if (c2.type === "card" && c2.card && c2.card.auto) Object.assign(c2.card, cardPresetFor(widthOf(i)));
    });
  }
  function removeCol(doc2, si, bi, ci) {
    const sec = doc2.sections[si], sub = sec.subs[bi];
    if (sub.cols.length <= 1) {
      sec.subs.splice(bi, 1);
      return `sec:${si}`;
    }
    sub.cols.splice(ci, 1);
    sub.layout = { 1: "1", 2: "1-1", 3: "1-1-1", 4: "1-1-1-1", 5: "1-1-1-1-1", 6: "1-1-1-1-1-1" }[sub.cols.length] || "1";
    return `col:${si}:${bi}:${Math.min(ci, sub.cols.length - 1)}`;
  }

  // src/card.js
  var SAMPLE_IMG = "data:image/svg+xml;utf8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice"><rect width="400" height="300" fill="#A4CCFC"/><circle cx="300" cy="80" r="34" fill="#FCDC0C"/><path d="M0 300V210c60-50 120-50 190-10s140 40 210-20v120z" fill="#0434F8"/><path d="M0 300v-50c80-40 150-30 230 5s120 20 170-10v55z" fill="#041CEC"/></svg>');
  function renderCard(o, W) {
    const C = o.content || SAMPLE, src = o.src || SAMPLE_IMG;
    const bullets = (Array.isArray(C.bullets) ? C.bullets : String(C.bullets || "").split("\n")).map((x) => x.trim()).filter(Boolean);
    const card = h("div", { class: `card card-${o.layout}` + (o.stroke ? " stroked" + (o.fill ? " filled" : "") : "") + (o.align === "center" ? " center" : "") + (o.bleed && o.stroke ? " bleed" : "") });
    const pic = o.image ? h("div", { class: "card-img" }, h("img", { src, alt: "" })) : null;
    const iconAbove = o.icon && !o.iconInline ? h("div", { class: "card-ico" }, figureIcon(o.iconName, GAP.boxPad * 4, o.iconCircle)) : null;
    const iconInline = o.icon && o.iconInline ? figureIcon(o.iconName, GAP.boxPad * 2, o.iconCircle) : null;
    const body = h(
      "div",
      { class: "card-body" },
      o.tag ? h("div", { class: "card-tag", innerHTML: inline(C.tag) }) : null,
      iconAbove,
      o.title || iconInline ? h("div", { class: "card-head" }, iconInline, o.title ? h("h3", { class: "card-title", innerHTML: inline(C.title) }) : null) : null,
      o.figure ? h("div", { class: "vf-value", innerHTML: inline(C.figure) }) : null,
      o.text ? richText(C.text, o.align === "center" ? "center" : "left") : null,
      o.bullets ? h("ul", { class: "card-list" }, bullets.map((b) => h("li", { innerHTML: inline(b) }))) : null,
      o.link ? h("div", { class: "card-link" }, h("span", { innerHTML: inline(C.link) }), h("i", { class: "ti ti-arrow-right" })) : null
    );
    if (o.layout === "vertical" || !pic) card.append(...[pic, body].filter(Boolean));
    else card.append(...o.layout === "left" ? [pic, body] : [body, pic]);
    card.style.width = W + "px";
    return card;
  }

  // src/render.js
  var ico = (name) => h("i", { class: "ti ti-" + name });
  function h(tag, props = {}, ...kids) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === "class") e.className = v;
      else if (k === "style" && typeof v === "object") Object.assign(e.style, v);
      else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
      else if (k === "dataset") Object.assign(e.dataset, v);
      else if (k in e && k !== "list") e[k] = v;
      else e.setAttribute(k, v);
    }
    for (const k of kids.flat()) if (k != null && k !== false) e.append(k);
    return e;
  }
  var inline = inlineMk;
  function richText(text, align) {
    const root = h("div", { class: "rich", style: align && align !== "left" ? { textAlign: align } : {} });
    let ul = null;
    for (const raw of String(text || "").replace(/\r\n?/g, "\n").split("\n")) {
      const line = raw.trim();
      if (!line) {
        ul = null;
        continue;
      }
      const hm = line.match(/^(#{1,5})\s+(.*)$/);
      if (hm) {
        ul = null;
        root.append(h("p", { class: "p-" + ["h1", "h2", "cap", "fig", "figsm"][hm[1].length - 1], innerHTML: inline(hm[2]) }));
        continue;
      }
      const m2 = line.match(/^[-•]\s+(.*)$/);
      if (m2) {
        if (!ul) {
          ul = h("ul");
          root.append(ul);
        }
        ul.append(h("li", { innerHTML: inline(m2[1]) }));
      } else {
        ul = null;
        root.append(h("p", { innerHTML: inline(line) }));
      }
    }
    return root;
  }
  var headerImage = (H) => (H.images || []).find((i) => i.id === H.imageId) || (H.images || [])[0] || null;
  function renderHeader(doc2) {
    const H = doc2.header, sel = { "data-sel": "header" };
    const el2 = h("header", { class: "hd", style: { background: `var(--c-${H.bg})`, color: `var(--c-${H.fg})` }, dataset: { sel: "header" } });
    const inner = h("div", { class: "hd-inner" });
    const img = headerImage(H), logo = (H.logos || {})[H.logoVariant];
    if (H.showImage) inner.append(img && img.src ? h("img", { class: "hd-img", src: img.src, alt: "" }) : h("div", { class: "hd-img ph", textContent: "image" }));
    const top = h(
      "div",
      { class: "hd-top" },
      h("div", { class: "hd-over", innerHTML: inline(H.overline) }),
      h("div", { class: "hd-rule" })
    );
    const bottom = h(
      "div",
      { class: "hd-bottom" },
      h("div", { class: "hd-title", innerHTML: inline(H.title) }),
      H.subtitle && H.subtitle.trim() ? h("div", { class: "hd-sub", innerHTML: inline(H.subtitle) }) : null
    );
    inner.append(h("div", { class: "hd-text" }, top, bottom));
    if (H.showLogo) inner.append(logo ? h("img", { class: "hd-logo", src: logo, alt: "" }) : h("div", { class: "hd-logo ph", textContent: "logo" }));
    el2.append(inner);
    return el2;
  }
  var hasFill = (o) => !!o.fillColor && o.fillColor !== "none";
  var hasHatch = (o) => !!o.hatch && o.hatch !== "none";
  var isBox = (o) => !!(o.stroke || hasFill(o) || hasHatch(o));
  var strokeStyle = (node) => (o) => {
    if (!isBox(o)) return;
    node.classList.add("stroked");
    node.style.setProperty("--stroke-color", o.stroke ? `var(--c-${o.strokeColor || "text"})` : "transparent");
    if (hasFill(o)) node.style.background = `var(--c-${o.fillColor})`;
    if (hasHatch(o)) {
      node.classList.add("hatched");
      const P = 24, Wd = 900, Ht = 1200, lines = [];
      for (let x = -Ht; x < Wd; x += P) lines.push(s("line", { x1: x, y1: Ht, x2: x + Ht, y2: 0, stroke: `var(--c-${o.hatch})`, "stroke-width": P / 2 }));
      node.prepend(h("div", { class: "hatch", "aria-hidden": "true" }, s("svg", { width: Wd, height: Ht, viewBox: `0 0 ${Wd} ${Ht}` }, ...lines)));
    }
  };
  function renderImage(col, w) {
    const mode = col.imgMode || "ratio";
    const img = col.src ? h("img", { src: col.src, alt: "", onload: (e) => {
      const n = Math.round(e.target.naturalWidth / e.target.naturalHeight * 1e3) / 1e3;
      if (n && col.natural !== n) {
        col.natural = n;
        document.dispatchEvent(new Event("fs-natural"));
      }
    } }) : null;
    if (mode === "fit") {
      const box = h("div", { class: "img-box fit" + (col.src ? " has" : ""), style: { aspectRatio: String(col.natural || 4 / 3) } }, img || h("span", { textContent: "image" }));
      return box;
    }
    if (mode === "custom") {
      const pct = Math.max(5, Math.min(100, +col.imgW || 100)), hgt = Math.max(3, Math.round((+col.imgH || 150) / 3) * 3);
      const box = h(
        "div",
        { class: "img-box custom", style: { width: pct + "%", height: hgt + "px", marginLeft: col.align === "center" || col.align === "right" ? "auto" : "0", marginRight: col.align === "center" ? "auto" : "0" } },
        img || h("span", { textContent: "image" })
      );
      if (img) img.style.objectFit = col.imgFit === "contain" ? "contain" : "cover";
      return box;
    }
    const r = IMAGE_RATIOS[col.ratio] || 4 / 3;
    return h("div", { class: "img-box", style: { height: Math.round(w / r / 3) * 3 + "px" } }, img || h("span", { textContent: "image" }));
  }
  function renderCol(col, w, path, env) {
    const wrap = h("div", { class: `col col-${col.type}`, dataset: { sel: path } });
    const al = { top: "start", center: "center", bottom: "end" }[col.valign] || "start";
    if (isBox(col) && col.type !== "card") {
      strokeStyle(wrap)(col);
      wrap.style.justifyContent = { start: "flex-start", center: "center", end: "flex-end" }[al];
      w = insetW(w);
    } else wrap.style.alignSelf = al;
    const strip2 = (x) => String(x || "").replace(/\*\*|__|~~|\^\^|,,/g, "").replace(/^(#{1,5}|[-•])\s+/gm, "").split("\n").find((l) => l.trim()) || "";
    const side = (label, core) => composeSide(col.side, w, env, { pct: "", value: "", total: "", label }, core).node;
    if (col.type === "text") wrap.append(side(strip2(col.text), (ww) => ({ node: col.side && col.side.pos !== "none" ? h("div", { style: { width: ww + "px" } }, richText(col.text, col.align)) : richText(col.text, col.align) })));
    else if (col.type === "image") {
      wrap.append(renderImage(col, w));
      if (col.caption && col.caption.trim()) wrap.append(h("div", { class: "cap", innerHTML: inline(col.caption) }));
    } else if (col.type === "card" && col.card) {
      wrap.append(side(strip2(col.card.content && col.card.content.title), (ww) => ({ node: renderCard(col.card, ww) })));
    } else if (col.type === "figure") {
      wrap.append(renderFigure(col.figure || {}, w, col.align));
    } else {
      const node = renderViz(col.viz, w, env);
      wrap.append(node || h("div", { class: "viz-ph" }, h("span", { textContent: "dataviz" })));
      if (node && env.fills && col.viz.opts && (col.viz.opts.hmode === "fill" || col.viz.opts.hmode === "match")) env.fills.push({ page: env.page, col, w, node, wrap, env, mode: col.viz.opts.hmode });
    }
    if (Array.isArray(col.texts) && col.texts.length) {
      const above = [], below = [];
      col.texts.forEach((tx, i) => {
        if (!String(tx.text || "").trim()) return;
        if (tx.mode === "above" || tx.mode === "below") {
          (tx.mode === "above" ? above : below).push(h("div", { class: "col-text-flow", style: { marginTop: tx.mode === "below" ? "9px" : "0", marginBottom: tx.mode === "above" ? "9px" : "0" } }, richText(tx.text, tx.align || "left")));
          return;
        }
        wrap.style.position = "relative";
        const st = { position: "absolute", left: (+tx.x || 0) + "%", width: (+tx.w || 50) + "%", zIndex: 2 };
        if (tx.y == null) st.bottom = "0";
        else st.top = (+tx.y || 0) + "px";
        wrap.append(h("div", { class: "col-text-free", style: st, dataset: { free: `${path}:${i}` } }, richText(tx.text, tx.align || "left")));
      });
      if (above.length) wrap.prepend(...above);
      if (below.length) wrap.append(...below);
    }
    if (col.type !== "viz" && +col.minH > 0) {
      Object.assign(wrap.style, { minHeight: col.minH + "px", display: "flex", flexDirection: "column", alignSelf: isBox(col) ? "stretch" : "start", justifyContent: { start: "flex-start", center: "center", end: "flex-end" }[al] });
    }
    return wrap;
  }
  function renderSub(sub, si, bi, env, W) {
    const L = GRID.layouts[sub.layout];
    const el2 = h("div", { class: "sub", dataset: { sel: `sub:${si}:${bi}` } });
    if (bi > 0) el2.append(h("div", { class: "sub-rule" }));
    strokeStyle(el2)(sub);
    if (isBox(sub)) W = insetW(W);
    if (sub.title && sub.title.trim() && sub.showTitle !== false) el2.append(h("h3", { class: "sub-title", innerHTML: inline(sub.title) }));
    const cols = h("div", { class: "cols", style: { gridTemplateColumns: `repeat(${L.cols}, minmax(0, 1fr))` } });
    sub.cols.forEach((c2, i) => {
      const node = renderCol(c2, colWidth(sub.layout, i, W), `col:${si}:${bi}:${i}`, env);
      node.style.gridColumn = `span ${L.spans[i]}`;
      cols.append(node);
    });
    el2.append(cols);
    return el2;
  }
  function columnWidth(doc2, si, bi, ci) {
    setDensity(doc2.density);
    const sec = doc2.sections[si], sub = sec && sec.subs[bi], col = sub && sub.cols[ci];
    if (!col) return GRID.contentW;
    let W = GRID.contentW;
    if (isBox(sec)) W = insetW(W);
    if (isBox(sub)) W = insetW(W);
    const w = colWidth(sub.layout, ci, W);
    return isBox(col) && col.type !== "card" ? insetW(w) : w;
  }
  var isBand = (s2) => !!(s2.bg && s2.bg !== "none");
  var defaultRuleColor = (s2) => !isBand(s2) || s2.bg === "white" ? "tint-blue" : "white";
  function renderSection(sec, si, env, pos) {
    const band = isBand(sec), style = {};
    const firstGap = pos.key === "recto" ? GAP.headerToBody : PAGE.marginTop;
    style.marginTop = (pos.first ? band ? 0 : firstGap : band && pos.prevBand ? 0 : GAP.sectionBefore) + "px";
    if (band) {
      style.background = `var(--c-${sec.bg})`;
      style.paddingTop = (pos.first ? firstGap : GAP.bandPad) + "px";
      style.paddingBottom = (pos.last ? PAGE.marginBottom : GAP.bandPad) + "px";
    }
    const cls = ["sec", band && "sec-band", pos.first && "sec-first", pos.last && "sec-last", sec.subRules === false && "sec-norules"].filter(Boolean).join(" ");
    const el2 = h("section", { class: cls, style, dataset: { sel: `sec:${si}` } });
    el2.style.setProperty("--rule", `var(--c-${sec.ruleColor || defaultRuleColor(sec)})`);
    if (!pos.first && sec.secRule !== false && band === pos.prevBand) el2.prepend(h("div", { class: "sec-rule", style: { top: band ? "0px" : `calc(${-GAP.sectionBefore / 2}px - var(--stroke) / 2)` } }));
    let host = el2, W = GRID.contentW;
    if (isBox(sec)) {
      host = h("div", { class: "sec-box" });
      strokeStyle(host)(sec);
      el2.append(host);
      W = insetW(W);
    }
    if (sec.title && sec.title.trim() && sec.showTitle !== false) host.append(h("h2", { class: "sec-title", innerHTML: inline(sec.title) }));
    sec.subs.forEach((sub, bi) => host.append(renderSub(sub, si, bi, env, W)));
    return el2;
  }
  function renderDocument(doc2) {
    iconLib.list = doc2.customIcons || (doc2.customIcons = []);
    setDensity(doc2.density);
    const vars = cssVars(doc2.theme, doc2.colors);
    const env = { locale: doc2.locale || "en-GB", pal: paletteOf(doc2.theme, doc2.colors), fills: [], page: "" };
    const pages = [];
    for (const key of ["recto", "verso"]) {
      env.page = key;
      const page = h("div", { class: `page page-${key}`, dataset: { page: key } });
      applyVars(page, vars);
      const top = key === "recto" ? HEADER.h : 0;
      if (key === "recto") page.append(renderHeader(doc2));
      const content = h("div", { class: "content", style: { top: top + "px" } });
      const list = doc2.sections.map((s2, si) => ({ s: s2, si })).filter((x) => x.s.page === key);
      list.forEach((x, k) => content.append(renderSection(x.s, x.si, env, { key, first: k === 0, last: k === list.length - 1, prevBand: k > 0 && isBand(list[k - 1].s) })));
      page.append(content);
      const lastBand = list.length && isBand(list[list.length - 1].s);
      pages.push({ el: page, key, content, top, lastBand, max: PAGE.h - top - (lastBand ? 0 : PAGE.marginBottom) });
    }
    return { pages, warnings: [], fills: env.fills };
  }
  function vizChartH(n) {
    const bx = n.dataset && n.dataset.vizH ? n : n.querySelector && n.querySelector("[data-viz-h]");
    if (bx) return +bx.dataset.vizH;
    const sv = n.tagName.toLowerCase() === "svg" ? n : n.querySelector("svg");
    return +(sv && sv.getAttribute("height")) || n.offsetHeight || 0;
  }
  function matchTarget(wrap, node) {
    const row = wrap.parentElement;
    if (!row || row.children.length < 2) return null;
    const chart = vizChartH(node), extra = Math.max(0, (node.offsetHeight || chart) - chart), cs = getComputedStyle(wrap);
    const own = ["paddingTop", "paddingBottom", "borderTopWidth", "borderBottomWidth"].reduce((a2, k) => a2 + (parseFloat(cs[k]) || 0), 0);
    const prev = node.style.display;
    node.style.display = "none";
    const rowH = row.offsetHeight;
    node.style.display = prev;
    const target = rowH - own - extra;
    return target >= 60 ? Math.floor(target / 3) * 3 : null;
  }
  function matchColTarget(wrap) {
    const row = wrap.parentElement;
    if (!row || row.children.length < 2) return null;
    const kids = [...wrap.children], prev = wrap.style.minHeight;
    kids.forEach((k) => {
      k._d = k.style.display;
      k.style.display = "none";
    });
    wrap.style.minHeight = "0px";
    const rowH = row.offsetHeight;
    kids.forEach((k) => {
      k.style.display = k._d;
    });
    wrap.style.minHeight = prev;
    return rowH >= 30 ? Math.round(rowH / 3) * 3 : null;
  }
  function matchRows(fills) {
    for (const f of fills) {
      if (f.mode !== "match") continue;
      const o = f.col.viz.opts, t2 = matchTarget(f.wrap, f.node);
      if (!t2) continue;
      const target = Math.max(o.hmin || 90, Math.min(o.hmax || 900, t2)), n = renderViz(f.col.viz, f.w, { ...f.env, fills: null, fillH: target });
      if (n) {
        f.node.replaceWith(n);
        f.node = n;
      }
    }
  }
  function fillPage(p, fills) {
    const mine = fills.filter((f) => f.page === p.key && f.mode === "fill");
    if (!mine.length) return;
    const chartH = (f) => vizChartH(f.node);
    mine.forEach((f) => {
      f.h = chartH(f);
    });
    for (let pass = 0; pass < 6; pass++) {
      const free = p.max - p.content.offsetHeight;
      if (free >= 0 && free < 3.5) break;
      let moved = 0;
      for (const f of mine) {
        const o = f.col.viz.opts, target = Math.max(o.hmin || 90, Math.min(o.hmax || 900, f.h + free / mine.length));
        if (Math.abs(target - f.h) < 0.5) continue;
        const n = renderViz(f.col.viz, f.w, { ...f.env, fills: null, fillH: target });
        if (!n) continue;
        f.node.replaceWith(n);
        f.node = n;
        f.h = chartH(f);
        moved++;
      }
      if (!moved) break;
    }
  }
  function measure(result) {
    const warnings = [];
    if (result.fills && result.fills.length) matchRows(result.fills);
    for (const p of result.pages) {
      if (result.fills && result.fills.length) fillPage(p, result.fills);
      p.used = p.content.offsetHeight;
      p.overflow = p.used > p.max + 0.5;
      if (p.overflow) warnings.push(`${p.key === "recto" ? "Recto" : "Verso"} : le contenu d\xE9passe de ${Math.ceil(p.used - p.max)} px \u2014 d\xE9placez une section vers l\u2019autre page ou raccourcissez-la.`);
      const last = p.content.querySelector(".sec-last.sec-band");
      if (last) last.style.minHeight = Math.max(0, PAGE.h - p.top - last.offsetTop) + "px";
      if (p.key === "recto") {
        const top = p.el.querySelector(".hd-top"), bot = p.el.querySelector(".hd-bottom"), inner = p.el.querySelector(".hd-inner");
        const hd = p.el.querySelector(".hd"), room = inner && hd ? inner.clientHeight + (hd.clientHeight - inner.clientHeight) / 2 - GAP.boxPad : 0;
        if (top && bot && inner && bot.offsetTop + bot.offsetHeight > room + 0.5) warnings.push("Header : titre trop long, il ne tient pas dans la hauteur du header.");
      }
    }
    result.warnings = warnings;
    return result;
  }

  // src/colorpicker.js
  var clamp = (v, a2, b) => Math.min(b, Math.max(a2, v));
  var normHex = (s2) => {
    let x = String(s2 || "").trim().replace(/^#/, "");
    if (/^[0-9a-f]{3}$/i.test(x)) x = x.replace(/./g, (c2) => c2 + c2);
    return /^[0-9a-f]{6}$/i.test(x) ? "#" + x.toUpperCase() : null;
  };
  var toRgb = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    return { r: n >> 16 & 255, g: n >> 8 & 255, b: n & 255 };
  };
  var toHex = ({ r, g, b }) => "#" + [r, g, b].map((x) => Math.round(clamp(x, 0, 255)).toString(16).padStart(2, "0")).join("").toUpperCase();
  function rgb2cmyk({ r, g, b }) {
    const k = 1 - Math.max(r, g, b) / 255;
    if (k >= 1) return [0, 0, 0, 100];
    return [(1 - r / 255 - k) / (1 - k), (1 - g / 255 - k) / (1 - k), (1 - b / 255 - k) / (1 - k), k].map((x) => x * 100);
  }
  var cmyk2rgb = ([c2, m2, y, k]) => ({ r: 255 * (1 - c2 / 100) * (1 - k / 100), g: 255 * (1 - m2 / 100) * (1 - k / 100), b: 255 * (1 - y / 100) * (1 - k / 100) });
  function rgb2hsv({ r, g, b }) {
    r /= 255;
    g /= 255;
    b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    let hh = 0;
    if (d) hh = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return { h: hh * 60, s: mx ? d / mx : 0, v: mx };
  }
  function hsv2rgb({ h: hh, s: s2, v }) {
    const f = (n) => {
      const k = (n + hh / 60) % 6;
      return v - v * s2 * Math.max(0, Math.min(k, 4 - k, 1));
    };
    return { r: f(5) * 255, g: f(3) * 255, b: f(1) * 255 };
  }
  var current = null;
  function openColorEditor({ anchor, hex, title, onChange, onClose, cmyk }) {
    if (current) current.close(true);
    const start = normHex(hex) || "#000000";
    let hsv = rgb2hsv(toRgb(start)), mode = "rgb", done = false, cm = cmyk ? cmyk.slice() : null;
    const rgb = () => hsv2rgb(hsv);
    const sv = h("div", { class: "ce-sv" }, h("i", { class: "ce-knob" }));
    const hue = h("div", { class: "ce-hue" }, h("i", { class: "ce-knob" }));
    const drag2 = (el2, fn) => {
      const at = (e) => {
        const r = el2.getBoundingClientRect();
        fn(clamp((e.clientX - r.left) / r.width, 0, 1), clamp((e.clientY - r.top) / r.height, 0, 1));
      };
      el2.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        el2.setPointerCapture(e.pointerId);
        at(e);
        const mv = (ev) => at(ev), up = () => {
          el2.removeEventListener("pointermove", mv);
          el2.removeEventListener("pointerup", up);
        };
        el2.addEventListener("pointermove", mv);
        el2.addEventListener("pointerup", up);
      });
    };
    drag2(sv, (x, y) => {
      hsv.s = x;
      hsv.v = 1 - y;
      update();
    });
    drag2(hue, (x) => {
      hsv.h = x * 359.999;
      update();
    });
    const hexIn = h("input", {
      type: "text",
      class: "ce-hex",
      maxlength: 7,
      spellcheck: false,
      "aria-label": "Hex",
      onchange: () => {
        const n = normHex(hexIn.value);
        if (n) {
          hsv = rgb2hsv(toRgb(n));
          update();
        } else update();
      }
    });
    const before = h("i", { class: "ce-before", style: { background: start }, title: start }), after = h("i", { class: "ce-after" });
    const sliders = h("div", { class: "ce-sliders" });
    const specs = () => mode === "rgb" ? [["R", 0, 255, rgb().r, (v) => {
      const c2 = rgb();
      c2.r = v;
      hsv = rgb2hsv(c2);
    }], ["G", 0, 255, rgb().g, (v) => {
      const c2 = rgb();
      c2.g = v;
      hsv = rgb2hsv(c2);
    }], ["B", 0, 255, rgb().b, (v) => {
      const c2 = rgb();
      c2.b = v;
      hsv = rgb2hsv(c2);
    }]] : mode === "cmyk" ? ["C", "M", "J", "N"].map((l, i) => [t(l), 0, 100, (cm || rgb2cmyk(rgb()))[i], (v) => {
      cm = (cm || rgb2cmyk(rgb())).slice();
      cm[i] = v;
      hsv = rgb2hsv(cmyk2rgb(cm));
    }]) : [["H", 0, 359, hsv.h, (v) => {
      hsv.h = v;
    }], ["S", 0, 100, hsv.s * 100, (v) => {
      hsv.s = v / 100;
    }], ["V", 0, 100, hsv.v * 100, (v) => {
      hsv.v = v / 100;
    }]];
    const gradient = (i) => {
      const c2 = rgb();
      if (mode === "cmyk") {
        const base = (cm || rgb2cmyk(c2)).slice(), lo2 = base.slice(), hi2 = base.slice();
        lo2[i] = 0;
        hi2[i] = 100;
        return `linear-gradient(90deg,${toHex(cmyk2rgb(lo2))},${toHex(cmyk2rgb(hi2))})`;
      }
      if (mode === "rgb") {
        const a2 = { ...c2 }, b = { ...c2 };
        ["r", "g", "b"][i] && (a2[["r", "g", "b"][i]] = 0, b[["r", "g", "b"][i]] = 255);
        return `linear-gradient(90deg,${toHex(a2)},${toHex(b)})`;
      }
      if (i === 0) return "linear-gradient(90deg,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)";
      const lo = toHex(hsv2rgb({ ...hsv, [i === 1 ? "s" : "v"]: 0 })), hi = toHex(hsv2rgb({ ...hsv, [i === 1 ? "s" : "v"]: 1 }));
      return `linear-gradient(90deg,${lo},${hi})`;
    };
    function drawSliders() {
      sliders.replaceChildren(...specs().map(([label, min2, max2, val, set], i) => {
        const num2 = h("input", { type: "number", min: min2, max: max2, step: 1, value: Math.round(val), "aria-label": label });
        const rng = h("input", { type: "range", min: min2, max: max2, step: 1, value: Math.round(val), class: "ce-range", style: { background: gradient(i) }, "aria-label": label });
        const apply = (v) => {
          set(clamp(+v || 0, min2, max2));
          update(true, mode === "cmyk");
        };
        rng.addEventListener("input", () => apply(rng.value));
        num2.addEventListener("input", () => {
          if (num2.value !== "") apply(num2.value);
        });
        return h("div", { class: "ce-row" }, h("b", { textContent: label }), rng, num2);
      }));
    }
    const tab2 = (m2, label) => h("button", { type: "button", class: "ce-tab" + (mode === m2 ? " on" : ""), textContent: label, onclick: () => {
      mode = m2;
      tabs.querySelectorAll(".ce-tab").forEach((b) => b.classList.toggle("on", b.dataset.m === m2));
      drawSliders();
    } });
    const tabs = h("div", { class: "ce-tabs" }, ...[["rgb", "RGB"], ["hsv", "HSV"], ["cmyk", "CMJN"]].map(([m2, l]) => {
      const b = tab2(m2, l);
      b.dataset.m = m2;
      return b;
    }));
    const eye = window.EyeDropper ? h("button", { type: "button", class: "mini", title: t("Pipette"), "aria-label": t("Pipette"), onclick: async () => {
      try {
        const r = await new window.EyeDropper().open();
        const n = normHex(r.sRGBHex);
        if (n) {
          hsv = rgb2hsv(toRgb(n));
          update();
        }
      } catch (e) {
      }
    } }, ico("color-picker")) : null;
    let raf2 = 0, last = start;
    function update(keepSliders, fromCmyk) {
      if (!fromCmyk) cm = null;
      const hx = toHex(rgb()), pure = toHex(hsv2rgb({ h: hsv.h, s: 1, v: 1 }));
      sv.style.background = `linear-gradient(to top,#000,transparent),linear-gradient(to right,#fff,${pure})`;
      sv.firstChild.style.cssText = `left:${hsv.s * 100}%;top:${(1 - hsv.v) * 100}%;background:${hx}`;
      hue.firstChild.style.cssText = `left:${hsv.h / 359.999 * 100}%;background:${pure}`;
      after.style.background = hx;
      if (document.activeElement !== hexIn) hexIn.value = hx;
      if (!keepSliders) drawSliders();
      else if (mode === "hsv" || true) {
        const rs = sliders.querySelectorAll("input[type=range]"), ns = sliders.querySelectorAll("input[type=number]");
        specs().forEach(([, , , v], i) => {
          if (document.activeElement !== ns[i]) ns[i].value = Math.round(v);
          if (document.activeElement !== rs[i]) rs[i].value = Math.round(v);
          rs[i].style.background = gradient(i);
        });
      }
      if (hx !== last) {
        last = hx;
        cancelAnimationFrame(raf2);
        raf2 = requestAnimationFrame(() => onChange(hx, cm && cm.map(Math.round)));
      }
    }
    const pop2 = h(
      "div",
      { class: "ce", role: "dialog", "aria-label": title || t("Couleur") },
      h("div", { class: "ce-head" }, h("strong", { textContent: title || t("Couleur") }), h("button", { type: "button", class: "mini", "aria-label": t("Annuler"), onclick: () => close3(false) }, ico("x"))),
      sv,
      hue,
      h("div", { class: "ce-cmp" }, h("span", { class: "ce-pair" }, before, after), hexIn, eye),
      tabs,
      sliders,
      h("div", { class: "row ce-act" }, h("button", { type: "button", textContent: "Annuler", onclick: () => close3(false) }), h("button", { type: "button", class: "primary", textContent: "OK", onclick: () => close3(true) }))
    );
    document.body.append(pop2);
    const place3 = () => {
      const a2 = anchor ? anchor.getBoundingClientRect() : { left: window.innerWidth - 20, top: 80, bottom: 80 }, w = pop2.offsetWidth, hh = pop2.offsetHeight;
      let left2 = a2.left - w - 14;
      if (left2 < 8) left2 = Math.min(window.innerWidth - w - 8, a2.left);
      pop2.style.left = left2 + "px";
      pop2.style.top = clamp(a2.top - 20, 8, window.innerHeight - hh - 8) + "px";
    };
    update(false, !!cm);
    place3();
    function close3(commit) {
      if (done) return;
      done = true;
      cancelAnimationFrame(raf2);
      document.removeEventListener("pointerdown", outside, true);
      window.removeEventListener("keydown", onKey, true);
      if (!commit) onChange(start, cmyk || null);
      else onChange(toHex(rgb()), cm && cm.map(Math.round));
      pop2.remove();
      current = null;
      if (onClose) onClose(commit);
    }
    const outside = (e) => {
      if (!pop2.contains(e.target) && !(anchor && anchor.contains(e.target))) close3(true);
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        close3(false);
      } else if (e.key === "Enter" && e.target.tagName !== "BUTTON") close3(true);
    };
    setTimeout(() => document.addEventListener("pointerdown", outside, true));
    window.addEventListener("keydown", onKey, true);
    current = { close: close3 };
    return current;
  }

  // src/cmyk.js
  var hex2rgb2 = (h2) => {
    const n = parseInt(String(h2).replace("#", ""), 16);
    return [n >> 16 & 255, n >> 8 & 255, n & 255];
  };
  function rgb2cmyk2([r, g, b]) {
    const k = 1 - Math.max(r, g, b) / 255;
    if (k >= 1) return [0, 0, 0, 100];
    const f = (v) => (1 - v / 255 - k) / (1 - k) * 100;
    return [f(r), f(g), f(b), k * 100];
  }
  function paletteCmyk(doc2) {
    const th = THEMES[doc2.theme] || THEMES[DEFAULT_THEME], pal = paletteOf(doc2.theme, doc2.colors), out = {};
    for (const k of Object.keys(pal)) out[k] = doc2.cmyk && doc2.cmyk[k] || (th.cmyk && th.cmyk[k] && (!doc2.colors || !doc2.colors[k] || doc2.colors[k].toLowerCase() === th.colors[k].toLowerCase()) ? th.cmyk[k] : null) || rgb2cmyk2(hex2rgb2(pal[k]));
    return out;
  }

  // src/palette.js
  function buildPalette(ctx2, redraw) {
    const doc2 = ctx2.getDoc(), th = THEMES[doc2.theme] || THEMES.eu, pal = paletteOf(doc2.theme, doc2.colors), extras = extraColorKeys(doc2);
    doc2.colorNames = doc2.colorNames || {};
    const defName = (k) => extras.includes(k) ? k : t(th.names[k] || k);
    const cm = paletteCmyk(doc2), cmTxt = (k) => cm[k].map((v) => Math.round(v)).join(" \xB7 ");
    const open3 = (k, sw) => openColorEditor({
      anchor: sw,
      hex: pal[k],
      cmyk: cm[k],
      title: t(colorLabel(doc2, k)),
      onChange: (hex, c2) => {
        doc2.colors[k] = hex;
        sw.style.background = hex;
        if (c2) (doc2.cmyk || (doc2.cmyk = {}))[k] = c2;
        else if (doc2.cmyk) delete doc2.cmyk[k];
        ctx2.changed();
      },
      onClose: redraw
    });
    const row = (k) => {
      const isExtra = extras.includes(k), recolored = !isExtra && doc2.colors[k] && doc2.colors[k].toLowerCase() !== th.colors[k].toLowerCase(), renamed = !isExtra && !!doc2.colorNames[k];
      const sw = h("button", { type: "button", class: "pal2-sw", title: t("Modifier la couleur"), "aria-label": t("Modifier la couleur"), style: { background: pal[k] }, onclick: () => open3(k, sw) });
      const name = h("input", { type: "text", value: doc2.colorNames[k] || defName(k), "aria-label": t("Nom de la couleur"), oninput: (e) => {
        const v = e.target.value.trim();
        if (v && v !== defName(k)) doc2.colorNames[k] = v;
        else if (!isExtra) delete doc2.colorNames[k];
        ctx2.changed();
      } });
      const chip = h("i", { class: "pal2-tint", title: t("Ton l\xE9ger (20 %)"), style: { background: tintOf(pal[k]) } });
      return h(
        "div",
        { class: "pal2-row", dataset: { key: k } },
        sw,
        chip,
        name,
        h("span", { class: "pal2-hex", textContent: cmTxt(k).replace(/ · /g, "\xB7"), title: `CMJN ${cmTxt(k)} \u2014 RVB \xE9cran ${pal[k].toUpperCase()}` }),
        isExtra ? h("button", { type: "button", class: "mini danger", title: t("Supprimer"), "aria-label": t("Supprimer"), onclick: () => {
          if (confirm(t("Supprimer cette couleur ? Ce qui l\u2019utilise passera en bleu."))) {
            removeColor(doc2, k);
            ctx2.changed();
            redraw();
          }
        } }, ico("x")) : recolored || renamed ? h("button", { type: "button", class: "mini", title: t("R\xE9tablir la couleur du th\xE8me"), "aria-label": t("R\xE9tablir la couleur du th\xE8me"), onclick: () => {
          delete doc2.colors[k];
          if (doc2.cmyk) delete doc2.cmyk[k];
          delete doc2.colorNames[k];
          ctx2.changed();
          redraw();
        } }, ico("restore")) : h("span")
      );
    };
    return h(
      "div",
      { class: "pal2-wrap" },
      h("div", { class: "pal2" }, Object.keys(pal).map(row)),
      canAddColor(doc2) ? h("button", { type: "button", class: "pp-btn", onclick: () => {
        const k = addColor(doc2, "#808080");
        ctx2.changed();
        redraw();
        requestAnimationFrame(() => {
          const b = document.querySelector(`[data-key="${k}"] .pal2-sw`);
          if (b) b.click();
        });
      } }, ico("plus"), h("span", { textContent: t("Ajouter une couleur") })) : null
    );
  }
  var pop = null;
  function closePalette() {
    if (!pop) return;
    const p = pop;
    pop = null;
    document.removeEventListener("pointerdown", p.away, true);
    document.removeEventListener("keydown", p.key, true);
    p.el.remove();
    p.ctx.restructure();
  }
  function openPalette(anchor, ctx2) {
    if (pop && pop.anchor === anchor) {
      closePalette();
      return;
    }
    closePalette();
    const body = h("div", { class: "pal-pop-body" });
    const draw = () => body.replaceChildren(buildPalette(ctx2, draw));
    const el2 = h(
      "div",
      { class: "pal-pop", role: "dialog", "aria-label": t("Couleurs du document") },
      h(
        "div",
        { class: "pal-pop-head" },
        h("b", { textContent: t("Couleurs du document") }),
        h("button", { type: "button", class: "mini", "aria-label": t("Fermer"), onclick: closePalette }, ico("x"))
      ),
      body
    );
    draw();
    document.body.append(el2);
    const r = anchor.getBoundingClientRect(), w = el2.offsetWidth, hh = el2.offsetHeight;
    el2.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, r.left - w + r.width)) + "px";
    el2.style.top = Math.max(8, Math.min(window.innerHeight - hh - 8, r.bottom + 6)) + "px";
    const away = (e) => {
      if (el2.contains(e.target) || anchor.contains(e.target) || e.target.closest(".ce")) return;
      closePalette();
    };
    const key = (e) => {
      if (e.key === "Escape" && !document.querySelector(".ce")) closePalette();
    };
    document.addEventListener("pointerdown", away, true);
    document.addEventListener("keydown", key, true);
    pop = { el: el2, anchor, away, key, ctx: ctx2 };
  }

  // src/tree.js
  var strip = (t2) => String(t2 || "").replace(/\*\*|__|~~|\^\^|,,/g, "").replace(/^(#{1,5}|[-•])\s+/gm, "").replace(/\s+/g, " ").trim();
  var ICON = { text: "text-size", image: "photo", figure: "number", card: "layout-cards", viz: "chart-bar" };
  function colLabel(col) {
    if (col.type === "text") return strip(col.text).slice(0, 34) || "Texte vide";
    if (col.type === "image") return col.caption ? "Image \xB7 " + col.caption : "Image";
    if (col.type === "card") return "Carte \xB7 " + (strip(col.card && col.card.content && col.card.content.title) || "\u2014");
    if (col.type === "figure") return "Chiffre cl\xE9 \xB7 " + (col.figure && col.figure.value || "\u2014");
    const t2 = col.viz && VIZ_TYPES[col.viz.kind];
    return "Dataviz \xB7 " + (t2 ? t2.label : "\u2014");
  }
  function buildTree(root, ctx2) {
    const previewing = ctx2.previewing(), doc2 = ctx2.shown(), sel = previewing ? null : ctx2.getSel(), mark = previewing ? ctx2.previewMark() : null, collapsed2 = ctx2.collapsed;
    root.innerHTML = "";
    applyVars(root, cssVars(doc2.theme, doc2.colors));
    const row = (path, cls, kids) => h("div", {
      class: "tn " + cls + (sel === path ? " sel" : "") + (mark && mark === path ? " drag-live" : ""),
      dataset: { path: path || "" },
      onclick: (e) => {
        if (e.target.closest(".grip,.tn-tog,.tn-add")) return;
        ctx2.select(path);
      }
    }, ...kids);
    const tog = (key) => h("button", { type: "button", class: "tn-tog", "aria-label": collapsed2.has(key) ? "D\xE9plier" : "Replier", "aria-expanded": String(!collapsed2.has(key)), onclick: () => {
      collapsed2.has(key) ? collapsed2.delete(key) : collapsed2.add(key);
      ctx2.refreshTree();
    } }, ico(collapsed2.has(key) ? "chevron-down" : "chevron-up"));
    const add = (label, fn) => h("button", { type: "button", class: "tn-add", onclick: () => {
      fn();
      ctx2.restructure();
    } }, ico("plus"), h("span", { textContent: label }));
    const grip = (title, d) => h("span", { class: "grip", title, onpointerdown: (e) => {
      if (e.button) return;
      e.preventDefault();
      e.stopPropagation();
      ctx2.startTreeDrag(e, d);
    } }, ico("grip-vertical"));
    const secNode = (sec, si) => {
      const key = sec.id || "sec" + si, closed = collapsed2.has(key), band = sec.bg && sec.bg !== "none";
      const dot2 = h("span", { class: "tn-dot" + (band ? "" : " none"), style: band ? { background: `var(--c-${sec.bg})` } : {} });
      const node = h("div", { class: "tn-sec", dataset: { sid: sec.id } });
      node.append(row(`sec:${si}`, "sec-row", [grip("Glisser pour r\xE9ordonner ou changer de page", { kind: "sec", id: sec.id }), dot2, h("strong", { class: "tn-lab", textContent: sec.title || "Section sans titre" }), h("span", { class: "tn-sub", textContent: String(sec.subs.length) }), tog(key)]));
      if (!closed) {
        const body = h("div", { class: "tn-body" });
        sec.subs.forEach((sub, bi) => {
          const sk = sub.id || `sub${si}${bi}`, sClosed = collapsed2.has(sk), subCard = h("div", { class: "tn-subcard", dataset: { bid: sub.id } });
          subCard.append(row(`sub:${si}:${bi}`, "sub-row", [grip("Glisser la sous-section (autre section possible)", { kind: "sub", id: sub.id }), ico("columns"), h("span", { class: "tn-lab", textContent: sub.title || "Sous-section" }), h("span", { class: "tn-sub", textContent: sub.layout }), tog(sk)]));
          if (!sClosed) sub.cols.forEach((col, ci) => subCard.append(row(`col:${si}:${bi}:${ci}`, "col-row", [grip("Glisser le contenu sur une autre colonne pour l\u2019\xE9changer", { kind: "col", from: { si, bi, ci } }), ico(ICON[col.type] || "text-size"), h("span", { class: "tn-lab", textContent: colLabel(col) })])));
          body.append(subCard);
        });
        body.append(add("Sous-section", () => {
          sec.subs.push(newSub("1"));
        }));
        node.append(body);
      }
      return node;
    };
    for (const pg of ["recto", "verso"]) {
      const zone = h("div", { class: "pg-zone", dataset: { page: pg } }, h("div", { class: "pg-head", textContent: pg === "recto" ? "Recto" : "Verso" }));
      if (pg === "recto") zone.append(h("div", { class: "tn-sec tn-head" }, row("header", "head-row", [ico("layout-navbar"), h("strong", { class: "tn-lab", textContent: "Header" }), h("span", { class: "tn-sub", textContent: strip(doc2.header.title).slice(0, 18) })])));
      let n = 0;
      doc2.sections.forEach((sec, si) => {
        if (sec.page === pg) {
          zone.append(secNode(sec, si));
          n++;
        }
      });
      if (!n) zone.append(h("div", { class: "hint", textContent: "Aucune section \u2014 glissez-en une ici." }));
      zone.append(add("Section", () => {
        doc2.sections.push(newSection(pg));
      }));
      root.append(zone);
    }
  }

  // src/help.js
  var HELP = {
    /* header */
    "Surtitre": "Petite ligne en capitales au-dessus du titre, suivie d\u2019un filet. Entr\xE9e = retour \xE0 la ligne.",
    "Titre (taille fixe)": "Le titre du header a une taille fixe (30 px). Un avertissement appara\xEEt si le texte d\xE9borde du bandeau.",
    "Sous-titre (optionnel \u2014 vide = masqu\xE9)": "Deux lignes tiennent dans le header ; au-del\xE0, un avertissement s\u2019affiche. Vide = masqu\xE9.",
    "Afficher l\u2019image": "Image de 132 px de haut \xE0 gauche du header, choisie dans la biblioth\xE8que.",
    "Afficher le logo": "Logo \xE0 droite du header ; quatre versions de m\xEAme taille sont disponibles.",
    /* section et sous-section */
    "Titre de section (vide = masqu\xE9)": "Titre de la section. Entr\xE9e = retour \xE0 la ligne ; vide ou interrupteur \xE9teint = titre masqu\xE9 (la section se d\xE9place alors par son fond).",
    "Titre de sous-section (vide = masqu\xE9)": "Titre de la sous-section, sous le titre de section. Vide = masqu\xE9.",
    "Afficher le titre": "Masque le titre sans le perdre : il reste saisi, mais n\u2019appara\xEEt ni \xE0 l\u2019\xE9cran ni \xE0 l\u2019export.",
    "Filet au-dessus de la section": "Trait de 0,5 pt sur toute la largeur de la page entre cette section et la pr\xE9c\xE9dente (sections sur fond blanc, ou deux bandes de couleur c\xF4te \xE0 c\xF4te).",
    "Filet entre les sous-sections": "Trait de 0,5 pt sur toute la largeur de la page entre deux sous-sections de cette section.",
    "Couleur du filet": "Par d\xE9faut : blanc sur un fond de section, bleu l\xE9ger (teinte 20 %) sur fond blanc.",
    "Fond de la section": "Bande de couleur sur toute la largeur de la page, derri\xE8re la section.",
    "Cadre": "Contour de 0,5 pt et fond facultatif autour de la section, align\xE9 sur les marges.",
    "Contour": "Trait de 0,5 pt aux coins arrondis ; le contenu est alors en retrait de 12 px.",
    "Alignement vertical dans la colonne": "Place le contenu en haut, au centre ou en bas quand la colonne est moins haute que sa voisine.",
    "\xC9changer le contenu avec\u2026": "\xC9change de place le contenu de cette colonne avec celui d\u2019une autre (alignements inclus). Annulable.",
    "Disposition": "Alignement vertical du contenu et du texte dans la colonne.",
    "Fond et contour": "Fond (couleur ou teinte) et contour de la colonne, ind\xE9pendants l\u2019un de l\u2019autre.",
    /* dataviz */
    "Type de dataviz": "Change le type du graphique en gardant le titre et, quand la forme est la m\xEAme, les donn\xE9es.",
    "Hauteur": "Automatique : hauteur naturelle. Proportion : fraction de la largeur. Fixe : en pixels. Remplir : occupe la place restante de la page.",
    "Hauteur minimale (px)": "En mode \xAB Remplir \xBB, la dataviz ne sera jamais plus basse.",
    "Hauteur maximale (px)": "En mode \xAB Remplir \xBB, la dataviz ne sera jamais plus haute.",
    "Place disponible pour cet aper\xE7u (px)": "Simule l\u2019espace libre de la page pour voir l\u2019effet du mode \xAB Remplir \xBB (non enregistr\xE9).",
    "Titre et source": "Texte facultatif au-dessus (titre) et sous (source) de la dataviz.",
    "Donn\xE9es": "Collez un tableau depuis Excel ou Sheets, importez un fichier CSV, TSV ou JSON, ou saisissez directement dans les cellules. Entr\xE9e passe \xE0 la ligne suivante.",
    "Dimensions": "Proportions du graphique.",
    "\xC9tiquettes": "L\xE9gende, valeurs affich\xE9es, d\xE9cimales et unit\xE9.",
    "Couleurs": "Couleurs du document ; les s\xE9ries utilisent les cl\xE9s de la palette, donc suivent le th\xE8me.",
    "Format du graphique": "Proportion hauteur / largeur du graphique (en mode \xAB Proportion \xBB).",
    "Afficher la l\xE9gende": "Pastilles de couleur avec le nom des s\xE9ries ou des groupes sous le graphique.",
    "D\xE9cimales des valeurs": "Nombre de d\xE9cimales affich\xE9es pour les valeurs.",
    "Unit\xE9 apr\xE8s la valeur (%, M\u20AC\u2026)": "Texte ajout\xE9 apr\xE8s chaque valeur, par exemple \xAB % \xBB ou \xAB M\u20AC \xBB.",
    "Texte du centre": "Une ligne par paragraphe. \xAB ## \xBB devant une ligne = titre 2, \xAB ### \xBB = texte courant, rien = titre 1. {total} = somme des valeurs.",
    "R\xE9pondants par point (0 = automatique)": "Un point repr\xE9sente N r\xE9pondants. 0 choisit une valeur pour afficher environ 400 points.",
    "Groupes par ligne (0 = automatique)": "Nombre de nuages c\xF4te \xE0 c\xF4te quand l\u2019enqu\xEAte a plusieurs groupes.",
    "Valeur d\u2019un pictogramme": "Valeur repr\xE9sent\xE9e par un pictogramme entier ; le dernier peut \xEAtre partiel.",
    "Valeur du pictogramme plein (ex. 100)": "Valeur correspondant \xE0 un pictogramme enti\xE8rement rempli (ex. 100 pour des pourcentages).",
    "Alterner les \xE9v\xE9nements de part et d\u2019autre de la ligne": "Les \xE9v\xE9nements pairs et impairs passent de chaque c\xF4t\xE9 de la ligne : le texte dispose de deux fois plus de largeur.",
    "Chiffre \xE0 c\xF4t\xE9": "Un chiffre cl\xE9 (par exemple 14 %) et son texte \xE0 c\xF4t\xE9 de la dataviz, qui prend alors la part de largeur choisie.",
    "Adapter \xE0 la colonne voisine": "La dataviz prend la hauteur de la colonne voisine la plus haute de sa rang\xE9e.",
    "Position verticale de l\u2019anneau": "Quand les textes autour de l\u2019anneau sont plus hauts que lui : l\u2019anneau se place en haut, centr\xE9 sur le contenu ou en bas ; les traits de rep\xE8re suivent.",
    "Alignement vertical de la dataviz": "Quand le conteneur est plus haut que le contenu : le contenu se place en haut, au centre ou en bas.",
    "Interlignage des textes": "Espace entre les lignes des libell\xE9s : serr\xE9, normal (18 px) ou large (21 px).",
    "Extr\xE9mit\xE9s de la ligne": "Avant le premier et apr\xE8s le dernier cercle, la ligne se prolonge (un tiers plein puis des tirets) ou non : \xAB Aucune \xBB fait commencer la ligne au premier cercle.",
    "Largeur des n\u0153uds (px)": "\xC9paisseur des barres verticales du diagramme de Sankey."
  };
  var tip = null;
  var place2 = (btn) => {
    const r = btn.getBoundingClientRect(), w = tip.offsetWidth, hgt = tip.offsetHeight;
    let x = Math.max(8, Math.min(r.left + r.width / 2 - w / 2, window.innerWidth - w - 8)), y = r.bottom + 8;
    if (y + hgt > window.innerHeight - 8) y = r.top - hgt - 8;
    Object.assign(tip.style, { left: x + "px", top: y + "px" });
  };
  var show = (btn, msg) => {
    if (!tip) {
      tip = h("div", { class: "hlp-tip", role: "tooltip" });
      document.body.append(tip);
    }
    tip.textContent = t(msg);
    tip.style.display = "block";
    place2(btn);
  };
  var hide = () => {
    if (tip) tip.style.display = "none";
  };
  window.addEventListener("scroll", hide, true);
  function helpBtn(label, text) {
    const msg = text || HELP[label];
    if (!msg) return null;
    const b = h("button", { type: "button", class: "hlp", "aria-label": t("Aide"), tabindex: 0 }, ico("help-circle"));
    b.addEventListener("pointerenter", () => show(b, msg));
    b.addEventListener("pointerleave", hide);
    b.addEventListener("focus", () => show(b, msg));
    b.addEventListener("blur", hide);
    b.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      tip && tip.style.display === "block" ? hide() : show(b, msg);
    });
    return b;
  }

  // src/cards.js
  function cardEl(id, icon, name, nodes, { shut: shut3, refresh, toggle = null, live = true }) {
    const open3 = !shut3.has(id), show2 = open3 && live;
    const flip = () => {
      open3 ? shut3.add(id) : shut3.delete(id);
      refresh();
    };
    return h(
      "section",
      { class: "pp-card" },
      /* tout l'en-tête replie ou déplie la carte (sauf ses boutons : interrupteur, aide) */
      h(
        "div",
        { class: "pp-card-h", onclick: (e) => {
          if (!e.target.closest("button, input, select, a") || e.target.closest(".pp-chev")) flip();
        } },
        ico(icon),
        h("b", { textContent: name }),
        helpBtn(name),
        h("span", { class: "pp-sp" }),
        toggle,
        h("button", {
          type: "button",
          class: "pp-chev",
          "aria-expanded": String(open3),
          "aria-label": open3 ? t("Replier") : t("D\xE9plier")
        }, ico(open3 ? "chevron-up" : "chevron-down"))
      ),
      show2 ? h("div", { class: "pp-body" }, nodes.flat().filter(Boolean)) : null
    );
  }

  // src/layoutselect.js
  function layoutSchema(L, w = 44, hh = 14) {
    const gap = 2, unit = (w - (L.cols - 1) * gap) / L.cols, svg = s("svg", { width: w, height: hh, viewBox: `0 0 ${w} ${hh}`, class: "ls-schema", "aria-hidden": "true" });
    let start = 0;
    for (const sp of L.spans) {
      svg.append(s("rect", { x: start * (unit + gap) + 0.5, y: 0.5, width: sp * unit + (sp - 1) * gap - 1, height: hh - 1, rx: 2, fill: "currentColor", "fill-opacity": 0.18, stroke: "currentColor", "stroke-width": 1 }));
      start += sp;
    }
    return svg;
  }
  var open2 = null;
  var close2 = () => {
    if (!open2) return;
    const o = open2;
    open2 = null;
    document.removeEventListener("pointerdown", o.away, true);
    document.removeEventListener("keydown", o.key, true);
    o.pop.remove();
    o.btn.setAttribute("aria-expanded", "false");
  };
  function layoutSelect({ value: value2, layouts, onChange }) {
    const keys = Object.keys(layouts).filter((k) => !layouts[k].hidden || k === value2), L = (k) => layouts[k] || layouts["1"];
    const btn = h("button", { type: "button", class: "cs cs-text ls-btn", "aria-haspopup": "listbox", "aria-expanded": "false" }, layoutSchema(L(value2)), h("span", { class: "cs-lab", textContent: t(L(value2).label) }), ico("chevron-down"));
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (open2 && open2.btn === btn) {
        close2();
        return;
      }
      close2();
      const pop2 = h("div", { class: "cs-pop ls-pop", role: "listbox" }, keys.map((k) => h(
        "button",
        { type: "button", role: "option", class: "cs-opt" + (k === value2 ? " on" : ""), "aria-selected": String(k === value2), onclick: () => {
          close2();
          if (k !== value2) onChange(k);
        } },
        layoutSchema(L(k)),
        h("span", { textContent: t(L(k).label) })
      )));
      (btn.closest(".panel, .props") || document.body).append(pop2);
      const r = btn.getBoundingClientRect(), w = Math.max(280, r.width), hh = pop2.offsetHeight;
      Object.assign(pop2.style, { width: w + "px", left: Math.max(8, Math.min(window.innerWidth - w - 8, r.left)) + "px", top: (r.bottom + hh + 12 > window.innerHeight ? Math.max(8, r.top - hh - 4) : r.bottom + 4) + "px" });
      btn.setAttribute("aria-expanded", "true");
      const away = (ev) => {
        if (!pop2.contains(ev.target) && !btn.contains(ev.target)) close2();
      }, key = (ev) => {
        if (ev.key === "Escape") {
          ev.stopPropagation();
          close2();
        }
      };
      document.addEventListener("pointerdown", away, true);
      document.addEventListener("keydown", key, true);
      open2 = { pop: pop2, btn, away, key };
    });
    return btn;
  }

  // src/editor.js
  function readImage(file2, max2 = 1600) {
    return new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onerror = rej;
      fr.onload = () => {
        if (/svg/.test(file2.type)) return res(fr.result);
        const im = new Image();
        im.onerror = rej;
        im.onload = () => {
          const k = Math.min(1, max2 / Math.max(im.width, im.height));
          const c2 = document.createElement("canvas");
          c2.width = Math.round(im.width * k);
          c2.height = Math.round(im.height * k);
          c2.getContext("2d").drawImage(im, 0, 0, c2.width, c2.height);
          res(/png|gif|webp/.test(file2.type) ? c2.toDataURL("image/png") : c2.toDataURL("image/jpeg", 0.9));
        };
        im.src = fr.result;
      };
      fr.readAsDataURL(file2);
    });
  }
  function multiline(h2, value2, onInput, placeholder = "") {
    const ta = h2("textarea", { class: "ml", rows: 1, value: value2 ?? "", placeholder, spellcheck: true, oninput: (e) => {
      fit();
      onInput(e);
    } });
    const fit = () => {
      ta.style.height = "auto";
      ta.style.height = ta.scrollHeight + 2 + "px";
    };
    requestAnimationFrame(fit);
    new ResizeObserver(fit).observe(ta);
    return ta;
  }
  var getP = (o, p) => p.split(".").reduce((a2, k) => a2 == null ? a2 : a2[k], o);
  var setP = (o, p, v) => {
    const ks = p.split("."), last = ks.pop();
    const t2 = ks.reduce((a2, k) => a2[k] == null ? a2[k] = {} : a2[k], o);
    t2[last] = v;
  };
  var SERIES_COLORS = ["sky", "yellow", "blue", "slate", "grey"];
  function parseTable(text) {
    const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.trim());
    if (!lines.length) return null;
    const sep = lines[0].includes("	") ? "	" : lines[0].includes(";") ? ";" : ",";
    const cells = lines.map((l) => l.split(sep).map((c2) => c2.trim()));
    const num2 = (c2) => {
      const n = parseFloat(String(c2).replace(/\s/g, "").replace(",", "."));
      return isNaN(n) ? null : n;
    };
    let header = null;
    if (cells[0].slice(1).some((c2) => c2 !== "" && num2(c2) === null)) header = cells.shift();
    const nser = Math.max(1, ...cells.map((c2) => c2.length - 1));
    return { header, nser, rows: cells.map((c2) => ({ label: c2[0] || "", v: Array.from({ length: nser }, (_, j) => num2(c2[j + 1]) ?? 0) })) };
  }
  var mkToHtml = (t2) => {
    const lines = String(t2 || "").replace(/\r\n?/g, "\n").split("\n").filter((l) => l.trim());
    let html = "", ul = false;
    for (const l of lines) {
      const hd = l.trim().match(/^(#{1,5})\s+(.*)$/);
      if (hd) {
        if (ul) {
          html += "</ul>";
          ul = false;
        }
        html += `<h${hd[1].length}>${inline(hd[2])}</h${hd[1].length}>`;
        continue;
      }
      const m2 = l.trim().match(/^[-•]\s+(.*)$/);
      if (m2 && !ul) {
        html += "<ul>";
        ul = true;
      } else if (!m2 && ul) {
        html += "</ul>";
        ul = false;
      }
      html += m2 ? `<li>${inline(m2[1])}</li>` : `<div>${inline(l.trim())}</div>`;
    }
    return html + (ul ? "</ul>" : "") || "<div><br></div>";
  };
  function htmlToMk(root) {
    const lines = [];
    let cur = [];
    const emit = () => {
      const runs = [];
      for (const r of cur) {
        const l = runs[runs.length - 1];
        if (l && l.b === r.b && l.i === r.i && l.u === r.u && l.sup === r.sup && l.sub === r.sub) l.t += r.t;
        else runs.push({ ...r });
      }
      return runs.filter((r) => r.t !== "").map((r) => {
        let t2 = r.t;
        if (!t2.trim()) return t2;
        if (r.sub) t2 = `,,${t2},,`;
        if (r.sup) t2 = `^^${t2}^^`;
        if (r.i) t2 = `~~${t2}~~`;
        if (r.b) t2 = `**${t2}**`;
        if (r.u) t2 = `__${t2}__`;
        return t2;
      }).join("");
    };
    const flush2 = (bullet, pre = "") => {
      const t2 = emit().trim();
      cur = [];
      if (t2) lines.push((bullet ? "- " : pre) + t2);
    };
    const walk2 = (n, st, bullet) => {
      if (n.nodeType === 3) {
        cur.push({ t: n.nodeValue.replace(/[ \n]/g, " "), ...st });
        return;
      }
      if (n.nodeType !== 1) return;
      const tag = n.tagName, fw = n.style.fontWeight, s2 = { ...st };
      if (tag === "BR") {
        cur.push({ t: "\u2028", ...st });
        return;
      }
      if (tag === "B" || tag === "STRONG" || fw === "bold" || +fw >= 600) s2.b = true;
      if (tag === "I" || tag === "EM" || n.style.fontStyle === "italic") s2.i = true;
      if (tag === "SUP") s2.sup = true;
      if (tag === "SUB") s2.sub = true;
      if (tag === "U" || /underline/.test(n.style.textDecoration)) s2.u = true;
      if (tag === "UL" || tag === "OL") {
        for (const c2 of n.childNodes) walk2(c2, s2, true);
        return;
      }
      if (/^H[1-5]$/.test(tag)) {
        if (cur.length) flush2(bullet);
        for (const c2 of n.childNodes) walk2(c2, s2, bullet);
        flush2(bullet, "#".repeat(+tag[1]) + " ");
        return;
      }
      const block = tag === "LI" || tag === "DIV" || tag === "P";
      if (block && cur.length) flush2(bullet);
      const b2 = bullet || tag === "LI";
      for (const c2 of n.childNodes) walk2(c2, s2, b2);
      if (block) flush2(b2);
    };
    for (const c2 of root.childNodes) walk2(c2, { b: false, i: false, u: false, sup: false, sub: false }, false);
    flush2(false);
    return lines.join("\n");
  }
  function richEditor(value2, onChange, opts = {}) {
    const ed = h("div", { class: "re", contentEditable: "true", spellcheck: "true", innerHTML: mkToHtml(value2) });
    const cmd = (c2) => () => {
      ed.focus();
      document.execCommand(c2);
      onChange(htmlToMk(ed));
      sync();
    };
    const mk = (label, title, c2, style) => {
      const b = h("button", { type: "button", class: "mini", textContent: label, title, style, dataset: { cmd: c2 }, onmousedown: (e) => e.preventDefault(), onclick: cmd(c2) });
      return b;
    };
    const bar = h("div", { class: "row fmt" }, mk("B", "Gras", "bold", { fontWeight: 800 }), mk("I", "Italique", "italic", { fontStyle: "italic" }), mk("U", "Soulign\xE9", "underline", { textDecoration: "underline" }), mk("x\xB2", "Exposant", "superscript"), mk("x\u2082", "Indice", "subscript"), opts.bullets === false ? null : (() => {
      const b = mk("", "Liste \xE0 puces", "insertUnorderedList");
      b.append(ico("list"));
      return b;
    })());
    const styleSel = opts.bullets === false ? null : h(
      "select",
      {
        class: "re-style",
        title: t("Style de paragraphe"),
        "aria-label": t("Style de paragraphe"),
        onmousedown: () => {
          const sl = window.getSelection();
          if (sl.rangeCount && ed.contains(sl.anchorNode)) saved = sl.getRangeAt(0).cloneRange();
        },
        onchange: (e) => {
          const v = e.target.value;
          ed.focus();
          if (saved) {
            const sl = window.getSelection();
            sl.removeAllRanges();
            sl.addRange(saved);
          }
          document.execCommand("formatBlock", false, v);
          onChange(htmlToMk(ed));
          sync();
        }
      },
      [["DIV", "Texte"], ["H1", "Titre 1"], ["H2", "Titre 2"], ["H3", "L\xE9gende"], ["H4", "Chiffre cl\xE9"], ["H5", "Chiffre cl\xE9 (petit)"]].map(([v, l]) => h("option", { value: v, textContent: t(l) }))
    );
    let saved = null;
    const sync = () => {
      bar.querySelectorAll("[data-cmd]").forEach((b) => {
        let on = false;
        try {
          on = document.queryCommandState(b.dataset.cmd);
        } catch (e) {
        }
        b.classList.toggle("on", on);
      });
      if (styleSel) {
        let v = "";
        try {
          v = String(document.queryCommandValue("formatBlock") || "").toUpperCase().replace(/[<>]/g, "");
        } catch (e) {
        }
        styleSel.value = /^H[1-5]$/.test(v) ? v : "DIV";
      }
    };
    ed.addEventListener("input", () => onChange(htmlToMk(ed)));
    ed.addEventListener("keyup", sync);
    ed.addEventListener("mouseup", sync);
    ed.addEventListener("focus", sync);
    ed.addEventListener("paste", (e) => {
      e.preventDefault();
      document.execCommand("insertText", false, (e.clipboardData || window.clipboardData).getData("text/plain"));
    });
    if (styleSel) bar.prepend(styleSel);
    if (opts.bullets === false) ed.classList.add("re-line");
    return h("div", { class: "re-wrap" }, bar, ed, opts.bullets === false ? null : h("div", { class: "hint", textContent: t("Entr\xE9e = nouveau paragraphe \xB7 Maj + Entr\xE9e = retour \xE0 la ligne") }));
  }
  function buildFields(spec, obj, ctx2, palOpts, h2, root = obj) {
    const out = [];
    const live = (fn) => (e) => {
      fn(e.target);
      ctx2.changed();
    };
    for (const f of spec) {
      if (f.t === "node") out.push(f.build(root, ctx2));
      else if ((f.t === "text" || f.t === "lines") && f.rich) out.push(h2("div", { class: "f" }, h2("div", { class: "hint" }, f.label, helpBtn(f.label)), richEditor(getP(obj, f.k) ?? "", (v) => {
        setP(obj, f.k, v);
        ctx2.changed();
      }, { bullets: false })));
      else if (f.t === "text") out.push(h2("label", { class: "f" }, f.label, helpBtn(f.label), f.k === "suffix" || f.single ? h2("input", { type: "text", value: getP(obj, f.k) ?? "", oninput: live((t2) => setP(obj, f.k, t2.value)) }) : multiline(h2, getP(obj, f.k), (e) => {
        setP(obj, f.k, e.target.value);
        ctx2.changed();
      })));
      else if (f.t === "area") out.push(h2("div", { class: "f" }, h2("div", { class: "hint", textContent: f.label }), richEditor(getP(obj, f.k) ?? "", (v) => {
        setP(obj, f.k, v);
        ctx2.changed();
      })));
      else if (f.t === "lines") out.push(h2("label", { class: "f" }, f.label, h2("textarea", { value: getP(obj, f.k) ?? "", style: { minHeight: "64px" }, oninput: live((t2) => setP(obj, f.k, t2.value)) })));
      else if (f.t === "number") out.push(h2("label", { class: "f" }, f.label, helpBtn(f.label), h2("input", { type: "number", value: getP(obj, f.k) ?? 0, min: f.min, max: f.max, step: f.step || 1, oninput: live((t2) => {
        const v = parseFloat(t2.value);
        if (!isNaN(v)) setP(obj, f.k, v);
      }) })));
      else if (f.t === "ctext") {
        const ta = h2("textarea", { value: getP(obj, f.k) ?? "", style: { minHeight: "84px" }, oninput: live((t2) => setP(obj, f.k, t2.value)) });
        const level = (n) => () => {
          const v = ta.value, a2 = ta.selectionStart, b = ta.selectionEnd, s0 = v.lastIndexOf("\n", a2 - 1) + 1;
          let e0 = v.indexOf("\n", b);
          if (e0 < 0) e0 = v.length;
          const out2 = v.slice(s0, e0).split("\n").map((l) => l.replace(/^#{1,3} ?/, "")).map((l) => n === 1 ? l : "#".repeat(n) + " " + l).join("\n");
          ta.value = v.slice(0, s0) + out2 + v.slice(e0);
          setP(obj, f.k, ta.value);
          ctx2.changed();
          ta.focus();
          ta.setSelectionRange(s0, s0 + out2.length);
        };
        const tb = (label, title, n) => h2("button", { type: "button", class: "mini", textContent: label, title, onmousedown: (e) => e.preventDefault(), onclick: level(n) });
        out.push(h2(
          "div",
          { class: "f" },
          h2("div", { class: "hint" }, f.label, helpBtn(f.label)),
          h2("div", { class: "row fmt" }, tb("H1", t("Titre 1 (grand)"), 1), tb("H2", t("Titre 2 (moyen)"), 2), tb("Aa", t("Texte courant"), 3)),
          ta,
          h2("div", { class: "hint", textContent: t("Une ligne par paragraphe. {total} = somme des valeurs. Le texte passe \xE0 la ligne et ne d\xE9passe jamais l\u2019anneau.") })
        ));
      } else if (f.t === "bool") out.push(h2("label", { class: "row", style: { marginBottom: "8px" } }, h2("input", { type: "checkbox", checked: !!getP(obj, f.k), onchange: live((t2) => setP(obj, f.k, t2.checked)) }), f.label, helpBtn(f.label)));
      else if (f.t === "color") out.push(h2("div", { class: "f" }, h2("div", { class: "hint" }, f.label, helpBtn(f.label)), colorSelect({ value: getP(obj, f.k) ?? "blue", options: palOpts, text: true, onChange: (v) => {
        setP(obj, f.k, v);
        ctx2.changed();
      } })));
      else if (f.t === "select" && f.icons) {
        const opts = typeof f.options === "function" ? f.options(root) : f.options;
        out.push(h2("div", { class: "f" }, h2("div", { class: "hint" }, f.label, helpBtn(f.label)), iconSelect({ value: getP(obj, f.k) ?? Object.keys(opts)[0], options: opts, text: true, root, refresh: () => ctx2.restructure(), onChange: (v) => {
          setP(obj, f.k, v);
          ctx2.changed();
        } })));
      } else if (f.t === "select") {
        const opts = typeof f.options === "function" ? f.options(root) : f.options;
        const sel = h2("select", { onchange: live((t2) => setP(obj, f.k, t2.value)) }, Object.entries(opts).map(([v, l]) => h2("option", { value: v, textContent: l })));
        sel.value = getP(obj, f.k) ?? Object.keys(opts)[0];
        out.push(h2("label", { class: "f" }, f.label, helpBtn(f.label), sel));
      } else if (f.t === "list") {
        const arr = obj[f.k] || (obj[f.k] = []);
        const box = h2("div", {}, h2("div", { class: "hint", textContent: f.label }));
        arr.forEach((it, i) => {
          const mv = (d) => () => {
            const j = i + d;
            if (j < 0 || j >= arr.length) return;
            [arr[i], arr[j]] = [arr[j], arr[i]];
            ctx2.restructure();
          };
          box.append(h2(
            "div",
            { class: "col-card", dataset: { path: `${f.k}.${i}` } },
            h2("div", { class: "chd" }, h2("span", { textContent: `#${i + 1}` }), h2(
              "span",
              { class: "row" },
              h2("button", { type: "button", class: "mini", onclick: mv(-1) }, ico("arrow-up")),
              h2("button", { type: "button", class: "mini", onclick: mv(1) }, ico("arrow-down")),
              arr.length > (f.min ?? 1) ? h2("button", { type: "button", class: "mini danger", title: "Supprimer", onclick: () => {
                arr.splice(i, 1);
                ctx2.restructure();
              } }, ico("x")) : null
            )),
            buildFields(f.fields, it, ctx2, palOpts, h2, root)
          ));
        });
        if (arr.length < (f.max || 12)) box.append(h2("button", { type: "button", textContent: "+ Ajouter", onclick: () => {
          arr.push(f.item(arr.length));
          ctx2.restructure();
        } }));
        out.push(box);
      } else if (f.t === "table") out.push(tableField(f, obj, ctx2, palOpts, h2));
    }
    return out;
  }
  function tableField(f, obj, ctx2, palOpts, h2) {
    const rows = obj[f.k], series = obj[f.series];
    const fix = () => rows.forEach((r) => {
      r.v = Array.from({ length: series.length }, (_, j) => +(r.v || [])[j] || 0);
    });
    const box = h2("div", {}, h2("div", { class: "hint", textContent: f.label }));
    series.forEach((sr, j) => {
      const cs = h2("select", { onchange: (e) => {
        sr.color = e.target.value;
        ctx2.changed();
      } }, Object.entries(palOpts).map(([v, l]) => h2("option", { value: v, textContent: l })));
      cs.value = sr.color;
      box.append(h2(
        "div",
        { class: "row", style: { marginBottom: "6px" } },
        cs,
        h2("input", { type: "text", value: sr.name || "", placeholder: `${t("S\xE9rie")} ${j + 1}`, oninput: (e) => {
          sr.name = e.target.value;
          ctx2.changed();
        } }),
        series.length > 1 ? h2("button", { type: "button", class: "mini danger", title: "Supprimer", onclick: () => {
          series.splice(j, 1);
          fix();
          ctx2.restructure();
        } }, ico("x")) : null
      ));
    });
    if (series.length < (f.maxSeries || 4)) box.append(h2("button", { type: "button", textContent: "+ S\xE9rie", onclick: () => {
      series.push({ name: `${t("S\xE9rie")} ${series.length + 1}`, color: SERIES_COLORS[series.length % SERIES_COLORS.length] });
      fix();
      ctx2.restructure();
    } }));
    const grid = h2("div", { class: "tgrid", style: { gridTemplateColumns: `1fr ${series.map(() => "58px").join(" ")} 24px` } });
    grid.append(h2("span", { class: "hint", textContent: "Libell\xE9" }), ...series.map((sr) => h2("span", { class: "hint", textContent: sr.name || "\u2014" })), h2("span"));
    rows.forEach((r, i) => {
      grid.append(
        h2("input", { type: "text", value: r.label || "", oninput: (e) => {
          r.label = e.target.value;
          ctx2.changed();
        } }),
        ...series.map((_, j) => h2("input", { type: "text", inputMode: "decimal", value: (r.v || [])[j] ?? 0, oninput: (e) => {
          const n = parseFloat(String(e.target.value).replace(",", "."));
          (r.v || (r.v = []))[j] = isNaN(n) ? 0 : n;
          ctx2.changed();
        } })),
        rows.length > 1 ? h2("button", { type: "button", class: "mini danger", title: "Supprimer", onclick: () => {
          rows.splice(i, 1);
          ctx2.restructure();
        } }, ico("x")) : h2("span")
      );
    });
    box.append(grid, h2("button", { type: "button", textContent: "+ Ligne", onclick: () => {
      rows.push({ label: "", v: series.map(() => 0) });
      ctx2.restructure();
    } }));
    const ta = h2("textarea", { placeholder: "Collez un tableau depuis Excel ou un CSV : libell\xE9 \u21E5 s\xE9rie 1 \u21E5 s\xE9rie 2\u2026  (la 1re ligne peut contenir les noms de s\xE9ries)", style: { minHeight: "56px" } });
    box.append(h2("details", { open: false }, h2("summary", { textContent: "Coller un tableau" }), h2(
      "div",
      { class: "body" },
      ta,
      h2("button", { type: "button", textContent: "Remplacer les donn\xE9es", onclick: () => {
        const p = parseTable(ta.value);
        if (!p) return;
        const max2 = f.maxSeries || 4, n = Math.min(p.nser, max2);
        const ns = Array.from({ length: n }, (_, j) => ({ name: p.header && p.header[j + 1] || series[j] && series[j].name || `${t("S\xE9rie")} ${j + 1}`, color: series[j] && series[j].color || SERIES_COLORS[j % SERIES_COLORS.length] }));
        series.splice(0, series.length, ...ns);
        rows.splice(0, rows.length, ...p.rows.map((r) => ({ label: r.label, v: r.v.slice(0, n) })));
        ctx2.restructure();
      } })
    )));
    return box;
  }
  var paletteOptions = (doc2) => Object.fromEntries([...paletteKeys(doc2), ...sectionBgs(doc2)].map((k) => [k, t(colorLabel(doc2, k))]));

  // src/vizheight.js
  var MODE_LABELS = { auto: "Automatique (hauteur naturelle)", ratio: "Proportion de la largeur", fixed: "Fixe", fill: "Remplir la place disponible", match: "Adapter \xE0 la colonne voisine" };
  function heightNodes(ty, o, { ctx: ctx2, width, avail }) {
    const modes = [...ty.heights, "match"], mode = modes.includes(o.hmode) ? o.hmode : modes[0], rf = (ty.fields || []).find((f) => f.k === "ratio");
    const sel = h("select", { onchange: (e) => {
      o.hmode = e.target.value;
      ctx2.restructure();
    } }, modes.map((m2) => h("option", { value: m2, textContent: t(MODE_LABELS[m2]), selected: m2 === mode })));
    const num2 = (k, label, def, min2, max2, step = 3) => h("label", { class: "f" }, t(label), helpBtn(label), h("input", { type: "number", value: o[k] ?? def, min: min2, max: max2, step, oninput: (e) => {
      const v = parseFloat(e.target.value);
      if (!isNaN(v)) {
        o[k] = v;
        ctx2.changed();
      }
    } }));
    const nodes = [h("label", { class: "f" }, t("Hauteur"), helpBtn("Hauteur"), sel)];
    if (mode === "ratio" && rf) nodes.push(...buildFields([rf], o, ctx2, {}, h));
    if (mode === "fixed") nodes.push(num2("hfixed", "Hauteur du graphique (px)", Math.round(width * 0.5625 / 3) * 3, 90, 900));
    if (mode === "fill" || mode === "match") {
      nodes.push(num2("hmin", "Hauteur minimale (px)", 120, 90, 900), num2("hmax", "Hauteur maximale (px)", 600, 90, 900));
      if (avail) nodes.push(h("label", { class: "f" }, t("Place disponible pour cet aper\xE7u (px)"), helpBtn("Place disponible pour cet aper\xE7u (px)"), h("input", { type: "number", value: avail.get(), min: 90, max: 1200, step: 15, oninput: (e) => {
        const v = parseFloat(e.target.value);
        if (!isNaN(v)) avail.set(v);
      } })));
      nodes.push(h("p", { class: "hint", textContent: t("Dans le document, la dataviz occupe la place restante de la page (partag\xE9e s\u2019il y en a plusieurs), entre ces deux bornes.") }));
    }
    if (ty.boxed && (mode === "fixed" || mode === "fill" || mode === "match")) {
      const vs = h("select", { onchange: (e) => {
        o.valign = e.target.value;
        ctx2.restructure();
      } }, ["top", "center", "bottom"].map((v) => h("option", { value: v, textContent: t({ top: "En haut", center: "Centr\xE9", bottom: "En bas" }[v]), selected: (o.valign || "top") === v })));
      nodes.push(h("label", { class: "f" }, t("Alignement vertical de la dataviz"), helpBtn("Alignement vertical de la dataviz"), vs));
    }
    return nodes;
  }

  // src/props.js
  var shut = /* @__PURE__ */ new Set();
  function buildProps(root, ctx2) {
    const doc2 = ctx2.getDoc(), path = ctx2.getSel();
    root.innerHTML = "";
    const append = root.append.bind(root);
    root.append = (...k) => append(...k.filter((x) => x != null && x !== false));
    applyVars(root, cssVars(doc2.theme, doc2.colors));
    const th = THEMES[doc2.theme] || THEMES.eu, palOpts = paletteOptions(doc2);
    const live = (fn) => (e) => {
      fn(e.target.value, e);
      ctx2.changed();
    };
    const struct = (fn) => () => {
      fn();
      ctx2.restructure();
    };
    const field = (label, input) => h("label", { class: "f" }, label, helpBtn(label), input);
    const text = (obj, k, label, ph) => h("div", { class: "f" }, h("div", { class: "hint" }, label, helpBtn(label)), richEditor(obj[k] || "", (v) => {
      obj[k] = v;
      ctx2.changed();
    }, { bullets: false }));
    const select = (obj, k, label, opts, onSet) => {
      const s2 = h("select", { onchange: (e) => {
        obj[k] = e.target.value;
        onSet ? onSet() : ctx2.changed();
      } }, Object.entries(opts).map(([v, l]) => h("option", { value: v, textContent: l })));
      s2.value = obj[k];
      return field(label, s2);
    };
    const swatches = (label, obj, k, keys, withNone) => {
      const light = keys.filter((c2) => c2.startsWith("tint-")), solid = keys.filter((c2) => !c2.startsWith("tint-"));
      const dot2 = (c2) => h("button", { type: "button", class: "hv-sw" + (obj[k] === c2 ? " on" : ""), title: t(colorLabel(doc2, c2)), "aria-label": t(colorLabel(doc2, c2)), style: { background: `var(--c-${c2})` }, onclick: struct(() => {
        obj[k] = c2;
      }) });
      const gap = () => h("span", { class: "hv-sw ghost" });
      const none = h("button", { type: "button", class: "hv-sw none" + (!obj[k] || obj[k] === "none" ? " on" : ""), title: t("Aucun"), "aria-label": t("Aucun"), onclick: struct(() => {
        obj[k] = "none";
      }) });
      const pal = h("button", { type: "button", class: "hv-sw pal-btn", title: t("Modifier, renommer ou ajouter des couleurs"), "aria-label": t("Modifier, renommer ou ajouter des couleurs"), onclick: (e) => openPalette(e.currentTarget, ctx2) }, ico("plus"));
      const lightRow = solid.map((c2) => {
        const tc = "tint-" + c2;
        return light.includes(tc) ? dot2(tc) : gap();
      });
      return h(
        "div",
        { class: "f" },
        h("div", { class: "hint" }, label, helpBtn(label)),
        h("div", { class: "swrow" }, withNone ? none : null, ...solid.map(dot2), pal),
        light.length ? h("div", { class: "swrow" }, withNone ? gap() : null, ...lightRow) : null
      );
    };
    const imgPicker = (label, get, set, max2) => {
      const inp = h("input", { type: "file", accept: "image/*", hidden: true, onchange: async () => {
        const f = inp.files[0];
        inp.value = "";
        if (!f) return;
        try {
          set(await readImage(f, max2));
          ctx2.restructure();
        } catch (e) {
          alert(t("Image illisible."));
        }
      } });
      return h(
        "div",
        { class: "f" },
        h("div", { class: "hint", textContent: label }),
        h(
          "div",
          { class: "row" },
          get() ? h("img", { class: "thumb", src: get() }) : null,
          h("button", { type: "button", textContent: get() ? "Remplacer\u2026" : "Importer\u2026", onclick: () => inp.click() }),
          get() ? h("button", { type: "button", class: "danger", textContent: "Retirer", onclick: struct(() => set(null)) }) : null,
          inp
        )
      );
    };
    const logoPicker = (H) => {
      const v = H.logoVariant, orig = DEFAULT_LOGOS()[v], custom3 = H.logos[v] !== orig;
      const sel = h(
        "select",
        { onchange: (e) => {
          H.logoVariant = e.target.value;
          ctx2.restructure();
        } },
        Object.entries(LOGO_VARIANTS).map(([k, l]) => h("option", { value: k, textContent: `${t(l)} \u2014 ${t(H.logos[k] !== DEFAULT_LOGOS()[k] ? "personnalis\xE9" : "original")}`, selected: v === k }))
      );
      const inp = h("input", { type: "file", accept: "image/*", hidden: true, onchange: async () => {
        const f = inp.files[0];
        inp.value = "";
        if (!f) return;
        try {
          H.logos[v] = await readImage(f, 800);
          ctx2.restructure();
        } catch (e) {
          alert(t("Image illisible."));
        }
      } });
      return h(
        "div",
        {},
        field("Version du logo", sel),
        h(
          "div",
          { class: "f" },
          h("div", { class: "hint", textContent: `Logo \u2014 ${t(LOGO_VARIANTS[v])}` }),
          h(
            "div",
            { class: "row" },
            h("img", { class: "thumb" + (v === "white" || v === "negative" ? " dark" : ""), src: H.logos[v], alt: "" }),
            h("button", { type: "button", textContent: "Charger une autre image\u2026", onclick: () => inp.click() }),
            custom3 ? h("button", { type: "button", textContent: "R\xE9tablir l\u2019original", onclick: struct(() => {
              H.logos[v] = orig;
            }) }) : null,
            inp
          )
        ),
        h("p", { class: "hint", textContent: "Les 4 versions ont la m\xEAme taille (138 \xD7 42 px). PNG transparent ou SVG." })
      );
    };
    const imageLibrary = (H) => {
      const cur = headerImage(H);
      const pick = (e) => async () => {
        const inp = e.input;
        const f = inp.files[0];
        inp.value = "";
        if (!f) return;
        try {
          e.img.src = await readImage(f, 800);
          H.imageId = e.img.id;
          ctx2.restructure();
        } catch (x) {
          alert(t("Image illisible."));
        }
      };
      const tile = (img) => {
        const inp = h("input", { type: "file", accept: "image/*", hidden: true });
        inp.addEventListener("change", pick({ input: inp, img }));
        return h(
          "div",
          { class: "imgtile" + (cur && cur.id === img.id ? " on" : "") },
          h(
            "button",
            { type: "button", class: "imgtile-pic", title: img.name, onclick: () => {
              H.imageId = img.id;
              ctx2.restructure();
            } },
            img.src ? h("img", { src: img.src, alt: "" }) : h("span", { textContent: "Pas d\u2019image" })
          ),
          h("div", { class: "imgtile-name", textContent: img.id === DEFAULT_IMAGE_ID ? t("Image par d\xE9faut") : img.name }),
          img.id === DEFAULT_IMAGE_ID ? null : h(
            "div",
            { class: "row imgtile-act" },
            h("button", { type: "button", class: "mini", title: img.src ? "Remplacer\u2026" : "Importer\u2026", onclick: () => inp.click() }, ico("upload")),
            h("button", { type: "button", class: "mini", title: "Renommer", onclick: () => {
              const n = prompt(t("Nom de l\u2019image :"), img.name);
              if (n && n.trim()) {
                img.name = n.trim();
                ctx2.restructure();
              }
            } }, ico("pencil")),
            h("button", { type: "button", class: "mini danger", title: "Supprimer", onclick: () => {
              if (!confirm(t("Supprimer cette image ?"))) return;
              H.images.splice(H.images.indexOf(img), 1);
              if (H.imageId === img.id) H.imageId = H.images[0].id;
              ctx2.restructure();
            } }, ico("x"))
          ),
          inp
        );
      };
      return h(
        "div",
        { class: "f" },
        h("div", { class: "hint", textContent: "Image affich\xE9e (132 px de haut, largeur selon l\u2019image) \u2014 choisissez dans la biblioth\xE8que :" }),
        h(
          "div",
          { class: "imggrid" },
          H.images.map(tile),
          h("button", { type: "button", class: "imgtile-add", onclick: () => {
            const n = newHeaderImage(H.images.length + 1);
            H.images.push(n);
            H.imageId = n.id;
            ctx2.restructure();
          } }, ico("plus"), h("span", { textContent: "Ajouter une image" }))
        )
      );
    };
    const segmented = (label, obj, k, icons, names) => h(
      "div",
      { class: "f" },
      h("div", { class: "hint", textContent: label }),
      h("div", { class: "seg" }, Object.entries(icons).map(([v, ic]) => h("button", { type: "button", class: v === (obj[k] || Object.keys(icons)[0]) ? "on" : "", title: names[v], "aria-label": names[v], "aria-pressed": String(v === (obj[k] || Object.keys(icons)[0])), onclick: () => {
        obj[k] = v;
        ctx2.restructure();
      } }, ico(ic))))
    );
    const cardPanel = (col2, W) => {
      const C = col2.card || (col2.card = newCard(W)), ct = C.content;
      const chosen = (fn) => {
        fn();
        C.auto = false;
        ctx2.restructure();
      };
      const check = ([k, label]) => h("label", { class: "row" }, h("input", { type: "checkbox", checked: !!C[k], onchange: (e) => chosen(() => {
        C[k] = e.target.checked;
      }) }), label);
      const sel = (k, label, opts) => {
        const s2 = h("select", { onchange: (e) => chosen(() => {
          C[k] = e.target.value;
        }) }, Object.entries(opts).map(([v, l]) => h("option", { value: v, textContent: l })));
        s2.value = C[k];
        return field(label, s2);
      };
      const fields = [
        { k: "tag", t: "text", rich: true, label: "\xC9tiquette" },
        { k: "title", t: "text", rich: true, label: "Titre" },
        { k: "figure", t: "text", rich: true, label: "Chiffre" },
        { k: "text", t: "area", label: "Texte" },
        { k: "bullets", t: "lines", rich: true, label: "Puces (une par ligne)" },
        { k: "link", t: "text", rich: true, label: "Lien" }
      ];
      return h(
        "div",
        {},
        ...buildFields(fields, ct, ctx2, palOpts, h),
        C.image ? imgPicker("Image de la carte", () => C.src, (v) => {
          C.src = v;
        }, 1200) : null,
        h(
          "details",
          { class: "opts", open: true },
          h("summary", { textContent: "Options de la carte" }),
          h("label", { class: "row" }, h("input", { type: "checkbox", checked: !!C.auto, onchange: (e) => {
            C.auto = e.target.checked;
            if (C.auto) Object.assign(C, cardPresetFor(W));
            ctx2.restructure();
          } }), "Type de carte selon la largeur de la colonne"),
          sel("layout", "Position de l\u2019image", { vertical: t("En haut"), left: t("\xC0 gauche"), right: t("\xC0 droite") }),
          sel("align", "Alignement", { left: t("Gauche"), center: t("Centr\xE9") }),
          C.icon ? h("div", { class: "f" }, h("div", { class: "hint", textContent: t("Ic\xF4ne choisie") }), iconSelect({ value: C.iconName || Object.keys(ICON_OPTIONS)[0], options: { ...ICON_OPTIONS, ...customChoices() }, text: true, refresh: () => ctx2.restructure(), onChange: (v) => chosen(() => {
            C.iconName = v;
          }) })) : null,
          CARD_CHECKS.map(check)
        )
      );
    };
    const switchBtn = (on, label, fn) => h("button", { type: "button", role: "switch", "aria-checked": String(!!on), "aria-label": label, class: "pp-switch" + (on ? " on" : ""), onclick: fn });
    const switchRow = (label, on, fn) => h("div", { class: "pp-switchrow" }, h("span", {}, label, helpBtn(label)), switchBtn(on, label, struct(fn)));
    const card = (id, icon, name, nodes, toggle) => cardEl(id, icon, name, nodes, { shut, refresh: ctx2.refreshProps, live: !toggle || toggle.on, toggle: toggle ? switchBtn(toggle.on, name, struct(toggle.set)) : null });
    const btn = (icon, label, fn, cls = "") => h("button", { type: "button", class: "pp-btn " + cls, onclick: fn }, ico(icon), h("span", { textContent: label }));
    const boxControls = (obj, fillLabel = "Fond") => [
      swatches(fillLabel, obj, "fillColor", toneKeys(doc2), true),
      switchRow(t("Contour"), obj.stroke, () => {
        obj.stroke = !obj.stroke;
      }),
      swatches("Hachures", obj, "hatch", toneKeys(doc2), true),
      obj.stroke ? swatches("Couleur du contour", obj, "strokeColor", toneKeys(doc2)) : null
    ];
    const title = (name, crumbs = []) => root.append(h(
      "div",
      { class: "pr-head" },
      h("div", { class: "crumbs" }, crumbs.flatMap(([l, p]) => [h("a", { textContent: l, onclick: () => ctx2.select(p) }), " \u203A "])),
      h("h2", { textContent: name })
    ));
    const freeTexts = (col2) => {
      const arr = col2.texts || (col2.texts = []);
      const num2 = (label, tx, k, min2, max2) => field(label, h("input", { type: "number", min: min2, max: max2, step: 1, value: tx[k] ?? 0, oninput: (e) => {
        tx[k] = +e.target.value || 0;
        ctx2.changed();
      } }));
      const items = arr.map((tx, i) => h(
        "div",
        { class: "col-card" },
        h("div", { class: "chd" }, h("span", { textContent: `#${i + 1}` }), h("button", { type: "button", class: "mini danger", title: t("Supprimer"), onclick: () => {
          arr.splice(i, 1);
          ctx2.restructure();
        } }, ico("x"))),
        richEditor(tx.text || "", (v) => {
          tx.text = v;
          ctx2.changed();
        }),
        field("Placement", (() => {
          const sl = h("select", { onchange: (e) => {
            tx.mode = e.target.value;
            ctx2.restructure();
          } }, [["free", "Libre (glisser dans l\u2019aper\xE7u)"], ["above", "Au-dessus du contenu"], ["below", "En dessous du contenu"]].map(([v, l]) => h("option", { value: v, textContent: t(l) })));
          sl.value = tx.mode || "free";
          return sl;
        })()),
        (tx.mode || "free") === "free" ? h("div", { class: "row" }, num2("X (% de la colonne)", tx, "x", 0, 100), num2("Largeur (%)", tx, "w", 10, 100), tx.y == null ? null : num2("Y (px)", tx, "y", 0, 2e3)) : null
      ));
      return [
        ...items,
        h("button", { type: "button", class: "pp-btn", onclick: () => {
          arr.push({ x: 0, y: arr.length * 30, w: 50, text: "Texte libre" });
          ctx2.restructure();
        } }, ico("plus"), h("span", { textContent: t("Ajouter un texte") })),
        h("p", { class: "hint", textContent: t("Glisser un texte \xAB libre \xBB dans l\u2019aper\xE7u pour le placer o\xF9 l\u2019on veut dans la colonne ; \xAB au-dessus \xBB ou \xAB en dessous \xBB le met dans le flux, avant ou apr\xE8s le contenu.") })
      ];
    };
    const actions = (...b) => h("div", { class: "pp-actions" }, ...b);
    const P = (path || "").split(":"), kind = P[0] || "doc", si = +P[1], bi = +P[2], ci = +P[3];
    const sec = doc2.sections[si], sub = sec && sec.subs[bi], col = sub && sub.cols[ci];
    const ICONS2 = { text: "text-size", image: "photo", card: "layout-cards", figure: "number", viz: "chart-bar" };
    if (kind === "doc") {
      root.append(h(
        "div",
        { class: "pp-empty" },
        ico("pointer"),
        h("p", { textContent: "S\xE9lectionnez un \xE9l\xE9ment dans la structure (\xE0 gauche) ou sur la page pour modifier ses propri\xE9t\xE9s." }),
        h("p", { class: "hint", textContent: "Les couleurs, le format des nombres et le nom du fichier sont dans le menu \xC9dition." })
      ));
    } else if (kind === "header") {
      const H = doc2.header;
      title("Header");
      root.append(
        card("hd-text", "typography", t("Texte"), [text(H, "overline", "Surtitre"), text(H, "title", "Titre (taille fixe)"), text(H, "subtitle", "Sous-titre (optionnel \u2014 vide = masqu\xE9)")]),
        card("hd-colors", "palette", t("Couleurs"), [swatches("Couleur de fond", H, "bg", toneKeys(doc2)), swatches("Couleur du texte", H, "fg", toneKeys(doc2))]),
        card("hd-image", "photo", t("Image"), [imageLibrary(H)], { on: H.showImage, set: () => {
          H.showImage = !H.showImage;
        } }),
        card("hd-logo", "certificate", t("Logo"), [logoPicker(H)], { on: H.showLogo, set: () => {
          H.showLogo = !H.showLogo;
        } })
      );
    } else if (kind === "sec" && sec) {
      title(sec.title || "Section");
      root.append(
        card("sec-main", "layout-rows", t("Section"), [
          text(sec, "title", "Titre de section"),
          switchRow(t("Afficher le titre"), sec.showTitle !== false, () => {
            sec.showTitle = sec.showTitle === false;
          }),
          switchRow(t("Filet au-dessus de la section"), sec.secRule !== false, () => {
            sec.secRule = sec.secRule === false;
          }),
          switchRow(t("Filet entre les sous-sections"), sec.subRules !== false, () => {
            sec.subRules = sec.subRules === false;
          }),
          sec.subRules !== false ? swatches("Couleur du filet", { get ruleColor() {
            return sec.ruleColor || defaultRuleColor(sec);
          }, set ruleColor(v) {
            sec.ruleColor = v;
          } }, "ruleColor", toneKeys(doc2)) : null,
          select(sec, "page", "Page", { recto: "Recto", verso: "Verso" }, () => ctx2.restructure())
        ]),
        card("sec-bg", "color-swatch", t("Fond de la section"), [swatches("Fond", sec, "bg", toneKeys(doc2), true)]),
        card("sec-frame", "border-all", t("Cadre"), boxControls(sec, "Fond du cadre")),
        actions(
          btn("arrow-up", t("Monter"), struct(() => {
            stepSection(doc2, si, -1);
          })),
          btn("arrow-down", t("Descendre"), struct(() => {
            stepSection(doc2, si, 1);
          })),
          btn("trash", t("Supprimer"), () => ctx2.remove(`sec:${si}`), "danger")
        )
      );
    } else if (kind === "sub" && sub) {
      title(sub.title || "Sous-section", [[sec.title || "Section", `sec:${si}`]]);
      const mv = (() => {
        const s2 = h(
          "select",
          { onchange: (e) => {
            if (!e.target.value) return;
            const to = +e.target.value;
            ctx2.moved(() => {
              const n = moveSub(doc2, { si, bi }, { si: to, bi: null });
              return `sub:${n.si}:${n.bi}`;
            });
          } },
          h("option", { value: "", textContent: "\u2014" }),
          doc2.sections.map((x, i) => h("option", { value: i, textContent: `${x.title || t("Section")} (${x.page === "recto" ? t("Recto") : t("Verso")})` }))
        );
        s2.value = "";
        return s2;
      })();
      root.append(
        card("sub-main", "columns", t("Sous-section"), [
          text(sub, "title", "Titre de sous-section"),
          switchRow(t("Afficher le titre"), sub.showTitle !== false, () => {
            sub.showTitle = sub.showTitle === false;
          }),
          field("Colonnes", layoutSelect({ value: sub.layout, layouts: GRID.layouts, onChange: (v) => {
            sub.layout = v;
            const n = GRID.layouts[v].spans.length;
            sub.cols = sub.cols.slice(0, n);
            while (sub.cols.length < n) sub.cols.push(newCol("text"));
            refreshAutoCards(sub, (i) => columnWidth(doc2, si, bi, i));
            ctx2.restructure();
          } })),
          field("D\xE9placer vers la section", mv)
        ]),
        card("sub-box", "border-all", t("Fond et contour"), boxControls(sub)),
        actions(
          btn("arrow-up", t("Monter"), struct(() => {
            const j = bi - 1;
            if (j >= 0) [sec.subs[bi], sec.subs[j]] = [sec.subs[j], sec.subs[bi]];
          })),
          btn("arrow-down", t("Descendre"), struct(() => {
            const j = bi + 1;
            if (j < sec.subs.length) [sec.subs[bi], sec.subs[j]] = [sec.subs[j], sec.subs[bi]];
          })),
          btn("copy", t("Dupliquer"), struct(() => {
            const c2 = JSON.parse(JSON.stringify(sub));
            c2.id = (sub.id || "sub") + "c" + Date.now() % 1e5;
            sec.subs.splice(bi + 1, 0, c2);
          })),
          btn("trash", t("Supprimer"), () => ctx2.remove(`sub:${si}:${bi}`), "danger")
        )
      );
    } else if (kind === "col" && col) {
      title(`Colonne ${ci + 1}`, [[sec.title || "Section", `sec:${si}`], [sub.title || "Sous-section", `sub:${si}:${bi}`]]);
      const typeSel = field("Type de contenu", h(
        "select",
        { onchange: (e) => {
          const keep = col.text, { valign, align, stroke, strokeColor, fillColor } = col;
          Object.assign(col, newCol(e.target.value), { valign, align, stroke, strokeColor, fillColor });
          if (e.target.value === "text" && keep) col.text = keep;
          if (e.target.value === "card") {
            col.card = newCard(columnWidth(doc2, si, bi, ci));
            col.stroke = false;
            col.fillColor = "none";
          }
          ctx2.restructure();
        } },
        Object.entries(COL_TYPES).map(([v, l]) => h("option", { value: v, textContent: l, selected: col.type === v }))
      ));
      let editor;
      if (col.type === "text") editor = [h("div", { class: "f" }, h("div", { class: "hint", textContent: "Texte" }), richEditor(col.text, (v) => {
        col.text = v;
        ctx2.changed();
      }))];
      else if (col.type === "image") {
        const mode = col.imgMode || "ratio";
        editor = [
          imgPicker("Image", () => col.src, (v) => {
            col.src = v;
            col.natural = null;
          }, 1600),
          select(col, "imgMode", "Taille de l\u2019image", { ratio: "Format fixe (recadr\xE9e)", fit: "Ajust\xE9e au conteneur (proportions conserv\xE9es)", custom: "Taille personnalis\xE9e" }, () => ctx2.restructure()),
          mode === "ratio" ? select(col, "ratio", "Format", Object.fromEntries(Object.keys(IMAGE_RATIOS).map((k) => [k, k]))) : null,
          mode === "custom" ? h(
            "div",
            { class: "row2" },
            field("Largeur (% de la colonne)", h("input", { type: "number", min: 5, max: 100, step: 1, value: col.imgW ?? 100, oninput: live((v) => {
              col.imgW = Math.max(5, Math.min(100, parseFloat(v) || 100));
            }) })),
            field("Hauteur (px)", h("input", { type: "number", min: 3, max: 600, step: 3, value: col.imgH ?? 150, oninput: live((v) => {
              col.imgH = Math.max(3, parseFloat(v) || 150);
            }) }))
          ) : null,
          mode === "custom" ? select(col, "imgFit", "Remplissage", { cover: "Recadrer pour remplir", contain: "Image enti\xE8re" }) : null,
          mode === "custom" && (col.imgW ?? 100) < 100 ? segmented("Position dans la colonne", col, "align", { left: ALIGNS.left, center: ALIGNS.center, right: ALIGNS.right }, { left: t("Gauche"), center: t("Centr\xE9"), right: t("Droite") }) : null,
          text(col, "caption", "L\xE9gende (optionnelle)")
        ];
      } else if (col.type === "card") editor = [cardPanel(col, columnWidth(doc2, si, bi, ci))];
      else if (col.type === "figure") {
        if (!col.figure) col.figure = FIGURE_DEFAULTS();
        editor = buildFields(FIGURE_FIELDS, col.figure, ctx2, palOpts, h);
      } else {
        if (!col.viz) col.viz = newViz("bars");
        const kindSel = h(
          "select",
          { onchange: (e) => {
            col.viz = switchKind(col.viz, e.target.value);
            ctx2.restructure();
          } },
          Object.entries(VIZ_FAMILIES).map(([fk, fl]) => h("optgroup", { label: t(fl) }, Object.entries(VIZ_TYPES).filter(([, v]) => v.family === fk).map(([k, v]) => h("option", { value: k, textContent: t(v.label), selected: col.viz.kind === k }))))
        );
        editor = [
          field("Type de dataviz", kindSel),
          h("button", { type: "button", class: "primary", style: { width: "100%" }, onclick: () => ctx2.editViz({ col, sub, ci }) }, ico("pencil"), " Ouvrir l\u2019\xE9diteur de dataviz"),
          h("p", { class: "hint", textContent: "Tous les r\xE9glages de la dataviz (type, donn\xE9es, couleurs, options) se font dans l\u2019\xE9diteur." })
        ];
      }
      const swap = field("\xC9changer le contenu avec\u2026", (() => {
        const s2 = h(
          "select",
          { onchange: (e) => {
            if (!e.target.value) return;
            const [a2, b, c2] = e.target.value.split(":").map(Number);
            ctx2.moved(() => {
              swapCols(doc2, { si, bi, ci }, { si: a2, bi: b, ci: c2 });
              return `col:${a2}:${b}:${c2}`;
            });
          } },
          h("option", { value: "", textContent: "\u2014" }),
          allCols(doc2).filter((c2) => !(c2.si === si && c2.bi === bi && c2.ci === ci)).map((c2) => h("option", { value: `${c2.si}:${c2.bi}:${c2.ci}`, textContent: c2.label + (doc2.sections[c2.si].page !== sec.page ? ` (${c2.page === "recto" ? t("Recto") : t("Verso")})` : "") }))
        );
        s2.value = "";
        return s2;
      })());
      const vt = col.type === "viz" && col.viz && VIZ_TYPES[col.viz.kind];
      root.append(
        card("col-content", ICONS2[col.type] || "text-size", t("Contenu"), [typeSel, ...editor]),
        card("col-free", "text-size", t("Textes libres"), freeTexts(col)),
        col.type === "text" || col.type === "card" ? card("col-side", "number", t("Chiffre \xE0 c\xF4t\xE9"), buildFields(SIDE_FIELDS, col.side || (col.side = newColSide()), ctx2, {}, h)) : null,
        vt && vt.heights ? card("col-height", "ruler-2", t("Hauteur"), heightNodes(vt, col.viz.opts, { ctx: ctx2, width: columnWidth(doc2, si, bi, ci) })) : col.type !== "viz" ? card("col-height", "ruler-2", t("Hauteur"), [
          field("Hauteur minimale (px, 0 = automatique)", h("input", { type: "number", min: 0, max: 1e3, step: 3, value: col.minH || 0, oninput: (e) => {
            col.minH = Math.max(0, +e.target.value || 0);
            ctx2.changed();
          } })),
          h("p", { class: "hint", textContent: t("Ou glisser la poign\xE9e sous la colonne dans l\u2019aper\xE7u : elle se cale sur la colonne voisine.") })
        ]) : null,
        card("col-layout", "layout-align-middle", t("Disposition"), [
          segmented("Alignement vertical dans la colonne", col, "valign", VALIGNS, { top: t("Haut"), center: t("Centre"), bottom: t("Bas") }),
          col.type === "text" ? segmented("Alignement du texte", col, "align", ALIGNS, { left: t("Gauche"), center: t("Centr\xE9"), right: t("Droite"), justify: t("Justifi\xE9") }) : null,
          swap
        ]),
        col.type !== "card" ? card("col-box", "border-all", t("Fond et contour"), boxControls(col)) : null,
        actions(btn("trash", t("Supprimer la colonne"), () => ctx2.remove(`col:${si}:${bi}:${ci}`), "danger"))
      );
    } else {
      title("\xC9l\xE9ment introuvable");
    }
  }

  // src/vizreorder.js
  var ORANGE2 = "#F28C28";
  function startReorder(e, target, { opts, root, redraw, done }) {
    const [key, i0s] = target.getAttribute("data-reorder").split(":"), i0 = +i0s, axis = target.getAttribute("data-axis") || "x";
    const arr0 = (opts[key] || []).slice(), n = arr0.length;
    if (n < 2) return false;
    const rootEl = () => typeof root === "function" ? root() : root;
    const centers = new Array(n);
    rootEl().querySelectorAll(`[data-reorder^="${key}:"]`).forEach((nd) => {
      const j = +nd.getAttribute("data-reorder").split(":")[1], r = nd.getBoundingClientRect();
      centers[j] = axis === "x" ? (r.left + r.right) / 2 : (r.top + r.bottom) / 2;
    });
    const others = centers.map((c2, j) => [c2, j]).filter(([c2, j]) => j !== i0 && c2 != null);
    let cur = i0;
    const mark = () => {
      const nd = rootEl().querySelector(`[data-reorder="${key}:${cur}"]`);
      if (!nd) return;
      if (nd instanceof SVGElement) {
        nd.setAttribute("fill", "rgba(242,140,40,.14)");
        nd.setAttribute("stroke", ORANGE2);
        nd.setAttribute("stroke-dasharray", "4 3");
        nd.setAttribute("stroke-width", "1.5");
      } else nd.style.outline = `1.5px dashed ${ORANGE2}`;
    };
    const move = (ev) => {
      const p = axis === "x" ? ev.clientX : ev.clientY, fwd = p > centers[i0];
      let t2 = 0;
      for (const [c2] of others) if (fwd ? c2 <= p : c2 < p) t2++;
      if (t2 === cur) return;
      cur = t2;
      const a2 = arr0.slice(), [it] = a2.splice(i0, 1);
      a2.splice(t2, 0, it);
      opts[key] = a2;
      redraw();
      mark();
    };
    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("keydown", esc, true);
      document.body.style.cursor = "";
    };
    const up = () => {
      stop();
      done(cur !== i0);
    };
    const esc = (ev) => {
      if (ev.key === "Escape") {
        ev.stopPropagation();
        ev.preventDefault();
        opts[key] = arr0;
        stop();
        redraw();
        done(false);
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("keydown", esc, true);
    document.body.style.cursor = "grabbing";
    e.preventDefault();
    mark();
    return true;
  }

  // src/vizdata.js
  var num = (c2) => {
    const n = parseFloat(String(c2).replace(/\s/g, "").replace(",", "."));
    return isNaN(n) ? null : n;
  };
  function parseMatrix(text) {
    const lines = String(text || "").replace(/\r/g, "").split("\n").filter((l) => l.trim());
    if (!lines.length) return null;
    const sep = lines[0].includes("	") ? "	" : lines[0].includes(";") ? ";" : ",";
    return lines.map((l) => {
      if (sep !== "," || !l.includes('"')) return l.split(sep).map((c2) => c2.trim());
      const out = [];
      let cur = "", q = false;
      for (const ch of l) {
        if (ch === '"') q = !q;
        else if (ch === "," && !q) {
          out.push(cur.trim());
          cur = "";
        } else cur += ch;
      }
      return out.concat(cur.trim());
    });
  }
  var toCSV = (m2) => m2.map((r) => r.map((c2) => /[",;\n]/.test(String(c2)) ? `"${String(c2).replace(/"/g, '""')}"` : String(c2)).join(",")).join("\n");
  function fileToMatrix(name, text) {
    if (/\.json$/i.test(name) || /^\s*[\[{]/.test(text)) {
      let j = JSON.parse(text);
      if (!Array.isArray(j)) j = Object.values(j).find(Array.isArray) || [];
      if (j.length && !Array.isArray(j[0])) {
        const keys = [...new Set(j.flatMap((o) => Object.keys(o)))];
        return [keys, ...j.map((o) => keys.map((k) => o[k] ?? ""))];
      }
      return j.map((r) => r.map((c2) => String(c2 ?? "")));
    }
    return parseMatrix(text);
  }
  var hasHeader = (m2, numericCols) => m2.length > 1 && numericCols.some((j) => m2[0][j] !== void 0 && m2[0][j] !== "" && num(m2[0][j]) === null);
  function tableAdapter(f, obj, palOpts, SERIES_COLORS3) {
    const rows = obj[f.k], series = obj[f.series], max2 = f.maxSeries || 4;
    const fix = () => rows.forEach((r) => {
      r.v = Array.from({ length: series.length }, (_, j) => +(r.v || [])[j] || 0);
    });
    const ns = series.length, iconCol = f.icons ? [{ name: t("Ic\xF4ne"), type: "text", isIcon: true, select: { none: t("Aucune"), ...pictoChoices(obj) } }] : [];
    return {
      root: obj,
      cols: [{ name: t("Libell\xE9"), type: "text" }, ...series.map((sr, j) => ({
        name: sr.name || "",
        type: "number",
        color: sr.color,
        palOpts,
        onColor: (v) => {
          sr.color = v;
        },
        onRename: (v) => {
          sr.name = v;
        },
        onDelete: series.length > 1 ? () => {
          series.splice(j, 1);
          fix();
        } : null
      })), ...iconCol],
      rows: () => rows.length,
      get: (i, j) => j === 0 ? rows[i].label || "" : j > ns ? rows[i].icon || "none" : String((rows[i].v || [])[j - 1] ?? 0),
      set(i, j, v) {
        if (j === 0) rows[i].label = v;
        else if (j > ns) rows[i].icon = v;
        else {
          const n = num(v);
          (rows[i].v || (rows[i].v = []))[j - 1] = n === null ? 0 : n;
        }
      },
      addRow: () => rows.push({ label: "", v: series.map(() => 0) }),
      delRow: (i) => {
        if (rows.length > 1) rows.splice(i, 1);
      },
      addCol: series.length < max2 ? () => {
        series.push({ name: `${t("S\xE9rie")} ${series.length + 1}`, color: SERIES_COLORS3[series.length % SERIES_COLORS3.length] });
        fix();
      } : null,
      colLabel: t("+ S\xE9rie"),
      load(m2, head) {
        const body = head ? m2.slice(1) : m2, nser = Math.min(max2, Math.max(1, ...body.map((c2) => c2.length - 1)));
        const ns2 = Array.from({ length: nser }, (_, j) => ({ name: head && m2[0][j + 1] || series[j] && series[j].name || `${t("S\xE9rie")} ${j + 1}`, color: series[j] && series[j].color || SERIES_COLORS3[j % SERIES_COLORS3.length] }));
        series.splice(0, series.length, ...ns2);
        rows.splice(0, rows.length, ...body.map((c2) => ({ label: c2[0] || "", v: Array.from({ length: nser }, (_, j) => num(c2[j + 1]) ?? 0) })));
      },
      numericCols: Array.from({ length: Math.max(0, series.length) }, (_, j) => j + 1),
      toMatrix: () => [["", ...series.map((s2) => s2.name || "")], ...rows.map((r) => [r.label || "", ...series.map((_, j) => (r.v || [])[j] ?? 0)])]
    };
  }
  function recordsAdapter(spec, obj, palOpts) {
    const rows = obj[spec.k] || (obj[spec.k] = []), cols = spec.cols;
    const conv = (c2, v) => c2.t === "number" ? num(v) ?? 0 : c2.t === "color" ? palOpts[v] ? v : c2.auto ? "" : c2.def || "blue" : v;
    const blank = () => Object.fromEntries(cols.map((c2) => [c2.k, c2.def ?? (c2.t === "number" ? 0 : "")]));
    return {
      cols: cols.map((c2) => ({ name: c2.label, type: c2.t === "number" ? "number" : "text", ml: !!c2.ml, select: c2.t === "color" ? c2.auto ? { "": t("Auto"), ...palOpts } : palOpts : (typeof c2.options === "function" ? c2.options(obj) : c2.options) || null, isColor: c2.t === "color", isIcon: !!c2.icons })),
      rows: () => rows.length,
      get: (i, j) => String(rows[i][cols[j].k] ?? ""),
      set: (i, j, v) => {
        rows[i][cols[j].k] = conv(cols[j], v);
      },
      addRow: () => rows.push(spec.item ? spec.item(rows.length) : blank()),
      delRow: (i) => {
        if (rows.length > (spec.min || 1)) rows.splice(i, 1);
      },
      addCol: null,
      load(m2, head) {
        const body = head ? m2.slice(1) : m2;
        const idx = cols.map((c2, j) => {
          if (!head) return j;
          const n = m2[0].findIndex((x) => x.toLowerCase() === c2.label.toLowerCase() || x.toLowerCase() === c2.k.toLowerCase());
          return n < 0 ? j : n;
        });
        rows.splice(0, rows.length, ...body.map((r) => Object.fromEntries(cols.map((c2, j) => [c2.k, conv(c2, r[idx[j]] ?? c2.def ?? "")]))));
      },
      numericCols: cols.map((c2, j) => c2.t === "number" ? j : -1).filter((j) => j >= 0),
      toMatrix: () => [cols.map((c2) => c2.label), ...rows.map((r) => cols.map((c2) => r[c2.k] ?? ""))]
    };
  }
  function gridEditor(ad, ctx2, { downloadName = "data" } = {}) {
    const rebuild = () => ctx2.restructure();
    const apply = (m2, head2) => {
      if (!m2 || !m2.length) return;
      ad.load(m2, head2 === void 0 ? hasHeader(m2, ad.numericCols) : head2);
      rebuild();
    };
    const file2 = h("input", { type: "file", accept: ".csv,.tsv,.txt,.json,text/csv,application/json", hidden: true, onchange: async () => {
      const f = file2.files[0];
      file2.value = "";
      if (!f) return;
      try {
        apply(fileToMatrix(f.name, await f.text()));
      } catch (e) {
        alert(t("Fichier illisible."));
      }
    } });
    const ta = h("textarea", { placeholder: t("Collez ici un tableau copi\xE9 depuis Excel, Sheets ou un CSV (la 1re ligne peut contenir les en-t\xEAtes)"), style: { minHeight: "64px" } });
    const drop = h(
      "div",
      { class: "dg-drop" },
      ico("upload"),
      h("span", { textContent: t("Glissez un fichier CSV, TSV ou JSON ici, ou") }),
      h("button", { type: "button", textContent: t("importez-le\u2026"), onclick: () => file2.click() }),
      file2
    );
    ["dragenter", "dragover"].forEach((ev) => drop.addEventListener(ev, (e) => {
      e.preventDefault();
      drop.classList.add("on");
    }));
    ["dragleave", "drop"].forEach((ev) => drop.addEventListener(ev, (e) => {
      e.preventDefault();
      drop.classList.remove("on");
    }));
    drop.addEventListener("drop", async (e) => {
      const f = e.dataTransfer.files[0];
      if (!f) return;
      try {
        apply(fileToMatrix(f.name, await f.text()));
      } catch (x) {
        alert(t("Fichier illisible."));
      }
    });
    const tools = h(
      "div",
      { class: "row dg-tools" },
      h("button", { type: "button", class: "pp-btn", onclick: () => {
        const b = new Blob(["\uFEFF" + toCSV(ad.toMatrix())], { type: "text/csv" }), a2 = h("a", { href: URL.createObjectURL(b), download: downloadName + ".csv" });
        a2.click();
        setTimeout(() => URL.revokeObjectURL(a2.href), 1e3);
      } }, ico("download"), h("span", { textContent: t("Exporter en CSV") }))
    );
    const table = h("table", { class: "dg" });
    const head = h("tr", {}, h("th", { class: "dg-n" }), ...ad.cols.map((c2, j) => {
      const th = h("th", {}, c2.onRename ? h(
        "div",
        { class: "dg-h" },
        c2.palOpts ? colorSelect({ value: c2.color, options: c2.palOpts, onChange: (v) => {
          c2.onColor(v);
          ctx2.changed();
        } }) : null,
        h("input", { type: "text", value: c2.name, placeholder: `${t("S\xE9rie")} ${j}`, oninput: (e) => {
          c2.onRename(e.target.value);
          ctx2.changed();
        } }),
        c2.onDelete ? h("button", { type: "button", class: "mini danger", title: t("Supprimer"), onclick: () => {
          c2.onDelete();
          rebuild();
        } }, ico("x")) : null
      ) : h("span", { textContent: c2.name }));
      return th;
    }), h("th", { class: "dg-n" }));
    table.append(h("thead", {}, head));
    const body = h("tbody");
    const cell = (i, j) => {
      const c2 = ad.cols[j], v = ad.get(i, j);
      const common = { "data-r": i, "data-c": j };
      if (c2.isIcon) return h("td", {}, iconSelect({ value: v || "none", options: c2.select, text: true, root: ad.root, refresh: () => ctx2.restructure && ctx2.restructure(), onChange: (nv) => {
        ad.set(i, j, nv);
        ctx2.changed();
      } }));
      if (c2.isColor) return h("td", {}, colorSelect({ value: v, options: c2.select, text: true, onChange: (nv) => {
        ad.set(i, j, nv);
        ctx2.changed();
      } }));
      if (c2.select) {
        const s2 = h("select", { ...common, onchange: (e) => {
          ad.set(i, j, e.target.value);
          ctx2.changed();
        } }, Object.entries(c2.select).map(([k, l]) => h("option", { value: k, textContent: l })));
        s2.value = v;
        return h("td", {}, s2);
      }
      const mk = c2.ml ? ((p) => {
        const ta2 = h("textarea", { ...p, class: "dg-ml", rows: 1, value: v });
        const fit = () => {
          ta2.style.height = "auto";
          ta2.style.height = ta2.scrollHeight + "px";
        };
        ta2.addEventListener("input", fit);
        requestAnimationFrame(fit);
        return ta2;
      }) : ((p) => h("input", { ...p, type: "text", inputMode: c2.type === "number" ? "decimal" : "text", value: v }));
      const inp = mk({
        ...common,
        oninput: (e) => {
          ad.set(i, j, e.target.value);
          ctx2.changed();
        },
        onkeydown: (e) => {
          const go = (di, dj) => {
            const n = table.querySelector(`[data-r="${i + di}"][data-c="${j + dj}"]`);
            if (n) {
              e.preventDefault();
              n.focus();
              n.select && n.select();
            }
          };
          if (c2.ml) return;
          if (e.key === "Enter" || e.key === "ArrowDown") go(1, 0);
          else if (e.key === "ArrowUp") go(-1, 0);
        },
        onpaste: (e) => {
          const txt = (e.clipboardData || window.clipboardData).getData("text/plain");
          if (!/[\t\n]/.test(txt.trim())) return;
          const m2 = parseMatrix(txt);
          if (!m2) return;
          e.preventDefault();
          if (i === 0 && j === 0) {
            apply(m2);
            return;
          }
          m2.forEach((r, di) => {
            while (ad.rows() <= i + di) ad.addRow();
            r.forEach((val, dj) => {
              if (j + dj < ad.cols.length) ad.set(i + di, j + dj, val);
            });
          });
          rebuild();
        }
      });
      return h("td", {}, inp);
    };
    for (let i = 0; i < ad.rows(); i++) {
      body.append(h(
        "tr",
        {},
        h("td", { class: "dg-n", textContent: String(i + 1) }),
        ...ad.cols.map((_, j) => cell(i, j)),
        h("td", { class: "dg-n" }, ad.rows() > 1 ? h("button", { type: "button", class: "mini danger", title: t("Supprimer"), onclick: () => {
          ad.delRow(i);
          rebuild();
        } }, ico("x")) : null)
      ));
    }
    table.append(body);
    const adds = h(
      "div",
      { class: "row" },
      h("button", { type: "button", class: "pp-btn", onclick: () => {
        ad.addRow();
        rebuild();
      } }, ico("plus"), h("span", { textContent: t("+ Ligne") })),
      ad.addCol ? h("button", { type: "button", class: "pp-btn", onclick: () => {
        ad.addCol();
        rebuild();
      } }, ico("plus"), h("span", { textContent: ad.colLabel })) : null
    );
    const pasteBtn = h("button", { type: "button", class: "pp-btn", textContent: t("Remplacer les donn\xE9es"), onclick: () => {
      const m2 = parseMatrix(ta.value);
      if (m2) apply(m2);
    } });
    return h(
      "div",
      { class: "dg-wrap" },
      drop,
      h("details", {}, h("summary", { textContent: t("Coller un tableau") }), h("div", { class: "body" }, ta, pasteBtn)),
      h("div", { class: "dg-scroll" }, table),
      adds,
      tools
    );
  }

  // src/vizeditor.js
  var current2 = null;
  var shut2 = /* @__PURE__ */ new Set();
  var tab = "data";
  shut2.add("dv-type");
  var LABEL_KEYS = /* @__PURE__ */ new Set(["legend", "showValues", "decimals", "suffix", "totalTpl", "layout"]);
  var SERIES_COLORS2 = ["sky", "yellow", "blue", "slate", "grey"];
  var availH = 360;
  var groupOf = (f) => f.g || (f.t === "table" || f.t === "list" ? "data" : f.k === "ratio" ? "ratio" : LABEL_KEYS.has(f.k) ? "labels" : "style");
  function openVizEditor({ col, sub, ci, bg, width: colW, ctx: ctx2 }) {
    if (current2) return;
    const doc2 = ctx2.getDoc();
    const snapshot2 = JSON.stringify(col.viz);
    const baseW = colW || colWidth(sub.layout, ci);
    const ui = { sel: -1, drag: null };
    let width = baseW, zoom = "fit", meta = null, svgW = baseW;
    const root = h("div", { class: "ve" });
    applyVars(root, cssVars(doc2.theme, doc2.colors));
    const sheet = h("div", { class: "page viz-sheet", style: { background: bg && bg !== "none" ? `var(--c-${bg})` : "#fff" } });
    const holder = h("div", { class: "col col-viz" });
    sheet.append(holder);
    const scaler = h("div", { class: "ve-scaler" }, sheet);
    const stage2 = h("div", { class: "ve-stage" }, scaler);
    const form = h("aside", { class: "panel ve-form" });
    const hint = h("div", { class: "ve-hint" });
    const body = h("div", { class: "ve-body" });
    const tabBtns = [["data", "table", "Donn\xE9es"], ["viz", "adjustments", "Visualisation"]].map(([k, ic, l]) => h("button", { type: "button", class: "ve-tab", dataset: { tab: k }, onclick: () => {
      tab = k;
      buildForm();
    } }, ico(ic), h("span", { textContent: t(l) })));
    const tabs = h("div", { class: "ve-tabs", role: "tablist" }, ...tabBtns);
    const syncTabs = (hasData) => {
      tabs.style.display = hasData ? "" : "none";
      tabBtns.forEach((b) => {
        const on = b.dataset.tab === tab;
        b.classList.toggle("on", on);
        b.setAttribute("aria-selected", String(on));
      });
    };
    function scale() {
      if (zoom !== "fit") return parseFloat(zoom);
      return Math.max(0.5, Math.min(2, (stage2.clientWidth - 80) / (width + 48)));
    }
    function draw() {
      const r = renderVizFull(col.viz, width, { locale: doc2.locale || "en-GB", ui, pal: paletteOf(doc2.theme, doc2.colors), fillH: availH });
      holder.innerHTML = "";
      if (r && r.node) {
        holder.append(r.node);
        meta = r.meta || null;
        svgW = width;
      }
      const t2 = VIZ_TYPES[col.viz.kind];
      hint.textContent = holder.querySelector("[data-reorder]") ? "Glisser un \xE9l\xE9ment pour changer son ordre : les autres se r\xE9ajustent en gardant des \xE9carts proportionnels." : t2 && t2.edit ? "Cliquer un segment ou un libell\xE9 pour le s\xE9lectionner \xB7 glisser l\u2019anneau pour le tourner \xB7 glisser un libell\xE9 (verticalement, ou de l\u2019autre c\xF4t\xE9) \xB7 glisser le point blanc pour d\xE9placer l\u2019ancrage du trait" : "Les modifications du formulaire s\u2019appliquent en direct.";
      const k = scale();
      sheet.style.width = width + 48 + "px";
      holder.style.width = width + "px";
      scaler.style.transform = `scale(${k})`;
      stage2.style.setProperty("--ve-h", "0px");
      requestAnimationFrame(() => {
        scaler.style.marginBottom = sheet.offsetHeight * (k - 1) + "px";
        scaler.style.marginRight = (width + 48) * (k - 1) + "px";
      });
    }
    const hist = { s: [snapshot2], i: 0, at: 0, burst: false };
    const rec = (burst) => {
      const sn = JSON.stringify(col.viz);
      if (sn === hist.s[hist.i]) return;
      const now = Date.now();
      if (burst && hist.burst && hist.i === hist.s.length - 1 && hist.i > 0 && now - hist.at < 1e3) hist.s[hist.i] = sn;
      else {
        hist.s.length = hist.i + 1;
        hist.s.push(sn);
        hist.i = hist.s.length - 1;
        if (hist.s.length > 100) {
          hist.s.shift();
          hist.i--;
        }
      }
      hist.at = now;
      hist.burst = burst;
    };
    const syncHist = () => {
      undoBtn2.disabled = hist.i <= 0;
      redoBtn2.disabled = hist.i >= hist.s.length - 1;
    };
    const goHist = (i) => {
      if (i < 0 || i >= hist.s.length) return;
      hist.i = i;
      hist.burst = false;
      col.viz = JSON.parse(hist.s[i]);
      ui.sel = -1;
      buildForm();
      draw();
      ctx2.changed();
      syncHist();
    };
    const changed = () => {
      draw();
      rec(true);
      ctx2.changed();
      syncHist();
    };
    const fctx = { changed, restructure: () => {
      buildForm();
      draw();
      rec(false);
      ctx2.changed();
      syncHist();
    } };
    const palCtx = {
      getDoc: ctx2.getDoc,
      changed: () => {
        applyVars(root, cssVars(doc2.theme, doc2.colors));
        draw();
        ctx2.changed();
      },
      restructure: () => {
        applyVars(root, cssVars(doc2.theme, doc2.colors));
        buildForm();
        draw();
      }
    };
    const refreshForm = () => buildForm();
    const card = (id, icon, name, nodes) => cardEl(id, icon, name, nodes, { shut: shut2, refresh: refreshForm });
    const typeCard = () => {
      const cur = VIZ_TYPES[col.viz.kind], list = h("div", { class: "ve-typelist", role: "listbox" });
      for (const [fk, fl] of Object.entries(VIZ_FAMILIES)) {
        const items = Object.entries(VIZ_TYPES).filter(([, v]) => v.family === fk);
        if (!items.length) continue;
        list.append(h("div", { class: "ve-typefam", textContent: t(fl) }), ...items.map(([k, v]) => h("button", {
          type: "button",
          role: "option",
          class: "ve-typeopt" + (col.viz.kind === k ? " on" : ""),
          "aria-selected": String(col.viz.kind === k),
          onclick: () => {
            shut2.add("dv-type");
            if (col.viz.kind !== k) {
              col.viz = switchKind(col.viz, k);
              ui.sel = -1;
              fctx.restructure();
            } else buildForm();
          }
        }, ico(v.icon || "chart-bar"), h("span", { textContent: t(v.label) }))));
      }
      const el2 = card("dv-type", cur.icon || "chart-bar", `${t("Type")} \xB7 ${t(cur.label)}`, [list]);
      el2.classList.add("ve-typecard");
      return el2;
    };
    const heightCard = (ty) => card("dv-height", "ruler-2", t("Hauteur"), heightNodes(ty, col.viz.opts, { ctx: fctx, width, avail: { get: () => availH, set: (v) => {
      availH = v;
      draw();
    } } }));
    function buildForm() {
      const top = form.scrollTop;
      form.innerHTML = "";
      form.append(typeCard(), tabs);
      const ty = VIZ_TYPES[col.viz.kind], fields = ty.fields || [], F = (g) => fields.filter((f) => groupOf(f) === g);
      const head = col.viz.head || (col.viz.head = { title: "", source: "" });
      const dataFields = F("data"), hasData = !!ty.data || dataFields.length > 0;
      if (!hasData) tab = "viz";
      syncTabs(hasData);
      body.classList.toggle("data", tab === "data");
      const gen = (list) => buildFields(list, col.viz.opts, fctx, paletteOptions(doc2), h);
      if (tab === "data") {
        const nodes = [];
        for (const f of dataFields) {
          if (f.t === "table") nodes.push(gridEditor(tableAdapter(f, col.viz.opts, paletteOptions(doc2), SERIES_COLORS2), fctx, { downloadName: col.viz.kind }));
          else nodes.push(...gen([f]));
        }
        if (ty.data) nodes.push(gridEditor(recordsAdapter(ty.data, col.viz.opts, paletteOptions(doc2)), fctx, { downloadName: col.viz.kind }), ty.dataHint ? h("p", { class: "hint", textContent: t(ty.dataHint) }) : null);
        form.append(card("dv-data", "table", t("Donn\xE9es"), nodes));
      } else {
        form.append(...[
          card("dv-head", "typography", t("Titre et source"), buildFields([{ k: "title", t: "area", label: "Titre de la dataviz (facultatif) \u2014 styles de paragraphe : titre 1, titre 2, chiffre cl\xE9\u2026" }, { k: "source", t: "text", rich: true, label: "Source (facultatif)" }], head, fctx, {}, h)),
          ty.panel ? card("dv-picto", "mood-smile", t(ty.panelTitle || "Pictogramme"), ty.panel(col.viz.opts, fctx)) : null,
          card("dv-side", "number", t("Chiffre \xE0 c\xF4t\xE9"), buildFields(SIDE_FIELDS, col.viz.side || (col.viz.side = newSide(col.viz.kind)), fctx, {}, h)),
          ty.heights ? heightCard(ty) : null,
          F("format").length ? card("dv-format", "ruler-2", t("Dimensions"), gen(F("format"))) : null,
          card("dv-colors", "palette", t("Couleurs"), [h("button", { type: "button", class: "pp-btn", onclick: (e) => openPalette(e.currentTarget, palCtx) }, ico("palette"), h("span", { textContent: t("Couleurs du document") }))]),
          F("labels").length ? card("dv-labels", "letter-case", t("\xC9tiquettes"), gen(F("labels"))) : null,
          F("style").length || ty.actions ? card("dv-style", "adjustments", t("Options"), [
            ty.actions ? h("div", { class: "pp-actions" }, ty.actions.map((a2) => h("button", { type: "button", class: "pp-btn", textContent: a2.label, title: a2.title || "", onclick: () => {
              a2.run(col.viz.opts);
              ui.sel = -1;
              fctx.restructure();
            } }))) : null,
            ...gen(F("style"))
          ]) : null
        ].filter(Boolean));
      }
      form.scrollTop = top;
    }
    const focusItem = (path) => {
      form.querySelectorAll(".col-card.sel").forEach((n2) => n2.classList.remove("sel"));
      const n = form.querySelector(`[data-path="${path}"]`);
      if (n) {
        n.classList.add("sel");
        n.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    };
    const api = { ui, select(i) {
      ui.sel = i;
      focusItem(`segments.${i}`);
    }, redraw: changed };
    let drag2 = null;
    const toPt = (e) => {
      const svg = holder.querySelector("svg");
      if (!svg) return { x: 0, y: 0 };
      const r = svg.getBoundingClientRect(), k = r.width / (+svg.getAttribute("width") || svgW) || 1;
      return { x: (e.clientX - r.left) / k, y: (e.clientY - r.top) / k };
    };
    stage2.addEventListener("pointerdown", (e) => {
      const rn = e.target.closest && e.target.closest("[data-reorder]");
      if (rn && e.button === 0 && startReorder(e, rn, { opts: col.viz.opts, root: holder, redraw: draw, done: (ch) => {
        if (ch) changed();
        else draw();
      } })) return;
      const t2 = VIZ_TYPES[col.viz.kind];
      const n = e.target.closest && e.target.closest("[data-hit]");
      if (!t2 || !t2.edit || !n || e.button !== 0) {
        if (t2 && t2.edit && ui.sel !== -1 && !n) {
          ui.sel = -1;
          draw();
          focusItem("none");
        }
        return;
      }
      const [kind, i] = n.getAttribute("data-hit").split(":");
      drag2 = t2.edit.start({ kind, i: +i }, col.viz.opts, meta, api, toPt(e));
      if (drag2) {
        e.preventDefault();
        stage2.setPointerCapture(e.pointerId);
      }
      draw();
    });
    stage2.addEventListener("pointermove", (e) => {
      if (drag2) drag2.move(toPt(e));
    });
    const up = () => {
      if (!drag2) return;
      const d = drag2;
      drag2 = null;
      if (d.end) d.end();
      ui.drag = null;
      changed();
    };
    stage2.addEventListener("pointerup", up);
    stage2.addEventListener("pointercancel", up);
    const wOpts = [[baseW, `Colonne actuelle (${Math.round(baseW)} px)`], ...[["1-1-1", "1/3"], ["1-1", "1/2"], ["2-1", "2/3"], ["1", "Pleine largeur"]].map(([k, l]) => [colWidth(k, 0), `${l} (${Math.round(colWidth(k, 0))} px)`])];
    const wSel = h("select", { onchange: (e) => {
      width = parseFloat(e.target.value);
      draw();
    } }, wOpts.map(([v, l]) => h("option", { value: v, textContent: l })));
    const zSel = h("select", { onchange: (e) => {
      zoom = e.target.value;
      draw();
    } }, [["fit", "Ajuster"], ["1", "100 %"], ["1.5", "150 %"], ["2", "200 %"]].map(([v, l]) => h("option", { value: v, textContent: l })));
    const close3 = (keep) => {
      if (!keep) {
        col.viz = JSON.parse(snapshot2);
      }
      window.removeEventListener("keydown", onKey);
      root.remove();
      current2 = null;
      document.body.classList.remove("ve-open");
      ctx2.restructure();
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        close3(false);
        return;
      }
      const tg = e.target;
      if (!(e.metaKey || e.ctrlKey) || e.altKey || /INPUT|TEXTAREA|SELECT/.test(tg.tagName || "") || tg.isContentEditable) return;
      const k = e.key.toLowerCase();
      if (k === "z") {
        e.preventDefault();
        goHist(hist.i + (e.shiftKey ? 1 : -1));
      } else if (k === "y") {
        e.preventDefault();
        goHist(hist.i + 1);
      }
    };
    window.addEventListener("keydown", onKey);
    const undoBtn2 = h("button", { type: "button", class: "ve-hist", title: t("Annuler (Cmd/Ctrl + Z)"), "aria-label": t("Annuler la derni\xE8re modification"), onclick: () => goHist(hist.i - 1) }, ico("arrow-back-up"));
    const redoBtn2 = h("button", { type: "button", class: "ve-hist", title: t("R\xE9tablir (Cmd/Ctrl + Maj + Z)"), "aria-label": t("R\xE9tablir la modification annul\xE9e"), onclick: () => goHist(hist.i + 1) }, ico("arrow-forward-up"));
    syncHist();
    root.append(
      h(
        "div",
        { class: "ve-bar" },
        h("strong", { textContent: "\xC9diteur de dataviz" }),
        undoBtn2,
        redoBtn2,
        h("label", { class: "zoom" }, "Aper\xE7u \xE0 la largeur ", wSel),
        h("label", { class: "zoom" }, "Zoom ", zSel),
        h("span", { style: { flex: 1 } }),
        h("button", { type: "button", textContent: "Annuler", onclick: () => close3(false) }),
        h("button", { type: "button", class: "primary", textContent: "Terminer", onclick: () => close3(true) })
      ),
      body
    );
    body.append(form, h("div", { class: "ve-main" }, hint, stage2));
    document.body.append(root);
    document.body.classList.add("ve-open");
    current2 = root;
    new ResizeObserver(() => {
      if (zoom === "fit") draw();
    }).observe(stage2);
    buildForm();
    draw();
    loadFonts().then(() => {
      if (current2 === root) draw();
    });
  }

  // src/media.js
  function openMedia(ctx2) {
    const dlg2 = h("dialog", { class: "media-dlg" });
    const inp = h("input", { type: "file", accept: ".svg,image/svg+xml", multiple: true, hidden: true, onchange: async () => {
      const files = [...inp.files];
      inp.value = "";
      for (const f of files) await importSvgFile(f);
      ctx2.changed();
      draw();
    } });
    const draw = () => {
      const rows = iconLib.list.map((c2) => h(
        "div",
        { class: "media-row" },
        h("span", { class: "media-prev" }, iconGlyph("custom:" + c2.id, null, 28)),
        h("input", { type: "text", value: c2.name, "aria-label": t("Nom"), oninput: (e) => {
          c2.name = e.target.value;
          ctx2.changed();
        } }),
        h("button", { type: "button", class: "mini danger", title: t("Retirer"), "aria-label": t("Retirer"), onclick: () => {
          const i = iconLib.list.findIndex((k) => k.id === c2.id);
          if (i >= 0) iconLib.list.splice(i, 1);
          ctx2.changed();
          draw();
        } }, ico("x"))
      ));
      dlg2.replaceChildren(
        h("h3", { textContent: t("M\xE9dias import\xE9s") }),
        h("p", { class: "hint", textContent: t("Ic\xF4nes SVG import\xE9es : disponibles dans chaque choix d\u2019ic\xF4ne du document. Les retirer les retire partout.") }),
        ...rows.length ? rows : [h("p", { class: "hint", textContent: t("Aucun m\xE9dia import\xE9.") })],
        h(
          "div",
          { class: "row", style: { justifyContent: "space-between", marginTop: "12px" } },
          h("button", { type: "button", class: "pp-btn", onclick: () => inp.click() }, ico("upload"), h("span", { textContent: t("Importer un SVG\u2026") })),
          inp,
          h("button", { type: "button", class: "primary", textContent: t("Fermer"), onclick: () => dlg2.close() })
        )
      );
    };
    dlg2.addEventListener("close", () => dlg2.remove());
    draw();
    document.body.append(dlg2);
    dlg2.showModal();
  }

  // src/hover.js
  function initHover({ stage: stage2, getDoc, ctx: ctx2, select, canShow }) {
    const bar = h("div", { class: "hv-bar", style: { display: "none" } });
    const out = h("div", { class: "hv-out", style: { display: "none" } });
    const addBtn = (label) => h("button", { type: "button", class: "hv-add", style: { display: "none" } }, ico("plus"), h("span", { textContent: t(label) }));
    const addSubBtn = addBtn("Nouvelle sous-section"), addSecBtn = addBtn("Nouvelle section");
    addSubBtn.addEventListener("click", () => {
      const { si, bi } = addSubBtn._at, doc2 = getDoc();
      doc2.sections[si].subs.splice(bi + 1, 0, newSub("1"));
      hide2();
      ctx2.restructure();
      ctx2.select(`sub:${si}:${bi + 1}`);
    });
    addSecBtn.addEventListener("click", () => {
      const at = addSecBtn._at, doc2 = getDoc();
      if (at.page) {
        doc2.sections.push(newSection(at.page));
        hide2();
        ctx2.restructure();
        ctx2.select(`sec:${doc2.sections.length - 1}`);
        return;
      }
      doc2.sections.splice(at.si + 1, 0, newSection(doc2.sections[at.si].page));
      hide2();
      ctx2.restructure();
      ctx2.select(`sec:${at.si + 1}`);
    });
    const grip = h("button", { type: "button", class: "hv-grip", style: { display: "none" }, title: t("Glisser : hauteur du contenu (se cale sur la colonne voisine) \xB7 double-clic : adapter \xE0 la colonne voisine"), "aria-label": t("Hauteur du contenu") }, ico("grip-horizontal"));
    const guide = h("div", { class: "hv-guide", style: { display: "none" } });
    const vizOf = (it) => {
      const col = getDoc().sections[it.si].subs[it.bi].cols[it.ci];
      return col.type === "viz" && col.viz && (VIZ_TYPES[col.viz.kind] || {}).heights ? col : null;
    };
    const colOf = (it) => getDoc().sections[it.si].subs[it.bi].cols[it.ci];
    const placeGrip = (it) => {
      const el2 = document.querySelector(`[data-sel="${it.path}"]`), nd = el2 && (vizOf(it) ? el2.firstElementChild : el2);
      if (!nd) {
        grip.style.display = "none";
        return;
      }
      const r = nd.getBoundingClientRect();
      Object.assign(grip.style, { display: "flex", left: r.left + r.width / 2 - 18 + "px", top: r.bottom - 8 + "px" });
      grip._at = it;
    };
    grip.addEventListener("dblclick", () => {
      const it = grip._at;
      if (it && !vizOf(it)) {
        const el2 = document.querySelector(`[data-sel="${it.path}"]`), n = el2 && matchColTarget(el2);
        if (n) {
          colOf(it).minH = n;
          hide2();
          ctx2.restructure();
        }
        return;
      }
      const col = it && vizOf(it);
      if (!col) return;
      col.viz.opts.hmode = "match";
      hide2();
      ctx2.restructure();
    });
    const gripOther = (e, it) => {
      e.preventDefault();
      e.stopPropagation();
      const col = colOf(it);
      const colEl = document.querySelector(`[data-sel="${it.path}"]`), sc = colEl.closest(".page").getBoundingClientRect().width / PAGE.w;
      const startH = colEl.getBoundingClientRect().height / sc, neigh = matchColTarget(colEl), y0 = e.clientY;
      let snapped = false;
      grip.setPointerCapture(e.pointerId);
      bar.style.display = out.style.display = addSubBtn.style.display = addSecBtn.style.display = "none";
      const move = (ev) => {
        let hh = Math.round(Math.max(30, Math.min(1e3, startH + (ev.clientY - y0) / sc)) / 3) * 3;
        snapped = neigh != null && Math.abs(hh - neigh) <= 9;
        if (snapped) hh = neigh;
        col.minH = hh;
        ctx2.changed();
        requestAnimationFrame(() => requestAnimationFrame(() => {
          placeGrip(it);
          const el2 = document.querySelector(`[data-sel="${it.path}"]`);
          if (el2 && neigh != null) {
            const r = el2.getBoundingClientRect();
            Object.assign(guide.style, { display: "block", left: r.left - 6 + "px", width: r.width + 12 + "px", top: r.top + neigh * sc + "px", borderTopStyle: snapped ? "solid" : "dashed" });
          }
        }));
      };
      const up = () => {
        grip.removeEventListener("pointermove", move);
        grip.removeEventListener("pointerup", up);
        guide.style.display = "none";
        hide2();
        ctx2.restructure();
      };
      grip.addEventListener("pointermove", move);
      grip.addEventListener("pointerup", up);
    };
    grip.addEventListener("pointerdown", (e) => {
      const it = grip._at;
      if (it && !e.button && !vizOf(it)) return gripOther(e, it);
      const col = it && vizOf(it);
      if (!col || e.button) return;
      e.preventDefault();
      e.stopPropagation();
      const o = col.viz.opts, doc2 = getDoc();
      const colEl = document.querySelector(`[data-sel="${it.path}"]`), node = colEl.firstElementChild, sc = colEl.closest(".page").getBoundingClientRect().width / PAGE.w;
      const startH = vizChartH(node), neigh = matchTarget(colEl, node), y0 = e.clientY;
      let snapped = false;
      grip.setPointerCapture(e.pointerId);
      bar.style.display = out.style.display = addSubBtn.style.display = addSecBtn.style.display = "none";
      const move = (ev) => {
        let hh = Math.round(Math.max(90, Math.min(900, startH + (ev.clientY - y0) / sc)) / 3) * 3;
        snapped = neigh != null && Math.abs(hh - neigh) <= 9;
        if (snapped) hh = neigh;
        Object.assign(o, { hmode: "fixed", hfixed: hh });
        ctx2.changed();
        requestAnimationFrame(() => requestAnimationFrame(() => {
          placeGrip(it);
          const el2 = document.querySelector(`[data-sel="${it.path}"]`), nd = el2 && el2.firstElementChild;
          if (nd && neigh != null) {
            const r = nd.getBoundingClientRect();
            Object.assign(guide.style, { display: "block", left: r.left - 6 + "px", width: r.width + 12 + "px", top: r.top + neigh * sc + "px", borderTopStyle: snapped ? "solid" : "dashed" });
          }
        }));
      };
      const up = () => {
        grip.removeEventListener("pointermove", move);
        grip.removeEventListener("pointerup", up);
        guide.style.display = "none";
        if (snapped) o.hmode = "match";
        hide2();
        ctx2.restructure();
      };
      grip.addEventListener("pointermove", move);
      grip.addEventListener("pointerup", up);
    });
    document.body.append(out, bar, addSubBtn, addSecBtn, grip, guide);
    let timer = 0, cur = null;
    const hide2 = () => {
      clearTimeout(timer);
      bar.style.display = out.style.display = addSubBtn.style.display = addSecBtn.style.display = grip.style.display = "none";
      cur = null;
    };
    const later = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (!bar.contains(document.activeElement)) hide2();
      }, 250);
    };
    const act = (fn) => () => {
      fn();
      hide2();
      ctx2.restructure();
    };
    const sw = (key, on, title, fn) => h("button", { type: "button", class: "hv-sw" + (on ? " on" : "") + (key === "none" ? " none" : ""), title, style: key === "none" ? {} : { background: `var(--c-${key})` }, onclick: act(fn) });
    const btn = (label, title, fn, cls = "") => h("button", { type: "button", class: "mini " + cls, title, onclick: act(fn) }, ...[].concat(label).map((l) => typeof l === "string" ? l : l));
    const palBtn = () => h("button", { type: "button", class: "hv-sw pal-btn", title: t("Modifier, renommer ou ajouter des couleurs"), "aria-label": t("Modifier, renommer ou ajouter des couleurs"), onclick: (e) => {
      openPalette(e.currentTarget, ctx2);
    } }, ico("plus"));
    const grp = (label, ...kids) => h("div", { class: "hv-grp" }, h("span", { class: "hv-lab", textContent: label }), ...kids.flat().filter(Boolean));
    function groups(chain, doc2) {
      const it = chain[0], g = [];
      const del = (path) => h("button", { type: "button", class: "mini danger", title: t("Supprimer (Suppr)"), "aria-label": t("Supprimer (Suppr)"), onclick: () => {
        hide2();
        ctx2.remove(path);
      } }, ico("trash"));
      if (it.kind === "col") {
        const sub = doc2.sections[it.si].subs[it.bi], col = sub.cols[it.ci];
        const grip2 = h("button", { type: "button", class: "mini grip-btn", title: "Glisser le contenu sur une autre colonne pour l\u2019\xE9changer", onpointerdown: (e) => {
          e.preventDefault();
          ctx2.startColDrag(e, { si: it.si, bi: it.bi, ci: it.ci });
        } }, ico("grip-vertical"));
        const plus = sub.cols.length === 1 ? btn(ico("plus"), "Ajouter une colonne", () => {
          sub.layout = "1-1";
          sub.cols.push(newCol("text"));
          refreshAutoCards(sub, (i) => columnWidth(getDoc(), it.si, it.bi, i));
        }) : null;
        g.push(grp("Colonne", grip2, del(it.path), plus, col.type === "viz" ? btn("Dataviz\u2026", "Ouvrir l\u2019\xE9diteur de dataviz", () => ctx2.editViz({ col, sub, ci: it.ci })) : null));
      } else if (it.kind === "sub") {
        const sec = doc2.sections[it.si];
        const mv = (d) => () => {
          const j = it.bi + d;
          if (j >= 0 && j < sec.subs.length) [sec.subs[it.bi], sec.subs[j]] = [sec.subs[j], sec.subs[it.bi]];
        };
        const sgrip = h("button", { type: "button", class: "mini grip-btn", title: "Glisser la sous-section (autre section possible)", onpointerdown: (e) => {
          e.preventDefault();
          ctx2.startSubDrag(e, { si: it.si, bi: it.bi });
        } }, ico("grip-vertical"));
        g.push(grp("Sous-section", sgrip, del(`sub:${it.si}:${it.bi}`), btn(ico("arrow-up"), "Monter", mv(-1)), btn(ico("arrow-down"), "Descendre", mv(1))));
      } else if (it.kind === "sec") {
        const sec = doc2.sections[it.si];
        const secGrip = h("button", { type: "button", class: "mini grip-btn", title: "Glisser la section (ou la page)", onpointerdown: (e) => {
          e.preventDefault();
          ctx2.startSecDrag(e, { si: it.si });
        } }, ico("grip-vertical"));
        g.push(grp(
          "Section",
          secGrip,
          del(`sec:${it.si}`),
          sw("none", !sec.bg || sec.bg === "none", "Sans fond", () => {
            sec.bg = "none";
          }),
          sectionBgs(doc2).map((k) => sw(k, sec.bg === k, t(colorLabel(doc2, k)), () => {
            sec.bg = k;
          })),
          palBtn(),
          btn(ico("arrow-up"), "Monter", () => {
            stepSection(doc2, it.si, -1);
          }),
          btn(ico("arrow-down"), "Descendre", () => {
            stepSection(doc2, it.si, 1);
          })
        ));
      } else if (it.kind === "header") {
        const H = doc2.header;
        g.push(grp("Header", paletteKeys(doc2).map((k) => sw(k, H.bg === k, t(colorLabel(doc2, k)), () => {
          H.bg = k;
        })), palBtn()));
      }
      return g;
    }
    function chainOf(t2) {
      const chain = [];
      for (let n = t2.closest("[data-sel]"); n; n = n.parentElement && n.parentElement.closest("[data-sel]")) {
        const p = n.dataset.sel.split(":"), k = p[0];
        if (k === "col") chain.push({ kind: "col", si: +p[1], bi: +p[2], ci: +p[3], path: n.dataset.sel, el: n });
        else if (k === "sub") chain.push({ kind: "sub", si: +p[1], bi: +p[2], el: n });
        else if (k === "sec") chain.push({ kind: "sec", si: +p[1], el: n });
        else if (k === "header") chain.push({ kind: "header", el: n });
      }
      return chain;
    }
    stage2.addEventListener("pointermove", (e) => {
      if (!canShow() || e.buttons) {
        if (e.buttons) hide2();
        return;
      }
      const t2 = e.target.closest ? e.target : null;
      if (!t2) return;
      const chain = chainOf(t2);
      const pageEl = t2.closest(".page");
      if (pageEl && !pageEl.querySelector(".sec")) {
        clearTimeout(timer);
        const pr = pageEl.getBoundingClientRect(), sc = pr.width / PAGE.w, hd = pageEl.querySelector(".hd");
        const top2 = hd ? hd.getBoundingClientRect().bottom + GAP.headerToBody * sc : pr.top + PAGE.marginTop * sc, hh = Math.min((TYPE.section.lh + GAP.sectionTitle + TYPE.subsection.lh + GAP.subsectionTitle + TYPE.body.lh) * sc, pr.bottom - PAGE.marginBottom * sc - top2);
        bar.style.display = out.style.display = addSubBtn.style.display = "none";
        if (hh >= 20) {
          addSecBtn._at = { page: pageEl.dataset.page };
          Object.assign(addSecBtn.style, { display: "flex", left: pr.left + PAGE.margin * sc + "px", width: pr.width - 2 * PAGE.margin * sc + "px", top: top2 + "px", height: hh + "px" });
          cur = "empty:" + pageEl.dataset.page;
        }
        return;
      }
      if (!chain.length) {
        later();
        return;
      }
      const secC = chain.find((c2) => c2.kind === "sec"), lastSubEl = secC && !chain.some((c2) => c2.kind === "sub") ? [...secC.el.querySelectorAll(".sub")].pop() : null;
      const below = !!lastSubEl && e.clientY > lastSubEl.getBoundingClientRect().bottom;
      const key = chain[0].el.dataset.sel + (below ? "|below" : "");
      clearTimeout(timer);
      if (key === cur) return;
      cur = key;
      {
        const ci = chain.find((c2) => c2.kind === "col");
        if (ci) placeGrip(ci);
        else grip.style.display = "none";
      }
      const doc2 = getDoc();
      applyVars(bar, cssVars(doc2.theme, doc2.colors));
      bar.innerHTML = "";
      bar.append(...groups(chain, doc2));
      bar.style.display = "flex";
      const r = chain[0].el.getBoundingClientRect(), st = stage2.getBoundingClientRect(), bw = bar.offsetWidth, bh = bar.offsetHeight;
      let top = r.top - bh + 6;
      if (top < st.top - 12) top = r.top + 4;
      let left2 = Math.min(r.right - bw, window.innerWidth - bw - 8);
      left2 = Math.max(left2, st.left + 4);
      Object.assign(bar.style, { left: left2 + "px", top: top + "px" });
      let subIt = chain.find((c2) => c2.kind === "sub");
      const secIt = chain.find((c2) => c2.kind === "sec");
      if (below) subIt = { kind: "sub", si: secIt.si, bi: secIt.el.querySelectorAll(".sub").length - 1, el: lastSubEl };
      addSubBtn.style.display = addSecBtn.style.display = "none";
      if (secIt) {
        const sec = doc2.sections[secIt.si], pageEl2 = secIt.el.closest(".page"), pr = pageEl2.getBoundingClientRect(), sc = pr.width / PAGE.w, limit = pr.bottom - PAGE.marginBottom * sc;
        const subH = TYPE.subsection.lh + GAP.subsectionTitle + TYPE.body.lh, secH = TYPE.section.lh + GAP.sectionTitle + subH;
        const place3 = (b, it, inset, top2, want) => {
          const hh = Math.min(want * sc, limit - top2);
          if (hh < 20) return 0;
          const q = it.el.getBoundingClientRect();
          b._at = it;
          Object.assign(b.style, { display: "flex", left: q.left + inset + "px", width: q.width - 2 * inset + "px", top: top2 + "px", height: hh + "px" });
          return top2 + hh;
        };
        let y = secIt.el.getBoundingClientRect().bottom;
        const lastSec = doc2.sections.filter((x) => x.page === sec.page).pop() === sec;
        if (lastSec) {
          if (subIt && subIt.bi === sec.subs.length - 1) {
            const sb = subIt.el.getBoundingClientRect();
            y = place3(addSubBtn, subIt, 0, sb.bottom + GAP.subsectionBefore * sc, subH) || y;
          }
          place3(addSecBtn, secIt, PAGE.margin * sc, y + GAP.sectionBefore * sc, secH);
        }
      }
      const GAPX = 3, gx = chain[0].kind === "sec" ? 0 : GAPX;
      Object.assign(out.style, { display: "block", left: r.left - gx + "px", top: r.top - GAPX + "px", width: r.width + 2 * gx + "px", height: r.height + 2 * GAPX + "px" });
    });
    stage2.addEventListener("pointerleave", later);
    for (const el2 of [bar, addSubBtn, addSecBtn, grip]) {
      el2.addEventListener("pointerenter", () => clearTimeout(timer));
      el2.addEventListener("pointerleave", later);
    }
    stage2.addEventListener("scroll", hide2, true);
    return { hide: hide2 };
  }

  // src/export.js
  var MM = 96 / 25.4;
  var A4 = { w: 210, h: 297 };
  var BLEED_MM = 3;
  var SLUG_MM = 9;
  var EXPORT_MODES = {
    net: { label: "A4 net \u2014 210 \xD7 297 mm", note: "Sans fond perdu ni rep\xE8res.", offset: 0, bleed: false, marks: false },
    bleed: { label: "Fond perdu 3 mm \u2014 216 \xD7 303 mm", note: "Les fonds color\xE9s d\xE9bordent de 3 mm sur les 4 c\xF4t\xE9s.", offset: BLEED_MM, bleed: true, marks: false },
    marks: { label: "Fond perdu 3 mm + traits de coupe \u2014 228 \xD7 315 mm", note: "Pour l\u2019imprimeur : fond perdu et rep\xE8res de coupe (feuille de 228 \xD7 315 mm).", offset: SLUG_MM, bleed: true, marks: true }
  };
  function sheetSize(mode) {
    const m2 = EXPORT_MODES[mode];
    return { w: A4.w + 2 * m2.offset, h: A4.h + 2 * m2.offset };
  }
  function cropMarks(offset) {
    const g = h("div", { class: "marks" }), L = 3, gap = BLEED_MM;
    const line = (x, y, w, hh) => g.append(h("i", { style: { left: x + "mm", top: y + "mm", width: w + "mm", height: hh + "mm" } }));
    const X = [offset, offset + A4.w], Y = [offset, offset + A4.h];
    for (const [xi, x] of X.entries()) for (const [yi, y] of Y.entries()) {
      const sx = xi ? 1 : -1, sy = yi ? 1 : -1;
      line(sx < 0 ? x - gap - L : x + gap, y, L, 0);
      line(x, sy < 0 ? y - gap - L : y + gap, 0, L);
    }
    return g;
  }
  async function preparePrint(doc2, mode) {
    const m2 = EXPORT_MODES[mode] || EXPORT_MODES.net, size = sheetSize(mode);
    await loadFonts();
    cleanupPrint();
    const root = h("div", { id: "print-root", class: m2.bleed ? "print-bleed" : "" });
    Object.assign(root.style, { display: "block", position: "absolute", left: "-20000px", top: "0" });
    const result = renderDocument(doc2);
    const k = A4.w * MM / PAGE.w;
    for (const p of result.pages) {
      const holder = h("div", { class: "print-page", style: { left: m2.offset + "mm", top: m2.offset + "mm", transform: `scale(${k})` } }, p.el);
      root.append(h("div", { class: "print-sheet", style: { width: size.w + "mm", height: size.h + "mm" } }, holder, m2.marks ? cropMarks(m2.offset) : null));
    }
    document.body.append(root);
    measure(result);
    root.removeAttribute("style");
    const st = h("style", { id: "print-page-style", textContent: `@page{size:${size.w}mm ${size.h}mm;margin:0}` });
    document.head.append(st);
    return { cleanup: cleanupPrint, size, result };
  }
  function cleanupPrint() {
    for (const id of ["print-root", "print-page-style"]) {
      const n = document.getElementById(id);
      if (n) n.remove();
    }
  }

  // src/raster.js
  var linkHref = (name) => {
    const l = [...document.querySelectorAll("link[rel=stylesheet]")].find((x) => x.href.split("?")[0].endsWith(name));
    return l ? l.href : new URL("css/" + name, location.href).href;
  };
  var asDataUrl = (blob) => new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result);
    fr.onerror = rej;
    fr.readAsDataURL(blob);
  });
  var cssCache = null;
  async function documentCss() {
    if (cssCache) return cssCache;
    const fontsUrl = linkHref("fonts.css");
    const [fonts, doc2] = await Promise.all([fetch(fontsUrl).then((r) => r.text()), fetch(linkHref("doc.css")).then((r) => r.text())]);
    const blocks = fonts.split("@font-face").slice(1).filter((b) => /-latin(-ext)?-wght/.test(b));
    const inlined = await Promise.all(blocks.map(async (b) => {
      const m2 = b.match(/url\(([^)]+)\)/);
      if (!m2) return "";
      const url = new URL(m2[1].replace(/['"]/g, ""), fontsUrl).href;
      const data = await asDataUrl(await (await fetch(url)).blob());
      return "@font-face" + b.replace(m2[0], `url(${data})`);
    }));
    return cssCache = inlined.join("\n") + "\n" + doc2;
  }
  function loadImage(src) {
    return new Promise((res, rej) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = () => rej(new Error("image SVG illisible par le navigateur"));
      im.src = src;
    });
  }
  async function inlineImages(root) {
    await Promise.all([...root.querySelectorAll("img")].filter((i) => !/^data:/.test(i.getAttribute("src") || "")).map(async (i) => {
      try {
        i.setAttribute("src", await asDataUrl(await (await fetch(i.src)).blob()));
      } catch (e) {
      }
    }));
  }
  var pageSvg = (vars, css, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${PAGE.w}" height="${PAGE.h}"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml" style="${vars}"><style>${css.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</style>${body}</div></foreignObject></svg>`;
  var loads = (svg) => loadImage("data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg)).then(() => true, () => false);
  function describe(node, doc2) {
    const q = node.closest("[data-sel]"), path = q ? q.dataset.sel : "", H = doc2.header || {};
    const src = node.getAttribute && node.getAttribute("src") || "";
    const file2 = /^data:/.test(src) ? `image int\xE9gr\xE9e ${(src.match(/^data:([^;,]+)/) || [])[1] || ""}, ${Math.round(src.length / 1024)} Ko` : decodeURIComponent(src.split("/").pop() || "");
    if (path === "header") {
      if (node.closest(".hd-logo, [class*=logo]")) return `logo \xAB ${H.logoVariant || ""} \xBB de l\u2019en-t\xEAte (${file2})`;
      const im = (H.images || []).find((i) => i.id === H.imageId) || (H.images || [])[0];
      return `image de l\u2019en-t\xEAte \xAB ${im ? im.name : file2} \xBB (${file2})`;
    }
    const m2 = path.match(/^col:(\d+):(\d+):(\d+)$/);
    return m2 ? `colonne ${+m2[1] + 1}\xB7${+m2[2] + 1}\xB7${+m2[3] + 1}${node.tagName === "IMG" ? ` (image \xAB ${file2} \xBB)` : ""}` : path || node.tagName.toLowerCase();
  }
  async function diagnose(pageEl, vars, css, doc2) {
    const SVGNS = "http://www.w3.org/2000/svg";
    const one = (el2) => {
      let x = new XMLSerializer().serializeToString(el2);
      if (el2.namespaceURI === SVGNS && el2.localName !== "svg") {
        if (el2.localName === "tspan") x = `<text xmlns="${SVGNS}">${x}</text>`;
        x = `<svg xmlns="${SVGNS}" width="400" height="400">${x}</svg>`;
      }
      return pageSvg(vars, css, x);
    };
    const bad = [];
    for (const im of pageEl.querySelectorAll("img")) {
      if (!await loads(one(im))) bad.push(describe(im, doc2));
    }
    if (!bad.length) for (const c2 of pageEl.querySelectorAll('[data-sel^="col:"], [data-sel="header"]')) {
      if (!await loads(one(c2))) {
        const deep = await deepFault(c2, one);
        bad.push(describe(c2, doc2) + (deep ? " \u2192 " + deep : ""));
      }
    }
    return bad.length ? "\xE9l\xE9ment(s) fautif(s) : " + bad.join(" ; ") : "aucun \xE9l\xE9ment seul n\u2019est en cause (page trop lourde ou combinaison)";
  }
  async function deepFault(el2, one) {
    let budget = 50;
    const short = (n) => {
      const t2 = (n.textContent || "").replace(/\s+/g, " ").trim().slice(0, 40), cls = n.getAttribute && n.getAttribute("class") || "";
      return `<${n.tagName.toLowerCase()}${cls ? "." + cls.split(" ")[0] : ""}>${t2 ? " \xAB " + t2 + " \xBB" : ""}`;
    };
    const walk2 = async (n) => {
      const bad = [];
      for (const c2 of n.children) {
        if (budget-- <= 0) break;
        if (!await loads(one(c2))) bad.push(c2);
      }
      if (!bad.length) return [short(n)];
      const out = [];
      for (const c2 of bad) out.push(...await walk2(c2));
      return out;
    };
    const r = await walk2(el2);
    return r.slice(0, 4).join(" ; ");
  }
  async function rasterizeDocument(doc2, scale = 2) {
    await loadFonts();
    const css = await documentCss();
    const stage2 = h("div", { style: { position: "absolute", left: "-20000px", top: "0" } });
    document.body.append(stage2);
    try {
      const result = renderDocument(doc2);
      result.pages.forEach((p) => stage2.append(p.el));
      measure(result);
      await inlineImages(stage2);
      const out = [];
      for (const p of result.pages) {
        const vars = Object.entries(cssVars(doc2.theme, doc2.colors)).map(([k, v]) => `${k}:${v}`).join(";").replace(/&/g, "&amp;").replace(/"/g, "&quot;");
        const body = new XMLSerializer().serializeToString(p.el);
        const svg = pageSvg(vars, css, body);
        let im;
        try {
          im = await loadImage("data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg));
        } catch (e) {
          throw new Error(`${e.message} \u2014 ${await diagnose(p.el, vars, css, doc2)} (${Math.round(svg.length / 1024)} Ko)`);
        }
        if (im.decode) {
          try {
            await im.decode();
          } catch (e) {
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = PAGE.w * scale;
        canvas.height = PAGE.h * scale;
        const g = canvas.getContext("2d");
        try {
          g.drawImage(im, 0, 0, canvas.width, canvas.height);
        } catch (e) {
          await new Promise((r) => setTimeout(r, 150));
          g.drawImage(im, 0, 0, canvas.width, canvas.height);
        }
        out.push({ key: p.key, canvas });
      }
      return out;
    } finally {
      stage2.remove();
    }
  }

  // src/main.js
  var doc = loadDoc();
  var selected = null;
  var collapsed = /* @__PURE__ */ new Set();
  var treeEl = document.getElementById("tree");
  var propsEl = document.getElementById("props");
  var stage = document.getElementById("stage");
  var gauges = document.getElementById("gauges");
  var warnEl = document.getElementById("warnings");
  var zoomMode = "fit";
  var showSpacing = false;
  var raf = 0;
  var hover = null;
  var undoSnap = null;
  var previewDoc = null;
  var previewMark = null;
  function scaleValue() {
    if (zoomMode !== "fit") return parseFloat(zoomMode);
    const avail = stage.clientWidth - 44;
    return Math.max(0.4, Math.min(1, (avail - 24) / (2 * PAGE.w)));
  }
  function drawPreview() {
    stage.classList.toggle("free", zoomMode !== "fit");
    const sc = scaleValue(), sx = stage.scrollLeft, sy = stage.scrollTop;
    const r = renderDocument(previewDoc || doc);
    stage.innerHTML = "";
    r.pages.forEach((p) => {
      const wrap = h(
        "div",
        { class: "pwrap", style: { width: PAGE.w * sc + "px", height: PAGE.h * sc + "px" } },
        h("span", { class: "tag", textContent: p.key }),
        h("div", { class: "pscale", style: { transform: `scale(${sc})` } }, p.el)
      );
      stage.append(wrap);
    });
    stage.scrollLeft = sx;
    stage.scrollTop = sy;
    measure(r);
    drawSpacing();
    gauges.innerHTML = "";
    r.pages.forEach((p) => {
      const pct = Math.min(100, Math.round(p.used / p.max * 100));
      gauges.append(h(
        "div",
        { class: "gauge" + (p.overflow ? " over" : "") },
        h("span", { textContent: p.key === "recto" ? "Recto" : "Verso" }),
        h("i", {}, h("b", { style: { width: pct + "%" } })),
        h("span", { textContent: Math.round(p.used / p.max * 100) + " %" })
      ));
    });
    warnEl.innerHTML = "";
    r.warnings.forEach((w) => warnEl.append(h("div", { textContent: w })));
    const nLocal = localImageCount(doc);
    if (nLocal) warnEl.append(h("a", { class: "note", href: "atelier.html", textContent: nLocal === 1 ? "1 image \xE0 publier \u2014 ouvrir l\u2019Atelier" : `${nLocal} images \xE0 publier \u2014 ouvrir l\u2019Atelier` }));
    if (!storage.ok) warnEl.append(h("div", { textContent: "Espace de stockage du navigateur plein : les derni\xE8res modifications ne sont pas enregistr\xE9es. Enregistrez le projet (.json) et all\xE9gez les images." }));
    if (hover) hover.hide();
    if (previewDoc && previewMark) stage.querySelectorAll(`[data-sel="${previewMark}"]`).forEach((n) => n.classList.add("drag-live"));
    drawSelection();
    watchLayout();
  }
  var SEL_STYLE = "halo";
  var SEL_GAP = 3;
  var selShown = null;
  function drawSelection() {
    stage.querySelectorAll(".sel-layer").forEach((n) => n.remove());
    if (!selected || previewDoc) return;
    const fresh = selShown !== selected;
    selShown = selected;
    stage.querySelectorAll(".pwrap").forEach((w) => {
      const el2 = w.querySelector(`.page [data-sel="${selected}"]`);
      if (!el2) return;
      const wr = w.getBoundingClientRect(), r = el2.getBoundingClientRect(), gx = selected.startsWith("sec:") ? 0 : SEL_GAP;
      w.append(h("div", { class: "sel-layer" }, h("div", {
        class: `sel-frame v-${SEL_STYLE}` + (fresh ? " pop" : ""),
        style: { left: r.left - wr.left - gx + "px", top: r.top - wr.top - SEL_GAP + "px", width: r.width + 2 * gx + "px", height: r.height + 2 * SEL_GAP + "px" }
      })));
    });
  }
  var layRaf = 0;
  var layoutObs = new ResizeObserver(() => {
    cancelAnimationFrame(layRaf);
    layRaf = requestAnimationFrame(() => {
      drawSpacing();
      drawSelection();
    });
  });
  var watchLayout = () => {
    layoutObs.disconnect();
    stage.querySelectorAll(".page .content, .page .hd").forEach((c2) => layoutObs.observe(c2));
  };
  var legendEl = h("div", { class: "sp-legend" });
  var spToggle = h("button", { type: "button", class: "sp-toggle", title: t("Marges et espaces"), "aria-pressed": "false", onclick: () => {
    showSpacing = !showSpacing;
    schedule();
    syncSpacingCtl();
  } }, ico("ruler-measure"), h("span", { textContent: t("Marges et espaces") }));
  var densBtns = Object.entries(DENSITIES).map(([k, d]) => h("button", { type: "button", title: `${t(d.label)} \u2014 ${Math.round(d.f * 100)} %`, onclick: () => {
    doc.density = k;
    ctx.restructure();
    syncSpacingCtl();
  } }, d.label));
  function syncSpacingCtl() {
    spToggle.classList.toggle("on", showSpacing);
    spToggle.setAttribute("aria-pressed", String(showSpacing));
    Object.keys(DENSITIES).forEach((k, i) => densBtns[i].classList.toggle("on", (doc.density || "normal") === k));
  }
  document.querySelector(".bar").append(h("div", { class: "sp-ctl" }, spToggle, h("div", { class: "seg", role: "group", "aria-label": t("Espacement") }, densBtns)), legendEl);
  var SPACING_KINDS = { margin: "Marges", sec: "Sections", sub: "Sous-sections", col: "Colonnes" };
  function drawSpacing() {
    stage.querySelectorAll(".sp-layer").forEach((n) => n.remove());
    legendEl.replaceChildren();
    if (!showSpacing) return;
    stage.querySelectorAll(".pwrap").forEach((w) => {
      const page = w.querySelector(".page");
      if (!page) return;
      const wr = w.getBoundingClientRect(), sc = wr.width / PAGE.w, layer = h("div", { class: "sp-layer" });
      const rel = (el2) => {
        const r = el2.getBoundingClientRect();
        return { l: r.left - wr.left, t: r.top - wr.top, r: r.right - wr.left, b: r.bottom - wr.top };
      };
      const add = (l, t2, wd, ht, kind) => {
        if (wd < 1 || ht < 1) return;
        const px = Math.round((kind === "col" ? wd : kind === "margin" ? Math.min(wd, ht) : ht) / sc);
        layer.append(h("div", { class: "sp sp-" + kind, style: { left: l + "px", top: t2 + "px", width: wd + "px", height: ht + "px" } }, wd >= 14 && ht >= 12 || kind === "col" && ht >= 12 ? h("span", { textContent: String(px) }) : null));
      };
      const m2 = PAGE.margin * sc, W = wr.width, H = wr.height, hd = page.querySelector(".hd"), top0 = hd ? rel(hd).b : 0;
      const secs = [...page.querySelectorAll(".content > .sec")];
      add(0, top0, m2, H - top0, "margin");
      add(W - m2, top0, m2, H - top0, "margin");
      add(m2, H - PAGE.marginBottom * sc, W - 2 * m2, PAGE.marginBottom * sc, "margin");
      if (secs.length) add(m2, top0, W - 2 * m2, rel(secs[0]).t - top0, "margin");
      secs.forEach((sec, i) => {
        if (i) add(m2, rel(secs[i - 1]).b, W - 2 * m2, rel(sec).t - rel(secs[i - 1]).b, "sec");
        const subs = [...sec.querySelectorAll(".sub")].filter((x) => x.closest(".sec") === sec);
        subs.forEach((sb, j) => {
          if (j) {
            const a2 = rel(subs[j - 1]), b = rel(sb);
            add(b.l, a2.b, b.r - b.l, b.t - a2.b, "sub");
          }
        });
      });
      page.querySelectorAll(".cols").forEach((cols) => {
        const ch = [...cols.children].filter((x) => x.dataset && x.dataset.sel), cr = rel(cols);
        ch.forEach((c2, j) => {
          if (j) add(rel(ch[j - 1]).r, cr.t, rel(c2).l - rel(ch[j - 1]).r, cr.b - cr.t, "col");
        });
      });
      w.append(layer);
    });
    legendEl.replaceChildren(...Object.entries(SPACING_KINDS).map(([k, l]) => h("span", {}, h("i", { class: "sp-" + k }), t(l))));
  }
  var noteTimer = 0;
  function noteToast(label, undoLabel) {
    document.querySelectorAll(".fs-toast").forEach((n) => n.remove());
    clearTimeout(noteTimer);
    const el2 = h("div", { class: "fs-toast", role: "status" }, h("span", { textContent: t(label) }), h("button", { type: "button", textContent: t(undoLabel), onclick: () => {
      el2.remove();
      undo();
    } }));
    document.body.append(el2);
    noteTimer = setTimeout(() => el2.remove(), 6e3);
  }
  var HIST = { stack: [], meta: [], i: -1, at: 0, burst: false, applying: false, max: 100 };
  var imgIds = /* @__PURE__ */ new Map();
  var imgById = [];
  var tokenOf = (v) => {
    let n = imgIds.get(v);
    if (n == null) {
      n = imgById.length;
      imgById.push(v);
      imgIds.set(v, n);
    }
    return `img${n}`;
  };
  var snapshot = () => JSON.stringify(doc, (k, v) => typeof v === "string" && v.length > 300 && v.startsWith("data:") ? tokenOf(v) : v);
  var restore = (str) => JSON.parse(str, (k, v) => typeof v === "string" && v.startsWith("img") ? imgById[+v.slice(4)] : v);
  var FIELDS = {
    text: "texte",
    title: "titre",
    subtitle: "sous-titre",
    overline: "surtitre",
    bg: "fond",
    fg: "couleur du texte",
    stroke: "contour",
    strokeColor: "couleur du contour",
    fillColor: "fond",
    layout: "colonnes",
    page: "page",
    valign: "alignement vertical",
    align: "alignement",
    density: "espacement",
    locale: "format des nombres",
    src: "image",
    caption: "l\xE9gende",
    logoVariant: "logo",
    logos: "logo",
    colors: "couleurs",
    colorNames: "noms des couleurs",
    viz: "dataviz",
    card: "carte",
    figure: "chiffre cl\xE9",
    type: "type de contenu",
    imageId: "image",
    images: "images",
    showImage: "image",
    showLogo: "logo",
    name: "nom du fichier",
    showTitle: "affichage du titre"
  };
  var firstDiff = (a2, b, path = []) => {
    if (a2 === b) return null;
    if (!a2 || !b || typeof a2 !== "object" || typeof b !== "object") return { path };
    if (Array.isArray(a2) && Array.isArray(b) && a2.length !== b.length) return { path, grew: b.length - a2.length };
    for (const k of /* @__PURE__ */ new Set([...Object.keys(a2), ...Object.keys(b)])) {
      const r = firstDiff(a2[k], b[k], [...path, k]);
      if (r) return r;
    }
    return null;
  };
  function describe2(prevStr, nextStr) {
    if (prevStr == null) return t("Ouverture du document");
    let d;
    try {
      const A = restore(prevStr), B = restore(nextStr);
      d = firstDiff(A, B);
      var doc2 = B;
    } catch (e) {
      return t("Modification");
    }
    if (!d) return t("Modification");
    const p = d.path, name = (x) => String(x || "").trim().slice(0, 22);
    let where = "", field = "";
    if (p[0] === "header") {
      where = t("Header");
      field = p[1];
    } else if (p[0] === "sections") {
      if (p.length === 1) return d.grew > 0 ? t("Section ajout\xE9e") : d.grew < 0 ? t("Section supprim\xE9e") : t("\xC9l\xE9ments d\xE9plac\xE9s");
      const sec = doc2.sections[p[1]];
      where = `${t("Section")} \xAB ${name(sec && sec.title)} \xBB`;
      if (p[2] === "subs") {
        if (p.length === 3) return d.grew > 0 ? t("Sous-section ajout\xE9e") : d.grew < 0 ? t("Sous-section supprim\xE9e") : t("\xC9l\xE9ments d\xE9plac\xE9s");
        const sub = sec && sec.subs[p[3]];
        where = `${t("Sous-section")} \xAB ${name(sub && sub.title)} \xBB`;
        if (p[4] === "cols") {
          if (p.length === 5) return d.grew > 0 ? t("Colonne ajout\xE9e") : d.grew < 0 ? t("Colonne supprim\xE9e") : t("\xC9l\xE9ments d\xE9plac\xE9s");
          where = `${t("Colonne")} ${+p[5] + 1}`;
          field = p[6];
        } else field = p[4];
      } else field = p[2];
    } else {
      where = t("Document");
      field = p[0];
    }
    if (field === "id") return t("\xC9l\xE9ments d\xE9plac\xE9s");
    return `${where} \xB7 ${FIELDS[field] ? t(FIELDS[field]) : t("r\xE9glage")}`;
  }
  function record(burst) {
    if (HIST.applying) return;
    const sn = snapshot();
    if (HIST.i >= 0 && HIST.stack[HIST.i] === sn) return;
    const now = Date.now();
    if (burst && HIST.burst && HIST.i === HIST.stack.length - 1 && HIST.i > 0 && now - HIST.at < 1e3) {
      HIST.stack[HIST.i] = sn;
      HIST.meta[HIST.i] = { label: describe2(HIST.stack[HIST.i - 1], sn), at: HIST.meta[HIST.i].at };
    } else {
      HIST.stack.length = HIST.i + 1;
      HIST.meta.length = HIST.i + 1;
      HIST.stack.push(sn);
      HIST.meta.push({ label: describe2(HIST.stack[HIST.i], sn), at: now });
      if (HIST.stack.length > HIST.max) {
        HIST.stack.shift();
        HIST.meta.shift();
      }
      HIST.i = HIST.stack.length - 1;
    }
    HIST.at = now;
    HIST.burst = !!burst;
    syncCenter();
  }
  function goTo(i) {
    if (i < 0 || i >= HIST.stack.length) return;
    HIST.i = i;
    HIST.applying = true;
    try {
      doc = migrate(restore(HIST.stack[i]));
      undoSnap = null;
      ctx.preview(null);
      ctx.restructure();
    } finally {
      HIST.applying = false;
    }
    syncCenter();
  }
  var undo = () => goTo(HIST.i - 1);
  var redo = () => goTo(HIST.i + 1);
  var canUndo = () => HIST.i > 0;
  var canRedo = () => HIST.i < HIST.stack.length - 1;
  var schedule = () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(drawPreview);
  };
  var pathOk = (p) => {
    if (!p) return true;
    const q = p.split(":"), sec = doc.sections[+q[1]];
    if (q[0] === "header") return true;
    if (!sec) return false;
    if (q[0] === "sec") return true;
    const sub = sec.subs[+q[2]];
    if (!sub) return false;
    return q[0] === "sub" || !!sub.cols[+q[3]];
  };
  var parentOf = (p) => {
    const q = p.split(":");
    return q[0] === "col" ? `sub:${q[1]}:${q[2]}` : q[0] === "sub" ? `sec:${q[1]}` : null;
  };
  function fixSelection() {
    while (selected && !pathOk(selected)) selected = parentOf(selected);
  }
  function drawTree() {
    const top = treeEl.scrollTop;
    buildTree(treeEl, ctx);
    treeEl.scrollTop = top;
  }
  function drawProps() {
    const top = propsEl.scrollTop;
    buildProps(propsEl, ctx);
    propsEl.scrollTop = top;
  }
  var ctx = {
    getDoc: () => doc,
    getSel: () => selected,
    collapsed,
    changed() {
      undoSnap = null;
      record(true);
      saveDoc(doc);
      schedule();
      drawTree();
      const v = cssVars(doc.theme, doc.colors);
      applyVars(propsEl, v);
      applyVars(treeEl, v);
    },
    refreshProps: drawProps,
    shown: () => previewDoc || doc,
    previewing: () => !!previewDoc,
    previewMark: () => previewMark,
    /* Aperçu en direct d'un déplacement : `fn(copie)` l'applique à une copie du document et renvoie le chemin à repérer ; null = retour au vrai document */
    preview(fn) {
      if (!fn) {
        if (previewDoc) {
          previewDoc = null;
          previewMark = null;
          schedule();
        }
        return;
      }
      const c2 = JSON.parse(JSON.stringify(doc));
      previewMark = fn(c2);
      previewDoc = c2;
      schedule();
    },
    refreshTree: drawTree,
    /* Déplacement de contenu : `fn` modifie le document et renvoie le chemin à sélectionner ensuite.
       L'état d'avant est gardé pour « Annuler le déplacement » (jusqu'à la prochaine modification). */
    moved(fn, label = "Contenu d\xE9plac\xE9. V\xE9rifiez le remplissage des pages.", undoLabel = "Annuler le d\xE9placement") {
      const to = fn();
      selected = to || null;
      ctx.restructure();
      ctx.select(selected);
      noteToast(label, undoLabel);
    },
    /* Supprime l'élément sélectionné (section, sous-section ou colonne) — annulable */
    remove(path) {
      const q = String(path || "").split(":"), si = +q[1], bi = +q[2], ci = +q[3], sec = doc.sections[si], sub = sec && sec.subs[bi];
      if (q[0] === "sec" && sec) ctx.moved(() => {
        doc.sections.splice(si, 1);
        return null;
      }, "\xC9l\xE9ment supprim\xE9.", "Annuler la suppression");
      else if (q[0] === "sub" && sub) ctx.moved(() => {
        sec.subs.splice(bi, 1);
        return `sec:${si}`;
      }, "\xC9l\xE9ment supprim\xE9.", "Annuler la suppression");
      else if (q[0] === "col" && sub && sub.cols[ci]) ctx.moved(() => removeCol(doc, si, bi, ci), sub.cols.length > 1 ? "Colonne supprim\xE9e : les autres s\u2019\xE9tendent." : "\xC9l\xE9ment supprim\xE9.", "Annuler la suppression");
    },
    restructure() {
      fixSelection();
      record(false);
      saveDoc(doc);
      drawTree();
      drawProps();
      schedule();
    },
    select(path) {
      selected = path || null;
      fixSelection();
      drawTree();
      drawProps();
      schedule();
      const n = treeEl.querySelector(".tn.sel");
      if (n) n.scrollIntoView({ block: "nearest" });
    },
    editViz({ col, sub, ci }) {
      const sec = doc.sections.find((x) => x.subs.includes(sub));
      openVizEditor({ col, sub, ci, bg: sec && sec.bg, width: columnWidth(doc, doc.sections.indexOf(sec), sec.subs.indexOf(sub), ci), ctx });
    }
  };
  window.addEventListener("keydown", (e) => {
    if (e.key !== "Delete" && e.key !== "Backspace") return;
    const a2 = document.activeElement, tag = e.target.tagName || "";
    if (/INPUT|TEXTAREA|SELECT/.test(tag) || e.target.isContentEditable || a2 && a2.isContentEditable) return;
    if (document.querySelector("dialog[open], .ve, .v3d, .ce") || !selected || selected === "header") return;
    e.preventDefault();
    ctx.remove(selected);
  });
  var handTool = false;
  var handSpace = false;
  var panning = null;
  var handOn = () => handTool || handSpace;
  var syncHand = () => {
    stage.classList.toggle("hand", handOn());
    if (handOn()) hover.hide();
  };
  var typing = (e) => {
    const tg = e.target, tag = tg.tagName || "";
    return /INPUT|TEXTAREA|SELECT/.test(tag) || tg.isContentEditable || document.querySelector("dialog[open], .ve, .v3d, .ce");
  };
  window.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || typing(e)) return;
    if (e.key === " ") {
      e.preventDefault();
      if (!handSpace) {
        handSpace = true;
        syncHand();
      }
    } else if (e.key === "h" || e.key === "H") {
      handTool = !handTool;
      syncHand();
    } else if (e.key === "Escape" && handTool) {
      handTool = false;
      syncHand();
    }
  });
  window.addEventListener("keyup", (e) => {
    if (e.key === " " && handSpace) {
      handSpace = false;
      syncHand();
    }
  });
  window.addEventListener("blur", () => {
    handSpace = false;
    syncHand();
  });
  stage.addEventListener("pointerdown", (e) => {
    if (!handOn() || e.button > 1) return;
    e.preventDefault();
    e.stopPropagation();
    panning = { x: e.clientX, y: e.clientY, sl: stage.scrollLeft, st: stage.scrollTop, moved: false };
    stage.setPointerCapture(e.pointerId);
    stage.classList.add("panning");
  }, true);
  stage.addEventListener("pointermove", (e) => {
    if (!panning) return;
    panning.moved = true;
    stage.scrollLeft = panning.sl - (e.clientX - panning.x);
    stage.scrollTop = panning.st - (e.clientY - panning.y);
  });
  var endPan = () => {
    if (panning) {
      stage.classList.remove("panning");
      setTimeout(() => {
        panning = null;
      }, 0);
    }
  };
  stage.addEventListener("pointerup", endPan);
  stage.addEventListener("pointercancel", endPan);
  stage.addEventListener("click", (e) => {
    if (handOn() || panning) {
      e.stopPropagation();
      e.preventDefault();
    }
  }, true);
  hover = initHover({
    stage,
    getDoc: () => doc,
    ctx,
    canShow: () => !handOn() && !drag && !document.body.classList.contains("ve-open") && !document.body.classList.contains("dragging"),
    select: (path) => ctx.select(path)
  });
  stage.addEventListener("click", (e) => {
    if (suppressClick) {
      suppressClick = false;
      return;
    }
    const n = e.target.closest("[data-sel]");
    ctx.select(n ? n.dataset.sel : null);
  });
  stage.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || handOn()) return;
    const n = e.target.closest("[data-free]");
    if (!n) return;
    const q = n.dataset.free.split(":"), idx = +q.pop(), col = doc.sections[+q[1]]?.subs[+q[2]]?.cols[+q[3]], tx = col && col.texts && col.texts[idx], colEl = n.closest(".col");
    if (!tx || !colEl) return;
    const sc = colEl.closest(".page").getBoundingClientRect().width / PAGE.w, cr = colEl.getBoundingClientRect(), nr = n.getBoundingClientRect();
    const colW = cr.width / sc, x0 = +tx.x || 0, y0 = (nr.top - cr.top) / sc, w = +tx.w || 50, px = e.clientX, py = e.clientY;
    let moved = false;
    e.stopPropagation();
    hover.hide();
    const move = (ev) => {
      if (!moved && Math.hypot(ev.clientX - px, ev.clientY - py) < 3) return;
      moved = true;
      tx.x = Math.round(Math.max(0, Math.min(100 - Math.min(w, 100), x0 + (ev.clientX - px) / sc / colW * 100)) * 10) / 10;
      tx.y = Math.round(Math.max(0, y0 + (ev.clientY - py) / sc));
      ctx.changed();
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      if (moved) {
        suppressClick = true;
        setTimeout(() => {
          suppressClick = false;
        }, 0);
        ctx.restructure();
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }, true);
  var zoomJob = null;
  stage.addEventListener("wheel", (e) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    if (!zoomJob) {
      const sc0 = scaleValue(), pws = [...stage.querySelectorAll(".pwrap")], pw = e.target.closest && e.target.closest(".pwrap"), r = pw && pw.getBoundingClientRect(), sb = stage.getBoundingClientRect();
      zoomJob = { sc0, sc: sc0, anchor: pw ? { i: pws.indexOf(pw), u: (e.clientX - r.left) / sc0, v: (e.clientY - r.top) / sc0 } : null, cx: e.clientX - sb.left, cy: e.clientY - sb.top, x: e.clientX, y: e.clientY };
      requestAnimationFrame(() => {
        const j = zoomJob;
        zoomJob = null;
        if (Math.abs(j.sc - j.sc0) < 1e-4) return;
        zoomMode = j.sc.toFixed(3);
        cancelAnimationFrame(raf);
        drawPreview();
        const pw2 = j.anchor && stage.querySelectorAll(".pwrap")[j.anchor.i];
        if (pw2) {
          const r2 = pw2.getBoundingClientRect();
          stage.scrollLeft += r2.left + j.anchor.u * j.sc - j.x;
          stage.scrollTop += r2.top + j.anchor.v * j.sc - j.y;
        } else {
          stage.scrollLeft = (stage.scrollLeft + j.cx) * (j.sc / j.sc0) - j.cx;
          stage.scrollTop = (stage.scrollTop + j.cy) * (j.sc / j.sc0) - j.cy;
        }
        drawSelection();
      });
    }
    zoomJob.sc = Math.min(4, Math.max(0.25, zoomJob.sc * Math.exp(-e.deltaY * 2e-3)));
    zoomJob.x = e.clientX;
    zoomJob.y = e.clientY;
  }, { passive: false });
  stage.addEventListener("dblclick", (e) => {
    const n = e.target.closest(".col-viz[data-sel]");
    if (!n) return;
    const [, si, bi, ci] = n.dataset.sel.split(":").map(Number);
    const sec = doc.sections[si], sub = sec && sec.subs[bi], col = sub && sub.cols[ci];
    if (col) ctx.editViz({ col, sub, ci });
  });
  var drag = null;
  var suppressClick = false;
  var secIdx = (d, id) => d.sections.findIndex((x) => x.id === id);
  var subIdx = (d, id) => {
    for (let si = 0; si < d.sections.length; si++) {
      const bi = d.sections[si].subs.findIndex((x) => x.id === id);
      if (bi >= 0) return { si, bi };
    }
    return null;
  };
  var secOf = (el2) => +el2.dataset.sel.split(":")[1];
  function secTarget(e) {
    const sd = ctx.shown(), dg = drag;
    for (const page of stage.querySelectorAll(".page")) {
      const pr = page.getBoundingClientRect();
      if (e.clientX < pr.left || e.clientX > pr.right || e.clientY < pr.top || e.clientY > pr.bottom) continue;
      const key = page.dataset.page, id = (el2) => sd.sections[secOf(el2)].id;
      const secs = [...page.querySelectorAll(".sec")].filter((x) => id(x) !== dg.id);
      const mk = (ref, after) => ({ key: [key, ref, after], apply: (c2) => {
        const ni = moveSection(c2, secIdx(c2, dg.id), ref == null ? null : secIdx(c2, ref), after, key);
        return `sec:${ni}`;
      } });
      for (const x of secs) {
        const r = x.getBoundingClientRect();
        if (e.clientY < r.top + r.height / 2) return mk(id(x), false);
      }
      return secs.length ? mk(id(secs[secs.length - 1]), true) : mk(null, false);
    }
    return null;
  }
  function subTarget(e) {
    const sd = ctx.shown(), dg = drag;
    for (const page of stage.querySelectorAll(".page")) {
      const pr = page.getBoundingClientRect();
      if (e.clientX < pr.left || e.clientX > pr.right || e.clientY < pr.top || e.clientY > pr.bottom) continue;
      const secs = [...page.querySelectorAll(".sec")];
      if (!secs.length) return null;
      let sec = secs.find((x) => {
        const r = x.getBoundingClientRect();
        return e.clientY >= r.top && e.clientY <= r.bottom;
      });
      if (!sec) sec = e.clientY < secs[0].getBoundingClientRect().top ? secs[0] : secs[secs.length - 1];
      const sid = sd.sections[secOf(sec)].id, subs = [...sec.querySelectorAll(".sub[data-sel]")].filter((x) => {
        const q = x.dataset.sel.split(":");
        return sd.sections[+q[1]].subs[+q[2]].id !== dg.id;
      });
      const idOf = (el2) => {
        const q = el2.dataset.sel.split(":");
        return sd.sections[+q[1]].subs[+q[2]].id;
      };
      const mk = (ref, after) => ({ key: [sid, ref, after], apply: (c2) => {
        const from = subIdx(c2, dg.id), si = secIdx(c2, sid), n = moveSub(c2, from, { si, bi: ref == null ? null : subIdx(c2, ref).bi }, after);
        return `sub:${n.si}:${n.bi}`;
      } });
      for (const x of subs) {
        const r = x.getBoundingClientRect();
        if (e.clientY < r.top + r.height / 2) return mk(idOf(x), false);
      }
      return subs.length ? mk(idOf(subs[subs.length - 1]), true) : mk(null, false);
    }
    return null;
  }
  function colTarget(e) {
    const dg = drag;
    for (const sub of stage.querySelectorAll(".sub[data-sel]")) {
      const cols = sub.querySelector(":scope > .cols");
      if (!cols) continue;
      const r = cols.getBoundingClientRect();
      if (e.clientY < r.top || e.clientY > r.bottom || e.clientX < r.left || e.clientX > r.right) continue;
      const list = [...cols.children].filter((x) => x.dataset && x.dataset.sel);
      const hit = list.find((x) => {
        const b = x.getBoundingClientRect();
        return e.clientX >= b.left && e.clientX <= b.right;
      }) || list.reduce((best, x) => {
        const b = x.getBoundingClientRect(), d = Math.min(Math.abs(e.clientX - b.left), Math.abs(e.clientX - b.right));
        return !best || d < best.d ? { x, d } : best;
      }, null).x;
      const [, si, bi, ci] = hit.dataset.sel.split(":").map(Number);
      if (si === dg.from.si && bi === dg.from.bi && ci === dg.from.ci) return null;
      return { key: [si, bi, ci], apply: (c2) => {
        swapCols(c2, dg.from, { si, bi, ci });
        return `col:${si}:${bi}:${ci}`;
      } };
    }
    return null;
  }
  var mkSec = (dg, page, ref, after) => ({ key: [page, ref, after], apply: (c2) => `sec:${moveSection(c2, secIdx(c2, dg.id), ref == null ? null : secIdx(c2, ref), after, page)}` });
  var mkSub = (dg, sid, ref, after) => ({ key: [sid, ref, after], apply: (c2) => {
    const n = moveSub(c2, subIdx(c2, dg.id), { si: secIdx(c2, sid), bi: ref == null ? null : subIdx(c2, ref).bi }, after);
    return `sub:${n.si}:${n.bi}`;
  } });
  var mkCol = (dg, si, bi, ci) => ({ key: [si, bi, ci], apply: (c2) => {
    swapCols(c2, dg.from, { si, bi, ci });
    return `col:${si}:${bi}:${ci}`;
  } });
  var inTree = (e) => {
    const r = treeEl.getBoundingClientRect();
    return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
  };
  function treeSecTarget(e) {
    const dg = drag;
    if (!inTree(e)) return null;
    for (const z of treeEl.querySelectorAll(".pg-zone[data-page]")) {
      const r = z.getBoundingClientRect();
      if (e.clientY < r.top || e.clientY > r.bottom) continue;
      const secs = [...z.querySelectorAll(":scope > .tn-sec[data-sid]")].filter((x) => x.dataset.sid !== dg.id);
      for (const x of secs) {
        const q = x.getBoundingClientRect();
        if (e.clientY < q.top + q.height / 2) return mkSec(dg, z.dataset.page, x.dataset.sid, false);
      }
      return secs.length ? mkSec(dg, z.dataset.page, secs[secs.length - 1].dataset.sid, true) : mkSec(dg, z.dataset.page, null, false);
    }
    return null;
  }
  function treeSubTarget(e) {
    const dg = drag;
    if (!inTree(e)) return null;
    const secs = [...treeEl.querySelectorAll(".tn-sec[data-sid]")];
    if (!secs.length) return null;
    const sec = secs.find((x) => {
      const r = x.getBoundingClientRect();
      return e.clientY >= r.top && e.clientY <= r.bottom;
    }) || secs.reduce((b, x) => {
      const r = x.getBoundingClientRect(), d = Math.min(Math.abs(e.clientY - r.top), Math.abs(e.clientY - r.bottom));
      return !b || d < b.d ? { x, d } : b;
    }, null).x;
    const subs = [...sec.querySelectorAll(".tn-subcard[data-bid]")].filter((x) => x.dataset.bid !== dg.id);
    for (const x of subs) {
      const r = x.getBoundingClientRect();
      if (e.clientY < r.top + r.height / 2) return mkSub(dg, sec.dataset.sid, x.dataset.bid, false);
    }
    return subs.length ? mkSub(dg, sec.dataset.sid, subs[subs.length - 1].dataset.bid, true) : mkSub(dg, sec.dataset.sid, null, false);
  }
  function treeColTarget(e) {
    const dg = drag, n = document.elementFromPoint(e.clientX, e.clientY), r = n && n.closest && n.closest(".col-row[data-path]");
    if (!r) return null;
    const [, si, bi, ci] = r.dataset.path.split(":").map(Number);
    return si === dg.from.si && bi === dg.from.bi && ci === dg.from.ci ? null : mkCol(dg, si, bi, ci);
  }
  var TARGETS = { sec: secTarget, sub: subTarget, col: colTarget };
  var TREE_TARGETS = { sec: treeSecTarget, sub: treeSubTarget, col: treeColTarget };
  function dragSource() {
    if (drag.kind === "sec") return stage.querySelector(`.sec[data-sel="sec:${secIdx(doc, drag.id)}"]`);
    if (drag.kind === "sub") {
      const p = subIdx(doc, drag.id);
      return p && stage.querySelector(`.sub[data-sel="sub:${p.si}:${p.bi}"]`);
    }
    return stage.querySelector(`.col[data-sel="col:${drag.from.si}:${drag.from.bi}:${drag.from.ci}"]`);
  }
  function treeSource() {
    if (drag.kind === "sec") return treeEl.querySelector(`.tn-sec[data-sid="${drag.id}"]`);
    if (drag.kind === "sub") return treeEl.querySelector(`.tn-subcard[data-bid="${drag.id}"]`);
    return treeEl.querySelector(`.col-row[data-path="col:${drag.from.si}:${drag.from.bi}:${drag.from.ci}"]`);
  }
  function dragActivate() {
    drag.active = true;
    hover.hide();
    document.body.classList.add("dragging");
    if (drag.tree) {
      const el3 = treeSource();
      if (!el3) {
        drag.ghost = h("div");
        return;
      }
      const r2 = el3.getBoundingClientRect(), ghost = h("div", { class: "drag-obj tree-obj", style: { width: r2.width + "px" } });
      ghost.setAttribute("style", `${treeEl.getAttribute("style") || ""};width:${r2.width}px`);
      const clone2 = el3.cloneNode(true);
      clone2.style.margin = "0";
      ghost.append(clone2);
      document.body.append(ghost);
      drag.grab = { dx: Math.min(Math.max(drag.x - r2.left, 10), Math.max(10, r2.width - 10)), dy: Math.min(Math.max(drag.y - r2.top, 10), Math.max(10, r2.height - 10)) };
      drag.ghost = ghost;
      return;
    }
    const el2 = dragSource();
    if (!el2) {
      drag.ghost = h("div");
      return;
    }
    const r = el2.getBoundingClientRect(), page = el2.closest(".page"), sc = page.getBoundingClientRect().width / PAGE.w;
    const holder = h("div", { class: "page drag-page", style: { width: r.width / sc + "px", transform: `scale(${sc})` } });
    holder.setAttribute("style", (page.getAttribute("style") || "") + `;width:${r.width / sc}px;transform:scale(${sc})`);
    const clone = el2.cloneNode(true);
    clone.classList.remove("drag-live");
    clone.style.margin = "0";
    clone.removeAttribute("data-sel");
    holder.append(clone);
    drag.grab = { dx: Math.min(Math.max(drag.x - r.left, 10), Math.max(10, r.width - 10)), dy: Math.min(Math.max(drag.y - r.top, 10), Math.max(10, r.height - 10)) };
    drag.ghost = h("div", { class: "drag-obj", style: { width: r.width + "px", height: r.height + "px" } }, holder);
    document.body.append(drag.ghost);
  }
  function dragEnd(commit) {
    if (!drag) return;
    const d = drag;
    drag = null;
    if (!d.active) return;
    d.ghost.remove();
    document.body.classList.remove("dragging");
    ctx.preview(null);
    drawTree();
    suppressClick = true;
    setTimeout(() => {
      suppressClick = false;
    }, 0);
    if (commit && d.drop) ctx.moved(() => d.drop.apply(doc));
    else schedule();
  }
  window.addEventListener("pointermove", (e) => {
    if (!drag) return;
    if (!drag.active) {
      if (!drag.pending || Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 6) return;
      dragActivate();
    }
    if (drag.grab) {
      drag.ghost.style.left = e.clientX - drag.grab.dx + "px";
      drag.ghost.style.top = e.clientY - drag.grab.dy + "px";
    }
    if (drag.tree) {
      const tr2 = treeEl.getBoundingClientRect();
      if (e.clientY < tr2.top + 36) treeEl.scrollTop -= 14;
      else if (e.clientY > tr2.bottom - 36) treeEl.scrollTop += 14;
    }
    const t2 = (drag.tree ? TREE_TARGETS : TARGETS)[drag.kind](e), key = t2 ? JSON.stringify(t2.key) : "";
    if (key === drag.key) return;
    drag.key = key;
    drag.drop = t2;
    ctx.preview(t2 ? t2.apply : null);
    drawTree();
  });
  window.addEventListener("pointerup", () => dragEnd(true));
  window.addEventListener("pointercancel", () => dragEnd(false));
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") dragEnd(false);
  });
  stage.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    const st = e.target.closest(".sec-title"), bt = e.target.closest(".sub-title"), bg = !st && !bt && (e.target.classList.contains("sec") || e.target.classList.contains("sec-box")) ? e.target.closest(".sec") : null;
    const n = st || bt || bg;
    if (!n) return;
    const el2 = n.closest(bt ? ".sub" : ".sec"), q = el2.dataset.sel.split(":").map(Number);
    drag = { kind: bt ? "sub" : "sec", id: bt ? doc.sections[q[1]].subs[q[2]].id : doc.sections[q[1]].id, x: e.clientX, y: e.clientY, pending: true, active: false };
  });
  ctx.startColDrag = (e, from) => {
    drag = { kind: "col", from, x: e.clientX, y: e.clientY, pending: true, active: false };
  };
  ctx.startTreeDrag = (e, d) => {
    drag = { ...d, tree: true, x: e.clientX, y: e.clientY, pending: true, active: false };
  };
  ctx.startSecDrag = (e, from) => {
    drag = { kind: "sec", id: doc.sections[from.si].id, x: e.clientX, y: e.clientY, pending: true, active: false };
  };
  ctx.startSubDrag = (e, from) => {
    drag = { kind: "sub", id: doc.sections[from.si].subs[from.bi].id, x: e.clientX, y: e.clientY, pending: true, active: false };
  };
  var newBlank = () => {
    if (!confirm(t("Cr\xE9er une factsheet vierge ? Le document actuel sera remplac\xE9 : enregistrez-le d\u2019abord (.json) si besoin."))) return;
    doc = blankDoc();
    selected = null;
    undoSnap = null;
    ctx.restructure();
  };
  var file = h("input", { type: "file", accept: ".json,application/json", hidden: true });
  document.body.append(file);
  var saveProject = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(doc, null, 2)], { type: "application/json" }));
    const a2 = h("a", { href: url, download: (doc.name || "factsheet").replace(/[\\/:*?"<>|]+/g, "_") + ".json" });
    document.body.append(a2);
    a2.click();
    a2.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2e3);
  };
  file.addEventListener("change", async () => {
    const f = file.files[0];
    file.value = "";
    if (!f) return;
    try {
      const j = JSON.parse(await f.text());
      if (!Array.isArray(j.sections)) throw 0;
      doc = migrate(j);
      selected = null;
      ctx.restructure();
    } catch (e) {
      alert(t("Fichier de projet invalide."));
    }
  });
  document.addEventListener("fs-natural", () => {
    saveDoc(doc);
    schedule();
  });
  var langSel = h("select", { "aria-label": "Langue" }, Object.entries(LANGS).map(([k, l]) => h("option", { value: k, textContent: l })));
  langSel.value = getLang();
  var i18n = initI18n(() => ctx.restructure());
  langSel.addEventListener("change", () => i18n.set(langSel.value));
  var zoomItem = (label, v) => ({ label, checked: () => zoomMode === v, run: () => {
    zoomMode = v;
    schedule();
  } });
  var MAC = /Mac|iPhone|iPad/.test(navigator.platform || "");
  var MOD = MAC ? "\u2318" : "Ctrl+";
  var undoBtn = h("button", { type: "button", class: "icon-btn fs-hbtn", title: `${t("Annuler l\u2019action")} (${MOD}Z)`, "aria-label": t("Annuler l\u2019action"), onclick: () => undo() }, ico("arrow-back-up"));
  var redoBtn = h("button", { type: "button", class: "icon-btn fs-hbtn", title: `${t("R\xE9tablir")} (${MAC ? "\u21E7\u2318Z" : "Ctrl+Y"})`, "aria-label": t("R\xE9tablir"), onclick: () => redo() }, ico("arrow-forward-up"));
  var histBtn = h("button", { type: "button", class: "icon-btn fs-hbtn", title: t("Historique des modifications"), "aria-label": t("Historique des modifications"), onclick: () => toggleHistory() }, ico("history"));
  var nameIn = h("input", {
    type: "text",
    class: "fs-name",
    spellcheck: false,
    "aria-label": t("Nom du fichier"),
    title: t("Nom du fichier"),
    oninput: (e) => {
      doc.name = e.target.value;
      fitName();
      ctx.changed();
    }
  });
  var fitName = () => {
    nameIn.style.width = Math.max(10, nameIn.value.length + 1) + "ch";
  };
  var centerEl = h("div", { class: "fs-center" }, undoBtn, redoBtn, histBtn, nameIn);
  function syncCenter() {
    undoBtn.disabled = !canUndo();
    redoBtn.disabled = !canRedo();
    if (document.activeElement !== nameIn) nameIn.value = doc.name || "";
    fitName();
    if (histPop) drawHistory();
    syncSpacingCtl();
  }
  var histPop = null;
  var clock = (ms) => new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  function drawHistory() {
    const list = h("ul", { class: "hist-list" });
    for (let k = HIST.stack.length - 1; k >= 0; k--) {
      const m2 = HIST.meta[k] || {};
      list.append(h("li", {}, h(
        "button",
        { type: "button", class: "hist-item" + (k === HIST.i ? " on" : "") + (k > HIST.i ? " future" : ""), onclick: () => goTo(k) },
        h("span", { class: "hist-dot" }),
        h("span", { class: "hist-lab", textContent: m2.label || "" }),
        h("time", { textContent: clock(m2.at || Date.now()) })
      )));
    }
    histPop.body.replaceChildren(list);
  }
  function toggleHistory() {
    if (histPop) {
      histPop.close();
      return;
    }
    const el2 = h("div", { class: "hist-pop", role: "dialog", "aria-label": t("Historique des modifications") }, h(
      "div",
      { class: "hist-head" },
      h("b", { textContent: t("Historique des modifications") }),
      h("button", { type: "button", class: "mini", "aria-label": t("Fermer"), onclick: () => histPop.close() }, ico("x"))
    ), h("div", { class: "hist-body" }));
    document.body.append(el2);
    const r = histBtn.getBoundingClientRect();
    el2.style.left = Math.max(8, r.left - 40) + "px";
    el2.style.top = r.bottom + 6 + "px";
    const away = (e) => {
      if (!el2.contains(e.target) && !histBtn.contains(e.target)) histPop.close();
    };
    const key = (e) => {
      if (e.key === "Escape") histPop.close();
    };
    document.addEventListener("pointerdown", away, true);
    document.addEventListener("keydown", key, true);
    histPop = { body: el2.querySelector(".hist-body"), close() {
      document.removeEventListener("pointerdown", away, true);
      document.removeEventListener("keydown", key, true);
      el2.remove();
      histPop = null;
    } };
    drawHistory();
  }
  window.FS_UI = {
    menus: [
      { label: "Fichier", items: [
        { label: "Nouvelle factsheet vierge", icon: "file-plus", run: newBlank },
        { label: "Enregistrer (.json)", icon: "device-floppy", run: saveProject },
        { label: "Ouvrir\u2026", icon: "folder-open", run: () => file.click() },
        { label: "Exporter PDF\u2026", icon: "file-type-pdf", run: () => openExport() },
        "-",
        { label: "Atelier", icon: "brush", href: "atelier.html" }
      ] },
      { label: "\xC9dition", items: [
        { label: "Annuler l\u2019action", icon: "arrow-back-up", hint: MOD + "Z", run: () => undo(), disabled: () => !canUndo() },
        { label: "R\xE9tablir", icon: "arrow-forward-up", hint: MAC ? "\u21E7\u2318Z" : "Ctrl+Y", run: () => redo(), disabled: () => !canRedo() },
        { label: "Historique des modifications\u2026", icon: "history", run: () => toggleHistory() },
        "-",
        { label: "Couleurs du document\u2026", icon: "palette", run: () => openPalette(nameIn, ctx) },
        { label: "M\xE9dias import\xE9s\u2026", icon: "photo", run: () => openMedia(ctx) },
        { heading: "Format des nombres" },
        ...Object.entries(LOCALES).map(([k, l]) => ({ label: l, checked: () => doc.locale === k, run: () => {
          doc.locale = k;
          ctx.restructure();
        } }))
      ] },
      { label: "Affichage", items: [
        { heading: "Zoom" },
        zoomItem("Ajuster", "fit"),
        zoomItem("50 %", "0.5"),
        zoomItem("75 %", "0.75"),
        zoomItem("100 %", "1"),
        zoomItem("200 %", "2"),
        zoomItem("400 %", "4"),
        "-",
        { heading: "Espacement" },
        { label: "Marges et espaces", icon: "ruler-measure", checked: () => showSpacing, run: () => {
          showSpacing = !showSpacing;
          schedule();
          syncSpacingCtl();
        } },
        ...Object.entries(DENSITIES).map(([k, d]) => ({ label: `${d.label} \u2014 ${Math.round(d.f * 100)} %`, checked: () => (doc.density || "normal") === k, run: () => {
          doc.density = k;
          ctx.restructure();
          syncSpacingCtl();
        } })),
        "-",
        { label: "Outil main (Espace ou H)", icon: "hand-stop", checked: () => handTool, run: () => {
          handTool = !handTool;
          syncHand();
        } },
        { label: "Aper\xE7u 3D", icon: "3d-cube-sphere", run: () => open3d() }
      ] }
    ],
    center: centerEl,
    settings: [{ title: "Langue", node: langSel }]
  };
  window.addEventListener("keydown", (e) => {
    if (!(e.metaKey || e.ctrlKey) || e.altKey) return;
    const tg = e.target, tag = tg.tagName || "";
    if (/INPUT|TEXTAREA|SELECT/.test(tag) || tg.isContentEditable || document.querySelector("dialog[open], .ve, .v3d")) return;
    const k = e.key.toLowerCase();
    if (k === "z") {
      e.preventDefault();
      e.shiftKey ? redo() : undo();
    } else if (k === "y") {
      e.preventDefault();
      redo();
    }
  });
  var viewerLoad = null;
  var loadBundle = async (file2) => {
    let v = Date.now();
    try {
      v = (await (await fetch("../version.json", { cache: "no-store" })).json()).version || v;
    } catch (e) {
    }
    return new Promise((res, rej) => document.head.append(h("script", { src: `${file2}?v=${v}`, onload: res, onerror: () => rej(new Error(file2)) })));
  };
  var loadViewer = () => window.FS3D ? Promise.resolve(window.FS3D) : viewerLoad = viewerLoad || loadBundle("viewer3d.js").then(() => window.FS3D, (e) => {
    viewerLoad = null;
    throw e;
  });
  async function open3d() {
    hover.hide();
    let viewer;
    try {
      viewer = await loadViewer();
    } catch (e) {
      alert(t("Impossible de g\xE9n\xE9rer l\u2019aper\xE7u 3D dans ce navigateur."));
      return;
    }
    viewer.open({
      labels: {
        title: t("Aper\xE7u 3D du document"),
        loading: t("Pr\xE9paration de l\u2019aper\xE7u\u2026"),
        flip: t("Retourner"),
        spread: t("Deux pages"),
        single: t("Une feuille"),
        reset: t("Recentrer"),
        close: t("Fermer"),
        copy: t("Copier l\u2019erreur"),
        hint: t("Glisser : tourner la feuille \xB7 clic droit ou Maj : la d\xE9placer \xB7 molette : zoomer"),
        error: t("Impossible de g\xE9n\xE9rer l\u2019aper\xE7u 3D dans ce navigateur."),
        noWebgl: t("WebGL indisponible."),
        png: t("Exporter en PNG"),
        pngT: t("PNG transparent"),
        filename: doc.name || "factsheet"
      },
      load: () => rasterizeDocument(doc, 2)
    });
  }
  new ResizeObserver(schedule).observe(stage);
  drawTree();
  drawProps();
  schedule();
  loadFonts().then(schedule);
  var dlg = document.getElementById("exportDlg");
  var exportMode = "net";
  function openExport() {
    const box = document.getElementById("exportOpts");
    box.innerHTML = "";
    for (const [k, o] of Object.entries(EXPORT_MODES)) {
      const r = h("input", { type: "radio", name: "xmode", value: k, checked: k === exportMode, onchange: () => {
        exportMode = k;
      } });
      box.append(h("label", { class: "opt" }, r, " " + o.label, h("small", { textContent: o.note })));
    }
    dlg.showModal();
  }
  document.getElementById("exportCancel").addEventListener("click", () => dlg.close());
  document.getElementById("exportCmyk").addEventListener("click", async (e) => {
    const btn = e.currentTarget, label = btn.textContent;
    btn.disabled = true;
    btn.textContent = t("G\xE9n\xE9ration du PDF\u2026");
    try {
      if (!window.FSPDF) await loadBundle("pdfexport.js");
      const bytes = await window.FSPDF.build(doc, exportMode);
      const name = (doc.name || "factsheet") + (exportMode === "net" ? "" : "-" + exportMode) + "-cmjn.pdf";
      const a2 = h("a", { href: URL.createObjectURL(new Blob([bytes], { type: "application/pdf" })), download: name });
      document.body.append(a2);
      a2.click();
      a2.remove();
      setTimeout(() => URL.revokeObjectURL(a2.href), 4e3);
      dlg.close();
    } catch (err) {
      console.error(err);
      alert(t("Impossible de g\xE9n\xE9rer le PDF CMJN.") + " " + (err && err.message || ""));
    } finally {
      btn.disabled = false;
      btn.textContent = label;
    }
  });
  document.getElementById("exportGo").addEventListener("click", async () => {
    dlg.close();
    const prev = document.title;
    document.title = (doc.name || "factsheet") + (exportMode === "net" ? "" : "-" + exportMode);
    await preparePrint(doc, exportMode);
    const done = () => {
      cleanupPrint();
      document.title = prev;
      window.removeEventListener("afterprint", done);
    };
    window.addEventListener("afterprint", done);
    window.print();
  });
  syncSpacingCtl();
  record(false);
  syncCenter();
})();
