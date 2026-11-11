/* Propriétés d'une colonne : contenu (un éditeur par type : texte, image, chiffre clé, carte, dataviz), hauteur, disposition, fond, textes libres. */
import { h, ico, columnWidth } from '../render.js';
import { t } from '../i18n.js';
import { COL_TYPES, VALIGNS, ALIGNS, newCol, swapCols, allCols, duplicateCol, isFreeCol, MAX_COLS, refreshAutoCards } from '../state.js';
import { chooseBox } from '../dialogs.js';
import { VIZ_TYPES, SIDE_FIELDS, newColSide } from '../viz/index.js';
import { newCard } from '../cardmodel.js';
import { richSelect } from '../colorselect.js';
import { buildFields } from '../editor.js';
import { heightNodes } from '../vizheight.js';
import { textEditor, fontCard, paraCard } from './col-text.js';
import { imageEditor } from './col-image.js';
import { cardEditor } from './col-card.js';
import { figureEditor } from './col-figure.js';
import { vizEditor } from './col-viz.js';
import { freeTexts } from './col-free.js';
import { textColorCard } from './section.js';

const ICONS = { text: 'text-size', image: 'photo', card: 'layout-cards', figure: 'number', viz: 'chart-bar' };
const HMODE = { auto: 'Auto', ratio: 'Proportion', fixed: 'Fixe', fill: 'Remplir', match: 'Voisine' };

