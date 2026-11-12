const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');
const { openApp, watchErrors } = require('./helpers');

/* Tableau (phase 2) : collage (Word, Excel, texte tabulé), copie, invariants de la grille ; éditeur de tableau (ouverture,
   sélection, saisie, fusion, lignes et colonnes, collage, historique, Échap en couches, Annuler / Terminer). */
const FIX = (n) => fs.readFileSync(path.join(__dirname, 'fixtures', n), 'utf8');

test('collage : Word et Excel lus en table / tr / td, fusions, gras / italique / souligné, alignement, rien d’autre', async ({ page }) => {
  await page.goto('/factsheet/tests/blank.html');
  const r = await page.evaluate(
    ([word, excel]) => {
      const P = window.FSTEST.tablePaste;
      const pick = (g) => g && { R: g.R, C: g.C, cells: g.cells.map(({ r, c, rs, cs, text, ah }) => ({ r, c, rs, cs, text, ah: ah || '' })) };
      return { word: pick(P.htmlToGrid(word)), excel: pick(P.htmlToGrid(excel)), pwned: !!window.__pwned };
    },
    [FIX('word-table.html'), FIX('excel-table.html')],
  );
  expect(r.word).toEqual({
    R: 3,
    C: 3,
    cells: [
      { r: 0, c: 0, rs: 1, cs: 1, text: '**Country**', ah: '' },
      { r: 0, c: 1, rs: 1, cs: 2, text: '**Budget 2026**', ah: 'center' },
      { r: 1, c: 0, rs: 2, cs: 1, text: '~~Benelux~~ __region__\nsecond line', ah: '' },
      { r: 1, c: 1, rs: 1, cs: 1, text: '1.2 bn', ah: 'right' },
      { r: 1, c: 2, rs: 1, cs: 1, text: '12 %', ah: '' },
      { r: 2, c: 1, rs: 1, cs: 1, text: '0.8 bn', ah: '' },
      { r: 2, c: 2, rs: 1, cs: 1, text: '', ah: '' }, // image (adresse distante) ignorée
    ],
  });
  expect(r.excel).toEqual({
    R: 3, // la ligne vide de la fin est retirée
    C: 4,
    cells: [
      { r: 0, c: 0, rs: 1, cs: 1, text: '**Pays**', ah: '' },
      { r: 0, c: 1, rs: 1, cs: 3, text: '**Budget**', ah: 'center' },
      { r: 1, c: 0, rs: 2, cs: 1, text: '__~~Belgique~~__\n__~~et Luxembourg~~__', ah: '' },
      { r: 1, c: 1, rs: 1, cs: 1, text: '1,2', ah: 'right' },
      { r: 1, c: 2, rs: 1, cs: 1, text: '3,4', ah: 'right' },
      { r: 1, c: 3, rs: 1, cs: 1, text: 'x', ah: '' },
      { r: 2, c: 1, rs: 1, cs: 1, text: '5,6', ah: 'right' },
      { r: 2, c: 2, rs: 1, cs: 1, text: '7,8', ah: 'right' },
      { r: 2, c: 3, rs: 1, cs: 1, text: 'y', ah: '' }, // script ignoré
    ],
  });
  expect(r.pwned).toBe(false);
});

