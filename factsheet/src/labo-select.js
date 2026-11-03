/* Labo : animation du cadre de sélection dans l'aperçu. Une mini-page avec trois blocs cliquables ;
   chaque clic (ou « Rejouer ») refait apparaître le cadre avec l'animation de la variante. */
import { h } from './render.js';
import { cssVars, applyVars, DEFAULT_THEME } from './tokens.js';

export const selectOpts = () => ({ sel: 0 });

export function renderSelect(o, v, repaint) {
  const box = h('div', { class: 'sel-demo' });
  const blocks = [];
  const block = (i, el) => { el.classList.add('sel-block'); el.addEventListener('click', () => { o.sel = i; repaint(); }); blocks[i] = el; return el; };
  box.append(
    block(0, h('div', {}, h('h2', { class: 'sec-title', textContent: 'Section title' }),
      h('div', { class: 'cols', style: { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' } },
        block(1, h('div', { class: 'col col-text' }, h('div', { class: 'rich' }, h('p', { innerHTML: '<b>First point.</b> Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod.' })))),
        block(2, h('div', { class: 'col col-figure stroked' }, h('div', { class: 'rich' }, h('p', { textContent: '5 000' }), h('p', { textContent: 'Lorem ipsum dolor sit amet.' }))))))));
  const frame = h('div', { class: `sel-frame v-${v.style} pop`, style: { display: 'none' } });
  box.append(frame, h('button', { type: 'button', class: 'pp-btn sel-replay', onclick: repaint }, h('i', { class: 'ti ti-player-play' }), 'Rejouer l’animation'));
  applyVars(box, cssVars(DEFAULT_THEME, {}));
  requestAnimationFrame(() => {
    const br = box.getBoundingClientRect(), r = blocks[o.sel].getBoundingClientRect();
    Object.assign(frame.style, { display: 'block', left: r.left - br.left + 'px', top: r.top - br.top + 'px', width: r.width + 'px', height: r.height + 'px' });
  });
  return box;
}
