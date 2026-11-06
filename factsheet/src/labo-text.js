/* Labo : propositions pour le TEXTE (rien n'est branché dans l'éditeur ; données d'exemple en dur, rien lu ni écrit).
   Six sujets :
   - « Styles de texte »     : le catalogue de styles de paragraphe (dont « Source » : Source Sans 3 italique 8 pt, interlignage 9 pt) ;
   - « Police et taille »    : changer la police (sans / serif) et la taille d'un bloc ;
   - « Options avancées »    : l'icône burger d'un bloc de texte qui ouvre interlignage, tracking, kerning… ;
   - « Listes »              : puces et listes numérotées ;
   - « Barre de texte »      : gagner de la place dans le panneau (hauteurs mesurées en direct) ;
   - « Pistes à ajouter »    : styles et options qui manquent, à retenir ou non.
   Les variantes A reproduisent l'état actuel. Les glisseurs modifient le paragraphe sans tout redessiner (refresh). */
import { h } from './render.js';

const ic = n => h('i', { class: 'ti ti-' + n });
const FAM = { sans: '"Source Sans 3", "Source Sans Pro", sans-serif', serif: '"Source Serif 4", "Source Serif Pro", serif' };
const PX = 4 / 3;                                  // 1 pt = 1,333 px ; l'app compte l'interlignage en px, la mise en page se pense en pt
const fmt = n => String(+(+n).toFixed(2)).replace('.', ',');
const lhAuto = pt => Math.ceil(pt * PX * 1.3 / 3) * 3;   // interlignage automatique : ~130 %, arrondi à la grille de 3 px (12 pt → 21 px)

/* ---------- Catalogue de styles : f famille, s taille (pt), lh interlignage (px), w graisse, it italique, up capitales, ls tracking (‰ em) ---------- */
const ST = {
  h1:     { n: 'Titre 1',           g: 'Titres',      f: 'sans',  s: 21, lh: 33, w: 700 },
  h2:     { n: 'Titre 2',           g: 'Titres',      f: 'sans',  s: 14, lh: 24, w: 700 },
  lead:   { n: 'Chapeau',           g: 'Titres',      f: 'serif', s: 14, lh: 24, w: 400, nw: true },
  body:   { n: 'Texte',             g: 'Texte',       f: 'sans',  s: 12, lh: 21, w: 400 },
  bold:   { n: 'Texte gras',        g: 'Texte',       f: 'sans',  s: 12, lh: 21, w: 700, nw: true },
  small:  { n: 'Texte petit',       g: 'Texte',       f: 'sans',  s: 10, lh: 15, w: 400, nw: true },
  quote:  { n: 'Citation',          g: 'Texte',       f: 'sans',  s: 14, lh: 24, w: 400, it: true, rule: true, nw: true },
  cap:    { n: 'Légende',           g: 'Annotations', f: 'sans',  s: 8,  lh: 15, w: 600 },
  label:  { n: 'Étiquette',         g: 'Annotations', f: 'sans',  s: 8,  lh: 15, w: 700, up: true, ls: 80, nw: true },
  source: { n: 'Source',            g: 'Annotations', f: 'sans',  s: 8,  lh: 12, w: 400, it: true, nw: true },
  note:   { n: 'Note',              g: 'Annotations', f: 'sans',  s: 8,  lh: 12, w: 400, nw: true },
  fig:    { n: 'Chiffre clé',       g: 'Chiffres',    f: 'serif', s: 24, lh: 36, w: 700 },
  figsm:  { n: 'Chiffre clé (petit)', g: 'Chiffres',  f: 'serif', s: 18, lh: 24, w: 700 },
};
const CURRENT = ['body', 'h1', 'h2', 'cap', 'fig', 'figsm'];          // les six styles d'aujourd'hui
const specOf = k => { const s = ST[k]; return `${s.s} / ${fmt(s.lh / PX)} pt${s.it ? ' · italique' : ''}${s.up ? ' · capitales' : ''}${s.f === 'serif' ? ' · serif' : ''}`; };

/* style CSS d'un paragraphe : le style + ses réglages propres (p.o) */
function cssOf(p, scale = 1) {
  const s = ST[p.st], o = p.o || {}, f = o.f || s.f, size = o.s || s.s;
  const lh = o.lh != null ? o.lh : (o.s ? lhAuto(o.s) : s.lh);
  const css = {
    fontFamily: FAM[f], fontSize: size * scale + 'pt', lineHeight: lh * scale + 'px', fontWeight: String(s.w), fontStyle: o.it ?? s.it ? 'italic' : 'normal',
    textTransform: s.up ? 'uppercase' : 'none', letterSpacing: ((o.ls ?? s.ls ?? 0) / 1000) + 'em', fontKerning: o.kern === 'none' ? 'none' : 'normal',
    hyphens: o.hyph ? 'auto' : 'manual', textAlign: o.align || 'left', textIndent: (o.indent || 0) + 'px',
    marginTop: (o.before || 0) + 'px', marginBottom: (o.after || 0) + 'px',
  };
  return css;
}
const ruleOf = p => ST[p.st].rule;

/* ---------- état par défaut ---------- */
const PARAS = (src = 'source') => [
  { st: 'label', t: 'Politique de sécurité' },
  { st: 'h1', t: 'La Facilité européenne pour la paix' },
  { st: 'lead', t: 'Un instrument pour soutenir des partenaires, de l’Ukraine à l’Afrique.' },
  { st: 'body', t: 'Depuis 2021, l’Union finance des équipements et des formations pour ses partenaires. L’enveloppe, adoptée à l’unanimité, couvre des opérations civiles et militaires dans plus de vingt pays, avec un contrôle annuel du Conseil.' },
  { st: 'quote', t: '« Le financement est une affaire de confiance, pas seulement de budget. »' },
  { st: src, t: 'Source : Conseil de l’Union européenne, 2024.' },
];
const withSel = (paras, sel = 3) => ({ paras, sel, open: null, tab: 'texte' });
export const stylesOpts = () => withSel(PARAS('source'), 5);
export const stylesOptsOld = () => withSel(PARAS('cap').filter(p => CURRENT.includes(p.st)), 1);
export const fontOpts = () => withSel(PARAS().filter(p => ['h1', 'body', 'source'].includes(p.st)), 1);
export const advOpts = () => withSel(PARAS().filter(p => ['h1', 'body', 'source'].includes(p.st)), 1);
export const listOpts = () => ({ kind: 'num', marker: 'dec', start: 1, indent: 18, gap: 6, tint: true, open: false });
export const barOpts = () => ({ bold: false });
export const ideasOpts = () => ({ keep: {} });

