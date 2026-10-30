/* Bibliothèque d'icônes : tracé fin, viewBox 24 × 24. Pour en ajouter : une clé + un tracé SVG. */
export const ICONS = {
  check:    { label: 'Validé',      d: 'M5 12.5l4.5 4.5L19 7.5' },
  globe:    { label: 'Monde',       d: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18z M12 3c-3 2.5-4 5.5-4 9s1 6.5 4 9c3-2.5 4-5.5 4-9s-1-6.5-4-9z M3 12h18' },
  people:   { label: 'Personnes',   d: 'M9 5a3 3 0 1 0 0 6a3 3 0 1 0 0-6z M3.5 19c0-3.2 2.5-5.5 5.5-5.5s5.5 2.3 5.5 5.5 M17 6.5a2.4 2.4 0 1 0 0 4.8a2.4 2.4 0 1 0 0-4.8z M16.2 13.8c2.6 0 4.3 1.9 4.3 4.7' },
  euro:     { label: 'Euro',        d: 'M17.5 6.5a7 7 0 1 0 0 11 M4 10h9 M4 14h9' },
  document: { label: 'Document',    d: 'M7 3h7l4 4v14H7z M14 3v4h4 M9.5 12h6 M9.5 15.5h6' },
  chart:    { label: 'Graphique',   d: 'M4 20V4 M4 20h16 M8 16v-5 M12 16V8 M16 16v-3' },
  lock:     { label: 'Sécurité',    d: 'M6 11h12v9H6z M8.5 11V8a3.5 3.5 0 0 1 7 0v3' },
  leaf:     { label: 'Environnement', d: 'M5 19c0-8 5-14 14-14 0 9-6 14-14 14z M5 19c3-4 6-7 10-9' },
  bolt:     { label: 'Énergie',     d: 'M13 3L6 13h5l-1 8 7-10h-5z' },
  home:     { label: 'Logement',    d: 'M4 11l8-7 8 7 M6 10v10h12V10 M10 20v-5h4v5' },
  shield:   { label: 'Protection',  d: 'M12 3l7 3v5.5c0 4.5-3 7.5-7 9.5-4-2-7-5-7-9.5V6z' },
  flag:     { label: 'Objectif',    d: 'M6 21V4 M6 5h11l-2 4 2 4H6' },
  calendar: { label: 'Calendrier',  d: 'M4 6h16v14H4z M4 10h16 M8 3v4 M16 3v4' },
  search:   { label: 'Recherche',   d: 'M11 5a6 6 0 1 0 0 12a6 6 0 1 0 0-12z M15.5 15.5L20 20' },
  mail:     { label: 'Courrier',    d: 'M3 5h18v14H3z M3.5 6.5l8.5 7 8.5-7' },
  star:     { label: 'Étoile',      d: 'M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.9l-5.2 2.8 1-5.9L3.5 9.7l5.9-.8z' },
  sliders:  { label: 'Réglages',    d: 'M4 7h10 M18 7h2 M16 5a2 2 0 1 0 0 4a2 2 0 1 0 0-4z M4 17h2 M10 17h10 M8 15a2 2 0 1 0 0 4a2 2 0 1 0 0-4z' },
  send:     { label: 'Envoi',       d: 'M21 3L3 10.5l7 3 3 7z M10 13.5L21 3' },
  pencil:   { label: 'Rédaction',   d: 'M4 20l1-4L16 5l3 3L8 19z M14 7l3 3' },
};
export const ICON_OPTIONS = Object.fromEntries(Object.entries(ICONS).map(([k, v]) => [k, v.label]));
