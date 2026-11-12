/* Tableau : modèle pur (aucun DOM). Une grille de lignes et de colonnes, des cellules qui couvrent un rectangle (fusion = une seule
   entrée avec `rs` × `cs`), des traits décrits par arête. Invariant : chaque case (r, c) est couverte par exactement une cellule.
   Toute opération (insérer, supprimer, fusionner, scinder, redimensionner) le préserve ; `repairTable` le rétablit à l'ouverture.

   col.table = {
     v: 1,
     cols:  [{ id, w, fill, num }],         w = poids relatif (fr) ; fill = fond de la colonne (clé de couleur) ; num = colonne numérique (chiffres tabulaires, à droite)
     rows:  [{ id, h, kind, fill }],        h = hauteur mini en px (0 = selon le contenu) ; kind : 'head' | 'body' | 'foot' (pied, en bas) ; fill = fond de la ligne
     cells: [{ id, r, c, rs, cs, text, st, ah, av, pad, fill, fg }],   st = style de paragraphe (CELL_STYLES) ; pad = marges intérieures (clé de PADS)
     edges: { 'h:i:j': trait, 'v:i:j': trait },   surcharges d'arêtes (creuses) ; un trait de largeur 0 = aucun trait
     look:  { preset, top, bottom, sides, innerH, innerV, head, foot, headFill, headFg, footFill, stripe },
   }
   Arête horizontale 'h:i:j' = limite de lignes i (0 … R), sur la colonne j ; arête verticale 'v:i:j' = limite de colonnes j (0 … C), sur la ligne i.
   Trait = { w (pt), color (clé de couleur), dash: [tiret, espace] (pt) | null } ; null = pas de trait.
   Priorité des fonds (comme InDesign) : cellule > ligne > colonne > alternance > en-tête du tableau. */
import { t } from '../i18n.js';

export const TABLE_V = 1;
export const TABLE_MAX = { rows: 40, cols: 12 };
export const HEAD_MAX = 2;
export const FOOT_MAX = 2;
const STROKE_KEYS = ['top', 'bottom', 'sides', 'innerH', 'innerV', 'head', 'foot'];

let _n = 0;
const tid = (p) => `${p}${Date.now().toString(36)}${(_n++).toString(36)}`;
const clampInt = (v, lo, hi, def) => {
  const n = Math.round(+v);
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : def;
};
const isKey = (v) => typeof v === 'string' && /^[a-z][\w-]*$/i.test(v);

export const stroke = (w, color = 'text', dash = null) => ({ w, color, dash });
export const newCell = (r, c, text = '') => ({ id: tid('tc'), r, c, rs: 1, cs: 1, text });

/** Préréglages appliqués une fois (ils remplacent l'habillage, pas le contenu). `label` = clé de traduction. */
export const TABLE_PRESETS = {
  rules: {
    label: 'Filets horizontaux',
    look: { top: stroke(0.5), bottom: stroke(0.5), head: stroke(0.5), innerH: stroke(0.25) },
  },
  zebra: { label: 'Zébré', look: { head: stroke(0.5), stripe: 'tint-blue' } },
  headfill: {
    label: 'En-tête coloré',
    look: { headFill: 'blue', headFg: 'white', innerH: stroke(0.25, 'tint-blue'), bottom: stroke(0.5, 'blue') },
  },
  grid: {
    label: 'Grille',
    look: { top: stroke(0.5), bottom: stroke(0.5), sides: stroke(0.5), head: stroke(0.5), innerH: stroke(0.25), innerV: stroke(0.25) },
  },
  headzebra: {
    label: 'En-tête coloré et zébré',
    look: { headFill: 'blue', headFg: 'white', stripe: 'tint-blue', bottom: stroke(0.5, 'blue') },
  },
  hairline: {
    label: 'Filets fins',
    look: { top: stroke(0.25), bottom: stroke(0.25), head: stroke(0.25), innerH: stroke(0.25, 'tint-blue') },
  },
  footer: {
    label: 'Avec pied',
    foot: 1,
    look: { top: stroke(0.5), bottom: stroke(0.5), head: stroke(0.5), foot: stroke(1), innerH: stroke(0.25), footFill: 'tint-blue' },
  },
  none: { label: 'Aucun', look: {} },
};
const BARE_LOOK = () => ({
  top: null,
  bottom: null,
  sides: null,
  innerH: null,
  innerV: null,
  head: null,
  foot: null,
  headFill: 'none',
  headFg: 'none',
  footFill: 'none',
  stripe: 'none',
});
const clone = (o) => JSON.parse(JSON.stringify(o));

/** Remplace l'habillage par un préréglage (texte et fusions intacts) ; les surcharges d'arêtes sont oubliées (le préréglage s'applique
    à tout le tableau). Un préréglage à pied (`foot`) fixe le nombre de lignes de pied ; les autres le laissent tel quel. */
export function applyPreset(tb, key) {
  const p = TABLE_PRESETS[key] || TABLE_PRESETS.rules;
  tb.look = { preset: TABLE_PRESETS[key] ? key : 'rules', ...BARE_LOOK(), ...clone(p.look) };
  tb.edges = {};
  if (p.foot !== undefined) setFootRows(tb, p.foot);
  return tb;
}

