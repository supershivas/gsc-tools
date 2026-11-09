/* Résultats d'enquête : un point par répondant (ou par lot de répondants), rangés en nuage hexagonal ; les réponses forment des anneaux
   concentriques (la 1re au centre). Sans groupe : un seul nuage ; avec des groupes (Femmes / Hommes…) : un nuage par groupe, à la même échelle. */
import { VIZ, TYPE } from '../tokens.js';
import { s, colorRef, pxOf, fmt, SANS, layoutLegend, drawLegendWrap, fitText, autoColor, round3 } from './util.js';
import { t } from '../i18n.js';

const SQ3 = Math.sqrt(3);
/** n points d'un réseau hexagonal d'espacement d, triés du centre vers l'extérieur */
function hexDisc(n, d) {
  const R = Math.ceil(Math.sqrt(n / 2.6)) + 3,
    pts = [];
  for (let r = -R; r <= R; r++)
    for (let q = -R; q <= R; q++) {
      const x = d * (q + r / 2),
        y = ((d * SQ3) / 2) * r;
      pts.push([x, y, Math.round((Math.hypot(x, y) / d) * 1e4) / 1e4, Math.atan2(y, x)]);
    }
  pts.sort((a, b) => a[2] - b[2] || a[3] - b[3]);
  return pts.slice(0, n);
}

