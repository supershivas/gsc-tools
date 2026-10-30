@.claude/conventions.md

# GSC tools

## Description

Regroupe les différents outils de design développés pour le GSC. Premier outil : le Factsheet creator (éditeur de fiche A4 recto-verso, dataviz, export PDF).
URL de production : https://supershivas.github.io/gsc-tools/
Catégorie : **secondaire**.
Cible : **uniquement bureau** (bandeau refermable « Cette app est prévue pour un écran d'ordinateur » sur téléphone, pas d'optimisation mobile).

## Stack

JS vanilla statique, hébergé sur GitHub Pages (push sur `main` = déploiement). Aucune base de données : les données restent dans le `localStorage` (clé `factsheet-creator-v1`) ; l'export JSON des réglages (préfixe `factsheet-creator`) permet de les récupérer. Icônes : Tabler (webfont via jsDelivr). Le Factsheet creator se compile avec esbuild ; l'aperçu 3D utilise three.js (dépendance de build, empaquetée dans `factsheet/viewer3d.js`).

## Structure

- `index.html` : accueil, une carte par outil. Ajouter un outil = un dossier + une carte.
- `js/shell.js` : coque commune (en-tête, réglages, mise à jour auto, toast, bandeau bureau). Chaque page l'appelle avec `initShell({ sub })`.
- `js/app-update.js`, `css/mobile.css`, `design-tokens.json` : synchronisés depuis le design system (ne pas modifier).
- `css/tokens.css` : variables CSS dérivées de `design-tokens.json` ; `css/shell.css` : styles de la coque.
- `version.json`, `CHANGELOG.md` : version (source unique).
- `factsheet/` : le Factsheet creator. Sources dans `factsheet/src/`, `factsheet/app.js` est généré : après modification, `cd factsheet && npm install && npm run build` et commiter `app.js` **et** `viewer3d.js` (bundle three.js, chargé à la première ouverture de l'aperçu 3D). Détails dans `factsheet/README.md`.

## Exceptions aux conventions

- L'aperçu du document (A4) du Factsheet creator garde son propre système de design (Source Sans 3 / Source Serif 4, `factsheet/src/tokens.js`) : c'est le produit, pas l'interface de l'app.
- Neutres de l'interface (`--bg`, `--line`, `--ink`…) définis localement dans `css/tokens.css` faute d'équivalent dans les tokens partagés.

- Interface du Factsheet creator : **anglais par défaut**, français en option (sélecteur dans la barre), à la demande du propriétaire ; déroge à « interface en français ». Le reste de la coque (en-tête, réglages) reste en français. Les textes du code sont en français et servent de clés : dictionnaire FR → EN dans `factsheet/src/i18n.js` (toute nouvelle chaîne d'interface doit y être ajoutée ; une valeur créée dans le document doit passer par `t()`).

## Pièges connus

- Le Factsheet creator imprime le PDF via `window.print()` : l'en-tête, le bandeau et le toast sont masqués en `@media print` (`factsheet/css/app.css`) ; tout nouvel élément fixe de la coque doit l'être aussi.
- L'aperçu 3D dessine chaque page via un SVG `<foreignObject>` (`factsheet/src/raster.js`) : le CSS du document et les polices latin y sont embarqués ; un nouveau style de page doit rester dans `doc.css`. L'overlay `.v3d` est masqué en `@media print`.
- Le logo a 4 versions (`header.logos` + `header.logoVariant`) et le header une bibliothèque d'images (`header.images` + `imageId`), stockées en data URL dans le `localStorage` : un avertissement s'affiche si le stockage du navigateur est plein.
- Les réglages sont un `<dialog>` modal : il bloque les clics sur l'en-tête tant qu'il est ouvert (Échap ou fond pour fermer).
