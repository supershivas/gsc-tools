/* Tableau : copier-coller. Fonctions pures (le seul accès au DOM est le DOMParser, passé en paramètre dans les tests).
   Collage : `text/html` (Word, Excel, Google Sheets, pages web) lu en ne gardant que table / tr / td / th : colspan et rowspan
   deviennent des fusions, gras / italique / souligné le balisage `**` `~~` `__`, text-align l'alignement de la cellule. Tout le
   reste est ignoré (styles, classes, couleurs, balises mso / xml, scripts, images : aucune adresse n'est lue).
   Repli : `text/plain` tabulé (TSV d'Excel, de Numbers, d'InDesign) lu par `parseMatrix`.
   Grille collée = { R, C, cells: [{ r, c, rs, cs, text, ah }] } (cellules sans chevauchement ; les trous restent vides). */
import { parseMatrix } from '../dataparse.js';
import { inlineMk, stripMk } from '../viz/util.js';
import { TABLE_MAX, cellAt, mergeCells, splitCell, resizeTable } from './model.js';

const SKIP =
  /^(SCRIPT|STYLE|HEAD|TITLE|META|LINK|IMG|PICTURE|SVG|VIDEO|AUDIO|IFRAME|OBJECT|EMBED|CANVAS|TEMPLATE|NOSCRIPT|XML|BUTTON|SELECT|INPUT|TEXTAREA)$/;
const BLOCK = /^(P|DIV|LI|H[1-6]|BLOCKQUOTE|PRE|DT|DD|SECTION|ARTICLE)$/;
const ALIGN = { left: 'left', start: 'left', center: 'center', middle: 'center', right: 'right', end: 'right', justify: 'justify' };

/** Règles de classe des feuilles de style du presse-papiers (Excel met le gras et l'alignement dans `.xl65 { … }`) : seules
    font-weight, font-style, text-decoration et text-align sont retenues */
function classRules(dom) {
  const out = {};
  for (const st of dom.querySelectorAll('style')) {
    const css = String(st.textContent || '').replace(/<!--|-->|\/\*[\s\S]*?\*\//g, '');
    for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const decl = m[2].toLowerCase();
      for (const sel of m[1].split(',')) {
        const k = /^\s*(?:[a-z]+)?\.([\w-]+)\s*$/i.exec(sel);
        if (k) out[k[1]] = (out[k[1]] || '') + ';' + decl;
      }
    }
  }
  return out;
}
/** Mise en forme portée par un élément : attributs et balises, puis style en ligne, puis règles de ses classes */
function fmtOf(el, rules) {
  const tag = el.tagName,
    decl = [el.getAttribute('style') || '', ...[...el.classList].map((c) => rules[c] || '')].join(';').toLowerCase();
  const prop = (p) => {
    const m = new RegExp(`(?:^|;)\\s*${p}\\s*:\\s*([^;]+)`).exec(decl);
    return m ? m[1].trim() : '';
  };
  const f = {};
  const fw = prop('font-weight');
  if (/^(B|STRONG|TH)$/.test(tag) || fw === 'bold' || fw === 'bolder' || +fw >= 600) f.b = true;
  else if (fw === 'normal' || (+fw > 0 && +fw < 600)) f.b = false; // Google Sheets : <b style="font-weight:normal"> autour de tout
  const fs = prop('font-style');
  if (/^(I|EM)$/.test(tag) || fs === 'italic' || fs === 'oblique') f.i = true;
  else if (fs === 'normal') f.i = false;
  const td = prop('text-decoration') || prop('text-decoration-line') || prop('text-underline-style');
  if (tag === 'U' || /underline|single/.test(td)) f.u = true;
  else if (td === 'none') f.u = false;
  const al = ALIGN[(prop('text-align') || el.getAttribute('align') || '').toLowerCase().replace(/^-webkit-/, '')];
  if (al) f.ah = al;
  if (/display\s*:\s*none|mso-hide\s*:\s*all/.test(decl)) f.hide = true;
  return f;
}
const keyOf = (r) => `${!!r.b}${!!r.i}${!!r.u}`;
/** Texte d'une cellule : lignes séparées par '\n' (paragraphes et retours à la ligne), segments mis en forme */
function cellText(td, rules) {
  const lines = [];
  let cur = [],
    ah = '';
  const flush = () => {
    const runs = [];
    for (const r of cur) {
      const l = runs[runs.length - 1];
      if (l && keyOf(l) === keyOf(r)) l.t += r.t;
      else runs.push({ ...r });
    }
    const line = runs
      .map((r) => {
        let t = r.t.replace(/\s+/g, ' ');
        if (!t.trim()) return t;
        const lead = t.match(/^\s*/)[0],
          tail = t.match(/\s*$/)[0];
        t = t.trim();
        if (r.i) t = `~~${t}~~`;
        if (r.b) t = `**${t}**`;
        if (r.u) t = `__${t}__`;
        return lead + t + tail;
      })
      .join('')
      .replace(/\s+/g, ' ')
      .trim();
    if (line) lines.push(line);
    cur = [];
  };
  const walk = (n, st) => {
    if (n.nodeType === 3) {
      cur.push({ t: n.nodeValue.replace(/\u00a0/g, ' '), ...st });
      return;
    }
    if (n.nodeType !== 1) return; // commentaires (fragments conditionnels de Word), instructions
    const tag = n.tagName.toUpperCase();
    if (SKIP.test(tag) || tag.includes(':')) return; // <o:p>, <v:shape>, <w:…> : balises Office
    if (tag === 'TABLE') return; // tableau imbriqué : ignoré
    const f = fmtOf(n, rules);
    if (f.hide) return;
    if (tag === 'BR') {
      flush();
      return;
    }
    const s = { b: f.b ?? st.b, i: f.i ?? st.i, u: f.u ?? st.u };
    const block = BLOCK.test(tag);
    if (block && f.ah && !ah) ah = f.ah; // Word : l'alignement est porté par le paragraphe
    if (block && cur.length) flush();
    for (const c of n.childNodes) walk(c, s);
    if (block) flush();
  };
  const f0 = fmtOf(td, rules);
  for (const c of td.childNodes) walk(c, { b: !!f0.b, i: !!f0.i, u: !!f0.u });
  flush();
  return { text: lines.filter(Boolean).join('\n'), ah: f0.ah || ah };
}

