# Factsheet creator (outil de GSC tools)

> Détail de chaque fonctionnalité et règles de développement : [`docs/architecture.md`](docs/architecture.md).

Éditeur de fiche A4 recto-verso à design system strict (Source Sans 3 / Source Serif 4).
Ouvrir `index.html` via un serveur local ou GitHub Pages — le code est empaqueté dans `app.js`, les polices sont locales (`fonts/`).
Après modification de `src/` : `npm install` (une fois) puis `npm run build` pour régénérer les bundles (`app.js`, `viewer3d.js`, `atelier.js`, `labo.js`, `pdfexport.js`, tous minifiés) ; ils se commitent avec les sources. Le champ `version` de `package.json` (`0.0.0-private`) ne veut rien dire : la version de l'app est dans `../version.json`.

## Architecture
- `src/tokens.js` — **seule source des valeurs de mise en page** : base 3 px, espacements nommés, grille, typo (pt + interlignes multiples de 3), trait 0,5 pt, header, dataviz, thèmes/palettes.
- `src/state.js` — modèle JSON : `header` → `sections[]` (page recto|verso) → `subs[]` (gabarit de colonnes) → `cols[]` (text | image | viz).
- `src/render.js` — JSON → pages A4 HTML + mesure de remplissage (jauges, avertissements de débordement).
- `src/editor.js` — panneau d'édition (contenu, couleurs, images ; jamais tailles/espacements/layout).
- `src/props.js` + `src/props/` — panneau de propriétés : `props.js` aiguille vers un module par sorte d’élément (`document`, `header`, `section`, `subsection`, `column`, et pour les colonnes `col-text`, `col-image`, `col-figure`, `col-card`, `col-viz`, `col-free`) ; les briques communes (champs, couleurs, interrupteurs, cartes repliables, tête collante) sont dans `props/kit.js`.
- `src/editor/workspace.js` + `src/wsstore.js` — onglets (plusieurs documents ouverts), brouillons IndexedDB, fichiers récents (voir `docs/architecture.md`, « Espace de travail »).
- `css/doc.css` — styles du document, uniquement via variables issues des tokens.

## Format du texte
`**gras**` · une ligne = un paragraphe · `- ` = puce.

## Dataviz (phase 3)
`src/viz/` — un fichier par type : `donut` (anneau ou camembert), `bars` (barres jumelées / groupées / empilées + accolade), `hbars` (barres horizontales), `line` (courbes), `figure` (chiffre clé), `iconlist` (liste à icônes, 19 icônes dans `icons.js`).
Chaque type exporte `{ label, defaults(), fields[], render(opts, width, env) }` ; le panneau d'édition génère son formulaire depuis `fields`. Pour ajouter un type : créer le fichier et l'inscrire dans `viz/index.js`.
Les couleurs sont des clés de palette (le thème recolore tout). Largeur = celle de la colonne (1/3, 1/2, 2/3, pleine) ; l'anneau passe de « libellés autour » (pleine largeur) à « légende sous l'anneau » (colonnes plus étroites).

