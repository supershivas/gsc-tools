const fs = require('fs');
const { test, expect } = require('@playwright/test');
const { openApp, watchErrors, DOC_KEY } = require('./helpers');

/* Export de la dataviz depuis l'éditeur : PNG transparent, PNG avec fond, JPG 300 dpi, SVG vectoriel. */

async function openEditor(page) {
  await openApp(page, 'default');
  await page
    .locator('#tree .col-row', { hasText: /Dataviz/ })
    .first()
    .click();
  const open = page.locator('#props button.primary').first();
  if (!(await open.count())) await page.locator('#props .pp-chev').first().click();
  await open.click();
  await expect(page.locator('.ve-bar')).toBeVisible();
  await page.locator('.ve-tab[data-tab=viz]').click();
}
async function exportAs(page, label, dpi) {
  await page.locator('.ve-exp').click();
  const dlg = page.locator('dialog.vexp');
  await expect(dlg).toBeVisible();
  expect(await dlg.innerText()).not.toContain('null');
  await dlg.locator('label.opt', { hasText: label }).locator('input').check();
  if (dpi)
    await dlg
      .locator('label.opt', { hasText: `${dpi} dpi` })
      .locator('input')
      .check();
  const [dl] = await Promise.all([page.waitForEvent('download'), dlg.locator('button.primary').click()]);
  await expect(dlg).toHaveCount(0);
  const path = test.info().outputPath(dl.suggestedFilename());
  await dl.saveAs(path);
  return { name: dl.suggestedFilename(), bytes: fs.readFileSync(path) };
}

test('export PNG, JPG et SVG de la dataviz', async ({ page }) => {
  const errors = watchErrors(page);
  await openEditor(page);

  const png = await exportAs(page, 'Transparent PNG', 300);
  expect(png.name).toMatch(/_dataviz-.+_\d{6}\.png$/);
  expect([...png.bytes.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  expect(png.bytes.subarray(37, 41).toString('latin1')).toBe('pHYs'); // densité écrite juste après IHDR
  expect(png.bytes.readUInt32BE(41)).toBe(11811); // 300 dpi en pixels par mètre
  const wpx = png.bytes.readUInt32BE(16);
  expect(wpx).toBeGreaterThan(500);

  const lowres = await exportAs(page, 'Transparent PNG', 150);
  expect(Math.abs(lowres.bytes.readUInt32BE(16) - wpx / 2)).toBeLessThanOrEqual(1);

  const withBg = await exportAs(page, 'PNG with background');
  expect(withBg.name).toMatch(/\.png$/);

  const jpg = await exportAs(page, 'JPG', 300);
  expect(jpg.name).toMatch(/\.jpg$/);
  expect([jpg.bytes[0], jpg.bytes[1]]).toEqual([0xff, 0xd8]);
  expect(jpg.bytes.readUInt16BE(14)).toBe(300); // densité JFIF

  const svg = await exportAs(page, 'Vector SVG');
  const text = svg.bytes.toString('utf8');
  expect(svg.name).toMatch(/\.svg$/);
  expect(text.startsWith('<?xml')).toBe(true);
  expect(text).toContain('<svg');
  expect(text).not.toMatch(/var\(|currentColor|data-reorder/); // styles résolus : le fichier est autonome
  expect(text).toMatch(/font-family=/);

  expect(errors).toEqual([]);
});

test('SVG : titre et source en vrais textes', async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page, 'default');
  await page.evaluate((key) => {
    const doc = JSON.parse(localStorage.getItem(key));
    const col = doc.sections.flatMap((s) => s.subs.flatMap((b) => b.cols)).find((c) => c.viz);
    col.viz.head = { title: '## Titre du graphique', source: 'Source : étude test' };
    localStorage.setItem(key, JSON.stringify(doc));
  }, DOC_KEY);
  await page.reload();
  await page.waitForSelector('#stage .page');
  await page
    .locator('#tree .col-row', { hasText: /Dataviz/ })
    .first()
    .click();
  const open = page.locator('#props button.primary').first();
  if (!(await open.count())) await page.locator('#props .pp-chev').first().click();
  await open.click();
  await page.locator('.ve-tab[data-tab=viz]').click();
  const svg = await exportAs(page, 'Vector SVG');
  const text = svg.bytes.toString('utf8');
  expect(text).toMatch(/<text[^>]*>Titre du graphique<\/text>/);
  expect(text).toMatch(/<text[^>]*>Source : étude test<\/text>/);
  expect(text).not.toMatch(/foreignObject|var\(|currentColor/);
  expect(text.match(/<svg/g).length).toBe(2); // le graphique est imbriqué dans le SVG de l'ensemble
  // sans la case « titre et source » : le graphique seul
  await page.locator('.ve-exp').click();
  const dlg = page.locator('dialog.vexp');
  await dlg.locator('label.opt', { hasText: 'Include the title' }).locator('input').uncheck();
  const [dl] = await Promise.all([page.waitForEvent('download'), dlg.locator('button.primary').click()]);
  const p2 = test.info().outputPath('sans-titre.svg');
  await dl.saveAs(p2);
  expect(fs.readFileSync(p2, 'utf8')).not.toContain('Titre du graphique');
  expect(errors).toEqual([]);
});
