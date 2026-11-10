/* PEC organigramme : état, panneau d’édition et aperçu en direct. Un seul écran. */
import { initShell } from 'gsc/shell.js';
import { confirmModal, alertModal } from 'gsc/dialog.js';
import { newPerson, newGroup, newBox, newLevel, cloneBox, defaultDoc, find, fileStem, uid } from 'org/model.js';
import { layout, placedRect, pageSize, T } from 'org/layout.js';
import { measure, loadFonts, renderSvg } from 'org/render.js';
import { load, save, toFile, fromFile, createHistory } from 'org/store.js';

const MM = 72 / 25.4;
const MAX_IMAGE_BYTES = 1.5 * 1024 * 1024;

const el = (tag, props = {}, ...kids) => {
  const e = document.createElement(tag);
  const { data, ...rest } = props;
  Object.assign(e, rest);
  if (data) Object.assign(e.dataset, data);
  e.append(...kids.flat().filter((k) => k != null && k !== false));
  return e;
};
const icon = (name) => el('i', { className: 'ti ti-' + name, ariaHidden: 'true' });
const iconBtn = (name, label, onclick, extra = {}) => el('button', { type: 'button', className: 'ib', title: label, ariaLabel: label, onclick, ...extra }, icon(name));

/* ── État ─────────────────────────────────────────────────────────────── */
const loadedState = load();
let doc = loadedState.doc;
let history = createHistory(doc);
let lay = null;
let storageWarned = false;
const closed = new Set(); // cadres repliés dans le panneau (état d’interface, non enregistré)

const $ = (id) => document.getElementById(id);
const panel = $('panel');
const svg = $('sheet');
const statusEl = $('status');

/* ── Toast (popover : passe devant les <dialog>) ──────────────────────── */
let toastTimer;
function toast(text, action) {
  const t = $('toast');
  t.replaceChildren(el('span', { textContent: text }), action ? el('button', { type: 'button', className: 'toast-act', textContent: action.label, onclick: () => (hideToast(), action.run()) }) : null);
  try {
    if (!t.matches(':popover-open')) t.showPopover();
  } catch {
    /* navigateur sans popover : le message reste dans la page */
  }
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, action ? 7000 : 4000);
}
function hideToast() {
  try {
    $('toast').hidePopover();
  } catch {
    /* déjà fermé */
  }
}

/* ── Dessin ───────────────────────────────────────────────────────────── */
function draw() {
  lay = layout(doc, measure);
  renderSvg(svg, lay, doc);
  svg.parentElement.style.aspectRatio = `${lay.W} / ${lay.H}`;
  fitSheet();
  const pct = Math.round(lay.scale * 100);
  let text = '100 %';
  let tip = 'Taille du gabarit : rien n’est réduit';
  let cls = '';
  let ic = 'check';
  if (lay.overflow > 0) {
    text = `Dépasse de ${Math.ceil(lay.overflow / MM)} mm`;
    tip = 'Le contenu dépasse le bas de la page : activez « Ajuster à la page » ou allégez';
    cls = 'warn';
    ic = 'alert-triangle';
  } else if (lay.small) {
    text = `Réduit à ${pct} % : peu lisible`;
    tip = `Noms en ${(T.nameSize * lay.scale).toFixed(1)} pt : trop petit pour l’impression, allégez ou répartissez sur plus de cadres`;
    cls = 'warn';
    ic = 'alert-triangle';
  } else if (lay.scale < 0.999) {
    text = `Réduit à ${pct} %`;
    tip = `Tout est réduit pour tenir dans la page (noms en ${(T.nameSize * lay.scale).toFixed(1)} pt au lieu de ${T.nameSize})`;
    ic = 'arrows-minimize';
  }
  statusEl.title = tip;
  statusEl.className = 'status ' + cls;
  statusEl.replaceChildren(icon(ic), el('span', { textContent: text }));
  $('undo').disabled = !history.canUndo();
  $('redo').disabled = !history.canRedo();
}

/* La feuille occupe toute la place disponible sans jamais faire défiler la zone. */
function fitSheet() {
  const stage = $('stage');
  const { W, H } = pageSize(doc);
  const availW = stage.clientWidth - 48;
  const availH = stage.clientHeight - 48;
  if (availW <= 0) return;
  const w = availH > 120 ? Math.min(availW, (availH * W) / H) : availW;
  svg.parentElement.style.width = Math.max(120, Math.floor(w)) + 'px';
}

