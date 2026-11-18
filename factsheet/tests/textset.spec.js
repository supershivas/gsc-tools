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
/* interlignage de tout le document : carte Document, sous « Espacement » */
const lineSpacing = async (page, label) => {
  await page
    .locator('#props .f', { hasText: 'Line spacing' })
    .locator('button', { hasText: new RegExp('^' + label + '$') })
    .click();
  await page.waitForTimeout(300);
};
/* « Appliquer aux » : cases de la fenêtre des styles, puis Appliquer */
const applyTo = async (page, changes) => {
  await pick(page, 'Paragraph styles');
  for (const [k, on] of Object.entries(changes)) await page.locator(`dialog.tsd #tsdOn-${k}`).setChecked(on);
  await page.locator('dialog.tsd').getByRole('button', { name: 'Apply' }).click();
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
  await pick(page, 'Smaller text');
  await pick(page, 'Smaller text');
  let s = await sizes(page);
  expect(s.body.fs).toBeCloseTo(14.4, 1); // 10,8 pt
  expect(s.body.lh).toBe(19.5); // 18,9 → grille de 1,5 px
  expect(s.sec.fs).toBeCloseTo(s0.sec.fs * 0.9, 0);
  expect(s.title).toEqual(s0.title); // le header ne bouge jamais
  await lineSpacing(page, 'Tight');
  s = await sizes(page);
  expect(s.body.lh).toBe(18); // un cran de 1,5 px
  await pick(page, 'Automatic hyphenation everywhere');
  s = await sizes(page);
  expect(s.hyph).toBe(true);
  expect(s.lang).toBe('en');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('factsheet-creator-v1')).textSet);
  expect(saved).toEqual({ scale: 0.9, lead: -1, hyph: true, styles: {}, skip: [] });
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

/* Fenêtre « Styles de paragraphe » : aperçu en direct sans toucher au document, Appliquer = une étape d'historique, Échap annule */
const docTextSet = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('factsheet-creator-v1')).textSet);
test('styles de paragraphe : aperçu, appliquer, annuler, revenir au gabarit', async ({ page }) => {
  const errors = watchErrors(page);
  await load(page);
  const s0 = await sizes(page);
  await pick(page, 'Paragraph styles');
  const dlg = page.locator('dialog.tsd');
  await expect(dlg).toBeVisible();
  await expect(dlg.locator('.tsd-page')).toHaveCount(2);
  await expect(dlg.locator('[data-style=overline], [data-style=title], [data-style=subtitle]')).toHaveCount(0); // pas de header
  const body = dlg.locator('.tsd-row[data-style=body]');
  await expect(body.locator('.tsd-uses')).toContainText('in the document');
  await body.locator('input').first().fill('10');
  await body.locator('input').first().press('Tab');
  await page.waitForTimeout(300);
  let s = await sizes(page);
  expect(s.body.fs).toBeCloseTo((10 * 4) / 3, 1);
  expect(s.body.lh).toBe(18); // 21 × 10/12 = 17,5 → 18
  expect(s.title).toEqual(s0.title);
  expect((await docTextSet(page)).styles).toEqual({}); // aperçu seulement
  await expect(body).toHaveClass(/mod/);
  /* Échap : rien n'a changé */
  await page.keyboard.press('Escape');
  await expect(dlg).toHaveCount(0);
  await page.waitForTimeout(300);
  expect((await sizes(page)).body).toEqual(s0.body);
  /* Appliquer */
  await pick(page, 'Paragraph styles');
  await dlg.locator('.tsd-row[data-style=body] input').first().fill('10');
  await dlg.locator('.tsd-row[data-style=body] input').first().press('Tab');
  await dlg.locator('.tsd-row[data-style=source] input').nth(1).fill('7.5');
  await dlg.locator('.tsd-row[data-style=source] input').nth(1).press('Tab');
  await dlg.getByRole('button', { name: 'Apply' }).click();
  await expect(dlg).toHaveCount(0);
  await page.waitForTimeout(400);
  expect((await docTextSet(page)).styles).toEqual({ body: { size: 10 }, source: { lh: 10.5 } });
  s = await sizes(page);
  expect(s.body.fs).toBeCloseTo((10 * 4) / 3, 1);
  /* une seule étape d'historique */
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+z' : 'Control+z');
  await page.waitForTimeout(400);
  expect((await sizes(page)).body).toEqual(s0.body);
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+Shift+z' : 'Control+y');
  await page.waitForTimeout(400);
  /* retour au gabarit d'un style */
  await pick(page, 'Paragraph styles');
  await dlg.locator('.tsd-row[data-style=body] .tsd-reset').click();
  await expect(dlg.locator('.tsd-row[data-style=body]')).not.toHaveClass(/mod/);
  await dlg.getByRole('button', { name: 'Apply' }).click();
  await page.waitForTimeout(400);
  expect((await docTextSet(page)).styles).toEqual({ source: { lh: 10.5 } });
  expect(errors).toEqual([]);
});

/* Phase 3 : les textes des graphiques suivent l'échelle ; un type décoché dans « Appliquer aux » garde les styles du gabarit */
const vizSizes = (page) =>
  page.evaluate(() => {
    const pg = [...document.querySelectorAll('.page:not(.ovf-clone)')];
    const all = (sel) => pg.flatMap((p) => [...p.querySelectorAll(sel)]);
    const svgText = all('.col-viz svg text').map((t) => +t.getAttribute('font-size') || parseFloat(getComputedStyle(t).fontSize));
    const fig = all('.vf-value')[0];
    return {
      viz: Math.max(...svgText),
      vizMin: Math.min(...svgText),
      fig: fig ? parseFloat(getComputedStyle(fig).fontSize) : null,
      body: parseFloat(getComputedStyle(all('.col-text .rich p:not([class])')[0]).fontSize),
      excluded: all('.ts-off').length,
    };
  });
