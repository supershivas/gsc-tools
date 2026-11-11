/* Utilitaires partagés par les dataviz (SVG, mesure de texte, couleurs, nombres). */
import { FONT, TYPE, STROKE, VIZ } from '../tokens.js';

const NS = 'http://www.w3.org/2000/svg';
export function s(tag, attrs = {}, ...kids) {
  const e = document.createElementNS(NS, tag);
  if (tag === 'svg') e.setAttribute('fill', 'currentColor'); // texte et formes héritent de la couleur du thème
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
    else e.setAttribute(k, v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) e.append(typeof c === 'string' ? document.createTextNode(c) : c);
  return e;
}
export function el(tag, props = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
    else if (k in e) e[k] = v;
    else e.setAttribute(k, v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) e.append(c);
  return e;
}

export const pxOf = (pt) => (pt * 96) / 72;
export const SW = STROKE.px; // épaisseur de trait : 0,5 pt
export const colorRef = (c) => (/^(#|rgb|var\()/.test(c || '') ? c : `var(--c-${c || 'blue'})`);
export const round3 = (n) => Math.round(n / 3) * 3; // reste sur la grille de 3 px

/* ---------- Mesure ---------- */
const mctx = document.createElement('canvas').getContext('2d');
const REF = 200;
export function mw(text, weight, family, sizePx) {
  /* taille de référence fixe : certains navigateurs plafonnent la taille de police du canvas (~2000 px), ce qui sous-mesurait les grands textes (ex. 32 px × 100) */
  mctx.font = `${weight} ${REF}px ${family}`;
  return (mctx.measureText(text).width * sizePx) / REF;
}
export const SANS = FONT.sans,
  SERIF = FONT.serif;

/* ---------- Tenir dans la place disponible : réduction ponctuelle de la taille, puis ellipse en dernier recours ---------- */
export function fitSize(text, weight, family, size, maxW, minK = 0.6) {
  const w = mw(text, weight, family, size);
  return !w || w <= maxW ? size : Math.max(size * minK, ((size * maxW) / w) * 0.98);
}
export function ellipsize(text, weight, family, size, maxW) {
  if (mw(text, weight, family, size) <= maxW + 0.5) return text;
  let t = String(text);
  while (t.length > 1 && mw(t + '…', weight, family, size) > maxW) t = t.slice(0, -1);
  return t + '…';
}
/** { size, text } : texte d'une ligne qui ne dépasse jamais maxW */
export function fitText(text, weight, family, size, maxW, minK = 0.6) {
  const sz = fitSize(text, weight, family, size, maxW, minK);
  return { size: sz, text: ellipsize(text, weight, family, sz, maxW) };
}

/* ---------- Texte riche (**gras**) ---------- */
function paragraphs(text) {
  const paras = [[]];
  let cur = [];
  const flush = () => {
    if (cur.length) {
      paras[paras.length - 1].push(cur);
      cur = [];
    }
  };
  let b = false,
    i = false,
    u = false;
  String(text || '')
    .replace(/\r\n?/g, '\n')
    .split(/(\*\*|__|~~)/)
    .forEach((seg) => {
      if (seg === '**') {
        b = !b;
        return;
      }
      if (seg === '__') {
        u = !u;
        return;
      }
      if (seg === '~~') {
        i = !i;
        return;
      }
      for (const part of seg.match(/\n|[^\S\n]+|\S+/g) || []) {
        if (part === '\n') {
          flush();
          paras.push([]);
        } else if (/^\s+$/.test(part)) flush();
        else cur.push({ t: part, b, i, u });
      }
    });
  flush();
  return paras;
}
export const runsW = (runs, size) => runs.reduce((a, r) => a + mw(r.t, r.b ? 700 : 400, SANS, size), 0);

/** Coupe un mot plus large que maxW en morceaux qui tiennent */
function splitWord(runs, size, maxW) {
  const out = [];
  let cur = [],
    cw = 0;
  for (const r of runs)
    for (const ch of r.t) {
      const c = mw(ch, r.b ? 700 : 400, SANS, size);
      if (cur.length && cw + c > maxW) {
        out.push(cur);
        cur = [];
        cw = 0;
      }
      const l = cur[cur.length - 1];
      if (l && l.b === r.b && l.i === r.i && l.u === r.u) l.t += ch;
      else cur.push({ ...r, t: ch });
      cw += c;
    }
  if (cur.length) out.push(cur);
  return out;
}

/** Retourne des lignes [{runs:[{t,b}], head}] : titre en gras puis texte, césure sur maxW */
export function textLines(title, text, size, maxW) {
  const out = [],
    sp = mw(' ', 400, SANS, size);
  const add = (src, head) => {
    for (const words of paragraphs(src)) {
      if (!words.length) continue;
      let cur = [],
        cw = 0;
      for (let w of words.flatMap((x) => (maxW > 0 && runsW(x, size) > maxW ? splitWord(x, size, maxW) : [x]))) {
        const w1 = runsW(w, size);
        if (!cur.length) {
          cur = [...w];
          cw = w1;
        } else if (cw + sp + w1 <= maxW) {
          cur.push({ t: ' ', b: false }, ...w);
          cw += sp + w1;
        } else {
          out.push({ runs: cur, head });
          cur = [...w];
          cw = w1;
        }
      }
      out.push({ runs: cur, head });
    }
  };
  if (title && title.trim()) add('**' + title.replace(/\*\*|__|~~|\^\^|,,/g, '') + '**', true);
  if (text && text.trim()) add(text, false);
  return out;
}

/** <g> de lignes : x, haut y0, interligne lh. align: start | middle | end */
export function drawLines(lines, x, y0, lh, size, align = 'start') {
  const g = s('g', { 'font-size': size });
  lines.forEach((l, i) => {
    const t = s('text', { x, y: y0 + i * lh + lh / 2 + 0.33 * size, 'text-anchor': align, style: { whiteSpace: 'pre' } });
    for (const r of l.runs)
      t.append(
        s(
          'tspan',
          { 'font-weight': r.b ? 700 : 400, 'font-style': r.i ? 'italic' : null, 'text-decoration': r.u ? 'underline' : null },
          r.t,
        ),
      );
    g.append(t);
  });
  return g;
}

/* ---------- Nombres ---------- */
export function fmt(v, locale, decimals) {
  const d = Math.max(0, Math.min(6, Math.round(+decimals || 0)));
  try {
    return new Intl.NumberFormat(locale || 'en-GB', { minimumFractionDigits: d, maximumFractionDigits: d }).format(v);
  } catch (e) {
    return String(v);
  }
}
export const typePx = (k) => ({ size: pxOf(TYPE[k].size), lh: TYPE[k].lh, weight: TYPE[k].weight });

/** Légende commune (pastille arrondie 0,5 pt + libellé), posée à la hauteur y.
    `line` = { dashOf(série) → tirets ou null, w } : légende de courbes avec au moins une série en tirets, la pastille devient un trait (même tirets, même épaisseur)
    traversé d'un point de la couleur de la série, comme dans le graphique */
export function drawLegend(svg, series, y, W = Infinity, line = null, scale = null) {
  if (scale) return drawClassBar(svg, y, W, scale);
  const base = pxOf(TYPE.caption.size),
    swW = line ? VIZ.legendSwatch * 2.4 : VIZ.legendSwatch,
    fixed = swW + VIZ.barGap * 2,
    gap = VIZ.legendH * 1.2;
  const names = series.map((sr) => sr.name || '');
  const need = (size) =>
    names.reduce((a, t) => a + fixed + mw(t, TYPE.caption.weight, SANS, size), 0) + gap * Math.max(0, names.length - 1);
  let capPx = base;
  if (need(base) > W)
    capPx = Math.max(
      base * 0.7,
      (base * (W - names.length * fixed - gap * (names.length - 1))) / (need(base) - names.length * fixed - gap * (names.length - 1)),
    );
  const room = names.length ? Math.max(20, (W - gap * (names.length - 1)) / names.length - fixed) : 0;
  const g = s('g', { class: 'lg', 'data-y': y, 'data-reserve': VIZ.legendH + VIZ.legendGap }); // groupe repéré : « légende en haut » le déplace (viz/index.js)
  let x = 0;
  series.forEach((sr, i) => {
    if (line) {
      const cy = y + VIZ.legendH / 2,
        dash = line.dashOf(sr);
      g.append(
        s('line', {
          x1: x,
          y1: cy,
          x2: x + swW,
          y2: cy,
          stroke: 'currentColor',
          'stroke-width': line.w,
          'stroke-dasharray': dash || null,
        }),
        s('circle', {
          cx: x + swW / 2,
          cy,
          r: VIZ.legendSwatch / 2 - SW / 2,
          fill: colorRef(sr.color),
          stroke: 'currentColor',
          'stroke-width': SW,
        }),
      );
    } else
      g.append(
        s('rect', {
          x: x + SW / 2,
          y: y + (VIZ.legendH - VIZ.legendSwatch) / 2 + SW / 2,
          width: VIZ.legendSwatch - SW,
          height: VIZ.legendSwatch - SW,
          rx: VIZ.barRadius,
          fill: colorRef(sr.color),
          stroke: 'currentColor',
          'stroke-width': SW,
        }),
      );
    const lx = x + fixed,
      t = need(base) > W ? ellipsize(names[i], TYPE.caption.weight, SANS, capPx, room) : names[i];
    g.append(s('text', { x: lx, y: y + VIZ.legendH / 2 + 0.33 * capPx, 'font-size': capPx, 'font-weight': TYPE.caption.weight }, t));
    x = lx + mw(t, TYPE.caption.weight, SANS, capPx) + gap;
  });
  svg.append(g);
}

/* ---------- Légende en « barre de classes » (heatmap) ----------
   `scale` = { cells: [{ color, alpha, path? }], labels: [texte × (cells + 1)] (aux limites des classes), note?: texte }.
   Une rangée de cases jointives, les libellés sous les limites de classe — ou aux deux extrémités seulement si la place manque —, puis la note. */
function classBarLayout(W, scale) {
  const base = pxOf(TYPE.caption.size),
    px = base * 0.9,
    n = scale.cells.length,
    barW = Math.max(30, Math.min(W, n * 40)),
    cw = barW / n,
    barH = VIZ.legendSwatch,
    lh = px * 1.25;
  const lab = scale.labels.map((t) => String(t ?? ''));
  const wide = lab.map((t) => mw(t, TYPE.caption.weight, SANS, px));
  const span = (i) => (i === 0 ? [0, wide[0]] : i === n ? [barW - wide[n], barW] : [i * cw - wide[i] / 2, i * cw + wide[i] / 2]);
  let all = true;
  for (let i = 0; i < n; i++) if (span(i)[1] + 8 > span(i + 1)[0]) all = false;
  const shown = all ? lab.map((_, i) => i) : [0, n];
  let note = [];
  const nt = String(scale.note || '').trim();
  if (nt) {
    let cur = '';
    for (const word of nt.split(/\s+/)) {
      const tryLine = cur ? cur + ' ' + word : word;
      if (cur && mw(tryLine, 400, SANS, px) > W) {
        note.push(cur);
        cur = word;
      } else cur = tryLine;
    }
    if (cur) note.push(cur);
  }
  const h = barH + 3 + lh + (note.length ? 4 + note.length * lh : 0);
  return { px, n, barW, cw, barH, lh, lab, shown, note, h };
}
/** Hauteur de la légende en barre de classes (note comprise), pour réserver la place avant de dessiner le reste */
export const classBarHeight = (W, scale) => classBarLayout(W, scale).h;
function drawClassBar(svg, y, W, scale) {
  const L = classBarLayout(W, scale),
    g = s('g', { class: 'lg', 'data-y': y, 'data-reserve': L.h + VIZ.legendGap });
  scale.cells.forEach((c, i) => {
    const d = `M${i * L.cw},${y}h${L.cw}v${L.barH}h${-L.cw}Z`;
    g.append(s('path', { d, fill: '#FFFFFF' })); // case opaque : la teinte ne se mélange pas au fond de la section
    g.append(
      s('path', {
        d,
        fill: colorRef(c.color),
        'fill-opacity': c.alpha < 1 ? +c.alpha.toFixed(3) : null,
        'data-color': c.path || null,
      }),
    );
  });
  g.append(
    s('rect', {
      x: SW / 2,
      y: y + SW / 2,
      width: L.barW - SW,
      height: L.barH - SW,
      rx: VIZ.barRadius,
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': SW,
    }),
  );
  const ty = y + L.barH + 3 + L.px;
  L.shown.forEach((i) => {
    const first = i === 0,
      last = i === L.n,
      f = fitText(L.lab[i], TYPE.caption.weight, SANS, L.px, L.shown.length === 2 ? L.barW / 2 - 4 : L.cw - 4, 0.6);
    g.append(
      s(
        'text',
        {
          x: first ? 0 : last ? L.barW : i * L.cw,
          y: ty - L.px * 0.2,
          'text-anchor': first ? 'start' : last ? 'end' : 'middle',
          'font-size': f.size,
          'font-weight': TYPE.caption.weight,
        },
        f.text,
      ),
    );
  });
  const ny = y + L.barH + 3 + L.lh + 4;
  L.note.forEach((line, k) => {
    const f = fitText(line, 400, SANS, L.px, W, 0.6);
    g.append(s('text', { x: 0, y: ny + k * L.lh + L.px, 'font-size': f.size, 'font-weight': 400 }, f.text));
  });
  svg.append(g);
}
export const numVal = (r, j) => Math.max(0, +(r.v || [])[j] || 0);

/* ---------- Couleurs automatiques, lisibilité, hauteur ---------- */
/** Ordre des couleurs quand rien n'est choisi (clés de palette) */
export const CYCLE = ['blue', 'sky', 'yellow', 'slate', 'grey'];
export const autoColor = (c, i) => c || CYCLE[i % CYCLE.length];
const lum = (hex) => {
  const n = parseInt(String(hex).replace('#', ''), 16);
  if (isNaN(n)) return 1;
  const f = (v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f((n >> 16) & 255) + 0.7152 * f((n >> 8) & 255) + 0.0722 * f(n & 255);
};
/** couleur de texte lisible sur le fond `key` (blanc sur fond sombre, sinon la couleur du texte) ; `alpha` = opacité du fond sur du blanc */
export function inkOn(env, key, alpha = 1) {
  const hex = key === 'white' ? '#FFFFFF' : (env && env.pal && env.pal[String(key).replace(/^tint-/, '')]) || null;
  if (!hex) return 'currentColor';
  const l = lum(hex),
    mixed = 1 - alpha + alpha * l;
  return mixed < 0.45 ? '#FFFFFF' : 'currentColor';
}
/** hauteur d'une dataviz : modes auto | ratio | fixed | fill (voir « Hauteur » de l'éditeur). `auto` = hauteur naturelle du type. */
export function heightOf(o, W, env, auto, ratioDef = '16:9') {
  const mode = o.hmode || 'ratio',
    ratio = VIZ.ratios[o.ratio || ratioDef] || 0.5625;
  const clamp = (v) => Math.max(o.hmin || 90, Math.min(o.hmax || 900, v));
  let H;
  if (mode === 'auto' && auto != null) H = auto;
  else if (mode === 'fixed') H = +o.hfixed || round3(W * ratio);
  else if ((mode === 'fill' || mode === 'match') && env && env.fillH) H = clamp(env.fillH);
  else H = W * ratio;
  return Math.max(90, mode === 'fill' || mode === 'match' ? Math.floor(H / 3) * 3 : round3(H)); // « remplir » arrondit vers le bas : jamais de débordement
}

/* ---------- Légende qui passe à la ligne ---------- */
export function layoutLegend(items, W) {
  const capPx = pxOf(TYPE.caption.size),
    fixed = VIZ.legendSwatch + VIZ.barGap * 2,
    gap = VIZ.legendH * 1.2,
    lines = [[]];
  let x = 0;
  for (const it of items) {
    const name = ellipsize(it.name || '', TYPE.caption.weight, SANS, capPx, Math.max(30, W - fixed)),
      w = fixed + mw(name, TYPE.caption.weight, SANS, capPx);
    if (x > 0 && x + w > W) {
      lines.push([]);
      x = 0;
    }
    lines[lines.length - 1].push({ color: it.color, name, x, w });
    x += w + gap;
  }
  return { lines, h: lines.length * VIZ.legendH + (lines.length - 1) * 3, capPx, fixed };
}
export function drawLegendWrap(svg, L, y) {
  const g = s('g', { class: 'lg', 'data-y': y, 'data-reserve': L.lines.length * (VIZ.legendH + 3) + VIZ.legendGap });
  L.lines.forEach((line, i) =>
    line.forEach((e) => {
      const yy = y + i * (VIZ.legendH + 3);
      g.append(
        s('rect', {
          x: e.x + SW / 2,
          y: yy + (VIZ.legendH - VIZ.legendSwatch) / 2 + SW / 2,
          width: VIZ.legendSwatch - SW,
          height: VIZ.legendSwatch - SW,
          rx: VIZ.barRadius,
          fill: colorRef(e.color),
          stroke: 'currentColor',
          'stroke-width': SW,
        }),
      );
      g.append(
        s(
          'text',
          { x: e.x + L.fixed, y: yy + VIZ.legendH / 2 + 0.33 * L.capPx, 'font-size': L.capPx, 'font-weight': TYPE.caption.weight },
          e.name,
        ),
      );
    }),
  );
  svg.append(g);
}

/* Les mesures de texte (canvas) ne déclenchent pas le chargement des polices : sans cela, un premier rendu mesure avec une police de secours plus étroite
   et le texte déborde une fois la vraie police chargée. À attendre avant tout rendu qui mesure. */
const FONT_SPECS = [
  '200 16px "Source Sans 3"',
  '400 16px "Source Sans 3"',
  '600 16px "Source Sans 3"',
  '700 16px "Source Sans 3"',
  'italic 400 16px "Source Sans 3"',
  'italic 700 16px "Source Sans 3"',
  '400 16px "Source Serif 4"',
  '600 16px "Source Serif 4"',
  '700 16px "Source Serif 4"',
  'italic 400 16px "Source Serif 4"',
  'italic 700 16px "Source Serif 4"',
];
let fontsLoaded = null;
export const loadFonts = () =>
  fontsLoaded ||
  (fontsLoaded =
    document.fonts && document.fonts.load
      ? Promise.all(FONT_SPECS.map((f) => document.fonts.load(f, 'AaÉé€0123 ').catch(() => {}))).then(() => document.fonts.ready)
      : Promise.resolve());

/** Rectangle invisible posé sur un élément réordonnable (éditeur seulement : `env.ui`) — voir vizreorder.js */
export function reorderHit(env, key, i, axis, x, y, w, h) {
  if (!env || !env.ui) return null;
  return s('rect', {
    x,
    y,
    width: Math.max(1, w),
    height: Math.max(1, h),
    fill: 'rgba(0,0,0,0)',
    'data-reorder': `${key}:${i}`,
    'data-axis': axis,
    style: { cursor: 'grab' },
  });
}

/* Typographie automatique (réglages du document : `typoOf(doc)`, transmis par le contexte de rendu `rc.typo`) :
   fr = espaces insécables avant ; : ! ? % € et dans les guillemets « » ; ord = 1er, 2e en exposant et ½ ¼ ¾ */
export const typoOf = (doc) => Object.freeze({ fr: !!(doc && doc.frTypo), ord: !!(doc && doc.ordinals) });
const typo = (t, o) => {
  if (o && o.fr)
    t = t
      .replace(/([^\s;!?:])[ \u00A0\u202F]*([;!?])(?=\s|$|[»)\]*_~])/g, '$1\u202F$2')
      .replace(/([^\s;!?:/])[ \u00A0\u202F]*:(?=\s|$)/g, '$1\u00A0:')
      .replace(/«[ \u00A0\u202F]*/g, '«\u00A0')
      .replace(/[ \u00A0\u202F]*»/g, '\u00A0»')
      .replace(/(\d)[ \u00A0\u202F]*([%€])/g, '$1\u00A0$2');
  if (o && o.ord)
    t = t
      .replace(/\b(\d+)(er|re|e|ers|res|es)(?=[\s.,;:)\u00A0\u202F*_~]|$)/g, '$1^^$2^^')
      .replace(/(?<![\d/.])([13])\/([24])(?![\d/])/g, (m, a, b) => ({ '1/2': '½', '1/4': '¼', '3/4': '¾' })[m] || m);
  return t;
};
const SAFE_URL = /^(https?:\/\/|mailto:)/i;
/** Balisage léger → HTML sûr : **gras**, ~~italique~~, __souligné__, ^^exposant^^, ,,indice,, et les accolades {c:clé|couleur} {h:clé|surlignage}
    {s|barré} {up|capitales} {sc|petites capitales} {a:adresse|lien}. `edit` : version pour le champ de saisie (liens inactifs) ;
    `ty` : typographie automatique du document (`rc.typo` ou `typoOf(doc)`), absente = aucune. */