function persist() {
  if (!save(doc) && !storageWarned) {
    storageWarned = true;
    toast('Stockage du navigateur plein : enregistrez le fichier JSON pour ne rien perdre');
  }
}

/* Toute modification passe par ici : historique, enregistrement, aperçu ; `rebuild` reconstruit le panneau. */
function commit({ key = null, rebuild = true, focus = null } = {}) {
  history.record(doc, key);
  persist();
  draw();
  if (rebuild) renderPanel(focus);
}

function step(back) {
  const next = history.step(doc, back);
  if (!next) return;
  doc = next;
  $('title').value = doc.title;
  persist();
  draw();
  renderPanel();
}

const removed = (label) => toast(label, { label: 'Annuler', run: () => step(true) });

/* ── Panneau ──────────────────────────────────────────────────────────── */
/* Champ de texte lié au modèle : l’aperçu suit chaque frappe, sans reconstruire le panneau. */
function field(obj, prop, k, { placeholder = '', label = placeholder, cls = '', onEnter = null } = {}) {
  return el('input', {
    type: 'text',
    className: 'in ' + cls,
    value: obj[prop],
    placeholder,
    ariaLabel: label,
    autocomplete: 'off',
    spellcheck: false,
    data: { k },
    oninput: (e) => {
      obj[prop] = e.target.value;
      commit({ key: k, rebuild: false });
    },
    onkeydown: (e) => {
      if (e.key === 'Enter' && onEnter) {
        e.preventDefault();
        onEnter();
      }
    },
  });
}

/* Choix court entre 2 ou 3 valeurs. */
function pair(value, options, onpick, label) {
  return el(
    'div',
    { className: 'pair', role: 'group', ariaLabel: label },
    options.map(([v, text, ic]) => el('button', { type: 'button', className: v === value ? 'on' : '', ariaPressed: String(v === value), onclick: () => v !== value && onpick(v) }, ic ? icon(ic) : null, text)),
  );
}

const check = (checked, text, onchange) => el('label', { className: 'check' }, el('input', { type: 'checkbox', checked, onchange: (e) => onchange(e.target.checked) }), el('span', { textContent: text }));

function move(list, index, delta) {
  const to = index + delta;
  if (to < 0 || to >= list.length) return;
  list.splice(to, 0, list.splice(index, 1)[0]);
  commit();
}
const moveBtns = (list, index, [prevIc, nextIc], [prevLabel, nextLabel]) => [
  iconBtn(prevIc, prevLabel, () => move(list, index, -1), { disabled: index === 0 }),
  iconBtn(nextIc, nextLabel, () => move(list, index, 1), { disabled: index === list.length - 1 }),
];

function personRow(group, p, i) {
  const addAfter = () => {
    const np = newPerson();
    group.people.splice(i + 1, 0, np);
    commit({ focus: np.id + ':name' });
  };
  return el(
    'div',
    { className: 'person' + (p.emph ? ' emph' : ''), data: { id: p.id } },
    field(p, 'name', p.id + ':name', { placeholder: 'Prénom NOM', cls: 'name', onEnter: addAfter }),
    field(p, 'role', p.id + ':role', { placeholder: 'Fonction', cls: 'role', onEnter: addAfter }),
    iconBtn(p.emph ? 'star-off' : 'star', p.emph ? 'Ne plus mettre en avant' : 'Mettre en avant (fonction plus grande)', () => ((p.emph = !p.emph), commit()), { ariaPressed: String(p.emph) }),
    moveBtns(group.people, i, ['arrow-up', 'arrow-down'], ['Monter', 'Descendre']),
    iconBtn('trash', 'Supprimer la personne', () => {
      group.people.splice(i, 1);
      commit();
      removed('Personne supprimée');
    }),
  );
}

function groupCard(box, g, gi) {
  const addPerson = () => {
    const np = newPerson();
    g.people.push(np);
    commit({ focus: np.id + ':name' });
  };
  return el(
    'div',
    { className: 'group', data: { id: g.id } },
    el(
      'div',
      { className: 'group-head' },
      icon('layout-list'),
      field(g, 'title', g.id + ':title', { placeholder: 'Sous-section (vide : sans barre)', label: 'Titre de la sous-section' }),
      moveBtns(box.groups, gi, ['arrow-up', 'arrow-down'], ['Monter la sous-section', 'Descendre la sous-section']),
      iconBtn('trash', 'Supprimer la sous-section', () => {
        box.groups.splice(gi, 1);
        commit();
        removed('Sous-section supprimée');
      }),
    ),
    g.people.map((p, i) => personRow(g, p, i)),
    el('button', { type: 'button', className: 'add', onclick: addPerson }, icon('user-plus'), 'Ajouter une personne'),
  );
}

