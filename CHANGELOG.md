# Changelog

## 1.61.1 — 2026-11-05
- Chiffre clé multiple : tous les chiffres d'une même rangée ont le même corps (le plus petit qui rentre) ; chaque cellule est au moins aussi large que son mot le plus long, donc plus de mot coupé au milieu (« intergovernment / al »)

## 1.61.0 — 2026-11-05
- Largeur des colonnes : une poignée entre chaque paire de colonnes (survol orange) se glisse dans l'aperçu pour régler leurs largeurs en direct, avec collage aux douzièmes (1/2, 1/3, 1/4…) ; le menu « Colonnes » de la sous-section indique alors « Personnalisé »

## 1.60.0 — 2026-11-05
- Éditeur de dataviz : un clic change la couleur de l'élément seul (une barre, un point) pour le mettre en valeur ; Maj ou Cmd + clic pour en choisir plusieurs ; « Toute la série » et « Couleur de la série » pour revenir en arrière
- Chiffre à côté : la séparation entre le contenu et le chiffre se glisse dans l'aperçu, et redimensionne les deux blocs en direct
- Images comme étiquettes : PNG, JPEG, WebP ou GIF (drapeaux…) importables comme les icônes SVG, sous les barres verticales et à gauche des barres horizontales ; exportées aussi dans le PDF CMJN

## 1.59.0 — 2026-11-05
- Éditeur de dataviz : un clic sur une barre, un segment d'anneau, un point de courbe ou une case de waffle ouvre le choix de sa couleur
- Éditeur de dataviz : en réordonnant à la souris, l'élément pris suit le pointeur avec une ombre portée et le reste se réarrange en temps réel

## 1.58.1 — 2026-11-05
- Aperçu 3D : ne plante plus quand un texte contient des caractères de contrôle invisibles (souvent collés depuis InDesign, Illustrator ou un PDF) ; le collage dans les champs de texte riche nettoie ces caractères
- Aperçu 3D : le diagnostic d'erreur indique aussi les attributs et les caractères inhabituels (code Unicode) de l'élément fautif

## 1.58.0 — 2026-11-05
- Médias importés : la liste des icônes importées n'encombre plus chaque panneau ; elle a sa fenêtre (Édition › Médias importés…) pour renommer, retirer et importer
- Barres verticales : « Espace entre les groupes de barres » accepte « Aucun » (barres jointives)
- Titre d'une dataviz : texte riche avec styles de paragraphe (titre 1, titre 2, légende, chiffre clé)
- Textes d'une colonne : placement « libre », « au-dessus du contenu » ou « en dessous du contenu »
- Aperçu 3D : message d'erreur sélectionnable avec bouton « Copier l'erreur », diagnostic des éléments SVG corrigé

## 1.57.3 — 2026-11-05
- Aperçu 3D : en cas d'erreur, le diagnostic descend dans la colonne fautive et nomme l'élément précis (balise, classe, début du texte)

## 1.57.2 — 2026-11-05
- Aperçu 3D : quand une page ne peut pas être dessinée, l'erreur nomme maintenant les éléments fautifs (image de l'en-tête, logo, image d'une colonne avec son nom de fichier, ou colonne) et la taille de la page

## 1.57.1 — 2026-11-05
- Aperçu 3D : l'erreur affiche maintenant sa cause précise (et la console du navigateur aussi) ; le dessin des pages réessaie une fois, ce qui peut régler certains cas sous Firefox

## 1.57.0 — 2026-11-04
- Textes libres : plusieurs par colonne, placés où l'on veut (glisser dans l'aperçu, ou X / Y / largeur dans les propriétés), en texte riche ; remplace le texte libre « au-dessus / en dessous / à côté »
- Styles de paragraphe : ajout de « Chiffre clé » et « Chiffre clé (petit) » (même typographie que les chiffres clés)

## 1.56.0 — 2026-11-04
- Barres : « Position de la légende › Dans les barres » écrit les noms des séries (EU, Ukraine…) dans chaque barre sans avoir à cocher la légende ; avec « Libellés dans les barres » et un libellé vide, le nom de la série sert de libellé
- Texte libre lié à n'importe quelle colonne (au-dessus, en dessous, à gauche ou à droite), en texte riche
- Styles de paragraphe dans le texte riche des colonnes, cartes et textes libres : Texte, Titre 1, Titre 2, Légende

