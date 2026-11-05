# Audit UX/UI — panneau de droite et éditeur de dataviz

Date : 2026-11-05. Rien n'est implémenté : les pistes sont des maquettes dans le Labo
(`factsheet/labo.html#editeur-C`, `#colonne-B`), captures dans `factsheet/docs/captures/`.

## 1. Panneau de propriétés (droite), élément par élément

Constat général (`src/props.js`) : des cartes repliables (bonne base, variante B du Labo), mais
- **toutes les cartes sont dépliées d'office** (l'état replié n'est pas initialisé) : une colonne dataviz fait ~2,3 écrans ;
- **aucun repère de « où je suis »** une fois qu'on a défilé : le titre et le fil d'Ariane partent avec le défilement ;
- **les actions d'élément sont en bas** (monter, descendre, dupliquer, supprimer) : il faut tout parcourir pour les atteindre ; « Supprimer » est un bouton rouge pleine largeur, sans confirmation mais annulable (bien) ;
- **vocabulaire d'étiquettes très long**, en français-clé puis traduit : « Titre (taille fixe) », « Sous-titre (optionnel — vide = masqué) », « Dataviz title (optional) — paragraph styles: heading 1… » ; les consignes sont dans l'étiquette au lieu d'une aide ;
- **mélange de contrôles pour la même chose** : interrupteur (`Afficher le titre`), liste déroulante (`Page`), segmenté à icônes (`Alignement`), pastilles (couleurs) ; un `<select>` pour 2 valeurs (Recto/Verso) ;
- **état courant invisible quand c'est replié** : impossible de voir en un coup d'œil « Hauteur : proportion 2:1, fond : aucun ».

