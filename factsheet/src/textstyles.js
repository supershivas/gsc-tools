/* Styles de paragraphe du texte riche et réglages avancés d'un bloc de texte.
   Stockage d'une ligne : « # » à « ##### » = Titre 1, Titre 2, Légende, Chiffre clé, Chiffre clé (petit) (historique) ;
   « @clé » = les autres styles (chapeau, gras, petit, citation, étiquette, source, note). Les classes CSS sont `p-<clé>` (doc.css).
   Réglages avancés d'un bloc : `obj.adv = { lh (px), ls (‰ em), kern ('none'), indent (px), before, after (px), align }`. */
import { TYPE, FONT } from './tokens.js';
import { t } from './i18n.js';

export const PSTYLES = [
  { k: 'h1', n: 'Titre 1', g: 'Titres', hash: 1, type: 'section' },
  { k: 'h2', n: 'Titre 2', g: 'Titres', hash: 2, type: 'subsection' },
  { k: 'lead', n: 'Chapeau', g: 'Titres', type: 'lead' },
  { k: 'body', n: 'Texte', g: 'Texte', type: 'body' },
  { k: 'bold', n: 'Texte gras', g: 'Texte', type: 'bodyBold' },
  { k: 'small', n: 'Texte petit', g: 'Texte', type: 'small' },
  { k: 'quote', n: 'Citation', g: 'Texte', type: 'quote', italic: true },
  { k: 'cap', n: 'Légende', g: 'Annotations', hash: 3, type: 'caption' },
  { k: 'label', n: 'Étiquette', g: 'Annotations', type: 'label', upper: true },
  { k: 'source', n: 'Source', g: 'Annotations', type: 'source', italic: true },
  { k: 'note', n: 'Note', g: 'Annotations', type: 'note' },
  { k: 'fig', n: 'Chiffre clé', g: 'Chiffres', hash: 4, type: 'figure' },
  { k: 'figsm', n: 'Chiffre clé (petit)', g: 'Chiffres', hash: 5, type: 'figureSm' },
];
export const GROUPS = ['Titres', 'Texte', 'Annotations', 'Chiffres'];
export const HASH_KEYS = ['h1', 'h2', 'cap', 'fig', 'figsm'];
export const NAMED = PSTYLES.filter((p) => !p.hash && p.k !== 'body').map((p) => p.k);
export const styleOf = (k) => PSTYLES.find((p) => p.k === k) || PSTYLES.find((p) => p.k === 'body');
const NAMED_RE = new RegExp(`^@(${NAMED.join('|')})\\s+(.*)$`);
/** Préfixes à retirer d'un texte pour n'en garder que les mots (arbre, étiquettes) */
export const PREFIX_RE = new RegExp(`^(#{1,5}|@(?:${NAMED.join('|')})|[-•])\\s+`, 'gm');
export const HAS_PREFIX = new RegExp(`(^|\\n)(#{1,5}|@(?:${NAMED.join('|')})) `);

/** Une ligne → { key (null = texte), text } */
export function parseLine(line) {
  let m = line.match(/^(#{1,5})\s+(.*)$/);
  if (m) return { key: HASH_KEYS[m[1].length - 1], text: m[2] };
  m = line.match(NAMED_RE);
  if (m) return { key: m[1], text: m[2] };
  return { key: null, text: line };
}
export const prefixOf = (k) => {
  const p = styleOf(k);
  return p.k === 'body' ? '' : p.hash ? '#'.repeat(p.hash) + ' ' : '@' + p.k + ' ';
};

/** « 12 / 15,75 pt · italique » : taille, interlignage (px → pt) et traits particuliers */
const fmt = (n) => String(+(+n).toFixed(2)).replace('.', ',');
export function specOf(k) {
  const p = styleOf(k),
    ty = TYPE[p.type];
  return `${ty.size} / ${fmt(ty.lh * 0.75)} pt${p.italic ? ' · ' + t('italique') : ''}${p.upper ? ' · ' + t('capitales') : ''}${ty.family === 'serif' ? ' · serif' : ''}`;
}

/** Applique les réglages avancés d'un bloc à un paragraphe ou un élément de liste. `plain` : texte courant (sans style de paragraphe),
    seul concerné par la taille choisie dans « Police et taille » (les styles gardent leur corps). */
export function applyAdv(el, adv, plain) {
  if (!adv) return el;
  const s = el.style;
  if (adv.f) s.fontFamily = FONT[adv.f];
  if (plain && adv.s > 0) {
    s.fontSize = adv.s + 'pt';
    if (!(adv.lh > 0)) s.lineHeight = Math.ceil((((adv.s * 4) / 3) * 1.3) / 3) * 3 + 'px';
  }
  if (adv.lh > 0) s.lineHeight = adv.lh + 'px';
  if (adv.ls) s.letterSpacing = adv.ls / 1000 + 'em';
  if (adv.kern === 'none') s.fontKerning = 'none';
  if (adv.indent > 0) s.textIndent = adv.indent + 'px';
  if (adv.before > 0) s.marginTop = adv.before + 'px';
  if (adv.after > 0) s.marginBottom = adv.after + 'px';
  return el;
}
/** Réglages du bloc entier (carte « Paragraphe ») : colonnes, césure, filets, chiffres tabulaires */
export function blockStyle(adv, root) {
  if (!adv) return;
  const s = root.style;
  if (adv.cols > 1) {
    s.columnCount = adv.cols;
    s.columnGap = 'var(--gap-columns)';
  }
  if (adv.hyph) {
    s.hyphens = 'auto';
    root.setAttribute('lang', 'fr');
  }
  if (adv.ruleTop) {
    s.borderTop = 'var(--stroke) solid var(--c-blue)';
    s.paddingTop = 'var(--s2)';
  }
  if (adv.ruleBottom) {
    s.borderBottom = 'var(--stroke) solid var(--c-blue)';
    s.paddingBottom = 'var(--s2)';
  }
  if (adv.tabnum) s.fontVariantNumeric = 'tabular-nums';
}
export const hasAdv = (o) => !!(o && o.adv && Object.values(o.adv).some((v) => v != null && v !== '' && v !== 0 && v !== false));
