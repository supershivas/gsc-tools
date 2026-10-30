/* Coque commune : en-tête, réglages (version, changelog, export JSON), mise à jour automatique, toast.
   Chargé en module par chaque page. `sub` est le nom de l'outil affiché après « GSC tools ». */
import { startUpdateCheck, loadVersion, loadChangelog, downloadJSON } from './app-update.js';

const ROOT = new URL('../', import.meta.url);
const VERSION_URL = new URL('version.json', ROOT).href;
const CHANGELOG_URL = new URL('CHANGELOG.md', ROOT).href;
const DATA_PREFIX = 'factsheet-creator';

const el = (tag, props = {}, ...kids) => {
  const e = document.createElement(tag);
  Object.assign(e, props);
  e.append(...kids.filter(Boolean));
  return e;
};
const icon = name => el('i', { className: 'ti ti-' + name });

export function toast(text) {
  const t = el('div', { className: 'toast', role: 'status', textContent: text });
  document.body.append(t);
  setTimeout(() => t.remove(), 4000);
}

function exportData(version) {
  const data = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k.startsWith(DATA_PREFIX)) continue;
    try { data[k] = JSON.parse(localStorage.getItem(k)); } catch { data[k] = localStorage.getItem(k); }
  }
  downloadJSON({ app: 'gsc-tools', version, exportedAt: new Date().toISOString(), data }, 'gsc-tools-export.json');
}

/* Sections ajoutées par la page dans les réglages (ex. la langue) : [{ title, node }] */
let settingsExtra = [];

async function buildSettings() {
  const version = await loadVersion(VERSION_URL);
  const entries = await loadChangelog(CHANGELOG_URL);
  const dlg = el('dialog', { className: 'settings', ariaLabel: 'Réglages' });
  const close = el('button', { type: 'button', className: 'icon-btn', ariaLabel: 'Fermer', onclick: () => dlg.close() }, icon('x'));
  const log = el('ul', { className: 'changelog' }, ...entries.map(e =>
    el('li', {}, el('b', { textContent: 'v' + e.version }), el('small', { textContent: e.date }),
      el('ul', {}, ...e.changes.map(c => el('li', { textContent: c }))))));
  const exp = el('button', { type: 'button', className: 'btn', onclick: () => exportData(version) }, icon('download'), 'Exporter mes données (JSON)');
  dlg.append(
    el('div', { className: 'panel-head' }, el('h2', { textContent: 'Réglages' }), close),
    el('div', { className: 'settings-body' },
      ...settingsExtra.map(x => el('section', {}, el('h3', { textContent: x.title }), x.node)),
      el('section', {}, el('h3', { textContent: 'Atelier' }), el('a', { className: 'btn', href: new URL('factsheet/atelier.html', ROOT).href }, icon('brush'), 'Atelier du Factsheet creator')),
      el('section', {}, el('h3', { textContent: 'Labo' }), el('a', { className: 'btn', href: new URL('factsheet/labo.html', ROOT).href }, icon('flask'), 'Labo du Factsheet creator')),
      el('section', {}, el('h3', { textContent: 'Version' }), el('div', { className: 'version-line', textContent: version ? 'v' + version : '—' })),
      el('section', {}, el('h3', { textContent: 'Dernières versions' }), log),
      el('section', {}, el('h3', { textContent: 'Données' }), exp)));
  dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
  document.body.append(dlg);
  return dlg;
}

/* Menus déroulants de l'en-tête : [{ label, items: [{ label, icon?, href?, run?, checked?() } | { heading } | '-'] }] */
function buildMenus(menus) {
  const nav = el('nav', { className: 'app-menus', ariaLabel: 'Menu' });
  const pops = [];
  const closeAll = () => pops.forEach(({ btn, pop }) => { pop.hidden = true; btn.setAttribute('aria-expanded', 'false'); });
  const open = m => { closeAll(); m.fill(); m.pop.hidden = false; m.btn.setAttribute('aria-expanded', 'true'); };
  for (const def of menus) {
    const btn = el('button', { type: 'button', className: 'menu-btn', textContent: def.label, ariaHasPopup: 'menu', ariaExpanded: 'false' });
    const pop = el('div', { className: 'menu-pop', role: 'menu', hidden: true });
    const m = { btn, pop, fill() {
      pop.replaceChildren(...def.items.map(it => {
        if (it === '-') return el('div', { className: 'menu-sep', role: 'separator' });
        if (it.heading) return el('div', { className: 'menu-head', textContent: it.heading });
        const mark = it.checked ? el('i', { className: 'ti ti-check' + (it.checked() ? '' : ' off') }) : it.icon ? icon(it.icon) : el('i', { className: 'ti' });
        return el(it.href ? 'a' : 'button', { className: 'menu-item', role: it.checked ? 'menuitemradio' : 'menuitem', ariaChecked: it.checked ? String(it.checked()) : null,
          ...(it.href ? { href: it.href } : { type: 'button' }), onclick: () => { closeAll(); if (it.run) it.run(); } }, mark, el('span', { textContent: it.label }));
      }));
    } };
    pops.push(m);
    btn.addEventListener('click', () => (pop.hidden ? open(m) : closeAll()));
    btn.addEventListener('pointerenter', () => { if (pops.some(x => !x.pop.hidden) && pop.hidden) open(m); });
    nav.append(el('div', { className: 'menu' }, btn, pop));
  }
  document.addEventListener('pointerdown', e => { if (!nav.contains(e.target)) closeAll(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeAll(); });
  return nav;
}

export function initShell({ sub = '', homeUrl = new URL('./', ROOT).href, menus = [], settingsExtra: extra = [] } = {}) {
  settingsExtra = extra;
  const host = document.getElementById('app-header');
  const name = el('a', { className: 'app-name', href: homeUrl, textContent: 'GSC tools' });
  let dlgPromise;
  const gear = el('button', { type: 'button', className: 'icon-btn', ariaLabel: 'Réglages', title: 'Réglages',
    onclick: async () => { dlgPromise ||= buildSettings(); (await dlgPromise).showModal(); } }, icon('settings'));
  // Le nom ramène à l'accueil et referme les modales ouvertes.
  name.addEventListener('click', () => document.querySelectorAll('dialog[open]').forEach(d => d.close()));
  host.className = 'app-header';
  host.append(el('div', { className: 'app-left' }, name, sub ? el('span', { className: 'app-sub', textContent: sub }) : null, menus.length ? buildMenus(menus) : null), gear);

  // App uniquement bureau : bandeau refermable sur téléphone.
  let hidden = false;
  try { hidden = sessionStorage.getItem('desktop-banner') === '1'; } catch { /* sans stockage, le bandeau revient */ }
  if (!hidden) {
    const banner = el('div', { className: 'desktop-banner show', role: 'note' },
      el('span', { textContent: 'Cette app est prévue pour un écran d’ordinateur' }),
      el('button', { type: 'button', className: 'icon-btn', ariaLabel: 'Fermer le bandeau', style: 'font-size:18px', onclick: () => {
        banner.remove();
        try { sessionStorage.setItem('desktop-banner', '1'); } catch { /* ignoré */ }
      } }, icon('x')));
    host.after(banner);
  }

  startUpdateCheck({ versionUrl: VERSION_URL, onUpdated: v => toast(`Mis à jour en v${v}`) });
}
