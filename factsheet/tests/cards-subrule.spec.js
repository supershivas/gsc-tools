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
  /* accordéon : « Éléments de la carte » ouverte, « Contenu » se replie ; on y revient pour lire les champs */
  const openCard = (name) => props.locator('.pp-card-h', { hasText: name }).click();
  const part = (name) => props.locator('.pp-switchrow', { hasText: new RegExp(`^${name}`) }).locator('[role=switch]');
  await openCard('Card elements');
  await expect(part('Label')).toHaveAttribute('aria-checked', 'true');
  await part('Label').click();
  await openCard('Content');
  expect(await labels()).not.toContain('Label');
  expect(await labels()).toContain('Title');
  await openCard('Card elements');
  await part('Label').click();
  await openCard('Content');
  expect(await labels()).toContain('Label');
  expect(errors).toEqual([]);
});

const COL = (path) => `#stage .page:not(.ovf-clone) [data-sel="${path}"]`;
const colOf = (page, si, bi, ci) =>
  page.evaluate(([si, bi, ci]) => JSON.parse(localStorage.getItem('factsheet-creator-v1')).sections[si].subs[bi].cols[ci], [si, bi, ci]);
const setType = async (page, name) => {
  await page.locator('#props .pp-body .f').first().locator('button').first().click();
  await page.getByText(name, { exact: true }).last().click();
};

test('changer de type garde le contenu de chaque type ; saisir dans une carte quitte le mode automatique', async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page, 'default');
  await page.locator(COL('col:0:1:0')).click({ position: { x: 12, y: 12 } });
  const text = (await colOf(page, 0, 1, 0)).text;
  expect(text.length).toBeGreaterThan(20);
  await setType(page, 'Card');
  await expect.poll(async () => (await colOf(page, 0, 1, 0)).type).toBe('card');
  let col = await colOf(page, 0, 1, 0);
  expect(col.text).toBe(text);
  expect(col.card.auto).toBe(true);
  const title = page.locator('#props [data-fk="title"] .re');
  await title.click();
  await page.keyboard.type(' 42');
  await expect.poll(async () => (await colOf(page, 0, 1, 0)).card.auto).toBe(false);
  await setType(page, 'Text');
  await expect.poll(async () => (await colOf(page, 0, 1, 0)).type).toBe('text');
  col = await colOf(page, 0, 1, 0);
  expect(col.text).toBe(text);
  await setType(page, 'Card');
  await expect.poll(async () => (await colOf(page, 0, 1, 0)).type).toBe('card');
  expect((await colOf(page, 0, 1, 0)).card.content.title).toMatch(/ 42$/);
  expect(errors).toEqual([]);
});

test('carte : flèche du lien en SVG, lien réel avec une adresse, jamais d’image d’exemple dans le document', async ({ page }) => {
  await page.goto('/factsheet/tests/blank.html');
  const r = await page.evaluate(() => {
    const F = window.FSTEST;
    const d = F.defaultDoc();
    const col = F.newCol('card');
    Object.assign(col.card, { auto: false, image: true, link: true, src: null, stroke: false, fillColor: 'yellow' });
    col.card.content.url = 'https://example.org/a';
    const plain = F.newCol('card');
    Object.assign(plain.card, { auto: false, image: false, link: true });
    plain.card.content.url = 'javascript:alert(1)';
    const sub = F.newSub('1-1');
    sub.cols = [col, plain];
    d.sections[0].subs = [sub];
    const host = document.createElement('div');
    document.body.append(host);
    F.renderDocument(F.migrate(d)).pages.forEach((p) => host.append(p.el));
    const [a, b] = host.querySelectorAll('.card');
    return {
      arrow: !!a.querySelector('.card-link svg path') && !a.querySelector('.card-link .ti'),
      href: a.querySelector('.card-link a')?.getAttribute('href'),
      unsafe: !!b.querySelector('.card-link a'),
      img: a.querySelectorAll('.card-img img').length,
      empty: a.querySelectorAll('.card-img-empty').length,
      filled: a.classList.contains('filled') && !a.classList.contains('stroked'),
    };
  });
  expect(r).toEqual({ arrow: true, href: 'https://example.org/a', unsafe: false, img: 0, empty: 1, filled: true });
});

test('double-clic sur une carte ou un chiffre clé : le curseur va dans le champ visé', async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page, 'default');
  const where = () => page.evaluate(() => (document.activeElement.closest('[data-fk]') || { dataset: {} }).dataset.fk || '');
  await page.locator(COL('col:0:1:1') + ' .card-title').dblclick();
  await expect.poll(where).toBe('title');
  await page.locator(COL('col:0:0:1') + ' .vf-text').dblclick();
  await expect.poll(where).toBe('text');
  await page.locator(COL('col:0:0:1') + ' .vf-value').dblclick();
  await expect.poll(where).toBe('value');
  await expect(page.locator('#props .fmt button.on')).toHaveCount(0); // le bouton Gras ne reflète pas un texte sélectionné ailleurs
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
