/* Grille de pourcentage (« waffle chart ») : une grille de cases (10 × 10 par défaut), les premières sont remplies à hauteur de la valeur,
   en lisant ligne par ligne. Une catégorie = une couleur ; un repère (croix, point, coche) peut marquer les cases pleines. */
import { VIZ, TYPE } from '../tokens.js';
import { s, SW, colorRef, pxOf, fmt, SERIF, fitSize, textLines, drawLines, layoutLegend, drawLegendWrap } from './util.js';
import { t } from '../i18n.js';

export default {
  label: 'Grille de pourcentage (waffle)', icon: 'layout-grid', family: 'part',
  defaults: () => ({
    cols: 10, gridRows: 10, total: 100, shape: 'rounded', mark: 'cross', markColor: 'yellow', gap: 3, legend: false,
    figure: 'none', figureShare: 45, figureAlign: 'top', figureValue: '{pct}', figureText: '',
    rows: [{ label: t('Logements endommagés ou détruits'), value: 14, color: 'blue' }],
  }),
  fields: [
    { k: 'cols', t: 'number', label: 'Cases par ligne', min: 1, max: 40 },
    { k: 'gridRows', t: 'number', label: 'Nombre de lignes', min: 1, max: 40 },
    { k: 'total', t: 'number', label: 'Valeur de la grille entière (0 = somme des valeurs)', min: 0, step: 'any' },
    { k: 'shape', t: 'select', label: 'Forme des cases', options: { square: 'Carrée', rounded: 'Arrondie', circle: 'Ronde' } },
    { k: 'mark', t: 'select', label: 'Repère sur les cases pleines', options: { none: 'Aucun', cross: 'Croix', dot: 'Point', check: 'Coche' } },
    { k: 'markColor', t: 'color', label: 'Couleur du repère' },
    { k: 'gap', t: 'number', label: 'Espace entre les cases (px)', min: 0, max: 12 },
    { k: 'legend', t: 'bool', label: 'Afficher la légende' },
    { k: 'figure', t: 'select', label: 'Chiffre à côté de la grille', options: { none: 'Aucun', right: 'À droite', left: 'À gauche' } },
    { k: 'figureValue', t: 'text', label: 'Chiffre ({pct} = part de la 1re catégorie)' },
    { k: 'figureText', t: 'text', label: 'Texte sous le chiffre (vide = libellé de la 1re catégorie)' },
    { k: 'figureShare', t: 'number', label: 'Largeur de la grille (% de la dataviz)', min: 25, max: 75 },
    { k: 'figureAlign', t: 'select', label: 'Position verticale du chiffre', options: { top: 'En haut', center: 'Centré', bottom: 'En bas' } },
  ],
  data: { k: 'rows', min: 1, cols: [{ k: 'label', label: 'Libellé', t: 'text' }, { k: 'value', label: 'Valeur', t: 'number', def: 10 }, { k: 'color', label: 'Couleur', t: 'color', def: 'blue' }],
    item: () => ({ label: '', value: 10, color: 'blue' }) },
  dataHint: 'Une ligne par catégorie : les cases se remplissent dans cet ordre, ligne par ligne.',
  render(o, W, env) {
    const cols = Math.max(1, Math.round(+o.cols) || 10), rowsN = Math.max(1, Math.round(+o.gridRows) || 10), n = cols * rowsN, gap = Math.max(0, +o.gap || 0);
    const cats = (o.rows || []).map(r => ({ label: String(r.label || ''), value: Math.max(0, +r.value || 0), color: r.color || 'blue' }));
    const sum = cats.reduce((a, c) => a + c.value, 0), total = +o.total > 0 ? +o.total : sum || 1;
    /* nombre de cases par catégorie : arrondi au plus fort reste, sans dépasser la grille */
    const raw = cats.map(c => c.value / total * n), cnt = raw.map(Math.floor);
    let left = Math.min(n, Math.round(raw.reduce((a, b) => a + b, 0))) - cnt.reduce((a, b) => a + b, 0);
    raw.map((v, i) => [v - Math.floor(v), i]).sort((a, b) => b[0] - a[0]).forEach(([, i]) => { if (left > 0) { cnt[i]++; left--; } });
    /* chiffre à côté : la grille prend une part de la largeur, le chiffre et son texte occupent le reste */
    const beside = o.figure === 'right' || o.figure === 'left', GAPF = 18, gridW = beside ? Math.round(W * Math.max(25, Math.min(75, +o.figureShare || 45)) / 100) : W, gx = beside && o.figure === 'left' ? W - gridW : 0;
    const figW = Math.max(40, W - gridW - GAPF), fx = o.figure === 'left' ? 0 : gridW + GAPF;
    const size = Math.max(4, (gridW - gap * (cols - 1)) / cols), gridH = rowsN * size + (rowsN - 1) * gap;
    let fig = null;
    if (beside) {
      const pct = cats[0] ? Math.round(cats[0].value / total * 100) : 0, val = String(o.figureValue ?? '{pct}').replace(/\{pct\}/g, `${fmt(pct, env.locale, 0)}%`).replace(/\{value\}/g, fmt(cats[0] ? cats[0].value : 0, env.locale, 0));
      const base = pxOf(TYPE.figure.size) * 1.7, fs = fitSize(val, 700, SERIF, base, figW, 0.4), BODY = pxOf(TYPE.body.size), LH = TYPE.body.lh - 3;
      const lines = textLines('', (o.figureText || '').trim() || (cats[0] ? cats[0].label : ''), BODY, figW), h0 = fs * 1.12;
      fig = { val, fs, lines, BODY, LH, h0, h: h0 + 4 + lines.length * LH };
    }
    const bodyH = Math.max(gridH, fig ? fig.h : 0), figY = fig ? { top: 0, center: (bodyH - fig.h) / 2, bottom: bodyH - fig.h }[o.figureAlign] || 0 : 0;
    const LG = o.legend && cats.length > 1 ? layoutLegend(cats.map(c => ({ name: c.label, color: c.color })), W) : null, legH = LG ? VIZ.legendGap + LG.h : 0, H = Math.ceil(bodyH + legH);
    const svg = s('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, style: { display: 'block', overflow: 'visible' } });
    const owner = []; cnt.forEach((c, i) => { for (let k = 0; k < c; k++) owner.push(i); });
    const sw = SW * 1.5, rx = { square: 0.5, rounded: Math.min(VIZ.barRadius, size / 3), circle: size / 2 }[o.shape] ?? VIZ.barRadius, mc = colorRef(o.markColor || 'yellow'), inset = size * 0.28;
    for (let i = 0; i < n; i++) {
      const x = gx + (i % cols) * (size + gap), y = Math.floor(i / cols) * (size + gap), on = i < owner.length, c = on ? cats[owner[i]] : null;
      svg.append(s('rect', { x: x + sw / 2, y: y + sw / 2, width: size - sw, height: size - sw, rx, fill: on ? colorRef(c.color) : 'none', stroke: on ? 'currentColor' : colorRef(cats[0] ? cats[0].color : 'blue'), 'stroke-width': sw }));
      if (on && o.mark && o.mark !== 'none') {
        if (o.mark === 'cross') svg.append(s('path', { d: `M${x + inset},${y + inset}L${x + size - inset},${y + size - inset}M${x + size - inset},${y + inset}L${x + inset},${y + size - inset}`, fill: 'none', stroke: mc, 'stroke-width': Math.max(1, size * 0.1), 'stroke-linecap': 'round' }));
        else if (o.mark === 'dot') svg.append(s('circle', { cx: x + size / 2, cy: y + size / 2, r: size * 0.17, fill: mc }));
        else svg.append(s('path', { d: `M${x + size * 0.27},${y + size * 0.52}L${x + size * 0.44},${y + size * 0.68}L${x + size * 0.74},${y + size * 0.33}`, fill: 'none', stroke: mc, 'stroke-width': Math.max(1, size * 0.1), 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
      }
    }
    if (fig) {
      svg.append(s('text', { x: fx, y: figY + fig.fs * 0.92, 'font-size': fig.fs, 'font-weight': 700, style: { fontFamily: 'var(--t-figure-family)' } }, fig.val));
      svg.append(drawLines(fig.lines, fx, figY + fig.h0 + 4, fig.LH, fig.BODY));
    }
    if (LG) drawLegendWrap(svg, LG, bodyH + VIZ.legendGap);
    return { node: svg };
  },
};
