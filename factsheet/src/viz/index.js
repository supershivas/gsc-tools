/* Registre des dataviz. Un type = { label, defaults(), fields[], render(opts, width, env) → { node } }.
   Pour en ajouter un : créer le fichier, l'importer ici. L'éditeur construit son formulaire depuis `fields`. */
import donut from './donut.js';
import bars from './bars.js';
import figure from './figure.js';
import iconlist from './iconlist.js';
import hbars from './hbars.js';
import line from './line.js';

export const VIZ_TYPES = { donut, bars, hbars, line, figure, icons: iconlist };
export const VIZ_OPTIONS = Object.fromEntries(Object.entries(VIZ_TYPES).map(([k, v]) => [k, v.label]));

export const newViz = (kind = 'bars') => ({ kind, opts: VIZ_TYPES[kind].defaults() });

/** Rendu d'une dataviz dans une colonne de largeur `width` (px) */
export function renderViz(viz, width, env) {
  const t = viz && VIZ_TYPES[viz.kind];
  if (!t) return null;
  try { return t.render(viz.opts || t.defaults(), width, env || {}).node; }
  catch (e) { console.error('dataviz', viz.kind, e); return null; }
}

/** Variante pour l'éditeur : { node, meta } (meta = géométrie pour les interactions) */
export function renderVizFull(viz, width, env) {
  const t = viz && VIZ_TYPES[viz.kind];
  if (!t) return null;
  try { return t.render(viz.opts || t.defaults(), width, env || {}); }
  catch (e) { console.error('dataviz', viz.kind, e); return null; }
}
