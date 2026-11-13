/* Colonne de gauche : la structure du document en cartes repliables (header, sections, sous-sections, colonnes).
   Clic = sélection (propriétés à droite) · glisser une poignée = prendre l'élément comme un objet : il suit le pointeur
   pendant que la structure et la page se réorganisent en direct (moteur commun dans editor/dnd.js, `ctx.startTreeDrag`). */
import { h, ico } from './render.js';
import { PREFIX_RE } from './textstyles.js';
import { stripInline } from './viz/util.js';
import { cssVars, applyVars } from './tokens.js';
import { newSection, newSub } from './state.js';
import { VIZ_TYPES } from './viz/index.js';

const strip = (t) =>
  stripInline(t)
    .replace(/\*\*|__|~~|\^\^|,,/g, '')
    .replace(PREFIX_RE, '')
    .replace(/\s+/g, ' ')
    .trim();
const ICON = {
  text: 'text-size',
  image: 'photo',
  figure: 'number',
  card: 'layout-cards',
  viz: 'chart-bar',
  table: 'table',
  empty: 'square-dashed',
};

function colLabel(col) {
  if (col.type === 'text') return strip(col.text).slice(0, 34) || 'Texte vide';
  if (col.type === 'image') return col.caption ? 'Image · ' + col.caption : 'Image';
  if (col.type === 'card') return 'Carte · ' + (strip(col.card && col.card.content && col.card.content.title) || '—');
  if (col.type === 'figure') return 'Chiffre clé · ' + ((col.figure && col.figure.value) || '—');
  if (col.type === 'empty') return 'Vide';
  if (col.type === 'table') return 'Tableau · ' + (col.table ? `${col.table.rows.length} × ${col.table.cols.length}` : '—');
  const t = col.viz && VIZ_TYPES[col.viz.kind];
  return 'Dataviz · ' + (t ? t.label : '—');
}

export function buildTree(root, ctx) {
  /* pendant un glissement, la structure est dessinée d'après le document candidat ; l'élément pris reste en pointillés à sa place d'arrivée */
  const previewing = ctx.previewing(),
    doc = ctx.shown(),
    sel = previewing ? null : ctx.getSel(),
    mark = previewing ? ctx.previewMark() : null,
    collapsed = ctx.collapsed;
  root.innerHTML = '';
  applyVars(root, cssVars(doc.theme, doc.colors, doc.density));
  queueMicrotask(() => ctx.markTree && ctx.markTree()); // pastilles de dépassement (calculées par l'aperçu)
  const row = (path, cls, kids) =>
    h(
      'div',
      {
        class: 'tn ' + cls + (sel === path ? ' sel' : '') + (mark && mark === path ? ' drag-live' : ''),
        dataset: { path: path || '' },
        onclick: (e) => {
          if (e.target.closest('.grip,.tn-tog,.tn-add')) return;
          ctx.select(path);
        },
      },
      ...kids,
    );
  const tog = (key) =>
    h(
      'button',
      {
        type: 'button',
        class: 'tn-tog',
        'aria-label': collapsed.has(key) ? 'Déplier' : 'Replier',
        'aria-expanded': String(!collapsed.has(key)),
        onclick: () => {
          collapsed.has(key) ? collapsed.delete(key) : collapsed.add(key);
          ctx.refreshTree();
        },
      },
      ico(collapsed.has(key) ? 'chevron-down' : 'chevron-up'),
    );
  const add = (label, fn) =>
    h(
      'button',
      {
        type: 'button',
        class: 'tn-add',
        onclick: () => {
          fn();
          ctx.restructure();
        },
      },
      ico('plus'),
      h('span', { textContent: label }),
    );
  const grip = (title, d) =>
    h(
      'span',
      {
        class: 'grip',
        title,
        onpointerdown: (e) => {
          if (e.button) return;
          e.preventDefault();
          e.stopPropagation();
          ctx.startTreeDrag(e, d);
        },
      },
      ico('grip-vertical'),
    );

  const secNode = (sec, si) => {
    const key = sec.id || 'sec' + si,
      closed = collapsed.has(key),
      band = sec.bg && sec.bg !== 'none';
    const dot = h('span', { class: 'tn-dot' + (band ? '' : ' none'), style: band ? { background: `var(--c-${sec.bg})` } : {} });
    const node = h('div', { class: 'tn-sec', dataset: { sid: sec.id } });
    node.append(
      row(`sec:${si}`, 'sec-row', [
        grip('Glisser pour réordonner ou changer de page', { kind: 'sec', id: sec.id }),
        dot,
        h('strong', { class: 'tn-lab', title: sec.title || 'Section sans titre', textContent: sec.title || 'Section sans titre' }),
        h('span', { class: 'tn-sub', textContent: String(sec.subs.length) }),
        tog(key),
      ]),
    );
    if (!closed) {
      const body = h('div', { class: 'tn-body' });
      sec.subs.forEach((sub, bi) => {
        const sk = sub.id || `sub${si}${bi}`,
          sClosed = collapsed.has(sk),
          subCard = h('div', { class: 'tn-subcard', dataset: { bid: sub.id } });
        subCard.append(
          row(`sub:${si}:${bi}`, 'sub-row', [
            grip('Glisser la sous-section (autre section possible)', { kind: 'sub', id: sub.id }),
            ico('columns'),
            h('span', { class: 'tn-lab', title: sub.title || 'Sous-section', textContent: sub.title || 'Sous-section' }),
            h('span', { class: 'tn-sub', textContent: sub.layout }),
            tog(sk),
          ]),
        );
        if (!sClosed)
          sub.cols.forEach((col, ci) =>
            subCard.append(
              row(`col:${si}:${bi}:${ci}`, 'col-row', [
                grip('Glisser le contenu sur une autre colonne pour l’échanger', { kind: 'col', from: { si, bi, ci } }),
                ico(ICON[col.type] || 'text-size'),
                h('span', { class: 'tn-lab', title: colLabel(col), textContent: colLabel(col) }),
              ]),
            ),
          );
        body.append(subCard);
      });
      body.append(
        add('Sous-section', () => {
          sec.subs.push(newSub('1'));
        }),
      );
      node.append(body);
    }
    return node;
  };

  for (const pg of ['recto', 'verso']) {
    const zone = h(
      'div',
      { class: 'pg-zone', dataset: { page: pg } },
      h('div', { class: 'pg-head', textContent: pg === 'recto' ? 'Recto' : 'Verso' }),
    );
    if (pg === 'recto')
      zone.append(
        h(
          'div',
          { class: 'tn-sec tn-head' },
          row('header', 'head-row', [
            ico('layout-navbar'),
            h('strong', { class: 'tn-lab', textContent: 'Header' }),
            h('span', { class: 'tn-sub', textContent: strip(doc.header.title).slice(0, 18) }),
          ]),
        ),
      );
    let n = 0;
    doc.sections.forEach((sec, si) => {
      if (sec.page === pg) {
        zone.append(secNode(sec, si));
        n++;
      }
    });
    if (!n) zone.append(h('div', { class: 'hint', textContent: 'Aucune section — glissez-en une ici.' }));
    zone.append(
      add('Section', () => {
        doc.sections.push(newSection(pg));
      }),
    );
    root.append(zone);
  }
}