| Élément | Cartes | Problèmes | Piste |
|---|---|---|---|
| Document (rien de sélectionné) | 1 texte d'aide | Écran vide inutile ; renvoie vers « Édition » | Y mettre les réglages du document (nom, thème, densité) ou un raccourci vers eux |
| Header | Texte, Couleurs, Image, Logo | 3 éditeurs de texte riches empilés (~400 px) avant les couleurs ; bibliothèque d'images avec 3 mini-boutons par vignette (nommer/remplacer/supprimer) | Texte en champs simples + riche à la demande ; actions de vignette au survol |
| Section | Section, Fond, Cadre | « Fond de la section » (1 réglage) et « Cadre » (fond + contour + hachures) séparés alors que ce sont des fonds ; 4 interrupteurs de filets mélangés au titre | Fusionner Fond + Cadre ; groupe « Filets » à part |
| Sous-section | Sous-section, Fond et contour | « Colonnes » (gabarit) noyé entre titre et « Déplacer vers la section » | Gabarit de colonnes en tête, déplacement dans les actions |
| Colonne texte | Contenu, Textes libres, Chiffre à côté, Hauteur, Disposition, Fond | Éditeur riche dans « Contenu » avec un `<select>` de type au-dessus : changer le type est un geste rare mais premier | Type de contenu dans la tête (pastille cliquable) |
| Colonne image | idem | 7 champs de taille conditionnels qui apparaissent/disparaissent (le panneau saute) | Réserver la hauteur ou grouper « Taille » |
| Colonne carte | Contenu + « Options de la carte » (`<details>`, 12 cases) | Un `<details>` dans une carte repliable : deux niveaux de repli différents ; 12 cases à cocher à plat | Interrupteurs groupés par thème (image, icône, texte) |
| Colonne chiffre clé | Contenu (tous les champs) | Formulaire long sans groupes | Groupes Chiffre / Texte / Icône / Barre |
| Colonne dataviz | Contenu (select + bouton), Textes libres, Hauteur, Disposition, Fond | Quatre cartes pour un seul vrai réglage (l'éditeur) ; **la hauteur est dans le panneau ET dans l'éditeur** ; « Type de dataviz » est aussi dans l'éditeur | Un résumé de la dataviz (miniature + type) et un grand bouton « Modifier la dataviz » ; hauteur gardée ici (raison : se règle en contexte de page) |

### Pistes transversales (par ordre de rentabilité)
1. **Tête collante** : pastille d'icône du type, nom, fil d'Ariane, et **rangée d'actions** (précédent/suivant, échanger, dupliquer, supprimer) avec info-bulles. Les actions passent du bas (invisible) au haut (toujours visible). → maquette `#colonne-B`
2. **Cartes repliées par défaut avec résumé de la valeur** (« Hauteur · Proportion 2:1 ») ; **une seule ouverte à la fois** (comportement accordéon) ; la première reste ouverte.
3. **« Avancé »** : textes libres, chiffre à côté, hachures, filets… regroupés sous un séparateur.
4. **Zones cohérentes** : un seul contrôle par type de choix (interrupteur = afficher/masquer ; segmenté = 2–4 valeurs courtes ; liste = 5+ valeurs).
5. **Étiquettes courtes + aide « ? »** : déplacer les consignes (« vide = masqué », « taille fixe ») dans les textes d'aide existants (`help.js`).
6. **Pas de saut de mise en page** : champs conditionnels grisés plutôt que retirés quand c'est possible.
7. **Alternative** : onglets Contenu / Mise en page / Style → maquette `#colonne-C` (plus calme, mais un clic de plus pour changer de sujet).

## 2. Éditeur de dataviz — deux panneaux, deux largeurs

Constat (captures `ve-a`, `ve-b` du 5 nov.) :
- **Largeurs incohérentes** : onglet Visualisation = 360 px ; onglet Données = 48 % de l'écran (`.ve-body.data`). En changeant d'onglet l'aperçu saute de 1 200 px à 800 px, les onglets et le sélecteur de type changent de place.
- **Hiérarchie inversée** : le choix du *type* est au-dessus des onglets (réglage global), et les onglets sont *dans* le panneau, donc ils bougent avec lui.
- **L'aperçu disparaît dans Données** : on édite un tableau sans voir le résultat à l'échelle ; le tableau, lui, est coincé dans 48 % de large avec une colonne « Couleur » qui se casse sur deux lignes.
- **Premier écran de Visualisation gaspillé** : « Titre et source » (3 éditeurs riches avec barres d'outils) occupe tout l'écran avant d'arriver aux couleurs et aux options.
- **Barre du haut mélangée** : historique, largeur d'aperçu, zoom, Annuler/Terminer sur la même ligne ; la largeur et le zoom concernent l'aperçu, pas l'éditeur ; « Terminer » et l'onglet actif ont la même couleur (rouge), donc le regard hésite.
- **Texte d'aide en bandeau** (« Les modifications du formulaire s'appliquent en direct. ») : bruit permanent.

### Pistes (maquettes `#editeur-A` à `#editeur-D`)
| | Idée | Pour | Contre |
|---|---|---|---|
| A | Actuel | — | cf. ci-dessus |
| B | Panneau fixe 340 px, onglets dans le panneau, à gauche | Largeur identique, petit changement | Onglets toujours dans le panneau ; tableau et panneau ne s'alignent pas sur le modèle Flourish |
| **C** | **Flourish, panneau à droite** : onglets « Aperçu \| Données » au centre de la barre ; panneau de 320 px à droite dans les deux | Même largeur, onglets stables, même côté que les propriétés de l'app (mémoire musculaire), type de graphique en tête du panneau Aperçu ; Données = tableau pleine largeur + panneau (import, colonnes à représenter, **aperçu miniature**) | Deuxième écran de changement : « Titre et source » devient une section repliable |
| D | Idem à gauche | Proche de l'éditeur actuel | Inverse des propriétés de l'app (droite) |

**Recommandation : C.** Le panneau de droite est déjà celui des propriétés dans l'éditeur principal ; l'éditeur de dataviz en hérite sans réapprendre.

### Détails de la piste C
- **Barre** : à gauche titre + annuler/rétablir ; au centre les onglets ; à droite Annuler / Terminer. « Largeur » et « Zoom » descendent dans une petite barre au-dessus de l'aperçu.
- **Aperçu** : aperçu en grand ; panneau = type (liste déroulante avec icône) puis sections en accordéon (une seule ouverte), état courant en résumé quand c'est replié.
- **Données** : le tableau prend la largeur restante ; le panneau garde import/export, « colonnes à représenter » (pastilles de couleur comme les en-têtes du tableau), et un aperçu miniature avec le choix de largeur.
- **Titre et source** : champs simples (un champ chacun) ; l'éditeur riche s'ouvre dans la section au besoin.
- **Contrainte technique** : `vizeditor.js` gère déjà les deux onglets (`tab`, `buildForm`) ; le déplacement des onglets dans la barre et la largeur unique sont surtout du CSS (`.ve-body`) ; la miniature réutilise `renderVizFull`.

## 3. Points hors sujet relevés
- Les `<select>` natifs restent partout ; sur macOS ils sont gros et sans icône (le Labo a `richSelect` pour ça).
- Les consignes très longues dans les étiquettes (« Dataviz title (optional) — paragraph styles… ») cassent la grille de 12 px des labels.

## 4. À trancher
1. Piste C (recommandée), ou B/D ?
2. Panneau colonne : B (accordéon + résumés) ou C (onglets) ?
3. Fait-on la tête collante avec actions pour tous les éléments (header, section, sous-section) ?
