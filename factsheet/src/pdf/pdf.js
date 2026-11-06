/* Export PDF CMJN : les pages sont rendues comme à l'écran (render.js) dans un conteneur caché, puis relues élément par élément
   (fonds, filets, texte mot à mot, SVG des dataviz, images) et réécrites en opérateurs PDF vectoriels en DeviceCMYK avec pdf-lib.
   - couleurs : valeurs CMJN exactes de la palette (cmyk.js), conversion simple pour le reste ; noir et gris = noir seul
   - texte : polices incorporées (fonts/pdf/*.ttf, instances statiques de Source Sans 3 / Source Serif 4), positions relevées dans le navigateur
   - images : rastérisées à 300 ppi puis converties en CMJN (le canal alpha devient un masque)
   - fond perdu et traits de coupe : mêmes modes que l'impression (export.js), avec TrimBox et BleedBox. */
import { PDFDocument, PDFString, cmyk as cmykColor, pushGraphicsState, popGraphicsState, concatTransformationMatrix, moveTo, lineTo, appendBezierCurve,
  closePath, fill, PDFOperator, PDFOperatorNames, stroke, clip, clipEvenOdd, endPath, setLineWidth, setLineCap, setLineJoin, setDashPattern, setFillingCmykColor,
  setStrokingCmykColor, drawObject, setGraphicsState } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { PAGE, STROKE } from '../tokens.js';
import { renderDocument, measure } from '../render.js';
import { loadFonts } from '../viz/util.js';
import { makeCmykResolver } from '../cmyk.js';
import { EXPORT_MODES, A4, BLEED_MM, sheetSize } from '../export.js';

const PT_PER_MM = 72 / 25.4;
const KX = A4.w * PT_PER_MM / PAGE.w, KY = A4.h * PT_PER_MM / PAGE.h;      // px de page → points
const mul = (m, n) => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
const apply = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

/* ---------- couleurs CSS ---------- */
function parseCss(str) {
  const m = /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+%?))?\s*\)/.exec(str || '');
  if (!m) return null;
  let a = m[4] === undefined ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
  return { rgb: [+m[1], +m[2], +m[3]], a };
}

