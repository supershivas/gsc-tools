/* Labo du Factsheet creator : banc d'essai de variantes, sans rien changer à l'app. Données d'exemple en dur,
   rien lu ni écrit dans le localStorage. Ajouter un sujet ou une variante = ajouter une entrée dans TOPICS.
   Écran à hauteur fixe ; sujets dans la marge (puces sur mobile), variantes A, B, C… (A = l'actuelle ou la base) ;
   adresse #sujet-LETTRE ; flèches du clavier et balayage pour changer de variante. */
import { initI18n, t } from './i18n.js';
import { h } from './render.js';
import { cssVars, applyVars, colWidth, insetW, DEFAULT_THEME } from './tokens.js';
import { renderCard } from './card.js';
import { CARD_DEFAULTS, CARD_CHECKS } from './cardmodel.js';
import { renderFigure, FIGURE_DEFAULTS } from './figure.js';
import { ICON_OPTIONS } from './viz/icons.js';

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
];
const LETTERS = 'ABCDEFGHIJ';

/* ---------- état ---------- */
const state = {};   // `${topic}-${lettre}` → options modifiées (en mémoire seulement)
const stage = { width: '1/2', tint: false };
let topicId = TOPICS[0].id, vi = 0;
const root = document.getElementById('labo');

function fromHash() {
  const m = /^#([a-z]+)-([A-J])$/.exec(location.hash);
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
  if (c.type === 'check') return h('label', { class: 'labo-check' }, h('input', { type: 'checkbox', checked: !!o[c.k], onchange: e => { o[c.k] = e.target.checked; redraw(); } }), c.label);
  if (c.type === 'radio') return h('div', { class: 'labo-group' }, h('div', { class: 'labo-lab', textContent: c.label }), h('div', { class: 'labo-radios' }, Object.entries(c.choices).map(([v, l]) =>
    h('label', {}, h('input', { type: 'radio', name: c.k, value: v, checked: o[c.k] === v, onchange: () => { o[c.k] = v; redraw(); } }), l))));
  const s = h('select', { onchange: e => { o[c.k] = e.target.value; redraw(); } }, Object.entries(c.choices).map(([v, l]) => h('option', { value: v, textContent: l })));
  s.value = o[c.k]; return h('label', { class: 'labo-group' }, h('div', { class: 'labo-lab', textContent: c.label }), s);
}
function draw() {
  const tp = TOPICS.find(x => x.id === topicId), v = tp.variants[vi], o = optsOf(tp, vi);
  document.title = `${t('Labo')} — GSC tools`;
  const sheet = h('div', { class: 'page labo-sheet', style: { background: stage.tint ? 'var(--c-tint-sky)' : '#fff' } });
  applyVars(sheet, cssVars(DEFAULT_THEME, {}));
  const paint = () => { sheet.replaceChildren(tp.render(o, WIDTHS[stage.width])); };
  paint();
  const opts = h('aside', { class: 'labo-opts' }, h('h3', { textContent: 'Options' }), tp.controls.map(c => control(tp, c, o, paint)),
    h('button', { type: 'button', class: 'btn', onclick: () => { delete state[`${tp.id}-${LETTERS[vi]}`]; draw(); } }, h('i', { class: 'ti ti-restore' }), 'Réinitialiser la variante'));
  const view = h('div', { class: 'labo-stage' },
    h('div', { class: 'labo-tools' },
      h('label', {}, 'Largeur de colonne ', h('select', { onchange: e => { stage.width = e.target.value; paint(); } }, Object.entries(WIDTHS).map(([k, w]) => h('option', { value: k, selected: k === stage.width, textContent: `${k} (${Math.round(w)} px)` })))),
      h('label', { class: 'labo-check' }, h('input', { type: 'checkbox', checked: stage.tint, onchange: e => { stage.tint = e.target.checked; sheet.style.background = stage.tint ? 'var(--c-tint-sky)' : '#fff'; } }), 'Sur fond de section teinté')),
    h('div', { class: 'labo-canvas' }, sheet));
  const chips = h('div', { class: 'labo-chips' }, TOPICS.map(x => h('button', { type: 'button', class: x.id === topicId ? 'on' : '', onclick: () => go(x.id, 0) }, h('i', { class: 'ti ti-' + x.icon }), x.label)));
  const head = h('div', { class: 'labo-title' }, h('b', { class: 'letter', textContent: LETTERS[vi] }), h('h2', { textContent: v.title }),
    v.base ? h('span', { class: 'mark', textContent: 'actuelle' }) : null, v.kept ? h('span', { class: 'mark kept', textContent: `retenue — ${v.kept}` }) : null);
  const main = h('main', { class: 'labo-main' }, chips, h('section', { class: 'labo-view' }, head, h('p', { class: 'labo-desc', textContent: v.desc }), h('div', { class: 'labo-work' }, opts, view)));
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