/* ---------- briques ---------- */
const seg = (items, value, pick) => h('div', { class: 'tx-seg' }, items.map(([v, l, tip]) => h('button', { type: 'button', class: v === value ? 'on' : '', title: tip || (typeof l === 'string' ? l : ''), 'aria-label': tip || (typeof l === 'string' ? l : v), onclick: () => pick(v) }, typeof l === 'string' && l.startsWith('ti-') ? ic(l.slice(3)) : l)));
const card = (icon, name, body, extra) => h('section', { class: 'pp-card tx-card' }, h('div', { class: 'pp-card-h' }, ic(icon), h('b', { textContent: name }), h('span', { class: 'pp-sp' }), extra), h('div', { class: 'pp-body' }, [body].flat(Infinity)));
const field = (label, node, note) => h('div', { class: 'tx-f' }, h('div', { class: 'tx-l', textContent: label }), node, note ? h('div', { class: 'tx-note', textContent: note }) : null);
const sw = (on, fn) => h('button', { type: 'button', role: 'switch', 'aria-checked': String(!!on), class: 'pp-switch' + (on ? ' on' : ''), onclick: e => { const b = e.currentTarget; b.classList.toggle('on'); fn(b.classList.contains('on')); } });
const hint = t => h('p', { class: 'tx-hint', textContent: t });

/* La page d'exemple : chaque paragraphe est cliquable (sélection) ; refresh(i) le remet en forme sans tout redessiner */
function samplePage(o, repaint, extra = {}) {
  const els = [];
  const page = h('div', { class: 'tx-page', lang: 'fr' });
  const refresh = i => {
    const p = o.paras[i], e = els[i]; if (!e) return;
    Object.assign(e.style, cssOf(p));
    e.classList.toggle('rule', !!ruleOf(p));
    if (extra.badge) extra.badge(i, e);
  };
  o.paras.forEach((p, i) => {
    const e = h('div', { class: 'tx-p' + (i === o.sel ? ' sel' : ''), onclick: ev => { if (ev.target.closest('.tx-burger,.tx-pop')) return; if (o.sel !== i) { o.sel = i; o.open = null; repaint(); } } }, p.t);
    els[i] = e; page.append(extra.wrap ? extra.wrap(i, e) : e); refresh(i);
  });
  return { page, refresh: () => o.paras.forEach((_, i) => refresh(i)), refreshOne: refresh };
}
const frame = (...kids) => h('div', { class: 'tx' }, ...kids);

