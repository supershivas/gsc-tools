/* Langue de l'interface du Factsheet creator : anglais par défaut, français en option.
   Les textes du code restent en français et servent de clés : `t('Texte français')` renvoie la traduction
   quand la langue est l'anglais. Les libellés construits avec h() ne sont pas à envelopper : une passe sur le DOM
   (`initI18n`) traduit les textes, placeholders, titres et aria-label de l'interface — jamais le document (.page),
   les champs de saisie ni les zones éditables. Pour ajouter une langue : ajouter un dictionnaire dans LANGS. */

export const LANGS = { en: 'English', fr: 'Français' };
const KEY = 'factsheet-creator-lang';

let lang = 'en';
try { const v = localStorage.getItem(KEY); if (v && LANGS[v]) lang = v; } catch (e) {}
export const getLang = () => lang;

/* français → anglais */
const EN = {
  /* page */
  'Zoom': 'Zoom', 'Ajuster': 'Fit', 'Langue': 'Language',
  'Enregistrer (.json)': 'Save (.json)', 'Ouvrir…': 'Open…', 'Exporter PDF…': 'Export PDF…', 'Aperçu 3D': '3D preview',
  'Fichier de projet invalide.': 'Invalid project file.', 'Image illisible.': 'Unreadable image.',
  'Recto': 'Front', 'Verso': 'Back', 'recto': 'front', 'verso': 'back',
  'Exporter en PDF': 'Export to PDF', 'Annuler': 'Cancel', 'Exporter': 'Export', 'Terminer': 'Done',
  'Le navigateur ouvre sa fenêtre d’impression : choisissez': 'The browser opens its print window: choose',
  'Enregistrer au format PDF': 'Save as PDF', 'comme destination,': 'as destination,', 'Marges : aucune': 'Margins: none',
  ', et cochez': ', and tick', 'Graphiques d’arrière-plan': 'Background graphics',
  '. Le PDF contient 2 pages (recto, verso) en vectoriel avec polices incorporées.': '. The PDF has 2 pages (front, back), vector, with embedded fonts.',
  'A4 net — 210 × 297 mm': 'A4 trimmed — 210 × 297 mm', 'Sans fond perdu ni repères.': 'No bleed or marks.',
  'Fond perdu 3 mm — 216 × 303 mm': '3 mm bleed — 216 × 303 mm', 'Les fonds colorés débordent de 3 mm sur les 4 côtés.': 'Coloured backgrounds extend 3 mm past all four edges.',
  'Fond perdu 3 mm + traits de coupe — 228 × 315 mm': '3 mm bleed + crop marks — 228 × 315 mm', 'Pour l’imprimeur : fond perdu et repères de coupe (feuille de 228 × 315 mm).': 'For the printer: bleed and crop marks (228 × 315 mm sheet).',
  'Espace de stockage du navigateur plein : les dernières modifications ne sont pas enregistrées. Enregistrez le projet (.json) et allégez les images.': 'Browser storage is full: the latest changes are not saved. Save the project (.json) and use lighter images.',
  /* panneau document */
  'Document': 'Document', 'document': 'document', 'Nom du fichier': 'File name', 'Thème': 'Theme', 'Bleu UE': 'EU blue', 'Format des nombres': 'Number format',
  'Palette du thème': 'Theme palette', 'Sélectionnez un élément dans la structure (à gauche) ou sur la page pour modifier ses propriétés.': 'Select an element in the structure (left) or on the page to edit its properties.',
  'Bleu': 'Blue', 'Bleu profond': 'Deep blue', 'Bleu ciel': 'Sky blue', 'Lavande': 'Lavender', 'Jaune': 'Yellow', 'Ardoise': 'Slate', 'Acier': 'Steel', 'Blanc': 'White',
  'Teinte ciel': 'Sky tint', 'Teinte lavande': 'Lavender tint', 'Teinte jaune': 'Yellow tint', 'Teinte grise': 'Grey tint',
  /* header */
  'Surtitre': 'Overline', 'Titre (taille fixe)': 'Title (fixed size)', 'Sous-titre (optionnel — vide = masqué)': 'Subtitle (optional — empty = hidden)',
  'Couleur de fond': 'Background colour', 'Couleur du texte': 'Text colour', 'Afficher l’image': 'Show image', 'Afficher le logo': 'Show logo',
  'Logo': 'Logo', 'Version du logo': 'Logo version', 'Les 4 versions ont la même taille (138 × 42 px). PNG transparent ou SVG.': 'The 4 versions share the same size (138 × 42 px). Transparent PNG or SVG.',
  'Défaut': 'Default', 'Mono': 'Mono', 'Blanc (white)': 'White', 'Négatif': 'Negative', 'importé': 'uploaded', 'vide': 'empty',
  'Images du header': 'Header images', 'Image affichée (96 × 132 px) — choisissez dans la bibliothèque :': 'Image shown (96 × 132 px) — pick one from the library:',
  'Ajouter une image': 'Add an image', 'Renommer': 'Rename', 'Nom de l’image :': 'Image name:', 'Supprimer cette image ?': 'Delete this image?',
  'Image du header': 'Header image', 'Image': 'Image', 'Remplacer…': 'Replace…', 'Importer…': 'Import…', 'Retirer': 'Remove', 'Aucun': 'None', 'Pas d’image': 'No image',
  /* section / sous-section / colonne */
  'Section': 'Section', 'Titre de section': 'Section title', 'Fond de la section': 'Section background', 'Page': 'Page',
  '↑ Monter': '↑ Move up', '↓ Descendre': '↓ Move down', 'Supprimer': 'Delete', 'Supprimer cette section ?': 'Delete this section?',
  'Sous-section': 'Subsection', 'Titre de sous-section': 'Subsection title', 'Titre de sous-section (vide = masqué)': 'Subsection title (empty = hidden)', 'Colonnes': 'Columns', 'Dupliquer': 'Duplicate', 'Supprimer cette sous-section ?': 'Delete this subsection?',
  '1 colonne': '1 column', '2 colonnes': '2 columns', '3 colonnes': '3 columns', '2 colonnes (2/3 + 1/3)': '2 columns (2/3 + 1/3)', '2 colonnes (1/3 + 2/3)': '2 columns (1/3 + 2/3)',
  'Contenu': 'Content', 'Texte': 'Text', 'Dataviz': 'Dataviz', 'Image (recadrée au format choisi)': 'Image (cropped to the chosen ratio)', 'Format': 'Ratio', 'Légende (optionnelle)': 'Caption (optional)',
  'Ouvrir l’éditeur de dataviz': 'Open the dataviz editor', 'Type de dataviz': 'Dataviz type', 'Élément introuvable': 'Element not found',
  'Votre texte ici. Une ligne = un paragraphe, **gras** avec les astérisques.': 'Your text here. One line = one paragraph, **bold** with asterisks.',
  /* structure */
  'Header': 'Header', 'Aucune section — glissez-en une ici.': 'No sections — drag one here.', '+ sous-section': '+ subsection', '+ section': '+ section',
  'Section sans titre': 'Untitled section', 'Texte vide': 'Empty text', 'Glisser pour réordonner ou changer de page': 'Drag to reorder or change page',
  /* survol */
  'Éditer': 'Edit', 'Afficher les propriétés': 'Show properties', 'Colonne': 'Column', 'Dataviz…': 'Dataviz…', 'Monter': 'Move up', 'Descendre': 'Move down', 'Sans fond': 'No background',
  /* éditeur de texte et de tableaux */
  'Gras': 'Bold', 'Italique': 'Italic', 'Souligné': 'Underline', 'Liste à puces': 'Bullet list',
  '+ Ajouter': '+ Add', '+ Série': '+ Series', 'Libellé': 'Label', '+ Ligne': '+ Row', 'Série': 'Series', 'Coller un tableau': 'Paste a table', 'Remplacer les données': 'Replace data',
  'Collez un tableau depuis Excel ou un CSV : libellé ⇥ série 1 ⇥ série 2…  (la 1re ligne peut contenir les noms de séries)': 'Paste a table from Excel or a CSV: label ⇥ series 1 ⇥ series 2…  (the first row may hold the series names)',
  /* éditeur de dataviz */
  'Éditeur de dataviz': 'Dataviz editor', 'Aperçu à la largeur': 'Preview at width', 'Pleine largeur': 'Full width',
  'Cliquer un segment ou un libellé pour le sélectionner · glisser l’anneau pour le tourner · glisser un libellé (verticalement, ou de l’autre côté) · glisser le point blanc pour déplacer l’ancrage du trait': 'Click a segment or a label to select it · drag the ring to rotate it · drag a label (vertically, or to the other side) · drag the white dot to move the leader line anchor',
  'Les modifications du formulaire s’appliquent en direct.': 'Changes made in the form apply live.',
  /* types de dataviz */
  'Barres (jumelées, groupées, empilées)': 'Bars (overlapping, grouped, stacked)', 'Plusieurs séries': 'Multiple series', 'Jumelées (2 séries qui se chevauchent)': 'Overlapping (2 series overlap)',
  'Côte à côte': 'Side by side', 'Empilées': 'Stacked', 'Format du graphique': 'Chart ratio', '2:1 (large)': '2:1 (wide)', '1:1 (carré)': '1:1 (square)',
  'Afficher la légende': 'Show legend', 'Afficher les valeurs': 'Show values', 'Afficher les valeurs (empilées : total)': 'Show values (stacked: total)', 'Décimales des valeurs': 'Value decimals',
  'Unité après la valeur (%, M€…)': 'Unit after the value (%, M€…)', 'Afficher l’accolade « évolution »': 'Show the “change” bracket', 'Valeur de l’accolade (ex. +64 %)': 'Bracket value (e.g. +64 %)',
  'Texte de l’accolade': 'Bracket text', 'Données': 'Data',
  'Anneau / camembert': 'Donut / pie', 'Forme': 'Shape', 'Anneau (total au centre)': 'Donut (total in the centre)', 'Camembert': 'Pie',
  'Texte du centre ({total} = somme des valeurs)': 'Centre text ({total} = sum of the values)', 'Décimales du total': 'Total decimals', 'Libellés': 'Labels',
  'Auto (selon la largeur)': 'Auto (depends on the width)', 'Autour de l’anneau': 'Around the ring', 'Légende sous l’anneau': 'Legend below the ring', 'Orientation de l’anneau': 'Ring orientation',
  'Plus grand segment à un angle donné': 'Largest segment at a given angle', '1er segment en haut': '1st segment at the top', 'Manuelle (glisser l’anneau dans l’éditeur)': 'Manual (drag the ring in the editor)',
  'Angle du plus grand segment (° — 0 = haut, 210 = bas gauche)': 'Largest segment angle (° — 0 = top, 210 = bottom left)', 'Angle de départ du 1er segment (° — mode manuel)': 'Start angle of the 1st segment (° — manual mode)',
  'Segments (sens horaire)': 'Segments (clockwise)', 'Couleur': 'Colour', 'Valeur': 'Value', 'Titre (gras)': 'Title (bold)', 'Côté du libellé': 'Label side', 'Auto': 'Auto', 'Gauche': 'Left', 'Droite': 'Right',
  '↺ Positions auto': '↺ Auto positions', 'Efface les positions manuelles des libellés, points d’ancrage et côtés': 'Clears the manual positions of labels, anchor points and sides',
  'Plus grand en premier': 'Largest first', 'Fait tourner la liste pour que le plus grand segment soit le 1er': 'Rotates the list so the largest segment comes first',
  'Titre': 'Title', 'Chiffre clé': 'Key figure', 'Chiffre (texte libre : « 5 000 », « 64 % »…)': 'Figure (free text: “5,000”, “64 %”…)',
  'Barres horizontales': 'Horizontal bars', 'Premier critère': 'First criterion', 'Deuxième critère': 'Second criterion', 'Troisième critère': 'Third criterion', 'Quatrième critère': 'Fourth criterion',
  'Courbes': 'Lines', 'Axe vertical démarrant à zéro': 'Vertical axis starts at zero', 'Liste à icônes': 'Icon list', 'Éléments': 'Items', 'Icône': 'Icon', 'Nouvel élément': 'New item', 'Premier élément de liste': 'First list item', 'Deuxième élément de liste': 'Second list item', 'Troisième élément de liste': 'Third list item',
  'Validé': 'Checked', 'Monde': 'World', 'Personnes': 'People', 'Euro': 'Euro', 'Graphique': 'Chart', 'Sécurité': 'Security', 'Environnement': 'Environment', 'Énergie': 'Energy',
  'Logement': 'Housing', 'Protection': 'Protection', 'Objectif': 'Goal', 'Calendrier': 'Calendar', 'Recherche': 'Search', 'Courrier': 'Mail', 'Étoile': 'Star', 'Réglages': 'Settings', 'Envoi': 'Send', 'Rédaction': 'Writing',
  /* menus, réglages, déplacements, alignements */
  'Fichier': 'File', 'Affichage': 'View', 'Réglages': 'Settings', 'Version': 'Version', 'Dernières versions': 'Latest versions', 'Exporter mes données (JSON)': 'Export my data (JSON)',
  'Atelier du Factsheet creator': 'Factsheet creator Atelier', 'Cette app est prévue pour un écran d’ordinateur': 'This app is designed for a computer screen', 'Fermer le bandeau': 'Close the banner',
  'Alignement vertical dans la colonne': 'Vertical alignment in the column', 'Alignement du texte': 'Text alignment', 'Haut': 'Top', 'Centre': 'Middle', 'Bas': 'Bottom', 'Centré': 'Centred', 'Justifié': 'Justified',
  'Échanger le contenu avec…': 'Swap content with…', 'Déplacer vers la section': 'Move to section', 'Annuler le déplacement': 'Undo move',
  'Contenu déplacé. Vérifiez le remplissage des pages.': 'Content moved. Check how full the pages are.',
  'Glisser la sous-section (autre section possible)': 'Drag the subsection (other sections allowed)', 'Glisser le contenu sur une autre colonne pour l’échanger': 'Drag the content onto another column to swap them',
  /* atelier */
  'Connexion à GitHub': 'GitHub connection', 'Retirer le jeton': 'Remove the token', 'Enregistrer et tester': 'Save and test',
  'Connecté : vous pouvez publier.': 'Connected: you can publish.', 'Jeton invalide ou expiré.': 'Invalid or expired token.', 'Accès refusé à ce dépôt.': 'Access to this repository denied.',
  'Ce jeton ne peut pas écrire dans le dépôt (permission « Contents : lecture et écriture » requise).': 'This token cannot write to the repository (“Contents: read and write” permission required).',
  'accès limité au dépôt': 'access limited to the repository', 'permission': 'permission',
  'À publier': 'To publish', 'Toutes les images du document sont publiées.': 'All the document images are published.', 'Publier': 'Publish', 'image(s)': 'image(s)', 'Rien à publier': 'Nothing to publish',
  'Images publiées': 'Published images', 'Aucune image publiée.': 'No published images.', 'Projets': 'Projects', 'Nom du projet': 'Project name', 'Publier le projet en cours': 'Publish the current project',
  'Aucun projet publié.': 'No published projects.', 'Ouvrir dans l’éditeur': 'Open in the editor', 'Publication…': 'Publishing…', 'Publié': 'Published', 'Projet publié': 'Project published',
  'Déploiement du site en cours…': 'Site deployment in progress…', 'Échec': 'Failed', 'Image supprimée': 'Image deleted', 'Projet supprimé': 'Project deleted', 'Supprimer ce projet ?': 'Delete this project?',
  'Remplacer le projet en cours dans ce navigateur ?': 'Replace the current project in this browser?', 'Des images ne sont pas encore publiées.': 'Some images are not published yet.',
  'Cette image est utilisée par le document en cours. La supprimer quand même ?': 'This image is used by the current document. Delete it anyway?',
  'Fichiers publiés, mais le site n’est pas encore à jour. Réessayez dans une minute pour finaliser.': 'Files published, but the site is not up to date yet. Try again in a minute to finish.',
  'Limite de requêtes GitHub atteinte : ajoutez un jeton.': 'GitHub request limit reached: add a token.', 'Impossible de lire le dépôt.': 'Could not read the repository.',
  'Le jeton reste dans ce navigateur, il n’est jamais exporté.': 'The token stays in this browser and is never exported.',
  'Créer un jeton :': 'Create a token:', 'Dépôt :': 'Repository:',
  /* aperçu 3D */
  'Aperçu 3D du document': '3D document preview', 'Fermer': 'Close', 'Recto / verso': 'Front / back', 'Retourner': 'Flip', 'Deux pages': 'Both pages', 'Une feuille': 'One sheet', 'Recentrer': 'Reset view',
  'Clic gauche : tourner · clic droit : déplacer · molette : zoomer': 'Left click: orbit · right click: pan · wheel: zoom', 'Préparation de l’aperçu…': 'Preparing the preview…',
  'Impossible de générer l’aperçu 3D dans ce navigateur.': 'The 3D preview could not be generated in this browser.', 'WebGL indisponible.': 'WebGL unavailable.',
};
const DICT = { en: EN };

