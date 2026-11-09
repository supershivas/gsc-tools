/* Labo : où ranger toutes les cartes liées au texte dans le panneau de propriétés d'une colonne texte ?
   Les cartes d'aujourd'hui (Contenu, Hauteur, Disposition, Fond et contour, Textes libres, Chiffre à côté) + les nouvelles
   (styles en galerie, burger d'options avancées — déjà branchés — puis police et taille, liste, pistes : propositions).
   Rien n'est lu ni écrit ; la fenêtre du panneau a la hauteur réelle de l'éditeur pour qu'on mesure le défilement. */
import { h } from './render.js';
import { PSTYLES, GROUPS, specOf } from './textstyles.js';
import { TYPE, FONT } from './tokens.js';
import { advPanel } from './textadv.js';

const ic = (n) => h('i', { class: 'ti ti-' + n });
export const panelTextOpts = () => ({ open: 'content', tab: 'content', sub: 'write', gal: false, burger: false, adv: {} });

/* ---------- briques ---------- */
const F = (label, node) => h('div', { class: 'tx-f' }, h('div', { class: 'tx-l', textContent: label }), node);
const sel = (...o) =>
  h(
    'select',
    {},
    o.map((x) => h('option', { textContent: x })),
  );
const seg = (items, cur) =>
  h(
    'div',
    { class: 'tx-seg' },
    items.map((x) => h('button', { type: 'button', class: x === cur ? 'on' : '', textContent: x })),
  );
const sw = (label, on) =>
  h(
    'div',
    { class: 'pp-switchrow' },
    h('span', { textContent: label }),
    h('button', {
      type: 'button',
      role: 'switch',
      'aria-checked': String(!!on),
      class: 'pp-switch' + (on ? ' on' : ''),
      onclick: (e) => e.currentTarget.classList.toggle('on'),
    }),
  );
const dots = (on) =>
  h(
    'div',
    { class: 'pp-dots' },
    ['blue', 'sky', 'yellow', 'slate', 'grey'].map((c) =>
      h('button', { type: 'button', class: 'pp-dot' + (c === on ? ' on' : ''), 'aria-label': c, style: { background: `var(--c-${c})` } }),
    ),
  );
const num = (v, label) => F(label, h('input', { type: 'number', value: v }));

const tile = (p, on) => {
  const ty = TYPE[p.type];
  return h(
    'button',
    { type: 'button', class: 're-tile' + (on ? ' on' : '') },
    h('span', {
      class: 're-aa',
      style: { fontFamily: FONT[ty.family], fontWeight: ty.weight, fontStyle: p.italic ? 'italic' : 'normal' },
      textContent: p.upper ? 'AB' : 'Aa',
    }),
    h('span', { class: 're-tt' }, h('b', { textContent: p.n }), h('i', { textContent: specOf(p.k) })),
  );
};

/* éditeur riche tel qu'il est branché : barre (style ▾, B I U x² x₂, liste, burger), galerie, options avancées, saisie */
function editor(o, repaint) {
  const bt = (n, l) =>
    h('button', { type: 'button', class: 'mini', title: l }, typeof n === 'string' && n.startsWith('ti-') ? ic(n.slice(3)) : n);
  const gbtn = h(
    'button',
    {
      type: 'button',
      class: 're-gbtn',
      'aria-expanded': String(o.gal),
      onclick: () => {
        o.gal = !o.gal;
        repaint();
      },
    },
    h('span', { class: 're-gname', textContent: 'Texte' }),
    ic('chevron-down'),
  );
  const burger = h(
    'button',
    {
      type: 'button',
      class: 'mini re-burger' + (o.burger ? ' on' : ''),
      title: 'Options avancées',
      onclick: () => {
        o.burger = !o.burger;
        repaint();
      },
    },
    ic('menu-2'),
  );
  return h(
    'div',
    { class: 're-wrap' },
    h(
      'div',
      { class: 'row fmt' },
      gbtn,
      bt('B', 'Gras'),
      bt(h('i', { textContent: 'I' }), 'Italique'),
      bt(h('u', { textContent: 'U' }), 'Souligné'),
      bt('x²', 'Exposant'),
      bt('x₂', 'Indice'),
      bt('ti-list', 'Liste'),
      burger,
    ),
    o.gal
      ? h(
          'div',
          { class: 're-gal' },
          GROUPS.flatMap((g) => [
            h('div', { class: 're-gg', textContent: g }),
            ...PSTYLES.filter((p) => p.g === g).map((p) => tile(p, p.k === 'body')),
          ]),
        )
      : null,
    o.burger ? advPanel(o.adv, () => {}, null) : null,
    h(
      'div',
      { class: 're', style: { minHeight: '84px' } },
      'Depuis 2021, l’Union finance des équipements et des formations pour ses partenaires.',
    ),
    h('div', { class: 'hint', textContent: 'Entrée = nouveau paragraphe · Maj + Entrée = retour à la ligne' }),
  );
}

