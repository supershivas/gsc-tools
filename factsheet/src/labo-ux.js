/* Labo : maquettes d'harmonisation UX/UI (rien n'est branché dans l'éditeur, données d'exemple en dur).
   - sujet « Éditeur dataviz » : disposition des onglets Données / Visualisation et de leurs panneaux ;
   - sujet « Panneau colonne » : le panneau de propriétés de droite, pour une colonne dataviz.
   Les variantes A reproduisent l'état actuel (captures du 5 nov.), les autres sont des pistes. */
import { h } from './render.js';
import { cssVars, applyVars, DEFAULT_THEME } from './tokens.js';

const ic = (n) => h('i', { class: 'ti ti-' + n });
const YEARS = [1970, 1980, 1990, 2000, 2005, 2010, 2015, 2020, 2024],
  VALS = [2.6, 3.7, 4, 6, 7.1, 8.4, 10, 10.6, 12.7];

export const editorOpts = () => ({ tab: 'viz', open: 'colors' });
export const columnOpts = () => ({ tab: 'content', open: 'content', scroll: 0 });

/* ---------- briques communes ---------- */
const lineChart = (w, hh) => {
  const pad = 28,
    x = (i) => pad + ((w - 2 * pad) * i) / (YEARS.length - 1),
    y = (v) => hh - pad - ((hh - 2 * pad) * v) / 14;
  const d = VALS.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const grid = [0, 5, 10]
    .map(
      (v) =>
        `<line x1="${pad}" x2="${w - pad}" y1="${y(v)}" y2="${y(v)}" stroke="#e4e7ee"/><text x="${pad - 6}" y="${y(v) + 3}" font-size="9" text-anchor="end" fill="#6b7280">${v}</text>`,
    )
    .join('');
  const lab = YEARS.map((v, i) =>
    i % 2 ? '' : `<text x="${x(i)}" y="${hh - pad + 14}" font-size="9" text-anchor="middle" fill="#6b7280">${v}</text>`,
  ).join('');
  const el = h('div', { class: 'vm-chart' });
  el.innerHTML = `<svg width="${w}" height="${hh}" viewBox="0 0 ${w} ${hh}">${grid}${lab}<path d="${d}" fill="none" stroke="var(--c-blue)" stroke-width="2.2"/><text x="${w - pad}" y="14" font-size="10" font-weight="700" text-anchor="end" fill="var(--c-blue)">Billion metric tons</text></svg>`;
  return el;
};
const sw = (on, fn) =>
  h('button', { type: 'button', role: 'switch', 'aria-checked': String(!!on), class: 'pp-switch' + (on ? ' on' : ''), onclick: fn });
const fld = (label, control, hint) =>
  h(
    'label',
    { class: 'vm-f' },
    h('span', { class: 'vm-l', textContent: label }),
    control,
    hint ? h('span', { class: 'vm-hint', textContent: hint }) : null,
  );
const input = (v, ph) => h('input', { type: 'text', value: v || '', placeholder: ph || '' });
const select = (...opts) =>
  h(
    'select',
    {},
    opts.map((o) => h('option', { textContent: o })),
  );
const dots = (on) =>
  h(
    'div',
    { class: 'pp-dots' },
    ['blue', 'sky', 'yellow', 'slate', 'grey'].map((c) =>
      h('button', { type: 'button', class: 'pp-dot' + (c === on ? ' on' : ''), 'aria-label': c, style: { background: `var(--c-${c})` } }),
    ),
    h('button', { type: 'button', class: 'pp-dot vm-plus', 'aria-label': 'Palette' }, ic('plus')),
  );
const row = (label, on) =>
  h(
    'div',
    { class: 'pp-switchrow' },
    h('span', { textContent: label }),
    sw(on, (e) => {
      e.currentTarget.classList.toggle('on');
    }),
  );
const rich = (lines) =>
  h(
    'div',
    { class: 'vm-rich' },
    h(
      'div',
      { class: 'vm-tb' },
      ['B', 'I', 'U', 'x²', 'x₂'].map((t) => h('b', { textContent: t })),
    ),
    h('div', { class: 'vm-ta', style: { minHeight: lines * 18 + 'px' } }),
  );

