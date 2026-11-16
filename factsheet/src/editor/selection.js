/* Sélection dans l'aperçu : clic → sélection (structure à gauche, propriétés à droite), double-clic sur une dataviz → éditeur,
   et cadre de sélection superposé à la page (pas recadré par le bord de page) ; une section est encadrée à la largeur des marges.
   L'animation d'apparition (SEL_STYLE, voir le Labo) ne joue que quand la sélection change, pas à chaque retouche. */
import { h } from '../render.js';
import { openCard } from '../props/kit.js';

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
    if (e.target.closest('a[href]')) e.preventDefault(); // un lien du document ne s'ouvre pas dans l'éditeur : le clic sélectionne
    if (ctx.takeSuppressedClick()) return;
    const n = e.target.closest('[data-sel]');
    ctx.select(n ? n.dataset.sel : null);
  });

  /* Double-clic sur un texte, une carte ou un chiffre clé → le curseur va dans le champ de l'élément visé (sa carte s'ouvre au besoin) */
  const fieldOf = (e, n, col) => {
    const hit = (sel) => e.target.closest(sel);
    if (hit('[data-free]')) return null; // texte libre : il se glisse, son champ est dans « Textes libres »
    if (col.type === 'text') return { card: 'col-content', css: '.re' };
    if (col.type === 'card') {
      const C = col.card || {},
        key = hit('.card-tag') ? 'tag' : hit('.card-title') ? 'title' : hit('.vf-value') ? 'figure' : hit('.card-link') ? 'link' : 'text';
      return { card: 'col-content', css: C[key] ? `[data-fk="${key}"] .re` : '.re' };
    }
    if (hit('.fg-over')) return { card: 'col-fig-head', css: '[data-fk="headText"] textarea' };
    const cell = hit('.fg-cell'),
      i = cell ? [...cell.parentElement.querySelectorAll(':scope > .fg-cell')].indexOf(cell) : 0,
      key = hit('.vf-text') ? 'text' : 'value';
    return i > 0
      ? { card: 'col-fig-more', css: `[data-path="more.${i - 1}"] [data-fk="${key}"] .re` }
      : { card: 'col-content', css: `[data-fk="${key}"] .re` };
  };
  const focusField = ({ card, css }) => {
    openCard('col', card);
    ctx.refreshProps();
    requestAnimationFrame(() => {
      const el = document.querySelector(`#props ${css}`);
      if (!el) return;
      el.scrollIntoView({ block: 'center' });
      el.focus();
      if (el.isContentEditable) {
        const r = document.createRange(); // curseur à la fin du texte
        r.selectNodeContents(el);
        r.collapse(false);
        const sl = window.getSelection();
        sl.removeAllRanges();
        sl.addRange(r);
      } else if (el.setSelectionRange) el.setSelectionRange(el.value.length, el.value.length);
    });
  };

  /* Double-clic sur une dataviz ou un tableau de l'aperçu → son éditeur */
  stage.addEventListener('dblclick', (e) => {
    const n = e.target.closest('.col[data-sel]');
    if (!n) return;
    const [, si, bi, ci] = n.dataset.sel.split(':').map(Number);
    const doc = ctx.getDoc(),
      sec = doc.sections[si],
      sub = sec && sec.subs[bi],
      col = sub && sub.cols[ci];
    if (!col) return;
    if (col.type === 'table') ctx.editTable({ col, sub, ci });
    else if (col.type === 'viz') ctx.editViz({ col, sub, ci });
    else if (col.type === 'text' || col.type === 'card' || col.type === 'figure') {
      const f = fieldOf(e, n, col);
      if (f) focusField(f);
    }
  });

  return { draw };
}
