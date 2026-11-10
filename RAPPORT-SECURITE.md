# Rapport de sécurité — dépôt `gsc-tools`

Date de l'audit : 2026-11-10. Lecture seule, aucune requête réseau externe, `npm audit` non lancé (il a besoin d'internet).

## 0. Ce que contient vraiment ce dépôt

**Point important : ce dépôt ne contient aucun outil Google Search Console.** « GSC » signifie ici *Graphic Studio / GSC tools* (outils de design), pas Search Console. Je n'ai trouvé ni API Google, ni OAuth, ni export CSV de Search Console. Les points 2 et 4 de ta demande sont donc surtout « sans objet ». Si tu pensais à un autre dépôt, dis-le-moi (voir les questions, section 6).

| Outil | Ce qu'il fait |
|---|---|
| **Factsheet creator** (`factsheet/`) | Éditeur de fiche A4 recto-verso avec graphiques, export PDF. Un « Atelier » publie images et projets dans le dépôt via l'API GitHub. |
| **PEC organigramme** (`organigramme/`) | Fabrique un organigramme A4 et l'exporte en PDF CMJN. |
| **Donut export** (`donut/`) | Fabrique un graphique en anneau, exporté en PNG/JPG. |
| **Europa 3D** (`europa/`) | Maquette 3D de la lanterne d'un bâtiment (three.js). |
| **Batch Logo Export** (`illustrator/`) | Page qui explique et fait télécharger un script Illustrator. |

Tout est du JavaScript statique, sans serveur ni base de données. Les données restent dans ton navigateur. Le site est publié sur GitHub Pages à chaque push sur `main`.

---

## 1. Verdict

**Risque global : FAIBLE.** Aucun secret, aucune donnée réelle, pas de serveur à attaquer, et le code qui affiche du texte est correctement protégé.

