/* Mise en page : transforme le document en une liste d’éléments à dessiner (tracés, textes, images),
   en points PDF, origine en haut à gauche. L’aperçu SVG (render.js) et l’export PDF (pdf.js) dessinent
   la MÊME liste : ce que l’on voit est ce qui s’imprime. Aucune dépendance au DOM : `measure` est fourni.

   Toutes les cotes viennent du gabarit 2025_2143_PEC_organigram (A4 paysage, relevées dans le PDF). */

export const T = {
  pageLong: 841.89,
  pageShort: 595.276,
  marginX: 63.4,
  marginTop: 36.57,
  marginBottom: 31.5, // 33,2 dans le gabarit ; 1,7 pt de tolérance pour que le gabarit tienne à 100 %
  stroke: 0.5,
  radius: 2.835,
  boxW: 365.1, // largeur d’un cadre seul sur son niveau
  boxGap: 17.8, // espace entre deux cadres d’un même niveau
  headH: 25.173,
  titleSize: 13,
  titleBase: 16.52, // ligne de base du titre depuis le haut de l’en-tête
  titleLead: 15,
  leadNameSize: 13,
  leadNameBase: 13.98, // depuis le bas de l’en-tête
  leadRoleSize: 11.15,
  leadRoleGap: 13.38,
  afterLead: 16.86,
  nameSize: 9,
  roleSize: 9,
  emphRoleSize: 10,
  lineLead: 10.8,
  emphLead: 13.8, // interligne après une personne mise en avant
  firstLine: 13.2, // première ligne de base sous l’en-tête (cadre sans sous-section)
  groupGap: 6, // supplément entre deux groupes sans titre
  barInset: 8.06,
  barH: 25.173,
  barTop: 11.34, // sous l’en-tête
  barAfterText: 14.38, // sous la dernière ligne de base du groupe précédent
  barTitleSize: 12,
  barTitleBase: 17.59,
  barTitleTrack: -0.03,
  barFirstLine: 13.7,
  padXBars: 8.23,
  padX: 5.67,
  padBottomLeft: 9.93,
  padBottomCenter: 6.5,
  linkGap: 17.63, // trait simple entre deux niveaux d’un seul cadre
  busGap: 35.22, // niveaux reliés par un rail horizontal
  busAt: 0.505,
  busRadius: 3,
  minScale: 0.35,
  smallText: 6, // en dessous (corps des noms, en points), l’app alerte
};

const K = 0.5523; // approximation d’un quart de cercle par une courbe de Bézier

/* Rectangle arrondi ; r = [haut-gauche, haut-droit, bas-droit, bas-gauche]. */
function roundRect(x, y, w, h, r) {
  const [a, b, c, d] = r.map((v) => Math.min(v, w / 2, h / 2));
  const p = [['M', x + a, y], ['L', x + w - b, y]];
  if (b) p.push(['C', x + w - b + b * K, y, x + w, y + b - b * K, x + w, y + b]);
  p.push(['L', x + w, y + h - c]);
  if (c) p.push(['C', x + w, y + h - c + c * K, x + w - c + c * K, y + h, x + w - c, y + h]);
  p.push(['L', x + d, y + h]);
  if (d) p.push(['C', x + d - d * K, y + h, x, y + h - d + d * K, x, y + h - d]);
  p.push(['L', x, y + a]);
  if (a) p.push(['C', x, y + a - a * K, x + a - a * K, y, x + a, y]);
  p.push(['Z']);
  return p;
}

/* Coupe une suite de segments (texte, police, corps) en lignes de largeur maximale `maxW`.
   Rend [{ w, segs: [{ text, font, size, track, dx }] }]. Un mot plus large que la ligne reste entier. */
function wrap(runs, maxW, measure) {
  const words = [];
  for (const r of runs) {
    for (const m of String(r.text).matchAll(/\S+\s*|\s+/g)) {
      const raw = m[0];
      const core = raw.trimEnd();
      words.push({ ...r, text: raw, core, w: measure(raw, r.font, r.size, r.track), cw: measure(core, r.font, r.size, r.track) });
    }
  }
  const lines = [];
  let cur = [];
  let x = 0;
  const flush = () => {
    if (!cur.length) return;
    const last = cur[cur.length - 1];
    const segs = [];
    let dx = 0;
    cur.forEach((wd, i) => {
      const text = i === cur.length - 1 ? wd.core : wd.text;
      const prev = segs[segs.length - 1];
      if (prev && prev.font === wd.font && prev.size === wd.size && prev.track === wd.track) prev.text += text;
      else segs.push({ text, font: wd.font, size: wd.size, track: wd.track, dx });
      dx += wd.w;
    });
    lines.push({ w: x - last.w + last.cw, segs });
    cur = [];
    x = 0;
  };
  for (const wd of words) {
    if (!wd.core) {
      if (cur.length) cur[cur.length - 1].w += wd.w, (x += wd.w);
      continue;
    }
    if (cur.length && x + wd.cw > maxW + 0.01) flush();
    cur.push({ ...wd });
    x += wd.w;
  }
  flush();
  return lines;
}