/** Nouveau tableau : `head` lignes d'en-tête (titres de colonnes), le reste vide */
export function newTable(nr = 4, nc = 3, head = 1) {
  nr = clampInt(nr, 1, TABLE_MAX.rows, 4);
  nc = clampInt(nc, 1, TABLE_MAX.cols, 3);
  head = clampInt(head, 0, Math.min(HEAD_MAX, nr), 1);
  const tb = {
    v: TABLE_V,
    cols: Array.from({ length: nc }, () => ({ id: tid('tk'), w: 1 })),
    rows: Array.from({ length: nr }, (_, r) => ({ id: tid('tr'), h: 0, kind: r < head ? 'head' : 'body' })),
    cells: [],
    edges: {},
  };
  for (let r = 0; r < nr; r++) for (let c = 0; c < nc; c++) tb.cells.push(newCell(r, c, r === 0 && head ? `${t('Colonne')} ${c + 1}` : ''));
  return applyPreset(tb, 'rules');
}

/* ---------- Lecture ---------- */
export const headCount = (tb) => {
  let n = 0;
  while (n < tb.rows.length && tb.rows[n].kind === 'head') n++;
  return n;
};
/** Nombre de lignes de pied (en bas du tableau) */
export const footCount = (tb) => {
  let n = 0;
  while (n < tb.rows.length && tb.rows[tb.rows.length - 1 - n].kind === 'foot') n++;
  return n;
};
/** Carte des cases : map[r][c] = index de la cellule qui couvre la case (-1 = trou, -2 = chevauchement) */
export function coverMap(tb) {
  const R = tb.rows.length,
    C = tb.cols.length,
    map = Array.from({ length: R }, () => new Array(C).fill(-1));
  tb.cells.forEach((cl, k) => {
    for (let r = cl.r; r < cl.r + cl.rs; r++)
      for (let c = cl.c; c < cl.c + cl.cs; c++) if (r >= 0 && r < R && c >= 0 && c < C) map[r][c] = map[r][c] === -1 ? k : -2;
  });
  return map;
}
/** Cellule qui couvre la case (r, c) */
export function cellAt(tb, r, c) {
  return tb.cells.find((cl) => r >= cl.r && r < cl.r + cl.rs && c >= cl.c && c < cl.c + cl.cs) || null;
}
/** Cellules dans l'ordre de lecture (ligne puis colonne de l'ancre) */
export const readingOrder = (tb) => tb.cells.slice().sort((a, b) => a.r - b.r || a.c - b.c);

/** Écarts à l'invariant (liste vide = tableau valide) */
export function checkTable(tb) {
  const err = [];
  if (!tb || !Array.isArray(tb.rows) || !Array.isArray(tb.cols) || !Array.isArray(tb.cells)) return ['structure'];
  const R = tb.rows.length,
    C = tb.cols.length;
  if (R < 1 || C < 1) err.push(`taille ${R}×${C}`);
  if (R > TABLE_MAX.rows || C > TABLE_MAX.cols) err.push(`taille ${R}×${C} au-delà du maximum`);
  const ids = new Set();
  for (const cl of tb.cells) {
    if (ids.has(cl.id)) err.push(`id ${cl.id} en double`);
    ids.add(cl.id);
    if (!(cl.rs >= 1 && cl.cs >= 1) || cl.r < 0 || cl.c < 0 || cl.r + cl.rs > R || cl.c + cl.cs > C)
      err.push(`cellule ${cl.id} hors de la grille (${cl.r},${cl.c} ${cl.rs}×${cl.cs})`);
  }
  coverMap(tb).forEach((row, r) =>
    row.forEach((k, c) => {
      if (k === -1) err.push(`case ${r},${c} vide`);
      if (k === -2) err.push(`case ${r},${c} couverte deux fois`);
    }),
  );
  return err;
}

/* ---------- Opérations (elles modifient le tableau et le renvoient) ---------- */
/* Les deux axes se traitent de la même façon : ligne = (r, rs), colonne = (c, cs). */
const AX = {
  row: { p: 'r', s: 'rs', op: 'c', os: 'cs', list: 'rows', other: 'cols' },
  col: { p: 'c', s: 'cs', op: 'r', os: 'rs', list: 'cols', other: 'rows' },
};
/** Décale les surcharges d'arêtes après une insertion (d = +1) ou une suppression (d = -1) à l'index `at` de l'axe */
function shiftEdges(tb, axis, at, d) {
  const out = {};
  // lignes : limites 'h' indexées par i (axe), arêtes 'v' indexées par i (axe) ; colonnes : limites 'v' par j, arêtes 'h' par j
  const across = axis === 'row' ? 'h' : 'v';
  for (const [k, v] of Object.entries(tb.edges || {})) {
    const [o, a, b] = k.split(':'),
      i = +a,
      j = +b;
    let n = axis === 'row' ? i : j; // index sur l'axe modifié
    if (o === across) {
      // limite entre deux pistes : la limite `at` reste au-dessus / à gauche de la piste insérée
      if (d > 0 && n > at) n++;
      else if (d < 0) {
        // les limites `at` et `at + 1` se confondent : on garde celle du haut / de gauche, sauf pour la dernière piste (bord du tableau)
        const last = at + 1 === (axis === 'row' ? tb.rows.length : tb.cols.length);
        if (n === (last ? at : at + 1)) continue;
        if (n > at) n--;
      }
    } else {
      // arête le long d'une piste
      if (d > 0 && n >= at) n++;
      else if (d < 0) {
        if (n === at) continue;
        if (n > at) n--;
      }
    }
    out[axis === 'row' ? `${o}:${n}:${j}` : `${o}:${i}:${n}`] = v;
  }
  tb.edges = out;
}

