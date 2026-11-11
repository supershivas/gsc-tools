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

/* Apparence (lot 5b) : frise, waffle, pictogrammes, enquête, nuage de points. Sans clé, le dessin est celui d'avant. */

/** Rend une dataviz seule et renvoie le SVG de la dataviz (celui qui a le plus d'éléments). */
async function probe(page, kind, opts, fn) {
  return page.evaluate(
    ([kind, opts, fn]) => {
      const { defaultDoc, newViz, newCol, renderDocument } = window.FSTEST;
      const d = defaultDoc();
      const viz = newViz(kind);
      Object.assign(viz.opts, opts);
      viz.head.title = 'PROBE';
      d.sections.find((s) => s.page === 'recto').subs[1].cols[0] = { ...newCol('viz'), viz };
      const r = renderDocument(d);
      const host = document.createElement('div');
      Object.assign(host.style, { position: 'absolute', left: '-30000px', top: '0' });
      document.body.append(host);
      r.pages.forEach((p) => host.append(p.el));
      const svg = [...host.querySelectorAll('.viz-title')].find((n) => n.textContent.includes('PROBE')).parentElement.querySelector('svg');
      const out = new Function('svg', 'host', 'return (' + fn + ')(svg, host)')(svg, host);
      host.remove();
      return out;
    },
    [kind, opts, fn.toString()],
  );
}
const num = (e, a) => +e.getAttribute(a);

test('frise : épaisseur du trait (0,5 pt d’origine) et taille des repères (rayon 5 d’origine)', async ({ page }) => {
  const f = (svg) => ({
    lw: Math.max(...[...svg.querySelectorAll('line')].map((l) => +l.getAttribute('stroke-width'))),
    r: Math.max(...[...svg.querySelectorAll('circle')].map((c) => +c.getAttribute('r'))),
  });
  const none = await probe(page, 'timeline', {}, f);
  expect(none.r).toBe(5);
  const same = await probe(page, 'timeline', { lineWidth: 'thin', markSize: 'medium' }, f);
  expect(same).toEqual(none);
  const thick = await probe(page, 'timeline', { lineWidth: 'thick' }, f);
  expect(thick.lw).toBeCloseTo(none.lw * 3, 5);
  expect((await probe(page, 'timeline', { markSize: 'small' }, f)).r).toBeLessThan(5);
  expect((await probe(page, 'timeline', { markSize: 'large' }, f)).r).toBeGreaterThan(5);
  for (const orientation of ['vertical', 'horizontal'])
    expect((await probe(page, 'timeline', { orientation, markSize: 'large', lineWidth: 'xthick' }, f)).r).toBe(7);
});

test('waffle : cases vides en contour seul (d’origine) ou en gris clair', async ({ page }) => {
  const rows = [{ label: 'A', value: 30, color: 'blue', mark: 'none', markColor: 'yellow' }];
  const f = (svg) => {
    const cells = [...svg.querySelectorAll('rect')];
    const empty = cells.slice(30);
    return {
      n: empty.length,
      fills: [...new Set(empty.map((c) => c.getAttribute('fill')))],
      strokes: [...new Set(empty.map((c) => c.getAttribute('stroke')))],
    };
  };
  const none = await probe(page, 'waffle', { rows, total: 100 }, f);
  const outline = await probe(page, 'waffle', { rows, total: 100, emptyStyle: 'outline' }, f);
  const grey = await probe(page, 'waffle', { rows, total: 100, emptyStyle: 'grey' }, f);
  expect(none.n).toBe(70);
  expect(none.fills).toEqual(['none']);
  expect(outline).toEqual(none);
  expect(grey.fills).toEqual(['var(--c-grey)']);
  expect(grey.strokes).toEqual(['currentColor']);
});

