/* Onglet « Données » de l'éditeur de dataviz : tableau éditable (saisie, collage depuis Excel/Sheets, import CSV/TSV/JSON, export CSV).
   Un adaptateur décrit comment lire et écrire les données d'un type :
   { cols: [{ name, label, type, node?, onRename?, onDelete? }], rows(), get(i, j), set(i, j, v), addRow(), delRow(i), addCol?(), load(matrix, hasHeader) } */
import { h, ico } from './render.js';
import { t } from './i18n.js';
import { colorSelect } from './colorselect.js';
import { iconSelect } from './iconselect.js';
import { pictoChoices } from './viz/picto.js';
import { ctxIcons } from './viz/icons.js';
import { alertBox, confirmBox } from './dialogs.js';
import { num, parseMatrix, fileToMatrix, padMatrix, headerRows, autoRoles, readImport, decimalOf } from './dataparse.js';

export { parseMatrix, fileToMatrix, num };
export const toCSV = (m) =>
  m.map((r) => r.map((c) => (/[",;\n]/.test(String(c)) ? `"${String(c).replace(/"/g, '""')}"` : String(c))).join(',')).join('\n');

/** La 1re ligne est un en-tête (ancienne règle, gardée pour compatibilité) : voir `headerRows` pour la détection complète */
export const hasHeader = (m, numericCols, dec = '.') =>
  m.length > 1 &&
  (headerRows(padMatrix(m), dec) > 0 || numericCols.some((j) => m[0][j] !== undefined && m[0][j] !== '' && num(m[0][j], dec) === null));

/** Mise en forme d'une ligne (heatmap) : type (`row.kind`, absent = ligne ordinaire), gras et taille (`row.fmt`, absents = selon le type) */
function rowFmtCols() {
  const setFmt = (r, k, v) => {
    const f = { ...(r.fmt || {}) };
    if (v === undefined) delete f[k];
    else f[k] = v;
    if (Object.keys(f).length) r.fmt = f;
    else delete r.fmt;
  };
  return [
    {
      name: t('Type de ligne'),
      type: 'text',
      isFmt: true,
      select: { row: t('Ligne'), heading: t('Titre'), total: t('Total') },
      get: (r) => (r.kind === 'heading' || r.kind === 'total' ? r.kind : 'row'),
      set: (r, v) => {
        if (v === 'heading' || v === 'total') r.kind = v;
        else delete r.kind;
      },
    },
    {
      name: t('Gras'),
      type: 'text',
      isFmt: true,
      select: { auto: t('Auto'), on: t('Oui'), off: t('Non') },
      get: (r) => (r.fmt && r.fmt.bold === true ? 'on' : r.fmt && r.fmt.bold === false ? 'off' : 'auto'),
      set: (r, v) => setFmt(r, 'bold', v === 'on' ? true : v === 'off' ? false : undefined),
    },
    {
      name: t('Taille'),
      type: 'text',
      isFmt: true,
      select: { auto: t('Auto'), small: t('Petit'), normal: t('Normal'), large: t('Grand') },
      get: (r) => (r.fmt && r.fmt.size) || 'auto',
      set: (r, v) => setFmt(r, 'size', v === 'auto' ? undefined : v),
    },
  ];
}

/* ---------- Adaptateur « libellé × séries » (barres, courbes…) ---------- */
/** icons : bibliothèque d'icônes du document (ctxIcons) */
export function tableAdapter(f, obj, palOpts, SERIES_COLORS, icons) {
  const rows = obj[f.k],
    series = obj[f.series],
    max = f.maxSeries || 4,
    blank = !!f.blank, // heatmap : une cellule vide reste vide (null = « en attente »), au lieu de 0
    cell = (x) => (blank && (x === null || x === undefined || x === '') ? null : +x || 0),
    serName = t(f.serLabel || 'Série');
  const fix = () =>
    rows.forEach((r) => {
      r.v = Array.from({ length: series.length }, (_, j) => cell((r.v || [])[j]));
    });
  const ns = series.length,
    parse = (v) => num(v, self.dec),
    /* colonnes après les séries : icône (barres verticales), mise en forme de la ligne (heatmap : type, gras, taille) */
    extras = [
      ...(f.icons
        ? [
            {
              name: t('Icône'),
              type: 'text',
              isIcon: true,
              select: { none: t('Aucune'), ...pictoChoices(obj, icons) },
              get: (r) => r.icon || 'none',
              set: (r, v) => (r.icon = v),
            },
          ]
        : []),
      ...(f.rowFmt ? rowFmtCols() : []),
    ];
  const self = {
    dec: '.', // séparateur décimal du document (`gridEditor` le pose d'après `doc.locale`)
    table: true,
    maxData: max,
    blank,
    root: obj,
    cols: [
      { name: t('Libellé'), type: 'text' },
      ...series.map((sr, j) => ({
        name: sr.name || '',
        type: 'number',
        group: f.levels ? sr.group || '' : null, // heatmap : groupe de colonnes
        hidden: f.hide ? !!sr.hidden : null, // heatmap : colonne masquée (gardée dans les données)
        onHide: f.hide
          ? (on) => {
              if (on) sr.hidden = true;
              else delete sr.hidden;
            }
          : null,
        onGroup: f.levels
          ? (v) => {
              if (v.trim()) sr.group = v;
              else delete sr.group;
            }
          : null,
        color: sr.color,
        palOpts: f.noColor ? null : palOpts, // heatmap : la couleur vient de l'échelle, pas de la colonne
        onColor: (v) => {
          sr.color = v;
        },
        onRename: (v) => {
          sr.name = v;
        },
        dash: f.dash ? sr.dash === 'dashed' : null, // courbes : trait plein ou en tirets
        onDash: f.dash
          ? (on) => {
              if (on) sr.dash = 'dashed';
              else delete sr.dash;
            }
          : null,
        onDelete:
          series.length > 1
            ? () => {
                series.splice(j, 1);
                fix();
              }
            : null,
      })),
      ...extras,
    ],
    rows: () => rows.length,
    get: (i, j) =>
      j === 0 ? rows[i].label || '' : j > ns ? extras[j - ns - 1].get(rows[i]) : String((rows[i].v || [])[j - 1] ?? (blank ? '' : 0)),
    set(i, j, v) {
      if (j === 0) rows[i].label = v;
      else if (j > ns) extras[j - ns - 1].set(rows[i], v);
      else {
        const n = parse(v);
        (rows[i].v || (rows[i].v = []))[j - 1] = n === null ? (blank ? null : 0) : n;
      }
    },
    /* heatmap : lignes et colonnes masquées (gardées dans les données, absentes du dessin) */
    hide: f.hide
      ? {
          get: (i) => !!rows[i].hidden,
          set: (i, on) => {
            if (on) rows[i].hidden = true;
            else delete rows[i].hidden;
          },
          count: () => ({ rows: rows.filter((r) => r.hidden).length, cols: series.filter((x) => x.hidden).length }),
          showAll: () => {
            rows.forEach((r) => delete r.hidden);
            series.forEach((x) => delete x.hidden);
          },
        }
      : null,
    /* heatmap : niveau des lignes (0 = donnée principale … 3, affiché de 1 à 4), chaque ligne se règle librement */
    levels: f.levels
      ? {
          get: (i) => Math.max(0, Math.min(3, Math.round(+rows[i].level || 0))),
          max: () => 3,
          set: (i, l) => {
            if (l > 0) rows[i].level = l;
            else delete rows[i].level;
          },
        }
      : null,
    addRow: () => rows.push({ label: '', v: series.map(() => (blank ? null : 0)) }),
    delRow: (i) => {
      if (rows.length > 1) rows.splice(i, 1);
    },
    addCol:
      series.length < max
        ? () => {
            series.push({ name: `${serName} ${series.length + 1}`, color: SERIES_COLORS[series.length % SERIES_COLORS.length] });
            fix();
          }
        : null,
    colLabel: '+ ' + serName,
    /* inverser lignes et colonnes : les libellés deviennent les noms de séries et inversement ; masquage gardé, niveaux, types, groupes et couleurs perdus */
    transpose: {
      blocked: () =>
        rows.length > max ? t('Inverser donnerait {n} colonnes : {max} au plus.').replace('{n}', rows.length).replace('{max}', max) : '',
      lossy: () => rows.some((r) => r.kind || r.fmt || r.level) || series.some((x) => x.group),
      run() {
        const oldRows = rows.slice(),
          oldSeries = series.slice();
        series.splice(
          0,
          series.length,
          ...oldRows.map((r, i) => ({
            name: r.label || '',
            color: SERIES_COLORS[i % SERIES_COLORS.length],
            ...(f.hide && r.hidden ? { hidden: true } : {}),
          })),
        );
        rows.splice(
          0,
          rows.length,
          ...oldSeries.map((x, j) => ({
            label: x.name || '',
            v: oldRows.map((r) => cell((r.v || [])[j])),
            ...(f.hide && x.hidden ? { hidden: true } : {}),
          })),
        );
      },
    },
    load(m, head, { groups } = {}) {
      const body = head ? m.slice(1) : m,
        nser = Math.min(max, Math.max(1, ...body.map((c) => c.length - 1)));
      const ns = Array.from({ length: nser }, (_, j) => {
        const g = f.levels ? (groups ? groups[j] : series[j] && series[j].group) : null; // groupes lus à l'import, sinon gardés
        return {
          name: (head && m[0][j + 1]) || (series[j] && series[j].name) || `${serName} ${j + 1}`,
          color: (series[j] && series[j].color) || SERIES_COLORS[j % SERIES_COLORS.length],
          ...(series[j] && series[j].dash ? { dash: series[j].dash } : {}),
          ...(g ? { group: g } : {}),
          ...(f.hide && series[j] && series[j].hidden ? { hidden: true } : {}),
        };
      });
      series.splice(0, series.length, ...ns);
      /* une ligne de même libellé garde sa mise en forme (type, gras, taille) */
      const keep = new Map(
        rows
          .filter((r) => r.kind || r.fmt || r.level || r.hidden)
          .map((r) => [r.label, { kind: r.kind, fmt: r.fmt, level: r.level, hidden: r.hidden }]),
      );
      rows.splice(
        0,
        rows.length,
        ...body.map((c) => {
          const label = String(c[0] ?? ''),
            k = keep.get(label);
          return {
            label,
            v: Array.from({ length: nser }, (_, j) => parse(c[j + 1]) ?? (blank ? null : 0)),
            ...(k && k.kind ? { kind: k.kind } : {}),
            ...(k && k.fmt ? { fmt: k.fmt } : {}),
            ...(k && k.level ? { level: k.level } : {}),
            ...(k && k.hidden ? { hidden: true } : {}),
          };
        }),
      );
    },
    numericCols: Array.from({ length: Math.max(0, series.length) }, (_, j) => j + 1),
    toMatrix: () => [
      ['', ...series.map((s) => s.name || '')],
      ...rows.map((r) => [r.label || '', ...series.map((_, j) => (r.v || [])[j] ?? (blank ? '' : 0))]),
    ],
  };
  return self;
}

/* ---------- Adaptateur « enregistrements » : lignes = objets, colonnes décrites par le type de dataviz ---------- */
export function recordsAdapter(spec, obj, palOpts, icons) {
  const rows = obj[spec.k] || (obj[spec.k] = []),
    cols = spec.cols;
  const conv = (c, v) =>
    c.t === 'number' ? (num(v, self.dec) ?? 0) : c.t === 'color' ? (palOpts[v] ? v : c.auto ? '' : c.def || 'blue') : String(v ?? '');
  const blank = () => Object.fromEntries(cols.map((c) => [c.k, c.def ?? (c.t === 'number' ? 0 : '')]));
  const self = {
    dec: '.',
    table: false,
    names: cols.flatMap((c) => [c.label, t(c.label), c.k]),
    cols: cols.map((c) => ({
      name: c.label,
      type: c.t === 'number' ? 'number' : 'text',
      ml: !!c.ml,
      select:
        c.t === 'color'
          ? c.auto
            ? { '': t('Auto'), ...palOpts }
            : palOpts
          : (typeof c.options === 'function' ? c.options(obj, icons) : c.options) || null,
      isColor: c.t === 'color',
      isIcon: !!c.icons,
    })),
    rows: () => rows.length,
    get: (i, j) => String(rows[i][cols[j].k] ?? ''),
    set: (i, j, v) => {
      rows[i][cols[j].k] = conv(cols[j], v);
    },
    addRow: () => rows.push(spec.item ? spec.item(rows.length) : blank()),
    delRow: (i) => {
      if (rows.length > (spec.min || 1)) rows.splice(i, 1);
    },
    addCol: null,
    load(m, head) {
      const body = head ? m.slice(1) : m;
      const idx = cols.map((c, j) => {
        if (!head) return j;
        const keys = [c.label, t(c.label), c.k].map((x) => x.toLowerCase());
        const n = m[0].findIndex((x) => keys.includes(String(x).toLowerCase()));
        return n < 0 ? j : n;
      });
      rows.splice(0, rows.length, ...body.map((r) => Object.fromEntries(cols.map((c, j) => [c.k, conv(c, r[idx[j]] ?? c.def ?? '')]))));
    },
    numericCols: cols.map((c, j) => (c.t === 'number' ? j : -1)).filter((j) => j >= 0),
    toMatrix: () => [cols.map((c) => c.label), ...rows.map((r) => cols.map((c) => r[c.k] ?? ''))],
  };
  return self;
}

/* ---------- Aperçu avant import ---------- */
/** Fenêtre d'aperçu d'un tableau collé ou importé : matrice lue, lignes d'en-tête (0, 1, 2), rôle de chaque colonne
    (libellé / donnée / ignorer), séparateur décimal, nombres tels qu'interprétés et cellules non lues.
    Rend { matrix, head } pour `ad.load`, ou null (annulé). */
export function importPreview(m0, ad, locale) {
  return new Promise((resolve) => {
    const m = padMatrix(m0),
      w = m[0] ? m[0].length : 0,
      docDec = decimalOf(locale),
      loc = locale || 'en-GB';
    const st = { dec: 'auto', head: Math.min(2, headerRows(m, docDec, ad.names || [])), touched: false };
    const decOf = () => (st.dec === 'auto' ? docDec : st.dec);
    st.roles = autoRoles(m, st.head, docDec, ad.table);
    let result = null;
    const nf = (v) => {
      try {
        return new Intl.NumberFormat(loc, { maximumFractionDigits: 6 }).format(v);
      } catch (e) {
        return String(v);
      }
    };
    const ROLE = ad.table ? { label: t('Libellé'), data: t('Donnée'), skip: t('Ignorer') } : { data: t('Donnée'), skip: t('Ignorer') };
    const summary = h('p', { class: 'imp-sum', 'aria-live': 'polite' });
    const scroll = h('div', { class: 'dg-scroll imp-scroll' });
    const headBtns = [0, 1, 2].map((n) =>
      h('button', {
        type: 'button',
        class: 'imp-seg',
        textContent: String(n),
        'data-head': n,
        onclick: () => {
          st.head = n;
          if (!st.touched) st.roles = autoRoles(m, n, decOf(), ad.table);
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
          draw();
        },
      },
      h('option', { value: 'auto', textContent: `${t('Format du document')} (${docDec === ',' ? '1 025,5' : '1,025.5'})` }),
      h('option', { value: '.', textContent: t('Point (1,025.5)') }),
      h('option', { value: ',', textContent: t('Virgule (1 025,5 ou 1.025,5)') }),
    );
    const draw = () => {
      headBtns.forEach((b, n) => {
        b.classList.toggle('on', n === st.head);
        b.setAttribute('aria-pressed', String(n === st.head));
      });
      const res = readImport(m, { head: st.head, roles: st.roles, dec: decOf(), table: ad.table });
      const table = h('table', { class: 'dg imp' });
      table.append(
        h(
          'thead',
          {},
          h(
            'tr',
            {},
            h('th', { class: 'dg-n' }),
            ...st.roles.map((r, j) => {
              const sel = h(
                'select',
                {
                  'aria-label': `${t('Rôle de la colonne')} ${j + 1}`,
                  'data-role': j,
                  onchange: (e) => {
                    st.roles[j] = e.target.value;
                    st.touched = true;
                    draw();
                  },
                },
                Object.entries(ROLE).map(([k, l]) => h('option', { value: k, textContent: l })),
              );
              sel.value = r in ROLE ? r : 'data';
              return h('th', { class: 'imp-role-' + r }, sel);
            }),
          ),
        ),
      );
      const body = h('tbody');
      m.forEach((row, i) => {
        const isHead = i < st.head,
          info = isHead ? null : res.cells[i - st.head];
        body.append(
          h(
            'tr',
            { class: isHead ? 'imp-h' : '' },
            h('td', { class: 'dg-n', textContent: isHead ? t('En-tête') : String(i - st.head + 1) }),
            ...row.map((raw, j) => {
              const role = st.roles[j],
                c = info && info[j];
              if (isHead || !c || c.v === null) {
                const bad = !!(c && c.bad);
                return h(
                  'td',
                  { class: `imp-c imp-role-${role}${bad ? ' bad' : ''}`, title: bad ? t('Non lu : ce n’est pas un nombre') : null },
                  bad ? ico('alert-triangle') : null,
                  h('span', { textContent: raw }),
                );
              }
              const shown = nf(c.v);
              return h(
                'td',
                { class: `imp-c imp-num imp-role-${role}`, 'data-v': c.v },
                h('span', { textContent: shown }),
                shown !== raw ? h('small', { textContent: raw }) : null,
              );
            }),
          ),
        );
      });
      table.append(body);
      scroll.replaceChildren(table);
      const nRows = Math.max(0, res.matrix.length - (st.head ? 1 : 0)),
        nData = res.dataCols.length;
      const parts = [t('{r} lignes, {c} colonnes de données.').replace('{r}', nRows).replace('{c}', nData)];
      if (res.bad)
        parts.push(
          (ad.blank || !ad.table ? t('{n} cellules non lues (laissées vides).') : t('{n} cellules non lues (comptées 0).')).replace(
            '{n}',
            res.bad,
          ),
        );
      if (ad.table && ad.maxData && nData > ad.maxData)
        parts.push(t('{n} colonnes de données au plus : les suivantes seront ignorées.').replace('{n}', ad.maxData));
      if (ad.table && res.groups)
        parts.push(t('Groupes de colonnes : {g}.').replace('{g}', [...new Set(res.groups.filter(Boolean))].join(', ')));
      if (ad.table && !res.roles.includes('label')) parts.push(t('Aucune colonne de libellés : les lignes resteront sans nom.'));
      summary.textContent = parts.join(' ');
      summary.classList.toggle('warn', !!res.bad);
      okBtn.disabled = !nData || !nRows;
      result = res;
    };
    const okBtn = h('button', { type: 'submit', class: 'btn primary', textContent: t('Importer') });
    const dlg = h('dialog', { class: 'modal dg-imp', 'aria-label': t('Aperçu de l’import') });
    const form = h(
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
    );
    dlg.append(form);
    dlg.addEventListener('close', () => {
      dlg.remove();
      resolve(dlg.dataset.ok && result ? { matrix: result.matrix, head: st.head > 0, groups: result.groups } : null);
    });
    draw();
    document.body.append(dlg);
    dlg.showModal();
    okBtn.focus();
  });
}

/** « 2 lignes, 1 colonne » masquées */
export const hiddenText = ({ rows, cols }) =>
  [rows ? `${rows} ${rows > 1 ? t('lignes') : t('ligne')}` : '', cols ? `${cols} ${cols > 1 ? t('colonnes') : t('colonne')}` : '']
    .filter(Boolean)
    .join(', ');

/** Bouton œil : masquer / réafficher une ligne ou une colonne (les données restent) */
const eyeBtn = (hidden, onToggle) =>
  h(
    'button',
    {
      type: 'button',
      class: 'mini dg-eye' + (hidden ? ' on' : ''),
      title: hidden ? t('Réafficher') : t('Masquer'),
      'aria-label': hidden ? t('Réafficher') : t('Masquer'),
      'aria-pressed': String(hidden),
      onclick: onToggle,
    },
    ico(hidden ? 'eye-off' : 'eye'),
  );

/* ---------- Interface ---------- */
export function gridEditor(ad, ctx, { downloadName = 'data', locale } = {}) {
  const rebuild = () => ctx.restructure();
  ad.dec = decimalOf(locale);
  /* collage ou import d'un tableau entier : aperçu d'abord, rien ne change avant « Importer » */
  const apply = async (m) => {
    if (!m || !m.length) return;
    const r = await importPreview(m, ad, locale);
    if (!r) return;
    ad.load(r.matrix, r.head, { groups: r.groups || undefined });
    rebuild();
  };

  const file = h('input', {
    type: 'file',
    accept: '.csv,.tsv,.txt,.json,text/csv,application/json',
    hidden: true,
    onchange: async () => {
      const f = file.files[0];
      file.value = '';
      if (!f) return;
      try {
        apply(fileToMatrix(f.name, await f.text()));
      } catch (e) {
        alertBox(t('Fichier illisible.'));
      }
    },
  });
  const ta = h('textarea', {
    placeholder: t('Collez ici un tableau copié depuis Excel, Sheets ou un CSV (la 1re ligne peut contenir les en-têtes)'),
    style: { minHeight: '64px' },
  });
  const drop = h(
    'div',
    { class: 'dg-drop' },
    ico('upload'),
    h('span', { textContent: t('Glissez un fichier CSV, TSV ou JSON ici, ou') }),
    h('button', { type: 'button', textContent: t('importez-le…'), onclick: () => file.click() }),
    file,
  );
  ['dragenter', 'dragover'].forEach((ev) =>
    drop.addEventListener(ev, (e) => {
      e.preventDefault();
      drop.classList.add('on');
    }),
  );
  ['dragleave', 'drop'].forEach((ev) =>
    drop.addEventListener(ev, (e) => {
      e.preventDefault();
      drop.classList.remove('on');
    }),
  );
  drop.addEventListener('drop', async (e) => {
    const f = e.dataTransfer.files[0];
    if (!f) return;
    try {
      apply(fileToMatrix(f.name, await f.text()));
    } catch (x) {
      alertBox(t('Fichier illisible.'));
    }
  });

  const tools = h(
    'div',
    { class: 'row dg-tools' },
    h(
      'button',
      {
        type: 'button',
        class: 'pp-btn',
        onclick: () => {
          const b = new Blob(['﻿' + toCSV(ad.toMatrix())], { type: 'text/csv' }),
            a = h('a', { href: URL.createObjectURL(b), download: downloadName + '.csv' });
          a.click();
          setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        },
      },
      ico('download'),
      h('span', { textContent: t('Exporter en CSV') }),
    ),
  );

  /* tableau */
  const table = h('table', { class: 'dg' });
  const head = h(
    'tr',
    {},
    h('th', { class: 'dg-n' }),
    ...ad.cols.map((c, j) => {
      const th = h(
        'th',
        {},
        c.onRename
          ? h(
              'div',
              { class: 'dg-h' },
              c.palOpts
                ? colorSelect({
                    value: c.color,
                    options: c.palOpts,
                    onChange: (v) => {
                      c.onColor(v);
                      ctx.changed();
                    },
                  })
                : null,
              c.onDash
                ? h(
                    'button',
                    {
                      type: 'button',
                      class: 'mini' + (c.dash ? ' on' : ''),
                      title: t('Trait en tirets'),
                      'aria-label': t('Trait en tirets'),
                      'aria-pressed': String(!!c.dash),
                      onclick: (e) => {
                        const on = !c.dash;
                        c.dash = on;
                        c.onDash(on);
                        e.currentTarget.classList.toggle('on', on);
                        e.currentTarget.setAttribute('aria-pressed', String(on));
                        ctx.changed();
                      },
                    },
                    ico('line-dashed'),
                  )
                : null,
              c.onGroup
                ? h('input', {
                    type: 'text',
                    class: 'dg-group',
                    value: c.group,
                    placeholder: t('Groupe'),
                    title: t('Groupe de colonnes : les colonnes voisines de même groupe sont réunies sous un en-tête commun'),
                    oninput: (e) => {
                      c.onGroup(e.target.value);
                      ctx.changed();
                    },
                  })
                : null,
              h('input', {
                type: 'text',
                value: c.name,
                placeholder: `${t('Série')} ${j}`,
                oninput: (e) => {
                  c.onRename(e.target.value);
                  ctx.changed();
                },
              }),
              c.onHide
                ? eyeBtn(c.hidden, () => {
                    c.onHide(!c.hidden);
                    rebuild();
                  })
                : null,
              c.onDelete
                ? h(
                    'button',
                    {
                      type: 'button',
                      class: 'mini danger',
                      title: t('Supprimer'),
                      onclick: () => {
                        c.onDelete();
                        rebuild();
                      },
                    },
                    ico('x'),
                  )
                : null,
            )
          : h('span', { textContent: c.name }),
      );
      if (c.hidden) th.classList.add('dg-off');
      return th;
    }),
    h('th', { class: 'dg-n' }),
  );
  table.append(h('thead', {}, head));
  const body = h('tbody');
  const cell = (i, j) => {
    const c = ad.cols[j],
      v = ad.get(i, j);
    const common = { 'data-r': i, 'data-c': j };
    if (c.isIcon)
      return h(
        'td',
        {},
        iconSelect({
          value: v || 'none',
          options: c.select,
          text: true,
          root: ad.root,
          icons: ctxIcons(ctx),
          refresh: () => ctx.restructure && ctx.restructure(),
          onChange: (nv) => {
            ad.set(i, j, nv);
            ctx.changed();
          },
        }),
      );
    if (c.isColor)
      return h(
        'td',
        {},
        colorSelect({
          value: v,
          options: c.select,
          text: true,
          onChange: (nv) => {
            ad.set(i, j, nv);
            ctx.changed();
          },
        }),
      );
    if (c.select) {
      const s = h(
        'select',
        {
          ...common,
          onchange: (e) => {
            ad.set(i, j, e.target.value);
            ctx.changed();
          },
        },
        Object.entries(c.select).map(([k, l]) => h('option', { value: k, textContent: l })),
      );
      s.value = v;
      return h('td', {}, s);
    }
    /* colonne `ml` : texte sur plusieurs lignes (Entrée = retour à la ligne), la cellule grandit avec son contenu */
    const mk = c.ml
      ? (p) => {
          const ta = h('textarea', { ...p, class: 'dg-ml', rows: 1, value: v });
          const fit = () => {
            ta.style.height = 'auto';
            ta.style.height = ta.scrollHeight + 'px';
          };
          ta.addEventListener('input', fit);
          requestAnimationFrame(fit);
          return ta;
        }
      : (p) => h('input', { ...p, type: 'text', inputMode: c.type === 'number' ? 'decimal' : 'text', value: v });
    const inp = mk({
      ...common,
      oninput: (e) => {
        ad.set(i, j, e.target.value);
        ctx.changed();
      },
      onkeydown: (e) => {
        const go = (di, dj) => {
          const n = table.querySelector(`[data-r="${i + di}"][data-c="${j + dj}"]`);
          if (n) {
            e.preventDefault();
            n.focus();
            n.select && n.select();
          }
        };
        if (c.ml) return; // cellule multiligne : Entrée et flèches restent dans le texte
        if (j === 0 && ad.levels && e.key === 'Tab' && !e.altKey && !e.ctrlKey && !e.metaKey) {
          /* nom d'une ligne : Tab descend d'un niveau, Maj+Tab remonte (aux bornes 1 et 4, le focus avance) */
          const l = ad.levels.get(i) + (e.shiftKey ? -1 : 1);
          if (l >= 0 && l <= ad.levels.max(i)) {
            e.preventDefault();
            setLevel(i, l);
          }
          return;
        }
        if (e.key === 'Enter' || e.key === 'ArrowDown') go(1, 0);
        else if (e.key === 'ArrowUp') go(-1, 0);
      },
      onpaste: (e) => {
        const txt = (e.clipboardData || window.clipboardData).getData('text/plain');
        if (!/[\t\n]/.test(txt.trim())) return;
        const m = parseMatrix(txt);
        if (!m) return;
        e.preventDefault();
        if (i === 0 && j === 0) {
          apply(m);
          return;
        }
        m.forEach((r, di) => {
          while (ad.rows() <= i + di) ad.addRow();
          r.forEach((val, dj) => {
            if (j + dj < ad.cols.length) ad.set(i + di, j + dj, val);
          });
        });
        rebuild();
      },
    });
    if (j === 0 && ad.levels) {
      /* niveau de la ligne : boutons de retrait, nom décalé dans le tableau */
      const out = h(
          'button',
          {
            type: 'button',
            class: 'mini dg-lvl-btn',
            title: t('Remonter d’un niveau (1 à 4)'),
            'aria-label': t('Remonter d’un niveau'),
            onclick: () => setLevel(i, ad.levels.get(i) - 1),
          },
          ico('indent-decrease'),
        ),
        inBtn = h(
          'button',
          {
            type: 'button',
            class: 'mini dg-lvl-btn',
            title: t('Descendre d’un niveau (1 à 4)'),
            'aria-label': t('Descendre d’un niveau'),
            onclick: () => setLevel(i, ad.levels.get(i) + 1),
          },
          ico('indent-increase'),
        );
      lvlUps[i] = () => {
        const l = ad.levels.get(i);
        inp.style.paddingLeft = 8 + l * 14 + 'px';
        inp.dataset.level = l;
        inp.title = `${t('Niveau')} ${l + 1}`;
        out.disabled = l <= 0;
        inBtn.disabled = l >= ad.levels.max(i);
      };
      lvlUps[i]();
      return h('td', {}, h('div', { class: 'dg-lvl' }, out, inBtn, inp));
    }
    return h('td', {}, inp);
  };
  /* niveau d'une ligne changé sur place (sans reconstruire le tableau : le focus reste) ; les lignes suivantes revoient leur maximum */
  const lvlUps = [];
  const setLevel = (i, l) => {
    if (l < 0 || l > ad.levels.max(i)) return;
    ad.levels.set(i, l);
    lvlUps.forEach((u) => u && u());
    ctx.changed();
  };
  for (let i = 0; i < ad.rows(); i++) {
    body.append(
      h(
        'tr',
        { class: ad.hide && ad.hide.get(i) ? 'dg-off' : '' },
        h('td', { class: 'dg-n', textContent: String(i + 1) }),
        ...ad.cols.map((_, j) => {
          const td = cell(i, j);
          if (ad.cols[j].hidden) td.classList.add('dg-off');
          return td;
        }),
        h(
          'td',
          { class: 'dg-n dg-acts' },
          ad.hide
            ? eyeBtn(ad.hide.get(i), () => {
                ad.hide.set(i, !ad.hide.get(i));
                rebuild();
              })
            : null,
          ad.rows() > 1
            ? h(
                'button',
                {
                  type: 'button',
                  class: 'mini danger',
                  title: t('Supprimer'),
                  onclick: () => {
                    ad.delRow(i);
                    rebuild();
                  },
                },
                ico('x'),
              )
            : null,
        ),
      ),
    );
  }
  table.append(body);
  const adds = h(
    'div',
    { class: 'row' },
    h(
      'button',
      {
        type: 'button',
        class: 'pp-btn',
        onclick: () => {
          ad.addRow();
          rebuild();
        },
      },
      ico('plus'),
      h('span', { textContent: t('+ Ligne') }),
    ),
    ad.addCol
      ? h(
          'button',
          {
            type: 'button',
            class: 'pp-btn',
            onclick: () => {
              ad.addCol();
              rebuild();
            },
          },
          ico('plus'),
          h('span', { textContent: ad.colLabel }),
        )
      : null,
    ad.transpose
      ? h(
          'button',
          {
            type: 'button',
            class: 'pp-btn',
            title: t('Les lignes deviennent des colonnes et inversement'),
            onclick: async () => {
              const why = ad.transpose.blocked();
              if (why) return alertBox(why);
              if (
                ad.transpose.lossy() &&
                !(await confirmBox(t('Inverser fait perdre les niveaux, types de ligne et groupes de colonnes. Continuer ?'), {
                  ok: t('Inverser'),
                }))
              )
                return;
              ad.transpose.run();
              rebuild();
            },
          },
          ico('arrows-exchange'),
          h('span', { textContent: t('Inverser lignes et colonnes') }),
        )
      : null,
    ad.hide && (ad.hide.count().rows || ad.hide.count().cols)
      ? h(
          'button',
          {
            type: 'button',
            class: 'pp-btn',
            onclick: () => {
              ad.hide.showAll();
              rebuild();
            },
          },
          ico('eye'),
          h('span', { textContent: `${t('Tout réafficher')} (${hiddenText(ad.hide.count())})` }),
        )
      : null,
  );

  const pasteBtn = h('button', {
    type: 'button',
    class: 'pp-btn',
    textContent: t('Remplacer les données'),
    onclick: () => {
      const m = parseMatrix(ta.value);
      if (m) apply(m);
    },
  });
  return h(
    'div',
    { class: 'dg-wrap' },
    drop,
    h('details', {}, h('summary', { textContent: t('Coller un tableau') }), h('div', { class: 'body' }, ta, pasteBtn)),
    h('div', { class: 'dg-scroll' }, table),
    adds,
    tools,
  );
}
