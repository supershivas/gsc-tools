import { h, ico } from '../render.js';
import { t } from '../i18n.js';
import { TAB_KEYS } from './keys.js';

/* Barre d'onglets sous l'en-tête (hauteur fixe, `#fsTabs` dans index.html) : un onglet par document ouvert (nom, point
   « modifié depuis le dernier export », fermer), « + » pour une factsheet vierge, et l'état du brouillon à droite.
   Clic du milieu sur un onglet : le fermer. Masquée à l'impression (css/app.css). */
export function createTabsUi(ws, host) {
  const strip = h('div', { class: 'fs-tabs', role: 'tablist', 'aria-label': t('Documents ouverts') });
  const add = h(
    'button',
    {
      type: 'button',
      class: 'fs-tab-add',
      title: `${t('Nouvel onglet')} (${TAB_KEYS.add})`,
      'aria-label': t('Nouvel onglet'),
      onclick: () => ws.newBlank(),
    },
    ico('plus'),
  );
  const statusIco = h('i', { class: 'ti' }),
    statusTxt = h('span'),
    status = h('div', { class: 'fs-ws-status', role: 'status' }, statusIco, statusTxt);
  host.replaceChildren(strip, add, status);

  function render() {
    const act = ws.active();
    strip.replaceChildren(
      ...ws.tabs.map((tab) => {
        const on = tab === act,
          dirty = ws.isDirty(tab),
          name = ws.nameOf(tab);
        return h(
          'div',
          {
            class: 'fs-tab' + (on ? ' on' : ''),
            dataset: { id: tab.id },
            onauxclick: (e) => {
              if (e.button === 1) {
                e.preventDefault();
                ws.close(tab.id);
              }
            },
          },
          h(
            'button',
            {
              type: 'button',
              role: 'tab',
              class: 'fs-tab-btn',
              'aria-selected': String(on),
              title: dirty ? `${name} — ${t('Modifié depuis le dernier export')}` : name,
              onclick: () => ws.activate(tab.id),
            },
            dirty ? h('span', { class: 'fs-tab-dot', role: 'img', 'aria-label': t('Modifié depuis le dernier export') }) : null,
            h('span', { class: 'fs-tab-name no-i18n', textContent: name }),
          ),
          h(
            'button',
            {
              type: 'button',
              class: 'fs-tab-x',
              title: `${t('Fermer l’onglet')} (${TAB_KEYS.close})`,
              'aria-label': `${t('Fermer l’onglet')} « ${name} »`,
              onclick: () => ws.close(tab.id),
            },
            ico('x'),
          ),
        );
      }),
    );
    const on = strip.querySelector('.fs-tab.on');
    if (on) on.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    renderStatus();
  }

  function renderStatus() {
    const s = ws.status();
    const [icon, text] =
      s.kind === 'error'
        ? ['alert-triangle', t('Brouillon non enregistré : stockage du navigateur plein')]
        : s.kind === 'local'
          ? ['device-floppy', t('Brouillon du document actif seulement (IndexedDB indisponible)')]
          : ['cloud-check', t('Brouillon enregistré')];
    statusIco.className = 'ti ti-' + icon;
    status.classList.toggle('err', s.kind === 'error');
    statusTxt.textContent = s.dirty ? `${text} · ${t('Modifié depuis le dernier export')}` : text;
    status.title = t('Les brouillons restent dans ce navigateur. Fichier › Enregistrer (.json) pour garder une copie.');
  }

  return { render, renderStatus };
}
