/* Labo : animation du cadre de sélection dans l'aperçu. Une mini-page avec trois blocs cliquables ;
   un clic déplace le cadre ; l'animation boucle doucement tant que le bloc est sélectionné. */
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
  const frame = h('div', { class: `sel-frame v-${v.style}`, style: { display: 'none' } });
  box.append(frame);
  applyVars(box, cssVars(DEFAULT_THEME, {}));
  requestAnimationFrame(() => {
    const br = box.getBoundingClientRect(), r = blocks[o.sel].getBoundingClientRect();
    Object.assign(frame.style, { display: 'block', left: r.left - br.left - 3 + 'px', top: r.top - br.top - 3 + 'px', width: r.width + 6 + 'px', height: r.height + 6 + 'px' });
  });
  return box;
}