/* contenu des sections de l'onglet Visualisation */
const VIZ_SECTIONS = [
  {
    id: 'title',
    icon: 'typography',
    name: 'Titre et source',
    sum: 'Aucun',
    body: (compact) =>
      compact
        ? [fld('Titre', input('', 'Facultatif')), fld('Source', input('', 'Facultatif'))]
        : [
            fld('Titre de la dataviz (facultatif) — styles de paragraphe : titre 1, titre 2, chiffre clé…', select('Texte')),
            rich(3),
            fld('Source (facultatif)', rich(1)),
          ],
  },
  {
    id: 'colors',
    icon: 'palette',
    name: 'Couleurs',
    sum: 'Bleu',
    body: () => [
      fld('Couleur de la série', dots('blue')),
      h('button', { type: 'button', class: 'pp-btn' }, ic('palette'), 'Couleurs du document'),
    ],
  },
  {
    id: 'lines',
    icon: 'chart-line',
    name: 'Lignes et points',
    sum: 'Courbe lissée',
    body: () => [
      fld('Forme', select('Courbe lissée', 'Segments', 'Escalier')),
      row('Afficher les points', false),
      row('Aire sous la courbe', false),
    ],
  },
  {
    id: 'labels',
    icon: 'letter-case',
    name: 'Étiquettes',
    sum: 'Valeurs masquées',
    body: () => [row('Afficher les valeurs', false), fld('Décimales', input('0')), fld('Suffixe', input('', 'ex. %'))],
  },
  {
    id: 'axes',
    icon: 'axis-x',
    name: 'Axes',
    sum: 'Auto',
    body: () => [fld('Axe X', select('Années', 'Texte')), fld('Axe Y — maximum', input('', 'Auto'))],
  },
  {
    id: 'side',
    icon: 'number',
    name: 'Chiffre à côté',
    sum: 'Aucun',
    body: () => [fld('Chiffre à côté', select('Aucun', 'À droite', 'Au-dessus')), fld('Texte sous le chiffre', rich(1))],
  },
  {
    id: 'height',
    icon: 'ruler-2',
    name: 'Hauteur',
    sum: 'Proportion 2:1',
    body: () => [fld('Hauteur', select('Proportion de la largeur', 'Fixe', 'Remplir')), fld('Format', select('2:1 (large)', '1:1', '4:3'))],
  },
];

/* tableau de données (fausses valeurs) */
const grid = () => {
  const cols = ['A', 'B', 'C', 'D', 'E'],
    head = ['Year', 'Billion metric tons'];
  const t = h('div', { class: 'vm-grid' });
  t.append(h('div', { class: 'vm-gh' }), ...cols.map((c, i) => h('div', { class: 'vm-gh c' + (i < 2 ? ' on' + i : ''), textContent: c })));
  t.append(
    h('div', { class: 'vm-rn', textContent: '1' }),
    ...cols.map((_, i) => h('div', { class: 'vm-gc head', textContent: head[i] || '' })),
  );
  YEARS.forEach((y, r) =>
    t.append(
      h('div', { class: 'vm-rn', textContent: String(r + 2) }),
      h('div', { class: 'vm-gc', textContent: String(y) }),
      h('div', { class: 'vm-gc', textContent: String(VALS[r]) }),
      h('div', { class: 'vm-gc' }),
      h('div', { class: 'vm-gc' }),
      h('div', { class: 'vm-gc' }),
    ),
  );
  return t;
};
const mapping = () =>
  h(
    'div',
    { class: 'vm-map' },
    h('div', { class: 'vm-sech', textContent: 'Colonnes à représenter' }),
    [
      ['Libellés / temps', 'A', 'x0'],
      ['Valeurs', 'B', 'x1'],
      ['Grille de graphiques', '', ''],
      ['Filtre de lignes', '', ''],
    ].map(([l, c, k]) =>
      h('div', { class: 'vm-maprow' }, h('span', { textContent: l }), h('b', { class: 'vm-chip ' + k, textContent: c || '—' })),
    ),
  );
const miniPreview = () =>
  h(
    'div',
    { class: 'vm-mini' },
    h('div', { class: 'vm-sech', textContent: 'Aperçu' }),
    h('div', { class: 'vm-minibox' }, lineChart(260, 130)),
    select('Colonne actuelle (454 px)', '1/2', 'Pleine largeur'),
  );
const sheet = (w, hh) => h('div', { class: 'vm-checker' }, h('div', { class: 'vm-sheet' }, lineChart(w, hh)));
const typeSel = () => h('div', { class: 'vm-type' }, ic('chart-line'), h('span', { textContent: 'Courbes' }), ic('chevron-down'));
const accordion = (o, repaint, compact) =>
  VIZ_SECTIONS.map((s) => {
    const open = o.open === s.id;
    return h(
      'section',
      { class: 'vm-acc' + (open ? ' open' : '') },
      h(
        'button',
        {
          type: 'button',
          class: 'vm-acc-h',
          'aria-expanded': String(open),
          onclick: () => {
            o.open = open ? '' : s.id;
            repaint();
          },
        },
        ic(s.icon),
        h('b', { textContent: s.name }),
        open ? null : h('em', { textContent: s.sum }),
        ic(open ? 'chevron-up' : 'chevron-right'),
      ),
      open ? h('div', { class: 'vm-acc-b' }, s.body(compact)) : null,
    );
  });
