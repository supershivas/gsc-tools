/* Libellés des barres jamais coupés ni réduits (passage à la ligne, Maj + Entrée) et niveaux de hiérarchie du tableau. */
const { test, expect } = require('@playwright/test');
const { watchErrors } = require('./helpers');

test.beforeEach(async ({ page }) => {
  await page.goto('/factsheet/tests/blank.html');
  await page.evaluate(() => document.fonts.ready);
});

const LONG = 'European Competitiveness Fund for strategic investments';

for (const kind of ['bars', 'hbars']) {
  test(`${kind} : libellé long sur plusieurs lignes, même corps, sans ellipse ; retour saisi respecté`, async ({ page }) => {
    const errors = watchErrors(page);
    const out = await page.evaluate(
      ([kind, LONG]) => {
        const t = window.FSTEST.VIZ_TYPES[kind],
          o = t.defaults();
        o.rows = [
          { label: LONG, v: [50] },
          { label: 'Short', v: [30] },
          { label: 'One\ntwo', v: [20] },
        ];
        const svg = t.render(o, 480, {}).node;
        const texts = [...svg.querySelectorAll('text')].filter((n) => n.hasAttribute('font-size') && /[A-Za-z]/.test(n.textContent));
        return { all: texts.map((n) => n.textContent), sizes: [...new Set(texts.map((n) => n.getAttribute('font-size')))] };
      },
      [kind, LONG],
    );
    expect(out.all.join(' ')).not.toContain('…');
    expect(out.sizes).toHaveLength(1); // tous les libellés au même corps
    expect(out.all.filter((x) => LONG.includes(x)).length).toBeGreaterThan(1); // libellé long : plusieurs lignes
    expect(out.all.filter((x) => LONG.includes(x)).join(' ')).toBe(LONG);
    expect(out.all).toContain('One');
    expect(out.all).toContain('two');
    expect(errors).toEqual([]);
  });
}

test('hbars : la largeur des libellés (nameWidth) déplace le début des barres', async ({ page }) => {
  const x = await page.evaluate(() => {
    const t = window.FSTEST.VIZ_TYPES.hbars,
      at = (nw) => {
        const o = t.defaults();
        o.nameWidth = nw;
        const svg = t.render(o, 400, {}).node;
        return Math.round(
          +svg
            .querySelector('path')
            .getAttribute('d')
            .match(/^M([\d.]+)/)[1],
        );
      };
    return [at('auto'), at('50')];
  });
  expect(x[1]).toBe(200);
  expect(x[0]).toBeLessThan(200);
});

test('tableau : niveaux 1 à 4 (style et retrait), aller-retour par repairTable', async ({ page }) => {
  const out = await page.evaluate(() => {
    const T = window.FSTEST.table,
      tb = T.newTable(5, 1, 0);
    tb.cells.forEach((cl, i) => i && T.setLevel(cl, i));
    const lv = tb.cells.map((cl) => T.levelOf(cl));
    const kept = T.repairTable(JSON.parse(JSON.stringify(tb))).cells.map((cl) => [cl.st || 'body', cl.ind || 0]);
    const bad = T.repairTable({ ...JSON.parse(JSON.stringify(tb)), cells: tb.cells.map((cl) => ({ ...cl, ind: 9 })) });
    return { lv, kept, badInd: bad.cells.some((cl) => cl.ind) };
  });
  expect(out.lv).toEqual([2, 1, 2, 3, 4]);
  expect(out.kept).toEqual([
    ['body', 0],
    ['bold', 0],
    ['body', 0],
    ['small', 0],
    ['small', 1],
  ]);
  expect(out.badInd).toBe(false);
});

/* ---------- Anneau / camembert : libellés riches, styles, sans total, déplacement, comparaison ---------- */
const { addBundle, stubExternal, DOC_KEY } = require('./helpers');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const RC = { gap: { subsectionTitle: 6 }, gutter: 18, icons: [] }; // contexte de rendu minimal
const pieSegs = () => [
  { color: 'blue', value: 62, value2: 70, title: '€62 billion', title2: '€70 billion', text: 'Cohesion and {c:yellow|agriculture}' },
  { color: 'yellow', value: 15, value2: 20, title: '€15 billion', text: 'Competitiveness' },
  { color: 'grey', value: 9.4, value2: 9, title: '€9.4 billion', text: 'Global\u2028Europe' },
];

