const { test, expect } = require('@playwright/test');
const { openApp, watchErrors, settle, DOC_KEY } = require('./helpers');

/* Copier-coller de structure (src/editor/clip.js) : une section, une sous-section ou une colonne copiée d'un onglet et collée dans un
   autre. Partie pure (FSTEST.clip : makeClip, readClip, adoptClip) puis parcours dans l'éditeur (raccourcis, boutons, annuler). */

const docOfActive = (page) => page.evaluate((key) => JSON.parse(localStorage.getItem(key)), DOC_KEY);
const pick = (page, path) => page.locator(`#tree .tn[data-path="${path}"]`).first().click();
/** tous les identifiants d'un document (sections, sous-sections, lignes, colonnes et cellules de tableau…) */
const allIds = (o, out = []) => {
  if (Array.isArray(o)) o.forEach((v) => allIds(v, out));
  else if (o && typeof o === 'object')
    for (const [k, v] of Object.entries(o)) {
      if (k === 'id' && typeof v === 'string') out.push(v);
      else allIds(v, out);
    }
  return out;
};

test.beforeEach(async ({ context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
});

test('fonctions pures : couleurs, icônes, images, nombres, identifiants', async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page, 'clip');
  await page.addScriptTag({ url: '/factsheet/tests/entry.bundle.js' });
  const r = await page.evaluate(() => {
    const { docs, clip, defaultDoc } = window.FSTEST;
    const src = docs.clip();
    const c = clip.makeClip(src, 'sec:0');
    const text = JSON.stringify(c);
    /* cible 1 : sa propre couleur x1 (verte) → la couleur de la source arrive sous une autre clé */
    const t1 = defaultDoc();
    t1.colors = { ...(t1.colors || {}), x1: '#2E8B57' };
    t1.colorNames = { ...(t1.colorNames || {}), x1: 'Vert' };
    t1.customIcons = [{ id: 'star', name: 'autre', vb: [0, 0, 24, 24], markup: '<circle cx="12" cy="12" r="5"/>' }];
    const read = clip.readClip(text);
    const a1 = clip.adoptClip(t1, read);
    /* cible 2 : palette pleine (7 couleurs ajoutées) → repli sur la plus proche */
    const t2 = defaultDoc();
    for (let i = 1; i <= 7; i++) t2.colors['x' + i] = '#0' + i + '0' + i + '0' + i;
    const a2 = clip.adoptClip(t2, clip.readClip(text));
    /* cible 3 : même hexadécimal déjà présent → réutilisé, rien d'ajouté */
    const t3 = defaultDoc();
    t3.colors.x3 = '#B03A2E';
    const a3 = clip.adoptClip(t3, clip.readClip(text));
    /* image distante dans un clip fabriqué à la main : retirée */
    const evil = JSON.parse(text);
    evil.data.subs[0].cols[1].src = 'https://tracker.example/pixel.png';
    const rEvil = clip.readClip(JSON.stringify(evil));
    return {
      kinds: [clip.makeClip(src, 'sub:0:0').clip, clip.makeClip(src, 'col:0:0:0').clip, clip.makeClip(src, 'header')],
      srcColors: c.source.colors,
      srcIcons: c.source.icons.map((x) => x.id),
      a1: { item: a1.item, report: a1.report, colors: t1.colors, names: t1.colorNames, icons: t1.customIcons },
      a2: { item: a2.item, report: a2.report, nExtra: Object.keys(t2.colors).filter((k) => /^x/.test(k)).length },
      a3: { bg: a3.item.bg, added: a3.report.added },
      srcIds: JSON.stringify(src),
      evilSrc: rEvil.item.subs[0].cols[1].src,
      errs: [
        clip.readClip('du texte copié ailleurs').error,
        clip.readClip('{"app":"autre","clip":"col","data":{}}').error,
        clip.readClip('{"app":"factsheet-creator","schemaVersion":1,"clip":"header","data":{}}').error,
        clip.readClip('{"app":"factsheet-creator","schemaVersion":1,"clip":"sub","data":{"cols":"x"}}').error,
        clip.readClip('{"app":"factsheet-creator","schemaVersion":1,"clip":"col","data":{"type":"bombe"}}').error,
        clip.readClip('{"app":"factsheet-creator","schemaVersion":99,"clip":"col","data":{"type":"text"}}').error,
        clip.readClip('{"app":"factsheet-creator", "clip":').error,
        clip.readClip('<table><tr><td>1</td></tr></table>').error,
      ],
    };
  });
  expect(r.kinds).toEqual(['sub', 'col', null]);
  expect(r.srcColors).toEqual({ x1: '#B03A2E' }); // seules les couleurs utilisées par l'élément voyagent
  expect(r.srcIcons).toEqual(['star']);

  // cible 1 : x1 déjà pris par une autre couleur → nouvelle clé x2, même valeur et même nom
  expect(r.a1.colors.x1).toBe('#2E8B57');
  expect(r.a1.colors.x2).toBe('#B03A2E');
  expect(r.a1.names.x2).toBe('Rouge brique');
  const it = r.a1.item;
  expect(it.bg).toBe('tint-x2');
  expect(it.subs[0].cols[0].fillColor).toBe('x2');
  expect(it.subs[0].cols[0].strokeColor).toBe('x2');
  expect(it.subs[0].cols[0].text).toBe('Texte {c:x2|rouge} et suite');
  expect(it.subs[0].cols[2].figure.barColor).toBe('x2');
  expect(it.subs[1].cols[0].table.cells.find((x) => x.r === 1 && x.c === 0).fill).toBe('tint-x2');
  expect(r.a1.report.added).toEqual(['Rouge brique']);
  // icône : l'identifiant « star » est pris par une autre icône → renouvelé, référence suivie, SVG nettoyé (plus de script)
  const iconRef = it.subs[0].cols[2].figure.icon;
  expect(iconRef).toMatch(/^custom:/);
  expect(iconRef).not.toBe('custom:star');
  const icon = r.a1.icons.find((x) => 'custom:' + x.id === iconRef);
  expect(icon.markup).toContain('<path');
  expect(icon.markup).not.toContain('script');
  expect(r.a1.icons.filter((x) => x.id === 'star')).toHaveLength(1);
  // images : chemin du dépôt et data URL gardés
  expect(it.subs[0].cols[1].src).toBe('assets/others/lantern-emblem.png');
  expect(it.subs[2].cols[0].src).toMatch(/^data:image\/png;base64,/);
  expect(r.evilSrc).toBeNull();
  // nombres : FR → EN (format par défaut de la cible)
  const cells = it.subs[1].cols[0].table.cells;
  expect(cells.find((x) => x.r === 1 && x.c === 1).text).toBe('1,227.5');
  expect(cells.find((x) => x.r === 2 && x.c === 1).text).toBe('3.25');
  expect(cells.find((x) => x.r === 0 && x.c === 1).text).toBe('Budget'); // en-tête : jamais réécrit
  expect(r.a1.report.numbers).toBe(2);
  // identifiants : tous neufs, sans doublon
  const ids = allIds(it);
  expect(new Set(ids).size).toBe(ids.length);
  for (const id of ids) expect(r.srcIds).not.toContain(`"${id}"`);

  // cible 2 : palette pleine → couleur la plus proche, signalée
  expect(r.a2.nExtra).toBe(7);
  expect(r.a2.report.added).toEqual([]);
  expect(r.a2.report.replaced).toHaveLength(1);
  expect(r.a2.report.replaced[0][0]).toBe('Rouge brique');
  expect(r.a2.item.bg).not.toBe('tint-x1');
  // cible 3 : même couleur déjà là → réutilisée
  expect(r.a3.bg).toBe('tint-x3');
  expect(r.a3.added).toEqual([]);

  expect(r.errs).toEqual(['foreign', 'foreign', 'malformed', 'malformed', 'malformed', 'newer', 'foreign', 'foreign']);
  expect(errors).toEqual([]);
});

