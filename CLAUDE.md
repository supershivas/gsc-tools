@.claude/conventions.md

# GSC tools

## Description

Regroupe les différents outils de design développés pour le GSC. Premier outil : le Factsheet creator (éditeur de fiche A4 recto-verso, dataviz, export PDF).
URL de production : https://supershivas.github.io/gsc-tools/
Catégorie : **secondaire**.
Cible : **uniquement bureau** (bandeau refermable « Cette app est prévue pour un écran d'ordinateur » sur téléphone, pas d'optimisation mobile).

## Stack

JS vanilla statique, hébergé sur GitHub Pages (push sur `main` = déploiement). Aucune base de données : les données restent dans le `localStorage` (clé `factsheet-creator-v1`) ; l'export JSON des réglages (préfixe `factsheet-creator`) permet de les récupérer. Icônes : Tabler (webfont via jsDelivr). Le Factsheet creator se compile avec esbuild ; l'aperçu 3D utilise three.js, l'export PDF pdf-lib (dépendances de build, empaquetées dans les bundles).

## Structure

- `index.html` : accueil, une carte par outil. Ajouter un outil = un dossier + une carte.
- `js/shell.js` : coque commune (en-tête, réglages, mise à jour auto, toast, bandeau bureau). Chaque page l'appelle avec `initShell({ sub })`.
- `js/dialog.js` : modales `alertModal` / `confirmModal` / `promptModal` (styles `.modal` dans `css/shell.css`). Jamais `alert`, `confirm` ni `prompt` du navigateur ; dans le Factsheet creator, passer par `factsheet/src/dialogs.js` (boutons traduits), toujours avec `await`.
- `js/app-update.js`, `css/mobile.css`, `design-tokens.json` : synchronisés depuis le design system (ne pas modifier).
- `css/tokens.css` : variables CSS dérivées de `design-tokens.json`, plus les variables locales de l'interface du Factsheet creator (poignées, rouge d'alerte, ombres, échelle de tailles `--fs-*`, arrondis `--radius-*`) ; `css/shell.css` : styles de la coque.
- `version.json`, `CHANGELOG.md` : version (source unique).
- `europa/europa-3d.html` : maquette 3D de la lanterne de l'Europa building (fichier autonome, three.js via CDN). Détails dans `europa/README.md`.
- `donut/donut-export.html` : export d'un graphique en anneau (PNG/JPG, versions A/B/C), fichier autonome branché sur la coque ; ses styles sont limités à `.app` ; fichiers exportés nommés `UA_AAMMJJ_nom` ; données dans `localStorage` clé `donut-export-v1`, hors export des réglages.
- `factsheet/` : le Factsheet creator. Sources dans `factsheet/src/` (`main.js` = état du document, `ctx` et assemblage ; un module par responsabilité dans `src/editor/`, `src/props/`, `src/viz/`, `src/pdf/`). Les bundles `app.js`, `viewer3d.js`, `atelier.js`, `labo.js` et `pdfexport.js` sont générés : après toute modification des sources, `cd factsheet && npm install && npm run build` et commiter les cinq. Pages : `index.html` (éditeur), `labo.html`, `atelier.html`.
- **Documentation détaillée du Factsheet creator** : `factsheet/README.md` (phases, format du texte, dataviz, tests) et `factsheet/docs/architecture.md` (une description par fonctionnalité : espacement, glisser-déposer, historique, texte riche, dataviz, couleurs, export PDF, aperçu 3D…). La lire avant de toucher à une fonctionnalité ; la mettre à jour quand une décision durable est prise.

## Exceptions aux conventions

