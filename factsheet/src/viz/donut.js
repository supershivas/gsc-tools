/* Anneau : segments proportionnels, total au centre (Source Serif 4),
   libellés autour de l'anneau avec traits de repère (colonnes larges)
   ou en légende sous l'anneau (colonnes étroites). Logique reprise de donut-export. */
import { VIZ, TYPE, TINT } from '../tokens.js';
import { s, SW, lineAttrs, LINE_FIELD, colorRef, pxOf, fmt, mw, SERIF, SANS, round3, richLines, drawRich, typeIn, inkOn } from './util.js';
import { t } from '../i18n.js';

const LEAD = { tight: 15, normal: 18, loose: 21 }; // interlignage des textes (px) : « normal » = 18, un peu plus serré que le corps de texte (21)
const rad = (d) => (d * Math.PI) / 180;

function resolveColumn(items, topLim, gap) {
  // empile sans chevauchement, du haut vers le bas
  items.sort((a, b) => a.want - b.want);
  let prev = -1e9;
  for (const it of items) {
    it.top = Math.max(it.want, prev === -1e9 ? topLim : prev + gap, topLim);
    prev = it.top + it.h;
  }
}

function clearManual(o) {
  (o.segments || []).forEach((g) => {
    delete g.pin;
    delete g.anchorT;
    delete g.side;
  });
}
const norm = (a) => ((a % 360) + 360) % 360;
const hasLabel = (g) => !!(String(g.title || '').trim() || String(g.text || '').trim()); // un segment sans titre ni texte n'a ni libellé ni trait de repère
const ORANGE = '#F28C28';
/* Réglages d'apparence (audit des options, lot 5a) : la valeur d'origine est le `def` de chaque champ, aucune clé n'est écrite dans `defaults()` ni `migrate`. */
const RING_PCT = { thin: 0.1, normal: VIZ.ringPct, thick: 0.24 }; // épaisseur de l'anneau / rayon extérieur
const SEG_GAP = { none: 0, thin: 2, wide: 5 }; // largeur (px) du liseré de la couleur du fond entre les segments

/** Style d'une partie des libellés (titre ou texte) d'après un style du document (`T` = styles du rendu, menu Texte).
    Défauts (titre « Texte gras », texte « Texte ») : corps du texte courant et interlignage `leading`, comme avant les styles. */
function labelSpec(T, key, LH, title) {
  const BODY = pxOf(T.body.size);
  if (key === 'bold' || key === 'body') return { size: BODY, lh: LH, family: SANS, weight: 400, bold: key === 'bold' };
  if (key === 'small' || key === 'caption') {
    const size = pxOf(T[key].size);
    return {
      size,
      lh: Math.max(Math.ceil((size * 1.15) / 1.5) * 1.5, Math.round((LH * (size / BODY)) / 1.5) * 1.5),
      family: SANS,
      weight: 400,
      bold: title,
    };
  }
  const ty = T[key] || T.bodyBold,
    size = pxOf(ty.size),
    serif = ty.family === 'serif';
  return {
    size,
    lh: Math.max(ty.lh, Math.ceil((size * 1.05) / 1.5) * 1.5),
    family: serif ? SERIF : SANS,
    fam: serif ? `var(--t-${key}-family)` : null,
    weight: ty.weight,
    bold: false,
  };
}

/** Comparaison : deux anneaux côte à côte (valeurs `value` puis `value2` de chaque segment), chacun avec son titre et ses libellés.
    Le 2e part du même angle que le 1er (mêmes catégories au même endroit) ; « surface proportionnelle » rétrécit celui du plus petit total. */
