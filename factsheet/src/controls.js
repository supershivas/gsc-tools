/* Contrôles de l'éditeur de dataviz (audit lot 4) : interrupteur, segmenté, curseur à crans, curseur + champ éditable, bouton ↺.
   Chaque fabrique renvoie { node, set(v) } : `set` met l'affichage à jour sans reconstruire le panneau (le focus clavier reste).
   `h2` = fabrique d'éléments, `commit(v)` = écrit la valeur dans le document et redessine. Les propriétés (props/kit.js) gardent leurs propres briques. */
import { ico } from './render.js';
import { t } from './i18n.js';

/** Options d'une liste dans l'ordre logique : un objet JS range les clés entières avant les autres (1, 2, puis 1.5) ; quand toutes les clés sont des nombres, on trie par valeur */
export function orderedOptions(opts) {
  const e = Object.entries(opts);
  return e.length && e.every(([k]) => k !== '' && !isNaN(+k)) ? e.sort((a, b) => a[0] - b[0]) : e;
}

/** Interrupteur : bouton `role="switch"` ; le libellé (un vrai <label for>) le bascule aussi */
export function switchControl(h2, id, label, on, commit) {
  let cur = !!on;
  const b = h2('button', { type: 'button', id, role: 'switch', class: 'pp-switch', 'aria-checked': String(cur), 'aria-label': t(label) });
  const set = (v) => {
    cur = !!v;
    b.classList.toggle('on', cur);
    b.setAttribute('aria-checked', String(cur));
  };
  b.addEventListener('click', () => {
    set(!cur);
    commit(cur);
  });
  set(cur);
  return { node: b, set };
}

/** Choix entre quelques valeurs courtes : un seul Tab dans le groupe, ← → déplacent et choisissent, Début/Fin aux extrémités */
export function segControl(h2, label, choices, current, commit) {
  const keys = choices.map(([k]) => k);
  let cur = String(current);
  const btns = choices.map(([k, l]) => h2('button', { type: 'button', role: 'radio', textContent: l, dataset: { v: k } }));
  const box = h2('div', { class: 'seg seg-text', role: 'radiogroup', 'aria-label': t(label) }, btns);
  const set = (v) => {
    cur = String(v);
    btns.forEach((b) => {
      const on = b.dataset.v === cur;
      b.classList.toggle('on', on);
      b.setAttribute('aria-checked', String(on));
      b.tabIndex = on || (!keys.includes(cur) && b === btns[0]) ? 0 : -1;
    });
  };
  btns.forEach((b, i) => {
    b.addEventListener('click', () => {
      set(keys[i]);
      commit(keys[i]);
    });
    b.addEventListener('keydown', (e) => {
      const to = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: keys.length - 1 }[e.key];
      if (to == null) return;
      e.preventDefault();
      const j = Math.max(0, Math.min(keys.length - 1, to));
      set(keys[j]);
      btns[j].focus();
      commit(keys[j]);
    });
  });
  set(cur);
  return { node: box, set };
}

/** Curseur à crans pour une liste ordonnée de valeurs (espaces) : la valeur affichée est le nom du cran */
export function stepsControl(h2, label, choices, current, commit) {
  const keys = choices.map(([k]) => k),
    names = Object.fromEntries(choices);
  const out = h2('output', { class: 'pp-val' });
  const r = h2('input', { type: 'range', min: 0, max: keys.length - 1, step: 1, 'aria-label': t(label) });
  const set = (v) => {
    const i = Math.max(0, keys.indexOf(String(v)));
    r.value = i;
    out.textContent = names[keys[i]];
    r.setAttribute('aria-valuetext', names[keys[i]]);
  };
  r.addEventListener('input', () => {
    set(keys[+r.value]);
    commit(keys[+r.value]);
  });
  set(current);
  return { node: h2('div', { class: 'pp-range' }, r, out), set };
}

