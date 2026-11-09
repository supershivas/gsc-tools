/* Touches de modification selon la plateforme (libellés des raccourcis) */
export const MAC = /Mac|iPhone|iPad/.test(navigator.platform || '');
export const MOD = MAC ? '⌘' : 'Ctrl+';
export const SHIFT = MAC ? '⇧' : 'Shift+';