test('pictogrammes : non remplis estompés (d’origine) ou contour seul, et espace entre pictogrammes', async ({ page }) => {
  for (const kind of ['pictoBars', 'pictoCols', 'pictoV', 'pictoH']) {
    const f = (svg) => ({
      faded: svg.querySelectorAll('g[opacity="0.22"]').length,
      outlined: [...svg.querySelectorAll('path[fill="none"]')].filter((p) => p.getAttribute('stroke-width') === '1.2').length,
    });
    const none = await probe(page, kind, {}, f);
    expect(none.faded, kind).toBeGreaterThan(0);
    expect(none.outlined, kind).toBe(0);
    expect(await probe(page, kind, { emptyStyle: 'faded' }, f), kind).toEqual(none);
    const out = await probe(page, kind, { emptyStyle: 'outline' }, f);
    expect(out.faded, kind).toBe(0);
    expect(out.outlined, kind).toBe(none.faded);
  }
  /* trait : déjà un contour, le non-rempli reste estompé */
  const stroke = await probe(
    page,
    'pictoV',
    { emptyStyle: 'outline', icon: 'icon:check' },
    (svg) => svg.querySelectorAll('g[opacity="0.22"]').length,
  );
  expect(stroke).toBeGreaterThan(0);
  const gapOf = (axis) => (svg) => {
    const n = [...svg.querySelectorAll('svg[viewBox="0 0 24 24"]')];
    const ys = [...new Set(n.map((e) => +e.getAttribute('AXIS')))].sort((a, b) => a - b);
    return { gap: Math.min(...ys.slice(1).map((v, i) => v - ys[i])), size: +n[0].getAttribute('width') };
  };
  for (const [kind, axis] of [
    ['pictoBars', 'x'],
    ['pictoCols', 'y'],
  ]) {
    const fn = gapOf().toString().replace('AXIS', axis);
    const run = (o) => probe(page, kind, o, new Function('return ' + fn)());
    const none = await run({});
    const normal = await run({ iconGap: 'normal' });
    const tight = await run({ iconGap: 'tight' });
    const wide = await run({ iconGap: 'wide' });
    expect(normal.gap - normal.size, kind).toBeCloseTo(3, 3);
    expect(none, kind).toEqual(normal);
    expect(tight.gap - tight.size, kind).toBeCloseTo(1, 3);
    expect(wide.gap - wide.size, kind).toBeCloseTo(6, 3);
  }
});

test('enquête : taille des points (86 % d’origine)', async ({ page }) => {
  const r = (svg) => Math.max(...[...svg.querySelectorAll('circle')].map((c) => +c.getAttribute('r')));
  const none = await probe(page, 'survey', {}, r);
  expect(await probe(page, 'survey', { dotSize: 'normal' }, r)).toBeCloseTo(none, 6);
  const small = await probe(page, 'survey', { dotSize: 'small' }, r);
  const large = await probe(page, 'survey', { dotSize: 'large' }, r);
  expect(small).toBeLessThan(none);
  expect(large).toBeGreaterThan(none);
  expect(large / none).toBeCloseTo(0.98 / 0.86, 3);
});

test('nuage de points : taille sans colonne « Taille », opacité', async ({ page }) => {
  const noSize = [
    { label: 'a', group: 'G', x: 1, y: 2, size: 0 },
    { label: 'b', group: 'G', x: 3, y: 5, size: 0 },
  ];
  const f = (svg) => {
    const c = [...svg.querySelectorAll('circle[fill-opacity]')];
    return { r: +c[0].getAttribute('r'), op: +c[0].getAttribute('fill-opacity') };
  };
  const none = await probe(page, 'scatter', { rows: noSize }, f);
  expect(none).toEqual({ r: 4.5 * 1.4, op: 1 });
  expect(await probe(page, 'scatter', { rows: noSize, pointSize: 'medium', pointOpacity: 'opaque' }, f)).toEqual(none);
  expect((await probe(page, 'scatter', { rows: noSize, pointSize: 'small' }, f)).r).toBeLessThan(none.r);
  expect((await probe(page, 'scatter', { rows: noSize, pointSize: 'large' }, f)).r).toBeGreaterThan(none.r);
  expect((await probe(page, 'scatter', { rows: noSize, pointOpacity: 'semi' }, f)).op).toBe(0.5);
  /* avec une colonne « Taille » : pointSize sans effet, bulles à 0,8 d'origine */
  const sized = [
    { label: 'a', group: 'G', x: 1, y: 2, size: 5 },
    { label: 'b', group: 'G', x: 3, y: 5, size: 20 },
  ];
  const withSize = await probe(page, 'scatter', { rows: sized }, f);
  expect(withSize.op).toBe(0.8);
  expect(await probe(page, 'scatter', { rows: sized, pointSize: 'large' }, f)).toEqual(withSize);
  expect((await probe(page, 'scatter', { rows: sized, pointOpacity: 'semi' }, f)).op).toBe(0.5);
});

