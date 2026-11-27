const fs = require('fs');
const { test, expect } = require('@playwright/test');
const { openApp, watchErrors, DOC_KEY } = require('./helpers');

/* Projets dataviz (menu Fichier, accueil) : éditeur sans colonne, plusieurs dataviz nommées, enregistrées dans IndexedDB
   (magasin `vizprojects`), export à une largeur libre au millième. */

const projects = (page) =>
  page.evaluate(
    () =>
      new Promise((res, rej) => {
        const r = indexedDB.open('factsheet-creator');
        r.onsuccess = () => {
          const db = r.result;
          if (!db.objectStoreNames.contains('vizprojects')) return res([]);
          const g = db.transaction('vizprojects').objectStore('vizprojects').getAll();
          g.onsuccess = () => {
            db.close();
            res(g.result);
          };
          g.onerror = () => rej(g.error);
        };
        r.onerror = () => rej(r.error);
      }),
  );

async function menu(page, label) {
  await page.locator('.menu-btn', { hasText: 'File' }).click();
  await page.locator('.menu-pop:not([hidden]) .menu-item', { hasText: label }).click();
}
async function exportDl(page) {
  const dlg = page.locator('dialog.vexp');
  const [dl] = await Promise.all([page.waitForEvent('download'), dlg.locator('button.primary').click()]);
  await expect(dlg).toHaveCount(0);
  const path = test.info().outputPath(dl.suggestedFilename());
  await dl.saveAs(path);
  return { name: dl.suggestedFilename(), bytes: fs.readFileSync(path) };
}

test('dataviz seule : ouverture, enregistrement, largeur libre et export à la taille exacte', async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page, 'default');
  const before = await page.evaluate((k) => localStorage.getItem(k), DOC_KEY);

  await menu(page, 'New dataviz project…');
  await expect(page.locator('.ve-bar')).toBeVisible();
  await expect(page.locator('.ve-bar')).not.toContainText('Cancel'); // tout est gardé : pas d'« Annuler »
  await expect(page.locator('.ve-exp')).toHaveClass(/primary/);

  // largeur libre de l'aperçu, au millième
  await page.locator('.ve-tab[data-tab=viz]').click();
  const wNum = page.locator('.ve-wnum');
  await wNum.fill('237.913');
  await wNum.press('Enter');
  await expect(page.locator('.ve-stage .col-viz')).toHaveAttribute('style', /width: 237\.913px/);
  await expect
    .poll(async () => {
      const [p] = await projects(page);
      return p && p.items[0].width;
    })
    .toBe(237.913);
  const [saved] = await projects(page);
  expect(saved.schemaVersion).toBe(1);
  expect(saved.name).toMatch(/^\d{6}_dataviz$/);
  expect(saved.items[0].viz.kind).toBe('bars');

  // SVG à la largeur exacte
  await page.locator('.ve-exp').click();
  const dlg = page.locator('dialog.vexp');
  await expect(dlg.locator('.vexp-w')).toHaveValue('237.913');
  await dlg.locator('label.opt', { hasText: 'Vector SVG' }).locator('input').check();
  await expect(dlg.locator('.tip')).toContainText('237,913 ×');
  const svg = await exportDl(page);
  expect(svg.name).toMatch(/^Dataviz-1-bars_\d{6}_\d{4}\.svg$/); // nom de la dataviz
  expect(svg.bytes.toString('utf8')).toMatch(/<svg[^>]* width="237\.913"/);

  // SVG en mm : la taille du fichier est écrite dans l'unité
  await page.locator('.ve-exp').click();
  await dlg.locator('select[aria-label="Unit"]').selectOption('mm');
  await dlg.locator('.vexp-w').fill('80');
  const mm = await exportDl(page);
  expect(mm.bytes.toString('utf8')).toMatch(/<svg[^>]* width="80mm"/);

  // PNG à 96 dpi sans marge : exactement la largeur choisie en pixels
  await page.locator('.ve-exp').click();
  await dlg.locator('select[aria-label="Unit"]').selectOption('px');
  await dlg.locator('.vexp-w').fill('300');
  await dlg.locator('label.opt', { hasText: 'Transparent PNG' }).locator('input').check();
  await dlg.locator('label.opt', { hasText: '96 dpi' }).locator('input').check();
  await dlg.locator('label.opt', { hasText: '4 px margin' }).locator('input').uncheck();
  const png = await exportDl(page);
  expect(png.bytes.readUInt32BE(16)).toBe(300);

  // résolution libre (la largeur repart de celle de l'aperçu)
  await page.locator('.ve-exp').click();
  await dlg.locator('.vexp-dpi').fill('192');
  const png2 = await exportDl(page);
  expect(png2.bytes.readUInt32BE(16)).toBe(476); // largeur de l'aperçu (237,913 px) × 2

  // Fermer garde la dataviz, sans toucher au document
  await page.locator('.ve-close').click();
  await expect(page.locator('.ve')).toHaveCount(0);
  expect(await page.evaluate((k) => localStorage.getItem(k), DOC_KEY)).toBe(before);
  await menu(page, 'Reopen the last dataviz project');
  await expect(wNum).toHaveValue('237.913');
  await page.keyboard.press('Escape');
  await expect(page.locator('.ve')).toHaveCount(0);

  expect(errors).toEqual([]);
});

