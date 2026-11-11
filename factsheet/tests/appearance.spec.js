const { test, expect } = require('@playwright/test');
const { openApp, watchErrors, addBundle, DOC_KEY } = require('./helpers');

/* Apparence (lot 5a de l'audit des options) : épaisseur et séparation de l'anneau, coins des barres, opacité des flux du Sankey.
   Chaque valeur d'origine est le `def` du réglage : sans clé, le dessin est celui d'avant. */

/** Rend une dataviz seule et renvoie le SVG dessiné, sérialisé. */
async function render(page, kind, opts) {
  return page.evaluate(
    ([kind, opts]) => {
      const { defaultDoc, newViz, newCol, renderDocument } = window.FSTEST;
      const d = defaultDoc();
      const viz = newViz(kind);
      Object.assign(viz.opts, opts);
      d.sections.find((s) => s.page === 'recto').subs[1].cols[0] = { ...newCol('viz'), viz };
      const r = renderDocument(d);
      const host = document.createElement('div');
      Object.assign(host.style, { position: 'absolute', left: '-30000px', top: '0' });
      document.body.append(host);
      r.pages.forEach((p) => host.append(p.el));
      const svgs = [...host.querySelectorAll('svg')];
      const svg = svgs.find((s) => s.querySelector('path[fill]:not([fill=none])')) || svgs[0];
      const radii = (d) => [...d.matchAll(/A([\d.]+),/g)].map((m) => +m[1]);
      const paths = [...svg.querySelectorAll('path[data-color], path[fill]')].filter((p) => p.getAttribute('fill') !== 'none');
      const out = {
        seams: [...svg.querySelectorAll('line[stroke="#FFFFFF"]')].map((l) => ({
          w: +l.getAttribute('stroke-width'),
          x1: +l.getAttribute('x1'),
          y1: +l.getAttribute('y1'),
          x2: +l.getAttribute('x2'),
          y2: +l.getAttribute('y2'),
        })),
        ring: paths.length
          ? (() => {
              const r = radii(paths[0].getAttribute('d'));
              return { Ro: Math.max(...r), Ri: Math.min(...r) };
            })()
          : null,
        opacities: [...host.querySelectorAll('path[stroke-opacity]')].map((p) => +p.getAttribute('stroke-opacity')),
        barPaths: [...host.querySelectorAll('path')].map((p) => p.getAttribute('d')).filter((d) => d && d.includes('A')).length,
        fills: [...svg.querySelectorAll('path')].filter((p) => p.getAttribute('fill') && p.getAttribute('fill') !== 'none').length,
      };
      host.remove();
      return out;
    },
    [kind, opts],
  );
}

test.beforeEach(async ({ page }) => {
  await page.goto('/factsheet/tests/blank.html');
});

test('anneau : épaisseur Fin / Normal (16 %, d’origine) / Épais, sans effet sur le camembert', async ({ page }) => {
  const none = await render(page, 'donut', {});
  const normal = await render(page, 'donut', { ringWidth: 'normal' });
  const thin = await render(page, 'donut', { ringWidth: 'thin' });
  const thick = await render(page, 'donut', { ringWidth: 'thick' });
  const frac = (r) => 1 - r.ring.Ri / r.ring.Ro;
  expect(frac(none)).toBeCloseTo(0.16, 2);
  expect(frac(normal)).toBeCloseTo(frac(none), 5); // sans clé = Normal : la fiche d'avant ne change pas
  expect(frac(thin)).toBeLessThan(frac(none));
  expect(frac(thick)).toBeGreaterThan(frac(none));
  const pie = await render(page, 'donut', { style: 'pie' });
  const pieThick = await render(page, 'donut', { style: 'pie', ringWidth: 'thick' });
  expect(pieThick.ring).toEqual(pie.ring);
});

test('anneau : séparation des segments en vrai trait de la couleur du fond', async ({ page }) => {
  expect((await render(page, 'donut', {})).seams).toHaveLength(0);
  expect((await render(page, 'donut', { segGap: 'none' })).seams).toHaveLength(0);
  const fine = await render(page, 'donut', { segGap: 'thin' });
  const wide = await render(page, 'donut', { segGap: 'wide' });
  expect(fine.seams.length).toBe(5); // un trait par segment (5 segments)
  expect(wide.seams.length).toBe(5);
  expect(wide.seams[0].w).toBeGreaterThan(fine.seams[0].w);
  const pie = await render(page, 'donut', { style: 'pie', segGap: 'thin' });
  expect(pie.seams.length).toBe(5);
});

test('barres et barres horizontales : coins Arrondis (d’origine) / Droits', async ({ page }) => {
  for (const kind of ['bars', 'hbars']) {
    const def = await render(page, kind, {});
    const round = await render(page, kind, { corners: 'round' });
    const square = await render(page, kind, { corners: 'square' });
    expect(def.barPaths, kind).toBeGreaterThan(0);
    expect(round.barPaths, kind).toBe(def.barPaths);
    expect(square.barPaths, kind).toBeLessThan(round.barPaths); // plus aucun coin arrondi sur les barres de la dataviz
  }
});

test('Sankey : opacité des flux Légère / Normale (0,4, d’origine) / Marquée', async ({ page }) => {
  const op = async (o) => [...new Set((await render(page, 'sankey', o)).opacities)];
  expect(await op({})).toEqual([0.4]);
  expect(await op({ linkOpacity: 'normal' })).toEqual([0.4]);
  const [light] = await op({ linkOpacity: 'light' });
  const [strong] = await op({ linkOpacity: 'strong' });
  expect(light).toBeLessThan(0.4);
  expect(strong).toBeGreaterThan(0.4);
});

test('export PDF avec les réglages d’apparence, sans erreur', async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page, 'default');
  await page.addScriptTag({ url: '/factsheet/tests/entry.bundle.js' });
  await addBundle(page, 'pdfexport.js');
  const sizes = await page.evaluate(async (key) => {
    const base = JSON.parse(localStorage.getItem(key));
    const out = [];
    for (const [kind, opts] of [
      ['donut', { ringWidth: 'thick', segGap: 'wide' }],
      ['bars', { corners: 'square' }],
      ['hbars', { corners: 'square' }],
      ['sankey', { linkOpacity: 'strong' }],
    ]) {
      const doc = JSON.parse(JSON.stringify(base));
      const col = doc.sections.flatMap((s) => s.subs.flatMap((b) => b.cols)).find((c) => c.viz);
      col.viz = window.FSTEST.newViz(kind);
      Object.assign(col.viz.opts, opts);
      const { bytes } = await window.FSPDF.build(doc, 'net', { profile: 'x1a' });
      out.push(bytes.length);
    }
    return out;
  }, DOC_KEY);
  sizes.forEach((n) => expect(n).toBeGreaterThan(1000));
  expect(errors).toEqual([]);
});
