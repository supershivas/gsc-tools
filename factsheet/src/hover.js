/* Boutons contextuels au survol de l'aperçu : une barre flottante regroupe les actions de l'élément
   survolé (colonne → sous-section → section, ou header). Elle vit hors des pages : jamais exportée. */
import { h, ico, columnWidth } from './render.js';
import { PAGE, GRID, THEMES, sectionBgs, paletteKeys, colorLabel, cssVars, applyVars } from './tokens.js';
import { t } from './i18n.js';
import { COL_TYPES, newCol, newSub, newSection, stepSection, refreshAutoCards } from './state.js';
import { readImage } from './editor.js';
import { openPalette } from './palette.js';

const TYPE_LABELS = COL_TYPES;

export function initHover({ stage, getDoc, ctx, select, canShow }) {
  const bar = h('div', { class: 'hv-bar', style: { display: 'none' } });
  const out = h('div', { class: 'hv-out', style: { display: 'none' } });
  /* Boutons « + » pleine largeur sous la sous-section et sous la section survolées (hors des pages : jamais exportés) */
  const addBtn = label => h('button', { type: 'button', class: 'hv-add', style: { display: 'none' } }, ico('plus'), h('span', { textContent: t(label) }));
  const addSubBtn = addBtn('Nouvelle sous-section'), addSecBtn = addBtn('Nouvelle section');
  addSubBtn.addEventListener('click', () => { const { si, bi } = addSubBtn._at, doc = getDoc(); doc.sections[si].subs.splice(bi + 1, 0, newSub('1')); hide(); ctx.restructure(); ctx.select(`sub:${si}:${bi + 1}`); });
  addSecBtn.addEventListener('click', () => { const { si } = addSecBtn._at, doc = getDoc(); doc.sections.splice(si + 1, 0, newSection(doc.sections[si].page)); hide(); ctx.restructure(); ctx.select(`sec:${si + 1}`); });
  document.body.append(out, bar, addSubBtn, addSecBtn);
  let timer = 0, cur = null;

  const hide = () => { clearTimeout(timer); bar.style.display = out.style.display = addSubBtn.style.display = addSecBtn.style.display = 'none'; cur = null; };
  const later = () => { clearTimeout(timer); timer = setTimeout(() => { if (!bar.contains(document.activeElement)) hide(); }, 250); };

  const act = fn => () => { fn(); hide(); ctx.restructure(); };
  const sw = (key, on, title, fn) => h('button', { type: 'button', class: 'hv-sw' + (on ? ' on' : '') + (key === 'none' ? ' none' : ''), title, style: key === 'none' ? {} : { background: `var(--c-${key})` }, onclick: act(fn) });
  const btn = (label, title, fn, cls = '') => h('button', { type: 'button', class: 'mini ' + cls, title, onclick: act(fn) }, ...[].concat(label).map(l => typeof l === 'string' ? l : l));
  const palBtn = () => h('button', { type: 'button', class: 'hv-sw pal-btn', title: t('Modifier, renommer ou ajouter des couleurs'), 'aria-label': t('Modifier, renommer ou ajouter des couleurs'), onclick: e => { openPalette(e.currentTarget, ctx); } }, ico('plus'));
  const grp = (label, ...kids) => h('div', { class: 'hv-grp' }, h('span', { class: 'hv-lab', textContent: label }), ...kids.flat().filter(Boolean));

  /* Barre courte : uniquement l'élément survolé (le plus interne) — édition rapide. Le reste est dans la colonne de droite. */
  function groups(chain, doc) {
    const it = chain[0], g = [];
    const del = path => h('button', { type: 'button', class: 'mini danger', title: t('Supprimer (Suppr)'), 'aria-label': t('Supprimer (Suppr)'), onclick: () => { hide(); ctx.remove(path); } }, ico('trash'));
    if (it.kind === 'col') {
      const sub = doc.sections[it.si].subs[it.bi], col = sub.cols[it.ci];
      const grip = h('button', { type: 'button', class: 'mini grip-btn', title: 'Glisser le contenu sur une autre colonne pour l’échanger', onpointerdown: e => { e.preventDefault(); ctx.startColDrag(e, { si: it.si, bi: it.bi, ci: it.ci }); } }, ico('grip-vertical'));
      const plus = sub.cols.length === 1 ? btn(ico('plus'), 'Ajouter une colonne', () => { sub.layout = '1-1'; sub.cols.push(newCol('text')); refreshAutoCards(sub, i => columnWidth(getDoc(), it.si, it.bi, i)); }) : null;
      g.push(grp('Colonne', grip, del(it.path), plus, col.type === 'viz' ? btn('Dataviz…', 'Ouvrir l’éditeur de dataviz', () => ctx.editViz({ col, sub, ci: it.ci })) : null));
    } else if (it.kind === 'sub') {
      const sec = doc.sections[it.si];
      const mv = d => () => { const j = it.bi + d; if (j >= 0 && j < sec.subs.length) [sec.subs[it.bi], sec.subs[j]] = [sec.subs[j], sec.subs[it.bi]]; };
      const sgrip = h('button', { type: 'button', class: 'mini grip-btn', title: 'Glisser la sous-section (autre section possible)', onpointerdown: e => { e.preventDefault(); ctx.startSubDrag(e, { si: it.si, bi: it.bi }); } }, ico('grip-vertical'));
      g.push(grp('Sous-section', sgrip, del(`sub:${it.si}:${it.bi}`), btn(ico('arrow-up'), 'Monter', mv(-1)), btn(ico('arrow-down'), 'Descendre', mv(1))));
    } else if (it.kind === 'sec') {
      const sec = doc.sections[it.si];
      g.push(grp('Section', del(`sec:${it.si}`), sw('none', !sec.bg || sec.bg === 'none', 'Sans fond', () => { sec.bg = 'none'; }),
        sectionBgs(doc).map(k => sw(k, sec.bg === k, t(colorLabel(doc, k)), () => { sec.bg = k; })), palBtn(),
        btn(ico('arrow-up'), 'Monter', () => { stepSection(doc, it.si, -1); }), btn(ico('arrow-down'), 'Descendre', () => { stepSection(doc, it.si, 1); })));
    } else if (it.kind === 'header') {
      const H = doc.header;
      g.push(grp('Header', paletteKeys(doc).map(k => sw(k, H.bg === k, t(colorLabel(doc, k)), () => { H.bg = k; })), palBtn()));
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
    const subIt = chain.find(c => c.kind === 'sub'), secIt = chain.find(c => c.kind === 'sec');
    const put = (b, it, extra = 0) => { if (!it) { b.style.display = 'none'; return 0; } const q = it.el.getBoundingClientRect(), inset = it.kind === 'sec' ? q.width / PAGE.w * PAGE.margin : 0; b._at = it; Object.assign(b.style, { display: 'flex', left: q.left + inset + 'px', width: q.width - 2 * inset + 'px', top: q.bottom + 2 + extra + 'px' }); return q.bottom + 2 + extra; };
    const subTop = put(addSubBtn, subIt), secTop = secIt ? secIt.el.getBoundingClientRect().bottom + 2 : 0;
    put(addSecBtn, secIt, subIt && Math.abs(secTop - subTop) < 26 ? 26 : 0);
    Object.assign(out.style, { display: 'block', left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
  });
  stage.addEventListener('pointerleave', later);
  for (const el of [bar, addSubBtn, addSecBtn]) { el.addEventListener('pointerenter', () => clearTimeout(timer)); el.addEventListener('pointerleave', later); }
  stage.addEventListener('scroll', hide, true);
  return { hide };
}