- L'aperçu du document (A4) garde son propre système de design (Source Sans 3 / Source Serif 4, `factsheet/src/tokens.js`) : c'est le produit, pas l'interface de l'app.
- Neutres de l'interface (`--bg`, `--line`, `--ink`…) et variables locales (`--handle`, `--danger`, `--fs-*`, `--radius-xs`…) définis dans `css/tokens.css` faute d'équivalent dans les tokens partagés. Pas de valeur de couleur, de taille de police ou d'arrondi en dur dans `factsheet/css/app.css`, `sel.css`, `labo.css` : utiliser ces variables.
- Interface du Factsheet creator : **anglais par défaut**, français en option (sélecteur dans la barre), à la demande du propriétaire ; déroge à « interface en français ». Le reste de la coque (en-tête, réglages) reste en français. Les textes du code sont en français et servent de clés : dictionnaire FR → EN dans `factsheet/src/i18n.js` (toute nouvelle chaîne d'interface doit y être ajoutée ; une valeur créée dans le document doit passer par `t()`). Clé sans espace au début ni à la fin, jamais en double (esbuild avertit : `Duplicate key`).
- **Atelier** (`factsheet/atelier.html`) : publie les images et les projets dans `factsheet/assets/` et `factsheet/projects/` par un commit sur `main` (API Git de GitHub, `src/github.js`). Jeton personnel à droits fins gardé dans le `localStorage` sous `gsc-tools-github-token` (hors du préfixe `factsheet-creator`, donc jamais exporté).
- **Menus de l'en-tête** : `initShell({ menus, settingsExtra })` ; le Factsheet creator les déclare dans `window.FS_UI` (`editor/menus.js`). Les réglages (roue crantée) restent l'unique accès aux réglages.
- Dépendances de build du Factsheet creator approuvées par le propriétaire : `three`, `pdf-lib` + `@pdf-lib/fontkit`, `d3-hierarchy`, `d3-sankey`, `@playwright/test`, `prettier`. Toute autre dépendance : demander.

## Règles impératives du Factsheet creator

Détail et raisons dans `factsheet/docs/architecture.md`.

- **Rouge = action** : le rouge d'accent ne marque que ce qui agit (bouton principal) ; états sélectionnés (onglets, espacement, cartes de type) et jauges en neutre ; orange/rouge d'alerte seulement pour un dépassement.
- **Tout nouvel élément visuel du document doit rester lisible par l'export PDF** : éléments HTML/SVG réels, jamais de pseudo-élément, d'ombre ni de dégradé CSS ; tout opérateur de couleur du PDF passe par `makeInk`, le fond perdu par `bleedFor`.
- **Un seul chemin d'export** : `factsheet/src/pdf/pdf.js` (pas de `window.print`) ; tout fichier enregistré ou exporté se nomme par `fileStem` (`titre_AAMMJJ.extension`).
- **Pas d'état global pendant le rendu** : tout passe par le contexte de rendu (`renderCtx`, `env.rc`) ; hors rendu, passer le document (`columnWidth(doc, …)`, `densityGaps(doc.density)`). Deux documents doivent pouvoir se rendre entremêlés (`tests/isolation.spec.js`).
- **Glisser-déposer** : l'élément « pris » suit le pointeur avec une ombre, le reste se réarrange en direct, l'arrivée est en pointillés, Échap annule, un clic simple n'est jamais un glissement. Moteur commun `editor/dnd.js` ; dataviz : `vizreorder.js`.
- **Déplacements et suppressions** passent par `ctx.moved()` (annulables) ; toute modification du document appelle `ctx.changed()` ou `ctx.restructure()` (historique).
- **Nouvel élément redimensionnable** : poignée `div` vide dans `editor/handles.js` (`dragSplit`), avec retour en direct ; hors export.
- **Nouvelle accolade de mise en forme en ligne** : `inlineMk`, `stripInline`, `htmlToMk`/`fmtStyle`. **Nouveau style de paragraphe** : `PSTYLES` + `TYPE` + `doc.css` + `app.css` + traduction. **Nouvelle sérialisation XML** : via `XML_BAD` (`raster.js`). **SVG importé** : toujours par `cleanSvgTree`.
- **Champ de dataviz** : chaque champ de `fields` déclare sa carte par `g:` (`struct`, `dims`, `labels`, `colors`, `bracket`, `data`) selon la règle de `docs/architecture.md`, sans rangement par défaut (un test refuse l'oubli) ; son ordre dans la carte se règle dans `FIELD_ORDER` (`src/vizgroups.js`).
- **Dataviz** : toute modification passe par l'éditeur de dataviz ; nouvelle légende par `drawLegend`/`drawLegendWrap` ; nouveau choix d'icône par `iconSelect` ; texte du document : champs `<textarea class="ml">` et `white-space: pre-line`.
- **SVG non rognés** : `.page svg, .viz-sheet svg { overflow: visible }` (`doc.css`) ; ne jamais s'appuyer sur le rognage par défaut d'un SVG.
- **Choix de type** : `richSelect` avec icônes ; 2–3 valeurs courtes : `pair` ; jamais un bouton dans un `<label>`.
- **Factsheet par défaut** (`defaultDoc`, `state.js`) : recto et verso remplis sans avertissement de débordement ; relire les avertissements si on y change des tailles.
- **Identifiants stables** : ne jamais renommer une clé existante (`sub.layout`, couleurs, gabarits) ; les anciens fichiers sont migrés dans `state.js` (`migrate`).

## Pièges connus

- Avant chaque push du Factsheet creator : `cd factsheet && npm run check && npm test` (`check` vérifie aussi Prettier sur `src/` : `npx prettier --write src`). Une capture de référence (`factsheet/tests/references/`) ne se met jamais à jour pour « faire passer » un test ; seules les captures de l'interface peuvent changer, pas celles des pages du document. Élargir un panneau change le zoom « Ajuster » donc les captures des pages : à éviter.
- Mesure de texte (`mw`, `viz/util.js`) : le canvas mesure à une taille de référence fixe (200 px) puis met à l'échelle ; ne jamais mesurer à `taille × 100`. Ne pas imposer `textLength` aux textes SVG.
- Cache de GitHub Pages : 10 min (`max-age=600`). `factsheet/index.html` charge CSS, `app.js` et `js/shell.js` avec `?v=<version>` (petit script de démarrage), les bundles à la demande (`viewer3d.js`, `pdfexport.js`) aussi (`loadBundle`, `editor/export-ui.js`). Tout nouveau CSS/JS du Factsheet creator passe par ce démarrage.
- Déploiement Pages : l'identifiant d'un déploiement est le SHA du commit. Si un déploiement bloqué est annulé, relancer le même commit échoue (« Deployment cancelled ») : pousser un nouveau commit.
- Rien de ce qui est ajouté ou retiré à chaque rendu ne doit changer la taille de `#stage` (ni `#warnings`, ni la barre au-dessus) : un `ResizeObserver` relance le rendu et la page saute. La barre (`.bar`) a une hauteur fixe ; `draw` (`editor/preview.js`) restaure le scroll.
- Cmd/Ctrl + P ouvre la fenêtre d'export (`editor/shortcuts.js`) ; l'impression du navigateur reste possible par son menu : tout élément fixe de la coque (en-tête, bandeau, toast, `.v3d`) doit être masqué en `@media print` (`factsheet/css/app.css`). Ne pas réintroduire de rendu d'impression CSS.
- L'aperçu 3D dessine chaque page via un SVG `<foreignObject>` (`src/raster.js`) : un nouveau style de page doit rester dans `doc.css`. Les images publiées sont des chemins relatifs, réinjectés en data URL pour l'aperçu 3D ; Pages met ~1 min à se mettre à jour (l'Atelier attend). En rendu logiciel (headless), l'aperçu 3D tourne à ~1 image/s : longs délais dans les tests.
- Le logo a 4 versions (`header.logos`) et le header une bibliothèque d'images (`header.images`), en data URL dans le `localStorage` : un avertissement s'affiche si le stockage est plein. Logos d'origine et image par défaut (`assets/Asset 1.svg`) sont des fichiers du dépôt rétablis par `migrate`.
- Le calque de dépassement (`.ovf`, `editor/preview.js`) contient une copie de la page (`.page.ovf-clone`) : toute requête sur `.page` dans le stage doit l'exclure (`.page:not(.ovf-clone)`), sinon elle devient une cible de glisser-déposer ou de mesure.
- Les réglages sont un `<dialog>` modal : il bloque les clics sur l'en-tête tant qu'il est ouvert.
- Pas de validateur PDF/X libre : vérifier au moins une fois un export avec le contrôle en amont d'Acrobat.
