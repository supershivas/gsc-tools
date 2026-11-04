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
import timeline from './timeline.js';
import { pictoTypes } from './picto.js';
import { el, heightOf } from './util.js';

export const VIZ_TYPES = { donut, bars, hbars, line, timeline, scatter, survey, sunburst, bubbles, treemap, sankey, ...pictoTypes, icons: iconlist };
export const VIZ_OPTIONS = Object.fromEntries(Object.entries(VIZ_TYPES).map(([k, v]) => [k, v.label]));
/** Familles proposées dans le sélecteur de type (clé française, passée par t()) */
export const VIZ_FAMILIES = { compare: 'Comparaison', part: 'Proportions', trend: 'Évolution', hier: 'Hiérarchies', flow: 'Flux', picto: 'Pictogrammes', list: 'Listes' };

export const newViz = (kind = 'bars') => ({ kind, opts: VIZ_TYPES[kind].defaults(), head: { title: '', source: '' } });

/** Même dataviz dans un autre type : titre/source gardés, les données suivent quand les deux types partagent la même forme (tableau libellé × séries, ou mêmes colonnes) */
export function switchKind(viz, k) {
  const nv = newViz(k), o = viz.opts || {}, n = nv.opts, dk = (VIZ_TYPES[viz.kind] || {}).data, nk = VIZ_TYPES[k].data;
  nv.head = viz.head || nv.head;
  if (o.rows && o.series && n.rows && n.series) { n.rows = o.rows; n.series = o.series; }
  if (dk && nk && dk.k === nk.k && dk.cols.map(c => c.k).join() === nk.cols.map(c => c.k).join()) n[nk.k] = o[dk.k];
  return nv;
}

/** Types qui gardent leur hauteur naturelle (`boxed`) : en mode fixe ou « remplir », le contenu est posé dans un conteneur de la hauteur voulue,
    en haut, au centre ou en bas (`opts.valign`) — jamais rogné si le conteneur est plus bas que le contenu */
function boxed(t, o, W, env, node) {
  if (!t.boxed || !node || (o.hmode !== 'fixed' && o.hmode !== 'fill')) return node;
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

/** Rendu d'une dataviz dans une colonne de largeur `width` (px) */
export function renderViz(viz, width, env) {
  const t = viz && VIZ_TYPES[viz.kind];
  if (!t) return null;
  try { const o = viz.opts || t.defaults(); return withHead(viz, boxed(t, o, width, env || {}, t.render(o, width, env || {}).node)); }
  catch (e) { console.error('dataviz', viz.kind, e); return null; }
}

/** Variante pour l'éditeur : { node, meta } (meta = géométrie pour les interactions) */
export function renderVizFull(viz, width, env) {
  const t = viz && VIZ_TYPES[viz.kind];
  if (!t) return null;
  try { const o = viz.opts || t.defaults(), r = t.render(o, width, env || {}); return { ...r, node: withHead(viz, boxed(t, o, width, env || {}, r.node)), wrapped: !!(viz.head && (viz.head.title || viz.head.source)) }; }
  catch (e) { console.error('dataviz', viz.kind, e); return null; }
}
