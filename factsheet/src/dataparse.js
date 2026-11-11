/* Lecture des données collées ou importées (sans interface, testée par tests/dataimport.spec.js) :
   - `num` : un texte → nombre, selon le séparateur décimal du document (milliers, espaces insécables, €, %, signes typographiques) ;
   - `parseMatrix` / `fileToMatrix` : texte → matrice de cellules (TSV d'Excel/Sheets, CSV, JSON), cellules entre guillemets sur plusieurs lignes ;
   - `headerRows`, `autoRoles`, `readImport` : lignes d'en-tête, rôle des colonnes (libellé / donnée / ignorer) et matrice prête pour `load` des adaptateurs.
   Règle d'ambiguïté : un seul séparateur suivi d'exactement 3 chiffres, et ce séparateur est celui des milliers du document → milliers
   (« 1,025 » = 1025 en en-GB, « 1.025 » = 1025 en fr) ; sinon c'est le séparateur décimal. */

/** Séparateur décimal d'une locale : ',' (fr, de, nl, es, it) ou '.' (en) */
export function decimalOf(locale) {
  try {
    const p = new Intl.NumberFormat(locale || 'en-GB').formatToParts(1.5).find((x) => x.type === 'decimal');
    return p && p.value === ',' ? ',' : '.';
  } catch (e) {
    return '.';
  }
}

