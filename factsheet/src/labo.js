/* Labo du Factsheet creator : banc d'essai de variantes, sans rien changer à l'app. Données d'exemple en dur,
   rien lu ni écrit dans le localStorage. Ajouter un sujet ou une variante = ajouter une entrée dans TOPICS.
   Écran à hauteur fixe ; sujets dans la marge (puces sur mobile), variantes A, B, C… (A = l'actuelle ou la base) ;
   adresse #sujet-LETTRE ; flèches du clavier et balayage pour changer de variante. */
import { initI18n, t } from './i18n.js';
import { h } from './render.js';
import { cssVars, applyVars, colWidth, insetW, DEFAULT_THEME, paletteOf } from './tokens.js';
import { renderCard } from './card.js';
import { CARD_DEFAULTS, CARD_CHECKS } from './cardmodel.js';
import { renderFigure, FIGURE_DEFAULTS } from './figure.js';
import { ICON_OPTIONS } from './viz/icons.js';
import { renderPanel, panelOpts } from './labo-panel.js';
import { renderSelect, selectOpts } from './labo-select.js';
import { renderEditor, editorOpts, renderColumn, columnOpts } from './labo-ux.js';
import * as TX from './labo-text.js';
import { VIZ_TYPES, renderVizFull } from './viz/index.js';
import { buildFields, paletteOptions } from './editor.js';
import { gridEditor, tableAdapter, recordsAdapter } from './vizdata.js';
import { startReorder } from './vizreorder.js';

/* ---------- Sujet « Dataviz » : tous les types, fausses données, réglages en direct ---------- */
const VIZ_DESC = {
  donut: 'Anneau ou camembert : glisser l’anneau (rotation), un libellé (position, côté) ou le point blanc (ancrage du trait).', bars: 'Barres jumelées, groupées ou empilées, avec accolade « évolution ».',
  hbars: 'Barres horizontales : la hauteur des barres suit la hauteur du conteneur.', line: 'Courbes à plusieurs séries.', timeline: 'Frise verticale ou horizontale ; extrémités de la ligne au choix.',
  scatter: 'Nuage de points ou bulles, un groupe = une couleur.', waffle: 'Grille de cases (10 × 10) remplies à hauteur de la valeur, avec repère sur les cases pleines : l’idéal pour « 14 % ».', survey: 'Un point par répondant, anneaux = réponses, un nuage par groupe.', sunburst: 'Anneaux concentriques, un par niveau de la hiérarchie.',
  bubbles: 'Cercles proportionnels regroupés par branche.', treemap: 'Rectangles proportionnels regroupés par branche.', sankey: 'Flux entre nœuds, épaisseur = valeur.',
  pictoBars: 'Rangées de pictogrammes, une par catégorie.', pictoCols: 'Colonnes de pictogrammes empilés.', pictoV: 'Un pictogramme par catégorie, rempli en hauteur.', pictoH: 'Un pictogramme par ligne, rempli en largeur.', icons: 'Liste à icônes.',
};
const VALIGN_FLEX = { top: 'flex-start', center: 'center', bottom: 'flex-end' };
const vizVariant = kind => { const ty = VIZ_TYPES[kind]; return { title: ty.label, desc: VIZ_DESC[kind] || '', opts: { kind, viz: ty.defaults(), head: { title: '', source: '' }, boxH: 0, valign: 'top' } }; };


const WIDTHS = { '1/3': colWidth('1-1-1', 0), '1/2': colWidth('1-1', 0), '2/3': colWidth('2-1', 0), 'full': colWidth('1', 0) };

