const { test, expect } = require('@playwright/test');
const { execFileSync, spawnSync } = require('child_process');
const fs = require('fs');
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
    const up = heatLegend({ ...o, rows: [{ label: 'A', v: [10, 12, 15, null] }] }, 'en-GB');
    // un seul sens : toutes les valeurs baissent (en %)
    const down = heatLegend({ ...o, colorBy: 'pct', rows: [{ label: 'A', v: [10, 8, 5, null] }] }, 'en-GB');
    const empty = heatLegend({ ...o, rows: [{ label: 'A', v: [null, null, null, null] }] }, 'fr-FR');
    return { a, prev, three: three.labels, customNote: custom.note, fixed: fixed.note, value, up, down, empty };
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
  // que des hausses : classe neutre + 3 classes de hausse, de 0 au maximum, sans rien sur les baisses
  expect(r.up.cells.map((c) => c.path || 'zero')).toEqual(['zero', 'color2', 'color2', 'color2']);
  expect(r.up.labels).toHaveLength(5);
  expect(r.up.labels[0]).toBe('0.0');
  expect(r.up.labels.slice(1).every((l) => l.startsWith('+'))).toBe(true);
  expect(r.up.note).not.toMatch(/decrease|increase/i);
  // que des baisses : 3 classes de baisse + classe neutre, du maximum à 0
  expect(r.down.cells.map((c) => c.path || 'zero')).toEqual(['color', 'color', 'color', 'zero']);
  expect(r.down.labels).toHaveLength(5);
  expect(r.down.labels[4]).toBe('0.0%');
  expect(r.down.labels.slice(0, 4).every((l) => l.startsWith('−'))).toBe(true);
  expect(r.down.note).not.toMatch(/decrease|increase/i);
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

