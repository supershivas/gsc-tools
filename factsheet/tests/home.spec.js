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
