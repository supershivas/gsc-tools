const path = require('path');

const DOC_KEY = 'factsheet-creator-v1';
const LANG_KEY = 'factsheet-creator-lang';

/** Réseau coupé pour les ressources externes (Google Fonts, jsDelivr) : rendu identique partout, aucune erreur de chargement. */
async function stubExternal(page) {
  await page.route(
    (url) => !/^(http:\/\/127\.0\.0\.1|data:|blob:|about:)/.test(url.href),
    (route) => {
      const u = route.request().url();
      route.fulfill({ status: 200, contentType: /\.css|css2/.test(u) ? 'text/css' : 'application/octet-stream', body: '' });
    },
  );
}

/** Erreurs de console et de page, à vérifier en fin de test. */
function watchErrors(page) {
  const errors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`);
  });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  return errors;
}

/** Fabrique un document dans la page (modules de l'app) et le range dans le localStorage ; `build` est le nom d'un document de tests/docs.js. */
async function seed(page, build, { lang = 'en' } = {}) {
  await page.goto('/factsheet/tests/blank.html');
  await page.evaluate(
    ([key, langKey, name, lang]) => {
      const doc = typeof name === 'string' ? window.FSTEST.docs[name]() : null;
      localStorage.clear();
      if (doc) localStorage.setItem(key, JSON.stringify(doc));
      localStorage.setItem(langKey, lang);
    },
    [DOC_KEY, LANG_KEY, build, lang],
  );
}

/** Ouvre le Factsheet creator sur un document de référence. */
async function openApp(page, name, opts = {}) {
  await stubExternal(page);
  await seed(page, name, opts);
  await page.goto('/factsheet/index.html');
  await page.waitForSelector('#stage .page');
  await page.evaluate(() => document.fonts.ready);
  await settle(page);
}

/** Attend que le rendu soit stable (deux mesures identiques de la taille des pages). */
async function settle(page) {
  let last = '';
  for (let i = 0; i < 20; i++) {
    const now = await page.evaluate(() =>
      [...document.querySelectorAll('#stage .page')]
        .map((p) => {
          const r = p.getBoundingClientRect();
          return `${r.width}x${r.height}`;
        })
        .join(),
    );
    if (now === last) break;
    last = now;
    await page.waitForTimeout(150);
  }
}

/** Ajoute un script de l'app (bundle chargé à la demande) à la page. */
async function addBundle(page, file) {
  await page.addScriptTag({ url: `/factsheet/${file}` });
}

module.exports = { DOC_KEY, LANG_KEY, stubExternal, watchErrors, seed, openApp, settle, addBundle, root: path.resolve(__dirname, '..') };
