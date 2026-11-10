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
  mw,
  heightOf,
  inkOn,
  reorderHit,
  scaleTop,
  drawLegend,
  classBarHeight,
} from './util.js';

const NEUTRAL = 'grey'; // couleur neutre de la palette : cases de référence et écart nul
const CLASSES = { 3: '3', 5: '5', 7: '7' };
const LOOK = { refCol: '0', compareTo: 'ref', colorBy: 'abs', classes: '7', color: 'yellow', color2: 'blue', gap: 3, corners: 'round' };

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
/** Classe d'un écart d sur une échelle divergente de n classes (impair) : −h…h, 0 = classe neutre autour de zéro */
export function divClass(d, M, n) {
  const h = (n - 1) / 2;
  if (!(M > 0) || !d) return 0;
  const k = Math.min(h, Math.floor((Math.abs(d) / M) * (n / 2) + 0.5));
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
    nc = +o.classes || +LOOK.classes;
  /* valeur de comparaison : la colonne de référence, ou la colonne précédente remplie (« colonne précédente ») */
  const base = (r, j) => {
    if (ref < 0) return null;
    if (!prev) return cellVal(r, ref);
    for (let q = j - 1; q >= 0; q--) if (cellVal(r, q) !== null) return cellVal(r, q);
    return null;
  };
  const cells = rows.map((r) =>
    series.map((_, j) => {
      const v = cellVal(r, j),
        rv = base(r, j);
      if (v === null) return { kind: 'pending' };
      if (j === ref) return { kind: 'ref', v };
      const delta = rv === null ? null : v - rv,
        pct = rv ? (delta / Math.abs(rv)) * 100 : null;
      return { kind: 'val', v, delta, pct };
    }),
  );
  const flat = cells.flat().filter((c) => c.kind === 'val');
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
      c.alpha = classAlpha(k, nc);
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
        c.alpha = classAlpha(Math.abs(k), (nc - 1) / 2);
      }
    });
  }
  return { cells, ref, mode, scale };
}

/** Légende en barre de classes (pure, réutilisée par les tests) : { cells, labels, note } ou null s'il n'y a rien à échelonner.
    Libellés aux limites des classes ; note automatique (traduite) sauf `legendNoteText` rempli. */