export const inlineMk = (t, edit, ty) => {
  let x = typo(String(t ?? ''), ty)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  for (let i = 0; i < 5; i++) {
    // du plus intérieur au plus extérieur : les accolades se combinent
    const y = x
      .replace(/\{c:([\w-]+)\|([^{}]*)\}/g, '<span data-f="c:$1" style="color:var(--c-$1)">$2</span>')
      .replace(/\{h:([\w-]+)\|([^{}]*)\}/g, '<span data-f="h:$1" style="background:var(--c-$1)">$2</span>')
      .replace(/\{s\|([^{}]*)\}/g, '<s>$1</s>')
      .replace(/\{up\|([^{}]*)\}/g, '<span data-f="up" style="text-transform:uppercase">$1</span>')
      .replace(/\{sc\|([^{}]*)\}/g, '<span data-f="sc" style="font-variant-caps:small-caps">$1</span>')
      .replace(/\{a:([^|{}]*)\|([^{}]*)\}/g, (m, url, txt) => {
        const u = url.replace(/&amp;/g, '&');
        return SAFE_URL.test(u)
          ? `<${edit ? 'span' : 'a href="' + url.replace(/"/g, '&quot;') + '"'} class="lnk" data-f="a:${url.replace(/"/g, '&quot;')}">${txt}</${edit ? 'span' : 'a'}>`
          : txt;
      });
    if (y === x) break;
    x = y;
  }
  return x
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/__(.+?)__/g, '<u>$1</u>')
    .replace(/~~(.+?)~~/g, '<i>$1</i>')
    .replace(/\^\^(.+?)\^\^/g, '<sup>$1</sup>')
    .replace(/,,(.+?),,/g, '<sub>$1</sub>')
    .replace(/\u2028/g, '<br>');
};
/** Le texte sans accolades de mise en forme (les notes {n|…} disparaissent) */
export const stripInline = (t) => {
  let x = String(t ?? '').replace(/\{n\|[^{}]*\}/g, '');
  for (let i = 0; i < 5; i++) {
    const y = x.replace(/\{(?:c|h|a):[^|{}]*\|([^{}]*)\}/g, '$1').replace(/\{(?:s|sc|up)\|([^{}]*)\}/g, '$1');
    if (y === x) break;
    x = y;
  }
  return x;
};
/** Le même texte sans balisage (mesures, libellés de la structure) */
export const stripMk = (t) =>
  stripInline(String(t ?? ''))
    .replace(/\u2028/g, ' ')
    .replace(/\*\*|__|~~|\^\^|,,/g, '');