/** HTML du presse-papiers → grille collée (null s'il n'y a pas de tableau). parse(html) → Document (DOMParser par défaut). */
export function htmlToGrid(html, parse = (s) => new DOMParser().parseFromString(s, 'text/html')) {
  if (!html || !/<t[dh][\s>]/i.test(html)) return null;
  const dom = parse(String(html));
  const table = [...dom.querySelectorAll('table')].find((tb) => !tb.parentElement || !tb.parentElement.closest('table'));
  if (!table) return null;
  const rules = classRules(dom);
  const trs = [...table.querySelectorAll('tr')].filter((tr) => tr.closest('table') === table);
  const taken = [],
    cells = [];
  const isTaken = (r, c) => taken[r] && taken[r][c];
  let C = 0;
  trs.forEach((tr, r) => {
    let c = 0;
    for (const td of tr.children) {
      if (!/^T[DH]$/.test(td.tagName)) continue;
      if (fmtOf(td, rules).hide) continue;
      while (isTaken(r, c)) c++;
      const cs = Math.max(1, Math.min(TABLE_MAX.cols, parseInt(td.getAttribute('colspan'), 10) || 1)),
        rs = Math.max(1, Math.min(TABLE_MAX.rows, parseInt(td.getAttribute('rowspan'), 10) || 1, trs.length - r));
      let w = 0;
      while (w < cs && !isTaken(r, c + w)) w++; // une fusion ne recouvre jamais une case déjà prise
      for (let y = r; y < r + rs; y++) for (let x = c; x < c + w; x++) (taken[y] = taken[y] || [])[x] = true;
      const { text, ah } = cellText(td, rules);
      const cl = { r, c, rs, cs: w, text };
      if (ah && ah !== 'left') cl.ah = ah;
      cells.push(cl);
      c += w;
      C = Math.max(C, c);
    }
  });
  const R = trs.length;
  if (!cells.length || !C) return null;
  /* lignes entièrement vides en fin de tableau (Excel en ajoute parfois) : retirées */
  let last = R;
  const blank = (y) => cells.every((cl) => (cl.r === y ? !cl.text : cl.r > y || cl.r + cl.rs <= y));
  while (last > 1 && blank(last - 1)) last--;
  const kept = cells.filter((cl) => cl.r < last).map((cl) => ({ ...cl, rs: Math.min(cl.rs, last - cl.r) }));
  return { R: last, C, cells: kept };
}

/** Matrice de textes (TSV) → grille collée */
export function matrixToGrid(m) {
  if (!m || !m.length) return null;
  const C = Math.max(...m.map((r) => r.length));
  if (!C) return null;
  const cells = [];
  m.forEach((row, r) => {
    for (let c = 0; c < C; c++) cells.push({ r, c, rs: 1, cs: 1, text: String(row[c] ?? '') });
  });
  return { R: m.length, C, cells };
}

/** Contenu du presse-papiers → grille collée : le HTML d'abord ; sinon le texte tabulé ; sinon une seule cellule (texte simple, lignes gardées) */
export function clipToGrid({ html, text }, parse) {
  const g = html ? htmlToGrid(html, parse) : null;
  if (g) return g;
  const src = String(text || '')
    .replace(/\r\n?/g, '\n')
    .replace(/\n+$/, '');
  if (!src.trim()) return null;
  if (src.includes('\t')) return matrixToGrid(parseMatrix(src));
  return { R: 1, C: 1, cells: [{ r: 0, c: 0, rs: 1, cs: 1, text: src.trim() }] };
}

