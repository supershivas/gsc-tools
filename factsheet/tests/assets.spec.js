const { test, expect } = require('@playwright/test');
const { openApp, watchErrors } = require('./helpers');

/* Images du dépôt rangées en logos/, header/, others/ : anciens chemins migrés, carte « Document images », familles de logos. */

test('les anciens chemins d’images (dossier à plat) sont migrés', async ({ page }) => {
  await page.goto('/factsheet/tests/blank.html');
  const r = await page.evaluate(() => {
    const { defaultDoc, migrate } = window.FSTEST;
    const j = JSON.parse(JSON.stringify(defaultDoc()));
    j.header.logos = {
      default: 'assets/d9742f1219.png',
      mono: 'assets/c069bffefa.png',
      white: 'assets/4a5a41080e.png',
      negative: 'assets/5ec5fb8b6a.png',
    };
    j.header.images = [{ id: 'img-x', name: 'x', src: 'assets/Asset 1.svg' }];
    delete j.header.logoFamily;
    const col = j.sections[0].subs[0].cols[0];
    col.type = 'image';
    col.src = 'assets/2a3ba63bd5.png';
    const d = migrate(j);
    return {
      logos: d.header.logos,
      family: d.header.logoFamily,
      images: d.header.images.map((i) => i.src),
      col: d.sections[0].subs[0].cols[0].src,
    };
  });
  expect(r.logos.default).toBe('assets/logos/gsc/default.png');
  expect(r.logos.mono).toBe('assets/logos/gsc/mono.png');
  expect(r.family).toBe('gsc');
  expect(r.images.every((s) => s.startsWith('assets/header/'))).toBe(true);
  expect(r.col).toBe('assets/others/lantern-emblem.png');
});

test('carte « Document images », plus de barre « à publier »', async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page, 'default');
  /* une image qui n'est que dans le navigateur */
  await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem('factsheet-creator-v1'));
    const col = d.sections[0].subs[0].cols.find((c) => c.type === 'image') || d.sections[0].subs[0].cols[0];
    col.type = 'image';
    col.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    localStorage.setItem('factsheet-creator-v1', JSON.stringify(d));
  });
  await page.reload();
  await page.waitForSelector('#stage .page');
  await expect(page.locator('.warnings .note')).toHaveCount(0);
  await page.locator('#props .pp-card-h', { hasText: /Document images/ }).click();
  const card = page.locator('#props');
  await expect(card.locator('.assetkind')).toHaveCount(3);
  await expect(card.locator('.assetfolder', { hasText: 'gsc' }).locator('.imgtile')).toHaveCount(4);
  await expect(card.locator('.imgtile-flag')).toHaveCount(1);
  await card.getByRole('button', { name: 'Browse…' }).click();
  await expect(page.locator('dialog.assets-dlg[open] .imgtile').first()).toBeVisible();
  await page.keyboard.press('Escape');
  expect(errors).toEqual([]);
});
