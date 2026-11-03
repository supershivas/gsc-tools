/* Carte repliable commune aux panneaux (propriétés de l'accueil, éditeur de dataviz) : en-tête (icône, nom, interrupteur facultatif, chevron) + corps.
   shut = Set des cartes repliées (gardé par l'appelant), refresh() = redessin du panneau, toggle = nœud de l'interrupteur, live = false replie le corps. */
import { h, ico } from './render.js';
import { t } from './i18n.js';

export function cardEl(id, icon, name, nodes, { shut, refresh, toggle = null, live = true }) {
  const open = !shut.has(id), show = open && live;
  return h('section', { class: 'pp-card' },
    h('div', { class: 'pp-card-h' }, ico(icon), h('b', { textContent: name }), h('span', { class: 'pp-sp' }), toggle,
      h('button', { type: 'button', class: 'pp-chev', 'aria-expanded': String(open), 'aria-label': open ? t('Replier') : t('Déplier'),
        onclick: () => { open ? shut.add(id) : shut.delete(id); refresh(); } }, ico(open ? 'chevron-up' : 'chevron-down'))),
    show ? h('div', { class: 'pp-body' }, nodes.flat().filter(Boolean)) : null);
}
