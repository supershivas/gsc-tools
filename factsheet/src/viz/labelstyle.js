/* Style des libellés d'une dataviz (noms des lignes, des catégories, des nœuds…).
   Deux niveaux, le second l'emporte :
   - tous les libellés : `opts.names` = { size (pt, 0 = style du document), bold, italic, underline, color ('' = couleur du texte) },
     réglé dans l'aperçu : barre de mise en forme, choix « Tous les libellés » (vizeditor.js) ;
   - un libellé : `item.st` (mêmes clés), posé par la barre de mise en forme au-dessus du libellé cliqué dans l'aperçu
     (vizeditor.js, `data-text` = chemin de l'élément). Une clé absente suit le réglage de tous les libellés.
   La clé de couleur s'appelle `color` : `remapColors` (state.js) et le copier-coller (`COLOR_PROP`, clip.js) la suivent.
   Un libellé stylé ou mis en forme (**gras**, ~~italique~~, {c:clé|…}) passe par `richLines` / `drawRich` ; sinon le dessin
   de chaque type est inchangé (aspect d'origine). */
import { richLines, drawRich, pxOf, labelLh, colorRef } from './util.js';
import { t } from '../i18n.js';

export const ST_KEYS = ['size', 'bold', 'italic', 'underline', 'color'];
const MK = /\*\*|__|~~|\^\^|,,|\{[a-z]+(?::[^|{}]*)?\|/;

/** style effectif d'un libellé : celui de l'élément, sinon celui de tous les libellés */
export function styleOf(o, item) {
  const all = (o && o.names) || {},
    own = (item && item.st) || {},
    out = {};
  for (const k of ST_KEYS) {
    const v = own[k] ?? all[k];
    if (v !== undefined && v !== '' && v !== 0 && v !== false) out[k] = v;
  }
  return out;
}
export const isStyled = (st) => !!(st && (+st.size > 0 || st.bold || st.italic || st.underline || st.color));
/** le libellé doit-il passer par le texte riche ? */
export const needsRich = (text, st) => isStyled(st) || MK.test(String(text || ''));
/** corps du libellé en px (taille posée, sinon celle du type) */
export const labelPx = (st, basePx) => (st && +st.size > 0 ? pxOf(+st.size) : basePx);
/** texte avec le style posé autour (italique, souligné, couleur), lu par `richLines` ; le gras passe par la spec */
export function wrapStyled(text, st) {
  let x = String(text || '');
  if (st && st.italic) x = '~~' + x + '~~';
  if (st && st.underline) x = '__' + x + '__';
  if (st && st.color) x = `{c:${st.color}|${x}}`;
  return x;
}
/** spec de `richLines` pour un libellé */
export const specOf = (st, basePx, weight) => {
  const size = labelPx(st, basePx);
  return { size, lh: labelLh(size), weight: weight || 400, bold: !!(st && st.bold) };
};
/** lignes d'un libellé stylé, coupées sur maxW (1e6 = sans coupure) */
export const styledLines = (text, st, basePx, weight, maxW) => richLines(wrapStyled(text, st), specOf(st, basePx, weight), maxW);
/** largeur naturelle (la plus longue ligne) */
export const styledW = (text, st, basePx, weight) => Math.max(0, ...styledLines(text, st, basePx, weight, 1e6).map((l) => l.w));
/** <g> des lignes centrées verticalement sur yMid */
export function drawStyled(lines, x, yMid, align = 'start') {
  const h = lines.reduce((a, l) => a + l.lh, 0);
  return drawRich(lines, x, yMid - h / 2, align);
}
/** attributs d'un <text> d'une ligne (types qui ajustent le texte dans une forme) : gras, italique, souligné, couleur */
export const textAttrs = (st) => ({
  'font-weight': st.bold ? 700 : undefined,
  'font-style': st.italic ? 'italic' : undefined,
  'text-decoration': st.underline ? 'underline' : undefined,
  fill: st.color ? colorRef(st.color) : undefined,
});
/** pose les attributs de style sur un nœud déjà créé (les valeurs absentes ne touchent à rien) */
export function applyText(node, st) {
  for (const [k, v] of Object.entries(textAttrs(st))) if (v !== undefined) node.setAttribute(k, v);
  return node;
}
/** marque un libellé cliquable dans l'éditeur (`path` = chemin de l'élément dans les réglages, ex. `rows.2`) */
export function tagText(node, env, path) {
  if (node && env && env.ui) {
    node.setAttribute('data-text', path);
    node.style.cursor = 'text';
  }
  return node;
}

/** Libellé d'une ligne ajusté à une largeur (types qui réduisent le corps pour tenir : courbes, pictogrammes…) :
    lignes de `richLines` sur une seule ligne, corps réduit jusqu'à `minK` s'il le faut */
export function fitLines(text, st, basePx, weight, maxW, minK = 0.6) {
  const one = String(text || '').replace(/\r\n?|\n|\u2028/g, ' '),
    at = (sz) => richLines(wrapStyled(one, st), { size: sz, lh: labelLh(sz), weight: weight || 400, bold: !!(st && st.bold) }, 1e6);
  let size = labelPx(st, basePx),
    lines = at(size);
  const w = Math.max(0, ...lines.map((l) => l.w));
  if (maxW > 0 && w > maxW) lines = at(Math.max(size * minK, (size * maxW) / w));
  return lines;
}
/** Nœud d'un libellé d'élément : texte riche s'il est stylé ou mis en forme, sinon `plain()` (dessin d'origine du type) ;
    marqué cliquable dans l'éditeur (`path`) */
export function labelNode({ env, o, item, path, text, x, yMid, maxW, anchor = 'start', basePx, weight, minK, plain }) {
  const st = styleOf(o, item),
    n = needsRich(text, st) ? drawStyled(fitLines(text, st, basePx, weight, maxW, minK), x, yMid, anchor) : plain();
  return path ? tagText(n, env, path) : n;
}
/** Libellés sans élément propre (nœuds calculés : treemap, bulles, soleil, flux, enquête) : style de tous les libellés seulement.
    { px, weight (mesure), attrs } — `attrs` à poser sur le <text> (gras, italique, souligné, couleur ; dans l'éditeur, `data-text="*"` :
    un clic ouvre la barre de mise en forme sur « Tous les libellés ») */
export function allLabels(o, basePx, weight, env) {
  const st = styleOf(o, null),
    attrs = Object.fromEntries(Object.entries(textAttrs(st)).filter(([, v]) => v !== undefined));
  if (env && env.ui) attrs['data-text'] = '*';
  return { st, px: labelPx(st, basePx), weight: st.bold ? 700 : weight, attrs };
}
/** `textItems` d'un type : un champ par texte de chaque élément d'une liste, montré dans la carte Textes.
    `list` = clé de la liste ; `keys` = clé du texte, ou [[clé, nom], …] pour plusieurs textes par élément (titre et texte…) */
export const itemTexts =
  (list = 'rows', keys = 'label', name = 'Libellé') =>
  (o) =>
    (o[list] || []).flatMap((it, i) =>
      (Array.isArray(keys) ? keys : [[keys, name]]).map(([k, n]) => ({ obj: it, k, label: `${t(n)} ${i + 1}` })),
    );
