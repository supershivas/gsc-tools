const { test, expect } = require('@playwright/test');
const { openApp, watchErrors } = require('./helpers');

/* Grille de données des dataviz (vizdata.js, gridEditor) : sélection de lignes, de colonnes ou d'un bloc, copiée en texte tabulé */

async function openData(page) {
  await page
    .locator('#tree .col-row', { hasText: /Dataviz/ })
    .first()
    .click();
  const open = page.locator('#props button.primary').first();
  if (!(await open.count())) await page.locator('#props .pp-chev').first().click();
  await open.click();
  await page.locator('.ve-tab[data-tab=data]').click();
}
const copied = (page) => page.evaluate(() => navigator.clipboard.readText());

test('copier des lignes, des colonnes (avec en-têtes), un bloc, tout le tableau', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const errors = watchErrors(page);
  await openApp(page, 'default');
  await openData(page);
  const grid = page.locator('.ve-data table.dg');
  const cell = (i, j) => grid.locator(`td[data-ri="${i}"][data-cj="${j}"]`).locator('input, textarea').first();
  const val = (i, j) => cell(i, j).inputValue();

  // lignes 1 et 2 (Maj + clic) : toutes les colonnes
  await grid.locator('[data-selrow="0"]').click();
  await grid.locator('[data-selrow="1"]').click({ modifiers: ['Shift'] });
  await expect(grid.locator('td.dg-sel').first()).toBeVisible();
  const copyBtn = page.locator('.dg-tools button', { hasText: 'Copy the selection' });
  await expect(copyBtn).toContainText('(2 ×');
  await copyBtn.click();
  const rows = (await copied(page)).split('\n');
  expect(rows).toHaveLength(2);
  expect(rows[0].split('\t')[0]).toBe(await val(0, 0));

  // colonne 2 (Cmd/Ctrl + C) : en-tête puis valeurs
  await grid.locator('[data-selcol="1"]').click();
  await grid.locator('[data-selcol="1"]').focus();
  await page.keyboard.press('ControlOrMeta+c');
  const col = (await copied(page)).split('\n');
  expect(col[1]).toBe(await val(0, 1));
  expect(col.length).toBe((await grid.locator('tbody tr').count()) + 1);

  // bloc : Maj + clic d'une cellule à l'autre
  await cell(0, 0).click();
  await cell(1, 1).click({ modifiers: ['Shift'] });
  await expect(grid.locator('td.dg-sel')).toHaveCount(4);
  await copyBtn.click();
  expect(await copied(page)).toBe(`${await val(0, 0)}\t${await val(0, 1)}\n${await val(1, 0)}\t${await val(1, 1)}`);

  // un clic simple retire la sélection
  await cell(0, 0).click();
  await expect(grid.locator('td.dg-sel')).toHaveCount(0);
  await expect(copyBtn).toBeHidden();

  // tout le tableau
  await page.locator('.dg-tools button', { hasText: 'Copy the table' }).click();
  expect((await copied(page)).split('\n').length).toBe((await grid.locator('tbody tr').count()) + 1);
  expect(errors).toEqual([]);
});