export function columnPanel(k, { si, bi, ci, sec, sub, col }) {
  const { doc, ctx, root, title, card, field, fieldDiv, segmented, boxControls, sumBox } = k;
  const nb = sub.cols.length,
    vt0 = col.type === 'viz' && col.viz && VIZ_TYPES[col.viz.kind];
  const nudge = (d) => () => {
    const to = ci + d;
    if (to < 0 || to >= nb) return;
    ctx.moved(() => {
      swapCols(doc, { si, bi, ci }, { si, bi, ci: to });
      return `col:${si}:${bi}:${to}`;
    });
  };

  /* Dupliquer : la copie va dans la colonne suivante si elle est libre, s'ajoute à droite s'il n'y a pas de suivante ; sinon on demande (insérer, remplacer, nouvelle sous-section) */
  const duplicate = async () => {
    const next = sub.cols[ci + 1];
    let mode = next && isFreeCol(next) ? 'replace' : !next && nb < MAX_COLS ? 'insert' : null;
    if (!mode) {
      const options = [
        nb < MAX_COLS ? { value: 'insert', label: t('Insérer une colonne à côté (les colonnes deviennent égales)') } : null,
        next ? { value: 'replace', label: t('Remplacer la colonne suivante') } : null,
        { value: 'sub', label: t('Copier dans une nouvelle sous-section, en dessous') },
      ].filter(Boolean);
      mode = await chooseBox(
        next
          ? t('La colonne suivante contient déjà du contenu. Où mettre la copie ?')
          : t('Il n’y a plus de place à côté. Où mettre la copie ?'),
        options,
        options[0].value,
        t('Dupliquer'),
      );
      if (!mode) return;
    }
    ctx.moved(
      () => {
        const path = duplicateCol(doc, si, bi, ci, mode);
        refreshAutoCards(sub, (i) => columnWidth(doc, si, bi, i));
        return path;
      },
      'Colonne dupliquée.',
      'Annuler la duplication',
    );
  };

  title(
    `Colonne ${ci + 1}`,
    [
      [sec.title || 'Section', `sec:${si}`],
      [sub.title || 'Sous-section', `sub:${si}:${bi}`],
    ],
    {
      icon: ICONS[col.type] || 'text-size',
      pill: t(COL_TYPES[col.type]) + (vt0 ? ' · ' + t(vt0.label) : ''),
      acts: [
        ...(nb > 1
          ? [
              ci > 0 ? ['arrow-left', t('Colonne précédente'), nudge(-1)] : null,
              ci < nb - 1 ? ['arrow-right', t('Colonne suivante'), nudge(1)] : null,
            ].filter(Boolean)
          : []),
        ['copy', t('Dupliquer la colonne'), duplicate],
        ['trash', t('Supprimer la colonne'), () => ctx.remove(`col:${si}:${bi}:${ci}`), 'danger'],
      ],
    },
  );

  /* Changer de type garde l'alignement, le cadre et le fond ; le texte est conservé si on revient au texte */
  const changeType = (v) => {
    const keep = col.text,
      { valign, align, stroke, strokeColor, fillColor, fg } = col;
    Object.assign(col, newCol(v), { valign, align, stroke, strokeColor, fillColor });
    if (fg) col.fg = fg;
    if (v === 'text' && keep) col.text = keep;
    if (v === 'card') {
      col.card = newCard(columnWidth(doc, si, bi, ci));
      col.stroke = false;
      col.fillColor = 'none';
    }
    ctx.restructure();
  };
  const typeSel = fieldDiv(
    'Type de contenu',
    richSelect({ value: col.type, options: COL_TYPES, text: true, lead: (key) => ico(ICONS[key] || 'text-size'), onChange: changeType }),
  );

  let editor;
  if (col.type === 'text') editor = textEditor(k, col);
  else if (col.type === 'image') editor = imageEditor(k, col);
  else if (col.type === 'card') editor = [cardEditor(k, col, columnWidth(doc, si, bi, ci))];
  else if (col.type === 'figure') editor = figureEditor(k, col);
  else editor = vizEditor(k, col, sub, ci);

  const swapSelect = () => {
    const s = h(
      'select',
      {
        onchange: (e) => {
          if (!e.target.value) return;
          const [a, b, c] = e.target.value.split(':').map(Number);
          ctx.moved(() => {
            swapCols(doc, { si, bi, ci }, { si: a, bi: b, ci: c });
            return `col:${a}:${b}:${c}`;
          });
        },
      },
      h('option', { value: '', textContent: '—' }),
      allCols(doc)
        .filter((c) => !(c.si === si && c.bi === bi && c.ci === ci))
        .map((c) =>
          h('option', {
            value: `${c.si}:${c.bi}:${c.ci}`,
            textContent: c.label + (doc.sections[c.si].page !== sec.page ? ` (${c.page === 'recto' ? t('Recto') : t('Verso')})` : ''),
          }),
        ),
    );
    s.value = '';
    return s;
  };
  const swap = field('Échanger le contenu avec…', swapSelect());

  /* Hauteur : réglage de la dataviz (mode, ratio…) ou hauteur minimale des autres colonnes */
  const vt = col.type === 'viz' && col.viz && VIZ_TYPES[col.viz.kind];
  const heightCard = () => {
    if (vt && vt.heights) {
      return card(
        'col-height',
        'ruler-2',
        t('Hauteur'),
        heightNodes(vt, col.viz.opts, { ctx, width: columnWidth(doc, si, bi, ci) }),
        null,
        t(HMODE[col.viz.opts.hmode] || 'Auto'),
      );
    }
    if (col.type === 'viz') return null;
    return card(
      'col-height',
      'ruler-2',
      t('Hauteur'),
      [
        field(
          'Hauteur minimale de la colonne (px)',
          h('input', {
            type: 'number',
            min: 0,
            max: 1000,
            step: 3,
            value: col.minH || 0,
            oninput: (e) => {
              col.minH = Math.max(0, +e.target.value || 0);
              ctx.changed();
            },
          }),
        ),
        h('p', {
          class: 'hint',
          textContent: t('Ou glisser la poignée sous la colonne dans l’aperçu : elle se cale sur la colonne voisine.'),
        }),
      ],
      null,
      col.minH ? col.minH + ' px' : t('Auto'),
    );
  };

  root.append(
    card(
      'col-content',
      ICONS[col.type] || 'text-size',
      t('Contenu'),
      [typeSel, ...editor],
      null,
      t(COL_TYPES[col.type]) + (vt ? ' · ' + t(vt.label) : ''),
    ),
    col.type === 'text' ? fontCard(k, col) : null,
    col.type === 'text' ? paraCard(k, col) : null,
    heightCard(),
    card(
      'col-layout',
      'layout-align-middle',
      t('Disposition'),
      [
        segmented('Alignement vertical dans la colonne', col, 'valign', VALIGNS, { top: t('Haut'), center: t('Centre'), bottom: t('Bas') }),
        col.type === 'text'
          ? segmented('Alignement du texte', col, 'align', ALIGNS, {
              left: t('Gauche'),
              center: t('Centré'),
              right: t('Droite'),
              justify: t('Justifié'),
            })
          : null,
        swap,
      ],
      null,
      t({ top: 'Haut', center: 'Centre', bottom: 'Bas' }[col.valign || 'top']),
    ),
    col.type !== 'card' ? card('col-box', 'border-all', t('Fond et contour'), boxControls(col), null, sumBox(col)) : null,
    textColorCard(k, col),
    h('div', { class: 'pr-adv', textContent: 'Avancé' }),
    card('col-free', 'text-size', t('Textes libres'), freeTexts(k, col), null, String((col.texts || []).length || t('Aucun'))),
    col.type === 'text' || col.type === 'card'
      ? card('col-side', 'number', t('Chiffre à côté'), buildFields(SIDE_FIELDS, col.side || (col.side = newColSide()), ctx, {}, h))
      : null,
  );
}
