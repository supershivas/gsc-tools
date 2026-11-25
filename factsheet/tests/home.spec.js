const { test, expect } = require('@playwright/test');
const { openApp, watchErrors } = require('./helpers');

/* Écran d'accueil : les projets de ce navigateur en grille, un clic pour ouvrir ; nouveau projet nommé AAMMJJ_factsheet. */

const today = () => {
  const d = new Date(),
    p = (n) => String(n).padStart(2, '0');
  return String(d.getFullYear()).slice(2) + p(d.getMonth() + 1) + p(d.getDate()) + '_factsheet';
};

test('accueil : grille des projets, ouverture, nouveau projet daté', async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page, 'default');
  await expect(page.locator('.fs-home')).toHaveCount(0); // les tests le désactivent (helpers.js)

  // un deuxième onglet, nommé
  await page.locator('.fs-tab-add').click();
  await expect(page.locator('.fs-tab')).toHaveCount(2);
  await expect(page.locator('.fs-tab.on .fs-tab-name')).toHaveText(today());
  await page.waitForTimeout(500); // brouillons écrits (anti-rebond)

  // au lancement : l'accueil, avec les deux projets ouverts et leurs vignettes
  await page.evaluate(() => localStorage.setItem('factsheet-creator-home', '1'));
  await page.reload();
  const home = page.locator('.fs-home');
  await expect(home).toBeVisible();
  const cards = home.locator('.fh-grid').first().locator('.fh-card');
  await expect(cards).toHaveCount(2);
  await expect(cards.nth(0).locator('.fh-thumb .page')).toHaveCount(1);
  await expect(cards.nth(1)).toContainText(today());
  await expect(page.locator('.app')).toHaveJSProperty('inert', true);

  // ouvrir le premier projet : l'accueil se ferme sur son onglet
  await cards.nth(0).click();
  await expect(home).toHaveCount(0);
  await expect(page.locator('.fs-tab').nth(0)).toHaveClass(/on/);
  await expect(page.locator('.app')).toHaveJSProperty('inert', false);

  // icône maison : l'accueil revient ; Échap le referme
  await page.locator('.fs-tab-home').click();
  await expect(home).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(home).toHaveCount(0);

  // nouvelle factsheet depuis l'accueil
  await page.locator('.fs-tab-home').click();
  await home.locator('.fh-acts button.primary').click();
  await expect(home).toHaveCount(0);
  await expect(page.locator('.fs-tab')).toHaveCount(3);

  // case « Afficher l'accueil au lancement »
  await page.locator('.fs-tab-home').click();
  await home.locator('.fh-pref input').uncheck();
  await page.reload();
  await page.waitForSelector('#stage .page');
  await expect(page.locator('.fs-home')).toHaveCount(0);

  expect(errors).toEqual([]);
});

test('dernier onglet fermé : retour à l’accueil', async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page, 'default');
  await page.locator('.fs-tab-x').click();
  await expect(page.locator('.fs-home')).toBeVisible();
  await expect(page.locator('.fs-home .fh-grid').first().locator('.fh-card')).toHaveCount(1); // une factsheet vierge remplace l'onglet fermé
  expect(errors).toEqual([]);
});

test('enregistrer dans le navigateur : copie gardée, indicateur remis à zéro, visible sur l’accueil, supprimable', async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page, 'default');
  await page.locator('#tree .col-row').first().click();
  await page.keyboard.press('Delete');
  await expect(page.locator('.fs-tab.on .fs-tab-dot')).toHaveCount(1); // modifié
  await page.keyboard.press('Control+s');
  await expect(page.locator('.fs-tab.on .fs-tab-dot')).toHaveCount(0);
  await expect(page.locator('.fs-toast, .toast').first()).toContainText('Saved in this browser');

  // onglet fermé sans confirmation (rien à perdre) : la copie est sur l'accueil, section « Enregistrés »
  await page.locator('.fs-tab-x').click();
  const home = page.locator('.fs-home');
  await expect(home).toBeVisible();
  await expect(home.locator('h2', { hasText: 'Saved in this browser' })).toHaveCount(1);
  const cell = home.locator('.fh-cell', { hasText: 'factsheet' });
  await expect(cell).toHaveCount(1);
  // supprimer la copie
  await cell.hover();
  await cell.locator('.fh-del').click();
  await page.locator('dialog.modal[open]').getByRole('button', { name: 'Delete' }).click();
  await expect(home.locator('.fh-cell')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('export PDF : préréglages impression et écran', async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page, 'default');
  await page.locator('.menu-btn', { hasText: 'File' }).click();
  await page.locator('.menu-pop:not([hidden]) .menu-item', { hasText: 'Export PDF for screen' }).click();
  const dlg = page.locator('#exportDlg');
  await expect(dlg).toBeVisible();
  await expect(dlg.locator('#exportCustom')).toBeHidden();
  await expect(dlg.locator('#exportFormat')).toBeHidden();
  await expect(dlg.locator('label.opt', { hasText: 'Screen — RGB, 72 dpi' }).locator('input')).toBeChecked();
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.locator('#exportGo').click()]);
  expect(dl.suggestedFilename()).toMatch(/^factsheet-rgb-72dpi_\d{6}_\d{4}\.pdf$/);

  await page.keyboard.press('Control+p'); // garde le dernier usage
  await expect(dlg.locator('label.opt', { hasText: 'Screen — RGB, 72 dpi' }).locator('input')).toBeChecked();
  await dlg.locator('label.opt', { hasText: 'Print — CMYK, 300 dpi, FOGRA39' }).locator('input').check();
  await expect(dlg.locator('#exportFormat')).toBeVisible();
  await expect(dlg.locator('#exportCustom')).toBeHidden();
  const [dl2] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.locator('#exportGo').click()]);
  expect(dl2.suggestedFilename()).toMatch(/^factsheet-x4_\d{6}_\d{4}\.pdf$/);

  await page.keyboard.press('Control+p');
  await dlg.locator('label.opt', { hasText: 'Custom' }).first().locator('input').check();
  await expect(dlg.locator('#exportCustom')).toBeVisible();
  await page.locator('#exportCancel').click();
  expect(errors).toEqual([]);
});

test('PDF à 72 dpi plus léger qu’à 300 dpi (images)', async ({ page }) => {
  await openApp(page, 'default');
  await page.addScriptTag({ url: '/factsheet/pdfexport.js' });
  const [a, b] = await page.evaluate(async () => {
    const doc = JSON.parse(localStorage.getItem('factsheet-creator-v1'));
    const hi = await window.FSPDF.build(doc, 'net', { profile: 'rgb', dpi: 300 });
    const lo = await window.FSPDF.build(doc, 'net', { profile: 'rgb', dpi: 72 });
    return [hi.bytes.length, lo.bytes.length];
  });
  expect(b).toBeLessThan(a);
});

test('accueil : aperçu de la dernière dataviz', async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page, 'default');
  await page.locator('.menu-btn', { hasText: 'File' }).click();
  await page.locator('.menu-pop:not([hidden]) .menu-item', { hasText: 'New dataviz…' }).click();
  await page.locator('.ve-close').click();
  await page.locator('.fs-tab-home').click();
  const card = page.locator('.fs-home .fh-card', { hasText: 'Last dataviz' });
  await expect(card.locator('.fh-viz svg').first()).toBeVisible();
  await card.click();
  await expect(page.locator('.ve-bar')).toBeVisible();
  expect(errors).toEqual([]);
});
