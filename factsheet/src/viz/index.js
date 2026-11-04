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
import { el, heightOf, fmt } from './util.js';
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
  if ((hd.title || '').trim()) wrap.append(el('div', { class: 'viz-title', textContent: hd.title }));
  wrap.append(node);
  if ((hd.source || '').trim()) wrap.append(el('div', { class: 'viz-source', textContent: hd.source }));
  return wrap;
}

/** Jetons du chiffre à côté : {pct} part de la 1re donnée dans le total, {value} sa valeur, {total} le total, {label} son libellé */
function sideTokens(o, env) {
  const items = o.rows || o.segments || o.items || [], num = r => (r.value != null ? +r.value : Array.isArray(r.v) ? +r.v[0] : NaN);
  const vals = items.map(num).filter(Number.isFinite), sum = vals.reduce((a, b) => a + b, 0), total = +o.total > 0 ? +o.total : sum, first = items[0] || {}, v0 = Number.isFinite(num(first)) ? num(first) : 0;
  const f = x => fmt(x, env.locale, 0);
  return { pct: `${f(total ? v0 / total * 100 : 0)}%`, value: f(v0), total: f(total), label: String(first.label || first.title || first.name || first.text || '') };
}
const fill = (str, tk) => String(str ?? '').replace(/\{(pct|value|total|label)\}/g, (_, k) => tk[k]);

/** Dataviz + chiffre clé à côté : la dataviz est dessinée à la part de largeur choisie, le chiffre occupe le reste */
function composed(viz, W, env, core) {
  const sd = viz.side;
  if (!sd || (sd.pos !== 'right' && sd.pos !== 'left')) return core(W);
  const GAPF = 18, wv = Math.round(W * Math.max(25, Math.min(80, +sd.share || 60)) / 100), wf = Math.max(40, W - wv - GAPF), r = core(wv); if (!r) return r;
  const tk = sideTokens(viz.opts || {}, env), fig = renderFigure({ value: fill(sd.value, tk), icon: 'none', scale: +sd.scale || 1, text: fill((sd.text || '').trim() || '{label}', tk) }, wf, 'left');
  const align = { center: 'center', bottom: 'flex-end' }[sd.align] || 'flex-start';
  const box = el('div', { class: 'viz-side', style: { display: 'flex', width: W + 'px', gap: GAPF + 'px', alignItems: align, flexDirection: sd.pos === 'left' ? 'row-reverse' : 'row' } },
    el('div', { style: { width: wv + 'px', flex: 'none' } }, r.node), el('div', { style: { width: wf + 'px', flex: 'none' } }, fig));
  return { ...r, node: box };
}

/** Rendu d'une dataviz dans une colonne de largeur `width` (px) */
export function renderViz(viz, width, env) {
  const t = viz && VIZ_TYPES[viz.kind];
  if (!t) return null;
  try {
    const o = viz.opts || t.defaults(), e = env || {};
    return withHead(viz, composed(viz, width, e, w => { const r = t.render(o, w, e); return { ...r, node: boxed(t, o, w, e, r.node) }; }).node);
  } catch (e) { console.error('dataviz', viz.kind, e); return null; }
}

/** Variante pour l'éditeur : { node, meta } (meta = géométrie pour les interactions) */
export function renderVizFull(viz, width, env) {
  const t = viz && VIZ_TYPES[viz.kind];
  if (!t) return null;
  try {
    const o = viz.opts || t.defaults(), e = env || {}, r = composed(viz, width, e, w => { const q = t.render(o, w, e); return { ...q, node: boxed(t, o, w, e, q.node) }; });
    return { ...r, node: withHead(viz, r.node), wrapped: !!(viz.head && (viz.head.title || viz.head.source)) };
  } catch (e) { console.error('dataviz', viz.kind, e); return null; }
}
