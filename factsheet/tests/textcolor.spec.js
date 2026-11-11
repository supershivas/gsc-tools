const { test, expect } = require('@playwright/test');

/* Couleur du texte d'une section, sous-section ou colonne (`fg`) : suit le niveau le plus proche, « none » = niveau du dessus */
test('couleur du texte par section, sous-section et colonne', async ({ page }) => {
  await page.goto('/factsheet/tests/blank.html');
  const r = await page.evaluate(() => {
    const { docs, renderDocument } = window.FSTEST;
    const doc = Object.values(docs)[0]();
    const sec = doc.sections[0],
      sub = sec.subs[0];
    const colorOf = (path) => {
      const res = renderDocument(doc);
      const host = document.createElement('div');
      host.style.cssText = 'position:absolute;left:-30000px';
      res.pages.forEach((p) => host.append(p.el));
      document.body.append(host);
      const el = host.querySelector(`[data-sel="${path}"]`);
      const out = el ? { color: getComputedStyle(el).color, text: getComputedStyle(el).getPropertyValue('--c-text') } : null;
      host.remove();
      return out;
    };
    const base = colorOf('sec:0');
    sec.fg = 'blue';
    const secBlue = colorOf('sec:0'),
      subInherit = colorOf('sub:0:0'),
      colInherit = colorOf('col:0:0:0');
    sub.fg = 'none';
    const subNone = colorOf('sub:0:0');
    sub.fg = 'tint-blue';
    const subOwn = colorOf('sub:0:0'),
      colUnderSub = colorOf('col:0:0:0');
    sub.cols[0].fg = 'white';
    const colOwn = colorOf('col:0:0:0');
    return { base, secBlue, subInherit, colInherit, subNone, subOwn, colUnderSub, colOwn };
  });
  expect(r.secBlue.color).not.toBe(r.base.color);
  expect(r.subInherit.color).toBe(r.secBlue.color); // hérité
  expect(r.colInherit.color).toBe(r.secBlue.color);
  expect(r.subNone.color).toBe(r.secBlue.color); // « none » = pas de réglage propre
  expect(r.subOwn.color).not.toBe(r.secBlue.color);
  expect(r.colUnderSub.color).toBe(r.subOwn.color);
  expect(r.colOwn.color).toBe('rgb(255, 255, 255)');
});
