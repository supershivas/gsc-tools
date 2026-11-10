/* Export PDF : dessine la liste de layout.js avec pdf-lib (vendor/), en CMJN pur (DeviceCMYK),
   polices incorporées en sous-ensemble, crénage appliqué, profil de sortie FOGRA39 déclaré.
   Les bibliothèques ne sont chargées qu’au premier export. */
import { COLORS, FONTS, FONT_DIR, ICC_URL, ICC_NAME } from 'org/theme.js';

const VENDOR = new URL('../vendor/', import.meta.url).href;
const loaded = new Map();
const loadScript = (file) => {
  if (!loaded.has(file)) {
    loaded.set(
      file,
      new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = VENDOR + file;
        s.onload = resolve;
        s.onerror = () => reject(new Error(file));
        document.head.append(s);
      }),
    );
  }
  return loaded.get(file);
};

const bytesCache = new Map();
const fetchBytes = (url) => {
  if (!bytesCache.has(url)) {
    bytesCache.set(
      url,
      fetch(url).then((r) => {
        if (!r.ok) throw new Error(url);
        return r.arrayBuffer();
      }),
    );
  }
  return bytesCache.get(url);
};

const dataUrlBytes = (url) => {
  const [head, body] = url.split(',');
  if (!/;base64/.test(head)) return new TextEncoder().encode(decodeURIComponent(body));
  const bin = atob(body);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};

/* Un SVG (ou tout autre format que PNG/JPEG) est converti en PNG à ~600 ppp pour sa taille imprimée. */
async function rasterize(url, wPt, hPt) {
  const img = new Image();
  img.src = url;
  await img.decode();
  const k = Math.min(600 / 72, 6000 / Math.max(wPt, hPt));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(wPt * k));
  c.height = Math.max(1, Math.round(hPt * k));
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return dataUrlBytes(c.toDataURL('image/png'));
}

export async function exportPdf(lay, doc) {
  await Promise.all([loadScript('pdf-lib-1.17.1.min.js'), loadScript('fontkit-1.1.1.umd.min.js')]);
  const L = window.PDFLib;
  const { W, H } = lay;
  const pdf = await L.PDFDocument.create();
  pdf.registerFontkit(window.fontkit);
  pdf.setTitle(doc.title || 'Organigramme');
  pdf.setCreator('GSC tools — PEC organigramme');
  pdf.setProducer('pdf-lib 1.17.1');
  const page = pdf.addPage([W, H]);
  page.node.set(L.PDFName.of('TrimBox'), pdf.context.obj([0, 0, W, H]));

  const fonts = {};
  for (const key of new Set(lay.items.filter((i) => i.t === 'text').map((i) => i.font))) {
    const embedded = await pdf.embedFont(await fetchBytes(`${FONT_DIR}${FONTS[key].file}.ttf`), { subset: true });
    fonts[key] = { embedded, fk: embedded.embedder.font, name: page.node.newFontDictionary(FONTS[key].file, embedded.ref) };
  }

  const ops = [];
  const Y = (y) => H - y; // le PDF a son origine en bas à gauche
  const fill = (c) => L.setFillingCmykColor(...COLORS[c].cmyk);
  const strokeC = (c) => L.setStrokingCmykColor(...COLORS[c].cmyk);

  for (const it of lay.items) {
    if (it.t === 'path') {
      ops.push(L.pushGraphicsState());
      if (it.fill) ops.push(fill(it.fill));
      if (it.stroke) ops.push(strokeC(it.stroke), L.setLineWidth(it.lw));
      for (const c of it.d) {
        if (c[0] === 'M') ops.push(L.moveTo(c[1], Y(c[2])));
        else if (c[0] === 'L') ops.push(L.lineTo(c[1], Y(c[2])));
        else if (c[0] === 'C') ops.push(L.appendBezierCurve(c[1], Y(c[2]), c[3], Y(c[4]), c[5], Y(c[6])));
        else ops.push(L.closePath());
      }
      ops.push(it.fill && it.stroke ? L.fillAndStroke() : it.fill ? L.fill() : L.stroke(), L.popGraphicsState());
    } else if (it.t === 'text') {
      const f = fonts[it.font];
      // Un glyphe à la fois, avec l’écart de crénage calculé par fontkit (comme le navigateur dans l’aperçu).
      const run = f.fk.layout(it.text);
      const arr = L.PDFArray.withContext(pdf.context);
      run.glyphs.forEach((g, i) => {
        arr.push(f.embedded.encodeText(String.fromCodePoint(...g.codePoints)));
        const adj = ((run.positions[i].xAdvance - g.advanceWidth) * 1000) / f.fk.unitsPerEm;
        if (Math.abs(adj) > 0.01) arr.push(L.PDFNumber.of(-adj));
      });
      ops.push(
        L.beginText(),
        fill(it.color),
        L.setFontAndSize(f.name, it.size),
        L.setCharacterSpacing((it.track || 0) * it.size),
        L.setTextMatrix(1, 0, 0, 1, it.x, Y(it.y)),
        L.PDFOperator.of(L.PDFOperatorNames.ShowTextAdjusted, [arr]),
        L.endText(),
      );
    }
  }
  page.pushOperators(...ops);

  for (const im of lay.images) {
    const url = doc.assets[im.asset];
    if (!url) continue;
    const type = (url.match(/^data:([^;,]+)/) || [])[1];
    const img =
      type === 'image/jpeg' ? await pdf.embedJpg(dataUrlBytes(url)) : type === 'image/png' ? await pdf.embedPng(dataUrlBytes(url)) : await pdf.embedPng(await rasterize(url, im.w, im.h));
    page.drawImage(img, { x: im.x, y: Y(im.y + im.h), width: im.w, height: im.h });
  }

  // Intention de sortie : indique à l’imprimeur le profil CMJN visé (FOGRA39).
  const icc = pdf.context.register(pdf.context.flateStream(new Uint8Array(await fetchBytes(ICC_URL)), { N: 4 }));
  pdf.catalog.set(
    L.PDFName.of('OutputIntents'),
    pdf.context.obj([
      {
        Type: 'OutputIntent',
        S: 'GTS_PDFX',
        OutputConditionIdentifier: L.PDFString.of('FOGRA39'),
        RegistryName: L.PDFString.of('http://www.color.org'),
        Info: L.PDFString.of(ICC_NAME),
        DestOutputProfile: icc,
      },
    ]),
  );
  return pdf.save();
}
