import { migrate } from '../state.js';
import { t } from '../i18n.js';

/* ---------- Historique (annuler / rétablir) : moteur ----------
   Un instantané du document après chaque modification ; la frappe est regroupée (1 s). Les images en data URL sont
   remplacées par un numéro dans les instantanés pour ne pas multiplier les mégaoctets.
   L'interface (boutons, panneau, nom du fichier) est dans history-ui.js ; `onChange` est appelé après chaque pas. */

/* Libellé d'un pas d'historique : première différence entre l'état précédent et le nouveau, dite en mots */
const FIELDS = {
  text: 'texte',
  title: 'titre',
  subtitle: 'sous-titre',
  overline: 'surtitre',
  bg: 'fond',
  fg: 'couleur du texte',
  stroke: 'contour',
  strokeColor: 'couleur du contour',
  fillColor: 'fond',
  layout: 'colonnes',
  page: 'page',
  valign: 'alignement vertical',
  align: 'alignement',
  density: 'espacement',
  locale: 'format des nombres',
  src: 'image',
  caption: 'légende',
  logoVariant: 'logo',
  logos: 'logo',
  colors: 'couleurs',
  colorNames: 'noms des couleurs',
  viz: 'dataviz',
  card: 'carte',
  figure: 'chiffre clé',
  type: 'type de contenu',
  imageId: 'image',
  images: 'images',
  showImage: 'image',
  showLogo: 'logo',
  name: 'nom du fichier',
  showTitle: 'affichage du titre',
};
const firstDiff = (a, b, path = []) => {
  if (a === b) return null;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return { path };
  if (Array.isArray(a) && Array.isArray(b) && a.length !== b.length) return { path, grew: b.length - a.length };
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const r = firstDiff(a[k], b[k], [...path, k]);
    if (r) return r;
  }
  return null;
};

export function createHistory(ctx) {
  const HIST = { stack: [], meta: [], i: -1, at: 0, burst: false, applying: false, max: 100 };
  const imgIds = new Map(),
    imgById = [];
  const tokenOf = (v) => {
    let n = imgIds.get(v);
    if (n == null) {
      n = imgById.length;
      imgById.push(v);
      imgIds.set(v, n);
    }
    return `\u0001img${n}`;
  };
  const snapshot = () =>
    JSON.stringify(ctx.getDoc(), (k, v) => (typeof v === 'string' && v.length > 300 && v.startsWith('data:') ? tokenOf(v) : v));
  const restore = (str) => JSON.parse(str, (k, v) => (typeof v === 'string' && v.startsWith('\u0001img') ? imgById[+v.slice(4)] : v));

  function describe(prevStr, nextStr) {
    if (prevStr == null) return t('Ouverture du document');
    let d;
    try {
      const A = restore(prevStr),
        B = restore(nextStr);
      d = firstDiff(A, B);
      var doc2 = B;
    } catch (e) {
      return t('Modification');
    }
    if (!d) return t('Modification');
    const p = d.path,
      name = (x) =>
        String(x || '')
          .trim()
          .slice(0, 22);
    let where = '',
      field = '';
    if (p[0] === 'header') {
      where = t('Header');
      field = p[1];
    } else if (p[0] === 'sections') {
      if (p.length === 1) return d.grew > 0 ? t('Section ajoutée') : d.grew < 0 ? t('Section supprimée') : t('Éléments déplacés');
      const sec = doc2.sections[p[1]];
      where = `${t('Section')} « ${name(sec && sec.title)} »`;
      if (p[2] === 'subs') {
        if (p.length === 3)
          return d.grew > 0 ? t('Sous-section ajoutée') : d.grew < 0 ? t('Sous-section supprimée') : t('Éléments déplacés');
        const sub = sec && sec.subs[p[3]];
        where = `${t('Sous-section')} « ${name(sub && sub.title)} »`;
        if (p[4] === 'cols') {
          if (p.length === 5) return d.grew > 0 ? t('Colonne ajoutée') : d.grew < 0 ? t('Colonne supprimée') : t('Éléments déplacés');
          where = `${t('Colonne')} ${+p[5] + 1}`;
          field = p[6];
        } else field = p[4];
      } else field = p[2];
    } else {
      where = t('Document');
      field = p[0];
    }
    if (field === 'id') return t('Éléments déplacés');
    return `${where} · ${FIELDS[field] ? t(FIELDS[field]) : t('réglage')}`;
  }

  const api = { steps: HIST, onChange: () => {} };
  api.record = (burst) => {
    if (HIST.applying) return;
    const sn = snapshot();
    if (HIST.i >= 0 && HIST.stack[HIST.i] === sn) return;
    const now = Date.now();
    if (burst && HIST.burst && HIST.i === HIST.stack.length - 1 && HIST.i > 0 && now - HIST.at < 1000) {
      HIST.stack[HIST.i] = sn;
      HIST.meta[HIST.i] = { label: describe(HIST.stack[HIST.i - 1], sn), at: HIST.meta[HIST.i].at };
    } else {
      HIST.stack.length = HIST.i + 1;
      HIST.meta.length = HIST.i + 1;
      HIST.stack.push(sn);
      HIST.meta.push({ label: describe(HIST.stack[HIST.i], sn), at: now });
      if (HIST.stack.length > HIST.max) {
        HIST.stack.shift();
        HIST.meta.shift();
      }
      HIST.i = HIST.stack.length - 1;
    }
    HIST.at = now;
    HIST.burst = !!burst;
    api.onChange();
  };
  api.goTo = (i) => {
    if (i < 0 || i >= HIST.stack.length) return;
    HIST.i = i;
    HIST.applying = true;
    try {
      ctx.setDoc(migrate(restore(HIST.stack[i])));
      ctx.preview(null);
      ctx.restructure();
    } finally {
      HIST.applying = false;
    }
    api.onChange();
  };
  api.undo = () => api.goTo(HIST.i - 1);
  api.redo = () => api.goTo(HIST.i + 1);
  api.canUndo = () => HIST.i > 0;
  api.canRedo = () => HIST.i < HIST.stack.length - 1;
  return api;
}
