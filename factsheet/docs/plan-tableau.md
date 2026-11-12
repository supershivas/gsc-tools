# Plan — outil Tableau (type InDesign) du Factsheet creator

Audit du 12 novembre 2026 (v1.107.1). Objectif : un type de contenu **Tableau** avec fusion de cellules, couleurs de fond, contours par arête (épaisseur, couleur, pointillés), alignements, styles de texte, import Excel/CSV, rendu identique à l'écran, en aperçu 3D et dans le PDF CMJN.

## 1. Audit de l'existant

### Ce qui existe (et ce qu'on peut réutiliser)

| Brique | Où | Réutilisable pour le tableau |
|---|---|---|
| Types de contenu d'une colonne : `text`, `image`, `figure`, `card`, `viz` | `state.js` (`COL_TYPES`, `newCol`, `migrate`), `render.js` (`renderCol`), `props/column.js` | Oui : on ajoute `table` (même chemin que `card` ou `figure`). |
| Éditeur de grille de données | `vizdata.js` (`gridEditor`, `tableAdapter`) | **Non** : pas de fusion, pas de style, pas de cellule riche. À ne pas détourner. |
| Import / collage de tableaux | `dataparse.js` (`parseMatrix` : guillemets, retours à la ligne d'Excel, TSV/CSV ; `num`, `headerRows`) + fenêtre d'aperçu `importPreview` | Oui : collage depuis Excel, Numbers, InDesign (texte tabulé). Les fusions n'existent pas dans ces formats. |
| Texte riche en ligne | `inlineMk` (gras, italique, couleur `{c:}`, surlignage, lien, exposant…), `richEditor`, `<textarea class="ml">` + `white-space: pre-line` | Oui, sans nouvelle accolade. |
| Styles de paragraphe | `PSTYLES` / `TYPE` (`textstyles.js`) | Oui : une cellule prend un style (Texte petit, Étiquette, Texte gras…). |
| Cadres : fond, contour, côtés, pointillés, hachures | `render.js` (`strokeStyle`, `sidesOf`, `.dash` mesuré dans `measure()`) | Modèle à imiter : le pointillé est déjà un `<rect>/<line>` SVG recalé dans `measure()`. |
| Palette | `toneKeys` (couleurs, blanc, teintes `tint-*`), `colorSelect`, `swatches` | Oui : toutes les couleurs du tableau sont des **clés**, jamais des hex. |
| Poignées de redimensionnement | `editor/handles.js` (`dragSplit`), `.col-split` | Oui pour largeurs de colonnes / hauteurs de lignes du tableau. |
| Glisser-déposer | `editor/dnd.js` (règles du CLAUDE.md : élément pris, réarrangement en direct, pointillés, Échap) | Oui pour réordonner lignes/colonnes. |
| Éditeur modal à historique propre | `vizeditor.js` (modal, `role="dialog"`, `inert`, Échap en couches, Annuler = restaurer) | Modèle à suivre, mais **en plusieurs modules** (1108 lignes = trop). |
| Export PDF | `pdf/pdf.js` (`walk` lit fonds, bordures, texte mot à mot, SVG avec `stroke-dasharray`) | Oui, avec les réserves ci-dessous. |
| Aperçu 3D | `raster.js` (page → `<foreignObject>`) | Gratuit si tout le CSS est dans `doc.css`. |

### Ce qui manque ou bloque

1. **Aucun type tableau.** La heatmap est un « tableau » dessiné en SVG, pas un contenu éditable.
2. **Fusion de cellules : rien d'équivalent** dans le modèle ; il faut un modèle de grille avec invariants (voir §2).
3. **PDF : les bordures CSS sont limitées** (`pdf.js`, `walk`, autour de la ligne 1004) :
   - `border-style` autre que `none` est peint en **plein** (pas de pointillés) ;
   - une bordure ≤ 1,01 px est **ramenée à `STROKE.px`** (0,5 pt) : un filet de 0,25 pt est impossible en bordure CSS ;
   - chaque côté est un trait à bouts droits, sans jonction d'angle ; deux cellules voisines avec `border-collapse` donneraient des largeurs ambiguës.
   → Les contours du tableau ne doivent **pas** être des bordures de cellules. Le SVG, lui, passe par `svgNode` (épaisseur réelle, `stroke-dasharray`, `stroke-linecap`).
4. **Pas de pagination.** `renderDocument` ne coupe rien : un tableau est dans une colonne, le seul garde-fou est l'avertissement de dépassement. Un tableau long ne passera pas sur deux pages (hors périmètre, voir §6).
5. **`remapColors` / `colorUses` / `removeColor`** (`state.js`) ne connaissent que `fg`, `strokeColor`, `fillColor` et les clés `color` des dataviz. Un tableau avec ses couleurs de cellules **échapperait** à la suppression/remplacement d'une couleur : il faut l'étendre (piège n°1 du chantier).
6. **Fichier ouvert par une version plus ancienne** : `renderCol` envoie tout type inconnu vers la branche dataviz (`renderViz(null)`). Pas bloquant (le cache Pages est de 10 min) mais à protéger dans le même commit (branche `else` explicite).
7. **Points d'accroche à toucher pour un nouveau type** (relevés par grep) : `state.js` (`COL_TYPES`, `newCol`, `migrate`, `remapColors`), `render.js` (`renderCol`), `props/column.js` (`ICONS`, éditeur du type), `tree.js` (`ICON`, libellé), `hover.js` (libellés), `editor/handles.js` (hauteur `minH` si voulu), `i18n.js`, `pdf/pdf.js` (rien si tout est HTML/SVG réel), `tests/docs.js` (document de test), `docs/architecture.md`, `CLAUDE.md`.
8. **Tests** : 3 865 lignes de specs Playwright, captures de référence des pages. Le tableau ne doit **pas** apparaître dans `defaultDoc` (les références ne bougent pas). Il faut un document de test dédié et un test PDF.

## 2. Décisions de conception recommandées

**D1 — Type de contenu `table` (pas un type de dataviz).** Le tableau est de la mise en page éditable, pas une visualisation de données. Il vit dans `col.table`.

**D2 — Rendu : grille CSS + calque SVG des traits.**
- Cellules = `div` dans un `display: grid` (`grid-row`/`grid-column` en `span` : les fusions sont natives, la hauteur des lignes suit le contenu). Fonds et texte = éléments HTML réels (le PDF les lit déjà).
- Contours = un `<svg class="tbl-lines">` absolu, des `<line>` calés dans `measure()` sur les positions réelles des cellules (même mécanique que `.dash`). Avantages : épaisseur exacte (0,25 pt possible), pointillés, trait centré sur l'arête comme dans InDesign, une arête = un seul trait (pas de conflit de coins), fusions simples (on ne trace pas les arêtes internes d'une fusion).
- Repli si le spike (phase 0) échoue : bordures CSS « une arête = un propriétaire » (cellule du dessous / de droite), sans pointillés ni filets < 0,5 pt.
- **Phase 0 faite (2026-11-12) : GO calque SVG.** Prototype jetable (supprimé) : grille 4 × 5, fusions 2 col., 2 lignes et 2 × 2, extérieur 1 pt, intérieur 0,25 pt, ligne d'en-tête 0,5 pt en tirets 2/1,5 pt. `buildPdf` (x4, x1a, rgb) : 11 traits, épaisseurs 0,25 / 0,5 / 1 pt à 0,04 % près (facteur de format habituel), `d` [2 1,5] conservé, `K` en CMJN et `RG` en RVB, coordonnées des traits identiques à celles des fonds de cellule (aucun décalage). Aperçu 3D (`rasterizeDocument`) : identique. Pièges à traiter en phase 1 :
  - positions : `offsetLeft`/`offsetWidth` sont arrondis à l'entier, faux pour des pistes en `fr` → `getBoundingClientRect` relatif au tableau, divisé par le zoom de l'aperçu (`offsetWidth / rect.width`) ;
  - coins extérieurs : extrémités `butt` → encoche d'un demi-trait aux coins ; prolonger chaque trait de la demi-épaisseur du trait perpendiculaire le plus épais (ou `stroke-linecap: square` sur l'extérieur) ;
  - tracer une rangée d'arêtes contiguës de même style **d'un seul trait** (pointillés continus, pas de reprise de phase à chaque cellule) ; une arête n'existe que si les deux cases voisines ont des cellules différentes (fusions gratuites) ;
  - le calque se cale dans `measure()` (après la mise en page, comme `.dash`) : `buildPdf` et `rasterizeDocument` l'appellent déjà avant de lire le DOM ;
  - traits débordant de la boîte du tableau (demi-épaisseur extérieure) : `svg { overflow: visible }` suffit, mais compter cette demi-épaisseur si la colonne est rognée.