/* ---------- chemins SVG ---------- */
const NUM = /[+-]?(?:\d*\.\d+|\d+\.?)(?:[eE][+-]?\d+)?/g;
function arcToBeziers(x1, y1, rx, ry, phi, fa, fs, x2, y2) {
  if (!rx || !ry) return [['L', x2, y2]];
  rx = Math.abs(rx); ry = Math.abs(ry); const c = Math.cos(phi), s = Math.sin(phi);
  const dx = (x1 - x2) / 2, dy = (y1 - y2) / 2, x1p = c * dx + s * dy, y1p = -s * dx + c * dy;
  const lam = x1p * x1p / (rx * rx) + y1p * y1p / (ry * ry); if (lam > 1) { rx *= Math.sqrt(lam); ry *= Math.sqrt(lam); }
  const sign = fa === fs ? -1 : 1, num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p, den = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
  const co = sign * Math.sqrt(Math.max(0, num / den)), cxp = co * rx * y1p / ry, cyp = -co * ry * x1p / rx;
  const cx = c * cxp - s * cyp + (x1 + x2) / 2, cy = s * cxp + c * cyp + (y1 + y2) / 2;
  const ang = (ux, uy, vx, vy) => { const a = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy); return a; };
  let th1 = ang(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry), dth = ang((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
  if (!fs && dth > 0) dth -= 2 * Math.PI; else if (fs && dth < 0) dth += 2 * Math.PI;
  const n = Math.max(1, Math.ceil(Math.abs(dth) / (Math.PI / 2) - 1e-9)), d = dth / n, t = 4 / 3 * Math.tan(d / 4), out = [];
  for (let i = 0; i < n; i++) {
    const a1 = th1 + i * d, a2 = a1 + d, c1 = Math.cos(a1), s1 = Math.sin(a1), c2 = Math.cos(a2), s2 = Math.sin(a2);
    const p = (px, py) => [c * rx * px - s * ry * py + cx, s * rx * px + c * ry * py + cy];
    const [q1x, q1y] = p(c1 - t * s1, s1 + t * c1), [q2x, q2y] = p(c2 + t * s2, s2 - t * c2), [ex, ey] = p(c2, s2);
    out.push(['C', q1x, q1y, q2x, q2y, ex, ey]);
  }
  return out;
}
/** d → [['M',x,y] | ['L',x,y] | ['C',x1,y1,x2,y2,x,y] | ['Z']] en coordonnées absolues */
function parsePath(d) {
  const out = []; let cx = 0, cy = 0, sx = 0, sy = 0, lastC = null, lastQ = null;
  const re = /([MmLlHhVvCcSsQqTtAaZz])([^MmLlHhVvCcSsQqTtAaZz]*)/g; let m;
  while ((m = re.exec(d))) {
    const cmd = m[1], rel = cmd === cmd.toLowerCase(), a = (m[2].match(NUM) || []).map(Number), C = cmd.toUpperCase();
    let i = 0; const take = n => { const r = a.slice(i, i + n); i += n; return r; };
    if (C === 'Z') { out.push(['Z']); cx = sx; cy = sy; lastC = lastQ = null; continue; }
    const per = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7 }[C];
    let first = true;
    while (i < a.length || (first && !per)) {
      first = false; let v = take(per); if (v.length < per) break;
      if (C === 'M') { const [x, y] = rel ? [cx + v[0], cy + v[1]] : v; out.push(['M', x, y]); cx = sx = x; cy = sy = y; lastC = lastQ = null; if (i < a.length) { out.push(['L', ...(rel ? [cx + a[i], cy + a[i + 1]] : [a[i], a[i + 1]])]); const l = out[out.length - 1]; cx = l[1]; cy = l[2]; i += 2; while (i < a.length) { const q = rel ? [cx + a[i], cy + a[i + 1]] : [a[i], a[i + 1]]; out.push(['L', ...q]); cx = q[0]; cy = q[1]; i += 2; } } break; }
      if (C === 'L') { const [x, y] = rel ? [cx + v[0], cy + v[1]] : v; out.push(['L', x, y]); cx = x; cy = y; lastC = lastQ = null; }
      else if (C === 'H') { const x = rel ? cx + v[0] : v[0]; out.push(['L', x, cy]); cx = x; lastC = lastQ = null; }
      else if (C === 'V') { const y = rel ? cy + v[0] : v[0]; out.push(['L', cx, y]); cy = y; lastC = lastQ = null; }
      else if (C === 'C') { const p = rel ? [cx + v[0], cy + v[1], cx + v[2], cy + v[3], cx + v[4], cy + v[5]] : v; out.push(['C', ...p]); lastC = [p[2], p[3]]; lastQ = null; cx = p[4]; cy = p[5]; }
      else if (C === 'S') { const r = lastC ? [2 * cx - lastC[0], 2 * cy - lastC[1]] : [cx, cy], p = rel ? [cx + v[0], cy + v[1], cx + v[2], cy + v[3]] : v; out.push(['C', r[0], r[1], p[0], p[1], p[2], p[3]]); lastC = [p[0], p[1]]; lastQ = null; cx = p[2]; cy = p[3]; }
      else if (C === 'Q' || C === 'T') {
        let q1; let p;
        if (C === 'Q') { p = rel ? [cx + v[0], cy + v[1], cx + v[2], cy + v[3]] : v; q1 = [p[0], p[1]]; p = [p[2], p[3]]; }
        else { q1 = lastQ ? [2 * cx - lastQ[0], 2 * cy - lastQ[1]] : [cx, cy]; p = rel ? [cx + v[0], cy + v[1]] : v; }
        out.push(['C', cx + 2 / 3 * (q1[0] - cx), cy + 2 / 3 * (q1[1] - cy), p[0] + 2 / 3 * (q1[0] - p[0]), p[1] + 2 / 3 * (q1[1] - p[1]), p[0], p[1]]);
        lastQ = q1; lastC = null; cx = p[0]; cy = p[1];
      } else if (C === 'A') {
        const [rx, ry, rot, fa, fs, x, y] = v, ex = rel ? cx + x : x, ey = rel ? cy + y : y;
        out.push(...arcToBeziers(cx, cy, rx, ry, rot * Math.PI / 180, !!fa, !!fs, ex, ey)); cx = ex; cy = ey; lastC = lastQ = null;
      }
    }
  }
  return out;
}
const rectPath = (x, y, w, h, rx = 0, ry = rx) => {
  rx = Math.min(rx, w / 2); ry = Math.min(ry, h / 2);
  if (!rx || !ry) return [['M', x, y], ['L', x + w, y], ['L', x + w, y + h], ['L', x, y + h], ['Z']];
  const k = 0.5523;
  return [['M', x + rx, y], ['L', x + w - rx, y], ['C', x + w - rx + k * rx, y, x + w, y + ry - k * ry, x + w, y + ry], ['L', x + w, y + h - ry],
    ['C', x + w, y + h - ry + k * ry, x + w - rx + k * rx, y + h, x + w - rx, y + h], ['L', x + rx, y + h], ['C', x + rx - k * rx, y + h, x, y + h - ry + k * ry, x, y + h - ry],
    ['L', x, y + ry], ['C', x, y + ry - k * ry, x + rx - k * rx, y, x + rx, y], ['Z']];
};
const ellipsePath = (cx, cy, rx, ry) => { const k = 0.5523; return [['M', cx + rx, cy], ['C', cx + rx, cy + k * ry, cx + k * rx, cy + ry, cx, cy + ry], ['C', cx - k * rx, cy + ry, cx - rx, cy + k * ry, cx - rx, cy],
  ['C', cx - rx, cy - k * ry, cx - k * rx, cy - ry, cx, cy - ry], ['C', cx + k * rx, cy - ry, cx + rx, cy - k * ry, cx + rx, cy], ['Z']]; };

