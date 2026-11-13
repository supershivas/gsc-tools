/* Tableau : import et export de fichiers CSV / TSV. Lecture par `dataparse.js` (séparateur, guillemets, nombres) ; ici : le nombre lu avec
   le séparateur décimal du fichier est réécrit dans le format du document (`decimalOf(doc.locale)`), l'aperçu avant import (en-têtes,
   séparateur décimal, colonnes numériques) et l'export. Les fonctions pures n'ont pas de DOM (testées par `FSTEST.tableTabular`). */
import { h } from '../render.js';
import { t } from '../i18n.js';
import { stripMk } from '../viz/util.js';
import { numberFormat } from '../numfmt.js';
import { decimalOf, num, padMatrix, numericColumns, headerRows, parseMatrix } from '../dataparse.js';
import { TABLE_MAX, HEAD_MAX, cellAt, headCount, isNumCol } from './model.js';

const SP = " \\u00a0\\u202f'’";
const CORE = new RegExp(`^([^\\d+\\-−–]*)([+\\-−–]?\\d(?:[\\d.,${SP}]*\\d)?)([^\\d]*)$`);

/** Lecture d'un texte « préfixe nombre suffixe » écrit avec le séparateur décimal `from` : null si ce n'est pas un nombre */
function readNumber(raw, from) {
  const s = String(raw ?? '').trim(),
    m = CORE.exec(s);
  if (!m) return { s, v: null };
  const [, pre, core, post] = m,
    v = num(core, from);
  if (v === null) return { s, v: null };
  const d = (/[.,](\d+)$/.exec(core) || [])[1],
    thousands = d && d.length === 3 && Math.abs(v) >= 1000 && Number.isInteger(v),
    dec = d && !thousands ? d.length : 0;
  const grouped = new RegExp(`\\d[${SP}.,]\\d{3}(?!\\d)`).test(dec ? core.slice(0, -dec - 1) : core);
  return { s, v, pre, post, dec, grouped, sign: v < 0 ? '−' : /^\+/.test(core) ? '+' : '' };
}

/** Comme `reformatNumber`, mais écrit selon la convention d'une langue du document (`doc.locale`) : séparateur décimal ET regroupement
    des milliers (1,227.5 · 1 227,5 · 1.227,5 · 1227,5 en espagnol), mêmes décimales, regroupement gardé seulement si le texte l'était */
export function localizeNumber(raw, from, locale) {
  const r = readNumber(raw, from);
  if (r.v === null) return r.s;
  let body;
  try {
    const opts = { minimumFractionDigits: r.dec, maximumFractionDigits: r.dec };
    if (!r.grouped) opts.useGrouping = false;
    body = numberFormat(locale, opts)
      .format(Math.abs(r.v))
      .replace(/[\u202f\u00a0]/g, '\u00a0'); // milliers : espace insécable ordinaire, comme à l'import
  } catch (e) {
    return reformatNumber(raw, from, from);
  }
  return `${r.pre}${r.sign}${body}${r.post}`;
}

/** Après un changement de « Format des nombres » : les nombres des colonnes numériques de tous les tableaux (hors lignes d'en-tête, texte sans
    mise en forme) sont réécrits de la convention de `fromLocale` à celle de `toLocale`. Renvoie le nombre de cellules changées. */
export function convertDocNumbers(doc, fromLocale, toLocale) {
  const from = decimalOf(fromLocale);
  let n = 0;
  for (const sec of doc.sections || [])
    for (const sb of sec.subs || [])
      for (const col of sb.cols || []) {
        const tb = col.type === 'table' && col.table;
        if (!tb || !Array.isArray(tb.cells) || !Array.isArray(tb.cols)) continue;
        const hc = headCount(tb);
        for (const cl of tb.cells) {
          if (cl.r < hc || !isNumCol(tb, cl.c) || typeof cl.text !== 'string' || !cl.text.trim() || cl.text !== stripMk(cl.text)) continue;
          const out = localizeNumber(cl.text, from, toLocale);
          if (out !== cl.text.trim()) {
            cl.text = out;
            n++;
          }
        }
      }
  return n;
}

/** Un nombre écrit avec le séparateur décimal `from` → le même, écrit pour `to` (mêmes décimales, milliers regroupés si le texte l'était,
    espace insécable en milliers pour la virgule décimale, virgule pour le point). Préfixe et suffixe (€, %, unité) sont gardés ;
    ce qui n'est pas un nombre est rendu tel quel. */
