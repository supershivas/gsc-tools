/* Onglet « Données » de l'éditeur de dataviz : tableau éditable (saisie, collage depuis Excel/Sheets, import CSV/TSV/JSON, export CSV).
   Un adaptateur décrit comment lire et écrire les données d'un type :
   { cols: [{ name, label, type, node?, onRename?, onDelete? }], rows(), get(i, j), set(i, j, v), addRow(), delRow(i), addCol?(), load(matrix, hasHeader) } */
import { h, ico } from './render.js';
import { t } from './i18n.js';
import { colorSelect } from './colorselect.js';
import { iconSelect } from './iconselect.js';
import { pictoChoices } from './viz/picto.js';

const num = c => { const n = parseFloat(String(c).replace(/\s/g, '').replace(',', '.')); return isNaN(n) ? null : n; };

export function parseMatrix(text) {
  const lines = String(text || '').replace(/\r/g, '').split('\n').filter(l => l.trim());
  if (!lines.length) return null;
  const sep = lines[0].includes('\t') ? '\t' : lines[0].includes(';') ? ';' : ',';
  return lines.map(l => {
    if (sep !== ',' || !l.includes('"')) return l.split(sep).map(c => c.trim());
    const out = []; let cur = '', q = false;
    for (const ch of l) { if (ch === '"') q = !q; else if (ch === ',' && !q) { out.push(cur.trim()); cur = ''; } else cur += ch; }
    return out.concat(cur.trim());
  });
}
export const toCSV = m => m.map(r => r.map(c => /[",;\n]/.test(String(c)) ? `"${String(c).replace(/"/g, '""')}"` : String(c)).join(',')).join('\n');

/** Texte d'un fichier importé → matrice (CSV, TSV ou JSON : tableau de lignes ou d'objets) */
export function fileToMatrix(name, text) {
  if (/\.json$/i.test(name) || /^\s*[\[{]/.test(text)) {
    let j = JSON.parse(text); if (!Array.isArray(j)) j = Object.values(j).find(Array.isArray) || [];
    if (j.length && !Array.isArray(j[0])) { const keys = [...new Set(j.flatMap(o => Object.keys(o)))]; return [keys, ...j.map(o => keys.map(k => o[k] ?? ''))]; }
    return j.map(r => r.map(c => String(c ?? '')));
  }
  return parseMatrix(text);
}

/** La 1re ligne est un en-tête si une de ses cellules « numériques » n'en est pas une */
export const hasHeader = (m, numericCols) => m.length > 1 && numericCols.some(j => m[0][j] !== undefined && m[0][j] !== '' && num(m[0][j]) === null);

/* ---------- Adaptateur « libellé × séries » (barres, courbes…) ---------- */
export function tableAdapter(f, obj, palOpts, SERIES_COLORS) {
  const rows = obj[f.k], series = obj[f.series], max = f.maxSeries || 4;
  const fix = () => rows.forEach(r => { r.v = Array.from({ length: series.length }, (_, j) => +(r.v || [])[j] || 0); });
  const ns = series.length, iconCol = f.icons ? [{ name: t('Icône'), type: 'text', isIcon: true, select: { none: t('Aucune'), ...pictoChoices(obj) } }] : [];
  return {
    root: obj,
    cols: [{ name: t('Libellé'), type: 'text' }, ...series.map((sr, j) => ({ name: sr.name || '', type: 'number', color: sr.color, palOpts,
      onColor: v => { sr.color = v; }, onRename: v => { sr.name = v; }, onDelete: series.length > 1 ? () => { series.splice(j, 1); fix(); } : null })), ...iconCol],
    rows: () => rows.length,
    get: (i, j) => j === 0 ? rows[i].label || '' : j > ns ? rows[i].icon || 'none' : String((rows[i].v || [])[j - 1] ?? 0),
    set(i, j, v) { if (j === 0) rows[i].label = v; else if (j > ns) rows[i].icon = v; else { const n = num(v); (rows[i].v || (rows[i].v = []))[j - 1] = n === null ? 0 : n; } },
    addRow: () => rows.push({ label: '', v: series.map(() => 0) }),
    delRow: i => { if (rows.length > 1) rows.splice(i, 1); },
    addCol: series.length < max ? () => { series.push({ name: `${t('Série')} ${series.length + 1}`, color: SERIES_COLORS[series.length % SERIES_COLORS.length] }); fix(); } : null,
    colLabel: t('+ Série'),
    load(m, head) {
      const body = head ? m.slice(1) : m, nser = Math.min(max, Math.max(1, ...body.map(c => c.length - 1)));
      const ns = Array.from({ length: nser }, (_, j) => ({ name: (head && m[0][j + 1]) || (series[j] && series[j].name) || `${t('Série')} ${j + 1}`, color: (series[j] && series[j].color) || SERIES_COLORS[j % SERIES_COLORS.length] }));
      series.splice(0, series.length, ...ns);
      rows.splice(0, rows.length, ...body.map(c => ({ label: c[0] || '', v: Array.from({ length: nser }, (_, j) => num(c[j + 1]) ?? 0) })));
    },
    numericCols: Array.from({ length: Math.max(0, series.length) }, (_, j) => j + 1),
    toMatrix: () => [['', ...series.map(s => s.name || '')], ...rows.map(r => [r.label || '', ...series.map((_, j) => (r.v || [])[j] ?? 0)])],
  };
}

/* ---------- Adaptateur « enregistrements » : lignes = objets, colonnes décrites par le type de dataviz ---------- */
export function recordsAdapter(spec, obj, palOpts) {
  const rows = obj[spec.k] || (obj[spec.k] = []), cols = spec.cols;
  const conv = (c, v) => c.t === 'number' ? (num(v) ?? 0) : c.t === 'color' ? (palOpts[v] ? v : c.auto ? '' : c.def || 'blue') : v;
  const blank = () => Object.fromEntries(cols.map(c => [c.k, c.def ?? (c.t === 'number' ? 0 : '')]));
  return {
    cols: cols.map(c => ({ name: c.label, type: c.t === 'number' ? 'number' : 'text', ml: !!c.ml, select: c.t === 'color' ? (c.auto ? { '': t('Auto'), ...palOpts } : palOpts) : c.options || null, isColor: c.t === 'color', isIcon: !!c.icons })),
    rows: () => rows.length,
    get: (i, j) => String(rows[i][cols[j].k] ?? ''),
    set: (i, j, v) => { rows[i][cols[j].k] = conv(cols[j], v); },
    addRow: () => rows.push(spec.item ? spec.item(rows.length) : blank()),
    delRow: i => { if (rows.length > (spec.min || 1)) rows.splice(i, 1); },
    addCol: null,
    load(m, head) {
      const body = head ? m.slice(1) : m;
      const idx = cols.map((c, j) => { if (!head) return j; const n = m[0].findIndex(x => x.toLowerCase() === c.label.toLowerCase() || x.toLowerCase() === c.k.toLowerCase()); return n < 0 ? j : n; });
      rows.splice(0, rows.length, ...body.map(r => Object.fromEntries(cols.map((c, j) => [c.k, conv(c, r[idx[j]] ?? c.def ?? '')]))));
    },
    numericCols: cols.map((c, j) => c.t === 'number' ? j : -1).filter(j => j >= 0),
    toMatrix: () => [cols.map(c => c.label), ...rows.map(r => cols.map(c => r[c.k] ?? ''))],
  };
}

/* ---------- Interface ---------- */
export function gridEditor(ad, ctx, { downloadName = 'data' } = {}) {
  const rebuild = () => ctx.restructure();
  const apply = (m, head) => { if (!m || !m.length) return; ad.load(m, head === undefined ? hasHeader(m, ad.numericCols) : head); rebuild(); };

  const file = h('input', { type: 'file', accept: '.csv,.tsv,.txt,.json,text/csv,application/json', hidden: true, onchange: async () => {
    const f = file.files[0]; file.value = ''; if (!f) return;
    try { apply(fileToMatrix(f.name, await f.text())); } catch (e) { alert(t('Fichier illisible.')); }
  } });
  const ta = h('textarea', { placeholder: t('Collez ici un tableau copié depuis Excel, Sheets ou un CSV (la 1re ligne peut contenir les en-têtes)'), style: { minHeight: '64px' } });
  const drop = h('div', { class: 'dg-drop' }, ico('upload'), h('span', { textContent: t('Glissez un fichier CSV, TSV ou JSON ici, ou') }),
    h('button', { type: 'button', textContent: t('importez-le…'), onclick: () => file.click() }), file);
  ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('on'); }));
  ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('on'); }));
  drop.addEventListener('drop', async e => { const f = e.dataTransfer.files[0]; if (!f) return; try { apply(fileToMatrix(f.name, await f.text())); } catch (x) { alert(t('Fichier illisible.')); } });

  const tools = h('div', { class: 'row dg-tools' },
    h('button', { type: 'button', class: 'pp-btn', onclick: () => { const b = new Blob(['﻿' + toCSV(ad.toMatrix())], { type: 'text/csv' }), a = h('a', { href: URL.createObjectURL(b), download: downloadName + '.csv' }); a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); } }, ico('download'), h('span', { textContent: t('Exporter en CSV') })));

  /* tableau */
  const table = h('table', { class: 'dg' });
  const head = h('tr', {}, h('th', { class: 'dg-n' }), ...ad.cols.map((c, j) => {
    const th = h('th', {}, c.onRename
      ? h('div', { class: 'dg-h' },
        c.palOpts ? colorSelect({ value: c.color, options: c.palOpts, onChange: v => { c.onColor(v); ctx.changed(); } }) : null,
        h('input', { type: 'text', value: c.name, placeholder: `${t('Série')} ${j}`, oninput: e => { c.onRename(e.target.value); ctx.changed(); } }),
        c.onDelete ? h('button', { type: 'button', class: 'mini danger', title: t('Supprimer'), onclick: () => { c.onDelete(); rebuild(); } }, ico('x')) : null)
      : h('span', { textContent: c.name }));
    return th;
  }), h('th', { class: 'dg-n' }));
  table.append(h('thead', {}, head));
  const body = h('tbody');
  const cell = (i, j) => {
    const c = ad.cols[j], v = ad.get(i, j);
    const common = { 'data-r': i, 'data-c': j };
    if (c.isIcon) return h('td', {}, iconSelect({ value: v || 'none', options: c.select, text: true, root: ad.root, onChange: nv => { ad.set(i, j, nv); ctx.changed(); } }));
    if (c.isColor) return h('td', {}, colorSelect({ value: v, options: c.select, text: true, onChange: nv => { ad.set(i, j, nv); ctx.changed(); } }));
    if (c.select) {
      const s = h('select', { ...common, onchange: e => { ad.set(i, j, e.target.value); ctx.changed(); } }, Object.entries(c.select).map(([k, l]) => h('option', { value: k, textContent: l })));
      s.value = v; return h('td', {}, s);
    }
    /* colonne `ml` : texte sur plusieurs lignes (Entrée = retour à la ligne), la cellule grandit avec son contenu */
    const mk = c.ml ? (p => { const ta = h('textarea', { ...p, class: 'dg-ml', rows: 1, value: v }); const fit = () => { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; }; ta.addEventListener('input', fit); requestAnimationFrame(fit); return ta; }) : (p => h('input', { ...p, type: 'text', inputMode: c.type === 'number' ? 'decimal' : 'text', value: v }));
    const inp = mk({ ...common,
      oninput: e => { ad.set(i, j, e.target.value); ctx.changed(); },
      onkeydown: e => {
        const go = (di, dj) => { const n = table.querySelector(`[data-r="${i + di}"][data-c="${j + dj}"]`); if (n) { e.preventDefault(); n.focus(); n.select && n.select(); } };
        if (c.ml) return;   // cellule multiligne : Entrée et flèches restent dans le texte
        if (e.key === 'Enter' || e.key === 'ArrowDown') go(1, 0); else if (e.key === 'ArrowUp') go(-1, 0);
      },
      onpaste: e => {
        const txt = (e.clipboardData || window.clipboardData).getData('text/plain');
        if (!/[\t\n]/.test(txt.trim())) return;
        const m = parseMatrix(txt); if (!m) return; e.preventDefault();
        if (i === 0 && j === 0) { apply(m); return; }
        m.forEach((r, di) => { while (ad.rows() <= i + di) ad.addRow(); r.forEach((val, dj) => { if (j + dj < ad.cols.length) ad.set(i + di, j + dj, val); }); });
        rebuild();
      } });
    return h('td', {}, inp);
  };
  for (let i = 0; i < ad.rows(); i++) {
    body.append(h('tr', {}, h('td', { class: 'dg-n', textContent: String(i + 1) }), ...ad.cols.map((_, j) => cell(i, j)),
      h('td', { class: 'dg-n' }, ad.rows() > 1 ? h('button', { type: 'button', class: 'mini danger', title: t('Supprimer'), onclick: () => { ad.delRow(i); rebuild(); } }, ico('x')) : null)));
  }
  table.append(body);
  const adds = h('div', { class: 'row' },
    h('button', { type: 'button', class: 'pp-btn', onclick: () => { ad.addRow(); rebuild(); } }, ico('plus'), h('span', { textContent: t('+ Ligne') })),
    ad.addCol ? h('button', { type: 'button', class: 'pp-btn', onclick: () => { ad.addCol(); rebuild(); } }, ico('plus'), h('span', { textContent: ad.colLabel })) : null);

  const pasteBtn = h('button', { type: 'button', class: 'pp-btn', textContent: t('Remplacer les données'), onclick: () => { const m = parseMatrix(ta.value); if (m) apply(m); } });
  return h('div', { class: 'dg-wrap' }, drop,
    h('details', {}, h('summary', { textContent: t('Coller un tableau') }), h('div', { class: 'body' }, ta, pasteBtn)),
    h('div', { class: 'dg-scroll' }, table), adds, tools);
}
