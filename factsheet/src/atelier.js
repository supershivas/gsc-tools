/* Atelier du Factsheet creator : publier dans le dépôt GitHub (commit sur `main`) les images du document
   (logos, header, colonnes) et les projets .json, pour les retrouver sur tous les appareils.
   Les modifications restent d'abord dans le navigateur (éditeur) ; ici on les publie en un geste. */
import { initI18n, t } from './i18n.js';
import { docImages } from './state.js';
import { REPO, getToken, setToken, checkAccess, listDir, readText, commitFiles, textToBase64, splitDataUrl, assetName } from './github.js';

const DOC_KEY = 'factsheet-creator-v1';
const loadDoc = () => { try { return JSON.parse(localStorage.getItem(DOC_KEY)); } catch (e) { return null; } };
const saveDoc = d => localStorage.setItem(DOC_KEY, JSON.stringify(d));
const isLocal = x => /^data:/.test(x.get());

const el = (tag, props = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) { if (v == null || v === false) continue; if (k === 'class') e.className = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else if (k in e) e[k] = v; else e.setAttribute(k, v); }
  e.append(...kids.flat().filter(x => x != null && x !== false)); return e;
};
const icon = n => el('i', { class: 'ti ti-' + n });
const btn = (label, ic, fn, cls = '') => el('button', { type: 'button', class: 'btn ' + cls, onclick: fn }, icon(ic), label);
const slug = s => s.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const root = document.getElementById('atelier');
let access = null;            // null = inconnu, sinon { ok, push } ou { error }
let published = [], projects = [], busy = false, log = [], loadError = '';

const say = (msg, kind = '') => { log.push({ msg, kind }); drawLog(); };
const logEl = el('div', { class: 'log', 'aria-live': 'polite' });
function drawLog() { logEl.replaceChildren(...log.slice(-6).map(l => el('div', { class: 'log-l ' + l.kind, textContent: l.msg }))); }

async function refresh() {
  loadError = '';
  try { [published, projects] = await Promise.all([listDir('factsheet/assets'), listDir('factsheet/projects')]); }
  catch (e) { loadError = e.status === 403 ? t('Limite de requêtes GitHub atteinte : ajoutez un jeton.') : t('Impossible de lire le dépôt.'); }
  draw();
}
async function connect() {
  access = null;
  if (!getToken()) { draw(); return; }
  try { access = await checkAccess(); } catch (e) { access = { error: e.status === 401 ? t('Jeton invalide ou expiré.') : t('Accès refusé à ce dépôt.') }; }
  draw();
}
async function run(task) {
  if (busy) return; busy = true; draw();
  try { await task(); } catch (e) { say(e.timeout ? t('Fichiers publiés, mais le site n’est pas encore à jour. Réessayez dans une minute pour finaliser.') : `${t('Échec')} : ${e.detail || e.message}`, 'err'); }
  busy = false; await refresh();
}
const canPush = () => !!(access && access.ok && access.push);

/* Attend que GitHub Pages serve les fichiers (le déploiement prend ~1 minute) avant de brancher le document dessus */
async function waitLive(names) {
  const t0 = Date.now();
  for (;;) {
    const ok = await Promise.all(names.map(n => fetch(`assets/${n}`, { method: 'HEAD', cache: 'no-store' }).then(r => r.ok, () => false)));
    if (ok.every(Boolean)) return;
    if (Date.now() - t0 > 180000) { const e = new Error('timeout'); e.timeout = true; throw e; }
    say(t('Déploiement du site en cours…')); await new Promise(r => setTimeout(r, 6000));
  }
}

/** Publie les images encore locales du document puis remplace leur contenu par le chemin publié */
async function publishImages() {
  const doc = loadDoc(); if (!doc) return;
  const refs = docImages(doc).filter(isLocal), names = new Map();
  for (const r of refs) { const d = r.get(); if (!names.has(d)) names.set(d, await assetName(d)); }
  const have = new Set(published.map(f => f.name));
  const fresh = [...names].filter(([, n]) => !have.has(n));
  if (fresh.length) {
    say(t('Publication…'));
    await commitFiles(fresh.map(([d, n]) => ({ path: `factsheet/assets/${n}`, base64: splitDataUrl(d).base64 })), `Publie ${fresh.length} image${fresh.length > 1 ? 's' : ''} depuis l’Atelier`);
  }
  await waitLive([...names.values()]);
  const doc2 = loadDoc();                      // relu : l'éditeur a pu enregistrer entre-temps
  docImages(doc2).filter(isLocal).forEach(r => { const n = names.get(r.get()); if (n) r.set('assets/' + n); });
  saveDoc(doc2);
  say(`${t('Publié')} : ${names.size} ${t('image(s)')}`, 'ok');
}

async function publishProject(name) {
  const s = slug(name); if (!s) return;
  await publishImages();
  const doc = loadDoc();
  if (docImages(doc).some(isLocal)) throw new Error(t('Des images ne sont pas encore publiées.'));
  await commitFiles([{ path: `factsheet/projects/${s}.json`, base64: textToBase64(JSON.stringify(doc, null, 2)) }], `Publie le projet ${s} depuis l’Atelier`);
  say(`${t('Projet publié')} : ${s}`, 'ok');
}

