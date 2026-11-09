/* Propriétés d'une sous-section : titre, gabarit de colonnes, déplacement vers une autre section, fond et contour. */
import { h, columnWidth } from '../render.js';
import { t } from '../i18n.js';
import { GRID, customLayoutOf } from '../tokens.js';
import { layoutSelect } from '../layoutselect.js';
import { newCol, newSub, moveSub, refreshAutoCards, isFreeCol, equalLayout, uid } from '../state.js';
import { chooseBox } from '../dialogs.js';

export function subPanel(k, { si, bi, sec, sub }) {
  const { doc, ctx, root, title, card, field, text, switchRow, boxControls, sumBox, struct } = k;
  const swapWith = (j) => () => {
    if (j >= 0 && j < sec.subs.length) [sec.subs[bi], sec.subs[j]] = [sec.subs[j], sec.subs[bi]];
  };
  const duplicate = () => {
    const c = JSON.parse(JSON.stringify(sub));
    c.id = (sub.id || 'sub') + 'c' + (Date.now() % 1e5);
    sec.subs.splice(bi + 1, 0, c);
  };
  const applyLayout = (v) => {
    sub.layout = v;
    const n = GRID.layouts[v].spans.length;
    sub.cols = sub.cols.slice(0, n);
    while (sub.cols.length < n) sub.cols.push(newCol('text'));
    refreshAutoCards(sub, (i) => columnWidth(doc, si, bi, i));
  };
  /* Réduire le nombre de colonnes retire les dernières : si elles contiennent quelque chose, on demande ce qu'on en fait (déplacer, supprimer, annuler) */
  const setLayout = async (v) => {
    const kept = GRID.layouts[v].spans.length,
      filled = sub.cols.slice(kept).filter((c) => !isFreeCol(c));
    if (!filled.length) {
      applyLayout(v);
      ctx.restructure();
      return;
    }
    const how = await chooseBox(
      t('Ce gabarit a moins de colonnes : le contenu des colonnes en trop serait perdu. Que faire de ce contenu ?'),
      [
        { value: 'move', label: t('Le placer dans une nouvelle sous-section, en dessous') },
        { value: 'delete', label: t('Le supprimer') },
      ],
      'move',
      t('Réduire'),
    );
    if (!how) {
      ctx.refreshProps(); // annulé : le menu retrouve le gabarit actuel
      return;
    }
    ctx.moved(
      () => {
        if (how === 'move') {
          const n = newSub(equalLayout(filled.length));
          n.id = uid('sub');
          n.showTitle = false;
          n.title = sub.title;
          n.cols = filled;
          sec.subs.splice(bi + 1, 0, n);
        }
        applyLayout(v);
        return `sub:${si}:${bi}`;
      },
      how === 'move' ? 'Contenu déplacé dans une nouvelle sous-section.' : 'Contenu des colonnes en trop supprimé.',
      'Annuler le changement de gabarit',
    );
  };
  const moveSelect = () => {
    const s = h(
      'select',
      {
        onchange: (e) => {
          if (!e.target.value) return;
          const to = +e.target.value;
          ctx.moved(() => {
            const n = moveSub(doc, { si, bi }, { si: to, bi: null });
            return `sub:${n.si}:${n.bi}`;
          });
        },
      },
      h('option', { value: '', textContent: '—' }),
      doc.sections.map((x, i) =>
        h('option', { value: i, textContent: `${x.title || t('Section')} (${x.page === 'recto' ? t('Recto') : t('Verso')})` }),
      ),
    );
    s.value = '';
    return s;
  };

  title(sub.title || 'Sous-section', [[sec.title || 'Section', `sec:${si}`]], {
    icon: 'columns',
    pill: sub.layout,
    acts: [
      ['arrow-up', t('Monter'), struct(swapWith(bi - 1))],
      ['arrow-down', t('Descendre'), struct(swapWith(bi + 1))],
      ['copy', t('Dupliquer'), struct(duplicate)],
      ['trash', t('Supprimer'), () => ctx.remove(`sub:${si}:${bi}`), 'danger'],
    ],
  });
  const mv = moveSelect();
  root.append(
    card('sub-main', 'columns', t('Sous-section'), [
      text(sub, 'title', 'Titre de sous-section'),
      switchRow(t('Afficher le titre'), sub.showTitle !== false, () => {
        sub.showTitle = sub.showTitle === false;
      }),
      field(
        'Colonnes',
        layoutSelect({ value: sub.layout, layouts: { ...GRID.layouts, custom: customLayoutOf(sub) }, onChange: setLayout }),
      ),
      field('Déplacer vers la section', mv),
    ]),
    card('sub-box', 'border-all', t('Fond et contour'), boxControls(sub), null, sumBox(sub)),
  );
}
