/* Images publiées dans le dépôt (factsheet/assets/, rangées en logos/, header/, others/).
   GitHub Pages ne liste pas un dossier : la liste vient de assets/index.json, générée à chaque déploiement (scripts/assets-manifest.mjs).
   Sans ce fichier (hors ligne, serveur local), on retombe sur les images fournies d'origine. */
import { DEFAULT_LOGOS, DEFAULT_IMAGE_SRC } from './state.js';

export const KINDS = ['logos', 'header', 'others'];
export const KIND_ICON = { logos: 'certificate', header: 'photo', others: 'photos' };
/* clés françaises : elles passent par t() à l'affichage */
export const KIND_LABEL = { logos: 'Logos', header: 'Images du header', others: 'Autres images' };

const FALLBACK = [...Object.values(DEFAULT_LOGOS()), DEFAULT_IMAGE_SRC, 'assets/others/lantern-emblem.png'].map((p) =>
  p.slice('assets/'.length),
);

/** « logos/gsc/default.png » → { kind: 'logos', folder: 'gsc', name: 'default.png', stem: 'default', path: 'assets/logos/gsc/default.png' } */
const parse = (files) =>
  files
    .filter((f) => typeof f === 'string' && /^(logos|header|others)\//.test(f) && !f.includes('..'))
    .map((f) => {
      const parts = f.split('/'),
        name = parts.pop();
      return { kind: parts[0], folder: parts.slice(1).join(' / '), name, stem: name.replace(/\.[^.]+$/, ''), path: 'assets/' + f };
    });

let cache = null,
  pending = null;
/** La liste, si elle est déjà chargée (sinon null) */
export const assetsNow = () => cache;
export function loadAssets() {
  pending ||= fetch('assets/index.json', { cache: 'no-cache' })
    .then((r) => (r.ok ? r.json() : null))
    .then(
      (j) => (Array.isArray(j && j.files) ? j.files : FALLBACK),
      () => FALLBACK,
    )
    .then((files) => (cache = parse(files)));
  return pending;
}
/** Affiche `build(liste)` dans `box` : tout de suite si la liste est chargée, sinon dès qu'elle l'est */
export function withAssets(box, build) {
  const now = assetsNow();
  if (now) box.append(build(now));
  else loadAssets().then((a) => box.replaceChildren(build(a)));
  return box;
}

/** dossier → entrées, pour un genre d'image */
export function byFolder(list, kind) {
  const m = new Map();
  list.filter((e) => e.kind === kind).forEach((e) => m.set(e.folder, [...(m.get(e.folder) || []), e]));
  return m;
}
/** Familles de logos : dossier → { default, mono, white, negative } (chemins) */
export function logoFamilies(list) {
  const out = new Map();
  for (const [folder, entries] of byFolder(list, 'logos'))
    out.set(
      folder,
      Object.fromEntries(entries.filter((e) => ['default', 'mono', 'white', 'negative'].includes(e.stem)).map((e) => [e.stem, e.path])),
    );
  return out;
}
