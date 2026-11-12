/* Éditeur de tableau : fenêtre modale sur le modèle de l'éditeur de dataviz (même coque `.ve`, reste de l'application inerte,
   historique propre, Annuler restaure le tableau d'origine, Échap en couches). La grille (rendu, sélection, poignées) est dans
   `grid-ui.js`, le copier-coller dans `paste.js`, les opérations dans `model.js`. Saisie : directement dans la cellule (texte riche,
   balisage en ligne de `inlineMk` : Cmd/Ctrl + B, I, U), Entrée valide et descend, Tab passe à la cellule suivante, Échap annule. */
import { h, ico } from '../render.js';
import { t } from '../i18n.js';
import { mkToHtml, htmlToMk } from '../editor.js';
import { cssVars, applyVars } from '../tokens.js';
import { renderCtx } from '../renderctx.js';
import { loadFonts, typoOf, inlineMk } from '../viz/util.js';
import { confirmBox } from '../dialogs.js';
import { TABLE_MAX, cellAt, mergeCells, splitCell, insertRow, insertCol, deleteRow, deleteCol, resizeTable, checkTable } from './model.js';
import { clipToGrid, pasteGrid, fillRect, rectToTsv, rectToHtml } from './paste.js';
import { createGridUi, selRect, cellName } from './grid-ui.js';

let current = null;