/* ---------- Lot 2b : mise en forme des textes ---------- */
const LONG = 'Heading 1 – Competitiveness, prosperity and security: single market, research, innovation, digital and space';
test('textes : calculs inchangés, aspect d’origine sans les nouvelles clés, gras, retour à la ligne, ligne titre', async ({ page }) => {
  await page.goto('/factsheet/tests/blank.html');
  await page.evaluate(() => document.fonts.ready);
  const r = await page.evaluate((LONG) => {
    const { VIZ_TYPES, heatCells } = window.FSTEST;
    const o = VIZ_TYPES.heatmap.defaults();
    delete o.nameWrap;
    delete o.headWrap;
    o.rows[0].label = LONG;
    const draw = (opts, W = 460) => {
      const host = document.createElement('div');
      const res = VIZ_TYPES.heatmap.render(opts, W, { locale: 'en-GB' });
      host.append(res.node);
      document.body.append(host);
      const names = [...res.node.querySelectorAll('text.hm-name')].map((t) => ({
        txt: t.textContent,
        y: +t.getAttribute('y'),
        size: +t.getAttribute('font-size'),
        weight: t.getAttribute('font-weight'),
        right: t.getBBox().x + t.getBBox().width,
      }));
      const cells = [...res.node.querySelectorAll('path.hm-ref')].map((p) => {
        const b = p.getBBox();
        return { x: b.x, y: b.y, width: b.width, height: b.height };
      });
      const heads = [...res.node.querySelectorAll('svg > text:not(.hm-name)')].map((t) => ({
        txt: t.textContent,
        weight: t.getAttribute('font-weight'),
        size: +t.getAttribute('font-size'),
      }));
      const out = {
        names,
        cells,
        heads,
        bands: res.node.querySelectorAll('path.hm-band').length,
        h: +res.node.getAttribute('height'),
        html: res.node.outerHTML,
      };
      host.remove();
      return out;
    };
    const legacy = draw(o);
    const fmtRows = JSON.parse(JSON.stringify(o));
    fmtRows.rows[0].kind = 'heading';
    fmtRows.rows[3].kind = 'total';
    fmtRows.rows[1].fmt = { bold: true, size: 'small' };
    const wrapped = draw({ ...fmtRows, nameWrap: true });
    const wide = draw({ ...o, nameWrap: true, nameWidth: '50' });
    const heads = draw({
      ...o,
      headWrap: true,
      headBold: true,
      series: o.series.map((s, j) => ({ ...s, name: j === 1 ? 'A much longer column header that wraps' : s.name })),
    });
    const noHeads = draw({ ...o, series: o.series.map((s) => ({ ...s, name: '' })) });
    return {
      calcSame: JSON.stringify(heatCells(o)) === JSON.stringify(heatCells(fmtRows)),
      legacy,
      wrapped,
      wide,
      heads,
      noHeads,
    };
  }, LONG);
  expect(r.calcSame).toBe(true); // la mise en forme ne touche pas aux calculs
  // aspect d'origine : une ligne par nom, réduite, graisse des libellés de graphique ; lignes de même hauteur
  expect(r.legacy.names).toHaveLength(4);
  expect(r.legacy.names[0].size).toBeLessThan(r.legacy.names[1].size);
  expect(r.legacy.names.every((n) => n.weight === '600')).toBe(true);
  expect(new Set(r.legacy.cells.map((c) => Math.round(c.height))).size).toBe(1);
  expect(r.legacy.bands).toBe(0);
  // retour à la ligne : le long nom tient sur plusieurs lignes à sa taille, la ligne grandit, les autres se partagent le reste
  const first = r.wrapped.names.filter(
    (n) => LONG.includes(n.txt) && n.txt.length > 3 && n.y < r.wrapped.cells[0].y + r.wrapped.cells[0].height,
  );
  expect(first.length).toBeGreaterThan(2);
  expect(first.map((n) => n.txt).join(' ')).toBe(LONG);
  expect(first[0].size).toBeGreaterThan(r.legacy.names[1].size); // ligne titre : plus grand, jamais réduit
  expect(first.every((n) => n.weight === '700')).toBe(true);
  expect(r.wrapped.cells[0].height).toBeGreaterThan(r.wrapped.cells[2].height);
  expect(r.wrapped.bands).toBe(2); // titre et total sur fond neutre
  const row2 = r.wrapped.names.find((n) => n.txt === 'Payments');
  expect(row2.weight).toBe('700');
  expect(row2.size).toBeLessThan(r.legacy.names[1].size);
  const total = r.wrapped.names.find((n) => n.txt === 'Margins');
  expect(total.weight).toBe('700');
  expect(r.wrapped.h).toBeGreaterThanOrEqual(r.legacy.h);
  // largeur des noms à 50 % : les cases commencent au milieu, aucun nom ne dépasse
  expect(Math.round(r.wide.cells[0].x)).toBe(230);
  expect(r.wide.names.every((n) => n.right <= 230 - 9 + 1)).toBe(true);
  // en-têtes en gras sur plusieurs lignes ; sans en-tête, pas de bande vide en haut
  expect(r.heads.heads.filter((t) => t.weight === '700').length).toBeGreaterThan(4);
  expect(r.heads.cells[0].y).toBeGreaterThan(r.legacy.cells[0].y);
  expect(r.noHeads.cells[0].y).toBe(0);
});

