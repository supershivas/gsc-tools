const { test, expect } = require('@playwright/test');
const { openApp, watchErrors } = require('./helpers');

/* Panneau de l'éditeur de dataviz (onglet Visualisation) : le panneau dit la vérité, Échap ne fait pas perdre le travail,
   le clavier reste dans l'éditeur. Audit : docs/audit-sidebar-dataviz.md (lot 1). */

async function openEditor(page) {
  await page.locator('#tree .col-row', { hasText: /Dataviz/ }).first().click();
  const open = page.locator('#props button.primary').first();
  if (!(await open.count())) {
    const chev = page.locator('#props .pp-chev').first();
    if ((await chev.getAttribute('aria-expanded')) === 'false') await chev.click();
  }
  await open.click();
  await expect(page.locator('.ve-bar')).toBeVisible();
  await page.locator('.ve-tab[data-tab=viz]').click();
}
async function pickType(page, label) {
  await page.locator('.ve-typecard .pp-card-h').click();
  await page.locator('.ve-typeopt', { hasText: label }).first().click();
}
/** libellé (traduit) → valeur affichée, pour toutes les listes du panneau (cartes toutes ouvertes par la recherche) */
async function shownSelects(page) {
  await page.locator('.ve-form .pp-q').fill(' ');
  const out = await page.$$eval('.ve-form select', (n) =>
    Object.fromEntries(n.map((s) => [s.closest('.f').querySelector('label').textContent, s.options[s.selectedIndex].text])),
  );
  await page.locator('.ve-form .pp-q').fill('');
  return out;
}

test.describe('sidebar de l’éditeur de dataviz', () => {
  let errors;
  test.beforeEach(async ({ page }) => {
    errors = watchErrors(page);
    await openApp(page, 'default');
    await openEditor(page);
  });
  test.afterEach(() => expect(errors).toEqual([]));

  test('les listes affichent la valeur que le dessin applique', async ({ page }) => {
    await pickType(page, /^Bars \(/);
    const bars = await shownSelects(page);
    expect(bars['Bar thickness']).toBe('Normal');
    expect(bars['Space between bar groups']).toBe('Normal');
    expect(bars['Space between bars of the same group']).toBe('Normal');
    await pickType(page, /^Horizontal bars/);
    const hb = await shownSelects(page);
    expect(hb['Bar thickness']).toBe('Normal');
    expect(hb['Space between rows']).toBe('Normal');
    expect(hb['Space between bars of the same row']).toBe('Normal');
    await pickType(page, /^Donut/);
    expect((await shownSelects(page))['Text line spacing']).toBe('Normal (18 px)');
  });

  test('un clic sur le libellé met le focus dans le champ', async ({ page }) => {
    await pickType(page, /^Bars \(/);
    await page.locator('.ve-form .pp-q').fill(' ');
    await page.locator('.ve-form .f label', { hasText: 'Value decimals' }).click();
    expect(await page.evaluate(() => document.activeElement.tagName)).toBe('INPUT');
  });

  test('Échap : vide la recherche, confirme avant d’abandonner, ne ferme pas une modale par erreur', async ({ page }) => {
    await pickType(page, /^Bars \(/); // une modification
    const q = page.locator('.ve-form .pp-q');
    await q.fill('legend');
    await q.press('Escape');
    await expect(q).toHaveValue('');
    await expect(page.locator('.ve-bar')).toBeVisible();
    await page.locator('.ve-form .pp-chev').first().focus();
    await page.keyboard.press('Escape');
    await expect(page.locator('dialog[open]')).toBeVisible(); // confirmation
    await page.keyboard.press('Escape'); // referme la modale seulement
    await expect(page.locator('dialog[open]')).toHaveCount(0);
    await expect(page.locator('.ve-bar')).toBeVisible();
    await page.keyboard.press('Escape');
    await page.locator('dialog[open] button.primary').click();
    await expect(page.locator('.ve-bar')).toHaveCount(0);
  });

  test('Échap sans modification ferme directement', async ({ page }) => {
    await page.locator('.ve-form .pp-chev').first().focus();
    await page.keyboard.press('Escape');
    await expect(page.locator('.ve-bar')).toHaveCount(0);
  });

  test('le focus reste dans l’éditeur (Tab boucle) et les cartes ont un nom', async ({ page }) => {
    await expect(page.locator('.ve')).toHaveAttribute('role', 'dialog');
    await page.locator('.ve-form .pp-q').focus();
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press('Tab');
      expect(await page.evaluate(() => !!document.activeElement.closest('.ve'))).toBe(true);
    }
    const names = await page.$$eval('.ve-form .pp-chev', (n) => n.map((x) => x.getAttribute('aria-label')));
    expect(new Set(names).size).toBe(names.length);
    expect(await page.$$eval('.ve-tab', (n) => n.map((x) => x.getAttribute('role')))).toEqual(['tab', 'tab']);
  });

  test('recherche sans résultat : message et bouton pour effacer', async ({ page }) => {
    await page.locator('.ve-form .pp-q').fill('zzzz');
    await expect(page.locator('.ve-form .pp-empty')).toContainText('zzzz');
    await page.locator('.ve-form .pp-empty button').click();
    await expect(page.locator('.ve-form .pp-q')).toHaveValue('');
    await expect(page.locator('.ve-form .pp-empty')).toHaveCount(0);
  });
});
