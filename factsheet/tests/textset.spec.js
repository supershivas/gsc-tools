const { test, expect } = require('@playwright/test');
const { stubExternal, watchErrors, seed } = require('./helpers');

/* Menu Texte : taille de tous les textes, crans d'interlignage (grille de 1,5 px), césure partout, retour au gabarit (doc.textSet). */
async function load(page, patch = '') {
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
  await page.waitForTimeout(400);
}
const pick = async (page, item) => {
  await page.locator('.menu-btn', { hasText: /^Text$/ }).click();
  await page.locator('.menu-pop:not([hidden]) .menu-item', { hasText: item }).first().click();
  await page.waitForTimeout(300);
};
/* corps et interlignage (px) du premier paragraphe courant, d'un titre de section et du titre du header */
const sizes = (page) =>
  page.evaluate(() => {
    const pg = document.querySelector('.page-recto:not(.ovf-clone)'),
      cs = (sel) => {
        const e = pg.querySelector(sel);
        const c = getComputedStyle(e);
        return { fs: parseFloat(c.fontSize), lh: parseFloat(c.lineHeight) };
      };
    return {
      body: cs('.rich p:not([class])'),
      sec: cs('.sec-title'),
      title: cs('.hd-title'),
      hyph: pg.classList.contains('hyph'),
      lang: pg.lang,
    };
  });

test('taille des textes, interlignage, césure et réinitialisation', async ({ page }) => {
  const errors = watchErrors(page);
  await load(page);
  const s0 = await sizes(page);
  expect(s0.body).toEqual({ fs: 16, lh: 21 }); // 12 pt / 21 px
  await pick(page, '90 %');
  let s = await sizes(page);
  expect(s.body.fs).toBeCloseTo(14.4, 1); // 10,8 pt
  expect(s.body.lh).toBe(19.5); // 18,9 → grille de 1,5 px
  expect(s.sec.fs).toBeCloseTo(s0.sec.fs * 0.9, 0);
  expect(s.title.fs).toBeCloseTo(s0.title.fs * 0.9, 0); // le header suit l'échelle
  await pick(page, 'Tight');
  s = await sizes(page);
  expect(s.body.lh).toBe(18); // un cran de 1,5 px
  await pick(page, 'Automatic hyphenation everywhere');
  s = await sizes(page);
  expect(s.hyph).toBe(true);
  expect(s.lang).toBe('en');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('factsheet-creator-v1')).textSet);
  expect(saved).toEqual({ scale: 0.9, lead: -1, hyph: true });
  await pick(page, 'Reset text settings');
  s = await sizes(page);
  expect(s.body).toEqual(s0.body);
  expect(s.hyph).toBe(false);
  await page.locator('.menu-btn', { hasText: /^Text$/ }).click();
  await expect(page.locator('.menu-pop:not([hidden]) .menu-item', { hasText: 'Reset text settings' })).toBeDisabled();
  await page.keyboard.press('Escape');
  expect(errors).toEqual([]);
});

test('taille choisie à la main et chiffres clés suivent l’échelle ; réglage invalide ramené au gabarit', async ({ page }) => {
  const errors = watchErrors(page);
  await load(
    page,
    `const c = d.sections.flatMap((x) => x.subs).flatMap((x) => x.cols).find((x) => x.type === 'text');
     c.adv = { s: 10 };
     d.textSet = { scale: 0.8, lead: 'x', hyph: 1 };`,
  );
  const r = await page.evaluate(() => {
    const pg = document.querySelector('.page-recto:not(.ovf-clone)'),
      p = [...pg.querySelectorAll('.rich p')].find((e) => e.style.fontSize),
      c = getComputedStyle(p),
      plain = getComputedStyle(
        [...pg.querySelectorAll('.rich p:not([class])')].find((e) => !e.closest('.rich[style*="font"]') && !e.style.fontSize),
      );
    return {
      fs: parseFloat(c.fontSize),
      lh: parseFloat(c.lineHeight),
      bodyLh: parseFloat(plain.lineHeight),
      hyph: pg.classList.contains('hyph'),
    };
  });
  expect(r.fs).toBeCloseTo((10 * 0.8 * 4) / 3, 1); // 8 pt
  expect(r.lh % 1.5).toBe(0);
  expect(r.bodyLh).toBe(16.5); // 21 × 0,8 = 16,8 → 16,5 ; cran invalide = interlignage normal
  expect(r.hyph).toBe(false);
  expect(errors).toEqual([]);
});
