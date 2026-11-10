/* Aperçu : dessine en SVG la liste produite par layout.js, et mesure le texte pour elle. */
import { COLORS, FONTS } from 'org/theme.js';

const NS = 'http://www.w3.org/2000/svg';
const svgEl = (tag, attrs = {}) => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) e.setAttribute(k, v);
  return e;
};

/* Mesure au canvas à une taille de référence fixe, puis mise à l’échelle (stable et mise en cache). */
const REF = 200;
const cache = new Map();
let ctx;
export function measure(text, font, size, track = 0) {
  const key = font + '|' + text;
  let w = cache.get(key);
  if (w === undefined) {
    ctx ||= document.createElement('canvas').getContext('2d');
    ctx.font = `${REF}px "${FONTS[font].family}"`;
    w = ctx.measureText(text).width / REF;
    cache.set(key, w);
  }
  return (w + track * [...text].length) * size;
}

/* Les polices doivent être chargées avant toute mesure ; on vide le cache une fois prêtes. */
export async function loadFonts() {
  await Promise.all(Object.values(FONTS).map((f) => document.fonts.load(`20px "${f.family}"`, 'Xx—')));
  cache.clear();
}

const pathD = (d) => d.map((c) => c[0] + c.slice(1).map((n) => +n.toFixed(3)).join(' ')).join('');

export function renderSvg(svg, lay, doc) {
  svg.setAttribute('viewBox', `0 0 ${lay.W} ${lay.H}`);
  const nodes = [];
  for (const it of lay.items) {
    if (it.t === 'path') {
      nodes.push(
        svgEl('path', {
          d: pathD(it.d),
          fill: it.fill ? COLORS[it.fill].rgb : 'none',
          stroke: it.stroke ? COLORS[it.stroke].rgb : null,
          'stroke-width': it.stroke ? it.lw : null,
          'data-id': it.id,
        }),
      );
    } else if (it.t === 'text') {
      const t = svgEl('text', {
        x: +it.x.toFixed(3),
        y: +it.y.toFixed(3),
        'font-family': FONTS[it.font].family,
        'font-size': +it.size.toFixed(3),
        'letter-spacing': it.track ? +(it.track * it.size).toFixed(3) : null,
        fill: COLORS[it.color].rgb,
        'data-id': it.id,
        'data-field': it.field,
      });
      t.textContent = it.text;
      nodes.push(t);
    }
  }
  for (const im of lay.images) {
    const g = svgEl('g', { class: 'placed', 'data-key': im.key });
    g.append(
      svgEl('image', { href: doc.assets[im.asset], x: im.x, y: im.y, width: im.w, height: im.h, preserveAspectRatio: 'none' }),
      svgEl('rect', { class: 'placed-frame', x: im.x, y: im.y, width: im.w, height: im.h }),
      svgEl('rect', { class: 'placed-grip', x: im.x + im.w - 5, y: im.y + im.h - 5, width: 10, height: 10, rx: 2 }),
    );
    nodes.push(g);
  }
  if (lay.overflow > 0) {
    // Limite basse de la page utile : visible seulement quand le contenu la dépasse (jamais exporté).
    nodes.push(svgEl('line', { class: 'limit', x1: 0, x2: lay.W, y1: lay.limit, y2: lay.limit }));
  }
  svg.replaceChildren(...nodes);
}
