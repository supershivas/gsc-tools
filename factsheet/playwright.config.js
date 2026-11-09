const { defineConfig, devices } = require('@playwright/test');

const PORT = Number(process.env.PORT || 4173);

module.exports = defineConfig({
  testDir: './tests',
  testMatch: '*.spec.js',
  globalSetup: './tests/global-setup.js',
  timeout: 120_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  /* Captures de référence : générées sous Linux (comme en CI), une par page de l'aperçu.
     Tolérance : au plus 0,5 % de pixels différents (maxDiffPixelRatio) et 0,2 d'écart de couleur par pixel (threshold, échelle 0-1 de Playwright) —
     assez pour absorber le crénelage du texte d'une version de Chromium à l'autre, trop peu pour laisser passer un décalage, un fond ou un texte qui change. */
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.005, threshold: 0.2, animations: 'disabled' } },
  snapshotPathTemplate: '{testDir}/references/{arg}-{platform}{ext}',
  use: {
    ...devices['Desktop Chrome'],
    viewport: { width: 1600, height: 1000 },
    deviceScaleFactor: 2,   // pages de 461 px de large dans l’aperçu : capture à 2x pour que la comparaison voie le texte
    locale: 'en-GB',
    timezoneId: 'UTC',
    colorScheme: 'light',
    reducedMotion: 'reduce',
    actionTimeout: 10_000,
    baseURL: `http://127.0.0.1:${PORT}`,
  },
  webServer: {
    command: `node tests/server.js ${PORT}`,
    url: `http://127.0.0.1:${PORT}/factsheet/index.html`,
    reuseExistingServer: !process.env.CI,
    timeout: 15_000,
  },
});
