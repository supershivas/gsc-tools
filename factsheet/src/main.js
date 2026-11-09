import { cssVars, applyVars } from './tokens.js';
import { loadDoc, saveDoc, removeCol } from './state.js';
import { columnWidth } from './render.js';
import { loadFonts } from './viz/util.js';
import { buildTree } from './tree.js';
import { buildProps } from './props.js';
import { openVizEditor } from './vizeditor.js';
import { initHover } from './hover.js';
import { createHistory } from './editor/history.js';
import { createHistoryUi } from './editor/history-ui.js';
import { createSpacing } from './editor/spacing.js';
import { createSelection } from './editor/selection.js';
import { createPreview } from './editor/preview.js';
import { createHand } from './editor/hand.js';
import { initHandles } from './editor/handles.js';
import { createZoom } from './editor/zoom.js';
import { createDnd } from './editor/dnd.js';
import { initShortcuts } from './editor/shortcuts.js';
import { createExport } from './editor/export-ui.js';
import { createProjectFile } from './editor/project-file.js';
import { initLang, declareMenus } from './editor/menus.js';

/* Éditeur du Factsheet creator : état du document, `ctx` (ce que les panneaux et les modules d'`editor/` se partagent) et assemblage.
   Chaque module d'`editor/` reçoit `ctx` ; ceux qui y ajoutent des méthodes le disent en tête de fichier
   (preview.js : schedule, preview, shown… ; dnd.js : startColDrag…). */
let doc = loadDoc();
let selected = null;
const collapsed = new Set();
let undoSnap = null,
  suppressClick = false;
const treeEl = document.getElementById('tree'),
  propsEl = document.getElementById('props');
const stage = document.getElementById('stage');

const pathOk = (p) => {
  if (!p) return true;
  const q = p.split(':'),
    sec = doc.sections[+q[1]];
  if (q[0] === 'header') return true;
  if (!sec) return false;
  if (q[0] === 'sec') return true;
  const sub = sec.subs[+q[2]];
  if (!sub) return false;
  return q[0] === 'sub' || !!sub.cols[+q[3]];
};
const parentOf = (p) => {
  const q = p.split(':');
  return q[0] === 'col' ? `sub:${q[1]}:${q[2]}` : q[0] === 'sub' ? `sec:${q[1]}` : null;
};
function fixSelection() {
  while (selected && !pathOk(selected)) selected = parentOf(selected);
}
function drawTree() {
  const top = treeEl.scrollTop;
  buildTree(treeEl, ctx);
  treeEl.scrollTop = top;
}
function drawProps() {
  const top = propsEl.scrollTop;
  buildProps(propsEl, ctx);
  propsEl.scrollTop = top;
  spacing.sync();
}

const ctx = {
  getDoc: () => doc,
  getSel: () => selected,
  collapsed,
  stage,
  treeEl,
  propsEl,
  /* remplace le document (ouverture, nouvelle factsheet, retour dans l'historique) ; `clearSelection` : plus rien de sélectionné */
  setDoc(d, clearSelection) {
    doc = d;
    undoSnap = null;
    if (clearSelection) selected = null;
  },
  /* un glissement ou un geste vient de finir : le clic qui suit n'est pas une sélection */
  suppressNextClick() {
    suppressClick = true;
    setTimeout(() => {
      suppressClick = false;
    }, 0);
  },
  takeSuppressedClick() {
    const s = suppressClick;
    suppressClick = false;
    return s;
  },
  changed() {
    undoSnap = null;
    history.record(true);
    saveDoc(doc);
    ctx.schedule();
    drawTree();
    const v = cssVars(doc.theme, doc.colors, doc.density);
    applyVars(propsEl, v);
    applyVars(treeEl, v);
  },
  refreshProps: drawProps,
  refreshTree: drawTree,
  /* Déplacement de contenu : `fn` modifie le document et renvoie le chemin à sélectionner ensuite.
     L'état d'avant est gardé pour « Annuler le déplacement » (jusqu'à la prochaine modification). */
  moved(fn, label = 'Contenu déplacé. Vérifiez le remplissage des pages.', undoLabel = 'Annuler le déplacement') {
    const to = fn();
    selected = to || null;
    ctx.restructure();
    ctx.select(selected);
    historyUi.noteToast(label, undoLabel);
  },
  /* Supprime l'élément sélectionné (section, sous-section ou colonne) — annulable */
  remove(path) {
    const q = String(path || '').split(':'),
      si = +q[1],
      bi = +q[2],
      ci = +q[3],
      sec = doc.sections[si],
      sub = sec && sec.subs[bi];
    if (q[0] === 'sec' && sec)
      ctx.moved(
        () => {
          doc.sections.splice(si, 1);
          return null;
        },
        'Élément supprimé.',
        'Annuler la suppression',
      );
    else if (q[0] === 'sub' && sub)
      ctx.moved(
        () => {
          sec.subs.splice(bi, 1);
          return `sec:${si}`;
        },
        'Élément supprimé.',
        'Annuler la suppression',
      );
    else if (q[0] === 'col' && sub && sub.cols[ci])
      ctx.moved(
        () => removeCol(doc, si, bi, ci),
        sub.cols.length > 1 ? 'Colonne supprimée : les autres s’étendent.' : 'Élément supprimé.',
        'Annuler la suppression',
      );
  },
  restructure() {
    fixSelection();
    history.record(false);
    saveDoc(doc);
    drawTree();
    drawProps();
    ctx.schedule();
  },
  select(path) {
    selected = path || null;
    fixSelection();
    drawTree();
    drawProps();
    ctx.schedule();
    const n = treeEl.querySelector('.tn.sel');
    if (n) n.scrollIntoView({ block: 'nearest' });
  },
  editViz({ col, sub, ci }) {
    const sec = doc.sections.find((x) => x.subs.includes(sub));
    openVizEditor({ col, sub, ci, bg: sec && sec.bg, width: columnWidth(doc, doc.sections.indexOf(sec), sec.subs.indexOf(sub), ci), ctx });
  },
};

/* ---------- Assemblage (l'ordre des écouteurs de l'aperçu compte : outil main, survol, poignées, zoom, glisser-déposer) ---------- */
const spacing = createSpacing(ctx);
const selection = createSelection(ctx);
const preview = createPreview(ctx, { spacing, selection });
const history = createHistory(ctx);
const hand = createHand(ctx);
ctx.hover = initHover({
  stage,
  getDoc: () => doc,
  ctx,
  canShow: () =>
    !hand.on() && !dnd.dragging() && !document.body.classList.contains('ve-open') && !document.body.classList.contains('dragging'),
  select: (path) => ctx.select(path),
});
initHandles(ctx, { handOn: hand.on });
createZoom(ctx, preview, selection);
const dnd = createDnd(ctx);
const exporter = createExport(ctx);
initShortcuts(ctx, history, exporter);

const project = createProjectFile(ctx, exporter.fileStem);
document.addEventListener('fs-natural', () => {
  saveDoc(doc);
  ctx.schedule();
}); // proportions d'une image « ajustée » connues après chargement
const langSel = initLang(ctx);
const historyUi = createHistoryUi(ctx, history, { onSync: spacing.sync });
declareMenus({ ctx, history, historyUi, preview, spacing, hand, project, exporter, langSel });

new ResizeObserver(ctx.schedule).observe(stage);
drawTree();
drawProps();
ctx.schedule();
loadFonts().then(ctx.schedule); // les mesures de texte supposent les polices chargées

spacing.sync();
history.record(false);
historyUi.syncCenter(); // état de départ de l'historique
