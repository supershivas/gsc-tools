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
export const parseAssets = (files) =>
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
    .then((files) => (cache = parseAssets(files)));
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
/** Version d'un logo d'après son nom : `default`, `pec_mono_h_rgb_en`, `ceu_neg_h_rgb_en`… (un mot-clé entier, `neg` = négatif) ; null si aucun */
const VARIANT_WORDS = { default: 'default', mono: 'mono', white: 'white', negative: 'negative', neg: 'negative' };
export const logoVariantOf = (stem) => {
  const w = String(stem)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .find((x) => VARIANT_WORDS[x]);
  return w ? VARIANT_WORDS[w] : null;
};
/** Familles de logos : dossier → { default, mono, white, negative } (chemins). Un fichier nommé exactement comme la version l'emporte sur un nom plus long. */
export function logoFamilies(list) {
  const out = new Map();
  for (const [folder, entries] of byFolder(list, 'logos')) {
    const files = {},
      exact = new Set();
    for (const e of entries) {
      const v = logoVariantOf(e.stem);
      if (!v) continue;
      if (e.stem.toLowerCase() === v) {
        files[v] = e.path;
        exact.add(v);
      } else if (!exact.has(v) && !files[v]) files[v] = e.path;
    }
    out.set(folder, files);
  }
  return out;
}