test('collage : ancrage, agrandissement dans la limite, remplacement, copie TSV / HTML, invariant tenu', async ({ page }) => {
  await page.goto('/factsheet/tests/blank.html');
  const r = await page.evaluate(
    ([excel]) => {
      const T = window.FSTEST.table,
        P = window.FSTEST.tablePaste;
      const errs = [];
      const ok = (tb, what) => {
        const e = T.checkTable(tb);
        if (e.length) errs.push(`${what} : ${e.join(', ')}`);
      };
      /* collage ancré en B2 d'un tableau 3 × 3 qui a une fusion coupée par la zone collée */
      const tb = T.newTable(3, 3, 1);
      T.mergeCells(tb, 1, 0, 2, 1);
      const lost = P.pasteGrid(tb, P.htmlToGrid(excel), 1, 1);
      ok(tb, 'collage ancré');
      const size = [tb.rows.length, tb.cols.length];
      const b2 = T.cellAt(tb, 1, 1),
        b3 = T.cellAt(tb, 2, 1);
      /* au-delà de 12 colonnes : la grille s'arrête au maximum, le reste est compté */
      const wide = P.matrixToGrid([Array.from({ length: 15 }, (_, i) => `c${i}`)]);
      const tb2 = T.newTable(2, 2, 0);
      const lost2 = P.pasteGrid(tb2, wide, 0, 0);
      ok(tb2, 'collage trop large');
      /* texte tabulé (Excel en text/plain) : guillemets et cellule de plusieurs lignes */
      const plain = P.clipToGrid({ text: 'a\tb\n"c\nd"\te\n' });
      const one = P.clipToGrid({ text: 'Une phrase, avec une virgule' });
      /* copier : TSV et HTML d'une sélection qui contient une fusion, relus par le collage */
      const src = T.newTable(2, 3, 0);
      T.cellAt(src, 0, 0).text = '**A** et ~~b~~';
      T.mergeCells(src, 0, 1, 1, 2);
      T.cellAt(src, 0, 1).text = 'fusion\nsur deux lignes';
      T.cellAt(src, 0, 1).ah = 'center';
      const rect = { r0: 0, c0: 0, r1: 1, c1: 2 };
      const tsv = P.rectToTsv(src, rect),
        html = P.rectToHtml(src, rect),
        back = P.htmlToGrid(html);
      /* essai au hasard : collages à des positions quelconques, l'invariant tient après chacun */
      let seed = 11;
      const rnd = (n) => {
        seed = (seed * 16807) % 2147483647;
        return seed % n;
      };
      const g = P.htmlToGrid(excel),
        big = T.newTable(5, 5, 1);
      for (let k = 0; k < 120; k++) {
        if (rnd(3) === 0) T.mergeCells(big, rnd(big.rows.length), rnd(big.cols.length), rnd(big.rows.length), rnd(big.cols.length));
        P.pasteGrid(big, k % 2 ? g : back, rnd(big.rows.length), rnd(big.cols.length));
        ok(big, `collage ${k}`);
        if (big.rows.length > 30) T.resizeTable(big, 5, 5);
      }
      return {
        errs,
        lost,
        size,
        b2: { text: b2.text, rs: b2.rs, cs: b2.cs, ah: b2.ah },
        b3: b3 === b2,
        lost2,
        cols2: tb2.cols.length,
        plain: plain.cells.map((c) => c.text),
        plainSize: [plain.R, plain.C],
        one: [one.R, one.C, one.cells[0].text],
        tsv,
        html,
        back: back.cells.map(({ r, c, rs, cs, text, ah }) => [r, c, rs, cs, text, ah || '']),
      };
    },
    [FIX('excel-table.html')],
  );
  expect(r.errs).toEqual([]);
  expect(r.lost).toEqual({ rows: 0, cols: 0 });
  expect(r.size).toEqual([4, 5]); // 3 lignes et 4 colonnes collées à partir de B2
  expect(r.b2).toEqual({ text: '**Pays**', rs: 1, cs: 1, ah: undefined });
  expect(r.lost2).toEqual({ rows: 0, cols: 3 });
  expect(r.cols2).toBe(12);
  expect(r.plainSize).toEqual([2, 2]);
  expect(r.plain).toEqual(['a', 'b', 'c\nd', 'e']);
  expect(r.one).toEqual([1, 1, 'Une phrase, avec une virgule']);
  expect(r.tsv).toBe('A et b\t"fusion\nsur deux lignes"\t\n\t\t');
  expect(r.html).not.toMatch(/var\(|class=|<span/);
  expect(r.back).toEqual([
    [0, 0, 1, 1, '**A** et ~~b~~', ''],
    [0, 1, 2, 2, 'fusion\nsur deux lignes', 'center'],
    [1, 0, 1, 1, '', ''],
  ]);
});

const cellsOf = (page, sel) => page.locator(`#stage .page:not(.ovf-clone) [data-sel="${sel}"] .tbl-cell`);
const editorCell = (page, r, c) =>
  page.evaluate(
    ([r, c]) => {
      const tbl = document.querySelector('.te .tbl');
      const cs = getComputedStyle(tbl);
      return [...tbl.querySelectorAll('.tbl-cell')].find(
        (n) => n.style.gridRow.startsWith(`${r + 1} `) && n.style.gridColumn.startsWith(`${c + 1} `),
      ).dataset.cell;
    },
    [r, c],
  );
const clickCell = async (page, r, c, opts) => page.locator(`.te [data-cell="${await editorCell(page, r, c)}"]`).click(opts);

test('éditeur : ouverture, saisie, sélection, fusion, lignes, Échap en couches, Annuler et Terminer', async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page, 'table');
  /* ouverture par double-clic ; Annuler rend le tableau d'origine */
  await cellsOf(page, 'col:0:1:0').first().dblclick();
  await expect(page.locator('.te')).toBeVisible();
  expect(await page.evaluate(() => [...document.body.children].filter((n) => !n.classList.contains('te') && n.inert).length)).toBeGreaterThan(0);
  await clickCell(page, 1, 0);
  await page.keyboard.type('Hello');
  await page.keyboard.press('Enter');
  await expect(page.locator('.te .tbl-cell').filter({ hasText: 'Hello' })).toHaveCount(1);
  await page.locator('.te .ve-br button', { hasText: 'Cancel' }).click();
  await expect(page.locator('.te')).toHaveCount(0);
  await expect(cellsOf(page, 'col:0:1:0').filter({ hasText: 'Hello' })).toHaveCount(0);

  /* bouton des propriétés */
  await cellsOf(page, 'col:0:1:0').first().click();
  await page.locator('.panel button', { hasText: 'Open the table editor' }).click();
  await expect(page.locator('.te')).toBeVisible();
  /* saisie : Entrée valide et descend, Tab passe à droite, gras par Cmd/Ctrl + B */
  await clickCell(page, 1, 0);
  await page.keyboard.press('Enter');
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type('Belgium');
  await page.keyboard.press('Tab');
  await page.keyboard.type('12');
  await page.keyboard.press('Enter');
  expect(await page.locator('.te .te-where').textContent()).toBe('B3');
  /* Cmd/Ctrl + B sur une cellule sélectionnée : tout son texte en gras */
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ControlOrMeta+b');
  await expect(page.locator('.te .tbl-cell b', { hasText: '12' })).toHaveCount(1);
  /* sélection par Maj + clic puis fusion (deux textes : confirmation) */
  await clickCell(page, 1, 0);
  await clickCell(page, 1, 1, { modifiers: ['Shift'] });
  expect(await page.locator('.te .te-where').textContent()).toBe('A2:B2');
  await page.locator('.te [data-act="merge"]').click();
  await page.locator('dialog.modal[open] button.primary').click();
  await expect(page.locator('.te .tbl-cell')).toHaveCount(9);
  await expect(page.locator('.te .tbl-cell').filter({ hasText: 'Belgium' })).toContainText('12');
  /* scinder, puis annuler (Cmd/Ctrl + Z) ramène la fusion */
  await page.locator('.te [data-act="split"]').click();
  await expect(page.locator('.te .tbl-cell')).toHaveCount(10);
  await page.keyboard.press('ControlOrMeta+z');
  await expect(page.locator('.te .tbl-cell')).toHaveCount(9);
  /* lignes et colonnes */
  await page.locator('.te [data-act="row-below"]').click();
  await expect(page.locator('.te .te-rhd')).toHaveCount(6);
  await page.locator('.te [data-act="col-right"]').click();
  await expect(page.locator('.te .te-ch')).toHaveCount(3);
  await page.locator('.te [data-act="col-del"]').click();
  await expect(page.locator('.te .te-ch')).toHaveCount(2);
  /* en-têtes : toute la colonne (agrandie à la fusion A2:B2 qu'elle coupe), toute la ligne ;
     Échap en couches : la sélection se réduit, puis disparaît, puis l'éditeur demande */
  await page.locator('.te .te-ch').nth(1).click();
  expect(await page.locator('.te .te-where').textContent()).toBe('A1:B6');
  await page.locator('.te .te-rhd').nth(3).click();
  expect(await page.locator('.te .te-where').textContent()).toBe('A4:B4');
  await page.keyboard.press('Escape');
  expect(await page.locator('.te .te-where').textContent()).toBe('A4');
  await page.keyboard.press('Escape');
  expect(await page.locator('.te .te-where').textContent()).toBe('No cell');
  await page.keyboard.press('Escape');
  await expect(page.locator('dialog.modal[open]')).toBeVisible();
  await page.locator('dialog.modal[open] button:not(.primary)').click();
  await expect(page.locator('.te')).toBeVisible();
  /* largeur de colonne : la poignée change la largeur en direct */
  const w0 = await page.locator('.te .te-ch').first().evaluate((n) => n.offsetWidth);
  const hd = await page.locator('.te .te-cw').first().boundingBox();
  await page.mouse.move(hd.x + hd.width / 2, hd.y + hd.height / 2);
  await page.mouse.down();
  await page.mouse.move(hd.x + 60, hd.y + hd.height / 2, { steps: 4 });
  await page.mouse.up();
  expect(await page.locator('.te .te-ch').first().evaluate((n) => n.offsetWidth)).toBeGreaterThan(w0 + 10);
  /* Terminer : le tableau de l'aperçu prend les modifications */
  await page.locator('.te .ve-br button.primary').click();
  await expect(page.locator('.te')).toHaveCount(0);
  await expect(cellsOf(page, 'col:0:1:0')).toHaveCount(11);
  await expect(cellsOf(page, 'col:0:1:0').filter({ hasText: 'Belgium' }).locator('b')).toHaveText('12');
  expect(errors).toEqual([]);
});