/* glisseur : met à jour la valeur affichée et le paragraphe, sans redessiner (sinon le curseur est perdu en plein geste) */
function slider({ label, get, set, min, max, step, show, tip }) {
  const out = h('output', { textContent: show(get()) });
  const r = h('input', { type: 'range', min, max, step, value: get(), oninput: () => { set(+r.value); out.textContent = show(+r.value); } });
  const reset = h('button', { type: 'button', class: 'tx-rs', title: 'Valeur du style', 'aria-label': 'Revenir à la valeur du style', onclick: () => { set(null); r.value = get(); out.textContent = show(get()); } }, ic('restore'));
  return h('div', { class: 'tx-sl' }, h('div', { class: 'tx-l' }, h('span', { textContent: label }), h('span', { class: 'pp-sp' }), out, reset), r, tip ? h('div', { class: 'tx-note', textContent: tip }) : null);
}
/* réglages avancés d'un paragraphe (les mêmes dans les trois propositions) */
function advControls(o, ctx, opts = {}) {
  const p = () => o.paras[o.sel], st = () => ST[p().st];
  const setO = (k, v) => { const q = p(); q.o = q.o || {}; if (v == null) delete q.o[k]; else q.o[k] = v; ctx.refresh(); };
  const lhPt = () => (p().o && p().o.lh != null ? p().o.lh : p().o && p().o.s ? lhAuto(p().o.s) : st().lh) / PX;
  const grid = () => { const px = lhPt() * PX; return Math.abs(px / 3 - Math.round(px / 3)) < 0.02 ? 'sur la grille de 3 px' : 'hors de la grille de 3 px'; };
  const lhOut = h('div', { class: 'tx-note' });
  const upd = () => { lhOut.textContent = `= ${Math.round(lhPt() * PX * 100) / 100} px · ${grid()}`; };
  upd();
  const nodes = [
    (() => { const s = slider({ label: 'Interlignage', min: 6, max: 40, step: 0.25, get: lhPt, set: v => { setO('lh', v == null ? null : v * PX); upd(); }, show: v => fmt(v) + ' pt' }); s.append(lhOut); return s; })(),
    slider({ label: 'Tracking (espacement des lettres)', min: -50, max: 300, step: 5, get: () => (p().o && p().o.ls != null ? p().o.ls : st().ls || 0), set: v => setO('ls', v), show: v => (v > 0 ? '+' : '') + v + ' ‰', tip: '1000 ‰ = 1 em ; comme InDesign.' }),
    field('Kerning (paires de lettres)', (() => { const b = h('div'); const draw = () => b.replaceChildren(seg([['auto', 'Automatique'], ['none', 'Désactivé']], (p().o && p().o.kern) || 'auto', v => { setO('kern', v === 'auto' ? null : v); draw(); })); draw(); return b; })(), 'Automatique = crénage de la police.'),
    field('Alignement', (() => { const b = h('div'); const draw = () => b.replaceChildren(seg([['left', 'ti-align-left', 'À gauche'], ['center', 'ti-align-center', 'Centré'], ['right', 'ti-align-right', 'À droite'], ['justify', 'ti-align-justified', 'Justifié']], (p().o && p().o.align) || 'left', v => { setO('align', v === 'left' ? null : v); draw(); })); draw(); return b; })()),
    h('div', { class: 'pp-switchrow' }, h('span', { textContent: 'Césure automatique' }), sw(!!(p().o && p().o.hyph), on => setO('hyph', on || null))),
    slider({ label: 'Retrait de première ligne', min: 0, max: 36, step: 3, get: () => (p().o && p().o.indent) || 0, set: v => setO('indent', v || null), show: v => v + ' px' }),
    h('div', { class: 'tx-two' },
      slider({ label: 'Avant', min: 0, max: 36, step: 3, get: () => (p().o && p().o.before) || 0, set: v => setO('before', v || null), show: v => v + ' px' }),
      slider({ label: 'Après', min: 0, max: 36, step: 3, get: () => (p().o && p().o.after) || 0, set: v => setO('after', v || null), show: v => v + ' px' })),
  ];
  return opts.cols ? h('div', { class: 'tx-cols' }, nodes) : h('div', { class: 'tx-stack' }, nodes);
}
/* éditeur riche factice (barre + zone de saisie) */
const richMock = (o, { compact, burger, onBurger, noBar } = {}) => {
  const b = (i, t, on) => h('button', { type: 'button', class: 'tx-tb' + (on ? ' on' : ''), title: t, 'aria-label': t }, typeof i === 'string' && i.startsWith('ti-') ? ic(i.slice(3)) : i);
  const sel = h('select', { class: 'tx-sel', 'aria-label': 'Style de paragraphe' }, Object.keys(ST).filter(k => CURRENT.includes(k)).map(k => h('option', { value: k, textContent: ST[k].n, selected: k === o.paras[o.sel].st })));
  const bar = noBar ? null : h('div', { class: 'tx-bar' + (compact ? ' compact' : '') }, sel,
    b(h('b', { textContent: 'B' }), 'Gras'), b(h('i', { textContent: 'I' }), 'Italique'), b(h('u', { textContent: 'U' }), 'Souligné'),
    compact ? b('ti-dots', 'Exposant, indice…') : [b('x²', 'Exposant'), b('x₂', 'Indice')],
    b('ti-list', 'Liste à puces'), burger ? h('button', { type: 'button', class: 'tx-tb burger', title: 'Options avancées', 'aria-label': 'Options avancées', onclick: onBurger }, ic('menu-2')) : null);
  const area = h('div', { class: 'tx-area' + (compact ? ' compact' : ''), textContent: o.paras[o.sel].t });
  return h('div', { class: 'tx-rich' }, bar, area, compact ? null : h('div', { class: 'tx-hint', textContent: 'Entrée = nouveau paragraphe · Maj + Entrée = retour à la ligne' }));
};

/* =====================================================================
   1. STYLES DE TEXTE
   ===================================================================== */
const styleTile = (k, on, pick) => h('button', { type: 'button', class: 'tx-tile' + (on ? ' on' : ''), onclick: () => pick(k) },
  h('span', { class: 'tx-aa', style: { fontFamily: FAM[ST[k].f], fontWeight: ST[k].w, fontStyle: ST[k].it ? 'italic' : 'normal', textTransform: ST[k].up ? 'uppercase' : 'none', letterSpacing: (ST[k].ls || 0) / 1000 + 'em', fontSize: Math.min(ST[k].s, 20) + 'pt' }, textContent: ST[k].up ? 'ABC' : 'Aa' }),
  h('span', { class: 'tx-tn' }, ST[k].n, ST[k].nw ? h('i', { class: 'tx-new', title: 'Nouveau style', textContent: 'nouveau' }) : null), h('span', { class: 'tx-ts', textContent: specOf(k) }));

export function renderStyles(o, v, repaint) {
  const V = v.style, ctx = {}, s = samplePage(o, repaint); ctx.refresh = s.refresh;
  const pick = k => { o.paras[o.sel].st = k; o.paras[o.sel].o = {}; o.open = null; repaint(); };
  const cur = o.paras[o.sel].st, keys = V === 'a' ? CURRENT : Object.keys(ST);
  let body;
  if (V === 'a') {
    const sel = h('select', { onchange: e => pick(e.target.value) }, CURRENT.map(k => h('option', { value: k, textContent: ST[k].n, selected: k === cur })));
    body = [field('Style de paragraphe', sel), hint('Six styles. Pour une source, on se rabat sur « Légende » : graisse 600, droit, interlignage 15 px (voir le dernier paragraphe de la page).')];
  } else if (V === 'b') {
    const list = h('div', { class: 'tx-menu' }, ['Titres', 'Texte', 'Annotations', 'Chiffres'].flatMap(g => [h('div', { class: 'tx-mg', textContent: g }),
      ...keys.filter(k => ST[k].g === g).map(k => h('button', { type: 'button', class: 'tx-mi' + (k === cur ? ' on' : ''), onclick: () => pick(k) },
        h('span', { class: 'tx-mp', style: { ...cssOf({ st: k }), lineHeight: '1.1', marginTop: 0, marginBottom: 0, fontSize: Math.min(ST[k].s, 15) + 'pt' }, textContent: ST[k].n }),
        h('span', { class: 'tx-ts', textContent: specOf(k) }), ST[k].nw ? h('i', { class: 'tx-new', textContent: 'nouveau' }) : null))]));
    body = [field('Style de paragraphe', h('div', { class: 'tx-dd' }, h('button', { type: 'button', class: 'tx-dd-b', 'aria-expanded': String(!!o.open), onclick: () => { o.open = o.open ? null : 'menu'; repaint(); } },
      h('span', { class: 'tx-mp', style: { fontFamily: FAM[ST[cur].f], fontWeight: ST[cur].w, fontStyle: ST[cur].it ? 'italic' : 'normal', fontSize: '11pt' }, textContent: ST[cur].n }), h('span', { class: 'tx-ts', textContent: specOf(cur) }), ic('chevron-' + (o.open ? 'up' : 'down'))), o.open ? list : null)),
      hint('Menu avec aperçu : chaque style est écrit dans sa propre typographie, regroupé par famille. Les styles ajoutés sont marqués « nouveau ».')];
  } else {
    body = [h('div', { class: 'tx-gal' }, ['Titres', 'Texte', 'Annotations', 'Chiffres'].flatMap(g => [h('div', { class: 'tx-mg wide', textContent: g }), ...keys.filter(k => ST[k].g === g).map(k => styleTile(k, k === cur, pick))])),
      hint('Galerie : tout est visible d’un coup, sans ouvrir de menu ; plus lourd en hauteur, mais on compare les styles à l’œil.')];
  }
  const sp = h('div', { class: 'tx-spec' }, ic('ruler-2'), h('span', { textContent: `${ST[cur].n} : ${specOf(cur)}` }));
  return frame(h('div', { class: 'tx-pagewrap' }, h('div', { class: 'tx-cap', textContent: 'Page (cliquer un paragraphe)' }), s.page), h('aside', { class: 'tx-panel' }, card('typography', 'Texte', [...body, sp])));
}

