/* Colonne de droite : propriétés de l'élément sélectionné (document, header, section, sous-section, colonne). */
import { h, ico, headerImage, columnWidth } from './render.js';
import { t } from './i18n.js';
import { GRID, THEMES, paletteOf, paletteKeys, sectionBgs, colorLabel, cssVars, applyVars } from './tokens.js';
import { openColorEditor } from './colorpicker.js';
import { newCard, cardPresetFor, CARD_CHECKS } from './cardmodel.js';
import { COL_TYPES, IMAGE_RATIOS, LOCALES, LOGO_VARIANTS, VALIGNS, ALIGNS, newCol, stepSection, newHeaderImage, swapCols, allCols, moveSub, addColor, removeColor, canAddColor, extraColorKeys, refreshAutoCards } from './state.js';
import { VIZ_TYPES, VIZ_OPTIONS, newViz } from './viz/index.js';
import { buildFields, readImage, richEditor, paletteOptions } from './editor.js';
import { FIGURE_DEFAULTS, FIGURE_FIELDS } from './figure.js';
import { ICON_OPTIONS } from './viz/icons.js';

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
  const swatches = (label, obj, k, keys, withNone) => h('div', { class: 'f' }, h('div', { class: 'hint', textContent: label }),
    h('div', { class: 'swrow' }, [withNone ? h('button', { type: 'button', class: 'hv-sw none' + (!obj[k] || obj[k] === 'none' ? ' on' : ''), title: 'Aucun', onclick: struct(() => { obj[k] = 'none'; }) }) : null,
      ...keys.map(c => h('button', { type: 'button', class: 'hv-sw' + (obj[k] === c ? ' on' : ''), title: t(colorLabel(doc, c)), style: { background: `var(--c-${c})` }, onclick: struct(() => { obj[k] = c; }) }))]));
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

  /* Logo : 4 versions de même taille, une liste déroulante choisit celle qui s'affiche */
  const logoPicker = H => {
    const sel = h('select', { onchange: e => { H.logoVariant = e.target.value; ctx.restructure(); } },
      Object.entries(LOGO_VARIANTS).map(([v, l]) => h('option', { value: v, textContent: `${t(l)} — ${t(H.logos[v] ? 'importé' : 'vide')}`, selected: H.logoVariant === v })));
    return h('div', {}, field('Version du logo', sel),
      imgPicker(`Logo — ${t(LOGO_VARIANTS[H.logoVariant])}`, () => H.logos[H.logoVariant], v => { H.logos[H.logoVariant] = v; }, 800),
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
        h('div', { class: 'imgtile-name', textContent: img.name }),
        h('div', { class: 'row imgtile-act' },
          h('button', { type: 'button', class: 'mini', title: img.src ? 'Remplacer…' : 'Importer…', onclick: () => inp.click() }, ico('upload')),
          h('button', { type: 'button', class: 'mini', title: 'Renommer', onclick: () => { const n = prompt(t('Nom de l’image :'), img.name); if (n && n.trim()) { img.name = n.trim(); ctx.restructure(); } } }, ico('pencil')),
          H.images.length > 1 ? h('button', { type: 'button', class: 'mini danger', title: 'Supprimer', onclick: () => { if (!confirm(t('Supprimer cette image ?'))) return; H.images.splice(H.images.indexOf(img), 1); if (H.imageId === img.id) H.imageId = H.images[0].id; ctx.restructure(); } }, ico('x')) : null),
        inp);
    };
    return h('div', { class: 'f' }, h('div', { class: 'hint', textContent: 'Image affichée (96 × 132 px) — choisissez dans la bibliothèque :' }),
      h('div', { class: 'imggrid' }, H.images.map(tile),
        h('button', { type: 'button', class: 'imgtile-add', onclick: () => { const n = newHeaderImage(H.images.length + 1); H.images.push(n); H.imageId = n.id; ctx.restructure(); } }, ico('plus'), h('span', { textContent: 'Ajouter une image' }))));
  };
  /* Choix d'alignement : boutons à icônes (une valeur parmi plusieurs) */
  const segmented = (label, obj, k, icons, names) => h('div', { class: 'f' }, h('div', { class: 'hint', textContent: label }),
    h('div', { class: 'seg' }, Object.entries(icons).map(([v, ic]) => h('button', { type: 'button', class: v === (obj[k] || Object.keys(icons)[0]) ? 'on' : '', title: names[v], 'aria-label': names[v], 'aria-pressed': String(v === (obj[k] || Object.keys(icons)[0])), onclick: () => { obj[k] = v; ctx.restructure(); } }, ico(ic)))));
  /* Contour (trait 0,5 pt, coins de 3 px) : sections, sous-sections et colonnes */
  const strokeControls = obj => h('div', { class: 'f outline' },
    h('label', { class: 'row' }, h('input', { type: 'checkbox', checked: !!obj.stroke, onchange: struct(() => { obj.stroke = !obj.stroke; }) }), 'Contour'),
    obj.stroke ? h('div', {}, swatches('Couleur du contour', obj, 'strokeColor', paletteKeys(doc)),
      h('label', { class: 'row' }, h('input', { type: 'checkbox', checked: !!obj.fill, onchange: struct(() => { obj.fill = !obj.fill; }) }), 'Fond blanc')) : null);
  /* Palette : 5 couleurs par thème + couleurs ajoutées ; un clic ouvre l'éditeur de couleur (aperçu en direct) */
  const paletteEditor = () => {
    const pal = paletteOf(doc.theme, doc.colors), extras = extraColorKeys(doc);
    const open = (k, sw) => openColorEditor({ anchor: sw, hex: pal[k], title: t(colorLabel(doc, k)),
      onChange: hex => { doc.colors[k] = hex; sw.style.background = hex; ctx.changed(); }, onClose: () => ctx.restructure() });
    const row = k => {
      const isExtra = extras.includes(k), edited = !isExtra && doc.colors[k] && doc.colors[k].toLowerCase() !== th.colors[k].toLowerCase();
      const sw = h('button', { type: 'button', class: 'pal2-sw', title: 'Modifier la couleur', style: { background: pal[k] }, onclick: () => open(k, sw) });
      return h('div', { class: 'pal2-row', dataset: { key: k } }, sw,
        isExtra ? h('input', { type: 'text', value: (doc.colorNames && doc.colorNames[k]) || k, oninput: e => { doc.colorNames[k] = e.target.value; ctx.changed(); } }) : h('span', { class: 'pal2-name', textContent: t(colorLabel(doc, k)) }),
        h('span', { class: 'pal2-hex', textContent: pal[k].toUpperCase() }),
        isExtra ? h('button', { type: 'button', class: 'mini danger', title: 'Supprimer', onclick: () => { if (confirm(t('Supprimer cette couleur ? Ce qui l’utilise passera en bleu.'))) { removeColor(doc, k); ctx.restructure(); } } }, ico('x'))
          : edited ? h('button', { type: 'button', class: 'mini', title: 'Rétablir la couleur du thème', onclick: struct(() => { delete doc.colors[k]; }) }, ico('restore')) : null);
    };
    return h('div', { class: 'f' }, h('div', { class: 'hint', textContent: `${t('Palette du thème')} (${Object.keys(pal).length}/${Object.keys(th.colors).length + 7})` }),
      h('div', { class: 'pal2' }, Object.keys(pal).map(row)),
      canAddColor(doc) ? h('button', { type: 'button', class: 'btn', onclick: () => { const k = addColor(doc, '#808080'); ctx.restructure(); requestAnimationFrame(() => { const b = root.querySelector(`[data-key="${k}"] .pal2-sw`); if (b) b.click(); }); } }, ico('plus'), h('span', { textContent: 'Ajouter une couleur' })) : null);
  };
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
  const title = (t, crumbs = []) => root.append(h('div', { class: 'pr-head' },
    h('div', { class: 'crumbs' }, crumbs.flatMap(([l, p]) => [h('a', { textContent: l, onclick: () => ctx.select(p) }), ' › '])),
    h('h2', { textContent: t })));
  const actions = (...b) => h('div', { class: 'row pr-actions' }, ...b);

  const P = (path || '').split(':'), kind = P[0] || 'doc', si = +P[1], bi = +P[2], ci = +P[3];
  const sec = doc.sections[si], sub = sec && sec.subs[bi], col = sub && sub.cols[ci];

  if (kind === 'doc') {
    title('Document');
    root.append(text(doc, 'name', 'Nom du fichier'),
      select(doc, 'theme', 'Thème', Object.fromEntries(Object.entries(THEMES).map(([k, t]) => [k, t.label])), () => ctx.restructure()),
      select(doc, 'locale', 'Format des nombres', LOCALES),
      paletteEditor(),
      h('p', { class: 'hint', textContent: 'Sélectionnez un élément dans la structure (à gauche) ou sur la page pour modifier ses propriétés.' }));
  } else if (kind === 'header') {
    const H = doc.header; title('Header', [['Document', null]]);
    root.append(text(H, 'overline', 'Surtitre'), text(H, 'title', 'Titre (taille fixe)'), text(H, 'subtitle', 'Sous-titre (optionnel — vide = masqué)'),
      swatches('Couleur de fond', H, 'bg', paletteKeys(doc)), swatches('Couleur du texte', H, 'fg', paletteKeys(doc)),
      h('label', { class: 'row' }, h('input', { type: 'checkbox', checked: H.showImage, onchange: struct(() => { H.showImage = !H.showImage; }) }), 'Afficher l’image'),
      H.showImage ? imageLibrary(H) : null,
      h('label', { class: 'row' }, h('input', { type: 'checkbox', checked: H.showLogo, onchange: struct(() => { H.showLogo = !H.showLogo; }) }), 'Afficher le logo'),
      H.showLogo ? logoPicker(H) : null);
  } else if (kind === 'sec' && sec) {
    title(sec.title || 'Section', [['Document', null]]);
    root.append(text(sec, 'title', 'Titre de section'),
      swatches('Fond de la section', sec, 'bg', sectionBgs(doc), true), strokeControls(sec),
      select(sec, 'page', 'Page', { recto: 'Recto', verso: 'Verso' }, () => ctx.restructure()),
      actions(h('button', { type: 'button', textContent: '↑ Monter', onclick: struct(() => { stepSection(doc, si, -1); }) }),
        h('button', { type: 'button', textContent: '↓ Descendre', onclick: struct(() => { stepSection(doc, si, 1); }) }),
        h('button', { type: 'button', class: 'danger', textContent: 'Supprimer', title: 'Supprimer (Suppr)', onclick: () => ctx.remove(`sec:${si}`) })));
  } else if (kind === 'sub' && sub) {
    title(sub.title || 'Sous-section', [['Document', null], [sec.title || 'Section', `sec:${si}`]]);
    root.append(text(sub, 'title', 'Titre de sous-section (vide = masqué)'), strokeControls(sub),
      select(sub, 'layout', 'Colonnes', Object.fromEntries(Object.entries(GRID.layouts).map(([k, l]) => [k, l.label])), () => {
        const n = GRID.layouts[sub.layout].spans.length; sub.cols = sub.cols.slice(0, n); while (sub.cols.length < n) sub.cols.push(newCol('text')); refreshAutoCards(sub, i => columnWidth(doc, si, bi, i)); ctx.restructure();
      }),
      field('Déplacer vers la section', (() => {
        const s = h('select', { onchange: e => { if (!e.target.value) return; const to = +e.target.value; ctx.moved(() => { const n = moveSub(doc, { si, bi }, { si: to, bi: null }); return `sub:${n.si}:${n.bi}`; }); } },
          h('option', { value: '', textContent: '—' }), doc.sections.map((x, i) => h('option', { value: i, textContent: `${x.title || t('Section')} (${x.page === 'recto' ? t('Recto') : t('Verso')})` })));
        s.value = ''; return s;
      })()),
      actions(h('button', { type: 'button', textContent: '↑ Monter', onclick: struct(() => { const j = bi - 1; if (j >= 0) [sec.subs[bi], sec.subs[j]] = [sec.subs[j], sec.subs[bi]]; }) }),
        h('button', { type: 'button', textContent: '↓ Descendre', onclick: struct(() => { const j = bi + 1; if (j < sec.subs.length) [sec.subs[bi], sec.subs[j]] = [sec.subs[j], sec.subs[bi]]; }) }),
        h('button', { type: 'button', textContent: 'Dupliquer', onclick: struct(() => { const c = JSON.parse(JSON.stringify(sub)); c.id = (sub.id || 'sub') + 'c' + Date.now() % 1e5; sec.subs.splice(bi + 1, 0, c); }) }),
        h('button', { type: 'button', class: 'danger', textContent: 'Supprimer', title: 'Supprimer (Suppr)', onclick: () => ctx.remove(`sub:${si}:${bi}`) })));
  } else if (kind === 'col' && col) {
    title(`Colonne ${ci + 1}`, [['Document', null], [sec.title || 'Section', `sec:${si}`], [sub.title || 'Sous-section', `sub:${si}:${bi}`]]);
    root.append(field('Contenu', h('select', { onchange: e => { const keep = col.text, { valign, align, stroke, strokeColor, fill } = col; Object.assign(col, newCol(e.target.value), { valign, align, stroke, strokeColor, fill }); if (e.target.value === 'text' && keep) col.text = keep; if (e.target.value === 'card') { col.card = newCard(columnWidth(doc, si, bi, ci)); col.stroke = false; } ctx.restructure(); } },
      Object.entries(COL_TYPES).map(([v, l]) => h('option', { value: v, textContent: l, selected: col.type === v })))),
      segmented('Alignement vertical dans la colonne', col, 'valign', VALIGNS, { top: t('Haut'), center: t('Centre'), bottom: t('Bas') }),
      col.type === 'text' ? segmented('Alignement du texte', col, 'align', ALIGNS, { left: t('Gauche'), center: t('Centré'), right: t('Droite'), justify: t('Justifié') }) : null,
      field('Échanger le contenu avec…', (() => {
        const s = h('select', { onchange: e => { if (!e.target.value) return; const [a, b, c] = e.target.value.split(':').map(Number); ctx.moved(() => { swapCols(doc, { si, bi, ci }, { si: a, bi: b, ci: c }); return `col:${a}:${b}:${c}`; }); } },
          h('option', { value: '', textContent: '—' }), allCols(doc).filter(c => !(c.si === si && c.bi === bi && c.ci === ci)).map(c => h('option', { value: `${c.si}:${c.bi}:${c.ci}`, textContent: c.label + (doc.sections[c.si].page !== sec.page ? ` (${c.page === 'recto' ? t('Recto') : t('Verso')})` : '') })));
        s.value = ''; return s;
      })()),
      h('button', { type: 'button', class: 'danger', title: 'Supprimer (Suppr)', textContent: 'Supprimer la colonne', onclick: () => ctx.remove(`col:${si}:${bi}:${ci}`) }));
    if (col.type === 'text') root.append(h('div', { class: 'f' }, h('div', { class: 'hint', textContent: 'Texte' }), richEditor(col.text, v => { col.text = v; ctx.changed(); })));
    else if (col.type === 'image') {
      const mode = col.imgMode || 'ratio';
      root.append(imgPicker('Image', () => col.src, v => { col.src = v; col.natural = null; }, 1600),
        select(col, 'imgMode', 'Taille de l’image', { ratio: 'Format fixe (recadrée)', fit: 'Ajustée au conteneur (proportions conservées)', custom: 'Taille personnalisée' }, () => ctx.restructure()),
        mode === 'ratio' ? select(col, 'ratio', 'Format', Object.fromEntries(Object.keys(IMAGE_RATIOS).map(k => [k, k]))) : null,
        mode === 'custom' ? h('div', { class: 'row2' }, field('Largeur (% de la colonne)', h('input', { type: 'number', min: 5, max: 100, step: 1, value: col.imgW ?? 100, oninput: live(v => { col.imgW = Math.max(5, Math.min(100, parseFloat(v) || 100)); }) })),
          field('Hauteur (px)', h('input', { type: 'number', min: 3, max: 600, step: 3, value: col.imgH ?? 150, oninput: live(v => { col.imgH = Math.max(3, parseFloat(v) || 150); }) }))) : null,
        mode === 'custom' ? select(col, 'imgFit', 'Remplissage', { cover: 'Recadrer pour remplir', contain: 'Image entière' }) : null,
        mode === 'custom' && (col.imgW ?? 100) < 100 ? segmented('Position dans la colonne', col, 'align', { left: ALIGNS.left, center: ALIGNS.center, right: ALIGNS.right }, { left: t('Gauche'), center: t('Centré'), right: t('Droite') }) : null,
        text(col, 'caption', 'Légende (optionnelle)'));
    } else if (col.type === 'card') {
      root.append(cardPanel(col, columnWidth(doc, si, bi, ci)));
    } else if (col.type === 'figure') {
      if (!col.figure) col.figure = FIGURE_DEFAULTS();
      root.append(...buildFields(FIGURE_FIELDS, col.figure, ctx, palOpts, h));
    } else {
      if (!col.viz) col.viz = newViz('bars');
      root.append(h('button', { type: 'button', class: 'primary', style: { width: '100%' }, onclick: () => ctx.editViz({ col, sub, ci }) }, ico('pencil'), ' Ouvrir l’éditeur de dataviz'),
        h('p', { class: 'hint', textContent: 'Tous les réglages de la dataviz (type, données, couleurs, options) se font dans l’éditeur.' }));
    }
    if (col.type !== 'card') root.append(strokeControls(col));
  } else { title('Élément introuvable'); }
}