À faire en premier :
1. Donner une **date d'expiration** au jeton GitHub de l'Atelier (et le retirer du navigateur quand tu ne t'en sers pas) : c'est la seule chose vraiment sensible.
2. Ne **publier sur Pages que ce qui sert** (aujourd'hui tout le dépôt est en ligne : docs, tests, config).
3. Ajouter une **politique de sécurité (CSP)** et figer/vérifier les fichiers chargés depuis internet.

---

## 2. Tableau récapitulatif

| # | Problème | Gravité | Effort |
|---|---|---|---|
| 1 | Secrets dans le code et l'historique git | ✅ OK (aucun trouvé) | – |
| 2 | Données Search Console / données réelles | ✅ OK (aucune) | – |
| 3 | `.gitignore` très court | 🟡 mineur | 5 min |
| 4 | Injection de code via le texte (XSS) | ✅ OK, 1 point à surveiller | – |
| 5 | Jeton GitHub de l'Atelier stocké en clair dans le navigateur | 🟠 important | 5 min |
| 6 | Pas d'authentification Google / client secret | ✅ OK (sans objet) | – |
| 7 | Fichiers chargés depuis des CDN sans empreinte (`integrity`) | 🟡 mineur | 1 h |
| 8 | Fichiers du design-system copiés automatiquement vers la prod | 🟡 mineur | 1 h |
| 9 | Dépendances npm : à auditer (non lancé) | 🟡 à vérifier | 5 min |
| 10 | Import d'un projet JSON piégé : images distantes, plantage | 🟡 mineur | 1 h |
| 11 | Polices Google : l'IP des visiteurs part chez Google | 🟡 mineur | 1 h |
| 12 | Aucune Content Security Policy | 🟡 mineur | 1 h |
| 13 | Tout le dépôt est publié sur GitHub Pages | 🟡 mineur | 5 min |
| 14 | Actions GitHub référencées par étiquette (`@v4`), pas par empreinte | 🟡 mineur | 1 h |
| 15 | Stockage local : contenu et sauvegarde | ✅ OK | – |
| 16 | Destinations réseau | ✅ OK | – |

---

## 3. Détail des problèmes

### 1. Secrets (clés, jetons, mots de passe) — ✅ OK
- **Ce que j'ai fait** : recherche des formats connus (Google `AIza…`, GitHub `ghp_…` / `github_pat_…`, `sk-…`, AWS, clés privées) dans les fichiers actuels **et** dans tout l'historique git (51 commits, tous les fichiers, y compris supprimés).
- **Résultat** : rien trouvé. Aucun fichier supprimé dans l'historique, aucun `.env`, `.pem`, `credentials`.
- **Limite** : ma recherche repose sur des formats connus. Un mot de passe « maison » sans format reconnaissable pourrait m'échapper. Je n'en ai pas vu.
- Pour une vérification officielle et gratuite, GitHub propose « Secret scanning » (Settings > Code security) si le dépôt est public.

### 2. Données sensibles — ✅ OK
Aucun fichier CSV/JSON de données réelles (les seuls JSON sont `version.json`, `design-tokens.json`, `package*.json`, des réglages). Le dossier `factsheet/projects/` ne contient aucun projet publié. Le dossier `factsheet/assets/` contient 6 images (PNG/SVG) : **vérifie à l'œil qu'aucune ne montre une information confidentielle**, car elles sont publiques sur le site.

### 3. `.gitignore` — 🟡 mineur
- **Ce qui se passe** : il n'ignore que `node_modules/` et les résultats de tests. Si un jour tu déposes par erreur un `.env`, un export CSV ou un fichier de clé dans le dossier, git le prendra.
- **Exemple** : tu fais un test avec un export, tu fais « tout ajouter » et il part en ligne.
- **Où** : `.gitignore`.
- **Correction** : ajouter à la fin :
  ```
  .env
  .env.*
  *.pem
  *.key
  *.csv
  *.p12
  *credentials*
  *secret*
  .DS_Store
  ```
  (Si tu as besoin d'un CSV dans le dépôt, ajoute une exception `!nom.csv`.)

### 4. Injection de code via le texte (XSS) — ✅ OK
- **Explication simple** : si un outil affiche du texte tapé ou importé « tel quel » dans la page, un texte piégé comme `<img onerror=…>` pourrait faire exécuter du code. J'ai vérifié les 43 endroits qui utilisent `innerHTML` (et équivalents) dans les sources.
- **Ce qui est bien fait** :
  - `factsheet/src/viz/util.js:482-515` (`inlineMk`) : tout texte passe d'abord par un échappement de `&`, `<`, `>`, puis seules des balises connues (gras, italique, lien…) sont recréées. C'est la bonne méthode.
  - Les liens `{a:adresse|texte}` n'acceptent que `http://`, `https://`, `mailto:` (`util.js:470`, `:495-498`), donc pas de `javascript:`.
  - `donut/donut-export.html:784, 856-859` : échappement avant `innerHTML`.
  - Les autres `innerHTML` sont soit `= ''` (vider), soit du texte écrit en dur par toi (`labo-text.js:1475`, `labo-select.js:39`, `europa-3d.html:608,659`).
  - SVG importés : `cleanSvgTree` (`factsheet/src/viz/picto.js:28-44`) retire scripts, `foreignObject`, `onclick…`, liens et images distantes, et est rappelé à chaque affichage.
  - L'organigramme n'utilise **aucun** `innerHTML` (règle vérifiée par `scripts/verifier.mjs`) et ne garde que les images `data:image/` (`organigramme/js/model.js:69`).
  - Aucun `eval`, `new Function`, `document.write`, `srcdoc` dans les sources.
- **Point à surveiller (🟡, pas une faille prouvée)** : dans `inlineMk`, les remplacements gras/italique (`**`, `__`, `~~`…) sont appliqués après la création des liens, donc aussi à l'intérieur de l'adresse d'un lien. Je n'ai pas trouvé de façon d'en sortir (aucun guillemet n'est créé), mais c'est un endroit à ne pas modifier à la légère. Je ne l'ai pas testé avec un navigateur.

### 5. Jeton GitHub de l'Atelier — 🟠 important
- **Ce qui se passe** : pour publier des images et des projets, l'Atelier te fait coller un « jeton personnel » GitHub. Il est gardé **en clair** dans le `localStorage` du navigateur (clé `gsc-tools-github-token`).
- **Pourquoi c'est sensible** : ce jeton peut écrire sur `main`, et `main` = le site en production. Qui le volerait pourrait publier n'importe quoi sur ton site, y compris du code malveillant.
- **Exemple concret** : une extension de navigateur douteuse, ou quelqu'un qui utilise ton ordinateur ouvert, lit le jeton et modifie ton site.
- **Ce qui est bien** : il est masqué à la saisie (`type: 'password'`), exclu de l'export JSON (`js/shell.js:9`, préfixes ne le contenant pas) et la page demande un jeton limité à ce dépôt (`atelier.js:108`).
- **Où** : `factsheet/src/github.js:8-19`, `factsheet/src/atelier.js:96-108`.
- **Comment corriger** :
  1. Sur GitHub, crée le jeton avec une **expiration courte** (30 jours) et **uniquement ce dépôt**, permission « Contents : Read and write », rien d'autre.
  2. Clique « Retirer le jeton » dans l'Atelier quand tu as fini.
  3. Vérifie sur https://github.com/settings/personal-access-tokens que tu n'as pas d'anciens jetons oubliés, et supprime-les.
  4. Optionnel : active l'authentification à deux facteurs sur ton compte GitHub (si ce n'est pas fait).

### 6. Authentification Google — ✅ OK (sans objet)
Aucun login Google, aucun OAuth, aucun client ID/secret, aucune API Google dans le code. Seuls les **polices Google Fonts** sont chargées (voir point 11). Le « scope » demandé est donc nul : rien de trop large.

### 7. Fichiers chargés depuis des CDN sans empreinte — 🟡 mineur
- **Ce qui se passe** : les pages chargent des fichiers depuis internet. Le navigateur leur fait confiance sans pouvoir vérifier qu'ils sont intacts (l'attribut `integrity`, une « empreinte », est absent partout).
  - Icônes Tabler : `cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.19.0/…` — **version figée** ✅ mais sans `integrity` (`index.html:12`, `donut/…:13`, `illustrator/…:12`, `organigramme/…:13`, `factsheet/index.html:11`, `labo.html:11`, `atelier.html:11`).
  - three.js : `cdn.jsdelivr.net/npm/three@0.160.0/…` — figé ✅, sans `integrity` (`europa/europa-3d.html:68`).
  - Polices : `fonts.googleapis.com` (impossible à figer).
  - Aucune version `latest` ou flottante ✅. pdf-lib et fontkit sont **copiés dans le dépôt** (`organigramme/vendor/`) ✅, et three/pdf-lib du Factsheet sont embarqués dans les fichiers générés.
