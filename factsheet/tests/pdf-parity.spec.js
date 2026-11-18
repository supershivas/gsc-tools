const { test, expect } = require('@playwright/test');
const { execFileSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { openApp, addBundle, watchErrors, DOC_KEY } = require('./helpers');

/* Parité aperçu ↔ PDF : chaque page de l'aperçu est capturée, la même page du PDF (format net, profil RVB = couleurs de l'écran)
   est rastérisée par pdftoppm à la même taille en pixels, puis les deux images sont comparées dans le navigateur :
   - un pixel diffère si aucun pixel de l'autre image, à ±R px autour, n'a la même couleur (à T près sur chaque canal) :
     le crénelage et les décalages d'un pixel du texte ne comptent pas ;
   - la comparaison se fait dans les deux sens (élément absent du PDF, ou présent seulement dans le PDF) ;
   - les pixels différents sont comptés par case de CELL px ; les cases au-delà de MIN sont regroupées en zones,
     et chaque zone est rapportée avec l'élément de l'aperçu qui se trouve dessous.
   Une image des écarts (aperçu pâli, écarts en rouge) est jointe au rapport du test. */

const DOCS = [
  'default',
  'chars',
  'dataviz-1',
  'dataviz-2',
  'dataviz-3',
  'table',
  'table-style',
  'table-text',
  'iso-tight',
  'iso-loose',
  'clip',
  'ui',
];
const R = 2,
  T = 40,
  BLUR = 1.2,
  CELL = 12,
  MIN = 16;
const DSF = 2; // capture à la densité de playwright.config.js (deviceScaleFactor)
const hasPdftoppm = spawnSync('pdftoppm', ['-v']).error === undefined;

async function buildPdf(page) {
  const b64 = await page.evaluate(async (key) => {
    const doc = JSON.parse(localStorage.getItem(key));
    const { bytes } = await window.FSPDF.build(doc, 'net', { profile: 'rgb' });
    return await new Promise((res) => {
      const fr = new FileReader();
      fr.onload = () => res(String(fr.result).split(',')[1]);
      fr.readAsDataURL(new Blob([bytes]));
    });
  }, DOC_KEY);
  return Buffer.from(b64, 'base64');
}

/** Compare deux PNG (base64) de même taille ; renvoie les zones d'écart (en pixels de l'image) et l'image des écarts. */
async function compare(page, aB64, bB64, place, opts) {
  return page.evaluate(
    async ([a64, b64, place, { R, T, CELL, MIN, BLUR }]) => {
      const bitmap = (s) => createImageBitmap(new Blob([Uint8Array.from(atob(s), (c) => c.charCodeAt(0))]));
      const ba = await bitmap(a64),
        bb = await bitmap(b64);
      const read = (bmp, box) => {
        const cv = new OffscreenCanvas(ba.width, ba.height),
          g = cv.getContext('2d');
        g.fillStyle = '#fff';
        g.fillRect(0, 0, ba.width, ba.height);
        g.imageSmoothingQuality = 'high';
        g.filter = `blur(${BLUR}px)`;
        if (box) g.drawImage(bmp, box[0], box[1], box[2], box[3]);
        else g.drawImage(bmp, 0, 0);
        return g.getImageData(0, 0, ba.width, ba.height);
      };
      /* la capture couvre des pixels entiers : la page du PDF y est posée à sa position et à sa taille exactes (sous-pixel) */
      const A = read(ba),
        B = read(bb, place);
      const W = Math.min(A.width, B.width),
        H = Math.min(A.height, B.height);
      const a = A.data,
        b = B.data;
      /** p (pixel de X) a-t-il un voisin de même couleur dans Y ? */
      const found = (X, Y, wx, wy, x, y) => {
        const i = (y * wx + x) * 4;
        for (let dy = -R; dy <= R; dy++) {
          const yy = y + dy;
          if (yy < 0 || yy >= H) continue;
          for (let dx = -R; dx <= R; dx++) {
            const xx = x + dx;
            if (xx < 0 || xx >= W) continue;
            const j = (yy * wy + xx) * 4;
            if (Math.abs(X[i] - Y[j]) <= T && Math.abs(X[i + 1] - Y[j + 1]) <= T && Math.abs(X[i + 2] - Y[j + 2]) <= T) return true;
          }
        }
        return false;
      };
      const cw = Math.ceil(W / CELL),
        ch = Math.ceil(H / CELL),
        cells = new Uint16Array(cw * ch),
        bad = new Uint8Array(W * H);
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++)
          if (!found(a, b, A.width, B.width, x, y) || !found(b, a, B.width, A.width, x, y)) {
            bad[y * W + x] = 1;
            cells[Math.floor(y / CELL) * cw + Math.floor(x / CELL)]++;
          }
      /* zones : cases marquées voisines (8-connexité, une case d'écart tolérée) */
      const seen = new Uint8Array(cw * ch),
        zones = [];
      for (let c = 0; c < cw * ch; c++) {
        if (cells[c] < MIN || seen[c]) continue;
        const stack = [c];
        seen[c] = 1;
        let x0 = 1e9,
          y0 = 1e9,
          x1 = -1,
          y1 = -1,
          px = 0;
        while (stack.length) {
          const k = stack.pop(),
            cx = k % cw,
            cy = (k - cx) / cw;
          x0 = Math.min(x0, cx);
          y0 = Math.min(y0, cy);
          x1 = Math.max(x1, cx);
          y1 = Math.max(y1, cy);
          px += cells[k];
          for (let dy = -2; dy <= 2; dy++)
            for (let dx = -2; dx <= 2; dx++) {
              const nx = cx + dx,
                ny = cy + dy;
              if (nx < 0 || ny < 0 || nx >= cw || ny >= ch) continue;
              const n = ny * cw + nx;
              if (!seen[n] && cells[n] >= MIN) {
                seen[n] = 1;
                stack.push(n);
              }
            }
        }
        zones.push({ x: x0 * CELL, y: y0 * CELL, w: (x1 - x0 + 1) * CELL, h: (y1 - y0 + 1) * CELL, px });
      }
      /* image des écarts : aperçu pâli, pixels différents en rouge, zones encadrées */
      const out = new OffscreenCanvas(W, H),
        g = out.getContext('2d'),
        img = g.createImageData(W, H);
      for (let i = 0; i < W * H; i++) {
        const j = i * 4,
          k = ((i / W) | 0) * A.width * 4 + (i % W) * 4;
        if (bad[i]) img.data.set([230, 0, 0, 255], j);
        else for (let c = 0; c < 3; c++) img.data[j + c] = 255 - (255 - a[k + c]) * 0.25;
        img.data[j + 3] = 255;
      }
      g.putImageData(img, 0, 0);
      g.strokeStyle = 'rgb(230,0,0)';
      g.lineWidth = 2;
      for (const z of zones) g.strokeRect(z.x - 3, z.y - 3, z.w + 6, z.h + 6);
      const blob = await out.convertToBlob({ type: 'image/png' });
      const diff = await new Promise((res) => {
        const fr = new FileReader();
        fr.onload = () => res(String(fr.result).split(',')[1]);
        fr.readAsDataURL(blob);
      });
      return { zones, diff, size: [A.width, A.height, B.width, B.height] };
    },
    [aB64, bB64, place, opts],
  );
}