- Règles du projet respectées : éléments réels, pas de pseudo-élément/ombre/dégradé, `svg { overflow: visible }`, couleurs via `makeInk`, aucun état global (tout par `env.rc`).

**D3 — Modèle (JSON, clés stables, `schemaVersion` propre au tableau).**
```
col.table = {
  v: 1,
  cols: [{ id, w }],                 // w = poids relatif (fr) ; mode 'equal' | 'custom' | 'auto'
  rows: [{ id, h, kind }],           // h = hauteur mini en px (grille de 3 px) ou null ; kind 'head' | 'body' | 'foot'
  cells: [{ id, r, c, rs, cs,        // ancre + étendue : une cellule fusionnée = une seule entrée
            text, st, ah, av, pad, fill, fg }],
  edges: { 'h:r:c': {w,color,dash}, 'v:r:c': {...} },   // surcharges d'arêtes, creuses
  look: { stripe, headFill, footFill, rules, outer, inner, ... }, // réglages globaux
}
```
Invariants (testés en pur, hors navigateur) : chaque case `(r,c)` est couverte par **exactement une** cellule ; une fusion ne dépasse pas la grille ; insérer/supprimer une ligne ou colonne ajuste `rs`/`cs` et réindexe `r`/`c` ; scinder rend des cellules 1×1 vides ; fusionner garde le texte de l'ancre (option : concaténer). Priorité des fonds et traits, comme InDesign : **cellule > ligne/colonne > alternance > défaut du tableau**. Plafond proposé : 12 colonnes × 40 lignes.

