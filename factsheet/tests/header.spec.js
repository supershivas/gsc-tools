/* Header : position verticale du texte dans son cadre (`header.textY`), l'image et le logo ne bougent pas. */
const { test, expect } = require('@playwright/test');
const { openApp, watchErrors } = require('./helpers');

const pos = (page) =>
  page.evaluate(() => {
    const hd = document.querySelector('#stage .page:not(.ovf-clone) .hd'),
      k = hd.getBoundingClientRect().height / hd.offsetHeight,
      top = (sel) => (hd.querySelector(sel).getBoundingClientRect().top - hd.getBoundingClientRect().top) / k;
    return { text: top('.hd-text'), logo: top('.hd-logo') };
  });

test('header : texte déplacé verticalement par le curseur, logo immobile, retour à 0, valeur bornée à l’ouverture', async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page, 'default');
  const before = await pos(page);
  await page
    .locator('#tree .tn', { hasText: /Header/i })
    .first()
    .click();
  const num = page.locator('#hdTextY');
  await num.fill('-12');
  await expect.poll(async () => Math.round((await pos(page)).text - before.text)).toBe(-12);
  expect(Math.round((await pos(page)).logo - before.logo)).toBe(0);
  await page
    .locator('#props .f', { has: page.locator('label[for=hdTextY]') })
    .getByRole('button')
    .first()
    .click(); // ↺
  await expect.poll(async () => Math.round((await pos(page)).text - before.text)).toBe(0);
  expect(errors).toEqual([]);
});

test('header : textY borné par migrate', async ({ page }) => {
  await page.goto('/factsheet/tests/blank.html');
  const out = await page.evaluate(() => {
    const F = window.FSTEST,
      m = (v) => {
        const d = F.defaultDoc();
        d.header.textY = v;
        return F.migrate(JSON.parse(JSON.stringify(d))).header.textY;
      };
    return [m(-200), m(12.4), m('x'), m(0)];
  });
  expect(out).toEqual([-40, 12, undefined, undefined]);
});
