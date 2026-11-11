#!/usr/bin/env node
/* Génère factsheet/assets/index.json : la liste des images du dépôt (GitHub Pages ne sait pas lister un dossier).
   Lancé à chaque déploiement (.github/workflows/pages.yml) ; en local : node scripts/assets-manifest.mjs */
import { readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'factsheet/assets';
const IMAGE = /\.(png|jpe?g|svg|webp|gif)$/i;

const walk = (dir, rel = '') =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (e.name.startsWith('.')) return [];
    const r = rel ? `${rel}/${e.name}` : e.name;
    return e.isDirectory() ? walk(join(dir, e.name), r) : IMAGE.test(e.name) ? [r] : [];
  });

const files = walk(ROOT).sort((a, b) => a.localeCompare(b));
writeFileSync(join(ROOT, 'index.json'), JSON.stringify({ schemaVersion: 1, files }, null, 2) + '\n');
console.log(`${ROOT}/index.json : ${files.length} image(s)`);
