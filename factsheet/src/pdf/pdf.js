/* Export PDF (seul chemin d'export) : les pages sont rendues comme à l'écran (render.js) dans un conteneur caché, puis relues élément
   par élément (fonds, filets, texte mot à mot, SVG des dataviz, images) et réécrites en opérateurs PDF vectoriels avec pdf-lib,
   en DeviceCMYK, ou en DeviceRGB pour le profil « RVB (écran) » (`rgb: true` dans PDF_PROFILES).
   - couleurs CMJN : valeurs exactes de la palette (cmyk.js), conversion simple pour le reste ; noir et gris = noir seul
   - couleurs RVB : celles de l'écran, sans conversion ni profil
   - texte : polices incorporées (fonts/pdf/*.ttf, instances statiques de Source Sans 3 / Source Serif 4), positions relevées dans le navigateur
   - images : rastérisées à 300 ppi puis converties en CMJN ou gardées en RVB (le canal alpha devient un masque)
   - fond perdu et traits de coupe : modes de export.js, avec TrimBox et BleedBox ; le débord des fonds est décidé par bleedFor
   - profil (PDF_PROFILES, export.js) : PDF/X-4 (transparences conservées) ou PDF/X-1a (transparences aplaties sur le fond situé
     sous l'élément), avec profil de sortie FOGRA39 incorporé (icc/ISOcoated_v2_300_eci.icc, ECI), métadonnées XMP et identifiant ;
     les liens cliquables ne sont gardés que hors PDF/X (annotations interdites dans la page)
   - caractères absents des polices : non dessinés, renvoyés dans `missing` pour prévenir avant le téléchargement. */
import {
  PDFDocument,
  PDFString,
  PDFHexString,
  PDFName,
  cmyk as cmykColor,
  rgb as rgbColor,
  pushGraphicsState,
  popGraphicsState,
  concatTransformationMatrix,
  moveTo,
  lineTo,
  appendBezierCurve,
  closePath,
  fill,
  PDFOperator,
  PDFOperatorNames,
  stroke,
  clip,
  clipEvenOdd,
  endPath,
  setLineWidth,
  setLineCap,
  setLineJoin,
  setDashPattern,
  setFillingCmykColor,
  setStrokingCmykColor,
  setFillingRgbColor,
  setStrokingRgbColor,
  drawObject,
  setGraphicsState,
} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { PAGE, STROKE } from '../tokens.js';
import { renderDocument, measure } from '../render.js';
import { loadFonts } from '../viz/util.js';
import { makeCmykResolver } from '../cmyk.js';
import { EXPORT_MODES, PDF_PROFILES, A4, BLEED_MM, sheetSize } from '../export.js';

const PT_PER_MM = 72 / 25.4;
const KX = (A4.w * PT_PER_MM) / PAGE.w,
  KY = (A4.h * PT_PER_MM) / PAGE.h; // px de page → points