/** Insère une piste vide (ligne ou colonne) à l'index `at` ; une fusion qui la traverse s'allonge */
function insertTrack(tb, axis, at) {
  const A = AX[axis],
    n = tb[A.list].length;
  if (n >= (axis === 'row' ? TABLE_MAX.rows : TABLE_MAX.cols)) return tb;
  at = clampInt(at, 0, n, n);
  const covered = new Set();
  for (const cl of tb.cells) {
    if (cl[A.p] >= at) cl[A.p]++;
    else if (cl[A.p] + cl[A.s] > at) {
      cl[A.s]++; // la fusion traverse l'insertion
      for (let o = cl[A.op]; o < cl[A.op] + cl[A.os]; o++) covered.add(o);
    }
  }
  if (axis === 'row') {
    const hc = headCount(tb),
      prev = tb.rows[at - 1];
    tb.rows.splice(at, 0, { id: tid('tr'), h: 0, kind: at < hc ? 'head' : prev && prev.kind === 'foot' ? 'foot' : 'body' });
  } else {
    const ref = tb.cols[Math.min(at, n - 1)];
    tb.cols.splice(at, 0, { id: tid('tk'), w: ref ? ref.w : 1 });
  }
  const m = tb[A.other].length;
  for (let o = 0; o < m; o++) if (!covered.has(o)) tb.cells.push(axis === 'row' ? newCell(at, o) : newCell(o, at));
  shiftEdges(tb, axis, at, 1);
  return tb;
}
/** Supprime la piste `at` ; une fusion qui la traverse se raccourcit (son texte est gardé) */
function deleteTrack(tb, axis, at) {
  const A = AX[axis],
    n = tb[A.list].length;
  if (n <= 1 || at < 0 || at >= n) return tb;
  tb.cells = tb.cells.filter((cl) => {
    const p = cl[A.p],
      s = cl[A.s];
    if (p > at) cl[A.p]--;
    else if (p + s > at) {
      if (s === 1) return false; // cellule entièrement dans la piste supprimée
      cl[A.s]--; // ancre dans la piste (elle glisse sur la suivante, qui prend l'index `at`) ou fusion qui la traverse
    }
    return true;
  });
  shiftEdges(tb, axis, at, -1);
  tb[A.list].splice(at, 1);
  return tb;
}
export const insertRow = (tb, at) => insertTrack(tb, 'row', at);
export const insertCol = (tb, at) => insertTrack(tb, 'col', at);
export const deleteRow = (tb, at) => deleteTrack(tb, 'row', at);
export const deleteCol = (tb, at) => deleteTrack(tb, 'col', at);

/** Nombre de lignes et de colonnes : on ajoute ou retire à la fin */
export function resizeTable(tb, nr, nc) {
  nr = clampInt(nr, 1, TABLE_MAX.rows, tb.rows.length);
  nc = clampInt(nc, 1, TABLE_MAX.cols, tb.cols.length);
  while (tb.rows.length < nr) insertRow(tb, tb.rows.length);
  while (tb.rows.length > nr) deleteRow(tb, tb.rows.length - 1);
  while (tb.cols.length < nc) insertCol(tb, tb.cols.length);
  while (tb.cols.length > nc) deleteCol(tb, tb.cols.length - 1);
  return tb;
}
/** Réordonne les pistes d'un axe : `order[k]` = ancien index de la piste qui devient la k-ième. Sans effet (false) si une cellule fusionnée serait coupée.
    Le rôle d'une ligne (en-tête, corps, pied) reste attaché à sa position ; une surcharge d'arête suit la piste qu'elle borde
    (la limite i appartient à la piste i, la dernière limite reste au bord). */