const cardControls = [
  { type: 'radio', k: 'layout', label: 'Position de l’image', choices: { vertical: 'En haut', left: 'À gauche', right: 'À droite' } },
  { type: 'radio', k: 'align', label: 'Alignement', choices: { left: 'Gauche', center: 'Centré' } },
  { type: 'select', k: 'iconName', label: 'Icône choisie', choices: ICON_OPTIONS },
  ...CARD_CHECKS.map(([k, label]) => ({ type: 'check', k, label })),
];
const card = o => ({ ...CARD_DEFAULTS(), ...o });
const figureControls = [
  { type: 'radio', k: 'align', label: 'Alignement', choices: { left: 'Gauche', center: 'Centré' } },
  { type: 'select', k: 'iconName', label: 'Icône choisie', choices: ICON_OPTIONS },
  { type: 'check', k: 'icon', label: 'Icône devant le chiffre' }, { type: 'check', k: 'iconCircle', label: 'Icône dans une pastille' },
  { type: 'check', k: 'text', label: 'Texte' }, { type: 'check', k: 'stroke', label: 'Contour' }, { type: 'check', k: 'fill', label: 'Fond blanc' },
];
const fig = o => ({ icon: false, iconName: 'globe', iconCircle: false, text: true, stroke: true, fill: true, align: 'left', ...o });

