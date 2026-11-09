/* Colonne de droite : propriétés de l'élément sélectionné (document, header, section, sous-section, colonne).
   Un module par sorte d'élément dans props/ ; les briques partagées (champs, couleurs, cartes, tête collante) sont dans props/kit.js. */
import { cssVars, applyVars } from './tokens.js';
import { searchBox, applyFilter } from './cards.js';
import { createKit, search } from './props/kit.js';
import { documentPanel } from './props/document.js';
import { headerPanel } from './props/header.js';
import { sectionPanel } from './props/section.js';
import { subPanel } from './props/subsection.js';
import { columnPanel } from './props/column.js';

export function buildProps(root, ctx) {
  const doc = ctx.getDoc(),
    path = ctx.getSel();
  root.innerHTML = '';
  const append = root.append.bind(root);
  root.append = (...nodes) => append(...nodes.filter((x) => x != null && x !== false)); // les champs absents (null) ne s'affichent pas
  applyVars(root, cssVars(doc.theme, doc.colors, doc.density));

  const P = (path || '').split(':'),
    kind = P[0] || 'doc',
    si = +P[1],
    bi = +P[2],
    ci = +P[3];
  const sec = doc.sections[si],
    sub = sec && sec.subs[bi],
    col = sub && sub.cols[ci];
  const k = createKit(root, ctx, doc, kind);

  if (kind === 'doc') documentPanel(k);
  else if (kind === 'header') headerPanel(k);
  else if (kind === 'sec' && sec) sectionPanel(k, { si, sec });
  else if (kind === 'sub' && sub) subPanel(k, { si, bi, sec, sub });
  else if (kind === 'col' && col) columnPanel(k, { si, bi, ci, sec, sub, col });
  else k.title('Élément introuvable');

  const sb = searchBox(search, ctx.refreshProps),
    hd = root.querySelector('.pr-head');
  if (hd) hd.after(sb);
  else root.prepend(sb);
  applyFilter(root, search);
}