test('éditeur : coller depuis Word ancré sur la sélection, copier en TSV et HTML, remplacer sans sélection', async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page, 'table');
  await cellsOf(page, 'col:0:1:0').first().dblclick();
  await clickCell(page, 1, 1);
  const paste = (data) =>
    page.evaluate((d) => {
      const dt = new DataTransfer();
      for (const [k, v] of Object.entries(d)) dt.setData(k, v);
      document.querySelector('.te-stage').dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
    }, data);
  await paste({ 'text/html': FIX('word-table.html'), 'text/plain': 'Country\tBudget 2026' });
  /* collé en B2 : la grille passe à 4 colonnes, la fusion de deux colonnes et l'alignement suivent */
  await expect(page.locator('.te .te-ch')).toHaveCount(4);
  await expect(page.locator('.te .tbl-cell b', { hasText: 'Budget 2026' })).toHaveCount(1);
  expect(await page.locator('.te .tbl-cell', { hasText: 'Budget 2026' }).evaluate((n) => n.style.gridColumn)).toBe('3 / span 2');
  expect(await page.locator('.te .tbl-cell', { hasText: '1.2 bn' }).locator('.rich').evaluate((n) => n.style.textAlign)).toBe('right');
  expect(await page.locator('.te img').count()).toBe(0);
  expect(await page.locator('.te .te-where').textContent()).toBe('B2:D4');
  /* copier : TSV et HTML */
  const copied = await page.evaluate(() => {
    const dt = new DataTransfer();
    document.querySelector('.te-stage').dispatchEvent(new ClipboardEvent('copy', { clipboardData: dt, bubbles: true, cancelable: true }));
    return { text: dt.getData('text/plain'), html: dt.getData('text/html') };
  });
  expect(copied.text.split('\n')[0]).toBe('Country\tBudget 2026\t');
  expect(copied.html).toContain('colspan="2"');
  /* sans sélection : confirmation, puis le tableau est remplacé (Excel : 3 lignes × 4 colonnes) */
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await paste({ 'text/html': FIX('excel-table.html') });
  await page.locator('dialog.modal[open] button.primary').click();
  await expect(page.locator('.te .te-rhd')).toHaveCount(3);
  await expect(page.locator('.te .te-ch')).toHaveCount(4);
  /* texte tabulé seul (repli text/plain) ancré en A1 */
  await clickCell(page, 0, 0);
  await paste({ 'text/plain': 'a\tb\nc\td' });
  await expect(page.locator('.te .tbl-cell').filter({ hasText: /^c$/ })).toHaveCount(1);
  await page.locator('.te .ve-br button.primary').click();
  await expect(cellsOf(page, 'col:0:1:0').filter({ hasText: /^d$/ })).toHaveCount(1);
  expect(errors).toEqual([]);
});