test('export PDF avec les réglages d’apparence (lot 5b), sans erreur', async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page, 'default');
  await page.addScriptTag({ url: '/factsheet/tests/entry.bundle.js' });
  await addBundle(page, 'pdfexport.js');
  const sizes = await page.evaluate(async (key) => {
    const base = JSON.parse(localStorage.getItem(key));
    const out = [];
    for (const [kind, opts] of [
      ['timeline', { lineWidth: 'thick', markSize: 'large' }],
      ['waffle', { emptyStyle: 'grey', total: 150 }],
      ['pictoBars', { emptyStyle: 'outline', iconGap: 'wide' }],
      ['pictoCols', { emptyStyle: 'outline', iconGap: 'tight' }],
      ['pictoV', { emptyStyle: 'outline' }],
      ['pictoH', { emptyStyle: 'outline' }],
      ['survey', { dotSize: 'large' }],
      ['scatter', { pointSize: 'large', pointOpacity: 'semi' }],
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

/* Apparence (lot 5c) : bulles, treemap, sunburst, liste à icônes. Sans clé, le dessin est celui d'avant. */
const shapes = (svg) =>
  [...svg.querySelectorAll('circle[fill-opacity], rect[fill-opacity], path[fill-opacity]')].map((n) => ({
    stroke: n.getAttribute('stroke'),
    sw: +n.getAttribute('stroke-width'),
    op: +n.getAttribute('fill-opacity'),
    rx: +n.getAttribute('rx'),
    d: n.getAttribute('d'),
  }));

for (const kind of ['bubbles', 'treemap', 'sunburst']) {
  test(`${kind} : contour (Fin d’origine) et intensité des teintes (Normale d’origine)`, async ({ page }) => {
    const none = await probe(page, kind, {}, shapes);
    expect(none.length).toBeGreaterThan(3);
    expect(new Set(none.map((s) => s.stroke))).toEqual(new Set(['currentColor']));
    const base = none[0].sw;
    expect(await probe(page, kind, { lineWidth: 'thin', fillTone: 'normal' }, shapes)).toEqual(none);
    const thick = await probe(page, kind, { lineWidth: 'thick' }, shapes);
    expect(thick[0].sw).toBeCloseTo(base * 3, 5);
    const medium = await probe(page, kind, { lineWidth: 'medium' }, shapes);
    expect(medium[0].sw).toBeCloseTo(base * 2, 5);
    const off = await probe(page, kind, { lineWidth: 'none' }, shapes);
    expect(new Set(off.map((s) => s.stroke))).toEqual(new Set(['none']));
    const light = await probe(page, kind, { fillTone: 'light' }, shapes);
    const strong = await probe(page, kind, { fillTone: 'strong' }, shapes);
    none.forEach((s, i) => {
      expect(light[i].op).toBeLessThanOrEqual(s.op);
      expect(strong[i].op).toBeGreaterThanOrEqual(s.op);
      expect(strong[i].op).toBeLessThanOrEqual(1);
    });
    expect(light.some((s, i) => s.op < none[i].op)).toBe(true);
    expect(strong.some((s, i) => s.op > none[i].op)).toBe(true);
  });
}

test('treemap : coins Arrondis (d’origine) / Droits', async ({ page }) => {
  const none = await probe(page, 'treemap', {}, shapes);
  expect(none.some((s) => s.rx > 0)).toBe(true);
  expect(await probe(page, 'treemap', { corners: 'round' }, shapes)).toEqual(none);
  const square = await probe(page, 'treemap', { corners: 'square' }, shapes);
  expect(square.every((s) => s.rx === 0)).toBe(true);
});

test('sunburst : séparation des anneaux Aucune (d’origine) / Fine / Large', async ({ page }) => {
  const none = await probe(page, 'sunburst', {}, shapes);
  expect(await probe(page, 'sunburst', { ringGap: 'none' }, shapes)).toEqual(none);
  const thin = await probe(page, 'sunburst', { ringGap: 'thin' }, shapes);
  const wide = await probe(page, 'sunburst', { ringGap: 'wide' }, shapes);
  expect(thin.map((s) => s.d)).not.toEqual(none.map((s) => s.d));
  expect(wide.map((s) => s.d)).not.toEqual(thin.map((s) => s.d));
  expect(wide.length).toBe(none.length);
});

test('liste à icônes : trait du cercle et des icônes (0,5 pt d’origine)', async ({ page }) => {
  const f = (svg) => {
    const root = svg.closest('.viz-icons') || svg.parentElement;
    return {
      ring: Math.max(...[...root.querySelectorAll('circle')].map((c) => +c.getAttribute('stroke-width'))),
      r: +root.querySelector('circle').getAttribute('r'),
      icon: Math.max(...[...root.querySelectorAll('path[stroke-linecap]')].map((p) => +p.getAttribute('stroke-width'))),
    };
  };
  const none = await probe(page, 'icons', {}, f);
  expect(await probe(page, 'icons', { circleWidth: 'thin', iconStroke: 'thin' }, f)).toEqual(none);
  const thick = await probe(page, 'icons', { circleWidth: 'thick', iconStroke: 'medium' }, f);
  expect(thick.ring).toBeCloseTo(none.ring * 3, 5);
  expect(thick.icon).toBeCloseTo(none.icon * 2, 5);
  expect(thick.r).toBeLessThan(none.r); // le cercle reste dans sa case
});

test('export PDF avec les réglages d’apparence (lot 5c), sans erreur', async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page, 'default');
  await page.addScriptTag({ url: '/factsheet/tests/entry.bundle.js' });
  await addBundle(page, 'pdfexport.js');
  const sizes = await page.evaluate(async (key) => {
    const base = JSON.parse(localStorage.getItem(key));
    const out = [];
    for (const [kind, opts] of [
      ['bubbles', { lineWidth: 'none', fillTone: 'strong' }],
      ['treemap', { lineWidth: 'thick', fillTone: 'light', corners: 'square' }],
      ['sunburst', { lineWidth: 'medium', fillTone: 'strong', ringGap: 'wide' }],
      ['icons', { circleWidth: 'thick', iconStroke: 'thick' }],
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

/* Apparence (lot 5d) : heatmap. Sans clé, le dessin est celui d'avant. */
const hm = (svg) => ({
  cells: [...svg.querySelectorAll('path.hm-cell')].map((p) => ({
    d: p.getAttribute('d'),
    op: +(p.getAttribute('fill-opacity') ?? 1),
    stroke: p.getAttribute('stroke'),
    sw: +p.getAttribute('stroke-width'),
  })),
  pending: [...svg.querySelectorAll('path.hm-pending')].map((p) => p.getAttribute('stroke-dasharray')),
  legend: [...svg.querySelectorAll('g.lg path[fill-opacity]')].map((r) => +r.getAttribute('fill-opacity')),
  size: Math.max(...[...svg.querySelectorAll('g[fill] text')].map((t) => +t.getAttribute('font-size'))),
});
const withPending = (o) => ({
  ...o,
  rows: [
    { label: 'A', v: [10, 12, null, 9] },
    { label: 'B', v: [20, 18, 25, null] },
  ],
});

test('heatmap : contour des cases, cases en attente, intensité, taille du texte', async ({ page }) => {
  const base = await probe(page, 'heatmap', {}, hm);
  expect(base.cells.length).toBeGreaterThan(3);
  expect(base.cells.every((c) => c.stroke === null)).toBe(true);
  expect(await probe(page, 'heatmap', { cellLine: 'none', pendingStyle: 'dashed', fillTone: 'normal', valueSize: 'normal' }, hm)).toEqual(
    base,
  );

  const line = await probe(page, 'heatmap', { cellLine: 'medium' }, hm);
  expect(line.cells.every((c) => c.stroke === 'currentColor' && c.sw > 0)).toBe(true);
  const thin = await probe(page, 'heatmap', { cellLine: 'thin' }, hm);
  expect(line.cells[0].sw).toBeCloseTo(thin.cells[0].sw * 2, 5);

  const light = await probe(page, 'heatmap', { fillTone: 'light' }, hm);
  const strong = await probe(page, 'heatmap', { fillTone: 'strong' }, hm);
  base.cells.forEach((c, i) => {
    expect(light.cells[i].op).toBeLessThanOrEqual(c.op);
    expect(strong.cells[i].op).toBeGreaterThanOrEqual(c.op);
    expect(strong.cells[i].op).toBeLessThanOrEqual(1);
  });
  expect(light.cells.some((c, i) => c.op < base.cells[i].op)).toBe(true);
  expect(strong.cells.some((c, i) => c.op > base.cells[i].op)).toBe(true);
  expect(light.legend.some((a, i) => a < base.legend[i])).toBe(true); // la légende suit les cases

  expect((await probe(page, 'heatmap', { valueSize: 'small' }, hm)).size).toBeLessThan(base.size);
  expect((await probe(page, 'heatmap', { valueSize: 'large' }, hm)).size).toBeGreaterThan(base.size);

  const pend = async (o) => (await probe(page, 'heatmap', withPending(o), hm)).pending;
  expect(await pend({})).toEqual(['3 2', '3 2']);
  expect(await pend({ pendingStyle: 'dashed' })).toEqual(['3 2', '3 2']);
  expect(await pend({ pendingStyle: 'dotted' })).toEqual(['1 3', '1 3']);
  expect(await pend({ pendingStyle: 'solid' })).toEqual([null, null]);
});

test('export PDF avec les réglages d’apparence de la heatmap (lot 5d), sans erreur', async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page, 'default');
  await page.addScriptTag({ url: '/factsheet/tests/entry.bundle.js' });
  await addBundle(page, 'pdfexport.js');
  const sizes = await page.evaluate(async (key) => {
    const base = JSON.parse(localStorage.getItem(key));
    const out = [];
    for (const opts of [
      { cellLine: 'medium', fillTone: 'strong', valueSize: 'large', pendingStyle: 'dotted' },
      { cellLine: 'thin', fillTone: 'light', valueSize: 'small', pendingStyle: 'solid' },
    ]) {
      const doc = JSON.parse(JSON.stringify(base));
      const col = doc.sections.flatMap((s) => s.subs.flatMap((b) => b.cols)).find((c) => c.viz);
      col.viz = window.FSTEST.newViz('heatmap');
      Object.assign(col.viz.opts, opts);
      col.viz.opts.rows = [
        { label: 'A', v: [10, 12, null, 9] },
        { label: 'B', v: [20, 18, 25, null] },
      ];
      const { bytes } = await window.FSPDF.build(doc, 'net', { profile: 'x1a' });
      out.push(bytes.length);
    }
    return out;
  }, DOC_KEY);
  sizes.forEach((n) => expect(n).toBeGreaterThan(1000));
  expect(errors).toEqual([]);
});

/* Apparence (lot 5e) : contours des barres, de l'anneau, des nœuds du Sankey, trait de la ligne de base. Sans clé : aspect d'avant. */
const filled = (svg) =>
  [...svg.querySelectorAll('path[fill], rect[fill]')]
    .filter((n) => n.getAttribute('fill') !== 'none' && n.getAttribute('fill') !== '#FFFFFF' && n.hasAttribute('stroke'))
    .map((n) => ({ stroke: n.getAttribute('stroke'), sw: +n.getAttribute('stroke-width') }));

for (const [kind, key] of [
  ['bars', 'lineWidth'],
  ['hbars', 'lineWidth'],
  ['donut', 'lineWidth'],
  ['sankey', 'nodeLine'],
]) {
  test(`${kind} : ${key} Aucun / Fin (d’origine) / Moyen / Épais`, async ({ page }) => {
    const none = await probe(page, kind, {}, filled);
    expect(none.length).toBeGreaterThan(1);
    const base = none.find((n) => n.stroke === 'currentColor').sw;
    expect(await probe(page, kind, { [key]: 'thin' }, filled)).toEqual(none);
    const med = await probe(page, kind, { [key]: 'medium' }, filled);
    expect(med.some((n) => n.sw === base * 2)).toBe(true);
    if (key === 'lineWidth') expect((await probe(page, kind, { [key]: 'thick' }, filled)).some((n) => n.sw === base * 3)).toBe(true);
    const off = await probe(page, kind, { [key]: 'none' }, filled);
    expect(off.some((n) => n.stroke === 'none')).toBe(true);
    expect(off.filter((n) => n.stroke === 'currentColor').length).toBeLessThan(none.filter((n) => n.stroke === 'currentColor').length);
  });
}

test('barres et barres horizontales : trait de la ligne de base', async ({ page }) => {
  for (const kind of ['bars', 'hbars']) {
    const f = (svg) => Math.max(...[...svg.querySelectorAll('line[stroke="currentColor"]')].map((l) => +l.getAttribute('stroke-width')));
    const o = { baseline: true };
    const none = await probe(page, kind, o, f);
    expect(await probe(page, kind, { ...o, baseWidth: 'thin' }, f)).toBe(none);
    expect(await probe(page, kind, { ...o, baseWidth: 'thick' }, f)).toBeCloseTo(none * 3, 5);
  }
});

test('export PDF avec les réglages d’apparence (lot 5e), sans erreur', async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page, 'default');
  await page.addScriptTag({ url: '/factsheet/tests/entry.bundle.js' });
  await addBundle(page, 'pdfexport.js');
  const sizes = await page.evaluate(async (key) => {
    const base = JSON.parse(localStorage.getItem(key));
    const out = [];
    for (const [kind, opts] of [
      ['bars', { lineWidth: 'none', baseline: true, baseWidth: 'thick' }],
      ['hbars', { lineWidth: 'thick', baseline: true, baseWidth: 'medium' }],
      ['donut', { lineWidth: 'medium' }],
      ['sankey', { nodeLine: 'none' }],
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

/* Apparence (lot 5f) : cadres (épaisseur, coins), chiffre clé, image de carte. Sans clé, le dessin et la mise en page sont ceux d'avant. */
async function frame(page, box) {
  return page.evaluate((box) => {
    const { defaultDoc, newViz, newCol, renderDocument } = window.FSTEST;
    const d = defaultDoc();
    const viz = newViz('bars');
    viz.head.title = 'PROBE';
    const col = { ...newCol('viz'), viz, stroke: true, ...box };
    d.sections.find((s) => s.page === 'recto').subs[1].cols[0] = col;
    const r = renderDocument(d);
    const host = document.createElement('div');
    Object.assign(host.style, { position: 'absolute', left: '-30000px', top: '0' });
    document.body.append(host);
    r.pages.forEach((p) => host.append(p.el));
    const el = [...host.querySelectorAll('.col.stroked')].find((e) => e.textContent.includes('PROBE'));
    const out = {
      bw: parseFloat(el.style.getPropertyValue('--bw')), // la feuille de style n'est pas chargée dans blank.html : on lit les variables posées sur le cadre
      rad: parseFloat(el.style.getPropertyValue('--rad')),
      vizW: +el.querySelector('svg').getAttribute('width'),
    };
    host.remove();
    return out;
  }, box);
}

test('cadres : épaisseur du contour (0,5 pt d’origine) et coins (3 px d’origine), largeur utile ajustée', async ({ page }) => {
  const none = await frame(page, {});
  expect(none.bw).toBeCloseTo(0.667, 2);
  expect(none.rad).toBe(3);
  expect(await frame(page, { strokeW: 'thin', corners: 'round' })).toEqual(none);
  const med = await frame(page, { strokeW: 'medium' });
  const thick = await frame(page, { strokeW: 'thick' });
  expect(med.bw).toBeCloseTo(1.333, 2);
  expect(thick.bw).toBeCloseTo(2, 2);
  expect(none.vizW - thick.vizW).toBeCloseTo(2 * (2 - 0.667), 1); // le retrait suit le trait : rien ne déborde
  expect((await frame(page, { corners: 'square' })).rad).toBe(0);
  expect((await frame(page, { corners: 'soft' })).rad).toBe(6);
  /* sans contour, l'épaisseur choisie ne change pas le retrait */
  const noStroke = await frame(page, { stroke: false, fillColor: 'grey', strokeW: 'thick' });
  expect(noStroke.bw).toBeCloseTo(0.667, 2);
});

test('chiffre clé : barre (hauteur, coins) et trait de la pastille', async ({ page }) => {
  const f = (o) =>
    page.evaluate((o) => {
      const { defaultDoc, newCol, renderDocument } = window.FSTEST;
      const d = defaultDoc();
      const col = newCol('figure');
      Object.assign(col.figure, { bar: 60, icon: 'globe', iconStyle: 'circle', text: 'PROBE' }, o);
      d.sections.find((s) => s.page === 'recto').subs[1].cols[0] = col;
      const r = renderDocument(d);
      const host = document.createElement('div');
      Object.assign(host.style, { position: 'absolute', left: '-30000px', top: '0' });
      document.body.append(host);
      r.pages.forEach((p) => host.append(p.el));
      const mine = [...host.querySelectorAll('.col-figure')].find((e) => e.textContent.includes('PROBE')),
        bar = mine.querySelector('svg.fg-bar'),
        rects = [...bar.querySelectorAll('rect')];
      const ring = mine.querySelector('svg.fg-ic circle');
      const out = { h: +bar.getAttribute('height'), rx: +rects[0].getAttribute('rx'), ring: +ring.getAttribute('stroke-width') };
      host.remove();
      return out;
    }, o);
  const none = await f({});
  expect(none.h).toBe(15);
  expect(none.rx).toBe(4.5);
  expect(await f({ barHeight: 'normal', barCorners: 'round', iconRing: 'thin' })).toEqual(none);
  expect((await f({ barHeight: 'thin' })).h).toBe(9);
  expect((await f({ barHeight: 'thick' })).h).toBe(21);
  expect((await f({ barCorners: 'square' })).rx).toBe(0);
  expect((await f({ iconRing: 'thick' })).ring).toBeCloseTo(none.ring * 3, 5);
});

test('export PDF avec les réglages de cadres et de chiffre clé (lot 5f), sans erreur', async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page, 'default');
  await page.addScriptTag({ url: '/factsheet/tests/entry.bundle.js' });
  await addBundle(page, 'pdfexport.js');
  const sizes = await page.evaluate(async (key) => {
    const base = JSON.parse(localStorage.getItem(key));
    const out = [];
    for (const box of [
      { stroke: true, strokeW: 'thick', corners: 'soft' },
      { stroke: true, strokeW: 'medium', corners: 'square', dash: true },
    ]) {
      const doc = JSON.parse(JSON.stringify(base));
      const secs = doc.sections;
      Object.assign(secs[0], box);
      Object.assign(secs[0].subs[0], box);
      Object.assign(secs[0].subs[0].cols[0], box);
      const col = secs.flatMap((s) => s.subs.flatMap((b) => b.cols)).find((c) => c.figure);
      if (col)
        Object.assign(col.figure, {
          bar: 50,
          barHeight: 'thick',
          barCorners: 'square',
          icon: 'globe',
          iconStyle: 'circle',
          iconRing: 'medium',
        });
      const { bytes } = await window.FSPDF.build(doc, 'net', { profile: 'x1a' });
      out.push(bytes.length);
    }
    return out;
  }, DOC_KEY);
  sizes.forEach((n) => expect(n).toBeGreaterThan(1000));
  expect(errors).toEqual([]);
});
