/* Registre des dataviz. Un type = { label, icon, family, defaults(), fields[], render(opts, width, env) → { node } }.
   Pour en ajouter un : créer le fichier, l'importer ici. L'éditeur construit son formulaire depuis `fields` (+ `data` pour l'onglet Données).
   Champs : `g` range un champ dans une carte de l'onglet Visualisation (format, labels, style) ou dans l'onglet Données (data). */
import donut from './donut.js';
import bars from './bars.js';
import iconlist from './iconlist.js';
import hbars from './hbars.js';
import line from './line.js';
import { el } from './util.js';

export const VIZ_TYPES = { donut, bars, hbars, line, icons: iconlist };
export const VIZ_OPTIONS = Object.fromEntries(Object.entries(VIZ_TYPES).map(([k, v]) => [k, v.label]));
/** Familles proposées dans le sélecteur de type (clé française, passée par t()) */
export const VIZ_FAMILIES = { compare: 'Comparaison', part: 'Proportions', trend: 'Évolution', list: 'Listes' };

export const newViz = (kind = 'bars') => ({ kind, opts: VIZ_TYPES[kind].defaults(), head: { title: '', source: '' } });

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
  try { return withHead(viz, t.render(viz.opts || t.defaults(), width, env || {}).node); }
  catch (e) { console.error('dataviz', viz.kind, e); return null; }
}

/** Variante pour l'éditeur : { node, meta } (meta = géométrie pour les interactions) */
export function renderVizFull(viz, width, env) {
  const t = viz && VIZ_TYPES[viz.kind];
  if (!t) return null;
  try { const r = t.render(viz.opts || t.defaults(), width, env || {}); return { ...r, node: withHead(viz, r.node), wrapped: !!(viz.head && (viz.head.title || viz.head.source)) }; }
  catch (e) { console.error('dataviz', viz.kind, e); return null; }
}
