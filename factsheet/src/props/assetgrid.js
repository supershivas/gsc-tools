/* Navigateur d'images du dépôt : genres (logos, header, autres) → dossiers repliables → vignettes.
   Les images qui ne sont que dans le navigateur (data URL) s'y ajoutent, avec un petit marqueur « non stockée ». */
import { h, ico } from '../render.js';
import { t } from '../i18n.js';
import { docImages } from '../state.js';
import { KINDS, KIND_ICON, KIND_LABEL, byFolder } from '../assetlib.js';

/** Images du document qui ne sont pas dans le dépôt, sans doublon */
export function localEntries(doc, kind) {
  const seen = new Set();
  return docImages(doc)
    .filter((x) => /^data:/.test(x.get()) && (!kind || x.kind === kind))
    .filter((x) => !seen.has(x.get()) && seen.add(x.get()))
    .map((x) => ({ kind: x.kind, folder: '', name: x.label, stem: x.label, path: x.get(), local: true }));
}

/** assets : liste du dépôt. kinds : genres affichés. onPick(entrée) → fonction (clic) ou null (vignette inerte). isOn(entrée) → vignette choisie. */
export function assetBrowser({ doc, assets, kinds = KINDS, onPick, isOn }) {
  const tile = (e) => {
    const pick = onPick && onPick(e);
    const pic = h(
      pick ? 'button' : 'div',
      {
        ...(pick ? { type: 'button', onclick: pick } : {}),
        class: 'imgtile-pic' + (/^(white|negative)$/.test(e.stem) ? ' dark' : ''),
        title: e.local ? t('Seulement dans ce navigateur : à déposer dans le dépôt GitHub pour la conserver') : e.path,
      },
      h('img', { src: e.path, alt: '', loading: 'lazy' }),
      e.local ? h('span', { class: 'imgtile-flag' }, ico('cloud-off')) : null,
    );
    return h('div', { class: 'imgtile' + (isOn && isOn(e) ? ' on' : '') }, pic, h('div', { class: 'imgtile-name', textContent: e.stem }));
  };
  const folderBlock = (folder, entries, local) =>
    h(
      'details',
      { class: 'assetfolder', open: true },
      h(
        'summary',
        {},
        h('span', { textContent: local ? t('Dans ce document') : folder || t('Racine') }),
        h('em', { textContent: String(entries.length) }),
      ),
      h('div', { class: 'imggrid' }, entries.map(tile)),
    );
  const blocksFor = (kind) => {
    const folders = [...byFolder(assets, kind)].sort(([a], [b]) => a.localeCompare(b));
    const local = localEntries(doc, kind);
    return [...folders.map(([f, es]) => folderBlock(f, es)), local.length ? folderBlock('', local, true) : null];
  };
  if (kinds.length === 1) return h('div', { class: 'assetbrowser' }, blocksFor(kinds[0]));
  return h(
    'div',
    { class: 'assetbrowser' },
    kinds.map((kind) => {
      const n = assets.filter((e) => e.kind === kind).length + localEntries(doc, kind).length;
      return h(
        'details',
        { class: 'assetkind', open: true },
        h('summary', {}, ico(KIND_ICON[kind]), h('span', { textContent: t(KIND_LABEL[kind]) }), h('em', { textContent: String(n) })),
        h('div', { class: 'body' }, n ? blocksFor(kind) : h('p', { class: 'hint', textContent: t('Aucune image') })),
      );
    }),
  );
}

/** Fenêtre « Parcourir » : `build(fermer)` donne le contenu (le navigateur d'images, en plus grand) */
export function assetDialog(title, build) {
  const dlg = h('dialog', { class: 'modal assets-dlg' });
  dlg.append(
    h(
      'div',
      { class: 'assets-dlg-head' },
      h('strong', { textContent: title }),
      h('button', { type: 'button', class: 'mini', title: t('Fermer'), 'aria-label': t('Fermer'), onclick: () => dlg.close() }, ico('x')),
    ),
    h(
      'div',
      { class: 'assets-dlg-body' },
      build(() => dlg.close()),
    ),
  );
  dlg.addEventListener('close', () => dlg.remove());
  document.body.append(dlg);
  dlg.showModal();
}