export function openTableEditor({ col, bg, width, ctx }) {
  if (current || !col.table) return;
  const doc = ctx.getDoc();
  const snapshot = JSON.stringify(col.table);
  const tb = () => col.table;
  let sel = null, // { a, b } : cellule active et autre coin
    editing = null, // { id, ed } : cellule en cours de saisie
    zoom = 'fit',
    msgText = '';

  const root = h('div', { class: 've te', role: 'dialog', 'aria-modal': 'true', 'aria-label': t('Éditeur de tableau'), tabindex: -1 });
  applyVars(root, cssVars(doc.theme, doc.colors, doc.density));
  const holder = h('div', { class: 'col col-table te-holder', style: { width: width + 'px' } });
  const sheet = h(
    'div',
    { class: 'page viz-sheet te-sheet', style: { width: width + 48 + 'px', background: bg && bg !== 'none' ? `var(--c-${bg})` : '#fff' } },
    holder,
  );
  const scaler = h('div', { class: 've-scaler' }, sheet);
  const stage = h('div', { class: 've-stage te-stage', tabindex: 0, 'aria-label': t('Grille du tableau') }, scaler);
  const form = h('aside', { class: 'panel ve-form te-form' });
  const msg = h('p', { class: 'hint te-msg', role: 'status' });

  /* ----- historique ----- */
  const hist = { s: [snapshot], i: 0 };
  function commit() {
    const sn = JSON.stringify(col.table);
    if (sn !== hist.s[hist.i]) {
      hist.s.length = hist.i + 1;
      hist.s.push(sn);
      if (hist.s.length > 100) hist.s.shift();
      hist.i = hist.s.length - 1;
    }
    draw();
  }
  function goHist(i) {
    if (i < 0 || i >= hist.s.length || editing) return;
    hist.i = i;
    col.table = JSON.parse(hist.s[i]);
    clampSel();
    draw();
  }
  function clampSel() {
    if (!sel) return;
    const R = tb().rows.length - 1,
      C = tb().cols.length - 1,
      fix = (p) => ({ r: Math.max(0, Math.min(R, p.r)), c: Math.max(0, Math.min(C, p.c)) });
    sel = { a: fix(sel.a), b: fix(sel.b) };
  }

  /* ----- rendu ----- */
  const scale = () => {
    if (zoom !== 'fit') return parseFloat(zoom);
    const aw = stage.clientWidth - 48;
    return aw > 50 ? Math.max(0.5, Math.min(2.5, aw / (width + 48))) : 1;
  };
  const grid = createGridUi({
    holder,
    getTable: tb,
    getEnv: () => ({ rc: renderCtx(doc) }),
    getSel: () => sel,
    setSel: (s) => {
      if (editing) endEdit(true);
      sel = s;
      grid.drawChrome();
      syncPanel();
      stage.focus({ preventScroll: true });
    },
    scale,
    onEdit: (p) => {
      sel = { a: p, b: p };
      startEdit(true);
    },
    onLive: () => draw(),
    onDone: () => commit(),
  });
  function draw() {
    grid.draw();
    const k = scale();
    scaler.style.transform = `scale(${k})`;
    scaler.style.marginBottom = sheet.offsetHeight * (k - 1) + 'px';
    scaler.style.marginRight = (width + 48) * (k - 1) + 'px';
    syncPanel();
    undoBtn.disabled = hist.i <= 0;
    redoBtn.disabled = hist.i >= hist.s.length - 1;
  }

  /* ----- saisie dans la cellule ----- */
  function startEdit(keep) {
    if (!sel) return;
    const cl = cellAt(tb(), sel.a.r, sel.a.c),
      el = cl && grid.cellEl(cl.id);
    if (!el) return;
    sel = { a: { r: cl.r, c: cl.c }, b: { r: cl.r, c: cl.c } };
    grid.drawChrome();
    const ed = h('div', {
      class: 'rich te-edit',
      contentEditable: 'true',
      spellcheck: 'true',
      innerHTML: keep ? mkToHtml(cl.text, typoOf(doc)) : '<div><br></div>',
      style: { textAlign: cl.ah || 'left' },
    });
    ed.addEventListener('input', () => grid.refresh());
    el.replaceChildren(ed);
    editing = { id: cl.id, ed };
    ed.focus();
    const r = document.createRange();
    r.selectNodeContents(ed);
    r.collapse(false);
    const s = window.getSelection();
    s.removeAllRanges();
    s.addRange(r);
    grid.refresh();
  }
  function endEdit(save) {
    if (!editing) return;
    const { id, ed } = editing;
    editing = null;
    const cl = tb().cells.find((x) => x.id === id);
    if (save && cl) {
      const v = htmlToMk(ed);
      if (v !== (cl.text || '')) cl.text = v;
    }
    commit();
    stage.focus({ preventScroll: true });
  }

  /* ----- navigation ----- */
  function move(dr, dc, extend) {
    const T = tb();
    if (!sel) {
      sel = { a: { r: 0, c: 0 }, b: { r: 0, c: 0 } };
      grid.drawChrome();
      syncPanel();
      return;
    }
    const from = extend ? sel.b : sel.a,
      cl = cellAt(T, from.r, from.c) || { r: from.r, c: from.c, rs: 1, cs: 1 };
    let r = dr > 0 ? cl.r + cl.rs : dr < 0 ? cl.r - 1 : from.r,
      c = dc > 0 ? cl.c + cl.cs : dc < 0 ? cl.c - 1 : from.c;
    r = Math.max(0, Math.min(T.rows.length - 1, r));
    c = Math.max(0, Math.min(T.cols.length - 1, c));
    sel = extend ? { a: sel.a, b: { r, c } } : { a: { r, c }, b: { r, c } };
    grid.drawChrome();
    syncPanel();
  }
  /** Tab : cellule suivante dans l'ordre de lecture (passe à la ligne suivante en fin de ligne) */
  function tabTo(back) {
    const T = tb();
    if (!sel) return move(0, 0);
    const order = T.cells.slice().sort((a, b) => a.r - b.r || a.c - b.c),
      cur = cellAt(T, sel.a.r, sel.a.c),
      k = order.indexOf(cur),
      nx = order[Math.max(0, Math.min(order.length - 1, k + (back ? -1 : 1)))];
    sel = { a: { r: nx.r, c: nx.c }, b: { r: nx.r, c: nx.c } };
    grid.drawChrome();
    syncPanel();
  }
  const cellsIn = (R) => tb().cells.filter((cl) => cl.r >= R.r0 && cl.r <= R.r1 && cl.c >= R.c0 && cl.c <= R.c1);

  /* ----- actions ----- */
  async function merge() {
    const R = selRect(tb(), sel);
    if (!R) return;
    const group = cellsIn(R);
    if (group.length < 2) return;
    if (
      group.filter((cl) => String(cl.text || '').trim()).length > 1 &&
      !(await confirmBox(t('Plusieurs cellules contiennent du texte : il sera mis bout à bout dans la cellule fusionnée.'), {
        ok: t('Fusionner'),
      }))
    )
      return;
    mergeCells(tb(), R.r0, R.c0, R.r1, R.c1);
    sel = { a: { r: R.r0, c: R.c0 }, b: { r: R.r1, c: R.c1 } };
    commit();
  }
  function split() {
    const R = selRect(tb(), sel);
    if (!R) return;
    cellsIn(R)
      .filter((cl) => cl.rs > 1 || cl.cs > 1)
      .forEach((cl) => splitCell(tb(), cl.id));
    commit();
  }
  function rows(op) {
    const R = selRect(tb(), sel);
    if (!R) return;
    const T = tb(),
      C = T.cols.length - 1;
    if (op === 'above' || op === 'below') {
      const at = op === 'above' ? R.r0 : R.r1 + 1;
      insertRow(T, at);
      sel = { a: { r: at, c: 0 }, b: { r: at, c: C } };
    } else {
      for (let r = R.r1; r >= R.r0; r--) deleteRow(T, r);
      clampSel();
      if (sel) sel = { a: { r: sel.a.r, c: sel.a.c }, b: { r: sel.a.r, c: sel.a.c } };
    }
    commit();
  }
  function cols(op) {
    const R = selRect(tb(), sel);
    if (!R) return;
    const T = tb(),
      Rn = T.rows.length - 1;
    if (op === 'left' || op === 'right') {
      const at = op === 'left' ? R.c0 : R.c1 + 1;
      insertCol(T, at);
      sel = { a: { r: 0, c: at }, b: { r: Rn, c: at } };
    } else {
      for (let c = R.c1; c >= R.c0; c--) deleteCol(T, c);
      clampSel();
      if (sel) sel = { a: { r: sel.a.r, c: sel.a.c }, b: { r: sel.a.r, c: sel.a.c } };
    }
    commit();
  }
  function align(ah) {
    const R = selRect(tb(), sel);
    if (!R) return;
    cellsIn(R).forEach((cl) => {
      if (ah === 'left') delete cl.ah;
      else cl.ah = ah;
    });
    commit();
  }
  /** Cmd/Ctrl + B, I, U sur des cellules sélectionnées (hors saisie) : met en forme tout leur texte, ou retire la mise en forme si tout l'a déjà */
  function toggleMark(mk) {
    const R = selRect(tb(), sel);
    if (!R) return;
    const esc = mk.replace(/[*~_]/g, '\\$&'),
      wrapped = new RegExp(`^${esc}(.+)${esc}$`),
      lines = (cl) => String(cl.text || '').split('\n');
    const group = cellsIn(R).filter((cl) => String(cl.text || '').trim());
    if (!group.length) return;
    const all = group.every((cl) => lines(cl).every((l) => !l.trim() || wrapped.test(l.trim())));
    group.forEach((cl) => {
      cl.text = lines(cl)
        .map((l) => (!l.trim() ? l : all ? l.trim().replace(wrapped, '$1') : wrapped.test(l.trim()) ? l : `${mk}${l.trim()}${mk}`))
        .join('\n');
    });
    commit();
  }
  function clearText() {
    const R = selRect(tb(), sel);
    if (!R) return;
    fillRect(tb(), R, '');
    commit();
  }
  function say(s) {
    msgText = s;
    msg.textContent = s;
  }

  /* ----- copier, couper, coller ----- */
  const inRoot = (e) => root.contains(e.target) || e.target === document.body || e.target === document.documentElement;
  const onCopy = (e) => {
    if (!inRoot(e) || editing || !sel || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName || '')) return;
    const R = selRect(tb(), sel);
    e.clipboardData.setData('text/plain', rectToTsv(tb(), R));
    e.clipboardData.setData('text/html', rectToHtml(tb(), R));
    e.preventDefault();
    if (e.type === 'cut') clearText();
  };
  const onPaste = async (e) => {
    if (!inRoot(e) || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName || '')) return;
    const html = e.clipboardData.getData('text/html'),
      text = e.clipboardData.getData('text/plain');
    e.preventDefault(); // jamais de HTML du presse-papiers inséré tel quel (styles, images distantes)
    const g = clipToGrid({ html, text });
    if (!g) return;
    const single = g.R === 1 && g.C === 1;
    if (editing) {
      if (single) {
        document.execCommand(
          'insertHTML',
          false,
          String(g.cells[0].text)
            .split('\n')
            .map((l) => inlineMk(l, true, typoOf(doc)))
            .join('<br>'),
        );
        grid.refresh();
        return;
      }
      endEdit(true);
    }
    say('');
    if (sel) {
      const R = selRect(tb(), sel);
      if (single && (R.r1 > R.r0 || R.c1 > R.c0)) fillRect(tb(), R, g.cells[0].text);
      else {
        const lost = pasteGrid(tb(), g, R.r0, R.c0);
        sel = { a: { r: R.r0, c: R.c0 }, b: { r: Math.min(R.r0 + g.R, TABLE_MAX.rows) - 1, c: Math.min(R.c0 + g.C, TABLE_MAX.cols) - 1 } };
        warnLost(lost);
      }
      commit();
      return;
    }
    if (!(await confirmBox(t('Remplacer le contenu du tableau par le tableau collé ?'), { ok: t('Remplacer') }))) return;
    resizeTable(tb(), Math.min(g.R, TABLE_MAX.rows), Math.min(g.C, TABLE_MAX.cols));
    warnLost(pasteGrid(tb(), g, 0, 0));
    commit();
  };
  function warnLost(lost) {
    if (!lost.rows && !lost.cols) return;
    say(
      `${t('Tableau limité à 12 colonnes × 40 lignes : une partie du collage a été ignorée')} (${[
        lost.rows ? `${lost.rows} ${t(lost.rows > 1 ? 'lignes' : 'ligne')}` : '',
        lost.cols ? `${lost.cols} ${t(lost.cols > 1 ? 'colonnes' : 'colonne')}` : '',
      ]
        .filter(Boolean)
        .join(', ')}).`,
    );
  }

  /* ----- panneau ----- */
  const btn = (icon, label, fn, key) =>
    h('button', { type: 'button', class: 'te-act', dataset: { act: key }, onclick: fn }, ico(icon), h('span', { textContent: label }));
  const B = {
    merge: btn('arrows-join', 'Fusionner', merge, 'merge'),
    split: btn('arrows-split', 'Scinder', split, 'split'),
    above: btn('row-insert-top', 'Insérer au-dessus', () => rows('above'), 'row-above'),
    below: btn('row-insert-bottom', 'Insérer en dessous', () => rows('below'), 'row-below'),
    delRow: btn('row-remove', 'Supprimer', () => rows('del'), 'row-del'),
    left: btn('column-insert-left', 'Insérer à gauche', () => cols('left'), 'col-left'),
    right: btn('column-insert-right', 'Insérer à droite', () => cols('right'), 'col-right'),
    delCol: btn('column-remove', 'Supprimer', () => cols('del'), 'col-del'),
  };
  const alignBtns = [
    ['left', 'align-left', 'Aligner à gauche'],
    ['center', 'align-center', 'Centrer'],
    ['right', 'align-right', 'Aligner à droite'],
    ['justify', 'align-justified', 'Justifier'],
  ].map(([k, icon, label]) =>
    h(
      'button',
      { type: 'button', class: 'te-al', title: label, 'aria-label': label, dataset: { al: k }, onclick: () => align(k) },
      ico(icon),
    ),
  );
  const selLabel = h('strong', { class: 'te-where' });
  const card = (title, ...kids) => h('section', { class: 'te-card' }, h('h3', { textContent: title }), ...kids);
  form.append(
    card(
      'Sélection',
      selLabel,
      h('div', { class: 'te-row' }, B.merge, B.split),
      h('div', { class: 'te-seg', role: 'group', 'aria-label': t('Alignement') }, alignBtns),
    ),
    card('Lignes', h('div', { class: 'te-col' }, B.above, B.below, B.delRow)),
    card('Colonnes', h('div', { class: 'te-col' }, B.left, B.right, B.delCol)),
    msg,
    h('p', {
      class: 'hint',
      textContent:
        'Coller (Cmd/Ctrl + V) un tableau de Word, d’Excel, de Google Sheets ou d’une page web : fusions, gras, italique, souligné et alignements sont gardés. Sans cellule sélectionnée, le collage remplace le tableau.',
    }),
  );
  function syncPanel() {
    const T = tb(),
      R = selRect(T, sel);
    selLabel.textContent = R
      ? R.r0 === R.r1 && R.c0 === R.c1
        ? cellName(R.r0, R.c0)
        : `${cellName(R.r0, R.c0)}:${cellName(R.r1, R.c1)}`
      : t('Aucune cellule');
    const group = R ? cellsIn(R) : [];
    B.merge.disabled = group.length < 2;
    B.split.disabled = !group.some((cl) => cl.rs > 1 || cl.cs > 1);
    B.above.disabled = B.below.disabled = !R || T.rows.length >= TABLE_MAX.rows;
    B.left.disabled = B.right.disabled = !R || T.cols.length >= TABLE_MAX.cols;
    B.delRow.disabled = !R || R.r1 - R.r0 + 1 >= T.rows.length;
    B.delCol.disabled = !R || R.c1 - R.c0 + 1 >= T.cols.length;
    const ah = group.length ? group[0].ah || 'left' : null;
    alignBtns.forEach((b) => {
      b.disabled = !R;
      b.classList.toggle('on', !!ah && b.dataset.al === ah && group.every((cl) => (cl.ah || 'left') === ah));
    });
    if (msg.textContent !== msgText) msg.textContent = msgText;
  }

  /* ----- clavier ----- */
  const opener = document.activeElement,
    muted = [...document.body.children].filter((n) => n !== root && !n.inert && !/^(SCRIPT|STYLE|LINK)$/.test(n.tagName));
  let leaving = false;
  const close = (keep) => {
    if (editing) endEdit(keep);
    if (!keep) col.table = JSON.parse(snapshot);
    else if (checkTable(col.table).length) col.table = JSON.parse(snapshot); // filet : jamais de grille incohérente dans le document
    window.removeEventListener('keydown', onKey, true);
    document.removeEventListener('copy', onCopy, true);
    document.removeEventListener('cut', onCopy, true);
    document.removeEventListener('paste', onPaste, true);
    ro.disconnect();
    muted.forEach((n) => {
      n.inert = false;
    });
    root.remove();
    if (opener && opener.isConnected && opener.focus) opener.focus();
    current = null;
    document.body.classList.remove('ve-open');
    ctx.restructure();
  };
  const onKey = async (e) => {
    const tg = e.target,
      onGrid = tg === stage,
      dialog = document.querySelector('dialog[open], .cs-pop');
    if (dialog) return;
    if (e.key === 'Escape') {
      e.preventDefault(); // sinon le même Échap ferme aussitôt la modale de confirmation qui vient de s'ouvrir
      if (leaving) return;
      /* en couches : saisie, puis sélection de plusieurs cellules, puis sélection, puis l'éditeur (avec confirmation s'il y a des modifications) */
      if (editing) return endEdit(false);
      const R = selRect(tb(), sel);
      if (R && (R.r0 !== R.r1 || R.c0 !== R.c1) && (sel.a.r !== sel.b.r || sel.a.c !== sel.b.c)) {
        sel = { a: sel.a, b: sel.a };
        grid.drawChrome();
        return syncPanel();
      }
      if (sel) {
        sel = null;
        grid.drawChrome();
        return syncPanel();
      }
      leaving = true;
      try {
        if (
          JSON.stringify(col.table) === snapshot ||
          (await confirmBox(t('Abandonner les modifications du tableau ?'), { ok: t('Abandonner'), danger: true }))
        )
          close(false);
      } finally {
        leaving = false;
      }
      return;
    }
    if (editing) {
      if (e.key === 'Enter' && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        endEdit(true);
        move(1, 0);
      } else if (e.key === 'Tab') {
        e.preventDefault();
        endEdit(true);
        tabTo(e.shiftKey);
      }
      return; // le reste (flèches, Cmd/Ctrl + B, I, U, Z) agit dans le texte
    }
    const mod = (e.metaKey || e.ctrlKey) && !e.altKey;
    if (e.key === 'Tab') {
      if (onGrid && sel) {
        e.preventDefault();
        return tabTo(e.shiftKey);
      }
      /* focus piégé : Tab boucle du dernier réglage au premier */
      const items = [...root.querySelectorAll('button, select, [tabindex]')].filter(
        (n) => !n.disabled && n.tabIndex >= 0 && n.offsetParent !== null,
      );
      if (!items.length) return;
      const a = document.activeElement;
      if (!root.contains(a) || a === root) {
        e.preventDefault();
        (e.shiftKey ? items[items.length - 1] : items[0]).focus();
      } else if (e.shiftKey && a === items[0]) {
        e.preventDefault();
        items[items.length - 1].focus();
      } else if (!e.shiftKey && a === items[items.length - 1]) {
        e.preventDefault();
        items[0].focus();
      }
      return;
    }
    if (/INPUT|TEXTAREA|SELECT/.test(tg.tagName || '')) return;
    if (mod && (e.key.toLowerCase() === 'z' || e.key.toLowerCase() === 'y')) {
      e.preventDefault();
      return goHist(hist.i + (e.key.toLowerCase() === 'y' || e.shiftKey ? 1 : -1));
    }
    if (!onGrid) return;
    const T = tb();
    if (mod && e.key.toLowerCase() === 'a') {
      e.preventDefault();
      sel = { a: { r: 0, c: 0 }, b: { r: T.rows.length - 1, c: T.cols.length - 1 } };
      grid.drawChrome();
      return syncPanel();
    }
    const marks = { b: '**', i: '~~', u: '__' };
    if (mod && marks[e.key.toLowerCase()] && sel) {
      e.preventDefault();
      return toggleMark(marks[e.key.toLowerCase()]);
    }
    const arrows = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    if (arrows[e.key] && !mod) {
      e.preventDefault();
      return move(...arrows[e.key], e.shiftKey);
    }
    if (!sel) return;
    if (e.key === 'Enter' || e.key === 'F2') {
      e.preventDefault();
      return startEdit(true);
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      return clearText();
    }
    if (e.key.length === 1 && !mod && !e.altKey) {
      /* une frappe sur une cellule sélectionnée remplace son texte (comme un tableur) */
      e.preventDefault();
      startEdit(false);
      document.execCommand('insertText', false, e.key);
      grid.refresh();
    }
  };

  /* ----- barre ----- */
  const undoBtn = h(
    'button',
    {
      type: 'button',
      class: 've-hist',
      title: t('Annuler (Cmd/Ctrl + Z)'),
      'aria-label': t('Annuler la dernière modification'),
      onclick: () => goHist(hist.i - 1),
    },
    ico('arrow-back-up'),
  );
  const redoBtn = h(
    'button',
    {
      type: 'button',
      class: 've-hist',
      title: t('Rétablir (Cmd/Ctrl + Maj + Z)'),
      'aria-label': t('Rétablir la modification annulée'),
      onclick: () => goHist(hist.i + 1),
    },
    ico('arrow-forward-up'),
  );
  const zSel = h(
    'select',
    {
      onchange: (e) => {
        zoom = e.target.value;
        draw();
      },
    },
    [
      ['fit', 'Ajuster'],
      ['1', '100 %'],
      ['1.5', '150 %'],
      ['2', '200 %'],
    ].map(([v, l]) => h('option', { value: v, textContent: l })),
  );
  root.append(
    h(
      'div',
      { class: 've-bar' },
      h('div', { class: 've-bl' }, h('strong', { textContent: 'Éditeur de tableau' }), undoBtn, redoBtn),
      h('div'),
      h(
        'div',
        { class: 've-br' },
        h('button', { type: 'button', textContent: 'Annuler', onclick: () => close(false) }),
        h('button', { type: 'button', class: 'primary', textContent: 'Terminer', onclick: () => close(true) }),
      ),
    ),
    h(
      'div',
      { class: 've-body' },
      h(
        'div',
        { class: 've-main' },
        h(
          'div',
          { class: 've-viewbar' },
          h('label', { class: 'zoom' }, 'Zoom ', zSel),
          h('div', {
            class: 've-hint',
            textContent:
              'Clic, glisser ou Maj + clic : sélectionner · Entrée ou double-clic : écrire · Tab : cellule suivante · Échap : annuler',
          }),
        ),
        stage,
      ),
      form,
    ),
  );
  window.addEventListener('keydown', onKey, true);
  document.addEventListener('copy', onCopy, true);
  document.addEventListener('cut', onCopy, true);
  document.addEventListener('paste', onPaste, true);
  document.body.append(root);
  document.body.classList.add('ve-open');
  muted.forEach((n) => {
    n.inert = true;
  });
  current = root;
  const ro = new ResizeObserver(() => {
    if (zoom === 'fit' && !editing) draw();
  });
  ro.observe(stage);
  draw();
  stage.focus({ preventScroll: true });
  loadFonts().then(() => {
    if (current === root && !editing) draw();
  });
}