## 1.55.0 — 2026-11-04
- Légendes : choix de la position (en bas, en haut) pour toutes les dataviz à légende, et « Dans les barres » pour les barres horizontales et verticales (le nom de chaque série s'écrit dans sa barre)

## 1.54.0 — 2026-11-04
- Barres horizontales et verticales : valeurs, libellés et noms des séries peuvent s'écrire dans les barres (si ça rentre)
- Barres : épaisseur des barres et espaces (entre les lignes ou les groupes, entre les barres d'un même groupe) réglables

## 1.53.0 — 2026-11-04
- Texte riche : exposant et indice (x², x₂) en plus du gras, de l'italique et du souligné, dans tous les champs de texte riche

## 1.52.0 — 2026-11-04
- Partout où l'on choisit une icône (liste à icônes, waffle, pictogrammes, icônes sous les barres, chiffre clé, en-tête du chiffre clé, cartes), « Importer un SVG… » est proposé au bas de la liste
- Les icônes SVG importées sont communes à tout le document : disponibles dans tous les choix d'icône, y compris celles importées avant dans une dataviz

## 1.51.0 — 2026-11-04
- Liste à icônes : icône sans cercle, espace réglable entre les éléments, espace réglable entre l'accolade et la liste, trait de liaison de l'accolade vers l'extérieur
- Texte : Entrée = nouveau paragraphe, Maj + Entrée = retour à la ligne dans le paragraphe

## 1.50.0 — 2026-11-04
- Anneau : un segment sans titre ni texte n'a plus de libellé ni de trait de repère, et l'option « Aucun (anneau seul) » supprime tous les libellés
- Anneau : « trait de liaison » par segment, horizontal, du bord du segment jusqu'au bord de la colonne et au-delà (longueur et couleur réglables), pour le relier à l'accolade d'une colonne voisine

## 1.49.0 — 2026-11-04
- Chiffre à côté : nouvelle position « Au-dessus » (gros chiffre au-dessus de la dataviz, du texte ou de la carte)
- Barres horizontales : libellés dans les barres et graduations (segments)
- Barres verticales : une icône (bibliothèque ou SVG importé, par exemple un drapeau) sous chaque barre, colonne « Icône » des données

## 1.48.0 — 2026-11-04
- Chiffre clé : jusqu'à 3 chiffres côte à côte, barre de progression sous chaque chiffre, en-tête avec icône et petites capitales
- Liste à icônes : option « Accolade à gauche »
- Fond et contour : hachures en bandes obliques (couleur au choix) pour les colonnes et sous-sections ; nouvelle icône « Alerte »

## 1.47.0 — 2026-11-04
- Poignée de hauteur aussi sous les colonnes texte, image, carte et chiffre : glisser règle la hauteur minimale, repère orange sur la colonne voisine, double-clic = adapter à la voisine (aussi dans Propriétés › Hauteur)
- Liste à icônes : le texte des éléments garde ses retours à la ligne dans le document

## 1.46.0 — 2026-11-04
- Texte riche (gras, italique, souligné, retours à la ligne) dans les champs courts : surtitre, titres, cartes, titre et source de dataviz, chiffre à côté
- Liste à icônes : le bouton « Importer un SVG » est maintenant dans l'onglet Données, sous la liste des éléments

## 1.45.0 — 2026-11-04
- Éditeur de dataviz : annuler / rétablir (boutons et Cmd/Ctrl + Z), y compris le changement de type, pour revenir exactement où l'on en était
- Liste à icônes, chiffre clé : texte avec gras, italique, souligné et retours à la ligne, aussi dans les titres, cartes et légendes
- Choix d'icône avec aperçu (icône + nom) dans la liste à icônes, la waffle, les pictogrammes, le chiffre clé et les cartes

## 1.44.0 — 2026-11-04
- Chiffre à côté aussi pour les contenus texte et les cartes (carte « Chiffre à côté » dans les propriétés de la colonne)
- Liste à icônes : import d'icônes SVG (nettoyées, stockées dans le JSON) proposées dans le choix d'icône de chaque élément, et taille réglable (normal, grand, très grand) pour les icônes et le texte

## 1.43.0 — 2026-11-04
- Chiffre à côté pour toutes les dataviz (carte « Chiffre à côté » : à droite ou à gauche, jetons {pct} {value} {total} {label}, texte, part de largeur, taille, position verticale)
- Waffle : repère par catégorie défini dans les données (croix, point, coche ou icône, avec sa couleur) — plus de repère sur les cases d'une catégorie blanche ; cases plus grandes quand le chiffre est à côté (65 % de la largeur)
- Colonnes : liste déroulante avec un petit schéma de chaque gabarit ; la mise en page à 6 colonnes n'est plus proposée

## 1.42.0 — 2026-11-04
- Cmd/Ctrl + molette (ou pincement) : le zoom se fait au niveau du curseur — le point de la page sous le curseur reste sous le curseur ; en zoom manuel, de la marge autour des pages permet de zoomer partout, et une page plus large que l'écran reste atteignable à gauche

## 1.41.0 — 2026-11-04
- Waffle : chiffre à côté de la grille (à droite ou à gauche), avec {pct}, texte, largeur de la grille et position verticale réglables
- Mises en page de sous-section jusqu'à 6 colonnes : 4, 5 et 6 colonnes égales, 3/4 + 1/4, 1/4 + 3/4, 3/5 + 2/5, 2/5 + 3/5, et trois combinaisons à 3 colonnes (1/2 + 1/4 + 1/4, 1/4 + 1/2 + 1/4, 1/4 + 1/4 + 1/2)

## 1.40.0 — 2026-11-04
- Dataviz : grille de pourcentage (« waffle ») — grille de cases (10 × 10 par défaut) remplies à hauteur de la valeur, repère croix, point ou coche sur les cases pleines, plusieurs catégories possibles ; à associer à un chiffre clé dans une sous-section à contour

## 1.39.0 — 2026-11-04
- Éditeur de dataviz : les choix de couleur sont des pastilles (nom ajouté quand il y a la place) ouvrant une liste de pastilles avec leurs noms, au lieu de listes déroulantes de texte

## 1.38.0 — 2026-11-04
- Dataviz : réordonner les éléments à la souris (barres, lignes, frise, pictogrammes, liste à icônes) ; les autres se réajustent en direct avec des écarts proportionnels ; l'ordre est celui du JSON
- Dataviz : poignée de hauteur sous chaque dataviz dans l'aperçu (se cale sur la colonne voisine) et nouveau mode « Adapter à la colonne voisine »
- Anneau : position verticale de l'anneau (en haut, centré sur le contenu, en bas) par rapport aux textes plus hauts
- Outil main : maintenir Espace (ou touche H) puis glisser pour déplacer l'aperçu

## 1.37.0 — 2026-11-04
- Filet de 0,5 pt entre les sections, pleine largeur : au milieu de l'écart entre deux sections sur fond blanc, ou à la jonction de deux bandes de couleur ; interrupteur « Filet au-dessus de la section » et couleur dans les propriétés

## 1.36.0 — 2026-11-04
- Anneau : alignement vertical du contenu dans son conteneur (haut, centré, bas) quand la hauteur est fixe ou « remplir » ; interlignage des textes un peu réduit (18 px) et réglable
- Alignement vertical et hauteur de conteneur aussi pour l'enquête et les pictogrammes en barres
- Frise : extrémités de la ligne en pointillés (par défaut), en trait plein, ou aucune (la ligne commence au premier cercle)
- Labo : sujet « Dataviz » avec les 16 types, fausses données modifiables, hauteur de conteneur, alignement vertical, options du type et déplacement direct de l'anneau

## 1.35.0 — 2026-11-04
- Texte au centre de l'anneau : fin de l'effet « aplati » ; la mesure des textes n'est plus faussée par les navigateurs qui plafonnent la taille de police du canvas (les grands textes étaient sous-mesurés)
- Anneau par défaut : retour à la ligne entre le chiffre et « billion » dans l'éditeur
- Aperçu 3D : export en PNG (fond clair du visualiseur, ou fond transparent), en 2× la taille affichée

## 1.34.1 — 2026-11-04
- Texte au centre de l'anneau : la largeur mesurée est imposée au rendu (plus de débordement même si la police n'est pas celle de la mesure) et marges de sécurité accrues
- Démarrage versionné du Factsheet creator : CSS et JS chargés avec la version en paramètre, une mise à jour n'est plus servie avec d'anciens fichiers du cache (10 min sur GitHub Pages)

## 1.34.0 — 2026-11-04
- Export PDF CMJN généré par l'app : vectoriel, couleurs DeviceCMYK exactes de la palette (noir seul pour les textes noirs), polices incorporées, fond perdu et traits de coupe avec TrimBox et BleedBox
- Les images importées sont converties en CMJN (sans profil ICC) ; l'ancien export par l'impression du navigateur (RVB) reste disponible
- Correction : le contour pointillé parasite autour des cartes de l'aperçu a disparu

## 1.33.0 — 2026-11-04
- Factsheet par défaut : plus aucun texte hors cadre (anneau, frise), la dernière dataviz est remplacée par du texte
- Les mesures de texte attendent le chargement des polices (plus de débordement au premier affichage)
- Couleurs par défaut en CMJN d'imprimeur (bleu Reflex 100/80/0/0, jaune 0/0/100/0…) ; le sélecteur CMJN garde la valeur exacte
- Cartes repliables : tout l'en-tête est cliquable

## 1.32.0 — 2026-11-04
- Factsheet par défaut refaite : recto et verso remplis (chiffres clés, texte, cartes, courbes, anneau, frise, treemap, pictogrammes) avec les gabarits 1, 2, 3 colonnes, 2/3 + 1/3 et 1/3 + 2/3
- Petits « ? » d'aide à côté des champs, interrupteurs et cartes (infobulle au survol ou au focus)

## 1.31.2 — 2026-11-04
- Aperçu 3D : le bundle est rechargé à chaque nouvelle version (plus d'ancienne copie en cache qui garde des défauts d'ombre déjà corrigés)

## 1.31.1 — 2026-11-04
- Aperçu 3D : plus de zébrures d'ombre sur la feuille ni d'effet bizarre quand elle approche du mur (pas d'auto-ombrage, mur reculé, lumière plus frontale)

## 1.31.0 — 2026-11-04
- Aperçu 3D : on déplace la feuille, pas la caméra (la lumière reste fixe, la feuille y est toujours) ; la feuille réagit en souplesse, se courbe et se gauchit légèrement quand on la bouge, puis revient en oscillant
- Filet entre sous-sections : couleur au choix (propriétés de la section) ; bleu léger (teinte 20 %) par défaut sur fond blanc
- Frise : retours à la ligne dans les titres et les textes (cellules multilignes du tableau de données)

## 1.30.0 — 2026-11-04
- Header : un sous-titre de 2 lignes ne déclenche plus d'avertissement (interligne du sous-titre 36 → 30 px, mesure corrigée) et l'espace filet → titre est toujours égal à l'espace surtitre → filet (9 px)
- Éditeur de dataviz : le type a sa propre carte repliable en tête, mise en valeur, dont l'en-tête affiche le type courant ; repliée par défaut

## 1.29.0 — 2026-11-04
- Dataviz : le type se choisit aussi depuis les propriétés de la colonne (menu déroulant par famille)
- Éditeur de dataviz : le choix du type tient dans un seul bouton compact (icône + nom) au-dessus des onglets, avec un menu rangé par famille

## 1.28.1 — 2026-11-04
- Header : l'avertissement « titre trop long » ne se déclenche plus pour un sous-titre de 2 lignes ; il compare le texte à la hauteur réelle du header

## 1.28.0 — 2026-11-04
- Tous les champs texte acceptent les retours à la ligne (Entrée) : titre, sous-titre et surtitre du header, titres de sections et de sous-sections, légendes, textes de cartes, titres de dataviz

## 1.27.0 — 2026-11-04
- Dataviz : frise chronologique (verticale ou horizontale, alternance de part et d'autre de la ligne)
- Aperçu 3D plus papier : feuille fine et légèrement courbe, lumière diffuse, ombre portée douce, grain de papier léger
- Donut : le texte du centre passe à la ligne sans jamais dépasser l'anneau, avec un petit éditeur de niveaux (H1, H2, texte)

## 1.26.1 — 2026-11-04
- Section avec fond : les boutons « Nouvelle sous-section » / « Nouvelle section » ne disparaissent plus quand le pointeur traverse le bas de la section pour les atteindre

## 1.26.0 — 2026-11-04
- Filet de 0,5 pt entre les sous-sections, sur toute la largeur de la page : blanc sur un fond de section, bleu UE sur fond blanc
- Interrupteur « Filet entre les sous-sections » dans les propriétés de la section

## 1.25.0 — 2026-11-04
- Les options de hauteur des dataviz sont aussi dans les propriétés de la colonne, sans ouvrir l'éditeur
- Éditeur de dataviz : onglets Données et Visualisation en haut de la colonne de gauche (Données en premier) ; texte « null » supprimé

## 1.24.2 — 2026-11-04
- Donut export : en-tête commun GSC tools, réglages et mise à jour automatique

## 1.24.1 — 2026-11-04
- Donut export : le fichier exporté commence par UA_ suivi de la date (UA_AAMMJJ_nom)

## 1.24.0 — 2026-11-04
- Nouvel outil sur l'accueil : Donut export (graphique en anneau exportable en PNG ou JPG)

## 1.23.0 — 2026-11-03
- Dataviz : option Hauteur (automatique, proportion, fixe, remplir la place disponible de la page)
- Mode « Remplir » : la dataviz occupe l'espace restant de sa page, partagé entre plusieurs dataviz, sans déborder

## 1.22.0 — 2026-11-03
- Dataviz : nuage de points, résultats d'enquête (points), sunburst, bulles hiérarchiques, treemap, Sankey
- Dataviz : pictogrammes en 4 variantes (barres, barres verticales, simple vertical, simple horizontal), SVG importable intégré au JSON

## 1.21.0 — 2026-11-03
- Éditeur de dataviz : panneau en cartes repliables comme l'accueil, onglets Visualisation et Données
- Données : tableau éditable, collage depuis Excel, import CSV/TSV/JSON, export CSV
- Titre et source facultatifs sur toute dataviz ; le tableau suit quand on change de type

## 1.20.0 — 2026-11-03
- Sections et sous-sections : interrupteur « Afficher le titre » pour masquer un titre sans le perdre

## 1.19.2 — 2026-11-03
- Une page sans section (verso vide) propose « Nouvelle section » au survol, à l'emplacement de la première section

## 1.19.1 — 2026-11-03
- Sections et sous-sections sans titre : un titre vide est masqué (indiqué dans le champ) ; une section sans titre se déplace par la poignée de la barre au survol ou par son fond

## 1.19.0 — 2026-11-03
- Glisser-déposer en temps réel aussi dans la barre latérale : la carte est prise comme un objet pendant que la structure et la page se réorganisent
- Cadres de sélection et de survol : une section est encadrée sur toute sa largeur, marges comprises

## 1.18.1 — 2026-11-03
- Espace entre le header et la première section : 36 px (au lieu de 24 px)

## 1.18.0 — 2026-11-03
- Marges et espaces : bouton et trois densités (Serré, Actuel, Large) directement dans la barre au-dessus de l'aperçu
- Le cadre du survol a la même forme que le cadre de sélection (largeur des marges pour une section, 3 px d'air, coins de 3 px)

## 1.17.2 — 2026-11-03
- Titre de sous-section : curseur main (déplaçable) et texte non sélectionnable, comme le titre de section

## 1.17.1 — 2026-11-03
- Cadre de sélection : variante Halo (onde douce en boucle), avec 3 px d'air autour de l'élément

## 1.17.0 — 2026-11-03
- Historique des modifications (icône horloge dans l'en-tête, menu Édition) : on revient à n'importe quel pas en un clic
- Glisser-déposer : l'élément est pris comme un objet (son rendu suit le pointeur) pendant que la page se réorganise en direct
- Corrige la page qui sautait à chaque retouche avec « Marges et espaces » ; message de déplacement/suppression en petit en bas à gauche ; animations de sélection en boucle douce (Labo)

## 1.16.0 — 2026-11-03
- Annuler / rétablir (boutons au centre de l'en-tête, menu Édition, Cmd/Ctrl + Z) et nom du fichier modifiable dans l'en-tête ; plus d'onglet Document ni de choix de thème
- Palette à deux tons : chaque couleur existe en pleine et en légère (20 %), seule liste proposée pour fonds, contours et textes
- Cadre de sélection superposé à la page (plus recadré par le bord), zoom jusqu'à 400 %, boutons « + » plus discrets, Labo : variantes d'animation de la sélection

## 1.15.0 — 2026-11-03
- Image du header : affichée en entier, le conteneur suit les proportions de l'image
- Boutons « + » à la hauteur du bloc créé, seulement là où il y a de la place dessous ; Cmd/Ctrl + molette zoome l'aperçu
- Le Labo reprend les cartes repliables pour ses options ; le filigrane des marges suit les changements de mise en page

## 1.14.0 — 2026-11-03
- Marges et espaces : filigrane dans Affichage et trois densités d'espacement (serré, actuel, large) enregistrées dans le document
- Boutons « + » pleine largeur sous une section ou une sous-section, et « + » pour ajouter une colonne à une colonne seule
- Logos défaut et mono remis dans le bon sens ; gris clair à la place de lavande ; header par défaut gris clair avec textes bleus ; corrige les fonds blancs des anciens documents

## 1.13.0 — 2026-11-03
- Propriétés et structure en cartes repliables ; fond et contour au choix sur chaque élément ; couleurs modifiables, renommables et ajoutables partout
- Glisser-déposer avec aperçu en direct (sections, sous-sections, colonnes) ; une colonne se vise sur toute sa hauteur

## 1.12.0 — 2026-11-03
- Factsheet creator : menu Fichier › Nouvelle factsheet vierge (header et logos d'origine, une section vide)

## 1.11.0 — 2026-11-03
- Factsheet creator : logo négatif et image du header par défaut (toujours disponibles) ; les logos ne se retirent plus, on peut charger une autre image à leur place
- Labo : 5 présentations du panneau de propriétés à comparer (sujet « Propriétés »)

## 1.10.1 — 2026-11-03
- Factsheet creator : les logos (normal, mono, blanc) sont publiés dans le dépôt et présents par défaut sur tous les appareils

## 1.10.0 — 2026-10-31
- Europa 3D : vitrage très réfléchissant, spots linéaires (3 par vitre haute, 1 par petite fenêtre) qui éclairent de l'intérieur
- Europa 3D : salles de réunion, dont une salle circulaire au niveau 5 inspirée du Conseil européen

## 1.9.0 — 2026-10-31
- Europa 3D : un clic sur un plateau développe la lanterne (tranches écartées, plateau centré) avec une fiche animée ; un nouveau clic la referme

## 1.8.0 — 2026-10-31
- Europa 3D : les bandes obliques des fenêtres sont recalées sur chaque fenêtre (45° réels, 15 par fenêtre)
- Europa 3D : les bandes ne se voient plus à travers la paroi du fond ; lien ajouté sur l'accueil
- Europa 3D : faces opaques, opacité du vitrage et des bandes réglables séparément, couleur du vitrage, bandes masquables, coupe de la façade

## 1.7.1 — 2026-10-30
- Barre au survol : le bouton « Éditer », redondant avec le panneau de droite, est retiré ; « Dataviz… » reste

## 1.7.0 — 2026-10-30
- Éditeur de couleur : saisie en CMJN (en plus de RVB, TSV et hexadécimal) ; valeurs CMJN en info-bulle dans la palette

## 1.6.1 — 2026-10-30
- Bouton « Ajouter une couleur » aux dimensions et espacements du design system

## 1.6.0 — 2026-10-30
- Suppression d'une section, sous-section ou colonne (touche Suppr, bouton au survol ou dans le panneau), avec annulation ; les autres colonnes s'étendent
- Palette de couleurs : espacements revus

## 1.5.0 — 2026-10-30
- Vrai éditeur de couleur (carré, teinte, RGB/HSV, hexadécimal, pipette) ; palette limitée à 5 couleurs par thème, avec ajout possible
- Les fonds de section sont des teintes calculées des couleurs de la palette
- Nouveau contenu « Carte » avec toutes les options au choix ; son type par défaut dépend de la largeur de la colonne

## 1.4.0 — 2026-10-30
- Contour (coins de 3 px) sur les sections, sous-sections et colonnes ; images ajustées au conteneur ou à taille personnalisée
- Chiffre clé devenu un type de contenu à part, avec icône ; les réglages d'une dataviz sont tous dans son éditeur
- Labo : cartes et chiffres clés en variantes avec options cochables, à valider

## 1.3.0 — 2026-10-30
- Menus Fichier et Affichage dans l'en-tête du Factsheet creator ; la langue passe dans les réglages
- Un contenu de colonne se déplace sur une autre colonne (glisser ou liste), avec annulation ; les sous-sections changent de section
- Alignement vertical du contenu (haut, centre, bas) et alignement du texte (gauche, centré, droite, justifié)

## 1.2.0 — 2026-10-30
- Atelier : publie les images (logos, header, colonnes) et les projets dans le dépôt GitHub, pour les retrouver sur tous les appareils
- Lien « Atelier » dans les réglages et rappel des images à publier dans le Factsheet creator

## 1.1.0 — 2026-10-30
- Logo : choix entre 4 versions (défaut, mono, blanc, négatif) dans une liste déroulante
- Header : bibliothèque d'images (deux au départ, autant qu'on veut ensuite)
- Aperçu 3D du document avec caméra libre, et interface du Factsheet creator en anglais (français en option)

## 1.0.0 — 2026-10-30
- Crée l'app GSC tools avec une page d'accueil des outils
- Intègre le Factsheet creator
