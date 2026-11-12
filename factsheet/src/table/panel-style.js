/* Éditeur de tableau : cartes d'habillage du panneau (Remplissage, Contours, Préréglages). Module à part de `editor.js` : il ne connaît
   que le tableau (`getTable`), la sélection (`getSel`) et `commit` (historique de l'éditeur). Couleurs : toujours des clés de la palette
   (`toneKeys`, teintes `tint-*`), jamais un hex.
   - Remplissage : selon la sélection, fond des cellules, de la ligne entière ou de la colonne entière (une ligne ou une colonne
     sélectionnée en entier par son en-tête) ; réglages du tableau : alternance, en-tête, pied.
   - Contours : sélecteur d'arêtes (schéma cliquable) ; avec une sélection, il écrit des surcharges `tb.edges` sur les arêtes de la
     sélection ; sans sélection, il règle `tb.look`. Épaisseur, couleur, style : le retour est immédiat dans le rendu.
   - Texte : style de paragraphe, couleur du texte, alignement vertical, marges intérieures, colonne numérique, sur la sélection.
   - Préréglages : vignettes ; le texte et les fusions sont gardés, les surcharges d'arêtes oubliées après confirmation. */
import { h, ico } from '../render.js';
import { t } from '../i18n.js';
import { s } from '../viz/util.js';
import { colorSelect } from '../colorselect.js';
import { toneKeys, colorLabel } from '../tokens.js';
import { styleOf as paraStyle } from '../textstyles.js';
import { confirmBox } from '../dialogs.js';
import {
  TABLE_PRESETS,
  HEAD_MAX,
  FOOT_MAX,
  newTable,
  applyPreset,
  fillOf,
  fgOf,
  tableSegments,
  stroke,
  setEdges,
  setLookStroke,
  sideStroke,
  lookStroke,
  headCount,
  footCount,
  setHeadRows,
  setFootRows,
  CELL_STYLES,
  PADS,
  setNumCols,
} from './model.js';
import { selRect } from './grid-ui.js';

export const PRESET_ICONS = {
  rules: 'border-horizontal',
  zebra: 'layout-rows',
  headfill: 'layout-navbar',
  headzebra: 'layout-list',
  hairline: 'separator',
  footer: 'layout-bottombar',
  grid: 'border-all',
  none: 'border-none',
};

const W_MIN = 0.25,
  W_MAX = 3,
  DASHES = { dashed: [3, 2], dotted: [1, 1.5] };
const SIDE_LABEL = {
  top: 'Haut',
  bottom: 'Bas',
  left: 'Gauche',
  right: 'Droite',
  innerH: 'Intérieur horizontal',
  innerV: 'Intérieur vertical',
  head: 'Sous l’en-tête',
  foot: 'Au-dessus du pied',
};
const SHORTCUTS = {
  outer: ['top', 'bottom', 'left', 'right'],
  all: ['top', 'bottom', 'left', 'right', 'innerH', 'innerV'],
  none: [],
};

/** Vignette d'un préréglage : un petit tableau 3 × 4 dessiné d'après son vrai habillage (fonds, traits, texte de l'en-tête) */
function presetThumb(key) {
  const tb = applyPreset(newTable(4, 3, 1), key),
    xs = [0, 20, 40, 60],
    ys = [0, 10, 20, 30, 40];
  const kids = [];
  for (const cl of tb.cells) {
    const fill = fillOf(tb, cl),
      fg = fgOf(tb, cl),
      x = xs[cl.c],
      y = ys[cl.r];
    if (fill !== 'none')
      kids.push(s('rect', { x, y, width: xs[cl.c + cl.cs] - x, height: ys[cl.r + cl.rs] - y, fill: `var(--c-${fill})` }));
    kids.push(s('rect', { x: x + 4, y: y + 4, width: 12, height: 2, fill: `var(--c-${fg === 'none' ? 'text' : fg})`, opacity: 0.55 }));
  }
  for (const g of tableSegments(tb)) {
    const [x1, y1, x2, y2] = g.o === 'h' ? [xs[g.a], ys[g.i], xs[g.b], ys[g.i]] : [xs[g.i], ys[g.a], xs[g.i], ys[g.b]];
    kids.push(
      s('line', {
        x1,
        y1,
        x2,
        y2,
        stroke: `var(--c-${g.s.color})`,
        'stroke-width': +Math.max(0.6, Math.min(2.4, g.s.w * 1.4)).toFixed(2),
        'stroke-dasharray': g.s.dash ? g.s.dash.map((v) => v * 1.5).join(' ') : null,
      }),
    );
  }
  return s('svg', { class: 'te-thumb', viewBox: '-2 -2 64 44', width: 64, height: 44, 'aria-hidden': 'true' }, ...kids);
}