function boxCard(level, box, bi) {
  const body = el(
    'div',
    { className: 'box-body' },
    el('label', { className: 'row' }, el('span', { textContent: 'Titre' }), field(box, 'title', box.id + ':title', { placeholder: 'Titre du cadre' })),
    el(
      'div',
      { className: 'row' },
      el('span', { textContent: 'En-tête' }),
      pair(box.tone, [['dark', 'EU Blue'], ['mid', 'EU Blue 60 %']], (v) => ((box.tone = v), commit()), 'Couleur de l’en-tête'),
    ),
    el(
      'div',
      { className: 'row' },
      el('span', { textContent: 'Texte' }),
      pair(box.align, [['left', 'À gauche', 'align-left'], ['center', 'Centré', 'align-center']], (v) => ((box.align = v), commit()), 'Alignement du texte'),
    ),
    check(!!box.lead, 'Personne en tête du cadre (nom et fonction en grand)', (on) => {
      box.lead = on ? { name: '', role: '' } : null;
      commit({ focus: on ? box.id + ':leadName' : null });
    }),
    box.lead
      ? el(
          'div',
          { className: 'lead' },
          field(box.lead, 'name', box.id + ':leadName', { placeholder: 'Prénom NOM', cls: 'name' }),
          field(box.lead, 'role', box.id + ':leadRole', { placeholder: 'Fonction', cls: 'role' }),
        )
      : null,
    box.groups.map((g, gi) => groupCard(box, g, gi)),
    el(
      'button',
      {
        type: 'button',
        className: 'add',
        onclick: () => {
          const g = newGroup('', [newPerson()]);
          box.groups.push(g);
          commit({ focus: g.id + ':title' });
        },
      },
      icon('row-insert-bottom'),
      'Ajouter une sous-section',
    ),
  );
  const count = box.groups.reduce((n, g) => n + g.people.length, 0) + (box.lead ? 1 : 0);
  const d = el(
    'details',
    { className: 'box', open: !closed.has(box.id), data: { id: box.id }, ontoggle: () => (d.open ? closed.delete(box.id) : closed.add(box.id)) },
    el(
      'summary',
      {},
      icon('chevron-right'),
      el('b', { className: 'box-title', textContent: box.title || 'Sans titre' }),
      el('small', { textContent: `${count} pers.` }),
      el(
        'span',
        { className: 'tools' },
        moveBtns(level.boxes, bi, ['arrow-left', 'arrow-right'], ['Déplacer à gauche', 'Déplacer à droite']),
        iconBtn('copy', 'Dupliquer le cadre', () => {
          level.boxes.splice(bi + 1, 0, cloneBox(box));
          commit();
        }),
        iconBtn('trash', 'Supprimer le cadre', () => {
          level.boxes.splice(bi, 1);
          commit();
          removed('Cadre supprimé');
        }),
      ),
    ),
    body,
  );
  return d;
}

function levelCard(level, li) {
  return el(
    'section',
    { className: 'level', data: { id: level.id } },
    el(
      'header',
      {},
      el('h3', { textContent: `Niveau ${li + 1}` }),
      el('small', { textContent: level.boxes.length > 1 ? `${level.boxes.length} cadres côte à côte` : level.boxes.length ? '1 cadre' : 'vide' }),
      el(
        'span',
        { className: 'tools' },
        moveBtns(doc.levels, li, ['arrow-up', 'arrow-down'], ['Monter le niveau', 'Descendre le niveau']),
        iconBtn('trash', 'Supprimer le niveau', () => {
          doc.levels.splice(li, 1);
          commit();
          removed('Niveau supprimé');
        }),
      ),
    ),
    level.boxes.map((b, bi) => boxCard(level, b, bi)),
    el(
      'button',
      {
        type: 'button',
        className: 'add',
        onclick: () => {
          const b = newBox('', { tone: level.boxes.length ? level.boxes[level.boxes.length - 1].tone : 'mid' });
          level.boxes.push(b);
          commit({ focus: b.id + ':title' });
        },
      },
      icon('column-insert-right'),
      'Ajouter un cadre à ce niveau',
    ),
  );
}

