# Factsheet creator (outil de GSC tools)

Éditeur de fiche A4 recto-verso à design system strict (Source Sans 3 / Source Serif 4).
Ouvrir `index.html` via un serveur local ou GitHub Pages — le code est empaqueté dans `app.js`, les polices sont locales (`fonts/`).
Après modification de `src/` : `npm install` (une fois) puis `npm run build` pour régénérer `app.js` et `viewer3d.js`.

## Architecture
- `src/tokens.js` — **seule source des valeurs de mise en page** : base 3 px, espacements nommés, grille, typo (pt + interlignes multiples de 3), trait 0,5 pt, header, dataviz, thèmes/palettes.
- `src/state.js` — modèle JSON : `header` → `sections[]` (page recto|verso) → `subs[]` (gabarit de colonnes) → `cols[]` (text | image | viz).
- `src/render.js` — JSON → pages A4 HTML + mesure de remplissage (jauges, avertissements de débordement).
- `src/editor.js` — panneau d'édition (contenu, couleurs, images ; jamais tailles/espacements/layout).
- `css/doc.css` — styles du document, uniquement via variables issues des tokens.

## Format du texte
`**gras**` · une ligne = un paragraphe · `- ` = puce.

## Dataviz (phase 3)
`src/viz/` — un fichier par type : `donut` (anneau ou camembert), `bars` (barres jumelées / groupées / empilées + accolade), `hbars` (barres horizontales), `line` (courbes), `figure` (chiffre clé), `iconlist` (liste à icônes, 19 icônes dans `icons.js`).
Chaque type exporte `{ label, defaults(), fields[], render(opts, width, env) }` ; le panneau d'édition génère son formulaire depuis `fields`. Pour ajouter un type : créer le fichier et l'inscrire dans `viz/index.js`.
Les couleurs sont des clés de palette (le thème recolore tout). Largeur = celle de la colonne (1/3, 1/2, 2/3, pleine) ; l'anneau passe de « libellés autour » (pleine largeur) à « légende sous l'anneau » (colonnes plus étroites).

## Textes dans les dataviz
Règle : un texte ne déborde jamais de sa dataviz. Helpers dans `viz/util.js` (`fitSize`, `fitText`, `ellipsize`) : la taille est réduite ponctuellement (jusqu'à 50-70 % selon l'élément), puis le texte est tronqué avec « … » en dernier recours. Appliqué au texte central du donut (calculé sur la corde de l'anneau), aux libellés et valeurs des barres/courbes, à l'accolade, aux légendes, au chiffre clé ; les mots trop longs des libellés sont coupés. Tout nouveau type de dataviz doit utiliser ces helpers.

## Éditeur de dataviz
Bouton « ✎ Éditer la dataviz… » dans la fiche d'une colonne, ou double-clic sur une dataviz dans l'aperçu : modale plein écran (`src/vizeditor.js`) commune à **tous** les types — formulaire généré depuis `fields`, aperçu à la largeur réelle de la colonne (ou 1/3, 1/2, 2/3, pleine largeur pour tester), zoom, Annuler (restaure) / Terminer, Échap = annuler.
Un type peut ajouter :
- `actions: [{ label, run(opts) }]` — boutons au-dessus du formulaire ;
- `edit.start(hit, opts, meta, api, pt)` — interactions souris : `render()` pose des `data-hit="kind:index"` quand `env.ui` est présent (éditeur seulement, jamais à l'export) et renvoie `meta` (géométrie) ; `start` renvoie `{ move(pt), end() }` ; `api` = `{ ui, select(i), redraw() }`.
Le donut l'utilise : cliquer un segment/libellé, glisser l'anneau (rotation, orientation « manuelle »), glisser un libellé (position verticale, ou de l'autre côté de l'anneau), glisser le point blanc (ancrage du trait), « Positions auto », « Plus grand en premier ».

## Logo et images du header
Le logo a 4 versions de même taille (défaut, mono, white, négatif) : une liste déroulante choisit celle qui s'affiche, chacune s'importe séparément (`header.logos`, `header.logoVariant`). Le header a une bibliothèque d'images sans limite (deux emplacements au départ) : vignettes cliquables, import / renommer / supprimer, la vignette sélectionnée est affichée (`header.images`, `header.imageId`).

## Atelier (publication dans GitHub)
`atelier.html` : connexion avec un jeton GitHub (droits fins, « Contents » lecture/écriture sur ce dépôt, gardé dans ce navigateur), publication des images du document (logos, header, colonnes) dans `assets/` et des projets `.json` dans `projects/` (un commit sur `main`, noms de fichiers d'après le contenu), liste et suppression des fichiers publiés, ouverture d'un projet publié dans l'éditeur. Le document ne garde alors que le chemin de l'image.

## Contours, images, chiffre clé, labo
Contour optionnel (couleur, fond blanc) sur section, sous-section et colonne : trait 0,5 pt, coins de 3 px, cadre sur les marges, contenu en retrait de 12 px (les largeurs des dataviz et images en tiennent compte). Image : format fixe, ajustée au conteneur (proportions de l'image) ou taille personnalisée (largeur en %, hauteur en px, position). Le chiffre clé est un type de contenu (`src/figure.js`) avec icône facultative. Les cartes sont en variantes dans le Labo (`labo.html`) avant d'entrer dans l'éditeur.

## Déplacements et alignements
Glisser la poignée de la barre au survol (aperçu) ou celle d'une ligne de la structure sur une autre colonne **échange** les deux contenus ; la liste « Échanger le contenu avec… » du panneau fait la même chose. Une sous-section se glisse dans la structure (avant/après une autre, ou sur une section pour la ranger à la fin) ou via « Déplacer vers la section ». Chaque déplacement propose « Annuler le déplacement ». Alignement vertical du contenu dans la colonne (`valign`) et alignement du texte (`align`) dans le panneau de la colonne.

## Aperçu 3D
Bouton « Aperçu 3D » : les pages sont dessinées en images (`src/raster.js`) puis posées sur une feuille A4 en three.js (`src/viewer3d.js`, bundle séparé `viewer3d.js` chargé à la demande). Léger balancement tant que la caméra n'est pas touchée, puis caméra libre (clic gauche tourner, clic droit déplacer, molette zoomer) ; boutons Retourner (recto/verso, touche F), Deux pages, Recentrer ; Échap ferme.

## Langue de l'interface
Anglais par défaut, français en option (`src/i18n.js`). Les textes du code sont en français et servent de clés du dictionnaire FR → EN ; une passe sur le DOM traduit l'interface (jamais le document ni les champs de saisie) et `t()` sert pour les alertes et les valeurs créées dans le document. Ajouter une langue = ajouter un dictionnaire dans `i18n.js`.

## Interface
Trois colonnes : **structure** à gauche (header, sections, sous-sections, colonnes ; clic = sélection, poignée ⠿ = réordonner / changer de page), **aperçu** au centre, **propriétés** à droite (document, header, section, sous-section ou colonne selon la sélection, avec fil d'Ariane). Sélectionner dans la structure ou sur la page revient au même (`src/tree.js`, `src/props.js`).

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
