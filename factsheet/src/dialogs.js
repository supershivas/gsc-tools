import { alertModal, confirmModal, promptModal } from '../../js/dialog.js';
import { t } from './i18n.js';

/* Modales de l'app (js/dialog.js) avec boutons traduits. Remplacent alert / confirm / prompt : toujours `await`. */
export const alertBox = (msg) => alertModal(msg, { ok: t('OK') });
export const confirmBox = (msg, { ok = t('OK'), danger = false } = {}) => confirmModal(msg, { ok, cancel: t('Annuler'), danger });
export const promptBox = (msg, value) => promptModal(msg, value, { ok: t('OK'), cancel: t('Annuler') });
