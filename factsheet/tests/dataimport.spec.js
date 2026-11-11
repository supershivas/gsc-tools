const { test, expect } = require('@playwright/test');
const { openApp, watchErrors, DOC_KEY } = require('./helpers');

/* Import des données (lot 2a) : lecture des nombres selon la locale, en-têtes sur plusieurs lignes, rôle des colonnes, aperçu avant import.
   Jeu de données : tableau budgétaire collé depuis Excel (MFF 2021-27 face à la proposition), avec une colonne d'écarts en %. */

const LONG = 'Heading 1 – Competitiveness, prosperity and security: single market, research, innovation, digital and space';
const MFF = [
  ['', 'MFF 2021-27', 'MFF 2021-27 + NGEU', 'President’s proposal', 'Change (%)'],
  ['values (€ bn)', '', '', '', '2025'],
  [LONG, '820', '820', '1,025', '25.1'],
  ['Heading 2 – Cohesion', '392', '392', '397.1', '1.3'],
  ['Heading 3 – Agriculture', '386.6', '386.6', '402', '4'],
  ['Heading 6 – Neighbourhood and the world', '98.4', '', '229.4', '133.1'],
  ['TOTAL', '1,222', '1,657', '1,472', '20.5'],
  ['TOTAL NGEU', '1,245', '1,825', '1,622', '30.3'],
];
const TSV = MFF.map((r) => r.join('\t')).join('\n');

test('nombres : locale du document, milliers, espaces insécables, symboles', async ({ page }) => {
  await page.goto('/factsheet/tests/blank.html');
  const r = await page.evaluate(() => {
    const { num, decimalOf } = window.FSTEST.dataparse;
    const en = ['1,025', '1 025', '1 025', '1 025', '1,025.5', '4,5', '0,025', '25.1', '€1,025', '12 %', '−3.5', '– 2', '(4.2)'];
    const en2 = ['1,234,567', 'abc', '', '2025', '12bn', 'Heading 1', '1,2,3', '+7', '.5', '1e3'];
    const fr = ['1.025,5', '1 025,5', '1,025', '1.025', '12,5 %', '1 227,5', '−0,5', '1.234.567'];
    return {
      en: en.map((x) => num(x, '.')),
      en2: en2.map((x) => num(x, '.')),
      fr: fr.map((x) => num(x, ',')),
      number: num(12.5, ','),
      dec: ['en-GB', 'fr-BE', 'de-DE', 'nl-BE', 'es-ES', 'it-IT', undefined].map(decimalOf),
    };
  });
  expect(r.en).toEqual([1025, 1025, 1025, 1025, 1025.5, 4.5, 0.025, 25.1, 1025, 12, -3.5, -2, -4.2]);
  expect(r.en2).toEqual([1234567, null, null, 2025, 12, null, null, 7, 0.5, 1000]);
  expect(r.fr).toEqual([1025.5, 1025.5, 1.025, 1025, 12.5, 1227.5, -0.5, 1234567]);
  expect(r.number).toBe(12.5);
  expect(r.dec).toEqual(['.', ',', ',', ',', ',', ',', '.']);
});

test('matrice : TSV d’Excel (cellule sur deux lignes, cellules vides), CSV entre guillemets', async ({ page }) => {
  await page.goto('/factsheet/tests/blank.html');
  const r = await page.evaluate(() => {
    const { parseMatrix } = window.FSTEST.dataparse;
    return {
      tsv: parseMatrix('A\t"Long\nlabel"\t3\r\n\t\t\r\nB\t\t4\n'),
      csv: parseMatrix('name,value\n"Smith, J.","1,025"\n"say ""hi""",2'),
      semi: parseMatrix('a;1,5\nb;2,5'),
      stray: parseMatrix('A\t"open\nB\t2'),
    };
  });
  expect(r.tsv).toEqual([
    ['A', 'Long\nlabel', '3'],
    ['B', '', '4'],
  ]);
  expect(r.csv).toEqual([
    ['name', 'value'],
    ['Smith, J.', '1,025'],
    ['say "hi"', '2'],
  ]);
  expect(r.semi).toEqual([
    ['a', '1,5'],
    ['b', '2,5'],
  ]);
  expect(r.stray).toEqual([
    ['A', '"open'],
    ['B', '2'],
  ]);
});

