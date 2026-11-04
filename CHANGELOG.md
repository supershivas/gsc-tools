# Changelog

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