/* =====================================================================
   2. POLICE ET TAILLE
   ===================================================================== */
const SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 21, 24, 30];
export function renderFont(o, v, repaint) {
  const V = v.style, s = samplePage(o, repaint), ctx = { refresh: s.refresh };
  const p = () => o.paras[o.sel], st = () => ST[p().st];
  const fam = () => (p().o && p().o.f) || st().f, size = () => (p().o && p().o.s) || st().s;
  const set = (k, val) => { const q = p(); q.o = q.o || {}; if (val == null) delete q.o[k]; else q.o[k] = val; if (k === 's') delete q.o.lh; ctx.refresh(); };
  const lhNote = () => `Interlignage automatique : ${fmt((p().o && p().o.lh != null ? p().o.lh : p().o && p().o.s ? lhAuto(p().o.s) : st().lh) / PX)} pt`;
  let panel, bar;
  const sizeBox = () => { const inp = h('input', { type: 'number', min: 6, max: 72, step: 0.5, value: size(), 'aria-label': 'Taille en pt', oninput: e => { if (+e.target.value > 0) { set('s', +e.target.value); note.textContent = lhNote(); } } }); const note = h('div', { class: 'tx-note', textContent: lhNote() }); return [inp, note]; };
  if (V === 'a') {
    const fs = h('select', { onchange: e => { set('f', e.target.value); repaint(); } }, [['sans', 'Source Sans 3'], ['serif', 'Source Serif 4']].map(([k, l]) => h('option', { value: k, textContent: l, selected: k === fam() })));
    const sz = h('select', { onchange: e => { set('s', +e.target.value); repaint(); } }, [...new Set([...SIZES, size()])].sort((a, b) => a - b).map(n => h('option', { value: n, textContent: n + ' pt', selected: n === size() })));
    panel = card('letter-case', 'Police et taille', [field('Police', fs), field('Taille', sz, lhNote()), hint('Deux listes déroulantes : le plus classique, deux clics par réglage.')]);
  } else if (V === 'b') {
    const dec = d => () => { const i = SIZES.indexOf(size()); const n = i < 0 ? size() + d : SIZES[Math.max(0, Math.min(SIZES.length - 1, i + d))]; set('s', n); repaint(); };
    bar = h('div', { class: 'tx-fbar' },
      seg([['sans', h('span', { style: { fontFamily: FAM.sans }, textContent: 'Aa' }), 'Source Sans 3'], ['serif', h('span', { style: { fontFamily: FAM.serif }, textContent: 'Aa' }), 'Source Serif 4']], fam(), k => { set('f', k); repaint(); }),
      h('div', { class: 'tx-step' }, h('button', { type: 'button', 'aria-label': 'Plus petit', onclick: dec(-1) }, ic('minus')), h('span', { textContent: fmt(size()) + ' pt' }), h('button', { type: 'button', 'aria-label': 'Plus grand', onclick: dec(1) }, ic('plus'))),
      h('button', { type: 'button', class: 'tx-tb', title: 'Revenir au style', 'aria-label': 'Revenir au style', onclick: () => { p().o = {}; repaint(); } }, ic('restore')),
      h('span', { class: 'tx-ts', textContent: st().n }));
    panel = card('typography', 'Texte', [hint('La même chose se fait dans la barre au-dessus de la page : police en deux boutons, taille par pas sur l’échelle typographique (− / +). Rien dans le panneau, donc rien à dérouler.'), field('Style', h('div', { class: 'tx-val', textContent: st().n })), h('div', { class: 'tx-note', textContent: lhNote() })]);
  } else {
    const tiles = h('div', { class: 'tx-fam' }, [['sans', 'Source Sans 3', 'Texte courant'], ['serif', 'Source Serif 4', 'Titres, chiffres']].map(([k, l, d]) => h('button', { type: 'button', class: 'tx-ft' + (fam() === k ? ' on' : ''), onclick: () => { set('f', k); repaint(); } },
      h('span', { class: 'tx-big', style: { fontFamily: FAM[k] }, textContent: 'Aa' }), h('span', { class: 'tx-tn', textContent: l }), h('span', { class: 'tx-ts', textContent: d }))));
    const scale = h('div', { class: 'tx-scale' }, SIZES.map(n => h('button', { type: 'button', class: n === size() ? 'on' : '', style: { fontSize: Math.min(5 + n * 0.5, 17) + 'px' }, onclick: () => { set('s', n); repaint(); } }, String(n))));
    panel = card('letter-case', 'Police et taille', [field('Police', tiles), field('Taille (pt) — échelle du document', scale, lhNote()), field('Taille libre', h('div', { class: 'tx-inl' }, sizeBox())), h('button', { type: 'button', class: 'pp-btn', onclick: () => { p().o = {}; repaint(); } }, ic('restore'), 'Revenir au style')]);
  }
  const warn = fam() === 'serif' && (st().it || (p().o || {}).it) ? h('div', { class: 'tx-warn' }, ic('alert-triangle'), 'Source Serif 4 n’a pas d’italique dans le dépôt : il faudrait l’ajouter (web et PDF).') : null;
  return frame(h('div', { class: 'tx-pagewrap' }, bar, h('div', { class: 'tx-cap', textContent: 'Page (cliquer un paragraphe)' }), s.page, warn), h('aside', { class: 'tx-panel' }, panel));
}