test('projet dataviz : plusieurs dataviz nommées, dupliquer, supprimer, gardées après rechargement', async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page, 'default');
  await menu(page, 'New dataviz project…');
  const side = page.locator('.ve-side');
  await side.locator('.vp-name').fill('Rapport annuel');
  await side.locator('.vp-cur input').fill('Budget');
  await side.getByRole('button', { name: 'New dataviz' }).click();
  await expect(side.locator('.vp-list li')).toHaveCount(2);
  await expect(side.locator('.vp-cur input')).toHaveValue('Dataviz 2');
  // type différent pour la 2e
  await page.locator('.ve-tab[data-tab=viz]').click();
  await page.locator('.ve-typecard .pp-card-h').click();
  await page.locator('.ve-typeopt', { hasText: /^Line/ }).first().click();
  await side.locator('.vp-acts button[aria-label="Duplicate the dataviz"]').click();
  await expect(side.locator('.vp-list li')).toHaveCount(3);
  await expect(side.locator('.vp-cur input')).toHaveValue('Dataviz 2 (copy)');
  await side.locator('.vp-acts button[aria-label="Delete the dataviz"]').click();
  await page.locator('dialog[open] button.primary').click();
  await expect(side.locator('.vp-list li')).toHaveCount(2);
  await side.locator('button.vp-item', { hasText: 'Budget' }).click();
  await expect(side.locator('.vp-cur input')).toHaveValue('Budget');
  await expect
    .poll(async () => {
      const [p] = await projects(page);
      return p ? p.name + ':' + p.items.map((x) => x.name + '/' + x.viz.kind).join(',') : '';
    })
    .toBe('Rapport annuel:Budget/bars,Dataviz 2/line');
  await page.locator('.ve-close').click();

  // rechargement : le projet est sur l'accueil, il rouvre la dernière dataviz ouverte
  await page.reload();
  await page.locator('.fs-tab-home').click();
  const card = page.locator('.fs-home .fh-card', { hasText: 'Rapport annuel' });
  await expect(card).toContainText('2 dataviz');
  await card.click();
  await expect(page.locator('.ve-side .vp-cur input')).toHaveValue('Budget');
  expect(errors).toEqual([]);
});

test('ancienne dataviz seule : devient un projet dataviz', async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page, 'default');
  await page.evaluate(() => {
    localStorage.removeItem('factsheet-creator-dataviz-migrated');
    localStorage.setItem(
      'factsheet-creator-dataviz-v1',
      JSON.stringify({
        schemaVersion: 1,
        width: 300,
        viz: { kind: 'bars', opts: { rows: [{ label: 'A', v: [3] }], series: [{ name: 'x', color: 'blue' }] } },
      }),
    );
  });
  await menu(page, 'Reopen the last dataviz project');
  await expect(page.locator('.ve-side .vp-list li')).toHaveCount(1);
  await expect(page.locator('.ve-wnum')).toHaveValue('300');
  expect(errors).toEqual([]);
});
