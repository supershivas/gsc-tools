/* Tableau : barre de mise en forme de la cellule en saisie (gras, appel de note) ; notes de bas de page du document réunies au bas du verso. */
const { test, expect } = require('@playwright/test');
const { openApp, watchErrors } = require('./helpers');

const editorCell = (page, r, c) =>
  page.evaluate(
    ([r, c]) =>
      [...document.querySelectorAll('.te .tbl .tbl-cell')].find(
        (n) => n.style.gridRow.startsWith(`${r + 1} `) && n.style.gridColumn.startsWith(`${c + 1} `),
      ).dataset.cell,
    [r, c],
  );
const cell = async (page, r, c) => page.locator(`.te [data-cell="${await editorCell(page, r, c)}"]`);

test('tableau : gras et appel de note par la barre de la cellule ; la note va au bas du verso, numérotée', async ({ page }, info) => {
  const errors = watchErrors(page);
  await openApp(page, 'table');
  await page.locator('#stage .page:not(.ovf-clone) [data-sel="col:0:1:0"] .tbl-cell').last().dblclick();
  await expect(page.locator('.te')).toBeVisible();
  /* sélection de deux cellules : « Fusionner » actif dans la carte Sélection */
  await (await cell(page, 1, 0)).click();
  await (await cell(page, 1, 1)).click({ modifiers: ['Shift'] });
  await expect(page.locator('.te [data-act="merge"]')).toBeEnabled();
  await page
    .locator('.te .ve-form, .te form, .te')
    .first()
    .screenshot({ path: info.outputPath('panel.png') });
  /* saisie : la barre apparaît */
  await (await cell(page, 2, 0)).dblclick();
  const bar = page.locator('.te-fmt');
  await expect(bar).toBeVisible();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type('Total');
  await page.keyboard.press('ControlOrMeta+a');
  await bar.getByRole('button', { name: 'Bold' }).click();
  await page.keyboard.press('End');
  await bar.getByRole('button', { name: /^Note reference/ }).click();
  await page.keyboard.type('Estimate for 2026');
  await page.locator('.te').screenshot({ path: info.outputPath('bar.png') });
  await page.keyboard.press('Enter');
  await expect(bar).toHaveCount(0);
  await page.locator('.te .ve-br button', { hasText: 'Done' }).click();
  await expect(page.locator('.te')).toHaveCount(0);
  /* dans la page : « Total » en gras avec l'appel ¹, la note au bas du verso, au-dessus du pied de page */
  const tcell = page.locator('#stage .page:not(.ovf-clone) .tbl-cell', { hasText: 'Total' });
  await expect(tcell.locator('b').first()).toContainText('Total');
  await expect(tcell.locator('sup')).toHaveText('1'); // appel tapé à la fin du mot en gras : en gras lui aussi
  const notes = page.locator('#stage .page-verso:not(.ovf-clone) .doc-notes .rich-note');
  await expect(notes).toHaveCount(1);
  await expect(notes).toContainText('Estimate for 2026');
  const gap = await page.evaluate(() => {
    const pg = document.querySelector('#stage .page-verso:not(.ovf-clone)'),
      k = pg.getBoundingClientRect().height / pg.offsetHeight,
      n = pg.querySelector('.doc-notes').getBoundingClientRect(),
      f = pg.querySelector('.page-footer');
    return {
      toPage: (pg.getBoundingClientRect().bottom - n.bottom) / k,
      footer: f ? (f.getBoundingClientRect().top - n.bottom) / k : null,
    };
  });
  expect(gap.toPage).toBeLessThan(60); // au bas de la page (marge basse)
  if (gap.footer != null) expect(gap.footer).toBeGreaterThanOrEqual(0); // au-dessus du pied de page
  await page.locator('#stage .page-verso:not(.ovf-clone)').screenshot({ path: info.outputPath('verso.png') });
  expect(errors).toEqual([]);
});
