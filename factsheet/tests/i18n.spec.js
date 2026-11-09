const { test, expect } = require('@playwright/test');
const { openApp, stubExternal, seed } = require('./helpers');

let FR_ONLY = [];
test.beforeAll(async () => { FR_ONLY = await (await import('../scripts/check-i18n.mjs')).frenchOnlyWords(); });

/* Interface en anglais : repère les textes visibles de l'interface (hors .page, zones de saisie et .no-i18n) qui contiennent encore du français.
   Chaque panneau et chaque fenêtre principale est ouvert, puis la page est lue. Un texte français est soit une traduction manquante
   (à ajouter dans src/i18n.js), soit — très rarement — un faux positif (à ajouter à ALLOWED ci-dessous, avec la raison). */

const ALLOWED = [
  'Français',   // nom de la langue dans le sélecteur de langue : toujours écrit dans sa propre langue
];

/* Mots qui sont aussi de l'anglais (ou des noms propres) mais qui ne figurent que dans des clés françaises du dictionnaire :
   « main » (branche main, Outil main), « sans » (famille de police Sans), « par » (début de « paragraph » tronqué dans la structure). */
const ENGLISH_TOO = ['main', 'sans', 'par'];

/* Lu dans la page : textes et attributs (title, placeholder, aria-label) visibles qui ont l'air français.
   Un texte est français s'il a une lettre accentuée, un mot français courant, ou un mot « propre au français » :
   les mots des clés du dictionnaire (src/i18n.js) qui n'apparaissent dans aucune traduction anglaise (scripts/check-i18n.mjs). */
function scan({ frOnly, englishToo }) {
  const SKIP = '.page, [contenteditable], script, style, .no-i18n, .changelog';   // .changelog : lignes de CHANGELOG.md, en français par convention
  const ACCENT = /[àâçéèêëîïôùûüœÀÂÇÉÈÊËÎÏÔÙÛÜŒ]/;
  const COMMON = /\b(le|la|les|des|du|une|et|ou|pour|avec|dans|sur|votre|vos|cette|ces)\b/;
  const FR = new Set(frOnly.filter(w => !englishToo.includes(w)));
  const out = [];
  const visible = el => !el.closest('[hidden]') && el.checkVisibility({ visibilityProperty: true, checkOpacity: false, contentVisibilityAuto: true });
  const check = (txt, where) => {
    const s = txt.replace(/\s+/g, ' ').trim(); if (!s) return;
    const low = s.toLowerCase();
    if (ACCENT.test(s) || COMMON.test(low) || (low.match(/[\p{L}]{3,}/gu) || []).some(w => FR.has(w))) out.push(`${s}  ⟵ ${where}`);
  };
  const walk = el => {
    if (el.nodeType !== 1 || el.matches(SKIP) || el.closest(SKIP)) return;
    if (!visible(el)) return;
    const where = el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.split(/\s+/)[0] : '');
    for (const a of ['title', 'placeholder', 'aria-label']) if (el.hasAttribute(a)) check(el.getAttribute(a), `${where}[${a}]`);
    for (const n of el.childNodes) { if (n.nodeType === 3) check(n.nodeValue, where); else walk(n); }
  };
  walk(document.body);
  return out;
}

function collector(page, frOnly) {
  const found = new Map();
  return {
    found,
    async scan(label) {
      for (const line of await page.evaluate(scan, { frOnly, englishToo: ENGLISH_TOO })) {
        const [txt] = line.split('  ⟵ ');
        if (ALLOWED.includes(txt) || found.has(line)) continue;
        found.set(line, label);
      }
    },
    report() { return [...found].map(([line, label]) => `[${label}] ${line}`); },
  };
}

/** Déplie une à une les cartes repliées d'un panneau (accordéon : une seule ouverte à la fois) et lit la page après chaque ouverture. */
async function eachCard(page, c, scope, label) {
  const n = await page.locator(`${scope} .pp-chev`).count();
  for (let i = 0; i < n; i++) {
    const chev = page.locator(`${scope} .pp-chev`).nth(i);
    if (!(await chev.count())) break;
    if ((await chev.getAttribute('aria-expanded')) === 'false') { await chev.click(); await page.waitForTimeout(40); }
    await c.scan(`${label} › carte ${i + 1}`);
  }
}

