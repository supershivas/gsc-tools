const { test, expect } = require('@playwright/test');
const { PDFDocument, PDFArray, PDFRawStream, decodePDFRawStream } = require('pdf-lib');
const { openApp, watchErrors, addBundle, DOC_KEY } = require('./helpers');

/* Tableau (phase 3) : fonds (cellule, ligne, colonne, alternance, en-tête, pied), contours par arête sur une sélection,
   préréglages ; couleurs de toutes les nouvelles clés ; éditeur (panneau) ; PDF (épaisseurs, tirets, CMJN). */

test('modèle : fonds (priorités, pied) et pied de tableau', async ({ page }) => {
  await page.goto('/factsheet/tests/blank.html');
  const r = await page.evaluate(() => {
    const T = window.FSTEST.table;
    const tb = T.newTable(5, 2, 1);
    T.setFootRows(tb, 1);
    Object.assign(tb.look, { headFill: 'slate', footFill: 'grey', stripe: 'tint-blue' });
    tb.cols[1].fill = 'sky';
    const at = (r, c) => T.fillOf(tb, T.cellAt(tb, r, c));
    const first = {
      head0: at(0, 0),
      head1: at(0, 1),
      foot0: at(4, 0),
      foot1: at(4, 1),
      body1: at(1, 0),
      stripe: at(2, 0),
      stripeCol: at(2, 1),
    };
    tb.rows[2].fill = 'yellow';
    const row = { a: at(2, 0), b: at(2, 1) };
    T.cellAt(tb, 2, 1).fill = 'blue';
    const cell = at(2, 1);
    /* pied : au bas seulement, jamais sur l'en-tête, suit les lignes insérées */
    const t2 = T.newTable(4, 2, 2);
    T.setFootRows(t2, 5);
    const kinds = () => t2.rows.map((x) => x.kind[0]).join('');
    const k1 = kinds();
    T.insertRow(t2, 4); // après le pied : reste du pied
    const k2 = kinds();
    T.insertRow(t2, 2); // entre le corps et le pied : du corps
    const k3 = kinds();
    /* ouverture : pied au milieu → corps ; fonds invalides retirés */
    const src = JSON.parse(JSON.stringify(T.newTable(4, 2, 1)));
    src.rows[2].kind = 'foot';
    src.rows[1].fill = '#fff';
    src.cols[0].fill = 'sky';
    src.look.footFill = '#abc';
    const rep = T.repairTable(src);
    /* préréglage à pied : texte et fusions gardés */
    const t3 = T.newTable(4, 3, 1);
    T.cellAt(t3, 1, 0).text = 'Garder';
    T.mergeCells(t3, 1, 1, 2, 2);
    T.applyPreset(t3, 'footer');
    return {
      first,
      row,
      cell,
      k1,
      k2,
      k3,
      repKinds: rep.rows.map((x) => x.kind),
      repRowFill: rep.rows[1].fill,
      repColFill: rep.cols[0].fill,
      repFoot: rep.look.footFill,
      foot3: T.footCount(t3),
      text3: T.cellAt(t3, 1, 0).text,
      merged3: T.cellAt(t3, 1, 1).rs + 'x' + T.cellAt(t3, 1, 1).cs,
      err3: T.checkTable(t3),
      preset3: t3.look.preset,
    };
  });
  expect(r.first).toEqual({
    head0: 'slate',
    head1: 'sky',
    foot0: 'grey',
    foot1: 'sky',
    body1: 'none',
    stripe: 'tint-blue',
    stripeCol: 'sky',
  });
  expect(r.row).toEqual({ a: 'yellow', b: 'yellow' });
  expect(r.cell).toBe('blue');
  expect(r.k1).toBe('hhff'); // 2 lignes d'en-tête : le pied ne les recouvre pas (2 lignes restantes)
  expect(r.k2).toBe('hhfff');
  expect(r.k3).toBe('hhbfff');
  expect(r.repKinds).toEqual(['head', 'body', 'body', 'body']);
  expect(r.repRowFill).toBeUndefined();
  expect(r.repColFill).toBe('sky');
  expect(r.repFoot).toBe('none');
  expect(r.foot3).toBe(1);
  expect(r.text3).toBe('Garder');
  expect(r.merged3).toBe('2x2');
  expect(r.err3).toEqual([]);
  expect(r.preset3).toBe('footer');
});

