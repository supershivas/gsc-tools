/* Carte « Exporter » commune au header, aux sections, sous-sections et colonnes : l'élément seul en PNG, JPG, SVG ou PDF (ctx.exporter.exportElement). */
import { h, ico } from '../render.js';
import { t } from '../i18n.js';
import { PDF_PROFILES } from '../export.js';
import { richSelect } from '../colorselect.js';
import { alertBox } from '../dialogs.js';

const KEY = 'factsheet-creator-element-export';
const FORMATS = {
  'png-t': { label: 'PNG transparent', icon: 'photo', ext: 'PNG' },
  png: { label: 'PNG avec fond', icon: 'photo', ext: 'PNG' },
  jpg: { label: 'JPG', icon: 'file-type-jpg', ext: 'JPG' },
  svg: { label: 'SVG', icon: 'file-type-svg', ext: 'SVG' },
  pdf: { label: 'PDF', icon: 'file-type-pdf', ext: 'PDF' },
};
const DPIS = { 150: '150 dpi', 300: '300 dpi' };
const pref = () => {
  let p = {};
  try {
    p = JSON.parse(localStorage.getItem(KEY) || '{}');
  } catch (e) {
    /* préférences non lues */
  }
  return {
    format: FORMATS[p.format] ? p.format : 'png-t',
    dpi: DPIS[p.dpi] ? +p.dpi : 300,
    profile: PDF_PROFILES[p.profile] ? p.profile : 'x4',
    bleed: p.bleed === true,
  };
};
const save = (p) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch (e) {
    /* préférence non gardée */
  }
};

export function exportCard(k, path) {
  const { ctx, card, pair, field } = k;
  const p = pref();
  const f = FORMATS[p.format],
    raster = p.format !== 'svg' && p.format !== 'pdf';
  const set = (key) => (v) => {
    p[key] = key === 'dpi' ? +v : v;
    save(p);
    ctx.refreshProps();
  };
  const go = h(
    'button',
    { type: 'button', class: 'pp-btn primary' },
    ico('download'),
    h('span', { textContent: t('Télécharger') + ' ' + f.ext }),
  );
  go.onclick = async () => {
    go.disabled = true;
    try {
      await ctx.exporter.exportElement(path, p);
    } catch (e) {
      console.error('export élément', e);
      await alertBox(t('Impossible d’exporter cet élément dans ce navigateur.') + ' (' + ((e && e.message) || '') + ')');
    } finally {
      go.disabled = false;
    }
  };
  const notes = {
    'png-t': 'Fond transparent, à placer sur un autre document.',
    png: 'Image avec le fond blanc de la page.',
    jpg: 'Image sans transparence, légère.',
    svg: 'Autonome, ouvrable dans un navigateur. Le contenu est du HTML intégré : pour un SVG modifiable dans Illustrator, exporter la dataviz depuis son éditeur.',
    pdf: 'Une page de la taille de l’élément, textes et formes vectoriels.',
  };
  return card(
    'export',
    'download',
    t('Exporter'),
    [
      h(
        'div',
        { class: 'f' },
        h('div', { class: 'hint', textContent: t('Format') }),
        richSelect({
          value: p.format,
          options: Object.fromEntries(Object.entries(FORMATS).map(([key, o]) => [key, o.label])),
          text: true,
          lead: (key) => ico(FORMATS[key].icon),
          onChange: set('format'),
        }),
      ),
      raster ? pair('Résolution', p, 'dpi', DPIS, () => (save(p), ctx.refreshProps())) : null,
      p.format === 'pdf'
        ? field(
            'Profil du PDF',
            h(
              'select',
              { onchange: (e) => set('profile')(e.target.value) },
              Object.entries(PDF_PROFILES).map(([v, o]) => h('option', { value: v, selected: v === p.profile, textContent: t(o.label) })),
            ),
          )
        : null,
      /* le fond perdu n'a de sens que pour un fond qui touche le bord de la feuille : le header et les bandes de section */
      path === 'header' || path.startsWith('sec:')
        ? [
            k.switchRow(t('Fond perdu 3 mm'), p.bleed, () => {
              p.bleed = !p.bleed;
              save(p);
            }),
            h('p', {
              class: 'hint',
              textContent: t('Le fond coloré déborde de 3 mm sur les bords de la page (sans effet si l’élément n’a pas de fond).'),
            }),
          ]
        : null,
      h('p', { class: 'hint', textContent: t(notes[p.format]) }),
      go,
    ]
      .flat()
      .filter(Boolean),
    null,
    f.ext,
  );
}
