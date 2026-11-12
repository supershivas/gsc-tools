const fs = require('fs');
const { test, expect } = require('@playwright/test');
const { openApp, watchErrors } = require('./helpers');

/* Carte « Exporter » de chaque élément : PNG transparent, SVG et PDF d'une section, du header et d'une colonne. */
async function exportOf(page, format) {
  const card = page.locator('#props .pp-card', { has: page.locator('.pp-card-h b', { hasText: /^(Exporter|Export)$/ }) });
  if (!(await card.locator('button.primary').isVisible())) await card.locator('.pp-card-h').click();
  await card.locator('.cs').click();
  await page.locator('[role=option]').nth(['png-t', 'png', 'jpg', 'svg', 'pdf'].indexOf(format)).click();
  const [dl] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#props button.primary', { hasText: /Télécharger|Download/ }).click(),
  ]);
  const path = test.info().outputPath(dl.suggestedFilename());
  await dl.saveAs(path);
  return { name: dl.suggestedFilename(), bytes: fs.readFileSync(path) };
}

test('export d’un élément : PNG, SVG, PDF', async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page, 'default');
  await page
    .locator('#tree .tn', { hasText: /Header/i })
    .first()
    .click();
  const png = await exportOf(page, 'png-t');
  expect(png.name).toMatch(/_header-transparent_\d{6}_\d{4}\.png$/);
  expect([...png.bytes.subarray(1, 4)]).toEqual([0x50, 0x4e, 0x47]);
  const pdf = await exportOf(page, 'pdf');
  expect(pdf.name).toMatch(/_header-x4_\d{6}_\d{4}\.pdf$/);
  expect(pdf.bytes.subarray(0, 5).toString()).toBe('%PDF-');
  expect((pdf.bytes.toString('latin1').match(/\/Type\s*\/Page\b/g) || []).length).toBe(1);
  const svg = await exportOf(page, 'svg');
  expect(svg.bytes.toString()).toContain('<svg');
  /* fond perdu : page plus grande que le format fini (TrimBox) */
  await page
    .locator('#props .pp-card', { has: page.locator('.pp-card-h b', { hasText: /^(Exporter|Export)$/ }) })
    .locator('.pp-switch')
    .click();
  const bleed = await exportOf(page, 'pdf');
  expect(bleed.name).toMatch(/_header-bleed-x4_\d{6}_\d{4}\.pdf$/);
  const txt = bleed.bytes.toString('latin1');
  const box = (k) => (txt.match(new RegExp('/' + k + '\\s*\\[([^\\]]+)\\]')) || [])[1].trim().split(/\s+/).map(Number);
  const [, , mw, mh] = box('MediaBox'),
    [tx, ty, tw, th] = box('TrimBox');
  expect(mw).toBeGreaterThan(tw + 8);
  expect(mh).toBeGreaterThan(th + 8);
  expect(tx).toBeGreaterThan(8);
  const bpng = await exportOf(page, 'png');
  expect(bpng.name).toMatch(/_header-bleed_\d{6}_\d{4}\.png$/);
  await page
    .locator('#props .pp-card', { has: page.locator('.pp-card-h b', { hasText: /^(Exporter|Export)$/ }) })
    .locator('.pp-switch')
    .click();
  /* une section et une colonne : PNG non vide */
  await page.locator('#tree .tn[data-path="sec:0"]').first().click();
  const sec = await exportOf(page, 'png');
  expect(sec.name).toMatch(/_section-1_\d{6}_\d{4}\.png$/);
  expect(sec.bytes.length).toBeGreaterThan(5000);
  expect(errors).toEqual([]);
});