export function permuteTracks(tb, axis, order) {
  const A = AX[axis],
    n = tb[A.list].length;
  if (order.length !== n || new Set(order).size !== n || order.some((o) => !(o >= 0 && o < n))) return false;
  const perm = [];
  order.forEach((o, k) => (perm[o] = k));
  for (const cl of tb.cells) for (let k = 1; k < cl[A.s]; k++) if (perm[cl[A.p] + k] !== perm[cl[A.p]] + k) return false;
  for (const cl of tb.cells) cl[A.p] = perm[cl[A.p]];
  const list = tb[A.list],
    kinds = list.map((x) => x.kind);
  tb[A.list] = order.map((o) => list[o]);
  if (axis === 'row')
    tb.rows.forEach((r, i) => {
      if (kinds[i]) r.kind = kinds[i];
      else delete r.kind;
    });
  const across = axis === 'row' ? 'h' : 'v',
    out = {};
  for (const [k, v] of Object.entries(tb.edges || {})) {
    const [o, a, b] = k.split(':'),
      idx = axis === 'row' ? +a : +b,
      m = o === across && idx >= n ? idx : perm[idx];
    out[axis === 'row' ? `${o}:${m}:${b}` : `${o}:${a}:${m}`] = v;
  }
  tb.edges = out;
  return true;
}
/** Déplace les pistes a..b (contiguës) pour que la première prenne l'index `to` ; false si rien ne bouge ou si une fusion serait coupée */
export function moveTracks(tb, axis, a, b, to) {
  const n = tb[AX[axis].list].length,
    L = b - a + 1;
  if (!(a >= 0 && b >= a && b < n) || !(to >= 0 && to <= n - L) || to === a) return false;
  const rest = [...Array(n).keys()].filter((k) => k < a || k > b);
  rest.splice(to, 0, ...Array.from({ length: L }, (_, k) => a + k));
  return permuteTracks(tb, axis, rest);
}
/** Copie la piste `at` à l'index `to` (après elle par défaut) : contenu, style, taille ; une fusion qui traverse `to` s'allonge. false si la limite est atteinte */
export function duplicateTrack(tb, axis, at, to = at + 1) {
  const A = AX[axis],
    n = tb[A.list].length;
  if (at < 0 || at >= n || to <= at || n >= (axis === 'row' ? TABLE_MAX.rows : TABLE_MAX.cols)) return false;
  const src = tb.cells.filter((cl) => cl[A.p] === at && cl[A.s] === 1).map(clone);
  insertTrack(tb, axis, to);
  const ins = tb[A.list][to];
  tb[A.list][to] = { ...clone(tb[A.list][at]), id: ins.id, ...(axis === 'row' ? { kind: ins.kind } : {}) };
  for (const cl of src) {
    tb.cells = tb.cells.filter((x) => !(x[A.p] === to && x[A.s] === 1 && x[A.op] >= cl[A.op] && x[A.op] < cl[A.op] + cl[A.os]));
    cl.id = tid('tc');
    cl[A.p] = to;
    tb.cells.push(cl);
  }
  return true;
}
/** Largeurs égales pour les colonnes c0..c1 (la largeur totale de la plage ne change pas) */
export function distributeCols(tb, c0, c1) {
  const cs = tb.cols.slice(c0, c1 + 1);
  if (cs.length < 2) return tb;
  const w = Math.round((cs.reduce((s, c) => s + (+c.w > 0 ? +c.w : 1), 0) / cs.length) * 1000) / 1000;
  cs.forEach((c) => (c.w = w));
  return tb;
}
/** Hauteurs égales pour les lignes r0..r1 : la plus haute (`heights`, mesurées, en px) fait référence, sur la grille de 3 px */
export function distributeRows(tb, r0, r1, heights) {
  if (r1 <= r0) return tb;
  const hmax = Math.max(...heights.slice(r0, r1 + 1));
  for (let i = r0; i <= r1; i++) tb.rows[i].h = Math.ceil(hmax / 3) * 3;
  return tb;
}
/** Largeurs des colonnes c0..c1 proportionnelles à `need` (largeur naturelle du contenu, en px) ; la largeur totale de la plage ne change pas */
export function fitCols(tb, need, c0, c1) {
  const cs = tb.cols.slice(c0, c1 + 1),
    nd = need.slice(c0, c1 + 1).map((v) => Math.max(1, v || 1)),
    sum = nd.reduce((s, v) => s + v, 0),
    tot = cs.reduce((s, c) => s + (+c.w > 0 ? +c.w : 1), 0);
  cs.forEach((c, k) => (c.w = Math.round(((tot * nd[k]) / sum) * 1000) / 1000));
  return tb;
}
/** Nombre de lignes d'en-tête (en haut du tableau) */
export function setHeadRows(tb, n) {
  n = clampInt(n, 0, Math.min(HEAD_MAX, tb.rows.length), 0);
  tb.rows.forEach((r, i) => {
    if (i < n) r.kind = 'head';
    else if (r.kind === 'head') r.kind = 'body';
  });
  return tb;
}

/** Nombre de lignes de pied : les dernières lignes du tableau (jamais celles de l'en-tête) */
export function setFootRows(tb, n) {
  n = clampInt(n, 0, Math.min(FOOT_MAX, tb.rows.length - headCount(tb)), 0);
  tb.rows.forEach((r, i) => {
    if (i >= tb.rows.length - n) r.kind = 'foot';
    else if (r.kind === 'foot') r.kind = 'body';
  });
  return tb;
}

