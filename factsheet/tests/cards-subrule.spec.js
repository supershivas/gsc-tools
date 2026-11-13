const { test, expect } = require('@playwright/test');
const { openApp, watchErrors } = require('./helpers');

/* Cartes : plus d'option « Puces » (anciens fichiers migrés), une option décochée masque son champ ;
   sous-sections : espace avant/après le filet selon la densité. */

test('modèle : les puces d’une ancienne carte passent dans le texte', async ({ page }) => {
  await page.goto('/factsheet/tests/blank.html');
  const r = await page.evaluate(() => {
    const F = window.FSTEST;
    const d = F.defaultDoc();
    const sub = F.newSub('1');
    const col = { ...F.newCol('card') };
    col.card = {
      layout: 'vertical',
      title: true,
      text: true,
      bullets: true,
      content: { title: 'T', text: 'Intro', bullets: 'a\nb\n\nc' },
    };
    sub.cols = [col];
    d.sections[0].subs = [sub];
    const m = F.migrate(JSON.parse(JSON.stringify(d)));
    const c = m.sections[0].subs[0].cols[0].card;
    return { text: c.content.text, has: 'bullets' in c || 'bullets' in c.content };
  });
  expect(r.text).toBe('Intro\n- a\n- b\n- c');
  expect(r.has).toBe(false);
});

test('éditeur : pas de champ « Puces », une option décochée masque son champ de texte', async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page, 'ui');
  await page.locator('#stage .page:not(.ovf-clone) [data-sel="col:0:1:0"]').click();
  const props = page.locator('#props');
  const labels = () => props.locator('.f > .hint').allTextContents();
  const all = await labels();
  expect(all.join('|')).not.toMatch(/Bullet/i);
  expect(all).toContain('Title');
  expect(all).toContain('Label'); // étiquette : cochée par défaut pour cette largeur
  await props
    .locator('details.opts label.row', { hasText: /^Label$/ })
    .locator('input')
    .uncheck();
  await expect.poll(async () => (await labels()).includes('Label')).toBe(false);
  expect(await labels()).toContain('Title');
  await props
    .locator('details.opts label.row', { hasText: /^Label$/ })
    .locator('input')
    .check();
  await expect.poll(async () => (await labels()).includes('Label')).toBe(true);
  expect(errors).toEqual([]);
});

for (const [density, above, below, plain] of [
  ['tight', 12, 15, 15],
  ['normal', 15, 18, 18],
  ['loose', 18, 24, 24],
]) {
  test(`sous-sections, densité ${density} : ${above} px au-dessus du filet, ${below} px en dessous ; sans filet ${plain} px`, async ({
    page,
  }) => {
    await openApp(page, 'ui');
    const run = async (ruled) => {
      await page.evaluate(
        ([density, ruled]) => {
          const k = 'factsheet-creator-v1',
            d = JSON.parse(localStorage.getItem(k));
          d.density = density;
          d.sections[0].subRules = ruled;
          localStorage.setItem(k, JSON.stringify(d));
        },
        [density, ruled],
      );
      await page.reload();
      await page.waitForSelector('#stage .page');
      await page.waitForTimeout(500);
      return page.evaluate(() => {
        const sec = document.querySelector('#stage .page:not(.ovf-clone) .sec'),
          subs = [...sec.querySelectorAll(':scope > .sub, :scope > .sec-box > .sub')],
          a = subs[0].getBoundingClientRect(),
          b = subs[1].getBoundingClientRect(),
          rule = subs[1].querySelector('.sub-rule').getBoundingClientRect(),
          sc = a.width ? document.querySelector('#stage .page:not(.ovf-clone)').getBoundingClientRect().width / 794 : 1;
        return { gap: (b.top - a.bottom) / sc, above: (rule.top - a.bottom) / sc, below: (b.top - rule.top) / sc };
      });
    };
    const withRule = await run(true);
    expect(Math.round(withRule.above)).toBe(above);
    expect(Math.round(withRule.below)).toBe(below);
    const without = await run(false);
    expect(Math.round(without.gap)).toBe(plain);
  });
}

test('colonne « Vide » : place réservée, rien de dessiné, hauteur de la rangée, sélectionnable', async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page, 'ui');
  await page.evaluate(() => {
    const k = 'factsheet-creator-v1',
      d = JSON.parse(localStorage.getItem(k));
    d.sections[0].subs[1].cols[0] = { type: 'empty' };
    localStorage.setItem(k, JSON.stringify(d));
  });
  await page.reload();
  await page.waitForSelector('#stage .page');
  await page.waitForTimeout(500);
  const g = await page.evaluate(() => {
    const e = document.querySelector('#stage .page:not(.ovf-clone) [data-sel="col:0:1:0"]'),
      n = document.querySelector('#stage .page:not(.ovf-clone) [data-sel="col:0:1:1"]');
    return { text: e.textContent, kids: e.children.length, he: e.offsetHeight, hn: n.offsetHeight };
  });
  expect(g.text).toBe('');
  expect(g.kids).toBe(0);
  expect(g.he).toBe(g.hn); // pleine hauteur de la rangée
  await page.locator('#stage .page:not(.ovf-clone) [data-sel="col:0:1:0"]').click();
  await expect(page.locator('#props')).toContainText('Empty');
  expect(errors).toEqual([]);
});
