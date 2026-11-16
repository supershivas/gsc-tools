/* Chiffre clé : type de contenu à part (pas une dataviz). Grand chiffre en Source Serif 4, éventuellement précédé d'une icône,
   texte en dessous. Le contour éventuel est celui de la colonne (voir render.js). */
import { el, s, SW, SERIF, SANS, pxOf, fitSize, inlineMk, stripMk, colorRef, mw } from './viz/util.js';
import { ICONS, ICON_OPTIONS, customChoices } from './viz/icons.js';
import { iconNode } from './viz/picto.js';
import { TYPE, VIZ } from './tokens.js';

export const FIGURE_DEFAULTS = () => ({
  value: '5 000',
  icon: 'none',
  iconStyle: 'plain',
  text: 'Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim',
});
const ICON_CHOICES = (root, icons) => ({ none: 'Aucune', ...ICON_OPTIONS, ...customChoices(null, icons) });
/** une barre est-elle dessinée (chiffre principal ou chiffres à côté) ? Ses réglages d'aspect n'ont de sens qu'alors */
const anyBar = (o) => +o.bar > 0 || (Array.isArray(o.more) && o.more.some((m) => +m.bar > 0));
const NO_BAR = 'Réglez une barre au-dessus de 0 % pour choisir son aspect.';
/* `c` : carte du panneau qui porte le champ (main = Contenu, icon, bar, head, more) — voir props/col-figure.js */
export const FIGURE_FIELDS = [
  { c: 'main', k: 'value', t: 'text', rich: true, label: 'Chiffre' },
  { c: 'main', k: 'text', t: 'area', fmt: 'inline', label: 'Texte' },
  { c: 'icon', k: 'icon', t: 'select', label: 'Icône devant le chiffre', options: ICON_CHOICES, icons: true },
  {
    c: 'icon',
    k: 'iconStyle',
    t: 'select',
    seg: true,
    label: 'Style de l’icône',
    options: { plain: 'Pictogramme seul', circle: 'Dans une pastille' },
    def: 'plain',
    when: (o) => !!o.icon && o.icon !== 'none',
    why: 'Choisissez d’abord une icône.',
  },
  {
    c: 'icon',
    k: 'iconRing',
    t: 'select',
    label: 'Trait de la pastille de l’icône',
    options: { thin: 'Fin', medium: 'Moyen', thick: 'Épais' },
    def: 'thin',
    when: (o) => !!o.icon && o.icon !== 'none' && o.iconStyle === 'circle',
    why: 'Choisissez « Dans une pastille » pour régler son trait.',
  },
  { c: 'bar', k: 'bar', t: 'number', label: 'Barre de progression (%)', min: 0, max: 100 },
  { c: 'bar', k: 'barColor', t: 'color', label: 'Couleur de la barre', def: 'yellow', when: anyBar, why: NO_BAR },
  { c: 'bar', k: 'barRest', t: 'color', label: 'Couleur du reste de la barre', def: 'tint-blue', when: anyBar },
  {
    c: 'bar',
    k: 'barHeight',
    t: 'select',
    label: 'Hauteur de la barre',
    options: { thin: 'Fine', normal: 'Normale', thick: 'Épaisse' },
    def: 'normal',
    when: anyBar,
  },
  {
    c: 'bar',
    k: 'barCorners',
    t: 'select',
    label: 'Coins de la barre',
    options: { round: 'Arrondis', square: 'Droits' },
    def: 'round',
    when: anyBar,
  },
  { c: 'head', k: 'headText', t: 'text', label: 'Texte de l’en-tête' },
  { c: 'head', k: 'headIcon', t: 'select', label: 'Icône de l’en-tête', options: ICON_CHOICES, icons: true },
  {
    c: 'more',
    k: 'more',
    t: 'list',
    label: 'Chiffres placés à côté du premier, dans le même cadre.',
    full: 'Deux chiffres au plus à côté du premier.',
    min: 0,
    max: 2,
    item: () => ({ value: '50 %', text: '', icon: 'none', bar: 0 }),
    fields: [
      { k: 'value', t: 'text', rich: true, label: 'Chiffre' },
      { k: 'text', t: 'area', fmt: 'inline', label: 'Texte' },
      { k: 'icon', t: 'select', label: 'Icône devant le chiffre', options: ICON_CHOICES, icons: true },
      { k: 'bar', t: 'number', label: 'Barre de progression (%)', min: 0, max: 100 },
    ],
  },
];