const TOPICS = [
  { id: 'cartes', icon: 'layout-cards', label: 'Cartes', controls: cardControls, render: (o, W) => renderCard(o, W), variants: [
    { title: 'Carte simple', base: true, desc: 'Titre et texte dans un contour : le minimum, point de départ.', opts: card({}) },
    { title: 'Image en haut', kept: 'colonnes moyennes', desc: 'Image au-dessus, étiquette, titre, texte et lien ; l’image reste dans les marges du contour.', opts: card({ image: true, tag: true, link: true }) },
    { title: 'Image jusqu’au bord', desc: 'Comme B, mais l’image touche le contour (coins hauts arrondis de 3 px).', opts: card({ image: true, bleed: true, tag: true, link: true }) },
    { title: 'Icône en tête', kept: 'colonnes étroites', desc: 'Pastille d’icône centrée au-dessus du titre, avec des puces.', opts: card({ icon: true, align: 'center', bullets: true }) },
    { title: 'Image à côté', kept: 'colonnes larges', desc: 'Image à gauche (40 %), contenu à droite : pour les colonnes larges.', opts: card({ image: true, layout: 'left', link: true }) },
    { title: 'Chiffre clé', desc: 'Carte statistique : icône à côté du titre, grand chiffre, texte.', opts: card({ icon: true, iconInline: true, iconCircle: false, figure: true, fill: true }) },
    { title: 'Complète', desc: 'Toutes les options activées ; décochez ce que vous ne voulez pas garder.', opts: card({ image: true, icon: true, iconInline: true, tag: true, figure: true, bullets: true, link: true, fill: true }) },
  ] },
  { id: 'chiffre', icon: 'number', label: 'Chiffre clé', controls: figureControls, render: (o, W) => {
      const box = h('div', { class: 'col col-figure' + (o.stroke ? ' stroked' + (o.fill ? ' filled' : '') : ''), style: { width: W + 'px' } });
      const f = { ...FIGURE_DEFAULTS(), icon: o.icon ? o.iconName : 'none', iconStyle: o.iconCircle ? 'circle' : 'plain', text: o.text ? FIGURE_DEFAULTS().text : '' };
      box.append(renderFigure(f, o.stroke ? insetW(W) : W, o.align)); return box;
    }, variants: [
    { title: 'Sans icône', base: true, desc: 'Le chiffre clé actuel : contour, fond blanc, chiffre et texte.', opts: fig({}) },
    { title: 'Icône devant le chiffre', desc: 'Pictogramme au trait à la hauteur du chiffre.', opts: fig({ icon: true }) },
    { title: 'Icône en pastille', desc: 'Même icône dans une pastille ronde de 0,5 pt, comme dans la liste à icônes.', opts: fig({ icon: true, iconCircle: true }) },
    { title: 'Centré, sans contour', desc: 'Chiffre et icône centrés, pour une bande de plusieurs chiffres.', opts: fig({ icon: true, stroke: false, fill: false, align: 'center' }) },
  ] },
  { id: 'dataviz', icon: 'chart-dots', label: 'Dataviz', controls: [], render: (o, W, v, paint) => renderVizTopic(o, W, paint), extra: vizExtra, variants: Object.keys(VIZ_TYPES).map(vizVariant) },
  { id: 'proprietes', icon: 'adjustments', label: 'Propriétés', panel: true, controls: [], render: (o, W, v, redraw) => renderPanel(o, v, redraw), variants: [
    { title: 'Ancienne', old: true, style: 'a', desc: 'Le panneau tel qu’il est : tout à la suite, des étiquettes de 12 px, des écarts irréguliers et des cases à cocher entre les blocs.', opts: panelOpts() },
    { title: 'Cartes repliables', kept: 'tous les panneaux de propriétés', style: 'b', desc: 'Un bloc par sujet (texte, couleurs, image, logo) dans une carte avec icône, interrupteur et chevron : on replie ce qu’on ne touche pas.', opts: panelOpts() },
    { title: 'Onglets', style: 'c', desc: 'Trois onglets (texte, couleurs, médias) : un seul groupe à l’écran, plus de défilement, mais un clic pour changer de sujet.', opts: panelOpts() },
    { title: 'Sections à filet', style: 'd', desc: 'Tout reste visible, découpé en sections séparées par un filet, titre en majuscules et interrupteur à droite ; 24 px entre sections, 12 px entre champs.', opts: panelOpts() },
    { title: 'Inspecteur compact', style: 'e', desc: 'Comme D, mais l’étiquette est à gauche du champ (une ligne par réglage) : le plus court, proche d’un outil de design.', opts: panelOpts() },
  ] },
  { id: 'selection', icon: 'focus-2', label: 'Sélection', panel: true, controls: [], render: (o, W, v, redraw) => renderSelect(o, v, redraw), variants: [
    { title: 'Fixe', old: true, style: 'steady', desc: 'Le cadre orange ne bouge pas : sobre, mais on le repère moins quand on change de sélection.', opts: selectOpts() },
    { title: 'Respiration', style: 'breathe', desc: 'Le trait s’éclaircit puis revient, en boucle lente (2,8 s) : le plus discret.', opts: selectOpts() },
    { title: 'Souffle', style: 'swell', desc: 'Le cadre gonfle de 1,2 % puis se rétracte, en boucle lente : donne du volume sans changer de couleur.', opts: selectOpts() },
    { title: 'Halo', kept: 'cadre de sélection de l’aperçu', style: 'halo', desc: 'Une onde orange très douce part du cadre toutes les 2,2 s.', opts: selectOpts() },
    { title: 'Pointillés', style: 'ants', desc: 'Le contour est en pointillés qui défilent lentement (1,8 s) : on voit tout de suite quel élément est actif.', opts: selectOpts() },
  ] },
  { id: 'editeur', icon: 'layout-sidebar-right', label: 'Éditeur dataviz', panel: true, controls: [], render: (o, W, v, redraw) => renderEditor(o, v, redraw), variants: [
    { title: 'Ancien', old: true, style: 'a', desc: 'Onglets dans le panneau, sous le choix du type. Le panneau fait 360 px dans Visualisation et 48 % de l’écran dans Données : en changeant d’onglet, tout bouge (largeur, aperçu, position des contrôles).', opts: editorOpts() },
    { title: 'Panneau de largeur fixe', style: 'b', desc: 'Même panneau de 340 px dans les deux onglets, à gauche. Données : le tableau prend toute la place, import et colonnes à représenter dans le panneau, aperçu miniature en bas. Visualisation : l’aperçu en grand.', opts: editorOpts() },
    { title: 'Façon Flourish, panneau à droite', kept: 'éditeur de dataviz', style: 'c', desc: 'Onglets « Aperçu | Données » au centre de la barre, panneau de 320 px à droite dans les deux onglets (comme les propriétés de l’éditeur). Le type est en tête du panneau, les sections en liste repliable à une seule ouverte.', opts: editorOpts() },
    { title: 'Façon Flourish, panneau à gauche', style: 'd', desc: 'Comme C, panneau à gauche : proche de l’éditeur actuel, mais en rupture avec les propriétés de l’app (à droite).', opts: editorOpts() },
  ] },
  { id: 'colonne', icon: 'adjustments-horizontal', label: 'Panneau colonne', panel: true, controls: [], render: (o, W, v, redraw) => renderColumn(o, v, redraw), variants: [
    { title: 'Ancien', old: true, style: 'a', desc: 'Panneau de droite pour une colonne dataviz : cinq cartes dépliées, dont quatre presque vides ; la suppression est tout en bas.', opts: columnOpts() },
    { title: 'Essentiel d’abord', kept: 'panneau de propriétés', style: 'b', desc: 'Tête collante (nom, type, actions d’élément), cartes repliées avec leur valeur en résumé, une seule ouverte à la fois, le rare dans « Avancé ».', opts: columnOpts() },
    { title: 'Onglets', style: 'c', desc: 'Même tête collante, puis trois onglets (Contenu, Mise en page, Style) : plus de défilement, un clic pour changer de sujet.', opts: columnOpts() },
  ] },
  { id: 'styles', icon: 'typography', label: 'Styles de texte', group: 'Texte', panel: true, controls: [], render: (o, W, v, redraw) => TX.renderStyles(o, v, redraw), variants: [
    { title: 'Six styles', base: true, style: 'a', desc: 'Aujourd’hui : Texte, Titre 1, Titre 2, Légende, Chiffre clé et Chiffre clé (petit), dans une liste déroulante. Pas de style « Source » : la légende est droite, en 600.', opts: TX.stylesOptsOld() },
    { title: 'Catalogue en menu', style: 'b', desc: 'Sept styles de plus (Chapeau, Texte gras, Texte petit, Citation, Étiquette, Source 8/9 pt italique, Note), regroupés par famille dans un menu où chaque style s’écrit dans sa typographie.', opts: TX.stylesOpts() },
    { title: 'Galerie de vignettes', style: 'c', desc: 'Le même catalogue en grille de vignettes « Aa » avec la taille et l’interlignage sous le nom : tout se compare d’un coup d’œil.', opts: TX.stylesOpts() },
  ] },
  { id: 'police', icon: 'letter-case', label: 'Police et taille', group: 'Texte', panel: true, controls: [], render: (o, W, v, redraw) => TX.renderFont(o, v, redraw), variants: [
    { title: 'Deux listes', style: 'a', desc: 'Police (Source Sans 3 / Source Serif 4) et taille (échelle du document) dans deux listes déroulantes d’une carte du panneau.', opts: TX.fontOpts() },
    { title: 'Barre au-dessus de la page', style: 'b', desc: 'Police en deux boutons « Aa » et taille par pas − / + sur l’échelle typographique, dans une barre au-dessus de la page : rien à dérouler dans le panneau.', opts: TX.fontOpts() },
    { title: 'Aperçu et échelle', style: 'c', desc: 'Deux grandes tuiles « Aa » pour la police, une rangée de tailles dont les chiffres grossissent, plus une taille libre ; l’interlignage suit tout seul (130 %, grille de 3 px).', opts: TX.fontOpts() },
  ] },
  { id: 'avance', icon: 'menu-2', label: 'Options avancées', group: 'Texte', panel: true, controls: [], render: (o, W, v, redraw) => TX.renderAdv(o, v, redraw), variants: [
    { title: 'Burger sur le bloc', style: 'a', desc: 'Une icône burger à l’angle du paragraphe sélectionné ouvre, juste à côté du texte, interlignage, tracking, kerning, alignement, césure, retrait et espaces.', opts: TX.advOpts() },
    { title: 'Burger dans la carte', style: 'b', desc: 'L’icône est dans l’en-tête de la carte « Texte » du panneau ; elle déplie une zone « Avancé » en deux colonnes sous la saisie.', opts: TX.advOpts() },
    { title: 'Burger dans la barre', style: 'c', desc: 'Dernier bouton de la barre de mise en forme ; ouvre un panneau flottant qui recouvre le panneau, avec « tout remettre comme le style ».', opts: TX.advOpts() },
  ] },
  { id: 'listes', icon: 'list-numbers', label: 'Listes', group: 'Texte', panel: true, controls: [], render: (o, W, v, redraw) => TX.renderList(o, v, redraw), variants: [
    { title: 'Deux boutons', style: 'a', desc: 'Puces et liste numérotée en deux boutons à bascule dans la barre : un seul aspect par type.', opts: TX.listOpts() },
    { title: 'Bouton et menu de repères', style: 'b', desc: 'Un bouton « liste » avec une flèche qui ouvre dix repères en aperçu : disque, tiret, carré, 1. 1) 01 a. A. i.', opts: TX.listOpts() },
    { title: 'Carte « Liste »', style: 'c', desc: 'Une carte du panneau : type, repère, numéro de départ, retrait, espace entre éléments et repère coloré, avec aperçu en direct.', opts: TX.listOpts() },
  ] },
  { id: 'barre', icon: 'layout-navbar', label: 'Barre de texte', group: 'Texte', panel: true, controls: [], render: (o, W, v, redraw) => TX.renderBar(o, v, redraw), variants: [
    { title: 'Actuelle', old: true, style: 'a', desc: 'Style, cinq boutons de mise en forme, liste, zone de saisie et ligne d’aide : la hauteur de référence.', opts: TX.barOpts() },
    { title: 'Compacte', style: 'b', desc: 'Une seule ligne (exposant et indice rangés sous « … »), burger des options avancées, aide en infobulle, saisie plus serrée : la hauteur est mesurée en direct.', opts: TX.barOpts() },
    { title: 'Barre volante', style: 'c', desc: 'Plus de barre dans le panneau : elle apparaît au-dessus de la sélection, dans la page. Le panneau ne garde que la saisie : le plus économe.', opts: TX.barOpts() },
  ] },
  { id: 'pistes', icon: 'bulb', label: 'Pistes à ajouter', group: 'Texte', panel: true, controls: [], render: (o, W, v, redraw) => TX.renderIdeas(o, v, redraw), variants: [
    { title: 'Paragraphe', style: 'a', desc: 'Justifié et césure, retrait, citation à filet, lettrine, filets, deux colonnes de texte : à retenir ou non.', opts: TX.ideasOpts() },
    { title: 'Caractères', style: 'b', desc: 'Couleur, surlignage, capitales, barré, chiffres tabulaires, ligatures, liens, ordinaux.', opts: TX.ideasOpts() },
    { title: 'Document', style: 'c', desc: 'Typographie française automatique, veuves et orphelines, styles modifiables partout, ajustement au cadre, notes, recherche, compteur.', opts: TX.ideasOpts() },
  ] },
];
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/* ---------- état ---------- */
const state = {};   // `${topic}-${lettre}` → options modifiées (en mémoire seulement)
const stage = { width: '1/2', tint: false };
let topicId = TOPICS[0].id, vi = 0;
const root = document.getElementById('labo');

