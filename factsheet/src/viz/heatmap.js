/* Heatmap : un tableau de cases (lignes × colonnes) dont la couleur dit l'écart à une colonne de référence, ou la valeur elle-même.
   Échelle en classes (jamais de dégradé continu : l'export PDF n'en dessine pas) : baisses dans `color`, hausses dans `color2`, zéro en gris neutre ;
   une teinte = la couleur de palette à opacité réduite posée sur une case blanche, donc relue par l'export PDF avec les encres exactes de la palette (`makeInk`).
   Une cellule vide est « en attente » : contour en tirets, sans fond. Données : tableau à séries (colonnes = séries), cellules vides gardées (`blank`). */
import { VIZ, TYPE } from '../tokens.js';
import { t } from '../i18n.js';
import {
  s,
  SW,
  colorRef,
  pxOf,
  fmt,
  SANS,
  SERIF,
  fitText,
  ellipsize,
  mw,
  heightOf,
  inkOn,
  reorderHit,
  scaleTop,
  drawLegend,
  classBarHeight,
} from './util.js';

const NEUTRAL = 'grey'; // couleur neutre de la palette : cases de référence et écart nul
/** Nombre de classes : 3 à 20. Impair = une classe neutre grise autour de zéro ; pair = autant de baisses que de hausses, zéro à la limite. */
const CLASSES = Object.fromEntries(Array.from({ length: 18 }, (_, i) => [i + 3, String(i + 3)]));
/** Nombre de classes d'un réglage (borné à 3–20) */
export const classCount = (o) => Math.max(3, Math.min(20, Math.round(+o.classes || +LOOK.classes)));
/** Classes de chaque côté de zéro sur l'échelle divergente */
const halfOf = (n) => Math.floor(n / 2);
const LOOK = {
  refCol: '0',
  compareTo: 'ref',
  colorBy: 'abs',
  classes: '7',
  color: 'yellow',
  color2: 'blue',
  gap: 3,
  corners: 'round',
  cellLine: 'none',
  pendingStyle: 'dashed',
  fillTone: 'normal',
  valueSize: 'normal',
};
/** contour des cases en multiples de 0,5 pt ; motif des cases « en attente » (mêmes tirets que la grille) ; intensité des teintes ; taille du texte */
const LINE_K = { none: 0, thin: 1, medium: 2 };
const PENDING_DASH = { dashed: '3 2', dotted: '1 3', solid: null };
const TONE_K = { light: 0.75, normal: 1, strong: 1.25 };
const SIZE_K = { small: 0.85, normal: 1, large: 1.2 };

/** Ligne ou colonne masquée : gardée dans les données, absente du dessin et de l'échelle */
export const isHidden = (x) => !!(x && x.hidden);
/** Cellule : nombre, ou null si vide (« en attente ») */
export const cellVal = (r, j) => {
  const x = (r && r.v ? r.v : [])[j];
  return x === null || x === undefined || x === '' || !Number.isFinite(+x) ? null : +x;
};
/** Indice de la colonne de référence (-1 = aucune) ; une colonne qui n'existe plus retombe sur la 1re */
export const refIndex = (o, n) => {
  const r = String(o.refCol ?? LOOK.refCol);
  if (r === 'none' || !n) return -1;
  const i = Math.round(+r);
  return Number.isFinite(i) && i >= 0 && i < n ? i : 0;
};
/** Opacité de la teinte de la classe k (1…h) : de 0,2 (la plus pâle) à 1 (la couleur pleine) */
export const classAlpha = (k, h) => (h <= 1 ? 0.6 : 0.2 + (0.8 * (k - 1)) / (h - 1));
/** Teinte de la classe k selon l'intensité choisie (`fillTone`) : celle de `classAlpha`, ×0,75 / ×1,25, jamais au-delà de 1 */
const toneAlpha = (o, k, h) => Math.min(1, classAlpha(k, h) * (TONE_K[o.fillTone] ?? 1));
/** Classe d'un écart d sur une échelle divergente de n classes : −h…h. n impair : 0 = classe neutre autour de zéro ;
    n pair : pas de classe neutre, tout écart non nul est au moins en classe ±1 (seul un écart nul reste à 0, gris). */
export function divClass(d, M, n) {
  const h = halfOf(n);
  if (!(M > 0) || !d) return 0;
  const r = Math.abs(d) / M;
  const k = n % 2 ? Math.min(h, Math.floor(r * (n / 2) + 0.5)) : Math.max(1, Math.min(h, Math.ceil(r * h - 1e-9)));
  return Math.sign(d) * k;
}
/** Classe d'une valeur sur une échelle séquentielle de n classes entre lo et hi : 1…n */
export const seqClass = (v, lo, hi, n) => (hi > lo ? Math.max(1, Math.min(n, Math.ceil(((v - lo) / (hi - lo)) * n))) : n);

const signed = (x, txt) => (x > 0 ? '+' : x < 0 ? '−' : '') + txt;
const pctSign = (locale) => (/^fr/i.test(locale || '') ? ' %' : '%');

