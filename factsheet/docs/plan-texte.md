# Plan — réglages globaux du texte (menu Texte) du Factsheet creator

Décidé le 18 novembre 2026. Objectif : **gagner de la place rapidement quand le contenu dépasse, sans changer le dessin** du gabarit. Le menu **Texte** de l'en-tête règle tout le texte du document en un geste.

## Décisions

| Question | Décision |
|---|---|
| Les dataviz et les chiffres clés suivent-ils l'échelle ? | **Oui**, et chaque type de colonne (Textes, Chiffres clés, Cartes, Dataviz, Tableaux) peut en être exclu : « Appliquer aux », tous cochés par défaut. |
| Le header ? | **Jamais touché** : surtitre, titre et sous-titre gardent leurs styles (ni échelle, ni réglage par style). |
| Grille de l'interlignage | **1,5 px** (demi-unité) : gain plus fin. Marges et écarts restent sur 3 px. |
| Une échelle par page ? | **Non** : une seule pour tout le document. |

## Modèle

`doc.textSet = { scale, lead, hyph, styles }` (normalisé par `textSetOf`, `tokens.js` ; écrit par `migrate`, absent = gabarit) :

- `scale` : 0,5–1,5, multiplie le corps de tous les styles (`TYPE`) ; corps au 0,1 pt ;
- `lead` : crans d'interlignage de 1,5 px (0 normal, −1 serré, −2 très serré) ;
- `hyph` : césure automatique dans tous les textes courants (langue = celle du format des nombres) ;
- `styles` : `{ [clé de TYPE]: { size (pt), lh (px) } }`, seulement les clés de `TEXT_STYLE_KEYS` (styles de paragraphe) ; un corps sans interlignage garde la proportion du gabarit (`baseType`). L'échelle et les crans s'appliquent ensuite.

Interlignage = `arrondi(lh × scale, 1,5 px) + lead × 1,5 px`, jamais sous le corps. À l'échelle 1 sans cran, `typeOf` rend exactement `TYPE` (captures de référence inchangées).

Chemins : `cssVars(…, doc.textSet)` → variables `--t-*` (paragraphes, tableaux, cartes, titres de dataviz) et `--t-scale` / `--t-lead` ; tailles et interlignages saisis à la main (`applyAdv`) en `calc(… * var(--t-scale))` arrondis par `round(…, 1.5px)` ; JS de rendu : `rc.type` (`renderCtx`). L'export PDF lit les styles calculés : rien à faire de son côté.

## Phases

1. **Menu Texte** (fait, v1.122.0 ; header retiré en v1.123.0) : taille de tous les textes (100 / 95 / 90 / 85 / 80 %, Autre…), interlignage (normal, serré, très serré), césure partout, réinitialisation. Suivent : paragraphes, tableaux, cartes, titres et sources de dataviz, chiffres clés (`figure.js` lit `rc.type`).
2. **Fenêtre « Styles de paragraphe… »** (fait, v1.123.0, `editor/textstyles-ui.js`) : fenêtre ancrée à droite, la page reste visible ; un style par ligne groupé comme `PSTYLES` (pas de header ; les styles des graphiques viendront avec la phase 3) ; corps et interlignage par style, taille de tous les textes, crans, césure, nombre d'usages dans la page, ligne surlignée si modifiée, retour au gabarit par style et pour tout ; place dans le recto et le verso en direct ; brouillon dessiné par `ctx.previewAs` (le document ne change pas), « Appliquer » = une seule étape d'historique, Échap / Annuler = rien ne change ; signal sous 8 pt (texte) / 6 pt (légende, étiquette, source, note).
3. **Dataviz et « Appliquer aux »** (fait, v1.124.0) : texte SVG des graphiques (`viz/*.js` : `const T = typeIn(env)` dans chaque `render` ; `drawLegend`, `layoutLegend`, `classBarHeight`, `typePx` reçoivent `T`) ; anneau : corps et interlignage des textes à la proportion du texte courant. Les cotes des graphiques (`VIZ` : hauteur de légende, rangée des catégories…) ne bougent pas. `textSet.skip` = types de colonne exclus (`TEXT_SKIP_KEYS`) : `renderCol` donne à la colonne `rc.plain` (`renderCtx`, styles du gabarit) et les variables `typeVars(null)`, classe `ts-off` (pas de césure) ; éditeur de dataviz, export d'une dataviz et éditeur de tableau : `rc.forType(type)` et `textSetFor(textSet, type)`. Cases dans le menu Texte et la fenêtre des styles.
4. **« Ajuster pour tenir »** (plus grande échelle, par pas de 2,5 %, plancher 80 %, où recto et verso tiennent ; s'appuie sur `r.overflows`) et bouton **« Gagner de la place »** dans les avertissements de débordement (Densité serrée → interlignage serré → 95 % → 90 %…).

## Pistes écartées pour l'instant

- Approche (tracking) globale : gain réel mais altère le gris typographique.
- Échelle par page : incohérence entre recto et verso.
