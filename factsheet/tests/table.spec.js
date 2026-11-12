const { test, expect } = require('@playwright/test');
const { PDFDocument, PDFArray, PDFRawStream, decodePDFRawStream } = require('pdf-lib');
const { openApp, watchErrors, addBundle, DOC_KEY } = require('./helpers');

/* Tableau (phase 1) : modèle pur et ses invariants, réparation à l'ouverture, couleurs, rendu (traits calés sur les cellules), export PDF. */

test('modèle : opérations et invariant « une case = une cellule »', async ({ page }) => {
  await page.goto('/factsheet/tests/blank.html');
  const r = await page.evaluate(() => {
    const T = window.FSTEST.table;
    const errs = [];
    const ok = (tb, what) => {
      const e = T.checkTable(tb);
      if (e.length) errs.push(`${what} : ${e.join(', ')}`);
    };
    const tb = T.newTable(4, 3, 1);
    ok(tb, 'nouveau');
    const text = (r, c, v) => (T.cellAt(tb, r, c).text = v);
    text(1, 0, 'A');
    text(1, 1, 'B');
    text(2, 0, 'C');
    /* fusion : les textes sont mis bout à bout dans l'ordre de lecture */
    const m = T.mergeCells(tb, 1, 0, 2, 1);
    ok(tb, 'fusion');
    const merged = { text: m.text, rs: m.rs, cs: m.cs, n: tb.cells.length };
    /* le rectangle s'agrandit pour ne jamais couper une fusion */
    const rect = T.mergeRect(tb, 2, 1, 2, 2);
    /* insérer une ligne au milieu de la fusion l'allonge ; à la fin, ajoute une ligne de cellules */
    T.insertRow(tb, 2);
    ok(tb, 'insertion de ligne dans la fusion');
    const afterInsert = { rs: m.rs, rows: tb.rows.length, cells: tb.cells.length };
    /* supprimer la ligne de l'ancre : la fusion glisse et garde son texte */
    T.deleteRow(tb, 1);
    ok(tb, 'suppression de la ligne de l’ancre');
    const afterDelete = { r: m.r, rs: m.rs, text: m.text, kept: tb.cells.includes(m) };
    T.insertCol(tb, 1);
    ok(tb, 'insertion de colonne dans la fusion');
    const csAfterCol = m.cs;
    T.deleteCol(tb, 0);
    ok(tb, 'suppression de colonne');
    T.splitCell(tb, m.id);
    ok(tb, 'scission');
    const afterSplit = { rs: m.rs, cs: m.cs, ones: tb.cells.every((c) => c.rs === 1 && c.cs === 1), n: tb.cells.length };
    T.resizeTable(tb, 99, 99);
    ok(tb, 'agrandissement au maximum');
    const max = [tb.rows.length, tb.cols.length];
    T.resizeTable(tb, 2, 2);
    ok(tb, 'réduction');
    /* en-tête */
    T.setHeadRows(tb, 2);
    const heads = tb.rows.map((x) => x.kind);
    /* surcharges d'arêtes : elles suivent les insertions et les suppressions */
    const e = T.newTable(3, 2, 0);
    e.edges['h:2:0'] = T.stroke(1, 'blue');
    e.edges['v:2:1'] = T.stroke(1, 'blue');
    T.insertRow(e, 0);
    const shifted = Object.keys(e.edges).sort();
    T.deleteRow(e, 0);
    const back = Object.keys(e.edges).sort();
    /* essai au hasard : 400 opérations, l'invariant tient après chacune */
    let seed = 7;
    const rnd = (n) => {
      seed = (seed * 16807) % 2147483647;
      return seed % n;
    };
    const f = T.newTable(5, 5, 1);
    for (let i = 0; i < 400; i++) {
      const R = f.rows.length,
        C = f.cols.length,
        op = rnd(7);
      if (op === 0) T.insertRow(f, rnd(R + 1));
      else if (op === 1) T.deleteRow(f, rnd(R));
      else if (op === 2) T.insertCol(f, rnd(C + 1));
      else if (op === 3) T.deleteCol(f, rnd(C));
      else if (op === 4 || op === 5) T.mergeCells(f, rnd(R), rnd(C), rnd(R), rnd(C));
      else T.splitCell(f, f.cells[rnd(f.cells.length)].id);
      ok(f, `essai ${i} (op ${op})`);
      if (errs.length) break;
    }
    return { errs, merged, rect, afterInsert, afterDelete, csAfterCol, afterSplit, max, heads, shifted, back };
  });
  expect(r.errs).toEqual([]);
  expect(r.merged).toEqual({ text: 'A\nB\nC', rs: 2, cs: 2, n: 9 });
  expect(r.rect).toEqual({ r0: 1, c0: 0, r1: 2, c1: 2 });
  expect(r.afterInsert).toEqual({ rs: 3, rows: 5, cells: 10 });
  expect(r.afterDelete).toEqual({ r: 1, rs: 2, text: 'A\nB\nC', kept: true });
  expect(r.csAfterCol).toBe(3);
  expect(r.afterSplit.rs).toBe(1);
  expect(r.afterSplit.ones).toBe(true);
  expect(r.max).toEqual([40, 12]);
  expect(r.heads).toEqual(['head', 'head']);
  expect(r.shifted).toEqual(['h:3:0', 'v:3:1']);
  expect(r.back).toEqual(['h:2:0', 'v:2:1']);
});

