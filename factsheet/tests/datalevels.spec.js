const { test, expect } = require('@playwright/test');
const { openApp, watchErrors, DOC_KEY } = require('./helpers');

/* Hiérarchie des lignes (row.level 0 à 3, affiché de 1 à 4) : disponible dans le tableau de données de tous les types de dataviz,
   même quand le dessin ne s'en sert pas (seule la heatmap la dessine). */
for (const kind of ['bars', 'line', 'treemap', 'scatter', 'sunburst', 'sankey']) {
  test(`niveau des lignes dans le tableau de données : ${kind}`, async ({ page }) => {
    const errors = watchErrors(page);
    await openApp(page, 'default');
    await page.evaluate(
      ([key, kind]) => {
        const doc = JSON.parse(localStorage.getItem(key));
        const col = doc.sections.flatMap((s) => s.subs.flatMap((b) => b.cols)).find((c) => c.viz);
        col.viz = { kind, opts: null, head: { title: '', source: '' }, side: { pos: 'none' } };
        localStorage.setItem(key, JSON.stringify(doc));
      },
      [DOC_KEY, kind],
    );
    await page.reload();
    await page.waitForSelector('#stage .page');
    await page
      .locator('#tree .col-row', { hasText: /Dataviz/ })
      .first()
      .click();
    const open = page.locator('#props button.primary').first();
    if (!(await open.count())) await page.locator('#props .pp-chev').first().click();
    await open.click();
    await page.locator('.ve-tab[data-tab=data]').click();
    const grid = page.locator('table.dg').first();
    const row = grid.locator('tbody tr').nth(1);
    await row.locator('button[aria-label="Move down a level"]').click();
    await row.locator('button[aria-label="Move down a level"]').click();
    await expect(row.locator('button[aria-label="Move up a level"]')).toBeEnabled();
    await expect(grid.locator('tbody tr').nth(0).locator('button[aria-label="Move up a level"]')).toBeDisabled();
    await page.locator('.ve-bar button.primary').click();
    await page.waitForTimeout(300);
    const levels = await page.evaluate((key) => {
      const doc = JSON.parse(localStorage.getItem(key));
      const o = doc.sections.flatMap((s) => s.subs.flatMap((b) => b.cols)).find((c) => c.viz).viz.opts;
      const rows =
        o.rows || Object.values(o).find((v) => Array.isArray(v) && v.length && v[0] && typeof v[0] === 'object' && !('type' in v[0]));
      return (rows || []).map((r) => r.level || 0);
    }, DOC_KEY);
    expect(levels[1]).toBe(2);
    expect(levels[0]).toBe(0);
    expect(errors).toEqual([]);
  });
}
