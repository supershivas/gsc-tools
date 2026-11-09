/* Palette du document : modifier, renommer, ajouter, supprimer une couleur.
   Se trouve dans les propriétés du document et s'ouvre en fenêtre depuis chaque choix de couleur (openPalette). */
import { h, ico } from './render.js';
import { t } from './i18n.js';
import { THEMES, paletteOf, colorLabel, tintOf } from './tokens.js';
import { openColorEditor } from './colorpicker.js';
import { paletteCmyk } from './cmyk.js';
import { extraColorKeys, addColor, removeColor, canAddColor } from './state.js';

/** redraw : redessine l'appelant après un changement de structure (ajout, suppression, retour au thème) */
export function buildPalette(ctx, redraw) {
  const doc = ctx.getDoc(), th = THEMES[doc.theme] || THEMES.eu, pal = paletteOf(doc.theme, doc.colors), extras = extraColorKeys(doc);
  doc.colorNames = doc.colorNames || {};
  const defName = k => (extras.includes(k) ? k : t(th.names[k] || k));
  const cm = paletteCmyk(doc), cmTxt = k => cm[k].map(v => Math.round(v)).join(' · ');
  const open = (k, sw) => openColorEditor({ anchor: sw, hex: pal[k], cmyk: cm[k], title: t(colorLabel(doc, k)),
    onChange: (hex, c) => { doc.colors[k] = hex; sw.style.background = hex; if (c) (doc.cmyk || (doc.cmyk = {}))[k] = c; else if (doc.cmyk) delete doc.cmyk[k]; ctx.changed(); }, onClose: redraw });
  const row = k => {
    const isExtra = extras.includes(k), recolored = !isExtra && doc.colors[k] && doc.colors[k].toLowerCase() !== th.colors[k].toLowerCase(), renamed = !isExtra && !!doc.colorNames[k];
    const sw = h('button', { type: 'button', class: 'pal2-sw', title: t('Modifier la couleur'), 'aria-label': t('Modifier la couleur'), style: { background: pal[k] }, onclick: () => open(k, sw) });
    const name = h('input', { type: 'text', value: doc.colorNames[k] || defName(k), 'aria-label': t('Nom de la couleur'), oninput: e => {
      const v = e.target.value.trim();
      if (v && v !== defName(k)) doc.colorNames[k] = v; else if (!isExtra) delete doc.colorNames[k];
      ctx.changed();
    } });
    const chip = h('i', { class: 'pal2-tint', title: t('Ton léger (20 %)'), style: { background: tintOf(pal[k]) } });
    return h('div', { class: 'pal2-row', dataset: { key: k } }, sw, chip, name,
      h('span', { class: 'pal2-hex', textContent: cmTxt(k).replace(/ · /g, '·'), title: `${t('CMJN')} ${cmTxt(k)} — ${t('RVB écran')} ${pal[k].toUpperCase()}` }),
      isExtra ? h('button', { type: 'button', class: 'mini danger', title: t('Supprimer'), 'aria-label': t('Supprimer'), onclick: () => { if (confirm(t('Supprimer cette couleur ? Ce qui l’utilise passera en bleu.'))) { removeColor(doc, k); ctx.changed(); redraw(); } } }, ico('x'))
        : recolored || renamed ? h('button', { type: 'button', class: 'mini', title: t('Rétablir la couleur du thème'), 'aria-label': t('Rétablir la couleur du thème'), onclick: () => { delete doc.colors[k]; if (doc.cmyk) delete doc.cmyk[k]; delete doc.colorNames[k]; ctx.changed(); redraw(); } }, ico('restore')) : h('span'));
  };
  return h('div', { class: 'pal2-wrap' },
    h('div', { class: 'pal2' }, Object.keys(pal).map(row)),
    canAddColor(doc) ? h('button', { type: 'button', class: 'pp-btn', onclick: () => {
      const k = addColor(doc, '#808080'); ctx.changed(); redraw();
      requestAnimationFrame(() => { const b = document.querySelector(`[data-key="${k}"] .pal2-sw`); if (b) b.click(); });
    } }, ico('plus'), h('span', { textContent: t('Ajouter une couleur') })) : null);
}

/* Fenêtre flottante près du bouton qui l'ouvre ; un clic en dehors ou Échap la ferme */
let pop = null;
export function closePalette() {
  if (!pop) return; const p = pop; pop = null;
  document.removeEventListener('pointerdown', p.away, true); document.removeEventListener('keydown', p.key, true);
  p.el.remove(); p.ctx.restructure();
}
export function openPalette(anchor, ctx) {
  if (pop && pop.anchor === anchor) { closePalette(); return; }
  closePalette();
  const body = h('div', { class: 'pal-pop-body' });
  const draw = () => body.replaceChildren(buildPalette(ctx, draw));
  const el = h('div', { class: 'pal-pop', role: 'dialog', 'aria-label': t('Couleurs du document') },
    h('div', { class: 'pal-pop-head' }, h('b', { textContent: t('Couleurs du document') }),
      h('button', { type: 'button', class: 'mini', 'aria-label': t('Fermer'), onclick: closePalette }, ico('x'))), body);
  draw(); document.body.append(el);
  const r = anchor.getBoundingClientRect(), w = el.offsetWidth, hh = el.offsetHeight;
  el.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, r.left - w + r.width)) + 'px';
  el.style.top = Math.max(8, Math.min(window.innerHeight - hh - 8, r.bottom + 6)) + 'px';
  const away = e => { if (el.contains(e.target) || anchor.contains(e.target) || e.target.closest('.ce')) return; closePalette(); };
  const key = e => { if (e.key === 'Escape' && !document.querySelector('.ce')) closePalette(); };
  document.addEventListener('pointerdown', away, true); document.addEventListener('keydown', key, true);
  pop = { el, anchor, away, key, ctx };
}