test('section copiée dans un autre onglet par Ctrl+C / Ctrl+V, puis annuler et rétablir', async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page, 'clip');
  const source = await docOfActive(page);
  await pick(page, 'sec:0');
  await page.keyboard.press('Control+c');
  await expect(page.locator('.fs-toast')).toContainText('Section copied');

  await page.locator('#fsTabs .fs-tab-add').click();
  await expect(page.locator('#fsTabs .fs-tab')).toHaveCount(2);
  await settle(page);
  await pick(page, 'sec:0');
  await page.keyboard.press('Control+v');
  await expect.poll(async () => (await docOfActive(page)).sections.length).toBe(2);
  const d = await docOfActive(page);
  const pasted = d.sections[1];
  expect(pasted.title).toBe('Source section');
  expect(pasted.page).toBe('recto');
  expect(d.colors.x1).toBe('#B03A2E');
  expect(d.colorNames.x1).toBe('Rouge brique');
  expect(pasted.bg).toBe('tint-x1');
  expect(d.customIcons.map((x) => x.id)).toEqual(['star']);
  expect(d.customIcons[0].markup).not.toContain('script');
  expect(pasted.subs[1].cols[0].table.cells.find((x) => x.r === 1 && x.c === 1).text).toBe('1,227.5');
  // rien d'autre du document source : header, format des nombres et nom restent ceux de la cible
  expect(d.locale).toBe('en-GB');
  expect(d.name).not.toBe(source.name);
  // l'élément collé est sélectionné
  await expect(page.locator('#tree .tn.sel')).toHaveAttribute('data-path', 'sec:1');
  // identifiants uniques dans le document, aucun repris de la source
  const ids = allIds(d.sections);
  expect(new Set(ids).size).toBe(ids.length);
  const srcIds = new Set(allIds(source.sections));
  expect(allIds(pasted).filter((x) => srcIds.has(x))).toEqual([]);
  await expect(page.locator('#stage .page:not(.ovf-clone) .sec')).toHaveCount(2);

  // un seul pas d'historique : annuler retire la section, la couleur et l'icône ajoutées ; rétablir les remet
  await page.locator('#stage').click({ position: { x: 5, y: 5 } });
  await page.keyboard.press('Control+z');
  await expect.poll(async () => (await docOfActive(page)).sections.length).toBe(1);
  const undone = await docOfActive(page);
  expect(undone.colors.x1).toBeUndefined();
  expect(undone.customIcons).toEqual([]);
  await page.keyboard.press('Control+Shift+z');
  await expect.poll(async () => (await docOfActive(page)).sections.length).toBe(2);

  // le document source n'a pas bougé
  await page.locator('#fsTabs .fs-tab').first().locator('.fs-tab-btn').click();
  await expect.poll(async () => (await docOfActive(page)).sections.length).toBe(source.sections.length);
  expect((await docOfActive(page)).sections).toEqual(source.sections);
  expect(errors).toEqual([]);
});