const SPACES = /[\s     '’]/g; // espaces (dont insécables et fines) et apostrophe suisse : séparateurs de milliers
const DASHES = /[−‒–—﹣－]/g; // −, ‒, –, —… : signe moins
const SYMBOLS = /[€$£¥%‰]/g;

/** Groupes de milliers valides : 1 à 3 chiffres puis des groupes de 3 */
const grouped = (s, g) => new RegExp(`^\\d{1,3}(\\${g}\\d{3})+$`).test(s);

/** Texte → nombre, ou null s'il n'en est pas un. `dec` = séparateur décimal du document ('.' ou ','). Un nombre passe tel quel. */
export function num(c, dec = '.') {
  if (typeof c === 'number') return Number.isFinite(c) ? c : null;
  let s = String(c ?? '')
    .replace(DASHES, '-')
    .replace(SYMBOLS, '')
    .replace(SPACES, '')
    .trim();
  if (!s) return null;
  let neg = false;
  const par = /^\((.*)\)$/.exec(s); // comptabilité : (12,5) = −12,5
  if (par) {
    neg = true;
    s = par[1];
  }
  if (s[0] === '+') s = s.slice(1);
  else if (s[0] === '-') {
    neg = !neg;
    s = s.slice(1);
  }
  s = s.replace(/(\d)[a-z]{1,3}\.?$/i, '$1'); // unité collée au nombre : 12bn, 3M, 4Mio
  const m = /^(\d[\d.,]*|[.,]\d+)(e[+-]?\d+)?$/i.exec(s);
  if (!m) return null;
  let body = m[1];
  const exp = m[2] || '',
    grp = dec === ',' ? '.' : ',';
  const hasDot = body.includes('.'),
    hasComma = body.includes(',');
  let out;
  if (hasDot && hasComma) {
    /* les deux : le dernier est le séparateur décimal (1.025,5 ou 1,025.5) */
    const last = Math.max(body.lastIndexOf('.'), body.lastIndexOf(',')),
      d = body[last],
      g = d === '.' ? ',' : '.',
      int = body.slice(0, last),
      frac = body.slice(last + 1);
    if (int.includes(d) || /[.,]/.test(frac) || !grouped(int, g)) return null;
    out = int.split(g).join('') + '.' + frac;
  } else if (hasDot || hasComma) {
    const sep = hasDot ? '.' : ',',
      parts = body.split(sep);
    if (parts.length > 2) {
      if (!grouped(body, sep)) return null; // 1,234,567 : milliers seulement
      out = parts.join('');
    } else if (sep === grp && /^[1-9]\d{0,2}$/.test(parts[0]) && /^\d{3}$/.test(parts[1]))
      out = parts.join(''); // 1,025 en en-GB
    else out = (parts[0] || '0') + '.' + parts[1];
  } else out = body;
  const n = parseFloat(out + exp);
  if (!Number.isFinite(n)) return null;
  return neg ? -n : n;
}

/** Texte → matrice. Séparateur : tabulation (Excel, Sheets), sinon « ; », sinon « , ». Une cellule entre guillemets peut contenir
    le séparateur, des retours à la ligne (Alt+Entrée dans Excel) et des guillemets doublés. Les lignes entièrement vides sont retirées. */
export function parseMatrix(text) {
  const src = String(text || '')
    .replace(/\r\n?/g, '\n')
    .replace(/^﻿/, '');
  const first = src.split('\n').find((l) => l.trim()) || '';
  if (!first) return null;
  const sep = first.includes('\t') ? '\t' : first.includes(';') ? ';' : ',';
  const read = (quotes) => {
    const rows = [];
    let row = [],
      cur = '',
      i = 0;
    const end = () => {
      row.push(cur.trim());
      cur = '';
    };
    while (i < src.length) {
      const ch = src[i];
      if (quotes && ch === '"' && !cur.trim()) {
        /* cellule entre guillemets : jusqu'au guillemet fermant (« "" » = un guillemet) */
        let j = i + 1,
          val = '',
          closed = false;
        while (j < src.length) {
          if (src[j] === '"') {
            if (src[j + 1] === '"') {
              val += '"';
              j += 2;
              continue;
            }
            closed = true;
            j++;
            break;
          }
          val += src[j++];
        }
        if (!closed) return null; // guillemet jamais fermé : relu sans guillemets
        cur = val;
        while (j < src.length && src[j] !== sep && src[j] !== '\n') cur += src[j++];
        i = j;
        continue;
      }
      if (ch === sep) end();
      else if (ch === '\n') {
        end();
        rows.push(row);
        row = [];
      } else cur += ch;
      i++;
    }
    end();
    rows.push(row);
    return rows;
  };
  const rows = (read(true) || read(false)).filter((r) => r.some((c) => c !== ''));
  return rows.length ? rows : null;
}

/** Texte d'un fichier importé → matrice (CSV, TSV ou JSON : tableau de lignes ou d'objets) */
export function fileToMatrix(name, text) {
  if (/\.json$/i.test(name) || /^\s*[\[{]/.test(text)) {
    let j = JSON.parse(text);
    if (!Array.isArray(j)) j = Object.values(j).find(Array.isArray) || [];
    if (j.length && !Array.isArray(j[0])) {
      const keys = [...new Set(j.flatMap((o) => Object.keys(o)))];
      return [keys, ...j.map((o) => keys.map((k) => String(o[k] ?? '')))];
    }
    return j.map((r) => r.map((c) => String(c ?? '')));
  }
  return parseMatrix(text);
}

/** Matrice rectangulaire (cellules manquantes = '') */
export const padMatrix = (m) => {
  const w = Math.max(0, ...m.map((r) => r.length));
  return m.map((r) => Array.from({ length: w }, (_, j) => String(r[j] ?? '').trim()));
};

const isYear = (c) => /^(19|20)\d\d$/.test(String(c).trim());

/** Colonnes numériques : la plupart des cellules remplies, après les deux premières lignes, sont des nombres */
export function numericColumns(m, dec) {
  const body = m.length > 3 ? m.slice(2) : m.slice(1).length ? m.slice(1) : m,
    w = m[0] ? m[0].length : 0,
    out = [];
  for (let j = 0; j < w; j++) {
    const filled = body.map((r) => r[j]).filter((c) => c !== '' && c !== undefined);
    if (filled.length && filled.filter((c) => num(c, dec) !== null).length >= filled.length / 2) out.push(j);
  }
  return out;
}

/** Une ligne du haut est-elle un en-tête ? `cols` = colonnes numériques ; `next` = ligne suivante */
function headerLike(row, cols, dec, next) {
  const cells = cols.map((j) => row[j] ?? '');
  const filled = cells.filter((c) => c !== '');
  if (!filled.length) return true; // titre ou unité seule (« values (€ bn) »)
  if (filled.some((c) => num(c, dec) === null)) return true; // texte dans une colonne de nombres
  const vals = cells.map((c) => (c === '' ? 0 : num(c, dec))),
    nz = vals.map((v, i) => (v ? i : -1)).filter((i) => i >= 0);
  const nextNums = next ? cols.filter((j) => next[j] !== '' && num(next[j], dec) !== null).length : 0;
  /* seule la dernière cellule est un nombre (une année, un rang…), les autres vides ou à 0 : en-tête, si la ligne suivante a des données */
  if (cols.length > 1 && nz.length === 1 && nz[0] === cols.length - 1 && nextNums >= 2) return true;
  /* années seules (2021 2022 2023) au-dessus de valeurs qui n'en sont pas */
  if (filled.every(isYear) && next && cols.some((j) => next[j] !== '' && !isYear(next[j]) && num(next[j], dec) !== null)) return true;
  return false;
}

/** Nombre de lignes d'en-tête détectées (0, 1 ou 2). `names` : noms de colonnes attendus (adaptateur d'enregistrements). */
export function headerRows(m, dec, names = []) {
  if (!m || m.length < 2) return 0;
  const lower = names.map((n) => String(n).toLowerCase());
  if (lower.length && m[0].some((c) => c && lower.includes(String(c).toLowerCase()))) return 1;
  let cols = numericColumns(m, dec);
  if (!cols.length) return 0;
  if (cols[0] === 0 && cols.length > 1) cols = cols.slice(1); // la 1re colonne reste celle des libellés
  let n = 0;
  while (n < 2 && n < m.length - 1 && headerLike(m[n], cols, dec, m[n + 1])) n++;
  return n;
}

/** Rôles proposés : 1re colonne = libellé (tableau à séries), colonnes de nombres = données, texte = ignorer.
    Une colonne d'écarts en % (« % » dans l'en-tête ou les cellules) est ignorée quand les autres colonnes de données n'en sont pas. */
export function autoRoles(m, head, dec, table = true) {
  const w = m[0] ? m[0].length : 0,
    body = m.slice(head),
    cols = numericColumns([...m.slice(0, head), ...body], dec);
  const roles = Array.from({ length: w }, (_, j) => (table && j === 0 ? 'label' : cols.includes(j) || !table ? 'data' : 'skip'));
  if (!table) return roles;
  const isPct = (j) =>
    m.slice(0, head).some((r) => /%|pourcent|percent/i.test(r[j] || '')) ||
    (body.some((r) => /%\s*$/.test(r[j] || '')) && body.every((r) => !r[j] || /%\s*$/.test(r[j])));
  const data = roles.map((r, j) => (r === 'data' ? j : -1)).filter((j) => j >= 0),
    pct = data.filter(isPct);
  if (pct.length && pct.length < data.length) pct.forEach((j) => (roles[j] = 'skip'));
  return roles;
}

/** Lecture finale : en-têtes (lignes jointes), rôles, nombres interprétés.
    Rend { matrix (pour `load`, 1re ligne = en-tête si head > 0), names, groups (groupes des colonnes de données, ou null), cells: [{ raw, v, bad }][], bad (nombre de cellules non lues), dataCols }.
    `table` : tableau à séries (une colonne de libellés, les autres en données) ; sinon enregistrements (colonnes gardées dans l'ordre). */
export function readImport(m0, { head = 0, roles, dec = '.', table = true } = {}) {
  const m = padMatrix(m0),
    w = m[0] ? m[0].length : 0;
  roles = roles || autoRoles(m, head, dec, table);
  const names = Array.from({ length: w }, (_, j) =>
    m
      .slice(0, head)
      .map((r) => r[j])
      .filter(Boolean)
      .join(' '),
  );
  const labels = roles.map((r, j) => (r === 'label' ? j : -1)).filter((j) => j >= 0),
    data = roles.map((r, j) => (r === 'data' ? j : -1)).filter((j) => j >= 0);
  const numCols = table ? data : numericColumns(m, dec).filter((j) => data.includes(j));
  /* colonnes groupées (tableau à séries) : 2 lignes d'en-tête ou plus, la 1re couvre plusieurs colonnes (cellule fusionnée d'Excel :
     nom puis cellules vides) et la dernière nomme la plupart des colonnes → la 1re donne les groupes, les suivantes les noms */
  let groups = null;
  if (table && head >= 2 && data.length > 1) {
    const top = m[0],
      low = m[head - 1];
    const spans = data.some((j, k) => k > 0 && !top[j] && data.slice(0, k).some((q) => top[q])),
      named = data.filter((j) => low[j]).length >= data.length / 2;
    if (spans && named) {
      let cur = '';
      groups = data.map((j) => (cur = top[j] || cur));
      data.forEach((j) => {
        names[j] = m
          .slice(1, head)
          .map((r) => r[j])
          .filter(Boolean)
          .join(' ');
      });
    }
  }
  let bad = 0;
  const cells = m.slice(head).map((r) =>
    r.map((raw, j) => {
      if (!numCols.includes(j) || raw === '') return { raw, v: null, bad: false };
      const v = num(raw, dec);
      if (v === null) bad++;
      return { raw, v, bad: v === null };
    }),
  );
  const rows = cells
    .map((r) =>
      table
        ? [
            labels
              .map((j) => r[j].raw)
              .filter(Boolean)
              .join(' – '),
            ...data.map((j) => (r[j].v === null ? '' : r[j].v)),
          ]
        : data.map((j) => (numCols.includes(j) ? (r[j].v === null ? '' : r[j].v) : r[j].raw)),
    )
    .filter((r) => r.some((c) => c !== ''));
  const top = table
    ? [
        labels
          .map((j) => names[j])
          .filter(Boolean)
          .join(' – '),
        ...data.map((j) => names[j]),
      ]
    : data.map((j) => names[j]);
  return { matrix: head ? [top, ...rows] : rows, names, groups, cells, bad, roles, dataCols: data };
}
