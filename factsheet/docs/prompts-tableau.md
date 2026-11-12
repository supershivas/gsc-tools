# Prompts — outil Tableau (une session par prompt)

Décisions : contours en calque SVG (pointillés, filets 0,25 pt) · fusion = texte des cellules absorbées perdu, avec confirmation · max 12 colonnes × 40 lignes · préréglages sans lien (pas de styles liés) · collage Word/Excel = texte + fusions + gras/italique/souligné + alignement, couleurs ignorées · Opus phases 0-2, Sonnet 3-5.

Ordre : 0 → 1 → 2 → 3 → 4 → 5. Une session neuve par phase.

## Consigne commune (déjà dans chaque prompt)

> Sois économe en tokens : lis `factsheet/docs/plan-tableau.md` et seulement les fichiers nécessaires (Grep ciblé, `Read` avec offset/limit, pas de lecture complète de `i18n.js`, `pdf.js`, `vizeditor.js`). Pas de sous-agent. Pas de récapitulatif long : une courte conclusion. Respecte `CLAUDE.md`.

---

## Phase 0 — Prototype (Opus, aucune version)

```
Lis factsheet/docs/plan-tableau.md (sections 2 et 4) puis fais la phase 0 : un prototype jetable (hors src/, ex. factsheet/tests/spike-table.html, non commité en bundle) qui valide « grille CSS + calque SVG des traits » : cellules fusionnées (grid-row/column span), filets de 0,25 pt, pointillés, traits calés par mesure comme `.dash` dans render.js. Vérifie l'export PDF (buildPdf, profils CMJN et RVB) : traits à la bonne épaisseur, pointillés conservés, pas de décalage ; et l'aperçu 3D (raster.js). Conclus en 10 lignes max : GO calque SVG, ou repli bordures CSS, avec les pièges trouvés. Supprime le prototype ou garde-le dans tests/ seulement s'il sert de test. Ne change pas la version. Commit + push sur la branche de session.
Sois économe en tokens : Grep ciblé, Read avec offset/limit, pas de sous-agent, conclusion courte.
```

## Phase 1 — Modèle, rendu, PDF (Opus, 1.108.0)

```
Phase 1 de factsheet/docs/plan-tableau.md. Décisions : calque SVG (si la phase 0 a conclu GO, sinon repli du plan), max 12×40, fusion = texte absorbé perdu.
À faire : src/table/model.js (opérations PURES : créer, insérer/supprimer ligne/colonne, fusionner, scinder, répartir ; invariant « chaque case couverte par exactement une cellule » ; fonction `repair` appelée par migrate), src/table/render.js (grille CSS + `<svg class="tbl-lines">` calé dans measure() de render.js), type `table` dans COL_TYPES / newCol / migrate / renderCol (+ branche else explicite pour type inconnu) / tree.js / ICONS de props/column.js, CSS dans doc.css, extension de remapColors/colorUses/removeColor aux fonds, contours et textes du tableau, panneau minimal (lignes, colonnes, ligne d'en-tête, préréglage), traductions i18n.js. Le tableau n'entre PAS dans defaultDoc (captures de référence intactes). Tests : tests/table.spec.js (opérations pures par page.evaluate, rendu, export PDF, suppression d'une couleur utilisée). Mets à jour CLAUDE.md et docs/architecture.md (courts). Version 1.108.0 (version.json + CHANGELOG), `cd factsheet && npx prettier --write src && npm run build && npm run check && npm test`, commit des 5 bundles, push sur la branche de session.
Sois économe en tokens : Grep ciblé, Read avec offset/limit, pas de sous-agent, conclusion courte.
```

## Phase 2 — Éditeur et collage Word/Excel (Opus, 1.109.0)