/** Décrit l'élément de l'aperçu sous le centre d'une zone (chemin de classes, du plus proche au plus large). */
async function describe(page, pageIndex, cx, cy) {
  return page.evaluate(
    ([i, cx, cy]) => {
      const pg = [...document.querySelectorAll('#stage .page:not(.ovf-clone)')][i],
        r = pg.getBoundingClientRect();
      let el = document.elementFromPoint(r.left + cx * r.width, r.top + cy * r.height);
      const parts = [];
      while (el && el !== pg && parts.length < 4) {
        const cls = typeof el.className === 'string' ? el.className : el.className && el.className.baseVal;
        parts.push(el.tagName.toLowerCase() + (cls ? '.' + cls.trim().split(/\s+/).slice(0, 2).join('.') : ''));
        el = el.parentElement;
      }
      return parts.join(' < ') || 'fond de page';
    },
    [pageIndex, cx, cy],
  );
}

/** Exporte le document ouvert, compare chaque page à l'aperçu ; renvoie la liste des écarts. `tamper` modifie l'aperçu après l'export (témoin). */
async function parity(page, info, name, tamper) {
  await addBundle(page, 'pdfexport.js');
  const file = info.outputPath(`${name}.pdf`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, await buildPdf(page));
  if (tamper) await page.evaluate(tamper);

  const pages = page.locator('#stage .page:not(.ovf-clone)');
  const n = await pages.count();
  const report = [];
  for (let i = 0; i < n; i++) {
    const key = await pages.nth(i).getAttribute('data-page');
    /* la capture couvre des pixels entiers ; la page, elle, tombe entre deux pixels : on note où elle se trouve dans la capture */
    const box = await pages.nth(i).boundingBox(),
      clip = { x: Math.floor(box.x), y: Math.floor(box.y) };
    clip.width = Math.ceil(box.x + box.width) - clip.x;
    clip.height = Math.ceil(box.y + box.height) - clip.y;
    const shot = await page.screenshot({ clip, animations: 'disabled' });
    const dims = [box.width * DSF, box.height * DSF],
      place = [(box.x - clip.x) * DSF, (box.y - clip.y) * DSF, ...dims];
    /* PDF rastérisé au double, réduit par le navigateur en le posant : lissage comparable à l'écran */
    const root = info.outputPath(`${name}-${key}-pdf`);
    execFileSync('pdftoppm', [
      '-png',
      '-f',
      String(i + 1),
      '-l',
      String(i + 1),
      '-singlefile',
      '-scale-to-x',
      String(Math.round(dims[0] * 2)),
      '-scale-to-y',
      String(Math.round(dims[1] * 2)),
      file,
      root,
    ]);
    const pdfPng = fs.readFileSync(root + '.png');
    const res = await compare(page, shot.toString('base64'), pdfPng.toString('base64'), place, { R, T, CELL, MIN, BLUR });
    await info.attach(`${name}-${key}-apercu.png`, { body: shot, contentType: 'image/png' });
    await info.attach(`${name}-${key}-pdf.png`, { body: pdfPng, contentType: 'image/png' });
    await info.attach(`${name}-${key}-ecarts.png`, { body: Buffer.from(res.diff, 'base64'), contentType: 'image/png' });
    for (const z of res.zones) {
      const mx = (v) => Math.round(((v - place[0]) / dims[0]) * 210),
        my = (v) => Math.round(((v - place[1]) / dims[1]) * 297);
      const where = await describe(page, i, (z.x + z.w / 2 - place[0]) / dims[0], (z.y + z.h / 2 - place[1]) / dims[1]);
      report.push(
        `${key} : zone de ${mx(z.x + z.w) - mx(z.x)}×${my(z.y + z.h) - my(z.y)} mm à (${mx(z.x)}, ${my(z.y)}) mm, ${z.px} px — ${where}`,
      );
    }
  }
  return report;
}

