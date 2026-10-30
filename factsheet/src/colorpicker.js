/* Éditeur de couleur : carré saturation/luminosité + curseur de teinte, curseurs RGB ou HSV avec valeurs numériques, code hexadécimal,
   pipette si le navigateur la propose. Les changements s'appliquent en direct (onChange) ; Annuler remet la couleur d'origine.
   Un clic en dehors valide. Le composant ne connaît pas le document : l'appelant range la couleur où il veut. */
import { h, ico } from './render.js';
import { t } from './i18n.js';

/* ----- conversions ----- */
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const normHex = s => { let x = String(s || '').trim().replace(/^#/, ''); if (/^[0-9a-f]{3}$/i.test(x)) x = x.replace(/./g, c => c + c); return /^[0-9a-f]{6}$/i.test(x) ? '#' + x.toUpperCase() : null; };
const toRgb = hex => { const n = parseInt(hex.slice(1), 16); return { r: n >> 16 & 255, g: n >> 8 & 255, b: n & 255 }; };
const toHex = ({ r, g, b }) => '#' + [r, g, b].map(x => Math.round(clamp(x, 0, 255)).toString(16).padStart(2, '0')).join('').toUpperCase();
function rgb2hsv({ r, g, b }) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let hh = 0;
  if (d) hh = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: hh * 60, s: mx ? d / mx : 0, v: mx };
}
function hsv2rgb({ h: hh, s, v }) {
  const f = n => { const k = (n + hh / 60) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)); };
  return { r: f(5) * 255, g: f(3) * 255, b: f(1) * 255 };
}

let current = null;

