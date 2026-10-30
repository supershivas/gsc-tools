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
- `factsheet/` : le Factsheet creator. Sources dans `factsheet/src/`, `factsheet/app.js` est généré : après modification, `cd factsheet && npm install && npm run build` et commiter `app.js` **et** `viewer3d.js` (bundle three.js, chargé à la première ouverture de l'aperçu 3D) **et** `atelier.js`. Détails dans `factsheet/README.md`.

## Exceptions aux conventions

- L'aperçu du document (A4) du Factsheet creator garde son propre système de design (Source Sans 3 / Source Serif 4, `factsheet/src/tokens.js`) : c'est le produit, pas l'interface de l'app.
- Neutres de l'interface (`--bg`, `--line`, `--ink`…) définis localement dans `css/tokens.css` faute d'équivalent dans les tokens partagés.

- Interface du Factsheet creator : **anglais par défaut**, français en option (sélecteur dans la barre), à la demande du propriétaire ; déroge à « interface en français ». Le reste de la coque (en-tête, réglages) reste en français. Les textes du code sont en français et servent de clés : dictionnaire FR → EN dans `factsheet/src/i18n.js` (toute nouvelle chaîne d'interface doit y être ajoutée ; une valeur créée dans le document doit passer par `t()`).

- **Atelier** (`factsheet/atelier.html`, lien dans les réglages) : publie les images du document dans `factsheet/assets/` et les projets dans `factsheet/projects/` par un commit sur `main` (API Git de GitHub, `src/github.js`). Jeton personnel à droits fins gardé dans le `localStorage` sous `gsc-tools-github-token` (clé volontairement hors du préfixe `factsheet-creator`, donc jamais exportée). Après publication, le document ne garde que le chemin (`assets/<hash>.<ext>`), une fois Pages à jour.

- **Menus de l'en-tête** : `initShell({ menus, settingsExtra })` (`js/shell.js`) ; le Factsheet creator les déclare dans `window.FS_UI` (`factsheet/src/main.js`), lu par `factsheet/index.html`. Les réglages (roue crantée) restent l'unique accès aux réglages ; la langue y est une section ajoutée par `settingsExtra`.
- **Déplacements** : déposer un contenu sur une colonne **échange** les deux contenus (alignements inclus) ; une sous-section se range dans n'importe quelle section. Tout passe par `ctx.moved()` (`main.js`) qui garde un instantané pour « Annuler le déplacement » (effacé à la modification suivante). Effets de bord : largeur de colonne différente (dataviz et images se redessinent), page de destination qui déborde (avertissements existants), section laissée vide (conservée).

- **Suppression** : `ctx.remove(path)` (`main.js`, touche Suppr / Retour arrière hors saisie et fenêtres ouvertes) passe par `ctx.moved()` donc annulable ; supprimer une colonne rend sa place aux autres (`removeCol` : 3 → `1-1`, 2 → `1`), la dernière colonne supprime la sous-section.
- **Labo** (`factsheet/labo.html`, lien dans les réglages) : banc d'essai des cartes (`src/card.js`, `css/card.css`, pas encore dans l'éditeur) et du chiffre clé ; ajouter un sujet ou une variante = une entrée dans `TOPICS` de `src/labo.js`. Une carte adoptée devient un type de contenu (voir `src/figure.js` pour le modèle).
- **Contours** (`stroke`, `strokeColor`, `fill` sur sections, sous-sections et colonnes) : trait 0,5 pt, coins de 3 px (`STROKE.radius`), le cadre est aligné sur les marges et le contenu est en retrait de `GAP.boxPad` ; les largeurs transmises aux dataviz/images sont réduites par `insetW` (`columnWidth()` dans `render.js` pour la largeur réelle).
- **Dataviz** : toute modification passe par l'éditeur de dataviz ; le panneau de droite ne garde que le bouton qui l'ouvre. Le chiffre clé n'est plus une dataviz (`col.type = 'figure'`) ; les anciens fichiers sont migrés dans `state.js`.

- **Couleurs** : 5 couleurs par thème (`THEMES` dans `tokens.js`), blanc toujours disponible, jusqu'à 7 couleurs ajoutées par document (`doc.colors` clés `x1`…, noms dans `doc.colorNames`). Les fonds de section sont des teintes calculées (`tint-<clé>`, `tintOf`). Édition par `src/colorpicker.js`. Les anciennes clés (`deep`, `steel`, `tint*`) sont migrées dans `state.js` (`oldColors`) ; supprimer une couleur ajoutée fait passer ses usages en bleu (`removeColor`).
- **Cartes** : type de contenu `card` (`src/card.js` rendu, `src/cardmodel.js` options et contenu). Le type par défaut suit la largeur de la colonne (`cardPresetFor` : ≥ 450 px image à côté, ≥ 300 px image en haut, sinon icône en tête) tant que `card.auto` est vrai ; toucher à une option le passe à faux. Le contour d'une carte est une option de la carte (pas le contour de colonne).

## Pièges connus

- Le Factsheet creator imprime le PDF via `window.print()` : l'en-tête, le bandeau et le toast sont masqués en `@media print` (`factsheet/css/app.css`) ; tout nouvel élément fixe de la coque doit l'être aussi.
- L'aperçu 3D dessine chaque page via un SVG `<foreignObject>` (`factsheet/src/raster.js`) : le CSS du document et les polices latin y sont embarqués ; un nouveau style de page doit rester dans `doc.css`. L'overlay `.v3d` est masqué en `@media print`.
- Les images publiées sont des chemins relatifs : l'aperçu 3D les réinjecte en data URL (`raster.js`), l'export PDF les charge normalement. Le déploiement de Pages prend ~1 min : l'Atelier attend que les fichiers répondent avant de remplacer les data URL du document.
- Le logo a 4 versions (`header.logos` + `header.logoVariant`) et le header une bibliothèque d'images (`header.images` + `imageId`), stockées en data URL dans le `localStorage` : un avertissement s'affiche si le stockage du navigateur est plein.
- Les réglages sont un `<dialog>` modal : il bloque les clics sur l'en-tête tant qu'il est ouvert (Échap ou fond pour fermer).
