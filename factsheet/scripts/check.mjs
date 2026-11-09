/* `npm run check` — filet de sécurité avant un push :
   1. dictionnaire de traduction valide (clés uniques, sans espace en bordure) ;
   2. compilation de tous les bundles, sans aucun avertissement d'esbuild (il n'a pas d'option pour cela : on lit sa sortie) ;
   3. bundles identiques à ceux du dépôt (`git diff --exit-code`) : un bundle oublié ou compilé à la main est refusé. */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { checkI18n } from './check-i18n.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BUNDLES = ['app.js', 'viewer3d.js', 'atelier.js', 'labo.js', 'pdfexport.js'];
const fail = msg => { console.error(`\n✗ ${msg}`); process.exit(1); };

console.log('1/3 Traductions');
const problems = await checkI18n();
if (problems.length) fail('Dictionnaire de traduction invalide :\n- ' + problems.join('\n- '));
console.log('  OK');

console.log('2/3 Compilation');
const run = spawnSync('npm', ['run', 'build'], { cwd: root, encoding: 'utf8', env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' }, shell: process.platform === 'win32' });
const out = (run.stdout || '') + (run.stderr || '');
process.stdout.write(out);
if (run.status !== 0) fail('npm run build a échoué.');
if (/\[WARNING\]|▲/.test(out)) fail('esbuild a émis un avertissement (voir ci-dessus) : corrigez-le, il ne doit pas y en avoir.');
console.log('  OK');

console.log('3/3 Bundles à jour');
const diff = spawnSync('git', ['diff', '--exit-code', '--stat', '--', ...BUNDLES], { cwd: root, encoding: 'utf8' });
if (diff.status !== 0) fail(`Un bundle compilé diffère de celui du dépôt :\n${diff.stdout}\nLancez « npm run build » et commitez ${BUNDLES.join(', ')}.`);
console.log('  OK\n\n✓ npm run check : tout est en ordre');