/* Motifs à valeurs variables */
const PATTERNS = [
  [/^(Recto|Verso) : le contenu dépasse de (\d+) px — déplacez une section vers l’autre page ou raccourcissez-la\.$/, (_, p, n) => `${p === 'Recto' ? 'Front' : 'Back'}: content overflows by ${n} px — move a section to the other page or shorten it.`],
  [/^Header : titre trop long, il ne tient pas dans la hauteur du header\.$/, () => 'Header: title too long, it does not fit in the header height.'],
  [/^Colonne (\d+)$/, (_, n) => `Column ${n}`],
  [/^Colonne actuelle \((\d+) px\)$/, (_, n) => `Current column (${n} px)`],
  [/^Série (\d+)$/, (_, n) => `Series ${n}`],
  [/^Dataviz · (.+)$/, (_, x) => `Dataviz · ${tr(x)}`],
  [/^(\d+) images? à publier — ouvrir l’Atelier$/, (_, n) => `${n} image${n === '1' ? '' : 's'} to publish — open the Atelier`],
  [/^Dépôt : (\S+) \(branche main\)\. Le jeton reste dans ce navigateur, il n’est jamais exporté\.$/, (_, r) => `Repository: ${r} (main branch). The token stays in this browser and is never exported.`],
  [/^Header — (.+)$/, (_, x) => `Header — ${x}`],
  [/^Logo — (.+)$/, (_, x) => `Logo — ${tr(x)}`],
  [/^Supprime /, s => s],
  [/^Image · (.+)$/, (_, x) => `Image · ${x}`],
];

