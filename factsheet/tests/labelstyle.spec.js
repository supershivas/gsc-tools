const { test, expect } = require('@playwright/test');
const { openApp, watchErrors } = require('./helpers');
async function openViz(page, type) {
  await page
    .locator('#tree .col-row', { hasText: /Dataviz/ })
    .first()
    .click();
  const open = page.locator('#props button.primary').first();
  if (!(await open.count())) await page.locator('#props .pp-chev').first().click();
  await open.click();
  await page.locator('.ve-tab[data-tab=viz]').click();
  await page.locator('.ve-typecard .pp-card-h').click();
  await page.locator('.ve-typeopt', { hasText: type }).first().click();
}
/* Style des libellés : barre de mise en forme au-dessus du libellé cliqué dans l'aperçu (vizeditor.js, viz/labelstyle.js) */
test('barre de mise en forme d’un libellé : gras, taille, couleur, Échap', async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page, 'default');
  for (const [type, name] of [
    [/^Bars \(/, 'v'],
    [/^Horizontal bars/, 'h'],
    [/^Line/, 'l'],
    [/^Treemap/, 'tm'],
  ]) {
    if (name !== 'v') {
      await page.locator('.ve-typecard .pp-card-h').click();
      await page.locator('.ve-typeopt', { hasText: type }).first().click();
    } else await openViz(page, type);
    const lab = page.locator('.ve-stage [data-text="rows.1"]').first();
    if (await lab.count()) {
      const bb = await lab.boundingBox();
      await page.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2);
      await expect(page.locator('.vt-bar')).toBeVisible();
      const bold = page.locator('.vt-bar button[aria-label="Bold"]');
      if ((await bold.getAttribute('aria-pressed')) !== 'true') await bold.click(); // le style suit le libellé d'un type à l'autre
      await page.locator('.vt-bar button[aria-label="Increase size"]').click();
      await page.locator('.vt-bar button[aria-label="Increase size"]').click();
      await page.locator('.vt-bar .vt-color').click();
      await page.locator('.cpop .cpop-sw').nth(1).click();
      await expect(page.locator('.vt-bar')).toBeVisible();
      await expect(page.locator('.ve-stage [data-text="rows.1"] tspan[font-weight="700"][fill]').first()).toBeVisible();
      await expect(page.locator('.vt-size')).toHaveValue(/\d/);
    }
  }
  await page.keyboard.press('Escape');
  await expect(page.locator('.vt-bar')).toBeHidden();
  expect(errors).toEqual([]);
});
/* Tous les onglets fermés : accueil sans bouton fermer, gardé au rechargement (editor/workspace.js, onglet fantôme) */
test('tout fermer : l’accueil reste, aucun onglet, même après rechargement', async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page, 'default');
  await page
    .locator('.fs-tab button[aria-label]')
    .filter({ has: page.locator('.ti-x') })
    .first()
    .click()
    .catch(() => {});
  const dlg = page.locator('dialog[open] button.danger');
  if (await dlg.count()) await dlg.click();
  await expect(page.locator('.fs-home')).toBeVisible();
  await expect(page.locator('.fs-tab')).toHaveCount(0);
  await expect(page.locator('.fh-close')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.locator('.fs-home')).toBeVisible();
  await page.reload();
  await page.waitForTimeout(1500);
  await expect(page.locator('.fs-home')).toBeVisible();
  await expect(page.locator('.fs-tab')).toHaveCount(0);
  await page.locator('.fs-home button.primary').click();
  await expect(page.locator('.fs-home')).toBeHidden();
  await expect(page.locator('.fs-tab')).toHaveCount(1);
  expect(errors).toEqual([]);
});