test('textes : réglages dans l’éditeur (carte Textes, colonnes de ligne), export PDF, aller-retour de type', async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page, 'default');
  await page.evaluate(
    ([key, LONG]) => {
      const doc = JSON.parse(localStorage.getItem(key));
      const col = doc.sections.flatMap((s) => s.subs.flatMap((b) => b.cols)).find((c) => c.viz);
      col.viz = { kind: 'heatmap', opts: null, head: { title: '', source: '' }, side: { pos: 'none' } };
      localStorage.setItem(key, JSON.stringify(doc));
    },
    [DOC_KEY, LONG],
  );
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
  // onglet Données : le 1er nom devient long, la ligne devient un titre, la 2e en gras
  await page.locator('.ve-tab[data-tab=data]').click();
  const grid = page.locator('table.dg').first();
  await expect(grid.locator('thead th', { hasText: 'Row type' })).toHaveCount(1);
  await grid.locator('input[data-r="0"][data-c="0"]').fill(LONG);
  const ns = await grid.locator('thead th').count(); // n°, libellé, 4 colonnes, type, gras, taille, n°
  await grid.locator(`select[data-r="0"][data-c="${ns - 5}"]`).selectOption('heading');
  await grid.locator(`select[data-r="1"][data-c="${ns - 4}"]`).selectOption('on');
  await grid.locator(`select[data-r="3"][data-c="${ns - 5}"]`).selectOption('total');
  // carte Textes : noms à 40 %, en-têtes en gras
  await page.locator('.ve-tab[data-tab=viz]').click();
  await page.locator('.ve-form .pp-q').fill(' ');
  await expect(page.locator('.ve-form .pp-sub', { hasText: 'Row names' })).toHaveCount(1);
  await page.locator('.ve-form .pp-switchrow', { hasText: 'Bold headers' }).locator('button[role=switch]').click();
  await page.locator('.ve-form .pp-q').fill('');
  const stage = page.locator('#ve-stage svg');
  await expect(stage.locator('path.hm-band')).toHaveCount(2);
  expect(await stage.locator('text.hm-name').count()).toBeGreaterThan(5);
  await page.screenshot({ path: test.info().outputPath('heatmap-texts.png') });
  await page.locator('.ve-bar button.primary').click();
  await expect(page.locator('.ve-bar')).toHaveCount(0);
  await page.waitForTimeout(300);
  await addBundle(page, 'pdfexport.js');
  const r = await page.evaluate(async (key) => {
    const doc = JSON.parse(localStorage.getItem(key));
    const viz = doc.sections.flatMap((s) => s.subs.flatMap((b) => b.cols)).find((c) => c.viz && c.viz.kind === 'heatmap').viz;
    const { bytes, missing } = await window.FSPDF.build(doc, 'net', { profile: 'x4' });
    const b64 = await new Promise((res) => {
      const fr = new FileReader();
      fr.onload = () => res(String(fr.result).split(',')[1]);
      fr.readAsDataURL(new Blob([bytes]));
    });
    return { b64, missing, rows: viz.opts.rows, headBold: viz.opts.headBold, viz };
  }, DOC_KEY);
  expect(r.rows[0]).toMatchObject({ label: LONG, kind: 'heading' });
  expect(r.rows[1].fmt).toEqual({ bold: true });
  expect(r.rows[3].kind).toBe('total');
  expect(r.headBold).toBe(true);
  expect(r.missing).toEqual([]);
  // PDF : le long nom passe à la ligne (mots sur plusieurs lignes), en plus grand que les autres noms
  const file = test.info().outputPath('heatmap-texts.pdf');
  fs.writeFileSync(file, Buffer.from(r.b64, 'base64'));
  if (spawnSync('pdftotext', ['-v']).error === undefined) {
    const html = execFileSync('pdftotext', ['-bbox', file, '-']).toString();
    const words = [...html.matchAll(/<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]*)<\/word>/g)].map((m) => ({
      y: +m[2],
      h: +m[4] - +m[2],
      w: m[5],
    }));
    const pick = (w) => words.find((x) => x.w === w);
    for (const w of ['Competitiveness,', 'security:', 'innovation,', 'space']) expect(pick(w)).toBeTruthy();
    expect(new Set(['Heading', 'security:', 'space'].map((w) => Math.round(pick(w).y))).size).toBe(3);
    expect(pick('Heading').h).toBeGreaterThan(pick('Payments').h);
  }
  // aller-retour de type (stash) : `kind` et `fmt` des lignes sont conservés
  await page.goto('/factsheet/tests/blank.html');
  const back = await page.evaluate((viz) => {
    const { switchKind } = window.FSTEST;
    const bars = switchKind(viz, 'bars');
    const donut = switchKind(bars, 'donut');
    return switchKind(switchKind(donut, 'bars'), 'heatmap').opts.rows;
  }, r.viz);
  expect(back[0].kind).toBe('heading');
  expect(back[1].fmt).toEqual({ bold: true });
  expect(errors).toEqual([]);
});

