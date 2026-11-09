/* Sélection dans l'aperçu : clic → sélection (structure à gauche, propriétés à droite), double-clic sur une dataviz → éditeur,
   et cadre de sélection superposé à la page (pas recadré par le bord de page) ; une section est encadrée à la largeur des marges.
   L'animation d'apparition (SEL_STYLE, voir le Labo) ne joue que quand la sélection change, pas à chaque retouche. */
import { h } from '../render.js';

const SEL_STYLE = 'halo',
  SEL_GAP = 3; // variante retenue au Labo ; 3 px d'air entre le contenu et le cadre

export function createSelection(ctx) {
  const stage = ctx.stage;
  let selShown = null;
  function draw() {
    const selected = ctx.getSel();
    stage.querySelectorAll('.sel-layer').forEach((n) => n.remove());
    if (!selected || ctx.previewing()) return;
    const fresh = selShown !== selected;
    selShown = selected;
    stage.querySelectorAll('.pwrap').forEach((w) => {
      const el = w.querySelector(`.page [data-sel="${selected}"]`);
      if (!el) return;
      const wr = w.getBoundingClientRect(),
        r = el.getBoundingClientRect(),
        gx = selected.startsWith('sec:') ? 0 : SEL_GAP; // une section est encadrée sur toute sa largeur, marges comprises
      w.append(
        h(
          'div',
          { class: 'sel-layer' },
          h('div', {
            class: `sel-frame v-${SEL_STYLE}` + (fresh ? ' pop' : ''),
            style: {
              left: r.left - wr.left - gx + 'px',
              top: r.top - wr.top - SEL_GAP + 'px',
              width: r.width + 2 * gx + 'px',
              height: r.height + 2 * SEL_GAP + 'px',
            },
          }),
        ),
      );
    });
  }

  /* Clic dans l'aperçu → sélection */
  stage.addEventListener('click', (e) => {
    if (ctx.takeSuppressedClick()) return;
    const n = e.target.closest('[data-sel]');
    ctx.select(n ? n.dataset.sel : null);
  });

  /* Double-clic sur une dataviz de l'aperçu → éditeur */
  stage.addEventListener('dblclick', (e) => {
    const n = e.target.closest('.col-viz[data-sel]');
    if (!n) return;
    const [, si, bi, ci] = n.dataset.sel.split(':').map(Number);
    const doc = ctx.getDoc(),
      sec = doc.sections[si],
      sub = sec && sec.subs[bi],
      col = sub && sub.cols[ci];
    if (col) ctx.editViz({ col, sub, ci });
  });

  return { draw };
}