function parseTransform(str) {
  let m = [1, 0, 0, 1, 0, 0]; const re = /(matrix|translate|scale|rotate|skewX|skewY)\(([^)]*)\)/g; let t;
  while ((t = re.exec(str || ''))) {
    const a = (t[2].match(NUM) || []).map(Number); let n = [1, 0, 0, 1, 0, 0];
    if (t[1] === 'matrix') n = a; else if (t[1] === 'translate') n = [1, 0, 0, 1, a[0] || 0, a[1] || 0]; else if (t[1] === 'scale') n = [a[0], 0, 0, a[1] ?? a[0], 0, 0];
    else if (t[1] === 'rotate') { const r = (a[0] || 0) * Math.PI / 180, c = Math.cos(r), s = Math.sin(r); n = [c, s, -s, c, 0, 0]; if (a.length > 2) n = mul(mul([1, 0, 0, 1, a[1], a[2]], n), [1, 0, 0, 1, -a[1], -a[2]]); }
    else if (t[1] === 'skewX') n = [1, 0, Math.tan((a[0] || 0) * Math.PI / 180), 1, 0, 0]; else if (t[1] === 'skewY') n = [1, Math.tan((a[0] || 0) * Math.PI / 180), 0, 1, 0, 0];
    m = mul(m, n);
  }
  return m;
}

/* ---------- polices ---------- */
const WEIGHTS = { sans: [200, 400, 600, 700], 'sans-italic': [400, 600, 700], serif: [400, 600, 700] };
const nearest = (list, w) => list.reduce((a, b) => (Math.abs(b - w) < Math.abs(a - w) ? b : a));
const bytesCache = new Map();
const fontBytes = async name => { if (!bytesCache.has(name)) bytesCache.set(name, fetch(new URL(`fonts/pdf/${name}.ttf`, document.baseURI)).then(r => { if (!r.ok) throw new Error(name); return r.arrayBuffer(); })); return bytesCache.get(name); };

/* ---------- images ---------- */
const SCALE = 300 / 96;
function rgbaToCmykImage(data, w, h, resolve) {
  const cm = new Uint8Array(w * h * 4), al = new Uint8Array(w * h); let hasAlpha = false; const cache = new Map();
  for (let i = 0, p = 0, q = 0; i < data.length; i += 4, p++) {
    const a = data[i + 3]; al[p] = a; if (a < 255) hasAlpha = true;
    const k = data[i] << 16 | data[i + 1] << 8 | data[i + 2]; let v = cache.get(k);
    if (!v) { const c = resolve([data[i], data[i + 1], data[i + 2]]); v = [c[0] * 255, c[1] * 255, c[2] * 255, c[3] * 255].map(Math.round); cache.set(k, v); }
    cm[q++] = v[0]; cm[q++] = v[1]; cm[q++] = v[2]; cm[q++] = v[3];
  }
  return { cm, al, hasAlpha };
}