/* ---------- les cartes : { id, icon, name, sum, nw (nouveau), tab (variante B), body } ---------- */
const cards = (o, repaint) => ({
  content: {
    icon: 'text-size',
    name: 'Contenu',
    sum: 'Texte',
    tab: 'content',
    body: () => [F('Type de contenu', sel('Texte', 'Image', 'Carte', 'Dataviz', 'Chiffre clé')), editor(o, repaint)],
  },
  font: {
    icon: 'letter-case',
    name: 'Police et taille',
    sum: 'Sans · 12 pt',
    nw: true,
    tab: 'text',
    body: () => [
      F('Police', seg(['Source Sans 3', 'Source Serif 4'], 'Source Sans 3')),
      F('Taille', sel('8 pt', '10 pt', '12 pt', '14 pt', '21 pt')),
    ],
  },
  list: {
    icon: 'list-numbers',
    name: 'Liste',
    sum: 'Aucune',
    nw: true,
    tab: 'text',
    body: () => [
      F('Type', seg(['Aucune', 'Puces', 'Numérotée'], 'Aucune')),
      F('Repère', sel('1. 2. 3.', '• disque', '– tiret', 'a. b. c.')),
      num(1, 'Commencer à'),
    ],
  },
  para: {
    icon: 'align-justified',
    name: 'Paragraphe',
    sum: 'Selon vos pistes',
    nw: true,
    tab: 'text',
    body: () => [
      sw('Césure automatique', false),
      sw('Filet avant le paragraphe', false),
      sw('Lettrine', false),
      h('p', { class: 'tx-hint', textContent: 'Les pistes que vous retenez prendront place ici (retrait, justifié, citation à filet…).' }),
    ],
  },
  height: {
    icon: 'ruler-2',
    name: 'Hauteur',
    sum: 'Auto',
    tab: 'block',
    body: () => [
      num(0, 'Hauteur minimale de la colonne (px)'),
      h('p', { class: 'tx-hint', textContent: 'Ou glisser la poignée sous la colonne dans l’aperçu.' }),
    ],
  },
  layout: {
    icon: 'layout-align-middle',
    name: 'Disposition',
    sum: 'Haut',
    tab: 'block',
    body: () => [
      F('Alignement vertical', seg(['Haut', 'Centre', 'Bas'], 'Haut')),
      F('Alignement du texte', seg(['Gauche', 'Centré', 'Droite', 'Justifié'], 'Gauche')),
      F('Échanger le contenu avec…', sel('—', 'Colonne 2')),
    ],
  },
  box: {
    icon: 'border-all',
    name: 'Fond et contour',
    sum: 'Aucun',
    tab: 'block',
    body: () => [F('Fond', dots('')), sw('Contour', false), F('Hachures', dots(''))],
  },
  free: {
    icon: 'text-size',
    name: 'Textes libres',
    sum: 'Aucun',
    adv: true,
    tab: 'block',
    body: () => [
      h('button', { type: 'button', class: 'pp-btn' }, ic('plus'), 'Ajouter un texte'),
      h('p', { class: 'tx-hint', textContent: 'Glisser un texte « libre » dans l’aperçu pour le placer.' }),
    ],
  },
  side: {
    icon: 'number',
    name: 'Chiffre à côté',
    sum: 'Aucun',
    adv: true,
    tab: 'block',
    body: () => [F('Position', sel('Aucun', 'À droite', 'Au-dessus')), F('Chiffre', h('input', { type: 'text', value: '' }))],
  },
});
const ORDER = ['content', 'font', 'list', 'para', 'height', 'layout', 'box', 'free', 'side'];

const accCard = (id, c, open, toggle, body) =>
  h(
    'section',
    { class: 'pp-card tx-card' + (open ? ' open' : '') },
    h(
      'button',
      { type: 'button', class: 'tp-acc', 'aria-expanded': String(open), onclick: toggle },
      ic(c.icon),
      h('b', { textContent: c.name }),
      c.nw ? h('i', { class: 'tx-new', textContent: 'nouveau' }) : null,
      h('span', { class: 'pp-sp' }),
      h('span', { class: 'tp-sum', textContent: c.sum }),
      ic('chevron-' + (open ? 'up' : 'down')),
    ),
    open ? h('div', { class: 'pp-body' }, body) : null,
  );
const head = () =>
  h(
    'div',
    { class: 'tp-head' },
    h('span', { class: 'tp-ic' }, ic('typography')),
    h(
      'div',
      {},
      h('div', { class: 'tp-cr', textContent: 'Key figures at a glance › Context' }),
      h('b', { textContent: 'Colonne 1' }),
      h('span', { class: 'tp-pill', textContent: 'Texte' }),
    ),
  );