function fromHash() {
  const m = /^#([a-z]+)-([A-Z])$/.exec(location.hash);
  const tp = m && TOPICS.find(x => x.id === m[1]);
  if (tp && LETTERS.indexOf(m[2]) < tp.variants.length) { topicId = tp.id; vi = LETTERS.indexOf(m[2]); }
}
function go(tid, i, push = true) {
  const tp = TOPICS.find(x => x.id === tid); topicId = tid; vi = Math.max(0, Math.min(tp.variants.length - 1, i));
  const hash = `#${tid}-${LETTERS[vi]}`; if (location.hash !== hash) history[push ? 'pushState' : 'replaceState'](null, '', hash);
  draw();
}
const optsOf = (tp, i) => (state[`${tp.id}-${LETTERS[i]}`] ||= JSON.parse(JSON.stringify(tp.variants[i].opts)));

/* ---------- interface ---------- */
function drawNav(tp) {
  const side = h('nav', { class: 'labo-side', 'aria-label': 'Sujets' });
  TOPICS.forEach(x => {
    side.append(h('button', { type: 'button', class: 'labo-topic' + (x.id === topicId ? ' on' : ''), onclick: () => go(x.id, 0) },
      h('i', { class: 'ti ti-' + x.icon }), h('span', { textContent: x.label }), h('em', { textContent: String(x.variants.length) })));
    if (x.id === topicId) side.append(h('div', { class: 'labo-vars' }, x.variants.map((v, i) => h('button', { type: 'button', class: 'labo-var' + (i === vi ? ' on' : ''), onclick: () => go(x.id, i) },
      h('b', { class: i === vi ? 'on' : '', textContent: LETTERS[i] }), h('span', { textContent: v.title })))));
  });
  return side;
}
function control(tp, c, o, redraw) {
  if (c.type === 'check') return h('div', { class: 'pp-switchrow' }, h('span', { textContent: c.label }),
    h('button', { type: 'button', role: 'switch', 'aria-checked': String(!!o[c.k]), 'aria-label': c.label, class: 'pp-switch' + (o[c.k] ? ' on' : ''), onclick: e => { o[c.k] = !o[c.k]; e.currentTarget.classList.toggle('on', o[c.k]); e.currentTarget.setAttribute('aria-checked', String(!!o[c.k])); redraw(); } }));
  if (c.type === 'radio') return h('div', { class: 'labo-group' }, h('div', { class: 'labo-lab', textContent: c.label }), h('div', { class: 'labo-radios' }, Object.entries(c.choices).map(([v, l]) =>
    h('label', {}, h('input', { type: 'radio', name: c.k, value: v, checked: o[c.k] === v, onchange: () => { o[c.k] = v; redraw(); } }), l))));
  const s = h('select', { onchange: e => { o[c.k] = e.target.value; redraw(); } }, Object.entries(c.choices).map(([v, l]) => h('option', { value: v, textContent: l })));
  s.value = o[c.k]; return h('label', { class: 'labo-group' }, h('div', { class: 'labo-lab', textContent: c.label }), s);
}
/* Cartes repliables, comme les propriétés de l'éditeur (variante B) ; l'état replié est gardé le temps de la session */
const shut = new Set();
const optCard = (id, icon, name, nodes) => {
  const open = !shut.has(id);
  return h('section', { class: 'pp-card' },
    h('div', { class: 'pp-card-h' }, h('i', { class: 'ti ti-' + icon }), h('b', { textContent: name }), h('span', { class: 'pp-sp' }),
      h('button', { type: 'button', class: 'pp-chev', 'aria-expanded': String(open), 'aria-label': open ? 'Replier' : 'Déplier', onclick: () => { open ? shut.add(id) : shut.delete(id); draw(); } }, h('i', { class: 'ti ti-chevron-' + (open ? 'up' : 'down') }))),
    open ? h('div', { class: 'pp-body' }, nodes) : null);
};
/* Rendu : la dataviz dans un conteneur de hauteur réglable ; interactions à la souris pour les types qui en ont (anneau) */
function renderVizTopic(o, W, paint) {
  const ty = VIZ_TYPES[o.kind], opts = o.viz, ui = (o.__ui ||= { sel: -1, drag: null });
  if (ty.heights && o.boxH) Object.assign(opts, { hmode: 'fixed', hfixed: o.boxH, valign: o.valign }); else if (ty.heights) { delete opts.hmode; delete opts.hfixed; }
  const r = renderVizFull({ kind: o.kind, opts, head: o.head }, W, { locale: 'en-GB', pal: paletteOf(DEFAULT_THEME, {}), ui });
  const box = h('div', { class: 'labo-vizbox' + (o.boxH ? ' fixed' : ''), style: { width: W + 'px', minHeight: o.boxH ? o.boxH + 'px' : null, display: 'flex', alignItems: VALIGN_FLEX[o.valign] || 'flex-start' } });
  box.append(r ? r.node : h('div', { textContent: 'Rendu impossible' }));
  /* réordonner à la souris : les autres éléments se réajustent en direct (vizreorder.js) */
  box.addEventListener('pointerdown', e => {
    const rn = e.target.closest && e.target.closest('[data-reorder]');
    if (rn && !e.button) startReorder(e, rn, { opts, root: () => document.querySelector('.labo-vizbox'), redraw: paint, done: () => paint() });
  });
  if (ty.edit && r) {
    const toPt = e => { const svg = document.querySelector('.labo-vizbox svg'); if (!svg) return { x: 0, y: 0 }; const rc = svg.getBoundingClientRect(), k = rc.width / W || 1; return { x: (e.clientX - rc.left) / k, y: (e.clientY - rc.top) / k }; };
    box.addEventListener('pointerdown', e => {
      const n = e.target.closest && e.target.closest('[data-hit]'); if (!n || e.button) return;
      const [kind, i] = n.getAttribute('data-hit').split(':'), api = { ui, select(k) { ui.sel = k; }, redraw: paint };
      const drag = ty.edit.start({ kind, i: +i }, opts, r.meta, api, toPt(e)); if (!drag) return;
      e.preventDefault();
      const move = ev => drag.move(toPt(ev)), up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); if (drag.end) drag.end(); ui.drag = null; paint(); };
      window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); paint();
    });
  }
  return box;
}
/* Cartes de réglages : conteneur, titre, options du type, données (fausses, modifiables) */
function vizExtra(o, v, paint, redraw) {
  const ty = VIZ_TYPES[o.kind], pal = paletteOptions({ theme: DEFAULT_THEME, colors: {} }), ctx = { changed: paint, restructure: () => { paint(); redraw(); } };
  const range = h('input', { type: 'range', min: 0, max: 900, step: 3, value: o.boxH || 0 });
  const out = h('output', { textContent: o.boxH ? `${o.boxH} px` : 'auto' });
  range.addEventListener('input', () => { o.boxH = +range.value; out.textContent = o.boxH ? `${o.boxH} px` : 'auto'; paint(); });
  const align = { type: 'radio', k: 'valign', label: 'Alignement vertical dans le conteneur', choices: { top: 'En haut', center: 'Centré', bottom: 'En bas' } };
  const optionFields = (ty.fields || []).filter(f => f.t !== 'table' && f.t !== 'list' && f.g !== 'data');
  const dataNodes = [];
  for (const f of ty.fields || []) { if (f.t === 'table') dataNodes.push(gridEditor(tableAdapter(f, o.viz, pal, ['sky', 'yellow', 'blue', 'slate', 'grey']), ctx, { downloadName: o.kind })); else if (f.t === 'list') dataNodes.push(...buildFields([f], o.viz, ctx, pal, h)); }
  if (ty.data) dataNodes.push(gridEditor(recordsAdapter(ty.data, o.viz, pal), ctx, { downloadName: o.kind }));
  return [
    optCard('viz-box', 'box-padding', 'Conteneur', [h('label', { class: 'labo-group' }, h('div', { class: 'labo-lab', textContent: 'Hauteur du conteneur (0 = automatique)' }), range, out), control(null, align, o, paint),
      h('p', { class: 'hint', textContent: (ty.edit ? 'Glisser l’anneau, un libellé ou le point blanc. ' : '') + (['donut', 'survey', 'scatter', 'sunburst', 'bubbles', 'treemap', 'sankey'].includes(o.kind) ? 'Ce type n’a pas de réordonnancement à la souris (ordre dans les données).' : 'Glisser un élément pour changer son ordre : les autres se réajustent, écarts proportionnels.') })]),
    optCard('viz-head', 'typography', 'Titre et source', buildFields([{ k: 'title', t: 'text', label: 'Titre' }, { k: 'source', t: 'text', label: 'Source' }], o.head, ctx, {}, h)),
    optionFields.length ? optCard('viz-opts', 'adjustments', 'Options du type', buildFields(optionFields, o.viz, ctx, pal, h)) : null,
    dataNodes.length ? optCard('viz-data', 'table', 'Données (fausses)', dataNodes) : null,
  ];
}