export async function buildPdf(doc, mode = 'net', onProgress = () => {}) {
  const m = EXPORT_MODES[mode] || EXPORT_MODES.net, size = sheetSize(mode), Wp = size.w * PT_PER_MM, Hp = size.h * PT_PER_MM, off = m.offset * PT_PER_MM, bleedPx = BLEED_MM * 96 / 25.4;
  await loadFonts();
  const resolve = makeCmykResolver(doc);
  const stage = document.createElement('div'); Object.assign(stage.style, { position: 'absolute', left: '-20000px', top: '0' }); document.body.append(stage);
  try {
    const result = renderDocument(doc); result.pages.forEach(p => stage.append(p.el)); measure(result);
    const imgs = [...stage.querySelectorAll('img')]; await Promise.all(imgs.map(i => (i.decode ? i.decode().catch(() => {}) : null)));
    const svgImg = new Map();   // <image> d'un SVG (drapeaux, images importées) : chargées avant le parcours
    await Promise.all([...stage.querySelectorAll('svg image')].map(async n => { const im = new Image(); im.src = n.getAttribute('href') || ''; try { await im.decode(); } catch (e) { /* illisible : ignorée */ } svgImg.set(n, im); }));

    const pdf = await PDFDocument.create(); pdf.registerFontkit(fontkit);
    pdf.setTitle(doc.name || 'factsheet'); pdf.setProducer('GSC tools — Factsheet creator (PDF CMJN)'); pdf.setCreator('GSC tools');
    const fonts = new Map();
    const fontFor = async (fam, weight, italic) => {
      const f = fam === 'serif' ? 'serif' : italic ? 'sans-italic' : 'sans', w = nearest(WEIGHTS[f], weight);
      const name = (fam === 'serif' ? 'SourceSerif4' : 'SourceSans3') + '-' + w + (f === 'sans-italic' ? '-italic' : '');
      if (!fonts.has(name)) {
        const bytes = await fontBytes(name), fk = fontkit.create(new Uint8Array(bytes)), embedded = await pdf.embedFont(bytes, { subset: true });
        fonts.set(name, { embedded, asc: fk.ascent / fk.unitsPerEm, desc: -fk.descent / fk.unitsPerEm, chars: new Set(embedded.getCharacterSet()) });
      }
      return fonts.get(name);
    };
    /* le texte est d'abord collecté (polices asynchrones), puis dessiné : on prépare toutes les polices utiles avant le rendu */
    const families = new Set(); for (const el of stage.querySelectorAll('*')) { const cs = getComputedStyle(el); families.add(`${/serif 4/i.test(cs.fontFamily) ? 'serif' : 'sans'}|${nearest(WEIGHTS[/serif 4/i.test(cs.fontFamily) ? 'serif' : cs.fontStyle === 'italic' ? 'sans-italic' : 'sans'], +cs.fontWeight || 400)}|${cs.fontStyle === 'italic'}`); }
    for (const k of families) { const [f, w, it] = k.split('|'); await fontFor(f, +w, it === 'true'); }

    const imgCache = new Map();
    let pageNo = 0;
    for (const p of result.pages) {
      onProgress(++pageNo, result.pages.length);
      const page = pdf.addPage([Wp, Hp]), P = p.el.getBoundingClientRect(), gsCache = new Map();
      /* repères : px relatifs à la page du document → points sur la feuille */
      const base = [KX, 0, 0, -KY, off, Hp - off];
      const ops = []; const push = (...o) => ops.push(...o); const flush = () => { if (ops.length) { page.pushOperators(...ops); ops.length = 0; } };
      const alphaOps = (a, A = a) => { if (a >= 0.999 && A >= 0.999) return null; const k = a.toFixed(3) + '|' + A.toFixed(3); if (!gsCache.has(k)) { const d = pdf.context.obj({ Type: 'ExtGState', ca: a, CA: A }); gsCache.set(k, page.node.newExtGState('GS', d)); } return setGraphicsState(gsCache.get(k)); };
      const toPt = (x, y) => apply(base, x, y);
      const setFill = c => push(setFillingCmykColor(...c)), setStroke = c => push(setStrokingCmykColor(...c));
      /* chemins : liste de commandes en coordonnées utilisateur, transformées par M (utilisateur → px de page) */
      const emitPath = (path, M) => {
        const T = mul(base, M), pt = (x, y) => apply(T, x, y);
        for (const s of path) {
          if (s[0] === 'M') push(moveTo(...pt(s[1], s[2]))); else if (s[0] === 'L') push(lineTo(...pt(s[1], s[2])));
          else if (s[0] === 'C') push(appendBezierCurve(...pt(s[1], s[2]), ...pt(s[3], s[4]), ...pt(s[5], s[6]))); else push(closePath());
        }
      };
      const paint = (path, M, fillC, fillA, strokeC, strokeA, sw, dash, cap, join, evenodd) => {
        if (!fillC && !strokeC) return;
        const swM = Math.sqrt(Math.abs(M[0] * M[3] - M[1] * M[2])) * Math.sqrt(KX * KY);   // largeur de trait en points
        push(pushGraphicsState());
        const a = alphaOps(fillC ? fillA : 1, strokeC ? strokeA : 1); if (a) push(a);
        if (fillC) { setFill(fillC); emitPath(path, M); push(evenodd ? PDFOperator.of(PDFOperatorNames.FillEvenOdd) : fill()); }
        if (strokeC && sw > 0) {
          setStroke(strokeC); push(setLineWidth(sw * swM)); if (cap) push(setLineCap(cap)); if (join) push(setLineJoin(join));
          if (dash && dash.length) push(setDashPattern(dash.map(v => v * swM), 0));
          emitPath(path, M); push(stroke());
        }
        push(popGraphicsState());
      };
      const ID = [1, 0, 0, 1, -P.left, -P.top];            // px écran → px page
      let clips = 0;
      const clipTo = (path, M) => { push(pushGraphicsState()); emitPath(path, M); push(clip(), endPath()); clips++; };
      const unclip = () => { push(popGraphicsState()); clips--; };

      /* ----- texte (HTML et SVG) ----- */
      const textJobs = [], links = [];
      const drawText = (node, el, scale, isSvg) => {
        const cs = getComputedStyle(el), serif = /serif 4/i.test(cs.fontFamily), italic = cs.fontStyle === 'italic', weight = +cs.fontWeight || 400;
        const size = parseFloat(cs.fontSize) * scale, col = parseCss(isSvg ? cs.fill : cs.color); if (!col || col.a === 0 || size <= 0) return;
        const upper = cs.textTransform === 'uppercase', ls = parseFloat(cs.letterSpacing) || 0, under = /underline/.test(cs.textDecorationLine), strike = /line-through/.test(cs.textDecorationLine), caps = cs.fontVariantCaps === 'small-caps';
        const data = node.data, re = /\S+/g; let w;
        while ((w = re.exec(data))) {
          const range = document.createRange(); range.setStart(node, w.index); range.setEnd(node, w.index + w[0].length);
          const rects = [...range.getClientRects()].filter(r => r.width > 0.01 || r.height > 0);
          if (!rects.length) continue;
          const word = upper ? w[0].toUpperCase() : w[0];
          /* lettre par lettre : tracking, petites capitales (lettres bas de casse en capitales à 80 %) et mot coupé en fin de ligne (césure).
             Un mot coupé a un rectangle par ligne et, sur chaque ligne sauf la dernière, un petit rectangle de trait d'union inséré par le navigateur ;
             Chrome rattache ce trait d'union à des lettres voisines (deux rectangles) : on range chaque lettre sur sa ligne et on dessine le trait d'union à sa place. */
          const per = rects.length > 1 || ls || caps;
          const chunks = [];
          if (!per) chunks.push({ t: word, r: rects[0], k: 1 });
          else {
            const lines = [];
            for (const r of rects) { let L = lines.find(l => Math.abs(l.top - r.top) < r.height / 2); if (!L) lines.push(L = { top: r.top, frags: [] }); L.frags.push(r); }
            lines.forEach((L, j) => { L.frags.sort((x, y) => x.left - y.left); L.hy = j < lines.length - 1 && L.frags.length > 1 ? L.frags[L.frags.length - 1] : null; L.limit = L.hy ? L.hy.left - 0.5 : Infinity; });
            const onLine = (q, L) => Math.abs(q.top - L.top) < q.height / 2 && q.left < L.limit;
            let li = 0;
            word.split('').forEach((ch, i) => {
              const rr = document.createRange(); rr.setStart(node, w.index + i); rr.setEnd(node, w.index + i + 1);
              const rs = [...rr.getClientRects()]; if (!rs.length) return;
              while (li < lines.length - 1 && !rs.some(q => onLine(q, lines[li]))) { if (lines[li].hy) chunks.push({ t: '-', r: lines[li].hy, k: 1 }); li++; }
              const own = rs.find(q => onLine(q, lines[li])) || rs[rs.length - 1], low = caps && ch !== ch.toUpperCase();
              chunks.push({ t: low ? ch.toUpperCase() : ch, r: own, k: low ? 0.8 : 1 });
            });
          }
          for (const c of chunks) textJobs.push({ text: c.t, x: c.r.left - P.left, top: c.r.top - P.top, h: c.r.height, w: c.r.width, serif, italic, weight, size: size * c.k, bsize: size, col, under, strike });
        }
      };
      const flushText = async () => {
        for (const j of textJobs) {
          const f = await fontFor(j.serif ? 'serif' : 'sans', j.weight, j.italic), t = [...j.text].filter(ch => f.chars.has(ch.codePointAt(0))).join('');
          if (!t) continue;
          const bs = j.bsize || j.size, baseline = j.top + (j.h - (f.asc + f.desc) * bs) / 2 + f.asc * bs, [x, y] = toPt(j.x, baseline), c = resolve(j.col.rgb);
          flush();
          page.drawText(t, { x, y, size: j.size * KY, font: f.embedded, color: cmykColor(...c), opacity: j.col.a < 1 ? j.col.a : undefined });
          if (j.strike) { const [sx, sy] = toPt(j.x, baseline - j.size * 0.3), [ex] = toPt(j.x + j.w, 0); push(pushGraphicsState()); setStroke(c); push(setLineWidth(j.size * 0.06 * KY)); push(moveTo(sx, sy), lineTo(ex, sy), stroke(), popGraphicsState()); }
          if (j.under) { const [ux, uy] = toPt(j.x, baseline + j.size * 0.12), [ex] = toPt(j.x + j.w, 0); push(pushGraphicsState()); setStroke(c); push(setLineWidth(j.size * 0.06 * KY)); push(moveTo(ux, uy), lineTo(ex, uy), stroke(), popGraphicsState()); }
        }
        textJobs.length = 0;
      };

      /* ----- SVG ----- */
      const urlRef = v => { const mm = /url\(["']?#([^"')]+)["']?\)/.exec(v || ''); return mm ? stage.querySelector('#' + CSS.escape(mm[1])) : null; };
      const shapePath = (el) => {
        const g = n => parseFloat(el.getAttribute(n)) || 0, tag = el.localName;
        if (tag === 'path') return parsePath(el.getAttribute('d') || '');
        if (tag === 'rect') return rectPath(g('x'), g('y'), g('width'), g('height'), g('rx') || g('ry'), g('ry') || g('rx'));
        if (tag === 'circle') return ellipsePath(g('cx'), g('cy'), g('r'), g('r'));
        if (tag === 'ellipse') return ellipsePath(g('cx'), g('cy'), g('rx'), g('ry'));
        if (tag === 'line') return [['M', g('x1'), g('y1')], ['L', g('x2'), g('y2')]];
        if (tag === 'polyline' || tag === 'polygon') { const n = (el.getAttribute('points') || '').match(NUM) || []; const out = []; for (let i = 0; i + 1 < n.length; i += 2) out.push([i ? 'L' : 'M', +n[i], +n[i + 1]]); if (tag === 'polygon') out.push(['Z']); return out; }
        return null;
      };
      const svgNode = (el, M, parentAlpha) => {
        const cs = getComputedStyle(el), tag = el.localName; if (cs.display === 'none' || cs.visibility === 'hidden') return;
        if (['defs', 'clippath', 'style', 'title', 'desc', 'mask', 'lineargradient', 'radialgradient', 'filter', 'symbol'].includes(tag.toLowerCase())) return;
        let N = el.hasAttribute('transform') ? mul(M, parseTransform(el.getAttribute('transform'))) : M;
        const alpha = parentAlpha * (parseFloat(cs.opacity) || (cs.opacity === '0' ? 0 : 1)); if (alpha <= 0) return;
        let pushed = 0;
        const cp = urlRef(el.getAttribute('clip-path') || cs.clipPath);
        if (cp) { const path = []; for (const c of cp.children) { const sp = shapePath(c); if (sp) path.push(...sp); } if (path.length) { clipTo(path, N); pushed++; } }
        if (tag === 'svg' && el.parentNode instanceof SVGElement) {          // svg imbriqué : fenêtre (x, y, w, h) + viewBox, hors de la fenêtre = rogné
          const x = parseFloat(el.getAttribute('x')) || 0, y = parseFloat(el.getAttribute('y')) || 0, w = parseFloat(el.getAttribute('width')) || 0, h = parseFloat(el.getAttribute('height')) || 0;
          const vb = (el.getAttribute('viewBox') || '').split(/[\s,]+/).map(Number); let Q = mul(N, [1, 0, 0, 1, x, y]);
          if (vb.length === 4 && vb[2] > 0 && vb[3] > 0 && w > 0 && h > 0) { const s = Math.min(w / vb[2], h / vb[3]); Q = mul(Q, [s, 0, 0, s, (w - vb[2] * s) / 2 - vb[0] * s, (h - vb[3] * s) / 2 - vb[1] * s]); }
          if (cs.overflowX !== 'visible' && w && h) { clipTo(rectPath(0, 0, w, h), mul(N, [1, 0, 0, 1, x, y])); pushed++; }
          for (const c of el.children) svgNode(c, Q, alpha);
        } else if (tag === 'g' || tag === 'a') { for (const c of el.children) svgNode(c, N, alpha); }
        else if (tag === 'image') { const im = svgImg.get(el); if (im && im.naturalWidth) drawImg(el, { objectFit: 'contain', objectPosition: '50% 50%', opacity: String(alpha) }, { img: im, rect: el.getBoundingClientRect() }); }
        else if (tag === 'text') { for (const n of el.querySelectorAll('*')) void n; const sc = el.getScreenCTM ? (el.getScreenCTM() || { a: 1 }).a : 1; walkText(el, sc, true); }
        else {
          const path = shapePath(el);
          if (path) {
            const f = parseCss(cs.fill), s = parseCss(cs.stroke), fillC = f && f.a > 0 ? resolve(f.rgb) : null, strokeC = s && s.a > 0 ? resolve(s.rgb) : null;
            const dash = (cs.strokeDasharray || 'none') === 'none' ? null : (cs.strokeDasharray.match(NUM) || []).map(Number);
            paint(path, N, fillC, (parseFloat(cs.fillOpacity) || 0) * (f ? f.a : 1) * alpha || (fillC ? alpha : 0), strokeC, (parseFloat(cs.strokeOpacity) || 0) * (s ? s.a : 1) * alpha || (strokeC ? alpha : 0),
              parseFloat(cs.strokeWidth) || 0, dash, { round: 1, square: 2 }[cs.strokeLinecap] || 0, { round: 1, bevel: 2 }[cs.strokeLinejoin] || 0, cs.fillRule === 'evenodd');
          }
        }
        while (pushed--) unclip();
      };
      const drawSvg = el => {
        const r = el.getBoundingClientRect(), vb = el.viewBox && el.viewBox.baseVal && el.viewBox.baseVal.width ? el.viewBox.baseVal : { x: 0, y: 0, width: r.width, height: r.height };
        const sx = r.width / vb.width, sy = r.height / vb.height, M = [sx, 0, 0, sy, r.left - P.left - vb.x * sx, r.top - P.top - vb.y * sy], cs = getComputedStyle(el);
        const clipIt = cs.overflowX !== 'visible'; if (clipIt) clipTo(rectPath(vb.x, vb.y, vb.width, vb.height), M);
        for (const c of el.children) svgNode(c, M, parseFloat(cs.opacity) || 1);
        if (clipIt) unclip();
      };

      /* ----- images ----- */
      const drawImg = (el0, cs, ov) => {
        const el = ov ? ov.img : el0, r = ov ? ov.rect : el0.getBoundingClientRect(); if (r.width < 0.5 || r.height < 0.5 || !el.naturalWidth) return;
        const fit = cs.objectFit || 'fill', cw = Math.max(1, Math.min(4000, Math.round(r.width * SCALE))), ch = Math.max(1, Math.min(4000, Math.round(r.height * SCALE)));
        const key = `${el.currentSrc}|${cw}|${ch}|${fit}|${cs.objectPosition}`;
        let ref = imgCache.get(key);
        if (!ref) {
          const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch; const g = cv.getContext('2d'), iw = el.naturalWidth, ih = el.naturalHeight;
          let dw = cw, dh = ch; if (fit === 'cover' || fit === 'contain' || fit === 'scale-down') { const k = (fit === 'cover' ? Math.max : Math.min)(cw / iw, ch / ih); dw = iw * k; dh = ih * k; } else if (fit === 'none') { dw = iw * SCALE; dh = ih * SCALE; }
          const pos = (cs.objectPosition || '50% 50%').split(' ').map(v => (v.endsWith('%') ? parseFloat(v) / 100 : 0.5)); g.drawImage(el, (cw - dw) * pos[0], (ch - dh) * (pos[1] ?? 0.5), dw, dh);
          const { cm, al, hasAlpha } = rgbaToCmykImage(g.getImageData(0, 0, cw, ch).data, cw, ch, resolve);
          const dict = { Type: 'XObject', Subtype: 'Image', Width: cw, Height: ch, ColorSpace: 'DeviceCMYK', BitsPerComponent: 8 };
          if (hasAlpha) dict.SMask = pdf.context.register(pdf.context.flateStream(al, { Type: 'XObject', Subtype: 'Image', Width: cw, Height: ch, ColorSpace: 'DeviceGray', BitsPerComponent: 8 }));
          ref = pdf.context.register(pdf.context.flateStream(cm, dict)); imgCache.set(key, ref);
        }
        const name = page.node.newXObject('Img', ref), [x, y] = toPt(r.left - P.left, r.bottom - P.top), a = alphaOps(parseFloat(cs.opacity) || 1);
        push(pushGraphicsState()); if (a) push(a); push(concatTransformationMatrix(r.width * KX, 0, 0, r.height * KY, x, y), drawObject(name), popGraphicsState());
      };

      /* ----- HTML ----- */
      const bleedFor = (el, r) => {
        if (!m.bleed) return null;
        const isHd = el.classList.contains('hd'), isBand = el.classList.contains('sec-band'); if (!isHd && !isBand) return null;
        return { l: bleedPx, r: bleedPx, t: isHd || el.classList.contains('sec-first') ? bleedPx : 0, b: el.classList.contains('sec-last') && isBand ? bleedPx : 0 };
      };
      const walk = el => {
        const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') return;
        if (el instanceof SVGSVGElement) { drawSvg(el); return; }
        const r = el.getBoundingClientRect(), x = r.left - P.left, y = r.top - P.top;
        const bg = parseCss(cs.backgroundColor), rad = parseFloat(cs.borderTopLeftRadius) || 0, opacity = parseFloat(cs.opacity); const al = alphaOps(isNaN(opacity) ? 1 : opacity);
        if (al) push(pushGraphicsState(), al);
        if (bg && bg.a > 0 && r.width > 0 && r.height > 0) {
          const bl = bleedFor(el, r) || { l: 0, r: 0, t: 0, b: 0 }, a2 = alphaOps(bg.a);
          push(pushGraphicsState()); if (a2) push(a2); setFill(resolve(bg.rgb)); emitPath(rectPath(x - bl.l, y - bl.t, r.width + bl.l + bl.r, r.height + bl.t + bl.b, rad), ID.slice(0, 4).concat([0, 0]));
          push(fill(), popGraphicsState());
        }
        const bw = ['Top', 'Right', 'Bottom', 'Left'].map(sd => { const w0 = parseFloat(cs['border' + sd + 'Width']) || 0; return cs['border' + sd + 'Style'] === 'none' || !w0 ? 0 : w0 <= 1.01 ? STROKE.px : w0; });
        if (bw.some(Boolean)) {
          const side = (sd, i) => { const c = parseCss(cs['border' + sd + 'Color']); return c && c.a > 0 ? { w: bw[i], c: resolve(c.rgb), a: c.a } : null; };
          const S = [side('Top', 0), side('Right', 1), side('Bottom', 2), side('Left', 3)];
          if (bw.every(v => v === bw[0]) && S.every(Boolean) && S.every(s => s.c.join() === S[0].c.join())) {
            const w = bw[0]; paint(rectPath(x + w / 2, y + w / 2, r.width - w, r.height - w, Math.max(0, rad - w / 2)), [1, 0, 0, 1, 0, 0], null, 1, S[0].c, S[0].a, w, null, 0, 0, false);
          } else {
            const seg = [[x, y + bw[0] / 2, x + r.width, y + bw[0] / 2], [x + r.width - bw[1] / 2, y, x + r.width - bw[1] / 2, y + r.height], [x, y + r.height - bw[2] / 2, x + r.width, y + r.height - bw[2] / 2], [x + bw[3] / 2, y, x + bw[3] / 2, y + r.height]];
            S.forEach((s, i) => { if (s) paint([['M', seg[i][0], seg[i][1]], ['L', seg[i][2], seg[i][3]]], [1, 0, 0, 1, 0, 0], null, 1, s.c, s.a, s.w, null, 0, 0, false); });
          }
        }
        const clipped = cs.overflowX !== 'visible' && el !== p.el && el.localName !== 'html';
        if (clipped) clipTo(rectPath(x, y, r.width, r.height, rad), [1, 0, 0, 1, 0, 0]);
        if (el.localName === 'img') drawImg(el, cs);
        if (cs.display === 'list-item' && cs.listStyleType !== 'none') {         // puce : disque devant la première ligne
          const rg = document.createRange(); rg.selectNodeContents(el); const first = [...rg.getClientRects()].find(q => q.width > 0);
          const fs = parseFloat(cs.fontSize), col = parseCss(cs.color);
          if (first && col) paint(ellipsePath(first.left - P.left - fs * 0.62, first.top - P.top + first.height * 0.52, fs * 0.17, fs * 0.17), [1, 0, 0, 1, 0, 0], resolve(col.rgb), 1, null, 1, 0, null, 0, 0, false);
        }
        for (const n of el.childNodes) { if (n.nodeType === 3) drawText(n, el, 1, false); else if (n.nodeType === 1) walk(n); }
        if (el.localName === 'a' && /^(https?:\/\/|mailto:)/i.test(el.getAttribute('href') || '')) {   // lien : une zone cliquable par ligne de texte
          const rg = document.createRange(); rg.selectNodeContents(el);
          for (const q of rg.getClientRects()) if (q.width > 0.5 && q.height > 0.5) links.push({ x: q.left - P.left, y: q.top - P.top, w: q.width, h: q.height, url: el.getAttribute('href') });
        }
        if (clipped) unclip();
        if (al) push(popGraphicsState());
      };
      const walkText = (el, scale, isSvg) => { for (const n of el.childNodes) { if (n.nodeType === 3) drawText(n, el, scale, isSvg); else if (n.nodeType === 1) walkText(n, scale, isSvg); } };

      /* Le texte est dessiné après le reste de la page : l'ordre n'a pas d'importance (aucun élément ne recouvre du texte) sauf pour les SVG, où il suit. */
      walk(p.el);
      flush(); await flushText(); flush();
      for (const l of links) {
        const [x1, y1] = toPt(l.x, l.y + l.h), [x2, y2] = toPt(l.x + l.w, l.y);
        const ref = pdf.context.register(pdf.context.obj({ Type: 'Annot', Subtype: 'Link', Rect: [x1, y1, x2, y2], Border: [0, 0, 0], A: { Type: 'Action', S: 'URI', URI: PDFString.of(l.url) } }));
        page.node.addAnnot(ref);
      }
      /* traits de coupe : repère noir (toutes les encres), 0,25 pt, à 3 mm du format fini */
      if (m.marks) {
        const L = 3 * PT_PER_MM, gap = BLEED_MM * PT_PER_MM, X = [off, off + A4.w * PT_PER_MM], Y = [off, off + A4.h * PT_PER_MM], mk = [];
        mk.push(pushGraphicsState(), setStrokingCmykColor(1, 1, 1, 1), setLineWidth(0.25));
        X.forEach((x, xi) => Y.forEach((y, yi) => { const sx = xi ? 1 : -1, sy = yi ? 1 : -1;
          const hx = sx < 0 ? x - gap - L : x + gap; mk.push(moveTo(hx, y), lineTo(hx + L, y), stroke());
          const vy = sy < 0 ? y - gap - L : y + gap; mk.push(moveTo(x, vy), lineTo(x, vy + L), stroke()); }));
        mk.push(popGraphicsState()); page.pushOperators(...mk);
      }
      page.setTrimBox(off, off, A4.w * PT_PER_MM, A4.h * PT_PER_MM);
      page.setBleedBox(off - (m.bleed ? BLEED_MM * PT_PER_MM : 0), off - (m.bleed ? BLEED_MM * PT_PER_MM : 0), A4.w * PT_PER_MM + (m.bleed ? 2 * BLEED_MM * PT_PER_MM : 0), A4.h * PT_PER_MM + (m.bleed ? 2 * BLEED_MM * PT_PER_MM : 0));
    }
    return await pdf.save({ useObjectStreams: false });
  } finally { stage.remove(); }
}

window.FSPDF = { build: buildPdf };
