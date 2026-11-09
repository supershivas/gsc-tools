const { test, expect } = require('@playwright/test');
const { openApp, addBundle, settle, watchErrors, DOC_KEY } = require('./helpers');

/* Indépendance des rendus : le rendu d'un document ne dépend que de ce document. Deux documents de même structure mais de réglages
   opposés (tests/docs.js, docIso : « serré » + typographie française + étoile importée, « large » sans typographie + rond importé
   sous le même identifiant) doivent donner exactement le même résultat, qu'ils soient rendus seuls, l'un après l'autre ou entremêlés. */

/** identifiants de clipPath : uniques par rendu (préfixe aléatoire), sans effet sur le dessin */
const norm = (html) => html.replace(/\bpc[a-z0-9]+-(\d+)\b/g, 'pc-$1');

/** Dans la page : rend chaque document avec les modules du point d'entrée de test (même instance de render.js pour tous), selon `plan`. */
async function renderPlan(page, plan) {
  const out = await page.evaluate((plan) => {
    const { docs, renderDocument, measure } = window.FSTEST;
    const host = document.createElement('div');
    Object.assign(host.style, { position: 'absolute', left: '-30000px', top: '0' });
    document.body.append(host);
    const live = {},
      html = {};
    for (const [op, name] of plan) {
      if (op === 'render') {
        const r = renderDocument(docs[name]());
        const box = document.createElement('div');
        r.pages.forEach((p) => box.append(p.el));
        host.append(box);
        live[name] = { r, box };
      } else if (op === 'measure') measure(live[name].r);
      else if (op === 'read') {
        html[name] = { html: live[name].box.innerHTML, warnings: live[name].r.warnings };
        live[name].box.remove();
      }
    }
    host.remove();
    return html;
  }, plan);
  for (const k of Object.keys(out)) out[k].html = norm(out[k].html);
  return out;
}

test('deux documents rendus entremêlés ne s’influencent pas', async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page, 'iso-loose');
  await page.addScriptTag({ url: '/factsheet/tests/entry.bundle.js' });
  const solo = {
    ...(await renderPlan(page, [
      ['render', 'iso-tight'],
      ['measure', 'iso-tight'],
      ['read', 'iso-tight'],
    ])),
    ...(await renderPlan(page, [
      ['render', 'iso-loose'],
      ['measure', 'iso-loose'],
      ['read', 'iso-loose'],
    ])),
  };
  // les deux documents diffèrent bien par chacun des réglages (sinon le test ne prouverait rien)
  expect(solo['iso-tight'].html).not.toBe(solo['iso-loose'].html);
  expect(solo['iso-tight'].html).toContain('1<sup>er</sup>');
  expect(solo['iso-loose'].html).not.toContain('1<sup>er</sup>');
  expect(solo['iso-tight'].html).toContain('M12 2l3 7h7');
  expect(solo['iso-loose'].html).toContain('<circle cx="12" cy="12" r="9"');
  expect(solo['iso-tight'].html).toContain('--gap-columns: 15px');
  expect(solo['iso-loose'].html).toContain('--gap-columns: 24px');

  // A et B rendus avant toute mesure, mesurés dans l'ordre inverse : la dataviz « remplir » de A est redessinée après le rendu de B
  const mixed = await renderPlan(page, [
    ['render', 'iso-tight'],
    ['render', 'iso-loose'],
    ['measure', 'iso-loose'],
    ['measure', 'iso-tight'],
    ['read', 'iso-tight'],
    ['read', 'iso-loose'],
  ]);
  expect(mixed['iso-tight']).toEqual(solo['iso-tight']);
  expect(mixed['iso-loose']).toEqual(solo['iso-loose']);
  // l'un après l'autre, dans les deux ordres
  const seq = await renderPlan(page, [
    ['render', 'iso-loose'],
    ['measure', 'iso-loose'],
    ['read', 'iso-loose'],
    ['render', 'iso-tight'],
    ['measure', 'iso-tight'],
    ['read', 'iso-tight'],
  ]);
  expect(seq).toEqual(solo);
  expect(errors).toEqual([]);
});

/** Export PDF (bundle pdfexport.js) d'un document, octets sans dates ni identifiants */
async function pdfOf(page, name) {
  const b64 = await page.evaluate(async (name) => {
    const { bytes } = await window.FSPDF.build(window.FSTEST.docs[name](), 'bleed', { profile: 'x4' });
    return await new Promise((res) => {
      const fr = new FileReader();
      fr.onload = () => res(String(fr.result).split(',')[1]);
      fr.readAsDataURL(new Blob([bytes]));
    });
  }, name);
  return Buffer.from(b64, 'base64')
    .toString('latin1')
    .replace(/\/(CreationDate|ModDate) \([^)]*\)/g, '/$1 ()')
    .replace(/\/ID \[[^\]]*\]/g, '/ID []')
    .replace(/<xmp:(\w+Date)>[^<]*</g, '<xmp:$1><')
    .replace(/xmpMM:(DocumentID|InstanceID)>[^<]*</g, 'xmpMM:$1><');
}
const previewHtml = (page) =>
  page.evaluate(() => [...document.querySelectorAll('#stage .page')].map((p) => p.outerHTML).join('\n')).then(norm);

test('export PDF d’un document « serré » pendant que l’aperçu montre un document « large »', async ({ page }) => {
  const errors = watchErrors(page);
  // référence : le PDF du document serré, exporté pendant que l'aperçu montre ce même document
  await openApp(page, 'iso-tight');
  await page.addScriptTag({ url: '/factsheet/tests/entry.bundle.js' });
  await addBundle(page, 'pdfexport.js');
  const alone = await pdfOf(page, 'iso-tight');

  await openApp(page, 'iso-loose');
  await page.addScriptTag({ url: '/factsheet/tests/entry.bundle.js' });
  await addBundle(page, 'pdfexport.js');
  const before = await previewHtml(page);
  expect(before).toContain('--gap-columns: 24px');
  // l'aperçu se redessine (changement de taille de la scène) pendant l'export
  const pending = pdfOf(page, 'iso-tight');
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.waitForTimeout(100);
  await page.setViewportSize({ width: 1600, height: 1000 });
  expect(await pending).toBe(alone);
  await settle(page);
  // un second export enchaîné, puis l'aperçu, inchangé
  expect(await pdfOf(page, 'iso-tight')).toBe(alone);
  await page.evaluate(() => window.dispatchEvent(new Event('resize')));
  await settle(page);
  expect(await previewHtml(page)).toBe(before);
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)).density, DOC_KEY)).toBe('loose');
  expect(errors).toEqual([]);
});
