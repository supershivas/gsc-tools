/* Boutons contextuels au survol de l'aperçu : une barre flottante regroupe les actions de l'élément
   survolé (colonne → sous-section → section, ou header). Elle vit hors des pages : jamais exportée. */
import { h, ico } from './render.js';
import { GRID, THEMES, SECTION_BGS, cssVars, applyVars } from './tokens.js';
import { COL_TYPES, newCol, newSub, stepSection } from './state.js';
import { readImage } from './editor.js';

const TYPE_LABELS = COL_TYPES;
const HEAD_BG = ['blue', 'deep', 'sky', 'lavender', 'yellow', 'slate', 'steel', 'white'];
const HEAD_FG = ['white', 'blue', 'yellow'];

export function initHover({ stage, getDoc, ctx, select, canShow }) {
  const bar = h('div', { class: 'hv-bar', style: { display: 'none' } });
  const out = h('div', { class: 'hv-out', style: { display: 'none' } });
  document.body.append(out, bar);
  let timer = 0, cur = null;

  const hide = () => { clearTimeout(timer); bar.style.display = out.style.display = 'none'; cur = null; };
  const later = () => { clearTimeout(timer); timer = setTimeout(() => { if (!bar.contains(document.activeElement)) hide(); }, 250); };

  const act = fn => () => { fn(); hide(); ctx.restructure(); };
  const sw = (key, on, title, fn) => h('button', { type: 'button', class: 'hv-sw' + (on ? ' on' : '') + (key === 'none' ? ' none' : ''), title, style: key === 'none' ? {} : { background: `var(--c-${key})` }, onclick: act(fn) });
  const btn = (label, title, fn, cls = '') => h('button', { type: 'button', class: 'mini ' + cls, title, onclick: act(fn) }, ...[].concat(label).map(l => typeof l === 'string' ? l : l));
  const grp = (label, ...kids) => h('div', { class: 'hv-grp' }, h('span', { class: 'hv-lab', textContent: label }), ...kids.flat().filter(Boolean));

  /* Barre courte : uniquement l'élément survolé (le plus interne) — édition rapide. Le reste est dans la colonne de droite. */
  function groups(chain, doc) {
    const it = chain[0], g = [];
    const edit = path => btn([ico('pencil'), ' Éditer'], 'Afficher les propriétés', () => select(path), 'primary');
    if (it.kind === 'col') {
      const sub = doc.sections[it.si].subs[it.bi], col = sub.cols[it.ci];
      const grip = h('button', { type: 'button', class: 'mini grip-btn', title: 'Glisser le contenu sur une autre colonne pour l’échanger', onpointerdown: e => { e.preventDefault(); ctx.startColDrag(e, { si: it.si, bi: it.bi, ci: it.ci }); } }, ico('grip-vertical'));
      g.push(grp('Colonne', grip, edit(it.path), col.type === 'viz' ? btn('Dataviz…', 'Ouvrir l’éditeur de dataviz', () => ctx.editViz({ col, sub, ci: it.ci })) : null));
    } else if (it.kind === 'sub') {
      const sec = doc.sections[it.si];
      const mv = d => () => { const j = it.bi + d; if (j >= 0 && j < sec.subs.length) [sec.subs[it.bi], sec.subs[j]] = [sec.subs[j], sec.subs[it.bi]]; };
      g.push(grp('Sous-section', edit(`sub:${it.si}:${it.bi}`), btn(ico('arrow-up'), 'Monter', mv(-1)), btn(ico('arrow-down'), 'Descendre', mv(1))));
    } else if (it.kind === 'sec') {
      const sec = doc.sections[it.si];
      g.push(grp('Section', edit(`sec:${it.si}`), sw('none', !sec.bg || sec.bg === 'none', 'Sans fond', () => { sec.bg = 'none'; }),
        SECTION_BGS.map(k => sw(k, sec.bg === k, 'Fond ' + k, () => { sec.bg = k; })),
        btn(ico('arrow-up'), 'Monter', () => { stepSection(doc, it.si, -1); }), btn(ico('arrow-down'), 'Descendre', () => { stepSection(doc, it.si, 1); })));
    } else if (it.kind === 'header') {
      const H = doc.header;
      g.push(grp('Header', edit('header'), ['blue', 'deep', 'yellow', 'sky', 'lavender', 'slate'].map(k => sw(k, H.bg === k, k, () => { H.bg = k; }))));
    }
    return g;
  }

  function chainOf(t) {
    const chain = [];
    for (let n = t.closest('[data-sel]'); n; n = n.parentElement && n.parentElement.closest('[data-sel]')) {
      const p = n.dataset.sel.split(':'), k = p[0];
      if (k === 'col') chain.push({ kind: 'col', si: +p[1], bi: +p[2], ci: +p[3], path: n.dataset.sel, el: n });
      else if (k === 'sub') chain.push({ kind: 'sub', si: +p[1], bi: +p[2], el: n });
      else if (k === 'sec') chain.push({ kind: 'sec', si: +p[1], el: n });
      else if (k === 'header') chain.push({ kind: 'header', el: n });
    }
    return chain;
  }

  stage.addEventListener('pointermove', e => {
    if (!canShow() || e.buttons) { if (e.buttons) hide(); return; }
    const t = e.target.closest ? e.target : null; if (!t) return;
    const chain = chainOf(t); if (!chain.length) { later(); return; }
    const key = chain[0].el.dataset.sel;
    clearTimeout(timer);
    if (key === cur) return;
    cur = key;
    const doc = getDoc(); applyVars(bar, cssVars(doc.theme, doc.colors));
    bar.innerHTML = ''; bar.append(...groups(chain, doc));
    bar.style.display = 'flex';
    const r = chain[0].el.getBoundingClientRect(), st = stage.getBoundingClientRect(), bw = bar.offsetWidth, bh = bar.offsetHeight;
    let top = r.top - bh + 6; if (top < st.top - 12) top = r.top + 4;
    let left = Math.min(r.right - bw, window.innerWidth - bw - 8); left = Math.max(left, st.left + 4);
    Object.assign(bar.style, { left: left + 'px', top: top + 'px' });
    Object.assign(out.style, { display: 'block', left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
  });
  stage.addEventListener('pointerleave', later);
  bar.addEventListener('pointerenter', () => clearTimeout(timer));
  bar.addEventListener('pointerleave', later);
  stage.addEventListener('scroll', hide, true);
  return { hide };
}
