/* Registre des dataviz. Un type = { label, icon, family, defaults(), fields[], render(opts, width, env) → { node } }.
   Pour en ajouter un : créer le fichier, l'importer ici. L'éditeur construit son formulaire depuis `fields` (+ `data` pour l'onglet Données).
   Champs : `g` range un champ dans une carte de l'onglet Visualisation (format, labels, style) ou dans l'onglet Données (data). */
import donut from './donut.js';
import bars from './bars.js';
import iconlist from './iconlist.js';
import hbars from './hbars.js';
import line from './line.js';
import sunburst from './sunburst.js';
import bubbles from './bubbles.js';
import treemap from './treemap.js';
import sankey from './sankey.js';
import scatter from './scatter.js';
import survey from './survey.js';
import waffle from './waffle.js';
import timeline from './timeline.js';
import { pictoTypes } from './picto.js';
import { el, s, heightOf, fmt, inlineMk } from './util.js';
import { renderFigure } from '../figure.js';

export const VIZ_TYPES = { donut, bars, hbars, line, timeline, scatter, survey, waffle, sunburst, bubbles, treemap, sankey, ...pictoTypes, icons: iconlist };
export const VIZ_OPTIONS = Object.fromEntries(Object.entries(VIZ_TYPES).map(([k, v]) => [k, v.label]));
/** Familles proposées dans le sélecteur de type (clé française, passée par t()) */
export const VIZ_FAMILIES = { compare: 'Comparaison', part: 'Proportions', trend: 'Évolution', hier: 'Hiérarchies', flow: 'Flux', picto: 'Pictogrammes', list: 'Listes' };

/** Chiffre à côté (commun à tous les types) : `viz.side` = { pos: none | right | left, value, text, share (% de la largeur pour la dataviz), align } */
export const newSide = kind => ({ pos: 'none', value: '{pct}', text: '', share: (VIZ_TYPES[kind] || {}).sideShare || 60, align: 'top', scale: '1.5' });
export const newViz = (kind = 'bars') => ({ kind, opts: VIZ_TYPES[kind].defaults(), head: { title: '', source: '' }, side: newSide(kind) });

/** Même dataviz dans un autre type : titre/source gardés, les données suivent quand les deux types partagent la même forme (tableau libellé × séries, ou mêmes colonnes) */
export function switchKind(viz, k) {
  const nv = newViz(k), o = viz.opts || {}, n = nv.opts, dk = (VIZ_TYPES[viz.kind] || {}).data, nk = VIZ_TYPES[k].data;
  nv.head = viz.head || nv.head; if (viz.side) nv.side = { ...nv.side, ...viz.side, share: viz.side.share };
  if (o.rows && o.series && n.rows && n.series) { n.rows = o.rows; n.series = o.series; }
  if (dk && nk && dk.k === nk.k && dk.cols.map(c => c.k).join() === nk.cols.map(c => c.k).join()) n[nk.k] = o[dk.k];
  return nv;
}

/** Types qui gardent leur hauteur naturelle (`boxed`) : en mode fixe ou « remplir », le contenu est posé dans un conteneur de la hauteur voulue,
    en haut, au centre ou en bas (`opts.valign`) — jamais rogné si le conteneur est plus bas que le contenu */
function boxed(t, o, W, env, node) {
  if (!t.boxed || !node || (o.hmode !== 'fixed' && o.hmode !== 'fill' && o.hmode !== 'match')) return node;
  const natural = +node.getAttribute('height') || 0, H = Math.max(natural, heightOf(o, W, env, natural));
  if (H <= natural + 0.5) return node;
  const box = el('div', { class: 'viz-box', style: { height: H + 'px', display: 'flex', alignItems: { center: 'center', bottom: 'flex-end' }[o.valign] || 'flex-start' } }, node);
  box.dataset.vizH = H; return box;
}