/** Calculs du tableau (sans dessin) : valeur, écarts, classe et teinte de chaque case — réutilisés par les tests */
export function heatCells(o) {
  const series = o.series || [],
    rows = o.rows || [],
    n = series.length,
    ref = refIndex(o, n),
    prev = (o.compareTo || LOOK.compareTo) === 'prev',
    by = o.colorBy || LOOK.colorBy,
    mode = ref < 0 || by === 'value' ? 'value' : by,
    nc = classCount(o);
  /* valeur de comparaison : la colonne de référence, ou la colonne précédente remplie (« colonne précédente ») */
  const base = (r, j) => {
    if (ref < 0) return null;
    if (!prev) return cellVal(r, ref);
    for (let q = j - 1; q >= 0; q--) if (!isHidden(series[q]) && cellVal(r, q) !== null) return cellVal(r, q); // colonnes masquées sautées
    return null;
  };
  /* ligne ou colonne masquée (`hidden`) : ses cases restent calculées (une référence masquée sert encore) mais sortent de l'échelle */
  const cells = rows.map((r) =>
    series.map((sr, j) => {
      const v = cellVal(r, j),
        rv = base(r, j),
        hid = isHidden(r) || isHidden(sr) ? { hidden: true } : null;
      if (v === null) return { kind: 'pending', ...hid };
      if (j === ref) return { kind: 'ref', v, ...hid };
      const delta = rv === null ? null : v - rv,
        pct = rv ? (delta / Math.abs(rv)) * 100 : null;
      return { kind: 'val', v, delta, pct, ...hid };
    }),
  );
  const flat = cells.flat().filter((c) => c.kind === 'val' && !c.hidden);
  const key = mode === 'pct' ? 'pct' : mode === 'abs' ? 'delta' : 'v';
  const scale = { nc, lo: 0, hi: 0, dataTop: 0, up: false, down: false };
  if (mode === 'value') {
    const vs = flat.map((c) => c.v),
      lo = Math.min(0, ...vs),
      hi = scaleTop(o, Math.max(0, ...vs));
    Object.assign(scale, { lo, hi, dataTop: Math.max(0, ...vs) });
    flat.forEach((c) => {
      const k = seqClass(c.v, lo, hi, nc);
      c.fill = o.color2 || LOOK.color2;
      c.alpha = toneAlpha(o, k, nc);
      c.cls = k;
    });
  } else {
    const dataM = Math.max(0, ...flat.map((c) => Math.abs(c[key] ?? 0))),
      M = scaleTop(o, dataM);
    Object.assign(scale, {
      lo: -M,
      hi: M,
      dataTop: dataM,
      up: flat.some((c) => c[key] > 0),
      down: flat.some((c) => c[key] < 0),
    });
    flat.forEach((c) => {
      const k = c[key] == null ? 0 : divClass(c[key], M, nc);
      c.cls = k;
      if (!k) {
        c.fill = NEUTRAL;
        c.alpha = 1;
      } else {
        c.fill = k < 0 ? o.color || LOOK.color : o.color2 || LOOK.color2;
        c.alpha = toneAlpha(o, Math.abs(k), halfOf(nc));
      }
    });
  }
  return { cells, ref, mode, scale };
}

/** Légende en barre de classes (pure, réutilisée par les tests) : { cells, labels, note } ou null s'il n'y a rien à échelonner.
    Libellés aux limites des classes ; note automatique (traduite) sauf `legendNoteText` rempli.
    Que des hausses (ou que des baisses) : seules la classe neutre et les classes de ce sens sont montrées, de 0 au maximum. */
export function heatLegend(o, loc) {
  const { cells, mode, scale: sc } = heatCells(o),
    dec = o.decimals ?? 1,
    nc = sc.nc,
    h = halfOf(nc),
    odd = nc % 2 === 1;
  if (!cells.flat().some((c) => c.kind === 'val' && !c.hidden) || !(sc.hi > sc.lo)) return null;
  const pct = mode === 'pct',
    unit = pct ? pctSign(loc) : o.suffix || '',
    num = (x) => fmt(Math.abs(x), loc, dec) + unit;
  const out = { cells: [], labels: [], note: '' };
  const edge = (i) => sc.lo + (i * (sc.hi - sc.lo)) / nc;
  for (let i = 0; i <= nc; i++) out.labels.push(mode === 'value' ? num(edge(i)) : signed(edge(i), num(edge(i))));
  for (let i = 0; i < nc; i++) {
    if (mode === 'value') out.cells.push({ color: o.color2 || LOOK.color2, alpha: toneAlpha(o, i + 1, nc), path: 'color2' });
    else {
      const k = odd || i < h ? i - h : i - h + 1; // pair : pas de classe neutre (−h…−1, 1…h)
      out.cells.push(
        k === 0
          ? { color: NEUTRAL, alpha: 1 }
          : k < 0
            ? { color: o.color || LOOK.color, alpha: toneAlpha(o, -k, h), path: 'color' }
            : { color: o.color2 || LOOK.color2, alpha: toneAlpha(o, k, h), path: 'color2' },
      );
    }
  }
  /* un seul sens dans les données : la légende ne montre que lui (classe neutre comprise), à partir de 0 */
  if (mode !== 'value' && sc.up !== sc.down) {
    const zero = fmt(0, loc, dec) + unit;
    if (sc.up) {
      out.cells = out.cells.slice(h);
      out.labels = [zero, ...out.labels.slice(h + 1)];
    } else {
      out.cells = out.cells.slice(0, odd ? h + 1 : h);
      out.labels = [...out.labels.slice(0, odd ? h + 1 : h), zero];
    }
  }
  const custom = String(o.legendNoteText ?? '').trim();
  if (custom) out.note = custom;
  else {
    const fixed = sc.hi > sc.dataTop + 1e-9 * Math.abs(sc.hi),
      v = num(sc.hi),
      txt =
        mode === 'value'
          ? fixed
            ? t('Couleur pleine = valeur de {v} ou plus (maximum fixé).')
            : t('Couleur pleine = plus grande valeur du tableau ({v}).')
          : fixed
            ? t('Couleur pleine = écart de {v} ou plus (maximum fixé).')
            : t('Couleur pleine = plus grand écart du tableau ({v}).');
    out.note = txt.replace('{v}', v);
  }
  return out;
}

