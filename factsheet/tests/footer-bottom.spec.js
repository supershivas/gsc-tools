const { test, expect } = require('@playwright/test');
const { stubExternal, watchErrors, seed } = require('./helpers');

/* Pied de page (marge basse), dernière section alignée en bas de la page, raccourci W (marges et espaces). */
async function load(page, patch) {
  await stubExternal(page);
  await seed(page, 'default');
  await page.evaluate((src) => {
    const k = 'factsheet-creator-v1',
      d = JSON.parse(localStorage.getItem(k));
    new Function('d', src)(d);
    localStorage.setItem(k, JSON.stringify(d));
  }, patch);
  await page.goto('/factsheet/index.html');
  await page.waitForSelector('.page-recto');
  await page.waitForTimeout(600);
}
const lastRecto = `const l = d.sections.filter((s) => s.page === 'recto').pop();`;
const geom = (page, key) =>
  page.evaluate((key) => {
    const pg = document.querySelector(`.page-${key}:not(.ovf-clone)`),
      s = pg.getBoundingClientRect(),
      sec = pg.querySelector('.content > .sec:last-child'),
      r = sec.getBoundingClientRect(),
      body = sec.querySelector('.sub'),
      b = body.getBoundingClientRect();
    return { k: pg.offsetHeight / s.height, pageB: s.bottom, secT: r.top, secB: r.bottom, bodyB: b.bottom, h: r.height };
  }, key);

test('pied de page : un texte par page, dans la marge basse', async ({ page }) => {
  const errors = watchErrors(page);
  await load(page, `d.footer = { recto: 'Pied recto', verso: '' };`);
  await expect(page.locator('.page-recto:not(.ovf-clone) .page-footer')).toHaveText('Pied recto');
  await expect(page.locator('.page-verso:not(.ovf-clone) .page-footer')).toHaveCount(0);
  const y = await page.evaluate(() => {
    const p = document.querySelector('.page-recto:not(.ovf-clone)'),
      f = p.querySelector('.page-footer').getBoundingClientRect(),
      r = p.getBoundingClientRect();
    return { top: (f.top - r.top) / (r.height / 1122.5), bottom: (r.bottom - f.bottom) / (r.height / 1122.5) };
  });
  expect(y.bottom).toBeGreaterThan(0);
  expect(y.bottom).toBeLessThan(36);
  expect(errors).toEqual([]);
});

test('dernière section alignée en bas : fond sur toute la hauteur, puis hauteur de la section', async ({ page }) => {
  await load(page, `${lastRecto} l.bg = 'tint-grey'; l.alignBottom = true;`);
  let g = await geom(page, 'recto');
  expect(Math.abs(g.secB - g.pageB)).toBeLessThan(2); // le fond va au bas de la feuille
  expect(g.pageB - g.bodyB).toBeGreaterThan(20); // le contenu reste au-dessus de la marge basse
  const full = g.h;
  await load(page, `${lastRecto} l.bg = 'tint-grey'; l.alignBottom = true; l.bottomFit = 'fit';`);
  g = await geom(page, 'recto');
  expect(Math.abs(g.secB - g.pageB)).toBeLessThan(2);
  expect(g.h).toBeLessThan(full);
});

test('touche W : marges et espaces', async ({ page }) => {
  await load(page, ``);
  expect(await page.locator('.sp-layer').count()).toBe(0);
  await page.locator('body').press('w');
  await expect(page.locator('.sp-layer').first()).toBeVisible();
  await page.locator('body').press('w');
  await expect(page.locator('.sp-layer')).toHaveCount(0);
});
