/* Sélecteurs « riches » de l'éditeur : un bouton avec un aperçu (pastille de couleur, icône…) et, quand il y a la place, le nom ;
   la liste qui s'ouvre montre l'aperçu et le nom de chaque choix. `colorSelect` (couleurs) et `iconSelect` (iconselect.js) en sont des variantes. */
import { h, ico } from './render.js';
import { t } from './i18n.js';
import { cssVars, DEFAULT_THEME } from './tokens.js';

const FALLBACK = cssVars(DEFAULT_THEME, {});
const dot = (k) =>
  h('i', {
    class: 'cs-dot' + (k === '' ? ' auto' : ''),
    style: k === '' ? {} : { background: `var(--c-${k}, ${FALLBACK['--c-' + k] || 'transparent'})` },
  });
let open = null;
const close = () => {
  if (!open) return;
  const o = open;
  open = null;
  document.removeEventListener('pointerdown', o.away, true);
  document.removeEventListener('keydown', o.key, true);
  o.pop.remove();
  o.btn.setAttribute('aria-expanded', 'false');
};

/** options : { clé → libellé } ('' = automatique) ; lead(clé) → nœud d'aperçu ; text : afficher aussi le nom sur le bouton */
export function richSelect({ value, options, onChange, text = false, lead, footer }) {
  let cur = value;
  const label = (k) => (k === '' ? t('Auto') : t(options[k] ?? k));
  const btn = h('button', {
    type: 'button',
    class: 'cs' + (text ? ' cs-text' : ''),
    'aria-haspopup': 'listbox',
    'aria-expanded': 'false',
    title: label(cur),
  });
  const paint = () => {
    btn.replaceChildren(
      ...[lead(cur), text ? h('span', { class: 'cs-lab', textContent: label(cur) }) : null, ico('chevron-down')].filter(Boolean),
    );
    btn.title = label(cur);
  };
  paint();
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (open && open.btn === btn) {
      close();
      return;
    }
    close();
    const pop = h(
      'div',
      { class: 'cs-pop', role: 'listbox' },
      Object.keys(options).map((k) =>
        h(
          'button',
          {
            type: 'button',
            role: 'option',
            class: 'cs-opt' + (k === cur ? ' on' : ''),
            'aria-selected': String(k === cur),
            onclick: () => {
              cur = k;
              paint();
              close();
              onChange(k);
            },
          },
          lead(k),
          h('span', { textContent: label(k) }),
        ),
      ),
    );
    if (footer)
      pop.append(
        footer({
          close,
          pick: (k) => {
            cur = k;
            paint();
            close();
            onChange(k);
          },
        }),
      );
    (btn.closest('.ve, .props, .panel, .labo-opts') || document.body).append(pop); // dans un conteneur qui porte les variables de couleur du document
    const r = btn.getBoundingClientRect(),
      w = Math.min(320, Math.max(300, r.width)),
      hh = pop.offsetHeight;
    Object.assign(pop.style, {
      width: w + 'px',
      left: Math.max(8, Math.min(window.innerWidth - w - 8, r.left)) + 'px',
      top: (r.bottom + hh + 12 > window.innerHeight ? Math.max(8, r.top - hh - 4) : r.bottom + 4) + 'px',
    });
    btn.setAttribute('aria-expanded', 'true');
    const away = (ev) => {
        if (!pop.contains(ev.target) && !btn.contains(ev.target)) close();
      },
      key = (ev) => {
        if (ev.key === 'Escape') {
          ev.stopPropagation();
          close();
        }
      };
    document.addEventListener('pointerdown', away, true);
    document.addEventListener('keydown', key, true);
    open = { pop, btn, away, key };
  });
  return btn;
}

export const colorSelect = (o) => richSelect({ ...o, lead: dot });