async function openProject(p) {
  const doc = JSON.parse(await readText(p.path));
  if (!Array.isArray(doc.sections)) throw new Error(t('Fichier de projet invalide.'));
  saveDoc(doc); location.href = 'index.html';
}

/* ---------- Interface ---------- */
function draw() {
  const doc = loadDoc(), local = doc ? docImages(doc).filter(isLocal) : [];
  const tokenInput = el('input', { type: 'password', placeholder: 'github_pat_…', autocomplete: 'off', value: '' });
  const connected = canPush();
  const sec = (title, ...kids) => el('section', { class: 'card' }, el('h2', { textContent: title }), ...kids);

  const conn = sec('Connexion à GitHub',
    el('p', { class: 'hint', textContent: `Dépôt : ${REPO} (branche main). Le jeton reste dans ce navigateur, il n’est jamais exporté.` }),
    connected ? el('p', { class: 'ok' }, icon('circle-check'), ' ' + t('Connecté : vous pouvez publier.')) : null,
    access && access.error ? el('p', { class: 'err', textContent: access.error }) : null,
    access && access.ok && !access.push ? el('p', { class: 'err', textContent: t('Ce jeton ne peut pas écrire dans le dépôt (permission « Contents : lecture et écriture » requise).') }) : null,
    el('div', { class: 'row' }, getToken() ? el('span', { class: 'hint', textContent: '••••••••••••' }) : tokenInput,
      getToken() ? btn('Retirer le jeton', 'trash', () => { setToken(''); access = null; draw(); }) : btn('Enregistrer et tester', 'plug-connected', () => { const v = tokenInput.value.trim(); if (v) { setToken(v); connect(); } }, 'primary')),
    el('p', { class: 'hint' }, 'Créer un jeton : ', el('a', { href: 'https://github.com/settings/personal-access-tokens/new', target: '_blank', rel: 'noopener', textContent: 'github.com/settings/personal-access-tokens/new' }),
      ` — ${t('accès limité au dépôt')} ${REPO}, ${t('permission')} « Contents : Read and write ».`));

  const toPub = sec('À publier',
    local.length ? el('ul', { class: 'files' }, local.map(r => el('li', {}, el('img', { src: r.get(), alt: '' }), el('span', { textContent: r.label })))) : el('p', { class: 'hint', textContent: 'Toutes les images du document sont publiées.' }),
    btn(local.length ? `${t('Publier')} ${local.length} ${t('image(s)')}` : 'Rien à publier', 'cloud-upload', () => run(publishImages), 'primary'));
  const [pubBtn] = toPub.querySelectorAll('button'); pubBtn.disabled = busy || !connected || !local.length;

  const lib = sec('Images publiées', loadError ? el('p', { class: 'err', textContent: loadError }) : null,
    published.length ? el('div', { class: 'grid' }, published.map(f => el('figure', {}, el('img', { src: `assets/${f.name}`, alt: '', loading: 'lazy' }),
      el('figcaption', {}, el('span', { textContent: f.name }), el('button', { type: 'button', class: 'icon', title: 'Supprimer', disabled: busy || !connected, onclick: () => {
        const used = doc && JSON.stringify(doc).includes('assets/' + f.name);
        if (!confirm(used ? t('Cette image est utilisée par le document en cours. La supprimer quand même ?') : t('Supprimer cette image ?'))) return;
        run(async () => { await commitFiles([{ path: f.path, remove: true }], `Supprime l’image ${f.name} depuis l’Atelier`); say(t('Image supprimée'), 'ok'); });
      } }, icon('trash'))))))
      : el('p', { class: 'hint', textContent: 'Aucune image publiée.' }));

  const nameInput = el('input', { type: 'text', placeholder: 'Nom du projet', value: (doc && doc.name) || '' });
  const proj = sec('Projets',
    el('div', { class: 'row' }, nameInput, btn('Publier le projet en cours', 'cloud-upload', () => run(() => publishProject(nameInput.value)), 'primary')),
    projects.length ? el('ul', { class: 'files plist' }, projects.filter(p => /\.json$/.test(p.name)).map(p => el('li', {}, icon('file-code'), el('span', { textContent: p.name.replace(/\.json$/, '') }),
      el('span', { class: 'sp' }),
      btn('Ouvrir dans l’éditeur', 'folder-open', () => { if (confirm(t('Remplacer le projet en cours dans ce navigateur ?'))) run(() => openProject(p)); }),
      el('button', { type: 'button', class: 'icon', title: 'Supprimer', disabled: busy || !connected, onclick: () => { if (confirm(t('Supprimer ce projet ?'))) run(async () => { await commitFiles([{ path: p.path, remove: true }], `Supprime le projet ${p.name} depuis l’Atelier`); say(t('Projet supprimé'), 'ok'); }); } }, icon('trash')))))
      : el('p', { class: 'hint', textContent: 'Aucun projet publié.' }));
  [...proj.querySelectorAll('.row .btn')].forEach(b => { b.disabled = busy || !connected; });

  root.replaceChildren(conn, toPub, lib, proj, logEl);
}

initI18n();
draw(); drawLog();
connect().then(refresh);
