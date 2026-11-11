const { test, expect } = require('@playwright/test');
const { openApp, watchErrors, addBundle, DOC_KEY } = require('./helpers');

/* Repère (lot 4 de l'audit des options) : ligne de référence des types à axes (rendu, échelle, texte, ordre de dessin, export PDF). */

/** Rend une dataviz seule et renvoie ce qu'il faut pour vérifier le dessin. */
async function probe(page, kind, opts) {
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
      const svg = [...host.querySelectorAll('svg')].find((s) => s.querySelector('.viz-ref') || s.querySelector('[data-viz-probe]')) || null;
      const all = [...host.querySelectorAll('svg')];
      const target = svg || all.find((s) => s.querySelector('path[stroke],circle')) || all[0];
      const lines = [...target.querySelectorAll('line.viz-ref')].map((l) => ({
        x1: +l.getAttribute('x1'),
        y1: +l.getAttribute('y1'),
        x2: +l.getAttribute('x2'),
        y2: +l.getAttribute('y2'),
        dash: l.getAttribute('stroke-dasharray'),
        stroke: l.getAttribute('stroke'),
      }));
      const texts = [...target.querySelectorAll('text.viz-ref-t')].map((x) => ({
        t: x.textContent,
        x: +x.getAttribute('x'),
        y: +x.getAttribute('y'),
      }));
      const els = [...target.querySelectorAll('*')];
      const refIdx = els.findIndex((e) => e.matches('line.viz-ref'));
      const dataIdx = els.findIndex((e) => e.matches('path[fill]:not([fill=none]), circle'));
      const out = { lines, texts, refBeforeData: refIdx >= 0 && refIdx < dataIdx, W: +target.getAttribute('width') };
      host.remove();
      return out;
    },
    [kind, opts],
  );
}

test.beforeEach(async ({ page }) => {
  await page.goto('/factsheet/tests/blank.html');
});

test('éteint : aucune ligne ; allumé : tirets, encre du document, sous les données', async ({ page }) => {
  for (const [kind, on] of [
    ['bars', { refLine: true, refValue: 60, refText: 'Objectif' }],
    ['hbars', { refLine: true, refValue: 60, refText: 'Objectif' }],
    ['line', { refLine: true, refValue: 60, refText: 'Objectif' }],
    ['scatter', { refLineX: true, refX: 30, refTextX: 'Moy. X', refLineY: true, refY: 75, refTextY: 'Moy. Y' }],
  ]) {
    const type = kind === 'hbars' ? 'hbars' : kind;
    const off = await probe(page, type, {});
    expect(off.lines, kind).toHaveLength(0);
    const r = await probe(page, type, on);
    expect(r.lines, kind).toHaveLength(kind === 'scatter' ? 2 : 1);
    for (const l of r.lines) {
      expect(l.dash).toBe('5 3');
      expect(l.stroke).toBe('currentColor');
    }
    expect(r.texts.length, kind).toBe(kind === 'scatter' ? 2 : 1);
    expect(r.refBeforeData, kind).toBe(true);
  }
});

test('le texte est posé après le bout de la ligne horizontale, au-dessus de la ligne verticale', async ({ page }) => {
  const b = await probe(page, 'bars', { refLine: true, refValue: 60, refText: 'Objectif' });
  expect(b.texts[0].t).toBe('Objectif');
  expect(b.texts[0].x).toBeGreaterThan(b.lines[0].x2); // jamais sur les barres ni leurs valeurs
  expect(b.lines[0].y1).toBe(b.lines[0].y2);
  const h = await probe(page, 'hbars', { refLine: true, refValue: 60, refText: 'Objectif' });
  expect(h.texts[0].y).toBeLessThan(h.lines[0].y1); // au-dessus du haut de la ligne verticale
  const l = await probe(page, 'line', { refLine: true, refValue: 60, refText: 'Moyenne' });
  expect(l.texts[0].x).toBeGreaterThan(l.lines[0].x2);
  const none = await probe(page, 'bars', { refLine: true, refValue: 60, refText: '' });
  expect(none.texts).toHaveLength(0);
});

test('l’échelle s’étend pour inclure la valeur du repère', async ({ page }) => {
  const inside = await probe(page, 'bars', { refLine: true, refValue: 60 });
  const above = await probe(page, 'bars', { refLine: true, refValue: 500 });
  // valeur plus haute que les données : la ligne reste dans le graphique (y ≥ 0) et les barres rétrécissent
  expect(above.lines[0].y1).toBeGreaterThanOrEqual(0);
  const y500 = above.lines[0].y1,
    y60 = inside.lines[0].y1;
  expect(y500).toBeLessThan(y60 + 1); // sans extension, 500 serait très au-dessus du cadre
  const l = await probe(page, 'line', { refLine: true, refValue: 500 });
  expect(l.lines[0].y1).toBeGreaterThanOrEqual(0);
  const s = await probe(page, 'scatter', { refLineY: true, refY: 200, refLineX: true, refX: -50 });
  expect(s.lines[0].x1).toBeGreaterThanOrEqual(0);
  expect(s.lines[1].y1).toBeGreaterThanOrEqual(0);
});

test('export PDF avec repère, sans erreur', async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page, 'default');
  await page.addScriptTag({ url: '/factsheet/tests/entry.bundle.js' });
  await addBundle(page, 'pdfexport.js');
  const n = await page.evaluate(async (key) => {
    const doc = JSON.parse(localStorage.getItem(key));
    const col = doc.sections.flatMap((s) => s.subs.flatMap((b) => b.cols)).find((c) => c.viz);
    col.viz = window.FSTEST.newViz('bars');
    Object.assign(col.viz.opts, { refLine: true, refValue: 60, refText: 'Objectif' });
    const { bytes } = await window.FSPDF.build(doc, 'net', { profile: 'x1a' });
    return bytes.length;
  }, DOC_KEY);
  expect(n).toBeGreaterThan(1000);
  expect(errors).toEqual([]);
});
