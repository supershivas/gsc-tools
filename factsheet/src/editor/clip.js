/* Copier-coller de structure : une section, une sous-section ou une colonne, copiée d'un onglet et collée dans un autre (ou le même).
   Format du clip (texte JSON, jamais de HTML) : { app: 'factsheet-creator', schemaVersion, clip: 'section' | 'sub' | 'col', data, source }
   `data` = l'élément ; `source` = { locale, theme, colors, colorNames, cmyk, icons } : de quoi traduire l'élément dans le document
   d'arrivée (couleurs ajoutées, icônes importées utilisées, format des nombres). Rien d'autre du document source ne voyage.

   Partie pure (testée par FSTEST.clip) : `makeClip` (document + chemin → clip), `readClip` (texte ou objet → élément validé, passé
   par `migrate` sur un mini-document), `adoptClip` (élément → document cible : identifiants neufs, couleurs, icônes, nombres),
   `placeClip` (insertion). Partie interface (`createClip`) : raccourcis (événements copy / paste), boutons et menu, presse-papiers
   système avec repli en mémoire de la page. Aucun document gardé ici : `ctx.getDoc()` à chaque appel. */
import {
  migrate,
  uid,
  safeImgSrc,
  addColor,
  canAddColor,
  placeCol,
  isFreeCol,
  MAX_COLS,
  refreshAutoCards,
  LOCALES,
  COL_TYPES,
} from '../state.js';
import { paletteOf, THEMES, DEFAULT_THEME, colorLabel } from '../tokens.js';
import { convertDocNumbers } from '../table/tabular.js';
import { cleanSvgTree } from '../viz/picto.js';
import { columnWidth } from '../render.js';
import { alertBox, chooseBox } from '../dialogs.js';
import { t } from '../i18n.js';

export const CLIP_APP = 'factsheet-creator';
export const CLIP_SCHEMA = 1;
export const CLIP_KINDS = ['section', 'sub', 'col'];
/** Au-delà (octets du texte JSON), la copie prévient : images incorporées en data URL */
export const CLIP_HEAVY = 1_000_000;

