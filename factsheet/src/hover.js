/* Boutons contextuels au survol de l'aperçu : une barre flottante regroupe les actions de l'élément
   survolé (colonne → sous-section → section, ou header). Elle vit hors des pages : jamais exportée. */
import { h, ico, columnWidth, vizChartH, matchTarget, matchColTarget } from './render.js';
import { VIZ_TYPES } from './viz/index.js';
import { PAGE, TYPE, GRID, THEMES, sectionBgs, paletteKeys, colorLabel, cssVars, applyVars, densityGaps } from './tokens.js';
import { t } from './i18n.js';
import { COL_TYPES, newCol, newSub, newSection, stepSection, refreshAutoCards } from './state.js';
import { readImage } from './editor.js';
import { openPalette } from './palette.js';

const TYPE_LABELS = COL_TYPES;

export function initHover({ stage, getDoc, ctx, select, canShow }) {
  const bar = h('div', { class: 'hv-bar', style: { display: 'none' } });
  const out = h('div', { class: 'hv-out', style: { display: 'none' } });
  /* Boutons « + » pleine largeur sous la sous-section et sous la section survolées (hors des pages : jamais exportés) */
  const addBtn = (label) =>
    h('button', { type: 'button', class: 'hv-add', style: { display: 'none' } }, ico('plus'), h('span', { textContent: t(label) }));
  const addSubBtn = addBtn('Nouvelle sous-section'),
    addSecBtn = addBtn('Nouvelle section');
  addSubBtn.addEventListener('click', () => {
    const { si, bi } = addSubBtn._at,
      doc = getDoc();
    doc.sections[si].subs.splice(bi + 1, 0, newSub('1'));
    hide();
    ctx.restructure();
    ctx.select(`sub:${si}:${bi + 1}`);
  });
  addSecBtn.addEventListener('click', () => {
    const at = addSecBtn._at,
      doc = getDoc();
    if (at.page) {
      doc.sections.push(newSection(at.page));
      hide();
      ctx.restructure();
      ctx.select(`sec:${doc.sections.length - 1}`);
      return;
    } // page sans section
    doc.sections.splice(at.si + 1, 0, newSection(doc.sections[at.si].page));
    hide();
    ctx.restructure();
    ctx.select(`sec:${at.si + 1}`);
  });
  /* Poignée de hauteur d'une dataviz (sous son bord bas) : glisser change la hauteur ; elle se cale sur la colonne voisine (repère orange),
     et relâcher ainsi « adapte à la colonne voisine » (mode match) ; double-clic = même chose sans glisser. Hors des pages : jamais exportée. */
  const grip = h(
    'button',
    {
      type: 'button',
      class: 'hv-grip',
      style: { display: 'none' },
      title: t('Glisser : hauteur du contenu (se cale sur la colonne voisine) · double-clic : adapter à la colonne voisine'),
      'aria-label': t('Hauteur du contenu'),
    },
    ico('grip-horizontal'),
  );
  const guide = h('div', { class: 'hv-guide', style: { display: 'none' } });
  const vizOf = (it) => {
    const col = getDoc().sections[it.si].subs[it.bi].cols[it.ci];
    return col.type === 'viz' && col.viz && (VIZ_TYPES[col.viz.kind] || {}).heights ? col : null;
  };
  const colOf = (it) => getDoc().sections[it.si].subs[it.bi].cols[it.ci];
  const placeGrip = (it) => {
    const el = document.querySelector(`[data-sel="${it.path}"]`),
      nd = el && (vizOf(it) && !el.classList.contains('stroked') ? el.firstElementChild : el);
    if (!nd) {
      grip.style.display = 'none';
      return;
    } // colonne avec contour : la poignée est sur le trait
    const r = nd.getBoundingClientRect();
    Object.assign(grip.style, { display: 'flex', left: r.left + r.width / 2 - 18 + 'px', top: r.bottom - 8 + 'px' });
    grip._at = it;
  };
  grip.addEventListener('dblclick', () => {
    const it = grip._at;
    if (it && !vizOf(it)) {
      const el = document.querySelector(`[data-sel="${it.path}"]`),
        n = el && matchColTarget(el);
      if (n) {
        colOf(it).minH = n;
        hide();
        ctx.restructure();
      }
      return;
    }
    const col = it && vizOf(it);
    if (!col) return;
    col.viz.opts.hmode = 'match';
    hide();
    ctx.restructure();
  });
  /* colonnes texte, image, carte, chiffre : la poignée règle la hauteur minimale de la colonne (col.minH) */
  const gripOther = (e, it) => {
    e.preventDefault();
    e.stopPropagation();
    const col = colOf(it);
    const colEl = document.querySelector(`[data-sel="${it.path}"]`),
      sc = colEl.closest('.page').getBoundingClientRect().width / PAGE.w;
    const startH = colEl.getBoundingClientRect().height / sc,
      neigh = matchColTarget(colEl),
      y0 = e.clientY;
    let snapped = false;
    grip.setPointerCapture(e.pointerId);
    bar.style.display = out.style.display = addSubBtn.style.display = addSecBtn.style.display = 'none';
    const move = (ev) => {
      let hh = Math.round(Math.max(30, Math.min(1000, startH + (ev.clientY - y0) / sc)) / 3) * 3;
      snapped = neigh != null && Math.abs(hh - neigh) <= 9;
      if (snapped) hh = neigh;
      col.minH = hh;
      ctx.changed();
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          placeGrip(it);
          const el = document.querySelector(`[data-sel="${it.path}"]`);
          if (el && neigh != null) {
            const r = el.getBoundingClientRect();
            Object.assign(guide.style, {
              display: 'block',
              left: r.left - 6 + 'px',
              width: r.width + 12 + 'px',
              top: r.top + neigh * sc + 'px',
              borderTopStyle: snapped ? 'solid' : 'dashed',
            });
          }
        }),
      );
    };
    const up = () => {
      grip.removeEventListener('pointermove', move);
      grip.removeEventListener('pointerup', up);
      guide.style.display = 'none';
      hide();
      ctx.restructure();
    };
    grip.addEventListener('pointermove', move);
    grip.addEventListener('pointerup', up);
  };
  grip.addEventListener('pointerdown', (e) => {
    const it = grip._at;
    if (it && !e.button && !vizOf(it)) return gripOther(e, it);
    const col = it && vizOf(it);
    if (!col || e.button) return;
    e.preventDefault();
    e.stopPropagation();
    const o = col.viz.opts,
      doc = getDoc();
    const colEl = document.querySelector(`[data-sel="${it.path}"]`),
      node = colEl.firstElementChild,
      sc = colEl.closest('.page').getBoundingClientRect().width / PAGE.w;
    const startH = vizChartH(node),
      neigh = matchTarget(colEl, node),
      y0 = e.clientY;
    let snapped = false;
    grip.setPointerCapture(e.pointerId);
    bar.style.display = out.style.display = addSubBtn.style.display = addSecBtn.style.display = 'none';
    const move = (ev) => {
      let hh = Math.round(Math.max(90, Math.min(900, startH + (ev.clientY - y0) / sc)) / 3) * 3;
      snapped = neigh != null && Math.abs(hh - neigh) <= 9;
      if (snapped) hh = neigh;
      Object.assign(o, { hmode: 'fixed', hfixed: hh });
      ctx.changed();
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          placeGrip(it);
          const el = document.querySelector(`[data-sel="${it.path}"]`),
            nd = el && el.firstElementChild;
          if (nd && neigh != null) {
            const r = nd.getBoundingClientRect();
            Object.assign(guide.style, {
              display: 'block',
              left: r.left - 6 + 'px',
              width: r.width + 12 + 'px',
              top: r.top + neigh * sc + 'px',
              borderTopStyle: snapped ? 'solid' : 'dashed',
            });
          }
        }),
      );
    };
    const up = () => {
      grip.removeEventListener('pointermove', move);
      grip.removeEventListener('pointerup', up);
      guide.style.display = 'none';
      if (snapped) o.hmode = 'match';
      hide();
      ctx.restructure();
    };
    grip.addEventListener('pointermove', move);
    grip.addEventListener('pointerup', up);
  });
  document.body.append(out, bar, addSubBtn, addSecBtn, grip, guide);
  let timer = 0,
    cur = null;

  const hide = () => {
    clearTimeout(timer);
    bar.style.display = out.style.display = addSubBtn.style.display = addSecBtn.style.display = grip.style.display = 'none';
    cur = null;
  };
  const later = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (!bar.contains(document.activeElement)) hide();
    }, 250);
  };

  const act = (fn) => () => {
    fn();
    hide();
    ctx.restructure();
  };
  const sw = (key, on, title, fn) =>
    h('button', {
      type: 'button',
      class: 'hv-sw' + (on ? ' on' : '') + (key === 'none' ? ' none' : ''),
      title,
      style: key === 'none' ? {} : { background: `var(--c-${key})` },
      onclick: act(fn),
    });
  const btn = (label, title, fn, cls = '') =>
    h(
      'button',
      { type: 'button', class: 'mini ' + cls, title, onclick: act(fn) },
      ...[].concat(label).map((l) => (typeof l === 'string' ? l : l)),
    );
  const palBtn = () =>
    h(
      'button',
      {
        type: 'button',
        class: 'hv-sw pal-btn',
        title: t('Modifier, renommer ou ajouter des couleurs'),
        'aria-label': t('Modifier, renommer ou ajouter des couleurs'),
        onclick: (e) => {
          openPalette(e.currentTarget, ctx);
        },
      },
      ico('plus'),
    );
  const grp = (label, ...kids) =>
    h('div', { class: 'hv-grp' }, h('span', { class: 'hv-lab', textContent: label }), ...kids.flat().filter(Boolean));

  /* Barre courte : uniquement l'élément survolé (le plus interne) — édition rapide. Le reste est dans la colonne de droite. */
  function groups(chain, doc) {
    const it = chain[0],
      g = [];
    const del = (path) =>
      h(
        'button',
        {
          type: 'button',
          class: 'mini danger',
          title: t('Supprimer (Suppr)'),
          'aria-label': t('Supprimer (Suppr)'),
          onclick: () => {
            hide();
            ctx.remove(path);
          },
        },
        ico('trash'),
      );
    if (it.kind === 'col') {
      const sub = doc.sections[it.si].subs[it.bi],
        col = sub.cols[it.ci];
      const grip = h(
        'button',
        {
          type: 'button',
          class: 'mini grip-btn',
          title: 'Glisser le contenu sur une autre colonne pour l’échanger',
          onpointerdown: (e) => {
            e.preventDefault();
            ctx.startColDrag(e, { si: it.si, bi: it.bi, ci: it.ci });
          },
        },
        ico('grip-vertical'),
      );
      const plus =
        sub.cols.length === 1
          ? btn(ico('plus'), 'Ajouter une colonne', () => {
              sub.layout = '1-1';
              sub.cols.push(newCol('text'));
              refreshAutoCards(sub, (i) => columnWidth(getDoc(), it.si, it.bi, i));
            })
          : null;
      g.push(
        grp(
          'Colonne',
          grip,
          del(it.path),
          plus,
          col.type === 'viz' ? btn('Dataviz…', 'Ouvrir l’éditeur de dataviz', () => ctx.editViz({ col, sub, ci: it.ci }), 'primary') : null,
        ),
      );
    } else if (it.kind === 'sub') {
      const sec = doc.sections[it.si];
      const mv = (d) => () => {
        const j = it.bi + d;
        if (j >= 0 && j < sec.subs.length) [sec.subs[it.bi], sec.subs[j]] = [sec.subs[j], sec.subs[it.bi]];
      };
      const sgrip = h(
        'button',
        {
          type: 'button',
          class: 'mini grip-btn',
          title: 'Glisser la sous-section (autre section possible)',
          onpointerdown: (e) => {
            e.preventDefault();
            ctx.startSubDrag(e, { si: it.si, bi: it.bi });
          },
        },
        ico('grip-vertical'),
      );
      g.push(
        grp(
          'Sous-section',
          sgrip,
          del(`sub:${it.si}:${it.bi}`),
          btn(ico('arrow-up'), 'Monter', mv(-1)),
          btn(ico('arrow-down'), 'Descendre', mv(1)),
        ),
      );
    } else if (it.kind === 'sec') {
      const sec = doc.sections[it.si];
      const secGrip = h(
        'button',
        {
          type: 'button',
          class: 'mini grip-btn',
          title: 'Glisser la section (ou la page)',
          onpointerdown: (e) => {
            e.preventDefault();
            ctx.startSecDrag(e, { si: it.si });
          },
        },
        ico('grip-vertical'),
      );
      g.push(
        grp(
          'Section',
          secGrip,
          del(`sec:${it.si}`),
          sw('none', !sec.bg || sec.bg === 'none', 'Sans fond', () => {
            sec.bg = 'none';
          }),
          sectionBgs(doc).map((k) =>
            sw(k, sec.bg === k, t(colorLabel(doc, k)), () => {
              sec.bg = k;
            }),
          ),
          palBtn(),
          btn(ico('arrow-up'), 'Monter', () => {
            stepSection(doc, it.si, -1);
          }),
          btn(ico('arrow-down'), 'Descendre', () => {
            stepSection(doc, it.si, 1);
          }),
        ),
      );
    } else if (it.kind === 'header') {
      const H = doc.header;
      g.push(
        grp(
          'Header',
          paletteKeys(doc).map((k) =>
            sw(k, H.bg === k, t(colorLabel(doc, k)), () => {
              H.bg = k;
            }),
          ),
          palBtn(),
        ),
      );
    }
    return g;
  }

  function chainOf(t) {
    const chain = [];
    for (let n = t.closest('[data-sel]'); n; n = n.parentElement && n.parentElement.closest('[data-sel]')) {
      const p = n.dataset.sel.split(':'),
        k = p[0];
      if (k === 'col') chain.push({ kind: 'col', si: +p[1], bi: +p[2], ci: +p[3], path: n.dataset.sel, el: n });
      else if (k === 'sub') chain.push({ kind: 'sub', si: +p[1], bi: +p[2], el: n });
      else if (k === 'sec') chain.push({ kind: 'sec', si: +p[1], el: n });
      else if (k === 'header') chain.push({ kind: 'header', el: n });
    }
    return chain;
  }

  stage.addEventListener('pointermove', (e) => {
    if (!canShow() || e.buttons) {
      if (e.buttons) hide();
      return;
    }
    const t = e.target.closest ? e.target : null;
    if (!t) return;
    const chain = chainOf(t);
    /* page sans aucune section : le survol de la page propose d'en ajouter une, à l'emplacement de la première section */
    const pageEl = t.closest('.page');
    if (pageEl && !pageEl.querySelector('.sec')) {
      clearTimeout(timer);
      const pr = pageEl.getBoundingClientRect(),
        sc = pr.width / PAGE.w,
        hd = pageEl.querySelector('.hd'),
        gap = densityGaps(getDoc().density);
      const top = hd ? hd.getBoundingClientRect().bottom + gap.headerToBody * sc : pr.top + PAGE.marginTop * sc,
        hh = Math.min(
          (TYPE.section.lh + gap.sectionTitle + TYPE.subsection.lh + gap.subsectionTitle + TYPE.body.lh) * sc,
          pr.bottom - PAGE.marginBottom * sc - top,
        );
      bar.style.display = out.style.display = addSubBtn.style.display = 'none';
      if (hh >= 20) {
        addSecBtn._at = { page: pageEl.dataset.page };
        Object.assign(addSecBtn.style, {
          display: 'flex',
          left: pr.left + PAGE.margin * sc + 'px',
          width: pr.width - 2 * PAGE.margin * sc + 'px',
          top: top + 'px',
          height: hh + 'px',
        });
        cur = 'empty:' + pageEl.dataset.page;
      }
      return;
    }
    if (!chain.length) {
      later();
      return;
    }
    /* section avec fond : le pointeur traverse son retrait bas (ni sous-section ni colonne) en allant vers les boutons « + » — on les garde */
    const secC = chain.find((c) => c.kind === 'sec'),
      lastSubEl = secC && !chain.some((c) => c.kind === 'sub') ? [...secC.el.querySelectorAll('.sub')].pop() : null;
    const below = !!lastSubEl && e.clientY > lastSubEl.getBoundingClientRect().bottom;
    const key = chain[0].el.dataset.sel + (below ? '|below' : '');
    clearTimeout(timer);
    if (key === cur) return;
    cur = key;
    {
      const ci = chain.find((c) => c.kind === 'col');
      if (ci) placeGrip(ci);
      else grip.style.display = 'none';
    }
    const doc = getDoc();
    applyVars(bar, cssVars(doc.theme, doc.colors, doc.density));
    bar.innerHTML = '';
    bar.append(...groups(chain, doc));
    bar.style.display = 'flex';
    const r = chain[0].el.getBoundingClientRect(),
      st = stage.getBoundingClientRect(),
      bw = bar.offsetWidth,
      bh = bar.offsetHeight;
    let top = r.top - bh + 6;
    if (top < st.top - 12) top = r.top + 4;
    let left = Math.min(r.right - bw, window.innerWidth - bw - 8);
    left = Math.max(left, st.left + 4);
    Object.assign(bar.style, { left: left + 'px', top: top + 'px' });
    /* Boutons « + » : seulement là où il y a de la place dessous (dernière section de la page, dernière sous-section de la section).
       Ils ont la hauteur du bloc créé et sont décalés de l'écart réel entre deux blocs, pour montrer où il apparaîtra. */
    let subIt = chain.find((c) => c.kind === 'sub');
    const secIt = chain.find((c) => c.kind === 'sec');
    if (below) subIt = { kind: 'sub', si: secIt.si, bi: secIt.el.querySelectorAll('.sub').length - 1, el: lastSubEl };
    addSubBtn.style.display = addSecBtn.style.display = 'none';
    if (secIt) {
      const sec = doc.sections[secIt.si],
        pageEl = secIt.el.closest('.page'),
        pr = pageEl.getBoundingClientRect(),
        sc = pr.width / PAGE.w,
        limit = pr.bottom - PAGE.marginBottom * sc,
        gap = densityGaps(doc.density);
      const subH = TYPE.subsection.lh + gap.subsectionTitle + TYPE.body.lh,
        secH = TYPE.section.lh + gap.sectionTitle + subH;
      const place = (b, it, inset, top, want) => {
        const hh = Math.min(want * sc, limit - top);
        if (hh < 20) return 0;
        const q = it.el.getBoundingClientRect();
        b._at = it;
        Object.assign(b.style, {
          display: 'flex',
          left: q.left + inset + 'px',
          width: q.width - 2 * inset + 'px',
          top: top + 'px',
          height: hh + 'px',
        });
        return top + hh;
      };
      let y = secIt.el.getBoundingClientRect().bottom;
      const lastSec = doc.sections.filter((x) => x.page === sec.page).pop() === sec;
      if (lastSec) {
        if (subIt && subIt.bi === sec.subs.length - 1) {
          const sb = subIt.el.getBoundingClientRect();
          y = place(addSubBtn, subIt, 0, sb.bottom + gap.subsectionBefore * sc, subH) || y;
        }
        place(addSecBtn, secIt, PAGE.margin * sc, y + gap.sectionBefore * sc, secH);
      }
    }
    /* même forme que le cadre de sélection : 3 px d'air, coins de 3 px ; une section sur toute sa largeur, marges comprises */
    const GAPX = 3,
      gx = chain[0].kind === 'sec' ? 0 : GAPX;
    Object.assign(out.style, {
      display: 'block',
      left: r.left - gx + 'px',
      top: r.top - GAPX + 'px',
      width: r.width + 2 * gx + 'px',
      height: r.height + 2 * GAPX + 'px',
    });
  });
  stage.addEventListener('pointerleave', later);
  for (const el of [bar, addSubBtn, addSecBtn, grip]) {
    el.addEventListener('pointerenter', () => clearTimeout(timer));
    el.addEventListener('pointerleave', later);
  }
  stage.addEventListener('scroll', hide, true);
  return { hide };
}