const mul = (m, n) => [
  m[0] * n[0] + m[2] * n[1],
  m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3],
  m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4],
  m[1] * n[4] + m[3] * n[5] + m[5],
];
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
  rx = Math.abs(rx);
  ry = Math.abs(ry);
  const c = Math.cos(phi),
    s = Math.sin(phi);
  const dx = (x1 - x2) / 2,
    dy = (y1 - y2) / 2,
    x1p = c * dx + s * dy,
    y1p = -s * dx + c * dy;
  const lam = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (lam > 1) {
    rx *= Math.sqrt(lam);
    ry *= Math.sqrt(lam);
  }
  const sign = fa === fs ? -1 : 1,
    num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p,
    den = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
  const co = sign * Math.sqrt(Math.max(0, num / den)),
    cxp = (co * rx * y1p) / ry,
    cyp = (-co * ry * x1p) / rx;
  const cx = c * cxp - s * cyp + (x1 + x2) / 2,
    cy = s * cxp + c * cyp + (y1 + y2) / 2;
  const ang = (ux, uy, vx, vy) => {
    const a = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
    return a;
  };
  let th1 = ang(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry),
    dth = ang((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
  if (!fs && dth > 0) dth -= 2 * Math.PI;
  else if (fs && dth < 0) dth += 2 * Math.PI;
  const n = Math.max(1, Math.ceil(Math.abs(dth) / (Math.PI / 2) - 1e-9)),
    d = dth / n,
    t = (4 / 3) * Math.tan(d / 4),
    out = [];
  for (let i = 0; i < n; i++) {
    const a1 = th1 + i * d,
      a2 = a1 + d,
      c1 = Math.cos(a1),
      s1 = Math.sin(a1),
      c2 = Math.cos(a2),
      s2 = Math.sin(a2);
    const p = (px, py) => [c * rx * px - s * ry * py + cx, s * rx * px + c * ry * py + cy];
    const [q1x, q1y] = p(c1 - t * s1, s1 + t * c1),
      [q2x, q2y] = p(c2 + t * s2, s2 - t * c2),
      [ex, ey] = p(c2, s2);
    out.push(['C', q1x, q1y, q2x, q2y, ex, ey]);
  }
  return out;
}
/** d → [['M',x,y] | ['L',x,y] | ['C',x1,y1,x2,y2,x,y] | ['Z']] en coordonnées absolues */
function parsePath(d) {
  const out = [];
  let cx = 0,
    cy = 0,
    sx = 0,
    sy = 0,
    lastC = null,
    lastQ = null;
  const re = /([MmLlHhVvCcSsQqTtAaZz])([^MmLlHhVvCcSsQqTtAaZz]*)/g;
  let m;
  while ((m = re.exec(d))) {
    const cmd = m[1],
      rel = cmd === cmd.toLowerCase(),
      a = (m[2].match(NUM) || []).map(Number),
      C = cmd.toUpperCase();
    let i = 0;
    const take = (n) => {
      const r = a.slice(i, i + n);
      i += n;
      return r;
    };
    if (C === 'Z') {
      out.push(['Z']);
      cx = sx;
      cy = sy;
      lastC = lastQ = null;
      continue;
    }
    const per = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7 }[C];
    let first = true;
    while (i < a.length || (first && !per)) {
      first = false;
      let v = take(per);
      if (v.length < per) break;
      if (C === 'M') {
        const [x, y] = rel ? [cx + v[0], cy + v[1]] : v;
        out.push(['M', x, y]);
        cx = sx = x;
        cy = sy = y;
        lastC = lastQ = null;
        if (i < a.length) {
          out.push(['L', ...(rel ? [cx + a[i], cy + a[i + 1]] : [a[i], a[i + 1]])]);
          const l = out[out.length - 1];
          cx = l[1];
          cy = l[2];
          i += 2;
          while (i < a.length) {
            const q = rel ? [cx + a[i], cy + a[i + 1]] : [a[i], a[i + 1]];
            out.push(['L', ...q]);
            cx = q[0];
            cy = q[1];
            i += 2;
          }
        }
        break;
      }
      if (C === 'L') {
        const [x, y] = rel ? [cx + v[0], cy + v[1]] : v;
        out.push(['L', x, y]);
        cx = x;
        cy = y;
        lastC = lastQ = null;
      } else if (C === 'H') {
        const x = rel ? cx + v[0] : v[0];
        out.push(['L', x, cy]);
        cx = x;
        lastC = lastQ = null;
      } else if (C === 'V') {
        const y = rel ? cy + v[0] : v[0];
        out.push(['L', cx, y]);
        cy = y;
        lastC = lastQ = null;
      } else if (C === 'C') {
        const p = rel ? [cx + v[0], cy + v[1], cx + v[2], cy + v[3], cx + v[4], cy + v[5]] : v;
        out.push(['C', ...p]);
        lastC = [p[2], p[3]];
        lastQ = null;
        cx = p[4];
        cy = p[5];
      } else if (C === 'S') {
        const r = lastC ? [2 * cx - lastC[0], 2 * cy - lastC[1]] : [cx, cy],
          p = rel ? [cx + v[0], cy + v[1], cx + v[2], cy + v[3]] : v;
        out.push(['C', r[0], r[1], p[0], p[1], p[2], p[3]]);
        lastC = [p[0], p[1]];
        lastQ = null;
        cx = p[2];
        cy = p[3];
      } else if (C === 'Q' || C === 'T') {
        let q1;
        let p;
        if (C === 'Q') {
          p = rel ? [cx + v[0], cy + v[1], cx + v[2], cy + v[3]] : v;
          q1 = [p[0], p[1]];
          p = [p[2], p[3]];
        } else {
          q1 = lastQ ? [2 * cx - lastQ[0], 2 * cy - lastQ[1]] : [cx, cy];
          p = rel ? [cx + v[0], cy + v[1]] : v;
        }
        out.push([
          'C',
          cx + (2 / 3) * (q1[0] - cx),
          cy + (2 / 3) * (q1[1] - cy),
          p[0] + (2 / 3) * (q1[0] - p[0]),
          p[1] + (2 / 3) * (q1[1] - p[1]),
          p[0],
          p[1],
        ]);
        lastQ = q1;
        lastC = null;
        cx = p[0];
        cy = p[1];
      } else if (C === 'A') {
        const [rx, ry, rot, fa, fs, x, y] = v,
          ex = rel ? cx + x : x,
          ey = rel ? cy + y : y;
        out.push(...arcToBeziers(cx, cy, rx, ry, (rot * Math.PI) / 180, !!fa, !!fs, ex, ey));
        cx = ex;
        cy = ey;
        lastC = lastQ = null;
      }
    }
  }
  return out;
}
const rectPath = (x, y, w, h, rx = 0, ry = rx) => {
  rx = Math.min(rx, w / 2);
  ry = Math.min(ry, h / 2);
  if (!rx || !ry) return [['M', x, y], ['L', x + w, y], ['L', x + w, y + h], ['L', x, y + h], ['Z']];
  const k = 0.5523;
  return [
    ['M', x + rx, y],
    ['L', x + w - rx, y],
    ['C', x + w - rx + k * rx, y, x + w, y + ry - k * ry, x + w, y + ry],
    ['L', x + w, y + h - ry],
    ['C', x + w, y + h - ry + k * ry, x + w - rx + k * rx, y + h, x + w - rx, y + h],
    ['L', x + rx, y + h],
    ['C', x + rx - k * rx, y + h, x, y + h - ry + k * ry, x, y + h - ry],
    ['L', x, y + ry],
    ['C', x, y + ry - k * ry, x + rx - k * rx, y, x + rx, y],
    ['Z'],
  ];
};
const ellipsePath = (cx, cy, rx, ry) => {
  const k = 0.5523;
  return [
    ['M', cx + rx, cy],
    ['C', cx + rx, cy + k * ry, cx + k * rx, cy + ry, cx, cy + ry],
    ['C', cx - k * rx, cy + ry, cx - rx, cy + k * ry, cx - rx, cy],
    ['C', cx - rx, cy - k * ry, cx - k * rx, cy - ry, cx, cy - ry],
    ['C', cx + k * rx, cy - ry, cx + rx, cy - k * ry, cx + rx, cy],
    ['Z'],
  ];
};

function parseTransform(str) {
  let m = [1, 0, 0, 1, 0, 0];
  const re = /(matrix|translate|scale|rotate|skewX|skewY)\(([^)]*)\)/g;
  let t;
  while ((t = re.exec(str || ''))) {
    const a = (t[2].match(NUM) || []).map(Number);
    let n = [1, 0, 0, 1, 0, 0];
    if (t[1] === 'matrix') n = a;
    else if (t[1] === 'translate') n = [1, 0, 0, 1, a[0] || 0, a[1] || 0];
    else if (t[1] === 'scale') n = [a[0], 0, 0, a[1] ?? a[0], 0, 0];
    else if (t[1] === 'rotate') {
      const r = ((a[0] || 0) * Math.PI) / 180,
        c = Math.cos(r),
        s = Math.sin(r);
      n = [c, s, -s, c, 0, 0];
      if (a.length > 2) n = mul(mul([1, 0, 0, 1, a[1], a[2]], n), [1, 0, 0, 1, -a[1], -a[2]]);
    } else if (t[1] === 'skewX') n = [1, 0, Math.tan(((a[0] || 0) * Math.PI) / 180), 1, 0, 0];
    else if (t[1] === 'skewY') n = [1, Math.tan(((a[0] || 0) * Math.PI) / 180), 0, 1, 0, 0];
    m = mul(m, n);
  }
  return m;
}

/* ---------- polices ---------- */
/* toutes les graisses (200 à 900), en romain et en italique, des deux familles : fonts/pdf/<Famille>-<graisse>[-italic].ttf (scripts/pdf-fonts.py) */
const WEIGHTS = [200, 300, 400, 500, 600, 700, 800, 900];
const nearest = (w) => WEIGHTS.reduce((a, b) => (Math.abs(b - w) < Math.abs(a - w) ? b : a));
const bytesCache = new Map();
const fontBytes = async (name) => {
  if (!bytesCache.has(name))
    bytesCache.set(
      name,
      fetch(new URL(`fonts/pdf/${name}.ttf`, document.baseURI)).then((r) => {
        if (!r.ok) throw new Error(name);
        return r.arrayBuffer();
      }),
    );
  return bytesCache.get(name);
};

/* ---------- encres : CMJN (imprimeur) ou RVB (écran) ---------- */
/* Une seule interface pour tout le parcours : couleur CSS [r, g, b] 0–255 → composantes 0–1 de l'espace du PDF. */
function makeInk(doc, rgb) {
  if (rgb)
    return {
      n: 3,
      space: 'DeviceRGB',
      white: [1, 1, 1],
      registration: [0, 0, 0], // traits de coupe : noir
      resolve: (c) => c.map((v) => Math.max(0, Math.min(255, v)) / 255),
      fill: (c) => setFillingRgbColor(...c),
      stroke: (c) => setStrokingRgbColor(...c),
      color: (c) => rgbColor(...c),
    };
  return {
    n: 4,
    space: 'DeviceCMYK',
    white: [0, 0, 0, 0],
    registration: [1, 1, 1, 1], // traits de coupe : repère sur toutes les encres
    resolve: makeCmykResolver(doc),
    fill: (c) => setFillingCmykColor(...c),
    stroke: (c) => setStrokingCmykColor(...c),
    color: (c) => cmykColor(...c),
  };
}