test('traits : arêtes réunies en segments, rien à l’intérieur d’une fusion, coins prolongés', async ({ page }) => {
  await page.goto('/factsheet/tests/blank.html');
  const r = await page.evaluate(() => {
    const T = window.FSTEST.table;
    const tb = T.applyPreset(T.newTable(2, 2, 1), 'grid');
    tb.look.top = tb.look.bottom = tb.look.sides = T.stroke(1);
    const all = T.tableSegments(tb);
    const top = all.find((s) => s.o === 'h' && s.i === 0);
    T.mergeCells(tb, 0, 0, 1, 1);
    const merged = T.tableSegments(tb);
    const none = T.tableSegments(T.applyPreset(T.newTable(3, 3, 1), 'none'));
    const rules = T.tableSegments(T.newTable(3, 3, 1)); // préréglage par défaut : filets horizontaux
    return {
      n: all.length,
      top: { a: top.a, b: top.b, w: top.s.w, e0: top.e0, e1: top.e1 },
      widths: all.map((s) => s.s.w),
      merged: merged.length,
      none: none.length,
      rules: rules.map((s) => `${s.o}${s.i}:${s.s.w}`).sort(),
    };
  });
  expect(r.n).toBe(6); // 3 limites de lignes + 3 de colonnes, chacune d'un seul trait
  expect(r.top).toEqual({ a: 0, b: 2, w: 1, e0: 0.5, e1: 0.5 });
  expect(r.widths).toEqual([...r.widths].sort((a, b) => a - b)); // du plus fin au plus épais : le contour passe dessus
  expect(r.merged).toBe(4); // fusion totale : le contour seul
  expect(r.none).toBe(0);
  expect(r.rules).toEqual(['h0:0.5', 'h1:0.5', 'h2:0.25', 'h3:0.5']);
});

test('ouverture : tableau abîmé réparé, type inconnu affiché sans erreur', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/factsheet/tests/blank.html');
  const r = await page.evaluate(() => {
    const { migrate, defaultDoc, newCol, renderDocument, table: T } = window.FSTEST;
    const d = defaultDoc();
    const col = { ...newCol('text'), type: 'table' };
    col.table = {
      rows: [{ kind: 'body' }, { kind: 'head' }, {}],
      cols: [{ w: 2 }, { w: -1 }],
      cells: [
        { id: 'a', r: 0, c: 0, rs: 2, cs: 5, text: 'garde' }, // déborde à droite : rognée
        { id: 'b', r: 1, c: 1, text: 'chevauche' }, // déjà couverte : retirée
        { id: 'a', r: 2, c: 0, text: 'même id' },
        { r: 9, c: 9 },
        'n’importe quoi',
      ],
      edges: { 'h:1:0': { w: 2, color: 'blue' }, 'x:1:1': {}, 'h:99:0': { w: 1 } },
      look: { preset: 'grid', top: { w: 'x', color: '<b>' }, stripe: 'url(x)' },
    };
    d.sections[0].subs[0].cols[0] = col;
    d.sections[0].subs[0].cols[1] = { ...newCol('text'), type: 'futur' };
    const m = migrate(JSON.parse(JSON.stringify(d)));
    const tb = m.sections[0].subs[0].cols[0].table;
    const res = renderDocument(m);
    return {
      errs: T.checkTable(tb),
      a: tb.cells.find((c) => c.text === 'garde'),
      texts: tb.cells.map((c) => c.text).filter(Boolean),
      ids: new Set(tb.cells.map((c) => c.id)).size === tb.cells.length,
      kinds: tb.rows.map((x) => x.kind),
      w: tb.cols.map((c) => c.w),
      edges: Object.keys(tb.edges),
      top: tb.look.top,
      stripe: tb.look.stripe,
      future: !!res.pages[0].el.querySelector('[data-sel="col:0:0:1"] .viz-ph'),
      grid: !!res.pages[0].el.querySelector('[data-sel="col:0:0:0"] .tbl'),
    };
  });
  expect(r.errs).toEqual([]);
  expect(r.a).toMatchObject({ r: 0, c: 0, rs: 2, cs: 2 });
  expect(r.texts).toEqual(['garde', 'même id']);
  expect(r.ids).toBe(true);
  expect(r.kinds).toEqual(['body', 'body', 'body']); // un en-tête doit être en haut
  expect(r.w).toEqual([2, 1]);
  expect(r.edges).toEqual(['h:1:0']);
  expect(r.top).toEqual({ w: 0, color: 'text', dash: null });
  expect(r.stripe).toBe('none');
  expect(r.future).toBe(true);
  expect(r.grid).toBe(true);
  expect(errors).toEqual([]);
});

