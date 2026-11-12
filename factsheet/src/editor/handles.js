import { PAGE } from '../tokens.js';
import { refreshAutoCards } from '../state.js';
import { columnWidth } from '../render.js';
import { dragSplit as split } from './split.js';

/* Poignées de redimensionnement et textes libres, glissés dans l'aperçu : ce sont des `div` vides posés par le rendu (ignorés par l'export).
   `handOn()` : l'outil main est actif (les poignées ne réagissent pas). Le geste se fait en direct (`ctx.changed()`), puis `ctx.restructure()` à la fin. */
export function initHandles(ctx, { handOn }) {
  const stage = ctx.stage;
  const guardClick = () => ctx.suppressNextClick();

  /* Poignées de largeur (moteur commun `split.js`) : retour en direct (`ctx.changed()`), puis `ctx.restructure()` à la fin du geste */
  function dragSplit(e, sp, cells, { min = 0.1, apply, end }) {
    ctx.hover.hide();
    split(e, +sp.dataset.split, cells, {
      scale: sp.closest('.page').getBoundingClientRect().width / PAGE.w,
      min,
      apply,
      live: () => ctx.changed(),
      done: () => {
        guardClick();
        end();
        ctx.restructure();
      },
    });
  }

  /* entre deux colonnes d'une sous-section : gabarit « Personnalisé » */
  stage.addEventListener(
    'pointerdown',
    (e) => {
      if (e.button !== 0 || handOn()) return;
      const sp = e.target.closest('.col-split');
      if (!sp) return;
      const doc = ctx.getDoc(),
        subEl = sp.closest('.sub'),
        q = subEl && subEl.dataset.sel.split(':'),
        sb = q && doc.sections[+q[1]]?.subs[+q[2]];
      if (!sb) return;
      dragSplit(
        e,
        sp,
        [...sp.parentElement.children].filter((c) => c.classList.contains('col')),
        {
          apply: (f) => {
            sb.layout = 'custom';
            sb.widths = f;
          },
          end: () => refreshAutoCards(sb, (k) => columnWidth(doc, +q[1], +q[2], k)),
        },
      );
    },
    true,
  );

  /* entre plusieurs chiffres clés d'une même colonne */
  stage.addEventListener(
    'pointerdown',
    (e) => {
      if (e.button !== 0 || handOn()) return;
      const sp = e.target.closest('.fig-split');
      if (!sp) return;
      const colEl = sp.closest('.col'),
        q = colEl && colEl.dataset.sel.split(':'),
        fg = q && ctx.getDoc().sections[+q[1]]?.subs[+q[2]]?.cols[+q[3]]?.figure;
      if (!fg) return;
      dragSplit(
        e,
        sp,
        [...sp.parentElement.children].filter((c) => c.classList.contains('fg-cell')),
        {
          min: 0.15,
          apply: (f) => {
            fg.widths = f;
          },
          end: () => {},
        },
      );
    },
    true,
  );

  /* largeur d'un texte libre : poignée au bord droit */
  stage.addEventListener(
    'pointerdown',
    (e) => {
      if (e.button !== 0 || handOn()) return;
      const gp = e.target.closest('.free-grip');
      if (!gp) return;
      const n = gp.closest('[data-free]'),
        q = n.dataset.free.split(':'),
        idx = +q.pop(),
        tx = ctx.getDoc().sections[+q[1]]?.subs[+q[2]]?.cols[+q[3]]?.texts?.[idx],
        colEl = n.closest('.col');
      if (!tx) return;
      const sc = colEl.closest('.page').getBoundingClientRect().width / PAGE.w,
        colW = colEl.getBoundingClientRect().width / sc,
        w0 = +tx.w || 50,
        px = e.clientX;
      let moved = false;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      ctx.hover.hide();
      document.body.style.cursor = 'ew-resize';
      const move = (ev) => {
        moved = true;
        tx.w = Math.round(Math.max(10, Math.min(100 - (+tx.x || 0), w0 + ((ev.clientX - px) / sc / colW) * 100)));
        ctx.changed();
      };
      const up = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        document.body.style.cursor = '';
        if (moved) {
          guardClick();
          ctx.restructure();
        }
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    },
    true,
  );

  /* Séparation entre un contenu et son chiffre à côté : glisser la poignée (entre les deux) change leurs largeurs en direct */
  stage.addEventListener(
    'pointerdown',
    (e) => {
      if (e.button !== 0 || handOn()) return;
      const sp = e.target.closest('.side-split');
      if (!sp) return;
      const colEl = sp.closest('.col'),
        q = colEl && colEl.dataset.sel.split(':'),
        col = q && ctx.getDoc().sections[+q[1]]?.subs[+q[2]]?.cols[+q[3]];
      const sd = col && (col.type === 'viz' ? col.viz && col.viz.side : col.side);
      if (!sd) return;
      const sc = colEl.closest('.page').getBoundingClientRect().width / PAGE.w,
        W = sp.parentElement.getBoundingClientRect().width / sc;
      const s0 = +sd.share || 60,
        dir = sd.pos === 'left' ? -1 : 1,
        px = e.clientX;
      let moved = false;
      e.preventDefault();
      e.stopPropagation();
      ctx.hover.hide();
      document.body.style.cursor = 'col-resize';
      const move = (ev) => {
        moved = true;
        sd.share = Math.round(Math.max(25, Math.min(80, s0 + ((dir * (ev.clientX - px)) / sc / W) * 100)));
        ctx.changed();
      };
      const up = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        document.body.style.cursor = '';
        if (moved) {
          guardClick();
          ctx.restructure();
        }
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    },
    true,
  );

  /* Textes libres d'une colonne : glisser = les placer où l'on veut dans la colonne (x en % de la largeur, y en px) */
  stage.addEventListener(
    'pointerdown',
    (e) => {
      if (e.button !== 0 || handOn()) return;
      const n = e.target.closest('[data-free]');
      if (!n) return;
      const q = n.dataset.free.split(':'),
        idx = +q.pop(),
        col = ctx.getDoc().sections[+q[1]]?.subs[+q[2]]?.cols[+q[3]],
        tx = col && col.texts && col.texts[idx],
        colEl = n.closest('.col');
      if (!tx || !colEl) return;
      const sc = colEl.closest('.page').getBoundingClientRect().width / PAGE.w,
        cr = colEl.getBoundingClientRect(),
        nr = n.getBoundingClientRect();
      const colW = cr.width / sc,
        x0 = +tx.x || 0,
        y0 = (nr.top - cr.top) / sc,
        w = +tx.w || 50,
        px = e.clientX,
        py = e.clientY;
      let moved = false;
      e.stopPropagation();
      ctx.hover.hide();
      const move = (ev) => {
        if (!moved && Math.hypot(ev.clientX - px, ev.clientY - py) < 3) return;
        moved = true;
        tx.x = Math.round(Math.max(0, Math.min(100 - Math.min(w, 100), x0 + ((ev.clientX - px) / sc / colW) * 100)) * 10) / 10;
        tx.y = Math.round(Math.max(0, y0 + (ev.clientY - py) / sc));
        ctx.changed();
      };
      const up = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        if (moved) {
          guardClick();
          ctx.restructure();
        }
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    },
    true,
  );
}
