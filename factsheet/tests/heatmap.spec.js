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

test('changer de type garde les données : retour au type d’origine, données partagées, stash migré', async ({ page }) => {
  await page.goto('/factsheet/tests/blank.html');
  const r = await page.evaluate(() => {
    const { newViz, switchKind, migrate, defaultDoc } = window.FSTEST;
    const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    const hm = newViz('heatmap');
    hm.opts.rows = [
      { label: 'Heading 1', v: [820, 1025, 25.1, null] },
      { label: 'Agriculture', v: [282.5, null, 4, 261] },
    ];
    hm.opts.series[3].name = 'Accord';
    hm.head.title = 'Titre';
    const orig = JSON.parse(JSON.stringify(hm.opts));

    // 1. type de même forme (barres) puis retour : réglages et cellules vides intacts
    const bars = switchKind(hm, 'bars');
    const back = switchKind(bars, 'heatmap');
    // 2. type de forme différente (anneau) puis retour
    const donut = switchKind(hm, 'donut');
    const back2 = switchKind(donut, 'heatmap');
    // 3. une donnée modifiée entre-temps dans l'autre type suit au retour
    const bars3 = switchKind(hm, 'bars');
    bars3.opts.rows[0].v[1] = 5;
    const back3 = switchKind(bars3, 'heatmap');
    // 4. migrate : stash invalide écarté, stash valide gardé
    const doc = defaultDoc();
    const col = doc.sections.flatMap((s) => s.subs.flatMap((b) => b.cols)).find((c) => c.viz);
    col.viz = { ...col.viz, stash: { heatmap: { rows: [] }, nope: { a: 1 }, bars: 'x' } };
    const m = migrate(JSON.parse(JSON.stringify(doc)));
    const mc = m.sections.flatMap((s) => s.subs.flatMap((b) => b.cols)).find((c) => c.viz);
    return {
      barsData: bars.opts.rows.length,
      barsStash: Object.keys(bars.stash || {}),
      backSame: same(back.opts, orig),
      backStash: Object.keys(back.stash || {}),
      backHead: back.head.title,
      back2Same: same(back2.opts, orig),
      noSharedRef: bars.opts.rows !== hm.opts.rows,
      origUntouched: same(hm.opts, orig),
      edited: back3.opts.rows[0].v[1],
      editedNull: back3.opts.rows[1].v[1],
      stashKeys: Object.keys(mc.viz.stash || {}),
    };
  });
  expect(r.barsData).toBe(2);
  expect(r.barsStash).toEqual(['heatmap']);
  expect(r.backSame).toBe(true);
  expect(r.backStash).toEqual(['bars']); // les barres quittées sont à leur tour rangées
  expect(r.backHead).toBe('Titre');
  expect(r.back2Same).toBe(true);
  expect(r.noSharedRef).toBe(true);
  expect(r.origUntouched).toBe(true);
  expect(r.edited).toBe(5);
  expect(r.editedNull).toBeNull();
  expect(r.stashKeys).toEqual(['heatmap']);
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
  // légende en barre de classes (en bas par défaut) et note automatique
  await expect(stage.locator('g.lg')).toHaveCount(1);
  await expect(stage.locator('g.lg text', { hasText: 'Full colour = largest gap' })).toHaveCount(1);
  // clic sur une case : la couleur de sa classe (baisse = « color »)
  const down = stage.locator('path.hm-cell[data-color="color"]').first();
  await down.click({ force: true });
  await expect(page.locator('.cpop')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.locator('.cpop').evaluateAll((n) => n.forEach((x) => x.remove()));
  // légende en haut, sans note
  await page.locator('.ve-form .pp-q').fill(' ');
  await page.locator('.ve-form .f', { hasText: 'Legend position' }).locator('button', { hasText: 'Top' }).click();
  expect(await stage.locator('g.lg').getAttribute('transform')).toContain('translate(0 -');
  await page.locator('.ve-form .pp-switchrow', { hasText: 'Note under the legend' }).locator('button[role=switch]').click();
  await expect(stage.locator('g.lg text', { hasText: 'Full colour' })).toHaveCount(0);
  await page.screenshot({ path: test.info().outputPath('heatmap-top.png') });
  await page.locator('.ve-form .pp-q').fill('');
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

test('légende en barre de classes et note', async ({ page }) => {
  await page.goto('/factsheet/tests/blank.html');
  const r = await page.evaluate(() => {
    const { heatLegend, VIZ_TYPES, renderDocument } = window.FSTEST;
    const o = VIZ_TYPES.heatmap.defaults();
    const a = heatLegend(o, 'fr-FR');
    const prev = heatLegend({ ...o, compareTo: 'prev', suffix: ' bn' }, 'fr-FR');
    const three = heatLegend({ ...o, classes: '3' }, 'fr-FR');
    const custom = heatLegend({ ...o, legendNoteText: 'Ma note' }, 'fr-FR');
    const fixed = heatLegend({ ...o, scaleMax: 1000 }, 'fr-FR');
    const value = heatLegend({ ...o, colorBy: 'value' }, 'fr-FR');
    // un seul sens : toutes les valeurs montent
    const up = heatLegend({ ...o, rows: [{ label: 'A', v: [10, 12, 15, null] }] }, 'fr-FR');
    const empty = heatLegend({ ...o, rows: [{ label: 'A', v: [null, null, null, null] }] }, 'fr-FR');
    return { a, prev, three: three.labels, customNote: custom.note, fixed: fixed.note, value, up: up.note, empty };
  });
  expect(r.a.cells).toHaveLength(7);
  expect(r.a.labels).toHaveLength(8);
  expect(r.a.cells[3].color).toBe('grey'); // classe centrale, gris neutre
  expect(r.a.cells[0].alpha).toBe(1);
  expect(r.a.cells[0].path).toBe('color');
  expect(r.a.cells[6].path).toBe('color2');
  expect(r.a.labels[0]).toMatch(/^−/);
  expect(r.a.labels[7]).toMatch(/^\+/);
  expect(r.a.note).toContain('largest gap in the table');
  expect(r.prev.note).toContain('bn)');
  expect(r.three).toHaveLength(4);
  expect(r.customNote).toBe('Ma note');
  expect(r.fixed).toContain('fixed maximum');
  expect(r.value.cells).toHaveLength(7);
  expect(r.value.labels[0]).not.toMatch(/^[+−]/);
  expect(r.up).toContain('No decrease in the data.');
  expect(r.empty).toBeNull();
});

test('légende rendue en colonne étroite et pleine largeur, en haut ou en bas', async ({ page }) => {
  await page.goto('/factsheet/tests/blank.html');
  const r = await page.evaluate(() => {
    const { VIZ_TYPES } = window.FSTEST;
    const out = {};
    for (const W of [200, 600]) {
      for (const pos of ['bottom', 'top']) {
        const o = { ...VIZ_TYPES.heatmap.defaults(), legendPos: pos };
        const res = VIZ_TYPES.heatmap.render(o, W, { locale: 'fr-FR', ui: true });
        const host = document.createElement('div');
        host.append(res.node);
        document.body.append(host);
        const lg = res.node.querySelector('g.lg');
        const texts = [...lg.querySelectorAll('text')].map((t) => t.textContent);
        out[`${W}-${pos}`] = {
          cells: lg.querySelectorAll('path[data-color]').length,
          texts: texts.length,
          lgY: +lg.dataset.y,
          h: +res.node.getAttribute('height'),
          reserve: +lg.dataset.reserve,
          cellsClickable: res.node.querySelectorAll('path.hm-cell[data-color]').length,
        };
        host.remove();
      }
    }
    return out;
  });
  for (const k of Object.keys(r)) {
    expect(r[k].cells).toBe(6); // 7 classes dont la centrale (grise, non modifiable)
    expect(r[k].cellsClickable).toBeGreaterThan(0);
    expect(r[k].lgY + r[k].reserve).toBeLessThanOrEqual(r[k].h + 6);
  }
  expect(r['600-bottom'].texts).toBeGreaterThan(r['200-bottom'].texts - 1); // étroit : libellés aux extrémités seulement, la note peut passer à la ligne
});
