const { test, expect } = require('@playwright/test');
const fs = require('fs');
const { PDFDocument, PDFArray, PDFRawStream, decodePDFRawStream } = require('pdf-lib');
const { openApp, watchErrors, addBundle, DOC_KEY } = require('./helpers');

/* Tableau (phase 4) : style de paragraphe, couleur, marges, alignements, colonne numérique par cellule ; import CSV / TSV avec aperçu
   (séparateur décimal fr / en-GB) ; export TSV / CSV ; PDF. */

test('modèle : nombres réécrits au format du document, colonne numérique, réparation', async ({ page }) => {
  await page.goto('/factsheet/tests/blank.html');
  const r = await page.evaluate(() => {
    const T = window.FSTEST.table,
      X = window.FSTEST.tableTabular;
    const re = (v, a, b) => X.reformatNumber(v, a, b);
    const tb = T.newTable(2, 2, 1);
    tb.cells[0].st = 'h1'; // hors du sous-ensemble
    tb.cells[1].st = 'small';
    tb.cells[2].pad = 'bogus';
    tb.cols[1].num = 'yes';
    const rep = T.repairTable(JSON.parse(JSON.stringify(tb)));
    const t2 = T.newTable(2, 2, 1);
    t2.cols[0].num = true;
    return {
      fr: [re('1,5', ',', '.'), re('1 025,50', ',', '.'), re('€ 1.234,5', ',', '.'), re('12 %', ',', '.'), re('-3,2', ',', '.')],
      en: [re('1.5', '.', ','), re('1,025.50', '.', ','), re('1,025', '.', ','), re('2.000', '.', ','), re('abc', '.', ',')],
      st: rep.cells.map((c) => c.st || null),
      pad: rep.cells.map((c) => c.pad || null),
      num: rep.cols.map((c) => !!c.num),
      ah: [T.ahOf(t2, t2.cells[0]), T.ahOf(t2, t2.cells[1])],
      imp: X.readTableImport(
        [
          ['A', 'B'],
          ['x', '1,5'],
          ['y', '2,25'],
        ],
        { head: 1, dec: ',', docDec: '.' },
      ),
    };
  });
  expect(r.fr).toEqual(['1.5', '1,025.50', '€ 1,234.5', '12 %', '−3.2']);
  expect(r.en).toEqual(['1,5', '1 025,50', '1 025', '2,000', 'abc']);
  expect(r.st).toEqual([null, 'small', null, null]);
  expect(r.pad).toEqual([null, null, null, null]);
  expect(r.num).toEqual([false, false]);
  expect(r.ah).toEqual(['right', 'left']);
  expect(r.imp.matrix).toEqual([
    ['A', 'B'],
    ['x', '1.5'],
    ['y', '2.25'],
  ]);
  expect(r.imp.numCols).toEqual([1]);
});

test('modèle : export CSV (séparateur selon la langue) et TSV, fusions', async ({ page }) => {
  await page.goto('/factsheet/tests/blank.html');
  const r = await page.evaluate(() => {
    const T = window.FSTEST.table,
      X = window.FSTEST.tableTabular;
    const tb = T.newTable(3, 3, 1);
    const at = (r, c) => T.cellAt(tb, r, c);
    at(0, 0).text = '**Nom**';
    at(1, 0).text = 'a;b';
    at(1, 1).text = 'dit "oui"\nligne 2';
    at(1, 2).text = '1,5';
    T.mergeCells(tb, 2, 0, 2, 1);
    at(2, 0).text = 'fusion';
    const m = X.tableToMatrix(tb);
    return { m, fr: X.matrixToText(m, X.csvSep('fr-FR')), en: X.matrixToText(m, X.csvSep('en-GB')), tsv: X.matrixToText(m, '\t') };
  });
  expect(r.m[0][0]).toBe('Nom');
  expect(r.m[2]).toEqual(['fusion', '', '']);
  expect(r.fr).toContain('"a;b";"dit ""oui""\nligne 2";1,5');
  expect(r.en).toContain('a;b,"dit ""oui""\nligne 2","1,5"');
  expect(r.tsv).toContain('a;b\t"dit ""oui""\nligne 2"\t1,5');
});

const cellOf = (page, r, c) =>
  page.evaluate(
    ([r, c]) =>
      [...document.querySelectorAll('.te .tbl .tbl-cell')].find(
        (n) => n.style.gridRow.startsWith(`${r + 1} `) && n.style.gridColumn.startsWith(`${c + 1} `),
      ).dataset.cell,
    [r, c],
  );
