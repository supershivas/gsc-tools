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
    headerToBody: SPACE[8],
    // 24 — bas du header → 1re section (recto)
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
      "1-2": { label: "2 colonnes (1/3 + 2/3)", cols: 3, spans: [1, 2] }
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
    subtitle: { family: "sans", size: 22, weight: 600, lh: u(12) },
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
        blue: "#0434F8",
        // texte, traits, séries principales
        deep: "#041CEC",
        // fond de header
        sky: "#A4CCFC",
        // séries claires
        lavender: "#BCCCFC",
        yellow: "#FCDC0C",
        slate: "#5E6566",
        steel: "#8FA3AD",
        white: "#FFFFFF",
        /* teintes claires — fonds de section */
        tintSky: "#ECF4FF",
        tintLav: "#E6EAFB",
        tintYellow: "#FFF7C4",
        tintGrey: "#EEF0F1"
      },
      text: "blue"
      // couleur des textes et traits par défaut
    }
  };
  var DEFAULT_THEME = "eu";
  var SECTION_BGS = ["tintSky", "tintLav", "tintYellow", "tintGrey"];
  function cssVars(themeKey, colors) {
    const th = THEMES[themeKey] || THEMES[DEFAULT_THEME];
    const pal = Object.assign({}, th.colors, colors || {});
    const v = {};
    for (const [k, n] of Object.entries(SPACE)) v[`--s${k}`] = n + "px";
    for (const [k, val] of Object.entries(GAP)) v[`--gap-${k}`] = val + "px";
    for (const [k, t2] of Object.entries(TYPE)) {
      v[`--t-${k}-size`] = t2.size + "pt";
      v[`--t-${k}-lh`] = t2.lh + "px";
      v[`--t-${k}-weight`] = t2.weight;
      v[`--t-${k}-family`] = FONT[t2.family];
    }
    for (const [k, c] of Object.entries(pal)) v[`--c-${k}`] = c;
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
    for (const c of kids.flat()) if (c != null && c !== false) e.append(typeof c === "string" ? document.createTextNode(c) : c);
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
    for (const c of kids.flat()) if (c != null && c !== false) e.append(c);
    return e;
  }
  var pxOf = (pt) => pt * 96 / 72;
  var SW = STROKE.px;
  var colorRef = (c) => /^(#|rgb|var\()/.test(c || "") ? c : `var(--c-${c || "blue"})`;
  var round3 = (n) => Math.round(n / 3) * 3;
  var mctx = document.createElement("canvas").getContext("2d");
  function mw(text, weight, family, sizePx) {
    mctx.font = `${weight} ${sizePx * 100}px ${family}`;
    return mctx.measureText(text).width / 100;
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
  var runsW = (runs, size) => runs.reduce((a, r) => a + mw(r.t, r.b ? 700 : 400, SANS, size), 0);
  function splitWord(runs, size, maxW) {
    const out = [];
    let cur = [], cw = 0;
    for (const r of runs) for (const ch of r.t) {
      const c = mw(ch, r.b ? 700 : 400, SANS, size);
      if (cur.length && cw + c > maxW) {
        out.push(cur);
        cur = [];
        cw = 0;
      }
      const l = cur[cur.length - 1];
      if (l && l.b === r.b && l.i === r.i && l.u === r.u) l.t += ch;
      else cur.push({ ...r, t: ch });
      cw += c;
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
    if (title && title.trim()) add("**" + title.replace(/\*\*|__|~~/g, "") + "**", true);
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
    const need = (size) => names.reduce((a, t2) => a + fixed + mw(t2, TYPE.caption.weight, SANS, size), 0) + gap * Math.max(0, names.length - 1);
    let capPx = base;
    if (need(base) > W) capPx = Math.max(base * 0.7, base * (W - names.length * fixed - gap * (names.length - 1)) / (need(base) - names.length * fixed - gap * (names.length - 1)));
    const room = names.length ? Math.max(20, (W - gap * (names.length - 1)) / names.length - fixed) : 0;
    let x = 0;
    series.forEach((sr, i) => {
      svg.append(s("rect", { x: x + SW / 2, y: y + (VIZ.legendH - VIZ.legendSwatch) / 2 + SW / 2, width: VIZ.legendSwatch - SW, height: VIZ.legendSwatch - SW, rx: VIZ.barRadius, fill: colorRef(sr.color), stroke: "currentColor", "stroke-width": SW }));
      const lx = x + fixed, t2 = need(base) > W ? ellipsize(names[i], TYPE.caption.weight, SANS, capPx, room) : names[i];
      svg.append(s("text", { x: lx, y: y + VIZ.legendH / 2 + 0.33 * capPx, "font-size": capPx, "font-weight": TYPE.caption.weight }, t2));
      x = lx + mw(t2, TYPE.caption.weight, SANS, capPx) + gap;
    });
  }
  var numVal = (r, j) => Math.max(0, +(r.v || [])[j] || 0);

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
    "D\xE9faut": "Default",
    "Mono": "Mono",
    "Blanc (white)": "White",
    "N\xE9gatif": "Negative",
    "import\xE9": "uploaded",
    "vide": "empty",
    "Images du header": "Header images",
    "Image affich\xE9e (96 \xD7 132 px) \u2014 choisissez dans la biblioth\xE8que :": "Image shown (96 \xD7 132 px) \u2014 pick one from the library:",
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
    "Clic gauche : tourner \xB7 clic droit : d\xE9placer \xB7 molette : zoomer": "Left click: orbit \xB7 right click: pan \xB7 wheel: zoom",
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
      const m = core.match(re);
      if (m) {
        out = fn(...m);
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
    for (const a of ATTRS) {
      if (!el2.hasAttribute(a)) continue;
      const src = fixValue(recs[a], el2.getAttribute(a)), out = lang === "fr" ? src : tr(src);
      recs[a] = { src, out };
      if (out !== el2.getAttribute(a)) el2.setAttribute(a, out);
    }
  }
  function walk(root) {
    if (root.nodeType === 3) return fixText(root);
    if (root.nodeType !== 1 || root.closest && root.closest(".page, [contenteditable]") && !root.matches(".page")) return;
    if (root.matches && root.matches(".page, [contenteditable], script, style")) return;
    fixAttrs(root);
    for (const c of root.childNodes) walk(c);
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
      for (const m of list) {
        if (m.type === "childList") m.addedNodes.forEach((n) => pending.add(n));
        else pending.add(m.type === "attributes" ? m.target : m.target);
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

  // src/viz/donut.js
  var BODY = pxOf(TYPE.body.size);
  var LH = TYPE.body.lh;
  var rad = (d) => d * Math.PI / 180;
  function resolveColumn(items, topLim, gap) {
    items.sort((a, b) => a.want - b.want);
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
  var norm = (a) => (a % 360 + 360) % 360;
  var ORANGE = "#F28C28";
  var donut_default = {
    label: "Anneau / camembert",
    defaults: () => ({
      style: "donut",
      totalTpl: "\u20AC{total} billion",
      decimals: 1,
      layout: "auto",
      orient: "largest",
      largestAngle: 210,
      startAngle: 0,
      segments: [
        { color: "lavender", value: 114.4, title: "\u20AC114.4 billion", text: "provided from or guaranteed by the EU budget (including **\u20AC43.9 billion** within Ukraine Facility and **\u20AC16.9 billion** from Ukraine Support Loan)" },
        { color: "blue", value: 77.9, title: "\u20AC77.9 billion", text: "in military support from Member States" },
        { color: "slate", value: 17, title: "\u20AC17 billion", text: "in support for Ukrainian refugees in the EU" },
        { color: "yellow", value: 15.5, title: "\u20AC15.5 billion", text: "of grants, loans and guarantees provided by EU Member States for non-military support" },
        { color: "steel", value: 3.8, title: "\u20AC3.8 billion", text: "in proceeds from immobilised Russian assets" }
      ]
    }),
    fields: [
      { k: "style", t: "select", label: "Forme", options: { donut: "Anneau (total au centre)", pie: "Camembert" } },
      { k: "totalTpl", t: "text", label: "Texte du centre ({total} = somme des valeurs)" },
      { k: "decimals", t: "number", label: "D\xE9cimales du total", min: 0, max: 4 },
      { k: "layout", t: "select", label: "Libell\xE9s", options: { auto: "Auto (selon la largeur)", around: "Autour de l\u2019anneau", legend: "L\xE9gende sous l\u2019anneau" } },
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
          { k: "side", t: "select", label: "C\xF4t\xE9 du libell\xE9", options: { auto: "Auto", left: "Gauche", right: "Droite" } }
        ]
      }
    ],
    actions: [
      { label: "\u21BA Positions auto", title: "Efface les positions manuelles des libell\xE9s, points d\u2019ancrage et c\xF4t\xE9s", run(o) {
        clearManual(o);
      } },
      { label: "Plus grand en premier", title: "Fait tourner la liste pour que le plus grand segment soit le 1er", run(o) {
        const a = o.segments || [];
        let mi = 0;
        a.forEach((g, i) => {
          if (+g.value > +a[mi].value) mi = i;
        });
        o.segments = a.slice(mi).concat(a.slice(0, mi));
        clearManual(o);
      } }
    ],
    /* Interactions de l'éditeur : retourne un gestionnaire de glissement { move(pt), end() } (pt en px du SVG) */
    edit: {
      start(hit, o, meta, api, pt0) {
        const seg = (o.segments || [])[hit.i];
        if (!seg) return null;
        api.select(hit.i);
        const { cx, cy } = meta, ang = (pt) => norm(Math.atan2(pt.x - cx, -(pt.y - cy)) * 180 / Math.PI);
        const dist = (pt) => Math.hypot(pt.x - pt0.x, pt.y - pt0.y);
        let moved = false;
        if (hit.kind === "ring") {
          const a0 = ang(pt0);
          return { move(pt) {
            if (!moved && dist(pt) < 3) return;
            if (!moved) {
              moved = true;
              clearManual(o);
            }
            o.orient = "manual";
            o.startAngle = Math.round(norm(meta.start + ang(pt) - a0) * 10) / 10;
            api.redraw();
          } };
        }
        if (hit.kind === "label") {
          const it = meta.items.find((x) => x.i === hit.i);
          if (!it) return null;
          const grab = pt0.y - it.top;
          return {
            move(pt) {
              if (!moved && dist(pt) < 3) return;
              if (!moved) {
                moved = true;
                api.ui.drag = "label";
              }
              seg.pin = Math.round(pt.y - grab - cy);
              const want = pt.x < cx ? "left" : "right", auto = it.autoSide < 0 ? "left" : "right";
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
          const arc = meta.arcs.find((x) => x.i === hit.i), sw = arc.a1 - arc.a0;
          return { move(pt) {
            if (!moved && dist(pt) < 2) return;
            moved = true;
            const rel = norm(ang(pt) - arc.a0);
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
      const segs = (o.segments || []).filter((g) => +g.value > 0);
      const total = segs.reduce((a2, g) => a2 + +g.value, 0);
      const around = o.layout === "around" || o.layout !== "legend" && W >= VIZ.aroundMinW;
      if (!segs.length) return { node: s("svg", { width: W, height: 60 }) };
      const sweeps = segs.map((g) => g.value / total * 360);
      let mi = 0;
      sweeps.forEach((w, i) => {
        if (w > sweeps[mi] + 1e-9) mi = i;
      });
      let before = 0;
      for (let i = 0; i < mi; i++) before += sweeps[i];
      let a = o.orient === "manual" ? o.startAngle ?? 0 : o.orient === "first" ? 0 : (o.largestAngle ?? 210) - (before + sweeps[mi] / 2);
      const start = a, ui = env.ui, sel = ui ? ui.sel : -1, idxOf = (g) => (o.segments || []).indexOf(g);
      const arcs = segs.map((g, i) => {
        const r = { g, a0: a, a1: a + sweeps[i] };
        a += sweeps[i];
        return r;
      });
      const D = around ? Math.max(VIZ.ringMin, Math.min(VIZ.ringMax, round3(W * 0.3))) : Math.min(VIZ.ringLegend, round3(W - 6));
      const pie = o.style === "pie";
      const Ro = D / 2 - SW, Ri = pie ? 0 : Ro * (1 - VIZ.ringPct);
      const sector = (cx2, cy2, p) => {
        const pt = (r, ang) => [cx2 + r * Math.sin(rad(ang)), cy2 - r * Math.cos(rad(ang))];
        if (p.a1 - p.a0 >= 359.99) return pie ? `M${cx2 + Ro},${cy2}A${Ro},${Ro} 0 1 1 ${cx2 - Ro},${cy2}A${Ro},${Ro} 0 1 1 ${cx2 + Ro},${cy2}Z` : `M${cx2 + Ro},${cy2}A${Ro},${Ro} 0 1 1 ${cx2 - Ro},${cy2}A${Ro},${Ro} 0 1 1 ${cx2 + Ro},${cy2}ZM${cx2 + Ri},${cy2}A${Ri},${Ri} 0 1 0 ${cx2 - Ri},${cy2}A${Ri},${Ri} 0 1 0 ${cx2 + Ri},${cy2}Z`;
        const [x0, y0] = pt(Ro, p.a0), [x1, y1] = pt(Ro, p.a1), [x2, y2] = pt(Ri, p.a1), [x3, y3] = pt(Ri, p.a0);
        const big = p.a1 - p.a0 > 180 ? 1 : 0;
        if (pie) return `M${cx2},${cy2}L${x0},${y0}A${Ro},${Ro} 0 ${big} 1 ${x1},${y1}Z`;
        return `M${x0},${y0}A${Ro},${Ro} 0 ${big} 1 ${x1},${y1}L${x2},${y2}A${Ri},${Ri} 0 ${big} 0 ${x3},${y3}Z`;
      };
      const centerNode = (cx2, cy2) => {
        if (pie) return s("g");
        const tpl = (o.totalTpl || "").replace(/\n/g, " "), n = fmt(total, env.locale, o.decimals);
        const txt = tpl.includes("{total}") ? tpl.replace(/\{total\}/g, n) : tpl;
        const maxC = 2 * Ri * 0.86;
        let size = pxOf(TYPE.figure.size), lines = [];
        const wrapC = (z) => {
          const out = [];
          let cur = "";
          for (const w of txt.split(/ +/)) {
            const t2 = cur ? cur + " " + w : w;
            if (!cur || mw(t2, 700, SERIF, z) <= maxC) cur = t2;
            else {
              out.push(cur);
              cur = w;
            }
          }
          out.push(cur);
          return out;
        };
        const chord = (y) => 2 * Math.sqrt(Math.max(0, (Ri * 0.94) ** 2 - y * y));
        const fits = (ls, z) => {
          const tot2 = ls.length * z;
          return ls.every((l, i) => {
            const t2 = -tot2 / 2 + i * z, y = Math.max(Math.abs(t2), Math.abs(t2 + z));
            return mw(l, 700, SERIF, z) <= chord(y);
          });
        };
        for (let i = 0; i < 60; i++) {
          lines = wrapC(size);
          if (fits(lines, size) || size < 6) break;
          size *= 0.95;
        }
        const g = s("g", { "font-size": size, "font-weight": 700, "text-anchor": "middle", style: { fontFamily: "var(--t-figure-family)" } });
        const tot = lines.length * size;
        lines.forEach((l, i) => g.append(s("text", { x: cx2, y: cy2 - tot / 2 + i * size + size / 2 + 0.33 * size }, l)));
        return g;
      };
      const ringNodes = (cx2, cy2) => {
        const out = arcs.map((p) => s("path", { d: sector(cx2, cy2, p), fill: colorRef(p.g.color), stroke: "currentColor", "stroke-width": SW, "stroke-linejoin": "round", "data-hit": ui ? `ring:${idxOf(p.g)}` : null, style: ui ? { cursor: "grab" } : null }));
        if (ui) arcs.forEach((p) => {
          if (idxOf(p.g) === sel) out.push(s("path", { d: sector(cx2, cy2, p), fill: "none", stroke: ORANGE, "stroke-width": 2, "stroke-linejoin": "round", "pointer-events": "none" }));
        });
        return out;
      };
      const metaBase = { start, arcs: arcs.map((p) => ({ i: idxOf(p.g), a0: p.a0, a1: p.a1 })), Ro, Ri, W };
      if (!around) {
        const cx2 = W / 2, cy2 = Ro + SW, svg2 = s("svg", { width: W, height: 10, style: { display: "block", overflow: "visible" } });
        svg2.append(...ringNodes(cx2, cy2), centerNode(cx2, cy2));
        let y = cy2 + Ro + GAP.subsectionTitle * 2;
        const sw = VIZ.legendSwatch, tx = sw + VIZ.iconGap;
        for (const p of arcs) {
          const lines = textLines(p.g.title, p.g.text, BODY, W - tx);
          svg2.append(s("rect", { x: SW / 2, y: y + (LH - sw) / 2 + SW / 2, width: sw - SW, height: sw - SW, rx: VIZ.barRadius, fill: colorRef(p.g.color), stroke: "currentColor", "stroke-width": SW }));
          svg2.append(drawLines(lines, tx, y, LH, BODY));
          y += lines.length * LH + VIZ.blockGap;
        }
        const H2 = Math.ceil(y - VIZ.blockGap);
        svg2.setAttribute("height", H2);
        svg2.setAttribute("viewBox", `0 0 ${W} ${H2}`);
        return { node: svg2, meta: { ...metaBase, cx: cx2, cy: cy2, H: H2, around: false, items: [] } };
      }
      const room = (W - D) / 2, labelW = Math.max(60, Math.min(room - VIZ.leaderRoom, 264));
      const cx = W / 2;
      const items = arcs.map((p) => {
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
      const place = (cy2) => {
        for (const it of items) {
          const th = it.th, P = { x: cx + Ro * Math.sin(rad(th)), y: cy2 - Ro * Math.cos(rad(th)) };
          it.P = P;
          it.want = it.p.g.pin != null ? cy2 + it.p.g.pin : P.y - LH / 2;
        }
        for (const side of [1, -1]) resolveColumn(items.filter((i) => i.side === side), 0, VIZ.blockGap);
        return Math.max(2 * Ro + 2 * SW, ...items.map((i) => i.top + i.h));
      };
      let cy = Ro + SW;
      let H = place(cy);
      H = Math.ceil(Math.max(H, cy + Ro + SW));
      const svg = s("svg", { width: W, height: H, viewBox: `0 0 ${W} ${H}`, style: { display: "block", overflow: "visible" } });
      if (ui && ui.drag === "label") for (const sd of [-1, 1]) svg.append(s("rect", { x: sd > 0 ? W - labelW : 0, y: 0, width: labelW, height: H, fill: ORANGE, "fill-opacity": 0.08, stroke: ORANGE, "stroke-dasharray": "4 3", "stroke-width": 1, "pointer-events": "none" }));
      svg.append(...ringNodes(cx, cy), centerNode(cx, cy));
      for (const it of items) {
        const right = it.side > 0, x = right ? W - labelW : 0, ly = it.top + LH / 2;
        const E = { x: right ? x - VIZ.leaderGap : x + it.first + VIZ.leaderGap, y: ly };
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

  // src/viz/bars.js
  var barPath = (x, y, w, h2, r) => {
    r = Math.max(0, Math.min(r, w / 2, h2));
    return `M${x},${y + h2}L${x},${y + r}A${r},${r} 0 0 1 ${x + r},${y}L${x + w - r},${y}A${r},${r} 0 0 1 ${x + w},${y + r}L${x + w},${y + h2}Z`;
  };
  var bars_default = {
    label: "Barres (jumel\xE9es, group\xE9es, empil\xE9es)",
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
    fields: [
      { k: "style", t: "select", label: "Plusieurs s\xE9ries", options: { overlap: "Jumel\xE9es (2 s\xE9ries qui se chevauchent)", grouped: "C\xF4te \xE0 c\xF4te", stacked: "Empil\xE9es" } },
      { k: "ratio", t: "select", label: "Format du graphique", options: { "2:1": "2:1 (large)", "16:9": "16:9", "3:2": "3:2", "1:1": "1:1 (carr\xE9)" } },
      { k: "legend", t: "bool", label: "Afficher la l\xE9gende" },
      { k: "showValues", t: "bool", label: "Afficher les valeurs (empil\xE9es : total)" },
      { k: "decimals", t: "number", label: "D\xE9cimales des valeurs", min: 0, max: 4 },
      { k: "suffix", t: "text", label: "Unit\xE9 apr\xE8s la valeur (%, M\u20AC\u2026)" },
      { k: "callout.on", t: "bool", label: "Afficher l\u2019accolade \xAB \xE9volution \xBB" },
      { k: "callout.value", t: "text", label: "Valeur de l\u2019accolade (ex. +64 %)" },
      { k: "callout.text", t: "text", label: "Texte de l\u2019accolade" },
      { t: "table", k: "rows", series: "series", maxSeries: 4, label: "Donn\xE9es" }
    ],
    render(o, W, env) {
      const series = o.series || [], rows = o.rows || [], k = Math.max(1, series.length), n = Math.max(1, rows.length);
      const stacked = o.style === "stacked", overlap = o.style === "overlap" && k === 2;
      const H = Math.max(round3(W * (VIZ.ratios[o.ratio] || 0.5625)), 120);
      const co = o.callout && o.callout.on && rows.length > 1 ? o.callout : null;
      const x1 = W - (co ? VIZ.calloutW : 0);
      const baseY = H - (o.legend ? VIZ.legendGap + VIZ.legendH : 0) - VIZ.catH, plotTop = VIZ.plotTop, plotH = baseY - plotTop;
      const total = (r) => series.reduce((a, _, j) => a + numVal(r, j), 0);
      const metric = (r) => stacked ? total(r) : numVal(r, 0);
      let max = 0;
      rows.forEach((r) => {
        if (stacked) max = Math.max(max, total(r));
        else series.forEach((_, j) => {
          max = Math.max(max, numVal(r, j));
        });
      });
      if (!max) max = 1;
      const slot = x1 / n;
      const bw = stacked ? Math.min(slot * 0.5, VIZ.barMaxW) : overlap ? Math.min(slot * 0.44, VIZ.barMaxW) : Math.min((slot * 0.72 - (k - 1) * VIZ.barGap) / k, VIZ.barMaxW);
      const capPx = pxOf(TYPE.caption.size), numPx = pxOf(TYPE.captionNum.size);
      const yOf = (v) => baseY - v / max * plotH;
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
          const tw = k * bw + (k - 1) * VIZ.barGap, gx = cx - tw / 2;
          series.forEach((_2, j) => {
            xs[j] = gx + j * (bw + VIZ.barGap);
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
      const vMax = slot / (stacked ? 1 : k) - 2;
      const valText = (x, y, v) => {
        const f = fitText(fmt(v, env.locale, o.decimals) + suffix, 700, SERIF, numPx, vMax, 0.5);
        svg.append(s("text", { x, y, "text-anchor": "middle", "font-size": f.size, "font-weight": 700, style: { fontFamily: "var(--t-captionNum-family)" } }, f.text));
      };
      if (o.showValues) rows.forEach((r, i) => {
        if (stacked) valText(barX[i][0] + bw / 2, yOf(total(r)) - 3, total(r));
        else series.forEach((_, j) => valText(barX[i][j] + bw / 2, yOf(numVal(r, j)) - 3, numVal(r, j)));
      });
      rows.forEach((r, i) => {
        const f = fitText(r.label || "", TYPE.caption.weight, SANS, capPx, slot - 3, 0.6);
        svg.append(s("text", { x: slot * (i + 0.5), y: baseY + VIZ.catH / 2 + 0.33 * f.size + 1, "text-anchor": "middle", "font-size": f.size, "font-weight": TYPE.caption.weight }, f.text));
      });
      if (o.legend) drawLegend(svg, series, H - VIZ.legendH, W);
      return { node: svg };
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
    pencil: { label: "R\xE9daction", d: "M4 20l1-4L16 5l3 3L8 19z M14 7l3 3" }
  };
  var ICON_OPTIONS = Object.fromEntries(Object.entries(ICONS).map(([k, v]) => [k, v.label]));

  // src/viz/iconlist.js
  var iconlist_default = {
    label: "Liste \xE0 ic\xF4nes",
    defaults: () => ({ items: [
      { icon: "sliders", text: t("Premier \xE9l\xE9ment de liste") },
      { icon: "send", text: t("Deuxi\xE8me \xE9l\xE9ment de liste") },
      { icon: "pencil", text: t("Troisi\xE8me \xE9l\xE9ment de liste") }
    ] }),
    fields: [
      {
        k: "items",
        t: "list",
        label: "\xC9l\xE9ments",
        min: 1,
        max: 8,
        item: () => ({ icon: "check", text: t("Nouvel \xE9l\xE9ment") }),
        fields: [{ k: "icon", t: "select", label: "Ic\xF4ne", options: ICON_OPTIONS }, { k: "text", t: "text", label: "Texte" }]
      }
    ],
    render(o) {
      const C = VIZ.iconCircle, G = VIZ.iconGlyph;
      const list = el("div", { class: "viz-icons" });
      for (const it of o.items || []) {
        const ic = ICONS[it.icon] || ICONS.check;
        const k = G / 24;
        const svg = s(
          "svg",
          { width: C, height: C, viewBox: `0 0 ${C} ${C}`, class: "vi-ic" },
          s("circle", { cx: C / 2, cy: C / 2, r: C / 2 - SW / 2, fill: "none", stroke: "currentColor", "stroke-width": SW }),
          s("path", {
            d: ic.d,
            fill: "none",
            stroke: "currentColor",
            "stroke-width": SW / k,
            "stroke-linecap": "round",
            "stroke-linejoin": "round",
            transform: `translate(${(C - G) / 2} ${(C - G) / 2}) scale(${k})`
          })
        );
        list.append(el("div", { class: "vi-row" }, svg, el("div", { class: "vi-text", innerHTML: String(it.text || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\*\*(.+?)\*\*/g, "<b>$1</b>") })));
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
    defaults: () => ({
      style: "grouped",
      legend: false,
      showValues: true,
      decimals: 0,
      suffix: "%",
      series: [{ name: t("Valeur"), color: "blue" }],
      rows: [{ label: t("Premier crit\xE8re"), v: [72] }, { label: t("Deuxi\xE8me crit\xE8re"), v: [58] }, { label: t("Troisi\xE8me crit\xE8re"), v: [41] }, { label: t("Quatri\xE8me crit\xE8re"), v: [23] }]
    }),
    fields: [
      { k: "style", t: "select", label: "Plusieurs s\xE9ries", options: { grouped: "C\xF4te \xE0 c\xF4te", stacked: "Empil\xE9es" } },
      { k: "legend", t: "bool", label: "Afficher la l\xE9gende" },
      { k: "showValues", t: "bool", label: "Afficher les valeurs" },
      { k: "decimals", t: "number", label: "D\xE9cimales des valeurs", min: 0, max: 4 },
      { k: "suffix", t: "text", label: "Unit\xE9 apr\xE8s la valeur (%, M\u20AC\u2026)" },
      { t: "table", k: "rows", series: "series", maxSeries: 4, label: "Donn\xE9es" }
    ],
    render(o, W, env) {
      const series = o.series || [], rows = o.rows || [], k = Math.max(1, series.length);
      const stacked = o.style === "stacked";
      const capPx = pxOf(TYPE.caption.size), numPx = pxOf(TYPE.captionNum.size), suffix = o.suffix || "";
      const labW = Math.min(W * 0.4, Math.max(0, ...rows.map((r) => mw(r.label || "", TYPE.caption.weight, SANS, capPx))) + VIZ.iconGap);
      const total = (r) => series.reduce((a, _, j) => a + numVal(r, j), 0);
      const valW = o.showValues ? mw(fmt(1e3, env.locale, o.decimals) + suffix, 700, '"Source Serif 4", serif', numPx) + VIZ.barGap * 2 : 0;
      const x0 = labW, span = Math.max(30, W - labW - valW);
      let max = 0;
      rows.forEach((r) => {
        max = Math.max(max, stacked ? total(r) : Math.max(0, ...series.map((_, j) => numVal(r, j))));
      });
      if (!max) max = 1;
      const bh = VIZ.hBar, rh = stacked ? bh : k * bh + (k - 1) * VIZ.barGap;
      const bodyH = rows.length * rh + Math.max(0, rows.length - 1) * VIZ.hRowGap;
      const H = bodyH + (o.legend ? VIZ.legendGap + VIZ.legendH : 0);
      const svg = s("svg", { width: W, height: H, viewBox: `0 0 ${W} ${H}`, style: { display: "block", overflow: "visible" } });
      svg.append(s("line", { x1: x0, y1: 0, x2: x0, y2: bodyH, stroke: "currentColor", "stroke-width": SW }));
      rows.forEach((r, i) => {
        const y = i * (rh + VIZ.hRowGap);
        {
          const f = fitText(r.label || "", TYPE.caption.weight, SANS, capPx, labW - VIZ.iconGap, 0.7);
          svg.append(s("text", { x: 0, y: y + rh / 2 + 0.33 * f.size, "font-size": f.size, "font-weight": TYPE.caption.weight }, f.text));
        }
        let end = x0;
        if (stacked) {
          let acc = 0;
          series.forEach((sr, j) => {
            const v = numVal(r, j);
            if (!v) return;
            const xa = x0 + acc / max * span, w = v / max * span;
            acc += v;
            end = xa + w;
            svg.append(s("path", { d: acc >= total(r) ? hPath(xa, y, w, bh, VIZ.barRadius) : `M${xa},${y}h${w}v${bh}h${-w}Z`, fill: colorRef(sr.color), stroke: "currentColor", "stroke-width": SW, "stroke-linejoin": "round" }));
          });
        } else series.forEach((sr, j) => {
          const w = numVal(r, j) / max * span, yy = y + j * (bh + VIZ.barGap);
          end = Math.max(end, x0 + w);
          svg.append(s("path", { d: hPath(x0, yy, Math.max(w, 1e-4), bh, VIZ.barRadius), fill: colorRef(sr.color), stroke: "currentColor", "stroke-width": SW, "stroke-linejoin": "round" }));
          if (o.showValues) svg.append(s("text", { x: x0 + w + VIZ.barGap * 1.5, y: yy + bh / 2 + 0.33 * numPx, "font-size": numPx, "font-weight": 700, style: { fontFamily: "var(--t-captionNum-family)" } }, fmt(numVal(r, j), env.locale, o.decimals) + suffix));
        });
        if (stacked && o.showValues) svg.append(s("text", { x: end + VIZ.barGap * 1.5, y: y + bh / 2 + 0.33 * numPx, "font-size": numPx, "font-weight": 700, style: { fontFamily: "var(--t-captionNum-family)" } }, fmt(total(r), env.locale, o.decimals) + suffix));
      });
      if (o.legend) drawLegend(svg, series, H - VIZ.legendH, W);
      return { node: svg };
    }
  };

  // src/viz/line.js
  var line_default = {
    label: "Courbes",
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
    fields: [
      { k: "ratio", t: "select", label: "Format du graphique", options: { "2:1": "2:1 (large)", "16:9": "16:9", "3:2": "3:2", "1:1": "1:1 (carr\xE9)" } },
      { k: "zero", t: "bool", label: "Axe vertical d\xE9marrant \xE0 z\xE9ro" },
      { k: "legend", t: "bool", label: "Afficher la l\xE9gende" },
      { k: "showValues", t: "bool", label: "Afficher les valeurs" },
      { k: "decimals", t: "number", label: "D\xE9cimales des valeurs", min: 0, max: 4 },
      { k: "suffix", t: "text", label: "Unit\xE9 apr\xE8s la valeur (%, M\u20AC\u2026)" },
      { t: "table", k: "rows", series: "series", maxSeries: 4, label: "Donn\xE9es" }
    ],
    render(o, W, env) {
      const series = o.series || [], rows = o.rows || [], n = Math.max(1, rows.length);
      const H = Math.max(round3(W * (VIZ.ratios[o.ratio] || 0.5625)), 120);
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
      return { node: svg };
    }
  };

  // src/viz/index.js
  var VIZ_TYPES = { donut: donut_default, bars: bars_default, hbars: hbars_default, line: line_default, icons: iconlist_default };
  var VIZ_OPTIONS = Object.fromEntries(Object.entries(VIZ_TYPES).map(([k, v]) => [k, v.label]));
  var newViz = (kind = "bars") => ({ kind, opts: VIZ_TYPES[kind].defaults() });
  function renderViz(viz, width, env) {
    const t2 = viz && VIZ_TYPES[viz.kind];
    if (!t2) return null;
    try {
      return t2.render(viz.opts || t2.defaults(), width, env || {}).node;
    } catch (e) {
      console.error("dataviz", viz.kind, e);
      return null;
    }
  }
  function renderVizFull(viz, width, env) {
    const t2 = viz && VIZ_TYPES[viz.kind];
    if (!t2) return null;
    try {
      return t2.render(viz.opts || t2.defaults(), width, env || {});
    } catch (e) {
      console.error("dataviz", viz.kind, e);
      return null;
    }
  }

  // src/figure.js
  var FIGURE_DEFAULTS = () => ({
    value: "5 000",
    icon: "none",
    iconStyle: "plain",
    text: "Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim"
  });
  var FIGURE_FIELDS = [
    { k: "value", t: "text", label: "Chiffre (texte libre : \xAB 5 000 \xBB, \xAB 64 % \xBB\u2026)" },
    { k: "icon", t: "select", label: "Ic\xF4ne devant le chiffre", options: { none: "Aucune", ...ICON_OPTIONS } },
    { k: "iconStyle", t: "select", label: "Style de l\u2019ic\xF4ne", options: { plain: "Pictogramme seul", circle: "Dans une pastille" } },
    { k: "text", t: "area", label: "Texte" }
  ];
  var esc = (t2) => String(t2 || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
  function figureIcon(key, size, circle) {
    const ic = ICONS[key];
    if (!ic) return null;
    const G = circle ? size * 0.58 : size * 0.82, k = G / 24, o = (size - G) / 2;
    return s(
      "svg",
      { width: size, height: size, viewBox: `0 0 ${size} ${size}`, class: "vi-ic fg-ic" },
      circle ? s("circle", { cx: size / 2, cy: size / 2, r: size / 2 - SW / 2, fill: "none", stroke: "currentColor", "stroke-width": SW }) : null,
      s("path", { d: ic.d, fill: "none", stroke: "currentColor", "stroke-width": SW / k, "stroke-linecap": "round", "stroke-linejoin": "round", transform: `translate(${o} ${o}) scale(${k})` })
    );
  }
  function renderFigure(o, W, align) {
    const base = pxOf(TYPE.figure.size), lh = TYPE.figure.lh, icon = o.icon && o.icon !== "none" ? figureIcon(o.icon, lh, o.iconStyle === "circle") : null;
    const avail = (W || 9999) - (icon ? lh + VIZ.iconGap : 0) - 1;
    const fs = fitSize(o.value || "", TYPE.figure.weight, SERIF, base, avail, 0.4);
    const jc = { center: "center", right: "flex-end" }[align] || "flex-start";
    const head = el(
      "div",
      { class: "fg-head", style: { justifyContent: jc } },
      icon,
      el("div", { class: "vf-value", textContent: o.value || "", style: fs < base ? { fontSize: fs + "px", whiteSpace: "nowrap" } : {} })
    );
    return el(
      "div",
      { class: "fg", style: align && align !== "left" ? { textAlign: align } : {} },
      head,
      o.text && o.text.trim() ? el("div", { class: "vf-text", innerHTML: esc(o.text) }) : null
    );
  }

  // src/state.js
  var SCHEMA = 1;
  var _id = 0;
  var uid = (p) => `${p}${Date.now().toString(36)}${(_id++).toString(36)}`;
  var IMAGE_RATIOS = { "16:9": 16 / 9, "4:3": 4 / 3, "1:1": 1, "3:4": 3 / 4 };
  var COL_TYPES = { text: "Texte", image: "Image", figure: "Chiffre cl\xE9", viz: "Dataviz" };
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
    // chiffre clé : { value, icon, iconStyle, text }
    imgMode: "ratio",
    imgW: 100,
    imgH: 150,
    imgFit: "cover",
    natural: null,
    // image : ratio | fit (proportions de l'image) | custom (largeur en %, hauteur en px)
    stroke: false,
    strokeColor: "text",
    fill: false
    // contour (également sur les sections et sous-sections)
  });
  var newSub = (layout = "1") => ({
    id: uid("sub"),
    title: t("Sous-section"),
    layout,
    cols: Array.from({ length: GRID.layouts[layout].spans.length }, () => newCol("text"))
  });
  var newSection = (page = "recto") => ({
    id: uid("sec"),
    title: t("Titre de section"),
    page,
    bg: "none",
    subs: [newSub("1")]
  });
  function defaultDoc() {
    const lorem = "Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim.";
    const viz = (kind, extra) => ({ ...newCol("viz"), viz: { ...newViz(kind), ...extra || {} } });
    const fig = () => ({ ...newCol("figure"), stroke: true, fill: true });
    const s1 = newSection("recto");
    s1.title = "Section title";
    s1.subs = [
      { id: uid("sub"), title: "Subsection title", layout: "1-1", cols: [viz("icons"), fig()] },
      { id: uid("sub"), title: "Subsection title", layout: "1-1", cols: [
        { ...newCol("text"), text: Array.from({ length: 5 }, () => "Source regular 3 12pt.").join("\n") + "\n" + lorem },
        viz("bars")
      ] }
    ];
    const s2 = newSection("verso");
    s2.title = "Second section";
    s2.bg = "tintSky";
    s2.subs = [{ id: uid("sub"), title: "EU support", layout: "1", cols: [viz("donut")] }];
    const s3 = newSection("verso");
    s3.title = "Back-page section";
    s3.bg = "tintYellow";
    s3.subs = [
      { id: uid("sub"), title: "Text and image", layout: "2-1", cols: [
        { ...newCol("text"), text: `**First point.** ${lorem}
- First list item
- Second list item
${lorem}` },
        { ...newCol("image"), ratio: "4:3", caption: "Image caption" }
      ] },
      { id: uid("sub"), title: "Three columns", layout: "1-1-1", cols: [fig(), viz("icons"), viz("bars", { opts: { ...newViz("bars").opts, callout: { on: false, value: "", text: "" }, style: "grouped" } })] }
    ];
    return {
      schema: SCHEMA,
      name: "factsheet",
      locale: "en-GB",
      theme: DEFAULT_THEME,
      colors: {},
      header: {
        bg: "deep",
        fg: "white",
        overline: "FACTSHEET - MONTH 20YY",
        title: "MAIN TITLE",
        subtitle: "Subtitle",
        images: [newHeaderImage(1), newHeaderImage(2)],
        imageId: null,
        // bibliothèque d'images du header (autant que l'on veut)
        logos: { default: null, mono: null, white: null, negative: null },
        logoVariant: "default",
        showImage: true,
        showLogo: true
      },
      sections: [s1, s2, s3]
    };
  }
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
        sub.cols = sub.cols.map((c) => {
          c = oldFigure(c);
          const k = Object.assign(newCol(c.type || "text"), c);
          if (k.type === "figure" && !k.figure) k.figure = FIGURE_DEFAULTS();
          if (k.type === "viz") {
            if (!k.viz) k.viz = newViz("bars");
            else if (!k.viz.opts) k.viz = newViz(k.viz.kind);
          }
          return k;
        });
      });
    });
    return d;
  }
  function oldFigure(c) {
    if (c.type !== "viz" || !c.viz || c.viz.kind !== "figure") return c;
    const o = c.viz.opts || {};
    return { ...c, type: "figure", viz: null, figure: { ...FIGURE_DEFAULTS(), value: o.value ?? "", text: o.text ?? "" }, stroke: true, fill: true };
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
      H.images[0].src = src.image;
      H.imageId = H.images[0].id;
    }
    delete H.image;
    if (src.logo && !src.logos) H.logos.default = src.logo;
    delete H.logo;
    H.logos = Object.assign({ default: null, mono: null, white: null, negative: null }, H.logos);
    if (!LOGO_VARIANTS[H.logoVariant]) H.logoVariant = "default";
    H.images = (H.images || []).filter((i) => i && typeof i === "object").map((i, k) => ({ id: i.id || uid("img"), name: i.name || `${t("Image")} ${k + 1}`, src: i.src || null }));
    if (!H.images.length) H.images = [newHeaderImage(1), newHeaderImage(2)];
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
    (doc2.sections || []).forEach((sec) => (sec.subs || []).forEach((sub) => (sub.cols || []).forEach((c, ci) => {
      if (c.type === "image") out.push({ label: `${sec.title || "Section"} \u203A ${sub.title || "Subsection"} \u203A ${ci + 1}`, get: () => c.src, set: (v) => {
        c.src = v;
      } });
    })));
    return out.filter((x) => x.get());
  }
  var localImageCount = (doc2) => docImages(doc2).filter((x) => /^data:/.test(x.get())).length;
  function swapCols(doc2, a, b) {
    const ca = doc2.sections[a.si].subs[a.bi].cols, cb = doc2.sections[b.si].subs[b.bi].cols;
    [ca[a.ci], cb[b.ci]] = [cb[b.ci], ca[a.ci]];
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
  var esc2 = (t2) => t2.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  var inline = (t2) => esc2(t2).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/__(.+?)__/g, "<u>$1</u>").replace(/~~(.+?)~~/g, "<i>$1</i>");
  function richText(text, align) {
    const root = h("div", { class: "rich", style: align && align !== "left" ? { textAlign: align } : {} });
    let ul = null;
    for (const raw of String(text || "").replace(/\r\n?/g, "\n").split("\n")) {
      const line = raw.trim();
      if (!line) {
        ul = null;
        continue;
      }
      const m = line.match(/^[-•]\s+(.*)$/);
      if (m) {
        if (!ul) {
          ul = h("ul");
          root.append(ul);
        }
        ul.append(h("li", { innerHTML: inline(m[1]) }));
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
      h("div", { class: "hd-over", textContent: H.overline }),
      h("div", { class: "hd-rule" })
    );
    const bottom = h(
      "div",
      { class: "hd-bottom" },
      h("div", { class: "hd-title", textContent: H.title }),
      H.subtitle && H.subtitle.trim() ? h("div", { class: "hd-sub", textContent: H.subtitle }) : null
    );
    inner.append(h("div", { class: "hd-text" }, top, bottom));
    if (H.showLogo) inner.append(logo ? h("img", { class: "hd-logo", src: logo, alt: "" }) : h("div", { class: "hd-logo ph", textContent: "logo" }));
    el2.append(inner);
    return el2;
  }
  var strokeStyle = (node, o, th) => {
    if (!o.stroke) return;
    node.classList.add("stroked");
    if (o.fill) node.classList.add("filled");
    if (o.strokeColor && o.strokeColor !== "text") node.style.setProperty("--stroke-color", `var(--c-${o.strokeColor})`);
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
    if (col.stroke) {
      strokeStyle(wrap, col);
      wrap.style.justifyContent = { start: "flex-start", center: "center", end: "flex-end" }[al];
      w = insetW(w);
    } else wrap.style.alignSelf = al;
    if (col.type === "text") wrap.append(richText(col.text, col.align));
    else if (col.type === "image") {
      wrap.append(renderImage(col, w));
      if (col.caption && col.caption.trim()) wrap.append(h("div", { class: "cap", textContent: col.caption }));
    } else if (col.type === "figure") {
      wrap.append(renderFigure(col.figure || {}, w, col.align));
    } else {
      const node = renderViz(col.viz, w, env);
      wrap.append(node || h("div", { class: "viz-ph" }, h("span", { textContent: "dataviz" })));
    }
    return wrap;
  }
  function renderSub(sub, si, bi, env, W) {
    const L = GRID.layouts[sub.layout];
    const el2 = h("div", { class: "sub", dataset: { sel: `sub:${si}:${bi}` } });
    strokeStyle(el2, sub);
    if (sub.stroke) W = insetW(W);
    if (sub.title && sub.title.trim()) el2.append(h("h3", { class: "sub-title", textContent: sub.title }));
    const cols = h("div", { class: "cols", style: { gridTemplateColumns: `repeat(${L.cols}, minmax(0, 1fr))` } });
    sub.cols.forEach((c, i) => {
      const node = renderCol(c, colWidth(sub.layout, i, W), `col:${si}:${bi}:${i}`, env);
      node.style.gridColumn = `span ${L.spans[i]}`;
      cols.append(node);
    });
    el2.append(cols);
    return el2;
  }
  function columnWidth(doc2, si, bi, ci) {
    const sec = doc2.sections[si], sub = sec && sec.subs[bi], col = sub && sub.cols[ci];
    if (!col) return GRID.contentW;
    let W = GRID.contentW;
    if (sec.stroke) W = insetW(W);
    if (sub.stroke) W = insetW(W);
    const w = colWidth(sub.layout, ci, W);
    return col.stroke ? insetW(w) : w;
  }
  var isBand = (s2) => !!(s2.bg && s2.bg !== "none");
  function renderSection(sec, si, env, pos) {
    const band = isBand(sec), style = {};
    const firstGap = pos.key === "recto" ? GAP.headerToBody : PAGE.marginTop;
    style.marginTop = (pos.first ? band ? 0 : firstGap : band && pos.prevBand ? 0 : GAP.sectionBefore) + "px";
    if (band) {
      style.background = `var(--c-${sec.bg})`;
      style.paddingTop = (pos.first ? firstGap : GAP.bandPad) + "px";
      style.paddingBottom = (pos.last ? PAGE.marginBottom : GAP.bandPad) + "px";
    }
    const cls = ["sec", band && "sec-band", pos.first && "sec-first", pos.last && "sec-last"].filter(Boolean).join(" ");
    const el2 = h("section", { class: cls, style, dataset: { sel: `sec:${si}` } });
    let host = el2, W = GRID.contentW;
    if (sec.stroke) {
      host = h("div", { class: "sec-box" });
      strokeStyle(host, sec);
      el2.append(host);
      W = insetW(W);
    }
    if (sec.title && sec.title.trim()) host.append(h("h2", { class: "sec-title", textContent: sec.title }));
    sec.subs.forEach((sub, bi) => host.append(renderSub(sub, si, bi, env, W)));
    return el2;
  }
  function renderDocument(doc2) {
    const vars = cssVars(doc2.theme, doc2.colors);
    const env = { locale: doc2.locale || "en-GB" };
    const pages = [];
    for (const key of ["recto", "verso"]) {
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
    return { pages, warnings: [] };
  }
  function measure(result) {
    const warnings = [];
    for (const p of result.pages) {
      p.used = p.content.offsetHeight;
      p.overflow = p.used > p.max + 0.5;
      if (p.overflow) warnings.push(`${p.key === "recto" ? "Recto" : "Verso"} : le contenu d\xE9passe de ${Math.ceil(p.used - p.max)} px \u2014 d\xE9placez une section vers l\u2019autre page ou raccourcissez-la.`);
      const last = p.content.querySelector(".sec-last.sec-band");
      if (last) last.style.minHeight = Math.max(0, PAGE.h - p.top - last.offsetTop) + "px";
      if (p.key === "recto") {
        const top = p.el.querySelector(".hd-top"), bot = p.el.querySelector(".hd-bottom"), inner = p.el.querySelector(".hd-inner");
        if (top && bot && inner && top.offsetHeight + bot.offsetHeight > inner.clientHeight + 0.5) warnings.push("Header : titre trop long, il ne tient pas dans la hauteur du header.");
      }
    }
    result.warnings = warnings;
    return result;
  }

  // src/tree.js
  var strip = (t2) => String(t2 || "").replace(/\*\*|__|~~/g, "").replace(/^[-•]\s+/gm, "").replace(/\s+/g, " ").trim();
  var GLYPH = { text: "\xB6", image: "\u25A8", figure: "\u2116", viz: "\u25A6" };
  function colLabel(col) {
    if (col.type === "text") return strip(col.text).slice(0, 34) || "Texte vide";
    if (col.type === "image") return col.caption ? "Image \xB7 " + col.caption : "Image";
    if (col.type === "figure") return "Chiffre cl\xE9 \xB7 " + (col.figure && col.figure.value || "\u2014");
    const t2 = col.viz && VIZ_TYPES[col.viz.kind];
    return "Dataviz \xB7 " + (t2 ? t2.label : "\u2014");
  }
  function buildTree(root, ctx2) {
    const doc2 = ctx2.getDoc(), sel = ctx2.getSel(), collapsed2 = ctx2.collapsed;
    root.innerHTML = "";
    applyVars(root, cssVars(doc2.theme, doc2.colors));
    const row = (path, depth, kids, extra = "") => h("div", {
      class: "tn" + (sel === path ? " sel" : "") + extra,
      dataset: { path: path || "" },
      style: { paddingLeft: 8 + depth * 14 + "px" },
      onclick: (e) => {
        if (e.target.closest(".grip,.tn-tog,.tn-add")) return;
        ctx2.select(path);
      }
    }, ...kids);
    const tog = (key) => h("span", { class: "tn-tog", onclick: () => {
      collapsed2.has(key) ? collapsed2.delete(key) : collapsed2.add(key);
      ctx2.refreshTree();
    } }, ico(collapsed2.has(key) ? "chevron-right" : "chevron-down"));
    const add = (label, fn, depth) => h("button", { type: "button", class: "tn-add", textContent: label, style: { marginLeft: 8 + depth * 14 + "px" }, onclick: () => {
      fn();
      ctx2.restructure();
    } });
    root.append(row(null, 0, [h("span", { class: "tn-ico", textContent: "\u25A4" }), h("strong", { textContent: doc2.name || "Document" }), h("span", { class: "tn-sub", textContent: "document" })]));
    let dragFrom = null, drag = null;
    const clearDrop = () => root.querySelectorAll(".drop-before,.drop-after,.drop-zone,.drop-swap").forEach((n) => n.classList.remove("drop-before", "drop-after", "drop-zone", "drop-swap"));
    const gripFor = (d) => h("span", {
      class: "grip",
      draggable: true,
      title: d.kind === "sub" ? "Glisser la sous-section (autre section possible)" : "Glisser le contenu sur une autre colonne pour l\u2019\xE9changer",
      ondragstart: (e) => {
        e.stopPropagation();
        drag = d;
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", d.kind);
      },
      ondragend: () => {
        drag = null;
        clearDrop();
      }
    }, ico("grip-vertical"));
    const dropOn = (rowEl, target) => {
      rowEl.addEventListener("dragover", (ev) => {
        if (!drag) return;
        if (target.kind === "col" && drag.kind === "col") {
          ev.preventDefault();
          ev.stopPropagation();
          clearDrop();
          rowEl.classList.add("drop-swap");
        } else if (target.kind === "sub" && drag.kind === "sub") {
          ev.preventDefault();
          ev.stopPropagation();
          const r = rowEl.getBoundingClientRect(), after = ev.clientY > r.top + r.height / 2;
          clearDrop();
          rowEl.classList.add(after ? "drop-after" : "drop-before");
          rowEl.dataset.after = after ? "1" : "";
        } else if (target.kind === "sec" && drag.kind === "sub") {
          ev.preventDefault();
          ev.stopPropagation();
          clearDrop();
          rowEl.classList.add("drop-zone");
        }
      });
      rowEl.addEventListener("drop", (ev) => {
        if (!drag) return;
        const d = drag;
        drag = null;
        clearDrop();
        if (target.kind === "col" && d.kind === "col") {
          ev.preventDefault();
          ev.stopPropagation();
          ctx2.moved(() => {
            swapCols(doc2, d, target);
            return `col:${target.si}:${target.bi}:${target.ci}`;
          });
        } else if (target.kind === "sub" && d.kind === "sub") {
          ev.preventDefault();
          ev.stopPropagation();
          const after = !!rowEl.dataset.after;
          ctx2.moved(() => {
            const n = moveSub(doc2, d, target, after);
            return `sub:${n.si}:${n.bi}`;
          });
        } else if (target.kind === "sec" && d.kind === "sub") {
          ev.preventDefault();
          ev.stopPropagation();
          ctx2.moved(() => {
            const n = moveSub(doc2, d, { si: target.si, bi: null });
            return `sub:${n.si}:${n.bi}`;
          });
        }
      });
      return rowEl;
    };
    const secNode = (sec, si) => {
      const key = sec.id || "sec" + si, closed = collapsed2.has(key);
      const grip = h("span", {
        class: "grip",
        draggable: true,
        title: "Glisser pour r\xE9ordonner ou changer de page",
        ondragstart: (e) => {
          dragFrom = si;
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", String(si));
        },
        ondragend: () => {
          dragFrom = null;
          clearDrop();
        }
      }, ico("grip-vertical"));
      const node = h("div", { class: "tn-sec" }, dropOn(row(`sec:${si}`, 0, [grip, tog(key), h("span", { class: "tn-ico", textContent: sec.bg && sec.bg !== "none" ? "\u25FC" : "\u25FB", style: sec.bg && sec.bg !== "none" ? { color: `var(--c-${sec.bg})`, textShadow: "0 0 0 #0005", WebkitTextStroke: "1px #0004" } : {} }), h("strong", { textContent: sec.title || "Section sans titre" })]), { kind: "sec", si }));
      if (!closed) {
        sec.subs.forEach((sub, bi) => {
          const sk = sub.id || `sub${si}${bi}`, sClosed = collapsed2.has(sk);
          node.append(dropOn(row(`sub:${si}:${bi}`, 1, [gripFor({ kind: "sub", si, bi }), tog(sk), h("span", { textContent: sub.title || "Sous-section" }), h("span", { class: "tn-sub", textContent: sub.layout })]), { kind: "sub", si, bi }));
          if (!sClosed) sub.cols.forEach((col, ci) => node.append(dropOn(row(`col:${si}:${bi}:${ci}`, 2, [gripFor({ kind: "col", si, bi, ci }), h("span", { class: "tn-ico", textContent: GLYPH[col.type] || "\xB7" }), h("span", { class: "tn-lab", textContent: colLabel(col) })]), { kind: "col", si, bi, ci })));
        });
        node.append(add("+ sous-section", () => {
          sec.subs.push(newSub("1"));
        }, 1));
      }
      node.addEventListener("dragover", (ev) => {
        if (dragFrom == null) return;
        ev.preventDefault();
        ev.stopPropagation();
        const r = node.getBoundingClientRect(), after = ev.clientY > r.top + Math.min(r.height / 2, 24);
        clearDrop();
        node.classList.add(after ? "drop-after" : "drop-before");
        node.dataset.after = after ? "1" : "";
      });
      node.addEventListener("drop", (ev) => {
        if (dragFrom == null) return;
        ev.preventDefault();
        ev.stopPropagation();
        const from = dragFrom, after = !!node.dataset.after;
        dragFrom = null;
        clearDrop();
        const ni = moveSection(doc2, from, si, after);
        ctx2.restructure();
        ctx2.select(`sec:${ni}`);
      });
      return node;
    };
    for (const pg of ["recto", "verso"]) {
      const zone = h("div", { class: "pg-zone" }, h("div", { class: "pg-head", textContent: pg === "recto" ? "Recto" : "Verso" }));
      if (pg === "recto") zone.append(row("header", 0, [h("span", { class: "tn-ico", textContent: "\u25AC" }), h("strong", { textContent: "Header" }), h("span", { class: "tn-sub", textContent: strip(doc2.header.title).slice(0, 18) })]));
      let n = 0;
      doc2.sections.forEach((sec, si) => {
        if (sec.page === pg) {
          zone.append(secNode(sec, si));
          n++;
        }
      });
      if (!n) zone.append(h("div", { class: "hint", textContent: "Aucune section \u2014 glissez-en une ici." }));
      zone.append(add("+ section", () => {
        doc2.sections.push(newSection(pg));
      }, 0));
      zone.addEventListener("dragover", (ev) => {
        if (dragFrom == null) return;
        ev.preventDefault();
        clearDrop();
        zone.classList.add("drop-zone");
      });
      zone.addEventListener("drop", (ev) => {
        if (dragFrom == null) return;
        ev.preventDefault();
        const from = dragFrom;
        dragFrom = null;
        clearDrop();
        const ni = moveSection(doc2, from, null, false, pg);
        ctx2.restructure();
        ctx2.select(`sec:${ni}`);
      });
      root.append(zone);
    }
  }

  // src/editor.js
  var PAL_LABELS = { blue: "Bleu", deep: "Bleu profond", sky: "Bleu ciel", lavender: "Lavande", yellow: "Jaune", slate: "Ardoise", steel: "Acier", white: "Blanc", tintSky: "Teinte ciel", tintLav: "Teinte lavande", tintYellow: "Teinte jaune", tintGrey: "Teinte grise" };
  function readImage(file2, max = 1600) {
    return new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onerror = rej;
      fr.onload = () => {
        if (/svg/.test(file2.type)) return res(fr.result);
        const im = new Image();
        im.onerror = rej;
        im.onload = () => {
          const k = Math.min(1, max / Math.max(im.width, im.height));
          const c = document.createElement("canvas");
          c.width = Math.round(im.width * k);
          c.height = Math.round(im.height * k);
          c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
          res(/png|gif|webp/.test(file2.type) ? c.toDataURL("image/png") : c.toDataURL("image/jpeg", 0.9));
        };
        im.src = fr.result;
      };
      fr.readAsDataURL(file2);
    });
  }
  var getP = (o, p) => p.split(".").reduce((a, k) => a == null ? a : a[k], o);
  var setP = (o, p, v) => {
    const ks = p.split("."), last = ks.pop();
    const t2 = ks.reduce((a, k) => a[k] == null ? a[k] = {} : a[k], o);
    t2[last] = v;
  };
  var SERIES_COLORS = ["sky", "yellow", "blue", "slate", "steel", "lavender"];
  function parseTable(text) {
    const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.trim());
    if (!lines.length) return null;
    const sep = lines[0].includes("	") ? "	" : lines[0].includes(";") ? ";" : ",";
    const cells = lines.map((l) => l.split(sep).map((c) => c.trim()));
    const num = (c) => {
      const n = parseFloat(String(c).replace(/\s/g, "").replace(",", "."));
      return isNaN(n) ? null : n;
    };
    let header = null;
    if (cells[0].slice(1).some((c) => c !== "" && num(c) === null)) header = cells.shift();
    const nser = Math.max(1, ...cells.map((c) => c.length - 1));
    return { header, nser, rows: cells.map((c) => ({ label: c[0] || "", v: Array.from({ length: nser }, (_, j) => num(c[j + 1]) ?? 0) })) };
  }
  var mkToHtml = (t2) => {
    const lines = String(t2 || "").replace(/\r\n?/g, "\n").split("\n").filter((l) => l.trim());
    let html = "", ul = false;
    for (const l of lines) {
      const m = l.trim().match(/^[-•]\s+(.*)$/);
      if (m && !ul) {
        html += "<ul>";
        ul = true;
      } else if (!m && ul) {
        html += "</ul>";
        ul = false;
      }
      html += m ? `<li>${inline(m[1])}</li>` : `<div>${inline(l.trim())}</div>`;
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
        if (l && l.b === r.b && l.i === r.i && l.u === r.u) l.t += r.t;
        else runs.push({ ...r });
      }
      return runs.filter((r) => r.t !== "").map((r) => {
        let t2 = r.t;
        if (!t2.trim()) return t2;
        if (r.i) t2 = `~~${t2}~~`;
        if (r.b) t2 = `**${t2}**`;
        if (r.u) t2 = `__${t2}__`;
        return t2;
      }).join("");
    };
    const flush2 = (bullet) => {
      const t2 = emit().trim();
      cur = [];
      if (t2) lines.push((bullet ? "- " : "") + t2);
    };
    const walk2 = (n, st, bullet) => {
      if (n.nodeType === 3) {
        cur.push({ t: n.nodeValue.replace(/[ \n]/g, " "), ...st });
        return;
      }
      if (n.nodeType !== 1) return;
      const tag = n.tagName, fw = n.style.fontWeight, s2 = { ...st };
      if (tag === "BR") {
        flush2(bullet);
        return;
      }
      if (tag === "B" || tag === "STRONG" || fw === "bold" || +fw >= 600) s2.b = true;
      if (tag === "I" || tag === "EM" || n.style.fontStyle === "italic") s2.i = true;
      if (tag === "U" || /underline/.test(n.style.textDecoration)) s2.u = true;
      if (tag === "UL" || tag === "OL") {
        for (const c of n.childNodes) walk2(c, s2, true);
        return;
      }
      const block = tag === "LI" || tag === "DIV" || tag === "P";
      if (block && cur.length) flush2(bullet);
      const b2 = bullet || tag === "LI";
      for (const c of n.childNodes) walk2(c, s2, b2);
      if (block) flush2(b2);
    };
    for (const c of root.childNodes) walk2(c, { b: false, i: false, u: false }, false);
    flush2(false);
    return lines.join("\n");
  }
  function richEditor(value, onChange) {
    const ed = h("div", { class: "re", contentEditable: "true", spellcheck: "true", innerHTML: mkToHtml(value) });
    const cmd = (c) => () => {
      ed.focus();
      document.execCommand(c);
      onChange(htmlToMk(ed));
      sync();
    };
    const mk = (label, title, c, style) => {
      const b = h("button", { type: "button", class: "mini", textContent: label, title, style, dataset: { cmd: c }, onmousedown: (e) => e.preventDefault(), onclick: cmd(c) });
      return b;
    };
    const bar = h("div", { class: "row fmt" }, mk("B", "Gras", "bold", { fontWeight: 800 }), mk("I", "Italique", "italic", { fontStyle: "italic" }), mk("U", "Soulign\xE9", "underline", { textDecoration: "underline" }), (() => {
      const b = mk("", "Liste \xE0 puces", "insertUnorderedList");
      b.append(ico("list"));
      return b;
    })());
    const sync = () => bar.querySelectorAll("[data-cmd]").forEach((b) => {
      let on = false;
      try {
        on = document.queryCommandState(b.dataset.cmd);
      } catch (e) {
      }
      b.classList.toggle("on", on);
    });
    ed.addEventListener("input", () => onChange(htmlToMk(ed)));
    ed.addEventListener("keyup", sync);
    ed.addEventListener("mouseup", sync);
    ed.addEventListener("focus", sync);
    ed.addEventListener("paste", (e) => {
      e.preventDefault();
      document.execCommand("insertText", false, (e.clipboardData || window.clipboardData).getData("text/plain"));
    });
    return h("div", { class: "re-wrap" }, bar, ed);
  }
  function buildFields(spec, obj, ctx2, palOpts, h2) {
    const out = [];
    const live = (fn) => (e) => {
      fn(e.target);
      ctx2.changed();
    };
    for (const f of spec) {
      if (f.t === "text") out.push(h2("label", { class: "f" }, f.label, h2("input", { type: "text", value: getP(obj, f.k) ?? "", oninput: live((t2) => setP(obj, f.k, t2.value)) })));
      else if (f.t === "area") out.push(h2("div", { class: "f" }, h2("div", { class: "hint", textContent: f.label }), richEditor(getP(obj, f.k) ?? "", (v) => {
        setP(obj, f.k, v);
        ctx2.changed();
      })));
      else if (f.t === "number") out.push(h2("label", { class: "f" }, f.label, h2("input", { type: "number", value: getP(obj, f.k) ?? 0, min: f.min, max: f.max, step: f.step || 1, oninput: live((t2) => {
        const v = parseFloat(t2.value);
        if (!isNaN(v)) setP(obj, f.k, v);
      }) })));
      else if (f.t === "bool") out.push(h2("label", { class: "row", style: { marginBottom: "8px" } }, h2("input", { type: "checkbox", checked: !!getP(obj, f.k), onchange: live((t2) => setP(obj, f.k, t2.checked)) }), f.label));
      else if (f.t === "select" || f.t === "color") {
        const opts = f.t === "color" ? palOpts : f.options;
        const sel = h2("select", { onchange: live((t2) => setP(obj, f.k, t2.value)) }, Object.entries(opts).map(([v, l]) => h2("option", { value: v, textContent: l })));
        sel.value = getP(obj, f.k) ?? Object.keys(opts)[0];
        out.push(h2("label", { class: "f" }, f.label, sel));
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
              arr.length > (f.min || 1) ? h2("button", { type: "button", class: "mini danger", title: "Supprimer", onclick: () => {
                arr.splice(i, 1);
                ctx2.restructure();
              } }, ico("x")) : null
            )),
            buildFields(f.fields, it, ctx2, palOpts, h2)
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
        const max = f.maxSeries || 4, n = Math.min(p.nser, max);
        const ns = Array.from({ length: n }, (_, j) => ({ name: p.header && p.header[j + 1] || series[j] && series[j].name || `${t("S\xE9rie")} ${j + 1}`, color: series[j] && series[j].color || SERIES_COLORS[j % SERIES_COLORS.length] }));
        series.splice(0, series.length, ...ns);
        rows.splice(0, rows.length, ...p.rows.map((r) => ({ label: r.label, v: r.v.slice(0, n) })));
        ctx2.restructure();
      } })
    )));
    return box;
  }
  var paletteOptions = (doc2) => {
    const th = THEMES[doc2.theme] || Object.values(THEMES)[0];
    return Object.fromEntries(Object.keys(th.colors).map((k) => [k, PAL_LABELS[k] || k]));
  };

  // src/props.js
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
    const field = (label, input) => h("label", { class: "f" }, label, input);
    const text = (obj, k, label, ph) => field(label, h("input", { type: "text", value: obj[k] || "", placeholder: ph || "", oninput: live((v) => {
      obj[k] = v;
    }) }));
    const select = (obj, k, label, opts, onSet) => {
      const s2 = h("select", { onchange: (e) => {
        obj[k] = e.target.value;
        onSet ? onSet() : ctx2.changed();
      } }, Object.entries(opts).map(([v, l]) => h("option", { value: v, textContent: l })));
      s2.value = obj[k];
      return field(label, s2);
    };
    const swatches = (label, obj, k, keys, withNone) => h(
      "div",
      { class: "f" },
      h("div", { class: "hint", textContent: label }),
      h("div", { class: "swrow" }, [
        withNone ? h("button", { type: "button", class: "hv-sw none" + (!obj[k] || obj[k] === "none" ? " on" : ""), title: "Aucun", onclick: struct(() => {
          obj[k] = "none";
        }) }) : null,
        ...keys.filter((c) => th.colors[c]).map((c) => h("button", { type: "button", class: "hv-sw" + (obj[k] === c ? " on" : ""), title: PAL_LABELS[c] || c, style: { background: `var(--c-${c})` }, onclick: struct(() => {
          obj[k] = c;
        }) }))
      ])
    );
    const imgPicker = (label, get, set, max) => {
      const inp = h("input", { type: "file", accept: "image/*", hidden: true, onchange: async () => {
        const f = inp.files[0];
        inp.value = "";
        if (!f) return;
        try {
          set(await readImage(f, max));
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
      const sel = h(
        "select",
        { onchange: (e) => {
          H.logoVariant = e.target.value;
          ctx2.restructure();
        } },
        Object.entries(LOGO_VARIANTS).map(([v, l]) => h("option", { value: v, textContent: `${t(l)} \u2014 ${t(H.logos[v] ? "import\xE9" : "vide")}`, selected: H.logoVariant === v }))
      );
      return h(
        "div",
        {},
        field("Version du logo", sel),
        imgPicker(`Logo \u2014 ${t(LOGO_VARIANTS[H.logoVariant])}`, () => H.logos[H.logoVariant], (v) => {
          H.logos[H.logoVariant] = v;
        }, 800),
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
          h("div", { class: "imgtile-name", textContent: img.name }),
          h(
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
            H.images.length > 1 ? h("button", { type: "button", class: "mini danger", title: "Supprimer", onclick: () => {
              if (!confirm(t("Supprimer cette image ?"))) return;
              H.images.splice(H.images.indexOf(img), 1);
              if (H.imageId === img.id) H.imageId = H.images[0].id;
              ctx2.restructure();
            } }, ico("x")) : null
          ),
          inp
        );
      };
      return h(
        "div",
        { class: "f" },
        h("div", { class: "hint", textContent: "Image affich\xE9e (96 \xD7 132 px) \u2014 choisissez dans la biblioth\xE8que :" }),
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
    const strokeControls = (obj) => h(
      "div",
      { class: "f outline" },
      h("label", { class: "row" }, h("input", { type: "checkbox", checked: !!obj.stroke, onchange: struct(() => {
        obj.stroke = !obj.stroke;
      }) }), "Contour"),
      obj.stroke ? h(
        "div",
        {},
        swatches("Couleur du contour", obj, "strokeColor", Object.keys(th.colors)),
        h("label", { class: "row" }, h("input", { type: "checkbox", checked: !!obj.fill, onchange: struct(() => {
          obj.fill = !obj.fill;
        }) }), "Fond blanc")
      ) : null
    );
    const title = (t2, crumbs = []) => root.append(h(
      "div",
      { class: "pr-head" },
      h("div", { class: "crumbs" }, crumbs.flatMap(([l, p]) => [h("a", { textContent: l, onclick: () => ctx2.select(p) }), " \u203A "])),
      h("h2", { textContent: t2 })
    ));
    const actions = (...b) => h("div", { class: "row pr-actions" }, ...b);
    const P = (path || "").split(":"), kind = P[0] || "doc", si = +P[1], bi = +P[2], ci = +P[3];
    const sec = doc2.sections[si], sub = sec && sec.subs[bi], col = sub && sub.cols[ci];
    if (kind === "doc") {
      title("Document");
      root.append(
        text(doc2, "name", "Nom du fichier"),
        select(doc2, "theme", "Th\xE8me", Object.fromEntries(Object.entries(THEMES).map(([k, t2]) => [k, t2.label])), () => ctx2.restructure()),
        select(doc2, "locale", "Format des nombres", LOCALES),
        h("div", { class: "hint", textContent: "Palette du th\xE8me" }),
        h("div", { class: "pal" }, Object.keys(th.colors).map((k) => h(
          "label",
          { textContent: PAL_LABELS[k] || k },
          h("input", { type: "color", value: (doc2.colors[k] || th.colors[k]).toLowerCase(), oninput: (e) => {
            doc2.colors[k] = e.target.value;
            ctx2.changed();
          } })
        ))),
        h("p", { class: "hint", textContent: "S\xE9lectionnez un \xE9l\xE9ment dans la structure (\xE0 gauche) ou sur la page pour modifier ses propri\xE9t\xE9s." })
      );
    } else if (kind === "header") {
      const H = doc2.header;
      title("Header", [["Document", null]]);
      root.append(
        text(H, "overline", "Surtitre"),
        text(H, "title", "Titre (taille fixe)"),
        text(H, "subtitle", "Sous-titre (optionnel \u2014 vide = masqu\xE9)"),
        swatches("Couleur de fond", H, "bg", Object.keys(th.colors)),
        swatches("Couleur du texte", H, "fg", Object.keys(th.colors)),
        h("label", { class: "row" }, h("input", { type: "checkbox", checked: H.showImage, onchange: struct(() => {
          H.showImage = !H.showImage;
        }) }), "Afficher l\u2019image"),
        H.showImage ? imageLibrary(H) : null,
        h("label", { class: "row" }, h("input", { type: "checkbox", checked: H.showLogo, onchange: struct(() => {
          H.showLogo = !H.showLogo;
        }) }), "Afficher le logo"),
        H.showLogo ? logoPicker(H) : null
      );
    } else if (kind === "sec" && sec) {
      title(sec.title || "Section", [["Document", null]]);
      root.append(
        text(sec, "title", "Titre de section"),
        swatches("Fond de la section", sec, "bg", SECTION_BGS, true),
        strokeControls(sec),
        select(sec, "page", "Page", { recto: "Recto", verso: "Verso" }, () => ctx2.restructure()),
        actions(
          h("button", { type: "button", textContent: "\u2191 Monter", onclick: struct(() => {
            stepSection(doc2, si, -1);
          }) }),
          h("button", { type: "button", textContent: "\u2193 Descendre", onclick: struct(() => {
            stepSection(doc2, si, 1);
          }) }),
          h("button", { type: "button", class: "danger", textContent: "Supprimer", onclick: struct(() => {
            if (confirm(t("Supprimer cette section ?"))) doc2.sections.splice(si, 1);
          }) })
        )
      );
    } else if (kind === "sub" && sub) {
      title(sub.title || "Sous-section", [["Document", null], [sec.title || "Section", `sec:${si}`]]);
      root.append(
        text(sub, "title", "Titre de sous-section (vide = masqu\xE9)"),
        strokeControls(sub),
        select(sub, "layout", "Colonnes", Object.fromEntries(Object.entries(GRID.layouts).map(([k, l]) => [k, l.label])), () => {
          const n = GRID.layouts[sub.layout].spans.length;
          sub.cols = sub.cols.slice(0, n);
          while (sub.cols.length < n) sub.cols.push(newCol("text"));
          ctx2.restructure();
        }),
        field("D\xE9placer vers la section", (() => {
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
        })()),
        actions(
          h("button", { type: "button", textContent: "\u2191 Monter", onclick: struct(() => {
            const j = bi - 1;
            if (j >= 0) [sec.subs[bi], sec.subs[j]] = [sec.subs[j], sec.subs[bi]];
          }) }),
          h("button", { type: "button", textContent: "\u2193 Descendre", onclick: struct(() => {
            const j = bi + 1;
            if (j < sec.subs.length) [sec.subs[bi], sec.subs[j]] = [sec.subs[j], sec.subs[bi]];
          }) }),
          h("button", { type: "button", textContent: "Dupliquer", onclick: struct(() => {
            const c = JSON.parse(JSON.stringify(sub));
            c.id = (sub.id || "sub") + "c" + Date.now() % 1e5;
            sec.subs.splice(bi + 1, 0, c);
          }) }),
          h("button", { type: "button", class: "danger", textContent: "Supprimer", onclick: struct(() => {
            if (confirm(t("Supprimer cette sous-section ?"))) sec.subs.splice(bi, 1);
          }) })
        )
      );
    } else if (kind === "col" && col) {
      title(`Colonne ${ci + 1}`, [["Document", null], [sec.title || "Section", `sec:${si}`], [sub.title || "Sous-section", `sub:${si}:${bi}`]]);
      root.append(
        field("Contenu", h(
          "select",
          { onchange: (e) => {
            const keep = col.text, { valign, align, stroke, strokeColor, fill } = col;
            Object.assign(col, newCol(e.target.value), { valign, align, stroke, strokeColor, fill });
            if (e.target.value === "text" && keep) col.text = keep;
            ctx2.restructure();
          } },
          Object.entries(COL_TYPES).map(([v, l]) => h("option", { value: v, textContent: l, selected: col.type === v }))
        )),
        segmented("Alignement vertical dans la colonne", col, "valign", VALIGNS, { top: t("Haut"), center: t("Centre"), bottom: t("Bas") }),
        col.type === "text" ? segmented("Alignement du texte", col, "align", ALIGNS, { left: t("Gauche"), center: t("Centr\xE9"), right: t("Droite"), justify: t("Justifi\xE9") }) : null,
        field("\xC9changer le contenu avec\u2026", (() => {
          const s2 = h(
            "select",
            { onchange: (e) => {
              if (!e.target.value) return;
              const [a, b, c] = e.target.value.split(":").map(Number);
              ctx2.moved(() => {
                swapCols(doc2, { si, bi, ci }, { si: a, bi: b, ci: c });
                return `col:${a}:${b}:${c}`;
              });
            } },
            h("option", { value: "", textContent: "\u2014" }),
            allCols(doc2).filter((c) => !(c.si === si && c.bi === bi && c.ci === ci)).map((c) => h("option", { value: `${c.si}:${c.bi}:${c.ci}`, textContent: c.label + (doc2.sections[c.si].page !== sec.page ? ` (${c.page === "recto" ? t("Recto") : t("Verso")})` : "") }))
          );
          s2.value = "";
          return s2;
        })())
      );
      if (col.type === "text") root.append(h("div", { class: "f" }, h("div", { class: "hint", textContent: "Texte" }), richEditor(col.text, (v) => {
        col.text = v;
        ctx2.changed();
      })));
      else if (col.type === "image") {
        const mode = col.imgMode || "ratio";
        root.append(
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
        );
      } else if (col.type === "figure") {
        if (!col.figure) col.figure = FIGURE_DEFAULTS();
        root.append(...buildFields(FIGURE_FIELDS, col.figure, ctx2, palOpts, h));
      } else {
        if (!col.viz) col.viz = newViz("bars");
        root.append(
          h("button", { type: "button", class: "primary", style: { width: "100%" }, onclick: () => ctx2.editViz({ col, sub, ci }) }, ico("pencil"), " Ouvrir l\u2019\xE9diteur de dataviz"),
          h("p", { class: "hint", textContent: "Tous les r\xE9glages de la dataviz (type, donn\xE9es, couleurs, options) se font dans l\u2019\xE9diteur." })
        );
      }
      root.append(strokeControls(col));
    } else {
      title("\xC9l\xE9ment introuvable");
    }
  }

  // src/vizeditor.js
  var current = null;
  function openVizEditor({ col, sub, ci, bg, width: colW, ctx: ctx2 }) {
    if (current) return;
    const doc2 = ctx2.getDoc();
    const snapshot = JSON.stringify(col.viz);
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
    function scale() {
      if (zoom !== "fit") return parseFloat(zoom);
      return Math.max(0.5, Math.min(2, (stage2.clientWidth - 80) / (width + 48)));
    }
    function draw() {
      const r = renderVizFull(col.viz, width, { locale: doc2.locale || "en-GB", ui });
      holder.innerHTML = "";
      if (r && r.node) {
        holder.append(r.node);
        meta = r.meta || null;
        svgW = width;
      }
      const t2 = VIZ_TYPES[col.viz.kind];
      hint.textContent = t2 && t2.edit ? "Cliquer un segment ou un libell\xE9 pour le s\xE9lectionner \xB7 glisser l\u2019anneau pour le tourner \xB7 glisser un libell\xE9 (verticalement, ou de l\u2019autre c\xF4t\xE9) \xB7 glisser le point blanc pour d\xE9placer l\u2019ancrage du trait" : "Les modifications du formulaire s\u2019appliquent en direct.";
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
    const changed = () => {
      draw();
      ctx2.changed();
    };
    const fctx = { changed, restructure: () => {
      buildForm();
      changed();
    } };
    function buildForm() {
      const top = form.scrollTop;
      form.innerHTML = "";
      const t2 = VIZ_TYPES[col.viz.kind];
      const kindSel = h(
        "select",
        { onchange: (e) => {
          col.viz = newViz(e.target.value);
          ui.sel = -1;
          fctx.restructure();
        } },
        Object.entries(VIZ_OPTIONS).map(([v, l]) => h("option", { value: v, textContent: l, selected: col.viz.kind === v }))
      );
      form.append(h("label", { class: "f" }, "Type de dataviz", kindSel));
      if (t2.actions) form.append(h(
        "div",
        { class: "row", style: { flexWrap: "wrap", marginBottom: "10px" } },
        t2.actions.map((a) => h("button", { type: "button", textContent: a.label, title: a.title || "", onclick: () => {
          a.run(col.viz.opts);
          ui.sel = -1;
          fctx.restructure();
        } }))
      ));
      form.append(...buildFields(t2.fields || [], col.viz.opts, fctx, paletteOptions(doc2), h));
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
    let drag = null;
    const toPt = (e) => {
      const svg = holder.querySelector("svg");
      if (!svg) return { x: 0, y: 0 };
      const r = svg.getBoundingClientRect(), k = r.width / svgW || 1;
      return { x: (e.clientX - r.left) / k, y: (e.clientY - r.top) / k };
    };
    stage2.addEventListener("pointerdown", (e) => {
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
      drag = t2.edit.start({ kind, i: +i }, col.viz.opts, meta, api, toPt(e));
      if (drag) {
        e.preventDefault();
        stage2.setPointerCapture(e.pointerId);
      }
      draw();
    });
    stage2.addEventListener("pointermove", (e) => {
      if (drag) drag.move(toPt(e));
    });
    const up = () => {
      if (!drag) return;
      const d = drag;
      drag = null;
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
    const close = (keep) => {
      if (!keep) {
        col.viz = JSON.parse(snapshot);
      }
      window.removeEventListener("keydown", onKey);
      root.remove();
      current = null;
      document.body.classList.remove("ve-open");
      ctx2.restructure();
    };
    const onKey = (e) => {
      if (e.key === "Escape") close(false);
    };
    window.addEventListener("keydown", onKey);
    root.append(
      h(
        "div",
        { class: "ve-bar" },
        h("strong", { textContent: "\xC9diteur de dataviz" }),
        h("label", { class: "zoom" }, "Aper\xE7u \xE0 la largeur ", wSel),
        h("label", { class: "zoom" }, "Zoom ", zSel),
        h("span", { style: { flex: 1 } }),
        h("button", { type: "button", textContent: "Annuler", onclick: () => close(false) }),
        h("button", { type: "button", class: "primary", textContent: "Terminer", onclick: () => close(true) })
      ),
      h("div", { class: "ve-body" }, form, h("div", { class: "ve-main" }, hint, stage2))
    );
    document.body.append(root);
    document.body.classList.add("ve-open");
    current = root;
    new ResizeObserver(() => {
      if (zoom === "fit") draw();
    }).observe(stage2);
    buildForm();
    draw();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => {
      if (current === root) draw();
    });
  }

  // src/hover.js
  function initHover({ stage: stage2, getDoc, ctx: ctx2, select, canShow }) {
    const bar = h("div", { class: "hv-bar", style: { display: "none" } });
    const out = h("div", { class: "hv-out", style: { display: "none" } });
    document.body.append(out, bar);
    let timer = 0, cur = null;
    const hide = () => {
      clearTimeout(timer);
      bar.style.display = out.style.display = "none";
      cur = null;
    };
    const later = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (!bar.contains(document.activeElement)) hide();
      }, 250);
    };
    const act = (fn) => () => {
      fn();
      hide();
      ctx2.restructure();
    };
    const sw = (key, on, title, fn) => h("button", { type: "button", class: "hv-sw" + (on ? " on" : "") + (key === "none" ? " none" : ""), title, style: key === "none" ? {} : { background: `var(--c-${key})` }, onclick: act(fn) });
    const btn = (label, title, fn, cls = "") => h("button", { type: "button", class: "mini " + cls, title, onclick: act(fn) }, ...[].concat(label).map((l) => typeof l === "string" ? l : l));
    const grp = (label, ...kids) => h("div", { class: "hv-grp" }, h("span", { class: "hv-lab", textContent: label }), ...kids.flat().filter(Boolean));
    function groups(chain, doc2) {
      const it = chain[0], g = [];
      const edit = (path) => btn([ico("pencil"), " \xC9diter"], "Afficher les propri\xE9t\xE9s", () => select(path), "primary");
      if (it.kind === "col") {
        const sub = doc2.sections[it.si].subs[it.bi], col = sub.cols[it.ci];
        const grip = h("button", { type: "button", class: "mini grip-btn", title: "Glisser le contenu sur une autre colonne pour l\u2019\xE9changer", onpointerdown: (e) => {
          e.preventDefault();
          ctx2.startColDrag(e, { si: it.si, bi: it.bi, ci: it.ci });
        } }, ico("grip-vertical"));
        g.push(grp("Colonne", grip, edit(it.path), col.type === "viz" ? btn("Dataviz\u2026", "Ouvrir l\u2019\xE9diteur de dataviz", () => ctx2.editViz({ col, sub, ci: it.ci })) : null));
      } else if (it.kind === "sub") {
        const sec = doc2.sections[it.si];
        const mv = (d) => () => {
          const j = it.bi + d;
          if (j >= 0 && j < sec.subs.length) [sec.subs[it.bi], sec.subs[j]] = [sec.subs[j], sec.subs[it.bi]];
        };
        g.push(grp("Sous-section", edit(`sub:${it.si}:${it.bi}`), btn(ico("arrow-up"), "Monter", mv(-1)), btn(ico("arrow-down"), "Descendre", mv(1))));
      } else if (it.kind === "sec") {
        const sec = doc2.sections[it.si];
        g.push(grp(
          "Section",
          edit(`sec:${it.si}`),
          sw("none", !sec.bg || sec.bg === "none", "Sans fond", () => {
            sec.bg = "none";
          }),
          SECTION_BGS.map((k) => sw(k, sec.bg === k, "Fond " + k, () => {
            sec.bg = k;
          })),
          btn(ico("arrow-up"), "Monter", () => {
            stepSection(doc2, it.si, -1);
          }),
          btn(ico("arrow-down"), "Descendre", () => {
            stepSection(doc2, it.si, 1);
          })
        ));
      } else if (it.kind === "header") {
        const H = doc2.header;
        g.push(grp("Header", edit("header"), ["blue", "deep", "yellow", "sky", "lavender", "slate"].map((k) => sw(k, H.bg === k, k, () => {
          H.bg = k;
        }))));
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
        if (e.buttons) hide();
        return;
      }
      const t2 = e.target.closest ? e.target : null;
      if (!t2) return;
      const chain = chainOf(t2);
      if (!chain.length) {
        later();
        return;
      }
      const key = chain[0].el.dataset.sel;
      clearTimeout(timer);
      if (key === cur) return;
      cur = key;
      const doc2 = getDoc();
      applyVars(bar, cssVars(doc2.theme, doc2.colors));
      bar.innerHTML = "";
      bar.append(...groups(chain, doc2));
      bar.style.display = "flex";
      const r = chain[0].el.getBoundingClientRect(), st = stage2.getBoundingClientRect(), bw = bar.offsetWidth, bh = bar.offsetHeight;
      let top = r.top - bh + 6;
      if (top < st.top - 12) top = r.top + 4;
      let left = Math.min(r.right - bw, window.innerWidth - bw - 8);
      left = Math.max(left, st.left + 4);
      Object.assign(bar.style, { left: left + "px", top: top + "px" });
      Object.assign(out.style, { display: "block", left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px" });
    });
    stage2.addEventListener("pointerleave", later);
    bar.addEventListener("pointerenter", () => clearTimeout(timer));
    bar.addEventListener("pointerleave", later);
    stage2.addEventListener("scroll", hide, true);
    return { hide };
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
    const m = EXPORT_MODES[mode];
    return { w: A4.w + 2 * m.offset, h: A4.h + 2 * m.offset };
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
    const m = EXPORT_MODES[mode] || EXPORT_MODES.net, size = sheetSize(mode);
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    cleanupPrint();
    const root = h("div", { id: "print-root", class: m.bleed ? "print-bleed" : "" });
    Object.assign(root.style, { display: "block", position: "absolute", left: "-20000px", top: "0" });
    const result = renderDocument(doc2);
    const k = A4.w * MM / PAGE.w;
    for (const p of result.pages) {
      const holder = h("div", { class: "print-page", style: { left: m.offset + "mm", top: m.offset + "mm", transform: `scale(${k})` } }, p.el);
      root.append(h("div", { class: "print-sheet", style: { width: size.w + "mm", height: size.h + "mm" } }, holder, m.marks ? cropMarks(m.offset) : null));
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
    const l = [...document.querySelectorAll("link[rel=stylesheet]")].find((x) => x.href.endsWith(name));
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
      const m = b.match(/url\(([^)]+)\)/);
      if (!m) return "";
      const url = new URL(m[1].replace(/['"]/g, ""), fontsUrl).href;
      const data = await asDataUrl(await (await fetch(url)).blob());
      return "@font-face" + b.replace(m[0], `url(${data})`);
    }));
    return cssCache = inlined.join("\n") + "\n" + doc2;
  }
  function loadImage(src) {
    return new Promise((res, rej) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = () => rej(new Error("raster"));
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
  async function rasterizeDocument(doc2, scale = 2) {
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
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
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${PAGE.w}" height="${PAGE.h}"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml" style="${vars}"><style>${css.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</style>${body}</div></foreignObject></svg>`;
        const im = await loadImage("data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg));
        const canvas = document.createElement("canvas");
        canvas.width = PAGE.w * scale;
        canvas.height = PAGE.h * scale;
        canvas.getContext("2d").drawImage(im, 0, 0, canvas.width, canvas.height);
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
  var raf = 0;
  var hover = null;
  var undoSnap = null;
  function scaleValue() {
    if (zoomMode !== "fit") return parseFloat(zoomMode);
    const avail = stage.clientWidth - 44;
    return Math.max(0.4, Math.min(1, (avail - 24) / (2 * PAGE.w)));
  }
  function drawPreview() {
    const sc = scaleValue();
    const r = renderDocument(doc);
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
    measure(r);
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
    if (undoSnap) warnEl.append(h("div", { class: "note moved" }, h("span", { textContent: undoSnap.label }), h("button", { type: "button", class: "mini", textContent: "Annuler le d\xE9placement", onclick: undo })));
    const nLocal = localImageCount(doc);
    if (nLocal) warnEl.append(h("a", { class: "note", href: "atelier.html", textContent: nLocal === 1 ? "1 image \xE0 publier \u2014 ouvrir l\u2019Atelier" : `${nLocal} images \xE0 publier \u2014 ouvrir l\u2019Atelier` }));
    if (!storage.ok) warnEl.append(h("div", { textContent: "Espace de stockage du navigateur plein : les derni\xE8res modifications ne sont pas enregistr\xE9es. Enregistrez le projet (.json) et all\xE9gez les images." }));
    if (hover) hover.hide();
    if (selected) stage.querySelectorAll(`[data-sel="${selected}"]`).forEach((n) => n.classList.add("is-sel"));
  }
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
      saveDoc(doc);
      schedule();
      drawTree();
    },
    refreshTree: drawTree,
    /* Déplacement de contenu : `fn` modifie le document et renvoie le chemin à sélectionner ensuite.
       L'état d'avant est gardé pour « Annuler le déplacement » (jusqu'à la prochaine modification). */
    moved(fn, label = "Contenu d\xE9plac\xE9. V\xE9rifiez le remplissage des pages.") {
      const snap = JSON.stringify(doc), to = fn();
      undoSnap = { snap, label };
      selected = to || null;
      ctx.restructure();
      ctx.select(selected);
    },
    restructure() {
      fixSelection();
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
  function undo() {
    if (!undoSnap) return;
    doc = migrate(JSON.parse(undoSnap.snap));
    undoSnap = null;
    selected = null;
    ctx.restructure();
  }
  hover = initHover({
    stage,
    getDoc: () => doc,
    ctx,
    canShow: () => !sdrag && !document.body.classList.contains("ve-open") && !document.body.classList.contains("dragging"),
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
  stage.addEventListener("dblclick", (e) => {
    const n = e.target.closest(".col-viz[data-sel]");
    if (!n) return;
    const [, si, bi, ci] = n.dataset.sel.split(":").map(Number);
    const sec = doc.sections[si], sub = sec && sec.subs[bi], col = sub && sub.cols[ci];
    if (col) ctx.editViz({ col, sub, ci });
  });
  var sdrag = null;
  var suppressClick = false;
  stage.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    const t2 = e.target.closest(".sec-title");
    if (!t2) return;
    const sec = t2.closest(".sec");
    sdrag = { si: +sec.dataset.sel.split(":")[1], x: e.clientX, y: e.clientY, active: false, el: sec, target: null };
  });
  function dropTarget(x, y) {
    for (const page of stage.querySelectorAll(".page")) {
      const pr = page.getBoundingClientRect();
      if (x < pr.left || x > pr.right || y < pr.top || y > pr.bottom) continue;
      const secs = [...page.querySelectorAll(".sec")].filter((s2) => s2 !== sdrag.el);
      const key = page.dataset.page;
      for (const s2 of secs) {
        const r = s2.getBoundingClientRect();
        if (y < r.top + r.height / 2) return { page: key, si: +s2.dataset.sel.split(":")[1], after: false, y: r.top - 2 };
      }
      if (secs.length) {
        const last = secs[secs.length - 1], r = last.getBoundingClientRect();
        return { page: key, si: +last.dataset.sel.split(":")[1], after: true, y: r.bottom + 2, x: r.left, w: r.width };
      }
      const c = page.querySelector(".content").getBoundingClientRect();
      return { page: key, si: null, after: false, y: c.top + 2, x: c.left, w: c.width };
    }
    return null;
  }
  window.addEventListener("pointermove", (e) => {
    if (!sdrag) return;
    if (!sdrag.active) {
      if (Math.hypot(e.clientX - sdrag.x, e.clientY - sdrag.y) < 6) return;
      sdrag.active = true;
      document.body.classList.add("dragging");
      sdrag.el.classList.add("drag-src");
      sdrag.line = h("div", { class: "drop-line" });
      sdrag.ghost = h("div", { class: "drag-ghost", textContent: doc.sections[sdrag.si].title || "Section" });
      document.body.append(sdrag.line, sdrag.ghost);
    }
    sdrag.ghost.style.left = e.clientX + 14 + "px";
    sdrag.ghost.style.top = e.clientY + 10 + "px";
    const t2 = sdrag.target = dropTarget(e.clientX, e.clientY);
    if (t2) {
      const pr = stage.querySelector(`.page[data-page="${t2.page}"]`).getBoundingClientRect();
      const sc = pr.width / PAGE.w, x = pr.left + PAGE.margin * sc, w = pr.width - 2 * PAGE.margin * sc;
      Object.assign(sdrag.line.style, { display: "block", left: x + "px", width: w + "px", top: t2.y - 1 + "px" });
    } else sdrag.line.style.display = "none";
  });
  function endSectionDrag() {
    if (!sdrag) return;
    const d = sdrag;
    sdrag = null;
    if (!d.active) return;
    document.body.classList.remove("dragging");
    d.line.remove();
    d.ghost.remove();
    suppressClick = true;
    setTimeout(() => {
      suppressClick = false;
    }, 0);
    const t2 = d.target;
    if (!t2) {
      schedule();
      return;
    }
    const ni = moveSection(doc, d.si, t2.si, t2.after, t2.page);
    ctx.restructure();
    ctx.select(`sec:${ni}`);
  }
  window.addEventListener("pointerup", endSectionDrag);
  var cdrag = null;
  var colAt = (x, y) => {
    const n = document.elementFromPoint(x, y), c = n && n.closest && n.closest('.stage .col[data-sel^="col:"]');
    return c || null;
  };
  ctx.startColDrag = (e, from) => {
    const src = stage.querySelector(`.col[data-sel="col:${from.si}:${from.bi}:${from.ci}"]`);
    cdrag = { from, src, target: null, ghost: h("div", { class: "drag-ghost", textContent: "Contenu" }) };
    hover.hide();
    document.body.classList.add("dragging");
    document.body.append(cdrag.ghost);
    if (src) src.classList.add("drag-src");
    moveColDrag(e);
  };
  function moveColDrag(e) {
    if (!cdrag) return;
    cdrag.ghost.style.left = e.clientX + 14 + "px";
    cdrag.ghost.style.top = e.clientY + 10 + "px";
    const c = colAt(e.clientX, e.clientY), ok = c && c !== cdrag.src ? c : null;
    if (ok !== cdrag.target) {
      if (cdrag.target) cdrag.target.classList.remove("drop-col");
      if (ok) ok.classList.add("drop-col");
      cdrag.target = ok;
    }
  }
  window.addEventListener("pointermove", moveColDrag);
  function endColDrag(commit) {
    if (!cdrag) return;
    const d = cdrag;
    cdrag = null;
    d.ghost.remove();
    document.body.classList.remove("dragging");
    if (d.src) d.src.classList.remove("drag-src");
    if (d.target) d.target.classList.remove("drop-col");
    if (commit && d.target) {
      const [, si, bi, ci] = d.target.dataset.sel.split(":").map(Number);
      ctx.moved(() => {
        swapCols(doc, d.from, { si, bi, ci });
        return `col:${si}:${bi}:${ci}`;
      });
    }
  }
  window.addEventListener("pointerup", () => endColDrag(true));
  window.addEventListener("pointercancel", () => endColDrag(false));
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") endColDrag(false);
  });
  window.addEventListener("pointercancel", () => {
    if (sdrag && sdrag.active) {
      sdrag.line.remove();
      sdrag.ghost.remove();
      document.body.classList.remove("dragging");
    }
    sdrag = null;
    schedule();
  });
  var file = h("input", { type: "file", accept: ".json,application/json", hidden: true });
  document.body.append(file);
  var saveProject = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(doc, null, 2)], { type: "application/json" }));
    const a = h("a", { href: url, download: (doc.name || "factsheet").replace(/[\\/:*?"<>|]+/g, "_") + ".json" });
    document.body.append(a);
    a.click();
    a.remove();
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
  window.FS_UI = {
    menus: [
      { label: "Fichier", items: [
        { label: "Enregistrer (.json)", icon: "device-floppy", run: saveProject },
        { label: "Ouvrir\u2026", icon: "folder-open", run: () => file.click() },
        { label: "Exporter PDF\u2026", icon: "file-type-pdf", run: () => openExport() },
        "-",
        { label: "Atelier", icon: "brush", href: "atelier.html" }
      ] },
      { label: "Affichage", items: [
        { heading: "Zoom" },
        zoomItem("Ajuster", "fit"),
        zoomItem("50 %", "0.5"),
        zoomItem("75 %", "0.75"),
        zoomItem("100 %", "1"),
        "-",
        { label: "Aper\xE7u 3D", icon: "3d-cube-sphere", run: () => open3d() }
      ] }
    ],
    settings: [{ title: "Langue", node: langSel }]
  };
  var viewerLoad = null;
  var loadViewer = () => window.FS3D ? Promise.resolve(window.FS3D) : viewerLoad = viewerLoad || new Promise((res, rej) => {
    const s2 = h("script", { src: "viewer3d.js", onload: () => res(window.FS3D), onerror: () => {
      viewerLoad = null;
      rej(new Error("viewer3d"));
    } });
    document.head.append(s2);
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
        hint: t("Clic gauche : tourner \xB7 clic droit : d\xE9placer \xB7 molette : zoomer"),
        error: t("Impossible de g\xE9n\xE9rer l\u2019aper\xE7u 3D dans ce navigateur."),
        noWebgl: t("WebGL indisponible.")
      },
      load: () => rasterizeDocument(doc, 2)
    });
  }
  new ResizeObserver(schedule).observe(stage);
  drawTree();
  drawProps();
  schedule();
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(schedule);
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
})();
