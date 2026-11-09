const { test, expect } = require('@playwright/test');
const { openApp, watchErrors } = require('./helpers');

const DOCS = ['default', 'chars', 'dataviz-1', 'dataviz-2', 'dataviz-3'];

/* Capture de chaque page de l'aperçu, comparée à la référence (tests/references/). */
for (const name of DOCS) {
  test(`aperçu — ${name}`, async ({ page }) => {
    const errors = watchErrors(page);
    await openApp(page, name);
    const pages = page.locator('#stage .page:not(.ovf-clone)');
    const n = await pages.count();
    expect(n).toBe(2);
    expect(await page.locator('#stage .viz-ph').count(), 'une dataviz n’a pas pu être dessinée').toBe(0);
    for (let i = 0; i < n; i++) {
      const key = await pages.nth(i).getAttribute('data-page');
      await expect(pages.nth(i)).toHaveScreenshot(`${name}-${key}.png`);
    }
    expect(errors).toEqual([]);
  });
}