test('classes de couleur : de 3 à 20, nombre pair sans classe neutre', async ({ page }) => {
  await page.goto('/factsheet/tests/blank.html');
  const r = await page.evaluate(() => {
    const { heatCells, heatLegend, VIZ_TYPES } = window.FSTEST;
    const o = VIZ_TYPES.heatmap.defaults();
    const opts = VIZ_TYPES.heatmap.fields.find((f) => f.k === 'classes').options;
    const lg = (n, extra = {}) => heatLegend({ ...o, classes: String(n), ...extra }, 'en-GB');
    const up = { rows: [{ label: 'A', v: [10, 12, 15, null] }] };
    const four = heatCells({ ...o, classes: '4' });
    return {
      opts: Object.keys(opts),
      l20: lg(20),
      l19: lg(19),
      l4: lg(4),
      up20: lg(20, up),
      up19: lg(19, up),
      four: four.cells.flat().map((c) => c.cls ?? null),
      maxCls20: Math.max(
        ...heatCells({ ...o, classes: '20' })
          .cells.flat()
          .map((c) => Math.abs(c.cls || 0)),
      ),
      big: heatLegend({ ...o, classes: '99' }, 'en-GB').cells.length,
    };
  });
  expect(r.opts).toEqual(Array.from({ length: 18 }, (_, i) => String(i + 3)));
  // 20 classes : 10 baisses puis 10 hausses, zéro à la limite du milieu
  expect(r.l20.cells).toHaveLength(20);
  expect(r.l20.cells.some((c) => !c.path)).toBe(false);
  expect(r.l20.cells.slice(0, 10).every((c) => c.path === 'color')).toBe(true);
  expect(r.l20.labels).toHaveLength(21);
  expect(r.l20.labels[10]).toBe('0.0');
  // 19 classes : classe neutre au milieu
  expect(r.l19.cells[9].path).toBeUndefined();
  expect(r.l4.cells.map((c) => c.path)).toEqual(['color', 'color', 'color2', 'color2']);
  // un seul sens : 10 classes de hausse (pair) ; neutre + 9 (impair)
  expect(r.up20.cells).toHaveLength(10);
  expect(r.up20.labels[0]).toBe('0.0');
  expect(r.up19.cells).toHaveLength(10);
  // 4 classes : tout écart non nul est au moins en classe ±1 ; seules référence et attente sans classe
  expect(r.four.filter((k) => k === 0)).toHaveLength(0);
  expect(r.maxCls20).toBe(10);
  expect(r.big).toBe(20); // borné à 20
});

test('hiérarchie : niveaux des lignes (retrait, graisse), groupes de colonnes, glisser un nom', async ({ page }) => {
  await page.goto('/factsheet/tests/blank.html');
  await page.evaluate(() => document.fonts.ready);
  const r = await page.evaluate(() => {
    const { VIZ_TYPES } = window.FSTEST;
    const ty = VIZ_TYPES.heatmap;
    const draw = (o) => {
      const host = document.createElement('div');
      const res = ty.render(o, 460, { locale: 'en-GB', ui: true });
      host.append(res.node);
      document.body.append(host);
      const out = {
        names: [...res.node.querySelectorAll('text.hm-name')].map((t) => ({
          x: +t.getAttribute('x'),
          w: t.getAttribute('font-weight'),
          size: +t.getAttribute('font-size'),
        })),
        groups: [...res.node.querySelectorAll('text.hm-group')].map((t) => t.textContent),
        rules: [...res.node.querySelectorAll('line.hm-group-rule')].map((l) => [+l.getAttribute('x1'), +l.getAttribute('x2')]),
        cells: [...res.node.querySelectorAll('path.hm-ref')].map((p) => {
          const b = p.getBBox();
          return { x: b.x, y: b.y, w: b.width };
        }),
        levelHits: res.node.querySelectorAll('[data-hit^="level:"]').length,
      };
      host.remove();
      return out;
    };
    const o = ty.defaults();
    const flat = draw(o);
    const lv = JSON.parse(JSON.stringify(o));
    lv.rows.forEach((x, i) => (x.level = i)); // 0, 1, 2, 3
    const levels = draw(lv);
    const gr = JSON.parse(JSON.stringify(o));
    gr.series[0].group = 'Draft';
    gr.series[1].group = 'Positions';
    gr.series[2].group = 'Positions';
    const groups = draw(gr);
    // glisser un nom : un niveau tous les 18 px, jamais plus d'un niveau sous la ligne du dessus
    const ed = JSON.parse(JSON.stringify(o));
    const api = { redraw() {} };
    let d = ty.edit.start({ kind: 'level', i: 1 }, ed, null, api, { x: 10, y: 0 });
    d.move({ x: 70, y: 2 }); // 3 niveaux demandés, 1 permis
    const one = ed.rows[1].level;
    d = ty.edit.start({ kind: 'level', i: 2 }, ed, null, api, { x: 10, y: 0 });
    d.move({ x: 46, y: 0 });
    const two = ed.rows[2].level;
    d = ty.edit.start({ kind: 'level', i: 1 }, ed, null, api, { x: 50, y: 0 });
    d.move({ x: 20, y: 0 });
    const back = ed.rows[1].level;
    const first = ty.edit.start({ kind: 'level', i: 0 }, ed, null, api, { x: 0, y: 0 });
    first.move({ x: 60, y: 0 });
    return { flat, levels, groups, one, two, back, firstLevel: ed.rows[0].level };
  });
  // sans niveau : aspect inchangé
  expect(r.flat.names.every((n) => n.x === 0 && n.w === '600')).toBe(true);
  expect(r.flat.groups).toEqual([]);
  // niveaux : retrait de 9 px par niveau, gras → semi-gras → normal → normal plus petit
  expect(r.levels.names.map((n) => n.x)).toEqual([0, 9, 18, 27]);
  expect(r.levels.names.map((n) => n.w)).toEqual(['700', '600', '400', '400']);
  expect(r.levels.names[3].size).toBeLessThan(r.levels.names[2].size);
  expect(r.levels.levelHits).toBe(4);
  // groupes : un en-tête par suite de colonnes de même groupe, filet sur leur largeur, cases descendues d'autant
  expect(r.groups.groups).toEqual(['Draft', 'Positions']);
  expect(r.groups.rules).toHaveLength(2);
  expect(r.groups.rules[1][0]).toBeCloseTo(r.groups.cells.length ? r.flat.cells[0].x + r.flat.cells[0].w + 3 + 1 : 0, 0);
  expect(r.groups.cells[0].y).toBeGreaterThan(r.flat.cells[0].y);
  expect(r.one).toBe(1);
  expect(r.two).toBe(2);
  expect(r.back).toBeUndefined(); // revenu au niveau 0 (clé retirée)
  expect(r.firstLevel).toBeUndefined(); // la 1re ligne reste au niveau 0
});

