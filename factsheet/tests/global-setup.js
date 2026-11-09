/* Avant les tests : compile le point d'entrée (tests/entry.js → tests/entry.bundle.js, ignoré par git). */
const { build } = require('esbuild');
const path = require('path');

module.exports = async () => {
  await build({
    entryPoints: [path.join(__dirname, 'entry.js')],
    outfile: path.join(__dirname, 'entry.bundle.js'),
    bundle: true, format: 'iife', logLevel: 'warning',
  });
};
