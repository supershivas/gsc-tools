/* Bloc de texte : interlignage et interlettrage réglables dans la carte « Police et taille » (adv.lh, adv.ls, partagés avec le burger). */
const { test, expect } = require('@playwright/test');
const { openApp, watchErrors } = require('./helpers');

test('bloc de texte : interlignage (pt) et interlettrage (‰) depuis la carte Police et taille', async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page, 'default');
  const row = page.locator('#tree .col-row', { hasText: /^Lorem ipsum/ }).first();
  await row.click();
  const card = page.locator('#props .pp-card', { has: page.locator('label[for=colTextLh]') });
  if (!(await page.locator('#colTextLh').isVisible()))
    await page
      .locator('#props .pp-card', { hasText: /Font and size/ })
      .locator('.pp-card-h')
      .click();
  /* Auto → 18 pt */
  await page.locator('#props .pp-auto [role=switch]').first().click();
  const lhIn = page.locator('#colTextLh');
  await lhIn.fill('18');
  await page.locator('#colTextLs').fill('50');
  const st = () =>
    page.evaluate(() => {
      const p = [...document.querySelectorAll('#stage .page:not(.ovf-clone) .rich p')].find((n) => n.style.lineHeight);
      return p ? `${getComputedStyle(p).lineHeight} ${p.style.letterSpacing}` : '';
    });
  await expect.poll(st).toBe('24px 0.05em'); // 18 pt, 50 ‰ (aperçu redessiné après la saisie)
  await expect(card).toHaveCount(1);
  expect(errors).toEqual([]);
});