/** Colle la grille dans le tableau, ancrée à la case (r0, c0) ; la grille du tableau s'agrandit dans la limite TABLE_MAX.
    Les fusions coupées par la zone collée sont scindées ; les fusions et alignements collés remplacent ceux de la zone.
    Renvoie { rows, cols } : nombre de lignes et de colonnes collées laissées de côté (au-delà du maximum). */
export function pasteGrid(tb, g, r0 = 0, c0 = 0) {
  const R = Math.min(g.R, TABLE_MAX.rows - r0),
    C = Math.min(g.C, TABLE_MAX.cols - c0),
    lost = { rows: g.R - R, cols: g.C - C };
  if (R < 1 || C < 1) return { rows: g.R, cols: g.C };
  resizeTable(tb, Math.max(tb.rows.length, r0 + R), Math.max(tb.cols.length, c0 + C));
  const r1 = r0 + R - 1,
    c1 = c0 + C - 1,
    touches = (cl) => cl.r <= r1 && cl.r + cl.rs - 1 >= r0 && cl.c <= c1 && cl.c + cl.cs - 1 >= c0;
  tb.cells.filter((cl) => touches(cl) && (cl.rs > 1 || cl.cs > 1)).forEach((cl) => splitCell(tb, cl.id));
  for (const cl of tb.cells)
    if (cl.r >= r0 && cl.r <= r1 && cl.c >= c0 && cl.c <= c1) {
      cl.text = '';
      delete cl.ah;
    }
  for (const p of g.cells) {
    if (p.r >= R || p.c >= C) continue;
    const r = r0 + p.r,
      c = c0 + p.c,
      cl = cellAt(tb, r, c);
    if (!cl) continue;
    cl.text = p.text || '';
    if (p.ah) cl.ah = p.ah;
    const rs = Math.min(p.rs || 1, R - p.r),
      cs = Math.min(p.cs || 1, C - p.c);
    if (rs > 1 || cs > 1) mergeCells(tb, r, c, r + rs - 1, c + cs - 1);
  }
  return lost;
}

/** Remplit toutes les cellules du rectangle avec le même texte (une seule valeur collée sur une sélection de plusieurs cellules) */
export function fillRect(tb, rect, text) {
  for (const cl of tb.cells) if (cl.r >= rect.r0 && cl.r <= rect.r1 && cl.c >= rect.c0 && cl.c <= rect.c1) cl.text = text;
}

/* ---------- Copier ---------- */
/** Cellules du rectangle (fusions rognées au rectangle), dans l'ordre de lecture */
function rectCells(tb, { r0, c0, r1, c1 }) {
  return tb.cells
    .filter((cl) => cl.r >= r0 && cl.r <= r1 && cl.c >= c0 && cl.c <= c1)
    .sort((a, b) => a.r - b.r || a.c - b.c)
    .map((cl) => ({ cl, rs: Math.min(cl.rs, r1 - cl.r + 1), cs: Math.min(cl.cs, c1 - cl.c + 1) }));
}
/** Sélection → texte tabulé (Excel : une cellule de plusieurs lignes est entre guillemets) */
export function rectToTsv(tb, rect) {
  const out = [];
  for (let r = rect.r0; r <= rect.r1; r++) {
    const row = [];
    for (let c = rect.c0; c <= rect.c1; c++) {
      const cl = cellAt(tb, r, c),
        v = cl && cl.r === r && cl.c === c ? stripMk(cl.text || '').replace(/\u2028/g, '\n') : '';
      row.push(/[\t\n"]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
    }
    out.push(row.join('\t'));
  }
  return out.join('\n');
}
/** Sélection → HTML (table / tr / td avec colspan, rowspan, alignement et gras / italique / souligné) */
export function rectToHtml(tb, rect) {
  const cells = rectCells(tb, rect),
    rows = [];
  for (let r = rect.r0; r <= rect.r1; r++) {
    const tds = cells
      .filter((x) => x.cl.r === r)
      .map(({ cl, rs, cs }) => {
        const attrs =
          (cs > 1 ? ` colspan="${cs}"` : '') +
          (rs > 1 ? ` rowspan="${rs}"` : '') +
          (cl.ah && cl.ah !== 'left' ? ` style="text-align:${cl.ah}"` : '');
        const body = String(cl.text || '')
          .split('\n')
          .map((l) => inlineMk(stripInlineColor(l), false).replace(/<span[^>]*>|<\/span>|<a [^>]*>|<\/a>/g, ''))
          .join('<br>');
        return `<td${attrs}>${body}</td>`;
      });
    rows.push(`<tr>${tds.join('')}</tr>`);
  }
  return `<table>${rows.join('')}</table>`;
}
/* couleurs, surlignage, liens : retirés (ce sont des clés du document, sans valeur hors de lui) */
const stripInlineColor = (t) => {
  let x = String(t);
  for (let i = 0; i < 5; i++) {
    const y = x.replace(/\{(?:c|h|a):[^|{}]*\|([^{}]*)\}/g, '$1').replace(/\{(?:s|sc|up|n)\|([^{}]*)\}/g, '$1');
    if (y === x) break;
    x = y;
  }
  return x;
};
