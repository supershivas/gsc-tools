/* Grille de pourcentage (« waffle chart ») : une grille de cases (10 × 10 par défaut), les premières sont remplies à hauteur de la valeur,
   en lisant ligne par ligne. Une catégorie = une couleur ; un repère (croix, point, coche) peut marquer les cases pleines. */
import { VIZ, TYPE } from '../tokens.js';
import { s, SW, colorRef, layoutLegend, drawLegendWrap } from './util.js';
import { ICONS } from './icons.js';
import { t } from '../i18n.js';

const MARKS = { none: 'Aucun', cross: 'Croix', dot: 'Point', check: 'Coche', ...Object.fromEntries(Object.entries(ICONS).map(([k, v]) => ['icon:' + k, `Icône · ${v.label}`])) };

export default {
  label: 'Grille de pourcentage (waffle)', icon: 'layout-grid', family: 'part', sideShare: 65,
  defaults: () => ({
    cols: 10, gridRows: 10, total: 100, shape: 'rounded', gap: 3, legend: false,
    rows: [{ label: t('Logements endommagés ou détruits'), value: 14, color: 'blue', mark: 'cross', markColor: 'yellow' }, { label: t('Autres logements'), value: 86, color: 'white', mark: 'none', markColor: 'yellow' }],
  }),
  fields: [
    { k: 'cols', t: 'number', label: 'Cases par ligne', min: 1, max: 40 },
    { k: 'gridRows', t: 'number', label: 'Nombre de lignes', min: 1, max: 40 },
    { k: 'total', t: 'number', label: 'Valeur de la grille entière (0 = somme des valeurs)', min: 0, step: 'any' },
    { k: 'shape', t: 'select', label: 'Forme des cases', options: { square: 'Carrée', rounded: 'Arrondie', circle: 'Ronde' } },
    { k: 'gap', t: 'number', label: 'Espace entre les cases (px)', min: 0, max: 12 },
    { k: 'legend', t: 'bool', label: 'Afficher la légende' },
  ],
  /* chaque catégorie a sa couleur et son repère (croix, point, coche ou une icône), choisis dans le tableau */
  data: { k: 'rows', min: 1, cols: [{ k: 'label', label: 'Libellé', t: 'text' }, { k: 'value', label: 'Valeur', t: 'number', def: 10 }, { k: 'color', label: 'Couleur', t: 'color', def: 'blue' },
    { k: 'mark', label: 'Repère', t: 'select', def: 'none', options: MARKS, icons: true }, { k: 'markColor', label: 'Couleur du repère', t: 'color', def: 'yellow' }],
    item: () => ({ label: '', value: 10, color: 'blue', mark: 'none', markColor: 'yellow' }) },
  dataHint: 'Une ligne par catégorie : les cases se remplissent dans cet ordre, ligne par ligne ; une catégorie blanche reste une case vide. Le repère se choisit par catégorie.',
  render(o, W, env) {
    const cols = Math.max(1, Math.round(+o.cols) || 10), rowsN = Math.max(1, Math.round(+o.gridRows) || 10), n = cols * rowsN, gap = Math.max(0, +o.gap || 0);
    const cats = (o.rows || []).map(r => ({ label: String(r.label || ''), value: Math.max(0, +r.value || 0), color: r.color || 'blue', mark: r.mark || 'none', markColor: r.markColor || 'yellow' }));
    const sum = cats.reduce((a, c) => a + c.value, 0), total = +o.total > 0 ? +o.total : sum || 1;
    /* nombre de cases par catégorie : arrondi au plus fort reste, sans dépasser la grille */
    const raw = cats.map(c => c.value / total * n), cnt = raw.map(Math.floor);
    let left = Math.min(n, Math.round(raw.reduce((a, b) => a + b, 0))) - cnt.reduce((a, b) => a + b, 0);
    raw.map((v, i) => [v - Math.floor(v), i]).sort((a, b) => b[0] - a[0]).forEach(([, i]) => { if (left > 0) { cnt[i]++; left--; } });
    const size = Math.max(4, (W - gap * (cols - 1)) / cols), gridH = rowsN * size + (rowsN - 1) * gap;
    const LG = o.legend && cats.length > 1 ? layoutLegend(cats.map(c => ({ name: c.label, color: c.color })), W) : null, legH = LG ? VIZ.legendGap + LG.h : 0, H = Math.ceil(gridH + legH);
    const svg = s('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, style: { display: 'block', overflow: 'visible' } });
    const owner = []; cnt.forEach((c, i) => { for (let k = 0; k < c; k++) owner.push(i); });
    const sw = SW * 1.5, rx = { square: 0.5, rounded: Math.min(VIZ.barRadius, size / 3), circle: size / 2 }[o.shape] ?? VIZ.barRadius, inset = size * 0.28;
    /* repère d'une catégorie : croix, point, coche ou une icône de la bibliothèque (tracé fin, dans un carré de 24) */
    const mark = (m, x, y, mc) => {
      if (m === 'cross') return s('path', { d: `M${x + inset},${y + inset}L${x + size - inset},${y + size - inset}M${x + size - inset},${y + inset}L${x + inset},${y + size - inset}`, fill: 'none', stroke: mc, 'stroke-width': Math.max(1, size * 0.1), 'stroke-linecap': 'round' });
      if (m === 'dot') return s('circle', { cx: x + size / 2, cy: y + size / 2, r: size * 0.17, fill: mc });
      if (m === 'check') return s('path', { d: `M${x + size * 0.27},${y + size * 0.52}L${x + size * 0.44},${y + size * 0.68}L${x + size * 0.74},${y + size * 0.33}`, fill: 'none', stroke: mc, 'stroke-width': Math.max(1, size * 0.1), 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
      const ic = m.startsWith('icon:') && ICONS[m.slice(5)]; if (!ic) return null;
      const k = (size * 0.64) / 24;
      return s('path', { d: ic.d, fill: 'none', stroke: mc, 'stroke-width': Math.max(0.8, size * 0.07) / k, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', transform: `translate(${x + size * 0.18} ${y + size * 0.18}) scale(${k})` });
    };
    for (let i = 0; i < n; i++) {
      const x = (i % cols) * (size + gap), y = Math.floor(i / cols) * (size + gap), on = i < owner.length, c = on ? cats[owner[i]] : null;
      svg.append(s('rect', { x: x + sw / 2, y: y + sw / 2, width: size - sw, height: size - sw, rx, fill: on ? colorRef(c.color) : 'none', stroke: on ? 'currentColor' : colorRef(cats[0] ? cats[0].color : 'blue'), 'stroke-width': sw }));
      if (on && c.mark !== 'none') { const m = mark(c.mark, x, y, colorRef(c.markColor)); if (m) svg.append(m); }
    }
    if (LG) drawLegendWrap(svg, LG, gridH + VIZ.legendGap);
    return { node: svg };
  },
};
