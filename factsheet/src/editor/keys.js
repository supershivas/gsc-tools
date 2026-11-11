/* Touches de modification selon la plateforme (libellés des raccourcis) */
export const MAC = /Mac|iPhone|iPad/.test(navigator.platform || '');
export const MOD = MAC ? '⌘' : 'Ctrl+';
export const SHIFT = MAC ? '⇧' : 'Shift+';
/* Onglets : Ctrl/Cmd + T et + W sont réservés par le navigateur (une page ne peut pas les intercepter) : Alt (⌥) + N / W */
export const TAB_KEYS = MAC ? { add: '⌥N', close: '⌥W' } : { add: 'Alt+N', close: 'Alt+W' };