test('hiérarchie dans l’éditeur : boutons de retrait, Tab, groupe de colonne, glisser dans l’aperçu', async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page, 'default');
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
  await page.locator('.ve-tab[data-tab=data]').click();
  const grid = page.locator('table.dg').first();
  // ligne 2 : bouton « descendre d'un niveau » ; ligne 3 : Tab dans le nom
  await grid.locator('tbody tr').nth(1).locator('button[aria-label="Move down a level"]').click();
  await expect(grid.locator('input[data-r="1"][data-c="0"]')).toHaveAttribute('data-level', '1');
  await expect(grid.locator('tbody tr').nth(0).locator('button[aria-label="Move down a level"]')).toBeDisabled(); // 1re ligne
  await grid.locator('input[data-r="2"][data-c="0"]').focus();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(grid.locator('input[data-r="2"][data-c="0"]')).toHaveAttribute('data-level', '2');
  await expect(grid.locator('input[data-r="2"][data-c="0"]')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(grid.locator('input[data-r="2"][data-c="0"]')).toHaveAttribute('data-level', '1');
  // groupe des deux colonnes du milieu
  await grid.locator('thead input.dg-group').nth(1).fill('Positions');
  await grid.locator('thead input.dg-group').nth(2).fill('Positions');
  // aperçu : glisser le nom de la 4e ligne vers la droite
  await page.locator('.ve-tab[data-tab=viz]').click();
  const stage = page.locator('#ve-stage svg');
  await expect(stage.locator('text.hm-group')).toHaveText(['Positions']);
  const hit = stage.locator('[data-hit="level:3"]');
  const b = await hit.boundingBox();
  await page.mouse.move(b.x + 10, b.y + b.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + 40, b.y + b.height / 2, { steps: 5 });
  await page.mouse.move(b.x + 80, b.y + b.height / 2, { steps: 5 });
  await page.mouse.up();
  await page.screenshot({ path: test.info().outputPath('heatmap-levels.png') });
  await page.locator('.ve-bar button.primary').click();
  await expect(page.locator('.ve-bar')).toHaveCount(0);
  await page.waitForTimeout(300);
  const opts = await page.evaluate((key) => {
    const doc = JSON.parse(localStorage.getItem(key));
    return doc.sections.flatMap((s) => s.subs.flatMap((b) => b.cols)).find((c) => c.viz && c.viz.kind === 'heatmap').viz.opts;
  }, DOC_KEY);
  expect(opts.rows.map((x) => x.level || 0)).toEqual([0, 1, 1, 2]);
  expect(opts.series.map((x) => x.group || '')).toEqual(['', 'Positions', 'Positions', '']);
  expect(errors).toEqual([]);
});

