/* Carte repliable commune aux panneaux (propriétés de l'accueil, éditeur de dataviz) : en-tête (icône, nom, interrupteur facultatif, chevron) + corps.
   shut = Set des cartes repliées (gardé par l'appelant), refresh() = redessin du panneau, toggle = nœud de l'interrupteur, live = false replie le corps. */
import { h, ico } from './render.js';
import { t } from './i18n.js';
import { helpBtn } from './help.js';

/* Recherche de réglage : `st` = { q, focus } gardé par le panneau ; les cartes s'ouvrent toutes quand une recherche est en cours, puis `applyFilter` masque ce qui ne correspond pas */
export function searchBox(st, refresh) {
  const inp = h('input', {
    type: 'search',
    class: 'pp-q',
    placeholder: t('Rechercher un réglage'),
    'aria-label': t('Rechercher un réglage'),
    value: st.q,
    oninput: (e) => {
      st.q = e.target.value;
      st.focus = true;
      refresh();
    },
  });
  return h('label', { class: 'pp-search' }, ico('search'), inp);
}
export function applyFilter(root, st) {
  const inp = root.querySelector('.pp-q'); // le panneau vient d'être reconstruit : on rend le focus tout de suite (sinon les touches suivantes sont perdues)
  if (st.focus && inp) {
    inp.focus();
    inp.setSelectionRange(inp.value.length, inp.value.length);
    st.focus = false;
  }
  const n = st.q.trim().toLowerCase();
  if (!n) return;
  setTimeout(() => {
    // après la traduction de l'interface (MutationObserver) : on cherche dans la langue affichée
    root.querySelectorAll('.pr-adv').forEach((x) => {
      x.style.display = 'none';
    });
    let shown = 0;
    root.querySelectorAll('.pp-card').forEach((card) => {
      const name = ((card.querySelector('.pp-card-h b') || {}).textContent || '').toLowerCase(),
        body = card.querySelector('.pp-body');
      let any = name.includes(n);
      if (body && !any)
        [...body.children].forEach((ch) => {
          const hit = ch.textContent.toLowerCase().includes(n);
          ch.style.display = hit ? '' : 'none';
          any = any || hit;
        });
      card.style.display = any ? '' : 'none';
      if (any) shown++;
    });
    root.querySelectorAll('.pp-empty').forEach((x) => x.remove());
    if (!shown) {
      const first = root.querySelector('.pp-search');
      if (first)
        first.after(
          h(
            'div',
            { class: 'pp-empty', role: 'status' },
            h('p', { textContent: `${t('Aucun réglage ne correspond à')} « ${st.q.trim()} »` }),
            h(
              'button',
              {
                type: 'button',
                class: 'pp-btn',
                onclick: () => {
                  const inp = root.querySelector('.pp-q');
                  inp.value = '';
                  inp.dispatchEvent(new Event('input')); // même chemin que la frappe : le panneau se reconstruit
                },
              },
              h('span', { textContent: t('Effacer la recherche') }),
            ),
          ),
        );
    }
  }, 0);
}

/* acc = { cur, first } : mode accordéon (une seule carte ouverte ; `first` tant que rien n'a été choisi) ; sum = valeur actuelle affichée quand la carte est repliée */
let cardSeq = 0;
export function cardEl(id, icon, name, nodes, { shut, refresh, toggle = null, live = true, acc = null, sum = '', q = '' }) {
  const open = q ? true : acc ? (acc.cur ?? acc.first) === id : !shut.has(id),
    show = open && (live || !!q),
    bodyId = 'pp-body-' + ++cardSeq;
  const flip = () => {
    if (acc) acc.cur = open ? '' : id;
    else {
      open ? shut.add(id) : shut.delete(id);
    }
    refresh();
  };
  return h(
    'section',
    { class: 'pp-card' },
    /* tout l'en-tête replie ou déplie la carte (sauf ses boutons : interrupteur, aide) */
    h(
      'div',
      {
        class: 'pp-card-h',
        onclick: (e) => {
          if (!e.target.closest('button, input, select, a') || e.target.closest('.pp-chev')) flip();
        },
      },
      ico(icon),
      h('b', { textContent: name }),
      helpBtn(name),
      h('span', { class: 'pp-sp' }),
      !open && sum ? h('em', { class: 'pp-sum', textContent: sum }) : null,
      toggle,
      h(
        'button',
        {
          type: 'button',
          class: 'pp-chev',
          'aria-expanded': String(open),
          'aria-controls': show ? bodyId : null,
          'aria-label': `${open ? t('Replier') : t('Déplier')} · ${name}`, // le nom de la carte : sinon tous les boutons s'annoncent pareil
        },
        ico(open ? 'chevron-up' : 'chevron-down'),
      ),
    ),
    show ? h('div', { class: 'pp-body', id: bodyId, role: 'region', 'aria-label': name }, nodes.flat().filter(Boolean)) : null,
  );
}
