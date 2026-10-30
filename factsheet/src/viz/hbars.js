/* Barres horizontales : libellés à gauche, valeur au bout de la barre. Groupées ou empilées. */
import { VIZ, TYPE } from '../tokens.js';
import { s, SW, colorRef, pxOf, fmt, mw, SANS, SERIF, drawLegend, numVal, fitText } from './util.js';
import { t } from '../i18n.js';

const hPath = (x, y, w, h, r) => { r = Math.max(0, Math.min(r, h / 2, w)); return `M${x},${y}H${x + w - r}A${r},${r} 0 0 1 ${x + w},${y + r}V${y + h - r}A${r},${r} 0 0 1 ${x + w - r},${y + h}H${x}Z`; };

export default {
  label: 'Barres horizontales',
  defaults: () => ({
    style: 'grouped', legend: false, showValues: true, decimals: 0, suffix: '%',
    series: [{ name: t('Valeur'), color: 'blue' }],
    rows: [{ label: t('Premier critère'), v: [72] }, { label: t('Deuxième critère'), v: [58] }, { label: t('Troisième critère'), v: [41] }, { label: t('Quatrième critère'), v: [23] }],
  }),
  fields: [
    { k: 'style', t: 'select', label: 'Plusieurs séries', options: { grouped: 'Côte à côte', stacked: 'Empilées' } },
    { k: 'legend', t: 'bool', label: 'Afficher la légende' },
    { k: 'showValues', t: 'bool', label: 'Afficher les valeurs' },
    { k: 'decimals', t: 'number', label: 'Décimales des valeurs', min: 0, max: 4 },
    { k: 'suffix', t: 'text', label: 'Unité après la valeur (%, M€…)' },
    { t: 'table', k: 'rows', series: 'series', maxSeries: 4, label: 'Données' },
  ],
  render(o, W, env) {
    const series = o.series || [], rows = o.rows || [], k = Math.max(1, series.length);
    const stacked = o.style === 'stacked';
    const capPx = pxOf(TYPE.caption.size), numPx = pxOf(TYPE.captionNum.size), suffix = o.suffix || '';
    const labW = Math.min(W * 0.4, Math.max(0, ...rows.map(r => mw(r.label || '', TYPE.caption.weight, SANS, capPx))) + VIZ.iconGap);
    const total = r => series.reduce((a, _, j) => a + numVal(r, j), 0);
    const valW = o.showValues ? mw(fmt(1000, env.locale, o.decimals) + suffix, 700, '"Source Serif 4", serif', numPx) + VIZ.barGap * 2 : 0;
    const x0 = labW, span = Math.max(30, W - labW - valW);
    let max = 0; rows.forEach(r => { max = Math.max(max, stacked ? total(r) : Math.max(0, ...series.map((_, j) => numVal(r, j)))); }); if (!max) max = 1;
    const bh = VIZ.hBar, rh = stacked ? bh : k * bh + (k - 1) * VIZ.barGap;
    const bodyH = rows.length * rh + Math.max(0, rows.length - 1) * VIZ.hRowGap;
    const H = bodyH + (o.legend ? VIZ.legendGap + VIZ.legendH : 0);
    const svg = s('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, style: { display: 'block', overflow: 'visible' } });
    svg.append(s('line', { x1: x0, y1: 0, x2: x0, y2: bodyH, stroke: 'currentColor', 'stroke-width': SW }));
    rows.forEach((r, i) => {
      const y = i * (rh + VIZ.hRowGap);
      { const f = fitText(r.label || '', TYPE.caption.weight, SANS, capPx, labW - VIZ.iconGap, 0.7); svg.append(s('text', { x: 0, y: y + rh / 2 + 0.33 * f.size, 'font-size': f.size, 'font-weight': TYPE.caption.weight }, f.text)); }
      let end = x0;
      if (stacked) {
        let acc = 0;
        series.forEach((sr, j) => {
          const v = numVal(r, j); if (!v) return;
          const xa = x0 + acc / max * span, w = v / max * span; acc += v; end = xa + w;
          svg.append(s('path', { d: acc >= total(r) ? hPath(xa, y, w, bh, VIZ.barRadius) : `M${xa},${y}h${w}v${bh}h${-w}Z`, fill: colorRef(sr.color), stroke: 'currentColor', 'stroke-width': SW, 'stroke-linejoin': 'round' }));
        });
      } else series.forEach((sr, j) => {
        const w = numVal(r, j) / max * span, yy = y + j * (bh + VIZ.barGap); end = Math.max(end, x0 + w);
        svg.append(s('path', { d: hPath(x0, yy, Math.max(w, 0.0001), bh, VIZ.barRadius), fill: colorRef(sr.color), stroke: 'currentColor', 'stroke-width': SW, 'stroke-linejoin': 'round' }));
        if (o.showValues) svg.append(s('text', { x: x0 + w + VIZ.barGap * 1.5, y: yy + bh / 2 + 0.33 * numPx, 'font-size': numPx, 'font-weight': 700, style: { fontFamily: 'var(--t-captionNum-family)' } }, fmt(numVal(r, j), env.locale, o.decimals) + suffix));
      });
      if (stacked && o.showValues) svg.append(s('text', { x: end + VIZ.barGap * 1.5, y: y + bh / 2 + 0.33 * numPx, 'font-size': numPx, 'font-weight': 700, style: { fontFamily: 'var(--t-captionNum-family)' } }, fmt(total(r), env.locale, o.decimals) + suffix));
    });
    if (o.legend) drawLegend(svg, series, H - VIZ.legendH, W);
    return { node: svg };
  },
};
