const { test, expect } = require('@playwright/test');
const { openApp, watchErrors } = require('./helpers');

/* Tableau (phase 5) : réordonner, dupliquer, répartir, ajuster au contenu (opérations pures et invariants de la grille),
   glisser-déposer d'une ligne / colonne dans l'éditeur, avertissements, indépendance de deux tableaux. */

test('modèle : déplacer, dupliquer, répartir, ajuster — la grille reste cohérente après chaque opération', async ({ page }) => {
  await page.goto('/factsheet/tests/blank.html');
  const r = await page.evaluate(() => {
    const T = window.FSTEST.table;
    const errs = [];
    const ok = (tb, what) => T.checkTable(tb).forEach((e) => errs.push(`${what} : ${e}`));
    const texts = (tb) => {
      const g = [];
      tb.cells.forEach((cl) => ((g[cl.r] = g[cl.r] || [])[cl.c] = cl.text));
      return g.map((row) => row.join('|'));
    };
    const tb = T.newTable(4, 3, 1);
    ['a0', 'b0', 'c0', 'a1', 'b1', 'c1', 'a2', 'b2', 'c2', 'a3', 'b3', 'c3'].forEach(
      (v, k) => (T.cellAt(tb, Math.floor(k / 3), k % 3).text = v),
    );
    const kinds0 = tb.rows.map((x) => x.kind);
    /* lignes : la première passe en dernier, l'en-tête reste attaché à la position */
    const moved = T.moveTracks(tb, 'row', 0, 0, 3);
    ok(tb, 'ligne 0 → 3');
    const afterRow = texts(tb);
    const kinds1 = tb.rows.map((x) => x.kind);
    /* colonnes : un bloc de deux colonnes */
    T.moveTracks(tb, 'col', 0, 1, 1);
    ok(tb, 'colonnes 0-1 → 1');
    const afterCol = texts(tb);
    /* même place ou hors limites : refusé, rien ne change */
    const same = T.moveTracks(tb, 'row', 1, 1, 1);
    const out = T.moveTracks(tb, 'row', 0, 0, 9);
    /* fusion : on ne la coupe pas, on peut la déplacer entière */
    const m = T.newTable(4, 3, 0);
    T.mergeCells(m, 1, 0, 2, 0);
    const cut = T.moveTracks(m, 'row', 1, 1, 3);
    const cutOk = T.checkTable(m).length === 0;
    const whole = T.moveTracks(m, 'row', 1, 2, 2);
    ok(m, 'fusion déplacée');
    const mc = m.cells.find((x) => x.rs === 2);
    /* arêtes : la surcharge suit la ligne */
    const e = T.newTable(3, 2, 0);
    T.setEdges(e, { r0: 1, c0: 0, r1: 1, c1: 1 }, ['left'], T.stroke(2, 'blue'));
    const before = Object.keys(e.edges).sort();
    T.moveTracks(e, 'row', 1, 1, 0);
    const after = Object.keys(e.edges).sort();
    ok(e, 'arêtes');
    /* dupliquer : ligne avec fusion horizontale + colonne avec fusion verticale */
    const d = T.newTable(3, 3, 0);
    T.cellAt(d, 1, 0).text = 'x';
    T.mergeCells(d, 1, 1, 1, 2);
    T.cellAt(d, 1, 1).text = 'wide';
    const dup = T.duplicateTrack(d, 'row', 1);
    ok(d, 'dupliquer ligne');
    const dupRow = d.cells.filter((x) => x.r === 2).map((x) => `${x.text}:${x.cs}`);
    const v = T.newTable(3, 3, 0);
    T.mergeCells(v, 0, 1, 1, 1);
    T.cellAt(v, 2, 1).text = 'tail';
    T.duplicateTrack(v, 'col', 1);
    ok(v, 'dupliquer colonne');
    const spans = v.cells.filter((x) => x.rs === 2).length;
    const full = T.newTable(T.TABLE_MAX.rows, 2, 0);
    const refused = T.duplicateTrack(full, 'row', 0);
    /* répartir et ajuster */
    const w = T.newTable(2, 4, 0);
    w.cols.forEach((c, k) => (c.w = [1, 3, 1, 3][k]));
    T.distributeCols(w, 0, 1);
    const evenW = w.cols.map((c) => c.w);
    const hh = T.newTable(3, 2, 0);
    T.distributeRows(hh, 0, 2, [30, 50, 41]);
    const evenH = hh.rows.map((x) => x.h);
    const f = T.newTable(2, 3, 0);
    T.fitCols(f, [100, 300, 200], 0, 2);
    const fitW = f.cols.map((c) => c.w);
    return {
      moved,
      afterRow,
      kinds0,
      kinds1,
      afterCol,
      same,
      out,
      cut,
      cutOk,
      whole,
      mc: mc && [mc.r, mc.rs],
      before,
      after,
      dup,
      dupRow,
      spans,
      refused,
      evenW,
      evenH,
      fitW,
      errs,
    };
  });
  expect(r.errs).toEqual([]);
  expect(r.moved).toBe(true);
  expect(r.afterRow).toEqual(['a1|b1|c1', 'a2|b2|c2', 'a3|b3|c3', 'a0|b0|c0']);
  expect(r.kinds1).toEqual(r.kinds0);
  expect(r.afterCol).toEqual(['c1|a1|b1', 'c2|a2|b2', 'c3|a3|b3', 'c0|a0|b0']);
  expect([r.same, r.out, r.cut, r.cutOk]).toEqual([false, false, false, true]);
  expect(r.whole).toBe(true);
  expect(r.mc).toEqual([2, 2]);
  expect(r.before).toEqual(['v:1:0']);
  expect(r.after).toEqual(['v:0:0']);
  expect(r.dup).toBe(true);
  expect(r.dupRow.sort()).toEqual(['wide:2', 'x:1']);
  expect(r.spans).toBe(2);
  expect(r.refused).toBe(false);
  expect(r.evenW).toEqual([2, 2, 1, 3]);
  expect(r.evenH).toEqual([51, 51, 51]);
  expect(r.fitW.reduce((a, b) => a + b, 0)).toBeCloseTo(3, 2);
  expect(r.fitW[1] / r.fitW[0]).toBeCloseTo(3, 1);
});

