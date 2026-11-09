const { test, expect } = require('@playwright/test');
const { stubExternal, watchErrors, seed } = require('./helpers');

/* Aucune erreur de console ni exception au chargement des trois pages du Factsheet creator
   (réseau externe coupé : polices Google et icônes Tabler ne comptent pas). */
for (const file of ['index.html', 'labo.html', 'atelier.html']) {
  test(`aucune erreur de console — ${file}`, async ({ page }) => {
    const errors = watchErrors(page);
    await stubExternal(page);
    await seed(page, 'default');
    await page.goto(`/factsheet/${file}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);
    expect(await page.locator('body').innerText()).not.toBe('');
    expect(errors).toEqual([]);
  });
}