test('en-têtes et rôles : tableau budgétaire (2 lignes d’en-tête, colonne en %)', async ({ page }) => {
  await page.goto('/factsheet/tests/blank.html');
  const r = await page.evaluate((MFF) => {
    const { headerRows, autoRoles, readImport, parseMatrix } = window.FSTEST.dataparse;
    const head = headerRows(MFF, '.');
    const roles = autoRoles(MFF, head, '.', true);
    const auto = readImport(MFF, { head, roles, dec: '.' });
    const withPct = readImport(MFF, { head, roles: roles.map((x, j) => (j === 4 ? 'data' : x)), dec: '.' });
    const one = parseMatrix('Label\tA\tB\nX\t1\t2\nY\t3\t4');
    const none = parseMatrix('X\t1\t2\nY\t3\t4');
    const years = parseMatrix('\t2021\t2022\nX\t1.5\t2\nY\t3\t4');
    const zeros = parseMatrix('Unit\t0\t0\t2025\nX\t1.5\t2\t3\nY\t3\t4\t5');
    const sparse = parseMatrix('A\t\t\t5\nB\t1\t2\t3'); // seule la dernière cellule est un nombre, au-dessus d'une ligne complète
    return {
      head,
      roles,
      top: auto.matrix[0],
      h1: auto.matrix[1],
      total: auto.matrix[5],
      ngeu: auto.matrix[6],
      empty: auto.matrix[4][2],
      pctTop: withPct.matrix[0],
      pctH1: withPct.matrix[1],
      bad: auto.bad,
      heads: [one, none, years, zeros].map((m) => headerRows(m, '.')),
      sparse: headerRows(sparse, '.'),
      mffGroups: auto.groups,
      grouped: readImport(parseMatrix('\tMFF 2021-27\t\tProposal\t\nvalues\tCommit.\tPaym.\tCommit.\tPaym.\nA\t1\t2\t3\t4'), {
        head: 2,
        dec: '.',
      }),
    };
  }, MFF);
  expect(r.head).toBe(2);
  expect(r.roles).toEqual(['label', 'data', 'data', 'data', 'skip']); // la colonne en % est ignorée par défaut
  expect(r.top).toEqual(['values (€ bn)', 'MFF 2021-27', 'MFF 2021-27 + NGEU', 'President’s proposal']);
  expect(r.h1).toEqual([expect.stringContaining('Heading 1'), 820, 820, 1025]);
  expect(r.total).toEqual(['TOTAL', 1222, 1657, 1472]);
  expect(r.ngeu).toEqual(['TOTAL NGEU', 1245, 1825, 1622]);
  expect(r.empty).toBe(''); // cellule vide : reste vide
  expect(r.pctTop[4]).toBe('Change (%) 2025');
  expect(r.pctH1[4]).toBe(25.1);
  expect(r.bad).toBe(0);
  expect(r.heads).toEqual([1, 0, 1, 1]);
  expect(r.sparse).toBe(1);
  expect(r.mffGroups).toBeNull(); // 2e ligne d'en-tête = unité : pas de groupes
  expect(r.grouped.groups).toEqual(['MFF 2021-27', 'MFF 2021-27', 'Proposal', 'Proposal']); // cellule fusionnée d'Excel
  expect(r.grouped.matrix[0]).toEqual(['values', 'Commit.', 'Paym.', 'Commit.', 'Paym.']); // « 5 » seul dans la dernière cellule au-dessus d'une ligne complète
});

test('adaptateurs : heatmap (cellules vides), barres et enregistrements sans régression', async ({ page }) => {
  await page.goto('/factsheet/tests/blank.html');
  const r = await page.evaluate((MFF) => {
    const { dataparse, tableAdapter, recordsAdapter, VIZ_TYPES } = window.FSTEST;
    const { readImport, headerRows, parseMatrix, autoRoles } = dataparse;
    const field = (k) => VIZ_TYPES[k].fields.find((f) => f.t === 'table');
    // heatmap
    const hm = VIZ_TYPES.heatmap.defaults();
    const ad = tableAdapter(field('heatmap'), hm, {}, ['blue'], []);
    const res = readImport(MFF, { head: 2, dec: '.' });
    ad.load(res.matrix, true);
    // barres (adaptateur sans cellule vide), collage historique avec une ligne d'en-tête
    const bars = VIZ_TYPES.bars.defaults();
    const bd = tableAdapter(field('bars'), bars, {}, ['blue', 'yellow'], []);
    const bm = parseMatrix('Label\tA\tB\nX\t1,5\t2\nY\t\t4');
    const bh = headerRows(bm, '.');
    bd.load(readImport(bm, { head: bh, dec: '.' }).matrix, bh > 0);
    // saisie dans une cellule, document en français
    bd.dec = ',';
    bd.set(0, 1, '1 025,5');
    // enregistrements (Sankey) : colonnes trouvées par leur nom, nombres lus
    const sk = VIZ_TYPES.sankey.defaults();
    const sd = recordsAdapter(VIZ_TYPES.sankey.data, sk, { blue: 'Blue' }, []);
    const sm = parseMatrix('Value\tSource\tTarget\n1,200\tA\tB\n35\tA\tC');
    const sh = headerRows(sm, '.', sd.names);
    sd.load(readImport(sm, { head: sh, dec: '.', table: false, roles: autoRoles(sm, sh, '.', false) }).matrix, sh > 0);
    return {
      series: hm.series.map((s) => s.name),
      rows: hm.rows.map((x) => x.v),
      label: hm.rows[0].label,
      bars: bars.rows.map((x) => [x.label, ...x.v]),
      barSeries: bars.series.map((s) => s.name),
      sankey: sk.rows.map((x) => [x.source, x.target, x.value]),
      sh,
    };
  }, MFF);
  expect(r.series).toEqual(['MFF 2021-27', 'MFF 2021-27 + NGEU', 'President’s proposal']);
  expect(r.rows[0]).toEqual([820, 820, 1025]);
  expect(r.rows[3]).toEqual([98.4, null, 229.4]); // cellule vide = « en attente »
  expect(r.rows[4]).toEqual([1222, 1657, 1472]);
  expect(r.label).toContain('Heading 1');
  expect(r.bars).toEqual([
    ['X', 1025.5, 2],
    ['Y', 0, 4],
  ]);
  expect(r.barSeries).toEqual(['A', 'B']);
  expect(r.sh).toBe(1);
  expect(r.sankey).toEqual([
    ['A', 'B', 1200],
    ['A', 'C', 35],
  ]);
});