/** Curseur + champ numérique éditable + unité */
export function rangeControl(h2, id, label, { min, max, step, unit }, current, commit) {
  const r = h2('input', { type: 'range', min, max, step: step === 'any' ? 1 : step || 1, 'aria-label': t(label) });
  const n = h2('input', { type: 'number', id, class: 'pp-num', min, max, step: step || 1 });
  const set = (v) => {
    r.value = v;
    n.value = v;
  };
  r.addEventListener('input', () => {
    n.value = r.value;
    commit(+r.value);
  });
  n.addEventListener('input', () => {
    const v = parseFloat(n.value);
    if (isNaN(v)) return;
    r.value = v;
    commit(v);
  });
  n.addEventListener('blur', () => {
    const v = parseFloat(n.value);
    if (!isNaN(v)) set(Math.max(min, Math.min(max, v)));
  });
  set(current);
  return { node: h2('div', { class: 'pp-range' }, r, n, unit ? h2('span', { class: 'pp-unit', textContent: unit }) : null), set };
}

/** ↺ : rétablit la valeur d'origine ; grisé (aria-disabled, focalisable) quand la valeur est déjà celle d'origine */
export function resetButton(h2, label, onReset) {
  const b = h2(
    'button',
    {
      type: 'button',
      class: 'mini pp-reset',
      title: t('Rétablir la valeur d’origine'),
      'aria-label': `${t('Rétablir la valeur d’origine')} : ${t(label)}`,
    },
    ico('rotate-2'),
  );
  b.addEventListener('click', () => {
    if (b.getAttribute('aria-disabled') !== 'true') onReset();
  });
  b.refresh = (isDef) => b.setAttribute('aria-disabled', String(isDef));
  return b;
}

/** Vignettes : comme le segmenté, avec un mini-dessin au-dessus du libellé (épaisseur de barre : 3 barres de plus en plus larges) */
export function thumbsControl(h2, label, choices, current, commit) {
  const c = segControl(h2, label, choices, current, commit);
  c.node.classList.add('thumbs');
  [...c.node.children].forEach((b, i) => {
    const bar = (j) => h2('b', { style: { width: 3 + i * 3 + 'px', height: 10 + j * 4 + 'px' } });
    b.replaceChildren(
      h2('i', { class: 'th-ico', 'aria-hidden': 'true' }, bar(0), bar(1), bar(2)),
      h2('span', { textContent: choices[i][1] }),
    );
  });
  return c;
}

/** Vignettes d'épaisseur de trait : un trait horizontal de plus en plus épais par choix (0,5 / 1 / 1,5 / 2,5 pt à l'échelle 2) */
export function widthThumbsControl(h2, label, choices, current, commit) {
  const c = segControl(h2, label, choices, current, commit);
  c.node.classList.add('thumbs');
  const NS = 'http://www.w3.org/2000/svg';
  const WK = { none: 0, thin: 1, medium: 2, thick: 3, xthick: 5 }; // trait aux crans de la clé : 0,5 / 1 / 1,5 / 2,5 pt à l'échelle 2
  [...c.node.children].forEach((b, i) => {
    const svg = document.createElementNS(NS, 'svg'),
      ln = document.createElementNS(NS, 'line');
    svg.setAttribute('viewBox', '0 0 28 8');
    svg.setAttribute('class', 'th-width');
    svg.setAttribute('aria-hidden', 'true');
    Object.entries({ x1: 0, y1: 4, x2: 28, y2: 4, stroke: 'currentColor', 'stroke-width': WK[choices[i][0]] ?? 1 }).forEach(([k, v]) =>
      ln.setAttribute(k, v),
    );
    svg.append(ln);
    b.replaceChildren(h2('i', { class: 'th-ico', 'aria-hidden': 'true' }, svg), h2('span', { textContent: choices[i][1] }));
  });
  return c;
}

/** Vignettes d'épaisseur d'anneau : un petit anneau de plus en plus épais par choix (vrais cercles SVG au trait) */
export function ringThumbsControl(h2, label, choices, current, commit) {
  const c = segControl(h2, label, choices, current, commit);
  c.node.classList.add('thumbs');
  const NS = 'http://www.w3.org/2000/svg';
  const R = [
    [14, 3],
    [12, 6],
    [10, 9],
  ]; // [rayon du trait, épaisseur] sur 28 × 28 : 10 %, 16 %, 24 % du rayon extérieur environ
  [...c.node.children].forEach((b, i) => {
    const svg = document.createElementNS(NS, 'svg'),
      ci = document.createElementNS(NS, 'circle'),
      [r, w] = R[i] || R[1];
    svg.setAttribute('viewBox', '0 0 28 28');
    svg.setAttribute('class', 'th-ring');
    svg.setAttribute('aria-hidden', 'true');
    Object.entries({ cx: 14, cy: 14, r: r - w / 2, fill: 'none', stroke: 'currentColor', 'stroke-width': w }).forEach(([k, v]) =>
      ci.setAttribute(k, v),
    );
    svg.append(ci);
    b.replaceChildren(h2('i', { class: 'th-ico', 'aria-hidden': 'true' }, svg), h2('span', { textContent: choices[i][1] }));
  });
  return c;
}

