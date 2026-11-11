/* Frise chronologique : verticale ou horizontale. Une ligne de 0,5 pt, un repère rond par événement (couleur au choix),
   date en chiffres Source Serif, titre en gras puis texte qui passe à la ligne ; « Alterner » répartit les événements de part et d'autre. */
import { VIZ, TYPE } from '../tokens.js';
import { reorderHit, s, SW, colorRef, pxOf, fmt, mw, SANS, SERIF, textLines, drawLines, heightOf } from './util.js';
import { t } from '../i18n.js';

/** Valeurs d'origine : trait 0,5 pt, repères de 5 px de rayon */
const LOOK = { lineWidth: 'thin', markSize: 'medium' };
const WIDTH_K = { thin: 1, medium: 2, thick: 3, xthick: 5 }; // mêmes crans que les courbes, en multiples de 0,5 pt
const MARK_R = { small: 3.5, medium: 5, large: 7 };

export default {
  label: 'Frise chronologique',
  icon: 'timeline',
  family: 'trend',
  heights: ['auto', 'fixed', 'fill'],
  defaults: () => ({
    orientation: 'vertical',
    alternate: false,
    showDates: true,
    tail: 'dashed',
    rows: [
      ['2021', 'Launch', 'The programme is announced.'],
      ['2022', 'First results', 'Early adopters report a clear impact on their daily work.'],
      ['2023', 'Extension', 'Three new member states join.'],
      ['2025', 'Review', 'An independent evaluation concludes the first phase.'],
    ].map(([date, title, text]) => ({ date, title, text, color: 'blue' })),
  }),
  fields: [
    { k: 'orientation', g: 'struct', t: 'select', label: 'Orientation', options: { vertical: 'Verticale', horizontal: 'Horizontale' } },
    { k: 'alternate', g: 'struct', t: 'bool', label: 'Alterner les événements de part et d’autre de la ligne' },
    { k: 'showDates', g: 'labels', t: 'bool', label: 'Afficher les dates' },
    {
      k: 'tail',
      g: 'struct',
      t: 'select',
      label: 'Extrémités de la ligne',
      options: {
        dashed: 'Prolongées, en pointillés',
        solid: 'Prolongées, en trait plein',
        none: 'Aucune : la ligne commence au premier cercle',
      },
    },
    {
      k: 'lineWidth',
      g: 'dims',
      t: 'select',
      label: 'Épaisseur du trait',
      options: { thin: 'Fin', medium: 'Moyen', thick: 'Épais', xthick: 'Très épais' },
      def: LOOK.lineWidth,
    },
    {
      k: 'markSize',
      g: 'dims',
      t: 'select',
      label: 'Taille des repères',
      options: { small: 'Petit', medium: 'Moyen', large: 'Grand' },
      def: LOOK.markSize,
    },
  ],
  data: {
    k: 'rows',
    min: 1,
    cols: [
      { k: 'date', label: 'Date', t: 'text' },
      { k: 'title', label: 'Titre', t: 'text', ml: true },
      { k: 'text', label: 'Texte', t: 'text', ml: true },
      { k: 'color', label: 'Couleur', t: 'color', def: 'blue' },
    ],
    item: () => ({ date: '', title: '', text: '', color: 'blue' }),
  },
  dataHint: 'Une ligne par événement, dans l’ordre d’affichage. Entrée = retour à la ligne dans le titre et le texte.',
  render(o, W, env) {
    const items = (o.rows || []).filter((r) => r.date || r.title || r.text),
      capPx = pxOf(TYPE.caption.size),
      lh = TYPE.caption.lh,
      numPx = pxOf(TYPE.captionNum.size);
    const R = MARK_R[o.markSize] ?? MARK_R[LOOK.markSize],
      lw = SW * (WIDTH_K[o.lineWidth] ?? WIDTH_K[LOOK.lineWidth]);
    const showDates = o.showDates !== false,
      horizontal = o.orientation === 'horizontal';
    const mk = (H) => s('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, style: { display: 'block', overflow: 'visible' } });
    if (!items.length) {
      const v = mk(40);
      v.append(s('text', { x: 0, y: capPx, 'font-size': capPx }, t('Aucune donnée')));
      return { node: v };
    }
    const dateNode = (txt, x, y, anchor) =>
      s(
        'text',
        {
          x,
          y: y + lh / 2 + 0.33 * numPx,
          'text-anchor': anchor,
          'font-size': numPx,
          'font-weight': 700,
          style: { fontFamily: 'var(--t-captionNum-family)' },
        },
        txt,
      );
    const dot = (cx, cy, color) =>
      s('circle', { cx, cy, r: R, fill: colorRef(color || 'blue'), stroke: 'currentColor', 'stroke-width': SW });
    const block = (it, maxW) => ({ lines: textLines(it.title || '', it.text || '', capPx, maxW), dateH: showDates && it.date ? lh : 0 });
    const stretch = (natural) =>
      o.hmode === 'fixed' || o.hmode === 'fill' || o.hmode === 'match' ? Math.max(0, heightOf(o, W, env, natural) - natural) : 0;

    /* extrémités de la ligne : prolongée en pointillés (un tiers plein puis des tirets, pour dire « ça continue »), prolongée en trait plein, ou aucune
       (la ligne commence au premier cercle et finit au dernier) */
    const tail = o.tail || 'dashed',
      TL = 24;
    const line = (svg, x1, y1, x2, y2, dash) =>
      svg.append(s('line', { x1, y1, x2, y2, stroke: 'currentColor', 'stroke-width': lw, 'stroke-dasharray': dash || null }));
    const tailSeg = (svg, xa, ya, xb, yb) => {
      // a : côté du cercle, b : extrémité
      if (Math.hypot(xb - xa, yb - ya) < 1) return;
      if (tail === 'solid') {
        line(svg, xa, ya, xb, yb);
        return;
      }
      const xm = xa + (xb - xa) * 0.35,
        ym = ya + (yb - ya) * 0.35;
      line(svg, xa, ya, xm, ym);
      line(svg, xm, ym, xb, yb, '3 3');
    };

    if (!horizontal) {
      const alt = o.alternate && W >= 240,
        lineX = alt ? W / 2 : R + 1,
        side = alt ? W / 2 - R - 12 : W - (2 * R + 14) - 1,
        top = tail === 'none' ? 0 : TL;
      const laid = [];
      const end = { l: 0, r: 0 };
      let prevY = -1e9;
      items.forEach((it, i) => {
        const left = alt && i % 2 === 1,
          b = block(it, side),
          h = b.dateH + b.lines.length * lh,
          k = left ? 'l' : 'r';
        const y = Math.max(end[k], prevY + lh * 1.6);
        end[k] = y + h + 12;
        prevY = y;
        laid.push({ it, b, left, y, h });
      });
      const n = laid.length,
        natural = Math.max(...laid.map((l) => l.y + l.h)) + top,
        extra = stretch(natural);
      const yOf = (l, i) => l.y + top + (n > 1 ? (extra * i) / (n - 1) : 0),
        d0 = yOf(laid[0], 0) + lh / 2,
        d1 = yOf(laid[n - 1], n - 1) + lh / 2;
      const H = Math.max(natural + extra, tail === 'none' ? 0 : d1 + TL),
        svg = mk(H);
      if (n > 1) line(svg, lineX, d0, lineX, d1);
      if (tail !== 'none') {
        tailSeg(svg, lineX, d0 - R, lineX, 0);
        tailSeg(svg, lineX, d1 + R, lineX, d1 + TL);
      }
      laid.forEach((l, i) => {
        const y = yOf(l, i),
          x = l.left ? lineX - R - 10 : lineX + R + 10,
          anchor = l.left ? 'end' : 'start';
        svg.append(dot(lineX, y + lh / 2, l.it.color));
        if (l.b.dateH) svg.append(dateNode(l.it.date, x, y, anchor));
        svg.append(drawLines(l.b.lines, x, y + l.b.dateH, lh, capPx, anchor));
      });
      laid.forEach((l, i) =>
        svg.append(reorderHit(env, 'rows', (o.rows || []).indexOf(l.it), 'y', 0, yOf(l, i) - 4, W, Math.max(l.h, lh) + 8)),
      );
      return { node: svg };
    }

    /* horizontale : une colonne par événement, la ligne en haut (ou au milieu quand on alterne) */
    const n = items.length,
      none = tail === 'none' && n > 1;
    const xs = items.map((_, i) => (none ? R + 1 + (i * (W - 2 * R - 2)) / (n - 1) : (W / n) * (i + 0.5))); // sans extrémités : le 1er cercle est au début de la ligne
    const pitch = none ? (W - 2 * R - 2) / (n - 1) : W / n,
      alt = o.alternate && n > 1,
      tw = Math.max(36, (alt ? 2 * pitch : pitch) - 10); // en alternance, deux colonnes voisines d'un même côté sont à 2 pas
    const anchorAt = (i) => (none && i === 0 ? 'start' : none && i === n - 1 ? 'end' : 'middle'),
      tx = (i, a) => (a === 'start' ? 0 : a === 'end' ? W : xs[i]);
    /* un texte centré sur sa colonne ne doit jamais sortir de la dataviz : largeur limitée par la distance au bord le plus proche */
    const twAt = (i) =>
      anchorAt(i) !== 'middle' ? Math.max(36, Math.min(tw, W)) : Math.max(36, Math.min(tw, 2 * Math.min(xs[i], W - xs[i]) - 4));
    const blocks = items.map((it, i) => block(it, twAt(i))),
      hOf = (b) => b.dateH + b.lines.length * lh;
    const up = alt ? Math.max(0, ...blocks.filter((_, i) => i % 2 === 1).map(hOf)) : showDates ? lh : 0,
      down = Math.max(0, ...blocks.filter((_, i) => !alt || i % 2 === 0).map((b) => (alt ? hOf(b) : b.lines.length * lh)));
    const lineY = up + (up ? 10 : 0) + R + 1,
      natural = lineY + R + 8 + down,
      extra = stretch(natural),
      H = natural + extra;
    const svg = mk(H);
    if (n > 1) line(svg, xs[0], lineY, xs[n - 1], lineY);
    if (tail !== 'none') {
      tailSeg(svg, xs[0] - R, lineY, 0, lineY);
      tailSeg(svg, xs[n - 1] + R, lineY, W, lineY);
    }
    items.forEach((it, i) => {
      const b = blocks[i],
        above = alt && i % 2 === 1,
        an = anchorAt(i),
        x = tx(i, an);
      svg.append(dot(xs[i], lineY, it.color));
      if (alt) {
        const y0 = above ? lineY - R - 8 - hOf(b) : lineY + R + 8;
        if (b.dateH) svg.append(dateNode(it.date, x, y0, an));
        svg.append(drawLines(b.lines, x, y0 + b.dateH, lh, capPx, an));
      } else {
        if (b.dateH) svg.append(dateNode(it.date, x, lineY - R - 8 - lh, an));
        svg.append(drawLines(b.lines, x, lineY + R + 8, lh, capPx, an));
      }
    });
    items.forEach((it, i) => svg.append(reorderHit(env, 'rows', (o.rows || []).indexOf(it), 'x', xs[i] - pitch / 2, 0, pitch, H)));
    return { node: svg };
  },
};
