/* Modales de la coque (remplacent alert / confirm / prompt du navigateur) : alertModal, confirmModal, promptModal.
   Natives (<dialog>) : focus piégé, Échap et clic sur le fond = annuler. Styles : css/shell.css (.modal).
   Les textes sont passés déjà traduits ; `ok` et `cancel` valent « OK » et « Annuler » par défaut. */

const el = (tag, props = {}, ...kids) => {
  const e = document.createElement(tag);
  Object.assign(e, props);
  e.append(...kids.filter(Boolean));
  return e;
};

/* Ouvre une modale et rend la valeur choisie. `fields` : contenu ajouté sous le message ; `read` : valeur rendue à la validation. */
function open({ message, title, icon, ok = 'OK', cancel, danger, fields, read }) {
  return new Promise((resolve) => {
    const dlg = el('dialog', { className: 'modal', ariaLabel: title || message });
    const form = el('form', { method: 'dialog', className: 'modal-form' });
    const okBtn = el('button', { type: 'submit', className: 'btn primary', textContent: ok });
    const cancelBtn = cancel ? el('button', { type: 'button', className: 'btn', textContent: cancel, onclick: () => dlg.close() }) : null;
    form.append(
      el('div', { className: 'modal-body' },
        icon ? el('i', { className: 'ti ti-' + icon + (danger ? ' warn' : '') }) : null,
        el('div', { className: 'modal-text' },
          title ? el('h2', { textContent: title }) : null,
          el('p', { textContent: message }),
          fields || null)),
      el('div', { className: 'modal-actions' }, cancelBtn, okBtn));
    let result = null;
    form.addEventListener('submit', () => { result = read ? read() : true; });
    dlg.addEventListener('close', () => { dlg.remove(); resolve(result); });
    dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
    dlg.append(form);
    document.body.append(dlg);
    dlg.showModal();
    // Action destructrice : le focus part sur « Annuler », pour qu'Entrée ne supprime pas par réflexe.
    (danger && cancelBtn ? cancelBtn : fields ? fields.querySelector('input') : okBtn).focus();
  });
}

/* Information ou erreur : un seul bouton. Rend une promesse résolue à la fermeture. */
export const alertModal = (message, { title, ok, icon = 'alert-circle' } = {}) => open({ message, title, ok, icon }).then(() => undefined);

/* Question : rend true (confirmé) ou false (annulé). `danger` : action destructrice. */
export const confirmModal = (message, { title, ok = 'OK', cancel = 'Annuler', danger = false, icon = danger ? 'alert-triangle' : 'help-circle' } = {}) =>
  open({ message, title, ok, cancel, danger, icon }).then((r) => r === true);

/* Saisie d'une ligne : rend le texte saisi, ou null si annulé. */
export const promptModal = (message, value = '', { title, ok = 'OK', cancel = 'Annuler' } = {}) => {
  const input = el('input', { type: 'text', className: 'modal-input', value, autocomplete: 'off', spellcheck: false });
  return open({ message, title, ok, cancel, fields: el('div', { className: 'modal-field' }, input), read: () => input.value });
};

/* Choix d'une valeur parmi `options` [{ value, label, color? }] (pastille de couleur facultative) : rend la valeur choisie, ou null si annulé. */
export const chooseModal = (message, options, { value = options[0] && options[0].value, title, ok = 'OK', cancel = 'Annuler', icon = 'arrows-exchange' } = {}) => {
  const name = 'choice-' + Math.random().toString(36).slice(2);
  const rows = options.map((o) =>
    el('label', { className: 'modal-choice' },
      el('input', { type: 'radio', name, value: o.value, checked: o.value === value }),
      o.color ? el('i', { className: 'modal-sw', style: `background:${o.color}` }) : null,
      el('span', { textContent: o.label })));
  const list = el('div', { className: 'modal-choices', role: 'radiogroup' }, ...rows);
  return open({ message, title, ok, cancel, icon, fields: list, read: () => (list.querySelector('input:checked') || {}).value ?? null })
    .then((r) => (r === true ? null : r));
};