const open = async (page) => {
  await page.locator('#stage .page:not(.ovf-clone) [data-sel="col:0:0:0"] .tbl-cell').first().dblclick();
  await expect(page.locator('.te')).toBeVisible();
};
const click = async (page, r, c) => page.locator(`.te [data-cell="${await cellOf(page, r, c)}"]`).click();
const styleOf = (page, r, c) =>
  page.evaluate(
    ([r, c]) => {
      const n = [...document.querySelectorAll('.te .tbl .tbl-cell')].find(
        (n) => n.style.gridRow.startsWith(`${r + 1} `) && n.style.gridColumn.startsWith(`${c + 1} `),
      );
      const cs = getComputedStyle(n),
        p = n.querySelector('p') || n;
      return {
        pad: cs.paddingTop + ' ' + cs.paddingLeft,
        color: cs.color,
        jc: cs.justifyContent,
        num: cs.fontVariantNumeric,
        ta: getComputedStyle(p).textAlign,
        size: getComputedStyle(p).fontSize,
      };
    },
    [r, c],
  );

test('éditeur : style, couleur, marges, alignement vertical et colonne numérique', async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page, 'table-text');
  await open(page);
  /* colonne numérique du document : chiffres tabulaires, à droite */
  const num = await styleOf(page, 1, 2);
  expect(num.num).toContain('tabular-nums');
  expect(num.ta).toBe('right');
  expect((await styleOf(page, 1, 0)).ta).not.toBe('right');
  /* marges réglées (grille de 3 px) */
  expect((await styleOf(page, 1, 1)).pad).toBe('9px 12px');
  expect((await styleOf(page, 3, 0)).pad).toBe('0px 0px');
  expect((await styleOf(page, 1, 1)).jc).toBe('center');
  /* style de paragraphe par la carte Texte */
  await click(page, 3, 2);
  const base = (await styleOf(page, 3, 2)).size;
  await page.locator('.te [data-card="text"] select[data-k="cellstyle"]').selectOption('figsm');
  expect(parseFloat((await styleOf(page, 3, 2)).size)).toBeGreaterThan(parseFloat(base));
  await click(page, 2, 0);
  /* marges et alignement vertical */
  await page.locator('.te [data-card="text"] [data-seg="pad"][data-v="roomy"]').click();
  expect((await styleOf(page, 2, 0)).pad).toBe('6px 9px');
  await page.locator('.te [data-card="text"] [data-seg="av"][data-v="bottom"]').click();
  expect((await styleOf(page, 2, 0)).jc).toBe('flex-end');
  /* colonne numérique : activer sur la colonne 1, désactiver sur la 2 */
  await click(page, 1, 1);
  await page.locator('.te [data-card="text"] [data-act="numcol"]').click();
  expect((await styleOf(page, 1, 1)).ta).toBe('right');
  await click(page, 1, 2);
  await page.locator('.te [data-card="text"] [data-act="numcol"]').click();
  expect((await styleOf(page, 1, 2)).ta).not.toBe('right');
  /* alignement à gauche explicite dans une colonne numérique */
  await click(page, 1, 1);
  await page.locator('.te [data-al="left"]').click();
  expect((await styleOf(page, 1, 1)).ta).not.toBe('right');
  await page.locator('.te .ve-br button.primary').click();
  await expect(page.locator('.te')).toHaveCount(0);
  expect(errors).toEqual([]);
});

for (const [lang, locale, csv, dec, want] of [
  ['fr', 'fr-FR', 'Pays;Budget\nBelgique;"1 025,5"\nFrance;12,25\n', 'auto', ['1 025,5', '12,25']],
  ['en-GB', 'en-GB', 'Country,Budget\nBelgium,"1,025.5"\nFrance,12.25\n', 'auto', ['1,025.5', '12.25']],
  ['fr → en-GB', 'en-GB', 'Pays;Budget\nBelgique;"1 025,5"\nFrance;12,25\n', ',', ['1,025.5', '12.25']],
]) {
  test(`import CSV (${lang}) avec aperçu : en-tête, nombres au format du document`, async ({ page }) => {
    const errors = watchErrors(page);
    await openApp(page, 'table-text');
    await page.evaluate(
      ([key, locale]) => {
        const d = JSON.parse(localStorage.getItem(key));
        d.locale = locale;
        localStorage.setItem(key, JSON.stringify(d));
      },
      [DOC_KEY, locale],
    );
    await page.reload();
    await page.waitForSelector('#stage .page');
    await open(page);
    const path = require('path').join(fs.mkdtempSync(require('path').join(require('os').tmpdir(), 'tbl-')), 'import.csv'); // chemin ASCII
    fs.writeFileSync(path, csv);
    const chooser = page.waitForEvent('filechooser');
    await page.locator('.te [data-act="import"]').click();
    await (await chooser).setFiles(path);
    const dlg = page.locator('dialog.dg-imp');
    await expect(dlg).toBeVisible();
    await expect(dlg.locator('[data-head="1"]')).toHaveClass(/on/); // en-tête reconnu
    await expect(dlg.locator('select[data-col="1"]')).toHaveValue('num');
    if (dec !== 'auto') await dlg.locator('select.imp-dec').selectOption(dec);
    await expect(dlg.locator('tbody tr').nth(1).locator('td').nth(2)).toContainText(want[0]);
    await dlg.getByRole('button', { name: /Import/ }).click();
    await expect(dlg).toHaveCount(0);
    const texts = await page.locator('.te .tbl-cell').evaluateAll((ns) => ns.map((n) => n.textContent));
    expect(texts).toEqual([texts[0], 'Budget', 'Belgi' + texts[2].slice(5), want[0], texts[4], want[1]]);
    expect(await page.locator('.te .tbl-head').count()).toBe(2);
    expect((await styleOf(page, 1, 1)).ta).toBe('right');
    await page.locator('.te .ve-br button.primary').click();
    expect(errors).toEqual([]);
  });
}

