/* Anneau : segments proportionnels, total au centre (Source Serif 4),
   libellés autour de l'anneau avec traits de repère (colonnes larges)
   ou en légende sous l'anneau (colonnes étroites). Logique reprise de donut-export. */
import { VIZ, TYPE, GAP } from '../tokens.js';
import { s, SW, colorRef, pxOf, fmt, mw, SERIF, round3, textLines, drawLines } from './util.js';
import { t } from '../i18n.js';

const BODY = pxOf(TYPE.body.size), LH = TYPE.body.lh;
const rad = d => d * Math.PI / 180;

function resolveColumn(items, topLim, gap) {          // empile sans chevauchement, du haut vers le bas
  items.sort((a, b) => a.want - b.want);
  let prev = -1e9;
  for (const it of items) { it.top = Math.max(it.want, prev === -1e9 ? topLim : prev + gap, topLim); prev = it.top + it.h; }
}

function clearManual(o) { (o.segments || []).forEach(g => { delete g.pin; delete g.anchorT; delete g.side; }); }
const norm = a => ((a % 360) + 360) % 360;
const ORANGE = '#F28C28';

export default {
  label: 'Anneau / camembert',
  defaults: () => ({
    style: 'donut', totalTpl: '€{total} billion', decimals: 1, layout: 'auto', orient: 'largest', largestAngle: 210, startAngle: 0,
    segments: [
      { color: 'lavender', value: 114.4, title: '€114.4 billion', text: 'provided from or guaranteed by the EU budget (including **€43.9 billion** within Ukraine Facility and **€16.9 billion** from Ukraine Support Loan)' },
      { color: 'blue', value: 77.9, title: '€77.9 billion', text: 'in military support from Member States' },
      { color: 'slate', value: 17, title: '€17 billion', text: 'in support for Ukrainian refugees in the EU' },
      { color: 'yellow', value: 15.5, title: '€15.5 billion', text: 'of grants, loans and guarantees provided by EU Member States for non-military support' },
      { color: 'sky', value: 3.8, title: '€3.8 billion', text: 'in proceeds from immobilised Russian assets' },
    ],
  }),
  fields: [
    { k: 'style', t: 'select', label: 'Forme', options: { donut: 'Anneau (total au centre)', pie: 'Camembert' } },
    { k: 'totalTpl', t: 'text', label: 'Texte du centre ({total} = somme des valeurs)' },
    { k: 'decimals', t: 'number', label: 'Décimales du total', min: 0, max: 4 },
    { k: 'layout', t: 'select', label: 'Libellés', options: { auto: 'Auto (selon la largeur)', around: 'Autour de l’anneau', legend: 'Légende sous l’anneau' } },
    { k: 'orient', t: 'select', label: 'Orientation de l’anneau', options: { largest: 'Plus grand segment à un angle donné', first: '1er segment en haut', manual: 'Manuelle (glisser l’anneau dans l’éditeur)' } },
    { k: 'largestAngle', t: 'number', label: 'Angle du plus grand segment (° — 0 = haut, 210 = bas gauche)', min: 0, max: 359 },
    { k: 'startAngle', t: 'number', label: 'Angle de départ du 1er segment (° — mode manuel)', min: 0, max: 359, step: 'any' },
    { k: 'segments', t: 'list', label: 'Segments (sens horaire)', min: 1, max: 10,
      item: () => ({ color: 'sky', value: 10, title: t('Titre'), text: t('Texte') }),
      fields: [{ k: 'color', t: 'color', label: 'Couleur' }, { k: 'value', t: 'number', label: 'Valeur', min: 0, step: 'any' },
        { k: 'title', t: 'text', label: 'Titre (gras)' }, { k: 'text', t: 'area', label: 'Texte' },
        { k: 'side', t: 'select', label: 'Côté du libellé', options: { auto: 'Auto', left: 'Gauche', right: 'Droite' } }] },
  ],
  actions: [
    { label: '↺ Positions auto', title: 'Efface les positions manuelles des libellés, points d’ancrage et côtés', run(o) { clearManual(o); } },
    { label: 'Plus grand en premier', title: 'Fait tourner la liste pour que le plus grand segment soit le 1er', run(o) {
      const a = o.segments || []; let mi = 0; a.forEach((g, i) => { if (+g.value > +a[mi].value) mi = i; });
      o.segments = a.slice(mi).concat(a.slice(0, mi)); clearManual(o); } },
  ],
  /* Interactions de l'éditeur : retourne un gestionnaire de glissement { move(pt), end() } (pt en px du SVG) */
  edit: {
    start(hit, o, meta, api, pt0) {
      const seg = (o.segments || [])[hit.i]; if (!seg) return null;
      api.select(hit.i);
      const { cx, cy } = meta, ang = pt => norm(Math.atan2(pt.x - cx, -(pt.y - cy)) * 180 / Math.PI);
      const dist = pt => Math.hypot(pt.x - pt0.x, pt.y - pt0.y);
      let moved = false;
      if (hit.kind === 'ring') {
        const a0 = ang(pt0);
        return { move(pt) {
          if (!moved && dist(pt) < 3) return; if (!moved) { moved = true; clearManual(o); }
          o.orient = 'manual'; o.startAngle = Math.round(norm(meta.start + ang(pt) - a0) * 10) / 10; api.redraw(); } };
      }
      if (hit.kind === 'label') {
        const it = meta.items.find(x => x.i === hit.i); if (!it) return null;
        const grab = pt0.y - it.top;
        return { move(pt) {
          if (!moved && dist(pt) < 3) return; if (!moved) { moved = true; api.ui.drag = 'label'; }
          seg.pin = Math.round(pt.y - grab - cy);
          const want = pt.x < cx ? 'left' : 'right', auto = it.autoSide < 0 ? 'left' : 'right';
          seg.side = want === auto ? 'auto' : want; api.redraw(); },
          end() { api.ui.drag = null; api.redraw(); } };
      }
      if (hit.kind === 'anchor') {
        const arc = meta.arcs.find(x => x.i === hit.i), sw = arc.a1 - arc.a0;
        return { move(pt) {
          if (!moved && dist(pt) < 2) return; moved = true;
          const rel = norm(ang(pt) - arc.a0); let t = rel / sw;
          if (t > 1) t = (rel - sw) < (360 - rel) ? 1 : 0;
          seg.anchorT = Math.round(Math.min(0.96, Math.max(0.04, t)) * 1000) / 1000; api.redraw(); } };
      }
      return null;
    },
  },
  render(o, W, env) {
    const segs = (o.segments || []).filter(g => +g.value > 0);
    const total = segs.reduce((a, g) => a + +g.value, 0);
    const around = o.layout === 'around' || (o.layout !== 'legend' && W >= VIZ.aroundMinW);
    if (!segs.length) return { node: s('svg', { width: W, height: 60 }) };

    // angles
    const sweeps = segs.map(g => g.value / total * 360);
    let mi = 0; sweeps.forEach((w, i) => { if (w > sweeps[mi] + 1e-9) mi = i; });
    let before = 0; for (let i = 0; i < mi; i++) before += sweeps[i];
    let a = o.orient === 'manual' ? (o.startAngle ?? 0) : o.orient === 'first' ? 0 : (o.largestAngle ?? 210) - (before + sweeps[mi] / 2);
    const start = a, ui = env.ui, sel = ui ? ui.sel : -1, idxOf = g => (o.segments || []).indexOf(g);
    const arcs = segs.map((g, i) => { const r = { g, a0: a, a1: a + sweeps[i] }; a += sweeps[i]; return r; });

    // anneau
    const D = around ? Math.max(VIZ.ringMin, Math.min(VIZ.ringMax, round3(W * 0.3))) : Math.min(VIZ.ringLegend, round3(W - 6));
    const pie = o.style === 'pie';
    const Ro = D / 2 - SW, Ri = pie ? 0 : Ro * (1 - VIZ.ringPct);
    const sector = (cx, cy, p) => {
      const pt = (r, ang) => [cx + r * Math.sin(rad(ang)), cy - r * Math.cos(rad(ang))];
      if (p.a1 - p.a0 >= 359.99) return pie ? `M${cx + Ro},${cy}A${Ro},${Ro} 0 1 1 ${cx - Ro},${cy}A${Ro},${Ro} 0 1 1 ${cx + Ro},${cy}Z` : `M${cx + Ro},${cy}A${Ro},${Ro} 0 1 1 ${cx - Ro},${cy}A${Ro},${Ro} 0 1 1 ${cx + Ro},${cy}ZM${cx + Ri},${cy}A${Ri},${Ri} 0 1 0 ${cx - Ri},${cy}A${Ri},${Ri} 0 1 0 ${cx + Ri},${cy}Z`;
      const [x0, y0] = pt(Ro, p.a0), [x1, y1] = pt(Ro, p.a1), [x2, y2] = pt(Ri, p.a1), [x3, y3] = pt(Ri, p.a0);
      const big = p.a1 - p.a0 > 180 ? 1 : 0;
      if (pie) return `M${cx},${cy}L${x0},${y0}A${Ro},${Ro} 0 ${big} 1 ${x1},${y1}Z`;
      return `M${x0},${y0}A${Ro},${Ro} 0 ${big} 1 ${x1},${y1}L${x2},${y2}A${Ri},${Ri} 0 ${big} 0 ${x3},${y3}Z`;
    };
    const centerNode = (cx, cy) => {
      if (pie) return s('g');
      const tpl = (o.totalTpl || '').replace(/\n/g, ' '), n = fmt(total, env.locale, o.decimals);
      const txt = tpl.includes('{total}') ? tpl.replace(/\{total\}/g, n) : tpl;
      const maxC = 2 * Ri * 0.86; let size = pxOf(TYPE.figure.size), lines = [];
      const wrapC = z => { const out = []; let cur = ''; for (const w of txt.split(/ +/)) { const t = cur ? cur + ' ' + w : w; if (!cur || mw(t, 700, SERIF, z) <= maxC) cur = t; else { out.push(cur); cur = w; } } out.push(cur); return out; };
      const chord = y => 2 * Math.sqrt(Math.max(0, (Ri * 0.94) ** 2 - y * y));      // largeur disponible dans l'anneau à la hauteur y
      const fits = (ls, z) => { const tot = ls.length * z; return ls.every((l, i) => { const t = -tot / 2 + i * z, y = Math.max(Math.abs(t), Math.abs(t + z)); return mw(l, 700, SERIF, z) <= chord(y); }); };
      for (let i = 0; i < 60; i++) { lines = wrapC(size); if (fits(lines, size) || size < 6) break; size *= 0.95; }
      const g = s('g', { 'font-size': size, 'font-weight': 700, 'text-anchor': 'middle', style: { fontFamily: 'var(--t-figure-family)' } });
      const tot = lines.length * size; lines.forEach((l, i) => g.append(s('text', { x: cx, y: cy - tot / 2 + i * size + size / 2 + 0.33 * size }, l)));
      return g;
    };
    const ringNodes = (cx, cy) => {
      const out = arcs.map(p => s('path', { d: sector(cx, cy, p), fill: colorRef(p.g.color), stroke: 'currentColor', 'stroke-width': SW, 'stroke-linejoin': 'round', 'data-hit': ui ? `ring:${idxOf(p.g)}` : null, style: ui ? { cursor: 'grab' } : null }));
      if (ui) arcs.forEach(p => { if (idxOf(p.g) === sel) out.push(s('path', { d: sector(cx, cy, p), fill: 'none', stroke: ORANGE, 'stroke-width': 2, 'stroke-linejoin': 'round', 'pointer-events': 'none' })); });
      return out;
    };
    const metaBase = { start, arcs: arcs.map(p => ({ i: idxOf(p.g), a0: p.a0, a1: p.a1 })), Ro, Ri, W };

    /* ----- Mode légende (colonnes étroites) ----- */
    if (!around) {
      const cx = W / 2, cy = Ro + SW, svg = s('svg', { width: W, height: 10, style: { display: 'block', overflow: 'visible' } });
      svg.append(...ringNodes(cx, cy), centerNode(cx, cy));
      let y = cy + Ro + GAP.subsectionTitle * 2;
      const sw = VIZ.legendSwatch, tx = sw + VIZ.iconGap;
      for (const p of arcs) {
        const lines = textLines(p.g.title, p.g.text, BODY, W - tx);
        svg.append(s('rect', { x: SW / 2, y: y + (LH - sw) / 2 + SW / 2, width: sw - SW, height: sw - SW, rx: VIZ.barRadius, fill: colorRef(p.g.color), stroke: 'currentColor', 'stroke-width': SW }));
        svg.append(drawLines(lines, tx, y, LH, BODY));
        y += lines.length * LH + VIZ.blockGap;
      }
      const H = Math.ceil(y - VIZ.blockGap);
      svg.setAttribute('height', H); svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      return { node: svg, meta: { ...metaBase, cx, cy, H, around: false, items: [] } };
    }

    /* ----- Mode « autour de l'anneau » ----- */
    const room = (W - D) / 2, labelW = Math.max(60, Math.min(room - VIZ.leaderRoom, 264));
    const cx = W / 2;
    const items = arcs.map(p => {
      const mid = norm((p.a0 + p.a1) / 2);
      const autoSide = mid < 180 ? 1 : -1;
      const side = p.g.side === 'left' ? -1 : p.g.side === 'right' ? 1 : autoSide;
      const th = p.g.anchorT != null ? p.a0 + (p.a1 - p.a0) * p.g.anchorT : mid;
      const lines = textLines(p.g.title, p.g.text, BODY, labelW);
      return { p, mid, th, autoSide, side, lines, h: lines.length * LH, first: 0 };
    });
    items.forEach(it => { // largeur réelle de la 1re ligne (le trait de gauche s'arrête dessus)
      const r0 = it.lines[0]; it.first = r0 ? r0.runs.reduce((q, r) => q + mw(r.t, r.b ? 700 : 400, '"Source Sans 3", sans-serif', BODY), 0) : 0;
    });
    const place = cy => {
      for (const it of items) {
        const th = it.th, P = { x: cx + Ro * Math.sin(rad(th)), y: cy - Ro * Math.cos(rad(th)) };
        it.P = P; it.want = it.p.g.pin != null ? cy + it.p.g.pin : P.y - LH / 2;
      }
      for (const side of [1, -1]) resolveColumn(items.filter(i => i.side === side), 0, VIZ.blockGap);
      return Math.max(2 * Ro + 2 * SW, ...items.map(i => i.top + i.h));
    };
    let cy = Ro + SW; let H = place(cy);
    H = Math.ceil(Math.max(H, cy + Ro + SW));
    const svg = s('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, style: { display: 'block', overflow: 'visible' } });
    if (ui && ui.drag === 'label') for (const sd of [-1, 1]) svg.append(s('rect', { x: sd > 0 ? W - labelW : 0, y: 0, width: labelW, height: H, fill: ORANGE, 'fill-opacity': 0.08, stroke: ORANGE, 'stroke-dasharray': '4 3', 'stroke-width': 1, 'pointer-events': 'none' }));
    svg.append(...ringNodes(cx, cy), centerNode(cx, cy));
    for (const it of items) {
      const right = it.side > 0, x = right ? W - labelW : 0, ly = it.top + LH / 2;
      const E = { x: right ? x - VIZ.leaderGap : x + it.first + VIZ.leaderGap, y: ly };
      const dy = ly - it.P.y; let dx = Math.abs(dy); const roomX = Math.abs(E.x - it.P.x) - 3;
      if (dx > roomX) dx = Math.max(0, roomX);
      const K = Math.abs(dy) < 0.05 ? null : { x: it.P.x + it.side * dx, y: it.P.y + Math.sign(dy) * dx };
      svg.append(s('path', { d: `M${it.P.x},${it.P.y}${K ? `L${K.x},${K.y}` : ''}L${E.x},${E.y}`, fill: 'none', stroke: 'currentColor', 'stroke-width': SW, 'stroke-linejoin': 'round' }));
      svg.append(drawLines(it.lines, x, it.top, LH, BODY));
      it.x = x;
    }
    if (ui) {
      for (const it of items) {
        const i = idxOf(it.p.g), on = i === sel;
        svg.append(s('rect', { x: it.x - 3, y: it.top - 2, width: labelW + 6, height: it.h + 4, rx: 3, fill: 'transparent', stroke: on ? ORANGE : 'none', 'stroke-dasharray': '4 3', 'stroke-width': 1, 'data-hit': `label:${i}`, style: { cursor: 'ns-resize' } }));
      }
      const si = items.find(it => idxOf(it.p.g) === sel);
      if (si) svg.append(s('circle', { cx: si.P.x, cy: si.P.y, r: 6, fill: '#fff', stroke: ORANGE, 'stroke-width': 2, 'data-hit': `anchor:${sel}`, style: { cursor: 'grab' } }));
    }
    return { node: svg, meta: { ...metaBase, cx, cy, H, around: true, labelW, items: items.map(it => ({ i: idxOf(it.p.g), top: it.top, h: it.h, x: it.x, P: it.P, autoSide: it.autoSide })) } };
  },
};
