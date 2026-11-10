#!/usr/bin/env node
/* Vérifications rapides avant de pousser : imprime « OK » ou la liste des écarts.
   Usage : node scripts/verifier.mjs (depuis la racine du dépôt). */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const errors = [];
const read = (p) => readFileSync(p, 'utf8');
const must = (ok, msg) => ok || errors.push(msg);

// 1. Les fichiers cités dans la Structure de CLAUDE.md existent.
for (const p of [
  'index.html', 'version.json', 'CHANGELOG.md', 'design-tokens.json', 'js/shell.js', 'js/dialog.js', 'js/app-update.js',
  'css/tokens.css', 'css/shell.css', 'css/mobile.css', 'factsheet/index.html', 'donut/donut-export.html', 'europa/europa-3d.html',
  'organigramme/index.html', 'organigramme/boot.js', 'organigramme/css/organigramme.css',
  'organigramme/vendor/pdf-lib-1.17.1.min.js', 'organigramme/vendor/fontkit-1.1.1.umd.min.js',
  'organigramme/fonts/SourceSans3-Bold.ttf', 'organigramme/fonts/SourceSerif4-It.ttf', 'organigramme/fonts/SourceSerif4-SemiboldIt.ttf',
  'factsheet/icc/ISOcoated_v2_300_eci.icc',
]) must(existsSync(p), `fichier manquant : ${p}`);

// 2. version.json et la tête de CHANGELOG.md concordent.
const { version, date } = JSON.parse(read('version.json'));
const head = (read('CHANGELOG.md').match(/^## (\S+) — (\S+)/m) || []).slice(1);
must(head[0] === version && head[1] === date, `version.json (${version}, ${date}) ≠ tête de CHANGELOG.md (${head.join(', ')})`);

// 3. PEC organigramme : modules valides, tous déclarés dans boot.js, pas d’innerHTML ni de dialogue du navigateur.
const dir = 'organigramme/js';
const boot = read('organigramme/boot.js');
for (const f of readdirSync(dir).filter((f) => f.endsWith('.js'))) {
  const src = read(`${dir}/${f}`);
  must(boot.includes(`'${f}'`), `${f} absent de MODULES dans organigramme/boot.js (il serait chargé sans ?v=)`);
  must(!/\.(innerHTML|outerHTML)\b|insertAdjacentHTML/.test(src), `${dir}/${f} : innerHTML interdit (construire des nœuds DOM)`);
  must(!/\b(alert|confirm|prompt)\s*\(/.test(src.replace(/\b(alertModal|confirmModal|promptModal)\b/g, '')), `${dir}/${f} : alert/confirm/prompt du navigateur interdits`);
  for (const m of src.matchAll(/from '([^']+)'|import\('([^']+)'\)/g)) {
    const spec = m[1] || m[2];
    must(/^(org|gsc)\/[\w.-]+\.js$/.test(spec), `${dir}/${f} : import « ${spec} » hors de l’import map (org/… ou gsc/…)`);
    if (spec.startsWith('org/')) must(existsSync(`${dir}/${spec.slice(4)}`), `${dir}/${f} : module introuvable ${spec}`);
  }
  try {
    execFileSync('node', ['--input-type=module', '--check'], { input: src, stdio: ['pipe', 'pipe', 'pipe'] });
  } catch (e) {
    errors.push(`${dir}/${f} : erreur de syntaxe\n${e.stderr}`);
  }
}

// 4. Pas de version flottante sur un CDN (toujours @x.y.z).
for (const p of ['index.html', 'organigramme/index.html', 'donut/donut-export.html', 'factsheet/index.html']) {
  for (const m of read(p).matchAll(/https:\/\/(?:cdn\.jsdelivr\.net\/npm|unpkg\.com)\/((?:@[^/@"']+\/)?[^/@"']+)(@[^/"']*)?/g)) {
    must(/^@\d+\.\d+\.\d+$/.test(m[2] || ''), `${p} : version flottante pour ${m[1]}${m[2] || ''}`);
  }
}

if (errors.length) {
  console.error(errors.map((e) => '✗ ' + e).join('\n'));
  process.exit(1);
}
console.log('OK');