test('export TSV et CSV nommés par fileStem', async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page, 'table-text');
  await open(page);
  for (const [act, ext] of [
    ['export-tsv', 'tsv'],
    ['export-csv', 'csv'],
  ]) {
    const dl = page.waitForEvent('download');
    await page.locator(`.te [data-act="${act}"]`).click();
    const d = await dl;
    expect(d.suggestedFilename()).toMatch(new RegExp(`^tableau-texte_\\d{6}_\\d{4}\\.${ext}$`));
    const txt = fs.readFileSync(await d.path(), 'utf8');
    expect(txt).toContain('Item');
    expect(txt).toContain('12,25');
    expect(txt.split('\n').length).toBeGreaterThan(4);
  }
  expect(errors).toEqual([]);
});

test('PDF : style, couleur et taille propres à chaque cellule, texte avancé', async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page, 'table-text');
  /* texte avancé : gras serif interlettré dans « Quoted » : le PDF se construit sans erreur et la police serif en gras est incorporée */
  await page.evaluate((key) => {
    const d = JSON.parse(localStorage.getItem(key)),
      tb = d.sections[0].subs[0].cols[0].table,
      cl = tb.cells.find((x) => x.text === 'Quoted');
    cl.adv = { f: 'serif', b: true, it: true, ls: 40, lh: 24, kern: 'none' };
    localStorage.setItem(key, JSON.stringify(d));
  }, DOC_KEY);
  await page.reload();
  await page.waitForSelector('#stage .page');
  await addBundle(page, 'pdfexport.js');
  const b64 = await page.evaluate(async (key) => {
    const { bytes } = await window.FSPDF.build(JSON.parse(localStorage.getItem(key)), 'net', { profile: 'x4' });
    return await new Promise((res) => {
      const fr = new FileReader();
      fr.onload = () => res(String(fr.result).split(',')[1]);
      fr.readAsDataURL(new Blob([bytes]));
    });
  }, DOC_KEY);
  const pdf = await PDFDocument.load(Buffer.from(b64, 'base64'));
  const c = pdf.getPages()[0].node.Contents(),
    list = c instanceof PDFArray ? c.asArray().map((x) => pdf.context.lookup(x)) : [c];
  const txt = list
    .map((st) => Buffer.from(st instanceof PDFRawStream ? decodePDFRawStream(st).decode() : st.getContents()).toString('latin1'))
    .join('\n');
  /* texte de la cellule « Tiny » en bleu (1 0.8 0 0) : un opérateur de couleur de remplissage précède du texte */
  expect(/1 0\.8 0 0 k[\s\S]{0,400}?Tj|1 0\.8 0 0 k[\s\S]{0,400}?TJ/.test(txt), 'texte bleu').toBe(true);
  const sizes = new Set([...txt.matchAll(/\/\S+\s+([\d.]+)\s+Tf/g)].map((m) => +(+m[1]).toFixed(1)));
  expect(sizes.size, `tailles ${[...sizes]}`).toBeGreaterThanOrEqual(3);
  expect(errors).toEqual([]);
});

