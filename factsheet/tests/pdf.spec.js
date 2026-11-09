const { test, expect } = require('@playwright/test');
const { PDFDocument, PDFName, PDFDict, PDFArray, PDFString, PDFHexString, PDFNumber, PDFRawStream, decodePDFRawStream } = require('pdf-lib');
const { execFileSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { openApp, addBundle, stubExternal, watchErrors, DOC_KEY } = require('./helpers');

const DOCS = ['default', 'chars', 'dataviz-1', 'dataviz-2', 'dataviz-3'];
const MODES = { net: { off: 0, bleed: 0 }, bleed: { off: 3, bleed: 3 }, marks: { off: 9, bleed: 3 } };   // mm : décalage du format fini, fond perdu
const PROFILES = ['none', 'x4', 'x1a', 'rgb'];
const PT = 72 / 25.4, A4 = { w: 210, h: 297 };
const near = (a, b, tol = 0.02) => Math.abs(a - b) <= tol;

/** Construit le PDF dans la page (window.FSPDF, bundle pdfexport.js) ; renvoie les octets et les caractères manquants. */
async function buildPdf(page, mode, profile) {
  const r = await page.evaluate(async ([key, mode, profile]) => {
    const doc = JSON.parse(localStorage.getItem(key));
    const { bytes, missing } = await window.FSPDF.build(doc, mode, { profile });
    const b64 = await new Promise(res => { const fr = new FileReader(); fr.onload = () => res(String(fr.result).split(',')[1]); fr.readAsDataURL(new Blob([bytes])); });
    return { b64, missing };
  }, [DOC_KEY, mode, profile]);
  return { bytes: Buffer.from(r.b64, 'base64'), missing: r.missing };
}

const boxOf = b => [b.x, b.y, b.width, b.height];
function expectBox(actual, [x, y, w, h], label) {
  const a = boxOf(actual);
  [x, y, w, h].forEach((v, i) => expect(near(a[i], v * PT), `${label} [${i}] : ${a[i]} ≠ ${v * PT}`).toBe(true));
}

/** Dictionnaires de transparence ou de masque : cherche dans tous les objets et dans les ressources de chaque page. */
function transparencyFindings(pdf) {
  const found = [];
  const lookDict = (d, where) => {
    if (!(d instanceof PDFDict)) return;
    if (d.has(PDFName.of('SMask'))) found.push(`${where} : /SMask`);
    for (const k of ['ca', 'CA']) {
      const v = d.lookup(PDFName.of(k));
      if (v instanceof PDFNumber && v.asNumber() < 1) found.push(`${where} : /${k} ${v.asNumber()}`);
    }
  };
  for (const [ref, obj] of pdf.context.enumerateIndirectObjects()) lookDict(obj instanceof PDFDict ? obj : obj && obj.dict, ref.toString());
  pdf.getPages().forEach((p, i) => {
    const res = p.node.Resources();
    const gs = res && res.lookup(PDFName.of('ExtGState'), PDFDict);
    if (gs) for (const [name] of gs.entries()) lookDict(gs.lookup(name, PDFDict), `page ${i + 1} ExtGState ${name}`);
    const xo = res && res.lookup(PDFName.of('XObject'), PDFDict);
    if (xo) for (const [name] of xo.entries()) { const o = xo.lookup(name); lookDict(o && o.dict, `page ${i + 1} XObject ${name}`); }
  });
  return found;
}

/** Opérateurs de couleur des flux de contenu et espaces des images : { cmyk, rgb, images: Set } — cmyk/rgb = nombre d'opérateurs k/K, rg/RG. */
function colourUse(pdf) {
  const out = { cmyk: 0, rgb: 0, images: new Set() };
  for (const p of pdf.getPages()) {
    const c = p.node.Contents(), list = c instanceof PDFArray ? c.asArray().map(r => pdf.context.lookup(r)) : [c];
    for (const st of list) {
      const txt = Buffer.from(st instanceof PDFRawStream ? decodePDFRawStream(st).decode() : st.getContents()).toString('latin1');
      out.cmyk += (txt.match(/(^|\s)[kK](?=\s|$)/g) || []).length;
      out.rgb += (txt.match(/(^|\s)(rg|RG)(?=\s|$)/g) || []).length;
    }
    const xo = p.node.Resources() && p.node.Resources().lookup(PDFName.of('XObject'), PDFDict);
    if (xo) for (const [name] of xo.entries()) {
      const o = xo.lookup(name), cs = o && o.dict && o.dict.lookup(PDFName.of('ColorSpace'));
      if (cs) out.images.add(cs.toString());
    }
  }
  return out;
}

/** Colonne de pixels d'un PPM (P6) : renvoie la fonction px(x, y) → [r, g, b]. */
function readPpm(buf) {
  let pos = 0; const tok = () => { while (/\s/.test(String.fromCharCode(buf[pos]))) pos++; let s = ''; while (!/\s/.test(String.fromCharCode(buf[pos]))) s += String.fromCharCode(buf[pos++]); return s; };
  expect(tok()).toBe('P6'); const w = +tok(), h = +tok(); tok(); pos++;
  return { w, h, px: (x, y) => { const i = pos + (y * w + x) * 3; return [buf[i], buf[i + 1], buf[i + 2]]; } };
}
/** Première ligne (en pixels) où la couleur de la colonne x change par rapport à la ligne `from` ; null si aucun changement. */
function firstChange(px, h, x, from, tol = 10) {
  const c0 = px(x, from);
  for (let y = from + 1; y < h; y++) if (px(x, y).some((v, i) => Math.abs(v - c0[i]) > tol)) return y;
  return null;
}
const hasPdftoppm = spawnSync('pdftoppm', ['-v']).error === undefined;

for (const name of DOCS) {
  test.describe(`PDF — ${name}`, () => {
    test.describe.configure({ mode: 'serial' });
    let page, errors;
    test.beforeAll(async ({ browser }, info) => {
      const ctx = await browser.newContext({ baseURL: info.project.use.baseURL, viewport: { width: 1600, height: 1000 } });
      page = await ctx.newPage(); errors = watchErrors(page);
      await openApp(page, name); await addBundle(page, 'pdfexport.js');
      expect(await page.evaluate(() => typeof window.FSPDF.build)).toBe('function');
    });
    test.afterAll(async () => { await page.context().close(); });

    for (const mode of Object.keys(MODES)) for (const profile of PROFILES) {
      test(`${mode} · ${profile}`, async ({}, info) => {
        const { bytes, missing } = await buildPdf(page, mode, profile);
        const file = info.outputPath(`${name}-${mode}-${profile}.pdf`); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, bytes);
        const text = bytes.toString('latin1'), pdf = await PDFDocument.load(bytes);

        expect(pdf.getPageCount(), 'nombre de pages').toBe(2);
        const { off, bleed } = MODES[mode], sheet = [A4.w + 2 * off, A4.h + 2 * off];
        for (const p of pdf.getPages()) {
          expectBox(p.getMediaBox(), [0, 0, ...sheet], 'MediaBox');
          expectBox(p.getTrimBox(), [off, off, A4.w, A4.h], 'TrimBox');
          expectBox(p.getBleedBox(), [off - bleed, off - bleed, A4.w + 2 * bleed, A4.h + 2 * bleed], 'BleedBox');
        }

        if (profile === 'x1a') expect(text.slice(0, 8)).toBe('%PDF-1.4');
        if (profile === 'x4') expect(text.slice(0, 8)).toBe('%PDF-1.6');
        if (profile === 'none' || profile === 'rgb') expect(text.slice(0, 5)).toBe('%PDF-');
        if (profile === 'rgb') expect(pdf.catalog.has(PDFName.of('OutputIntents')), 'pas de profil de sortie en RVB').toBe(false);
        if (profile === 'x4' || profile === 'x1a') {
          const oi = pdf.catalog.lookup(PDFName.of('OutputIntents'), PDFArray);
          const intent = oi.lookup(0, PDFDict);
          expect(intent.lookup(PDFName.of('OutputConditionIdentifier'), PDFString).decodeText()).toBe('FOGRA39');
          expect(intent.has(PDFName.of('DestOutputProfile')), 'profil ICC incorporé').toBe(true);
          expect(text, '/ID du trailer').toMatch(/\/ID\s*\[\s*</);
        }
        if (profile === 'x1a') expect(transparencyFindings(pdf), 'transparence en PDF/X-1a').toEqual([]);

        /* espace de couleur : DeviceRGB seulement pour le profil RVB, DeviceCMYK seulement pour les autres */
        const use = colourUse(pdf), rgb = profile === 'rgb';
        expect(rgb ? use.rgb : use.cmyk, 'opérateurs de couleur de l’espace du profil').toBeGreaterThan(0);
        expect(rgb ? use.cmyk : use.rgb, 'opérateurs de couleur de l’autre espace').toBe(0);
        for (const cs of use.images) expect(cs, 'espace des images').toBe(rgb ? '/DeviceRGB' : '/DeviceCMYK');

        if (name === 'chars') expect(missing, 'caractères absents des polices').toEqual([]);
        expect(errors).toEqual([]);
      });
    }

    /* Fond perdu : le fond de la 1re bande ne doit pas recouvrir le bas du header (la limite reste à 180 pt du format fini). */
    if (name === 'chars') for (const mode of ['bleed', 'marks']) for (const profile of ['x4', 'rgb']) {
      test(`limite header / 1re bande en ${mode} · ${profile}`, async ({}, info) => {
        test.skip(!hasPdftoppm, 'pdftoppm absent : contrôle fait sur la capture de la page (voir plus bas)');
        const { bytes } = await buildPdf(page, mode, profile);
        const file = info.outputPath(`limite-${mode}-${profile}.pdf`); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, bytes);
        const root = info.outputPath(`limite-${mode}-${profile}`);
        execFileSync('pdftoppm', ['-r', '144', '-f', '1', '-l', '1', '-singlefile', file, root]);
        const img = readPpm(fs.readFileSync(root + '.ppm')), k = 144 / 72, offPt = MODES[mode].off * PT;
        const x = Math.round((offPt - 2) * k);   // dans la zone de fond perdu à gauche : ni logo ni repère de coupe
        const headerTop = img.px(x, Math.round((offPt - 4) * k)),   // dans le fond perdu (3 mm = 8,5 pt)
           headerBottom = img.px(x, Math.round((offPt + 170) * k));
        expect(headerTop, 'le header déborde en haut').toEqual(headerBottom);
        if (profile === 'rgb') {   // RVB : la couleur du header est exactement celle de l'écran
          const css = await page.evaluate(() => getComputedStyle(document.querySelector('#stage .hd')).backgroundColor);
          const screen = css.match(/\d+/g).slice(0, 3).map(Number);
          headerBottom.forEach((v, i) => expect(Math.abs(v - screen[i]), `couleur du header ${headerBottom} ≠ ${screen}`).toBeLessThanOrEqual(1));
        }
        const y = firstChange(img.px, img.h, x, Math.round((offPt + 170) * k));
        expect(y, 'limite header / bande introuvable').not.toBeNull();
        const expected = (180 + offPt) * k;
        expect(Math.abs(y - expected), `limite à ${y / k} pt, attendue à ${180 + offPt} pt`).toBeLessThanOrEqual(1.5);
      });
    }
  });
}