test('isolation : deux tableaux modifiés en alternance ne s’influencent pas', async ({ page }) => {
  await page.goto('/factsheet/tests/blank.html');
  const r = await page.evaluate(() => {
    const T = window.FSTEST.table;
    const mk = () => {
      const tb = T.newTable(3, 3, 1);
      tb.cells.forEach((cl) => (cl.text = `${cl.r}${cl.c}`));
      return tb;
    };
    const solo = mk();
    T.moveTracks(solo, 'row', 0, 0, 2);
    T.duplicateTrack(solo, 'col', 0);
    const a = mk(),
      b = mk();
    T.moveTracks(a, 'row', 0, 0, 2);
    T.moveTracks(b, 'col', 2, 2, 0);
    T.duplicateTrack(a, 'col', 0);
    T.duplicateTrack(b, 'row', 1);
    const norm = (tb) => JSON.stringify(tb).replace(/"id":"[^"]+"/g, '');
    return { same: norm(a) === norm(solo), differ: norm(a) !== norm(b), okA: T.checkTable(a), okB: T.checkTable(b) };
  });
  expect(r).toEqual({ same: true, differ: true, okA: [], okB: [] });
});

const headTexts = (page) =>
  page.locator('.te-holder .tbl-cell').evaluateAll((els) =>
    els
      .filter((n) => n.style.gridRow.startsWith('1 '))
      .sort((a, b) => parseInt(a.style.gridColumn) - parseInt(b.style.gridColumn))
      .map((n) => n.textContent.trim()),
  );

async function drag(page, from, to, { drop = true } = {}) {
  const a = await page.locator(from).boundingBox(),
    b = await page.locator(to).boundingBox();
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(a.x + a.width / 2 + 8, a.y + a.height / 2 + 8, { steps: 3 });
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 });
  if (drop) await page.mouse.up();
}