test('anneau : couleur, retour à la ligne, styles du document, sans texte au centre', async ({ page }) => {
  const out = await page.evaluate(
    ([segs, rc]) => {
      const t = window.FSTEST.VIZ_TYPES.donut,
        o = { ...t.defaults(), segments: segs, layout: 'legend', labelTitle: 'figureSm', labelText: 'small', showTotal: false };
      const svg = t.render(o, 300, { rc }).node,
        texts = [...svg.querySelectorAll('text')];
      return {
        lines: texts.map((n) => n.textContent),
        colored: [...svg.querySelectorAll('tspan[fill]')].map((n) => [n.textContent, n.getAttribute('fill')]),
        sizes: [...new Set(texts.map((n) => Math.round(+n.getAttribute('font-size'))))],
        serif: texts.some((n) => /figureSm/.test(n.style.fontFamily)),
      };
    },
    [pieSegs(), RC],
  );
  expect(out.lines).toContain('Global');
  expect(out.lines).toContain('Europe'); // Maj + Entrée = retour à la ligne
  expect(out.colored).toEqual([['agriculture', 'var(--c-yellow)']]);
  expect(out.sizes.length).toBe(2); // titre (chiffre clé petit) et texte (texte petit)
  expect(out.serif).toBe(true);
});

test('anneau déplacé : les libellés du côté libéré gagnent la place', async ({ page }) => {
  const w = await page.evaluate(
    ([segs, rc]) => {
      const t = window.FSTEST.VIZ_TYPES.donut,
        at = (ringX) => {
          const r = t.render({ ...t.defaults(), segments: segs, layout: 'around', ringX }, 600, { rc });
          return { cx: r.meta.cx, right: Math.min(...r.meta.items.filter((i) => i.x > r.meta.cx).map((i) => i.x)) };
        };
      return [at(0), at(-100)];
    },
    [pieSegs(), RC],
  );
  expect(w[1].cx).toBeLessThan(w[0].cx);
  expect(w[1].right).toBeLessThan(w[0].right);
});

test('comparaison : deux camemberts, titres, 2e valeurs, même départ ; PDF lisible', async ({ page }) => {
  const out = await page.evaluate(
    ([segs, rc]) => {
      const t = window.FSTEST.VIZ_TYPES.donut,
        o = { ...t.defaults(), style: 'pie', segments: segs, compare: true, cmpTitle1: '2024', cmpTitle2: '2025', cmpScale: 'area' };
      const svg = t.render(o, 600, { rc }).node;
      return {
        texts: [...svg.querySelectorAll('text')].map((n) => n.textContent),
        halves: svg.querySelectorAll(':scope > g[transform]').length,
      };
    },
    [pieSegs(), RC],
  );
  expect(out.halves).toBe(2);
  for (const x of ['2024', '2025', '€62 billion', '€70 billion', '€15 billion']) expect(out.texts).toContain(x);

  /* même document exporté en PDF : les textes des deux camemberts y sont */
  await stubExternal(page);
  await page.evaluate(
    ([key, segs]) => {
      const F = window.FSTEST,
        d = F.defaultDoc(),
        v = F.newViz('donut');
      Object.assign(v.opts, { style: 'pie', segments: segs, compare: true, cmpTitle1: '2024', cmpTitle2: '2025' });
      v.head = { title: 'Budget', source: '', style: 'h2' };
      const sec = F.newSection('recto'),
        sub = F.newSub('1');
      sub.cols = [{ ...F.newCol('viz'), viz: v }];
      sec.subs = [sub];
      d.sections = [sec];
      localStorage.clear();
      localStorage.setItem(key, JSON.stringify(d));
    },
    [DOC_KEY, pieSegs()],
  );
  await page.goto('/factsheet/index.html');
  await page.waitForSelector('#stage .page');
  await page.evaluate(() => document.fonts.ready);
  const fs2 = await page.locator('#stage .page:not(.ovf-clone) .viz-title .p-h2').evaluate((n) => getComputedStyle(n).fontSize);
  expect(fs2).toBe('18.6667px'); // titre de la dataviz au style Sous-section (14 pt)
  await addBundle(page, 'pdfexport.js');
  const b64 = await page.evaluate(async (key) => {
    const { bytes } = await window.FSPDF.build(JSON.parse(localStorage.getItem(key)), 'net', { profile: 'none' });
    return await new Promise((res) => {
      const fr = new FileReader();
      fr.onload = () => res(String(fr.result).split(',')[1]);
      fr.readAsDataURL(new Blob([bytes]));
    });
  }, DOC_KEY);
  const file = path.join(os.tmpdir(), `pie-${Date.now()}.pdf`);
  fs.writeFileSync(file, Buffer.from(b64, 'base64'));
  const txt = execFileSync('pdftotext', [file, '-']).toString();
  fs.unlinkSync(file);
  for (const x of ['2024', '2025', '€70 billion', 'agriculture', 'Europe', 'Budget']) expect(txt).toContain(x);
});
