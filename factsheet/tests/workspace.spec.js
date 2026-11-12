const { test, expect } = require('@playwright/test');
const { openApp, watchErrors, settle, DOC_KEY } = require('./helpers');

/* Espace de travail (editor/workspace.js) : onglets isolés, brouillons IndexedDB restaurés au rechargement, migration de
   l'ancienne clé `factsheet-creator-v1`, confirmation à la fermeture d'un onglet modifié, fichiers récents, repli sans IndexedDB. */

const tabs = (page) => page.locator('#fsTabs .fs-tab');
const names = (page) => page.locator('#fsTabs .fs-tab-name').allTextContents();
const activeName = (page) => page.locator('#fsTabs .fs-tab.on .fs-tab-name').textContent();
const docOfActive = (page) => page.evaluate((key) => JSON.parse(localStorage.getItem(key)), DOC_KEY);
/** renomme le document actif (champ du nom au centre de l'en-tête) : une modification ordinaire, passée par ctx.changed() */
async function rename(page, name) {
  const input = page.locator('.app-header input.fs-name');
  await input.fill(name);
  await input.blur();
}
/** Largeur de la première page de l'aperçu, lue en un seul appel (jamais sur un élément retiré par un nouveau rendu) */
const pageWidth = (page) => page.evaluate(() => (document.querySelector('#stage .pwrap') || {}).offsetWidth || 0);
/** contenu de la base IndexedDB de l'espace de travail */
const readDb = (page) =>
  page.evaluate(
    () =>
      new Promise((res, rej) => {
        const r = indexedDB.open('factsheet-creator');
        r.onerror = () => rej(r.error);
        r.onsuccess = () => {
          const db = r.result,
            tx = db.transaction(['meta', 'tabs', 'recents']);
          const out = {};
          tx.objectStore('meta').get('workspace').onsuccess = (e) => (out.meta = e.target.result);
          tx.objectStore('tabs').getAll().onsuccess = (e) => (out.tabs = e.target.result);
          tx.objectStore('recents').getAll().onsuccess = (e) => (out.recents = e.target.result);
          tx.oncomplete = () => {
            db.close();
            res(out);
          };
        };
      }),
  );
/** attend que le brouillon soit écrit (anti-rebond de 300 ms) */
const drafted = (page, fn) => expect.poll(async () => fn(await readDb(page)), { timeout: 5000 });

test('migration de l’ancienne clé : le document devient le premier onglet, sans perte', async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page, 'chars');
  const before = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), DOC_KEY);
  await expect(tabs(page)).toHaveCount(1);
  await drafted(page, (db) => db.tabs && db.tabs.length).toBe(1);
  const db = await readDb(page);
  expect(db.meta.schemaVersion).toBe(1);
  expect(db.meta.active).toBe(db.tabs[0].id);
  // même contenu (la migration n'ajoute que l'identifiant de fichier) et la clé reste en place (miroir du document actif)
  const { fileId, ...stored } = db.tabs[0].doc;
  expect(typeof fileId).toBe('string');
  expect(stored.sections).toEqual(before.sections);
  expect(stored.header).toEqual(before.header);
  expect((await docOfActive(page)).fileId).toBe(fileId);
  await expect(page.locator('#fsTabs .fs-ws-status')).toContainText('Draft saved');
  expect(errors).toEqual([]);
});

