const { test, expect } = require('@playwright/test');
const { openApp, watchErrors } = require('./helpers');

/* Panneau de l'éditeur de dataviz (onglet Visualisation) : le panneau dit la vérité, Échap ne fait pas perdre le travail,
   le clavier reste dans l'éditeur. Audit : docs/audit-sidebar-dataviz.md (lot 1). */

async function openEditor(page) {
  await page
    .locator('#tree .col-row', { hasText: /Dataviz/ })
    .first()
    .click();
  const open = page.locator('#props button.primary').first();
  if (!(await open.count())) {
    const chev = page.locator('#props .pp-chev').first();
    if ((await chev.getAttribute('aria-expanded')) === 'false') await chev.click();
  }
  await open.click();
  await expect(page.locator('.ve-bar')).toBeVisible();
  await page.locator('.ve-tab[data-tab=viz]').click();
}
async function pickType(page, label) {
  await page.locator('.ve-typecard .pp-card-h').click();
  await page.locator('.ve-typeopt', { hasText: label }).first().click();
}
/** libellé (traduit) → valeur affichée, pour toutes les listes du panneau (liste, segmenté ou curseur à crans ; cartes toutes ouvertes par la recherche) */
async function shownSelects(page) {
  await page.locator('.ve-form .pp-q').fill(' ');
  const out = await page.$$eval('.ve-form .f', (n) =>
    Object.fromEntries(
      n
        .map((f) => {
          const label = f.querySelector('.hint label, .hint > span, .hint');
          const sel = f.querySelector('select'),
            on = f.querySelector('.seg button.on'),
            val = f.querySelector('output.pp-val');
          const v = sel ? sel.options[sel.selectedIndex].text : on ? on.textContent : val ? val.textContent : null;
          return v == null ? null : [label.textContent, v];
        })
        .filter(Boolean),
    ),
  );
  await page.locator('.ve-form .pp-q').fill('');
  return out;
}