test('modèle : surcharges d’arêtes d’une sélection avec fusions, invariant tenu', async ({ page }) => {
  await page.goto('/factsheet/tests/blank.html');
  const r = await page.evaluate(() => {
    const T = window.FSTEST.table;
    const tb = T.newTable(4, 4, 1);
    T.mergeCells(tb, 1, 1, 2, 2);
    const all = { r0: 0, c0: 0, r1: 3, c1: 3 };
    const dashed = T.stroke(0.75, 'sky', [3, 2]);
    const keys = (sides, R = all) => {
      const t = JSON.parse(JSON.stringify(tb));
      T.setEdges(t, R, sides, dashed);
      return Object.keys(t.edges).sort();
    };
    const innerH = keys(['innerH']);
    const outer = keys(['top', 'bottom', 'left', 'right']);
    const every = keys(T.EDGE_SIDES);
    /* sélection qui coupe la fusion : le rectangle s'agrandit, l'extérieur suit */
    const R = T.mergeRect(tb, 0, 0, 1, 1);
    const sub = keys(['bottom', 'right'], R);
    /* poser, lire, retirer */
    T.setEdges(tb, all, ['top'], T.stroke(1, 'blue', [4, 2]));
    const read = T.sideStroke(tb, all, 'top');
    const mixed = T.sideStroke(tb, all, 'bottom'); // aucune surcharge : le trait du tableau (préréglage « filets »)
    T.setEdges(tb, { r0: 0, c0: 0, r1: 0, c1: 1 }, ['top'], T.stroke(2, 'blue'));
    const diff = T.sideStroke(tb, all, 'top');
    T.setEdges(tb, all, ['top'], T.stroke(0));
    const none = T.edgeStroke(tb, 'h', 0, 0);
    const segsNone = T.tableSegments(tb).filter((g) => g.o === 'h' && g.i === 0).length;
    T.setEdges(tb, all, ['top'], undefined);
    const cleared = Object.keys(tb.edges).length;
    /* réglages du tableau sans sélection */
    T.setLookStroke(tb, ['left', 'right'], T.stroke(1, 'slate'));
    T.setLookStroke(tb, ['head'], T.stroke(0.5, 'blue', [2, 1.5]));
    const look = { sides: tb.look.sides, head: T.lookStroke(tb, 'head'), preset: tb.look.preset };
    T.setLookStroke(tb, ['head'], null);
    return {
      innerH,
      outerN: outer.length,
      everyN: every.length,
      sub,
      read,
      mixed,
      diff,
      none,
      segsNone,
      cleared,
      look,
      headOff: T.lookStroke(tb, 'head'),
      err: T.checkTable(tb),
    };
  });
  expect(r.innerH).toHaveLength(10); // 12 arêtes moins les 2 qui traversent la fusion
  expect(r.innerH).not.toContain('h:2:1');
  expect(r.outerN).toBe(16);
  expect(r.everyN).toBe(36);
  expect(r.sub).toEqual(['h:3:0', 'h:3:1', 'h:3:2', 'v:0:3', 'v:1:3', 'v:2:3']);
  expect(r.read).toEqual({ none: false, s: { w: 1, color: 'blue', dash: [4, 2] } });
  expect(r.mixed.s).toEqual({ w: 0.5, color: 'text', dash: null });
  expect(r.diff).toEqual({ none: false, s: null }); // traits différents sur le côté
  expect(r.none).toBeNull();
  expect(r.cleared).toBe(0);
  expect(r.look.sides).toEqual({ w: 1, color: 'slate', dash: null });
  expect(r.look.head).toEqual({ w: 0.5, color: 'blue', dash: [2, 1.5] });
  expect(r.look.preset).toBe('custom');
  expect(r.headOff).toBeNull();
  expect(r.err).toEqual([]);
});

test('couleurs : les nouvelles clés (pied, trait du pied, fonds de ligne et de colonne) suivent la suppression d’une couleur', async ({
  page,
}) => {
  await page.goto('/factsheet/tests/blank.html');
  const r = await page.evaluate(() => {
    const { docs, removeColor, colorUses } = window.FSTEST;
    const d = docs['table-style']();
    const tb = () => d.sections[0].subs[0].cols[0].table;
    const before = { sky: colorUses(d, 'sky'), grey: colorUses(d, 'grey'), blue: colorUses(d, 'blue'), yellow: colorUses(d, 'yellow') };
    removeColor(d, 'grey', 'yellow');
    removeColor(d, 'sky', 'slate');
    removeColor(d, 'blue', 'slate');
    const T = tb();
    return {
      before,
      after: { sky: colorUses(d, 'sky'), grey: colorUses(d, 'grey'), blue: colorUses(d, 'blue') },
      footFill: T.look.footFill,
      foot: T.look.foot.color,
      rowFill: T.rows[2].fill,
      colFill: T.cols[2].fill,
      edge: T.edges['h:4:0'].color,
    };
  });
  expect(r.before.grey).toBeGreaterThan(0);
  expect(r.before.sky).toBeGreaterThan(0);
  expect(r.after).toEqual({ sky: 0, grey: 0, blue: 0 });
  expect(r.footFill).toBe('yellow'); // fond du pied : grey → yellow
  expect(r.foot).toBe('slate'); // trait du pied : blue → slate
  expect(r.rowFill).toBe('slate'); // fond de ligne : sky → slate
  expect(r.colFill).toBe('tint-slate'); // fond de colonne : tint-sky → tint-slate
  expect(r.edge).toBe('slate');
});