**D4 — Édition : fenêtre « Éditeur de tableau » (modale), comme l'éditeur de dataviz.** Double-clic sur un tableau de l'aperçu ou bouton dans Propriétés. Elle montre le **vrai rendu** (même `renderTable`) agrandi, avec un calque de sélection par-dessus, une barre d'outils en haut, un panneau de 320 px à droite (cartes : Cellule, Remplissage, Contours, Texte, Tableau). L'édition directement dans la page est écartée : l'aperçu se redessine à chaque changement et saute (voir « Pièges connus »).

**D5 — Styles :** d'abord des **préréglages appliqués une fois** (Aucun, Filets horizontaux, Zébré, En-tête coloré, Grille). Les styles de tableau/cellule **liés** (modifier le style met à jour tous les tableaux, comme InDesign) viennent en phase 5, seulement si utile.

**D6 — Hors périmètre v1 :** coupure d'un tableau sur deux pages, texte pivoté, diagonales de cellule, tabulation décimale, formules. Voir §6.

## 3. Plan par phases

Chaque phase = une session, un commit propre, `cd factsheet && npm run check && npm test` avant push, les cinq bundles recommités, `CLAUDE.md` et `architecture.md` mis à jour, traductions EN dans `i18n.js`.

| Phase | Contenu | Version | Modèle conseillé |
|---|---|---|---|
| **0 — Spike** | Page jetable : grille CSS + calque SVG, fusions, filets 0,25 pt, pointillés. Export PDF et aperçu 3D vérifiés. Décide D2 (SVG ou repli bordures). Rien de livré. | inchangée | Opus |
| **1 — Modèle, rendu, PDF** | `src/table/model.js` (opérations pures + invariants), `src/table/render.js`, type `table` dans `COL_TYPES`/`newCol`/`migrate`/`renderCol`/`tree.js`, extension de `remapColors`, branche `else` explicite dans `renderCol`, CSS dans `doc.css`, document de test, `tests/table.spec.js` (opérations pures par `page.evaluate`, rendu, PDF). Propriétés minimales : nombre de lignes/colonnes, ligne d'en-tête, préréglage. | 1.109.0 | Opus |
| **2 — Éditeur** | Fenêtre modale (`src/table/editor.js`, `grid-ui.js`) : sélection (clic, glisser, Maj, en-têtes de ligne/colonne, Ctrl+A), saisie dans la cellule (Entrée, Tab, flèches, Échap), insérer/supprimer ligne/colonne, **fusionner / scinder**, poignées de largeur/hauteur (`dragSplit`), copier-coller de cellules (TSV), historique propre, Échap en couches. | 1.110.0 | Opus |
| **3 — Fonds et contours** | Fond par cellule/ligne/colonne, alternance, en-tête/pied de tableau ; carte « Contours » avec **sélecteur d'arêtes** (extérieur, intérieur, côtés individuels), épaisseur (0,25 → 3 pt), couleur, pointillés, aucun ; `colorSelect` partout ; préréglages complets. | 1.111.0 | Sonnet |
| **4 — Texte et import** | Style de paragraphe par cellule (`PSTYLES`), couleur de texte, marges intérieures, alignement H/V, colonnes numériques (chiffres tabulaires, alignées à droite), import CSV/TSV/collage Excel via `dataparse.js` + aperçu (en-têtes, séparateur décimal), export TSV/CSV. | 1.112.0 | Sonnet |
| **5 — Confort** | Réordonner lignes/colonnes (moteur `dnd.js`, règles de glisser-déposer), « répartir uniformément », ajustement au contenu, avertissements de colonne trop étroite, dupliquer ligne/colonne ; (option) styles de tableau liés dans `doc.tableStyles`. | 1.113.0 | Sonnet |
| **6 — Sur demande** | Barres de données / échelle de couleur dans les cellules, icônes et images (via `safeImgSrc`), conversion tableau ↔ dataviz, coupure sur deux pages, sujet « Tableau » dans le Labo pour comparer des habillages. | à décider | — |