for (const name of DOCS) {
  test(`parité aperçu ↔ PDF — ${name}`, async ({ page }, info) => {
    test.skip(!hasPdftoppm, 'pdftoppm absent');
    const errors = watchErrors(page);
    await openApp(page, name);
    const report = await parity(page, info, name);
    expect(report, 'écarts entre l’aperçu et le PDF (images jointes au rapport : aperçu, PDF, écarts en rouge)').toEqual([]);
    expect(errors).toEqual([]);
  });
}

/* Témoin : la comparaison doit voir un élément absent et un décalage d'1 mm (3 px de document, 0,8 mm, passent sous le seuil). */
test('parité aperçu ↔ PDF — témoin (écarts introduits dans l’aperçu)', async ({ page }, info) => {
  test.skip(!hasPdftoppm, 'pdftoppm absent');
  await openApp(page, 'default');
  const report = await parity(page, info, 'temoin', () => {
    const pg = document.querySelector('#stage .page:not(.ovf-clone)');
    pg.querySelector('.fg-ic').style.visibility = 'hidden'; // icône du 1er chiffre clé retirée
    pg.querySelector('.sec-title').style.transform = 'translateY(4px)'; // titre de section décalé d'1 mm (limite de détection)
  });
  expect(
    report.some((l) => /^recto .*fg-ic|^recto .*fg-head/.test(l)),
    `icône retirée non vue :\n${report.join('\n')}`,
  ).toBe(true);
  expect(
    report.some((l) => /^recto .*sec-title/.test(l)),
    `titre décalé non vu :\n${report.join('\n')}`,
  ).toBe(true);
  expect(
    report.every((l) => /fg-|sec-title|sec-first/.test(l)),
    `écarts hors des éléments modifiés :\n${report.join('\n')}`,
  ).toBe(true);
});
