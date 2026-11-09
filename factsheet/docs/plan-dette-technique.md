# Plan de dette technique — Factsheet creator

Issu de l'audit du 9 novembre 2026 (v1.69.2 → corrections en v1.70.0). Un prompt par étape, à coller tel quel dans une **nouvelle session**.

## Aide-mémoire

| Session | Étapes | Modèle | Durée estimée | Version |
|---|---|---|---|---|
| A | **0 + 1 + 2** — filet de sécurité, compilation, traductions | Sonnet | 1 session | inchangée (rien de visible) |
| B | **4a** — découper `main.js` | Sonnet | 1 session | inchangée |
| C | **4b** — découper `props.js`, mise en forme des lignes longues | Sonnet | 1 session | inchangée |
| D | **3** — supprimer l'état global du rendu | **Opus** | 1 à 2 sessions | inchangée |
| E | **5** — un seul chemin d'export PDF | **Opus** | 1 session | correctif ou mineure selon le choix |
| F | **6 + 7** — tokens de l'interface, `CLAUDE.md` allégé | Sonnet | 1 session | correctif (6) |

**Ordre conseillé : A → B → C → D → E → F.**

- **A est obligatoire avant tout le reste** : sans les tests, une régression du rendu ou du PDF passerait inaperçue.
- B et C passent avant D : avec des fichiers plus petits, le travail d'Opus sur l'état global est plus sûr.
- F en dernier, parce que chaque étape modifie le `CLAUDE.md` et que l'étape 7 le réécrit.
- On peut regrouper B et C en une seule session si elle reste courte, mais je ne le conseille pas : ce sont deux gros déplacements de code.

**À décider avant de lancer :**

- **Session A** : la phrase « Accord donné pour ajouter `@playwright/test` en dépendance de développement ».
  - Gardez-la si vous êtes d'accord.
  - Sinon, supprimez-la : la session vous demandera l'accord.
- **Session C** : la même chose pour Prettier.
- **Session E** : la session vous posera la question du chemin RVB (le supprimer ou le reproduire avec pdf-lib).

---

## Session A — étapes 0, 1 et 2 (Sonnet)

```
Factsheet creator (dossier factsheet/) : mets en place le filet de sécurité avant un chantier de dette technique.
Lis d'abord CLAUDE.md, .claude/conventions.md et factsheet/docs/plan-dette-technique.md.
Aucun changement visible pour l'utilisateur : ne change pas la version.

Accord donné pour ajouter @playwright/test en dépendance de développement.

Étape 0 — tests de non-régression (factsheet/tests/)
- Un petit serveur statique en Node (module http intégré, pas de dépendance) qui sert la racine du dépôt.
- Un point d'entrée de test compilé par esbuild (factsheet/tests/entry.js → fichier ignoré par git) qui expose dans la page
  defaultDoc, newSection, newSub, newCol (state.js) et newViz, VIZ_TYPES (viz/index.js), pour fabriquer des documents.
- Documents de référence :
  1. le document par défaut ;
  2. un document « caractères » : titre « ŁÓDŹ — ČESKÝ ŘEŠENÍ », sous-titre « Ελλάδα · Україна »,
     1re section du recto sur fond tint-sky, une dataviz avec source ;
  3. trois documents qui contiennent ensemble les 17 types de dataviz (3 par page, recto et verso).
- Pour chaque document :
  - capture de chaque page de l'aperçu, comparée à une capture de référence (toHaveScreenshot) ;
  - export PDF CMJN par window.FSPDF.build(doc, mode, { profile }) (bundle pdfexport.js), en modes net, bleed et marks
    et en profils none, x4 et x1a.
- Contrôles du PDF (relu avec pdf-lib, déjà présent) :
  - nombre de pages ;
  - MediaBox, TrimBox, BleedBox de chaque mode ;
  - en-tête %PDF-1.4 pour x1a, 1.6 pour x4 ;
  - OutputIntent FOGRA39 et /ID présents en x4 et x1a ;
  - aucun ExtGState avec ca/CA < 1 ni aucun /SMask en x1a ;
  - `missing` vide pour le document « caractères » (sans ≥ ni ‰).
- Contrôle du fond perdu : en mode bleed, la limite entre le header et la 1re bande du document « caractères » est à
  180 pt + 8,5 pt du bord (rendu par pdftoppm s'il est disponible, sinon pixel de la capture de la page).
- Contrôle de sécurité : un document dont doc.customIcons contient
  `<image href="x" onerror="window.__pwn=1"/>` ne doit pas exécuter de code (window.__pwn indéfini).
- Aucune erreur dans la console au chargement de factsheet/index.html, labo.html et atelier.html.
- Captures de référence générées sous Linux (comme en CI), avec un seuil de tolérance documenté.
- Dans cet environnement, Chromium est préinstallé : ne lance pas `playwright install` ici.
  En CI, installe Chromium avec `npx playwright install --with-deps chromium`.

Étape 1 — compilation
- Minifie app.js comme les autres bundles (package.json, script build) et vérifie que l'app marche à l'identique.
- Ajoute un script `npm run check` :
  - compile tous les bundles ;
  - échoue si esbuild émet un avertissement (lis la sortie, esbuild n'a pas d'option pour ça) ;
  - échoue si `git diff --exit-code` montre un bundle différent de celui du dépôt.
- Aligne la version de factsheet/package.json : supprime le champ ou mets « 0.0.0-private », pour qu'on ne le confonde
  plus avec version.json qui reste la source unique.

Étape 2 — traductions (src/i18n.js)
- Dans `npm run check`, un script qui échoue si le dictionnaire EN a une clé en double ou une clé qui commence ou finit
  par une espace (la recherche se fait sur le texte nettoyé).
- Dans les tests Playwright, interface en anglais : liste les textes visibles de l'interface (hors .page, champs de
  saisie et .no-i18n) qui contiennent encore du français (accents ou mots français courants), panneaux et fenêtres
  principales ouverts. Ajoute les traductions manquantes trouvées (c'est un correctif visible : dans ce cas seulement,
  incrémente le correctif de version.json et CHANGELOG.md).

CI
- Nouveau workflow .github/workflows/tests.yml (ne touche pas à pages.yml) : npm ci, npm run check, tests Playwright,
  à chaque push et pull request. Les captures en échec sont jointes comme artefacts.

À la fin
- Documente dans factsheet/README.md comment lancer les tests et mettre à jour les captures de référence.
- Ajoute une ligne dans CLAUDE.md (Pièges connus) : « Lancer `npm run check` et les tests avant chaque push du Factsheet
  creator ».
- Commit en français, push selon les conventions, et dis-moi si la CI passe.
```