Estimation : phases 0 à 2 = le cœur (≈ 3 sessions longues) ; 3 à 5 = finitions (≈ 3 sessions). Le tableau est utilisable pour de vrai dès la fin de la phase 2 (texte + fusions), joli à la fin de la phase 3.

## 4. Risques et parades

| Risque | Parade |
|---|---|
| PDF : traits SVG décalés d'un demi-pixel ou doublés | Phase 0 ; test PDF avec lecture des opérateurs ; vérifier une fois à l'œil dans Acrobat (contrôle en amont). |
| Texte de cellule coupé ou dépassant dans le PDF | `overflow: hidden` sur la cellule seulement si la hauteur est imposée ; sinon la ligne grandit. Test avec texte long. |
| Aperçu qui saute (hauteur du stage) | Aucun ajout/retrait d'élément qui change `#stage` ; l'éditeur est modal. |
| Fusion + suppression de ligne = grille incohérente | Invariants vérifiés après **chaque** opération dans les tests, et par `migrate` à l'ouverture (réparation : cellules manquantes recréées, chevauchements rognés). |
| Couleur supprimée mais encore utilisée dans un tableau | `remapColors` étendu dès la phase 1 + test `textcolor`-like. |
| Captures de référence modifiées | Le tableau n'entre pas dans `defaultDoc` ; l'éditeur est une fenêtre (aucun élargissement de panneau). |
| Fichier ouvert dans une ancienne version | Branche `else` explicite dans `renderCol` (placeholder « tableau ») livrée en phase 1. |
| `migrate` du tableau | `table.v` + migration dédiée ; ne jamais renommer une clé existante. |

## 5. Décisions prises (2026-11-12)

1. **Pointillés et filets de 0,25 pt** : oui → calque SVG des traits (validé par la phase 0, voir D2).
2. **Taille maximale** : 12 colonnes × 40 lignes.
3. **Fusion** : le texte des cellules absorbées est **mis bout à bout** dans la cellule d'ancre (rien ne se perd ; annulable).
4. **Tableau sur deux pages** : jamais en v1.
5. **Styles** : préréglages appliqués une fois ; styles liés seulement en phase 5, si utiles.

**Phase 1 faite (1.110.0** ; la 1.109.0 a été prise entre-temps par le fond perdu de l'export d'un élément**)** : modèle, rendu, PDF, propriétés minimales (voir `docs/architecture.md`, « Tableau »). Écart au plan : `HEAD_MAX` = 2 lignes d'en-tête (choix en 3 boutons). La phase 2 branche l'éditeur sur `table/model.js` sans changer le format.

**Phase 2 faite (1.111.0)** : éditeur de tableau (`table/editor.js`, `grid-ui.js`) et copier-coller (`table/paste.js` : HTML de Word / Excel / Google Sheets / pages web, repli TSV). Ajouts au plan : alignement horizontal des cellules dans l'éditeur, Cmd/Ctrl + B / I / U sur des cellules entières. Format inchangé.

Versions : `main` était déjà en 1.108.0 à la fin de la phase 0, d'où le décalage du tableau du §3 (phase 1 = 1.109.0).

## 6. Hors périmètre (à rediscuter)

Coupure de page automatique et répétition de l'en-tête, texte pivoté, diagonales, tabulation décimale, formules, tri/filtre. Aucune nouvelle dépendance n'est nécessaire.