/** opts : { anchor (élément), hex, title, onChange(hex), onClose?(committed) } */
export function openColorEditor({ anchor, hex, title, onChange, onClose }) {
  if (current) current.close(true);
  const start = normHex(hex) || '#000000';
  let hsv = rgb2hsv(toRgb(start)), mode = 'rgb', done = false;
  const rgb = () => hsv2rgb(hsv);

  /* carré S/V */
  const sv = h('div', { class: 'ce-sv' }, h('i', { class: 'ce-knob' }));
  const hue = h('div', { class: 'ce-hue' }, h('i', { class: 'ce-knob' }));
  const drag = (el, fn) => {
    const at = e => { const r = el.getBoundingClientRect(); fn(clamp((e.clientX - r.left) / r.width, 0, 1), clamp((e.clientY - r.top) / r.height, 0, 1)); };
    el.addEventListener('pointerdown', e => { e.preventDefault(); el.setPointerCapture(e.pointerId); at(e); const mv = ev => at(ev), up = () => { el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); }; el.addEventListener('pointermove', mv); el.addEventListener('pointerup', up); });
  };
  drag(sv, (x, y) => { hsv.s = x; hsv.v = 1 - y; update(); });
  drag(hue, (x) => { hsv.h = x * 359.999; update(); });

  const hexIn = h('input', { type: 'text', class: 'ce-hex', maxlength: 7, spellcheck: false, 'aria-label': 'Hex',
    onchange: () => { const n = normHex(hexIn.value); if (n) { hsv = rgb2hsv(toRgb(n)); update(); } else update(); } });
  const before = h('i', { class: 'ce-before', style: { background: start }, title: start }), after = h('i', { class: 'ce-after' });

  /* curseurs RGB / HSV */
  const sliders = h('div', { class: 'ce-sliders' });
  const specs = () => mode === 'rgb'
    ? [['R', 0, 255, rgb().r, v => { const c = rgb(); c.r = v; hsv = rgb2hsv(c); }], ['G', 0, 255, rgb().g, v => { const c = rgb(); c.g = v; hsv = rgb2hsv(c); }], ['B', 0, 255, rgb().b, v => { const c = rgb(); c.b = v; hsv = rgb2hsv(c); }]]
    : [['H', 0, 359, hsv.h, v => { hsv.h = v; }], ['S', 0, 100, hsv.s * 100, v => { hsv.s = v / 100; }], ['V', 0, 100, hsv.v * 100, v => { hsv.v = v / 100; }]];
  const gradient = (i) => {
    const c = rgb();
    if (mode === 'rgb') { const a = { ...c }, b = { ...c }; ['r', 'g', 'b'][i] && (a[['r', 'g', 'b'][i]] = 0, b[['r', 'g', 'b'][i]] = 255); return `linear-gradient(90deg,${toHex(a)},${toHex(b)})`; }
    if (i === 0) return 'linear-gradient(90deg,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)';
    const lo = toHex(hsv2rgb({ ...hsv, [i === 1 ? 's' : 'v']: 0 })), hi = toHex(hsv2rgb({ ...hsv, [i === 1 ? 's' : 'v']: 1 }));
    return `linear-gradient(90deg,${lo},${hi})`;
  };
  function drawSliders() {
    sliders.replaceChildren(...specs().map(([label, min, max, val, set], i) => {
      const num = h('input', { type: 'number', min, max, step: 1, value: Math.round(val), 'aria-label': label });
      const rng = h('input', { type: 'range', min, max, step: 1, value: Math.round(val), class: 'ce-range', style: { background: gradient(i) }, 'aria-label': label });
      const apply = v => { set(clamp(+v || 0, min, max)); update(true); };
      rng.addEventListener('input', () => apply(rng.value)); num.addEventListener('input', () => { if (num.value !== '') apply(num.value); });
      return h('div', { class: 'ce-row' }, h('b', { textContent: label }), rng, num);
    }));
  }
  const tab = (m, label) => h('button', { type: 'button', class: 'ce-tab' + (mode === m ? ' on' : ''), textContent: label, onclick: () => { mode = m; tabs.querySelectorAll('.ce-tab').forEach(b => b.classList.toggle('on', b.dataset.m === m)); drawSliders(); } });
  const tabs = h('div', { class: 'ce-tabs' }, ...[['rgb', 'RGB'], ['hsv', 'HSV']].map(([m, l]) => { const b = tab(m, l); b.dataset.m = m; return b; }));
  const eye = window.EyeDropper ? h('button', { type: 'button', class: 'mini', title: t('Pipette'), 'aria-label': t('Pipette'), onclick: async () => { try { const r = await new window.EyeDropper().open(); const n = normHex(r.sRGBHex); if (n) { hsv = rgb2hsv(toRgb(n)); update(); } } catch (e) { /* annulé */ } } }, ico('color-picker')) : null;

  let raf = 0, last = start;
  function update(keepSliders) {
    const hx = toHex(rgb()), pure = toHex(hsv2rgb({ h: hsv.h, s: 1, v: 1 }));
    sv.style.background = `linear-gradient(to top,#000,transparent),linear-gradient(to right,#fff,${pure})`;
    sv.firstChild.style.cssText = `left:${hsv.s * 100}%;top:${(1 - hsv.v) * 100}%;background:${hx}`;
    hue.firstChild.style.cssText = `left:${hsv.h / 359.999 * 100}%;background:${pure}`;
    after.style.background = hx; if (document.activeElement !== hexIn) hexIn.value = hx;
    if (!keepSliders) drawSliders(); else if (mode === 'hsv' || true) { const rs = sliders.querySelectorAll('input[type=range]'), ns = sliders.querySelectorAll('input[type=number]'); specs().forEach(([, , , v], i) => { if (document.activeElement !== ns[i]) ns[i].value = Math.round(v); if (document.activeElement !== rs[i]) rs[i].value = Math.round(v); rs[i].style.background = gradient(i); }); }
    if (hx !== last) { last = hx; cancelAnimationFrame(raf); raf = requestAnimationFrame(() => onChange(hx)); }
  }

  const pop = h('div', { class: 'ce', role: 'dialog', 'aria-label': title || t('Couleur') },
    h('div', { class: 'ce-head' }, h('strong', { textContent: title || t('Couleur') }), h('button', { type: 'button', class: 'mini', 'aria-label': t('Annuler'), onclick: () => close(false) }, ico('x'))),
    sv, hue,
    h('div', { class: 'ce-cmp' }, h('span', { class: 'ce-pair' }, before, after), hexIn, eye),
    tabs, sliders,
    h('div', { class: 'row ce-act' }, h('button', { type: 'button', textContent: 'Annuler', onclick: () => close(false) }), h('button', { type: 'button', class: 'primary', textContent: 'OK', onclick: () => close(true) })));
  document.body.append(pop);
  const place = () => {
    const a = anchor ? anchor.getBoundingClientRect() : { left: window.innerWidth - 20, top: 80, bottom: 80 }, w = pop.offsetWidth, hh = pop.offsetHeight;
    let left = a.left - w - 14; if (left < 8) left = Math.min(window.innerWidth - w - 8, a.left);
    pop.style.left = left + 'px'; pop.style.top = clamp(a.top - 20, 8, window.innerHeight - hh - 8) + 'px';
  };
  update(); place();

  function close(commit) {
    if (done) return; done = true; cancelAnimationFrame(raf);
    document.removeEventListener('pointerdown', outside, true); window.removeEventListener('keydown', onKey, true);
    if (!commit) onChange(start); else onChange(toHex(rgb()));
    pop.remove(); current = null; if (onClose) onClose(commit);
  }
  const outside = e => { if (!pop.contains(e.target) && !(anchor && anchor.contains(e.target))) close(true); };
  const onKey = e => { if (e.key === 'Escape') { e.stopPropagation(); close(false); } else if (e.key === 'Enter' && e.target.tagName !== 'BUTTON') close(true); };
  setTimeout(() => document.addEventListener('pointerdown', outside, true));
  window.addEventListener('keydown', onKey, true);
  current = { close };
  return current;
}