const cellsOf = (page, sel) => page.locator(`#stage .page:not(.ovf-clone) [data-sel="${sel}"] .tbl-cell`);
const editorCell = (page, r, c) =>
  page.evaluate(
    ([r, c]) =>
      [...document.querySelectorAll('.te .tbl .tbl-cell')].find(
        (n) => n.style.gridRow.startsWith(`${r + 1} `) && n.style.gridColumn.startsWith(`${c + 1} `),
      ).dataset.cell,
    [r, c],
  );
const clickCell = async (page, r, c, opts) => page.locator(`.te [data-cell="${await editorCell(page, r, c)}"]`).click(opts);
/** couleur CSS calculée d'une clé de palette, lue dans l'éditeur ou dans l'aperçu */
const rgbOf = (page, scope, key) =>
  page.evaluate(
    ([scope, key]) => {
      const host = document.querySelector(scope),
        p = document.createElement('i');
      p.style.background = `var(--c-${key})`;
      host.append(p);
      const v = getComputedStyle(p).backgroundColor;
      p.remove();
      return v;
    },
    [scope, key],
  );
const pickColor = async (page, k, name) => {
  await page.locator(`.te button.cs[data-k="${k}"]`).click();
  await page.locator('.cs-pop button[role="option"]', { hasText: name }).first().click();
};

test('éditeur : fond d’une ligne par son en-tête, de la cellule, alternance et pied', async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page, 'table');
  await cellsOf(page, 'col:0:1:0').first().dblclick();
  await expect(page.locator('.te')).toBeVisible();
  /* en-tête de la ligne 4 → fond de ligne (la ligne 4 n'est pas zébrée) */
  await page.locator('.te .te-rhd').nth(3).click();
  await expect(page.locator('.te [data-card="fill"]')).toContainText('Row 4');
  await pickColor(page, 'fill', 'Sky blue');
  const sky = await rgbOf(page, '.te', 'sky');
  const bgs = () =>
    page.locator('.te .tbl-cell').evaluateAll((ns) => ns.map((n) => [n.style.gridRow, getComputedStyle(n).backgroundColor]));
  const row4 = (await bgs()).filter(([r]) => r.startsWith('4 '));
  expect(row4).toHaveLength(2);
  row4.forEach(([, bg]) => expect(bg).toBe(sky));
  /* un fond de cellule l'emporte sur la ligne */
  await clickCell(page, 3, 0);
  await expect(page.locator('.te [data-card="fill"]')).toContainText('Selected cells');
  await pickColor(page, 'fill', 'Yellow star');
  const yellow = await rgbOf(page, '.te', 'yellow');
  const row4b = (await bgs()).filter(([r]) => r.startsWith('4 ')).map(([, bg]) => bg);
  expect(row4b).toEqual([yellow, sky]);
  /* pied : une ligne de pied colorée */
  await page.locator('.te [data-card="fill"] [data-seg="foot"][data-v="1"]').click();
  await expect(page.locator('.te .tbl-foot')).toHaveCount(2);
  await pickColor(page, 'footFill', 'Light grey');
  const grey = await rgbOf(page, '.te', 'grey');
  expect(await page.locator('.te .tbl-foot').evaluateAll((ns) => ns.map((n) => getComputedStyle(n).backgroundColor))).toEqual([grey, grey]);
  /* Annuler (historique de l'éditeur) retire le pied et la couleur */
  await page.keyboard.press('ControlOrMeta+z');
  await page.keyboard.press('ControlOrMeta+z');
  await expect(page.locator('.te .tbl-foot')).toHaveCount(0);
  await page.locator('.te .ve-br button.primary').click();
  await expect(page.locator('.te')).toHaveCount(0);
  const kept = await cellsOf(page, 'col:0:1:0').evaluateAll((ns) => ns.map((n) => [n.style.gridRow, getComputedStyle(n).backgroundColor]));
  expect(kept.filter(([r]) => r.startsWith('4 ')).map(([, bg]) => bg)).toEqual([yellow, sky]);
  expect(errors).toEqual([]);
});