- **Exemple** : si jsDelivr était piraté, du code étranger tournerait dans tes pages. Risque très faible, mais l'attaque existe.
- **Correction** : le plus robuste et le plus simple est de **copier** les icônes Tabler (CSS + police) et three.js dans le dépôt (comme pdf-lib) ; sinon ajouter `integrity="sha384-…"` + `crossorigin="anonymous"` à chaque `<link>` (je peux calculer les empreintes sur demande, mais cela demande du réseau).

### 8. Fichiers du design-system copiés automatiquement — 🟡 mineur
- **Ce qui se passe** : au début de chaque session de travail, `scripts/sync-design-system.sh` télécharge `app-update.js`, `mobile.css`, des tokens et les conventions depuis `supershivas/design-system` (branche `main`) et les écrase dans ce dépôt. `js/app-update.js` est chargé par toutes les pages en production.
- **Exemple** : si le compte GitHub `supershivas` ou ce dépôt voisin était piraté, le code malveillant arriverait ici puis en ligne au prochain push, sans relecture.
- **Où** : `scripts/sync-design-system.sh:15-38`, `.claude/settings.json` (hook SessionStart).
- **Correction** : ce risque vient du fait que tu contrôles les deux dépôts. Il suffit de **relire le `git diff` de ces fichiers avant de pousser** (surtout `js/app-update.js`) et de protéger ton compte avec la double authentification. Option : épingler un commit précis dans `BASE_URL` plutôt que `main`.

### 9. Dépendances npm — 🟡 à vérifier
- **Ce que j'ai vu** (`factsheet/package.json`, `package-lock.json`) : tout est en `devDependencies` (outils de fabrication, pas installés chez les visiteurs), mais `three` (0.170.0), `pdf-lib` (1.17.1), `d3-hierarchy`, `d3-sankey` (0.12.3) sont **embarqués dans** `app.js`, `viewer3d.js`, `pdfexport.js` et donc servis. Le fichier de verrouillage fige les versions ✅.
- **Non vérifié** : je n'ai pas lancé `npm audit` (il interroge un serveur externe, tu m'avais demandé de ne rien appeler hors du dépôt). Je ne peux donc pas affirmer qu'il n'y a pas de vulnérabilité connue. `pdf-lib` 1.17.1 n'est plus mise à jour depuis 2021 : ce n'est pas une faille en soi, mais à garder en tête.
- **Correction** : dis-moi « oui, lance npm audit » et je le fais, ou lance toi-même `cd factsheet && npm audit --omit=dev`. GitHub peut aussi surveiller seul (Settings > Code security > Dependabot alerts, gratuit).