/* ---------- Mise en forme des textes (lot 2b) ---------- */
/** Interligne des noms et en-têtes sur plusieurs lignes */
const LH = 1.25;
/** Opacité du fond neutre des lignes titre et total (sur une case blanche opaque) */
const BAND_ALPHA = 0.5;
/** Part de la largeur réservée aux noms des lignes (`nameWidth`) ; absente ou `auto` = largeur des noms, 35 % au plus (aspect d'origine) */
const NAME_W = { 20: 0.2, 25: 0.25, 30: 0.3, 35: 0.35, 40: 0.4, 45: 0.45, 50: 0.5 };
/** Type de ligne : préréglage de mise en forme (gras, taille, fond neutre léger) */
export const ROW_KINDS = {
  row: {},
  heading: { bold: true, size: 'large', band: true },
  total: { bold: true, band: true },
};
/** Hiérarchie des lignes : niveau 0 (donnée principale) à 3 (sous-données), `row.level` (absent = 0) ; affiché de 1 à 4 */
export const MAX_LEVEL = 3;
export const levelOf = (r) => Math.max(0, Math.min(MAX_LEVEL, Math.round(+(r && r.level) || 0)));
/** Niveau le plus profond permis pour la ligne i : toujours le dernier (chaque ligne se règle librement, quelles que soient ses voisines) */
export const maxLevelAt = () => MAX_LEVEL;
export function setLevel(r, l) {
  if (l > 0) r.level = l;
  else delete r.level;
}
/** Retrait d'un niveau (px) ; graisse et taille par niveau, seulement quand le tableau a des sous-données */
const INDENT = 9;
const LEVEL_FMT = [{ bold: true }, {}, { bold: false }, { bold: false, size: 'small' }];
/** Mise en forme d'une ligne : niveau (si le tableau en a), préréglage de son type, puis ses propres réglages (`row.fmt` : bold, size, align) */
export const rowFmt = (r, levels = false) => {
  const own = (r && r.fmt) || {},
    out = { ...(levels ? LEVEL_FMT[levelOf(r)] : {}), ...(ROW_KINDS[r && r.kind] || ROW_KINDS.row) };
  for (const k of ['bold', 'size', 'align']) if (own[k] !== undefined && own[k] !== '') out[k] = own[k];
  return out;
};
/** Graisse : gras (700), normal (400) ou celle des libellés de graphique (aspect d'origine) ; `base` = réglage de la carte Textes */
const weightOf = (bold, base) =>
  bold === true || (bold === undefined && base === true) ? 700 : bold === false ? 400 : TYPE.caption.weight;
/** Passage à la ligne mesuré (`mw`) : mots, mots trop longs coupés, retours à la ligne du texte gardés ; au-delà de `max` lignes, la dernière finit par « … » */
export function wrapText(text, weight, family, size, maxW, max = Infinity) {
  const out = [];
  const fits = (x) => mw(x, weight, family, size) <= maxW;
  for (const para of String(text || '').split(/\n/)) {
    let cur = '';
    for (let w of para.split(/\s+/).filter(Boolean)) {
      if (!fits(w)) {
        /* mot plus large que la colonne : coupé en morceaux qui tiennent */
        if (cur) out.push(cur);
        cur = '';
        while (!fits(w) && w.length > 1) {
          let n = w.length - 1;
          while (n > 1 && !fits(w.slice(0, n))) n--;
          out.push(w.slice(0, n));
          w = w.slice(n);
        }
      }
      if (!cur) cur = w;
      else if (fits(cur + ' ' + w)) cur += ' ' + w;
      else {
        out.push(cur);
        cur = w;
      }
    }
    if (cur || !out.length) out.push(cur);
  }
  if (out.length <= max) return out;
  const keep = out.slice(0, max);
  keep[max - 1] = ellipsize(out.slice(max - 1).join(' '), weight, family, size, maxW);
  return keep;
}

/** Groupes de colonnes consécutives de même `group` non vide : [{ name, from, to }] */
export function groupRuns(series) {
  const out = [];
  (series || []).forEach((sr, j) => {
    const g = String((sr && sr.group) || '').trim(),
      last = out[out.length - 1];
    if (!g) return;
    if (last && last.name === g && last.to === j - 1) last.to = j;
    else out.push({ name: g, from: j, to: j });
  });
  return out;
}

const roundRect = (x, y, w, h, r) => {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  if (!r) return `M${x},${y}h${w}v${h}h${-w}Z`;
  return `M${x + r},${y}H${x + w - r}A${r},${r} 0 0 1 ${x + w},${y + r}V${y + h - r}A${r},${r} 0 0 1 ${x + w - r},${y + h}H${x + r}A${r},${r} 0 0 1 ${x},${y + h - r}V${y + r}A${r},${r} 0 0 1 ${x + r},${y}Z`;
};