/** Rectangle qui contient [r0, c0]–[r1, c1] et toute cellule qu'il coupe (une fusion ne coupe jamais une cellule) */
export function mergeRect(tb, r0, c0, r1, c1) {
  let a = Math.min(r0, r1),
    b = Math.max(r0, r1),
    l = Math.min(c0, c1),
    rr = Math.max(c0, c1);
  for (let changed = true; changed;) {
    changed = false;
    for (const cl of tb.cells) {
      const inside = cl.r <= b && cl.r + cl.rs - 1 >= a && cl.c <= rr && cl.c + cl.cs - 1 >= l;
      if (!inside) continue;
      const na = Math.min(a, cl.r),
        nb = Math.max(b, cl.r + cl.rs - 1),
        nl = Math.min(l, cl.c),
        nr = Math.max(rr, cl.c + cl.cs - 1);
      if (na !== a || nb !== b || nl !== l || nr !== rr) {
        [a, b, l, rr] = [na, nb, nl, nr];
        changed = true;
      }
    }
  }
  return { r0: a, c0: l, r1: b, c1: rr };
}
/** Fusionne le rectangle : la cellule en haut à gauche le couvre ; les textes des autres sont mis bout à bout (une ligne chacun). Renvoie la cellule. */
export function mergeCells(tb, r0, c0, r1, c1) {
  const R = mergeRect(tb, r0, c0, r1, c1),
    inRect = (cl) => cl.r >= R.r0 && cl.r <= R.r1 && cl.c >= R.c0 && cl.c <= R.c1;
  const group = readingOrder(tb).filter(inRect),
    anchor = group[0];
  if (!anchor || group.length < 2) return anchor || null;
  anchor.text = group
    .map((cl) => String(cl.text || ''))
    .filter((x) => x.trim())
    .join('\n');
  anchor.rs = R.r1 - R.r0 + 1;
  anchor.cs = R.c1 - R.c0 + 1;
  const gone = new Set(group.slice(1));
  tb.cells = tb.cells.filter((cl) => !gone.has(cl));
  /* les surcharges d'arêtes intérieures n'ont plus de sens */
  for (const k of Object.keys(tb.edges || {})) {
    const [o, i, j] = k.split(':').map((x, n) => (n ? +x : x));
    if (o === 'h' && i > R.r0 && i <= R.r1 && j >= R.c0 && j <= R.c1) delete tb.edges[k];
    if (o === 'v' && j > R.c0 && j <= R.c1 && i >= R.r0 && i <= R.r1) delete tb.edges[k];
  }
  return anchor;
}
/** Scinde une cellule fusionnée en cellules 1 × 1 : l'ancre garde son texte, les nouvelles reprennent son habillage, sans texte */
export function splitCell(tb, id) {
  const cl = tb.cells.find((x) => x.id === id);
  if (!cl || (cl.rs === 1 && cl.cs === 1)) return tb;
  const { text, id: _i, r: _r, c: _c, rs: _rs, cs: _cs, ...look } = cl;
  for (let r = cl.r; r < cl.r + cl.rs; r++)
    for (let c = cl.c; c < cl.c + cl.cs; c++) if (r !== cl.r || c !== cl.c) tb.cells.push({ ...newCell(r, c), ...clone(look) });
  cl.rs = cl.cs = 1;
  return tb;
}

/* ---------- Habillage ---------- */
/** Fond d'une cellule (clé de couleur ou 'none') */
export function fillOf(tb, cl) {
  const L = tb.look || {},
    row = tb.rows[cl.r] || {},
    col = tb.cols[cl.c] || {},
    set = (k) => k && k !== 'none';
  if (set(cl.fill)) return cl.fill;
  if (set(row.fill)) return row.fill;
  if (set(col.fill)) return col.fill;
  if (row.kind === 'head') return set(L.headFill) ? L.headFill : 'none';
  if (row.kind === 'foot') return set(L.footFill) ? L.footFill : 'none';
  if (set(L.stripe) && row.kind === 'body') {
    const k = tb.rows.slice(0, cl.r).filter((x) => x.kind === 'body').length; // rang parmi les lignes du corps
    if (k % 2 === 1) return L.stripe;
  }
  return 'none';
}
/** Couleur du texte d'une cellule ('none' = celle de la colonne) */
export function fgOf(tb, cl) {
  const L = tb.look || {},
    row = tb.rows[cl.r] || {};
  if (cl.fg && cl.fg !== 'none') return cl.fg;
  if (row.kind === 'head' && L.headFg && L.headFg !== 'none') return L.headFg;
  return 'none';
}
/** Styles de paragraphe offerts à une cellule (sous-ensemble de PSTYLES : ni titres, ni chapeau, ni chiffre clé en grand) */
export const CELL_STYLES = ['body', 'bold', 'small', 'quote', 'cap', 'label', 'source', 'note', 'figsm'];
/** Marges intérieures [haut/bas, gauche/droite] en px, sur la grille de 3 px ; 'normal' = défaut (clé absente) */
export const PADS = { none: [0, 0], tight: [3, 3], normal: [3, 6], roomy: [6, 9], wide: [9, 12] };
export const padOf = (cl) => PADS[cl.pad] || PADS.normal;
/** Colonne numérique ? (la cellule fusionnée suit sa colonne d'ancre) */
export const isNumCol = (tb, c) => !!(tb.cols[c] && tb.cols[c].num);
/** Alignement horizontal effectif : celui de la cellule, sinon à droite dans une colonne numérique */
export const ahOf = (tb, cl) => cl.ah || (isNumCol(tb, cl.c) ? 'right' : 'left');
/** Marque ou démarque des colonnes comme numériques */
export function setNumCols(tb, c0, c1, on) {
  for (let c = c0; c <= c1; c++) if (tb.cols[c]) on ? (tb.cols[c].num = true) : delete tb.cols[c].num;
}

