/* Labo : cinq présentations du panneau de propriétés (ici celui du header, le plus chargé).
   Même contenu partout ; seuls la structure, les espacements et les contrôles changent. Rien n'est lu ni écrit. */
import { h } from './render.js';
import { paletteKeys, cssVars, applyVars, DEFAULT_THEME } from './tokens.js';

const KEYS = paletteKeys({ theme: DEFAULT_THEME, colors: {} });
const LOGOS = {
  default: ['Défaut', 'assets/c069bffefa.png'],
  mono: ['Mono', 'assets/d9742f1219.png'],
  white: ['Blanc', 'assets/4a5a41080e.png'],
  negative: ['Négatif', 'assets/5ec5fb8b6a.png'],
};

export const panelOpts = () => ({
  overline: 'FACTSHEET - DECEMBER 2026',
  title: 'European Peace Facility',
  subtitle: 'A great news for peace in the world',
  bg: 'blue',
  fg: 'white',
  showImage: true,
  showLogo: true,
  logo: 'negative',
  tab: 'text',
  closed: {},
});

export function renderPanel(o, v, repaint) {
  const V = v.style;
  const set = (k, val) => {
    o[k] = val;
    repaint();
  };
  const text = (k) =>
    h('input', {
      type: 'text',
      value: o[k],
      oninput: (e) => {
        o[k] = e.target.value;
      },
    });
  const field = (label, control) =>
    h(
      'label',
      { class: 'pp-f' + (V === 'e' ? ' pp-row' : '') },
      h('span', { class: 'pp-l', textContent: V === 'e' ? label.replace(/ \(.*\)/, '') : label }),
      control,
    );
  const dots = (label, k) =>
    h(
      'div',
      { class: 'pp-f' + (V === 'e' ? ' pp-row' : '') },
      h('span', { class: 'pp-l', textContent: label }),
      h(
        'div',
        { class: 'pp-dots' },
        KEYS.map((c) =>
          h('button', {
            type: 'button',
            class: 'pp-dot' + (o[k] === c ? ' on' : ''),
            'aria-label': c,
            style: { background: `var(--c-${c})` },
            onclick: () => set(k, c),
          }),
        ),
      ),
    );
  const logoSel = h(
    'select',
    { onchange: (e) => set('logo', e.target.value) },
    Object.entries(LOGOS).map(([k, [l]]) => h('option', { value: k, textContent: `${l} — original`, selected: o.logo === k })),
  );

  const blocks = {
    text: () => [
      field('Surtitre', text('overline')),
      field('Titre (taille fixe)', text('title')),
      field('Sous-titre (vide = masqué)', text('subtitle')),
    ],
    colors: () => [dots('Fond', 'bg'), dots('Texte', 'fg')],
    image: () => [
      h(
        'div',
        { class: 'pp-tiles' },
        h('div', { class: 'pp-tile on' }, h('img', { src: 'assets/Asset 1.svg', alt: '' }), h('span', { textContent: 'Par défaut' })),
        h('button', { type: 'button', class: 'pp-tile pp-add' }, h('i', { class: 'ti ti-plus' }), h('span', { textContent: 'Ajouter' })),
      ),
      h('p', {
        class: 'pp-hint',
        textContent: 'Affichée sur 132 px de haut, largeur selon l’image. L’image par défaut reste toujours disponible.',
      }),
    ],
    logo: () => [
      field('Version', logoSel),
      h(
        'div',
        { class: 'pp-logo' + (o.logo === 'white' || o.logo === 'negative' ? ' dark' : '') },
        h('img', { src: LOGOS[o.logo][1], alt: '' }),
      ),
      h('button', { type: 'button', class: 'pp-btn' }, h('i', { class: 'ti ti-upload' }), 'Charger une autre image…'),
      h('p', { class: 'pp-hint', textContent: '138 × 42 px, PNG transparent ou SVG. Les 4 versions ont la même taille.' }),
    ],
  };
  const groups = [
    { id: 'text', title: 'Texte', icon: 'typography' },
    { id: 'colors', title: 'Couleurs', icon: 'palette' },
    { id: 'image', title: 'Image', icon: 'photo', toggle: 'showImage' },
    { id: 'logo', title: 'Logo', icon: 'certificate', toggle: 'showLogo' },
  ];
  const on = (g) => !g.toggle || o[g.toggle];
  const body = (g) => h('div', { class: 'pp-body' }, on(g) ? blocks[g.id]() : null);
  const sw = (g) =>
    h('button', {
      type: 'button',
      role: 'switch',
      'aria-checked': String(!!o[g.toggle]),
      'aria-label': g.title,
      class: 'pp-switch' + (o[g.toggle] ? ' on' : ''),
      onclick: () => set(g.toggle, !o[g.toggle]),
    });

  let content;
  if (V === 'a') {
    // actuelle : tout à plat, cases à cocher
    content = groups.flatMap((g) => [
      g.toggle
        ? h(
            'label',
            { class: 'pp-check' },
            h('input', { type: 'checkbox', checked: !!o[g.toggle], onchange: (e) => set(g.toggle, e.target.checked) }),
            `Afficher ${g.id === 'image' ? 'l’image' : 'le logo'}`,
          )
        : null,
      body(g),
    ]);
  } else if (V === 'b') {
    // cartes repliables
    content = groups.map((g) => {
      const open = !o.closed[g.id];
      return h(
        'section',
        { class: 'pp-card' },
        h(
          'div',
          { class: 'pp-card-h' },
          h('i', { class: 'ti ti-' + g.icon }),
          h('b', { textContent: g.title }),
          h('span', { class: 'pp-sp' }),
          g.toggle ? sw(g) : null,
          h(
            'button',
            {
              type: 'button',
              class: 'pp-chev',
              'aria-expanded': String(open),
              'aria-label': open ? 'Replier' : 'Déplier',
              onclick: () => {
                o.closed[g.id] = open;
                repaint();
              },
            },
            h('i', { class: 'ti ti-chevron-' + (open ? 'up' : 'down') }),
          ),
        ),
        open ? body(g) : null,
      );
    });
  } else if (V === 'c') {
    // onglets
    const tabs = { text: ['Texte', ['text']], colors: ['Couleurs', ['colors']], media: ['Médias', ['image', 'logo']] };
    content = [
      h(
        'div',
        { class: 'pp-tabs', role: 'tablist' },
        Object.entries(tabs).map(([k, [l]]) =>
          h(
            'button',
            {
              type: 'button',
              role: 'tab',
              class: o.tab === k ? 'on' : '',
              'aria-selected': String(o.tab === k),
              onclick: () => set('tab', k),
            },
            l,
          ),
        ),
      ),
      ...tabs[o.tab][1].map((id) => {
        const g = groups.find((x) => x.id === id);
        return h(
          'section',
          { class: 'pp-sec' },
          g.toggle ? h('div', { class: 'pp-sec-h' }, h('span', { textContent: g.title }), sw(g)) : null,
          body(g),
        );
      }),
    ];
  } else {
    // d : sections à plat séparées par un filet ; e : même chose, étiquettes à gauche
    content = groups.map((g) =>
      h(
        'section',
        { class: 'pp-sec' },
        h(
          'div',
          { class: 'pp-sec-h' },
          h('i', { class: 'ti ti-' + g.icon }),
          h('span', { textContent: g.title }),
          h('span', { class: 'pp-sp' }),
          g.toggle ? sw(g) : null,
        ),
        body(g),
      ),
    );
  }
  const root = h(
    'div',
    { class: `pp pp-${V}` },
    h('div', { class: 'pp-crumb', textContent: 'Document ›' }),
    h('h2', { textContent: 'Header' }),
    ...content,
  );
  applyVars(root, cssVars(DEFAULT_THEME, {}));
  return root;
}