/* Sans pdftoppm : même contrôle sur la capture de la page (pas de fond perdu à l'écran : limite à 240 px de document). */
test('limite header / 1re bande sur la capture de la page', async ({ page }) => {
  test.skip(hasPdftoppm, 'pdftoppm disponible : contrôle fait sur le PDF');
  await openApp(page, 'chars');
  const el = page.locator('#stage .page').first(), box = await el.boundingBox();
  const png = await el.screenshot();
  const res = await page.evaluate(async b64 => {
    const bmp = await createImageBitmap(new Blob([Uint8Array.from(atob(b64), c => c.charCodeAt(0))]));
    const cv = new OffscreenCanvas(bmp.width, bmp.height), g = cv.getContext('2d'); g.drawImage(bmp, 0, 0);
    const col = g.getImageData(6, 0, 1, bmp.height).data; let y = -1; const c0 = [col[40 * 4], col[40 * 4 + 1], col[40 * 4 + 2]];   // couleur du header, lue bien à l'intérieur
    for (let i = 41; i < bmp.height; i++) if ([0, 1, 2].some(k => Math.abs(col[i * 4 + k] - c0[k]) > 10)) { y = i; break; }
    return { y, h: bmp.height };
  }, png.toString('base64'));
  const scale = res.h / (297 * 96 / 25.4);   // pixels capturés par pixel de document
  expect(Math.abs(res.y - 240 * scale)).toBeLessThanOrEqual(2);
});

/* Sécurité : une icône SVG importée ne doit pas exécuter de code, ni à l'aperçu ni à l'export. */
test('icône SVG importée : aucun code exécuté', async ({ page }) => {
  const errors = watchErrors(page);
  await stubExternal(page);
  await page.goto('/factsheet/tests/blank.html');
  await page.evaluate(([key, langKey]) => { localStorage.clear(); localStorage.setItem(key, JSON.stringify(window.FSTEST.evilIcon())); localStorage.setItem(langKey, 'en'); }, [DOC_KEY, 'factsheet-creator-lang']);
  await page.goto('/factsheet/index.html');
  await page.waitForSelector('#stage .page');
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => window.__pwn), 'code exécuté à l’aperçu').toBeUndefined();
  expect(await page.locator('#stage svg image[onerror], #stage [onerror]').count(), 'attribut onerror gardé dans le rendu').toBe(0);
  await addBundle(page, 'pdfexport.js');
  const { bytes } = await buildPdf(page, 'net', 'x4');
  expect(bytes.length).toBeGreaterThan(1000);
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => window.__pwn), 'code exécuté à l’export PDF').toBeUndefined();
  expect(errors.filter(e => !/Failed to load resource/.test(e))).toEqual([]);
});
