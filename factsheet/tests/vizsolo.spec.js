const fs = require('fs');
const { test, expect } = require('@playwright/test');
const { openApp, watchErrors, DOC_KEY } = require('./helpers');

/* Dataviz seule (menu Fichier) : éditeur sans colonne, enregistrée dans le navigateur, export à une largeur libre au millième. */

const SOLO_KEY = 'factsheet-creator-dataviz-v1';

async function menu(page, label) {
  await page.locator('.menu-btn', { hasText: 'File' }).click();
  await page.locator('.menu-pop:not([hidden]) .menu-item', { hasText: label }).click();
}
async function exportDl(page) {
  const dlg = page.locator('dialog.vexp');
  const [dl] = await Promise.all([page.waitForEvent('download'), dlg.locator('button.primary').click()]);
  await expect(dlg).toHaveCount(0);
  const path = test.info().outputPath(dl.suggestedFilename());
  await dl.saveAs(path);
  return { name: dl.suggestedFilename(), bytes: fs.readFileSync(path) };
}

test('dataviz seule : ouverture, enregistrement, largeur libre et export à la taille exacte', async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page, 'default');
  const before = await page.evaluate((k) => localStorage.getItem(k), DOC_KEY);

  await menu(page, 'New dataviz…');
  await expect(page.locator('.ve-bar')).toBeVisible();
  await expect(page.locator('.ve-bar')).not.toContainText('Cancel'); // tout est gardé : pas d'« Annuler »
  await expect(page.locator('.ve-exp')).toHaveClass(/primary/);

  // largeur libre de l'aperçu, au millième
  await page.locator('.ve-tab[data-tab=viz]').click();
  const wNum = page.locator('.ve-wnum');
  await wNum.fill('237.913');
  await wNum.press('Enter');
  await expect(page.locator('.ve-stage .col-viz')).toHaveAttribute('style', /width: 237\.913px/);
  const saved = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), SOLO_KEY);
  expect(saved.schemaVersion).toBe(1);
  expect(saved.width).toBe(237.913);
  expect(saved.viz.kind).toBe('bars');

  // SVG à la largeur exacte
  await page.locator('.ve-exp').click();
  const dlg = page.locator('dialog.vexp');
  await expect(dlg.locator('.vexp-w')).toHaveValue('237.913');
  await dlg.locator('label.opt', { hasText: 'Vector SVG' }).locator('input').check();
  await expect(dlg.locator('.tip')).toContainText('237,913 ×');
  const svg = await exportDl(page);
  expect(svg.name).toMatch(/^dataviz-bars_\d{6}_\d{4}\.svg$/);
  expect(svg.bytes.toString('utf8')).toMatch(/<svg[^>]* width="237\.913"/);

  // SVG en mm : la taille du fichier est écrite dans l'unité
  await page.locator('.ve-exp').click();
  await dlg.locator('select[aria-label="Unit"]').selectOption('mm');
  await dlg.locator('.vexp-w').fill('80');
  const mm = await exportDl(page);
  expect(mm.bytes.toString('utf8')).toMatch(/<svg[^>]* width="80mm"/);

  // PNG à 96 dpi sans marge : exactement la largeur choisie en pixels
  await page.locator('.ve-exp').click();
  await dlg.locator('select[aria-label="Unit"]').selectOption('px');
  await dlg.locator('.vexp-w').fill('300');
  await dlg.locator('label.opt', { hasText: 'Transparent PNG' }).locator('input').check();
  await dlg.locator('label.opt', { hasText: '96 dpi' }).locator('input').check();
  await dlg.locator('label.opt', { hasText: '4 px margin' }).locator('input').uncheck();
  const png = await exportDl(page);
  expect(png.bytes.readUInt32BE(16)).toBe(300);

  // résolution libre (la largeur repart de celle de l'aperçu)
  await page.locator('.ve-exp').click();
  await dlg.locator('.vexp-dpi').fill('192');
  const png2 = await exportDl(page);
  expect(png2.bytes.readUInt32BE(16)).toBe(476); // largeur de l'aperçu (237,913 px) × 2

  // Fermer garde la dataviz, sans toucher au document
  await page.locator('.ve-close').click();
  await expect(page.locator('.ve')).toHaveCount(0);
  expect(await page.evaluate((k) => localStorage.getItem(k), DOC_KEY)).toBe(before);
  await menu(page, 'Reopen the last dataviz');
  await expect(wNum).toHaveValue('237.913');
  await page.keyboard.press('Escape');
  await expect(page.locator('.ve')).toHaveCount(0);

  expect(errors).toEqual([]);
});