/* =====================================================================
   3. OPTIONS AVANCÉES (icône burger)
   ===================================================================== */
export function renderAdv(o, v, repaint) {
  const V = v.style, ctx = {};
  const popover = () => h('div', { class: 'tx-pop' + (V === 'c' ? ' under-bar' : ''), role: 'dialog', 'aria-label': 'Options avancées du texte' },
    h('div', { class: 'tx-pop-h' }, ic('menu-2'), h('b', { textContent: 'Options avancées' }), h('span', { class: 'pp-sp' }), h('button', { type: 'button', class: 'tx-tb', 'aria-label': 'Fermer', onclick: () => { o.open = null; repaint(); } }, ic('x'))),
    advControls(o, ctx, { cols: V === 'b' }),
    h('button', { type: 'button', class: 'pp-btn', onclick: () => { o.paras[o.sel].o = {}; repaint(); } }, ic('restore'), 'Tout remettre comme le style'));
  const toggle = () => { o.open = o.open === 'adv' ? null : 'adv'; repaint(); };
  const burger = () => h('button', { type: 'button', class: 'tx-burger', title: 'Options avancées', 'aria-label': 'Options avancées', 'aria-expanded': String(o.open === 'adv'), onclick: toggle }, ic('menu-2'));
  let s, panel;
  if (V === 'a') {
    s = samplePage(o, repaint, { wrap: (i, e) => { const w = h('div', { class: 'tx-blk' + (i === o.sel ? ' sel' : '') }, e); if (i === o.sel) { w.append(burger()); if (o.open === 'adv') w.append(popover()); } return w; } });
    panel = h('aside', { class: 'tx-panel' }, card('typography', 'Texte', [richMock(o), hint('Cliquer un paragraphe : une petite icône burger apparaît à son angle. Elle ouvre les options avancées juste à côté du texte, sans passer par le panneau.')]));
  } else if (V === 'b') {
    s = samplePage(o, repaint);
    panel = h('aside', { class: 'tx-panel' }, card('typography', 'Texte', [richMock(o, { noBar: false }), o.open === 'adv' ? h('div', { class: 'tx-acc' }, h('div', { class: 'tx-acc-h' }, ic('adjustments'), h('b', { textContent: 'Avancé' })), advControls(o, ctx)) : hint('L’icône burger de la carte déplie « Avancé » sous le texte.')],
      h('button', { type: 'button', class: 'tx-burger inline', title: 'Options avancées', 'aria-label': 'Options avancées', 'aria-expanded': String(o.open === 'adv'), onclick: () => { o.open = o.open === 'adv' ? null : 'adv'; repaint(); } }, ic('menu-2'))));
  } else {
    s = samplePage(o, repaint);
    panel = h('aside', { class: 'tx-panel rel' }, card('typography', 'Texte', [richMock(o, { burger: true, onBurger: () => { o.open = o.open === 'adv' ? null : 'adv'; repaint(); } }), hint('Le burger est le dernier bouton de la barre de mise en forme ; il ouvre un panneau flottant au-dessus du reste du panneau.')]), o.open === 'adv' ? popover() : null);
  }
  ctx.refresh = s.refresh;
  return frame(h('div', { class: 'tx-pagewrap' }, h('div', { class: 'tx-cap', textContent: 'Page (cliquer un paragraphe)' }), s.page), panel);
}

/* =====================================================================
   4. LISTES
   ===================================================================== */