test('dataviz et chiffres clés suivent l’échelle ; « Appliquer aux » les en exclut', async ({ page }) => {
  const errors = watchErrors(page);
  await load(page);
  const v0 = await vizSizes(page);
  expect(v0.excluded).toBe(0);
  for (let i = 0; i < 4; i++) await pick(page, 'Smaller text');
  const v1 = await vizSizes(page);
  expect(v1.vizMin / v0.vizMin).toBeCloseTo(0.8, 1);
  expect(v1.fig / v0.fig).toBeLessThan(0.9);
  expect(v1.body / v0.body).toBeCloseTo(0.8, 1);
  /* décocher Dataviz puis Chiffres clés : ils reviennent au gabarit, le texte reste à 80 % */
  await applyTo(page, { viz: false, figure: false });
  const v2 = await vizSizes(page);
  expect(v2.vizMin).toBeCloseTo(v0.vizMin, 2);
  expect(v2.viz).toBeCloseTo(v0.viz, 2);
  expect(v2.fig).toBeCloseTo(v0.fig, 2);
  expect(v2.body).toBeCloseTo(v1.body, 2);
  expect(v2.excluded).toBeGreaterThan(0);
  expect((await docTextSet(page)).skip).toEqual(['figure', 'viz']);
  /* la fenêtre des styles montre les mêmes cases */
  await pick(page, 'Paragraph styles');
  await expect(page.locator('dialog.tsd #tsdOn-viz')).not.toBeChecked();
  await expect(page.locator('dialog.tsd #tsdOn-text')).toBeChecked();
  await page.locator('dialog.tsd #tsdOn-viz').check();
  await page.waitForTimeout(300);
  expect((await vizSizes(page)).vizMin / v0.vizMin).toBeCloseTo(0.8, 1); // aperçu en direct
  await page.keyboard.press('Escape');
  await pick(page, 'Reset text settings');
  expect((await vizSizes(page)).viz).toBeCloseTo(v0.viz, 2);
  expect(errors).toEqual([]);
});

/* Phase 4 : contenu qui dépasse → « Gagner de la place » (espacement, interlignage, −5 %), « Ajuster pour tenir » ; annulables */
const longText = `const c = d.sections.flatMap((x) => x.subs).flatMap((x) => x.cols).find((x) => x.type === 'text');
  c.text += '\\n' + Array(2).fill('Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat.').join(' ');`;
const overflowing = (page) => page.evaluate(() => document.querySelectorAll('#warnings .ovf-save').length > 0);
test('gagner de la place et ajuster pour tenir', async ({ page }) => {
  const errors = watchErrors(page);
  await load(page, longText);
  expect(await overflowing(page)).toBe(true);
  const save = page.locator('#warnings .ovf-save button', { hasText: 'Save space' });
  await save.click();
  await page.waitForTimeout(400);
  let d = await page.evaluate(() => JSON.parse(localStorage.getItem('factsheet-creator-v1')));
  expect(d.density).toBe('tight');
  if (await overflowing(page)) {
    await save.click();
    await page.waitForTimeout(400);
    d = await page.evaluate(() => JSON.parse(localStorage.getItem('factsheet-creator-v1')));
    expect(d.textSet.lead).toBe(-1);
  }
  /* annuler les gestes, puis « Ajuster pour tenir » depuis l'alerte */
  await page.keyboard.press('Control+z');
  await page.keyboard.press('Control+z');
  await page.waitForTimeout(400);
  expect(await overflowing(page)).toBe(true);
  await page.locator('#warnings .ovf-save button', { hasText: 'Fit text to page' }).click();
  await page.waitForTimeout(500);
  d = await page.evaluate(() => JSON.parse(localStorage.getItem('factsheet-creator-v1')));
  expect(d.textSet.scale).toBeLessThan(1);
  expect(d.textSet.scale).toBeGreaterThanOrEqual(0.8);
  expect(await overflowing(page)).toBe(false);
  await expect(page.locator('.fs-toast')).toContainText('Text fitted at');
  /* la taille trouvée est la plus grande : un cran au-dessus dépasse */
  await pick(page, 'Larger text');
  expect(await overflowing(page)).toBe(true);
  expect(errors).toEqual([]);
});

test('ajuster pour tenir : un document qui tient revient à 100 %', async ({ page }) => {
  const errors = watchErrors(page);
  await load(page, `d.textSet = { scale: 0.85 };`);
  await pick(page, 'Fit to page');
  await page.waitForTimeout(400);
  const d = await page.evaluate(() => JSON.parse(localStorage.getItem('factsheet-creator-v1')));
  expect(d.textSet.scale).toBe(1);
  /* la fenêtre : même calcul sur le brouillon */
  await pick(page, 'Smaller text');
  await pick(page, 'Paragraph styles');
  await page.locator('dialog.tsd .tsd-fit').click();
  await expect(page.locator('dialog.tsd input[aria-label="Size of all text (%)"]')).toHaveValue('100');
  await page.keyboard.press('Escape');
  expect(errors).toEqual([]);
});
