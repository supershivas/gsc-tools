/* Import d'une palette dans les couleurs du document : depuis une image, un fichier de palette (.ase, .gpl, .json, .css, .txt)
   ou un autre document (.json). Chaque source donne une liste de couleurs { hex, name, cmyk? } ; on coche celles à ajouter. */
import { h, ico } from './render.js';
import { t } from './i18n.js';
import { MAX_EXTRA_COLORS, paletteOf, colorLabel } from './tokens.js';
import { migrate, addColor, extraColorKeys } from './state.js';
import { paletteCmyk, rgb2cmyk } from './cmyk.js';
import { alertBox } from './dialogs.js';

const hex2 = (n) =>
  Math.round(Math.max(0, Math.min(255, n)))
    .toString(16)
    .padStart(2, '0');
const toHex = (r, g, b) => '#' + hex2(r) + hex2(g) + hex2(b);
function normHex(s) {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(s).trim());
  if (!m) return null;
  const v = m[1].length === 3 ? [...m[1]].map((c) => c + c).join('') : m[1];
  return '#' + v.toLowerCase();
}
const hexRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

/* ---------- Sources ---------- */

/** Image → couleurs dominantes (cases de 16 niveaux par canal, les plus fréquentes, assez distinctes entre elles) */
export async function fromImage(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((ok, ko) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = ko;
      i.src = url;
    });
    const k = 96 / Math.max(img.naturalWidth || 96, img.naturalHeight || 96, 1),
      w = Math.max(1, Math.round((img.naturalWidth || 96) * Math.min(1, k))),
      hh = Math.max(1, Math.round((img.naturalHeight || 96) * Math.min(1, k)));
    const cv = h('canvas', { width: w, height: hh }),
      cx = cv.getContext('2d', { willReadFrequently: true });
    cx.drawImage(img, 0, 0, w, hh);
    const px = cx.getImageData(0, 0, w, hh).data,
      bins = new Map();
    for (let i = 0; i < px.length; i += 4) {
      if (px[i + 3] < 128) continue;
      const key = (px[i] >> 4) * 256 + (px[i + 1] >> 4) * 16 + (px[i + 2] >> 4),
        b = bins.get(key) || { n: 0, r: 0, g: 0, b: 0 };
      b.n++;
      b.r += px[i];
      b.g += px[i + 1];
      b.b += px[i + 2];
      bins.set(key, b);
    }
    const out = [];
    for (const b of [...bins.values()].sort((a, c) => c.n - a.n)) {
      const c = [b.r / b.n, b.g / b.n, b.b / b.n];
      if (out.some((o) => Math.hypot(o.rgb[0] - c[0], o.rgb[1] - c[1], o.rgb[2] - c[2]) < 48)) continue;
      out.push({ rgb: c, hex: toHex(...c) });
      if (out.length === 8) break;
    }
    if (!out.length) throw new Error('empty');
    return out.map((o) => ({ hex: o.hex, name: o.hex.toUpperCase() }));
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Adobe Swatch Exchange (.ase) : blocs 0x0001 = couleur (nom UTF-16, modèle RGB/CMYK/LAB/Gray, valeurs flottantes) */
export function parseAse(buf) {
  const v = new DataView(buf);
  if (buf.byteLength < 12 || v.getUint32(0) !== 0x41534546) throw new Error('ase');
  const out = [];
  let p = 12;
  for (let n = v.getUint32(8); n > 0 && p + 6 <= buf.byteLength; n--) {
    const type = v.getUint16(p),
      len = v.getUint32(p + 2),
      end = p + 6 + len;
    if (type === 0x0001) {
      let q = p + 6;
      const nl = v.getUint16(q);
      q += 2;
      let name = '';
      for (let i = 0; i < nl - 1; i++) name += String.fromCharCode(v.getUint16(q + i * 2));
      q += nl * 2;
      const model = String.fromCharCode(...[0, 1, 2, 3].map((i) => v.getUint8(q + i))).trim();
      q += 4;
      const f = (i) => v.getFloat32(q + i * 4);
      let rgb = null,
        cmyk = null;
      if (model === 'RGB') rgb = [f(0) * 255, f(1) * 255, f(2) * 255];
      else if (model === 'CMYK') {
        cmyk = [f(0) * 100, f(1) * 100, f(2) * 100, f(3) * 100];
        const k = 1 - cmyk[3] / 100;
        rgb = cmyk.slice(0, 3).map((x) => 255 * (1 - x / 100) * k);
      } else if (model === 'Gray') rgb = [f(0) * 255, f(0) * 255, f(0) * 255];
      else if (model === 'LAB') rgb = labRgb(f(0) * 100, f(1), f(2));
      if (rgb) out.push({ hex: toHex(...rgb), name: name.trim(), cmyk });
    }
    p = end;
  }
  if (!out.length) throw new Error('ase');
  return out;
}
function labRgb(L, a, b) {
  const fy = (L + 16) / 116,
    fx = fy + a / 500,
    fz = fy - b / 200,
    inv = (x) => (x ** 3 > 0.008856 ? x ** 3 : (x - 16 / 116) / 7.787);
  const X = 0.95047 * inv(fx),
    Y = inv(fy),
    Z = 1.08883 * inv(fz);
  const lin = [3.2406 * X - 1.5372 * Y - 0.4986 * Z, -0.9689 * X + 1.8758 * Y + 0.0415 * Z, 0.0557 * X - 0.204 * Y + 1.057 * Z];
  return lin.map((c) => 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.max(0, c) ** (1 / 2.4) - 0.055));
}