/** Ouvre l'onglet Données de l'éditeur sur une heatmap neuve */
async function openHeatmapData(page) {
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
}

test('aperçu avant import : en-têtes, rôles, nombres interprétés, annuler ne change rien', async ({ page }) => {
  const errors = watchErrors(page);
  await openHeatmapData(page);
  const paste = async (txt) => {
    await page.locator('.dg-wrap details summary').click();
    await page.locator('.dg-wrap details textarea').fill(txt);
    await page.locator('.dg-wrap details button', { hasText: 'Replace data' }).click();
    await expect(page.locator('dialog.dg-imp')).toBeVisible();
  };
  const dlg = page.locator('dialog.dg-imp');
  // annuler : aucune donnée ne change
  await paste(TSV);
  await dlg.locator('button', { hasText: 'Cancel' }).click();
  await expect(dlg).toHaveCount(0);
  await expect(page.locator('table.dg:not(.imp) tbody tr')).toHaveCount(4);

  // aperçu : 2 lignes d'en-tête, 1 025 lu, colonne en % ignorée, une cellule non lue signalée
  await page.locator('.dg-wrap details textarea').fill(TSV.replace('\t386.6\t386.6', '\tn/a\t386.6'));
  await page.locator('.dg-wrap details button', { hasText: 'Replace data' }).click();
  await expect(dlg).toBeVisible();
  await expect(dlg.locator('.imp-seg[aria-pressed=true]')).toHaveText('2');
  await expect(dlg.locator('tr.imp-h')).toHaveCount(2);
  await expect(dlg.locator('td.imp-num', { hasText: '1,025' }).first()).toBeVisible();
  expect(await dlg.locator('td.imp-num', { hasText: '1,025' }).first().getAttribute('data-v')).toBe('1025');
  await expect(dlg.locator('select[data-role="4"]')).toHaveValue('skip');
  await expect(dlg.locator('td.bad')).toHaveCount(1);
  await expect(dlg.locator('.imp-sum')).toContainText('1 cells not read (left empty).');
  await page.screenshot({ path: test.info().outputPath('import-preview.png') });

  // séparateur décimal forcé à la virgule : 386.6 devient 3866 (milliers), 1,025 devient 1.025
  await dlg.locator('select.imp-dec').selectOption(',');
  expect(await dlg.locator('td.imp-num', { hasText: '1.025' }).first().getAttribute('data-v')).toBe('1.025');
  await dlg.locator('select.imp-dec').selectOption('auto');

  // la colonne en % devient une donnée, puis import
  await dlg.locator('select[data-role="4"]').selectOption('data');
  await dlg.locator('button', { hasText: 'Import' }).click();
  await expect(dlg).toHaveCount(0);
  await expect(page.locator('table.dg tbody tr')).toHaveCount(6);
  await page.locator('.ve-bar button.primary').click();
  await expect(page.locator('.ve-bar')).toHaveCount(0);
  await page.waitForTimeout(300);
  const opts = await page.evaluate((key) => {
    const doc = JSON.parse(localStorage.getItem(key));
    return doc.sections.flatMap((s) => s.subs.flatMap((b) => b.cols)).find((c) => c.viz && c.viz.kind === 'heatmap').viz.opts;
  }, DOC_KEY);
  expect(opts.series.map((s) => s.name)).toEqual(['MFF 2021-27', 'MFF 2021-27 + NGEU', 'President’s proposal', 'Change (%) 2025']);
  expect(opts.rows[0].v).toEqual([820, 820, 1025, 25.1]);
  expect(opts.rows[2].v).toEqual([null, 386.6, 402, 4]); // cellule non lue : laissée vide
  expect(opts.rows[4].v).toEqual([1222, 1657, 1472, 20.5]);
  expect(errors).toEqual([]);
});
