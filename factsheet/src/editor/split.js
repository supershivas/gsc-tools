/* Poignée de largeur entre deux cellules voisines (colonnes d'une sous-section, chiffres clés, colonnes d'un tableau) :
   glisser la poignée `i` règle en direct les fractions des cellules i et i + 1 (collées aux douzièmes), les autres ne bougent pas.
   cells = éléments dont on lit les largeurs ; scale = pixels écran par unité (zoom de l'aperçu ou de l'éditeur) ;
   apply(fractions) range les fractions, live() redessine, done() après un vrai glissement (un clic simple n'est jamais un geste). */
export function dragSplit(e, i, cells, { scale = 1, min = 0.1, apply, live, done }) {
  const ws = cells.map((c) => c.getBoundingClientRect().width / scale),
    sum = ws.reduce((a, b) => a + b, 0) || 1,
    f0 = ws.map((w) => w / sum),
    px = e.clientX;
  let moved = false;
  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();
  document.body.style.cursor = 'col-resize';
  const move = (ev) => {
    moved = true;
    const pair = f0[i] + f0[i + 1],
      before = f0.slice(0, i).reduce((a, b) => a + b, 0);
    let b = before + f0[i] + (ev.clientX - px) / scale / sum;
    const snap = Math.round(b * 12) / 12;
    if (Math.abs(b - snap) < 0.014) b = snap;
    b = Math.max(before + min, Math.min(before + pair - min, b));
    const f = f0.slice();
    f[i] = b - before;
    f[i + 1] = before + pair - b;
    apply(f.map((v) => Math.round(v * 1000) / 1000));
    if (live) live();
  };
  const up = () => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    document.body.style.cursor = '';
    if (moved && done) done();
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
}