test('deux onglets isolés : document, historique, sélection et zoom propres à chaque onglet', async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page, 'default');
  const nSecs = (await docOfActive(page)).sections.length;
  await page.locator('#tree .tn').nth(1).click(); // une sélection dans le premier onglet
  const sel1 = await page.locator('#tree .tn.sel').getAttribute('data-path');
  await page.locator('#fsTabs .fs-tab-add').click();
  await expect(tabs(page)).toHaveCount(2);
  await expect(page.locator('#tree .tn.sel')).toHaveCount(0);
  await rename(page, 'Second');
  expect(await activeName(page)).toBe('Second');
  await settle(page); // le renommage redessine l'aperçu à l'image suivante : mesurer avant ferait lire une page déjà retirée (largeur 0)
  const fitW = await pageWidth(page);
  expect(fitW).toBeGreaterThan(0);
  await page.locator('.menu-btn', { hasText: 'View' }).click();
  await page.locator('.menu-pop:not([hidden]) .menu-item', { hasText: '200 %' }).click();
  await expect.poll(() => pageWidth(page)).toBeGreaterThan(fitW);
  expect((await docOfActive(page)).sections.length).toBe(1); // factsheet vierge
  await expect(page.locator('.fs-hbtn[aria-label="Undo"]')).toBeEnabled();
  // retour au premier onglet : rien n'a bougé, et son historique ne contient pas le renommage
  await tabs(page).first().locator('.fs-tab-btn').click();
  await settle(page);
  expect(await names(page)).toEqual(['factsheet', 'Second']);
  const d1 = await docOfActive(page);
  expect(d1.name).toBe('factsheet');
  expect(d1.sections.length).toBe(nSecs);
  await expect(page.locator('.fs-hbtn[aria-label="Undo"]')).toBeDisabled();
  await expect(page.locator('#tree .tn.sel')).toHaveAttribute('data-path', sel1);
  await expect(page.locator('#stage .page:not(.ovf-clone)')).toHaveCount(2);
  await expect.poll(() => pageWidth(page)).toBe(fitW); // zoom « Ajuster » de cet onglet
  // annuler dans le premier onglet n'agit pas sur le second
  await page.keyboard.press('Control+z');
  await tabs(page).nth(1).locator('.fs-tab-btn').click();
  expect((await docOfActive(page)).name).toBe('Second');
  expect(errors).toEqual([]);
});

test('restauration après rechargement : onglets, onglet actif, indicateur « modifié »', async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page, 'default');
  await page.keyboard.press('Alt+n');
  await expect(tabs(page)).toHaveCount(2);
  await rename(page, 'Brouillon B');
  await expect(tabs(page).nth(1).locator('.fs-tab-dot')).toHaveCount(1);
  await drafted(page, (db) => db.tabs.map((x) => x.doc.name).sort()).toEqual(['Brouillon B', 'factsheet']);
  await page.reload();
  await page.waitForSelector('#stage .page');
  await expect(tabs(page)).toHaveCount(2);
  expect(await names(page)).toEqual(['factsheet', 'Brouillon B']);
  expect(await activeName(page)).toBe('Brouillon B');
  await expect(tabs(page).nth(1).locator('.fs-tab-dot')).toHaveCount(1);
  await expect(tabs(page).nth(0).locator('.fs-tab-dot')).toHaveCount(0);
  await expect(page.locator('#fsTabs .fs-ws-status')).toContainText('Modified since last export');
  expect(errors).toEqual([]);
});

test('fermer un onglet modifié demande confirmation ; un onglet non modifié se ferme tout de suite', async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page, 'default');
  await page.locator('#fsTabs .fs-tab-add').click();
  await rename(page, 'À fermer');
  await page.locator('#fsTabs .fs-tab.on .fs-tab-x').click();
  const dlg = page.locator('dialog[open]');
  await expect(dlg).toContainText('modified since the last export');
  await dlg.getByRole('button', { name: 'Cancel' }).click();
  await expect(tabs(page)).toHaveCount(2);
  await page.locator('#fsTabs .fs-tab.on .fs-tab-x').click();
  await page.locator('dialog[open] button.primary').click();
  await expect(tabs(page)).toHaveCount(1);
  expect(await activeName(page)).toBe('factsheet');
  await drafted(page, (db) => db.tabs.length).toBe(1);
  // non modifié : pas de question
  await page.keyboard.press('Alt+n');
  await expect(tabs(page)).toHaveCount(2);
  await page.keyboard.press('Alt+w');
  await expect(page.locator('dialog[open]')).toHaveCount(0);
  await expect(tabs(page)).toHaveCount(1);
  // le dernier onglet fermé laisse une factsheet vierge
  await page.keyboard.press('Alt+w');
  await expect(tabs(page)).toHaveCount(1);
  expect((await docOfActive(page)).sections.length).toBe(1);
  expect(errors).toEqual([]);
});