const hasRef = (o) => String(o.refCol ?? LOOK.refCol) !== 'none';
const REF_WHY = 'Choisissez une colonne de référence pour afficher les écarts.';
const SIZES = { small: 'Petit', normal: 'Normal', large: 'Grand' };
const hasNames = (o) => o.showRowNames !== false;
const hasHeads = (o) => o.showColNames !== false;
const NAMES_WHY = 'Affichez les noms des lignes (Axes et grille) pour les mettre en forme.';
const HEADS_WHY = 'Affichez les noms des colonnes (Axes et grille) pour les mettre en forme.';

export default {
  label: 'Heatmap (écarts à une référence)',
  icon: 'table',
  family: 'compare',
  defaults: () => ({
    ratio: '16:9',
    refCol: '0',
    compareTo: 'ref',
    colorBy: 'abs',
    classes: '7',
    legend: true,
    legendPos: 'bottom',
    legendNote: true,
    showPct: true,
    showDelta: true,
    showRowNames: true,
    showColNames: true,
    decimals: 1,
    suffix: '',
    refText: t('référence'),
    pendingText: t('en attente'),
    color: 'yellow',
    color2: 'blue',
    gap: 3,
    corners: 'round',
    scaleMax: 0,
    nameWrap: true, // nouvelle heatmap : noms et en-têtes passent à la ligne (absent = aspect d'origine, une ligne réduite)
    headWrap: true,
    series: [
      { name: t('Projet'), color: 'grey' },
      { name: t('Position du Conseil'), color: 'grey' },
      { name: t('Position du Parlement'), color: 'grey' },
      { name: t('Accord final'), color: 'grey' },
    ],
    rows: [
      { label: t('Engagements'), v: [797.1, 770.4, 764.9, null] },
      { label: t('Paiements'), v: [742.3, 731.8, 748.6, null] },
      { label: t('Instruments spéciaux'), v: [21.4, 18.9, 20.2, null] },
      { label: t('Marges'), v: [12.8, 14.1, 9.6, null] },
    ],
  }),
  heights: ['ratio', 'fixed', 'fill'],
  editHint: 'Glisser une case pour changer l’ordre des lignes · glisser un nom vers la droite ou la gauche pour changer son niveau (1 à 4)',
  /* glisser un nom horizontalement : un niveau tous les 18 px, entre 0 et 3 */
  edit: {
    start(hit, o, meta, api, pt0) {
      const rows = o.rows || [],
        r = rows[hit.i];
      if (hit.kind !== 'level' || !r) return null;
      const l0 = levelOf(r);
      let moved = false;
      return {
        move(pt) {
          const dx = pt.x - pt0.x;
          if (!moved && Math.abs(dx) < 4) return;
          moved = true;
          const l = Math.max(0, Math.min(MAX_LEVEL, l0 + Math.round(dx / (INDENT * 2))));
          if (l !== levelOf(r)) {
            setLevel(r, l);
            api.redraw();
          }
        },
      };
    },
  },
  fields: [
    {
      k: 'refCol',
      g: 'struct',
      t: 'select',
      label: 'Colonne de référence',
      options: (root) => ({
        none: 'Aucune',
        ...Object.fromEntries(((root && root.series) || []).map((sr, j) => [String(j), sr.name || `${t('Colonne')} ${j + 1}`])),
      }),
      def: LOOK.refCol,
    },
    {
      t: 'node',
      k: 'hiddenInfo',
      g: 'struct',
      when: (o) => (o.rows || []).some(isHidden) || (o.series || []).some(isHidden),
      build: (opts, ctx) => {
        const nr = (opts.rows || []).filter(isHidden).length,
          nc = (opts.series || []).filter(isHidden).length,
          parts = [nr ? `${nr} ${t(nr > 1 ? 'lignes' : 'ligne')}` : '', nc ? `${nc} ${t(nc > 1 ? 'colonnes' : 'colonne')}` : ''];
        const wrap = document.createElement('div');
        wrap.className = 'f hm-hidden';
        const p = document.createElement('p');
        p.className = 'hint';
        p.textContent = t('Masquées (données gardées) : {n}').replace('{n}', parts.filter(Boolean).join(', '));
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'pp-btn';
        b.textContent = t('Tout réafficher');
        b.onclick = () => {
          (opts.rows || []).forEach((r) => delete r.hidden);
          (opts.series || []).forEach((x) => delete x.hidden);
          ctx.restructure();
        };
        wrap.append(p, b);
        return wrap;
      },
    },
    {
      k: 'compareTo',
      g: 'struct',
      t: 'select',
      label: 'Écart calculé par rapport à',
      options: { ref: 'La colonne de référence', prev: 'La colonne précédente' },
      def: LOOK.compareTo,
      when: hasRef,
      why: REF_WHY,
    },
    {
      k: 'colorBy',
      g: 'struct',
      t: 'select',
      label: 'Couleur selon',
      options: { abs: 'Écart absolu', pct: 'Écart en %', value: 'Valeur' },
      def: LOOK.colorBy,
    },
    {
      k: 'ratio',
      t: 'select',
      label: 'Format du graphique',
      options: { '2:1': '2:1 (large)', '16:9': '16:9', '3:2': '3:2', '1:1': '1:1 (carré)' },
    },
    { k: 'gap', g: 'dims', t: 'number', label: 'Espace entre les cases (px)', min: 0, max: 12, def: LOOK.gap },
    { k: 'corners', g: 'dims', t: 'select', label: 'Coins des cases', options: { round: 'Arrondis', square: 'Droits' }, def: LOOK.corners },
    {
      k: 'cellLine',
      g: 'dims',
      t: 'select',
      label: 'Contour des cases',
      options: { none: 'Aucun', thin: 'Fin', medium: 'Moyen' },
      def: LOOK.cellLine,
    },
    {
      k: 'pendingStyle',
      g: 'dims',
      t: 'select',
      label: 'Contour des cases en attente',
      options: { dashed: 'Tirets', dotted: 'Pointillés', solid: 'Trait plein' },
      def: LOOK.pendingStyle,
    },
    { k: 'showRowNames', g: 'axes', t: 'bool', label: 'Noms des lignes', def: true },
    { k: 'showColNames', g: 'axes', t: 'bool', label: 'Noms des colonnes', def: true },
    { k: 'scaleMax', g: 'axes', t: 'number', label: 'Maximum de l’échelle', min: 0, def: 0 },
    {
      k: 'showPct',
      g: 'labels',
      t: 'bool',
      label: 'Écart en %',
      def: true,
      when: hasRef,
      why: REF_WHY,
    },
    {
      k: 'showDelta',
      g: 'labels',
      t: 'bool',
      label: 'Écart absolu',
      def: true,
      when: hasRef,
      why: REF_WHY,
    },
    { k: 'legend', g: 'labels', t: 'bool', label: 'Afficher la légende', def: true },
    {
      k: 'legendPos',
      g: 'labels',
      t: 'select',
      label: 'Position de la légende',
      options: { bottom: 'En bas', top: 'En haut' },
      def: 'bottom',
      when: (o) => o.legend !== false,
      why: 'Activez « Afficher la légende » pour choisir sa position.',
    },
    {
      k: 'legendNote',
      g: 'labels',
      t: 'bool',
      label: 'Note sous la légende',
      def: true,
      when: (o) => o.legend !== false,
      why: 'Activez « Afficher la légende » pour ajouter une note.',
    },
    {
      k: 'legendNoteText',
      g: 'labels',
      t: 'text',
      fmt: 'plain',
      label: 'Texte de la note (vide = note automatique)',
      when: (o) => o.legend !== false && o.legendNote !== false,
      why: 'Activez la note sous la légende pour la modifier.',
    },
    {
      k: 'valueSize',
      g: 'labels',
      t: 'select',
      label: 'Taille du texte des cases',
      options: { small: 'Petit', normal: 'Normal', large: 'Grand' },
      def: LOOK.valueSize,
    },
    { k: 'decimals', g: 'labels', t: 'number', label: 'Décimales des valeurs', min: 0, max: 4 },
    { k: 'suffix', g: 'labels', t: 'text', label: 'Unité après la valeur (%, M€…)' },
    { k: 'refText', g: 'labels', t: 'text', fmt: 'plain', label: 'Texte des cases de référence', when: hasRef },
    { k: 'pendingText', g: 'labels', t: 'text', fmt: 'plain', label: 'Texte des cases vides (en attente)' },
    {
      k: 'color',
      g: 'colors',
      t: 'color',
      label: 'Couleur des baisses',
      def: LOOK.color,
      when: (o) => hasRef(o) && o.colorBy !== 'value',
      why: 'Sans référence ou en couleur selon la valeur, seule la couleur des hausses sert.',
    },
    { k: 'color2', g: 'colors', t: 'color', label: 'Couleur des hausses (et des valeurs)', def: LOOK.color2 },
    {
      k: 'fillTone',
      g: 'colors',
      t: 'select',
      label: 'Intensité des teintes',
      options: { light: 'Légère', normal: 'Normale', strong: 'Marquée' },
      def: LOOK.fillTone,
    },
    { k: 'classes', g: 'colors', t: 'select', label: 'Nombre de classes de couleur', options: CLASSES, def: LOOK.classes },
    {
      k: 'nameWidth',
      g: 'texts',
      s: 'rownames',
      t: 'select',
      label: 'Largeur des noms',
      options: { auto: 'Auto', 20: '20 %', 25: '25 %', 30: '30 %', 35: '35 %', 40: '40 %', 45: '45 %', 50: '50 %' },
      def: 'auto',
      when: hasNames,
      why: NAMES_WHY,
    },
    { k: 'nameWrap', g: 'texts', s: 'rownames', t: 'bool', label: 'Noms sur plusieurs lignes', def: false, when: hasNames, why: NAMES_WHY },
    {
      k: 'nameSize',
      g: 'texts',
      s: 'rownames',
      t: 'select',
      label: 'Taille des noms',
      options: SIZES,
      def: 'normal',
      when: hasNames,
      why: NAMES_WHY,
    },
    { k: 'nameBold', g: 'texts', s: 'rownames', t: 'bool', label: 'Noms en gras', def: false, when: hasNames, why: NAMES_WHY },
    {
      k: 'nameAlign',
      g: 'texts',
      s: 'rownames',
      t: 'select',
      label: 'Alignement des noms',
      options: { left: 'Gauche', center: 'Centre', right: 'Droite' },
      def: 'left',
      when: hasNames,
      why: NAMES_WHY,
    },
    {
      k: 'headWrap',
      g: 'texts',
      s: 'colheads',
      t: 'bool',
      label: 'En-têtes sur plusieurs lignes',
      def: false,
      when: hasHeads,
      why: HEADS_WHY,
    },
    {
      k: 'headSize',
      g: 'texts',
      s: 'colheads',
      t: 'select',
      label: 'Taille des en-têtes',
      options: SIZES,
      def: 'normal',
      when: hasHeads,
      why: HEADS_WHY,
    },
    { k: 'headBold', g: 'texts', s: 'colheads', t: 'bool', label: 'En-têtes en gras', def: false, when: hasHeads, why: HEADS_WHY },
    {
      t: 'table',
      k: 'rows',
      series: 'series',
      maxSeries: 12,
      blank: true,
      noColor: true,
      rowFmt: true, // colonnes Type de ligne, Gras, Taille (row.kind, row.fmt)
      hide: true, // masquer une ligne ou une colonne (row.hidden, series[j].hidden)
      levels: true, // niveau des lignes (row.level, boutons de retrait) et groupe des colonnes (series[j].group)
      serLabel: 'Colonne',
      label: 'Données',
    },
  ],
  dataHint:
    'Une ligne par ligne du tableau, une colonne par colonne (12 au plus). Une cellule laissée vide est dessinée « en attente ». Les écarts sont calculés par rapport à la colonne de référence (Structure). Type de ligne : Titre ou Total mettent la ligne en gras sur un fond neutre léger ; Gras et Taille la règlent une à une.',
  render(o, W, env) {
    const all = heatCells(o),
      ref = all.ref,
      allRows = o.rows || [],
      allSeries = o.series || [];
    /* lignes et colonnes visibles (`hidden` = masquée) ; ri / cj = leurs indices dans les données */
    const ri = allRows.map((r, i) => (isHidden(r) ? -1 : i)).filter((i) => i >= 0),
      cj = allSeries.map((sr, j) => (isHidden(sr) ? -1 : j)).filter((j) => j >= 0);
    const rows = ri.map((i) => allRows[i]),
      series = cj.map((j) => allSeries[j]),
      cells = ri.map((i) => cj.map((j) => all.cells[i][j])),
      nc = Math.max(1, series.length),
      nr = Math.max(1, rows.length);
    const capPx = pxOf(TYPE.caption.size),
      numBase = pxOf(TYPE.captionNum.size),
      gap = Math.max(0, +(o.gap ?? LOOK.gap) || 0),
      radius = (o.corners || LOOK.corners) === 'square' ? 0 : VIZ.barRadius,
      lw = SW * (LINE_K[o.cellLine] ?? 0),
      dec = o.decimals ?? 1,
      suffix = o.suffix || '',
      loc = env.locale;
    const rowNames = o.showRowNames !== false && rows.some((r) => String(r.label || '').trim()),
      colNames = o.showColNames !== false && series.some((sr) => String(sr.name || '').trim());
    /* mise en forme des noms : type de ligne (préréglage) puis réglages de la ligne ; taille et graisse de base dans la carte Textes */
    const levels = rows.some((r) => levelOf(r) > 0),
      indentOf = (r) => (levels ? levelOf(r) * INDENT : 0),
      fmts = rows.map((r) => rowFmt(r, levels)),
      nameK = SIZE_K[o.nameSize] ?? 1,
      namePx = (f) => capPx * nameK * (SIZE_K[f.size] ?? 1),
      nameWt = (f) => weightOf(f.bold, o.nameBold),
      wrapNames = !!o.nameWrap;
    const share = NAME_W[o.nameWidth];
    const nameW = rowNames
      ? share
        ? W * share
        : Math.min(
            W * 0.35,
            Math.max(...rows.map((r, i) => indentOf(r) + mw(String(r.label || ''), nameWt(fmts[i]), SANS, namePx(fmts[i])))) + 9,
          )
      : 0;
    /* noms des lignes : une ligne réduite (aspect d'origine) ou passage à la ligne (`nameWrap`) */
    const nameLines = rows.map((r, i) =>
      rowNames && wrapNames ? wrapText(String(r.label || ''), nameWt(fmts[i]), SANS, namePx(fmts[i]), nameW - 9 - indentOf(r)) : null,
    );
    /* en-têtes de colonnes : même principe (`headWrap`, `headBold`, `headSize`) ; un en-tête vide n'ajoute pas de hauteur */
    const headPx = capPx * (SIZE_K[o.headSize] ?? 1),
      headWt = weightOf(undefined, o.headBold),
      cw0 = Math.max(4, (W - nameW - gap * (nc - 1)) / nc),
      headLines = colNames && o.headWrap ? series.map((sr) => wrapText(String(sr.name || ''), headWt, SANS, headPx, cw0 - 2, 3)) : null,
      headN = headLines ? Math.max(1, ...headLines.map((l) => l.length)) : 1;
    const namesH = !colNames
      ? 0
      : headN > 1 || headPx > capPx
        ? Math.round(Math.max(capPx * 2, (headN - 1) * headPx * LH + headPx + capPx))
        : Math.round(capPx * 2);
    /* colonnes groupées (`series[j].group`) : une bande au-dessus des noms, nom du groupe centré sur ses colonnes et filet dessous */
    const runs = o.showColNames !== false ? groupRuns(series) : [],
      groupH = runs.length ? Math.round(headPx * LH + 6) : 0,
      headH = groupH + namesH;
    let H = Math.max(90, heightOf(o, W, env, null));
    const lg = o.legend !== false ? heatLegend(o, loc) : null;
    if (lg && o.legendNote === false) lg.note = '';
    const lgH = lg ? classBarHeight(W, lg) + VIZ.legendGap : 0; // la légende est dessinée en bas ; « en haut » la remonte (legendTop)
    /* hauteur des lignes : égale (aspect d'origine), sauf si un nom sur plusieurs lignes demande plus ; les autres lignes se partagent le reste */
    const avail = H - lgH - headH - gap * (nr - 1);
    const need = rows.map((r, i) => (nameLines[i] && nameLines[i].length > 1 ? nameLines[i].length * namePx(fmts[i]) * LH + 4 : 0));
    let chs = rows.map(() => Math.max(4, avail / nr));
    if (need.some((n) => n > avail / nr)) {
      const order = need.map((n, i) => i).sort((a, b) => need[b] - need[a]);
      let rest = avail,
        cnt = nr;
      for (const i of order) {
        if (need[i] > rest / cnt && cnt > 0) {
          rest -= need[i];
          cnt--;
        } else break;
      }
      const floor = numBase * 1.25 + 4; // une valeur lisible
      if (cnt > 0 && rest / cnt >= floor) chs = need.map((n) => Math.max(n, rest / cnt));
      else if ((o.hmode || 'ratio') === 'ratio') {
        chs = need.map((n) => Math.max(n, floor)); // format proportionnel : la dataviz grandit
        H += chs.reduce((a, b) => a + b, 0) - avail;
      } else {
        const want = need.map((n) => Math.max(n, floor)),
          tot = want.reduce((a, b) => a + b, 0);
        chs = want.map((n) => Math.max(4, (n * avail) / tot)); // hauteur fixe ou « remplir » : jamais de débordement, les noms sont coupés
      }
    }
    const ys = [];
    chs.reduce((y, ch, i) => ((ys[i] = y), y + ch + gap), headH);
    const cw = cw0,
      x0 = nameW;
    const svg = s('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, style: { display: 'block', overflow: 'visible' } });

    if (colNames)
      series.forEach((sr, j) => {
        const cx = x0 + j * (cw + gap) + cw / 2,
          base = headH - capPx * 0.6;
        if (!String(sr.name || '').trim()) return;
        if (headLines) {
          const ls = headLines[j];
          ls.forEach((l, k) =>
            svg.append(
              s(
                'text',
                { x: cx, y: base - (ls.length - 1 - k) * headPx * LH, 'text-anchor': 'middle', 'font-size': headPx, 'font-weight': headWt },
                l,
              ),
            ),
          );
          return;
        }
        const f = fitText(String(sr.name || ''), headWt, SANS, headPx, cw - 2, 0.6);
        svg.append(s('text', { x: cx, y: base, 'text-anchor': 'middle', 'font-size': f.size, 'font-weight': headWt }, f.text));
      });

    runs.forEach((g) => {
      const xa = x0 + g.from * (cw + gap),
        xb = x0 + g.to * (cw + gap) + cw,
        f = fitText(g.name, 700, SANS, headPx, xb - xa - 2, 0.6);
      svg.append(
        s(
          'text',
          {
            x: (xa + xb) / 2,
            y: (headPx * LH) / 2 + 0.33 * f.size,
            'text-anchor': 'middle',
            'font-size': f.size,
            'font-weight': 700,
            class: 'hm-group',
          },
          f.text,
        ),
        s('line', {
          x1: xa + 1,
          x2: xb - 1,
          y1: groupH - 3,
          y2: groupH - 3,
          stroke: 'currentColor',
          'stroke-width': SW,
          class: 'hm-group-rule',
        }),
      );
    });

    /* lignes de texte d'une case : valeur (chiffre des graphiques), puis écarts plus petits */
    const linesOf = (c) => {
      if (c.kind === 'pending') return [{ txt: o.pendingText ?? t('en attente'), small: true }];
      const out = [{ txt: fmt(c.v, loc, dec) + suffix, num: true }];
      if (c.kind === 'ref') {
        const rt = String(o.refText ?? t('référence')).trim();
        if (rt) out.push({ txt: rt, small: true });
        return out;
      }
      if (ref >= 0 && o.showPct !== false && c.pct != null)
        out.push({ txt: signed(c.pct, fmt(Math.abs(c.pct), loc, dec) + pctSign(loc)), small: true });
      if (ref >= 0 && o.showDelta !== false && c.delta != null)
        out.push({ txt: signed(c.delta, fmt(Math.abs(c.delta), loc, dec) + suffix), small: true });
      return out;
    };
    const sizeK = SIZE_K[o.valueSize] ?? 1;
    const textBlock = (lines, cx, cy, maxW, maxH, fill, rk = 1) => {
      const numPx = numBase * sizeK * rk,
        smallPx = capPx * 0.9 * sizeK * rk;
      const need = (ls, k) => ls.reduce((a, l) => a + (l.num ? numPx : smallPx) * k * 1.25, 0);
      let ls = lines.slice(),
        k = 1;
      while (ls.length > 1 && need(ls, 0.7) > maxH) ls = ls.slice(0, -1); // trop bas : les dernières lignes tombent
      if (need(ls, 1) > maxH) k = Math.max(0.6, maxH / need(ls, 1));
      let y = cy - need(ls, k) / 2;
      const g = s('g', { fill });
      ls.forEach((l) => {
        const px = (l.num ? numPx : smallPx) * k,
          f = l.num
            ? fitText(l.txt, 700, SERIF, px, maxW, 0.5)
            : fitText(l.txt, l.small && !l.num ? 400 : TYPE.caption.weight, SANS, px, maxW, 0.6);
        g.append(
          s(
            'text',
            {
              x: cx,
              y: y + px * 1.25 * 0.5 + 0.33 * f.size,
              'text-anchor': 'middle',
              'font-size': f.size,
              'font-weight': l.num ? 700 : 400,
              style: l.num ? { fontFamily: 'var(--t-captionNum-family)' } : null,
            },
            f.text,
          ),
        );
        y += px * 1.25;
      });
      return g;
    };

    rows.forEach((r, i) => {
      const y = ys[i],
        ch = chs[i],
        fm = fmts[i];
      /* ligne titre ou total : fond neutre léger sous toute la ligne (case blanche opaque dessous, comme les cases) */
      if (fm.band) {
        const d = roundRect(0, y, W, ch, radius);
        svg.append(s('path', { d, fill: '#FFFFFF' }));
        svg.append(s('path', { d, fill: colorRef(NEUTRAL), 'fill-opacity': BAND_ALPHA, class: 'hm-band' }));
      }
      if (rowNames) {
        const px = namePx(fm),
          wt = nameWt(fm),
          al = fm.align || o.nameAlign || 'left',
          ind = indentOf(r),
          pad = (fm.band ? 4 : 0) + ind,
          tw = nameW - 9 - pad,
          tx = al === 'center' ? pad + tw / 2 : al === 'right' ? nameW - 9 : pad,
          anchor = al === 'center' ? 'middle' : al === 'right' ? 'end' : null;
        if (nameLines[i]) {
          let ls = nameLines[i];
          const fit = Math.max(1, Math.floor((ch - 2) / (px * LH)));
          if (ls.length > fit) ls = wrapText(String(r.label || ''), wt, SANS, px, tw, fit);
          else if (fm.band) ls = wrapText(String(r.label || ''), wt, SANS, px, tw);
          const top = y + ch / 2 - (ls.length * px * LH) / 2;
          ls.forEach((l, k) =>
            svg.append(
              s(
                'text',
                {
                  x: tx,
                  y: top + (k + 0.5) * px * LH + 0.33 * px,
                  'text-anchor': anchor,
                  'font-size': px,
                  'font-weight': wt,
                  class: 'hm-name',
                },
                l,
              ),
            ),
          );
        } else {
          const f = fitText(String(r.label || ''), wt, SANS, px, tw, 0.6);
          svg.append(
            s(
              'text',
              { x: tx, y: y + ch / 2 + 0.33 * f.size, 'text-anchor': anchor, 'font-size': f.size, 'font-weight': wt, class: 'hm-name' },
              f.text,
            ),
          );
        }
      }
      const rk = SIZE_K[fm.size] ?? 1;
      cells[i].forEach((c, j) => {
        const x = x0 + j * (cw + gap),
          d = roundRect(x, y, cw, ch, radius);
        let ink = 'currentColor';
        if (c.kind === 'pending') {
          const inset = SW / 2;
          svg.append(
            s('path', {
              d: roundRect(x + inset, y + inset, cw - SW, ch - SW, radius),
              fill: 'none',
              stroke: 'currentColor',
              'stroke-width': SW,
              'stroke-dasharray': o.pendingStyle in PENDING_DASH ? PENDING_DASH[o.pendingStyle] : PENDING_DASH.dashed,
              class: 'hm-pending',
            }),
          );
        } else {
          const key = c.kind === 'ref' ? NEUTRAL : c.fill,
            alpha = c.kind === 'ref' ? 1 : c.alpha;
          const dc = lw ? roundRect(x + lw / 2, y + lw / 2, cw - lw, ch - lw, Math.max(0, radius - lw / 2)) : d; // le contour reste dans la case
          svg.append(s('path', { d: dc, fill: '#FFFFFF' })); // case opaque : la teinte ne se mélange pas au fond de la section
          svg.append(
            s('path', {
              d: dc,
              ...(lw ? { stroke: 'currentColor', 'stroke-width': lw } : {}),
              fill: colorRef(key),
              'fill-opacity': alpha < 1 ? +alpha.toFixed(3) : null,
              class: c.kind === 'ref' ? 'hm-ref' : 'hm-cell',
              'data-cls': c.kind === 'ref' ? null : c.cls,
              'data-color': env.ui && c.kind === 'val' && c.cls ? (c.cls < 0 ? 'color' : 'color2') : null,
            }),
          );
          ink = inkOn(env, key, alpha);
        }
        svg.append(textBlock(linesOf(c), x + cw / 2, y + ch / 2, cw - 6, ch - 4, ink, rk));
      });
    });
    if (lg) drawLegend(svg, [], H - lgH + VIZ.legendGap, W, null, lg);
    rows.forEach((_, i) => svg.append(reorderHit(env, 'rows', ri[i], 'y', 0, ys[i] - gap / 2, W, chs[i] + gap)));
    /* éditeur : glisser un nom vers la droite ou la gauche change son niveau (au-dessus de la zone de réordonnancement) */
    if (env.ui && rowNames)
      rows.forEach((_, i) =>
        svg.append(
          s('rect', {
            x: 0,
            y: ys[i],
            width: Math.max(1, nameW - 9),
            height: Math.max(1, chs[i]),
            fill: 'rgba(0,0,0,0)',
            'data-hit': `level:${ri[i]}`,
            style: { cursor: 'ew-resize' },
          }),
        ),
      );
    return { node: svg };
  },
};