```
Phase 2 de factsheet/docs/plan-tableau.md (la phase 1 est faite). Fenêtre modale « Éditeur de tableau » sur le modèle de vizeditor.js mais en modules séparés (src/table/editor.js, grid-ui.js) : vrai rendu du tableau (renderTable) + calque de sélection ; sélection clic / glisser / Maj / en-têtes de ligne et colonne / Ctrl+A ; saisie dans la cellule (Entrée, Tab, flèches, Échap) avec texte riche inlineMk ; insérer/supprimer ligne/colonne ; fusionner (confirmation si du texte est perdu) et scinder ; poignées de largeur/hauteur via dragSplit avec retour en direct ; historique propre, Annuler restaure, Échap en couches, modal inert comme l'éditeur de dataviz. Ouverture : double-clic sur le tableau de l'aperçu + bouton dans Propriétés.
COLLAGE (priorité) : écouter `paste` dans l'éditeur ; lire `text/html` du presse-papiers (Word, Excel, Google Sheets, pages web) avec DOMParser dans src/table/paste.js (fonction pure, testable) : ne garder que table/tr/td/th, colspan/rowspan → fusions, gras/italique/souligné → `**`, `~~`, `__`, text-align → alignement ; ignorer styles, classes, couleurs, balises mso/xml, scripts, images (aucune URL distante). Repli sur `text/plain` (TSV via parseMatrix de dataparse.js). Si une cellule est sélectionnée, le collage s'y ancre et agrandit la grille dans la limite 12×40 (sinon avertissement) ; sinon il remplace après confirmation. Copier une sélection exporte aussi en text/plain (TSV) et text/html. Tests : paste.js sur des échantillons réels Word et Excel (fixtures HTML courtes), invariants de grille, ouverture/fermeture de l'éditeur. Version 1.109.0, prettier + build + check + test, 5 bundles, CLAUDE.md et architecture.md à jour, push sur la branche de session.
Sois économe en tokens : Grep ciblé, Read avec offset/limit, pas de sous-agent, conclusion courte.
```

## Phase 3 — Fonds et contours (Sonnet, 1.110.0)

```
Phase 3 de factsheet/docs/plan-tableau.md (phases 1-2 faites). Dans l'éditeur de tableau : fond par cellule / ligne / colonne, alternance de lignes, fond d'en-tête et de pied (priorité cellule > ligne/colonne > alternance > défaut) ; carte « Contours » avec sélecteur d'arêtes (extérieur, intérieur, côtés individuels de la sélection), épaisseur (0,25 / 0,5 / 1 / 1,5 / 2 / 3 pt), couleur, pointillé (longueur/écart), aucun ; couleurs uniquement par clés de palette via colorSelect/swatches ; préréglages complets (Aucun, Filets horizontaux, Zébré, En-tête coloré, Grille) appliqués une fois. Respecte « rouge = action », éléments HTML/SVG réels, makeInk. Tests : priorités, rendu des arêtes, PDF (épaisseur et pointillés), suppression d'une couleur utilisée. Version 1.110.0, prettier + build + check + test, 5 bundles, docs à jour, push sur la branche de session.
Sois économe en tokens : Grep ciblé, Read avec offset/limit, pas de sous-agent, conclusion courte.
```

## Phase 4 — Texte, colonnes numériques, import fichier (Sonnet, 1.111.0)

```
Phase 4 de factsheet/docs/plan-tableau.md. Style de paragraphe par cellule (sous-ensemble de PSTYLES), couleur de texte (fg), marges intérieures (préréglages sur la grille de 3 px), alignement H/V, colonne numérique (chiffres tabulaires, alignée à droite, format du document via decimalOf), import de fichier CSV/TSV dans l'éditeur (bouton « Importer… » avec aperçu comme importPreview : en-têtes, séparateur décimal), export TSV/CSV nommé par fileStem. Réutilise dataparse.js, n'ajoute aucune dépendance. Tests : style par cellule dans le PDF, import fr / en-GB, export. Version 1.111.0, prettier + build + check + test, 5 bundles, docs à jour, push sur la branche de session.
Sois économe en tokens : Grep ciblé, Read avec offset/limit, pas de sous-agent, conclusion courte.
```

## Phase 5 — Confort (Sonnet, 1.112.0)

```
Phase 5 de factsheet/docs/plan-tableau.md. Réordonner lignes et colonnes par glisser-déposer avec le moteur editor/dnd.js (règles du CLAUDE.md : élément pris avec ombre, réarrangement en direct, pointillés, Échap), répartir uniformément lignes/colonnes, ajustement des colonnes au contenu, dupliquer ligne/colonne, avertissement de colonne trop étroite et de dépassement de la page. Pas de styles liés (décision prise). Tests : réordonnancement, invariants de grille après chaque opération, isolation (tests/isolation.spec.js). Version 1.112.0, prettier + build + check + test, 5 bundles, CLAUDE.md et architecture.md à jour, push sur la branche de session.
Sois économe en tokens : Grep ciblé, Read avec offset/limit, pas de sous-agent, conclusion courte.
```