const tabsEl = (o, repaint, cls = '') =>
  h(
    'div',
    { class: 'vm-tabs ' + cls, role: 'tablist' },
    [
      ['viz', 'chart-line', 'Aperçu'],
      ['data', 'table', 'Données'],
    ].map(([k, i, l]) =>
      h(
        'button',
        {
          type: 'button',
          role: 'tab',
          'aria-selected': String(o.tab === k),
          class: o.tab === k ? 'on' : '',
          onclick: () => {
            o.tab = k;
            repaint();
          },
        },
        ic(i),
        l,
      ),
    ),
  );
const barBtns = () => [
  h('button', { type: 'button', class: 'vm-btn', textContent: 'Annuler' }),
  h('button', { type: 'button', class: 'vm-btn primary', textContent: 'Terminer' }),
];
const hist = () => [
  h('button', { type: 'button', class: 'vm-ib', 'aria-label': 'Annuler' }, ic('arrow-back-up')),
  h('button', { type: 'button', class: 'vm-ib', 'aria-label': 'Rétablir' }, ic('arrow-forward-up')),
];

/* ---------- Sujet « Éditeur dataviz » ---------- */
export function renderEditor(o, v, repaint) {
  const V = v.style,
    root = h('div', { class: 'vm vm-' + V });
  let bar, body;
  if (V === 'a') {
    // actuelle : onglets dans le panneau, largeur 360 px / 48 %, type au-dessus des onglets
    bar = h(
      'div',
      { class: 'vm-bar' },
      h('strong', { textContent: 'Éditeur de dataviz' }),
      ...hist(),
      h('label', { class: 'vm-z' }, 'Aperçu à la largeur ', select('Colonne actuelle (454 px)')),
      h('label', { class: 'vm-z' }, 'Zoom ', select('Ajuster')),
      h('span', { class: 'pp-sp' }),
      ...barBtns(),
    );
    const side = h(
      'aside',
      { class: 'vm-side', style: { width: o.tab === 'data' ? '48%' : '360px' } },
      h('div', { class: 'vm-type big' }, ic('chart-line'), h('span', { textContent: 'Type · Courbes' }), ic('chevron-down')),
      tabsEl(o, repaint, 'inside'),
      o.tab === 'data'
        ? h(
            'section',
            { class: 'vm-acc open' },
            h('div', { class: 'vm-acc-h' }, ic('table'), h('b', { textContent: 'Données' })),
            h(
              'div',
              { class: 'vm-acc-b' },
              h('div', { class: 'vm-drop', textContent: 'Déposez un CSV, TSV ou JSON ici, ou importez-le…' }),
              grid(),
            ),
          )
        : [VIZ_SECTIONS[0], VIZ_SECTIONS[6], VIZ_SECTIONS[1]].map((s) =>
            h(
              'section',
              { class: 'vm-acc open' },
              h('div', { class: 'vm-acc-h' }, ic(s.icon), h('b', { textContent: s.name })),
              h('div', { class: 'vm-acc-b' }, s.body(false)),
            ),
          ),
    );
    body = [
      side,
      h(
        'div',
        { class: 'vm-main' },
        h('div', { class: 'vm-hintbar', textContent: 'Les modifications du formulaire s’appliquent en direct.' }),
        sheet(o.tab === 'data' ? 330 : 520, o.tab === 'data' ? 200 : 300),
      ),
    ];
  } else if (V === 'b') {
    // largeur identique : panneau 340 px dans les deux onglets, onglets en tête du panneau
    bar = h(
      'div',
      { class: 'vm-bar' },
      h('strong', { textContent: 'Éditeur de dataviz' }),
      ...hist(),
      h('span', { class: 'pp-sp' }),
      ...barBtns(),
    );
    const side = h(
      'aside',
      { class: 'vm-side', style: { width: '340px' } },
      tabsEl(o, repaint, 'inside'),
      o.tab === 'data'
        ? [h('button', { type: 'button', class: 'vm-btn primary wide' }, ic('upload'), 'Importer des données'), mapping(), miniPreview()]
        : [typeSel(), ...accordion(o, repaint, true)],
    );
    body = [side, h('div', { class: 'vm-main' }, o.tab === 'data' ? h('div', { class: 'vm-tablewrap' }, grid()) : sheet(540, 320))];
  } else {
    // c : Flourish, panneau à droite ; d : Flourish, panneau à gauche
    bar = h(
      'div',
      { class: 'vm-bar flourish' },
      h('div', { class: 'vm-bl' }, h('strong', { textContent: 'Éditeur de dataviz' }), ...hist()),
      tabsEl(o, repaint),
      h('div', { class: 'vm-br' }, ...barBtns()),
    );
    const side = h(
      'aside',
      { class: 'vm-side flourish', style: { width: '320px' } },
      o.tab === 'data'
        ? [h('button', { type: 'button', class: 'vm-btn primary wide' }, ic('upload'), 'Importer des données'), mapping(), miniPreview()]
        : [
            h('div', { class: 'vm-sech', textContent: 'Type de graphique' }),
            typeSel(),
            h('div', { class: 'vm-sep' }),
            ...accordion(o, repaint, true),
          ],
    );
    const main = h(
      'div',
      { class: 'vm-main' },
      o.tab === 'data'
        ? h('div', { class: 'vm-tablewrap' }, grid())
        : [
            h(
              'div',
              { class: 'vm-viewbar' },
              h('label', { class: 'vm-z' }, 'Largeur ', select('Colonne (454 px)')),
              h('label', { class: 'vm-z' }, 'Zoom ', select('Ajuster')),
            ),
            sheet(560, 330),
          ],
    );
    body = V === 'c' ? [main, side] : [side, main];
  }
  root.append(bar, h('div', { class: 'vm-body' }, ...body.flat()));
  applyVars(root, cssVars(DEFAULT_THEME, {}));
  return root;
}