const search = () => h('div', { class: 'tp-search' }, ic('search'), h('span', { textContent: 'Chercher un réglage…' }));

/* ---------- rendu ---------- */
export function renderTextPanel(o, v, repaint) {
  const V = v.style,
    C = cards(o, repaint),
    body = h('div', { class: 'tp-body' });
  const acc = (id) => {
    const c = C[id];
    return accCard(
      id,
      c,
      o.open === id,
      () => {
        o.open = o.open === id ? null : id;
        repaint();
      },
      c.body(),
    );
  };
  let note;
  if (V === 'a') {
    body.append(
      ...ORDER.slice(0, 8)
        .filter((id) => id !== 'free')
        .map(acc),
      h('div', { class: 'pr-adv tp-adv', textContent: 'Avancé' }),
      acc('free'),
      acc('side'),
    );
    note =
      'Neuf cartes à la suite, une seule ouverte à la fois ; les trois nouvelles s’intercalent après « Contenu ». Tout est à un clic, mais la liste s’allonge.';
  } else if (V === 'b') {
    const tabs = [
      ['content', 'Contenu'],
      ['text', 'Texte'],
      ['block', 'Bloc'],
    ];
    body.append(
      h(
        'div',
        { class: 'tp-tabs' },
        tabs.map(([k, l]) =>
          h(
            'button',
            {
              type: 'button',
              class: k === o.tab ? 'on' : '',
              onclick: () => {
                o.tab = k;
                o.open = ORDER.find((id) => C[id].tab === k);
                repaint();
              },
            },
            l,
          ),
        ),
      ),
      ...ORDER.filter((id) => C[id].tab === o.tab).map(acc),
    );
    note =
      'Trois onglets : Contenu (saisie, styles, burger), Texte (police, liste, paragraphe) et Bloc (hauteur, disposition, cadre, textes libres). Trois à quatre cartes par onglet, jamais de long défilement.';
  } else {
    const subs = [
      ['write', 'Saisie'],
      ['font', 'Police'],
      ['list', 'Liste'],
      ['para', 'Paragraphe'],
    ];
    const inner =
      o.sub === 'write'
        ? [F('Type de contenu', sel('Texte', 'Image', 'Carte', 'Dataviz', 'Chiffre clé')), editor(o, repaint)]
        : C[o.sub].body();
    const textCard = h(
      'section',
      { class: 'pp-card tx-card' },
      h('div', { class: 'pp-card-h' }, ic('text-size'), h('b', { textContent: 'Texte' }), h('span', { class: 'pp-sp' })),
      h(
        'div',
        { class: 'pp-body' },
        h(
          'div',
          { class: 'tx-seg wide' },
          subs.map(([k, l]) =>
            h(
              'button',
              {
                type: 'button',
                class: k === o.sub ? 'on' : '',
                onclick: () => {
                  o.sub = k;
                  repaint();
                },
              },
              l,
            ),
          ),
        ),
        inner,
      ),
    );
    const blk = h(
      'section',
      { class: 'pp-card tx-card' },
      h(
        'div',
        { class: 'pp-card-h' },
        ic('layout-align-middle'),
        h('b', { textContent: 'Bloc' }),
        h('span', { class: 'pp-sp' }),
        h('span', { class: 'tp-sum', textContent: 'Haut · auto' }),
      ),
      h('div', { class: 'pp-body' }, C.layout.body(), C.height.body(), C.box.body()),
    );
    body.append(textCard, blk, h('div', { class: 'pr-adv tp-adv', textContent: 'Avancé' }), acc('free'), acc('side'));
    note =
      'Une seule carte « Texte » à sous-onglets (Saisie, Police, Liste, Paragraphe) + une carte « Bloc » qui fusionne hauteur, disposition et cadre : cinq cartes au total, le reste sous « Avancé ».';
  }
  const panel = h('aside', { class: 'tp-panel' }, head(), search(), body);
  requestAnimationFrame(() => {
    const n = document.querySelector('.tp-count');
    if (n)
      n.textContent = `${panel.querySelectorAll('.pp-card').length} cartes visibles · ${Math.round(panel.querySelector('.tp-body').scrollHeight)} px de contenu`;
  });
  return h(
    'div',
    { class: 'tx tp' },
    panel,
    h(
      'div',
      { class: 'tp-side' },
      h('div', { class: 'tx-cap', textContent: 'Panneau de propriétés (colonne texte)' }),
      h('p', { class: 'tx-hint', textContent: note }),
      h('div', { class: 'tp-count' }),
      h('p', {
        class: 'tx-hint',
        textContent:
          'Déjà branchés : galerie de styles dans la carte et burger dans la barre (dernier bouton). Police, liste et paragraphe sont des emplacements à confirmer.',
      }),
    ),
  );
}