/** Texte : palette GIMP (.gpl : « R G B nom »), ou tout texte contenant des codes #hex, rgb() ou cmyk() (CSS, tokens, liste collée) */
export function parseText(txt) {
  const out = [];
  if (/^GIMP Palette/i.test(txt)) {
    for (const l of txt.split(/\r?\n/)) {
      const m = /^\s*(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})\s*(.*)$/.exec(l);
      if (m) out.push({ hex: toHex(+m[1], +m[2], +m[3]), name: m[4].trim() });
    }
  } else {
    const re =
      /(?:"?([\w .-]{1,40})"?\s*[:=]\s*)?(?:#([0-9a-f]{6}|[0-9a-f]{3})\b|rgba?\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})[^)]*\)|cmyk\(\s*(\d+(?:\.\d+)?)%?[\s,]+(\d+(?:\.\d+)?)%?[\s,]+(\d+(?:\.\d+)?)%?[\s,]+(\d+(?:\.\d+)?)%?\s*\))/gi;
    for (const m of txt.matchAll(re)) {
      const name = (m[1] || '').trim();
      if (m[2]) out.push({ hex: normHex(m[2]), name });
      else if (m[3]) out.push({ hex: toHex(+m[3], +m[4], +m[5]), name });
      else {
        const c = [m[6], m[7], m[8], m[9]].map(Number),
          k = 1 - c[3] / 100;
        out.push({ hex: toHex(...c.slice(0, 3).map((x) => 255 * (1 - x / 100) * k)), name, cmyk: c });
      }
    }
  }
  if (!out.length) throw new Error('text');
  return out;
}

/** Document Factsheet (.json) → les couleurs de sa palette, avec leurs noms et valeurs CMJN */
export function fromDocument(json) {
  if (!json || !Array.isArray(json.sections)) throw new Error('doc');
  const d = migrate(json),
    pal = paletteOf(d.theme, d.colors),
    cm = paletteCmyk(d);
  return Object.keys(pal).map((k) => ({ hex: pal[k].toLowerCase(), name: t(colorLabel(d, k)), cmyk: cm[k] }));
}

export async function fromFile(file) {
  if (/\.ase$/i.test(file.name)) return parseAse(await file.arrayBuffer());
  const txt = await file.text();
  if (/\.json$/i.test(file.name)) {
    try {
      const j = JSON.parse(txt);
      if (Array.isArray(j.sections)) return fromDocument(j);
    } catch (e) {
      /* pas un document : on cherche les couleurs dans le texte */
    }
  }
  return parseText(txt);
}

/* ---------- Fenêtre ---------- */

/** Ajoute au document les couleurs choisies (hors doublons) ; retourne le nombre ajouté */
export function addColors(doc, list) {
  let n = 0;
  for (const c of list) {
    if (extraColorKeys(doc).length >= MAX_EXTRA_COLORS) break;
    const k = addColor(doc, c.hex);
    if (c.name) doc.colorNames[k] = c.name;
    const cm = c.cmyk || rgb2cmyk(hexRgb(c.hex));
    (doc.cmyk || (doc.cmyk = {}))[k] = cm.map((x) => Math.round(x));
    n++;
  }
  return n;
}