const roman = n => { const m = [[10, 'x'], [9, 'ix'], [5, 'v'], [4, 'iv'], [1, 'i']]; let r = ''; for (const [v, s] of m) while (n >= v) { r += s; n -= v; } return r; };
const alpha = (n, up) => { let s = ''; n--; do { s = String.fromCharCode(97 + (n % 26)) + s; n = Math.floor(n / 26) - 1; } while (n >= 0); return up ? s.toUpperCase() : s; };
const MARKERS = {
  disc:   { kind: 'bullet', l: 'Disque',        m: () => '•' },     dash:   { kind: 'bullet', l: 'Tiret',      m: () => '–' },
  circle: { kind: 'bullet', l: 'Cercle',        m: () => '◦' },     square: { kind: 'bullet', l: 'Carré',      m: () => '▪' },
  arrow:  { kind: 'bullet', l: 'Flèche',        m: () => '→' },
  dec:    { kind: 'num',    l: '1.  2.  3.',    m: n => n + '.' },  decp:   { kind: 'num',    l: '1)  2)  3)', m: n => n + ')' },
  dec0:   { kind: 'num',    l: '01  02  03',    m: n => String(n).padStart(2, '0') }, lalpha: { kind: 'num', l: 'a.  b.  c.', m: n => alpha(n) + '.' },
  ualpha: { kind: 'num',    l: 'A.  B.  C.',    m: n => alpha(n, true) + '.' }, lroman: { kind: 'num', l: 'i.  ii.  iii.', m: n => roman(n) + '.' },
};
const ITEMS = ['Soutenir les partenaires de l’Union', 'Financer équipements et formations', 'Contrôler chaque année les dépenses', 'Rendre compte au Conseil'];
function listNode(o) {
  const mk = MARKERS[o.marker] || MARKERS.disc;
  return h('div', { class: 'tx-list' }, ITEMS.map((t, i) => h('div', { class: 'tx-li', style: { gap: '6px', marginTop: i ? o.gap + 'px' : 0, paddingLeft: '0' } },
    h('span', { class: 'tx-mk', style: { width: o.indent + 'px', color: o.tint ? 'var(--c-blue)' : 'inherit', fontWeight: o.kind === 'num' ? 700 : 400 }, textContent: o.kind === 'none' ? '' : mk.m((+o.start || 1) + i) }), h('span', { textContent: t }))));
}
export function renderList(o, v, repaint) {
  const V = v.style;
  const setKind = k => { o.kind = k; if (k === 'bullet' && MARKERS[o.marker].kind !== 'bullet') o.marker = 'disc'; if (k === 'num' && MARKERS[o.marker].kind !== 'num') o.marker = 'dec'; repaint(); };
  const live = h('div', { class: 'tx-p-list' }, listNode(o));
  const redraw = () => { live.replaceChildren(listNode(o)); };
  let tool = null, panel;
  if (V === 'a') {
    tool = h('div', { class: 'tx-tools' }, h('button', { type: 'button', class: 'tx-tb' + (o.kind === 'bullet' ? ' on' : ''), title: 'Liste à puces', 'aria-label': 'Liste à puces', onclick: () => setKind(o.kind === 'bullet' ? 'none' : 'bullet') }, ic('list')),
      h('button', { type: 'button', class: 'tx-tb' + (o.kind === 'num' ? ' on' : ''), title: 'Liste numérotée', 'aria-label': 'Liste numérotée', onclick: () => setKind(o.kind === 'num' ? 'none' : 'num') }, ic('list-numbers')));
    panel = card('list', 'Liste', [h('div', { class: 'tx-row' }, tool), hint('Deux boutons à bascule dans la barre de l’éditeur (puces, numérotée). Un seul aspect par type : « 1. 2. 3. » et « • ». Le plus simple, mais sans choix.')]);
  } else if (V === 'b') {
    const pop = h('div', { class: 'tx-pop list' }, ['bullet', 'num'].flatMap(k => [h('div', { class: 'tx-mg', textContent: k === 'bullet' ? 'Puces' : 'Numérotées' }), h('div', { class: 'tx-mgrid' }, Object.entries(MARKERS).filter(([, m]) => m.kind === k).map(([id, m]) =>
      h('button', { type: 'button', class: 'tx-mkb' + (o.marker === id && o.kind === k ? ' on' : ''), onclick: () => { o.kind = k; o.marker = id; o.open = false; repaint(); } }, h('b', { textContent: m.m(1) }), h('span', { textContent: m.l }))))]),
      h('button', { type: 'button', class: 'tx-mkb none', onclick: () => { o.kind = 'none'; o.open = false; repaint(); } }, ic('list-off'), h('span', { textContent: 'Aucune liste' })));
    panel = card('list', 'Liste', [h('div', { class: 'tx-row' }, h('div', { class: 'tx-splitb' },
      h('button', { type: 'button', class: 'tx-tb' + (o.kind !== 'none' ? ' on' : ''), title: 'Liste', 'aria-label': 'Liste', onclick: () => setKind(o.kind === 'none' ? 'bullet' : 'none') }, ic(o.kind === 'num' ? 'list-numbers' : 'list')),
      h('button', { type: 'button', class: 'tx-tb narrow', title: 'Style de repère', 'aria-label': 'Style de repère', 'aria-expanded': String(!!o.open), onclick: () => { o.open = !o.open; repaint(); } }, ic('chevron-down'))), o.open ? pop : null),
      hint('Un bouton « liste » avec flèche : la flèche ouvre dix repères en aperçu (disque, tiret, carré, 1. 1) 01 a. A. i.). C’est ce que font Word, Pages et InDesign.')]);
  } else {
    const num = (k, min, max, step) => h('input', { type: 'number', min, max, step, value: o[k], 'aria-label': k, oninput: e => { o[k] = +e.target.value; redraw(); } });
    const mkSel = h('select', { onchange: e => { o.marker = e.target.value; o.kind = MARKERS[o.marker].kind; repaint(); } }, Object.entries(MARKERS).map(([id, m]) => h('option', { value: id, textContent: (m.kind === 'bullet' ? 'Puce — ' : 'Numéro — ') + m.l, selected: id === o.marker })));
    panel = card('list', 'Liste', [field('Type', seg([['none', 'Aucune'], ['bullet', 'Puces'], ['num', 'Numérotée']], o.kind, setKind)),
      o.kind !== 'none' ? [field('Repère', mkSel),
        o.kind === 'num' ? field('Commencer à', num('start', 0, 99, 1)) : null,
        h('div', { class: 'tx-two' }, field('Retrait (px)', num('indent', 9, 45, 3)), field('Entre éléments (px)', num('gap', 0, 24, 3))),
        h('div', { class: 'pp-switchrow' }, h('span', { textContent: 'Repère coloré (bleu)' }), sw(o.tint, on => { o.tint = on; redraw(); }))] : null,
      hint('Une carte complète dans le panneau : tout se règle, y compris le numéro de départ (utile pour continuer une liste coupée par un graphique). Tab / Maj + Tab : niveau de liste.')]);
  }
  return frame(h('div', { class: 'tx-pagewrap' }, h('div', { class: 'tx-cap', textContent: 'Aperçu' }), h('div', { class: 'tx-page small' }, h('div', { class: 'tx-p', style: cssOf({ st: 'h2' }) }, 'Trois priorités'), h('div', { class: 'tx-p', style: cssOf({ st: 'body' }) }, live))), h('aside', { class: 'tx-panel' + (o.open ? ' rel' : '') }, panel));
}