function draw() {
  const tp = TOPICS.find(x => x.id === topicId), v = tp.variants[vi], o = optsOf(tp, vi);
  document.title = `${t('Labo')} — GSC tools`;
  const sheet = h('div', { class: 'page labo-sheet', style: { background: tp.panel ? 'var(--bg)' : stage.tint ? 'var(--c-tint-sky)' : '#fff' } });
  applyVars(sheet, cssVars(DEFAULT_THEME, {}));
  const paint = () => { sheet.replaceChildren(tp.render(o, WIDTHS[stage.width], v, paint)); };
  paint();
  const settings = tp.controls.filter(c => c.type !== 'check'), checks = tp.controls.filter(c => c.type === 'check');
  const opts = tp.panel ? null : h('aside', { class: 'labo-opts' },
    settings.length ? optCard('settings', 'adjustments', 'Réglages', settings.map(c => control(tp, c, o, paint))) : null,
    checks.length ? optCard('options', 'list-check', 'Options', checks.map(c => control(tp, c, o, paint))) : null,
    ...(tp.extra ? tp.extra(o, v, paint, draw) : []),
    h('button', { type: 'button', class: 'pp-btn', onclick: () => { delete state[`${tp.id}-${LETTERS[vi]}`]; draw(); } }, h('i', { class: 'ti ti-restore' }), h('span', { textContent: 'Réinitialiser la variante' })));
  const view = h('div', { class: 'labo-stage' },
    tp.panel ? null : h('div', { class: 'labo-tools' },
      h('label', {}, 'Largeur de colonne ', h('select', { onchange: e => { stage.width = e.target.value; paint(); } }, Object.entries(WIDTHS).map(([k, w]) => h('option', { value: k, selected: k === stage.width, textContent: `${k} (${Math.round(w)} px)` })))),
      h('label', { class: 'labo-check' }, h('input', { type: 'checkbox', checked: stage.tint, onchange: e => { stage.tint = e.target.checked; sheet.style.background = stage.tint ? 'var(--c-tint-sky)' : '#fff'; } }), 'Sur fond de section teinté')),
    h('div', { class: 'labo-canvas' }, sheet));
  const chips = h('div', { class: 'labo-chips' }, TOPICS.map(x => h('button', { type: 'button', class: x.id === topicId ? 'on' : '', onclick: () => go(x.id, 0) }, h('i', { class: 'ti ti-' + x.icon }), x.label)));
  const head = h('div', { class: 'labo-title' }, h('b', { class: 'letter', textContent: LETTERS[vi] }), h('h2', { textContent: v.title }),
    v.base ? h('span', { class: 'mark', textContent: 'actuelle' }) : null, v.old ? h('span', { class: 'mark', textContent: 'ancienne' }) : null, v.kept ? h('span', { class: 'mark kept', textContent: `retenue — ${v.kept}` }) : null);
  const main = h('main', { class: 'labo-main' }, chips, h('section', { class: 'labo-view' }, head, h('p', { class: 'labo-desc', textContent: v.desc }), h('div', { class: 'labo-work' + (tp.panel ? ' solo' : '') }, opts, view)));
  const bar = h('div', { class: 'labo-bar' },
    h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Précédente', disabled: vi === 0, onclick: () => go(topicId, vi - 1) }, h('i', { class: 'ti ti-chevron-left' })),
    h('div', { class: 'letters' }, tp.variants.map((_, i) => h('button', { type: 'button', class: i === vi ? 'on' : '', onclick: () => go(topicId, i), textContent: LETTERS[i] }))),
    h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Suivante', disabled: vi === tp.variants.length - 1, onclick: () => go(topicId, vi + 1) }, h('i', { class: 'ti ti-chevron-right' })),
    h('span', { class: 'bar-title', textContent: v.title }));
  root.replaceChildren(drawNav(tp), main, bar);
}

/* clavier et balayage */
window.addEventListener('keydown', e => {
  if (/INPUT|SELECT|TEXTAREA/.test((e.target || {}).tagName || '')) return;
  const tp = TOPICS.find(x => x.id === topicId);
  if (e.key === 'ArrowRight') go(topicId, vi + 1, false); else if (e.key === 'ArrowLeft') go(topicId, vi - 1, false);
  else if (e.key === 'ArrowDown') { const n = TOPICS.indexOf(tp) + 1; if (TOPICS[n]) go(TOPICS[n].id, 0, false); }
  else if (e.key === 'ArrowUp') { const n = TOPICS.indexOf(tp) - 1; if (TOPICS[n]) go(TOPICS[n].id, 0, false); }
});
let tx = null;
root.addEventListener('touchstart', e => { tx = e.touches[0].clientX; }, { passive: true });
root.addEventListener('touchend', e => { if (tx == null) return; const dx = e.changedTouches[0].clientX - tx; tx = null; if (Math.abs(dx) > 60) go(topicId, vi + (dx < 0 ? 1 : -1), false); });
window.addEventListener('hashchange', () => { fromHash(); draw(); });

initI18n();
fromHash(); draw();
