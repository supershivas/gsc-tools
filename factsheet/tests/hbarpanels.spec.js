const { test, expect } = require('@playwright/test');
const { openApp, watchErrors, addBundle, DOC_KEY } = require('./helpers');
/* Barres horizontales « En panneaux » (hbars.js, renderPanels) : une colonne de données par panneau, piste, valeurs, filets */
test('barres horizontales en panneaux : en-têtes, pistes, barres, valeurs, filets', async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page, 'default');
  await page
    .locator('#tree .col-row', { hasText: /Dataviz/ })
    .first()
    .click();
  const open = page.locator('#props button.primary').first();
  if (!(await open.count())) await page.locator('#props .pp-chev').first().click();
  await open.click();
  await page.locator('.ve-tab[data-tab=viz]').click();
  await page.locator('.ve-typecard .pp-card-h').click();
  await page
    .locator('.ve-typeopt', { hasText: /^Horizontal bars/ })
    .first()
    .click();
  await page.locator('.ve-tab[data-tab=data]').click();
  await page.locator('.ve-data details summary').click();
  await page
    .locator('.ve-data details textarea')
    .fill(
      "\tTrump voters\tMAGA\tNon-MAGA\nTrump's actions\t43\t33\t55\nStrong Democratic campaigns\t18\t20\t16\nWeak Republican campaigns\t22\t30\t17\nDon't know\t17\t17\t12",
    );
  await page.locator('.ve-data details .pp-btn').click();
  const imp = page.locator('dialog[open] button.primary');
  if (await imp.count()) await imp.click();
  await page.locator('.ve-tab[data-tab=viz]').click();
  const exp = page.getByRole('button', { name: 'Expand · Structure' });
  if (await exp.count()) await exp.click();
  const sel = page.locator('.ve-form select').filter({ has: page.locator('option[value="panels"]') });
  if (await sel.count()) await sel.selectOption('panels');
  else await page.locator('.ve-form button', { hasText: 'In panels' }).first().click();
  await page.waitForTimeout(300);
  const svg = page.locator('.ve-stage svg').first();
  for (const n of ['Trump voters', 'MAGA', 'Non-MAGA']) await expect(svg.locator('text', { hasText: new RegExp(`^${n}$`) })).toHaveCount(1);
  await expect(svg.locator('path[data-color]')).toHaveCount(12); // 4 lignes × 3 panneaux
  await expect(svg.locator('rect[fill^="var(--c-tint-"]')).toHaveCount(12); // pistes
  await expect(svg.locator('line[stroke-dasharray="1 2"]')).toHaveCount(3); // filets entre les lignes
  await expect(svg.locator('text', { hasText: '55%' })).toHaveCount(1);
  await expect(svg.locator('[data-text="rows.3"]')).toHaveCount(1); // libellé cliquable (barre de mise en forme)
  // le document garde la dataviz en panneaux : export PDF sans erreur
  await page.locator('.ve-bar button.primary', { hasText: 'Done' }).click();
  await addBundle(page, 'pdfexport.js');
  const n = await page.evaluate(async (key) => {
    const doc = JSON.parse(localStorage.getItem(key));
    const r = await window.FSPDF.build(doc, 'net', { profile: 'rgb', dpi: 72 });
    return r.bytes.length;
  }, DOC_KEY);
  expect(n).toBeGreaterThan(1000);
  expect(errors).toEqual([]);
});
