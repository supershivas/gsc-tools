/* Éditeur de dataviz : sous-app plein écran, commune à tous les types.
   - formulaire généré depuis `fields` du type + `actions` optionnelles
   - aperçu à la largeur réelle de la colonne (ou d'un autre gabarit pour tester)
   - interactions à la souris si le type exporte `edit.start(hit, opts, meta, api, pt)` ;
     le rendu pose des `data-hit="kind:index"` sur les éléments saisissables. */
import { h, ico } from './render.js';
import { HAS_PREFIX } from './textstyles.js';
import { openPalette } from './palette.js';
import { buildFields, paletteOptions, richEditor, linkButton, getP, setP } from './editor.js';
import { colWidth, subColWidth, cssVars, applyVars, paletteOf, densityGaps } from './tokens.js';
import { renderCtx } from './renderctx.js';
import { ctxIcons } from './viz/icons.js';
import { VIZ_TYPES, VIZ_FAMILIES, switchKind, renderVizFull } from './viz/index.js';
import { cardEl, searchBox, applyFilter } from './cards.js';
import { helpBtn } from './help.js';
import { loadFonts, typoOf, stripMk } from './viz/util.js';
import { confirmBox } from './dialogs.js';
import { startReorder } from './vizreorder.js';
import { newSide, SIDE_FIELDS } from './viz/index.js';
import { gridEditor, tableAdapter, recordsAdapter } from './vizdata.js';
import { t } from './i18n.js';
import { openVizExport } from './vizexport.js';
import { CARDS, groupOf, fieldsOf, subsections, SUBS } from './vizgroups.js';

const tr = t; // `t` est masqué par des variables locales (type de dataviz) dans `draw`

let current = null;
const shut = new Set(); // cartes repliées (gardées d'une ouverture à l'autre)
let tab = 'data';
shut.add('dv-type'); // la carte du type est repliée à la première ouverture ; `tab` : 'data' (Données) ou 'viz' (Visualisation)
const accs = {}, // accordéon par type de dataviz : { cur, first } (la dernière carte ouverte est gardée d'une ouverture à l'autre)
  search = { q: '', focus: false };
const MARKUP = new RegExp('\\*\\*|~~|__|\\^\\^|,,|' + HAS_PREFIX.source); // accordéon : une seule carte ouverte dans le panneau

const SERIES_COLORS = ['sky', 'yellow', 'blue', 'slate', 'grey'];
let clip = null, // réglages copiés (gardés tant que la page reste ouverte)
  pasteMsg = '';
let availH = 360; // place disponible simulée dans l'aperçu (mode « Remplir »)

/** Petite fenêtre de choix de couleur à l'endroit du clic : pastilles de la palette du document ; « toute la série » (au lieu du seul élément) et « couleur de la série » (retire la surcharge) */
function openColorPop(host, x, y, cur, options, { series, onPick, onReset }) {
  document.querySelectorAll('.cpop').forEach((n) => n.remove());
  let whole = false;
  const away = (e) => {
      if (!pop.contains(e.target)) close();
    },
    close = () => {
      pop.remove();
      document.removeEventListener('pointerdown', away, true);
    };
  const foot = series
    ? [
        h(
          'button',
          {
            type: 'button',
            class: 'cpop-act',
            onclick: (e) => {
              whole = !whole;
              e.currentTarget.classList.toggle('on', whole);
            },
          },
          ico('layers-subtract'),
          h('span', { textContent: t('Toute la série') }),
        ),
        h(
          'button',
          {
            type: 'button',
            class: 'cpop-act',
            onclick: () => {
              close();
              onReset();
            },
          },
          ico('arrow-back-up'),
          h('span', { textContent: t('Couleur de la série') }),
        ),
      ]
    : [];
  const pop = h(
    'div',
    { class: 'cpop', role: 'listbox' },
    ...Object.entries(options).map(([k, l]) =>
      h(
        'button',
        {
          type: 'button',
          role: 'option',
          class: 'cpop-sw' + (k === cur ? ' on' : ''),
          title: l,
          'aria-label': l,
          onclick: () => {
            close();
            onPick(k, whole);
          },
        },
        h('i', { class: 'cs-dot', style: { background: `var(--c-${k})` } }),
      ),
    ),
    ...foot,
  );
  host.append(pop);
  const r = pop.getBoundingClientRect();
  Object.assign(pop.style, {
    left: Math.max(8, Math.min(window.innerWidth - r.width - 8, x + 8)) + 'px',
    top: Math.max(8, Math.min(window.innerHeight - r.height - 8, y + 8)) + 'px',
  });
  setTimeout(() => document.addEventListener('pointerdown', away, true), 0);
}

const getPath = (o, p) => p.reduce((q, k) => (q == null ? q : q[k]), o);
const setPath = (o, p, v) => {
  let q = o;
  p.slice(0, -1).forEach((k, i) => {
    if (q[k] == null) q[k] = /^\d+$/.test(p[i + 1]) && p[i] !== 'colors' ? [] : {};
    q = q[k];
  });
  q[p[p.length - 1]] = v;
};
const delPath = (o, p) => {
  const q = getPath(o, p.slice(0, -1));
  if (q) delete q[p[p.length - 1]];
};

