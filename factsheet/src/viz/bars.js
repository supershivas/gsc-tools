/* Barres verticales : une série, groupées, jumelées (barre arrière décalée, comme sur les captures) ou empilées. */
import { VIZ, TYPE } from '../tokens.js';
import { s, SW, colorRef, pxOf, fmt, SANS, SERIF, round3, textLines, drawLines, drawLegend, numVal, fitText } from './util.js';

const barPath = (x, y, w, h, r) => {
  r = Math.max(0, Math.min(r, w / 2, h));
  return `M${x},${y + h}L${x},${y + r}A${r},${r} 0 0 1 ${x + r},${y}L${x + w - r},${y}A${r},${r} 0 0 1 ${x + w},${y + r}L${x + w},${y + h}Z`;
};

export default {
  label: 'Barres (jumelées, groupées, empilées)',
  defaults: () => ({
    style: 'overlap', ratio: '16:9', legend: true, showValues: false, decimals: 0, suffix: '',
    series: [{ name: 'Label 1', color: 'sky' }, { name: 'Label 2', color: 'yellow' }],
    rows: [
      { label: '2021', v: [50, 48] }, { label: '2022', v: [56, 54] }, { label: '2023', v: [72, 34] },
      { label: '2024', v: [80, 38] }, { label: '2025', v: [82, 36] },
    ],
    callout: { on: true, value: '+64%', text: 'text to the figures' },
  }),
  fields: [
    { k: 'style', t: 'select', label: 'Plusieurs séries', options: { overlap: 'Jumelées (2 séries qui se chevauchent)', grouped: 'Côte à côte', stacked: 'Empilées' } },
    { k: 'ratio', t: 'select', label: 'Format du graphique', options: { '2:1': '2:1 (large)', '16:9': '16:9', '3:2': '3:2', '1:1': '1:1 (carré)' } },
    { k: 'legend', t: 'bool', label: 'Afficher la légende' },
    { k: 'showValues', t: 'bool', label: 'Afficher les valeurs (empilées : total)' },
    { k: 'decimals', t: 'number', label: 'Décimales des valeurs', min: 0, max: 4 },
    { k: 'suffix', t: 'text', label: 'Unité après la valeur (%, M€…)' },
    { k: 'callout.on', t: 'bool', label: 'Afficher l’accolade « évolution »' },
    { k: 'callout.value', t: 'text', label: 'Valeur de l’accolade (ex. +64 %)' },
    { k: 'callout.text', t: 'text', label: 'Texte de l’accolade' },
    { t: 'table', k: 'rows', series: 'series', maxSeries: 4, label: 'Données' },
  ],
  render(o, W, env) {
    const series = o.series || [], rows = o.rows || [], k = Math.max(1, series.length), n = Math.max(1, rows.length);
    const stacked = o.style === 'stacked', overlap = o.style === 'overlap' && k === 2;
    const H = Math.max(round3(W * (VIZ.ratios[o.ratio] || 0.5625)), 120);
    const co = o.callout && o.callout.on && rows.length > 1 ? o.callout : null;
    const x1 = W - (co ? VIZ.calloutW : 0);
    const baseY = H - (o.legend ? VIZ.legendGap + VIZ.legendH : 0) - VIZ.catH, plotTop = VIZ.plotTop, plotH = baseY - plotTop;
    const total = r => series.reduce((a, _, j) => a + numVal(r, j), 0);
    const metric = r => stacked ? total(r) : numVal(r, 0);       // valeur suivie par l'accolade
    let max = 0; rows.forEach(r => { if (stacked) max = Math.max(max, total(r)); else series.forEach((_, j) => { max = Math.max(max, numVal(r, j)); }); }); if (!max) max = 1;
    const slot = x1 / n;
    const bw = stacked ? Math.min(slot * 0.5, VIZ.barMaxW) : overlap ? Math.min(slot * 0.44, VIZ.barMaxW) : Math.min((slot * 0.72 - (k - 1) * VIZ.barGap) / k, VIZ.barMaxW);
    const capPx = pxOf(TYPE.caption.size), numPx = pxOf(TYPE.captionNum.size);
    const yOf = v => baseY - v / max * plotH;
    const suffix = o.suffix || '';
    const svg = s('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, style: { display: 'block', overflow: 'visible' } });

    const barX = rows.map((_, i) => {
      const cx = slot * (i + 0.5), xs = [];
      if (stacked) series.forEach((_, j) => { xs[j] = cx - bw / 2; });
      else if (overlap) { const gx = cx - bw * (1 + VIZ.pairOffset) / 2; xs[1] = gx; xs[0] = gx + bw * VIZ.pairOffset; }
      else { const tw = k * bw + (k - 1) * VIZ.barGap, gx = cx - tw / 2; series.forEach((_, j) => { xs[j] = gx + j * (bw + VIZ.barGap); }); }
      return xs;
    });

    // accolade (avant les barres : le pointillé passe derrière)
    if (co) {
      const yFirst = yOf(metric(rows[0])), yLast = yOf(metric(rows[rows.length - 1]));
      const bx = x1 + VIZ.calloutGap / 2;
      svg.append(s('g', { fill: 'none', stroke: 'currentColor', 'stroke-width': SW },
        s('line', { x1: barX[0][0] + bw, y1: yFirst, x2: bx, y2: yFirst, 'stroke-dasharray': '1.5 2' }),
        s('path', { d: `M${bx - VIZ.calloutGap},${yLast}H${bx}V${yFirst}` })));
      const cPx = pxOf(TYPE.callout.size), midY = (yFirst + yLast) / 2, tx = bx + VIZ.calloutGap + VIZ.leaderGap;
      const tl = textLines('', co.text || '', capPx, VIZ.calloutW - (tx - x1) - 3);
      const blockH = TYPE.callout.lh + tl.length * TYPE.caption.lh, top = Math.max(0, midY - blockH / 2);
      const cv = fitText(co.value || '', TYPE.callout.weight, SANS, cPx, VIZ.calloutW - (tx - x1) - 3);
      svg.append(s('text', { x: tx, y: top + TYPE.callout.lh / 2 + 0.33 * cv.size, 'font-size': cv.size, 'font-weight': TYPE.callout.weight }, cv.text));
      svg.append(drawLines(tl.map(l => ({ ...l, runs: l.runs.map(r => ({ ...r, b: false })) })), tx, top + TYPE.callout.lh, TYPE.caption.lh, capPx));
    }

    const bar = (x, y, h, color, round) => s('path', { d: round ? barPath(x, y, bw, Math.max(h, 0.0001), VIZ.barRadius) : `M${x},${y}h${bw}v${h}h${-bw}Z`, fill: colorRef(color), stroke: 'currentColor', 'stroke-width': SW, 'stroke-linejoin': 'round' });
    rows.forEach((r, i) => {
      if (stacked) {
        let acc = 0;
        series.forEach((sr, j) => {
          const v = numVal(r, j); if (!v) return;
          const y0 = yOf(acc + v), h = yOf(acc) - y0; acc += v;
          svg.append(bar(barX[i][j], y0, h, sr.color, j === series.length - 1 || acc >= total(r)));
        });
      } else series.forEach((sr, j) => { const y = yOf(numVal(r, j)); svg.append(bar(barX[i][j], y, baseY - y, sr.color, true)); });
    });
    const vMax = slot / (stacked ? 1 : k) - 2;
    const valText = (x, y, v) => { const f = fitText(fmt(v, env.locale, o.decimals) + suffix, 700, SERIF, numPx, vMax, 0.5); svg.append(s('text', { x, y, 'text-anchor': 'middle', 'font-size': f.size, 'font-weight': 700, style: { fontFamily: 'var(--t-captionNum-family)' } }, f.text)); };
    if (o.showValues) rows.forEach((r, i) => {
      if (stacked) valText(barX[i][0] + bw / 2, yOf(total(r)) - 3, total(r));
      else series.forEach((_, j) => valText(barX[i][j] + bw / 2, yOf(numVal(r, j)) - 3, numVal(r, j)));
    });
    rows.forEach((r, i) => { const f = fitText(r.label || '', TYPE.caption.weight, SANS, capPx, slot - 3, 0.6); svg.append(s('text', { x: slot * (i + 0.5), y: baseY + VIZ.catH / 2 + 0.33 * f.size + 1, 'text-anchor': 'middle', 'font-size': f.size, 'font-weight': TYPE.caption.weight }, f.text)); });
    if (o.legend) drawLegend(svg, series, H - VIZ.legendH, W);
    return { node: svg };
  },
};
