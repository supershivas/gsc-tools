# Plan — réglages globaux du texte (menu Texte) du Factsheet creator

Décidé le 18 novembre 2026. Objectif : **gagner de la place rapidement quand le contenu dépasse, sans changer le dessin** du gabarit. Le menu **Texte** de l'en-tête règle tout le texte du document en un geste.

## Décisions

| Question | Décision |
|---|---|
| Les dataviz et les chiffres clés suivent-ils l'échelle ? | **Oui** (case « Inclure les graphiques », cochée par défaut, en phase 3). |
| Le header est-il exclu ? | **Non** : il suit l'échelle comme le reste. Sa hauteur (240 px) ne bouge pas. |
| Grille de l'interlignage | **1,5 px** (demi-unité) : gain plus fin. Marges et écarts restent sur 3 px. |
| Une échelle par page ? | **Non** : une seule pour tout le document. |

## Modèle

`doc.textSet = { scale, lead, hyph }` (normalisé par `textSetOf`, `tokens.js` ; écrit par `migrate`, absent = gabarit) :

- `scale` : 0,5–1,5, multiplie le corps de tous les styles (`TYPE`) ; corps au 0,1 pt ;
- `lead` : crans d'interlignage de 1,5 px (0 normal, −1 serré, −2 très serré) ;
- `hyph` : césure automatique dans tous les textes courants (langue = celle du format des nombres).

Interlignage = `arrondi(lh × scale, 1,5 px) + lead × 1,5 px`, jamais sous le corps. À l'échelle 1 sans cran, `typeOf` rend exactement `TYPE` (captures de référence inchangées).

Chemins : `cssVars(…, doc.textSet)` → variables `--t-*` (paragraphes, header, tableaux, cartes, titres de dataviz) et `--t-scale` / `--t-lead` ; tailles et interlignages saisis à la main (`applyAdv`) en `calc(… * var(--t-scale))` arrondis par `round(…, 1.5px)` ; JS de rendu : `rc.type` (`renderCtx`). L'export PDF lit les styles calculés : rien à faire de son côté.

## Phases

1. **Menu Texte** (fait, v1.122.0) : taille de tous les textes (100 / 95 / 90 / 85 / 80 %, Autre…), interlignage (normal, serré, très serré), césure partout, réinitialisation. Suivent : paragraphes, header, tableaux, cartes, titres et sources de dataviz, chiffres clés (`figure.js` lit `rc.type`).
2. **Fenêtre « Styles de paragraphe… »** : panneau ancré à droite (aperçu visible), un style par ligne groupé comme `PSTYLES` (+ Dataviz, Header) ; corps et interlignage par style (`doc.textSet.styles[clé] = { size, lh }`), nombre d'usages, point « modifié », retour au défaut par style et pour tout ; état du débordement en direct ; une seule entrée d'historique ; avertissement sous 8 pt (texte) / 6 pt (source, note).
3. **Dataviz** : texte SVG des graphiques (`viz/*.js`, `viz/util.js` : légendes, axes, valeurs, « +64 % ») lu par `env.rc.type` au lieu de `TYPE` ; case « Inclure les graphiques » ; test d'isolation avec deux échelles.
4. **« Ajuster pour tenir »** (plus grande échelle, par pas de 2,5 %, plancher 80 %, où recto et verso tiennent ; s'appuie sur `r.overflows`) et bouton **« Gagner de la place »** dans les avertissements de débordement (Densité serrée → interlignage serré → 95 % → 90 %…).

## Pistes écartées pour l'instant

- Approche (tracking) globale : gain réel mais altère le gris typographique.
- Échelle par page : incohérence entre recto et verso.