const clone = (o) => JSON.parse(JSON.stringify(o));
const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const HEX = /^#[0-9a-f]{6}$/i;
const KEY = /^[a-z][\w-]*$/i;
/** Propriétés qui portent une clé de couleur (fonds, contours, texte, séries, barres, tableaux) ; `colors` = tableau de clés par point */
const COLOR_PROP = /(colou?rs?\d*|fill|fg|bg|stripe|barRest)$/i;
/** Couleurs choisies dans un texte riche : {c:clé|…} et {h:clé|…} */
const INLINE_COLOR = /\{([ch]):([a-z][\w-]*)\|/gi;

/** Parcourt toutes les chaînes d'un arbre : fn(valeur, nom de la propriété) → nouvelle valeur */
function mapStrings(o, fn, key = '') {
  if (Array.isArray(o)) o.forEach((v, i) => (typeof v === 'string' ? (o[i] = fn(v, key)) : mapStrings(v, fn, key)));
  else if (isObj(o))
    for (const k of Object.keys(o)) {
      if (typeof o[k] === 'string') o[k] = fn(o[k], k);
      else mapStrings(o[k], fn, k);
    }
}
/** Clés de couleur utilisées par un élément (avec ou sans « tint- ») */
export function colorKeysOf(item) {
  const out = new Set();
  const add = (k) => out.add(k.replace(/^tint-/, ''));
  mapStrings(item, (v, k) => {
    if (COLOR_PROP.test(k) && KEY.test(v)) add(v);
    for (const m of v.matchAll(INLINE_COLOR)) add(m[2]);
    return v;
  });
  return out;
}
/** Remplace des clés de couleur (`map` : clé → clé ; la teinte suit) partout dans l'élément, en un seul passage (une clé déjà remplacée
    n'est jamais remplacée une seconde fois). `remapColors` (state.js) ne suffit pas ici : il ignore les couleurs des chiffres clés
    (barColor…), certaines séries (color2, markColor) et les couleurs du texte riche. */
export function remapItemColors(item, map) {
  const one = (v) => {
    const tint = v.startsWith('tint-'),
      k = tint ? v.slice(5) : v;
    return map[k] ? (tint ? 'tint-' + map[k] : map[k]) : v;
  };
  mapStrings(item, (v, k) => {
    if (COLOR_PROP.test(k) && KEY.test(v)) return one(v);
    return v.includes('{') ? v.replace(INLINE_COLOR, (all, f, key) => `{${f}:${one(key)}|`) : v;
  });
  return item;
}
/** Icônes importées utilisées (`custom:<id>`) */
export function iconRefsOf(item) {
  const out = new Set();
  mapStrings(item, (v) => {
    if (/^custom:[\w-]+$/.test(v)) out.add(v.slice(7));
    return v;
  });
  return out;
}
/** Nouveaux identifiants partout (sections, sous-sections, lignes, colonnes et cellules de tableau…) : même préfixe, valeur neuve */
export function renewIds(item) {
  const walk = (o) => {
    if (Array.isArray(o)) o.forEach(walk);
    else if (isObj(o))
      for (const k of Object.keys(o)) {
        if (k === 'id' && typeof o[k] === 'string') o[k] = uid((/^[a-z]+/i.exec(o[k]) || ['x'])[0].slice(0, 4));
        else walk(o[k]);
      }
  };
  walk(item);
  return item;
}

/* ---------- Copie ---------- */
/** Élément désigné par un chemin de sélection (`sec:i`, `sub:i:j`, `col:i:j:k`) : { kind, item } ou null */
export function itemAt(doc, path) {
  const q = String(path || '').split(':'),
    sec = doc.sections[+q[1]],
    sub = sec && sec.subs[+q[2]];
  if (q[0] === 'sec' && sec) return { kind: 'section', item: sec };
  if (q[0] === 'sub' && sub) return { kind: 'sub', item: sub };
  if (q[0] === 'col' && sub && sub.cols[+q[3]]) return { kind: 'col', item: sub.cols[+q[3]] };
  return null;
}
/** Clip de l'élément au chemin `path` du document : seules les couleurs, noms, CMJN et icônes qu'il utilise l'accompagnent */
export function makeClip(doc, path) {
  const at = itemAt(doc, path);
  if (!at) return null;
  const data = clone(at.item),
    pal = paletteOf(doc.theme, doc.colors),
    used = colorKeysOf(data),
    pick = (o) => Object.fromEntries(Object.entries(o || {}).filter(([k]) => used.has(k))),
    refs = iconRefsOf(data);
  return {
    app: CLIP_APP,
    schemaVersion: CLIP_SCHEMA,
    clip: at.kind,
    data,
    source: {
      locale: doc.locale || 'en-GB',
      theme: doc.theme || DEFAULT_THEME,
      colors: pick(pal),
      colorNames: Object.fromEntries([...used].filter((k) => pal[k]).map((k) => [k, colorLabel(doc, k)])),
      cmyk: pick(doc.cmyk),
      icons: (doc.customIcons || []).filter((c) => c && refs.has(c.id)),
    },
  };
}

/* ---------- Lecture d'un clip (texte du presse-papiers ou objet) ---------- */
/** Élément validé : { kind, item, source } — ou { error } (clé française, à passer par t()) quand le texte n'est pas un clip valable.
    La forme de l'élément est vérifiée, puis il passe par `migrate` (tableaux réparés, images filtrées par safeImgSrc, anciens formats). */
export function readClip(input) {
  let j = input;
  if (typeof input === 'string') {
    const s = input.trim();
    if (!s.startsWith('{')) return { error: 'foreign' };
    try {
      j = JSON.parse(s);
    } catch (e) {
      return { error: 'foreign' };
    }
  }
  if (!isObj(j) || j.app !== CLIP_APP) return { error: 'foreign' };
  if (!CLIP_KINDS.includes(j.clip) || !isObj(j.data)) return { error: 'malformed' };
  if (!(Number.isInteger(j.schemaVersion) && j.schemaVersion >= 1)) return { error: 'malformed' };
  if (j.schemaVersion > CLIP_SCHEMA) return { error: 'newer' };
  const d = j.data;
  const colOk = (c) => isObj(c) && (c.type === undefined || COL_TYPES[c.type]);
  const subOk = (b) => isObj(b) && Array.isArray(b.cols) && b.cols.length > 0 && b.cols.length <= 6 && b.cols.every(colOk);
  const ok = j.clip === 'col' ? colOk(d) : j.clip === 'sub' ? subOk(d) : Array.isArray(d.subs) && d.subs.every(subOk);
  if (!ok) return { error: 'malformed' };
  const src = isObj(j.source) ? j.source : {};
  /* palette de la source : couleurs en hexadécimal seulement */
  const colors = Object.fromEntries(Object.entries(isObj(src.colors) ? src.colors : {}).filter(([k, v]) => KEY.test(k) && HEX.test(v)));
  const names = Object.fromEntries(
    Object.entries(isObj(src.colorNames) ? src.colorNames : {})
      .filter(([k, v]) => colors[k] && typeof v === 'string')
      .map(([k, v]) => [k, v.slice(0, 60)]),
  );
  const cmyk = Object.fromEntries(
    Object.entries(isObj(src.cmyk) ? src.cmyk : {}).filter(
      ([k, v]) => colors[k] && Array.isArray(v) && v.length === 4 && v.every((x) => Number.isFinite(+x) && +x >= 0 && +x <= 100),
    ),
  );
  /* mini-document : l'élément y passe par `migrate` comme un fichier ouvert */
  const wrapSub = (cols) => ({ id: 'sub', title: '', showTitle: false, layout: '1', cols });
  const sec =
    j.clip === 'section'
      ? clone(d)
      : { id: 'sec', title: '', page: 'recto', bg: 'none', subs: [j.clip === 'sub' ? clone(d) : wrapSub([clone(d)])] };
  if (j.clip === 'col') sec.subs[0].layout = '1';
  /* icônes importées des anciennes dataviz (opts.customIcons) : recueillies par migrate, puis retirées de l'élément */
  const m = migrate({ sections: [sec], colors, locale: src.locale, customIcons: [] });
  const s = m.sections[0];
  const item = j.clip === 'section' ? s : j.clip === 'sub' ? s.subs[0] : s.subs[0].cols[0];
  const legacy = m.customIcons;
  const dropIcons = (o) => {
    if (Array.isArray(o)) o.forEach(dropIcons);
    else if (isObj(o))
      for (const k of Object.keys(o)) {
        if (k === 'customIcons') delete o[k];
        else dropIcons(o[k]);
      }
  };
  dropIcons(item);
  /* toute autre image de l'élément (clé `src`) : data:image ou chemin du dépôt seulement */
  const imgs = (o) => {
    if (Array.isArray(o)) o.forEach(imgs);
    else if (isObj(o))
      for (const k of Object.keys(o)) {
        if (k === 'src' && o[k] != null && !safeImgSrc(o[k])) o[k] = null;
        else imgs(o[k]);
      }
  };
  imgs(item);
  if (j.clip === 'section') item.page = item.page === 'verso' ? 'verso' : 'recto';
  const icons = [...(Array.isArray(src.icons) ? src.icons : []), ...legacy].filter(
    (c) => isObj(c) && typeof c.id === 'string' && /^[\w-]+$/.test(c.id),
  );
  return {
    kind: j.clip,
    item,
    source: {
      locale: LOCALES[src.locale] ? src.locale : null,
      theme: THEMES[src.theme] ? src.theme : DEFAULT_THEME,
      colors,
      colorNames: names,
      cmyk,
      icons,
    },
  };
}

/* ---------- Arrivée dans le document cible ---------- */
const rgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
/** Couleur de la palette `pal` la plus proche (distance RVB pondérée) */
export function nearestColor(pal, hex) {
  const [r, g, b] = rgb(hex);
  let best = 'blue',
    d0 = Infinity;
  for (const [k, v] of Object.entries(pal)) {
    if (!HEX.test(v)) continue;
    const [r2, g2, b2] = rgb(v),
      rm = (r + r2) / 2,
      d = (2 + rm / 256) * (r - r2) ** 2 + 4 * (g - g2) ** 2 + (2 + (255 - rm) / 256) * (b - b2) ** 2;
    if (d < d0) {
      d0 = d;
      best = k;
    }
  }
  return best;
}
/** Icône importée relue : SVG nettoyé par cleanSvgTree, image en data URL seulement */
function cleanIcon(c) {
  const vb = Array.isArray(c.vb) && c.vb.length === 4 && c.vb.every((x) => Number.isFinite(+x)) ? c.vb.map(Number) : [0, 0, 24, 24];
  const out = { id: c.id, name: String(c.name || 'icon').slice(0, 40), vb };
  if (typeof c.img === 'string' && /^data:image\/(png|jpe?g|gif|webp);base64,/i.test(c.img)) out.img = c.img;
  const markup = typeof c.markup === 'string' ? c.markup : '';
  if (markup) {
    const svg = cleanSvgTree(
      new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg">${markup}</svg>`, 'image/svg+xml').documentElement,
    );
    out.markup = svg.querySelector('parsererror')
      ? ''
      : [...svg.childNodes]
          .map((n) => new XMLSerializer().serializeToString(n))
          .join('')
          .replace(/ xmlns(:\w+)?="[^"]*"/g, '');
  }
  return out.markup || out.img ? out : null;
}
const sameIcon = (a, b) => a.markup === b.markup && (a.img || '') === (b.img || '') && a.vb.join() === b.vb.join();

/** Fait entrer un élément lu (`readClip`) dans le document cible (modifié : couleurs et icônes ajoutées) ; renvoie l'élément prêt à
    être placé et un compte rendu { added: [nom], replaced: [[nom source, nom cible]], icons, numbers }.
    `addColors` faux : les couleurs absentes sont toujours remplacées par la plus proche de la palette cible. */
export function adoptClip(target, clip, { addColors = true } = {}) {
  const item = renewIds(clone(clip.item)),
    src = clip.source,
    report = { added: [], replaced: [], icons: 0, numbers: 0 };

  /* couleurs : une clé de la source absente de la cible (ou de teinte différente pour une couleur ajoutée) est reprise par sa valeur */
  const map = {};
  for (const k of colorKeysOf(item)) {
    const hex = src.colors[k];
    if (!hex || k === 'white' || k === 'none' || k === 'text') continue;
    const pal = paletteOf(target.theme, target.colors),
      themeKey = !/^x\d+$/.test(k);
    if (pal[k] && (themeKey || pal[k].toLowerCase() === hex.toLowerCase())) continue; // même clé : une couleur du thème garde la teinte de la cible
    const same = Object.keys(pal).find((x) => pal[x].toLowerCase() === hex.toLowerCase());
    const name = src.colorNames[k] || k;
    if (same) map[k] = same;
    else if (addColors && canAddColor(target)) {
      const nk = addColor(target, hex.toUpperCase());
      target.colorNames[nk] = name;
      if (src.cmyk[k]) (target.cmyk || (target.cmyk = {}))[nk] = src.cmyk[k].map((x) => Math.round(+x));
      map[k] = nk;
      report.added.push(name);
    } else {
      map[k] = nearestColor(pal, hex);
      report.replaced.push([name, colorLabel(target, map[k])]);
    }
  }
  remapItemColors(item, map);

  /* icônes importées : copiées dans la bibliothèque du document, sans doublon ; un identifiant déjà pris par une autre icône est renouvelé */
  const lib = target.customIcons || (target.customIcons = []),
    iconMap = {};
  for (const id of iconRefsOf(item)) {
    const raw = src.icons.find((c) => c.id === id),
      ic = raw && cleanIcon(raw);
    if (!ic) continue;
    const twin = lib.find((c) => c && Array.isArray(c.vb) && sameIcon(cleanIcon(c) || { vb: [] }, ic));
    if (twin) {
      if (twin.id !== id) iconMap[id] = twin.id;
      continue;
    }
    if (lib.some((c) => c && c.id === id)) {
      ic.id = 'c' + Math.random().toString(36).slice(2, 8);
      iconMap[id] = ic.id;
    }
    lib.push(ic);
    report.icons++;
  }
  if (Object.keys(iconMap).length)
    mapStrings(item, (v) => (/^custom:[\w-]+$/.test(v) && iconMap[v.slice(7)] ? 'custom:' + iconMap[v.slice(7)] : v));

  /* nombres des tableaux : de la convention de la source à celle de la cible */
  const to = target.locale || 'en-GB';
  if (src.locale && src.locale !== to) {
    const wrap = { sections: [{ subs: clip.kind === 'section' ? item.subs : [clip.kind === 'sub' ? item : { cols: [item] }] }] };
    report.numbers = convertDocNumbers(wrap, src.locale, to);
  }
  return { item, report };
}

/** Où le clip se colle, d'après la sélection (règle souple) : { si, bi?, ci?, at } ou { error } (clé française) */
export function pasteTarget(doc, kind, path) {
  const q = String(path || '').split(':'),
    si = +q[1],
    bi = +q[2],
    sec = doc.sections[si];
  if (!path || q[0] === 'header' || !sec) return { error: 'Sélectionnez d’abord l’endroit où coller (section, sous-section ou colonne).' };
  if (kind === 'section') return { si };
  if (kind === 'sub') return q[0] === 'sec' ? { si, bi: sec.subs.length - 1, end: true } : { si, bi };
  if (q[0] !== 'col')
    return { error: 'Une colonne copiée se colle sur une colonne : sélectionnez la colonne à remplacer ou à côté de laquelle coller.' };
  return { si, bi, ci: +q[3] };
}
/** Place l'élément adopté ; `mode` (colonne) : replace | insert | sub. Renvoie le chemin de l'élément collé. */
export function placeClip(doc, kind, item, where, mode = 'replace') {
  const { si, bi, ci } = where,
    sec = doc.sections[si];
  if (kind === 'section') {
    item.page = sec.page;
    doc.sections.splice(si + 1, 0, item);
    return `sec:${si + 1}`;
  }
  if (kind === 'sub') {
    sec.subs.splice(where.end ? sec.subs.length : bi + 1, 0, item);
    return `sub:${si}:${where.end ? sec.subs.length - 1 : bi + 1}`;
  }
  return placeCol(doc, si, bi, ci, item, mode, ci);
}

const ERRORS = {
  foreign: 'Le presse-papiers ne contient pas d’élément copié dans la Factsheet : rien n’a été collé.',
  malformed: 'L’élément copié est illisible ou incomplet : rien n’a été collé.',
  newer: 'Cet élément a été copié depuis une version plus récente de l’app : rechargez la page, puis collez à nouveau.',
};
const KIND_NAMES = { section: 'Section', sub: 'Sous-section', col: 'Colonne' };

/* ---------- Interface : raccourcis, boutons, menu ---------- */
/** ctx.clip : copy(path), paste(), canPaste() ; écoute les événements copy / paste du document (Ctrl/Cmd + C / V hors saisie) */
export function createClip(ctx, ws) {
  let memory = null; // texte du dernier clip copié (repli quand le presse-papiers système est refusé)
  let written = false; // le presse-papiers système a bien reçu ce clip
  const blocked = (e) => {
    const tg = (e && e.target) || document.activeElement || {},
      tag = tg.tagName || '';
    return (
      /INPUT|TEXTAREA|SELECT/.test(tag) ||
      tg.isContentEditable ||
      ws.busy() ||
      !!document.querySelector('dialog[open], .modal[open], .ve, .v3d, .ce') ||
      document.body.classList.contains('ve-open')
    );
  };
  const hasTextSelection = () => {
    const s = window.getSelection && window.getSelection();
    return !!s && !s.isCollapsed && String(s).trim() !== '';
  };
  /** Texte du clip de la sélection, ou null (rien à copier) */
  async function build() {
    const path = ctx.getSel(),
      c = path && path !== 'header' ? makeClip(ctx.getDoc(), path) : null;
    if (!c) {
      await alertBox(t('Sélectionnez une section, une sous-section ou une colonne à copier.'));
      return null;
    }
    return { text: JSON.stringify(c), kind: c.clip };
  }
  function copied(text, kind) {
    memory = text;
    const heavy = text.length > CLIP_HEAVY;
    ctx.note(
      `${t(KIND_NAMES[kind])} ${t('copiée')}.` +
        (heavy
          ? ` ${t('Copie lourde')} (${(text.length / 1e6).toFixed(1)} ${t('Mo')}) : ${t('elle contient des images incorporées.')}`
          : ''),
    );
  }
  /** Bouton ou menu : presse-papiers système, sinon mémoire de la page */
  async function copy() {
    const b = await build();
    if (!b) return;
    written = false;
    try {
      await navigator.clipboard.writeText(b.text);
      written = true;
    } catch (e) {}
    copied(b.text, b.kind);
  }
  /** Colle un texte de clip dans le document de l'onglet actif */
  async function pasteText(text) {
    const r = readClip(text);
    if (r.error) {
      await alertBox(t(ERRORS[r.error]));
      return false;
    }
    const where = pasteTarget(ctx.getDoc(), r.kind, ctx.getSel());
    if (where.error) {
      await alertBox(t(where.error));
      return false;
    }
    let mode = 'replace';
    if (r.kind === 'col') {
      const sub = ctx.getDoc().sections[where.si].subs[where.bi],
        nb = sub.cols.length;
      if (!isFreeCol(sub.cols[where.ci])) {
        const options = [
          nb < MAX_COLS ? { value: 'insert', label: t('Insérer une colonne à côté (les colonnes deviennent égales)') } : null,
          { value: 'replace', label: t('Remplacer la colonne sélectionnée') },
          { value: 'sub', label: t('Coller dans une nouvelle sous-section, en dessous') },
        ].filter(Boolean);
        mode = await chooseBox(
          t('La colonne sélectionnée contient déjà du contenu. Où coller la colonne copiée ?'),
          options,
          options[0].value,
          t('Coller'),
        );
        if (!mode) return false;
      }
    }
    let report = null;
    ctx.moved(
      () => {
        const doc = ctx.getDoc(),
          a = adoptClip(doc, r);
        report = a.report;
        const path = placeClip(doc, r.kind, a.item, where, mode);
        if (r.kind !== 'section') {
          const si = where.si,
            bi = +path.split(':')[2];
          refreshAutoCards(doc.sections[si].subs[bi], (i) => columnWidth(doc, si, bi, i));
        }
        return path;
      },
      `${t(KIND_NAMES[r.kind])} ${t('collée')}.`,
      'Annuler le collage',
    );
    const notes = [];
    if (report.added.length) notes.push(`${t('Couleurs ajoutées au document')} : ${report.added.map((x) => t(x)).join(', ')}.`);
    if (report.replaced.length)
      notes.push(
        `${t('Plus de place dans la palette : couleurs remplacées par la plus proche')} : ${report.replaced.map(([a, b]) => `${t(a)} → ${t(b)}`).join(', ')}.`,
      );
    if (report.numbers) notes.push(`${report.numbers} ${t('nombre(s) de tableau réécrit(s) au format du document.')}`);
    if (report.replaced.length) await alertBox(notes.join('\n'));
    else if (notes.length) ctx.note(`${t(KIND_NAMES[r.kind])} ${t('collée')}. ${notes.join(' ')}`, 'Annuler le collage');
    return true;
  }
  /** Bouton ou menu : presse-papiers système s'il contient un clip, sinon le dernier clip copié dans cette page */
  async function paste() {
    let text = null;
    try {
      text = await navigator.clipboard.readText();
    } catch (e) {}
    if (memory && (!text || (!written && readClip(text).error === 'foreign'))) text = memory;
    return pasteText(text || '');
  }

  document.addEventListener('copy', (e) => {
    if (blocked(e) || hasTextSelection()) return;
    const path = ctx.getSel(),
      c = path && path !== 'header' ? makeClip(ctx.getDoc(), path) : null;
    if (!c) return;
    const text = JSON.stringify(c);
    e.preventDefault();
    if (e.clipboardData) e.clipboardData.setData('text/plain', text);
    written = !!e.clipboardData;
    copied(text, c.clip);
  });
  document.addEventListener('paste', (e) => {
    if (blocked(e)) return;
    let text = e.clipboardData ? e.clipboardData.getData('text/plain') : '';
    if (!text && memory) text = memory;
    else if (memory && !written && readClip(text).error === 'foreign') text = memory;
    if (!text) return;
    e.preventDefault();
    pasteText(text);
  });

  return { copy, paste, pasteText, canCopy: () => !!itemAt(ctx.getDoc(), ctx.getSel()) };
}