/* ---------- images ---------- */
const SCALE = 300 / 96;
/** pixels RVBA du canvas → composantes de l'espace du PDF (n par pixel) + canal alpha */
function rgbaToInkImage(data, w, h, ink) {
  const { n, resolve } = ink,
    cm = new Uint8Array(w * h * n),
    al = new Uint8Array(w * h);
  let hasAlpha = false;
  const cache = new Map();
  for (let i = 0, p = 0, q = 0; i < data.length; i += 4, p++) {
    const a = data[i + 3];
    al[p] = a;
    if (a < 255) hasAlpha = true;
    const k = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
    let v = cache.get(k);
    if (!v) {
      v = resolve([data[i], data[i + 1], data[i + 2]]).map((c) => Math.round(c * 255));
      cache.set(k, v);
    }
    for (let j = 0; j < n; j++) cm[q++] = v[j];
  }
  return { cm, al, hasAlpha };
}

const mix = (c, a, b) => c.map((v, i) => a * v + (1 - a) * b[i]); // aplat équivalent d'une couleur d'opacité a posée sur b (composantes 0–1)
const xmlEsc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** → { bytes, missing } ; opts : { profile: 'none' | 'x4' | 'x1a' | 'rgb', onProgress } */
export async function buildPdf(doc, mode = 'net', opts = {}) {
  /* opts.only : chemin d'un élément (`header`, `sec:0`, `sub:0:1`, `col:0:1:2`) → une seule page de la taille de l'élément, sans fond perdu ni repères */
  const only = opts.only || null;
  if (only) mode = 'net';
  const profile = PDF_PROFILES[opts.profile] ? opts.profile : 'none',
    flat = profile === 'x1a',
    pdfx = !!PDF_PROFILES[profile].icc,
    onProgress = opts.onProgress || (() => {});
  const missing = new Set();
  const m = EXPORT_MODES[mode] || EXPORT_MODES.net,
    size = sheetSize(mode),
    sheetW = size.w * PT_PER_MM,
    sheetH = size.h * PT_PER_MM,
    off = m.offset * PT_PER_MM,
    bleedPx = (BLEED_MM * 96) / 25.4;
  await loadFonts();
  const ink = makeInk(doc, !!PDF_PROFILES[profile].rgb),
    resolve = ink.resolve;
  const stage = document.createElement('div');
  Object.assign(stage.style, { position: 'absolute', left: '-20000px', top: '0' });
  document.body.append(stage);
  try {
    const result = renderDocument(doc);
    result.pages.forEach((p) => stage.append(p.el));
    measure(result);
    const imgs = [...stage.querySelectorAll('img')];
    await Promise.all(imgs.map((i) => (i.decode ? i.decode().catch(() => {}) : null)));
    const svgImg = new Map(); // <image> d'un SVG (drapeaux, images importées) : chargées avant le parcours
    await Promise.all(
      [...stage.querySelectorAll('svg image')].map(async (n) => {
        const im = new Image();
        im.src = n.getAttribute('href') || '';
        try {
          await im.decode();
        } catch (e) {
          /* illisible : ignorée */
        }
        svgImg.set(n, im);
      }),
    );

    const pdf = await PDFDocument.create();
    pdf.registerFontkit(fontkit);
    pdf.setTitle(doc.name || 'factsheet');
    pdf.setProducer(`GSC tools — Factsheet creator (PDF ${ink.n === 3 ? 'RVB' : 'CMJN'})`);
    pdf.setCreator('GSC tools');
    const fonts = new Map();
    const fontFor = async (fam, weight, italic) => {
      const name = (fam === 'serif' ? 'SourceSerif4' : 'SourceSans3') + '-' + nearest(weight) + (italic ? '-italic' : '');
      if (!fonts.has(name)) {
        const bytes = await fontBytes(name),
          fk = fontkit.create(new Uint8Array(bytes)),
          embedded = await pdf.embedFont(bytes, { subset: true });
        fonts.set(name, {
          embedded,
          asc: fk.ascent / fk.unitsPerEm,
          desc: -fk.descent / fk.unitsPerEm,
          chars: new Set(embedded.getCharacterSet()),
        });
      }
      return fonts.get(name);
    };
    /* le texte est d'abord collecté (polices asynchrones), puis dessiné : on prépare toutes les polices utiles avant le rendu */
    const families = new Set();
    for (const el of stage.querySelectorAll('*')) {
      const cs = getComputedStyle(el);
      families.add(
        `${/serif 4/i.test(cs.fontFamily) ? 'serif' : 'sans'}|${nearest(+cs.fontWeight || 400)}|${cs.fontStyle === 'italic' || cs.fontStyle.startsWith('oblique')}`,
      );
    }
    for (const k of families) {
      const [f, w, it] = k.split('|');
      await fontFor(f, +w, it === 'true');
    }

    const imgCache = new Map();
    let pageNo = 0;
    let todo = result.pages;
    if (only) {
      const hit = result.pages.map((q) => ({ ...q, root: q.el.querySelector(`[data-sel="${only}"]`) })).find((q) => q.root);
      if (!hit) throw new Error('élément introuvable : ' + only);
      todo = [hit];
    }
    for (const p of todo) {
      onProgress(++pageNo, todo.length);
      const root = only ? p.root : p.el,
        P = root.getBoundingClientRect();
      const Wp = only ? P.width * KX : sheetW,
        Hp = only ? P.height * KY : sheetH,
        gsCache = new Map(),
        page = pdf.addPage([Wp, Hp]);
      /* repères : px relatifs à la page du document → points sur la feuille */
      const base = [KX, 0, 0, -KY, off, Hp - off];
      const ops = [];
      const push = (...o) => ops.push(...o);
      const flush = () => {
        if (ops.length) {
          page.pushOperators(...ops);
          ops.length = 0;
        }
      };
      const alphaOps = (a, A = a) => {
        if (flat || (a >= 0.999 && A >= 0.999)) return null;
        const k = a.toFixed(3) + '|' + A.toFixed(3);
        if (!gsCache.has(k)) {
          const d = pdf.context.obj({ Type: 'ExtGState', ca: a, CA: A });
          gsCache.set(k, page.node.newExtGState('GS', d));
        }
        return setGraphicsState(gsCache.get(k));
      };
      const toPt = (x, y) => apply(base, x, y);
      const setFill = (c) => push(ink.fill(c)),
        setStroke = (c) => push(ink.stroke(c));
      /* chemins : liste de commandes en coordonnées utilisateur, transformées par M (utilisateur → px de page) */
      const emitPath = (path, M) => {
        const T = mul(base, M),
          pt = (x, y) => apply(T, x, y);
        for (const s of path) {
          if (s[0] === 'M') push(moveTo(...pt(s[1], s[2])));
          else if (s[0] === 'L') push(lineTo(...pt(s[1], s[2])));
          else if (s[0] === 'C') push(appendBezierCurve(...pt(s[1], s[2]), ...pt(s[3], s[4]), ...pt(s[5], s[6])));
          else push(closePath());
        }
      };
      const paint = (path, M, fillC, fillA, strokeC, strokeA, sw, dash, cap, join, evenodd, probe) => {
        if (!fillC && !strokeC) return;
        if (flat && probe) {
          if (fillC && fillA < 0.999) {
            fillC = mix(fillC, fillA, backdrop(...probe.pt));
            fillA = 1;
          }
          if (strokeC && strokeA < 0.999) {
            strokeC = mix(strokeC, strokeA, backdrop(...probe.pt));
            strokeA = 1;
          }
        }
        if (fillC && probe && probe.hit)
          painted.push({ hit: probe.hit, c: fillA >= 0.999 ? fillC : mix(fillC, fillA, backdrop(...probe.pt)) });
        const swM = Math.sqrt(Math.abs(M[0] * M[3] - M[1] * M[2])) * Math.sqrt(KX * KY); // largeur de trait en points
        push(pushGraphicsState());
        const a = alphaOps(fillC ? fillA : 1, strokeC ? strokeA : 1);
        if (a) push(a);
        if (fillC) {
          setFill(fillC);
          emitPath(path, M);
          push(evenodd ? PDFOperator.of(PDFOperatorNames.FillEvenOdd) : fill());
        }
        if (strokeC && sw > 0) {
          setStroke(strokeC);
          push(setLineWidth(sw * swM));
          if (cap) push(setLineCap(cap));
          if (join) push(setLineJoin(join));
          if (dash && dash.length)
            push(
              setDashPattern(
                dash.map((v) => v * swM),
                0,
              ),
            );
          emitPath(path, M);
          push(stroke());
        }
        push(popGraphicsState());
      };
      const ID = [1, 0, 0, 1, -P.left, -P.top]; // px écran → px page
      /* surfaces déjà peintes (de bas en haut) : ce qu'il y a sous un point, pour aplatir une transparence (PDF/X-1a) */
      const painted = [];
      const backdrop = (x, y) => {
        for (let i = painted.length - 1; i >= 0; i--) if (painted[i].hit(x, y)) return painted[i].c;
        return ink.white;
      };
      const rectHit = (x, y, w, h) => ({ pt: [x + w / 2, y + h / 2], hit: (px, py) => px >= x && px <= x + w && py >= y && py <= y + h });
      /* forme SVG : test « point dans le remplissage » de l'API SVG, point de sonde à l'intérieur de la forme */
      const svgHit = (el) => {
        const ctm = el.getScreenCTM && el.getScreenCTM();
        if (!ctm || !el.isPointInFill) return null;
        const inv = ctm.inverse(),
          hit = (x, y) => {
            try {
              return el.isPointInFill(new DOMPoint(x + P.left, y + P.top).matrixTransform(inv));
            } catch (e) {
              return false;
            }
          };
        const b = el.getBoundingClientRect(),
          x0 = b.left - P.left,
          y0 = b.top - P.top;
        let pt = [x0 + b.width / 2, y0 + b.height / 2];
        if (!hit(...pt))
          for (let i = 1; i < 6; i++)
            for (let j = 1; j < 6; j++) {
              const q = [x0 + (b.width * i) / 6, y0 + (b.height * j) / 6];
              if (hit(...q)) {
                pt = q;
                i = j = 6;
              }
            }
        return { pt, hit };
      };
      let curClip = null; // rectangle de rognage HTML en cours (px de page), appliqué au texte
      let clips = 0;
      const clipTo = (path, M) => {
        push(pushGraphicsState());
        emitPath(path, M);
        push(clip(), endPath());
        clips++;
      };
      const unclip = () => {
        push(popGraphicsState());
        clips--;
      };

      /* ----- texte (HTML et SVG) ----- */
      const textJobs = [],
        links = [];
      const drawText = (node, el, scale, isSvg, alpha = 1) => {
        const cs = getComputedStyle(el),
          clip = curClip,
          serif = /serif 4/i.test(cs.fontFamily),
          italic = cs.fontStyle === 'italic',
          weight = +cs.fontWeight || 400;
        const size = parseFloat(cs.fontSize) * scale,
          col0 = parseCss(isSvg ? cs.fill : cs.color);
        if (!col0 || col0.a * alpha <= 0 || size <= 0) return;
        const col = { rgb: col0.rgb, a: col0.a * alpha }; // opacité du texte × opacité des éléments parents
        const upper = cs.textTransform === 'uppercase',
          ls = parseFloat(cs.letterSpacing) || 0,
          under = /underline/.test(cs.textDecorationLine),
          strike = /line-through/.test(cs.textDecorationLine),
          caps = cs.fontVariantCaps === 'small-caps';
        const data = node.data,
          re = /\S+/g;
        let w;
        /* Texte SVG : positions par l'API SVG (getStartPositionOfChar / getSubStringLength), pas par Range.getClientRects(), que les navigateurs
           (Safari, Firefox) renvoient vides ou faux dans un <text> : seul le 1er mot d'un libellé sortait. Les espaces d'un <text> sont réduits comme en SVG. */
        if (isSvg && el.getStartPositionOfChar && el.getScreenCTM) {
          const ctm = el.getScreenCTM();
          if (ctm) {
            const map = new Map();
            let n = 0,
              prevSp = true,
              found = false; // indice d'un caractère de `node` → indice adressable du <text>
            const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
            for (let t; (t = tw.nextNode());)
              for (let i = 0; i < t.data.length; i++) {
                const sp = /[ \t\r\n]/.test(t.data[i]);
                if (sp && prevSp) {
                  if (t === node) map.set(i, -1);
                  continue;
                }
                if (t === node) {
                  map.set(i, n);
                  found = true;
                }
                n++;
                prevSp = sp;
              }
            if (found) {
              let ok = true;
              const jobs = [];
              while ((w = re.exec(data))) {
                const a = map.get(w.index);
                if (a == null || a < 0) continue;
                try {
                  const p0 = el.getStartPositionOfChar(a),
                    len = el.getSubStringLength(a, w[0].length);
                  const pt = new DOMPoint(p0.x, p0.y).matrixTransform(ctm);
                  jobs.push({
                    text: upper ? w[0].toUpperCase() : w[0],
                    x: pt.x - P.left,
                    top: 0,
                    h: 0,
                    by: pt.y - P.top,
                    w: len * ctm.a,
                    serif,
                    italic,
                    weight,
                    size,
                    bsize: size,
                    col,
                    under,
                    strike,
                    clip,
                  });
                } catch (e) {
                  ok = false;
                  break;
                }
              }
              if (ok) {
                textJobs.push(...jobs);
                return;
              }
            }
          }
          re.lastIndex = 0;
        }
        while ((w = re.exec(data))) {
          const range = document.createRange();
          range.setStart(node, w.index);
          range.setEnd(node, w.index + w[0].length);
          const rects = [...range.getClientRects()].filter((r) => r.width > 0.01 || r.height > 0);
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
            for (const r of rects) {
              let L = lines.find((l) => Math.abs(l.top - r.top) < r.height / 2);
              if (!L) lines.push((L = { top: r.top, frags: [] }));
              L.frags.push(r);
            }
            lines.forEach((L, j) => {
              L.frags.sort((x, y) => x.left - y.left);
              L.hy = j < lines.length - 1 && L.frags.length > 1 ? L.frags[L.frags.length - 1] : null;
              L.limit = L.hy ? L.hy.left - 0.5 : Infinity;
            });
            const onLine = (q, L) => Math.abs(q.top - L.top) < q.height / 2 && q.left < L.limit;
            let li = 0;
            word.split('').forEach((ch, i) => {
              const rr = document.createRange();
              rr.setStart(node, w.index + i);
              rr.setEnd(node, w.index + i + 1);
              const rs = [...rr.getClientRects()];
              if (!rs.length) return;
              while (li < lines.length - 1 && !rs.some((q) => onLine(q, lines[li]))) {
                if (lines[li].hy) chunks.push({ t: '-', r: lines[li].hy, k: 1 });
                li++;
              }
              const own = rs.find((q) => onLine(q, lines[li])) || rs[rs.length - 1],
                low = caps && ch !== ch.toUpperCase();
              chunks.push({ t: low ? ch.toUpperCase() : ch, r: own, k: low ? 0.8 : 1 });
            });
          }
          for (const c of chunks)
            textJobs.push({
              text: c.t,
              x: c.r.left - P.left,
              top: c.r.top - P.top,
              h: c.r.height,
              w: c.r.width,
              serif,
              italic,
              weight,
              size: size * c.k,
              bsize: size,
              col,
              under,
              strike,
              clip,
            });
        }
      };
      const flushText = async () => {
        for (const j of textJobs) {
          const f = await fontFor(j.serif ? 'serif' : 'sans', j.weight, j.italic),
            t = [...j.text]
              .filter((ch) => {
                const ok = f.chars.has(ch.codePointAt(0));
                if (!ok && !/\s/.test(ch)) missing.add(ch);
                return ok;
              })
              .join('');
          if (!t) continue;
          const bs = j.bsize || j.size,
            baseline = j.by != null ? j.by : j.top + (j.h - (f.asc + f.desc) * bs) / 2 + f.asc * bs,
            [x, y] = toPt(j.x, baseline);
          let c = resolve(j.col.rgb),
            a = j.col.a;
          if (flat && a < 0.999) {
            c = mix(c, a, backdrop(j.x + j.w / 2, baseline - j.size * 0.3));
            a = 1;
          }
          if (j.clip) {
            push(pushGraphicsState());
            emitPath(rectPath(j.clip.x, j.clip.y, j.clip.w, j.clip.h), [1, 0, 0, 1, 0, 0]);
            push(clip(), endPath());
          }
          flush();
          page.drawText(t, { x, y, size: j.size * KY, font: f.embedded, color: ink.color(c), opacity: a < 0.999 ? a : undefined });
          const la = alphaOps(1, a);
          if (la && (j.strike || j.under)) push(pushGraphicsState(), la);
          if (j.strike) {
            const [sx, sy] = toPt(j.x, baseline - j.size * 0.3),
              [ex] = toPt(j.x + j.w, 0);
            push(pushGraphicsState());
            setStroke(c);
            push(setLineWidth(j.size * 0.06 * KY));
            push(moveTo(sx, sy), lineTo(ex, sy), stroke(), popGraphicsState());
          }
          if (j.under) {
            const [ux, uy] = toPt(j.x, baseline + j.size * 0.12),
              [ex] = toPt(j.x + j.w, 0);
            push(pushGraphicsState());
            setStroke(c);
            push(setLineWidth(j.size * 0.06 * KY));
            push(moveTo(ux, uy), lineTo(ex, uy), stroke(), popGraphicsState());
          }
          if (la && (j.strike || j.under)) push(popGraphicsState());
          if (j.clip) push(popGraphicsState());
        }
        flush();
        textJobs.length = 0;
      };

      /* ----- SVG ----- */
      const urlRef = (v) => {
        const mm = /url\(["']?#([^"')]+)["']?\)/.exec(v || '');
        return mm ? stage.querySelector('#' + CSS.escape(mm[1])) : null;
      };
      const shapePath = (el) => {
        const g = (n) => parseFloat(el.getAttribute(n)) || 0,
          tag = el.localName;
        if (tag === 'path') return parsePath(el.getAttribute('d') || '');
        if (tag === 'rect') return rectPath(g('x'), g('y'), g('width'), g('height'), g('rx') || g('ry'), g('ry') || g('rx'));
        if (tag === 'circle') return ellipsePath(g('cx'), g('cy'), g('r'), g('r'));
        if (tag === 'ellipse') return ellipsePath(g('cx'), g('cy'), g('rx'), g('ry'));
        if (tag === 'line')
          return [
            ['M', g('x1'), g('y1')],
            ['L', g('x2'), g('y2')],
          ];
        if (tag === 'polyline' || tag === 'polygon') {
          const n = (el.getAttribute('points') || '').match(NUM) || [];
          const out = [];
          for (let i = 0; i + 1 < n.length; i += 2) out.push([i ? 'L' : 'M', +n[i], +n[i + 1]]);
          if (tag === 'polygon') out.push(['Z']);
          return out;
        }
        return null;
      };
      const svgNode = (el, M, parentAlpha) => {
        const cs = getComputedStyle(el),
          tag = el.localName;
        if (cs.display === 'none' || cs.visibility === 'hidden') return;
        if (
          ['defs', 'clippath', 'style', 'title', 'desc', 'mask', 'lineargradient', 'radialgradient', 'filter', 'symbol'].includes(
            tag.toLowerCase(),
          )
        )
          return;
        let N = el.hasAttribute('transform') ? mul(M, parseTransform(el.getAttribute('transform'))) : M;
        const op = parseFloat(cs.opacity),
          alpha = parentAlpha * (isNaN(op) ? 1 : op);
        if (alpha <= 0) return;
        let pushed = 0;
        const cp = urlRef(el.getAttribute('clip-path') || cs.clipPath);
        if (cp) {
          const path = [];
          for (const c of cp.children) {
            const sp = shapePath(c);
            if (sp) path.push(...sp);
          }
          if (path.length) {
            clipTo(path, N);
            pushed++;
          }
        }
        if (tag === 'svg' && el.parentNode instanceof SVGElement) {
          // svg imbriqué : fenêtre (x, y, w, h) + viewBox, hors de la fenêtre = rogné
          const x = parseFloat(el.getAttribute('x')) || 0,
            y = parseFloat(el.getAttribute('y')) || 0,
            w = parseFloat(el.getAttribute('width')) || 0,
            h = parseFloat(el.getAttribute('height')) || 0;
          const vb = (el.getAttribute('viewBox') || '').split(/[\s,]+/).map(Number);
          let Q = mul(N, [1, 0, 0, 1, x, y]);
          if (vb.length === 4 && vb[2] > 0 && vb[3] > 0 && w > 0 && h > 0) {
            const s = Math.min(w / vb[2], h / vb[3]);
            Q = mul(Q, [s, 0, 0, s, (w - vb[2] * s) / 2 - vb[0] * s, (h - vb[3] * s) / 2 - vb[1] * s]);
          }
          if (cs.overflowX !== 'visible' && w && h) {
            clipTo(rectPath(0, 0, w, h), mul(N, [1, 0, 0, 1, x, y]));
            pushed++;
          }
          for (const c of el.children) svgNode(c, Q, alpha);
        } else if (tag === 'g' || tag === 'a') {
          for (const c of el.children) svgNode(c, N, alpha);
        } else if (tag === 'image') {
          const im = svgImg.get(el);
          if (im && im.naturalWidth)
            drawImg(el, { objectFit: 'contain', objectPosition: '50% 50%' }, { img: im, rect: el.getBoundingClientRect() }, alpha);
        } else if (tag === 'text') {
          const sc = el.getScreenCTM ? (el.getScreenCTM() || { a: 1 }).a : 1;
          walkText(el, sc, true, alpha);
        } else {
          const path = shapePath(el);
          if (path) {
            const f = parseCss(cs.fill),
              s = parseCss(cs.stroke),
              fillC = f && f.a > 0 ? resolve(f.rgb) : null,
              strokeC = s && s.a > 0 ? resolve(s.rgb) : null;
            const dash = (cs.strokeDasharray || 'none') === 'none' ? null : (cs.strokeDasharray.match(NUM) || []).map(Number);
            const fo = parseFloat(cs.fillOpacity),
              so = parseFloat(cs.strokeOpacity); // fill-opacity: 0 = invisible (pas de repli sur 1)
            const probe = flat
              ? svgHit(el) || { pt: ((b) => [b.left - P.left + b.width / 2, b.top - P.top + b.height / 2])(el.getBoundingClientRect()) }
              : null;
            paint(
              path,
              N,
              fillC,
              (isNaN(fo) ? 1 : fo) * (f ? f.a : 1) * alpha,
              strokeC,
              (isNaN(so) ? 1 : so) * (s ? s.a : 1) * alpha,
              parseFloat(cs.strokeWidth) || 0,
              dash,
              { round: 1, square: 2 }[cs.strokeLinecap] || 0,
              { round: 1, bevel: 2 }[cs.strokeLinejoin] || 0,
              cs.fillRule === 'evenodd',
              probe,
            );
          }
        }
        while (pushed--) unclip();
      };
      const drawSvg = (el, A = 1) => {
        const r = el.getBoundingClientRect(),
          vb =
            el.viewBox && el.viewBox.baseVal && el.viewBox.baseVal.width
              ? el.viewBox.baseVal
              : { x: 0, y: 0, width: r.width, height: r.height };
        const sx = r.width / vb.width,
          sy = r.height / vb.height,
          M = [sx, 0, 0, sy, r.left - P.left - vb.x * sx, r.top - P.top - vb.y * sy],
          cs = getComputedStyle(el);
        const clipIt = cs.overflowX !== 'visible';
        if (clipIt) clipTo(rectPath(vb.x, vb.y, vb.width, vb.height), M);
        const op = parseFloat(cs.opacity),
          alpha = A * (isNaN(op) ? 1 : op);
        if (alpha > 0) for (const c of el.children) svgNode(c, M, alpha);
        if (clipIt) unclip();
      };

      /* ----- images ----- */
      const drawImg = (el0, cs, ov, alpha = 1) => {
        const el = ov ? ov.img : el0,
          r = ov ? ov.rect : el0.getBoundingClientRect();
        if (r.width < 0.5 || r.height < 0.5 || !el.naturalWidth) return;
        const fit = cs.objectFit || 'fill',
          cw = Math.max(1, Math.min(4000, Math.round(r.width * SCALE))),
          ch = Math.max(1, Math.min(4000, Math.round(r.height * SCALE)));
        const x0 = r.left - P.left,
          y0 = r.top - P.top,
          B = flat ? backdrop(x0 + r.width / 2, y0 + r.height / 2) : null; // X-1a : image posée à plat sur son fond
        const key = `${el.currentSrc}|${cw}|${ch}|${fit}|${cs.objectPosition}|${flat ? alpha + '|' + B.join() : ''}`;
        let ref = imgCache.get(key);
        if (!ref) {
          const cv = document.createElement('canvas');
          cv.width = cw;
          cv.height = ch;
          const g = cv.getContext('2d'),
            iw = el.naturalWidth,
            ih = el.naturalHeight;
          let dw = cw,
            dh = ch;
          if (fit === 'cover' || fit === 'contain' || fit === 'scale-down') {
            const k = (fit === 'cover' ? Math.max : Math.min)(cw / iw, ch / ih);
            dw = iw * k;
            dh = ih * k;
          } else if (fit === 'none') {
            dw = iw * SCALE;
            dh = ih * SCALE;
          }
          const pos = (cs.objectPosition || '50% 50%').split(' ').map((v) => (v.endsWith('%') ? parseFloat(v) / 100 : 0.5));
          g.drawImage(el, (cw - dw) * pos[0], (ch - dh) * (pos[1] ?? 0.5), dw, dh);
          const { cm, al, hasAlpha } = rgbaToInkImage(g.getImageData(0, 0, cw, ch).data, cw, ch, ink),
            n = ink.n;
          if (flat && (hasAlpha || alpha < 0.999))
            for (let i = 0; i < al.length; i++) {
              const a = (al[i] / 255) * alpha;
              for (let k = 0; k < n; k++) cm[i * n + k] = Math.round(a * cm[i * n + k] + (1 - a) * B[k] * 255);
            }
          const dict = { Type: 'XObject', Subtype: 'Image', Width: cw, Height: ch, ColorSpace: ink.space, BitsPerComponent: 8 };
          if (hasAlpha && !flat)
            dict.SMask = pdf.context.register(
              pdf.context.flateStream(al, {
                Type: 'XObject',
                Subtype: 'Image',
                Width: cw,
                Height: ch,
                ColorSpace: 'DeviceGray',
                BitsPerComponent: 8,
              }),
            );
          ref = pdf.context.register(pdf.context.flateStream(cm, dict));
          imgCache.set(key, ref);
        }
        const name = page.node.newXObject('Img', ref),
          [x, y] = toPt(r.left - P.left, r.bottom - P.top),
          a = alphaOps(alpha);
        push(pushGraphicsState());
        if (a) push(a);
        push(concatTransformationMatrix(r.width * KX, 0, 0, r.height * KY, x, y), drawObject(name), popGraphicsState());
      };

      /* ----- HTML ----- */
      const bleedFor = (el, r) => {
        if (!m.bleed) return null;
        const isHd = el.classList.contains('hd'),
          isBand = el.classList.contains('sec-band');
        if (!isHd && !isBand) return null;
        /* vers le haut : le header, ou la 1re bande d'une page SANS header (au recto, elle touche le header : elle le recouvrirait de 3 mm) */
        const top = isHd || (el.classList.contains('sec-first') && !p.el.querySelector('.hd'));
        return { l: bleedPx, r: bleedPx, t: top ? bleedPx : 0, b: el.classList.contains('sec-last') && isBand ? bleedPx : 0 };
      };
      /* A : opacité cumulée des parents (appliquée à chaque objet, texte compris, et non en groupe) */
      const walk = (el, A = 1) => {
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') return;
        if (el instanceof SVGSVGElement) {
          drawSvg(el, A);
          return;
        }
        const r = el.getBoundingClientRect(),
          x = r.left - P.left,
          y = r.top - P.top;
        const bg = parseCss(cs.backgroundColor),
          rad = parseFloat(cs.borderTopLeftRadius) || 0,
          opacity = parseFloat(cs.opacity),
          A2 = A * (isNaN(opacity) ? 1 : opacity);
        if (A2 <= 0) return;
        if (bg && bg.a > 0 && r.width > 0 && r.height > 0) {
          const bl = bleedFor(el, r) || { l: 0, r: 0, t: 0, b: 0 },
            probe = rectHit(x, y, r.width, r.height);
          let c = resolve(bg.rgb),
            ba = bg.a * A2;
          if (flat && ba < 0.999) {
            c = mix(c, ba, backdrop(...probe.pt));
            ba = 1;
          }
          painted.push({ hit: probe.hit, c: ba >= 0.999 ? c : mix(c, ba, backdrop(...probe.pt)) });
          const a2 = alphaOps(ba);
          push(pushGraphicsState());
          if (a2) push(a2);
          setFill(c);
          emitPath(rectPath(x - bl.l, y - bl.t, r.width + bl.l + bl.r, r.height + bl.t + bl.b, rad), ID.slice(0, 4).concat([0, 0]));
          push(fill(), popGraphicsState());
        }
        const bw = ['Top', 'Right', 'Bottom', 'Left'].map((sd) => {
          const w0 = parseFloat(cs['border' + sd + 'Width']) || 0;
          return cs['border' + sd + 'Style'] === 'none' || !w0 ? 0 : w0 <= 1.01 ? STROKE.px : w0;
        });
        if (bw.some(Boolean)) {
          const side = (sd, i) => {
            const c = parseCss(cs['border' + sd + 'Color']);
            return c && c.a > 0 ? { w: bw[i], c: resolve(c.rgb), a: c.a * A2 } : null;
          };
          const edge = { pt: [x + r.width / 2, y + Math.max(bw[0], 0.5) / 2] }; // sonde d'aplatissement : sur le trait du haut
          const S = [side('Top', 0), side('Right', 1), side('Bottom', 2), side('Left', 3)];
          if (bw.every((v) => v === bw[0]) && S.every(Boolean) && S.every((s) => s.c.join() === S[0].c.join())) {
            const w = bw[0];
            paint(
              rectPath(x + w / 2, y + w / 2, r.width - w, r.height - w, Math.max(0, rad - w / 2)),
              [1, 0, 0, 1, 0, 0],
              null,
              1,
              S[0].c,
              S[0].a,
              w,
              null,
              0,
              0,
              false,
              edge,
            );
          } else {
            const seg = [
              [x, y + bw[0] / 2, x + r.width, y + bw[0] / 2],
              [x + r.width - bw[1] / 2, y, x + r.width - bw[1] / 2, y + r.height],
              [x, y + r.height - bw[2] / 2, x + r.width, y + r.height - bw[2] / 2],
              [x + bw[3] / 2, y, x + bw[3] / 2, y + r.height],
            ];
            S.forEach((s, i) => {
              if (s)
                paint(
                  [
                    ['M', seg[i][0], seg[i][1]],
                    ['L', seg[i][2], seg[i][3]],
                  ],
                  [1, 0, 0, 1, 0, 0],
                  null,
                  1,
                  s.c,
                  s.a,
                  s.w,
                  null,
                  0,
                  0,
                  false,
                  { pt: [(seg[i][0] + seg[i][2]) / 2, (seg[i][1] + seg[i][3]) / 2] },
                );
            });
          }
        }
        const clipped = cs.overflowX !== 'visible' && el !== root && el.localName !== 'html';
        const prevClip = curClip;
        if (clipped) {
          clipTo(rectPath(x, y, r.width, r.height, rad), [1, 0, 0, 1, 0, 0]);
          const c0 = curClip || { x: -1e6, y: -1e6, w: 2e6, h: 2e6 },
            x1 = Math.max(c0.x, x),
            y1 = Math.max(c0.y, y);
          curClip = {
            x: x1,
            y: y1,
            w: Math.max(0, Math.min(c0.x + c0.w, x + r.width) - x1),
            h: Math.max(0, Math.min(c0.y + c0.h, y + r.height) - y1),
          };
        }
        if (el.localName === 'img') drawImg(el, cs, null, A2);
        if (cs.display === 'list-item' && cs.listStyleType !== 'none') {
          // puce : disque devant la première ligne
          const rg = document.createRange();
          rg.selectNodeContents(el);
          const first = [...rg.getClientRects()].find((q) => q.width > 0);
          const fs = parseFloat(cs.fontSize),
            col = parseCss(cs.color);
          const bx = first ? first.left - P.left - fs * 0.62 : 0,
            by = first ? first.top - P.top + first.height * 0.52 : 0;
          if (first && col)
            paint(
              ellipsePath(bx, by, fs * 0.17, fs * 0.17),
              [1, 0, 0, 1, 0, 0],
              resolve(col.rgb),
              col.a * A2,
              null,
              1,
              0,
              null,
              0,
              0,
              false,
              { pt: [bx, by] },
            );
        }
        for (const n of el.childNodes) {
          if (n.nodeType === 3) drawText(n, el, 1, false, A2);
          else if (n.nodeType === 1) walk(n, A2);
        }
        if (!pdfx && el.localName === 'a' && /^(https?:\/\/|mailto:)/i.test(el.getAttribute('href') || '')) {
          // lien : une zone cliquable par ligne de texte
          const rg = document.createRange();
          rg.selectNodeContents(el);
          for (const q of rg.getClientRects())
            if (q.width > 0.5 && q.height > 0.5)
              links.push({ x: q.left - P.left, y: q.top - P.top, w: q.width, h: q.height, url: el.getAttribute('href') });
        }
        if (clipped) unclip();
        curClip = prevClip;
      };
      const walkText = (el, scale, isSvg, alpha) => {
        for (const n of el.childNodes) {
          if (n.nodeType === 3) drawText(n, el, scale, isSvg, alpha);
          else if (n.nodeType === 1) walkText(n, scale, isSvg, alpha);
        }
      };

      /* Le texte est dessiné après le reste de la page : l'ordre n'a pas d'importance (aucun élément ne recouvre du texte) sauf pour les SVG, où il suit. */
      walk(root);
      flush();
      await flushText();
      flush();
      for (const l of links) {
        const [x1, y1] = toPt(l.x, l.y + l.h),
          [x2, y2] = toPt(l.x + l.w, l.y);
        const ref = pdf.context.register(
          pdf.context.obj({
            Type: 'Annot',
            Subtype: 'Link',
            Rect: [x1, y1, x2, y2],
            Border: [0, 0, 0],
            A: { Type: 'Action', S: 'URI', URI: PDFString.of(l.url) },
          }),
        );
        page.node.addAnnot(ref);
      }
      /* traits de coupe : repère (toutes les encres en CMJN, noir en RVB), 0,25 pt, à 3 mm du format fini */
      if (m.marks) {
        const L = 3 * PT_PER_MM,
          gap = BLEED_MM * PT_PER_MM,
          X = [off, off + A4.w * PT_PER_MM],
          Y = [off, off + A4.h * PT_PER_MM],
          mk = [];
        mk.push(pushGraphicsState(), ink.stroke(ink.registration), setLineWidth(0.25));
        X.forEach((x, xi) =>
          Y.forEach((y, yi) => {
            const sx = xi ? 1 : -1,
              sy = yi ? 1 : -1;
            const hx = sx < 0 ? x - gap - L : x + gap;
            mk.push(moveTo(hx, y), lineTo(hx + L, y), stroke());
            const vy = sy < 0 ? y - gap - L : y + gap;
            mk.push(moveTo(x, vy), lineTo(x, vy + L), stroke());
          }),
        );
        mk.push(popGraphicsState());
        page.pushOperators(...mk);
      }
      const trimW = only ? Wp : A4.w * PT_PER_MM,
        trimH = only ? Hp : A4.h * PT_PER_MM;
      page.setTrimBox(off, off, trimW, trimH);
      page.setBleedBox(
        off - (m.bleed ? BLEED_MM * PT_PER_MM : 0),
        off - (m.bleed ? BLEED_MM * PT_PER_MM : 0),
        trimW + (m.bleed ? 2 * BLEED_MM * PT_PER_MM : 0),
        trimH + (m.bleed ? 2 * BLEED_MM * PT_PER_MM : 0),
      );
    }
    if (pdfx) await makePdfX(pdf, profile, doc.name || 'factsheet');
    const bytes = await pdf.save({ useObjectStreams: false });
    /* pdf-lib écrit toujours « %PDF-1.7 » : PDF/X-4 exige 1.6, PDF/X-1a:2003 1.4 (même longueur : les décalages de la table xref restent justes) */
    if (pdfx) bytes[7] = (profile === 'x1a' ? '4' : '6').charCodeAt(0);
    return { bytes, missing: [...missing] };
  } finally {
    stage.remove();
  }
}

