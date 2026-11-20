/* Colonne de texte : éditeur riche, cartes « Police et taille » et « Paragraphe » (réglages du bloc entier, stockés dans col.adv avec ceux du burger). */
import { typoOf } from '../viz/util.js';
import { h } from '../render.js';
import { t } from '../i18n.js';
import { toneKeys } from '../tokens.js';
import { richEditor } from '../editor.js';
import { autoControl, rangeControl, resetButton } from '../controls.js';

const PT = 96 / 72; // pt → px (l'interlignage est stocké en px, comme dans le burger)

export function textEditor(k, col) {
  const { doc, ctx } = k;
  return [
    h(
      'div',
      { class: 'f' },
      h('div', { class: 'hint', textContent: 'Texte' }),
      richEditor(
        col.text,
        (v) => {
          col.text = v;
          ctx.changed();
        },
        { gallery: true, adv: col, advChange: () => ctx.changed(), palette: toneKeys(doc), typo: typoOf(doc) },
      ),
    ),
  ];
}

const advClean = (a) => {
  for (const key of Object.keys(a)) if (a[key] == null || a[key] === '' || a[key] === false || a[key] === 0) delete a[key];
};

const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 21, 24, 30];

export function fontCard(k, col) {
  const { ctx, card, field } = k;
  const a = col.adv || (col.adv = {});
  const fam = h(
    'select',
    {
      onchange: (e) => {
        if (e.target.value) a.f = e.target.value;
        else delete a.f;
        ctx.changed();
      },
    },
    [
      ['', 'Source Sans 3'],
      ['serif', 'Source Serif 4'],
    ].map(([v, l]) => h('option', { value: v, textContent: l, selected: (a.f || '') === v })),
  );
  const sz = h(
    'select',
    {
      onchange: (e) => {
        if (+e.target.value) a.s = +e.target.value;
        else delete a.s;
        ctx.changed();
      },
    },
    [['', t('Selon le style')], ...FONT_SIZES.map((n) => [String(n), n + ' pt'])].map(([v, l]) =>
      h('option', { value: v, textContent: l, selected: String(a.s || '') === v }),
    ),
  );
  /* interlignage (pt, Auto = celui du style) et interlettrage (‰ d'em) : mêmes réglages que le burger de la barre de texte (`adv.lh`, `adv.ls`) */
  const lh = autoControl(
    h,
    'colTextLh',
    'Interlignage (pt)',
    { min: 6, max: 40, step: 0.25 },
    a.lh ? Math.round((a.lh / PT) * 100) / 100 : 0,
    (v) => {
      if (+v > 0) a.lh = Math.round(v * PT * 100) / 100;
      else delete a.lh;
      ctx.changed();
    },
  );
  const lsNow = () => a.ls || 0;
  const ls = rangeControl(h, 'colTextLs', 'Interlettrage', { min: -50, max: 300, step: 5, unit: '‰' }, lsNow(), (v) => {
    if (!Number.isFinite(v) || v < -50 || v > 300) return;
    if (v) a.ls = v;
    else delete a.ls;
    lsReset.refresh(lsNow() === 0);
    ctx.changed();
  });
  const lsReset = resetButton(h, 'Interlettrage', () => {
    ls.set(0);
    delete a.ls;
    lsReset.refresh(true);
    ctx.changed();
  });
  lsReset.refresh(lsNow() === 0);
  return card(
    'col-font',
    'letter-case',
    t('Police et taille'),
    [
      field('Police', fam),
      field('Taille du texte courant', sz),
      h('div', { class: 'f' }, h('div', { class: 'hint' }, h('label', { for: 'colTextLh', textContent: t('Interlignage (pt)') })), lh.node),
      h(
        'div',
        { class: 'f' },
        h('div', { class: 'hint' }, h('label', { for: 'colTextLs', textContent: t('Interlettrage') }), lsReset),
        ls.node,
        h('p', { class: 'hint', textContent: t('En millièmes de la taille du texte (1000 ‰ = 1 em) ; négatif = lettres plus serrées.') }),
      ),
      h('p', {
        class: 'hint',
        textContent: t(
          'La taille s’applique au texte courant et aux listes ; les styles de paragraphe (titres, source…) gardent leur corps. Interlignage en Auto : celui du style (130 % de la taille choisie, grille de 3 px). Interlignage et interlettrage s’appliquent à tout le bloc.',
        ),
      }),
    ],
    null,
    `${a.f === 'serif' ? 'Serif' : 'Sans'} · ${a.s ? a.s + ' pt' : t('Style')}${a.lh || a.ls ? ' · ' + t('réglé') : ''}`,
  );
}

export function paraCard(k, col) {
  const { card, switchRow } = k;
  const a = col.adv || (col.adv = {});
  const row = (label, key, on) =>
    switchRow(label, on, () => {
      a[key] = key === 'cols' ? (a.cols > 1 ? 0 : 2) : !a[key];
      advClean(a);
    });
  const n = ['hyph', 'cols', 'ruleTop', 'ruleBottom', 'tabnum'].filter((key) => a[key]).length;
  return card(
    'col-para',
    'align-justified',
    t('Paragraphe'),
    [
      row('Césure automatique', 'hyph', !!a.hyph),
      row('Texte sur deux colonnes', 'cols', a.cols > 1),
      row('Filet au-dessus', 'ruleTop', !!a.ruleTop),
      row('Filet en dessous', 'ruleBottom', !!a.ruleBottom),
      row('Chiffres tabulaires', 'tabnum', !!a.tabnum),
      h('p', {
        class: 'hint',
        textContent: t(
          'Justifié : « Disposition ». Interlignage, tracking, kerning, retrait et espaces : icône burger de la barre de texte.',
        ),
      }),
    ],
    null,
    n ? String(n) : t('Aucun'),
  );
}