const validStroke = (s) => s && s.w > 0 && isKey(s.color);
/** Trait de l'arête ('h' | 'v', i, j), null si elle n'existe pas (intérieur d'une fusion) ou n'a pas de trait */
export function edgeStroke(tb, o, i, j, map = coverMap(tb)) {
  const R = tb.rows.length,
    C = tb.cols.length,
    L = tb.look || {},
    hc = headCount(tb),
    fc = footCount(tb);
  let base;
  if (o === 'h') {
    if (i > 0 && i < R && map[i - 1][j] === map[i][j]) return null;
    base = i === 0 ? L.top : i === R ? L.bottom : i === hc ? L.head || L.innerH : fc && i === R - fc ? L.foot || L.innerH : L.innerH;
  } else {
    if (j > 0 && j < C && map[i][j - 1] === map[i][j]) return null;
    base = j === 0 || j === C ? L.sides : L.innerV;
  }
  const k = `${o}:${i}:${j}`,
    over = tb.edges && tb.edges[k];
  const s = over !== undefined ? over : base;
  return validStroke(s) ? s : null;
}
const styleKey = (s) => `${s.w}|${s.color}|${s.dash ? s.dash.join(',') : ''}`;
/** Traits à dessiner : les arêtes contiguës de même trait sont réunies en un segment (pointillés continus).
    Chaque segment : { o, i, a, b, s (trait), e0, e1 } — de la limite a à la limite b de l'autre axe, prolongé aux bouts de la
    demi-épaisseur du trait perpendiculaire le plus épais (e0, e1 en pt : coins sans encoche). Triés du plus fin au plus épais. */
export function tableSegments(tb) {
  const R = tb.rows.length,
    C = tb.cols.length,
    map = coverMap(tb),
    segs = [];
  const at = (o, i, j) => edgeStroke(tb, o, i, j, map);
  /* demi-épaisseur des traits perpendiculaires au nœud (limite de ligne y, limite de colonne x) */
  const halfV = (y, x) => Math.max(0, ...[y - 1, y].filter((r) => r >= 0 && r < R).map((r) => (at('v', r, x) || { w: 0 }).w)) / 2;
  const halfH = (y, x) => Math.max(0, ...[x - 1, x].filter((c) => c >= 0 && c < C).map((c) => (at('h', y, c) || { w: 0 }).w)) / 2;
  const run = (o, i, n, get, half) => {
    let cur = null;
    const close = (end) => {
      if (!cur) return;
      segs.push({ o, i, a: cur.a, b: end, s: cur.s, e0: half(cur.a), e1: half(end) });
      cur = null;
    };
    for (let j = 0; j < n; j++) {
      const s = get(j);
      if (cur && (!s || styleKey(s) !== styleKey(cur.s))) close(j);
      if (s && !cur) cur = { a: j, s };
    }
    close(n);
  };
  for (let i = 0; i <= R; i++)
    run(
      'h',
      i,
      C,
      (j) => at('h', i, j),
      (x) => halfV(i, x),
    );
  for (let j = 0; j <= C; j++)
    run(
      'v',
      j,
      R,
      (i) => at('v', i, j),
      (y) => halfH(y, j),
    );
  return segs.sort((p, q) => p.s.w - q.s.w);
}

/* ---------- Contours : surcharges d'arêtes d'une sélection, ou réglages du tableau ---------- */
/** Arêtes que désigne un « côté » du rectangle [r0, c0]–[r1, c1] : clés 'h:i:j' / 'v:i:j'. Côtés : top, bottom, left, right, innerH, innerV
    (extérieur = les quatre premiers, tout = les six) ; les arêtes à l'intérieur d'une fusion n'existent pas et sont omises. */