const esc = (t) =>
  String(t || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');

/** Icône au trait, à la hauteur de ligne du chiffre ; pastille ronde 0,5 pt en option ; icons : bibliothèque du document (rc.icons) */
export function figureIcon(key, size, circle, icons, ring = 1) {
  const custom = String(key || '').startsWith('custom:'),
    ic = ICONS[key];
  if (!ic && !custom) return null;
  const G = circle ? size * 0.58 : size * 0.82,
    k = G / 24,
    box = circle ? size : G, // pictogramme seul : la boîte est celle du dessin, sans marge autour (il s'aligne sur le texte, sans écart de trop)
    o = (box - G) / 2;
  return s(
    'svg',
    { width: box, height: box, viewBox: `0 0 ${box} ${box}`, class: 'vi-ic fg-ic' },
    circle
      ? s('circle', {
          cx: size / 2,
          cy: size / 2,
          r: size / 2 - (SW * ring) / 2,
          fill: 'none',
          stroke: 'currentColor',
          'stroke-width': SW * ring,
        })
      : null,
    custom
      ? iconNode({}, key, o, o, G, G, 'blue', icons)
      : s('path', {
          d: ic.d,
          fill: 'none',
          stroke: 'currentColor',
          'stroke-width': SW / k,
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round',
          transform: `translate(${o} ${o}) scale(${k})`,
        }),
  );
}

/** hauteur de la barre de progression en px ; « Normale » = 15, la hauteur d'avant */
const BAR_H = { thin: 9, normal: 15, thick: 21 };
const RING_K = { thin: 1, medium: 2, thick: 3 };

/** Barre de progression : rectangle à coins arrondis, contour 0,5 pt, partie pleine puis reste (éléments SVG réels, lisibles par l'export PDF) */
function progressBar(pct, W, o) {
  const H = BAR_H[o.barHeight] ?? BAR_H.normal,
    p = Math.max(0, Math.min(100, +pct || 0)),
    w = Math.max(10, W),
    x = SW / 2,
    iw = w - SW,
    r = o.barCorners === 'square' ? 0 : 4.5,
    fw = (iw * p) / 100;
  const hh = H - SW,
    rr = Math.min(r, fw / 2),
    fill = colorRef(o.barColor || 'yellow');
  const part =
    p >= 100
      ? s('rect', { x, y: x, width: iw, height: hh, rx: r, fill })
      : s('path', {
          d: `M${x + rr} ${x}H${x + fw}V${x + hh}H${x + rr}A${rr} ${rr} 0 0 1 ${x} ${x + hh - rr}V${x + rr}A${rr} ${rr} 0 0 1 ${x + rr} ${x}Z`,
          fill,
        }); // sans clipPath : l'export PDF ne le lit pas
  return s(
    'svg',
    { width: w, height: H, viewBox: `0 0 ${w} ${H}`, class: 'fg-bar', style: { display: 'block', overflow: 'visible' } },
    s('rect', { x, y: x, width: iw, height: hh, rx: r, fill: colorRef(o.barRest || 'tint-blue') }),
    p > 0 ? part : null,
    s('rect', { x, y: x, width: iw, height: H - SW, rx: r, fill: 'none', stroke: 'var(--c-blue)', 'stroke-width': SW }),
  );
}

/** W = largeur utile (px), align = alignement du texte de la colonne (left | center | right | justify) ; env : environnement de rendu (env.rc) */
export function renderFigure(o, W, align, env) {
  const more = Array.isArray(o.more) ? o.more : [],
    headText = String(o.headText || '').trim(),
    headIcon = o.headIcon && o.headIcon !== 'none';
  if (!more.length && !headText && !headIcon && !(+o.bar > 0)) return oneFigure(o, W, align, o, undefined, env);
  const gap = 18,
    items = [o, ...more],
    n = items.length,
    avail = (W || 9999) - gap * (n - 1),
    bodyPx = pxOf(TYPE.body.size);
  /* largeur de chaque cellule : égale, mais jamais plus étroite que son mot le plus long (le texte ne se coupe pas en plein mot) */
  const minW = items.map((it) =>
    Math.ceil(
      Math.max(
        0,
        ...String(stripMk(it.text || ''))
          .split(/\s+/)
          .map((wd) => mw(wd, 400, SANS, bodyPx)),
      ) + 2,
    ),
  );
  let ws = items.map(() => avail / n);
  const custom = Array.isArray(o.widths) && o.widths.length === n && o.widths.every((f) => f > 0); // largeurs réglées à la poignée entre deux chiffres (o.widths : fractions)
  for (let pass = 0; pass < (custom ? 0 : 3); pass++) {
    const fixed = ws.map((w, i) => w < minW[i]),
      used = ws.reduce((a, w, i) => a + (fixed[i] ? minW[i] : 0), 0),
      free = fixed.filter((f) => !f).length;
    ws = ws.map((w, i) => (fixed[i] ? minW[i] : free ? Math.max(minW[i], (avail - used) / free) : w));
  }
  if (custom) {
    const sum = o.widths.reduce((a, b) => a + b, 0);
    ws = o.widths.map((f) => (avail * f) / sum);
  }
  /* un seul corps pour tous les chiffres : le plus petit de ceux qui rentrent dans leur cellule */
  const base = pxOf(TYPE.figure.size) * (+o.scale || 1);
  const fsAll = Math.min(
    ...items.map((it, i) =>
      fitSize(
        stripMk(it.value),
        TYPE.figure.weight,
        SERIF,
        base,
        ws[i] - (it.icon && it.icon !== 'none' ? TYPE.figure.lh + VIZ.iconGap : 0) - 1,
        0.4,
      ),
    ),
  );
  const cells = items.map((it, i) =>
    el('div', { class: 'fg-cell', style: { width: ws[i] + 'px' } }, oneFigure(it, ws[i], align, o, fsAll, env)),
  );
  let x = 0;
  const splits = ws.slice(0, -1).map((w, i) => {
    x += w;
    const sp = el('div', {
      class: 'fig-split',
      'data-split': i,
      style: { position: 'absolute', top: '0', bottom: '0', left: x + 'px', width: gap + 'px' },
    });
    x += gap;
    return sp;
  });
  const row = el('div', { class: 'fg-row', style: { gap: gap + 'px', position: 'relative' } }, ...cells, ...splits); // poignées vides entre les chiffres : glisser règle leurs largeurs (editor/handles.js)
  if (!headText && !headIcon) return row;
  const ic = headIcon ? figureIcon(o.headIcon, 54, false, env.rc.icons) : null;
  return el(
    'div',
    { class: 'fg-all' },
    el('div', { class: 'fg-over' }, ic, headText ? el('span', { textContent: headText.toUpperCase() }) : null),
    row,
  );
}

function oneFigure(o, W, align, g, fsAll, env) {
  const base0 = pxOf(TYPE.figure.size),
    base = base0 * (+o.scale || 1),
    lh = TYPE.figure.lh,
    /* un chiffre « à côté » n'a pas son propre style d'icône : il reprend celui du premier */
    icon =
      o.icon && o.icon !== 'none'
        ? figureIcon(o.icon, lh, (o.iconStyle ?? g.iconStyle) === 'circle', env.rc.icons, RING_K[g.iconRing] ?? 1)
        : null;
  const avail = (W || 9999) - (icon ? lh + VIZ.iconGap : 0) - 1;
  const fs =
    fsAll != null
      ? Math.min(fsAll, fitSize(stripMk(o.value), TYPE.figure.weight, SERIF, base, avail, 0.4))
      : fitSize(stripMk(o.value), TYPE.figure.weight, SERIF, base, avail, 0.4);
  const jc = { center: 'center', right: 'flex-end' }[align] || 'flex-start';
  const head = el(
    'div',
    { class: 'fg-head', style: { justifyContent: jc } },
    icon,
    el('div', {
      class: 'vf-value',
      innerHTML: inlineMk(o.value, false, env.rc.typo),
      style: fs !== base0 ? { fontSize: fs + 'px', lineHeight: 1.1, whiteSpace: 'nowrap' } : {},
    }),
  );
  return el(
    'div',
    { class: 'fg', style: align && align !== 'left' ? { textAlign: align } : {} },
    head,
    o.text && o.text.trim() ? el('div', { class: 'vf-text', innerHTML: inlineMk(o.text, false, env.rc.typo) }) : null,
    +o.bar > 0 ? el('div', { class: 'fg-barbox' }, progressBar(o.bar, W, g)) : null, // poussée en bas de la cellule : les barres de chiffres voisins s'alignent
  );
}
