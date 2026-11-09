import { PAGE, DENSITIES } from '../tokens.js';
import { h, ico } from '../render.js';
import { t } from '../i18n.js';

/* Marges et espaces : filigrane coloré par-dessus l'aperçu (hors des pages, donc jamais exporté), bouton et densités dans la barre.
   `draw()` est appelé par le dessin de l'aperçu ; `sync()` met à jour les boutons ; `toggle()` allume / éteint le filigrane. */
const SPACING_KINDS = { margin: 'Marges', sec: 'Sections', sub: 'Sous-sections', col: 'Colonnes' };

export function createSpacing(ctx) {
  const stage = ctx.stage;
  let showSpacing = false;
  const legendEl = h('div', { class: 'sp-legend' });
  const toggle = () => { showSpacing = !showSpacing; ctx.schedule(); sync(); };
  const spToggle = h('button', { type: 'button', class: 'sp-toggle', title: t('Marges et espaces'), 'aria-pressed': 'false', onclick: toggle },
    ico('ruler-measure'), h('span', { textContent: t('Marges et espaces') }));
  const densBtns = Object.entries(DENSITIES).map(([k, d]) => h('button', {
    type: 'button', title: `${t(d.label)} — ${Math.round(d.f * 100)} %`,
    onclick: () => { ctx.getDoc().density = k; ctx.restructure(); sync(); },
  }, d.label));
  function sync() {
    spToggle.classList.toggle('on', showSpacing); spToggle.setAttribute('aria-pressed', String(showSpacing));
    Object.keys(DENSITIES).forEach((k, i) => densBtns[i].classList.toggle('on', (ctx.getDoc().density || 'normal') === k));
  }
  // dans la barre (taille fixe) : ne déplace jamais l'aperçu
  document.querySelector('.bar').append(h('div', { class: 'sp-ctl' }, spToggle, h('div', { class: 'seg', role: 'group', 'aria-label': t('Espacement') }, densBtns)), legendEl);

  function draw() {
    stage.querySelectorAll('.sp-layer').forEach(n => n.remove()); legendEl.replaceChildren();
    if (!showSpacing) return;   // la mise en page peut bouger après coup (polices, images) : le filigrane suit
    stage.querySelectorAll('.pwrap').forEach(w => {
      const page = w.querySelector('.page'); if (!page) return;
      const wr = w.getBoundingClientRect(), sc = wr.width / PAGE.w, layer = h('div', { class: 'sp-layer' });
      const rel = el => { const r = el.getBoundingClientRect(); return { l: r.left - wr.left, t: r.top - wr.top, r: r.right - wr.left, b: r.bottom - wr.top }; };
      const add = (l, t, wd, ht, kind) => {
        if (wd < 1 || ht < 1) return;
        const px = Math.round((kind === 'col' ? wd : kind === 'margin' ? Math.min(wd, ht) : ht) / sc);
        layer.append(h('div', { class: 'sp sp-' + kind, style: { left: l + 'px', top: t + 'px', width: wd + 'px', height: ht + 'px' } },
          wd >= 14 && ht >= 12 || kind === 'col' && ht >= 12 ? h('span', { textContent: String(px) }) : null));
      };
      const m = PAGE.margin * sc, W = wr.width, H = wr.height, hd = page.querySelector('.hd'), top0 = hd ? rel(hd).b : 0;
      const secs = [...page.querySelectorAll('.content > .sec')];
      add(0, top0, m, H - top0, 'margin'); add(W - m, top0, m, H - top0, 'margin'); add(m, H - PAGE.marginBottom * sc, W - 2 * m, PAGE.marginBottom * sc, 'margin');
      if (secs.length) add(m, top0, W - 2 * m, rel(secs[0]).t - top0, 'margin');
      secs.forEach((sec, i) => {
        if (i) add(m, rel(secs[i - 1]).b, W - 2 * m, rel(sec).t - rel(secs[i - 1]).b, 'sec');
        const subs = [...sec.querySelectorAll('.sub')].filter(x => x.closest('.sec') === sec);
        subs.forEach((sb, j) => { if (j) { const a = rel(subs[j - 1]), b = rel(sb); add(b.l, a.b, b.r - b.l, b.t - a.b, 'sub'); } });
      });
      page.querySelectorAll('.cols').forEach(cols => {
        const ch = [...cols.children].filter(x => x.dataset && x.dataset.sel), cr = rel(cols);
        ch.forEach((c, j) => { if (j) add(rel(ch[j - 1]).r, cr.t, rel(c).l - rel(ch[j - 1]).r, cr.b - cr.t, 'col'); });
      });
      w.append(layer);
    });
    legendEl.replaceChildren(...Object.entries(SPACING_KINDS).map(([k, l]) => h('span', {}, h('i', { class: 'sp-' + k }), t(l))));
  }

  return { draw, sync, toggle, isOn: () => showSpacing };
}
