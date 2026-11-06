/* Options avancées d'un bloc de texte (icône burger de la barre de l'éditeur riche) :
   interlignage, tracking, kerning, retrait (l'alignement est dans « Disposition »), espaces avant/après. Stockées dans `obj.adv` (voir textstyles.js).
   Les glisseurs modifient le document en direct sans redessiner le panneau (sinon le geste est perdu). */
import { h, ico } from './render.js';
import { t } from './i18n.js';

const fmt = n => String(+(+n).toFixed(2)).replace('.', ',');
const PX = 4 / 3;

export function advPanel(obj, changed, rerender) {
  const adv = () => (obj.adv ||= {});
  const set = (k, v) => { const a = adv(); if (v == null || v === '' || v === 0) delete a[k]; else a[k] = v; changed(); };
  const slider = (label, k, min, max, step, get, put, show, note) => {
    const out = h('output', { textContent: show(get()) });
    const r = h('input', { type: 'range', min, max, step, value: get(), 'aria-label': t(label), oninput: () => { put(+r.value); out.textContent = show(+r.value); } });
    const rs = h('button', { type: 'button', class: 'ra-rs', title: t('Valeur du style'), 'aria-label': t('Revenir à la valeur du style'), onclick: () => { put(null); r.value = get(); out.textContent = show(get()); } }, ico('restore'));
    return h('div', { class: 'ra-sl' }, h('div', { class: 'ra-l' }, h('span', { textContent: t(label) }), h('span', { class: 'pp-sp' }), out, rs), r, note ? h('div', { class: 'ra-note', textContent: t(note) }) : null);
  };
  const seg = (items, cur, pick) => h('div', { class: 'ra-seg' }, items.map(([v, l, tip]) => h('button', { type: 'button', class: v === cur ? 'on' : '', title: t(tip || l), 'aria-label': t(tip || l), onclick: () => { pick(v); rerender && rerender(); } }, l.startsWith('ti-') ? ico(l.slice(3)) : t(l))));
  const lhAuto = 21;   // l'interlignage du style prévaut tant qu'aucune valeur n'est posée ; le curseur part du corps courant
  const lhNote = h('div', { class: 'ra-note' });
  const lhUpd = () => { const px = adv().lh; lhNote.textContent = px ? `= ${fmt(px)} px · ${Math.abs(px / 3 - Math.round(px / 3)) < 0.02 ? t('sur la grille de 3 px') : t('hors de la grille de 3 px')}` : t('Interlignage du style'); };
  const lh = slider('Interlignage', 'lh', 6, 40, 0.25, () => (adv().lh ? adv().lh / PX : lhAuto / PX), v => { set('lh', v == null ? null : Math.round(v * PX * 100) / 100); lhUpd(); }, v => fmt(v) + ' pt');
  lh.append(lhNote); lhUpd();
  const modes = h('div', { class: 'ra-body' },
    lh,
    slider('Tracking (espacement des lettres)', 'ls', -50, 300, 5, () => adv().ls || 0, v => set('ls', v), v => (v > 0 ? '+' : '') + v + ' ‰', '1000 ‰ = 1 em'),
    h('div', { class: 'ra-f' }, h('div', { class: 'ra-l', textContent: t('Kerning') }), seg([['auto', 'Automatique'], ['none', 'Désactivé']], adv().kern || 'auto', v => set('kern', v === 'auto' ? null : v))),
    slider('Retrait de première ligne', 'indent', 0, 36, 3, () => adv().indent || 0, v => set('indent', v), v => v + ' px'),
    h('div', { class: 'ra-two' },
      slider('Avant', 'before', 0, 36, 3, () => adv().before || 0, v => set('before', v), v => v + ' px'),
      slider('Après', 'after', 0, 36, 3, () => adv().after || 0, v => set('after', v), v => v + ' px')),
    h('button', { type: 'button', class: 'pp-btn', onclick: () => { delete obj.adv; changed(); rerender && rerender(); } }, ico('restore'), h('span', { textContent: t('Tout remettre comme le style') })));
  return h('div', { class: 'ra-pop', role: 'group', 'aria-label': t('Options avancées') }, h('div', { class: 'ra-h' }, ico('menu-2'), h('b', { textContent: t('Options avancées') })), modes);
}
