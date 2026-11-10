const { test, expect } = require('@playwright/test');
const { openApp, watchErrors, addBundle, DOC_KEY } = require('./helpers');

/* Heatmap (lot 3a de l'audit des options) : calculs des écarts et des classes, rendu des cases (référence, en attente), export PDF. */

test('calculs : écarts, classes divergentes, référence et case en attente', async ({ page }) => {
  await page.goto('/factsheet/tests/blank.html');
  const r = await page.evaluate(() => {
    const { heatCells, VIZ_TYPES } = window.FSTEST;
    const o = VIZ_TYPES.heatmap.defaults();
    const a = heatCells(o);
    const p = heatCells({ ...o, compareTo: 'prev' }); // le modèle : chaque colonne comparée à la précédente
    const none = heatCells({ ...o, refCol: 'none' });
    const pct = heatCells({ ...o, colorBy: 'pct', classes: '3' });
    const fixed = heatCells({ ...o, scaleMax: 1000 });
    return {
      ref: a.ref,
      mode: a.mode,
      kinds: a.cells[0].map((c) => c.kind),
      delta: +a.cells[0][1].delta.toFixed(1),
      pct: +a.cells[0][1].pct.toFixed(1),
      strongestRef: a.cells[0][2].cls,
      prevDelta: +p.cells[0][2].delta.toFixed(1),
      strongest: p.cells[0][1].cls,
      strongestAlpha: p.cells[0][1].alpha,
      pale: p.cells[0][2].cls,
      fills: [p.cells[0][1].fill, p.cells[1][2].fill, p.cells[2][1].fill],
      noneMode: none.mode,
      noneDelta: none.cells[0][1].delta,
      pctClasses: pct.cells.flat().map((c) => c.cls ?? null),
      fixedMax: Math.max(...fixed.cells.flat().map((c) => Math.abs(c.cls || 0))),
    };
  });
  expect(r.ref).toBe(0);
  expect(r.mode).toBe('abs');
  expect(r.kinds).toEqual(['ref', 'val', 'val', 'pending']);
  expect(r.delta).toBe(-26.7);
  expect(r.pct).toBe(-3.3);
  expect(r.strongestRef).toBe(-3); // −32,2 face à la référence
  expect(r.prevDelta).toBe(-5.5);
  expect(r.strongest).toBe(-3); // plus grand écart du tableau = teinte la plus forte
  expect(r.strongestAlpha).toBe(1);
  expect(r.pale).toBe(-1); // −5,5 : teinte pâle
  expect(r.fills).toEqual(['yellow', 'blue', 'grey']); // baisse, hausse, écart presque nul (gris neutre)
  expect(r.noneMode).toBe('value'); // sans référence : couleur selon la valeur, pas d'écart
  expect(r.noneDelta).toBeNull();
  expect(r.pctClasses.every((k) => k === null || Math.abs(k) <= 1)).toBe(true); // 3 classes : −1, 0, 1
  expect(r.fixedMax).toBeLessThan(3); // maximum de l'échelle fixé plus haut : teintes plus pâles
});

test('rendu dans l’éditeur et export PDF', async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page, 'default');
  // la première dataviz de la fiche par défaut devient une heatmap neuve (données d'exemple du type)
  await page.evaluate((key) => {
    const doc = JSON.parse(localStorage.getItem(key));
    const col = doc.sections.flatMap((s) => s.subs.flatMap((b) => b.cols)).find((c) => c.viz);
    col.viz = { kind: 'heatmap', opts: null, head: { title: '', source: '' }, side: { pos: 'none' } };
    localStorage.setItem(key, JSON.stringify(doc));
  }, DOC_KEY);
  await page.reload();
  await page.waitForSelector('#stage .page');
  await page
    .locator('#tree .col-row', { hasText: /Dataviz/ })
    .first()
    .click();
  const open = page.locator('#props button.primary').first();
  if (!(await open.count())) await page.locator('#props .pp-chev').first().click();
  await open.click();
  await expect(page.locator('.ve-bar')).toBeVisible();
  await page.locator('.ve-tab[data-tab=viz]').click();
  const stage = page.locator('#ve-stage svg');
  await expect(stage.locator('path.hm-ref')).toHaveCount(4);
  await expect(stage.locator('path.hm-cell')).toHaveCount(8);
  await expect(stage.locator('path.hm-pending')).toHaveCount(4);
  expect(await stage.locator('path.hm-pending').first().getAttribute('stroke-dasharray')).toBe('3 2');
  expect(await stage.locator('path.hm-pending').first().getAttribute('fill')).toBe('none');
  await expect(stage.locator('text', { hasText: /^reference$/ })).toHaveCount(4);
  await expect(stage.locator('text', { hasText: /^pending$/ })).toHaveCount(4);
  await expect(stage.locator('text', { hasText: '−26.7' })).toHaveCount(1);
  await expect(stage.locator('text', { hasText: '−3.3%' })).toHaveCount(1);
  await expect(stage.locator('[data-reorder^="rows:"]')).toHaveCount(4);
  await page.screenshot({ path: test.info().outputPath('heatmap.png') });
  // coins droits, sans écart en % : le dessin suit
  await page.locator('.ve-form .pp-q').fill(' ');
  await page.locator('.ve-form .pp-switchrow', { hasText: 'Gap in %' }).locator('button[role=switch]').click();
  await expect(stage.locator('text', { hasText: '−3.3%' })).toHaveCount(0);
  await page.locator('.ve-form .f', { hasText: 'Cell corners' }).locator('button', { hasText: 'Square' }).click();
  expect(await stage.locator('path.hm-cell').first().getAttribute('d')).not.toContain('A');
  await page.locator('.ve-form .pp-q').fill('');
  // enregistrer et exporter (PDF/X-1a : teintes aplaties ; PDF/X-4 : transparences gardées)
  await page.locator('.ve-bar button.primary').click();
  await expect(page.locator('.ve-bar')).toHaveCount(0);
  await page.waitForTimeout(300);
  await addBundle(page, 'pdfexport.js');
  const r = await page.evaluate(async (key) => {
    const doc = JSON.parse(localStorage.getItem(key));
    const viz = doc.sections.flatMap((s) => s.subs.flatMap((b) => b.cols)).find((c) => c.viz && c.viz.kind === 'heatmap').viz;
    const a = await window.FSPDF.build(doc, 'net', { profile: 'x1a' });
    const b = await window.FSPDF.build(doc, 'net', { profile: 'x4' });
    return { a: a.bytes.length, b: b.bytes.length, pending: viz.opts.rows[0].v[3], showPct: viz.opts.showPct, corners: viz.opts.corners };
  }, DOC_KEY);
  expect(r.a).toBeGreaterThan(1000);
  expect(r.b).toBeGreaterThan(1000);
  expect(r).toMatchObject({ pending: null, showPct: false, corners: 'square' });
  expect(errors).toEqual([]);
});