/* Un cadre, à l’échelle s, dans une largeur bw : rend sa hauteur et de quoi le dessiner en (x, y). */
function layoutBox(box, bw, s, measure) {
  const texts = []; // { y, lines, align, color, id, field }
  const bars = []; // { y, h }
  const center = box.align === 'center';
  const hasBars = box.groups.some((g) => g.title.trim());
  const padX = hasBars ? T.padXBars : T.padX;
  const innerW = Math.max(20, bw - 2 * padX);

  // En-tête (le titre passe sur plusieurs lignes s’il le faut, l’en-tête grandit)
  const tl = wrap([{ text: box.title || ' ', font: 'serifSBI', size: T.titleSize * s, track: 0 }], bw - 2 * T.padX, measure);
  const headH = (T.headH + (Math.max(1, tl.length) - 1) * T.titleLead) * s;
  tl.forEach((ln, i) => texts.push({ y: (T.titleBase + i * T.titleLead) * s, line: ln, align: 'center', color: 'white', id: box.id, field: 'title', full: true }));

  let base = headH; // dernière ligne de base (ou bas du dernier bloc)
  let prev = 'head';

  if (box.lead && (box.lead.name.trim() || box.lead.role.trim())) {
    if (box.lead.name.trim()) {
      const ls = wrap([{ text: box.lead.name, font: 'sansB', size: T.leadNameSize * s, track: 0 }], innerW, measure);
      ls.forEach((ln, i) => {
        base += (i === 0 ? T.leadNameBase : T.titleLead) * s;
        texts.push({ y: base, line: ln, align: 'center', color: 'blue', id: box.id, field: 'leadName' });
      });
    } else base += (T.leadNameBase - T.leadRoleGap) * s;
    if (box.lead.role.trim()) {
      const ls = wrap([{ text: box.lead.role, font: 'serifI', size: T.leadRoleSize * s, track: 0 }], innerW, measure);
      ls.forEach((ln) => {
        base += T.leadRoleGap * s;
        texts.push({ y: base, line: ln, align: 'center', color: 'blue', id: box.id, field: 'leadRole' });
      });
    }
    prev = 'lead';
  }

  for (const g of box.groups) {
    const titled = !!g.title.trim();
    const people = g.people.filter((p) => p.name.trim() || p.role.trim());
    if (!titled && !people.length) continue;
    if (titled) {
      const top = base + (prev === 'head' ? T.barTop : prev === 'bar' ? T.barInset : T.barAfterText) * s;
      const bl = wrap([{ text: g.title, font: 'serifSBI', size: T.barTitleSize * s, track: T.barTitleTrack }], bw - 2 * T.barInset - 2 * T.padX, measure);
      const h = (T.barH + (bl.length - 1) * T.titleLead) * s;
      bars.push({ y: top, h, id: g.id });
      bl.forEach((ln, i) => texts.push({ y: top + (T.barTitleBase + i * T.titleLead) * s, line: ln, align: 'center', color: 'blue', id: g.id, field: 'title' }));
      base = top + h;
      prev = 'bar';
    }
    let gap = prev === 'bar' ? T.barFirstLine : prev === 'head' ? T.firstLine : prev === 'lead' ? T.afterLead : T.lineLead + T.groupGap;
    for (const p of people) {
      const runs = [];
      const name = p.name.trim();
      const role = p.role.trim();
      if (name) runs.push({ text: role ? name + ' ' : name, font: 'sansB', size: T.nameSize * s, track: 0 });
      if (role) runs.push({ text: name ? '— ' + role : role, font: 'serifI', size: (p.emph ? T.emphRoleSize : T.roleSize) * s, track: 0 });
      const ls = wrap(runs, innerW, measure);
      ls.forEach((ln, i) => {
        base += (i === 0 ? gap : p.emph ? T.emphRoleSize * 1.2 : T.lineLead) * s;
        texts.push({ y: base, line: ln, align: center ? 'center' : 'left', color: 'blue', id: p.id, field: 'name' });
      });
      gap = p.emph ? T.emphLead : T.lineLead;
      prev = 'people';
    }
  }

  const h = prev === 'head' ? headH + T.barTop * s : prev === 'bar' ? base + T.barInset * s : base + (center ? T.padBottomCenter : T.padBottomLeft) * s;

  const draw = (x, y, hh, items, hits) => {
    const r = T.radius;
    items.push({ t: 'path', d: roundRect(x, y, bw, headH, [r, r, 0, 0]), fill: box.tone === 'dark' ? 'blue' : 'mid', id: box.id });
    items.push({ t: 'path', d: roundRect(x, y, bw, hh, [r, r, r, r]), stroke: 'blue', lw: T.stroke });
    for (const b of bars) items.push({ t: 'path', d: roundRect(x + T.barInset, y + b.y, bw - 2 * T.barInset, b.h, [r, r, r, r]), fill: 'light', id: b.id });
    for (const tx of texts) {
      const x0 = tx.align === 'center' ? x + (bw - tx.line.w) / 2 : x + padX;
      for (const sg of tx.line.segs) {
        items.push({ t: 'text', x: x0 + sg.dx, y: y + tx.y, text: sg.text, font: sg.font, size: sg.size, track: sg.track, color: tx.color, id: tx.id, field: tx.field });
      }
    }
    hits.push({ id: box.id, x, y, w: bw, h: hh });
  };
  return { h, draw };
}

