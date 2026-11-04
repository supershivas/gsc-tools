/* Frise chronologique : verticale ou horizontale. Une ligne de 0,5 pt, un repère rond par événement (couleur au choix),
   date en chiffres Source Serif, titre en gras puis texte qui passe à la ligne ; « Alterner » répartit les événements de part et d'autre. */
import { VIZ, TYPE } from '../tokens.js';
import { s, SW, colorRef, pxOf, fmt, mw, SANS, SERIF, textLines, drawLines, heightOf } from './util.js';
import { t } from '../i18n.js';

const R = 5;   // rayon du repère

export default {
  label: 'Frise chronologique', icon: 'timeline', family: 'trend',
  heights: ['auto', 'fixed', 'fill'],
  defaults: () => ({
    orientation: 'vertical', alternate: false, showDates: true,
    rows: [['2021', 'Launch', 'The programme is announced.'], ['2022', 'First results', 'Early adopters report a clear impact on their daily work.'], ['2023', 'Extension', 'Three new member states join.'], ['2025', 'Review', 'An independent evaluation concludes the first phase.']]
      .map(([date, title, text]) => ({ date, title, text, color: 'blue' })),
  }),
  fields: [
    { k: 'orientation', t: 'select', label: 'Orientation', options: { vertical: 'Verticale', horizontal: 'Horizontale' } },
    { k: 'alternate', t: 'bool', label: 'Alterner les événements de part et d’autre de la ligne' },
    { k: 'showDates', t: 'bool', label: 'Afficher les dates' },
  ],
  data: { k: 'rows', min: 1, cols: [{ k: 'date', label: 'Date', t: 'text' }, { k: 'title', label: 'Titre', t: 'text', ml: true }, { k: 'text', label: 'Texte', t: 'text', ml: true }, { k: 'color', label: 'Couleur', t: 'color', def: 'blue' }],
    item: () => ({ date: '', title: '', text: '', color: 'blue' }) },
  dataHint: 'Une ligne par événement, dans l’ordre d’affichage. Entrée = retour à la ligne dans le titre et le texte.',
  render(o, W, env) {
    const items = (o.rows || []).filter(r => (r.date || r.title || r.text)), capPx = pxOf(TYPE.caption.size), lh = TYPE.caption.lh, numPx = pxOf(TYPE.captionNum.size);
    const showDates = o.showDates !== false, horizontal = o.orientation === 'horizontal';
    const mk = H => s('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, style: { display: 'block', overflow: 'visible' } });
    if (!items.length) { const v = mk(40); v.append(s('text', { x: 0, y: capPx, 'font-size': capPx }, t('Aucune donnée'))); return { node: v }; }
    const dateNode = (txt, x, y, anchor) => s('text', { x, y: y + lh / 2 + 0.33 * numPx, 'text-anchor': anchor, 'font-size': numPx, 'font-weight': 700, style: { fontFamily: 'var(--t-captionNum-family)' } }, txt);
    const dot = (cx, cy, color) => s('circle', { cx, cy, r: R, fill: colorRef(color || 'blue'), stroke: 'currentColor', 'stroke-width': SW });
    const block = (it, maxW) => ({ lines: textLines(it.title || '', it.text || '', capPx, maxW), dateH: showDates && it.date ? lh : 0 });
    const stretch = (natural) => (o.hmode === 'fixed' || o.hmode === 'fill') ? Math.max(0, heightOf(o, W, env, natural) - natural) : 0;

    if (!horizontal) {
      const alt = o.alternate && W >= 240, lineX = alt ? W / 2 : R + 1, side = alt ? W / 2 - R - 12 : W - (2 * R + 14) - 1;
      const laid = []; const end = { l: 0, r: 0 }; let prevY = -1e9;
      items.forEach((it, i) => {
        const left = alt && i % 2 === 1, b = block(it, side), h = b.dateH + b.lines.length * lh, k = left ? 'l' : 'r';
        const y = Math.max(end[k], prevY + lh * 1.6); end[k] = y + h + 12; prevY = y; laid.push({ it, b, left, y, h });
      });
      const natural = Math.max(...laid.map(l => l.y + l.h)), extra = stretch(natural), H = natural + extra, n = laid.length;
      const svg = mk(H);
      svg.append(s('line', { x1: lineX, x2: lineX, y1: 0, y2: H, stroke: 'currentColor', 'stroke-width': SW }));
      laid.forEach((l, i) => {
        const y = l.y + (n > 1 ? extra * i / (n - 1) : 0), x = l.left ? lineX - R - 10 : lineX + R + 10, anchor = l.left ? 'end' : 'start';
        svg.append(dot(lineX, y + lh / 2, l.it.color));
        if (l.b.dateH) svg.append(dateNode(l.it.date, x, y, anchor));
        svg.append(drawLines(l.b.lines, x, y + l.b.dateH, lh, capPx, anchor));
      });
      return { node: svg };
    }

    /* horizontale : une colonne par événement, la ligne en haut (ou au milieu quand on alterne) */
    const n = items.length, slot = W / n, alt = o.alternate && n > 1, tw = Math.max(36, (alt ? 2 * slot : slot) - 10);   // en alternance, deux colonnes voisines d'un même côté sont à 2 pas
    /* un texte centré sur sa colonne ne doit jamais sortir de la dataviz : largeur limitée par la distance au bord le plus proche */
    const twAt = i => Math.max(36, Math.min(tw, 2 * Math.min(slot * (i + 0.5), W - slot * (i + 0.5)) - 4));
    const blocks = items.map((it, i) => block(it, twAt(i))), hOf = b => b.dateH + b.lines.length * lh;
    const up = alt ? Math.max(0, ...blocks.filter((_, i) => i % 2 === 1).map(hOf)) : (showDates ? lh : 0), down = Math.max(0, ...blocks.filter((_, i) => !alt || i % 2 === 0).map(b => alt ? hOf(b) : b.lines.length * lh));
    const lineY = up + (up ? 10 : 0) + R + 1, natural = lineY + R + 8 + down, extra = stretch(natural), H = natural + extra;
    const svg = mk(H);
    svg.append(s('line', { x1: 0, x2: W, y1: lineY, y2: lineY, stroke: 'currentColor', 'stroke-width': SW }));
    items.forEach((it, i) => {
      const cx = slot * (i + 0.5), b = blocks[i], above = alt && i % 2 === 1;
      svg.append(dot(cx, lineY, it.color));
      if (alt) {
        const y0 = above ? lineY - R - 8 - hOf(b) : lineY + R + 8;
        if (b.dateH) svg.append(dateNode(it.date, cx, y0, 'middle'));
        svg.append(drawLines(b.lines, cx, y0 + b.dateH, lh, capPx, 'middle'));
      } else {
        if (b.dateH) svg.append(dateNode(it.date, cx, lineY - R - 8 - lh, 'middle'));
        svg.append(drawLines(b.lines, cx, lineY + R + 8, lh, capPx, 'middle'));
      }
    });
    return { node: svg };
  },
};