export function heatLegend(o, loc) {
  const { cells, mode, scale: sc } = heatCells(o),
    dec = o.decimals ?? 1,
    nc = sc.nc,
    h = (nc - 1) / 2;
  if (!cells.flat().some((c) => c.kind === 'val') || !(sc.hi > sc.lo)) return null;
  const pct = mode === 'pct',
    unit = pct ? pctSign(loc) : o.suffix || '',
    num = (x) => fmt(Math.abs(x), loc, dec) + unit;
  const out = { cells: [], labels: [], note: '' };
  const edge = (i) => sc.lo + (i * (sc.hi - sc.lo)) / nc;
  for (let i = 0; i <= nc; i++) out.labels.push(mode === 'value' ? num(edge(i)) : signed(edge(i), num(edge(i))));
  for (let i = 0; i < nc; i++) {
    if (mode === 'value') out.cells.push({ color: o.color2 || LOOK.color2, alpha: classAlpha(i + 1, nc), path: 'color2' });
    else {
      const k = i - h;
      out.cells.push(
        k === 0
          ? { color: NEUTRAL, alpha: 1 }
          : k < 0
            ? { color: o.color || LOOK.color, alpha: classAlpha(-k, h), path: 'color' }
            : { color: o.color2 || LOOK.color2, alpha: classAlpha(k, h), path: 'color2' },
      );
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
    const parts = [txt.replace('{v}', v)];
    if (mode !== 'value' && !sc.up) parts.push(t('Aucune hausse dans les données.'));
    else if (mode !== 'value' && !sc.down) parts.push(t('Aucune baisse dans les données.'));
    out.note = parts.join(' ');
  }
  return out;
}

const roundRect = (x, y, w, h, r) => {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  if (!r) return `M${x},${y}h${w}v${h}h${-w}Z`;
  return `M${x + r},${y}H${x + w - r}A${r},${r} 0 0 1 ${x + w},${y + r}V${y + h - r}A${r},${r} 0 0 1 ${x + w - r},${y + h}H${x + r}A${r},${r} 0 0 1 ${x},${y + h - r}V${y + r}A${r},${r} 0 0 1 ${x + r},${y}Z`;
};

const hasRef = (o) => String(o.refCol ?? LOOK.refCol) !== 'none';
const REF_WHY = 'Choisissez une colonne de référence pour afficher les écarts.';

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
    { k: 'classes', g: 'colors', t: 'select', label: 'Nombre de classes de couleur', options: CLASSES, def: LOOK.classes },
    {
      t: 'table',
      k: 'rows',
      series: 'series',
      maxSeries: 12,
      blank: true,
      noColor: true,
      serLabel: 'Colonne',
      label: 'Données',
    },
  ],
  dataHint:
    'Une ligne par ligne du tableau, une colonne par colonne (12 au plus). Une cellule laissée vide est dessinée « en attente ». Les écarts sont calculés par rapport à la colonne de référence (Structure).',
  render(o, W, env) {
    const series = o.series || [],
      rows = o.rows || [],
      nc = Math.max(1, series.length),
      nr = Math.max(1, rows.length);
    const { cells, ref } = heatCells(o);
    const capPx = pxOf(TYPE.caption.size),
      numPx = pxOf(TYPE.captionNum.size),
      gap = Math.max(0, +(o.gap ?? LOOK.gap) || 0),
      radius = (o.corners || LOOK.corners) === 'square' ? 0 : VIZ.barRadius,
      dec = o.decimals ?? 1,
      suffix = o.suffix || '',
      loc = env.locale;
    const rowNames = o.showRowNames !== false && rows.some((r) => String(r.label || '').trim()),
      colNames = o.showColNames !== false && series.some((sr) => String(sr.name || '').trim());
    const nameW = rowNames
      ? Math.min(W * 0.35, Math.max(...rows.map((r) => mw(String(r.label || ''), TYPE.caption.weight, SANS, capPx))) + 9)
      : 0;
    const headH = colNames ? Math.round(capPx * 2) : 0;
    const H = Math.max(90, heightOf(o, W, env, null));
    const lg = o.legend !== false ? heatLegend(o, loc) : null;
    if (lg && o.legendNote === false) lg.note = '';
    const lgH = lg ? classBarHeight(W, lg) + VIZ.legendGap : 0; // la légende est dessinée en bas ; « en haut » la remonte (legendTop)
    const cw = Math.max(4, (W - nameW - gap * (nc - 1)) / nc),
      ch = Math.max(4, (H - lgH - headH - gap * (nr - 1)) / nr),
      x0 = nameW,
      y0 = headH;
    const svg = s('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, style: { display: 'block', overflow: 'visible' } });

    if (colNames)
      series.forEach((sr, j) => {
        const f = fitText(String(sr.name || ''), TYPE.caption.weight, SANS, capPx, cw - 2, 0.6);
        svg.append(
          s(
            'text',
            {
              x: x0 + j * (cw + gap) + cw / 2,
              y: headH - capPx * 0.6,
              'text-anchor': 'middle',
              'font-size': f.size,
              'font-weight': TYPE.caption.weight,
            },
            f.text,
          ),
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
    const smallPx = capPx * 0.9;
    const textBlock = (lines, cx, cy, maxW, maxH, fill) => {
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
      const y = y0 + i * (ch + gap);
      if (rowNames) {
        const f = fitText(String(r.label || ''), TYPE.caption.weight, SANS, capPx, nameW - 9, 0.6);
        svg.append(s('text', { x: 0, y: y + ch / 2 + 0.33 * f.size, 'font-size': f.size, 'font-weight': TYPE.caption.weight }, f.text));
      }
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
              'stroke-dasharray': '3 2',
              class: 'hm-pending',
            }),
          );
        } else {
          const key = c.kind === 'ref' ? NEUTRAL : c.fill,
            alpha = c.kind === 'ref' ? 1 : c.alpha;
          svg.append(s('path', { d, fill: '#FFFFFF' })); // case opaque : la teinte ne se mélange pas au fond de la section
          svg.append(
            s('path', {
              d,
              fill: colorRef(key),
              'fill-opacity': alpha < 1 ? +alpha.toFixed(3) : null,
              class: c.kind === 'ref' ? 'hm-ref' : 'hm-cell',
              'data-cls': c.kind === 'ref' ? null : c.cls,
              'data-color': env.ui && c.kind === 'val' && c.cls ? (c.cls < 0 ? 'color' : 'color2') : null,
            }),
          );
          ink = inkOn(env, key, alpha);
        }
        svg.append(textBlock(linesOf(c), x + cw / 2, y + ch / 2, cw - 6, ch - 4, ink));
      });
    });
    if (lg) drawLegend(svg, [], H - lgH + VIZ.legendGap, W, null, lg);
    rows.forEach((_, i) => svg.append(reorderHit(env, 'rows', i, 'y', 0, y0 + i * (ch + gap) - gap / 2, W, ch + gap)));
    return { node: svg };
  },
};