test('colonne : remplace une colonne libre, sinon on demande ; type incompatible refusé', async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page, 'clip');
  // colonne « chiffre clé » copiée par le bouton du panneau
  await pick(page, 'col:0:0:2');
  await page.locator('.pr-head button[aria-label="Copy"]').click();
  await expect(page.locator('.fs-toast')).toContainText('Column copied');

  // nouvel onglet : colonne libre (texte d'origine) → remplacée sans question
  await page.locator('#fsTabs .fs-tab-add').click();
  await settle(page);
  await pick(page, 'col:0:0:0');
  await page.locator('.pr-head button[aria-label="Paste"]').click();
  await expect.poll(async () => (await docOfActive(page)).sections[0].subs[0].cols[0].type).toBe('figure');
  let d = await docOfActive(page);
  expect(d.sections[0].subs[0].cols).toHaveLength(1);
  expect(d.sections[0].subs[0].cols[0].figure.icon).toBe('custom:star');
  expect(d.sections[0].subs[0].cols[0].figure.barColor).toBe('x1');
  await expect(page.locator('#tree .tn.sel')).toHaveAttribute('data-path', 'col:0:0:0');

  // colonne remplie → la question : insérer à côté
  await page.locator('.pr-head button[aria-label="Paste"]').click();
  await expect(page.locator('dialog.modal[open]')).toBeVisible();
  await page.locator('dialog.modal[open] input[value="insert"]').check();
  await page.locator('dialog.modal[open] button.primary').click();
  await expect.poll(async () => (await docOfActive(page)).sections[0].subs[0].cols.length).toBe(2);
  d = await docOfActive(page);
  expect(d.sections[0].subs[0].layout).toBe('1-1');
  expect(d.customIcons).toHaveLength(1); // même icône : pas de doublon
  await expect(page.locator('#tree .tn.sel')).toHaveAttribute('data-path', 'col:0:0:1');

  // Annuler dans la question : rien ne change
  await page.locator('.pr-head button[aria-label="Paste"]').click();
  await page.locator('dialog.modal[open] button:not(.primary)').click();
  await expect(page.locator('dialog.modal[open]')).toHaveCount(0);
  expect((await docOfActive(page)).sections[0].subs[0].cols.length).toBe(2);

  // une colonne copiée ne se colle pas sur une section : message, rien ne change
  const before = JSON.stringify((await docOfActive(page)).sections);
  await pick(page, 'sec:0');
  await page.locator('.pr-head button[aria-label="Paste"]').click();
  await expect(page.locator('dialog.modal[open]')).toContainText('A copied column is pasted onto a column');
  await page.locator('dialog.modal[open] button.primary').click();
  expect(JSON.stringify((await docOfActive(page)).sections)).toBe(before);
  expect(errors).toEqual([]);
});