test('éditeur : contour extérieur en tirets de 1 pt sur une sélection, préréglage avec confirmation', async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page, 'table');
  await cellsOf(page, 'col:0:1:0').first().dblclick();
  await clickCell(page, 1, 0);
  await clickCell(page, 3, 1, { modifiers: ['Shift'] });
  expect(await page.locator('.te .te-where').textContent()).toBe('A2:B4');
  const edges = page.locator('.te [data-card="edges"]');
  await edges.locator('[data-pick="outer"]').click();
  await edges.locator('[data-seg="style"][data-v="dashed"]').click();
  const w = edges.locator('input[data-k="w"]');
  await w.fill('1');
  await w.press('Enter');
  /* retour en direct dans l'éditeur : 4 segments (haut, bas, gauche, droite) de 1 pt en tirets de 3 / 2 pt */
  const dashed = (scope) =>
    page
      .locator(`${scope} .tbl-lines line[stroke-dasharray]`)
      .evaluateAll((ns) => ns.map((n) => [n.dataset.o, +n.getAttribute('stroke-width'), n.getAttribute('stroke-dasharray')]));
  const live = await dashed('.te');
  expect(live).toHaveLength(4);
  live.forEach(([, sw, da]) => {
    expect(sw).toBeCloseTo(4 / 3, 3);
    expect(da).toBe('4 2.6667');
  });
  expect(live.filter(([o]) => o === 'h')).toHaveLength(2);
  /* tiret réglable en points */
  await edges.locator('input[data-k="dash0"]').fill('5');
  await edges.locator('input[data-k="dash0"]').press('Enter');
  expect((await dashed('.te'))[0][2]).toBe('6.6667 2.6667');
  /* aucun trait sur le haut : le segment disparaît */
  await edges.locator('[data-pick="none"]').click();
  await edges.locator('[data-side="top"]').click();
  await edges.locator('[data-seg="style"][data-v="none"]').click();
  expect(await dashed('.te')).toHaveLength(3);
  /* préréglage : confirmation car des arêtes ont été réglées ; le texte reste */
  await page.locator('.te [data-card="presets"] [data-preset="headfill"]').click();
  await page.locator('dialog.modal[open] button:not(.primary)').click(); // refuser
  expect(await dashed('.te')).toHaveLength(3);
  await page.locator('.te [data-card="presets"] [data-preset="headfill"]').click();
  await page.locator('dialog.modal[open] button.primary').click();
  await expect.poll(async () => (await dashed('.te')).length).toBe(0);
  await expect(page.locator('.te .tbl-head').first()).toContainText('Column 1');
  /* sans sélection : réglage du tableau (trait sous l'en-tête, en tirets) */
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await expect(page.locator('.te .te-where')).toHaveText('No cell');
  await edges.locator('[data-pick="none"]').click();
  await edges.locator('[data-side="head"]').click();
  await edges.locator('[data-seg="style"][data-v="dotted"]').click();
  await expect.poll(async () => (await dashed('.te')).length).toBe(1);
  await page.locator('.te .ve-br button.primary').click();
  await expect(page.locator('.te')).toHaveCount(0);
  expect(await dashed('#stage .page:not(.ovf-clone) [data-sel="col:0:1:0"]')).toHaveLength(1);
  expect(errors).toEqual([]);
});

test('PDF : fonds et traits du tableau habillé (épaisseurs, tirets, CMJN)', async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page, 'table-style');
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
    for (const v of [0.25, 1, 1.5, 3]) expect(has(v), `trait de ${v} pt (${[...new Set(widths)].join(' ')})`).toBe(true);
    const dash = /\[\s*([\d.]+)\s+([\d.]+)\s*\]\s*0\s+d/.exec(txt);
    expect(dash, 'motif de tirets').not.toBeNull();
    expect(+dash[1]).toBeCloseTo(3, 2);
    expect(+dash[2]).toBeCloseTo(2, 2);
    const tuples = (op) =>
      new Set(
        [...txt.matchAll(new RegExp(`((?:-?[\\d.]+\\s+){4})${op}(?=\\s)`, 'g'))].map((m) =>
          m[1]
            .trim()
            .split(/\s+/)
            .map((x) => +(+x).toFixed(2))
            .join(' '),
        ),
      );
    if (profile === 'x4') {
      const fills = tuples('k'),
        strokes = tuples('K');
      /* fonds : cellule (yellow), ligne (sky), en-tête (slate), pied (grey) ; traits : slate (tirets) et blue (3 pt, pied) */
      for (const f of ['0 0 1 0', '0.35 0.12 0 0', '0.62 0.48 0.47 0.3', '0.14 0.09 0.07 0'])
        expect(fills.has(f), `fond ${f} (${[...fills]})`).toBe(true);
      for (const s of ['0.62 0.48 0.47 0.3', '1 0.8 0 0']) expect(strokes.has(s), `trait ${s} (${[...strokes]})`).toBe(true);
      expect((txt.match(/(^|\s)(rg|RG)(?=\s|$)/g) || []).length).toBe(0);
    } else expect((txt.match(/(^|\s)[kK](?=\s|$)/g) || []).length).toBe(0);
  }
  expect(errors).toEqual([]);
});