export const EDGE_SIDES = ['top', 'bottom', 'left', 'right', 'innerH', 'innerV'];
export function rectEdges(tb, R, sides) {
  const map = coverMap(tb),
    out = new Set(),
    H = tb.rows.length,
    W = tb.cols.length;
  const h = (i, j) => {
    if (!(i > 0 && i < H && map[i - 1][j] === map[i][j])) out.add(`h:${i}:${j}`);
  };
  const v = (i, j) => {
    if (!(j > 0 && j < W && map[i][j - 1] === map[i][j])) out.add(`v:${i}:${j}`);
  };
  for (const side of sides) {
    for (let j = R.c0; j <= R.c1; j++) {
      if (side === 'top') h(R.r0, j);
      if (side === 'bottom') h(R.r1 + 1, j);
      if (side === 'innerH') for (let i = R.r0 + 1; i <= R.r1; i++) h(i, j);
    }
    for (let i = R.r0; i <= R.r1; i++) {
      if (side === 'left') v(i, R.c0);
      if (side === 'right') v(i, R.c1 + 1);
      if (side === 'innerV') for (let j = R.c0 + 1; j <= R.c1; j++) v(i, j);
    }
  }
  return [...out];
}
/** Pose un trait sur des arêtes de la sélection (`s` : trait, `stroke(0)` = aucun trait, `undefined` = retire la surcharge : l'arête reprend le tableau) */
export function setEdges(tb, R, sides, s) {
  tb.edges = tb.edges || {};
  for (const k of rectEdges(tb, R, sides)) {
    if (s === undefined) delete tb.edges[k];
    else tb.edges[k] = clone(s);
  }
  return tb;
}
/** Trait effectif (surcharge comprise) d'un côté de la sélection, ou null si ses arêtes diffèrent ou n'ont pas de trait ; `none` : tout est sans trait */
export function sideStroke(tb, R, side) {
  const map = coverMap(tb),
    keys = rectEdges(tb, R, [side]),
    all = keys.map((k) => {
      const [o, i, j] = k.split(':');
      return edgeStroke(tb, o, +i, +j, map);
    });
  if (!all.length) return { none: true, s: null };
  const first = all[0];
  if (!first) return { none: all.every((x) => !x), s: null };
  return all.every((x) => x && styleKey(x) === styleKey(first)) ? { none: false, s: first } : { none: false, s: null };
}
/** Côtés du tableau (sans sélection) : correspondance avec les réglages `look` */
export const LOOK_SIDES = {
  top: ['top'],
  bottom: ['bottom'],
  left: ['sides'],
  right: ['sides'],
  innerH: ['innerH'],
  innerV: ['innerV'],
  head: ['head'],
  foot: ['foot'],
};
/** Pose un trait sur des réglages du tableau (`s` null = pas de trait) ; le préréglage devient « personnalisé » */
export function setLookStroke(tb, sides, s) {
  tb.look = tb.look || {};
  for (const side of sides) for (const k of LOOK_SIDES[side] || []) tb.look[k] = s ? clone(s) : null;
  tb.look.preset = 'custom';
  return tb;
}
/** Trait du tableau pour un côté (sans sélection) */
export function lookStroke(tb, side) {
  const L = tb.look || {},
    k = (LOOK_SIDES[side] || [])[0];
  return k && L[k] && L[k].w > 0 ? L[k] : null;
}

/* ---------- Couleurs ---------- */
/** Parcourt les couleurs du tableau : fn(clé) pour les traits et le texte, fill(clé) pour les fonds */
export function remapTableColors(tb, fn, fill = fn) {
  if (!tb || typeof tb !== 'object') return;
  const st = (s) => {
    if (s && typeof s.color === 'string') s.color = fn(s.color);
  };
  const L = tb.look || {};
  STROKE_KEYS.forEach((k) => st(L[k]));
  if (L.headFill) L.headFill = fill(L.headFill);
  if (L.footFill) L.footFill = fill(L.footFill);
  if (L.stripe) L.stripe = fill(L.stripe);
  if (L.headFg) L.headFg = fn(L.headFg);
  Object.values(tb.edges || {}).forEach(st);
  [...(tb.rows || []), ...(tb.cols || [])].forEach((x) => {
    if (x.fill) x.fill = fill(x.fill);
  });
  (tb.cells || []).forEach((cl) => {
    if (cl.fill) cl.fill = fill(cl.fill);
    if (cl.fg) cl.fg = fn(cl.fg);
  });
}

/* ---------- Ouverture d'un fichier ---------- */
const cleanStroke = (s) => {
  if (s === null) return null;
  if (!s || typeof s !== 'object') return undefined;
  const w = Math.max(0, Math.min(6, +s.w || 0)),
    dash = Array.isArray(s.dash) && s.dash.length === 2 && s.dash.every((v) => +v > 0) ? s.dash.map((v) => Math.min(48, +v)) : null;
  return { w, color: isKey(s.color) ? s.color : 'text', dash };
};
const AH = ['left', 'center', 'right', 'justify'],
  AV = ['top', 'center', 'bottom'];
