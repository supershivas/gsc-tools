/* Contrôle du dictionnaire FR → EN (src/i18n.js) : échoue sur une clé en double ou une clé qui commence ou finit par une espace
   (la recherche se fait sur le texte nettoyé : une telle clé ne serait jamais trouvée). */
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Compile src/i18n.js en mémoire : { dict, warnings } (les avertissements d'esbuild signalent les clés en double). */
async function load() {
  const res = await build({ entryPoints: [path.join(root, 'src/i18n.js')], bundle: true, format: 'esm', write: false, logLevel: 'silent' });
  const mod = await import('data:text/javascript;base64,' + Buffer.from(res.outputFiles[0].text).toString('base64'));
  return { dict: mod.DICT, warnings: res.warnings };
}

/** Mots français « propres au français » : ceux des clés du dictionnaire qui n'apparaissent dans aucune traduction anglaise
    (« source », « section », « page » existent dans les deux langues et sont donc exclus). Sert aux tests Playwright. */
export async function frenchOnlyWords() {
  const { dict } = await load();
  const words = s => (s.toLowerCase().match(/[\p{L}]{3,}/gu) || []);
  const fr = new Set(), en = new Set();
  for (const d of Object.values(dict)) for (const [k, v] of Object.entries(d)) { words(k).forEach(w => fr.add(w)); words(v).forEach(w => en.add(w)); }
  return [...fr].filter(w => !en.has(w)).sort();
}

export async function checkI18n() {
  const problems = [];
  const { dict, warnings } = await load();
  /* un objet littéral avec deux fois la même clé : l'exécution garde la dernière, seul esbuild le voit */
  for (const w of warnings) {
    if (/^Duplicate key/.test(w.text)) problems.push(`${w.text} (src/i18n.js:${w.location ? w.location.line : '?'})`);
  }
  for (const [lang, d] of Object.entries(dict)) {
    for (const key of Object.keys(d)) {
      if (key !== key.trim()) problems.push(`Clé ${lang} avec une espace au début ou à la fin : ${JSON.stringify(key)}`);
    }
  }
  return problems;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const problems = await checkI18n();
  if (problems.length) { console.error('Dictionnaire de traduction invalide :\n- ' + problems.join('\n- ')); process.exit(1); }
  console.log('Dictionnaire de traduction : OK');
}