export default {
  label: 'Résultats d’enquête',
  icon: 'chart-circles',
  family: 'part',
  boxed: true,
  heights: ['auto', 'fixed', 'fill'],
  defaults: () => ({
    perDot: 0,
    perRow: 0,
    groupLabels: true,
    legend: true,
    showPercent: true,
    decimals: 0,
    rows: [
      ['Female', 'Very satisfied', 180],
      ['Female', 'Satisfied', 210],
      ['Female', 'Neutral', 110],
      ['Female', 'Dissatisfied', 70],
      ['Female', 'Very dissatisfied', 30],
      ['Male', 'Very satisfied', 150],
      ['Male', 'Satisfied', 190],
      ['Male', 'Neutral', 120],
      ['Male', 'Dissatisfied', 90],
      ['Male', 'Very dissatisfied', 50],
    ].map(([group, answer, count]) => ({ group, answer, count, color: '' })),
  }),
  fields: [
    { k: 'perDot', t: 'number', label: 'Répondants par point (0 = automatique)', min: 0, step: 'any' },
    { k: 'perRow', t: 'number', label: 'Groupes par ligne (0 = automatique)', min: 0, max: 6 },
    { k: 'groupLabels', t: 'bool', label: 'Afficher le nom des groupes' },
    { k: 'legend', t: 'bool', label: 'Afficher la légende' },
    { k: 'legendPos', t: 'select', label: 'Position de la légende', options: { bottom: 'En bas', top: 'En haut' } },
    { k: 'showPercent', t: 'bool', label: 'Pourcentages dans la légende' },
    { k: 'decimals', t: 'number', label: 'Décimales des pourcentages', min: 0, max: 4 },
  ],
  data: {
    k: 'rows',
    min: 1,
    cols: [
      { k: 'group', label: 'Groupe (facultatif)', t: 'text' },
      { k: 'answer', label: 'Réponse', t: 'text' },
      { k: 'count', label: 'Répondants', t: 'number', def: 10 },
      { k: 'color', label: 'Couleur de la réponse', t: 'color', auto: true, def: '' },
    ],
    item: () => ({ group: '', answer: '', count: 10, color: '' }),
  },
  dataHint:
    'Une ligne par groupe et par réponse. L’ordre des réponses va du centre vers l’extérieur ; laissez le groupe vide pour un seul nuage.',
  render(o, W, env) {
    const rows = (o.rows || [])
      .map((r) => ({
        group: String(r.group || '').trim(),
        answer: String(r.answer || '').trim(),
        count: Math.max(0, +r.count || 0),
        color: r.color || '',
      }))
      .filter((r) => r.answer && r.count > 0);
    const capPx = pxOf(TYPE.caption.size);
    const mk = (H) => s('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, style: { display: 'block', overflow: 'visible' } });
    if (!rows.length) {
      const v = mk(60);
      v.append(s('text', { x: 0, y: capPx, 'font-size': capPx }, t('Aucune donnée')));
      return { node: v };
    }
    const answers = [...new Set(rows.map((r) => r.answer))],
      groups = [...new Set(rows.map((r) => r.group))];
    const colorOf = (a) => autoColor((rows.find((r) => r.answer === a && r.color) || {}).color, answers.indexOf(a));
    const sums = groups.map((g) => rows.filter((r) => r.group === g).reduce((a, r) => a + r.count, 0)),
      maxTotal = Math.max(...sums);
    const perDot = +o.perDot > 0 ? +o.perDot : Math.max(1, Math.ceil(maxTotal / 420));
    const nDots = (g, a) => {
      const r = rows.find((x) => x.group === g && x.answer === a);
      return r ? Math.max(1, Math.round(r.count / perDot)) : 0;
    };
    const counts = groups.map((g) => answers.map((a) => nDots(g, a))),
      totals = counts.map((c) => c.reduce((a, b) => a + b, 0)),
      nMax = Math.max(...totals);
    const per = +o.perRow > 0 ? Math.min(+o.perRow, groups.length) : groups.length === 1 ? 1 : Math.min(groups.length, W >= 420 ? 3 : 2),
      gap = 12;
    const cw = (W - gap * (per - 1)) / per,
      Rcell = cw / 2,
      d = Rcell * Math.sqrt((2 * Math.PI) / (SQ3 * nMax)) * 0.97,
      dotR = (d / 2) * 0.86;
    const nameH = o.groupLabels && groups.some(Boolean) ? Math.ceil(capPx * 1.5) + 6 : 0,
      rowsN = Math.ceil(groups.length / per);
    const clusterR = Math.min(Rcell, d * Math.sqrt((nMax * SQ3) / (2 * Math.PI)) + d),
      rowH = nameH + clusterR * 2 + 6;
    const all = answers.map((a) => rows.filter((r) => r.answer === a).reduce((x, r) => x + r.count, 0)),
      tot = all.reduce((a, b) => a + b, 0);
    const LG = o.legend
        ? layoutLegend(
            answers.map((a, i) => ({
              name: o.showPercent ? `${a} · ${fmt((all[i] / tot) * 100, env.locale, o.decimals)} %` : a,
              color: colorOf(a),
            })),
            W,
          )
        : null,
      legH = LG ? VIZ.legendGap + LG.h : 0,
      H = round3(rowsN * rowH + (rowsN - 1) * 6 + legH);
    const svg = mk(H);
    groups.forEach((g, gi) => {
      const col = gi % per,
        row = Math.floor(gi / per),
        cx = col * (cw + gap) + Rcell,
        y0 = row * (rowH + 6);
      if (nameH && g)
        svg.append(
          s(
            'text',
            { x: cx, y: y0 + capPx, 'text-anchor': 'middle', 'font-size': capPx, 'font-weight': 700 },
            fitText(g, 700, SANS, capPx, cw, 0.7).text,
          ),
        );
      const cy = y0 + nameH + clusterR,
        pts = hexDisc(totals[gi], d),
        gEl = s('g');
      let i = 0;
      answers.forEach((a, ai) => {
        const c = colorRef(colorOf(a));
        for (let k = 0; k < counts[gi][ai] && i < pts.length; k++, i++)
          gEl.append(s('circle', { cx: cx + pts[i][0], cy: cy + pts[i][1], r: dotR, fill: c }));
      });
      svg.append(gEl);
    });
    if (LG) drawLegendWrap(svg, LG, H - LG.h);
    return { node: svg };
  },
};
