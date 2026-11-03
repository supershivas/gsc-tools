/* Colonne de droite : propriétés de l'élément sélectionné (document, header, section, sous-section, colonne). */
import { h, ico, headerImage, columnWidth } from './render.js';
import { t } from './i18n.js';
import { GRID, THEMES, paletteKeys, toneKeys, colorLabel, cssVars, applyVars } from './tokens.js';
import { openPalette } from './palette.js';
import { newCard, cardPresetFor, CARD_CHECKS } from './cardmodel.js';
import { COL_TYPES, IMAGE_RATIOS, LOCALES, LOGO_VARIANTS, DEFAULT_LOGOS, DEFAULT_IMAGE_ID, VALIGNS, ALIGNS, newCol, stepSection, newHeaderImage, swapCols, allCols, moveSub, refreshAutoCards } from './state.js';
import { VIZ_TYPES, VIZ_OPTIONS, newViz } from './viz/index.js';
import { buildFields, readImage, richEditor, paletteOptions } from './editor.js';
import { FIGURE_DEFAULTS, FIGURE_FIELDS } from './figure.js';
import { ICON_OPTIONS } from './viz/icons.js';

const shut = new Set();   // cartes repliées (gardées d'une sélection à l'autre)

export function buildProps(root, ctx) {
  const doc = ctx.getDoc(), path = ctx.getSel();
  root.innerHTML = '';
  const append = root.append.bind(root); root.append = (...k) => append(...k.filter(x => x != null && x !== false));   // les champs absents (null) ne s'affichent pas
  applyVars(root, cssVars(doc.theme, doc.colors));
  const th = THEMES[doc.theme] || THEMES.eu, palOpts = paletteOptions(doc);
  const live = fn => e => { fn(e.target.value, e); ctx.changed(); };
  const struct = fn => () => { fn(); ctx.restructure(); };
  const field = (label, input) => h('label', { class: 'f' }, label, input);
  const text = (obj, k, label, ph) => field(label, h('input', { type: 'text', value: obj[k] || '', placeholder: ph || '', oninput: live(v => { obj[k] = v; }) }));
  const select = (obj, k, label, opts, onSet) => {
    const s = h('select', { onchange: e => { obj[k] = e.target.value; onSet ? onSet() : ctx.changed(); } }, Object.entries(opts).map(([v, l]) => h('option', { value: v, textContent: l })));
    s.value = obj[k]; return field(label, s);
  };
  /* Deux tons par couleur : la ligne du haut en pleine, celle du dessous en légère (alignées) */
  const swatches = (label, obj, k, keys, withNone) => {
    const light = keys.filter(c => c.startsWith('tint-')), solid = keys.filter(c => !c.startsWith('tint-'));
    const dot = c => h('button', { type: 'button', class: 'hv-sw' + (obj[k] === c ? ' on' : ''), title: t(colorLabel(doc, c)), 'aria-label': t(colorLabel(doc, c)), style: { background: `var(--c-${c})` }, onclick: struct(() => { obj[k] = c; }) });
    const gap = () => h('span', { class: 'hv-sw ghost' });
    const none = h('button', { type: 'button', class: 'hv-sw none' + (!obj[k] || obj[k] === 'none' ? ' on' : ''), title: t('Aucun'), 'aria-label': t('Aucun'), onclick: struct(() => { obj[k] = 'none'; }) });
    const pal = h('button', { type: 'button', class: 'hv-sw pal-btn', title: t('Modifier, renommer ou ajouter des couleurs'), 'aria-label': t('Modifier, renommer ou ajouter des couleurs'), onclick: e => openPalette(e.currentTarget, ctx) }, ico('plus'));
    const lightRow = solid.map(c => { const tc = 'tint-' + c; return light.includes(tc) ? dot(tc) : gap(); });
    return h('div', { class: 'f' }, h('div', { class: 'hint', textContent: label }),
      h('div', { class: 'swrow' }, withNone ? none : null, ...solid.map(dot), pal),
      light.length ? h('div', { class: 'swrow' }, withNone ? gap() : null, ...lightRow) : null);
  };
  const imgPicker = (label, get, set, max) => {
    const inp = h('input', { type: 'file', accept: 'image/*', hidden: true, onchange: async () => {
      const f = inp.files[0]; inp.value = ''; if (!f) return;
      try { set(await readImage(f, max)); ctx.restructure(); } catch (e) { alert(t('Image illisible.')); }
    } });
    return h('div', { class: 'f' }, h('div', { class: 'hint', textContent: label }),
      h('div', { class: 'row' }, get() ? h('img', { class: 'thumb', src: get() }) : null,
        h('button', { type: 'button', textContent: get() ? 'Remplacer…' : 'Importer…', onclick: () => inp.click() }),
        get() ? h('button', { type: 'button', class: 'danger', textContent: 'Retirer', onclick: struct(() => set(null)) }) : null, inp));
  };

  /* Logo : 4 versions de même taille, une liste déroulante choisit celle qui s'affiche.
     Les logos d'origine (publiés dans le dépôt) ne se retirent pas : on peut charger une autre image à leur place, puis rétablir l'original. */
  const logoPicker = H => {
    const v = H.logoVariant, orig = DEFAULT_LOGOS()[v], custom = H.logos[v] !== orig;
    const sel = h('select', { onchange: e => { H.logoVariant = e.target.value; ctx.restructure(); } },
      Object.entries(LOGO_VARIANTS).map(([k, l]) => h('option', { value: k, textContent: `${t(l)} — ${t(H.logos[k] !== DEFAULT_LOGOS()[k] ? 'personnalisé' : 'original')}`, selected: v === k })));
    const inp = h('input', { type: 'file', accept: 'image/*', hidden: true, onchange: async () => {
      const f = inp.files[0]; inp.value = ''; if (!f) return;
      try { H.logos[v] = await readImage(f, 800); ctx.restructure(); } catch (e) { alert(t('Image illisible.')); }
    } });
    return h('div', {}, field('Version du logo', sel),
      h('div', { class: 'f' }, h('div', { class: 'hint', textContent: `Logo — ${t(LOGO_VARIANTS[v])}` }),
        h('div', { class: 'row' }, h('img', { class: 'thumb' + (v === 'white' || v === 'negative' ? ' dark' : ''), src: H.logos[v], alt: '' }),
          h('button', { type: 'button', textContent: 'Charger une autre image…', onclick: () => inp.click() }),
          custom ? h('button', { type: 'button', textContent: 'Rétablir l’original', onclick: struct(() => { H.logos[v] = orig; }) }) : null, inp)),
      h('p', { class: 'hint', textContent: 'Les 4 versions ont la même taille (138 × 42 px). PNG transparent ou SVG.' }));
  };

  /* Images du header : une bibliothèque sans limite (on démarre avec deux), la vignette cliquée est affichée */
  const imageLibrary = H => {
    const cur = headerImage(H);
    const pick = e => async () => {
      const inp = e.input; const f = inp.files[0]; inp.value = ''; if (!f) return;
      try { e.img.src = await readImage(f, 800); H.imageId = e.img.id; ctx.restructure(); } catch (x) { alert(t('Image illisible.')); }
    };
    const tile = img => {
      const inp = h('input', { type: 'file', accept: 'image/*', hidden: true });
      inp.addEventListener('change', pick({ input: inp, img }));
      return h('div', { class: 'imgtile' + (cur && cur.id === img.id ? ' on' : '') },
        h('button', { type: 'button', class: 'imgtile-pic', title: img.name, onclick: () => { H.imageId = img.id; ctx.restructure(); } },
          img.src ? h('img', { src: img.src, alt: '' }) : h('span', { textContent: 'Pas d’image' })),
        h('div', { class: 'imgtile-name', textContent: img.id === DEFAULT_IMAGE_ID ? t('Image par défaut') : img.name }),
        img.id === DEFAULT_IMAGE_ID ? null : h('div', { class: 'row imgtile-act' },
          h('button', { type: 'button', class: 'mini', title: img.src ? 'Remplacer…' : 'Importer…', onclick: () => inp.click() }, ico('upload')),
          h('button', { type: 'button', class: 'mini', title: 'Renommer', onclick: () => { const n = prompt(t('Nom de l’image :'), img.name); if (n && n.trim()) { img.name = n.trim(); ctx.restructure(); } } }, ico('pencil')),
          h('button', { type: 'button', class: 'mini danger', title: 'Supprimer', onclick: () => { if (!confirm(t('Supprimer cette image ?'))) return; H.images.splice(H.images.indexOf(img), 1); if (H.imageId === img.id) H.imageId = H.images[0].id; ctx.restructure(); } }, ico('x'))),
        inp);
    };
    return h('div', { class: 'f' }, h('div', { class: 'hint', textContent: 'Image affichée (132 px de haut, largeur selon l’image) — choisissez dans la bibliothèque :' }),
      h('div', { class: 'imggrid' }, H.images.map(tile),
        h('button', { type: 'button', class: 'imgtile-add', onclick: () => { const n = newHeaderImage(H.images.length + 1); H.images.push(n); H.imageId = n.id; ctx.restructure(); } }, ico('plus'), h('span', { textContent: 'Ajouter une image' }))));
  };
  /* Choix d'alignement : boutons à icônes (une valeur parmi plusieurs) */
  const segmented = (label, obj, k, icons, names) => h('div', { class: 'f' }, h('div', { class: 'hint', textContent: label }),
    h('div', { class: 'seg' }, Object.entries(icons).map(([v, ic]) => h('button', { type: 'button', class: v === (obj[k] || Object.keys(icons)[0]) ? 'on' : '', title: names[v], 'aria-label': names[v], 'aria-pressed': String(v === (obj[k] || Object.keys(icons)[0])), onclick: () => { obj[k] = v; ctx.restructure(); } }, ico(ic)))));
  /* Carte : le contenu d'abord, puis toutes les options (cochables) ; tant qu'on n'y touche pas, le type de carte suit la largeur de la colonne */
  const cardPanel = (col, W) => {
    const C = col.card || (col.card = newCard(W)), ct = C.content;
    const chosen = fn => { fn(); C.auto = false; ctx.restructure(); };
    const check = ([k, label]) => h('label', { class: 'row' }, h('input', { type: 'checkbox', checked: !!C[k], onchange: e => chosen(() => { C[k] = e.target.checked; }) }), label);
    const sel = (k, label, opts) => { const s = h('select', { onchange: e => chosen(() => { C[k] = e.target.value; }) }, Object.entries(opts).map(([v, l]) => h('option', { value: v, textContent: l }))); s.value = C[k]; return field(label, s); };
    const fields = [{ k: 'tag', t: 'text', label: 'Étiquette' }, { k: 'title', t: 'text', label: 'Titre' }, { k: 'figure', t: 'text', label: 'Chiffre' }, { k: 'text', t: 'area', label: 'Texte' },
      { k: 'bullets', t: 'lines', label: 'Puces (une par ligne)' }, { k: 'link', t: 'text', label: 'Lien' }];
    return h('div', {},
      ...buildFields(fields, ct, ctx, palOpts, h),
      C.image ? imgPicker('Image de la carte', () => C.src, v => { C.src = v; }, 1200) : null,
      h('details', { class: 'opts', open: true }, h('summary', { textContent: 'Options de la carte' }),
        h('label', { class: 'row' }, h('input', { type: 'checkbox', checked: !!C.auto, onchange: e => { C.auto = e.target.checked; if (C.auto) Object.assign(C, cardPresetFor(W)); ctx.restructure(); } }), 'Type de carte selon la largeur de la colonne'),
        sel('layout', 'Position de l’image', { vertical: t('En haut'), left: t('À gauche'), right: t('À droite') }),
        sel('align', 'Alignement', { left: t('Gauche'), center: t('Centré') }),
        C.icon ? sel('iconName', 'Icône choisie', ICON_OPTIONS) : null,
        CARD_CHECKS.map(check)));
  };

  /* ---------- Variante B : cartes repliables (état replié gardé le temps de la session) ---------- */
  const switchBtn = (on, label, fn) => h('button', { type: 'button', role: 'switch', 'aria-checked': String(!!on), 'aria-label': label, class: 'pp-switch' + (on ? ' on' : ''), onclick: fn });
  const switchRow = (label, on, fn) => h('div', { class: 'pp-switchrow' }, h('span', { textContent: label }), switchBtn(on, label, struct(fn)));
  /** toggle : { on, set } — l'interrupteur de l'en-tête affiche ou masque l'élément (la carte se replie quand il est éteint) */
  const card = (id, icon, name, nodes, toggle) => {
    const open = !shut.has(id), live = open && (!toggle || toggle.on);
    return h('section', { class: 'pp-card' },
      h('div', { class: 'pp-card-h' }, ico(icon), h('b', { textContent: name }), h('span', { class: 'pp-sp' }),
        toggle ? switchBtn(toggle.on, name, struct(toggle.set)) : null,
        h('button', { type: 'button', class: 'pp-chev', 'aria-expanded': String(open), 'aria-label': open ? t('Replier') : t('Déplier'), onclick: () => { open ? shut.add(id) : shut.delete(id); ctx.refreshProps(); } }, ico(open ? 'chevron-up' : 'chevron-down'))),
      live ? h('div', { class: 'pp-body' }, nodes.flat().filter(Boolean)) : null);
  };
  const btn = (icon, label, fn, cls = '') => h('button', { type: 'button', class: 'pp-btn ' + cls, onclick: fn }, ico(icon), h('span', { textContent: label }));
  /* Fond (une couleur au choix, avec teintes) et contour (couleur au choix) : sections, sous-sections et colonnes */
  const boxControls = (obj, fillLabel = 'Fond') => [
    swatches(fillLabel, obj, 'fillColor', toneKeys(doc), true),
    switchRow(t('Contour'), obj.stroke, () => { obj.stroke = !obj.stroke; }),
    obj.stroke ? swatches('Couleur du contour', obj, 'strokeColor', toneKeys(doc)) : null];
  const title = (name, crumbs = []) => root.append(h('div', { class: 'pr-head' },
    h('div', { class: 'crumbs' }, crumbs.flatMap(([l, p]) => [h('a', { textContent: l, onclick: () => ctx.select(p) }), ' › '])),
    h('h2', { textContent: name })));
  const actions = (...b) => h('div', { class: 'pp-actions' }, ...b);

  const P = (path || '').split(':'), kind = P[0] || 'doc', si = +P[1], bi = +P[2], ci = +P[3];
  const sec = doc.sections[si], sub = sec && sec.subs[bi], col = sub && sub.cols[ci];
  const ICONS = { text: 'text-size', image: 'photo', card: 'layout-cards', figure: 'number', viz: 'chart-bar' };

  if (kind === 'doc') {
    root.append(h('div', { class: 'pp-empty' }, ico('pointer'), h('p', { textContent: 'Sélectionnez un élément dans la structure (à gauche) ou sur la page pour modifier ses propriétés.' }),
      h('p', { class: 'hint', textContent: 'Les couleurs, le format des nombres et le nom du fichier sont dans le menu Édition.' })));
  } else if (kind === 'header') {
    const H = doc.header; title('Header');
    root.append(card('hd-text', 'typography', t('Texte'), [text(H, 'overline', 'Surtitre'), text(H, 'title', 'Titre (taille fixe)'), text(H, 'subtitle', 'Sous-titre (optionnel — vide = masqué)')]),
      card('hd-colors', 'palette', t('Couleurs'), [swatches('Couleur de fond', H, 'bg', toneKeys(doc)), swatches('Couleur du texte', H, 'fg', toneKeys(doc))]),
      card('hd-image', 'photo', t('Image'), [imageLibrary(H)], { on: H.showImage, set: () => { H.showImage = !H.showImage; } }),
      card('hd-logo', 'certificate', t('Logo'), [logoPicker(H)], { on: H.showLogo, set: () => { H.showLogo = !H.showLogo; } }));
  } else if (kind === 'sec' && sec) {
    title(sec.title || 'Section');
    root.append(card('sec-main', 'layout-rows', t('Section'), [text(sec, 'title', 'Titre de section'),
        select(sec, 'page', 'Page', { recto: 'Recto', verso: 'Verso' }, () => ctx.restructure())]),
      card('sec-bg', 'color-swatch', t('Fond de la section'), [swatches('Fond', sec, 'bg', toneKeys(doc), true)]),
      card('sec-frame', 'border-all', t('Cadre'), boxControls(sec, 'Fond du cadre')),
      actions(btn('arrow-up', t('Monter'), struct(() => { stepSection(doc, si, -1); })), btn('arrow-down', t('Descendre'), struct(() => { stepSection(doc, si, 1); })),
        btn('trash', t('Supprimer'), () => ctx.remove(`sec:${si}`), 'danger')));
  } else if (kind === 'sub' && sub) {
    title(sub.title || 'Sous-section', [[sec.title || 'Section', `sec:${si}`]]);
    const mv = (() => {
      const s = h('select', { onchange: e => { if (!e.target.value) return; const to = +e.target.value; ctx.moved(() => { const n = moveSub(doc, { si, bi }, { si: to, bi: null }); return `sub:${n.si}:${n.bi}`; }); } },
        h('option', { value: '', textContent: '—' }), doc.sections.map((x, i) => h('option', { value: i, textContent: `${x.title || t('Section')} (${x.page === 'recto' ? t('Recto') : t('Verso')})` })));
      s.value = ''; return s;
    })();
    root.append(card('sub-main', 'columns', t('Sous-section'), [text(sub, 'title', 'Titre de sous-section (vide = masqué)'),
        select(sub, 'layout', 'Colonnes', Object.fromEntries(Object.entries(GRID.layouts).map(([k, l]) => [k, l.label])), () => {
          const n = GRID.layouts[sub.layout].spans.length; sub.cols = sub.cols.slice(0, n); while (sub.cols.length < n) sub.cols.push(newCol('text')); refreshAutoCards(sub, i => columnWidth(doc, si, bi, i)); ctx.restructure();
        }),
        field('Déplacer vers la section', mv)]),
      card('sub-box', 'border-all', t('Fond et contour'), boxControls(sub)),
      actions(btn('arrow-up', t('Monter'), struct(() => { const j = bi - 1; if (j >= 0) [sec.subs[bi], sec.subs[j]] = [sec.subs[j], sec.subs[bi]]; })),
        btn('arrow-down', t('Descendre'), struct(() => { const j = bi + 1; if (j < sec.subs.length) [sec.subs[bi], sec.subs[j]] = [sec.subs[j], sec.subs[bi]]; })),
        btn('copy', t('Dupliquer'), struct(() => { const c = JSON.parse(JSON.stringify(sub)); c.id = (sub.id || 'sub') + 'c' + Date.now() % 1e5; sec.subs.splice(bi + 1, 0, c); })),
        btn('trash', t('Supprimer'), () => ctx.remove(`sub:${si}:${bi}`), 'danger')));
  } else if (kind === 'col' && col) {
    title(`Colonne ${ci + 1}`, [[sec.title || 'Section', `sec:${si}`], [sub.title || 'Sous-section', `sub:${si}:${bi}`]]);
    const typeSel = field('Type de contenu', h('select', { onchange: e => { const keep = col.text, { valign, align, stroke, strokeColor, fillColor } = col; Object.assign(col, newCol(e.target.value), { valign, align, stroke, strokeColor, fillColor }); if (e.target.value === 'text' && keep) col.text = keep; if (e.target.value === 'card') { col.card = newCard(columnWidth(doc, si, bi, ci)); col.stroke = false; col.fillColor = 'none'; } ctx.restructure(); } },
      Object.entries(COL_TYPES).map(([v, l]) => h('option', { value: v, textContent: l, selected: col.type === v }))));
    let editor;
    if (col.type === 'text') editor = [h('div', { class: 'f' }, h('div', { class: 'hint', textContent: 'Texte' }), richEditor(col.text, v => { col.text = v; ctx.changed(); }))];
    else if (col.type === 'image') {
      const mode = col.imgMode || 'ratio';
      editor = [imgPicker('Image', () => col.src, v => { col.src = v; col.natural = null; }, 1600),
        select(col, 'imgMode', 'Taille de l’image', { ratio: 'Format fixe (recadrée)', fit: 'Ajustée au conteneur (proportions conservées)', custom: 'Taille personnalisée' }, () => ctx.restructure()),
        mode === 'ratio' ? select(col, 'ratio', 'Format', Object.fromEntries(Object.keys(IMAGE_RATIOS).map(k => [k, k]))) : null,
        mode === 'custom' ? h('div', { class: 'row2' }, field('Largeur (% de la colonne)', h('input', { type: 'number', min: 5, max: 100, step: 1, value: col.imgW ?? 100, oninput: live(v => { col.imgW = Math.max(5, Math.min(100, parseFloat(v) || 100)); }) })),
          field('Hauteur (px)', h('input', { type: 'number', min: 3, max: 600, step: 3, value: col.imgH ?? 150, oninput: live(v => { col.imgH = Math.max(3, parseFloat(v) || 150); }) }))) : null,
        mode === 'custom' ? select(col, 'imgFit', 'Remplissage', { cover: 'Recadrer pour remplir', contain: 'Image entière' }) : null,
        mode === 'custom' && (col.imgW ?? 100) < 100 ? segmented('Position dans la colonne', col, 'align', { left: ALIGNS.left, center: ALIGNS.center, right: ALIGNS.right }, { left: t('Gauche'), center: t('Centré'), right: t('Droite') }) : null,
        text(col, 'caption', 'Légende (optionnelle)')];
    } else if (col.type === 'card') editor = [cardPanel(col, columnWidth(doc, si, bi, ci))];
    else if (col.type === 'figure') { if (!col.figure) col.figure = FIGURE_DEFAULTS(); editor = buildFields(FIGURE_FIELDS, col.figure, ctx, palOpts, h); }
    else {
      if (!col.viz) col.viz = newViz('bars');
      editor = [h('button', { type: 'button', class: 'primary', style: { width: '100%' }, onclick: () => ctx.editViz({ col, sub, ci }) }, ico('pencil'), ' Ouvrir l’éditeur de dataviz'),
        h('p', { class: 'hint', textContent: 'Tous les réglages de la dataviz (type, données, couleurs, options) se font dans l’éditeur.' })];
    }
    const swap = field('Échanger le contenu avec…', (() => {
      const s = h('select', { onchange: e => { if (!e.target.value) return; const [a, b, c] = e.target.value.split(':').map(Number); ctx.moved(() => { swapCols(doc, { si, bi, ci }, { si: a, bi: b, ci: c }); return `col:${a}:${b}:${c}`; }); } },
        h('option', { value: '', textContent: '—' }), allCols(doc).filter(c => !(c.si === si && c.bi === bi && c.ci === ci)).map(c => h('option', { value: `${c.si}:${c.bi}:${c.ci}`, textContent: c.label + (doc.sections[c.si].page !== sec.page ? ` (${c.page === 'recto' ? t('Recto') : t('Verso')})` : '') })));
      s.value = ''; return s;
    })());
    root.append(card('col-content', ICONS[col.type] || 'text-size', t('Contenu'), [typeSel, ...editor]),
      card('col-layout', 'layout-align-middle', t('Disposition'), [segmented('Alignement vertical dans la colonne', col, 'valign', VALIGNS, { top: t('Haut'), center: t('Centre'), bottom: t('Bas') }),
        col.type === 'text' ? segmented('Alignement du texte', col, 'align', ALIGNS, { left: t('Gauche'), center: t('Centré'), right: t('Droite'), justify: t('Justifié') }) : null, swap]),
      col.type !== 'card' ? card('col-box', 'border-all', t('Fond et contour'), boxControls(col)) : null,
      actions(btn('trash', t('Supprimer la colonne'), () => ctx.remove(`col:${si}:${bi}:${ci}`), 'danger')));
  } else { title('Élément introuvable'); }
}