---

## Session B — étape 4a : découper `main.js` (Sonnet)

```
Factsheet creator : découpe factsheet/src/main.js (≈ 700 lignes, 53 Ko, lignes de plus de 300 caractères)
en modules, sans changer le comportement.
Lis d'abord CLAUDE.md, .claude/conventions.md et factsheet/docs/plan-dette-technique.md.

- Avant de commencer, lance `npm run check` et les tests (factsheet/tests/) : ils doivent passer.
- Extrais au moins :
  - l'historique (record, goTo, describe, panneau Historique) ;
  - le moteur de glisser-déposer (aperçu en direct, TARGETS, TREE_TARGETS, ctx.startTreeDrag) ;
  - les poignées de redimensionnement (dragSplit et ses usages) ;
  - le zoom (zoomJob, Cmd/Ctrl + molette) et l'outil main ;
  - les raccourcis clavier ;
  - l'export (fenêtre d'export, fileStem, loadBundle, aperçu 3D) ;
  - la déclaration des menus (FS_UI).
  main.js ne garde que l'état du document, ctx et l'assemblage.
- Un module = une responsabilité, des dépendances explicites (paramètres ou objet ctx), pas de nouvel état global.
- Déplace le code tel quel : pas de « petites améliorations » au passage. Tu peux couper les lignes trop longues dans
  le code déplacé.
- Après chaque module extrait : npm run build, tests. À la fin, les captures et contrôles PDF doivent être identiques,
  sans mettre à jour une seule capture de référence.
- Teste à la main (Playwright) : glisser une section, annuler/rétablir, zoom molette, poignée entre colonnes, export PDF.
- Version inchangée (rien de visible). Mets à jour les noms de fichiers cités dans CLAUDE.md.
- Commit en français, push selon les conventions.
```

---

## Session C — étape 4b : découper `props.js` et formater (Sonnet)

