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