### Types ajoutés (v1.22)
`scatter` (nuage de points / bulles), `survey` (résultats d'enquête : un point par répondant en nuage hexagonal, anneaux = réponses, un nuage par groupe), `sunburst`, `bubbles` (pack), `treemap` (hiérarchies : `viz/hier.js`, colonnes Niveau 1/2/3 + valeur, d3-hierarchy), `sankey` (d3-sankey), pictogrammes (`viz/picto.js`, 4 types : barres, barres verticales, simple vertical, simple horizontal ; SVG importé nettoyé par `sanitizeSvg` et stocké dans `opts.customIcons`, donc dans le JSON).
Un type peut déclarer `data: { k, cols[], item }` : l'onglet Données affiche alors un tableau d'enregistrements (`vizdata.js`, `recordsAdapter`) ; `family` et `icon` le rangent dans le sélecteur de type ; `panel(opts, ctx)` ajoute une carte (pictogrammes). Aides communes dans `viz/util.js` : `autoColor`/`CYCLE`, `inkOn` (texte lisible sur un fond), `heightOf`, `layoutLegend` (légende qui passe à la ligne).

`timeline` (`viz/timeline.js`) : frise verticale ou horizontale, option « alterner » ; hauteur automatique, fixe ou « remplir » (l'écart entre événements s'étire en vertical).
Texte du centre du donut (`totalTpl`, champ `ctext`) : une ligne par paragraphe, `## ` titre 2, `### ` texte courant, sans préfixe = titre 1 ; passage à la ligne et réduction commune jusqu'à tenir dans l'anneau.

### Hauteur des dataviz
Un type qui déclare `heights: [...]` reçoit la carte « Hauteur » : `auto` (hauteur naturelle), `ratio` (proportion de la largeur, option `ratio`), `fixed` (`hfixed` px), `fill` (remplir la place disponible, bornes `hmin`/`hmax`). `heightOf` (`viz/util.js`) calcule la hauteur ; en mode `fill`, `render.js` note ces dataviz (`env.fills`) et `measure()` → `fillPage` partage l'espace libre de la page entre elles en relançant leur rendu avec `env.fillH` (arrondi vers le bas : jamais de débordement). Dans l'éditeur, « Place disponible pour cet aperçu » simule cet espace. Les types sans `heights` (donut, enquête, listes, pictogrammes en barres) gardent leur hauteur naturelle.

## Textes dans les dataviz
Règle : un texte ne déborde jamais de sa dataviz. Helpers dans `viz/util.js` (`fitSize`, `fitText`, `ellipsize`) : la taille est réduite ponctuellement (jusqu'à 50-70 % selon l'élément), puis le texte est tronqué avec « … » en dernier recours. Appliqué au texte central du donut (calculé sur la corde de l'anneau), aux libellés et valeurs des barres/courbes, à l'accolade, aux légendes, au chiffre clé ; les mots trop longs des libellés sont coupés. Tout nouveau type de dataviz doit utiliser ces helpers.

## Éditeur de dataviz
Deux onglets, comme Flourish : **Visualisation** (cartes repliables `src/cards.js`, les mêmes que les propriétés : Type, Titre et source, Dimensions, Couleurs, Étiquettes, Options) et **Données** (`src/vizdata.js` : tableau éditable, collage Excel/Sheets cellule par cellule, import CSV/TSV/JSON par bouton ou glisser-déposer, export CSV). Un tableau entier collé ou importé passe par un aperçu (en-têtes, rôle des colonnes, séparateur décimal) ; les nombres sont lus selon le format du document (`src/dataparse.js`). Heatmap : lignes Titre / Total, gras et taille par ligne (onglet Données), carte « Textes » (largeur et passage à la ligne des noms, en-têtes), lignes hiérarchisées (4 niveaux) et groupes de colonnes. Les champs d'un type sont rangés par clé (`groupOf`, ou `g: 'format' | 'labels' | 'style' | 'data'`) ; titre et source facultatifs : `viz.head`.
Bouton « ✎ Éditer la dataviz… » dans la fiche d'une colonne, ou double-clic sur une dataviz dans l'aperçu : modale plein écran (`src/vizeditor.js`) commune à **tous** les types — formulaire généré depuis `fields`, aperçu à la largeur réelle de la colonne (ou 1/3, 1/2, 2/3, pleine largeur pour tester), zoom, Annuler (restaure) / Terminer, Échap = annuler.
Un type peut ajouter :
- `actions: [{ label, run(opts) }]` — boutons au-dessus du formulaire ;
- `edit.start(hit, opts, meta, api, pt)` — interactions souris : `render()` pose des `data-hit="kind:index"` quand `env.ui` est présent (éditeur seulement, jamais à l'export) et renvoie `meta` (géométrie) ; `start` renvoie `{ move(pt), end() }` ; `api` = `{ ui, select(i), redraw() }`.
Le donut l'utilise : cliquer un segment/libellé, glisser l'anneau (rotation, orientation « manuelle »), glisser un libellé (position verticale, ou de l'autre côté de l'anneau), glisser le point blanc (ancrage du trait), « Positions auto », « Plus grand en premier ».

## Logo et images du header
Le logo a 4 versions de même taille (défaut, mono, white, négatif) : une liste déroulante choisit celle qui s'affiche, chacune s'importe séparément (`header.logos`, `header.logoVariant`). Le header a une bibliothèque d'images sans limite (deux emplacements au départ) : vignettes cliquables, import / renommer / supprimer, la vignette sélectionnée est affichée (`header.images`, `header.imageId`).

## Atelier (publication dans GitHub)
`atelier.html` : connexion avec un jeton GitHub (droits fins, « Contents » lecture/écriture sur ce dépôt, gardé dans ce navigateur), publication des images du document dans `assets/others/` et des projets `.json` dans `projects/` (un commit sur `main`, noms de fichiers d'après le contenu), liste et suppression des fichiers publiés, ouverture d'un projet publié dans l'éditeur. Le document ne garde alors que le chemin de l'image.

## Couleurs et cartes
Panneau Document : 5 couleurs par thème, un clic ouvre l'éditeur de couleur (aperçu en direct, Annuler remet l'ancienne valeur), « Ajouter une couleur » (jusqu'à 12 au total), rétablir ou supprimer. Les fonds de section sont des teintes calculées de ces couleurs. Contenu « Carte » : contenu (étiquette, titre, chiffre, texte, puces, lien, image) et options cochables (image en haut / à gauche / à droite, jusqu'au bord, icône, pastille, alignement, contour, fond blanc) ; par défaut le type de carte dépend de la largeur de la colonne.

## Contours, images, chiffre clé, labo
Contour optionnel (couleur, fond blanc) sur section, sous-section et colonne : trait 0,5 pt, coins de 3 px, cadre sur les marges, contenu en retrait de 12 px (les largeurs des dataviz et images en tiennent compte). Image : format fixe, ajustée au conteneur (proportions de l'image) ou taille personnalisée (largeur en %, hauteur en px, position). Le chiffre clé est un type de contenu (`src/figure.js`) avec icône facultative. Les cartes sont en variantes dans le Labo (`labo.html`) avant d'entrer dans l'éditeur.

## Déplacements et alignements
Glisser la poignée de la barre au survol (aperçu) ou celle d'une ligne de la structure sur une autre colonne **échange** les deux contenus ; la liste « Échanger le contenu avec… » du panneau fait la même chose. Une sous-section se glisse dans la structure (avant/après une autre, ou sur une section pour la ranger à la fin) ou via « Déplacer vers la section ». Chaque déplacement propose « Annuler le déplacement ». Alignement vertical du contenu dans la colonne (`valign`) et alignement du texte (`align`) dans le panneau de la colonne.

## Aperçu 3D
Rendu « papier » (v1.27) : feuille de 0,3 mm sur un maillage courbé (`makeSheet`, courbure de repos + pic pendant le retournement), lumière hémisphérique + lumière principale avec ombre douce (VSM) reçue par un mur invisible (`ShadowMaterial`), grain de papier en relief (`bumpMap`) et en voile multiplié léger sur les pages.
Bouton « Aperçu 3D » : les pages sont dessinées en images (`src/raster.js`) puis posées sur une feuille A4 en three.js (`src/viewer3d.js`, bundle séparé `viewer3d.js` chargé à la demande). Léger balancement tant que la caméra n'est pas touchée, puis caméra libre (clic gauche tourner, clic droit déplacer, molette zoomer) ; boutons Retourner (recto/verso, touche F), Deux pages, Recentrer ; Échap ferme.

## Langue de l'interface
Anglais par défaut, français en option (`src/i18n.js`). Les textes du code sont en français et servent de clés du dictionnaire FR → EN ; une passe sur le DOM traduit l'interface (jamais le document ni les champs de saisie) et `t()` sert pour les alertes et les valeurs créées dans le document. Ajouter une langue = ajouter un dictionnaire dans `i18n.js`.

## Interface
Trois colonnes : **structure** à gauche (header, sections, sous-sections, colonnes ; clic = sélection, poignée ⠿ = réordonner / changer de page), **aperçu** au centre, **propriétés** à droite (document, header, section, sous-section ou colonne selon la sélection, avec fil d'Ariane). Sélectionner dans la structure ou sur la page revient au même (`src/tree.js`, `src/props.js` → un module par élément dans `src/props/`).

## Mise en forme du texte
Champs de texte riches (`richEditor` dans `editor.js`) : gras, italique, souligné, puces ; l'effet est visible dans le champ, sans balisage. Stockage interne : `**gras**`, `~~italique~~`, `__souligné__`, `- puce`. Source Sans 3 italique est embarquée.

## Boutons au survol
Survoler un élément de l'aperçu affiche une barre courte (`src/hover.js`, jamais exportée) pour l'élément le plus interne : ✎ Éditer (sélectionne), « Dataviz… » pour une dataviz, couleurs et ↑↓ pour une section, couleurs pour le header.

## Sections
Glisser une section par son titre dans l'aperçu, ou par sa poignée ⠿ dans le panneau (réordonner ou passer du recto au verso).

## Fonds colorés de section
Une section peut avoir un fond teinté. Les fonds sont jointifs (pas de bande blanche entre deux sections colorées), collés au header sur le recto, et la dernière bande descend jusqu'au bas de la page. À l'export avec fond perdu, header et bandes débordent de 3 mm.

## Export PDF (phase 5)
Bouton « Exporter PDF… » : choix **A4 net** (210×297), **fond perdu 3 mm** (216×303) ou **fond perdu + traits de coupe** (228×315). Le PDF est vectoriel, polices incorporées, généré par le moteur d'impression du navigateur (`src/export.js`). Dans la boîte d'impression : destination « Enregistrer au format PDF », marges « Aucune », « Graphiques d'arrière-plan » activé.

## Phases suivantes
Interactions pour les autres types (barres : glisser les valeurs…) · 6 finitions.

## Export PDF
`src/pdf/pdf.js` (bundle `pdfexport.js`), seul chemin d'export : le document est rendu hors écran puis relu élément par élément et réécrit en PDF vectoriel avec pdf-lib, en DeviceCMYK (profils PDF/X-4, PDF/X-1a, CMJN sans norme) ou en DeviceRGB (profil « RVB (écran) », couleurs de l'écran sans conversion ni profil ; `makeInk` choisit l'espace). Couleurs : valeurs CMJN de la palette (`THEMES.eu.cmyk`, `doc.cmyk` pour celles saisies dans l'onglet CMJN du sélecteur), conversion simple pour les couleurs hors palette et les pixels des images ; noir et gris = noir seul. Texte : polices incorporées (`fonts/pdf/`), chaque mot posé à la position mesurée dans le navigateur. Modes : A4 net, fond perdu 3 mm, fond perdu + traits de coupe (TrimBox, BleedBox) ; le débord des fonds est décidé par `bleedFor`, pour tous les profils. L'ancien export par l'impression du navigateur (`window.print`) a été retiré en v1.71.0.

## Tests de non-régression
Filet de sécurité avant de toucher au rendu ou à l'export : `tests/` (Playwright, Chromium). À lancer avant chaque push, depuis `factsheet/` :

```bash
npm ci                              # une fois (puis « npx playwright install chromium » si le navigateur manque)
npm run check                       # mise en forme (Prettier), traductions, compilation sans avertissement, bundles identiques au dépôt
npm test                            # tests Playwright (≈ 30 s)
```

`npm test` lit les bundles du dépôt : après une modification de `src/`, lancer `npm run build` d'abord (`npm run check` le fait).

**Ce qui est vérifié**
- `npm run check` (`scripts/check.mjs`) : `prettier --check src` (configuration dans `.prettierrc.json` : largeur 140, guillemets simples, points-virgules ; bundles exclus par `.prettierignore` ; pour corriger : `npx prettier --write src`) ; dictionnaire EN de `src/i18n.js` sans clé en double ni espace en bordure (`scripts/check-i18n.mjs`) ; `npm run build` sans aucune ligne `[WARNING]` d'esbuild ; `git diff --exit-code` sur les cinq bundles (un bundle oublié ou compilé à la main est refusé — pensez à `git add` avant de relancer).
- `tests/visual.spec.js` : une capture par page de l'aperçu, pour 5 documents de référence (document par défaut ; « caractères » avec latin étendu, grec et cyrillique ; trois documents qui contiennent ensemble les 17 premiers types de dataviz, 3 par page ; la heatmap est testée à part dans `tests/heatmap.spec.js`), comparée à `tests/references/`.
- `tests/pdf.spec.js` : export PDF (`window.FSPDF.build`) de chaque document, en modes net / bleed / marks et profils none / x4 / x1a / rgb : nombre de pages, MediaBox / TrimBox / BleedBox, version d'en-tête (1.4 en x1a, 1.6 en x4), OutputIntent FOGRA39 et `/ID` (aucun OutputIntent en rgb), aucune transparence en x1a, opérateurs de couleur et images uniquement dans l'espace du profil (DeviceRGB en rgb, DeviceCMYK sinon), aucun caractère manquant pour le document « caractères ». Fond perdu (x4 et rgb) : la limite header / 1re bande est à 180 pt + le fond perdu du bord (lue sur le rendu `pdftoppm` ; sans `pdftoppm`, sur la capture de la page) ; en rgb, la couleur du header est celle de l'écran. Sécurité : une icône SVG importée avec un `onerror` n'exécute rien.
- `tests/isolation.spec.js` : indépendance des rendus. Deux documents de même structure aux réglages opposés (densité, typographie automatique, icône importée de même identifiant) donnent le même HTML rendus seuls, à la suite ou entremêlés (dataviz « remplir » redessinée par `measure()` après le rendu de l'autre) ; le PDF d'un document « serré » exporté pendant que l'aperçu montre un document « large » (et se redessine) est identique à celui exporté seul, et l'aperçu ne change pas.
- `tests/console.spec.js` : aucune erreur de console au chargement de `index.html`, `labo.html` et `atelier.html`.
- `tests/i18n.spec.js` : interface en anglais, panneaux et fenêtres ouverts (menus, réglages, historique, propriétés de chaque sorte de colonne, styles de texte, export, couleurs, médias, éditeur de dataviz, Atelier, Labo à l'ouverture) : échoue sur tout texte visible qui contient encore du français (lettre accentuée, mot courant ou mot présent seulement dans les clés françaises du dictionnaire). Le changelog des réglages (français par convention) est ignoré. L'aperçu 3D et les variantes du Labo ne sont pas parcourus. Faux positif rare : l'ajouter à `ENGLISH_TOO` dans le fichier, avec la raison.

**Organisation** : `tests/server.js` (serveur statique en Node, sans dépendance, sert la racine du dépôt) ; `tests/entry.js` + `tests/docs.js` (compilés par `tests/global-setup.js` en `tests/entry.bundle.js`, ignoré par git) exposent `defaultDoc`, `newSection`, `newSub`, `newCol`, `newViz`, `VIZ_TYPES`, `renderDocument`, `measure` et fabriquent les documents ; `tests/helpers.js` (réseau externe coupé : polices Google et icônes Tabler ne sont pas chargées, le rendu ne dépend donc que du dépôt).

**Captures de référence** (`tests/references/*-linux.png`) : générées sous Linux avec le Chromium de Playwright, comme en CI. Tolérance (`playwright.config.js`) : 0,5 % de pixels différents au plus et 0,2 d'écart de couleur par pixel — de quoi absorber le crénelage du texte, pas un décalage, un fond ou un texte qui change. Une capture qui change est une régression, sauf changement voulu du rendu : dans ce cas seulement, regarder l'image (`test-results/…-diff.png`), puis la mettre à jour et commiter :

```bash
npm run test:update                 # réécrit tests/references/ ; relire « git diff --stat » et les images
```

Sans Linux : lancer le workflow « Tests du Factsheet creator » à la main (onglet Actions, « Régénérer les captures de référence »), télécharger l'artefact `references` et le copier dans `tests/references/`.

**CI** : `.github/workflows/tests.yml` (`npm ci`, `npm run check`, `npx playwright install --with-deps chromium`, tests) à chaque push et pull request ; `pages.yml` n'est pas touché. En cas d'échec, les captures obtenues, les différences et le rapport sont joints en artefact `tests-en-echec`.