/** Couleur d'un élément d'une dataviz à séries : la surcharge de la ligne (`rows[i].colors[j]`, pour mettre un élément en valeur) sinon la couleur de la série */
export const elColor = (r, j, sr) => (r && r.colors && r.colors[j]) || (sr && sr.color);

/* ---------- Axes et grille (carte « Axes et grille ») ---------- */
/** Graduations « rondes » (pas de 1, 2 ou 5 × 10ⁿ) entre lo et hi, environ n intervalles réguliers */
export function ticks(lo, hi, n = 5) {
  if (!(hi > lo)) hi = lo + 1;
  const raw = (hi - lo) / n,
    p = 10 ** Math.floor(Math.log10(raw)),
    f = raw / p,
    step = (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * p;
  const a = Math.ceil(lo / step - 1e-9) * step,
    out = [];
  for (let v = a; v <= hi + step * 1e-6; v += step) out.push(+v.toFixed(10));
  return { out, step, lo: Math.min(lo, out[0] ?? lo), hi: Math.max(hi, out[out.length - 1] ?? hi) };
}
/** Valeur d'une graduation : au moins les décimales demandées, plus celles qu'exige le pas (0,5 → 1 décimale) */
export const tickFmt = (v, tk, locale, decimals) =>
  fmt(v, locale, Math.max(+decimals || 0, tk.step < 1 ? Math.min(3, Math.ceil(-Math.log10(tk.step))) : 0));
/** Grille affichée : interrupteur (barres, courbes) ou sens (nuage : none | h | v | both) */
export const gridOn = (o) => o.grid === true || (typeof o.grid === 'string' && o.grid !== 'none');
/** Nombre d'intervalles voulu : `gridCount` (« 0 » = automatique → `auto`) */
export const gridN = (o, auto) => +o.gridCount || auto;
/** Maximum de l'échelle : `scaleMax` s'il est posé (jamais sous le maximum des données, pour ne rien couper), sinon celui des données */
export const scaleTop = (o, dataMax) => (+o.scaleMax > 0 ? Math.max(+o.scaleMax, dataMax) : dataMax);
/* ---------- Repère (ligne de référence : objectif, moyenne…) ---------- */
/** Valeur d'un repère (interrupteur + nombre) : `null` si éteint ou si le nombre n'est pas valide */
export const refVal = (o, on = 'refLine', v = 'refValue') => {
  const x = parseFloat(o[v]);
  return o[on] && isFinite(x) ? x : null;
};
/** Texte du repère (une ligne, sans mise en forme) ; vide si le repère est éteint */
export const refTxt = (o, on = 'refLine', tx = 'refText') =>
  o[on]
    ? String(o[tx] || '')
        .replace(/\s+/g, ' ')
        .trim()
    : '';
/** Largeur réservée à droite pour le texte d'un repère horizontal (le texte est posé après le bout de la ligne : il ne touche ni barres ni valeurs) */
export const refRoom = (text, capPx, W) => (text ? Math.ceil(Math.min(W * 0.3, mw(text, 400, SANS, capPx)) + 8) : 0);
export const REF_DASH = '5 3';
const refLook = { stroke: 'currentColor', 'stroke-width': SW * 2, 'stroke-dasharray': REF_DASH, class: 'viz-ref' };
/** Repère horizontal (tirets, encre du document) de x1 à x2 ; le texte suit le bout de la ligne, centré sur elle */
export function refH(svg, y, x1, x2, text, capPx, room) {
  svg.append(s('line', { x1, y1: y, x2, y2: y, ...refLook }));
  if (text && room > 8)
    svg.append(
      s(
        'text',
        { x: x2 + 5, y: y + 0.33 * capPx, 'font-size': capPx, class: 'viz-ref-t' },
        fitText(text, 400, SANS, capPx, room - 6, 0.7).text,
      ),
    );
}
/** Repère vertical de y1 à y2 ; le texte est posé juste au-dessus de la ligne, centré (rabattu pour rester dans [0, W]) */
export function refV(svg, x, y1, y2, text, capPx, W) {
  svg.append(s('line', { x1: x, y1, x2: x, y2, ...refLook }));
  if (!text) return;
  const f = fitText(text, 400, SANS, capPx, W * 0.5, 0.7),
    w = mw(f.text, 400, SANS, f.size),
    anchor = x + w / 2 > W ? 'end' : x - w / 2 < 0 ? 'start' : 'middle';
  svg.append(
    s(
      'text',
      {
        x: anchor === 'end' ? W : anchor === 'start' ? 0 : x,
        y: Math.min(y1, y2) - 4,
        'text-anchor': anchor,
        'font-size': f.size,
        class: 'viz-ref-t',
      },
      f.text,
    ),
  );
}
/** Intensité de la grille : opacité de l'encre du texte (la couleur reste celle du thème, passée par makeInk à l'export) */
export const GRID_TONE = { light: 0.3, normal: 0.55, strong: 1 };
export const GRID_DASH = { solid: null, dashed: '4 3', dotted: '1 3' };
/** Ligne de grille : vrai <line> SVG, tirets par stroke-dasharray (lus par l'export PDF) */
export const gridLine = (o, x1, y1, x2, y2) =>
  s('line', {
    x1,
    y1,
    x2,
    y2,
    stroke: 'currentColor',
    'stroke-width': SW,
    'stroke-dasharray': GRID_DASH[o.gridStyle] ?? null,
    opacity: GRID_TONE[o.gridTone] ?? GRID_TONE.light,
  });

/** Contour des formes pleines (bulles, treemap, sunburst, barres, anneau) : trait d'encre de 0,5 pt × cran ; sans clé, le trait d'avant (cran « thin ») */
export const STROKE_K = { none: 0, thin: 1, medium: 2, thick: 3 };
export const strokeAttrs = (k) => (k ? { stroke: 'currentColor', 'stroke-width': SW * k } : { stroke: 'none' });
export const lineAttrs = (o) => strokeAttrs(STROKE_K[o.lineWidth] ?? 1);
export const LINE_FIELD = {
  k: 'lineWidth',
  g: 'dims',
  t: 'select',
  label: 'Contour',
  options: { none: 'Aucun', thin: 'Fin', medium: 'Moyen', thick: 'Épais' },
  def: 'thin',
};