### 10. Import d'un fichier piégé — 🟡 mineur
- **Ce qui se passe** : on peut ouvrir un projet `.json` (menu Fichier), des palettes, des données de graphiques (CSV/JSON).
  - Projet : on vérifie seulement la présence de `sections` puis `migrate` (`factsheet/src/editor/project-file.js:34-36`). Un fichier piégé peut contenir des images avec une adresse internet (`https://…`) : elles sont chargées à l'ouverture (`factsheet/src/render.js:105,121,202`). L'expéditeur du fichier saurait alors que tu l'as ouvert et ton adresse IP (un « pixel espion »).
  - Données de graphique : `fileToMatrix` (`factsheet/src/vizdata.js:44-52`) plante sur un JSON mal formé (ligne non-tableau, valeur `null`) ; il y a un message d'erreur côté appelant à vérifier, mais **pas de limite de taille**, donc un énorme fichier peut figer l'onglet.
  - Positif : l'organigramme refuse les images qui ne sont pas `data:image/` (`organigramme/js/model.js:69`) et les SVG importés sont nettoyés. Pas d'exécution de code via un fichier : c'est du plantage ou de la fuite d'IP, pas du piratage.
- **Exemple** : tu ouvres un projet reçu par mail d'un inconnu ; il charge une image depuis son serveur.
- **Correction** : n'ouvre que des fichiers de source sûre ; côté code, ne garder que les `src` commençant par `data:image/` ou `assets/`, ajouter une limite de taille avant `JSON.parse`.

### 11. Polices Google — 🟡 mineur
`fonts.googleapis.com` / `fonts.gstatic.com` reçoivent l'adresse IP de chaque visiteur (sujet RGPD en Europe). Rien de grave pour un outil interne. **Correction** : héberger les polices dans le dépôt (les fichiers Source Sans/Serif y sont déjà pour le PDF).

### 12. Aucune Content Security Policy — 🟡 mineur
- **Ce qui se passe** : une CSP est une règle qui dit au navigateur « n'exécute que du code venant de ces adresses ». Aucune page n'en a (`grep` sur tous les `.html`).
- **Pourquoi c'est utile ici** : si une faille d'injection existait un jour, la CSP limiterait les dégâts, notamment le vol du jeton du point 5.
- **Correction** : ajouter dans le `<head>` de chaque page, à adapter outil par outil (les scripts en ligne de `factsheet/index.html:40-46` et l'`importmap` d'Europa demandent un réglage) :
  ```html
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net; font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net; img-src 'self' data: blob:; connect-src 'self' https://api.github.com">
  ```
  À tester page par page : trop strict, elle casse l'outil. Je peux le faire une page à la fois.

### 13. Tout le dépôt est publié — 🟡 mineur
- **Ce qui se passe** : `.github/workflows/pages.yml:27` publie `path: .`, donc **tout** : `CLAUDE.md`, `factsheet/docs/`, `tests/`, `.claude/settings.json`, `package.json`, etc. sont lisibles sur `supershivas.github.io/gsc-tools/…`.
- **Exemple** : quelqu'un lit tes notes internes (`plan-dette-technique.md`, audits) ou la structure de ton projet.
- **Ce n'est pas un secret** : j'ai vérifié qu'aucun fichier n'en contient. Mais c'est du bruit inutile.
- **Correction** : copier seulement ce qui sert dans un dossier avant publication (étape `rsync` ou `cp` ciblée, puis `path: _site`) ; je peux écrire le workflow.
- Remarque : si le dépôt est **public**, le code et l'historique sont lisibles par tous de toute façon.

