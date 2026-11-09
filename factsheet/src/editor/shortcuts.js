/* Raccourcis clavier de l'éditeur, inactifs pendant une saisie ou quand une fenêtre est ouverte.
   Suppr / Retour arrière : supprime l'élément sélectionné.
   Cmd/Ctrl + Z : annuler ; + Maj (ou Ctrl + Y) : rétablir — un champ de saisie garde son propre annuler. */
export function initShortcuts(ctx, history) {
  window.addEventListener('keydown', e => {
    if (e.key !== 'Delete' && e.key !== 'Backspace') return;
    const a = document.activeElement, tag = (e.target.tagName || '');
    if (/INPUT|TEXTAREA|SELECT/.test(tag) || e.target.isContentEditable || (a && a.isContentEditable)) return;
    const selected = ctx.getSel();
    if (document.querySelector('dialog[open], .ve, .v3d, .ce') || !selected || selected === 'header') return;
    e.preventDefault(); ctx.remove(selected);
  });
  window.addEventListener('keydown', e => {
    if (!(e.metaKey || e.ctrlKey) || e.altKey) return;
    const tg = e.target, tag = tg.tagName || '';
    if (/INPUT|TEXTAREA|SELECT/.test(tag) || tg.isContentEditable || document.querySelector('dialog[open], .ve, .v3d')) return;
    const k = e.key.toLowerCase();
    if (k === 'z') { e.preventDefault(); e.shiftKey ? history.redo() : history.undo(); }
    else if (k === 'y') { e.preventDefault(); history.redo(); }
  });
}