function tr(s) {
  if (lang === 'fr') return s;
  const d = DICT[lang]; if (!d) return s;
  const core = s.trim(); if (!core) return s;
  let out = d[core];
  if (out == null) for (const [re, fn] of PATTERNS) { const m = core.match(re); if (m) { out = fn(...m); break; } }
  if (out == null) return s;
  return s.slice(0, s.indexOf(core)) + out + s.slice(s.indexOf(core) + core.length);
}
/** Traduit un texte français (pour alert, confirm, valeurs créées dans le document…). */
export const t = s => tr(s);

/* ---------- Passe DOM ---------- */
const ATTRS = ['placeholder', 'title', 'aria-label'];
const SKIP = '.page, [contenteditable], textarea, input, script, style, .no-i18n';
const seen = new WeakMap();   // nœud ou élément → { src, out } (texte français d'origine et dernière valeur posée)

function fixValue(rec, cur) { return rec && rec.out === cur ? rec.src : cur; }
function fixText(n) {
  const el = n.parentElement; if (!el || el.closest(SKIP)) return;
  const src = fixValue(seen.get(n), n.nodeValue), out = lang === 'fr' ? src : tr(src);
  seen.set(n, { src, out }); if (out !== n.nodeValue) n.nodeValue = out;
}
function fixAttrs(el) {
  if (el.closest(SKIP) && el.tagName !== 'TEXTAREA' && el.tagName !== 'INPUT') return;
  if (el.closest('.page, [contenteditable]')) return;
  let recs = seen.get(el); if (!recs) seen.set(el, recs = {});
  for (const a of ATTRS) {
    if (!el.hasAttribute(a)) continue;
    const src = fixValue(recs[a], el.getAttribute(a)), out = lang === 'fr' ? src : tr(src);
    recs[a] = { src, out }; if (out !== el.getAttribute(a)) el.setAttribute(a, out);
  }
}
function walk(root) {
  if (root.nodeType === 3) return fixText(root);
  if (root.nodeType !== 1 || (root.closest && root.closest('.page, [contenteditable]') && !root.matches('.page'))) return;
  if (root.matches && root.matches('.page, [contenteditable], script, style')) return;
  fixAttrs(root);
  for (const c of root.childNodes) walk(c);
}

let observer = null, pending = new Set(), queued = false;
function flush() {
  queued = false;
  const batch = pending; pending = new Set();
  observer.disconnect();
  for (const n of batch) if (n.isConnected) walk(n);
  observe();
}
function observe() { observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS }); }

export function initI18n(onChange) {
  document.documentElement.lang = lang;
  walk(document.body);
  observer = new MutationObserver(list => {
    for (const m of list) {
      if (m.type === 'childList') m.addedNodes.forEach(n => pending.add(n));
      else pending.add(m.type === 'attributes' ? m.target : m.target);
    }
    if (!queued) { queued = true; queueMicrotask(flush); }
  });
  observe();
  return {
    set(l) {
      if (!LANGS[l] || l === lang) return;
      lang = l; try { localStorage.setItem(KEY, l); } catch (e) {}
      document.documentElement.lang = l;
      observer.disconnect(); walk(document.body); observe();
      if (onChange) onChange(l);
    },
  };
}