### 14. Actions GitHub par étiquette — 🟡 mineur
`actions/checkout@v4`, `deploy-pages@v4`, etc. : l'étiquette peut être déplacée par leur auteur. Pour des actions officielles GitHub, le risque est très faible. Les permissions sont bien limitées (`contents: read`, `pages: write` seulement pour le déploiement) ✅ et le workflow de tests n'utilise aucun secret ✅, donc une pull request malveillante ne peut rien voler.

### 15. Stockage local — ✅ OK
Clés utilisées : `factsheet-creator-v1` (ton document, images en `data:` possibles), `pec-organigramme-v1`, `donut-export-v1`, préférences (`factsheet-creator-lang`, `…-pdf-profile`) et le jeton (point 5). Aucune donnée Search Console, aucun mot de passe. L'export JSON des réglages n'inclut pas le jeton. Avertissement affiché si le stockage est plein.

### 16. Destinations réseau — ✅ OK
Toutes les requêtes du code : le site lui-même (`version.json`, polices PDF, profil ICC), `api.github.com` (uniquement l'Atelier, avec ton jeton, `factsheet/src/github.js:6`), `fonts.googleapis.com`, `fonts.gstatic.com`, `cdn.jsdelivr.net`. Pas de formulaire, pas de WebSocket, pas de `sendBeacon`, pas d'analytics, pas de domaine inattendu. Pas de service worker (`js/app-update.js` en vérifie seulement la présence).

---

## 4. Ce qui est bien fait (à ne pas changer)

- Aucun secret ni donnée réelle dans le code ou l'historique.
- Protection systématique contre l'injection de code dans le texte (`inlineMk`, `esc`, `cleanSvgTree`, liste blanche de types de liens).
- Organigramme : pas de `innerHTML`, uniquement des images `data:image/`, règle contrôlée automatiquement.
- Jeton GitHub : droits fins demandés, champ masqué, jamais exporté, `rel="noopener"` sur le lien externe.
- Versions des CDN figées, pas de `latest`. Bibliothèques PDF copiées dans le dépôt.
- `package-lock.json` présent. Workflows avec permissions minimales et sans secret.
- Pas de service worker, pas d'analytics, pas d'envoi de données à un tiers.
- Aucune fenêtre `alert/confirm/prompt` du navigateur (modales maison).

## 5. Actions priorisées

**À faire aujourd'hui**
- [ ] Vérifier les jetons GitHub actifs, supprimer les inutiles, créer un jeton avec expiration 30 jours, limité à ce dépôt (point 5)
- [ ] Activer la double authentification sur le compte GitHub si ce n'est pas fait
- [ ] Ajouter les lignes de sécurité au `.gitignore` (point 3)
- [ ] Regarder les 6 images de `factsheet/assets/` : aucune ne doit être confidentielle

**Cette semaine**
- [ ] Lancer `npm audit --omit=dev` dans `factsheet/` (ou me demander de le faire) et activer Dependabot (point 9)
- [ ] Ne publier sur Pages que les fichiers utiles (point 13)
- [ ] Relire le diff de `js/app-update.js` après chaque synchronisation du design-system (point 8)

**Plus tard**
- [ ] Ajouter une Content Security Policy page par page (point 12)
- [ ] Copier Tabler, three.js et les polices dans le dépôt, ou ajouter `integrity` (points 7 et 11)
- [ ] Refuser les images distantes et limiter la taille dans les imports (point 10)
- [ ] Épingler les actions GitHub par empreinte (point 14)

## 6. Questions

1. **Le bon dépôt ?** Tu m'as parlé d'outils Google Search Console ; ce dépôt n'en contient pas. Existe-t-il un autre dépôt (ou un dossier non poussé) à auditer ?
2. **Le dépôt `supershivas/gsc-tools` est-il public ou privé ?** Je ne peux pas le voir d'ici sans réseau. Public = tout (code, historique, docs) est lisible par tous.
3. **Le jeton GitHub de l'Atelier :** quelle durée et quel périmètre a-t-il aujourd'hui ? Je ne peux pas le savoir depuis le code.
4. **Qui ouvre les outils ?** Que toi, ou aussi des collègues/clients ? Cela change l'importance des points 10, 11 et 12.
5. **Les images de `factsheet/assets/`** sont-elles toutes destinées à être publiques ?

---

*Rien n'a été corrigé. Dis-moi quelles corrections tu veux appliquer et je les ferai une par une, en commençant par celle que tu choisis.*