/* =====================================================================
   5. BARRE DE TEXTE — gagner de la place (hauteurs mesurées)
   ===================================================================== */
let heights = null;
function measure() {
  if (heights) return heights;
  const probe = h('div', { class: 'tx', style: { position: 'absolute', left: '-9999px', top: 0, visibility: 'hidden' } }); document.body.append(probe);
  heights = {};
  ['a', 'b', 'c'].forEach(V => { const n = barPanel(V, { paras: [{ st: 'body', t: 'Depuis 2021, l’Union finance des équipements et des formations pour ses partenaires.' }], sel: 0 }, true); probe.replaceChildren(n); heights[V] = Math.round(n.getBoundingClientRect().height); });
  probe.remove(); return heights;
}
function barPanel(V, o, bare) {
  const body = V === 'a' ? richMock(o) : V === 'b' ? richMock(o, { compact: true, burger: true }) : richMock(o, { noBar: true, compact: true });
  const n = h('aside', { class: 'tx-panel' }, card('typography', 'Texte', [body]));
  return bare ? n : n;
}
export function renderBar(o, v, repaint) {
  const V = v.style, H = measure(), cur = H[V];
  const oo = { paras: [{ st: 'body', t: 'Depuis 2021, l’Union finance des équipements et des formations pour ses partenaires.' }], sel: 0 };
  const floating = V === 'c' ? h('div', { class: 'tx-float' }, ['B', 'I', 'U'].map(l => h('button', { type: 'button', class: 'tx-tb' + (l === 'B' ? ' on' : '') }, h(l === 'B' ? 'b' : l === 'I' ? 'i' : 'u', {}, l))), h('span', { class: 'tx-vr' }), ic('list'), ic('list-numbers'), h('span', { class: 'tx-vr' }), ic('menu-2')) : null;
  const para = h('div', { class: 'tx-page small' }, h('div', { class: 'tx-p', style: cssOf({ st: 'h2' }) }, 'Trois priorités'),
    h('div', { class: 'tx-blk' }, floating, h('div', { class: 'tx-p', style: cssOf({ st: 'body' }) }, 'Depuis 2021, l’Union finance des ', h('mark', {}, 'équipements et des formations'), ' pour ses partenaires.')));
  const rows = [['a', 'Actuelle'], ['b', 'Compacte'], ['c', 'Volante']].map(([k, l]) => h('div', { class: 'tx-m' + (k === V ? ' on' : '') }, h('span', { textContent: l }), h('b', { textContent: H[k] + ' px' }), k === 'a' ? h('em', { textContent: 'référence' }) : h('em', { textContent: `−${Math.round((1 - H[k] / H.a) * 100)} %` })));
  return frame(h('div', { class: 'tx-pagewrap' }, h('div', { class: 'tx-cap', textContent: 'Hauteur occupée par la carte « Texte » (mesurée)' }), h('div', { class: 'tx-meter' }, rows), para), barPanel(V, oo));
}

/* =====================================================================
   6. PISTES À AJOUTER
   ===================================================================== */
