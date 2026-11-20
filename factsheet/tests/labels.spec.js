/* Libellés des barres jamais coupés ni réduits (passage à la ligne, Maj + Entrée) et niveaux de hiérarchie du tableau. */
const { test, expect } = require('@playwright/test');
const { watchErrors } = require('./helpers');

test.beforeEach(async ({ page }) => {
  await page.goto('/factsheet/tests/blank.html');
  await page.evaluate(() => document.fonts.ready);
});

const LONG = 'European Competitiveness Fund for strategic investments';

for (const kind of ['bars', 'hbars']) {
  test(`${kind} : libellé long sur plusieurs lignes, même corps, sans ellipse ; retour saisi respecté`, async ({ page }) => {
    const errors = watchErrors(page);
    const out = await page.evaluate(
      ([kind, LONG]) => {
        const t = window.FSTEST.VIZ_TYPES[kind],
          o = t.defaults();
        o.rows = [
          { label: LONG, v: [50] },
          { label: 'Short', v: [30] },
          { label: 'One\ntwo', v: [20] },
        ];
        const svg = t.render(o, 480, {}).node;
        const texts = [...svg.querySelectorAll('text')].filter((n) => n.hasAttribute('font-size') && /[A-Za-z]/.test(n.textContent));
        return { all: texts.map((n) => n.textContent), sizes: [...new Set(texts.map((n) => n.getAttribute('font-size')))] };
      },
      [kind, LONG],
    );
    expect(out.all.join(' ')).not.toContain('…');
    expect(out.sizes).toHaveLength(1); // tous les libellés au même corps
    expect(out.all.filter((x) => LONG.includes(x)).length).toBeGreaterThan(1); // libellé long : plusieurs lignes
    expect(out.all.filter((x) => LONG.includes(x)).join(' ')).toBe(LONG);
    expect(out.all).toContain('One');
    expect(out.all).toContain('two');
    expect(errors).toEqual([]);
  });
}

test('hbars : la largeur des libellés (nameWidth) déplace le début des barres', async ({ page }) => {
  const x = await page.evaluate(() => {
    const t = window.FSTEST.VIZ_TYPES.hbars,
      at = (nw) => {
        const o = t.defaults();
        o.nameWidth = nw;
        const svg = t.render(o, 400, {}).node;
        return Math.round(
          +svg
            .querySelector('path')
            .getAttribute('d')
            .match(/^M([\d.]+)/)[1],
        );
      };
    return [at('auto'), at('50')];
  });
  expect(x[1]).toBe(200);
  expect(x[0]).toBeLessThan(200);
});

test('tableau : niveaux 1 à 4 (style et retrait), aller-retour par repairTable', async ({ page }) => {
  const out = await page.evaluate(() => {
    const T = window.FSTEST.table,
      tb = T.newTable(5, 1, 0);
    tb.cells.forEach((cl, i) => i && T.setLevel(cl, i));
    const lv = tb.cells.map((cl) => T.levelOf(cl));
    const kept = T.repairTable(JSON.parse(JSON.stringify(tb))).cells.map((cl) => [cl.st || 'body', cl.ind || 0]);
    const bad = T.repairTable({ ...JSON.parse(JSON.stringify(tb)), cells: tb.cells.map((cl) => ({ ...cl, ind: 9 })) });
    return { lv, kept, badInd: bad.cells.some((cl) => cl.ind) };
  });
  expect(out.lv).toEqual([2, 1, 2, 3, 4]);
  expect(out.kept).toEqual([
    ['body', 0],
    ['bold', 0],
    ['body', 0],
    ['small', 0],
    ['small', 1],
  ]);
  expect(out.badInd).toBe(false);
});
