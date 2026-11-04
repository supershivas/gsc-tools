/* Choix du gabarit de colonnes : un petit schéma (les colonnes, à leur largeur relative) + le libellé, dans le bouton et dans la liste. */
import { h, ico } from './render.js';
import { t } from './i18n.js';
import { s } from './viz/util.js';

export function layoutSchema(L, w = 44, hh = 14) {
  const gap = 2, unit = (w - (L.cols - 1) * gap) / L.cols, svg = s('svg', { width: w, height: hh, viewBox: `0 0 ${w} ${hh}`, class: 'ls-schema', 'aria-hidden': 'true' });
  let start = 0;
  for (const sp of L.spans) { svg.append(s('rect', { x: start * (unit + gap) + 0.5, y: 0.5, width: sp * unit + (sp - 1) * gap - 1, height: hh - 1, rx: 2, fill: 'currentColor', 'fill-opacity': 0.18, stroke: 'currentColor', 'stroke-width': 1 })); start += sp; }
  return svg;
}

let open = null;
const close = () => { if (!open) return; const o = open; open = null; document.removeEventListener('pointerdown', o.away, true); document.removeEventListener('keydown', o.key, true); o.pop.remove(); o.btn.setAttribute('aria-expanded', 'false'); };

/** layouts : GRID.layouts (clé → { label, cols, spans, hidden? }) */
export function layoutSelect({ value, layouts, onChange }) {
  const keys = Object.keys(layouts).filter(k => !layouts[k].hidden || k === value), L = k => layouts[k] || layouts['1'];
  const btn = h('button', { type: 'button', class: 'cs cs-text ls-btn', 'aria-haspopup': 'listbox', 'aria-expanded': 'false' }, layoutSchema(L(value)), h('span', { class: 'cs-lab', textContent: t(L(value).label) }), ico('chevron-down'));
  btn.addEventListener('click', e => {
    e.stopPropagation(); if (open && open.btn === btn) { close(); return; } close();
    const pop = h('div', { class: 'cs-pop ls-pop', role: 'listbox' }, keys.map(k => h('button', { type: 'button', role: 'option', class: 'cs-opt' + (k === value ? ' on' : ''), 'aria-selected': String(k === value), onclick: () => { close(); if (k !== value) onChange(k); } },
      layoutSchema(L(k)), h('span', { textContent: t(L(k).label) }))));
    (btn.closest('.panel, .props') || document.body).append(pop);
    const r = btn.getBoundingClientRect(), w = Math.max(280, r.width), hh = pop.offsetHeight;
    Object.assign(pop.style, { width: w + 'px', left: Math.max(8, Math.min(window.innerWidth - w - 8, r.left)) + 'px', top: (r.bottom + hh + 12 > window.innerHeight ? Math.max(8, r.top - hh - 4) : r.bottom + 4) + 'px' });
    btn.setAttribute('aria-expanded', 'true');
    const away = ev => { if (!pop.contains(ev.target) && !btn.contains(ev.target)) close(); }, key = ev => { if (ev.key === 'Escape') { ev.stopPropagation(); close(); } };
    document.addEventListener('pointerdown', away, true); document.addEventListener('keydown', key, true); open = { pop, btn, away, key };
  });
  return btn;
}