```
Factsheet creator : découpe factsheet/src/props.js (32 Ko) et rends le code lisible, sans changer le comportement.
Lis d'abord CLAUDE.md, .claude/conventions.md et factsheet/docs/plan-dette-technique.md.

Accord donné pour ajouter Prettier en dépendance de développement.

- Avant de commencer, lance `npm run check` et les tests : ils doivent passer.
- props.js : un module par sorte d'élément.
  - Garde dans un module commun les briques partagées : card, field, swatches, switchRow, la tête collante et
    l'accordéon.
  - Un module par sorte : document, header, section, sous-section, et colonne par type (texte, image, chiffre clé,
    carte, dataviz).
- Prettier :
  - configuration minimale (largeur 140, guillemets simples, points-virgules), appliquée à factsheet/src/ ;
  - fichiers générés exclus (app.js, viewer3d.js, atelier.js, labo.js, pdfexport.js) ;
  - **dans un commit séparé** qui ne contient que le reformatage, pour que l'historique reste lisible ;
  - ajoute `prettier --check` à `npm run check`.
- Les tests doivent passer sans mettre à jour une seule capture de référence.
- Version inchangée. Mets à jour les noms de fichiers cités dans CLAUDE.md.
- Commit en français, push selon les conventions.
```

---

## Session D — étape 3 : supprimer l'état global du rendu (Opus)

```
Factsheet creator : le rendu du document dépend d'un état global modifiable. Supprime-le sans changer un pixel du rendu
ni du PDF.
Lis d'abord CLAUDE.md, .claude/conventions.md et factsheet/docs/plan-dette-technique.md.

État global connu :
- setDensity (src/tokens.js) réécrit GAP et GRID.gutter à chaque rendu ;
- setTypo (src/viz/util.js) réécrit TYPO ;
- renderDocument (src/render.js) affecte iconLib.list (src/viz/icons.js).
Cherche s'il y en a d'autres (variables de module modifiées pendant le rendu, compteurs comme clipN dans viz/picto.js).

Objectif
- Les tokens redeviennent des constantes.
- renderDocument construit un contexte de rendu (écarts selon la densité, gouttière, typographie, bibliothèque d'icônes)
  qui descend par env jusqu'aux dataviz, chiffres clés, cartes et à inlineMk/richText.
- Les fonctions appelées hors rendu doivent recevoir le document ou ce contexte. Par exemple columnWidth (props, hover,
  main), subColWidth/colWidth (qui lisent GRID.gutter), et l'éditeur de dataviz et le Labo, qui rendent aussi.
- Deux rendus de documents différents (densité, typographie, icônes) doivent pouvoir s'enchaîner ou se chevaucher sans
  s'influencer : ajoute un test qui le prouve (par exemple export PDF d'un document « serré » pendant que l'aperçu
  montre un document « large »).

Méthode
- Avant de commencer, lance `npm run check` et les tests : ils doivent passer.
- Avance par petites étapes (une variable globale à la fois), avec build et tests à chaque étape.
- Aucune capture de référence ni aucun contrôle PDF ne doit changer. Si une capture change, c'est une régression :
  corrige-la, ne mets pas la référence à jour.
- Vérifie aussi à la main dans le navigateur : changer de densité, typographie française, icône SVG importée dans
  une dataviz, aperçu 3D, Labo (sujet dataviz), éditeur de dataviz.
- Version inchangée. Mets à jour CLAUDE.md (section Espacement et toute mention de setDensity/setTypo/iconLib).
- Commit en français, push selon les conventions.
```

---

## Session E — étape 5 : un seul chemin d'export (Opus)

```
Factsheet creator : il existe deux exports PDF, maintenus en parallèle.
- « PDF RVB (impression) » : window.print, src/export.js preparePrint, règles .print-bleed et pseudo-éléments
  ::before de css/doc.css pour le fond perdu.
- « PDF CMJN » : src/pdf/pdf.js, pdf-lib.
Le fond perdu y est codé deux fois (un bug corrigé en v1.70.0 existait dans les deux).
Lis d'abord CLAUDE.md, .claude/conventions.md et factsheet/docs/plan-dette-technique.md.

Commence par me poser la question (AskUserQuestion), avec ta recommandation :
- A. supprimer le chemin RVB (window.print) : seul reste le PDF de pdf-lib ;
- B. remplacer window.print par une sortie RVB produite par pdf-lib (même parcours, couleurs DeviceRGB, sans profil),
  ajoutée comme profil « RVB (écran) » dans PDF_PROFILES ;
- C. garder les deux, mais faire dériver le fond perdu CSS des mêmes règles que bleedFor (une seule source).

Puis :
- Avant de commencer, lance `npm run check` et les tests : ils doivent passer.
- Implémente le choix.
  - Si window.print disparaît, retire le code et le CSS devenus inutiles (preparePrint, cleanupPrint, cropMarks,
    #print-root, .print-bleed…).
  - Garde les règles @media print qui masquent la coque (Cmd/Ctrl + P reste possible).
  - Mets à jour la fenêtre d'export (index.html, i18n.js, FR et EN).
- Étends les tests PDF au nouveau profil s'il y en a un.
- Version : mineure si une fonctionnalité visible apparaît ou disparaît, sinon correctif ; CHANGELOG.md lisible par
  un non-développeur.
- Mets à jour CLAUDE.md (Export PDF CMJN, Profils PDF, pièges sur window.print).
- Commit en français, push selon les conventions, URL de production à la fin.
```