/** Tableau lu dans un fichier : formes corrigées, invariant rétabli (cellules hors grille rognées, chevauchements retirés, trous comblés) */
export function repairTable(src) {
  if (!src || typeof src !== 'object' || !Array.isArray(src.rows) || !Array.isArray(src.cols)) return newTable();
  const tb = {
    v: TABLE_V,
    rows: src.rows.slice(0, TABLE_MAX.rows).map((r) => ({
      ...(r && typeof r === 'object' ? r : {}),
      id: (r && r.id) || tid('tr'),
      h: Math.max(0, Math.min(900, +(r && r.h) || 0)),
      kind: r && ['head', 'body', 'foot'].includes(r.kind) ? r.kind : 'body',
    })),
    cols: src.cols.slice(0, TABLE_MAX.cols).map((c) => ({
      ...(c && typeof c === 'object' ? c : {}),
      id: (c && c.id) || tid('tk'),
      w: +(c && c.w) > 0 ? Math.min(100, +c.w) : 1,
    })),
    cells: [],
    edges: {},
  };
  if (!tb.rows.length || !tb.cols.length) return newTable();
  const R = tb.rows.length,
    C = tb.cols.length,
    taken = Array.from({ length: R }, () => new Array(C).fill(false)),
    ids = new Set();
  const cells = (Array.isArray(src.cells) ? src.cells : [])
    .filter((cl) => cl && typeof cl === 'object')
    .map((cl) => ({
      ...cl,
      r: Number.isInteger(+cl.r) && +cl.r >= 0 && +cl.r < R ? +cl.r : -1, // ancre hors de la grille : cellule retirée
      c: Number.isInteger(+cl.c) && +cl.c >= 0 && +cl.c < C ? +cl.c : -1,
      rs: Math.max(1, clampInt(cl.rs, 1, R, 1)),
      cs: Math.max(1, clampInt(cl.cs, 1, C, 1)),
    }))
    .filter((cl) => cl.r >= 0 && cl.c >= 0)
    .sort((a, b) => a.r - b.r || a.c - b.c);
  for (const cl of cells) {
    if (taken[cl.r][cl.c]) continue; // l'ancre est déjà prise : la cellule est retirée
    cl.rs = Math.min(cl.rs, R - cl.r);
    cl.cs = Math.min(cl.cs, C - cl.c);
    /* rogne la fusion sur ce qui est libre : d'abord la largeur sur la ligne de l'ancre, puis les lignes entières */
    let cs = 0;
    while (cs < cl.cs && !taken[cl.r][cl.c + cs]) cs++;
    let rs = 1;
    while (rs < cl.rs && [...Array(cs).keys()].every((k) => !taken[cl.r + rs][cl.c + k])) rs++;
    cl.cs = cs;
    cl.rs = rs;
    for (let r = cl.r; r < cl.r + rs; r++) for (let c = cl.c; c < cl.c + cs; c++) taken[r][c] = true;
    if (typeof cl.id !== 'string' || !cl.id || ids.has(cl.id)) cl.id = tid('tc');
    ids.add(cl.id);
    cl.text = typeof cl.text === 'string' ? cl.text : cl.text == null ? '' : String(cl.text);
    if (cl.ah && !AH.includes(cl.ah)) delete cl.ah;
    if (cl.av && !AV.includes(cl.av)) delete cl.av;
    for (const k of ['fill', 'fg']) if (cl[k] != null && !isKey(cl[k])) delete cl[k];
    if (cl.st != null && !CELL_STYLES.includes(cl.st)) delete cl.st;
    if (cl.pad != null && !PADS[cl.pad]) delete cl.pad;
    tb.cells.push(cl);
  }
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (!taken[r][c]) tb.cells.push(newCell(r, c));
  tb.cols.forEach((c) => {
    if (c.num !== true) delete c.num;
  });
  /* fonds de lignes et de colonnes : des clés de couleur, sinon retirés */
  [...tb.rows, ...tb.cols].forEach((x) => {
    if (x.fill != null && !isKey(x.fill)) delete x.fill;
  });
  /* le pied reste en bas : une ligne 'foot' suivie d'une ligne du corps ou de l'en-tête devient du corps */
  let tail = true;
  for (let i = tb.rows.length - 1; i >= 0; i--) {
    if (tb.rows[i].kind !== 'foot') tail = false;
    else if (!tail) tb.rows[i].kind = 'body';
  }
  /* l'en-tête reste en haut : une ligne 'head' après une ligne du corps devient du corps */
  let body = false;
  tb.rows.forEach((r) => {
    if (r.kind !== 'head') body = true;
    else if (body) r.kind = 'body';
  });
  for (const [k, v] of Object.entries(src.edges && typeof src.edges === 'object' ? src.edges : {})) {
    const m = /^(h|v):(\d+):(\d+)$/.exec(k);
    if (!m) continue;
    const i = +m[2],
      j = +m[3];
    if (m[1] === 'h' ? i > R || j >= C : i >= R || j > C) continue;
    const s = cleanStroke(v);
    if (s !== undefined) tb.edges[k] = s;
  }
  const L = src.look && typeof src.look === 'object' ? src.look : null;
  if (!L) applyPreset(tb, 'rules');
  else {
    const base = BARE_LOOK();
    tb.look = { ...L, preset: TABLE_PRESETS[L.preset] ? L.preset : 'custom' };
    for (const k of STROKE_KEYS) {
      const s = cleanStroke(L[k]);
      tb.look[k] = s === undefined ? null : s;
    }
    for (const k of ['headFill', 'headFg', 'footFill', 'stripe']) tb.look[k] = isKey(L[k]) ? L[k] : base[k];
  }
  return tb;
}