test('éditeur : glisser une colonne, Échap annule, une fusion ne se coupe pas, boutons, avertissements', async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page, 'table');
  await page.locator('[data-sel="col:0:0:0"]').first().dblclick();
  await expect(page.locator('.te')).toBeVisible();
  expect(await headTexts(page)).toEqual(['Country', 'Budget', 'Share', 'Trend']);
  /* un clic simple sur une en-tête non sélectionnée sélectionne, sans rien déplacer */
  await page.locator('.te .te-ch[data-col="0"]').click();
  expect(await headTexts(page)).toEqual(['Country', 'Budget', 'Share', 'Trend']);
  /* entre les deux colonnes fusionnées (C, D) : pas de dépôt possible, rien n'est réarrangé */
  await drag(page, '.te .te-ch[data-col="0"]', '.te .te-ch[data-col="2"]', { drop: false });
  await expect(page.locator('.te .drag-obj')).toHaveCount(1);
  await expect(page.locator('.te .te-drop')).toHaveCount(0);
  expect(await headTexts(page)).toEqual(['Country', 'Budget', 'Share', 'Trend']);
  await page.mouse.up();
  expect(await headTexts(page)).toEqual(['Country', 'Budget', 'Share', 'Trend']);
  /* Échap pendant le geste : tout revient, l'éditeur reste ouvert */
  await drag(page, '.te .te-ch[data-col="0"]', '.te .te-ch[data-col="1"]', { drop: false });
  await expect(page.locator('.te .drag-obj')).toHaveCount(1);
  await expect(page.locator('.te .te-drop')).toHaveCount(1);
  expect((await headTexts(page))[0]).not.toBe('Country'); // réarrangement en direct
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await expect(page.locator('.drag-obj')).toHaveCount(0);
  await expect(page.locator('.te')).toBeVisible();
  expect(await headTexts(page)).toEqual(['Country', 'Budget', 'Share', 'Trend']);
  /* dépôt : « Country » passe en deuxième colonne */
  await drag(page, '.te .te-ch[data-col="0"]', '.te .te-ch[data-col="1"]');
  expect(await headTexts(page)).toEqual(['Budget', 'Country', 'Share', 'Trend']);
  await expect(page.locator('.te .te-where')).toHaveText('B1:B5');
  /* annuler (historique de l'éditeur) */
  await page.locator('.te .ve-hist').first().click();
  expect(await headTexts(page)).toEqual(['Country', 'Budget', 'Share', 'Trend']);
  /* une ligne prise au milieu d'une fusion verticale ne peut pas traverser la fusion */
  await page.locator('.te .te-rhd[data-row="1"]').click();
  await drag(page, '.te .te-rhd[data-row="1"]', '.te .te-rhd[data-row="2"]');
  expect(await headTexts(page)).toEqual(['Country', 'Budget', 'Share', 'Trend']);
  /* boutons : dupliquer la colonne, monter / descendre, répartir */
  await page.locator('.te .te-ch[data-col="0"]').click();
  await page.locator('.te [data-act="col-dup"]').click();
  await expect(page.locator('.te .te-ch')).toHaveCount(5);
  await page.locator('.te [data-act="col-right-move"]').click();
  await expect(page.locator('.te .te-where')).toHaveText('C1:C5');
  await page.locator('.te [data-act="col-even"]').click();
  await page.locator('.te [data-act="col-fit"]').click();
  await page.locator('.te .te-rhd[data-row="0"]').click();
  await page.locator('.te [data-act="row-dup"]').click();
  await expect(page.locator('.te .te-rhd')).toHaveCount(6);
  await page.locator('.te [data-act="row-even"]').click();
  /* avertissement : colonne trop étroite (poignée de largeur tirée à fond) */
  await expect(page.locator('.te .te-warn')).toHaveText('');
  const cw = await page.locator('.te .te-cw[data-split="0"]').boundingBox();
  await page.mouse.move(cw.x + cw.width / 2, cw.y + cw.height / 2);
  await page.mouse.down();
  await page.mouse.move(cw.x - 600, cw.y + cw.height / 2, { steps: 6 });
  await page.mouse.up();
  await expect(page.locator('.te .te-warn')).toContainText('Column too narrow: A');
  /* avertissement : tableau plus haut qu'une page (toutes les lignes dupliquées jusqu'à 40) */
  await page.locator('.te .te-corner').click();
  for (let k = 0; k < 2; k++) {
    await page.locator('.te .te-corner').click();
    await page.locator('.te [data-act="row-dup"]').click();
  }
  await page.locator('.te .te-rhd[data-row="0"]').click();
  for (let k = 0; k < 16; k++) await page.locator('.te [data-act="row-dup"]').click(); // la copie reste sélectionnée
  await expect(page.locator('.te .te-rhd')).toHaveCount(40);
  const rh = await page.locator('.te .te-rh[data-hrow="0"]').boundingBox();
  await page.mouse.move(rh.x + rh.width / 2, rh.y + rh.height / 2);
  await page.mouse.down();
  await page.mouse.move(rh.x + rh.width / 2, rh.y + 400, { steps: 6 });
  await page.mouse.up();
  await expect(page.locator('.te .te-warn')).toContainText('taller than a page');
  expect(errors).toEqual([]);
});

test('bloc tableau : le petit bouton « Table… » de la barre au survol ouvre l’éditeur', async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page, 'table');
  await page.locator('[data-sel="col:0:0:0"] .tbl-cell').last().hover();
  await page.locator('.hv-bar button', { hasText: 'Table…' }).click();
  await expect(page.locator('.te')).toBeVisible();
  await expect(page.locator('.te details.te-card')).toHaveCount(8);
  await expect(page.locator('.te details.te-card summary').first()).toHaveText('Selection');
  expect(errors).toEqual([]);
});