const S = 'font-size:10pt;line-height:15px;margin:0';
const IDEAS = {
  a: [
    { id: 'justify', icon: 'align-justified', t: 'Justifié + césure', d: 'Alignement justifié avec coupure des mots (français) : colonnes étroites sans « rivières ».', c: 'S', pdf: true, ex: `<p lang="fr" style="${S};text-align:justify;hyphens:auto">Les opérations civiles et militaires financées par l’enveloppe sont contrôlées chaque année par le Conseil.</p>` },
    { id: 'indent', icon: 'indent-increase', t: 'Retrait de première ligne', d: 'Pour les textes longs ; remplace l’espace entre paragraphes.', c: 'S', pdf: true, ex: `<p style="${S};text-indent:18px">Depuis 2021, l’Union finance des équipements.<br>Le contrôle est annuel.</p>` },
    { id: 'quote', icon: 'quote', t: 'Citation à filet', d: 'Filet vertical de la couleur d’accent à gauche d’une citation ; style « Citation » du catalogue.', c: 'S', pdf: true, ex: `<p style="${S};border-left:2px solid var(--c-blue);padding-left:9px;font-style:italic;font-size:12pt;line-height:21px">« Une affaire de confiance. »</p>` },
    { id: 'drop', icon: 'letter-a', t: 'Lettrine', d: 'Première lettre agrandie sur deux ou trois lignes, pour ouvrir un texte.', c: 'M', pdf: false, ex: `<p style="${S}"><span style="float:left;font:700 30pt/30px 'Source Serif 4',serif;margin:2px 5px 0 0;color:var(--c-blue)">D</span>epuis 2021, l’Union finance des équipements et des formations pour ses partenaires.</p>` },
    { id: 'rule', icon: 'separator', t: 'Filet avant / après', d: 'Un filet de 0,5 pt au-dessus d’un titre ou sous une source.', c: 'S', pdf: true, ex: `<div style="border-top:.5pt solid var(--c-blue);padding-top:6px;${S};font-weight:700">Trois priorités</div>` },
    { id: 'cols', icon: 'columns-2', t: 'Texte sur 2 colonnes', d: 'Un long texte réparti sur deux colonnes dans une seule colonne de grille.', c: 'M', pdf: false, ex: `<p style="${S};column-count:2;column-gap:12px">Depuis 2021, l’Union finance des équipements et des formations pour ses partenaires, de l’Ukraine à l’Afrique.</p>` },
  ],
  b: [
    { id: 'color', icon: 'palette', t: 'Couleur du texte', d: 'Une couleur de la palette du document pour un mot ou une phrase (pas seulement le bloc).', c: 'M', pdf: true, ex: `<p style="${S}">Le chiffre à retenir : <b style="color:var(--c-blue)">+ 64 %</b> en trois ans.</p>` },
    { id: 'mark', icon: 'highlight', t: 'Surlignage', d: 'Fond de teinte (20 % de la couleur) derrière une expression.', c: 'M', pdf: true, ex: `<p style="${S}">À <span style="background:var(--c-tint-sky);padding:0 2px">retenir absolument</span> pour la suite.</p>` },
    { id: 'caps', icon: 'letter-case-upper', t: 'Capitales / petites capitales', d: 'Casse au choix pour une sélection : MAJUSCULES, petites capitales.', c: 'S', pdf: true, ex: `<p style="${S}">Union européenne — <span style="font-variant:small-caps;font-size:11pt">Union européenne</span></p>` },
    { id: 'strike', icon: 'strikethrough', t: 'Barré', d: 'Texte barré (valeur remplacée, ancienne version).', c: 'S', pdf: true, ex: `<p style="${S}"><s>2023</s> 2024</p>` },
    { id: 'nums', icon: 'numbers', t: 'Chiffres tabulaires', d: 'Chiffres de même largeur pour aligner des colonnes de nombres ; ou chiffres elzéviriens dans le texte.', c: 'S', pdf: true, ex: `<p style="${S};font-variant-numeric:tabular-nums">1 111<br>8 888<br>2 024</p>` },
    { id: 'lig', icon: 'ligature', t: 'Ligatures', d: 'Activer ou couper fi, fl, ff (utile dans les titres au tracking élargi).', c: 'S', pdf: false, ex: `<p style="${S};font-size:14pt">fi fl ff <span style="font-variant-ligatures:none">fi fl ff</span></p>` },
    { id: 'link', icon: 'link', t: 'Lien', d: 'Texte cliquable (souligné, couleur d’accent), conservé dans le PDF.', c: 'M', pdf: false, ex: `<p style="${S}">Voir <u style="color:var(--c-blue)">eeas.europa.eu</u></p>` },
    { id: 'ord', icon: 'superscript', t: 'Ordinaux et fractions', d: '1ᵉʳ, 2ᵉ, ½ : mise en forme typographique automatique.', c: 'S', pdf: true, ex: `<p style="${S}">1<sup>er</sup> janvier · 2<sup>e</sup> trimestre · ½</p>` },
  ],
  c: [
    { id: 'fr', icon: 'language', t: 'Typographie française automatique', d: 'Espace insécable fine avant ; : ! ? et %, guillemets « » avec espaces : plus de « : » seul en début de ligne.', c: 'S', pdf: true, ex: `<p style="${S}">Résultat : 64 % de « oui » !</p>` },
    { id: 'wrap', icon: 'text-wrap', t: 'Veuves, orphelines, titres équilibrés', d: 'Pas de mot seul sur la dernière ligne ; titres répartis également sur leurs lignes.', c: 'S', pdf: true, ex: `<p style="${S};font-weight:700;font-size:14pt;line-height:21px;text-wrap:balance">La Facilité européenne pour la paix</p>` },
    { id: 'styles', icon: 'typography', t: 'Styles du document modifiables', d: 'Changer « Texte » ou « Source » une fois pour tous les paragraphes (comme dans InDesign) ; réglages avancés mémorisés par style.', c: 'L', pdf: true, ex: `<p style="${S}">Texte <b>12/15,75</b> → <b>11/15</b> partout</p>` },
    { id: 'fit', icon: 'arrows-minimize', t: 'Ajuster le texte au cadre', d: 'Réduit le corps (de 0,5 pt en 0,5 pt, jusqu’à une limite) pour que le texte tienne : l’« optimisation de l’espace ».', c: 'M', pdf: true, ex: `<p style="${S}">Débordement → <b>12 pt</b> devient <b>11,5 pt</b></p>` },
    { id: 'footnote', icon: 'asterisk', t: 'Appels de note et sources numérotées', d: 'Exposant numéroté dans le texte, note correspondante en bas de page (style « Note »).', c: 'L', pdf: true, ex: `<p style="${S}">Selon le Conseil<sup>1</sup>…<br><span style="font-size:8pt;line-height:12px">1. Conseil de l’UE, 2024.</span></p>` },
    { id: 'find', icon: 'replace', t: 'Rechercher / remplacer', d: 'Dans tout le document, avec respect de la casse en option.', c: 'M', pdf: true, ex: `<p style="${S}">« FEP » → « Facilité européenne pour la paix »</p>` },
    { id: 'count', icon: 'abc', t: 'Compteur de caractères', d: 'Nombre de caractères et de mots sous chaque bloc ; limite indicative par type de bloc.', c: 'S', pdf: true, ex: `<p style="${S}">212 caractères · 34 mots</p>` },
  ],
};
export function renderIdeas(o, v, repaint) {
  const items = IDEAS[v.style], n = Object.values(o.keep).filter(Boolean).length;
  const lab = { S: 'Rapide', M: 'Moyen', L: 'Gros chantier' };
  return h('div', { class: 'tx-ideas' }, h('div', { class: 'tx-sum' }, ic('checklist'), h('b', { textContent: `${n} retenue${n > 1 ? 's' : ''}` }), h('span', { textContent: 'Activer l’interrupteur pour celles que vous voulez ; le choix reste dans ce navigateur seulement le temps de la visite.' })),
    h('div', { class: 'tx-igrid' }, items.map(it => h('article', { class: 'tx-idea' + (o.keep[it.id] ? ' on' : '') },
      h('div', { class: 'tx-ih' }, ic(it.icon), h('b', { textContent: it.t }), h('span', { class: 'pp-sp' }), sw(o.keep[it.id], on => { o.keep[it.id] = on; repaint(); })),
      h('p', { class: 'tx-id', textContent: it.d }),
      h('div', { class: 'tx-ex', innerHTML: it.ex }),
      h('div', { class: 'tx-tags' }, h('span', { class: 'tag c' + it.c, textContent: lab[it.c] }), h('span', { class: 'tag ' + (it.pdf ? 'ok' : 'warn'), textContent: it.pdf ? 'Export PDF : prévu' : 'Export PDF : à adapter' }))))));
}