/** Titre et source facultatifs, communs à tous les types (`viz.head`) */
function withHead(viz, node) {
  const hd = viz.head || {};
  if (!node || !(hd.title || '').trim() && !(hd.source || '').trim()) return node;
  const wrap = el('div', { class: 'viz-wrap' });
  if ((hd.title || '').trim()) {   // titre : une ligne = un paragraphe, préfixes # à ##### = titre 1, titre 2, légende, chiffre clé, chiffre clé (petit)
    const T = el('div', { class: 'viz-title' });
    String(hd.title).replace(/\r\n?/g, '\n').split('\n').filter(l => l.trim()).forEach(l => {
      const m = l.trim().match(/^(#{1,5})\s+(.*)$/);
      T.append(el('div', { class: m ? 'p-' + ['h1', 'h2', 'cap', 'fig', 'figsm'][m[1].length - 1] : '', innerHTML: inlineMk(m ? m[2] : l.trim()) }));
    });
    wrap.append(T);
  }
  wrap.append(node);
  if ((hd.source || '').trim()) wrap.append(el('div', { class: 'viz-source', innerHTML: inlineMk(hd.source) }));
  return wrap;
}

/** Jetons du chiffre à côté : {pct} part de la 1re donnée dans le total, {value} sa valeur, {total} le total, {label} son libellé */
function sideTokens(o, env) {
  const items = o.rows || o.segments || o.items || [], num = r => (r.value != null ? +r.value : Array.isArray(r.v) ? +r.v[0] : NaN);
  const vals = items.map(num).filter(Number.isFinite), sum = vals.reduce((a, b) => a + b, 0), total = +o.total > 0 ? +o.total : sum, first = items[0] || {}, v0 = Number.isFinite(num(first)) ? num(first) : 0;
  const f = x => fmt(x, env.locale, 0);
  return { pct: `${f(total ? v0 / total * 100 : 0)}%`, value: f(v0), total: f(total), label: String(first.label || first.title || first.name || first.text || '') };
}
const fill = (str, tk) => String(str ?? '').replace(/\{(pct|value|total|label)\}/g, (_, k) => (tk ? tk[k] : ''));
export { fill as fillTokens };

/** Champs de la carte « Chiffre à côté » (dataviz, texte, carte) */
export const SIDE_FIELDS = [
  { k: 'pos', t: 'select', label: 'Chiffre à côté', options: { none: 'Aucun', right: 'À droite', left: 'À gauche', top: 'Au-dessus' } },
  { k: 'value', t: 'text', rich: true, label: 'Chiffre ({pct} = part de la 1re donnée)' }, { k: 'text', t: 'text', rich: true, label: 'Texte sous le chiffre (vide = libellé de la 1re donnée)' },
  { k: 'share', t: 'number', label: 'Largeur du contenu (% de la largeur)', min: 25, max: 80 },
  { k: 'scale', t: 'select', label: 'Taille du chiffre', options: { 1: 'Normal', 1.5: 'Grand', 2: 'Très grand' } },
  { k: 'align', t: 'select', label: 'Position verticale du chiffre', options: { top: 'En haut', center: 'Centré', bottom: 'En bas' } },
];
/** Chiffre à côté d'un texte ou d'une carte : pas de donnée à lire, le chiffre est saisi */
export const newColSide = () => ({ pos: 'none', value: '14 %', text: '', share: 60, align: 'top', scale: '1.5' });

/** Un contenu + un chiffre clé à côté : le contenu est dessiné à la part de largeur choisie, le chiffre occupe le reste.
    core(w) → { node, … } ; tk = jetons du chiffre (voir sideTokens) */
export function composeSide(sd, W, env, tk, core) {
  if (!sd || (sd.pos !== 'right' && sd.pos !== 'left' && sd.pos !== 'top')) return core(W);
  if (sd.pos === 'top') {   // chiffre au-dessus du contenu, sur toute la largeur
    const r = core(W); if (!r) return r;
    const fig = renderFigure({ value: fill(sd.value, tk), icon: 'none', scale: +sd.scale || 1, text: fill((sd.text || '').trim() || '{label}', tk) }, W, 'left');
    return { ...r, node: el('div', { class: 'viz-side-top', style: { width: W + 'px', display: 'flex', flexDirection: 'column', gap: '12px' } }, fig, r.node) };
  }
  const GAPF = 18, wv = Math.round(W * Math.max(25, Math.min(80, +sd.share || 60)) / 100), wf = Math.max(40, W - wv - GAPF), r = core(wv); if (!r) return r;
  const fig = renderFigure({ value: fill(sd.value, tk), icon: 'none', scale: +sd.scale || 1, text: fill((sd.text || '').trim() || '{label}', tk) }, wf, 'left');
  const align = { center: 'center', bottom: 'flex-end' }[sd.align] || 'flex-start';
  const box = el('div', { class: 'viz-side', style: { display: 'flex', width: W + 'px', gap: GAPF + 'px', alignItems: align, flexDirection: sd.pos === 'left' ? 'row-reverse' : 'row' } },
    el('div', { style: { width: wv + 'px', flex: 'none' } }, r.node), el('div', { style: { width: wf + 'px', flex: 'none' } }, fig));
  return { ...r, node: box };
}
const composed = (viz, W, env, core) => composeSide(viz.side, W, env, viz.side && viz.side.pos !== 'none' ? sideTokens(viz.opts || {}, env) : null, core);

/** « Légende en haut » : la légende (groupe g.lg posé en bas par le type) passe en haut, le reste descend de sa hauteur ; la hauteur totale ne change pas */
function legendTop(node, o) {
  if (!node || !o || o.legendPos !== 'top' || !node.querySelector) return node;
  const lg = [...node.children].find(c => c.classList && c.classList.contains('lg')); if (!lg) return node;
  const y = +lg.dataset.y, reserve = +lg.dataset.reserve || 0, body = s('g', { transform: `translate(0 ${reserve})` });
  [...node.childNodes].forEach(c => { if (c !== lg) body.append(c); });
  lg.setAttribute('transform', `translate(0 ${-y})`); node.append(body, lg);
  return node;
}

/** Rendu d'une dataviz dans une colonne de largeur `width` (px) */
export function renderViz(viz, width, env) {
  const t = viz && VIZ_TYPES[viz.kind];
  if (!t) return null;
  try {
    const o = viz.opts || t.defaults(), e = env || {};
    return withHead(viz, composed(viz, width, e, w => { const r = t.render(o, w, e); r.node = legendTop(r.node, o); return { ...r, node: boxed(t, o, w, e, r.node) }; }).node);
  } catch (e) { console.error('dataviz', viz.kind, e); return null; }
}

/** Variante pour l'éditeur : { node, meta } (meta = géométrie pour les interactions) */
export function renderVizFull(viz, width, env) {
  const t = viz && VIZ_TYPES[viz.kind];
  if (!t) return null;
  try {
    const o = viz.opts || t.defaults(), e = env || {}, r = composed(viz, width, e, w => { const q = t.render(o, w, e); q.node = legendTop(q.node, o); return { ...q, node: boxed(t, o, w, e, q.node) }; });
    return { ...r, node: withHead(viz, r.node), wrapped: !!(viz.head && (viz.head.title || viz.head.source)) };
  } catch (e) { console.error('dataviz', viz.kind, e); return null; }
}
