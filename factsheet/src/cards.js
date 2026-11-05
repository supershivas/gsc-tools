/* Carte repliable commune aux panneaux (propriétés de l'accueil, éditeur de dataviz) : en-tête (icône, nom, interrupteur facultatif, chevron) + corps.
   shut = Set des cartes repliées (gardé par l'appelant), refresh() = redessin du panneau, toggle = nœud de l'interrupteur, live = false replie le corps. */
import { h, ico } from './render.js';
import { t } from './i18n.js';
import { helpBtn } from './help.js';

/* acc = { cur, first } : mode accordéon (une seule carte ouverte ; `first` tant que rien n'a été choisi) ; sum = valeur actuelle affichée quand la carte est repliée */
export function cardEl(id, icon, name, nodes, { shut, refresh, toggle = null, live = true, acc = null, sum = '' }) {
  const open = acc ? (acc.cur ?? acc.first) === id : !shut.has(id), show = open && live;
  const flip = () => { if (acc) acc.cur = open ? '' : id; else { open ? shut.add(id) : shut.delete(id); } refresh(); };
  return h('section', { class: 'pp-card' },
    /* tout l'en-tête replie ou déplie la carte (sauf ses boutons : interrupteur, aide) */
    h('div', { class: 'pp-card-h', onclick: e => { if (!e.target.closest('button, input, select, a') || e.target.closest('.pp-chev')) flip(); } }, ico(icon), h('b', { textContent: name }), helpBtn(name), h('span', { class: 'pp-sp' }), !open && sum ? h('em', { class: 'pp-sum', textContent: sum }) : null, toggle,
      h('button', { type: 'button', class: 'pp-chev', 'aria-expanded': String(open), 'aria-label': open ? t('Replier') : t('Déplier'),
        }, ico(open ? 'chevron-up' : 'chevron-down'))),
    show ? h('div', { class: 'pp-body' }, nodes.flat().filter(Boolean)) : null);
}
