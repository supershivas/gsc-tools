@.claude/conventions.md

# GSC tools

## Description

Regroupe les différents outils de design développés pour le GSC. Premier outil : le Factsheet creator (éditeur de fiche A4 recto-verso, dataviz, export PDF).
URL de production : https://supershivas.github.io/gsc-tools/
Catégorie : **secondaire**.
Cible : **uniquement bureau** (bandeau refermable « Cette app est prévue pour un écran d'ordinateur » sur téléphone, pas d'optimisation mobile).

## Stack

JS vanilla statique, hébergé sur GitHub Pages (push sur `main` = déploiement). Aucune base de données : les données restent dans le `localStorage` (clé `factsheet-creator-v1`) ; l'export JSON des réglages (préfixe `factsheet-creator`) permet de les récupérer. Icônes : Tabler (webfont via jsDelivr). Le Factsheet creator se compile avec esbuild.

## Structure

- `index.html` : accueil, une carte par outil. Ajouter un outil = un dossier + une carte.
- `js/shell.js` : coque commune (en-tête, réglages, mise à jour auto, toast, bandeau bureau). Chaque page l'appelle avec `initShell({ sub })`.
- `js/app-update.js`, `css/mobile.css`, `design-tokens.json` : synchronisés depuis le design system (ne pas modifier).
- `css/tokens.css` : variables CSS dérivées de `design-tokens.json` ; `css/shell.css` : styles de la coque.
- `version.json`, `CHANGELOG.md` : version (source unique).
- `factsheet/` : le Factsheet creator. Sources dans `factsheet/src/`, `factsheet/app.js` est généré : après modification, `cd factsheet && npm install && npm run build` et commiter `app.js`. Détails dans `factsheet/README.md`.

## Exceptions aux conventions

- L'aperçu du document (A4) du Factsheet creator garde son propre système de design (Source Sans 3 / Source Serif 4, `factsheet/src/tokens.js`) : c'est le produit, pas l'interface de l'app.
- Neutres de l'interface (`--bg`, `--line`, `--ink`…) définis localement dans `css/tokens.css` faute d'équivalent dans les tokens partagés.

## Pièges connus

- Le Factsheet creator imprime le PDF via `window.print()` : l'en-tête, le bandeau et le toast sont masqués en `@media print` (`factsheet/css/app.css`) ; tout nouvel élément fixe de la coque doit l'être aussi.
- Les réglages sont un `<dialog>` modal : il bloque les clics sur l'en-tête tant qu'il est ouvert (Échap ou fond pour fermer).
