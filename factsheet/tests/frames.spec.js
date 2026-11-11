const { test, expect } = require('@playwright/test');
const { openApp, watchErrors } = require('./helpers');
test('cadres : épaisseur et coins réglables dans le panneau, appliqués à la section', async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page, 'default');
  await page.locator('.sec-title').first().click();
  const card = page.locator('.pp-card-h', { hasText: /Frame and outline|Background and outline|Fond et contour/ }).first();
  await card.click();
  const sw = page.locator('.panel .f', { hasText: 'Frame corners' });
  await expect(sw).toBeVisible();
  const outline = page
    .locator('.panel .pp-switchrow', { hasText: /^Outline/ })
    .locator('button[role=switch]')
    .first();
  if ((await outline.getAttribute('aria-checked')) !== 'true') await outline.click();
  const th = page.locator('.panel .f', { hasText: 'Outline thickness' });
  await expect(th).toBeVisible();
  await th.locator('button', { hasText: '1,5 pt' }).click();
  await page.locator('.panel .f', { hasText: 'Frame corners' }).locator('button', { hasText: 'Square' }).click();
  const box = await page
    .locator('.sec-box')
    .first()
    .evaluate((n) => [n.style.getPropertyValue('--bw'), n.style.getPropertyValue('--rad')]);
  expect(box[1]).toBe('0px');
  expect(parseFloat(box[0])).toBeCloseTo(2, 1);
  expect(errors).toEqual([]);
});
