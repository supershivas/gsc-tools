/* Palette du document : modifier, renommer, ajouter, supprimer une couleur.
   Se trouve dans les propriétés du document et s'ouvre en fenêtre depuis chaque choix de couleur (openPalette). */
import { h, ico } from './render.js';
import { t } from './i18n.js';
import { THEMES, paletteOf, colorLabel, PROTECTED_COLORS } from './tokens.js';
import { openColorEditor } from './colorpicker.js';
import { paletteCmyk } from './cmyk.js';
import { extraColorKeys, addColor, removeColor, canAddColor, colorUses } from './state.js';
import { confirmBox, chooseBox } from './dialogs.js';
import { openPaletteImport } from './paletteimport.js';

/** redraw : redessine l'appelant après un changement de structure (ajout, suppression, retour au thème) */
export function buildPalette(ctx, redraw) {
  const doc = ctx.getDoc(),
    th = THEMES[doc.theme] || THEMES.eu,
    pal = paletteOf(doc.theme, doc.colors),
    extras = extraColorKeys(doc);
  doc.colorNames = doc.colorNames || {};
  const defName = (k) => (extras.includes(k) ? k : t(th.names[k] || k));
  const cm = paletteCmyk(doc);
  const open = (k, sw) =>
    openColorEditor({
      anchor: sw,
      hex: pal[k],
      cmyk: cm[k],
      title: t(colorLabel(doc, k)),
      onChange: (hex, c) => {
        doc.colors[k] = hex;
        sw.style.background = hex;
        if (c) (doc.cmyk || (doc.cmyk = {}))[k] = c;
        else if (doc.cmyk) delete doc.cmyk[k];
        ctx.changed();
      },
      onClose: redraw,
    });
  /* EU Blue et Yellow star restent toujours : on les voit, on ne les modifie pas */
  const lockedRow = (k) =>
    h(
      'div',
      { class: 'pal2-row locked', dataset: { key: k } },
      h('span', { class: 'pal2-sw', style: { background: pal[k] } }),
      h('span', { class: 'pal2-name', textContent: t(colorLabel(doc, k)) }),
      h('span', { class: 'pal2-lock', title: t('Cette couleur reste toujours dans le document') }, ico('lock')),
    );
  const row = (k) => {
    const isExtra = extras.includes(k);
    const sw = h('button', {
      type: 'button',
      class: 'pal2-sw',
      title: t('Modifier la couleur'),
      'aria-label': t('Modifier la couleur'),
      style: { background: pal[k] },
      onclick: () => open(k, sw),
    });
    const name = h('input', {
      type: 'text',
      value: doc.colorNames[k] || defName(k),
      'aria-label': t('Nom de la couleur'),
      oninput: (e) => {
        const v = e.target.value.trim();
        if (v && v !== defName(k)) doc.colorNames[k] = v;
        else if (!isExtra) delete doc.colorNames[k];
        ctx.changed();
      },
    });
    return h(
      'div',
      { class: 'pal2-row', dataset: { key: k } },
      sw,
      name,
      h(
        'button',
        {
          type: 'button',
          class: 'mini danger',
          title: t('Supprimer'),
          'aria-label': t('Supprimer'),
          onclick: () => removeWithReplacement(k),
        },
        ico('x'),
      ),
    );
  };
  /* Suppression : si la couleur est utilisée, on choisit celle qui la remplace (EU Blue par défaut) */
  const removeWithReplacement = async (k) => {
    let rep = 'blue';
    if (colorUses(doc, k)) {
      const options = [...Object.keys(pal).filter((x) => x !== k), 'white'].map((x) => ({
        value: x,
        label: t(colorLabel(doc, x)),
        color: x === 'white' ? '#ffffff' : pal[x],
      }));
      rep = await chooseBox(t('Cette couleur est utilisée dans le document. Choisissez la couleur qui la remplace :'), options, 'blue');
      if (rep == null) return;
    } else if (!(await confirmBox(t('Supprimer cette couleur ?'), { ok: t('Supprimer'), danger: true }))) return;
    removeColor(doc, k, rep);
    ctx.restructure();
    redraw();
  };
  return h(
    'div',
    { class: 'pal2-wrap' },
    h(
      'div',
      { class: 'pal2-bar' },
      h(
        'button',
        {
          type: 'button',
          class: 'mini',
          title: t('Importer une palette…'),
          'aria-label': t('Importer une palette…'),
          onclick: () => openPaletteImport(ctx, redraw),
        },
        ico('file-import'),
      ),
    ),
    h(
      'div',
      { class: 'pal2' },
      PROTECTED_COLORS.filter((k) => pal[k]).map(lockedRow),
      h('div', { class: 'pal2-sep', role: 'separator' }),
      Object.keys(pal)
        .filter((k) => !PROTECTED_COLORS.includes(k))
        .map(row),
    ),
    canAddColor(doc)
      ? h(
          'div',
          { class: 'pal2-add' },
          h(
            'button',
            {
              type: 'button',
              class: 'pp-btn',
              onclick: () => {
                const k = addColor(doc, '#808080');
                ctx.changed();
                redraw();
                requestAnimationFrame(() => {
                  const b = document.querySelector(`[data-key="${k}"] .pal2-sw`);
                  if (b) b.click();
                });
              },
            },
            ico('plus'),
            h('span', { textContent: t('Ajouter une couleur') }),
          ),
        )
      : null,
  );
}

/* Fenêtre flottante près du bouton qui l'ouvre ; un clic en dehors ou Échap la ferme */
let pop = null;
export function closePalette() {
  if (!pop) return;
  const p = pop;
  pop = null;
  document.removeEventListener('pointerdown', p.away, true);
  document.removeEventListener('keydown', p.key, true);
  p.el.remove();
  p.ctx.restructure();
}
export function openPalette(anchor, ctx) {
  if (pop && pop.anchor === anchor) {
    closePalette();
    return;
  }
  closePalette();
  const body = h('div', { class: 'pal-pop-body' });
  const draw = () => body.replaceChildren(buildPalette(ctx, draw));
  const el = h(
    'div',
    { class: 'pal-pop', role: 'dialog', 'aria-label': t('Couleurs du document') },
    h(
      'div',
      { class: 'pal-pop-head' },
      h('b', { textContent: t('Couleurs du document') }),
      h('button', { type: 'button', class: 'mini', 'aria-label': t('Fermer'), onclick: closePalette }, ico('x')),
    ),
    body,
  );
  draw();
  document.body.append(el);
  const r = anchor.getBoundingClientRect(),
    w = el.offsetWidth,
    hh = el.offsetHeight;
  el.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, r.left - w + r.width)) + 'px';
  el.style.top = Math.max(8, Math.min(window.innerHeight - hh - 8, r.bottom + 6)) + 'px';
  const away = (e) => {
    if (el.contains(e.target) || anchor.contains(e.target) || e.target.closest('.ce, dialog.pimp')) return;
    closePalette();
  };
  const key = (e) => {
    if (e.key === 'Escape' && !document.querySelector('.ce, dialog.pimp')) closePalette();
  };
  document.addEventListener('pointerdown', away, true);
  document.addEventListener('keydown', key, true);
  pop = { el, anchor, away, key, ctx };
}