test('masquer : lignes et colonnes gardées dans les données, absentes du dessin et de l’échelle', async ({ page }) => {
  await page.goto('/factsheet/tests/blank.html');
  const r = await page.evaluate(() => {
    const { VIZ_TYPES, heatCells, heatLegend } = window.FSTEST;
    const ty = VIZ_TYPES.heatmap;
    const o = ty.defaults();
    const draw = (opts) => {
      const res = ty.render(opts, 460, { locale: 'en-GB', ui: true });
      const q = (sel) => [...res.node.querySelectorAll(sel)];
      return {
        refs: q('path.hm-ref').length,
        cells: q('path.hm-cell').length,
        pending: q('path.hm-pending').length,
        names: q('text.hm-name').map((t) => t.textContent),
        reorder: q('[data-reorder]').map((n) => n.getAttribute('data-reorder')),
      };
    };
    const hid = JSON.parse(JSON.stringify(o));
    hid.rows[0].hidden = true; // ligne de l'écart le plus fort (−32,2)
    hid.series[3].hidden = true; // colonne « en attente »
    const prev = JSON.parse(JSON.stringify(o));
    prev.compareTo = 'prev';
    prev.series[1].hidden = true;
    const allHidden = JSON.parse(JSON.stringify(o));
    allHidden.series.slice(1).forEach((s) => (s.hidden = true));
    return {
      base: draw(o),
      hid: draw(hid),
      dataKept: hid.rows.length === 4 && hid.series.length === 4,
      maxBase: heatCells(o).scale.dataTop,
      maxHid: heatCells(hid).scale.dataTop,
      hiddenFlag: heatCells(hid).cells[0][1].hidden,
      prevDelta: +heatCells(prev).cells[0][2].delta.toFixed(1), // 764,9 − 797,1 : la colonne masquée est sautée
      legendNone: heatLegend(allHidden, 'en-GB'),
    };
  });
  expect(r.base).toMatchObject({ refs: 4, cells: 8, pending: 4 });
  expect(r.hid).toMatchObject({ refs: 3, cells: 6, pending: 0 });
  expect(r.hid.names).toEqual(['Payments', 'Special instruments', 'Margins']);
  expect(r.hid.reorder).toEqual(['rows:1', 'rows:2', 'rows:3']); // indices des données, pas de l'affichage
  expect(r.dataKept).toBe(true);
  expect(r.maxBase).toBeCloseTo(32.2, 1);
  expect(r.maxHid).toBeLessThan(r.maxBase); // l'échelle ne compte que les cases visibles
  expect(r.hiddenFlag).toBe(true);
  expect(r.prevDelta).toBe(-32.2);
  expect(r.legendNone).toBeNull();
});

test('masquer dans l’éditeur : œil de ligne et de colonne, « Tout réafficher »', async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page, 'default');
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
  await page.locator('.ve-tab[data-tab=data]').click();
  const grid = () => page.locator('table.dg').first();
  await grid().locator('tbody tr').nth(2).locator('button.dg-eye').click();
  await grid().locator('thead th').nth(5).locator('button.dg-eye').click(); // 4e colonne (« en attente »)
  await expect(grid().locator('tbody tr.dg-off')).toHaveCount(1);
  await expect(grid().locator('thead th.dg-off')).toHaveCount(1);
  await expect(grid().locator('tbody tr')).toHaveCount(4); // données gardées
  await expect(page.locator('.dg-wrap button', { hasText: 'Show all (1 row, 1 column)' })).toHaveCount(1);
  await page.locator('.ve-tab[data-tab=viz]').click();
  const stage = page.locator('#ve-stage svg');
  await expect(stage.locator('path.hm-ref')).toHaveCount(3);
  await expect(stage.locator('path.hm-pending')).toHaveCount(0);
  await expect(page.locator('.ve-form .hm-hidden')).toContainText('Hidden (data kept): 1 row, 1 column');
  await page.screenshot({ path: test.info().outputPath('heatmap-hidden.png') });
  await page.locator('.ve-form .hm-hidden button', { hasText: 'Show all' }).click();
  await expect(stage.locator('path.hm-ref')).toHaveCount(4);
  await expect(stage.locator('path.hm-pending')).toHaveCount(4);
  await expect(page.locator('.ve-form .hm-hidden')).toBeHidden();
  expect(errors).toEqual([]);
});