/** Ouvre la fenêtre d'import ; `done` est appelé après l'ajout de couleurs (redessin de la palette) */
export function openPaletteImport(ctx, done) {
  const doc = ctx.getDoc(),
    have = new Set(Object.values(paletteOf(doc.theme, doc.colors)).map((x) => x.toLowerCase())),
    room = () => MAX_EXTRA_COLORS - extraColorKeys(doc).length;
  const dlg = h('dialog', { class: 'modal pimp', 'aria-label': t('Importer une palette') });
  const close = () => dlg.close();
  dlg.addEventListener('close', () => dlg.remove());
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg) close();
  });

  const source = () => {
    const pick = (accept, load, icon, label, hint) => {
      const inp = h('input', { type: 'file', accept, hidden: true });
      inp.addEventListener('change', async () => {
        const f = inp.files[0];
        inp.value = '';
        if (!f) return;
        try {
          choose(await load(f));
        } catch (e) {
          alertBox(t('Aucune couleur trouvée dans ce fichier.'));
        }
      });
      return h(
        'div',
        {},
        h(
          'button',
          { type: 'button', class: 'pimp-src', onclick: () => inp.click() },
          ico(icon),
          h('span', {}, h('b', { textContent: t(label) }), h('small', { textContent: t(hint) })),
        ),
        inp,
      );
    };
    show(
      h('p', { class: 'pimp-lead', textContent: t('Choisissez d’où viennent les couleurs. Vous pourrez cocher celles à garder.') }),
      pick('image/*,.svg', fromImage, 'photo', 'Depuis une image', 'Logo, photo, capture : couleurs dominantes'),
      pick(
        '.ase,.gpl,.json,.css,.txt',
        fromFile,
        'file-import',
        'Depuis un fichier de palette',
        '.ase (Adobe), .gpl (GIMP), .json, .css, .txt',
      ),
      pick(
        '.json,application/json',
        async (f) => fromDocument(JSON.parse(await f.text())),
        'files',
        'Depuis un autre document',
        'Un projet Factsheet (.json) : noms et CMJN repris',
      ),
      h('div', { class: 'modal-actions' }, h('button', { type: 'button', class: 'btn', textContent: t('Annuler'), onclick: close })),
    );
  };

  const choose = (all) => {
    const seen = new Set(),
      list = all.filter((c) => c.hex && !have.has(c.hex) && !seen.has(c.hex) && seen.add(c.hex));
    if (!list.length) return alertBox(t('Ces couleurs sont déjà dans le document.'));
    const left = room();
    if (left <= 0) return alertBox(t('Le document a déjà le nombre maximal de couleurs ajoutées.'));
    const on = new Set(list.slice(0, left).map((_, i) => i)),
      go = h('button', { type: 'submit', class: 'btn primary' });
    const rows = list.map((c, i) => {
      const cb = h('input', { type: 'checkbox', checked: on.has(i), 'aria-label': c.name || c.hex });
      cb.addEventListener('change', () => {
        if (cb.checked) on.add(i);
        else on.delete(i);
        sync();
      });
      return h(
        'div',
        { class: 'pimp-row' },
        cb,
        h('i', { class: 'pimp-sw', style: { background: c.hex } }),
        h(
          'span',
          { class: 'pimp-name' },
          h('input', {
            type: 'text',
            value: c.name || c.hex.toUpperCase(),
            'aria-label': t('Nom de la couleur'),
            oninput: (e) => (c.name = e.target.value.trim()),
          }),
        ),
        h('span', { class: 'pal2-hex', textContent: c.cmyk ? c.cmyk.map((x) => Math.round(x)).join('·') : c.hex.toUpperCase() }),
      );
    });
    const sync = () => {
      go.textContent = `${t('Ajouter')} ${on.size}`;
      go.disabled = !on.size;
      rows.forEach((r, i) => {
        const cb = r.querySelector('input');
        cb.disabled = !on.has(i) && on.size >= left;
      });
    };
    const form = h(
      'form',
      {
        class: 'pimp-pick',
        onsubmit: (e) => {
          e.preventDefault();
          const n = addColors(
            doc,
            list.filter((_, i) => on.has(i)),
          );
          if (n) ctx.changed();
          close();
          done();
        },
      },
      h('p', {
        class: 'pimp-lead',
        textContent: `${list.length} ${t('couleur(s) trouvée(s)')} — ${t('place restante')} : ${left}`,
      }),
      h('div', { class: 'pimp-list' }, rows),
      h('div', { class: 'modal-actions' }, h('button', { type: 'button', class: 'btn', textContent: t('Retour'), onclick: source }), go),
    );
    sync();
    show(form);
  };

  const show = (...kids) =>
    dlg.replaceChildren(
      h('div', { class: 'pimp-head' }, h('h2', { textContent: t('Importer une palette') })),
      h('div', { class: 'pimp-body' }, ...kids),
    );
  source();
  document.body.append(dlg);
  dlg.showModal();
}