test('nombres des tableaux : convention du document (import et changement de « Format des nombres »)', async ({ page }) => {
  await page.goto('/factsheet/tests/blank.html');
  const r = await page.evaluate(() => {
    const T = window.FSTEST.table,
      X = window.FSTEST.tableTabular;
    const tb = T.newTable(3, 2, 1);
    tb.cols[1].num = true;
    const at = (r, c) => T.cellAt(tb, r, c);
    at(0, 1).text = '1,5'; // en-tête : jamais converti
    at(1, 1).text = '1,227.5';
    at(2, 1).text = '**12,000**'; // mise en forme : laissé tel quel
    at(1, 0).text = '1,227.5'; // colonne non numérique : laissé tel quel
    const doc = { sections: [{ subs: [{ cols: [{ type: 'table', table: tb }] }] }] };
    const n1 = X.convertDocNumbers(doc, 'en-GB', 'fr-BE');
    const fr = [at(0, 1).text, at(1, 1).text, at(2, 1).text, at(1, 0).text];
    const n2 = X.convertDocNumbers(doc, 'fr-BE', 'de-DE');
    const de = at(1, 1).text;
    X.convertDocNumbers(doc, 'de-DE', 'en-GB');
    return {
      n1,
      n2,
      fr,
      de,
      back: at(1, 1).text,
      loc: [
        X.localizeNumber('1227,5', ',', 'es-ES'),
        X.localizeNumber('12 227,5 €', ',', 'es-ES'),
        X.localizeNumber('−3.0 %', '.', 'fr-BE'),
      ],
    };
  });
  expect(r.n1).toBe(1);
  expect(r.fr).toEqual(['1,5', '1\u00a0227,5', '**12,000**', '1,227.5']);
  expect(r.de).toBe('1.227,5');
  expect(r.back).toBe('1,227.5');
  expect(r.loc).toEqual(['1227,5', '12.227,5 €', '−3,0 %']);
});

test('éditeur : texte avancé (gras, police, taille, interlettrage, interlignage) sur la sélection', async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page, 'table-text');
  await open(page);
  const look = (r, c) =>
    page.evaluate(
      ([r, c]) => {
        const n = [...document.querySelectorAll('.te .tbl .tbl-cell')].find(
          (n) => n.style.gridRow.startsWith(`${r + 1} `) && n.style.gridColumn.startsWith(`${c + 1} `),
        );
        const cs = getComputedStyle(n.querySelector('p') || n);
        return { w: cs.fontWeight, st: cs.fontStyle, ls: cs.letterSpacing, lh: cs.lineHeight, ff: cs.fontFamily, fs: cs.fontSize };
      },
      [r, c],
    );
  const before = await look(2, 2);
  await click(page, 2, 2);
  const card = page.locator('.te [data-card="adv"]');
  await card.locator('summary').click();
  await card.locator('[data-k="adv-b"]').click();
  expect(parseInt((await look(2, 2)).w)).toBeGreaterThanOrEqual(700);
  expect((await look(1, 2)).w).toBe(before.w); // les autres cellules ne bougent pas
  await card.locator('[data-k="adv-it"]').click();
  expect((await look(2, 2)).st).toBe('italic');
  await card.locator('select[data-k="adv-f"]').selectOption('serif');
  expect((await look(2, 2)).ff).toMatch(/serif 4/i);
  await card.locator('select[data-k="adv-s"]').selectOption('16');
  const big = await look(2, 2);
  expect(parseFloat(big.fs)).toBeGreaterThan(parseFloat(before.fs));
  /* interlettrage et interlignage : glisseurs du panneau des options avancées */
  const setRange = (name, v) =>
    card
      .locator('.ra-sl', { hasText: name })
      .locator('input[type=range]')
      .evaluate((n, v) => {
        n.value = v;
        n.dispatchEvent(new Event('input', { bubbles: true }));
      }, v);
  await setRange('Tracking', '100');
  await setRange('Line spacing', '20');
  const adj = await look(2, 2);
  expect(parseFloat(adj.ls)).toBeGreaterThan(0);
  expect(parseFloat(adj.lh)).toBeCloseTo(20 * (4 / 3), 0);
  /* plusieurs cellules : la modification s'applique à toutes */
  await click(page, 1, 2);
  await page.keyboard.down('Shift');
  await click(page, 3, 2);
  await page.keyboard.up('Shift');
  await card.locator('[data-k="adv-b"]').click();
  expect(parseInt((await look(1, 2)).w)).toBeGreaterThanOrEqual(700);
  expect(parseInt((await look(3, 2)).w)).toBeGreaterThanOrEqual(700);
  /* « tout remettre » */
  await click(page, 2, 2);
  await card.locator('.pp-btn').click();
  const back = await look(2, 2);
  expect(back.w).toBe(before.w);
  expect(back.st).toBe(before.st);
  await page.locator('.te .ve-br button.primary').click();
  await expect(page.locator('.te')).toHaveCount(0);
  expect(errors).toEqual([]);
});
