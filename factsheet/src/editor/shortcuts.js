/* Raccourcis clavier de l'éditeur, inactifs pendant une saisie ou quand une fenêtre est ouverte.
   Suppr / Retour arrière : supprime l'élément sélectionné.
   Cmd/Ctrl + Z : annuler ; + Maj (ou Ctrl + Y) : rétablir — un champ de saisie garde son propre annuler.
   Cmd/Ctrl + P : fenêtre d'export PDF, partout (l'impression du navigateur ne donne pas le document).
   Alt (⌥) + N : nouvel onglet ; Alt (⌥) + W : fermer l'onglet. Ctrl/Cmd + T et + W sont réservés par Firefox et Chrome
   (la page ne reçoit jamais ces touches) ; Alt + N / W ne correspondent à aucun menu de Firefox. Touche physique (`e.code`) :
   sur Mac, ⌥ + lettre produit un autre caractère. AltGr (= Ctrl + Alt sous Windows) n'est pas concerné. */
export function initShortcuts(ctx, history, exporter, ws) {
  window.addEventListener('keydown', (e) => {
    if (!e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || (e.code !== 'KeyN' && e.code !== 'KeyW')) return;
    const tag = e.target.tagName || '';
    if (/INPUT|TEXTAREA|SELECT/.test(tag) || e.target.isContentEditable || ws.busy()) return;
    e.preventDefault();
    if (e.code === 'KeyN') ws.newBlank();
    else ws.close();
  });
  window.addEventListener('keydown', (e) => {
    if (!(e.metaKey || e.ctrlKey) || e.altKey || e.shiftKey || e.key.toLowerCase() !== 'p') return;
    e.preventDefault();
    /* une fenêtre, l'éditeur de dataviz ou l'aperçu 3D est ouvert : on ne superpose pas l'export */
    if (!document.querySelector('dialog[open], .ve, .v3d, .ce')) exporter.openExport();
  });
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Delete' && e.key !== 'Backspace') return;
    const a = document.activeElement,
      tag = e.target.tagName || '';
    if (/INPUT|TEXTAREA|SELECT/.test(tag) || e.target.isContentEditable || (a && a.isContentEditable)) return;
    const selected = ctx.getSel();
    if (document.querySelector('dialog[open], .ve, .v3d, .ce') || !selected || selected === 'header') return;
    e.preventDefault();
    ctx.remove(selected);
  });
  window.addEventListener('keydown', (e) => {
    if (!(e.metaKey || e.ctrlKey) || e.altKey) return;
    const tg = e.target,
      tag = tg.tagName || '';
    if (/INPUT|TEXTAREA|SELECT/.test(tag) || tg.isContentEditable || document.querySelector('dialog[open], .ve, .v3d')) return;
    const k = e.key.toLowerCase();
    if (k === 'z') {
      e.preventDefault();
      e.shiftKey ? history.redo() : history.undo();
    } else if (k === 'y') {
      e.preventDefault();
      history.redo();
    }
  });
}