/* Zone d’une image placée : importer, déposer, largeur, replacer, retirer. */
function placedCard(key, title, hint) {
  const p = doc[key];
  const input = el('input', { type: 'file', accept: 'image/png,image/jpeg,image/svg+xml', hidden: true, onchange: () => input.files[0] && setPlaced(key, input.files[0]) });
  const zone = el(
    'div',
    {
      className: 'drop' + (p ? ' has' : ''),
      ondragover: (e) => (e.preventDefault(), zone.classList.add('over')),
      ondragleave: () => zone.classList.remove('over'),
      ondrop: (e) => {
        e.preventDefault();
        zone.classList.remove('over');
        if (e.dataTransfer.files[0]) setPlaced(key, e.dataTransfer.files[0]);
      },
    },
    input,
  );
  if (!p) {
    zone.append(icon('photo-plus'), el('span', { textContent: hint }), el('button', { type: 'button', className: 'btn', onclick: () => input.click() }, icon('upload'), 'Importer'));
  } else {
    const r = placedRect(doc, key);
    zone.append(
      el('img', { className: 'thumb', src: doc.assets[p.asset], alt: '' }),
      el(
        'div',
        { className: 'drop-info' },
        el('span', { className: 'fname', textContent: p.name || title }),
        el(
          'label',
          { className: 'row' },
          el('span', { textContent: 'Largeur' }),
          el('input', {
            type: 'number',
            className: 'in num',
            min: 5,
            max: 300,
            step: 1,
            value: Math.round(p.w / MM),
            data: { k: key + ':w' },
            oninput: (e) => {
              const mm = +e.target.value;
              if (!(mm >= 5 && mm <= 300)) return;
              const right = r.x + p.w;
              p.w = mm * MM;
              if (!r.auto && key === 'image') p.x = right - p.w; // l’image reste calée à droite
              commit({ key: key + ':w', rebuild: false });
            },
          }),
          el('span', { textContent: 'mm' }),
        ),
        el('small', { textContent: r.auto ? (key === 'logo' ? 'Calé en haut à gauche' : 'Calée en haut à droite') : 'Placement libre (glissé dans la page)' }),
      ),
      el(
        'span',
        { className: 'tools' },
        r.auto ? null : iconBtn('focus-centered', 'Replacer à l’emplacement d’origine', () => ((p.x = p.y = null), commit())),
        iconBtn('replace', 'Remplacer', () => input.click()),
        iconBtn('trash', 'Retirer', () => {
          doc[key] = null;
          commit();
          removed(key === 'logo' ? 'Logo retiré' : 'Image retirée');
        }),
      ),
    );
  }
  return el('section', { className: 'card' }, el('h3', { textContent: title }), zone);
}

function renderPanel(focusKey = null) {
  const active = document.activeElement;
  const keep = focusKey || (active && panel.contains(active) && active.dataset.k) || null;
  const sel = !focusKey && active && keep && active.selectionStart != null && active.type === 'text' ? [active.selectionStart, active.selectionEnd] : null;
  const top = panel.scrollTop;
  panel.replaceChildren(
    el(
      'section',
      { className: 'card' },
      el('h3', { textContent: 'Page' }),
      el(
        'div',
        { className: 'row' },
        el('span', { textContent: 'Format A4' }),
        pair(doc.page.orientation, [['landscape', 'Paysage', 'rectangle'], ['portrait', 'Portrait', 'rectangle-vertical']], (v) => ((doc.page.orientation = v), (doc.logo && (doc.logo.x = doc.logo.y = null)), (doc.image && (doc.image.x = doc.image.y = null)), commit()), 'Orientation'),
      ),
      check(doc.page.fit, 'Ajuster à la page (réduit tout si le contenu dépasse)', (on) => ((doc.page.fit = on), commit())),
      check(doc.page.equalHeights, 'Même hauteur pour les cadres d’un niveau', (on) => ((doc.page.equalHeights = on), commit())),
    ),
    placedCard('logo', 'Logo (en haut à gauche)', 'Déposer un logo ici (PNG, JPEG, SVG)'),
    placedCard('image', 'Image (en haut à droite)', 'Déposer une image ici (PNG, JPEG, SVG)'),
    ...doc.levels.map((l, i) => levelCard(l, i)),
    el(
      'button',
      {
        type: 'button',
        className: 'add big',
        onclick: () => {
          const l = newLevel([newBox()]);
          doc.levels.push(l);
          commit({ focus: l.boxes[0].id + ':title' });
        },
      },
      icon('row-insert-bottom'),
      'Ajouter un niveau',
    ),
  );
  panel.scrollTop = top;
  if (keep) {
    const target = panel.querySelector(`[data-k="${CSS.escape(keep)}"]`);
    if (target) {
      target.focus({ preventScroll: !focusKey });
      if (focusKey) target.scrollIntoView({ block: 'nearest' });
      if (sel) target.setSelectionRange(...sel);
      else if (focusKey && target.select) target.select();
    }
  }
}