export function openVizEditor({ col, sub, ci, bg, width: colW, ctx, fileStem }) {
  if (current) return;
  const doc = ctx.getDoc();
  const snapshot = JSON.stringify(col.viz);
  const gutter = densityGaps(doc.density).columns;
  const baseW = colW || subColWidth(sub, ci, gutter);
  const ui = { sel: -1, drag: null };
  let width = baseW,
    zoom = 'fit',
    meta = null,
    svgW = baseW;

  const root = h('div', { class: 've', role: 'dialog', 'aria-modal': 'true', 'aria-label': t('Éditeur de dataviz'), tabindex: -1 });
  applyVars(root, cssVars(doc.theme, doc.colors, doc.density));
  const sheet = h('div', { class: 'page viz-sheet', style: { background: bg && bg !== 'none' ? `var(--c-${bg})` : '#fff' } });
  const holder = h('div', { class: 'col col-viz' });
  sheet.append(holder);
  const scaler = h('div', { class: 've-scaler' }, sheet);
  const stage = h('div', { class: 've-stage', id: 've-stage' }, scaler);
  const dataPane = h('div', { class: 've-data', id: 've-data-pane' }),
    miniHold = h('div', { class: 've-mini' });
  const form = h('aside', { class: 'panel ve-form' });
  const hint = h('div', { class: 've-hint' });
  const body = h('div', { class: 've-body' }),
    main = h('div', { class: 've-main' });
  const tabBtns = [
    ['data', 'table', 'Données'],
    ['viz', 'adjustments', 'Visualisation'],
  ].map(([k, ic, l]) =>
    h(
      'button',
      {
        type: 'button',
        class: 've-tab',
        role: 'tab',
        'aria-controls': k === 'data' ? 've-data-pane' : 've-stage',
        dataset: { tab: k },
        onclick: () => {
          tab = k;
          buildForm();
          draw();
        },
      },
      ico(ic),
      h('span', { textContent: t(l) }),
    ),
  );
  const tabs = h(
    'div',
    {
      class: 've-tabs',
      role: 'tablist',
      'aria-label': t('Éditeur de dataviz'),
      onkeydown: (e) => {
        const i = tabBtns.findIndex((b) => b === document.activeElement),
          d = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
        if (i < 0 || !d) return;
        e.preventDefault();
        const b = tabBtns[(i + d + tabBtns.length) % tabBtns.length];
        b.focus();
        b.click();
      },
    },
    ...tabBtns,
  );
  const syncTabs = (hasData) => {
    tabs.style.display = hasData ? '' : 'none';
    tabBtns.forEach((b) => {
      const on = b.dataset.tab === tab;
      b.classList.toggle('on', on);
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1; // un seul arrêt de Tab pour la liste d'onglets, flèches pour changer
    });
  };

  /* ----- rendu ----- */
  function scale() {
    if (zoom !== 'fit') return parseFloat(zoom);
    /* « Ajuster » : la feuille tient en entier dans la zone (largeur ET hauteur), donc ni défilement ni rognage */
    if (stage.clientHeight < 50) return 1;
    const cs = getComputedStyle(stage),
      aw = stage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight),
      ah = stage.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    return Math.max(0.1, Math.min(2, aw / (width + 48), ah / Math.max(1, sheet.offsetHeight)));
  }
  function draw() {
    const r = renderVizFull(col.viz, width, {
      locale: doc.locale || 'en-GB',
      ui,
      pal: paletteOf(doc.theme, doc.colors),
      fillH: availH,
      rc: renderCtx(doc),
    });
    holder.innerHTML = '';
    if (r && r.node) {
      holder.append(r.node);
      meta = r.meta || null;
      svgW = width;
    }
    hiliteSel();
    if (miniHold.isConnected) drawMini();
    const t = VIZ_TYPES[col.viz.kind];
    const hintMsg = holder.querySelector('[data-reorder]')
      ? 'Glisser un élément pour changer son ordre : les autres se réajustent en gardant des écarts proportionnels.'
      : t && t.edit
        ? 'Cliquer un segment ou un libellé pour le sélectionner · glisser l’anneau pour le tourner · glisser un libellé (verticalement, ou de l’autre côté) · glisser le point blanc pour déplacer l’ancrage du trait'
        : '';
    hint.textContent = hintMsg && tr(hintMsg);
    sheet.style.width = width + 48 + 'px';
    holder.style.width = width + 'px';
    stage.classList.toggle('fit', zoom === 'fit');
    const k = scale();
    scaler.style.transform = `scale(${k})`;
    scaler.style.marginBottom = sheet.offsetHeight * (k - 1) + 'px';
    scaler.style.marginRight = (width + 48) * (k - 1) + 'px';
  }
  /* Aperçu réduit du panneau de l'onglet Données : la dataviz à la largeur choisie, mise à l'échelle du panneau */
  function drawMini() {
    const r = renderVizFull(col.viz, width, {
      locale: doc.locale || 'en-GB',
      pal: paletteOf(doc.theme, doc.colors),
      fillH: availH,
      rc: renderCtx(doc),
    });
    miniHold.innerHTML = '';
    if (!r || !r.node) return;
    const k = Math.min(1, 270 / (width + 48)),
      box = h(
        'div',
        {
          class: 'page viz-sheet ve-mini-sheet',
          style: {
            width: width + 48 + 'px',
            transform: `scale(${k})`,
            transformOrigin: '0 0',
            background: bg && bg !== 'none' ? `var(--c-${bg})` : '#fff',
          },
        },
        h('div', { class: 'col col-viz', style: { width: width + 'px' } }, r.node),
      );
    miniHold.append(h('div', { class: 've-mini-box' }, box));
    requestAnimationFrame(() => {
      miniHold.firstChild.style.height = Math.ceil(box.offsetHeight * k) + 'px';
    });
  }
  /* Historique propre à l'éditeur : chaque changement de type (ou autre restructuration) est un pas à part, la frappe est regroupée sur 1 s */
  const hist = { s: [snapshot], i: 0, at: 0, burst: false };
  const rec = (burst) => {
    const sn = JSON.stringify(col.viz);
    if (sn === hist.s[hist.i]) return;
    const now = Date.now();
    if (burst && hist.burst && hist.i === hist.s.length - 1 && hist.i > 0 && now - hist.at < 1000) hist.s[hist.i] = sn;
    else {
      hist.s.length = hist.i + 1;
      hist.s.push(sn);
      hist.i = hist.s.length - 1;
      if (hist.s.length > 100) {
        hist.s.shift();
        hist.i--;
      }
    }
    hist.at = now;
    hist.burst = burst;
  };
  const syncHist = () => {
    undoBtn.disabled = hist.i <= 0;
    redoBtn.disabled = hist.i >= hist.s.length - 1;
  };
  const goHist = (i) => {
    if (i < 0 || i >= hist.s.length) return;
    hist.i = i;
    hist.burst = false;
    col.viz = JSON.parse(hist.s[i]);
    ui.sel = -1;
    buildForm();
    draw();
    ctx.changed();
    syncHist();
  };
  const changed = () => {
    resetUps.forEach((f) => f());
    draw();
    rec(true);
    ctx.changed();
    syncHist();
  };

  /* ----- formulaire ----- */
  const fctx = {
    getDoc: ctx.getDoc,
    changed,
    restructure: () => {
      buildForm();
      draw();
      rec(false);
      ctx.changed();
      syncHist();
    },
  };
  /* La fenêtre des couleurs agit sur le document : l'éditeur se redessine avec les nouvelles couleurs */
  const palCtx = {
    getDoc: ctx.getDoc,
    changed: () => {
      applyVars(root, cssVars(doc.theme, doc.colors, doc.density));
      draw();
      ctx.changed();
    },
    restructure: () => {
      applyVars(root, cssVars(doc.theme, doc.colors, doc.density));
      buildForm();
      draw();
    },
  };
  const refreshForm = () => buildForm();
  const card = (id, icon, name, nodes, sum, headExtra) =>
    cardEl(id, icon, name, nodes, { shut, refresh: refreshForm, acc: accs[col.viz.kind], sum, q: search.q, headExtra });

  /* ----- confort (audit lot 6) : rétablir une carte, copier / coller les réglages ----- */
  const SETTINGS_G = new Set(['struct', 'dims', 'axes', 'labels', 'colors', 'bracket']);
  const settingsOf = (ty) => (ty.fields || []).filter((f) => f.k && f.t !== 'node' && SETTINGS_G.has(groupOf(f)));
  /** champs d'une carte dont la valeur a quitté la valeur d'origine : [{ obj, f, v }] (valeur d'origine = réglages par défaut du type) */
  const changedIn = (list, obj, dflt) =>
    list
      .map((f) => [f, f.def ?? dflt[f.k]])
      .filter(([f, d]) => d !== undefined && getP(obj, f.k) !== undefined && String(getP(obj, f.k)) !== String(d))
      .map(([f, d]) => ({ obj, f, v: d }));
  /* bouton de l'en-tête : masqué tant que rien n'a changé, mis à jour à chaque modification sans reconstruire le panneau */
  const resetUps = [];
  const resetCard = (name, list, obj, dflt) => {
    const mods = () => changedIn(list, obj, dflt);
    const b = h(
      'button',
      {
        type: 'button',
        class: 'mini pp-reset pp-reset-card',
        title: `${t('Rétablir la carte')} · ${name}`,
        'aria-label': `${t('Rétablir la carte')} · ${name}`,
        onclick: () => {
          mods().forEach(({ obj: o, f, v }) => setP(o, f.k, v));
          fctx.restructure();
        },
      },
      ico('rotate-2'),
    );
    const upd = () => (b.hidden = !mods().length);
    upd();
    resetUps.push(upd);
    return b;
  };
  const valid = (f, v) => {
    if (f.t === 'select' && f.options && typeof f.options === 'object') return String(v) in f.options;
    if (f.t === 'number') return typeof v === 'number' && (f.min == null || v >= f.min) && (f.max == null || v <= f.max);
    if (f.t === 'bool') return typeof v === 'boolean';
    return typeof v === 'string' || typeof v === 'number';
  };
  const copySettings = () => {
    const ty = VIZ_TYPES[col.viz.kind],
      values = {};
    settingsOf(ty).forEach((f) => {
      const v = getP(col.viz.opts, f.k);
      if (v !== undefined) values[f.k] = v;
    });
    clip = { kind: col.viz.kind, label: ty.label, values, side: { ...(col.viz.side || {}) } };
    pasteMsg = `${t('Réglages copiés')} · ${Object.keys(values).length}`;
    buildForm();
  };
  /* Rétablir l'aspect d'origine : chaque réglage d'apparence revient à sa valeur d'origine (`def`, sinon `defaults()` du type) ;
     les données et les textes saisis (titres d'axes, unité) ne bougent pas ; un seul pas d'historique */
  const resetLook = () => {
    const ty = VIZ_TYPES[col.viz.kind],
      dflt = ty.defaults ? ty.defaults() : {},
      list = settingsOf(ty).filter((f) => !['text', 'area', 'lines'].includes(f.t));
    const mods = changedIn(list, col.viz.opts, dflt);
    mods.forEach(({ obj, f, v }) => setP(obj, f.k, v));
    pasteMsg = `${t('Aspect d’origine rétabli')} · ${mods.length}`;
    fctx.restructure();
  };
  const pasteSettings = () => {
    if (!clip) return;
    const ty = VIZ_TYPES[col.viz.kind];
    let n = 0;
    settingsOf(ty).forEach((f) => {
      if (f.k in clip.values && valid(f, clip.values[f.k])) {
        setP(col.viz.opts, f.k, clip.values[f.k]);
        n++;
      }
    });
    const side = col.viz.side || (col.viz.side = newSide(col.viz.kind));
    SIDE_FIELDS.forEach((f) => {
      if (f.k in clip.side && valid(f, clip.side[f.k])) {
        side[f.k] = clip.side[f.k];
        n++;
      }
    });
    pasteMsg = `${t('Réglages collés')} · ${n}`;
    fctx.restructure();
  };
  /* Titre et source : un champ simple par défaut (une ligne) ; l'éditeur riche (gras, styles de paragraphe…) s'ouvre avec le bouton, ou d'office si le texte est déjà mis en forme */
  const softField = (obj, k, label, opts) => {
    const box = h('div', { class: 'f' }),
      val = () => obj[k] || '';
    let rich = MARKUP.test(val()) || val().includes('\n');
    const draw = () =>
      box.replaceChildren(
        h(
          'div',
          { class: 'hint pp-fh' },
          label,
          helpBtn(label),
          h('span', { class: 'pp-sp' }),
          rich ? null : linkButton(() => box.querySelector('input')),
          h(
            'button',
            {
              type: 'button',
              class: 'mini' + (rich ? ' on' : ''),
              title: t('Mise en forme'),
              'aria-label': t('Mise en forme'),
              'aria-pressed': String(rich),
              onclick: () => {
                rich = !rich;
                draw();
              },
            },
            ico('typography'),
          ),
        ),
        rich
          ? richEditor(
              val(),
              (v) => {
                obj[k] = v;
                fctx.changed();
              },
              { ...opts, typo: typoOf(doc) },
            )
          : h('input', {
              type: 'text',
              value: val(),
              oninput: (e) => {
                obj[k] = e.target.value;
                fctx.changed();
              },
            }),
      );
    draw();
    return box;
  };
  /* Choix du type : sa propre carte repliable en tête de colonne, dont l'en-tête affiche le type courant (icône + nom) ;
     repliée par défaut et après chaque choix, pour ne pas alourdir la page */
  const typeCard = () => {
    const cur = VIZ_TYPES[col.viz.kind],
      list = h('div', { class: 've-typelist', role: 'listbox' });
    for (const [fk, fl] of Object.entries(VIZ_FAMILIES)) {
      const items = Object.entries(VIZ_TYPES).filter(([, v]) => v.family === fk);
      if (!items.length) continue;
      list.append(
        h('div', { class: 've-typefam', textContent: t(fl) }),
        ...items.map(([k, v]) =>
          h(
            'button',
            {
              type: 'button',
              role: 'option',
              class: 've-typeopt' + (col.viz.kind === k ? ' on' : ''),
              'aria-selected': String(col.viz.kind === k),
              onclick: () => {
                shut.add('dv-type');
                if (col.viz.kind !== k) {
                  col.viz = switchKind(col.viz, k);
                  ui.sel = -1;
                  fctx.restructure();
                } else buildForm();
              },
            },
            ico(v.icon || 'chart-bar'),
            h('span', { textContent: t(v.label) }),
          ),
        ),
      );
    }
    const el = cardEl('dv-type', cur.icon || 'chart-bar', `${t('Type')} · ${t(cur.label)}`, [list], { shut, refresh: refreshForm });
    el.classList.add('ve-typecard');
    return el;
  };
  /* Résumés des cartes repliées : le titre lui-même (première ligne, sans balisage), la position du chiffre à côté */
  const headSummary = (hd) => {
    const first = String(hd.title || hd.source || '')
      .split('\n')[0]
      .replace(/^(#{1,5}|@\w+)\s+/, '');
    return stripMk(first).trim() || t('Aucun');
  };
  const sideSummary = (sd) => {
    const pos = SIDE_FIELDS[0].options[sd && sd.pos];
    return !pos || sd.pos === 'none' ? t('Aucun') : sd.pos === 'top' ? t(pos) : `${t(pos)} · ${sd.share} %`;
  };
  function buildForm() {
    const top = form.scrollTop;
    form.innerHTML = '';
    dataPane.innerHTML = '';
    resetUps.length = 0;
    const ty = VIZ_TYPES[col.viz.kind],
      fields = ty.fields || [],
      F = (g) => fieldsOf(fields, g);
    const head = col.viz.head || (col.viz.head = { title: '', source: '' });
    const dataFields = F('data'),
      hasData = !!ty.data || dataFields.length > 0;
    if (!hasData) tab = 'viz';
    syncTabs(hasData);
    main.classList.toggle('is-data', tab === 'data');
    /* ↺ : valeur d'origine = celle des réglages par défaut du type (`reset`, jamais lue pour l'affichage) */
    const dflt = ty.defaults ? ty.defaults() : {};
    const gen = (list) =>
      buildFields(
        list.map((f) => (f.k && f.def === undefined && f.t !== 'text' && dflt[f.k] !== undefined ? { ...f, reset: dflt[f.k] } : f)),
        col.viz.opts,
        fctx,
        paletteOptions(doc),
        h,
      );
    if (tab === 'data') {
      const nodes = [];
      for (const f of dataFields) {
        if (f.t === 'table')
          nodes.push(
            gridEditor(tableAdapter(f, col.viz.opts, paletteOptions(doc), SERIES_COLORS, ctxIcons(fctx)), fctx, {
              downloadName: col.viz.kind,
            }),
          );
        else nodes.push(...gen([f]));
      }
      if (ty.data)
        nodes.push(
          gridEditor(recordsAdapter(ty.data, col.viz.opts, paletteOptions(doc), ctxIcons(fctx)), fctx, { downloadName: col.viz.kind }),
          ty.dataHint ? h('p', { class: 'hint', textContent: t(ty.dataHint) }) : null,
        );
      dataPane.append(
        h(
          'div',
          { class: 've-data-in' },
          h('h3', {}, ico('table'), h('span', { textContent: t('Données') })),
          ...nodes.flat().filter(Boolean),
        ),
      );
      form.append(
        h('div', { class: 've-sech', textContent: t('Aperçu') }),
        miniHold,
        h(
          'button',
          {
            type: 'button',
            class: 'pp-btn',
            onclick: () => {
              tab = 'viz';
              buildForm();
              draw();
            },
          },
          ico('chart-line'),
          h('span', { textContent: t('Retour à l’aperçu') }),
        ),
      );
      drawMini();
    } else {
      /* squelette fixe : une carte sans contenu est masquée, jamais déplacée (docs/architecture.md) */
      const has = { 'dv-struct': F('struct').length > 0 || !!ty.actions };
      for (const c of CARDS) if (c.g !== 'struct') has[c.id] = c.g === 'colors' || F(c.g).length > 0;
      const ids = ['dv-head', ty.panel && 'dv-picto', ...CARDS.map((c) => c.id).filter((id) => has[id]), 'dv-side', 'dv-debug'].filter(
        Boolean,
      );
      const acc = (accs[col.viz.kind] ||= { cur: null, first: null });
      acc.first = has['dv-struct'] ? 'dv-struct' : 'dv-labels'; // ouverte au départ : Structure, sinon Étiquettes
      if (acc.cur && !ids.includes(acc.cur)) acc.cur = null;
      /* contenu d'une carte : ses champs dans l'ordre de FIELD_ORDER ; les actions de l'anneau terminent Structure, le bouton des couleurs du document termine Couleurs */
      const actions = () =>
        ty.actions
          ? h(
              'div',
              { class: 'pp-actions' },
              ty.actions.map((a) =>
                h('button', {
                  type: 'button',
                  class: 'pp-btn',
                  textContent: a.label,
                  title: a.title || '',
                  onclick: () => {
                    a.run(col.viz.opts);
                    ui.sel = -1;
                    fctx.restructure();
                  },
                }),
              ),
            )
          : null;
      const paletteBtn = () =>
        h(
          'button',
          { type: 'button', class: 'pp-btn', onclick: (e) => openPalette(e.currentTarget, palCtx) },
          ico('palette'),
          h('span', { textContent: t('Couleurs du document') }),
        );
      /* cartes denses : sous-sections (titre + filet, `role="group"`), les actions de l'anneau terminent la dernière */
      let subSeq = 0;
      const cardNodes = (g) => {
        const extra = g === 'struct' ? actions() : g === 'colors' ? paletteBtn() : null;
        const groups = subsections(F(g), g === 'struct' && ty.actions ? ty.actions.length : 0);
        if (groups.length === 1 && !groups[0].s) return [...gen(groups[0].fields), extra];
        const boxes = groups.map(({ s, fields: fs }, i) => {
          const id = 'dvs' + ++subSeq;
          const body = gen(fs);
          if (i === groups.length - 1 && extra) body.push(extra);
          return h(
            'div',
            { class: 'pp-subgroup', role: s ? 'group' : null, 'aria-labelledby': s ? id : null },
            s ? h('div', { class: 'pp-sub', id, textContent: t(SUBS[s]) }) : null,
            ...body,
          );
        });
        return boxes;
      };
      form.append(
        searchBox(search, refreshForm),
        typeCard(),
        ...[
          card(
            'dv-head',
            'typography',
            t('Titre et source'),
            [softField(head, 'title', 'Titre de la dataviz', {}), softField(head, 'source', 'Source de la dataviz', { bullets: false })],
            headSummary(head),
          ),
          ty.panel ? card('dv-picto', 'mood-smile', t(ty.panelTitle || 'Pictogramme'), ty.panel(col.viz.opts, fctx)) : null,
          ...CARDS.map((c) =>
            has[c.id] ? card(c.id, c.icon, t(c.name), cardNodes(c.g), '', resetCard(t(c.name), F(c.g), col.viz.opts, dflt)) : null,
          ),
          card(
            'dv-side',
            'number',
            t('Chiffre à côté'),
            buildFields(SIDE_FIELDS, col.viz.side || (col.viz.side = newSide(col.viz.kind)), fctx, {}, h),
            sideSummary(col.viz.side),
            resetCard(t('Chiffre à côté'), SIDE_FIELDS, col.viz.side, newSide(col.viz.kind)),
          ),
          card('dv-debug', 'bug', t('Réglages avancés'), [
            h('p', {
              class: 'hint',
              textContent: t(
                'Copie les réglages de cette dataviz (Structure, Dimensions, Axes et grille, Étiquettes, Couleurs, Accolade, Chiffre à côté) pour les coller dans une autre, même d’un autre type : seuls les réglages communs sont repris.',
              ),
            }),
            h(
              'div',
              { class: 'pp-actions' },
              h(
                'button',
                { type: 'button', class: 'pp-btn', onclick: copySettings },
                ico('copy'),
                h('span', { textContent: t('Copier les réglages') }),
              ),
              h(
                'button',
                { type: 'button', class: 'pp-btn', 'aria-disabled': String(!clip), onclick: pasteSettings },
                ico('clipboard'),
                h('span', { textContent: t('Coller les réglages') }),
              ),
            ),
            clip || pasteMsg
              ? h('p', { class: 'hint', role: 'status', textContent: pasteMsg || `${t('Réglages copiés depuis')} ${t(clip.label)}` })
              : null,
            h('p', {
              class: 'hint',
              textContent: t(
                'Remet tous les réglages d’apparence (Structure, Dimensions, Axes et grille, Étiquettes, Couleurs, Accolade) à leur valeur d’origine, sans toucher aux données ni aux textes saisis.',
              ),
            }),
            h(
              'button',
              { type: 'button', class: 'pp-btn', onclick: resetLook },
              ico('rotate-2'),
              h('span', { textContent: t('Rétablir l’aspect d’origine') }),
            ),
            h('p', {
              class: 'hint',
              textContent: t('Exporte la dataviz et les réglages du document (thème, couleurs, densité) pour le débogage.'),
            }),
            h(
              'button',
              { type: 'button', class: 'pp-btn', onclick: exportDebug },
              ico('download'),
              h('span', { textContent: t('Exporter pour le débogage (JSON)') }),
            ),
          ]),
        ].filter(Boolean),
      );
    }
    applyFilter(form, search);
    form.scrollTop = top;
  }
  /* Export image (PNG, JPG) ou SVG de la dataviz telle qu'elle est dessinée, sans les outils de l'éditeur (src/vizexport.js) */
  function exportViz() {
    openVizExport({
      root,
      viz: col.viz,
      doc,
      width,
      bgCss: bg && bg !== 'none' ? `var(--c-${bg})` : '#fff',
      render: (v) =>
        renderVizFull(v, width, {
          locale: doc.locale || 'en-GB',
          pal: paletteOf(doc.theme, doc.colors),
          fillH: availH,
          rc: renderCtx(doc),
        }),
      fileStem: fileStem || ((x) => 'dataviz' + (x || '')),
    });
  }
  /* Outil de débogage : la dataviz (`col.viz`) et les réglages qui influencent son rendu, dans un seul JSON */
  function exportDebug() {
    const dump = {
      format: 'factsheet-creator-dataviz-debug',
      exportedAt: new Date().toISOString(),
      kind: col.viz.kind,
      previewWidth: Math.round(width),
      settings: { locale: doc.locale, density: doc.density, theme: doc.theme, colors: doc.colors },
      viz: col.viz,
    };
    const a = h('a', {
      href: URL.createObjectURL(new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' })),
      download: (fileStem ? fileStem('_dataviz-' + col.viz.kind) : 'dataviz-' + col.viz.kind) + '.json',
    });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  const focusItem = (path) => {
    form.querySelectorAll('.col-card.sel').forEach((n) => n.classList.remove('sel'));
    const n = form.querySelector(`[data-path="${path}"]`);
    if (n) {
      n.classList.add('sel');
      n.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  };

  /* ----- interactions souris ----- */
  const api = {
    ui,
    select(i) {
      ui.sel = i;
      focusItem(`segments.${i}`);
    },
    redraw: changed,
  };
  let drag = null;
  const toPt = (e) => {
    const svg = holder.querySelector('svg');
    if (!svg) return { x: 0, y: 0 };
    const r = svg.getBoundingClientRect(),
      k = r.width / (+svg.getAttribute('width') || svgW) || 1;
    return { x: (e.clientX - r.left) / k, y: (e.clientY - r.top) / k };
  };
  /* Clic sur un élément (barre, segment, point…) : choisir sa couleur. Un glissement (réordonner, tourner) n'ouvre rien. */
  let suppressClick = false,
    dragMoved = false,
    down0 = null;
  const bases = new Map();
  const selEls = new Set(); // éléments choisis (chemins `data-color`) : Maj ou Cmd + clic pour en ajouter
  const hiliteSel = () =>
    holder.querySelectorAll('[data-color]').forEach((n) => {
      if (selEls.has(n.getAttribute('data-color'))) {
        n.setAttribute('stroke', '#F28C28');
        n.setAttribute('stroke-width', 2.4);
      }
    });
  const colorAt = (ev) => {
    const n = document.elementsFromPoint(ev.clientX, ev.clientY).find((x) => x.getAttribute && x.getAttribute('data-color'));
    if (!n) {
      if (selEls.size) {
        selEls.clear();
        draw();
      }
      return;
    }
    const path = n.getAttribute('data-color'),
      base = n.getAttribute('data-color-base');
    if (ev.shiftKey || ev.metaKey || ev.ctrlKey) {
      if (selEls.has(path)) selEls.delete(path);
      else selEls.add(path);
    } else {
      selEls.clear();
      selEls.add(path);
    }
    bases.set(path, base);
    draw();
    if (!selEls.size) return;
    const o = col.viz.opts,
      first = [...selEls][0].split('.');
    const cur = getPath(o, first) || (bases.get([...selEls][0]) && getPath(o, bases.get([...selEls][0]).split('.')));
    openColorPop(root, ev.clientX, ev.clientY, cur, paletteOptions(doc), {
      series: [...selEls].some((p) => bases.get(p)),
      onPick: (key, whole) => {
        selEls.forEach((p) => {
          const b = bases.get(p);
          if (whole && b) {
            setPath(o, b.split('.'), key);
            const j = p.split('.').pop();
            (o.rows || []).forEach((r) => {
              if (r.colors) delete r.colors[j];
            });
          } else setPath(o, p.split('.'), key);
        });
        fctx.restructure();
      },
      onReset: () => {
        selEls.forEach((p) => {
          if (bases.get(p)) delPath(o, p.split('.'));
        });
        fctx.restructure();
      },
    });
  };
  stage.addEventListener('click', (e) => {
    if (suppressClick) {
      suppressClick = false;
      return;
    }
    colorAt(e);
  });
  stage.addEventListener('pointerdown', (e) => {
    suppressClick = false;
    dragMoved = false;
    down0 = { x: e.clientX, y: e.clientY };
    /* réordonner à la souris (barres, lignes, frise, pictogrammes, liste) : voir vizreorder.js */
    const rn = e.target.closest && e.target.closest('[data-reorder]');
    if (
      rn &&
      e.button === 0 &&
      startReorder(e, rn, {
        opts: col.viz.opts,
        root: holder,
        redraw: draw,
        click: (ev) => {
          suppressClick = true;
          colorAt(ev);
        },
        done: (ch) => {
          if (ch) {
            suppressClick = true;
            changed();
          } else draw();
        },
      })
    )
      return;
    const t = VIZ_TYPES[col.viz.kind];
    const n = e.target.closest && e.target.closest('[data-hit]');
    if (!t || !t.edit || !n || e.button !== 0) {
      if (t && t.edit && ui.sel !== -1 && !n) {
        ui.sel = -1;
        draw();
        focusItem('none');
      }
      return;
    }
    const [kind, i] = n.getAttribute('data-hit').split(':');
    drag = t.edit.start({ kind, i: +i }, col.viz.opts, meta, api, toPt(e));
    if (drag) {
      e.preventDefault();
      stage.setPointerCapture(e.pointerId);
    }
    draw();
  });
  stage.addEventListener('pointermove', (e) => {
    if (drag) {
      if (down0 && Math.hypot(e.clientX - down0.x, e.clientY - down0.y) > 3) dragMoved = true;
      drag.move(toPt(e));
    }
  });
  const up = () => {
    if (!drag) return;
    if (dragMoved) suppressClick = true;
    const d = drag;
    drag = null;
    if (d.end) d.end();
    ui.drag = null;
    changed();
  };
  stage.addEventListener('pointerup', up);
  stage.addEventListener('pointercancel', up);

  /* ----- barre ----- */
  const wOpts = [
    [baseW, `Colonne actuelle (${Math.round(baseW)} px)`],
    ...[
      ['1-1-1', '1/3'],
      ['1-1', '1/2'],
      ['2-1', '2/3'],
      ['1', 'Pleine largeur'],
    ].map(([k, l]) => [colWidth(k, 0, gutter), `${l} (${Math.round(colWidth(k, 0, gutter))} px)`]),
  ];
  const wSel = h(
    'select',
    {
      onchange: (e) => {
        width = parseFloat(e.target.value);
        draw();
      },
    },
    wOpts.map(([v, l]) => h('option', { value: v, textContent: l })),
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
  /* L'éditeur est modal : le reste de l'application (en-tête, aperçu) est inerte tant qu'il est ouvert, donc Tab ne s'en échappe pas */
  const opener = document.activeElement,
    muted = [...document.body.children].filter((n) => n !== root && !n.inert && !/^(SCRIPT|STYLE|LINK)$/.test(n.tagName));
  const close = (keep) => {
    if (!keep) {
      col.viz = JSON.parse(snapshot);
    }
    window.removeEventListener('keydown', onKey, true);
    muted.forEach((n) => {
      n.inert = false;
    });
    root.remove();
    if (opener && opener.isConnected && opener.focus) opener.focus();
    current = null;
    document.body.classList.remove('ve-open');
    ctx.restructure();
  };
  /* Échap ferme d'abord ce qui est ouvert (liste, fenêtre de couleurs, modale), puis vide la recherche ; il n'abandonne l'éditeur qu'à vide,
     avec confirmation s'il y a des modifications. Écouteur en phase de capture : on voit la fenêtre ouverte avant qu'elle ne se referme. */
  let leaving = false;
  const onKey = async (e) => {
    if (e.key === 'Tab') {
      /* focus piégé : Tab boucle du dernier réglage au premier (sauf si une modale ou la fenêtre des couleurs est ouverte) */
      if (document.querySelector('dialog[open], .pal2-wrap, .ce')) return;
      const items = [...root.querySelectorAll('button, input, select, textarea, a[href], [contenteditable], [tabindex]')].filter(
          (n) => !n.disabled && n.tabIndex >= 0 && n.offsetParent !== null,
        ),
        a = document.activeElement;
      if (!items.length) return;
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
    if (e.key === 'Escape') {
      if (leaving || document.querySelector('dialog[open], .cs-pop, .cpop, .pal2-wrap, .ce')) return;
      const q = e.target.closest && e.target.closest('.pp-q');
      if (q) {
        e.preventDefault();
        if (q.value) {
          q.value = '';
          q.dispatchEvent(new Event('input'));
        }
        return;
      }
      e.preventDefault(); // sinon le même Échap ferme aussitôt la modale de confirmation qui vient de s'ouvrir
      leaving = true;
      try {
        if (
          JSON.stringify(col.viz) === snapshot ||
          (await confirmBox(t('Abandonner les modifications de la dataviz ?'), { ok: t('Abandonner'), danger: true }))
        )
          close(false);
      } finally {
        leaving = false;
      }
      return;
    }
    const tg = e.target;
    if (!(e.metaKey || e.ctrlKey) || e.altKey || /INPUT|TEXTAREA|SELECT/.test(tg.tagName || '') || tg.isContentEditable) return;
    const k = e.key.toLowerCase();
    if (k === 'z') {
      e.preventDefault();
      goHist(hist.i + (e.shiftKey ? 1 : -1));
    } else if (k === 'y') {
      e.preventDefault();
      goHist(hist.i + 1);
    }
  };
  window.addEventListener('keydown', onKey, true);

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
  syncHist();
  /* Mise en page : barre (titre + historique | onglets | Annuler / Terminer), aperçu ou données à gauche, panneau de largeur fixe à droite dans les deux onglets */
  root.append(
    h(
      'div',
      { class: 've-bar' },
      h('div', { class: 've-bl' }, h('strong', { textContent: 'Éditeur de dataviz' }), undoBtn, redoBtn),
      tabs,
      h(
        'div',
        { class: 've-br' },
        h(
          'button',
          { type: 'button', class: 've-exp', title: t('Exporter la dataviz (PNG, JPG, SVG)'), onclick: exportViz },
          ico('download'),
          h('span', { textContent: t('Exporter') }),
        ),
        h('button', { type: 'button', textContent: 'Annuler', onclick: () => close(false) }),
        h('button', { type: 'button', class: 'primary', textContent: 'Terminer', onclick: () => close(true) }),
      ),
    ),
    body,
  );
  main.append(
    h(
      'div',
      { class: 've-viewbar' },
      h('label', { class: 'zoom' }, 'Aperçu à la largeur ', wSel),
      h('label', { class: 'zoom' }, 'Zoom ', zSel),
      hint,
    ),
    stage,
    dataPane,
  );
  body.append(main, form);
  document.body.append(root);
  document.body.classList.add('ve-open');
  muted.forEach((n) => {
    n.inert = true;
  });
  root.focus({ preventScroll: true }); // Tab part du haut de l'éditeur
  current = root;
  new ResizeObserver(() => {
    if (zoom === 'fit') draw();
  }).observe(stage);
  buildForm();
  draw();
  loadFonts().then(() => {
    if (current === root) draw();
  });
}