/* Traits de liaison entre le bas des cadres du haut et le haut des cadres du bas. */
function connectors(ups, downs, y0, y1, items) {
  const line = (d) => items.push({ t: 'path', d, stroke: 'blue', lw: T.stroke });
  const xs = [...ups, ...downs];
  const min = Math.min(...xs);
  const max = Math.max(...xs);
  if (max - min < 0.5) {
    line([['M', ups[0], y0], ['L', ups[0], y1]]);
    return;
  }
  const busY = y0 + (y1 - y0) * T.busAt;
  const r = Math.min(T.busRadius, (max - min) / 2, Math.abs(busY - y0), Math.abs(y1 - busY));
  const stub = (x, yEnd) => {
    const dir = yEnd < busY ? -1 : 1; // le trait part vers le haut ou vers le bas
    const edge = Math.abs(x - min) < 0.5 ? 1 : Math.abs(x - max) < 0.5 ? -1 : 0;
    if (!edge) return line([['M', x, yEnd], ['L', x, busY]]);
    line([['M', x, yEnd], ['L', x, busY + dir * r], ['C', x, busY + dir * r * (1 - K), x + edge * r * (1 - K), busY, x + edge * r, busY]]);
  };
  ups.forEach((x) => stub(x, y0));
  downs.forEach((x) => stub(x, y1));
  line([['M', min + r, busY], ['L', max - r, busY]]);
}

function compute(doc, s, measure, W) {
  const items = [];
  const hits = [];
  const cw = W - 2 * T.marginX;
  let y = T.marginTop;
  let prevCenters = null;
  let prevBottom = 0;
  for (const level of doc.levels) {
    const n = level.boxes.length;
    if (!n) continue;
    const bw = Math.min(T.boxW, (cw - (n - 1) * T.boxGap) / n);
    const total = n * bw + (n - 1) * T.boxGap;
    const x0 = T.marginX + (cw - total) / 2;
    const boxes = level.boxes.map((b) => layoutBox(b, bw, s, measure));
    const centers = boxes.map((_, i) => x0 + i * (bw + T.boxGap) + bw / 2);
    if (prevCenters) {
      const single = prevCenters.length === 1 && n === 1;
      y = prevBottom + (single ? T.linkGap : T.busGap) * s;
      connectors(prevCenters, centers, prevBottom, y, items);
    }
    const maxH = Math.max(...boxes.map((b) => b.h));
    boxes.forEach((b, i) => b.draw(x0 + i * (bw + T.boxGap), y, doc.page.equalHeights ? maxH : b.h, items, hits));
    hits.push({ id: level.id, x: x0, y, w: total, h: maxH, level: true });
    prevCenters = centers;
    prevBottom = y + maxH;
  }
  return { items, hits, bottom: prevBottom || T.marginTop };
}

export function pageSize(doc) {
  const land = doc.page.orientation !== 'portrait';
  return { W: land ? T.pageLong : T.pageShort, H: land ? T.pageShort : T.pageLong };
}

/* Position réelle d’une image placée : automatique (logo en haut à gauche, image en haut à droite) ou manuelle. */
export function placedRect(doc, key) {
  const p = doc[key];
  if (!p) return null;
  const { W } = pageSize(doc);
  const h = p.w / p.ratio;
  const auto = p.x == null || p.y == null;
  const x = auto ? (key === 'logo' ? T.marginX : W - T.marginX - p.w) : p.x;
  const y = auto ? T.marginTop : p.y;
  return { x, y, w: p.w, h, auto };
}

/* Mise en page complète. Avec « ajuster à la page », l’échelle verticale et les corps de texte se
   réduisent jusqu’à tenir (les largeurs des cadres ne changent pas : le texte garde toute la place). */
export function layout(doc, measure) {
  const { W, H } = pageSize(doc);
  const limit = H - T.marginBottom;
  let scale = 1;
  let res = compute(doc, 1, measure, W);
  if (doc.page.fit && res.bottom > limit + 0.01) {
    let lo = T.minScale;
    let hi = 1;
    for (let i = 0; i < 14; i++) {
      const mid = (lo + hi) / 2;
      if (compute(doc, mid, measure, W).bottom <= limit) lo = mid;
      else hi = mid;
    }
    scale = lo;
    res = compute(doc, scale, measure, W);
  }
  const images = [];
  for (const key of ['logo', 'image']) {
    const r = placedRect(doc, key);
    if (r) images.push({ t: 'image', key, asset: doc[key].asset, ...r });
  }
  return {
    W,
    H,
    scale,
    items: res.items,
    images,
    hits: res.hits,
    bottom: res.bottom,
    limit,
    overflow: Math.max(0, res.bottom - limit),
    small: T.nameSize * scale < T.smallText,
  };
}
