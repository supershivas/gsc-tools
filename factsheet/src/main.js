import { cssVars, applyVars } from './tokens.js';
import { removeCol } from './state.js';
import { columnWidth } from './render.js';
import { loadFonts } from './viz/util.js';
import { buildTree } from './tree.js';
import { buildProps } from './props.js';
import { openVizEditor } from './vizeditor.js';
import { linkShortcut } from './editor.js';
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
import { loadWorkspace, createWorkspace } from './editor/workspace.js';
import { createTabsUi } from './editor/tabs-ui.js';

/* Éditeur du Factsheet creator : `ctx` (ce que les panneaux et les modules d'`editor/` se partagent) et assemblage.
   Chaque module d'`editor/` reçoit `ctx` ; ceux qui y ajoutent des méthodes le disent en tête de fichier
   (preview.js : schedule, preview, shown… ; dnd.js : startColDrag…).
   Plusieurs documents peuvent être ouverts (onglets, editor/workspace.js) : aucun état de document ici. Document, sélection,
   cartes repliées, historique, zoom et filigrane sont ceux de l'onglet actif (`ctx.tab()`), relus à chaque appel.
   Le démarrage attend la lecture de l'espace de travail (IndexedDB) : `window.FS_READY`, attendu par index.html. */
window.FS_READY = (async () => {
  const init = await loadWorkspace();
  let ws = null,
    tabsUi = null,
    suppressClick = false;
  const tab = () => ws.active();
  const treeEl = document.getElementById('tree'),
    propsEl = document.getElementById('props');
  const stage = document.getElementById('stage');

  const pathOk = (p) => {
    if (!p) return true;
    const q = p.split(':'),
      sec = ctx.getDoc().sections[+q[1]];
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
    const tb = tab();
    while (tb.sel && !pathOk(tb.sel)) tb.sel = parentOf(tb.sel);
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
    /* onglet actif et accès aux autres documents ouverts (lecture ; copie entre fichiers : session suivante) */
    tab,
    tabs: () => ws.tabs.map((x) => ({ id: x.id, name: ws.nameOf(x), doc: x.doc, active: x === tab() })),
    getDocOf: (id) => (ws.get(id) || {}).doc || null,
    getDoc: () => tab().doc,
    getSel: () => tab().sel,
    get collapsed() {
      return tab().collapsed;
    },
    stage,
    treeEl,
    propsEl,
    /* remplace le document de l'onglet actif (retour dans l'historique) ; `clearSelection` : plus rien de sélectionné */
    setDoc(d, clearSelection) {
      tab().doc = d;
      if (clearSelection) tab().sel = null;
    },
    /* zoom, filigrane, sélection : enregistrés avec la liste des onglets */
    viewChanged: () => ws && ws.viewChanged(),
    /* petit message en bas à gauche, sans bouton */
    note: (label) => historyUi.noteToast(label),
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
      history.record(true);
      ws.touch();
      ctx.schedule();
      drawTree();
      applyDocVars();
    },
    refreshProps: drawProps,
    refreshTree: drawTree,
    /* Déplacement de contenu : `fn` modifie le document et renvoie le chemin à sélectionner ensuite.
     L'état d'avant est gardé pour « Annuler le déplacement » (jusqu'à la prochaine modification). */
    moved(fn, label = 'Contenu déplacé. Vérifiez le remplissage des pages.', undoLabel = 'Annuler le déplacement') {
      const to = fn();
      tab().sel = to || null;
      ctx.restructure();
      ctx.select(tab().sel);
      historyUi.noteToast(label, undoLabel);
    },
    /* Supprime l'élément sélectionné (section, sous-section ou colonne) — annulable */
    remove(path) {
      const q = String(path || '').split(':'),
        si = +q[1],
        bi = +q[2],
        ci = +q[3],
        doc = ctx.getDoc(),
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
      ws.touch();
      drawTree();
      drawProps();
      ctx.schedule();
    },
    select(path) {
      tab().sel = path || null;
      fixSelection();
      ctx.viewChanged();
      drawTree();
      drawProps();
      ctx.schedule();
      const n = treeEl.querySelector('.tn.sel');
      if (n) n.scrollIntoView({ block: 'nearest' });
    },
    editViz({ col, sub, ci }) {
      const doc = ctx.getDoc(),
        sec = doc.sections.find((x) => x.subs.includes(sub));
      openVizEditor({
        col,
        sub,
        ci,
        bg: sec && sec.bg,
        width: columnWidth(doc, doc.sections.indexOf(sec), sec.subs.indexOf(sub), ci),
        ctx,
        fileStem: (x) => exporter.fileStem(x),
      });
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
    getDoc: () => ctx.getDoc(),
    ctx,
    canShow: () =>
      !hand.on() && !dnd.dragging() && !document.body.classList.contains('ve-open') && !document.body.classList.contains('dragging'),
    select: (path) => ctx.select(path),
  });
  initHandles(ctx, { handOn: hand.on });
  createZoom(ctx, preview, selection);
  const dnd = createDnd(ctx);
  const exporter = createExport(ctx);
  ctx.exporter = exporter;
  linkShortcut();

  const project = createProjectFile(ctx, exporter.fileStem);
  document.addEventListener('fs-natural', () => {
    ws.touch();
    ctx.schedule();
  }); // proportions d'une image « ajustée » connues après chargement (brouillon seulement : pas un pas d'historique)
  const historyUi = createHistoryUi(ctx, history, { onSync: spacing.sync });

  /* Espace de travail : onglets, brouillons (IndexedDB), fichiers récents */
  ws = createWorkspace(ctx, init, {
    onSwitch: showTab,
    onStatus: () => tabsUi && tabsUi.render(),
  });
  ctx.workspace = ws;
  history.onChange = () => {
    historyUi.syncCenter();
    ws.historyChanged();
  };
  tabsUi = createTabsUi(ws, document.getElementById('fsTabs'));
  ws.loadRecents();
  initShortcuts(ctx, history, exporter, ws);
  const langSel = initLang(ctx);
  declareMenus({ ctx, history, historyUi, preview, spacing, hand, project, exporter, langSel, ws });

  /* Changement d'onglet : tout ce qui montre le document est redessiné d'après l'onglet actif */
  function showTab() {
    ctx.hover.hide();
    document.querySelectorAll('.fs-toast').forEach((n) => n.remove());
    fixSelection();
    applyDocVars();
    drawTree();
    drawProps();
    ctx.schedule();
    if (!tab().hist.stack.length) history.record(false); // premier passage sur cet onglet : état de départ de son historique
    historyUi.syncCenter();
    if (tabsUi) tabsUi.render();
  }
  function applyDocVars() {
    const doc = ctx.getDoc(),
      v = cssVars(doc.theme, doc.colors, doc.density);
    applyVars(propsEl, v);
    applyVars(treeEl, v);
  }

  new ResizeObserver(ctx.schedule).observe(stage);
  tab().view.restoreScroll = true;
  drawTree();
  drawProps();
  ctx.schedule();
  loadFonts().then(ctx.schedule); // les mesures de texte supposent les polices chargées

  spacing.sync();
  history.record(false);
  historyUi.syncCenter(); // état de départ de l'historique
  tabsUi.render();
})();