export function reformatNumber(raw, from, to) {
  const r = readNumber(raw, from);
  if (r.v === null) return r.s;
  const { pre, post, dec, grouped, v } = r,
    core = r.sign === '+' ? '+' : '';
  const [int, frac] = Math.abs(v).toFixed(dec).split('.');
  const body = (grouped ? int.replace(/\B(?=(\d{3})+(?!\d))/g, to === ',' ? ' ' : ',') : int) + (frac ? to + frac : '');
  return `${pre}${v < 0 ? '−' : core}${body}${post}`;
}

/** Matrice lue → { matrix (textes, nombres écrits au format du document), head, numCols } selon les réglages de l'aperçu */
export function readTableImport(m0, { head = 0, dec = '.', docDec = '.', docLocale, numCols } = {}) {
  const m = padMatrix(m0),
    cols = numCols || numericColumns(m, dec);
  return {
    matrix: m.map((row, i) =>
      row.map((v, j) =>
        i >= head && cols.includes(j) && v !== '' ? (docLocale ? localizeNumber(v, dec, docLocale) : reformatNumber(v, dec, docDec)) : v,
      ),
    ),
    head,
    numCols: cols,
  };
}

/** Texte brut d'une cellule (mise en forme en ligne retirée) */
const plain = (cl) => stripMk(cl.text || '').replace(/\u2028/g, '\n');

/** Tableau → matrice de textes (une cellule fusionnée : son texte à la case d'ancre, les autres cases vides) */
export function tableToMatrix(tb) {
  return tb.rows.map((_, r) =>
    tb.cols.map((_, c) => {
      const cl = cellAt(tb, r, c);
      return cl && cl.r === r && cl.c === c ? plain(cl) : '';
    }),
  );
}

/** Séparateur de colonnes du CSV : « ; » quand la virgule est décimale (Excel en français), « , » sinon */
export const csvSep = (locale) => (decimalOf(locale) === ',' ? ';' : ',');