---

## Session F — étapes 6 et 7 : tokens de l'interface et CLAUDE.md (Sonnet)

```
Factsheet creator : harmonise l'interface et allège CLAUDE.md.
Lis d'abord CLAUDE.md, .claude/conventions.md, design-tokens.json, css/tokens.css et
factsheet/docs/plan-dette-technique.md.

Étape 6 — interface (factsheet/css/app.css, css/sel.css, css/labo.css ; jamais l'aperçu du document, qui a son propre
système de design)
- Remplace les valeurs codées en dur par des variables :
  - l'orange des poignées #F28C28 (18 occurrences) ;
  - le rouge #b91c1c ;
  - les bleus clairs #eef2ff, #f3f8ff, #e3ecff ;
  - les ombres #0003 et #0004 ;
  - 10 tailles de police (10 à 22 px) → une échelle de 4 ou 5 tailles ;
  - 10 arrondis (3 à 12 px) → les radii du design system.
  Utilise d'abord ce qui existe dans design-tokens.json. Ce qui manque est défini localement dans css/tokens.css et
  proposé en fin de réponse sous la forme « Proposition pour le design system : … ».
- Règle « Rouge = action » (CLAUDE.md) : le choix d'espacement sélectionné (Serré / Actuel / Large) et les jauges de
  remplissage Recto/Verso ne doivent plus être rouges. État sélectionné neutre comme les onglets ; jauge neutre, et
  orange ou rouge seulement si la page déborde.
- Renomme la densité « Actuel » en « Normal » (libellé seulement, la clé `normal` ne change pas ; i18n FR et EN).
- Barre latérale : les titres tronqués (« Key figures … ») gardent leur texte complet en infobulle (title) ; si la place
  le permet, élargis la barre.
- Captures de l'interface avant/après (anglais et français) : montre-les-moi.
- Seules les captures de l'interface peuvent changer, celles des pages du document non.
- Version : correctif, CHANGELOG.md.

Étape 7 — CLAUDE.md (≈ 35 Ko, les conventions demandent un fichier court)
- Garde dans CLAUDE.md : description, stack, structure, exceptions aux conventions, pièges connus, et pour le
  Factsheet creator les règles impératives seulement, en une ligne chacune (ex. « tout nouvel élément visuel doit
  rester lisible par l'export PDF »).
- Déplace les descriptions détaillées des fonctionnalités dans factsheet/README.md (ou factsheet/docs/architecture.md),
  avec un renvoi depuis CLAUDE.md.
- Supprime ce qui est faux ou en double :
  - « cartes … pas encore dans l'éditeur » (elles y sont) ;
  - les deux descriptions des styles de paragraphe ;
  - toute mention de fichiers ou fonctions qui n'existent plus (vérifie chaque nom cité avec une recherche dans le
    code).
- Vise moins de 12 Ko pour CLAUDE.md. Pas de changement de version pour cette étape.

Commits séparés pour 6 et 7, en français, push selon les conventions, URL de production à la fin.
```

---

## Points de l'audit restants (hors dette, à demander quand vous voulez)

- **Teintes trop claires pour l'impression** : la teinte du gris clair sort à 2,8 / 1,8 / 1,4 / 0 et celle du bleu ciel
  à 7 / 2,4 / 0 / 0. Sous environ 5 %, elles risquent de ne pas s'imprimer : prévoir une valeur minimale par couleur.
- **Bloc « dataviz » vide** (`.viz-ph`) : il part dans le PDF si une dataviz échoue, et sa règle CSS est définie deux fois.
- **Logo vectoriel** : le logo par défaut est un PNG de 800 px, rastérisé à 300 ppi dans le PDF ; une version SVG
  serait plus nette.
- **Petits textes bleus** : le bleu 100/80/0/0 est imprimé avec deux encres, un risque de repérage sur du 8 pt.
  À voir avec l'imprimeur.