function renderCompare(o, W, env) {
  const T = typeIn(env),
    gapX = (env.rc && env.rc.gutter) || 18,
    hw = Math.max(60, (W - gapX) / 2);
  const segs = o.segments || [];
  const half = (k) => ({
    ...o,
    _sub: true,
    ringX: 0,
    segments: segs.map((g) => ({
      ...g,
      value: k ? (g.value2 ?? 0) : g.value,
      title: k && String(g.title2 || '').trim() ? g.title2 : g.title,
    })),
  });
  const A = half(0),
    B = half(1);
  const sum = (x) => x.segments.reduce((a, g) => a + Math.max(0, +g.value || 0), 0),
    tA = sum(A),
    tB = sum(B);
  if (o.cmpScale === 'area' && tA > 0 && tB > 0) {
    if (tA > tB) B._k = Math.sqrt(tB / tA);
    else A._k = Math.sqrt(tA / tB);
  }
  /* légende commune (`cmpLegend` : top | bottom | left | right) : camemberts sans libellés ni traits, une seule légende classique
     (pastille + texte de chaque segment, son titre s'il n'a pas de texte) ; `each` (défaut) = libellés de chaque camembert */
  const pos = ['top', 'bottom', 'left', 'right'].includes(o.cmpLegend) ? o.cmpLegend : null;
  const BODY = pxOf(T.body.size),
    LH = Math.round(((LEAD[o.leading] || LEAD.normal) * (T.body.size / TYPE.body.size)) / 1.5) * 1.5;
  const textSpec = labelSpec(T, o.labelText || 'body', LH, false),
    titleSpec = labelSpec(T, o.labelTitle || 'bold', LH, true);
  const legItems = pos
    ? segs
        .filter((g) => (+g.value > 0 || +g.value2 > 0) && hasLabel(g))
        .map((g) => (String(g.text || '').trim() ? { g, text: g.text, spec: textSpec } : { g, text: g.title, spec: titleSpec }))
    : [];
  const sw = VIZ.legendSwatch,
    tx = sw + VIZ.iconGap;
  const side = pos === 'left' || pos === 'right';
  const natW = Math.max(0, ...legItems.map((it) => Math.max(0, ...richLines(it.text, it.spec, 1e6).map((l) => l.w)))) + tx;
  const legW = side ? Math.max(120, Math.min(W * 0.4, natW)) : W;
  /* légende : colonnes (en haut ou en bas, autant que la largeur en permet) ou une seule colonne (à gauche ou à droite) */
  const cols = side ? 1 : Math.max(1, Math.min(legItems.length, Math.floor((W + gapX) / (Math.min(natW, 260) + gapX)))),
    colW = (legW - (cols - 1) * gapX) / cols;
  const placed = legItems.map((it) => {
    const lines = richLines(it.text, it.spec, Math.max(24, colW - tx));
    return { ...it, lines, h: lines.reduce((a, l) => a + l.lh, 0) };
  });
  const rowsH = [];
  placed.forEach((it, n) => {
    const r = Math.floor(n / cols);
    rowsH[r] = Math.max(rowsH[r] || 0, it.h);
  });
  const legH = rowsH.reduce((a, h) => a + h, 0) + Math.max(0, rowsH.length - 1) * VIZ.blockGap;
  /* zone des camemberts */
  const areaW = side && placed.length ? Math.max(120, W - legW - gapX * 2) : W,
    areaX = pos === 'left' && placed.length ? legW + gapX * 2 : 0,
    pw = Math.max(60, (areaW - gapX) / 2);
  if (pos) A.layout = B.layout = 'none';
  const rA = DONUT.render(A, pw, env);
  B.orient = 'manual';
  B.startAngle = rA.meta ? rA.meta.start : 0;
  const rB = DONUT.render(B, pw, env);
  /* titres des deux camemberts (ex. 2024 / 2025), au-dessus, dans le style choisi */
  const st = o.cmpTitleStyle || 'caption',
    spec =
      st === 'caption'
        ? { size: pxOf(T.caption.size), lh: T.caption.lh, family: SANS, weight: 400, bold: true }
        : st === 'bold'
          ? { size: BODY, lh: T.bodyBold.lh, family: SANS, weight: 400, bold: true }
          : labelSpec(T, 'subsection', T.body.lh, true);
  const tl = [o.cmpTitle1, o.cmpTitle2].map((x) => (String(x || '').trim() ? richLines(x, spec, pw) : []));
  const th = Math.max(...tl.map((l) => l.reduce((a, x) => a + x.lh, 0)));
  const titleH = th ? th + VIZ.blockGap : 0;
  const hOf = (r) => (r && r.node ? +r.node.getAttribute('height') || 0 : 0);
  const pieH = titleH + Math.max(hOf(rA), hOf(rB));
  const legGap = placed.length && !side ? env.rc.gap.subsectionTitle * 2 : 0,
    pieY = pos === 'top' && placed.length ? legH + legGap : 0,
    legY = !placed.length ? 0 : pos === 'top' ? 0 : pos === 'bottom' ? pieH + legGap : Math.max(0, (pieH - legH) / 2 + titleH / 2),
    legX = pos === 'right' ? W - legW : 0;
  const H = Math.ceil(side ? Math.max(pieH, legY + legH) : pieH + (placed.length ? legH + legGap : 0));
  const svg = s('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, style: { display: 'block', overflow: 'visible' } });
  [rA, rB].forEach((r, k) => {
    const x = areaX + (k ? areaW - pw : 0);
    if (tl[k].length) svg.append(drawRich(tl[k], x, pieY));
    if (!r || !r.node) return;
    const g = s('g', { transform: `translate(${x} ${pieY + titleH})` });
    g.append(...r.node.childNodes);
    g.querySelectorAll('[data-hit]').forEach((n) => n.removeAttribute('data-hit')); // pas de glisser dans la comparaison : réglages par les champs
    svg.append(g);
  });
  if (placed.length) {
    const lg = s('g', { class: 'cmp-legend' });
    let y = legY;
    placed.forEach((it, n) => {
      const c = n % cols,
        r = Math.floor(n / cols),
        x = legX + c * (colW + gapX);
      if (c === 0 && r > 0) y += rowsH[r - 1] + VIZ.blockGap;
      const lh0 = it.lines.length ? it.lines[0].lh : LH;
      lg.append(
        s('rect', {
          'data-color': env.ui ? `segments.${segs.indexOf(it.g)}.color` : null,
          x: x + SW / 2,
          y: y + (lh0 - sw) / 2 + SW / 2,
          width: sw - SW,
          height: sw - SW,
          rx: VIZ.barRadius,
          fill: colorRef(it.g.color),
          stroke: 'currentColor',
          'stroke-width': SW,
        }),
        drawRich(it.lines, x + tx, y),
      );
    });
    svg.append(lg);
  }
  return { node: svg };
}

const DONUT = {
  label: 'Anneau / camembert',
  icon: 'chart-donut',
  family: 'part',
  boxed: true,
  heights: ['auto', 'fixed', 'fill'],
  defaults: () => ({
    style: 'donut',
    linkExtra: 24,
    linkColor: 'blue',
    totalTpl: '€{total}\nbillion',
    decimals: 1,
    layout: 'auto',
    orient: 'largest',
    largestAngle: 210,
    startAngle: 0,
    segments: [
      {
        color: 'grey',
        value: 114.4,
        title: '€114.4 billion',
        text: 'provided from or guaranteed by the EU budget (including **€43.9 billion** within Ukraine Facility and **€16.9 billion** from Ukraine Support Loan)',
      },
      { color: 'blue', value: 77.9, title: '€77.9 billion', text: 'in military support from Member States' },
      { color: 'slate', value: 17, title: '€17 billion', text: 'in support for Ukrainian refugees in the EU' },
      {
        color: 'yellow',
        value: 15.5,
        title: '€15.5 billion',
        text: 'of grants, loans and guarantees provided by EU Member States for non-military support',
      },
      { color: 'sky', value: 3.8, title: '€3.8 billion', text: 'in proceeds from immobilised Russian assets' },
    ],
  }),
  fields: [
    { k: 'style', g: 'struct', t: 'select', label: 'Forme', options: { donut: 'Anneau (total au centre)', pie: 'Camembert' } },
    {
      k: 'showTotal',
      g: 'labels',
      when: (o) => o.style !== 'pie',
      t: 'bool',
      label: 'Texte au centre de l’anneau',
      def: true,
    },
    {
      k: 'ringX',
      g: 'struct',
      when: (o) => !o.compare,
      why: 'Désactivez la comparaison pour déplacer l’anneau.',
      t: 'number',
      label:
        'Position horizontale de l’anneau (−100 = à gauche, 0 = centré, 100 = à droite ; se règle aussi en tirant la poignée du centre)',
      min: -100,
      max: 100,
      def: 0,
    },
    {
      k: 'compare',
      g: 'struct',
      t: 'bool',
      label: 'Comparer deux camemberts côte à côte (2e valeur de chaque segment)',
    },
    {
      k: 'cmpScale',
      g: 'struct',
      when: (o) => !!o.compare,
      why: 'Activez la comparaison pour choisir la taille des deux camemberts.',
      t: 'select',
      label: 'Taille des deux camemberts',
      options: { same: 'Même taille', area: 'Surface proportionnelle au total' },
      def: 'same',
    },
    {
      k: 'cmpTitle1',
      g: 'labels',
      when: (o) => !!o.compare,
      t: 'text',
      fmt: 'chart',
      label: 'Titre du 1er camembert (ex. 2024)',
    },
    {
      k: 'cmpTitle2',
      g: 'labels',
      when: (o) => !!o.compare,
      t: 'text',
      fmt: 'chart',
      label: 'Titre du 2e camembert (ex. 2025)',
    },
    {
      k: 'segValues',
      g: 'labels',
      t: 'select',
      label: 'Valeur dans chaque segment (seulement si elle tient : un anneau épais en accueille plus)',
      options: { none: 'Aucune', value: 'Valeur', pct: 'Pourcentage du total' },
      def: 'none',
    },
    {
      k: 'segDecimals',
      g: 'labels',
      when: (o) => o.segValues === 'value' || o.segValues === 'pct',
      why: 'Choisissez une valeur dans les segments pour régler ses décimales.',
      t: 'number',
      label: 'Décimales des valeurs des segments',
      min: 0,
      max: 4,
      def: 0,
    },
    {
      k: 'segPrefix',
      g: 'labels',
      when: (o) => o.segValues === 'value',
      why: 'Choisissez « Valeur » pour écrire une unité.',
      t: 'text',
      fmt: 'plain',
      single: true,
      label: 'Avant la valeur du segment (€…)',
    },
    {
      k: 'segSuffix',
      g: 'labels',
      when: (o) => o.segValues === 'value',
      why: 'Choisissez « Valeur » pour écrire une unité.',
      t: 'text',
      fmt: 'plain',
      single: true,
      label: 'Après la valeur du segment ( bn, %…)',
    },
    {
      k: 'cmpLegend',
      g: 'labels',
      when: (o) => !!o.compare,
      why: 'Activez la comparaison pour choisir une légende commune.',
      t: 'select',
      label: 'Libellés des deux camemberts',
      options: {
        each: 'Libellés de chaque camembert',
        bottom: 'Légende commune en bas',
        top: 'Légende commune en haut',
        right: 'Légende commune à droite',
        left: 'Légende commune à gauche',
      },
      def: 'each',
    },
    {
      k: 'cmpTitleStyle',
      g: 'texts',
      when: (o) => !!o.compare,
      why: 'Activez la comparaison pour régler le style des titres des camemberts.',
      t: 'select',
      label: 'Style des titres des camemberts',
      options: { caption: 'Légende (gras)', bold: 'Texte gras', subsection: 'Sous-section' },
      def: 'caption',
    },
    {
      k: 'labelTitle',
      g: 'texts',
      when: (o) => o.layout !== 'none',
      t: 'select',
      label: 'Style des titres des libellés',
      options: { bold: 'Texte gras', body: 'Texte', subsection: 'Sous-section', figureSm: 'Chiffre clé (petit)' },
      def: 'bold',
    },
    {
      k: 'labelText',
      g: 'texts',
      when: (o) => o.layout !== 'none',
      t: 'select',
      label: 'Style des textes des libellés',
      options: { body: 'Texte', small: 'Texte petit', caption: 'Légende' },
      def: 'body',
    },
    { ...LINE_FIELD, label: 'Contour des segments' },
    {
      k: 'ringWidth',
      g: 'dims',
      when: (o) => o.style !== 'pie',
      t: 'select',
      label: 'Épaisseur de l’anneau',
      options: { thin: 'Fin', normal: 'Normal', thick: 'Épais' },
      def: 'normal',
    },
    {
      k: 'segGap',
      g: 'dims',
      t: 'select',
      label: 'Séparation des segments',
      options: { none: 'Aucune', thin: 'Fine', wide: 'Large' },
      def: 'none',
    },
    { k: 'totalTpl', g: 'labels', when: (o) => o.style !== 'pie' && o.showTotal !== false, t: 'ctext', label: 'Texte du centre' },
    {
      k: 'decimals',
      g: 'labels',
      when: (o) => o.style !== 'pie' && o.showTotal !== false,
      t: 'number',
      label: 'Décimales du total',
      min: 0,
      max: 4,
    },
    {
      k: 'ringAlign',
      g: 'struct',
      t: 'select',
      label: 'Position verticale de l’anneau',
      options: { top: 'En haut', center: 'Centré sur le contenu', bottom: 'En bas' },
    },
    {
      k: 'leading',
      g: 'labels',
      t: 'select',
      label: 'Interlignage des textes',
      options: { tight: 'Serré (15 px)', normal: 'Normal (18 px)', loose: 'Large (21 px)' },
      def: 'normal',
    },
    {
      k: 'layout',
      g: 'labels',
      t: 'select',
      label: 'Libellés',
      options: {
        auto: 'Auto (selon la largeur)',
        around: 'Autour de l’anneau',
        legend: 'Légende sous l’anneau',
        none: 'Aucun (anneau seul)',
      },
    },
    { k: 'linkExtra', g: 'bracket', t: 'number', label: 'Trait de liaison : longueur au-delà de la colonne (px)', min: 0, max: 120 },
    {
      k: 'linkColor',
      g: 'bracket',
      when: (o) => +o.linkExtra > 0,
      why: 'Allongez le trait de liaison pour choisir sa couleur.',
      t: 'color',
      label: 'Trait de liaison : couleur',
      def: 'blue',
    },
    {
      k: 'orient',
      g: 'struct',
      t: 'select',
      label: 'Orientation de l’anneau',
      options: {
        largest: 'Plus grand segment à un angle donné',
        first: '1er segment en haut',
        manual: 'Manuelle (glisser l’anneau dans l’éditeur)',
      },
    },
    {
      k: 'largestAngle',
      g: 'struct',
      when: (o) => (o.orient || 'largest') === 'largest',
      t: 'number',
      label: 'Angle du plus grand segment (° — 0 = haut, 210 = bas gauche)',
      min: 0,
      max: 359,
    },
    {
      k: 'startAngle',
      g: 'struct',
      when: (o) => o.orient === 'manual',
      t: 'number',
      label: 'Angle de départ du 1er segment (° — mode manuel)',
      min: 0,
      max: 359,
      step: 'any',
    },
    {
      k: 'segments',
      t: 'list',
      label: 'Segments (sens horaire)',
      min: 1,
      max: 10,
      item: () => ({ color: 'sky', value: 10, title: t('Titre'), text: t('Texte') }),
      fields: [
        { k: 'color', t: 'color', label: 'Couleur' },
        { k: 'value', t: 'number', label: 'Valeur', min: 0, step: 'any' },
        { k: 'title', t: 'text', fmt: 'chart', label: 'Titre (gras)' },
        { k: 'text', t: 'area', fmt: 'chart', label: 'Texte' },
        {
          k: 'value2',
          t: 'number',
          label: 'Valeur du 2e camembert',
          min: 0,
          step: 'any',
          when: (g, o) => !!(o && o.compare),
        },
        {
          k: 'title2',
          t: 'text',
          fmt: 'chart',
          label: 'Titre dans le 2e camembert (vide = le même)',
          when: (g, o) => !!(o && o.compare),
        },
        { k: 'side', t: 'select', label: 'Côté du libellé', options: { auto: 'Auto', left: 'Gauche', right: 'Droite' } },
        { k: 'link', t: 'bool', label: 'Trait de liaison vers l’extérieur (jusqu’au bord de la colonne et au-delà)' },
      ],
    },
  ],
  actions: [
    {
      label: '↺ Positions auto',
      title: 'Efface les positions manuelles des libellés, points d’ancrage et côtés',
      run(o) {
        clearManual(o);
      },
    },
    {
      label: 'Plus grand en premier',
      title: 'Fait tourner la liste pour que le plus grand segment soit le 1er',
      run(o) {
        const a = o.segments || [];
        let mi = 0;
        a.forEach((g, i) => {
          if (+g.value > +a[mi].value) mi = i;
        });
        o.segments = a.slice(mi).concat(a.slice(0, mi));
        clearManual(o);
      },
    },
  ],
  /* Interactions de l'éditeur : retourne un gestionnaire de glissement { move(pt), end() } (pt en px du SVG) */
  edit: {
    start(hit, o, meta, api, pt0) {
      if (hit.kind === 'move') {
        if (!meta || !(meta.span > 0)) return null;
        const x0 = meta.cx;
        return {
          move(pt) {
            const v = Math.round(((x0 + pt.x - pt0.x - meta.W / 2) / meta.span) * 100);
            o.ringX = Math.max(-100, Math.min(100, v));
            api.redraw();
          },
        };
      }
      const seg = (o.segments || [])[hit.i];
      if (!seg) return null;
      api.select(hit.i);
      const { cx, cy } = meta,
        ang = (pt) => norm((Math.atan2(pt.x - cx, -(pt.y - cy)) * 180) / Math.PI);
      const dist = (pt) => Math.hypot(pt.x - pt0.x, pt.y - pt0.y);
      let moved = false;
      if (hit.kind === 'ring') {
        const a0 = ang(pt0);
        return {
          move(pt) {
            if (!moved && dist(pt) < 3) return;
            if (!moved) {
              moved = true;
              clearManual(o);
            }
            o.orient = 'manual';
            o.startAngle = Math.round(norm(meta.start + ang(pt) - a0) * 10) / 10;
            api.redraw();
          },
        };
      }
      if (hit.kind === 'label') {
        const it = meta.items.find((x) => x.i === hit.i);
        if (!it) return null;
        const grab = pt0.y - it.top;
        return {
          move(pt) {
            if (!moved && dist(pt) < 3) return;
            if (!moved) {
              moved = true;
              api.ui.drag = 'label';
            }
            seg.pin = Math.round(pt.y - grab - cy);
            const want = pt.x < cx ? 'left' : 'right',
              auto = it.autoSide < 0 ? 'left' : 'right';
            seg.side = want === auto ? 'auto' : want;
            api.redraw();
          },
          end() {
            api.ui.drag = null;
            api.redraw();
          },
        };
      }
      if (hit.kind === 'anchor') {
        const arc = meta.arcs.find((x) => x.i === hit.i),
          sw = arc.a1 - arc.a0;
        return {
          move(pt) {
            if (!moved && dist(pt) < 2) return;
            moved = true;
            const rel = norm(ang(pt) - arc.a0);
            let t = rel / sw;
            if (t > 1) t = rel - sw < 360 - rel ? 1 : 0;
            seg.anchorT = Math.round(Math.min(0.96, Math.max(0.04, t)) * 1000) / 1000;
            api.redraw();
          },
        };
      }
      return null;
    },
  },
  render(o, W, env) {
    if (o.compare && !o._sub) return renderCompare(o, W, env);
    const T = typeIn(env); // styles du document (menu Texte)
    /* corps et interlignage des textes autour de l'anneau : à la proportion du texte courant du document (grille de 1,5 px) */
    const BODY = pxOf(T.body.size),
      kBody = T.body.size / TYPE.body.size;
    const LH = Math.round(((LEAD[o.leading] || LEAD.normal) * kBody) / 1.5) * 1.5;
    /* libellés : titre puis texte, chacun dans un style du document (`labelTitle`, `labelText`) ; défaut = texte gras puis texte, interlignage `leading` */
    const titleSpec = labelSpec(T, o.labelTitle || 'bold', LH, true),
      textSpec = labelSpec(T, o.labelText || 'body', LH, false);
    const labelLines = (g, maxW) => [
      ...(String(g.title || '').trim() ? richLines(g.title, titleSpec, maxW) : []),
      ...(String(g.text || '').trim() ? richLines(g.text, textSpec, maxW) : []),
    ];
    const hOf = (lines) => lines.reduce((a, l) => a + l.lh, 0);
    const segs = (o.segments || []).filter((g) => +g.value > 0);
    const total = segs.reduce((a, g) => a + +g.value, 0);
    const bare = o.layout === 'none',
      around = !bare && (o.layout === 'around' || (o.layout !== 'legend' && W >= VIZ.aroundMinW));
    if (!segs.length) return { node: s('svg', { width: W, height: 60 }) };

    // angles
    const sweeps = segs.map((g) => (g.value / total) * 360);
    let mi = 0;
    sweeps.forEach((w, i) => {
      if (w > sweeps[mi] + 1e-9) mi = i;
    });
    let before = 0;
    for (let i = 0; i < mi; i++) before += sweeps[i];
    let a = o.orient === 'manual' ? (o.startAngle ?? 0) : o.orient === 'first' ? 0 : (o.largestAngle ?? 210) - (before + sweeps[mi] / 2);
    const start = a,
      ui = env.ui,
      sel = ui ? ui.sel : -1,
      idxOf = (g) => (o.segments || []).indexOf(g);
    const arcs = segs.map((g, i) => {
      const r = { g, a0: a, a1: a + sweeps[i] };
      a += sweeps[i];
      return r;
    });

    // anneau
    const Dfull = around
      ? Math.max(VIZ.ringMin, Math.min(VIZ.ringMax, round3(W * 0.3)))
      : bare
        ? Math.min(VIZ.ringMax, round3(W - 6))
        : Math.min(VIZ.ringLegend, round3(W - 6));
    const D = o._k > 0 && o._k < 1 ? Math.max(12, Dfull * o._k) : Dfull; // comparaison « surface proportionnelle » : le plus petit total rétrécit
    /* position horizontale (`ringX`, −100 à 100 % de la course possible) : le reste de la largeur va aux libellés du côté libéré */
    const shift = Math.max(-1, Math.min(1, (+o.ringX || 0) / 100)),
      span = Math.max(0, W / 2 - D / 2 - SW);
    const pie = o.style === 'pie';
    const Ro = D / 2 - SW,
      Ri = pie ? 0 : Ro * (1 - (RING_PCT[o.ringWidth] ?? RING_PCT.normal));
    const sector = (cx, cy, p) => {
      const pt = (r, ang) => [cx + r * Math.sin(rad(ang)), cy - r * Math.cos(rad(ang))];
      if (p.a1 - p.a0 >= 359.99)
        return pie
          ? `M${cx + Ro},${cy}A${Ro},${Ro} 0 1 1 ${cx - Ro},${cy}A${Ro},${Ro} 0 1 1 ${cx + Ro},${cy}Z`
          : `M${cx + Ro},${cy}A${Ro},${Ro} 0 1 1 ${cx - Ro},${cy}A${Ro},${Ro} 0 1 1 ${cx + Ro},${cy}ZM${cx + Ri},${cy}A${Ri},${Ri} 0 1 0 ${cx - Ri},${cy}A${Ri},${Ri} 0 1 0 ${cx + Ri},${cy}Z`;
      const [x0, y0] = pt(Ro, p.a0),
        [x1, y1] = pt(Ro, p.a1),
        [x2, y2] = pt(Ri, p.a1),
        [x3, y3] = pt(Ri, p.a0);
      const big = p.a1 - p.a0 > 180 ? 1 : 0;
      if (pie) return `M${cx},${cy}L${x0},${y0}A${Ro},${Ro} 0 ${big} 1 ${x1},${y1}Z`;
      return `M${x0},${y0}A${Ro},${Ro} 0 ${big} 1 ${x1},${y1}L${x2},${y2}A${Ri},${Ri} 0 ${big} 0 ${x3},${y3}Z`;
    };
    /* Texte du centre : une ligne par paragraphe ; « ## » = titre 2, « ### » = texte courant (sans préfixe ou « # » = titre 1).
       Chaque ligne passe à la ligne dans l'anneau (mot trop long coupé), puis toutes les tailles baissent ensemble jusqu'à ce que tout tienne. */
    const centerNode = (cx, cy) => {
      if (pie || o.showTotal === false) return s('g');
      const n = fmt(total, env.locale, o.decimals),
        BASE = pxOf(T.figure.size);
      const LV = {
        1: { k: 1, w: 700, f: SERIF, fam: 'var(--t-figure-family)' },
        2: { k: 0.62, w: 700, f: SERIF, fam: 'var(--t-figure-family)' },
        3: { k: 0, w: 400, f: SANS, fam: 'inherit' },
      };
      const paras = String(o.totalTpl || '')
        .replace(/\{total\}/g, n)
        .split('\n')
        .map((l) => {
          const m = l.match(/^(#{1,3}) ?(.*)$/);
          return { lv: m ? m[1].length : 1, text: (m ? m[2] : l).trim() };
        })
        .filter((p) => p.text);
      const sizeOf = (lv, k) => (lv === 3 ? BODY : BASE * LV[lv].k) * k;
      const wrap = (text, lv, z, maxW) => {
        const out = [];
        let cur = '';
        const put = (w) => {
          const t = cur ? cur + ' ' + w : w;
          if (!cur || mw(t, LV[lv].w, LV[lv].f, z) <= maxW) {
            cur = t;
            return;
          }
          out.push(cur);
          cur = w;
        };
        for (const word of text.split(/ +/)) {
          if (mw(word, LV[lv].w, LV[lv].f, z) <= maxW) {
            put(word);
            continue;
          }
          let part = '';
          for (const ch of word) {
            if (part && mw(part + ch, LV[lv].w, LV[lv].f, z) > maxW) {
              put(part);
              out.push(cur);
              cur = '';
              part = '';
            }
            part += ch;
          } // mot plus large que l'anneau : coupé
          if (part) put(part);
        }
        if (cur) out.push(cur);
        return out;
      };
      const chord = (y) => 2 * Math.sqrt(Math.max(0, (Ri * 0.9) ** 2 - y * y)); // largeur disponible dans l'anneau à la hauteur y
      const maxC = 2 * Ri * 0.8;
      let k = 1,
        lines = [],
        tot = 0;
      for (let i = 0; i < 70; i++) {
        lines = paras.flatMap((p) => {
          const z = sizeOf(p.lv, k);
          return wrap(p.text, p.lv, z, maxC).map((text) => ({ text, lv: p.lv, z }));
        });
        let y = 0;
        lines.forEach((l) => {
          l.h = l.z * (l.lv === 3 ? 1.25 : 1.05);
          l.y0 = y;
          y += l.h;
        });
        tot = y;
        const ok = lines.every((l) => {
          const a = l.y0 - tot / 2,
            b2 = a + l.h;
          return mw(l.text, LV[l.lv].w, LV[l.lv].f, l.z) <= chord(Math.max(Math.abs(a), Math.abs(b2)));
        });
        if (ok || k < 0.25) break;
        k *= 0.94;
      }
      const g = s('g', { 'text-anchor': 'middle' });
      lines.forEach((l) =>
        g.append(
          s(
            'text',
            {
              x: cx,
              y: cy - tot / 2 + l.y0 + l.h / 2 + 0.33 * l.z,
              'font-size': l.z,
              'font-weight': LV[l.lv].w,
              style: { fontFamily: LV[l.lv].fam },
            },
            l.text,
          ),
        ),
      );
      return g;
    };
    const ringNodes = (cx, cy) => {
      const out = arcs.map((p) =>
        s('path', {
          'data-color': ui ? `segments.${idxOf(p.g)}.color` : null,
          d: sector(cx, cy, p),
          fill: colorRef(p.g.color),
          ...lineAttrs(o),
          'stroke-linejoin': 'round',
          'data-hit': ui ? `ring:${idxOf(p.g)}` : null,
          style: ui ? { cursor: 'grab' } : null,
        }),
      );
      /* liseré entre les segments : vrai trait SVG de la couleur du fond, du centre (ou du bord intérieur) au-delà du bord extérieur ; il recouvre les contours */
      const gap = SEG_GAP[o.segGap] ?? 0;
      if (gap && arcs.length > 1 && !arcs.some((p) => p.a1 - p.a0 >= 359.99))
        arcs.forEach((p) => {
          const r0 = pie ? 0 : Ri - SW,
            r1 = Ro + SW;
          out.push(
            s('line', {
              x1: cx + r0 * Math.sin(rad(p.a1)),
              y1: cy - r0 * Math.cos(rad(p.a1)),
              x2: cx + r1 * Math.sin(rad(p.a1)),
              y2: cy - r1 * Math.cos(rad(p.a1)),
              stroke: '#FFFFFF',
              'stroke-width': gap,
              'stroke-linecap': 'butt',
              'pointer-events': 'none',
            }),
          );
        });
      if (ui)
        arcs.forEach((p) => {
          if (idxOf(p.g) === sel)
            out.push(
              s('path', {
                d: sector(cx, cy, p),
                fill: 'none',
                stroke: ORANGE,
                'stroke-width': 2,
                'stroke-linejoin': 'round',
                'pointer-events': 'none',
              }),
            );
        });
      return out;
    };
    /* trait de liaison : part du bord extérieur du segment, horizontal, jusqu'au bord de la colonne puis `linkExtra` px au-delà (ex. vers l'accolade d'une colonne voisine) */
    const linkNodes = (cx, cy) =>
      arcs
        .filter((p) => p.g.link)
        .map((p) => {
          const th = p.g.anchorT != null ? p.a0 + (p.a1 - p.a0) * p.g.anchorT : (p.a0 + p.a1) / 2,
            dir = Math.sin(rad(th)) >= 0 ? 1 : -1;
          const x = cx + Ro * Math.sin(rad(th)),
            y = cy - Ro * Math.cos(rad(th)),
            x2 = dir > 0 ? W + (+o.linkExtra || 0) : -(+o.linkExtra || 0);
          return s('path', {
            d: `M${x},${y}H${x2}`,
            fill: 'none',
            stroke: colorRef(o.linkColor || 'blue'),
            'stroke-width': SW,
            'stroke-linecap': 'round',
          });
        });
    /* valeur de chaque segment écrite dans le segment (`segValues` : value | pct), en chiffres du document (style des valeurs des graphiques, ×1,5),
       blanche sur un fond sombre ; seulement si elle tient dans le segment (sinon rien : jamais de texte qui déborde) */
    const valueNodes = (cx, cy) => {
      const mode = o.segValues;
      if (mode !== 'value' && mode !== 'pct') return [];
      const r = (Ro + Ri) / 2,
        dec = Math.max(0, Math.min(4, +o.segDecimals || 0));
      const textOf = (p) => {
        const v = +p.g.value || 0;
        return mode === 'pct'
          ? fmt(total ? (v / total) * 100 : 0, env.locale, dec) + '%'
          : (o.segPrefix || '') + fmt(v, env.locale, dec) + (o.segSuffix || '');
      };
      /* position d'un texte dans son segment, ou null : le cadre du texte (coins et milieux des bords) doit tenir entre les rayons et les angles du segment */
      const placeIn = (p, txt, size) => {
        const w = mw(txt, 700, SERIF, size) + 4,
          h = size * 0.8 + 2; // hauteur des chiffres (sans jambage) et une petite marge
        const inside = (px, py) => {
          const d = Math.hypot(px - cx, py - cy);
          if (d > Ro - 1.5 || d < (pie ? 0 : Ri + 1.5)) return false;
          if (p.a1 - p.a0 >= 359.99) return true;
          const ang = norm((Math.atan2(px - cx, -(py - cy)) * 180) / Math.PI);
          return norm(ang - p.a0) <= p.a1 - p.a0 - 1;
        };
        const fits = (rr, th) => {
          const x = cx + rr * Math.sin(rad(th)),
            y = cy - rr * Math.cos(rad(th));
          for (const dx of [-1, 0, 1])
            for (const dy of [-1, 0, 1]) if ((dx || dy) && !inside(x + (dx * w) / 2, y + (dy * h) / 2)) return null;
          return { x, y };
        };
        /* au milieu du segment d'abord, puis de plus en plus loin vers ses bords ; anneau : au milieu de l'épaisseur,
           camembert : le rayon le plus proche de 62 % où le texte tient */
        for (const f of [0.5, 0.4, 0.6, 0.3, 0.7, 0.2, 0.8])
          for (const rr of pie ? [0.62, 0.56, 0.68, 0.5, 0.74, 0.44, 0.8].map((k) => Ro * k) : [r]) {
            const at = fits(rr, p.a0 + (p.a1 - p.a0) * f);
            if (at) return at;
          }
        return null;
      };
      /* une seule taille pour tout le graphique : la plus grande des trois (×1,5, ×1,25, ×1 le style des chiffres des graphiques) qui place le plus de valeurs */
      const base = pxOf(T.captionNum.size);
      let best = null;
      for (const k of [1.5, 1.25, 1]) {
        const size = base * k,
          placed = arcs.map((p) => {
            const txt = textOf(p),
              at = placeIn(p, txt, size);
            return at ? { p, txt, ...at } : null;
          });
        const n = placed.filter(Boolean).length;
        if (!best || n > best.n) best = { n, size, placed };
      }
      return best.placed.filter(Boolean).map((q) =>
        s(
          'text',
          {
            x: q.x,
            y: q.y + 0.33 * best.size,
            'text-anchor': 'middle',
            'font-size': best.size,
            'font-weight': 700,
            fill: inkOn(env, q.p.g.color, String(q.p.g.color || '').startsWith('tint-') ? TINT : 1),
            'pointer-events': 'none',
            style: { fontFamily: 'var(--t-captionNum-family)' },
          },
          q.txt,
        ),
      );
    };
    /* éditeur : poignée au centre de l'anneau, à tirer horizontalement (`ringX`) ; jamais exportée */
    const moveHandle = (cx, cy) =>
      ui && !o._sub && span > 0
        ? [
            s(
              'g',
              { 'data-hit': 'move:0', style: { cursor: 'ew-resize' } },
              s('circle', { cx, cy, r: 10, fill: '#FFFFFF', stroke: ORANGE, 'stroke-width': 1.5 }),
              s('path', {
                d: `M${cx - 6},${cy}h12M${cx - 3},${cy - 3}l-3,3l3,3M${cx + 3},${cy - 3}l3,3l-3,3`,
                fill: 'none',
                stroke: ORANGE,
                'stroke-width': 1.5,
                'stroke-linecap': 'round',
                'stroke-linejoin': 'round',
              }),
            ),
          ]
        : [];
    const metaBase = { start, arcs: arcs.map((p) => ({ i: idxOf(p.g), a0: p.a0, a1: p.a1 })), Ro, Ri, W };

    /* ----- Mode légende (colonnes étroites) ----- */
    if (!around) {
      const cx = W / 2 + shift * span,
        cy = Dfull / 2,
        svg = s('svg', { width: W, height: 10, style: { display: 'block', overflow: 'visible' } });
      svg.append(...ringNodes(cx, cy), ...valueNodes(cx, cy), centerNode(cx, cy), ...linkNodes(cx, cy), ...moveHandle(cx, cy));
      let y = cy + Dfull / 2 - SW + env.rc.gap.subsectionTitle * 2;
      const sw = VIZ.legendSwatch,
        tx = sw + VIZ.iconGap;
      for (const p of bare ? [] : arcs.filter((q) => hasLabel(q.g))) {
        const lines = labelLines(p.g, W - tx);
        svg.append(
          s('rect', {
            x: SW / 2,
            y: y + ((lines.length ? lines[0].lh : LH) - sw) / 2 + SW / 2,
            width: sw - SW,
            height: sw - SW,
            rx: VIZ.barRadius,
            fill: colorRef(p.g.color),
            stroke: 'currentColor',
            'stroke-width': SW,
          }),
        );
        svg.append(drawRich(lines, tx, y));
        y += hOf(lines) + VIZ.blockGap;
      }
      const H = bare || !arcs.some((q) => hasLabel(q.g)) ? Math.ceil(Dfull) : Math.ceil(y - VIZ.blockGap);
      svg.setAttribute('height', H);
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      return { node: svg, meta: { ...metaBase, cx, cy, H, span, around: false, items: [] } };
    }

    /* ----- Mode « autour de l'anneau » ----- */
    const cx = W / 2 + shift * span;
    /* largeur des libellés de chaque côté : centré = place symétrique, 264 px au plus (aspect d'origine) ; déplacé = toute la place libérée */
    const sideW = (room) => (shift ? Math.max(0, room - VIZ.leaderRoom) : Math.max(60, Math.min(room - VIZ.leaderRoom, 264)));
    const wL = sideW(cx - D / 2),
      wR = sideW(W - cx - D / 2),
      labelW = wR,
      widthOf = (side) => (side > 0 ? wR : wL);
    const tooNarrow = (side) => widthOf(side) < 48; // côté sans place : les libellés automatiques passent de l'autre côté
    const items = arcs
      .filter((p) => hasLabel(p.g))
      .map((p) => {
        const mid = norm((p.a0 + p.a1) / 2);
        let autoSide = mid < 180 ? 1 : -1;
        if (tooNarrow(autoSide) && !tooNarrow(-autoSide)) autoSide = -autoSide;
        const side = p.g.side === 'left' ? -1 : p.g.side === 'right' ? 1 : autoSide;
        /* libellé passé du côté opposé (anneau déplacé) : ancré sur le point du segment le plus tourné vers lui, le trait ne traverse pas l'anneau */
        const facing = () => {
          let best = mid;
          for (let q = 0; q <= 24; q++) {
            const a = p.a0 + ((p.a1 - p.a0) * q) / 24;
            if (side * Math.sin(rad(a)) > side * Math.sin(rad(best)) + 1e-9) best = a;
          }
          return best;
        };
        const natural = (mid < 180 ? 1 : -1) === side;
        const th = p.g.anchorT != null ? p.a0 + (p.a1 - p.a0) * p.g.anchorT : natural ? mid : facing();
        const lines = labelLines(p.g, Math.max(24, widthOf(side)));
        return {
          p,
          mid,
          th,
          autoSide,
          side,
          lines,
          h: hOf(lines),
          lh0: lines.length ? lines[0].lh : LH,
          first: lines.length ? lines[0].w : 0,
        };
      });
    const place = (cy) => {
      for (const it of items) {
        const th = it.th,
          P = { x: cx + Ro * Math.sin(rad(th)), y: cy - Ro * Math.cos(rad(th)) };
        it.P = P;
        it.want = it.p.g.pin != null ? cy + it.p.g.pin : P.y - it.lh0 / 2;
      }
      for (const side of [1, -1])
        resolveColumn(
          items.filter((i) => i.side === side),
          0,
          VIZ.blockGap,
        );
      return Math.max(Dfull, ...items.map((i) => i.top + i.h));
    };
    let cy = Dfull / 2;
    let H = place(cy);
    /* position verticale de l'anneau par rapport au contenu le plus haut (souvent les textes) : en haut, centré ou en bas ; seuls les traits de repère suivent l'anneau */
    const cy0 = cy,
      ra = o.ringAlign || 'top';
    if (ra === 'center') cy = Math.max(cy0, H / 2);
    else if (ra === 'bottom') cy = Math.max(cy0, H - Ro - SW);
    if (cy !== cy0) for (const it of items) it.P.y = cy - Ro * Math.cos(rad(it.th));
    H = Math.ceil(Math.max(H, cy + Ro + SW));
    const svg = s('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, style: { display: 'block', overflow: 'visible' } });
    if (ui && ui.drag === 'label')
      for (const sd of [-1, 1])
        svg.append(
          s('rect', {
            x: sd > 0 ? W - wR : 0,
            y: 0,
            width: widthOf(sd),
            height: H,
            fill: ORANGE,
            'fill-opacity': 0.08,
            stroke: ORANGE,
            'stroke-dasharray': '4 3',
            'stroke-width': 1,
            'pointer-events': 'none',
          }),
        );
    svg.append(...ringNodes(cx, cy), ...valueNodes(cx, cy), centerNode(cx, cy), ...linkNodes(cx, cy), ...moveHandle(cx, cy));
    for (const it of items) {
      const right = it.side > 0,
        x = right ? W - wR : 0,
        ly = it.top + it.lh0 / 2;
      const E = { x: right ? x - VIZ.leaderGap : x + it.first + VIZ.leaderGap, y: ly };
      const dy = ly - it.P.y;
      let dx = Math.abs(dy);
      const roomX = Math.abs(E.x - it.P.x) - 3;
      if (dx > roomX) dx = Math.max(0, roomX);
      const K = Math.abs(dy) < 0.05 ? null : { x: it.P.x + it.side * dx, y: it.P.y + Math.sign(dy) * dx };
      svg.append(
        s('path', {
          d: `M${it.P.x},${it.P.y}${K ? `L${K.x},${K.y}` : ''}L${E.x},${E.y}`,
          fill: 'none',
          stroke: 'currentColor',
          'stroke-width': SW,
          'stroke-linejoin': 'round',
        }),
      );
      svg.append(drawRich(it.lines, x, it.top));
      it.x = x;
    }
    if (ui) {
      for (const it of items) {
        const i = idxOf(it.p.g),
          on = i === sel;
        svg.append(
          s('rect', {
            x: it.x - 3,
            y: it.top - 2,
            width: widthOf(it.side) + 6,
            height: it.h + 4,
            rx: 3,
            fill: 'transparent',
            stroke: on ? ORANGE : 'none',
            'stroke-dasharray': '4 3',
            'stroke-width': 1,
            'data-hit': `label:${i}`,
            style: { cursor: 'ns-resize' },
          }),
        );
      }
      const si = items.find((it) => idxOf(it.p.g) === sel);
      if (si)
        svg.append(
          s('circle', {
            cx: si.P.x,
            cy: si.P.y,
            r: 6,
            fill: '#fff',
            stroke: ORANGE,
            'stroke-width': 2,
            'data-hit': `anchor:${sel}`,
            style: { cursor: 'grab' },
          }),
        );
    }
    return {
      node: svg,
      meta: {
        ...metaBase,
        cx,
        cy,
        H,
        around: true,
        labelW,
        span,
        items: items.map((it) => ({ i: idxOf(it.p.g), top: it.top, h: it.h, x: it.x, P: it.P, autoSide: it.autoSide })),
      },
    };
  },
};
export default DONUT;