/* ---------- Sujet « Panneau colonne » ---------- */
const COL_CARDS = [
  {
    id: 'content',
    icon: 'chart-bar',
    name: 'Contenu',
    sum: 'Dataviz · Courbes',
    tab: 'content',
    body: () => [
      fld('Type de contenu', select('Dataviz', 'Texte', 'Image', 'Carte', 'Chiffre clé')),
      fld('Type de dataviz', select('Courbes', 'Barres', 'Anneau')),
      h('button', { type: 'button', class: 'vm-btn primary wide' }, ic('pencil'), 'Ouvrir l’éditeur de dataviz'),
      h('p', {
        class: 'vm-hint',
        textContent: 'Tous les réglages de la dataviz (type, données, couleurs, options) se font dans l’éditeur.',
      }),
    ],
  },
  {
    id: 'free',
    icon: 'text-size',
    name: 'Textes libres',
    sum: 'Aucun',
    adv: true,
    tab: 'content',
    body: () => [
      h('button', { type: 'button', class: 'pp-btn' }, ic('plus'), 'Ajouter un texte'),
      h('p', { class: 'vm-hint', textContent: 'Glisser un texte « libre » dans l’aperçu pour le placer où l’on veut dans la colonne.' }),
    ],
  },
  {
    id: 'height',
    icon: 'ruler-2',
    name: 'Hauteur',
    sum: 'Proportion 2:1',
    tab: 'layout',
    body: () => [fld('Hauteur', select('Proportion de la largeur', 'Fixe', 'Remplir')), fld('Format', select('2:1 (large)', '1:1'))],
  },
  {
    id: 'layout',
    icon: 'layout-align-middle',
    name: 'Disposition',
    sum: 'Haut',
    tab: 'layout',
    body: () => [
      fld(
        'Alignement vertical',
        h(
          'div',
          { class: 'seg' },
          ['align-box-top-center', 'align-box-center-middle', 'align-box-bottom-center'].map((i, k) =>
            h('button', { type: 'button', class: k ? '' : 'on' }, ic(i)),
          ),
        ),
      ),
      fld('Échanger le contenu avec…', select('—', 'Section 1 · Colonne 1')),
    ],
  },
  {
    id: 'box',
    icon: 'border-all',
    name: 'Fond et contour',
    sum: 'Aucun',
    tab: 'style',
    body: () => [fld('Fond', dots('')), row('Contour', false), fld('Hachures', dots(''))],
  },
];
export function renderColumn(o, v, repaint) {
  const V = v.style,
    root = h('div', { class: 'vm-col vm-col-' + V });
  const card = (c, collapsedSum) => {
    const open = o.open === c.id || V === 'a';
    return h(
      'section',
      { class: 'pp-card vm-card' },
      h(
        'div',
        {
          class: 'pp-card-h',
          onclick:
            V === 'a'
              ? null
              : () => {
                  o.open = open ? '' : c.id;
                  repaint();
                },
        },
        ic(c.icon),
        h('b', { textContent: c.name }),
        h('span', { class: 'pp-sp' }),
        collapsedSum && !open ? h('em', { class: 'vm-sum', textContent: c.sum }) : null,
        h('span', { class: 'pp-chev' }, ic('chevron-' + (open ? 'up' : 'down'))),
      ),
      open ? h('div', { class: 'pp-body' }, c.body()) : null,
    );
  };
  const danger = h('button', { type: 'button', class: 'pp-btn vm-danger' }, ic('trash'), 'Supprimer la colonne');
  if (V === 'a') {
    // actuelle : fil d'Ariane + titre, toutes les cartes dépliées, action destructrice au bout du défilement
    root.append(
      h('div', { class: 'pp-crumb', textContent: 'Progrès › Résultats annuels ›' }),
      h('h2', { textContent: 'Colonne 2' }),
      ...COL_CARDS.map((c) => card(c, false)),
      danger,
    );
  } else {
    const head = h(
      'div',
      { class: 'vm-idhead' },
      h(
        'div',
        { class: 'vm-id' },
        h('span', { class: 'vm-idic' }, ic('chart-line')),
        h(
          'div',
          {},
          h('div', { class: 'pp-crumb', textContent: 'Résultats annuels' }),
          h('h2', { textContent: 'Colonne 2' }),
          h('span', { class: 'vm-pill', textContent: 'Dataviz · Courbes' }),
        ),
      ),
      h(
        'div',
        { class: 'vm-actions' },
        [
          ['arrow-left', 'Colonne précédente'],
          ['arrow-right', 'Colonne suivante'],
          ['arrows-exchange', 'Échanger le contenu'],
          ['copy', 'Dupliquer'],
          ['trash', 'Supprimer la colonne'],
        ].map(([i, l], k) =>
          h('button', { type: 'button', class: 'vm-ib' + (k === 4 ? ' danger' : ''), title: l, 'aria-label': l }, ic(i)),
        ),
      ),
    );
    if (V === 'b') {
      // essentiel d'abord : tête collante, cartes repliées avec résumé, « avancé » à part
      root.append(
        head,
        h(
          'div',
          { class: 'vm-scroll' },
          ...COL_CARDS.filter((c) => !c.adv).map((c) => card(c, true)),
          h('div', { class: 'vm-sech', textContent: 'Avancé' }),
          ...COL_CARDS.filter((c) => c.adv).map((c) => card(c, true)),
        ),
      );
    } else {
      // c : onglets Contenu / Mise en page / Style
      const tabs = [
        ['content', 'Contenu'],
        ['layout', 'Mise en page'],
        ['style', 'Style'],
      ];
      root.append(
        head,
        h(
          'div',
          { class: 'pp-tabs', role: 'tablist' },
          tabs.map(([k, l]) =>
            h('button', {
              type: 'button',
              role: 'tab',
              'aria-selected': String(o.tab === k),
              class: o.tab === k ? 'on' : '',
              onclick: () => {
                o.tab = k;
                repaint();
              },
              textContent: l,
            }),
          ),
        ),
        h(
          'div',
          { class: 'vm-scroll flat' },
          ...COL_CARDS.filter((c) => c.tab === o.tab).map((c) =>
            h(
              'section',
              { class: 'vm-flat' },
              h('div', { class: 'pp-sec-h' }, ic(c.icon), h('span', { textContent: c.name })),
              h('div', { class: 'pp-body' }, c.body()),
            ),
          ),
        ),
      );
    }
  }
  applyVars(root, cssVars(DEFAULT_THEME, {}));
  return h(
    'div',
    { class: 'vm-colwrap' },
    root,
    h(
      'div',
      { class: 'vm-note' },
      h('b', { textContent: V === 'a' ? 'Aujourd’hui' : 'Piste ' + v.style.toUpperCase() }),
      h('p', {
        textContent:
          V === 'a'
            ? 'Cinq cartes dépliées d’office : « Contenu » (le seul vrai réglage d’une dataviz) est suivi de quatre cartes quasi vides ; la suppression est tout en bas.'
            : V === 'b'
              ? 'Tête collante (qui je modifie + actions d’élément à portée de main), cartes repliées avec leur valeur actuelle en résumé, une seule ouverte à la fois, le rare dans « Avancé ».'
              : 'Même tête collante, puis trois onglets : on ne voit que le sujet choisi, aucune carte à replier.',
      }),
    ),
  );
}