/** Matrice → texte CSV (sep) ou TSV ('\t'), cellules entre guillemets si nécessaire */
export function matrixToText(m, sep) {
  const q = (v) => (new RegExp(`[${sep === '\t' ? '\\t' : sep}\\n"]`).test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return m.map((row) => row.map(q).join(sep)).join('\n') + '\n';
}

/** Téléchargement d'un texte (CSV avec marque UTF-8 pour qu'Excel lise les accents) */
export function downloadText(text, name, mime) {
  const blob = new Blob([mime.startsWith('text/csv') ? '﻿' : '', text], { type: mime + ';charset=utf-8' }),
    a = h('a', { href: URL.createObjectURL(blob), download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/** Fichier lu → matrice (CSV, TSV, texte) ou null */
export const fileMatrix = (text) => {
  const m = parseMatrix(text);
  return m && m.length ? padMatrix(m).slice(0, 500) : null;
};

/** Aperçu avant import : lignes d'en-tête (0 à 2), séparateur décimal, colonne texte ou nombre. Rend { matrix, head, numCols, lost } ou null (annulé). */
export function tablePreview(m0, locale) {
  return new Promise((resolve) => {
    const m = padMatrix(m0),
      docDec = decimalOf(locale),
      w = m[0] ? m[0].length : 0;
    const st = { dec: 'auto', head: Math.min(HEAD_MAX, headerRows(m, docDec, [])), cols: null };
    const decOf = () => (st.dec === 'auto' ? docDec : st.dec);
    st.cols = new Set(numericColumns(m, decOf()));
    let touched = false,
      result = null;
    const summary = h('p', { class: 'imp-sum', 'aria-live': 'polite' }),
      scroll = h('div', { class: 'dg-scroll imp-scroll' });
    const headBtns = [0, 1, 2].map((n) =>
      h('button', {
        type: 'button',
        class: 'imp-seg',
        textContent: String(n),
        dataset: { head: n },
        onclick: () => {
          st.head = n;
          draw();
        },
      }),
    );
    const decSel = h(
      'select',
      {
        class: 'imp-dec',
        onchange: (e) => {
          st.dec = e.target.value;
          if (!touched) st.cols = new Set(numericColumns(m, decOf()));
          draw();
        },
      },
      h('option', { value: 'auto', textContent: `${t('Format du document')} (${docDec === ',' ? '1 025,5' : '1,025.5'})` }),
      h('option', { value: '.', textContent: t('Point (1,025.5)') }),
      h('option', { value: ',', textContent: t('Virgule (1 025,5 ou 1.025,5)') }),
    );
    const okBtn = h('button', { type: 'submit', class: 'btn primary', textContent: t('Importer') });
    function draw() {
      headBtns.forEach((b, n) => {
        b.classList.toggle('on', n === st.head);
        b.setAttribute('aria-pressed', String(n === st.head));
      });
      const res = readTableImport(m, { head: st.head, dec: decOf(), docDec, docLocale: locale, numCols: [...st.cols] });
      const table = h('table', { class: 'dg imp' });
      table.append(
        h(
          'thead',
          {},
          h(
            'tr',
            {},
            h('th', { class: 'dg-n' }),
            ...Array.from({ length: w }, (_, j) => {
              const sel = h(
                'select',
                {
                  'aria-label': `${t('Type de la colonne')} ${j + 1}`,
                  dataset: { col: j },
                  onchange: (e) => {
                    touched = true;
                    e.target.value === 'num' ? st.cols.add(j) : st.cols.delete(j);
                    draw();
                  },
                },
                h('option', { value: 'text', textContent: t('Texte') }),
                h('option', { value: 'num', textContent: t('Nombre') }),
              );
              sel.value = st.cols.has(j) ? 'num' : 'text';
              return h('th', { class: st.cols.has(j) ? 'imp-role-data' : 'imp-role-skip' }, sel);
            }),
          ),
        ),
      );
      const body = h('tbody');
      m.slice(0, 60).forEach((row, i) => {
        const isHead = i < st.head;
        body.append(
          h(
            'tr',
            { class: isHead ? 'imp-h' : '' },
            h('td', { class: 'dg-n', textContent: isHead ? t('En-tête') : String(i - st.head + 1) }),
            ...row.map((raw, j) => {
              const out = res.matrix[i][j],
                isNum = !isHead && st.cols.has(j) && raw !== '';
              const bad = isNum && num(raw, decOf()) === null;
              return h(
                'td',
                {
                  class: 'imp-c' + (isNum ? ' imp-num' : '') + (bad ? ' bad' : ''),
                  title: bad ? t('Non lu : ce n’est pas un nombre') : null,
                },
                h('span', { textContent: out }),
                out !== raw ? h('small', { textContent: raw }) : null,
              );
            }),
          ),
        );
      });
      table.append(body);
      scroll.replaceChildren(table);
      const rows = Math.min(m.length, TABLE_MAX.rows),
        cols = Math.min(w, TABLE_MAX.cols),
        lost = { rows: m.length - rows, cols: w - cols };
      const parts = [t('{r} lignes, {c} colonnes.').replace('{r}', rows).replace('{c}', cols)];
      if (lost.rows || lost.cols) parts.push(t('Tableau limité à 12 colonnes × 40 lignes : le reste sera ignoré.'));
      summary.textContent = parts.join(' ');
      summary.classList.toggle('warn', !!(lost.rows || lost.cols));
      okBtn.disabled = !rows || !cols;
      result = { ...res, lost };
    }
    const dlg = h('dialog', { class: 'modal dg-imp', 'aria-label': t('Aperçu de l’import') });
    dlg.append(
      h(
        'form',
        {
          method: 'dialog',
          class: 'modal-form',
          onsubmit: () => {
            dlg.dataset.ok = '1';
          },
        },
        h(
          'div',
          { class: 'imp-body' },
          h('h2', { textContent: t('Aperçu de l’import') }),
          h(
            'div',
            { class: 'imp-tools' },
            h('span', { class: 'imp-lab', textContent: t('Lignes d’en-tête') }),
            h('div', { class: 'imp-segs', role: 'group', 'aria-label': t('Lignes d’en-tête') }, ...headBtns),
            h('label', { class: 'imp-lab' }, h('span', { textContent: t('Séparateur décimal') }), decSel),
          ),
          scroll,
          summary,
        ),
        h(
          'div',
          { class: 'modal-actions' },
          h('button', { type: 'button', class: 'btn', textContent: t('Annuler'), onclick: () => dlg.close() }),
          okBtn,
        ),
      ),
    );
    dlg.addEventListener('close', () => {
      dlg.remove();
      resolve(dlg.dataset.ok && result ? result : null);
    });
    draw();
    document.body.append(dlg);
    dlg.showModal();
    okBtn.focus();
  });
}
