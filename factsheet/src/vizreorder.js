/* Réordonner les éléments d'une dataviz à la souris (barres, lignes, événements de frise, pictogrammes, éléments de liste…).
   Les rendus posent un rectangle invisible `data-reorder="<tableau>:<indice>"` (+ `data-axis` x ou y) sur chaque élément quand l'éditeur est ouvert ;
   pendant le glissement le tableau de données est réordonné en direct et la dataviz redessinée : les autres éléments se réajustent tout seuls,
   avec les mêmes écarts proportionnels. L'ordre se lit dans le JSON (même tableau, autre ordre). Échap annule. */

const ORANGE = '#F28C28';

/** root : élément (ou fonction qui le renvoie) contenant la dataviz dessinée ; redraw() redessine sans enregistrer ; done(changed) à la fin */
export function startReorder(e, target, { opts, root, redraw, done }) {
  const [key, i0s] = target.getAttribute('data-reorder').split(':'), i0 = +i0s, axis = target.getAttribute('data-axis') || 'x';
  const arr0 = (opts[key] || []).slice(), n = arr0.length; if (n < 2) return false;
  const rootEl = () => (typeof root === 'function' ? root() : root);
  const centers = new Array(n);
  rootEl().querySelectorAll(`[data-reorder^="${key}:"]`).forEach(nd => {
    const j = +nd.getAttribute('data-reorder').split(':')[1], r = nd.getBoundingClientRect(); centers[j] = axis === 'x' ? (r.left + r.right) / 2 : (r.top + r.bottom) / 2;
  });
  const others = centers.map((c, j) => [c, j]).filter(([c, j]) => j !== i0 && c != null);
  let cur = i0;
  const mark = () => {
    const nd = rootEl().querySelector(`[data-reorder="${key}:${cur}"]`); if (!nd) return;
    if (nd instanceof SVGElement) { nd.setAttribute('fill', 'rgba(242,140,40,.14)'); nd.setAttribute('stroke', ORANGE); nd.setAttribute('stroke-dasharray', '4 3'); nd.setAttribute('stroke-width', '1.5'); }
    else nd.style.outline = `1.5px dashed ${ORANGE}`;
  };
  const move = ev => {
    const p = axis === 'x' ? ev.clientX : ev.clientY, fwd = p > centers[i0]; let t = 0; for (const [c] of others) if (fwd ? c <= p : c < p) t++;   // jusqu'au centre d'un voisin : on échange avec lui
    if (t === cur) return; cur = t;
    const a = arr0.slice(), [it] = a.splice(i0, 1); a.splice(t, 0, it); opts[key] = a; redraw(); mark();
  };
  const stop = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('keydown', esc, true); document.body.style.cursor = ''; };
  const up = () => { stop(); done(cur !== i0); };
  const esc = ev => { if (ev.key === 'Escape') { ev.stopPropagation(); ev.preventDefault(); opts[key] = arr0; stop(); redraw(); done(false); } };
  window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('keydown', esc, true);
  document.body.style.cursor = 'grabbing'; e.preventDefault(); mark();
  return true;
}