test('couleurs : supprimer une couleur remplace aussi celles des tableaux', async ({ page }) => {
  await page.goto('/factsheet/tests/blank.html');
  const r = await page.evaluate(() => {
    const { docs, removeColor, colorUses } = window.FSTEST;
    const d = docs.table();
    const tables = () => d.sections.flatMap((s) => s.subs.flatMap((b) => b.cols.filter((c) => c.type === 'table').map((c) => c.table)));
    const before = colorUses(d, 'sky');
    removeColor(d, 'sky', 'yellow');
    const blueBefore = colorUses(d, 'blue');
    removeColor(d, 'blue', 'slate');
    const [grid, zebra, head] = tables();
    return {
      before,
      after: colorUses(d, 'sky'),
      blueBefore,
      fill: grid.cells.find((c) => c.r === 4 && c.c === 0).fill,
      dash: grid.look.head.color,
      stripe: zebra.look.stripe,
      headFill: head.look.headFill,
      inner: head.look.innerH.color,
    };
  });
  expect(r.before).toBeGreaterThan(0);
  expect(r.after).toBe(0);
  expect(r.blueBefore).toBeGreaterThan(0);
  expect(r.fill).toBe('tint-yellow');
  expect(r.dash).toBe('slate');
  expect(r.stripe).toBe('tint-slate');
  expect(r.headFill).toBe('slate');
  expect(r.inner).toBe('tint-slate');
});

test('rendu : traits calés sur les cellules, fusions, fonds', async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page, 'table');
  const r = await page.evaluate(() => {
    const tbl = document.querySelector('#stage .page:not(.ovf-clone) [data-sel="col:0:0:0"] .tbl');
    const box = tbl.getBoundingClientRect(),
      k = tbl.offsetWidth / box.width; // zoom de l'aperçu
    const rel = (el) => {
      const b = el.getBoundingClientRect();
      return { x: (b.left - box.left) * k, y: (b.top - box.top) * k, r: (b.right - box.left) * k, b: (b.bottom - box.top) * k };
    };
    const cells = [...tbl.querySelectorAll('.tbl-cell')].map((c) => ({ ...rel(c), bg: getComputedStyle(c).backgroundColor }));
    const lines = [...tbl.querySelectorAll('.tbl-lines line')].map((l) => ({
      o: l.dataset.o,
      x1: +l.getAttribute('x1'),
      y1: +l.getAttribute('y1'),
      x2: +l.getAttribute('x2'),
      y2: +l.getAttribute('y2'),
      w: +l.getAttribute('stroke-width'),
      dash: l.getAttribute('stroke-dasharray'),
    }));
    return { W: tbl.offsetWidth, H: tbl.offsetHeight, cells, lines, n: tbl.querySelectorAll('.tbl-cell').length };
  });
  expect(r.n).toBe(20 - 1 - 1 - 3); // 5 × 4 cases, fusions de 2, 2 et 4 cases
  const near = (a, b, tol = 0.05) => Math.abs(a - b) <= tol;
  /* chaque bord de cellule tombe sur un trait (limites de la grille) */
  const ys = [...new Set(r.lines.filter((l) => l.o === 'h').map((l) => l.y1))],
    xs = [...new Set(r.lines.filter((l) => l.o === 'v').map((l) => l.x1))];
  for (const c of r.cells) {
    expect(
      ys.some((y) => near(y, c.y)),
      `haut de cellule ${c.y} sans trait ${ys}`,
    ).toBe(true);
    expect(
      ys.some((y) => near(y, c.b)),
      `bas de cellule ${c.b}`,
    ).toBe(true);
    expect(
      xs.some((x) => near(x, c.x)),
      `gauche de cellule ${c.x} sans trait ${xs}`,
    ).toBe(true);
    expect(
      xs.some((x) => near(x, c.r)),
      `droite de cellule ${c.r}`,
    ).toBe(true);
  }
  /* contour : 1 pt, prolongé d'un demi-trait aux coins (pas d'encoche) */
  const top = r.lines.find((l) => l.o === 'h' && near(l.y1, 0));
  expect(top.w).toBeCloseTo(4 / 3, 3);
  expect(top.x1).toBeCloseTo(-2 / 3, 2);
  expect(top.x2).toBeCloseTo(r.W + 2 / 3, 2);
  /* filets intérieurs de 0,25 pt, ligne d'en-tête en tirets de 2 / 1,5 pt */
  expect(r.lines.some((l) => near(l.w, 1 / 3, 0.001))).toBe(true);
  const dashed = r.lines.filter((l) => l.dash);
  expect(dashed.length).toBe(1);
  expect(dashed[0].dash.split(' ').map(Number)).toEqual([2.6667, 2]);
  /* aucun trait ne traverse une fusion : 3 traits intérieurs coupés en plusieurs segments */
  const inner = r.lines.filter((l) => l.o === 'v' && !near(l.x1, 0) && !near(l.x1, r.W));
  expect(inner.length).toBeGreaterThan(3);
  expect(r.cells.some((c) => c.bg !== 'rgba(0, 0, 0, 0)')).toBe(true);
  expect(errors).toEqual([]);
});