/* ── Images placées ───────────────────────────────────────────────────── */
const readDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });

async function setPlaced(key, file) {
  if (!/^image\/(png|jpeg|svg\+xml)$/.test(file.type)) return alertModal('Formats acceptés : PNG, JPEG ou SVG.', { title: 'Fichier non reconnu' });
  try {
    const url = await readDataUrl(file);
    const img = new Image();
    img.src = url;
    await img.decode();
    const ratio = img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 1;
    const id = uid('a');
    doc.assets[id] = url;
    const old = doc[key];
    doc[key] = { asset: id, name: file.name, ratio, w: old ? old.w : Math.min(40 * MM, 20 * MM * ratio), x: old ? old.x : null, y: old ? old.y : null };
    commit();
    if (file.size > MAX_IMAGE_BYTES) toast('Image lourde : elle risque de ne pas tenir dans le stockage du navigateur');
  } catch {
    alertModal('Cette image n’a pas pu être lue.', { title: 'Import impossible' });
  }
}

const svgPoint = (e) => {
  const m = svg.getScreenCTM();
  return m ? new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse()) : { x: 0, y: 0 };
};

/* Glisser une image pour la déplacer, sa poignée pour la redimensionner ; un simple clic ne bouge rien. */
svg.addEventListener('pointerdown', (e) => {
  const g = e.target.closest('.placed');
  if (!g || e.button !== 0) return;
  e.preventDefault();
  const key = g.dataset.key;
  const p = doc[key];
  const start = svgPoint(e);
  const r0 = placedRect(doc, key);
  const resize = e.target.classList.contains('placed-grip');
  let moved = false;
  svg.setPointerCapture(e.pointerId);
  const onMove = (ev) => {
    const pt = svgPoint(ev);
    const dx = pt.x - start.x;
    const dy = pt.y - start.y;
    if (!moved && Math.hypot(dx, dy) < 2) return;
    moved = true;
    if (resize) p.w = Math.max(5 * MM, Math.min(300 * MM, r0.w + dx));
    else {
      p.x = r0.x + dx;
      p.y = r0.y + dy;
    }
    if (resize && r0.auto && key === 'image') (p.x = r0.x), (p.y = r0.y); // sinon le calage à droite la ferait fuir sous la poignée
    draw();
  };
  const onUp = () => {
    svg.removeEventListener('pointermove', onMove);
    svg.removeEventListener('pointerup', onUp);
    svg.removeEventListener('pointercancel', onUp);
    if (moved) commit();
  };
  svg.addEventListener('pointermove', onMove);
  svg.addEventListener('pointerup', onUp);
  svg.addEventListener('pointercancel', onUp);
});

/* Clic dans l’aperçu : ouvre et vise le champ correspondant dans le panneau. */
svg.addEventListener('click', (e) => {
  if (e.target.closest('.placed')) return;
  let id = e.target.dataset && e.target.dataset.id;
  let fieldName = e.target.dataset && e.target.dataset.field;
  if (!id) {
    const pt = svgPoint(e);
    const hit = lay.hits.find((h) => !h.level && pt.x >= h.x && pt.x <= h.x + h.w && pt.y >= h.y && pt.y <= h.y + h.h);
    if (!hit) return;
    id = hit.id;
  }
  const f = find(doc, id);
  if (!f) return;
  const boxId = f.kind === 'box' ? f.node.id : f.box && f.box.id;
  if (boxId && closed.has(boxId)) {
    closed.delete(boxId);
    renderPanel();
  }
  const target = panel.querySelector(`[data-k="${CSS.escape(id + ':' + (fieldName || 'title'))}"]`) || panel.querySelector(`[data-k^="${CSS.escape(id + ':')}"]`);
  if (target) {
    target.scrollIntoView({ block: 'center', behavior: 'smooth' });
    target.focus({ preventScroll: true });
    target.select();
  }
});

