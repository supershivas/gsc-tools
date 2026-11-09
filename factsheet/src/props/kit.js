/* Briques communes des panneaux de propriétés : champs, couleurs, interrupteurs, cartes repliables, tête collante.
   `createKit` les lie au document, au contexte et au panneau du moment ; chaque module d'élément (document, header, section…) les reçoit en paramètre. */
import { typoOf } from '../viz/util.js';
import { h, ico } from '../render.js';
import { t } from '../i18n.js';
import { toneKeys, colorLabel, paletteKeys } from '../tokens.js';
import { openPalette } from '../palette.js';
import { cardEl } from '../cards.js';
import { helpBtn } from '../help.js';
import { paletteOptions, readImage, richEditor } from '../editor.js';
import { alertBox } from '../dialogs.js';

const shut = new Set(); // cartes repliées (gardées d'une sélection à l'autre)
export const search = { q: '', focus: false }; // recherche de réglage (gardée d'une sélection à l'autre)
/* Accordéon : une seule carte ouverte à la fois par sorte d'élément (la première au départ) ; l'état est gardé d'une sélection à l'autre */
const accs = {};
const FIRST = { doc: 'doc-main', header: 'hd-text', sec: 'sec-main', sub: 'sub-main', col: 'col-content' };

export function createKit(root, ctx, doc, kind) {
  const acc = (accs[kind] ||= { cur: null, first: FIRST[kind] });
  const palOpts = paletteOptions(doc);
  const live = (fn) => (e) => {
    fn(e.target.value, e);
    ctx.changed();
  };
  const struct = (fn) => () => {
    fn();
    ctx.restructure();
  };

  /* ---------- Champs ---------- */
  const field = (label, input) => h('label', { class: 'f' }, label, helpBtn(label), input);
  const text = (obj, key, label) =>
    h(
      'div',
      { class: 'f' },
      h('div', { class: 'hint' }, label, helpBtn(label)),
      richEditor(
        obj[key] || '',
        (v) => {
          obj[key] = v;
          ctx.changed();
        },
        { bullets: false, typo: typoOf(doc) },
      ),
    );
  const select = (obj, key, label, opts, onSet) => {
    const s = h(
      'select',
      {
        onchange: (e) => {
          obj[key] = e.target.value;
          onSet ? onSet() : ctx.changed();
        },
      },
      Object.entries(opts).map(([v, l]) => h('option', { value: v, textContent: l })),
    );
    s.value = obj[key];
    return field(label, s);
  };
  /* Libellé + contrôle sans <label> (un bouton dans un <label> serait déclenché par un clic sur le texte) */
  const fieldDiv = (label, node) => h('div', { class: 'f' }, h('div', { class: 'hint' }, label, helpBtn(label)), node);
  /* Choix entre 2 ou 3 valeurs courtes : boutons texte (une liste déroulante est disproportionnée) */
  const pair = (label, obj, key, choices, onSet) => {
    const current = obj[key] || Object.keys(choices)[0];
    return h(
      'div',
      { class: 'f' },
      h('div', { class: 'hint' }, label, helpBtn(label)),
      h(
        'div',
        { class: 'seg seg-text' },
        Object.entries(choices).map(([v, l]) =>
          h('button', {
            type: 'button',
            class: v === current ? 'on' : '',
            'aria-pressed': String(v === current),
            onclick: () => {
              obj[key] = v;
              onSet ? onSet() : ctx.changed();
            },
            textContent: l,
          }),
        ),
      ),
    );
  };
  /* Choix d'alignement : boutons à icônes (une valeur parmi plusieurs) */
  const segmented = (label, obj, key, icons, names) => {
    const current = obj[key] || Object.keys(icons)[0];
    return h(
      'div',
      { class: 'f' },
      h('div', { class: 'hint', textContent: label }),
      h(
        'div',
        { class: 'seg' },
        Object.entries(icons).map(([v, ic]) =>
          h(
            'button',
            {
              type: 'button',
              class: v === current ? 'on' : '',
              title: names[v],
              'aria-label': names[v],
              'aria-pressed': String(v === current),
              onclick: () => {
                obj[key] = v;
                ctx.restructure();
              },
            },
            ico(ic),
          ),
        ),
      ),
    );
  };

  /* Deux tons par couleur : la ligne du haut en pleine, celle du dessous en légère (alignées) */
  const swatches = (label, obj, key, keys, withNone) => {
    const light = keys.filter((c) => c.startsWith('tint-')),
      solid = keys.filter((c) => !c.startsWith('tint-'));
    const dot = (c) =>
      h('button', {
        type: 'button',
        class: 'hv-sw' + (obj[key] === c ? ' on' : ''),
        title: t(colorLabel(doc, c)),
        'aria-label': t(colorLabel(doc, c)),
        style: { background: `var(--c-${c})` },
        onclick: struct(() => {
          obj[key] = c;
        }),
      });
    const gap = () => h('span', { class: 'hv-sw ghost' });
    const none = h('button', {
      type: 'button',
      class: 'hv-sw none' + (!obj[key] || obj[key] === 'none' ? ' on' : ''),
      title: t('Aucun'),
      'aria-label': t('Aucun'),
      onclick: struct(() => {
        obj[key] = 'none';
      }),
    });
    const pal = h(
      'button',
      {
        type: 'button',
        class: 'hv-sw pal-btn',
        title: t('Modifier, renommer ou ajouter des couleurs'),
        'aria-label': t('Modifier, renommer ou ajouter des couleurs'),
        onclick: (e) => openPalette(e.currentTarget, ctx),
      },
      ico('plus'),
    );
    const lightRow = solid.map((c) => {
      const tc = 'tint-' + c;
      return light.includes(tc) ? dot(tc) : gap();
    });
    return h(
      'div',
      { class: 'f' },
      h('div', { class: 'hint' }, label, helpBtn(label)),
      h('div', { class: 'swrow' }, withNone ? none : null, ...solid.map(dot), pal),
      light.length ? h('div', { class: 'swrow' }, withNone ? gap() : null, ...lightRow) : null,
    );
  };

  /* Image à importer : vignette, « Remplacer… » et « Retirer » */
  const imgPicker = (label, get, set, max) => {
    const inp = h('input', {
      type: 'file',
      accept: 'image/*',
      hidden: true,
      onchange: async () => {
        const f = inp.files[0];
        inp.value = '';
        if (!f) return;
        try {
          set(await readImage(f, max));
          ctx.restructure();
        } catch (e) {
          alertBox(t('Image illisible.'));
        }
      },
    });
    return h(
      'div',
      { class: 'f' },
      h('div', { class: 'hint', textContent: label }),
      h(
        'div',
        { class: 'row' },
        get() ? h('img', { class: 'thumb', src: get() }) : null,
        h('button', { type: 'button', textContent: get() ? 'Remplacer…' : 'Importer…', onclick: () => inp.click() }),
        get() ? h('button', { type: 'button', class: 'danger', textContent: 'Retirer', onclick: struct(() => set(null)) }) : null,
        inp,
      ),
    );
  };

  /* ---------- Cartes repliables (état replié gardé le temps de la session) ---------- */
  const switchBtn = (on, label, fn) =>
    h('button', {
      type: 'button',
      role: 'switch',
      'aria-checked': String(!!on),
      'aria-label': label,
      class: 'pp-switch' + (on ? ' on' : ''),
      onclick: fn,
    });
  const switchRow = (label, on, fn) =>
    h('div', { class: 'pp-switchrow' }, h('span', {}, label, helpBtn(label)), switchBtn(on, label, struct(fn)));
  /** toggle : { on, set } — l'interrupteur de l'en-tête affiche ou masque l'élément (la carte se replie quand il est éteint) */
  const card = (id, icon, name, nodes, toggle, sum) =>
    cardEl(id, icon, name, nodes, {
      shut,
      refresh: ctx.refreshProps,
      live: !toggle || toggle.on,
      toggle: toggle ? switchBtn(toggle.on, name, struct(toggle.set)) : null,
      acc,
      sum,
      q: search.q,
    });
  const btn = (icon, label, fn, cls = '') =>
    h('button', { type: 'button', class: 'pp-btn ' + cls, onclick: fn }, ico(icon), h('span', { textContent: label }));

  /* Résumés affichés à droite du titre d'une carte */
  const sumColor = (c) => (!c || c === 'none' ? t('Aucun') : t(colorLabel(doc, c)));
  const sumBox = (o) =>
    [o.fillColor && o.fillColor !== 'none' ? sumColor(o.fillColor) : null, o.stroke ? t('Contour') : null].filter(Boolean).join(' · ') ||
    t('Aucun');
  /* Curseur avec valeur affichée ; `snap` : valeurs « standard » qui attirent le curseur à ± `tol` */
  const rangeRow = (label, obj, key, { min, max, step = 1, def, unit = '', snap = [], tol = 0 }) => {
    const cur = () => (obj[key] == null ? def : obj[key]);
    const out = h('output', { textContent: cur() + unit });
    const r = h('input', {
      type: 'range',
      min,
      max,
      step,
      value: cur(),
      'aria-label': t(label),
      oninput: () => {
        let v = +r.value;
        const near = snap.find((x) => Math.abs(x - v) <= tol);
        if (near != null) r.value = v = near;
        obj[key] = v;
        out.textContent = v + unit;
        ctx.changed();
      },
    });
    return h('div', { class: 'f' }, h('div', { class: 'hint' }, label), h('div', { class: 'pp-range' }, r, out));
  };
  /* Fond, hachures (interrupteur + réglages), puis contour (interrupteur + couleur + pointillés) : sections, sous-sections et colonnes */
  const boxControls = (obj, fillLabel = 'Fond') => {
    const hatchOn = !!obj.hatch && obj.hatch !== 'none',
      dashOn = !!obj.dash;
    return [
      swatches(fillLabel, obj, 'fillColor', toneKeys(doc), true),
      switchRow(t('Hachures'), hatchOn, () => {
        obj.hatch = hatchOn ? 'none' : paletteKeys(doc, false).find((c) => c !== 'blue') || 'blue';
      }),
      ...(hatchOn
        ? [
            swatches('Couleur des hachures', obj, 'hatch', toneKeys(doc)),
            rangeRow('Épaisseur des hachures', obj, 'hatchW', { min: 1, max: 48, def: 12, unit: ' px' }),
            rangeRow('Espacement des hachures', obj, 'hatchGap', { min: 2, max: 96, def: 12, unit: ' px' }),
            rangeRow('Rotation', obj, 'hatchAngle', {
              min: 0,
              max: 180,
              def: 45,
              unit: '°',
              snap: [0, 30, 45, 60, 90, 120, 135, 150, 180],
              tol: 4,
            }),
          ]
        : []),
      switchRow(t('Contour'), obj.stroke, () => {
        obj.stroke = !obj.stroke;
      }),
      ...(obj.stroke
        ? [
            swatches('Couleur du contour', obj, 'strokeColor', toneKeys(doc)),
            switchRow(t('Pointillés'), dashOn, () => {
              obj.dash = !obj.dash;
            }),
            ...(dashOn
              ? [
                  rangeRow('Longueur des tirets', obj, 'dashLen', { min: 1, max: 24, def: 6, unit: ' px' }),
                  rangeRow('Espace entre les tirets', obj, 'dashGap', { min: 1, max: 24, def: 4, unit: ' px' }),
                ]
              : []),
          ]
        : []),
    ];
  };

  /* Tête collante : icône, fil d'Ariane, nom, type et actions d'élément (monter, dupliquer, supprimer…) toujours à portée */
  const title = (name, crumbs = [], o = {}) =>
    root.append(
      h(
        'div',
        { class: 'pr-head' },
        h(
          'div',
          { class: 'pr-id' },
          o.icon ? h('span', { class: 'pr-ic' }, ico(o.icon)) : null,
          h(
            'div',
            { class: 'pr-tx' },
            crumbs.length
              ? h(
                  'div',
                  { class: 'crumbs' },
                  crumbs.flatMap(([l, p], i) => [i ? ' › ' : '', h('a', { textContent: l, onclick: () => ctx.select(p) })]),
                )
              : null,
            h('h2', { textContent: name }),
            o.pill ? h('span', { class: 'pr-pill', textContent: o.pill }) : null,
          ),
        ),
        o.acts && o.acts.length
          ? h(
              'div',
              { class: 'pr-acts' },
              o.acts.map(([i, l, fn, cls]) =>
                h('button', { type: 'button', class: 'pr-ib ' + (cls || ''), title: l, 'aria-label': l, onclick: fn }, ico(i)),
              ),
            )
          : null,
      ),
    );

  return {
    root,
    ctx,
    doc,
    palOpts,
    live,
    struct,
    field,
    text,
    select,
    fieldDiv,
    pair,
    segmented,
    swatches,
    imgPicker,
    switchRow,
    card,
    btn,
    sumColor,
    sumBox,
    boxControls,
    title,
  };
}