/** Style d'un trait d'après ses pointillés : 'solid' | 'dashed' | 'dotted' */
const styleOf = (st) => (!st.dash ? 'solid' : st.dash[0] <= Math.max(st.w, 1) * 1.01 ? 'dotted' : 'dashed');

export function createStylePanel({ getTable, getSel, getDoc, commit }) {
  const tb = getTable;
  /* trait en cours de réglage (se règle sur les côtés choisis) et côtés choisis du sélecteur */
  const pen = { w: 0.5, color: 'text', style: 'solid', dash: [...DASHES.dashed] };
  const picked = new Set();
  const cardSig = new Map();

  const palette = () => {
    const doc = getDoc();
    return Object.fromEntries(toneKeys(doc).map((k) => [k, colorLabel(doc, k)]));
  };
  const fillOptions = () => ({ none: 'Aucun', ...palette() });
  const textOptions = () => ({ text: 'Texte', ...palette() });
  const picker = (value, options, onChange, k) => {
    const n = colorSelect({ value, options, text: true, onChange });
    n.dataset.k = k;
    return n;
  };
  const segment = (items, value, onPick, label, extra = {}) =>
    h(
      'div',
      { class: 'te-seg te-seg-n', role: 'group', 'aria-label': t(label) },
      items.map(([v, text, icon]) =>
        h(
          'button',
          {
            type: 'button',
            class: 'te-al' + (String(v) === String(value) ? ' on' : ''),
            'aria-pressed': String(String(v) === String(value)),
            dataset: { ...extra, v: String(v), k: `${extra.seg || label}-${v}` },
            onclick: () => onPick(v),
            ...(icon ? { title: t(text), 'aria-label': t(text) } : {}),
          },
          icon ? ico(icon) : text,
        ),
      ),
    );
  const block = (label, ...kids) => h('div', { class: 'te-blk' }, h('div', { class: 'hint', textContent: label }), ...kids);

  /* ---------- cartes : reconstruites seulement quand ce qu'elles montrent change, le focus est gardé ---------- */
  function makeCard(title, key, build) {
    const body = h('div', { class: 'te-cardbody' });
    const node = h('section', { class: 'te-card', dataset: { card: key } }, h('h3', { textContent: title }), body);
    return {
      node,
      sync() {
        const { sig, draw } = build();
        const j = JSON.stringify(sig);
        if (cardSig.get(key) === j) return;
        cardSig.set(key, j);
        const kf = document.activeElement && body.contains(document.activeElement) ? document.activeElement.dataset.k : null;
        body.replaceChildren(...draw().filter(Boolean));
        if (kf) {
          const again = [...body.querySelectorAll('[data-k]')].find((n) => n.dataset.k === kf);
          if (again && !again.disabled) again.focus({ preventScroll: true });
        }
      },
    };
  }
  const invalidate = () => cardSig.clear();
  const change = (fn) => {
    fn();
    invalidate();
    commit();
  };
  const cellsIn = (R) => tb().cells.filter((cl) => cl.r >= R.r0 && cl.r <= R.r1 && cl.c >= R.c0 && cl.c <= R.c1);

  /* ---------- Remplissage ---------- */
  /** Ce que vise la sélection : cellules, ligne(s) entière(s) ou colonne(s) entière(s) */
  function fillTarget() {
    const T = tb(),
      R = selRect(T, getSel());
    if (!R) return null;
    const wide = R.c0 === 0 && R.c1 === T.cols.length - 1,
      tall = R.r0 === 0 && R.r1 === T.rows.length - 1;
    const kind = wide && !tall ? 'row' : tall && !wide ? 'col' : 'cell';
    const one = (a, b, name) => (a === b ? `${name} ${a + 1}` : `${name}s ${a + 1}–${b + 1}`);
    const label =
      kind === 'row' ? one(R.r0, R.r1, t('Ligne')) : kind === 'col' ? one(R.c0, R.c1, t('Colonne')) : t('Cellules sélectionnées');
    return { R, kind, label };
  }
  function ownFill(tg) {
    const T = tb();
    if (tg.kind === 'row') return T.rows[tg.R.r0].fill || 'none';
    if (tg.kind === 'col') return T.cols[tg.R.c0].fill || 'none';
    const cl = cellsIn(tg.R)[0];
    return (cl && cl.fill) || 'none';
  }
  function setFill(tg, key) {
    const T = tb(),
      v = key === 'none' ? undefined : key,
      put = (o) => (v ? (o.fill = v) : delete o.fill);
    if (tg.kind === 'row') {
      for (let r = tg.R.r0; r <= tg.R.r1; r++) put(T.rows[r]);
      T.cells.filter((cl) => cl.r >= tg.R.r0 && cl.r <= tg.R.r1).forEach((cl) => delete cl.fill); // la ligne l'emporte sur les fonds posés avant
    } else if (tg.kind === 'col') {
      for (let c = tg.R.c0; c <= tg.R.c1; c++) put(T.cols[c]);
      T.cells.filter((cl) => cl.c >= tg.R.c0 && cl.c <= tg.R.c1).forEach((cl) => delete cl.fill);
    } else cellsIn(tg.R).forEach(put);
  }
  const look = (k) => (tb().look && tb().look[k]) || 'none';
  const setLook = (k, v) => {
    const T = tb();
    T.look = T.look || {};
    T.look[k] = v;
    T.look.preset = 'custom';
  };
  const fillCard = makeCard('Remplissage', 'fill', () => {
    const T = tb(),
      tg = fillTarget();
    const sig = [tg && [tg.kind, tg.label, ownFill(tg)], T.look, headCount(T), footCount(T), T.rows.length, getDoc().colors];
    return {
      sig,
      draw: () => [
        block(
          tg ? tg.label : t('Aucune cellule'),
          tg
            ? picker(ownFill(tg), fillOptions(), (v) => change(() => setFill(tg, v)), 'fill')
            : h('p', {
                class: 'hint',
                textContent: t('Sélectionnez des cellules, une ligne ou une colonne (par son en-tête) pour la colorer.'),
              }),
        ),
        h('div', { class: 'hint te-prio', textContent: t('Priorité : cellule, puis ligne, colonne, alternance, en-tête.') }),
        block(
          t('Alternance des lignes'),
          picker(look('stripe'), fillOptions(), (v) => change(() => setLook('stripe', v)), 'stripe'),
        ),
        block(
          t('Lignes d’en-tête'),
          segment(
            Array.from({ length: HEAD_MAX + 1 }, (_, i) => [i, String(i)]),
            headCount(T),
            (n) => change(() => setHeadRows(T, +n)),
            'Lignes d’en-tête',
            { seg: 'head' },
          ),
        ),
        block(
          t('Fond de l’en-tête'),
          picker(look('headFill'), fillOptions(), (v) => change(() => setLook('headFill', v)), 'headFill'),
        ),
        block(
          t('Texte de l’en-tête'),
          picker(look('headFg'), { none: 'Auto', ...textOptions() }, (v) => change(() => setLook('headFg', v)), 'headFg'),
        ),
        block(
          t('Lignes de pied'),
          segment(
            Array.from({ length: FOOT_MAX + 1 }, (_, i) => [i, String(i)]),
            footCount(T),
            (n) => change(() => setFootRows(T, +n)),
            'Lignes de pied',
            { seg: 'foot' },
          ),
        ),
        block(
          t('Fond du pied'),
          picker(look('footFill'), fillOptions(), (v) => change(() => setLook('footFill', v)), 'footFill'),
        ),
      ],
    };
  });

  /* ---------- Contours ---------- */
  const mode = () => (selRect(tb(), getSel()) ? 'edges' : 'look');
  const sidesNow = () => [...picked].filter((x) => (mode() === 'edges' ? x in SIDE_LABEL && x !== 'head' && x !== 'foot' : true));
  const strokeOfPen = () =>
    pen.style === 'none' ? stroke(0, pen.color, null) : stroke(pen.w, pen.color, pen.style === 'solid' ? null : [pen.dash[0], pen.dash[1]]);
  /** Pose le trait réglé sur les côtés choisis : des surcharges d'arêtes (sélection) ou les réglages du tableau */
  function applyPen() {
    const sides = sidesNow();
    if (!sides.length) return;
    const st = strokeOfPen();
    if (mode() === 'edges') setEdges(tb(), selRect(tb(), getSel()), sides, st);
    else setLookStroke(tb(), sides, st.w > 0 ? st : null);
  }
  /** Reprend dans le réglage le trait déjà posé sur les côtés choisis (s'il est le même partout) */
  function readPen() {
    const sides = sidesNow();
    if (!sides.length) return;
    const T = tb(),
      first = sides[0];
    let found = null,
      none = false;
    if (mode() === 'edges') {
      const r = sideStroke(T, selRect(T, getSel()), first);
      found = r.s;
      none = r.none;
    } else {
      found = lookStroke(T, first);
      none = !found;
    }
    if (found) {
      pen.w = found.w;
      pen.color = found.color;
      pen.style = styleOf(found);
      if (found.dash) pen.dash = [...found.dash];
    } else if (none) pen.style = 'none';
  }
  const pick = (sides, on) => {
    if (on === undefined) {
      const all = sides.every((x) => picked.has(x));
      sides.forEach((x) => (all ? picked.delete(x) : picked.add(x)));
    } else {
      picked.clear();
      sides.forEach((x) => picked.add(x));
    }
    readPen();
    invalidate();
    syncAll();
  };
  const edgeCard = makeCard('Contours', 'edges', () => {
    const T = tb(),
      m = mode(),
      R = selRect(T, getSel());
    const sig = [m, R, [...picked], pen, m === 'edges' ? T.edges : T.look, getDoc().colors];
    const sideBtn = (side, cls, text) =>
      h('button', {
        type: 'button',
        class: `te-es ${cls}` + (picked.has(side) ? ' on' : ''),
        'aria-pressed': String(picked.has(side)),
        title: t(SIDE_LABEL[side]),
        'aria-label': t(SIDE_LABEL[side]),
        dataset: { side, k: 'side-' + side },
        onclick: () => pick([side]),
      });
    const short = (key, icon, label) =>
      h(
        'button',
        { type: 'button', class: 'te-act te-short', dataset: { pick: key, k: 'pick-' + key }, onclick: () => pick(SHORTCUTS[key], true) },
        ico(icon),
        h('span', { textContent: label }),
      );
    const chosen = sidesNow();
    return {
      sig,
      draw: () => [
        h('p', {
          class: 'hint',
          textContent: t(m === 'edges' ? 'Traits des arêtes de la sélection.' : 'Sans cellule sélectionnée : traits du tableau entier.'),
        }),
        h(
          'div',
          { class: 'te-edgebox' },
          h(
            'div',
            { class: 'te-schema', role: 'group', 'aria-label': t('Arêtes') },
            sideBtn('top', 'te-es-t'),
            sideBtn('bottom', 'te-es-b'),
            sideBtn('left', 'te-es-l'),
            sideBtn('right', 'te-es-r'),
            sideBtn('innerH', 'te-es-ih'),
            sideBtn('innerV', 'te-es-iv'),
          ),
          h(
            'div',
            { class: 'te-col' },
            short('outer', 'border-outer', 'Extérieur'),
            short('all', 'border-all', 'Tout'),
            short('none', 'border-none', 'Aucune'),
          ),
        ),
        m === 'look'
          ? h(
              'div',
              { class: 'te-chips' },
              ['head', 'foot'].map((side) =>
                h('button', {
                  type: 'button',
                  class: 'te-chip' + (picked.has(side) ? ' on' : ''),
                  'aria-pressed': String(picked.has(side)),
                  textContent: t(SIDE_LABEL[side]),
                  dataset: { side, k: 'side-' + side },
                  onclick: () => pick([side]),
                }),
              ),
            )
          : null,
        chosen.length === 0 ? h('p', { class: 'hint', textContent: t('Choisissez les arêtes à régler dans le schéma.') }) : null,
        block(
          t('Style'),
          segment(
            [
              ['solid', 'Plein', 'minus'],
              ['dashed', 'Tirets', 'line-dashed'],
              ['dotted', 'Pointillés', 'line-dotted'],
              ['none', 'Aucun trait', 'circle-off'],
            ],
            pen.style,
            (v) => {
              pen.style = v;
              if (DASHES[v]) pen.dash = [...DASHES[v]];
              if (v !== 'none' && !(pen.w >= W_MIN)) pen.w = 0.5;
              change(applyPen);
            },
            'Style du trait',
            { seg: 'style' },
          ),
        ),
        pen.style === 'none'
          ? null
          : h(
              'div',
              { class: 'row2' },
              numberField('Épaisseur (pt)', pen.w, W_MIN, W_MAX, W_MIN, 'w', (v) => (pen.w = v)),
              block(
                t('Couleur'),
                picker(pen.color, textOptions(), (v) => ((pen.color = v), change(applyPen)), 'color'),
              ),
            ),
        pen.style === 'dashed' || pen.style === 'dotted'
          ? h(
              'div',
              { class: 'row2' },
              numberField('Tiret (pt)', pen.dash[0], 0.25, 12, 0.25, 'dash0', (v) => (pen.dash[0] = v)),
              numberField('Espace (pt)', pen.dash[1], 0.25, 12, 0.25, 'dash1', (v) => (pen.dash[1] = v)),
            )
          : null,
        m === 'edges'
          ? h(
              'button',
              {
                type: 'button',
                class: 'te-act',
                dataset: { act: 'edges-reset', k: 'edges-reset' },
                disabled: !chosen.length,
                onclick: () => change(() => setEdges(tb(), selRect(tb(), getSel()), sidesNow(), undefined)),
              },
              ico('eraser'),
              h('span', { textContent: t('Rétablir les traits du tableau') }),
            )
          : null,
      ],
    };
  });
  function numberField(label, value, min, max, step, k, set) {
    const input = h('input', {
      type: 'number',
      min,
      max,
      step,
      value,
      dataset: { k },
      onchange: (e) => {
        const v = Math.round(Math.max(min, Math.min(max, +e.target.value || min)) / step) * step;
        set(+v.toFixed(2));
        change(applyPen);
      },
    });
    return h('label', { class: 'f' }, h('span', { class: 'hint', textContent: t(label) }), input);
  }

  /* ---------- Préréglages ---------- */
  const presetCard = makeCard('Préréglages', 'presets', () => {
    const T = tb();
    return {
      sig: [(T.look && T.look.preset) || 'custom', Object.keys(T.edges || {}).length > 0],
      draw: () => [
        h(
          'div',
          { class: 'te-presets' },
          Object.entries(TABLE_PRESETS).map(([key, p]) =>
            h(
              'button',
              {
                type: 'button',
                class: 'te-pre' + (T.look && T.look.preset === key ? ' on' : ''),
                title: t(p.label),
                'aria-pressed': String(!!T.look && T.look.preset === key),
                dataset: { preset: key, k: 'preset-' + key },
                onclick: () => usePreset(key),
              },
              presetThumb(key),
              h('span', { textContent: p.label }),
            ),
          ),
        ),
        h('p', {
          class: 'hint',
          textContent: t('Le préréglage remplace les traits et les fonds du tableau ; le texte et les fusions sont gardés.'),
        }),
      ],
    };
  });
  async function usePreset(key) {
    const T = tb();
    if (
      Object.keys(T.edges || {}).length &&
      !(await confirmBox(t('Les traits réglés sur des arêtes seront oubliés. Appliquer le préréglage ?'), { ok: t('Appliquer') }))
    )
      return;
    applyPreset(T, key);
    invalidate();
    commit();
  }

  /* ---------- Texte ---------- */
  /** Valeur commune d'une propriété sur la sélection, ou null si elles diffèrent */
  const common = (group, get) => (group.length && group.every((cl) => get(cl) === get(group[0])) ? get(group[0]) : null);
  const textCard = makeCard('Texte', 'text', () => {
    const T = tb(),
      R = selRect(T, getSel()),
      group = R ? cellsIn(R) : [];
    const st = common(group, (cl) => cl.st || 'body'),
      fg = common(group, (cl) => cl.fg || 'none'),
      av = common(group, (cl) => cl.av || 'top'),
      pad = common(group, (cl) => cl.pad || 'normal');
    const cols = R ? T.cols.slice(R.c0, R.c1 + 1) : [],
      numeric = cols.length > 0 && cols.every((c) => c.num);
    const put = (k, v, def) => change(() => group.forEach((cl) => (v === def ? delete cl[k] : (cl[k] = v))));
    return {
      sig: [R, st, fg, av, pad, numeric, getDoc().colors, group.length],
      draw: () =>
        !R
          ? [h('p', { class: 'hint', textContent: t('Sélectionnez des cellules pour régler leur texte.') })]
          : [
              block(
                t('Style de paragraphe'),
                h(
                  'select',
                  {
                    'aria-label': t('Style de paragraphe'),
                    dataset: { k: 'cellstyle' },
                    onchange: (e) => put('st', e.target.value, 'body'),
                  },
                  st === null ? h('option', { value: '', textContent: t('Plusieurs styles'), selected: true, disabled: true }) : null,
                  CELL_STYLES.map((k) => h('option', { value: k, textContent: t(paraStyle(k).n), selected: k === st })),
                ),
              ),
              block(
                t('Couleur du texte'),
                picker(fg === null ? 'none' : fg, { none: 'Défaut', ...palette() }, (v) => put('fg', v, 'none'), 'fg'),
              ),
              block(
                t('Alignement vertical'),
                segment(
                  [
                    ['top', 'Haut', 'align-box-top-center'],
                    ['center', 'Milieu', 'align-box-center-middle'],
                    ['bottom', 'Bas', 'align-box-bottom-center'],
                  ],
                  av,
                  (v) => put('av', v, 'top'),
                  'Alignement vertical',
                  { seg: 'av' },
                ),
              ),
              block(
                t('Marges intérieures'),
                segment(
                  Object.keys(PADS).map((k) => [
                    k,
                    t({ none: 'Aucune', tight: 'Serrées', normal: 'Normales', roomy: 'Aérées', wide: 'Larges' }[k]),
                  ]),
                  pad,
                  (v) => put('pad', v, 'normal'),
                  'Marges intérieures',
                  { seg: 'pad' },
                ),
              ),
              block(
                t('Colonnes numériques'),
                h(
                  'button',
                  {
                    type: 'button',
                    class: 'te-act' + (numeric ? ' on' : ''),
                    'aria-pressed': String(numeric),
                    dataset: { k: 'numcol', act: 'numcol' },
                    onclick: () => change(() => setNumCols(T, R.c0, R.c1, !numeric)),
                  },
                  ico('numbers'),
                  h('span', { textContent: t(numeric ? 'Colonne numérique' : 'Rendre numérique') }),
                ),
                h('p', {
                  class: 'hint',
                  textContent: t('Chiffres de largeur fixe, alignés à droite (sauf alignement choisi cellule par cellule).'),
                }),
              ),
            ],
    };
  });

  const cards = [fillCard, textCard, edgeCard, presetCard];
  let lastSel = null;
  function syncAll() {
    /* la sélection a changé : le réglage de trait reprend ce qui est posé sur les côtés choisis */
    const key = JSON.stringify(selRect(tb(), getSel()));
    if (key !== lastSel) {
      lastSel = key;
      if (mode() === 'edges') ['head', 'foot'].forEach((x) => picked.delete(x));
      readPen();
    }
    cards.forEach((c) => c.sync());
  }
  return { nodes: cards.map((c) => c.node), sync: syncAll };
}