/* Déposer un fichier sur la page : moitié gauche = logo, moitié droite = image. */
const stage = $('stage');
stage.addEventListener('dragover', (e) => e.preventDefault());
stage.addEventListener('drop', (e) => {
  e.preventDefault();
  const file = e.dataTransfer.files[0];
  if (!file) return;
  if (/json$/.test(file.type) || /\.json$/i.test(file.name)) return importFile(file);
  setPlaced(svgPoint(e).x < pageSize(doc).W / 2 ? 'logo' : 'image', file);
});

/* ── Fichiers ─────────────────────────────────────────────────────────── */
function download(blob, name) {
  const a = el('a', { href: URL.createObjectURL(blob), download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
}

function exportJson() {
  download(new Blob([JSON.stringify(toFile(doc), null, 2)], { type: 'application/json' }), fileStem(doc.title) + '.json');
  toast('Fichier JSON enregistré');
}

async function importFile(file) {
  let next;
  try {
    next = fromFile(JSON.parse(await file.text()));
  } catch (e) {
    return alertModal(e.message === 'newer' ? 'Ce fichier vient d’une version plus récente de l’outil. Rechargez la page pour mettre l’app à jour.' : 'Ce fichier n’est pas un organigramme enregistré par cet outil.', {
      title: 'Import impossible',
    });
  }
  next.assets = { ...doc.assets, ...next.assets };
  doc = next;
  $('title').value = doc.title;
  commit();
  toast('Organigramme importé', { label: 'Annuler', run: () => step(true) });
}

async function exportPdfFile() {
  const btn = $('pdf');
  if (lay.overflow > 0 && !(await confirmModal('Le contenu dépasse la page : le bas sera coupé à l’impression. Activez « Ajuster à la page » pour l’éviter.', { title: 'Exporter quand même ?', ok: 'Exporter', danger: true })))
    return;
  btn.disabled = true;
  btn.classList.add('busy');
  try {
    const { exportPdf } = await import('org/pdf.js');
    const bytes = await exportPdf(layout(doc, measure), doc);
    download(new Blob([bytes], { type: 'application/pdf' }), fileStem(doc.title) + '.pdf');
    toast('PDF CMJN exporté');
  } catch (e) {
    console.error(e);
    alertModal('Le PDF n’a pas pu être créé. Vérifiez la connexion puis réessayez.', { title: 'Export impossible' });
  } finally {
    btn.disabled = false;
    btn.classList.remove('busy');
  }
}

/* ── Barre et raccourcis ──────────────────────────────────────────────── */
$('title').value = doc.title;
$('title').addEventListener('input', (e) => {
  doc.title = e.target.value;
  commit({ key: 'doc:title', rebuild: false });
});
$('undo').addEventListener('click', () => step(true));
$('redo').addEventListener('click', () => step(false));
$('save').addEventListener('click', exportJson);
$('open').addEventListener('click', () => $('open-file').click());
$('open-file').addEventListener('change', (e) => {
  if (e.target.files[0]) importFile(e.target.files[0]);
  e.target.value = '';
});
$('pdf').addEventListener('click', exportPdfFile);
$('reset').addEventListener('click', async () => {
  if (!(await confirmModal('L’organigramme actuel est remplacé par le gabarit de départ. Vous pourrez annuler.', { title: 'Repartir du gabarit ?', ok: 'Repartir du gabarit', danger: true }))) return;
  doc = { ...defaultDoc(), assets: doc.assets };
  $('title').value = doc.title;
  commit();
  toast('Gabarit rétabli', { label: 'Annuler', run: () => step(true) });
});

document.addEventListener('keydown', (e) => {
  if (!(e.metaKey || e.ctrlKey) || document.querySelector('dialog[open]')) return;
  const k = e.key.toLowerCase();
  if (k === 'z') (e.preventDefault(), step(!e.shiftKey));
  else if (k === 'y') (e.preventDefault(), step(false));
  else if (k === 's') (e.preventDefault(), exportJson());
  else if (k === 'p') (e.preventDefault(), exportPdfFile());
});

new ResizeObserver(fitSheet).observe(stage);

/* ── Démarrage ────────────────────────────────────────────────────────── */
initShell({ sub: 'PEC organigramme' });
renderPanel();
draw();
loadFonts().then(draw, draw);
if (loadedState.error) toast('Les données enregistrées étaient illisibles : le gabarit de départ est affiché');

// Pour les tests et le débogage : état courant, sans rien modifier.
window.pecOrganigramme = { get doc() { return doc; }, get layout() { return lay; } };