test('sous-section collée après la sous-section de la colonne sélectionnée, même onglet', async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page, 'clip');
  await pick(page, 'sub:0:1');
  await page.keyboard.press('Control+c');
  await pick(page, 'col:0:0:1');
  await page.keyboard.press('Control+v');
  await expect.poll(async () => (await docOfActive(page)).sections[0].subs.length).toBe(4);
  const d = await docOfActive(page);
  expect(d.sections[0].subs[1].title).toBe('Table');
  expect(d.sections[0].subs[1].id).not.toBe(d.sections[0].subs[2].id);
  expect(d.sections[0].subs[1].cols[0].table.cells.find((x) => x.r === 1 && x.c === 1).text).toBe('1 227,5'); // même format : inchangé
  expect(Object.keys(d.colors).filter((k) => /^x/.test(k))).toEqual(['x1']); // même document : aucune couleur ajoutée
  const ids = allIds(d.sections);
  expect(new Set(ids).size).toBe(ids.length);
  await expect(page.locator('#tree .tn.sel')).toHaveAttribute('data-path', 'sub:0:1');
  expect(errors).toEqual([]);
});

test('presse-papiers étranger ou clip malformé : ignoré avec un message', async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page, 'clip');
  const before = JSON.stringify((await docOfActive(page)).sections);
  await pick(page, 'sec:0');
  for (const [text, msg] of [
    ['Un texte copié ailleurs', 'does not contain an element copied'],
    ['{"app":"factsheet-creator","schemaVersion":1,"clip":"sub","data":{"cols":[]}}', 'unreadable or incomplete'],
  ]) {
    await page.evaluate((x) => navigator.clipboard.writeText(x), text);
    await page.keyboard.press('Control+v');
    await expect(page.locator('dialog.modal[open]')).toContainText(msg);
    await page.locator('dialog.modal[open] button.primary').click();
    await expect(page.locator('dialog.modal[open]')).toHaveCount(0);
  }
  expect(JSON.stringify((await docOfActive(page)).sections)).toBe(before);
  expect(errors).toEqual([]);
});