/* ---------- PDF/X : version, profil de sortie, métadonnées (Info et XMP identiques), identifiant ---------- */
async function makePdfX(pdf, profile, title) {
  const x1a = profile === 'x1a',
    P = PDF_PROFILES[profile];
  const now = new Date(Math.floor(Date.now() / 1000) * 1000),
    iso = now.toISOString().replace(/\.\d+Z$/, 'Z');
  const producer = 'GSC tools — Factsheet creator (PDF CMJN)',
    creator = 'GSC tools',
    version = x1a ? 'PDF/X-1a:2003' : 'PDF/X-4';
  pdf.setTitle(title);
  pdf.setProducer(producer);
  pdf.setCreator(creator);
  pdf.setCreationDate(now);
  pdf.setModificationDate(now);
  const info = pdf.getInfoDict();
  info.set(PDFName.of('Trapped'), PDFName.of('False'));
  info.set(PDFName.of('GTS_PDFXVersion'), PDFString.of(version));
  const res = await fetch(new URL(P.icc, document.baseURI));
  if (!res.ok) throw new Error(P.icc);
  const icc = pdf.context.register(pdf.context.flateStream(new Uint8Array(await res.arrayBuffer()), { N: 4 }));
  pdf.catalog.set(
    PDFName.of('OutputIntents'),
    pdf.context.obj([
      pdf.context.obj({
        Type: 'OutputIntent',
        S: 'GTS_PDFX',
        OutputConditionIdentifier: PDFString.of(P.condition),
        OutputCondition: PDFString.of(P.conditionText),
        RegistryName: PDFString.of('http://www.color.org'),
        Info: PDFString.of(P.iccName),
        DestOutputProfile: icc,
      }),
    ]),
  );
  const hex = [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, '0')).join('');
  const uuid = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  pdf.context.trailerInfo.ID = pdf.context.obj([PDFHexString.of(hex), PDFHexString.of(hex)]);
  const xmp = `<?xpacket begin="\uFEFF" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
<rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:xmp="http://ns.adobe.com/xap/1.0/" xmlns:pdf="http://ns.adobe.com/pdf/1.3/"
 xmlns:xmpMM="http://ns.adobe.com/xap/1.0/mm/" xmlns:pdfxid="http://www.npes.org/pdfx/ns/id/" xmlns:pdfx="http://ns.adobe.com/pdfx/1.3/">
<dc:format>application/pdf</dc:format><dc:title><rdf:Alt><rdf:li xml:lang="x-default">${xmlEsc(title)}</rdf:li></rdf:Alt></dc:title>
<xmp:CreateDate>${iso}</xmp:CreateDate><xmp:ModifyDate>${iso}</xmp:ModifyDate><xmp:MetadataDate>${iso}</xmp:MetadataDate><xmp:CreatorTool>${xmlEsc(creator)}</xmp:CreatorTool>
<pdf:Producer>${xmlEsc(producer)}</pdf:Producer><pdf:Trapped>False</pdf:Trapped>
<xmpMM:DocumentID>uuid:${uuid}</xmpMM:DocumentID><xmpMM:InstanceID>uuid:${uuid}</xmpMM:InstanceID><xmpMM:RenditionClass>default</xmpMM:RenditionClass><xmpMM:VersionID>1</xmpMM:VersionID>
<pdfxid:GTS_PDFXVersion>${version}</pdfxid:GTS_PDFXVersion><pdfx:GTS_PDFXVersion>${version}</pdfx:GTS_PDFXVersion>
</rdf:Description></rdf:RDF></x:xmpmeta>
<?xpacket end="w"?>`;
  pdf.catalog.set(
    PDFName.of('Metadata'),
    pdf.context.register(pdf.context.stream(new TextEncoder().encode(xmp), { Type: 'Metadata', Subtype: 'XML' })),
  );
}

window.FSPDF = { build: buildPdf };