test.describe('interface en anglais : aucun texte français', () => {
  test.describe.configure({ mode: 'serial' });
  let page, c;
  test.beforeAll(async ({ browser }, info) => {
    const ctx = await browser.newContext({ baseURL: info.project.use.baseURL, viewport: { width: 1600, height: 1000 } });
    page = await ctx.newPage(); c = collector(page, FR_ONLY);
    await openApp(page, 'ui', { lang: 'en' });
  });
  test.afterAll(async () => { await page.context().close(); });

  test('barre, menus, réglages, historique', async () => {
    await c.scan('départ (rien de sélectionné)');
    await eachCard(page, c, '#props', 'Document');
    const menus = page.locator('#app-header .menu-btn');
    for (let i = 0; i < await menus.count(); i++) {
      await menus.nth(i).click(); await c.scan(`menu ${await menus.nth(i).innerText()}`); await page.keyboard.press('Escape');
    }
    await page.locator('#app-header button[aria-label="Settings"]').click();
    await page.waitForTimeout(150); await c.scan('réglages'); await page.keyboard.press('Escape');
    await page.locator('#app-header button[aria-label="Edit history"]').click();
    await page.waitForTimeout(150); await c.scan('historique'); await page.locator('#app-header button[aria-label="Edit history"]').click();
    await c.scan('barre d’aperçu');
  });

  test('structure et propriétés : header, section, sous-section, chaque colonne', async () => {
    for (const sel of ['.head-row', '.sec-row', '.sub-row']) {
      await page.locator(`#tree ${sel}`).first().click(); await c.scan(sel);
      await eachCard(page, c, '#props', sel);
    }
    const n = await page.locator('#tree .col-row').count();
    for (let i = 0; i < n; i++) {
      await page.locator('#tree .col-row').nth(i).click();
      const label = `colonne ${i + 1} (${(await page.locator('#props .pr-pill').first().innerText()).trim()})`;
      await c.scan(label); await eachCard(page, c, '#props', label);
    }
  });

  test('éditeur de texte riche : styles et options avancées', async () => {
    await page.locator('#tree .col-row').nth(1).click();
    const first = page.locator('#props .pp-chev').first();   // carte « Contenu » : l'accordéon la garde repliée après la visite précédente
    if ((await first.getAttribute('aria-expanded')) === 'false') await first.click();
    const re = sel => page.locator(`#props .re-wrap ${sel}`).first();
    await re('.re-gbtn').click(); await c.scan('styles de paragraphe'); await re('.re-gbtn').click();
    await re('.re-burger').click(); await c.scan('options avancées du texte'); await re('.re-burger').click();
    await re('[title="More formatting"]').click(); await c.scan('plus de mise en forme');
    await re('[title="Text colour"]').click(); await c.scan('couleur du texte');
    await page.keyboard.press('Escape');
  });

  test('fenêtres : export, couleurs, médias, éditeur de dataviz', async () => {
    const menu = async (n, item) => { await page.locator('#app-header .menu-btn').nth(n).click(); await page.locator('.menu-pop:not([hidden]) [role=menuitem]', { hasText: item }).first().click(); await page.waitForTimeout(250); };
    await menu(0, 'Export PDF'); await expect(page.locator('#exportDlg')).toBeVisible(); await c.scan('fenêtre d’export');
    await page.locator('#exportCancel').click();
    await menu(1, 'Document colours'); await expect(page.locator('.pal2-wrap')).toBeVisible(); await c.scan('couleurs du document');
    await page.locator('.pal2-sw').first().click(); await page.waitForTimeout(200); await c.scan('sélecteur de couleur');
    await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
    await menu(1, 'Imported media'); await expect(page.locator('.media-dlg[open]')).toBeVisible(); await c.scan('médias importés'); await page.keyboard.press('Escape');
    // éditeur de dataviz : onglets Visualisation puis Données
    await page.locator('#tree .col-row', { hasText: /Dataviz|Donut|Ring/i }).first().click();
    const open = page.locator('#props button.primary').first();
    if (!(await open.count())) { const chev = page.locator('#props .pp-chev').first(); if ((await chev.getAttribute('aria-expanded')) === 'false') await chev.click(); }
    await open.click(); await expect(page.locator('.ve-bar')).toBeVisible(); await page.waitForTimeout(400);
    await c.scan('éditeur de dataviz');
    const tabs = page.locator('.ve-tab');
    expect(await tabs.count(), 'onglets de l’éditeur de dataviz').toBe(2);
    for (let i = 0; i < 2; i++) { await tabs.nth(i).click(); await page.waitForTimeout(250); await c.scan(`éditeur de dataviz › onglet ${i + 1}`); await eachCard(page, c, '.ve-body', `éditeur de dataviz › onglet ${i + 1}`); }
    await page.locator('.ve-br button', { hasText: 'Cancel' }).first().click();
  });

  test('bilan', async () => {
    expect(c.report(), 'textes encore en français dans l’interface anglaise (à ajouter dans src/i18n.js)').toEqual([]);
  });
});

for (const file of ['atelier.html', 'labo.html']) {
  test(`interface en anglais — ${file}`, async ({ page }) => {
    await stubExternal(page); await seed(page, 'default', { lang: 'en' });
    await page.goto(`/factsheet/${file}`); await page.waitForLoadState('networkidle'); await page.waitForTimeout(600);
    const c = collector(page, FR_ONLY); await c.scan(file);
    expect(c.report()).toEqual([]);
  });
}