test('enregistrer (.json) : indicateur remis à zéro, fichier récent, réouverture sur le même onglet', async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page, 'default');
  await rename(page, 'Rapport');
  await expect(tabs(page).first().locator('.fs-tab-dot')).toHaveCount(1);
  await page.locator('.menu-btn', { hasText: 'File' }).click();
  const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('.menu-item', { hasText: 'Save (.json)' }).click()]);
  expect(dl.suggestedFilename()).toMatch(/^Rapport_\d{6}_\d{4}\.json$/);
  const saved = await (await dl.createReadStream()).toArray();
  await expect(tabs(page).first().locator('.fs-tab-dot')).toHaveCount(0);
  await drafted(page, (db) => db.recents.map((r) => r.name)).toEqual(['Rapport']);
  // le menu liste la copie locale
  await page.locator('.menu-btn', { hasText: 'File' }).click();
  await expect(page.locator('.menu-pop:not([hidden])')).toContainText('Open recent (local copy)');
  await expect(page.locator('.menu-pop:not([hidden]) .menu-item', { hasText: 'Rapport' })).toHaveCount(1);
  await page.keyboard.press('Escape');
  // rouvrir le fichier enregistré depuis un autre onglet : on revient sur son onglet
  await page.keyboard.press('Alt+n');
  await expect(tabs(page)).toHaveCount(2);
  await page.locator('input[type=file][accept^=".json"]').setInputFiles({
    name: dl.suggestedFilename(),
    mimeType: 'application/json',
    buffer: Buffer.concat(saved),
  });
  await expect(tabs(page)).toHaveCount(2);
  await expect.poll(() => activeName(page)).toBe('Rapport');
  // fichier récent ouvert depuis le menu : même onglet aussi
  await tabs(page).nth(1).locator('.fs-tab-btn').click();
  await page.locator('.menu-btn', { hasText: 'File' }).click();
  await page.locator('.menu-pop:not([hidden]) .menu-item', { hasText: 'Rapport' }).click();
  await expect.poll(() => activeName(page)).toBe('Rapport');
  await expect(tabs(page)).toHaveCount(2);
  // vider la liste
  await page.locator('.menu-btn', { hasText: 'File' }).click();
  await page.locator('.menu-pop:not([hidden]) .menu-item', { hasText: 'Clear the list' }).click();
  await drafted(page, (db) => db.recents.length).toBe(0);
  expect(errors).toEqual([]);
});

test('ancienne clé modifiée hors de l’éditeur : l’onglet actif l’adopte au lancement', async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page, 'default');
  await page.keyboard.press('Alt+n');
  await rename(page, 'Actif');
  await drafted(page, (db) => db.tabs.length).toBe(2);
  await page.evaluate((key) => {
    const d = JSON.parse(localStorage.getItem(key));
    d.name = 'Changé par l’Atelier';
    localStorage.setItem(key, JSON.stringify(d));
  }, DOC_KEY);
  await page.reload();
  await page.waitForSelector('#stage .page');
  expect(await names(page)).toEqual(['factsheet', 'Changé par l’Atelier']);
  expect(errors).toEqual([]);
});

test('sans IndexedDB : un onglet, enregistré dans le localStorage comme avant', async ({ page }) => {
  const errors = watchErrors(page);
  await page.addInitScript(() => {
    IDBFactory.prototype.open = () => {
      throw new DOMException('refusé', 'SecurityError');
    };
  });
  await openApp(page, 'default');
  await expect(tabs(page)).toHaveCount(1);
  await expect(page.locator('#fsTabs .fs-ws-status')).toContainText('IndexedDB unavailable');
  await rename(page, 'Sans base');
  expect((await docOfActive(page)).name).toBe('Sans base');
  await page.reload();
  await page.waitForSelector('#stage .page');
  expect(await activeName(page)).toBe('Sans base');
  expect(errors).toEqual([]);
});