test('PDF : traits fins, tirets et fonds exportés dans l’espace de couleur du profil', async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page, 'table');
  await addBundle(page, 'pdfexport.js');
  for (const profile of ['x4', 'rgb']) {
    const b64 = await page.evaluate(
      async ([key, profile]) => {
        const { bytes } = await window.FSPDF.build(JSON.parse(localStorage.getItem(key)), 'net', { profile });
        return await new Promise((res) => {
          const fr = new FileReader();
          fr.onload = () => res(String(fr.result).split(',')[1]);
          fr.readAsDataURL(new Blob([bytes]));
        });
      },
      [DOC_KEY, profile],
    );
    const pdf = await PDFDocument.load(Buffer.from(b64, 'base64'));
    const p = pdf.getPages()[0],
      c = p.node.Contents(),
      list = c instanceof PDFArray ? c.asArray().map((x) => pdf.context.lookup(x)) : [c];
    const txt = list
      .map((st) => Buffer.from(st instanceof PDFRawStream ? decodePDFRawStream(st).decode() : st.getContents()).toString('latin1'))
      .join('\n');
    const widths = [...txt.matchAll(/([\d.]+) w(?=\s)/g)].map((m) => +m[1]);
    const has = (v) => widths.some((w) => Math.abs(w - v) / v < 0.002);
    expect(has(0.25), `filet de 0,25 pt (${[...new Set(widths)].join(' ')})`).toBe(true);
    expect(has(0.5), 'trait de 0,5 pt').toBe(true);
    expect(has(1), 'contour de 1 pt').toBe(true);
    const dash = /\[\s*([\d.]+)\s+([\d.]+)\s*\]\s*0\s+d/.exec(txt);
    expect(dash, 'motif de tirets').not.toBeNull();
    expect(+dash[1]).toBeCloseTo(2, 2);
    expect(+dash[2]).toBeCloseTo(1.5, 2);
    const rgb = (txt.match(/(^|\s)(rg|RG)(?=\s|$)/g) || []).length,
      cmyk = (txt.match(/(^|\s)[kK](?=\s|$)/g) || []).length;
    if (profile === 'rgb') expect(cmyk).toBe(0);
    else expect(rgb).toBe(0);
  }
  expect(errors).toEqual([]);
});

test('propriétés : nombre de lignes, en-tête et préréglage', async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page, 'table');
  await page.locator('#stage [data-sel="col:0:1:1"] .tbl-cell').last().click();
  const rows = page.locator('.panel label.f', { hasText: /^Rows/ }).locator('input');
  await rows.fill('6');
  await rows.press('Enter');
  const count = () => page.locator('#stage .page:not(.ovf-clone) [data-sel="col:0:1:1"] .tbl-cell').count();
  await expect.poll(count).toBe(18);
  await page.locator('.panel .f', { hasText: 'Header rows' }).locator('button', { hasText: '2' }).click();
  await expect.poll(() => page.locator('#stage .page:not(.ovf-clone) [data-sel="col:0:1:1"] .tbl-head').count()).toBe(6);
  await page.locator('.panel .f', { hasText: 'Preset' }).locator('button.cs').click();
  await page.locator('.cs-pop button', { hasText: 'Grid' }).click();
  await expect.poll(() => page.locator('#stage .page:not(.ovf-clone) [data-sel="col:0:1:1"] .tbl-lines line').count()).toBeGreaterThan(6);
  expect(errors).toEqual([]);
});
