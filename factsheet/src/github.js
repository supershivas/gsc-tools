/* Accès au dépôt GitHub (API REST) depuis le navigateur : lire un dossier, publier ou supprimer des fichiers
   en un seul commit sur `main`. Le jeton personnel (droits fins, « Contents » en lecture/écriture sur ce seul dépôt)
   reste dans ce navigateur ; sa clé n'a volontairement pas le préfixe exporté par les réglages. */
export const REPO = 'supershivas/gsc-tools', BRANCH = 'main';
const API = 'https://api.github.com/repos/' + REPO;
const TOKEN_KEY = 'gsc-tools-github-token';

export const getToken = () => { try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; } };
export const setToken = v => { try { v ? localStorage.setItem(TOKEN_KEY, v) : localStorage.removeItem(TOKEN_KEY); } catch (e) {} };

async function gh(path, init = {}) {
  const token = getToken();
  const r = await fetch(API + path, { ...init, headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28',
    ...(token ? { Authorization: 'Bearer ' + token } : {}), ...(init.body ? { 'Content-Type': 'application/json' } : {}) } });
  if (!r.ok) { const e = new Error(`GitHub ${r.status}`); e.status = r.status; try { e.detail = (await r.json()).message; } catch (x) {} throw e; }
  return r.status === 204 ? null : r.json();
}

/** { ok, push } : le jeton est valide et peut écrire dans le dépôt */
export async function checkAccess() {
  const r = await gh('');
  return { ok: true, push: !!(r.permissions && r.permissions.push) };
}

/** Fichiers d'un dossier du dépôt (vide si le dossier n'existe pas encore) */
export async function listDir(dir) {
  try {
    const list = await gh(`/contents/${dir}?ref=${BRANCH}`);
    return Array.isArray(list) ? list.filter(f => f.type === 'file').map(f => ({ name: f.name, path: f.path, size: f.size })) : [];
  } catch (e) { if (e.status === 404) return []; throw e; }
}

/** Texte brut d'un fichier du dépôt (sans attendre le déploiement de Pages) */
export async function readText(path) {
  const j = await gh(`/contents/${path}?ref=${BRANCH}`);
  return new TextDecoder().decode(Uint8Array.from(atob(j.content.replace(/\n/g, '')), c => c.charCodeAt(0)));
}

/** files : [{ path, base64 }] à écrire, ou [{ path, remove: true }] à supprimer — un seul commit */
export async function commitFiles(files, message) {
  const ref = await gh(`/git/ref/heads/${BRANCH}`), head = ref.object.sha;
  const base = (await gh(`/git/commits/${head}`)).tree.sha;
  const tree = [];
  for (const f of files) {
    if (f.remove) { tree.push({ path: f.path, mode: '100644', type: 'blob', sha: null }); continue; }
    const blob = await gh('/git/blobs', { method: 'POST', body: JSON.stringify({ content: f.base64, encoding: 'base64' }) });
    tree.push({ path: f.path, mode: '100644', type: 'blob', sha: blob.sha });
  }
  const t = await gh('/git/trees', { method: 'POST', body: JSON.stringify({ base_tree: base, tree }) });
  const c = await gh('/git/commits', { method: 'POST', body: JSON.stringify({ message, tree: t.sha, parents: [head] }) });
  await gh(`/git/refs/heads/${BRANCH}`, { method: 'PATCH', body: JSON.stringify({ sha: c.sha }) });
  return c.sha;
}

/* ---------- Utilitaires de contenu ---------- */
export const textToBase64 = s => { let bin = ''; for (const b of new TextEncoder().encode(s)) bin += String.fromCharCode(b); return btoa(bin); };
export function splitDataUrl(d) { const m = /^data:([^;,]+)[^,]*;base64,(.*)$/.exec(d) || []; return { mime: m[1] || '', base64: m[2] || '' }; }
const EXT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/svg+xml': 'svg', 'image/webp': 'webp', 'image/gif': 'gif' };
/** nom de fichier stable d'après le contenu : publier deux fois la même image ne crée qu'un fichier */
export async function assetName(dataUrl) {
  const { mime, base64 } = splitDataUrl(dataUrl);
  const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  const sum = [...new Uint8Array(await crypto.subtle.digest('SHA-1', bytes))].map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 10);
  return `${sum}.${EXT[mime] || 'png'}`;
}