/** Vignettes de style de ligne (plein, tirets, pointillé) : un vrai trait SVG par choix, au-dessus du libellé */
export function lineThumbsControl(h2, label, choices, current, commit) {
  const c = segControl(h2, label, choices, current, commit);
  c.node.classList.add('thumbs');
  const NS = 'http://www.w3.org/2000/svg';
  const DASH = { solid: null, dashed: '4 3', dotted: '1 3' };
  [...c.node.children].forEach((b, i) => {
    const svg = document.createElementNS(NS, 'svg'),
      ln = document.createElementNS(NS, 'line');
    svg.setAttribute('viewBox', '0 0 28 4');
    svg.setAttribute('class', 'th-line');
    svg.setAttribute('aria-hidden', 'true');
    Object.entries({ x1: 0, y1: 2, x2: 28, y2: 2, stroke: 'currentColor', 'stroke-width': 1.5 }).forEach(([k, v]) => ln.setAttribute(k, v));
    if (DASH[choices[i][0]]) ln.setAttribute('stroke-dasharray', DASH[choices[i][0]]);
    svg.append(ln);
    b.replaceChildren(h2('i', { class: 'th-ico', 'aria-hidden': 'true' }, svg), h2('span', { textContent: choices[i][1] }));
  });
  return c;
}

/** Stepper − / valeur / + pour de petits entiers qu'on compte (cases d'une grille) */
export function stepperControl(h2, id, label, { min = 0, max = 99 }, current, commit) {
  const n = h2('input', { type: 'number', id, class: 'pp-num', min, max, step: 1 });
  const clamp = (v) => Math.max(min, Math.min(max, Math.round(v)));
  const go = (v) => {
    n.value = clamp(v);
    commit(+n.value);
  };
  const b = (txt, ico2, d) =>
    h2('button', { type: 'button', class: 'mini pp-step', 'aria-label': t(txt), onclick: () => go((+n.value || 0) + d) }, ico(ico2));
  n.addEventListener('input', () => {
    const v = parseFloat(n.value);
    if (!isNaN(v)) commit(clamp(v));
  });
  n.addEventListener('blur', () => (n.value = clamp(parseFloat(n.value) || min)));
  n.value = current;
  return { node: h2('div', { class: 'pp-stepper' }, b('Diminuer', 'minus', -1), n, b('Augmenter', 'plus', 1)), set: (v) => (n.value = v) };
}

/** Nombre dont 0 veut dire « automatique » : l'interrupteur « Auto » remplace la valeur magique */
export function autoControl(h2, id, label, { min, max, step }, current, commit) {
  let last = +current > 0 ? +current : 1;
  const n = h2('input', { type: 'number', id, class: 'pp-num', min, max, step: step || 1 });
  const sw = switchControl(h2, id + 'a', 'Auto', !(+current > 0), (auto) => {
    sync(auto);
    commit(auto ? 0 : +n.value || last);
  });
  const sync = (auto) => {
    n.disabled = auto;
    n.value = auto ? '' : last;
  };
  n.addEventListener('input', () => {
    const v = parseFloat(n.value);
    if (!isNaN(v) && v > 0) {
      last = v;
      commit(v);
    }
  });
  sync(!(+current > 0));
  return {
    node: h2('div', { class: 'pp-auto' }, h2('label', { for: id + 'a', textContent: t('Auto') }), sw.node, n),
    set: (v) => {
      if (+v > 0) last = +v;
      sw.set(!(+v > 0));
      sync(!(+v > 0));
    },
  };
}

/** Unités courantes à portée de clic sous le champ « Unité après la valeur » (le champ reste libre) */
export function unitChips(h2, input, commit) {
  return h2(
    'div',
    { class: 'pp-chips' },
    ['%', 'M€', 'Md€', '€', 'k€'].map((u) =>
      h2('button', {
        type: 'button',
        class: 'mini',
        textContent: u,
        onclick: () => {
          input.value = u;
          commit(u);
        },
      }),
    ),
  );
}
