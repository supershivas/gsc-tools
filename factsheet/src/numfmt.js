/* Format des nombres du document (`doc.locale`). Une locale Intl (en-GB, fr-BE, de-DE…) ou `SPACE_LOCALE` : milliers séparés par une espace
   insécable (comme en France) et point décimal. Intl n'a pas cette combinaison : `SPACE_LOCALE` est une locale en-GB (extension privée,
   acceptée par Intl) dont on remplace le séparateur de milliers. Tout formatage de nombre du document passe par `numberFormat`. */
export const SPACE_LOCALE = 'en-GB-x-space';
const NBSP = ' ';

/** Comme `new Intl.NumberFormat(locale, opts)` (`format` et `formatToParts`), pour toutes les locales du document */
export function numberFormat(locale, opts) {
  const nf = new Intl.NumberFormat(locale || 'en-GB', opts);
  if (locale !== SPACE_LOCALE) return nf;
  const parts = (v) => nf.formatToParts(v).map((p) => (p.type === 'group' ? { type: 'group', value: NBSP } : p));
  return {
    format: (v) =>
      parts(v)
        .map((p) => p.value)
        .join(''),
    formatToParts: parts,
  };
}