test.describe('sidebar de l’éditeur de dataviz', () => {
  let errors;
  test.beforeEach(async ({ page }) => {
    errors = watchErrors(page);
    await openApp(page, 'default');
    await openEditor(page);
  });
  test.afterEach(() => expect(errors).toEqual([]));

  test('les listes affichent la valeur que le dessin applique', async ({ page }) => {
    await pickType(page, /^Bars \(/);
    const bars = await shownSelects(page);
    expect(bars['Bar thickness']).toBe('Normal');
    expect(bars['Space between bar groups']).toBe('Normal');
    expect(bars['Space between bars of the same group']).toBe('Normal');
    await pickType(page, /^Horizontal bars/);
    const hb = await shownSelects(page);
    expect(hb['Bar thickness']).toBe('Normal');
    expect(hb['Space between rows']).toBe('Normal');
    expect(hb['Space between bars of the same row']).toBe('Normal');
    await pickType(page, /^Donut/);
    expect((await shownSelects(page))['Text line spacing']).toBe('Normal (18 px)');
  });

  test('un clic sur le libellé met le focus dans le champ', async ({ page }) => {
    await pickType(page, /^Donut/);
    await page.locator('.ve-form .pp-q').fill(' ');
    await page.locator('.ve-form .f label', { hasText: 'Largest segment angle' }).click();
    expect(await page.evaluate(() => document.activeElement.tagName)).toBe('INPUT');
  });

  test('Échap : vide la recherche, confirme avant d’abandonner, ne ferme pas une modale par erreur', async ({ page }) => {
    await pickType(page, /^Bars \(/); // une modification
    const q = page.locator('.ve-form .pp-q');
    await q.fill('legend');
    await q.press('Escape');
    await expect(q).toHaveValue('');
    await expect(page.locator('.ve-bar')).toBeVisible();
    await page.locator('.ve-form .pp-chev').first().focus();
    await page.keyboard.press('Escape');
    await expect(page.locator('dialog[open]')).toBeVisible(); // confirmation
    await page.keyboard.press('Escape'); // referme la modale seulement
    await expect(page.locator('dialog[open]')).toHaveCount(0);
    await expect(page.locator('.ve-bar')).toBeVisible();
    await page.keyboard.press('Escape');
    await page.locator('dialog[open] button.primary').click();
    await expect(page.locator('.ve-bar')).toHaveCount(0);
  });

  test('Échap sans modification ferme directement', async ({ page }) => {
    await page.locator('.ve-form .pp-chev').first().focus();
    await page.keyboard.press('Escape');
    await expect(page.locator('.ve-bar')).toHaveCount(0);
  });

  test('le focus reste dans l’éditeur (Tab boucle) et les cartes ont un nom', async ({ page }) => {
    await expect(page.locator('.ve')).toHaveAttribute('role', 'dialog');
    await page.locator('.ve-form .pp-q').focus();
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press('Tab');
      expect(await page.evaluate(() => !!document.activeElement.closest('.ve'))).toBe(true);
    }
    const names = await page.$$eval('.ve-form .pp-chev', (n) => n.map((x) => x.getAttribute('aria-label')));
    expect(new Set(names).size).toBe(names.length);
    expect(await page.$$eval('.ve-tab', (n) => n.map((x) => x.getAttribute('role')))).toEqual(['tab', 'tab']);
  });

  test('recherche sans résultat : message et bouton pour effacer', async ({ page }) => {
    await page.locator('.ve-form .pp-q').fill('zzzz');
    await expect(page.locator('.ve-form .pp-empty')).toContainText('zzzz');
    await page.locator('.ve-form .pp-empty button').click();
    await expect(page.locator('.ve-form .pp-q')).toHaveValue('');
    await expect(page.locator('.ve-form .pp-empty')).toHaveCount(0);
  });
});

/* Squelette fixe de 10 cartes (lot 2 de l'audit) : chaque champ de chaque type est rangé explicitement. */
test.describe('squelette de cartes', () => {
  test.beforeEach(async ({ page }) => {
    await openApp(page, 'default');
    await openEditor(page);
  });
  test('tout champ de tous les types a un « g » valide', async ({ page }) => {
    await page.goto('/factsheet/tests/blank.html');
    await page.addScriptTag({ url: '/factsheet/tests/entry.bundle.js' });
    const bad = await page.evaluate(() => {
      const { VIZ_TYPES, groupOf, VALID_G } = window.FSTEST;
      const out = [];
      for (const [kind, ty] of Object.entries(VIZ_TYPES))
        for (const f of ty.fields || []) if (!VALID_G.includes(groupOf(f))) out.push(`${kind}.${f.k || f.t}`);
      return out;
    });
    expect(bad).toEqual([]);
  });

  test('cartes dans l’ordre fixe, Structure ouverte, « Options » et « Évolution » disparues', async ({ page }) => {
    await pickType(page, /^Bars \(/);
    const names = () => page.$$eval('.ve-form .pp-card-h b', (n) => n.map((x) => x.textContent));
    expect(await names()).toEqual([
      'Type · Bars (overlapping, grouped, stacked)',
      'Title and source',
      'Structure',
      'Dimensions',
      'Labels',
      'Colours',
      'Bracket and link',
      'Figure beside',
      'Advanced settings',
    ]);
    await expect(page.locator('.ve-form .pp-card', { hasText: /^Structure/ }).locator('.pp-body')).toBeVisible();
    await pickType(page, /^Line/); // pas de Dimensions ni d'accolade : masquées, l'ordre ne change pas
    const line = await names();
    expect(line.filter((n) => /^(Options|Trend)$/.test(n))).toEqual([]);
    expect(line.indexOf('Structure')).toBeLessThan(line.indexOf('Labels'));
    expect(line.indexOf('Figure beside')).toBeGreaterThan(line.indexOf('Colours'));
  });
});

/* Dépendances entre champs (lot 3 de l'audit) : un enfant se grise (avec sa phrase) ou se masque sur place, sans reconstruire le panneau. */
test.describe('dépendances entre champs', () => {
  let errors;
  test.beforeEach(async ({ page }) => {
    errors = watchErrors(page);
    await openApp(page, 'default');
    await openEditor(page);
    await page.locator('.ve-form .pp-q').fill(' '); // ouvre toutes les cartes
  });
  test.afterEach(() => expect(errors).toEqual([]));

  test('légende éteinte : la position est grisée avec sa phrase, le focus reste sur l’interrupteur', async ({ page }) => {
    await pickType(page, /^Bars \(/);
    await page.locator('.ve-form .pp-q').fill(' ');
    const sw = page.locator('.ve-form .pp-switchrow', { hasText: /^Show legend/ }).locator('button[role=switch]');
    const pos = page.locator('.ve-form .f', { hasText: 'Legend position' });
    await expect(pos).not.toHaveAttribute('aria-disabled', 'true');
    await sw.focus();
    await page.keyboard.press('Space');
    await expect(sw).toHaveAttribute('aria-checked', 'false');
    await expect(pos).toHaveAttribute('aria-disabled', 'true');
    await expect(page.locator('.ve-form .dep-why', { hasText: 'Turn on “Show legend”' })).toBeVisible();
    expect(await sw.evaluate((n) => n === document.activeElement)).toBe(true); // pas de reconstruction du panneau
    const opacity = await pos.evaluate((n) => getComputedStyle(n).opacity);
    expect(opacity).toBe('0.55');
    // reste focalisable en lecture, mais ne change plus
    const on = pos.locator('.seg button.on');
    await expect(on).toHaveText('Bottom');
    await on.focus();
    expect(await on.evaluate((n) => n === document.activeElement)).toBe(true);
    await page.keyboard.press('ArrowRight');
    await expect(on).toHaveText('Bottom');
    await sw.focus();
    await page.keyboard.press('Space');
    await expect(pos).not.toHaveAttribute('aria-disabled', 'true');
  });

  test('anneau : l’orientation masque ou affiche le bon angle', async ({ page }) => {
    await pickType(page, /^Donut/);
    await page.locator('.ve-form .pp-q').fill(' ');
    const largest = page.locator('.ve-form .f', { hasText: 'Largest segment angle' });
    const start = page.locator('.ve-form .f', { hasText: 'Start angle of the 1st segment' });
    await expect(largest).toBeVisible();
    await expect(start).toBeHidden();
    await page.locator('.ve-form .f', { hasText: 'Ring orientation' }).locator('select').selectOption('manual');
    await expect(largest).toBeHidden();
    await expect(start).toBeVisible();
    await page.locator('.ve-form .f', { hasText: 'Ring orientation' }).locator('select').selectOption('first');
    await expect(largest).toBeHidden();
    await expect(start).toBeHidden();
  });

  test('« Chiffre à côté : Aucun » masque ses réglages', async ({ page }) => {
    await pickType(page, /^Bars \(/);
    await page.locator('.ve-form .pp-q').fill(' ');
    const card = page.locator('.ve-form .pp-card', { has: page.locator('b', { hasText: /^Figure beside/ }) });
    const width = card.locator('.f', { hasText: 'Content width' });
    const size = card.locator('.f', { hasText: 'Figure size' });
    await expect(size).toBeHidden();
    await expect(width).toBeHidden();
    await card.locator('select').first().selectOption('right');
    await expect(size).toBeVisible();
    await expect(width).toBeVisible();
    await card.locator('select').first().selectOption('top');
    await expect(size).toBeVisible();
    await expect(width).toBeHidden();
    await card.locator('select').first().selectOption('none');
    await expect(size).toBeHidden();
  });
});

/* Contrôles (lot 4 de l'audit) */
test.describe('contrôles', () => {
  test.beforeEach(async ({ page }) => {
    await openApp(page, 'default');
    await openEditor(page);
    await pickType(page, /^Donut/);
    await page.locator('.ve-form .pp-q').fill(' ');
  });
  test('interrupteur, segmenté, curseur éditable et ↺', async ({ page }) => {
    const form = page.locator('.ve-form');
    // décimales : segmenté 0–4, flèche droite choisit et garde le focus
    const dec = form.locator('.f', { hasText: 'Total decimals' });
    await dec.locator('button[role=radio]').first().focus();
    await page.keyboard.press('ArrowRight');
    await expect(dec.locator('button.on')).toHaveText('1');
    // angle : champ éditable relié au curseur, ↺ rétablit
    const ang = form.locator('.f', { hasText: 'Largest segment angle' });
    const num = ang.locator('input[type=number]');
    await num.fill('120');
    await expect(ang.locator('input[type=range]')).toHaveValue('120');
    const rst = ang.locator('.pp-reset');
    await expect(rst).not.toHaveAttribute('aria-disabled', 'true');
    await rst.click();
    await expect(num).toHaveValue('210');
    await expect(rst).toHaveAttribute('aria-disabled', 'true');
  });
});

/* Sous-sections (lot 5 de l'audit) : seulement dans les cartes de 6 champs ou plus */
test.describe('sous-sections', () => {
  test.beforeEach(async ({ page }) => {
    await openApp(page, 'default');
    await openEditor(page);
  });
  const titles = (page, card) =>
    page.$$eval(
      '.ve-form .pp-card',
      (cs, c) => {
        const el = cs.find((x) => x.querySelector('.pp-card-h b').textContent === c);
        return el ? [...el.querySelectorAll('.pp-sub')].map((n) => n.textContent) : null;
      },
      card,
    );
  test('barres : Étiquettes en sous-sections, Dimensions sans titre', async ({ page }) => {
    await pickType(page, /^Bars \(/);
    await page.locator('.ve-form .pp-q').fill(' ');
    expect(await titles(page, 'Labels')).toEqual(['Caption', 'Values', 'Text in the bars', 'Numbers']);
    expect(await titles(page, 'Dimensions')).toEqual([]);
    await expect(page.locator('.ve-form .pp-sub').first()).not.toHaveAttribute('tabindex', /.*/);
  });
  test('anneau : Structure (champs + actions) en sous-sections', async ({ page }) => {
    await pickType(page, /^Donut/);
    await page.locator('.ve-form .pp-q').fill(' ');
    expect(await titles(page, 'Structure')).toEqual(['Shape', 'Orientation', 'Position']);
  });
  test('la recherche masque les sous-sections sans résultat', async ({ page }) => {
    await pickType(page, /^Bars \(/);
    await page.locator('.ve-form .pp-q').fill('decimals');
    await expect(page.locator('.ve-form .pp-subgroup:visible .pp-sub')).toHaveText(['Numbers']);
  });
});

test('taille du chiffre : ordre logique Normal, Grand, Très grand', async ({ page }) => {
  await openApp(page, 'default');
  await openEditor(page);
  await pickType(page, /^Bars \(/);
  await page.locator('.ve-form .pp-q').fill(' ');
  const f = page.locator('.ve-form .f', { hasText: 'Figure size' });
  expect(await f.locator('button[role=radio]').allTextContents()).toEqual(['Normal', 'Large', 'Extra large']);
});
