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
  'Couleurs': 'Colours', 'Cadre': 'Frame', 'Fond du cadre': 'Frame background', 'Fond': 'Background', 'Fond et contour': 'Background and outline', 'Disposition': 'Layout', 'Replier': 'Collapse', 'Déplier': 'Expand', 'Modifier, renommer ou ajouter des couleurs': 'Edit, rename or add colours', 'Nom de la couleur': 'Colour name', 'Couleurs du document': 'Document colours', 'Chaque choix de couleur du document propose aussi « + » pour modifier, renommer ou ajouter une couleur.': 'Every colour choice in the document also offers “+” to edit, rename or add a colour.', 'Type de contenu': 'Content type', 'Espacement': 'Spacing', 'Marges et espaces': 'Margins and spacing', 'Serré — 75 %': 'Tight — 75 %', 'Actuel — 100 %': 'Current — 100 %', 'Large — 125 %': 'Wide — 125 %', 'Ajouter une colonne': 'Add a column', 'Nouvelle section': 'New section', 'Nouvelle sous-section': 'New subsection', 'Gris clair': 'Light grey', 'Marges de page': 'Page margins', 'Entre sections': 'Between sections', 'Entre sous-sections': 'Between subsections', 'Entre colonnes': 'Between columns', 'Annuler l’action': 'Undo', 'Ton léger (20 %)': 'Light tone (20 %)', 'Édition': 'Edit', 'Rétablir': 'Redo', 'Couleurs du document…': 'Document colours…', 'Format des nombres': 'Number format', 'Sélectionnez un élément dans la structure (à gauche) ou sur la page pour modifier ses propriétés.': 'Select an element in the structure (left) or on the page to edit its properties.', 'Les couleurs, le format des nombres et le nom du fichier sont dans le menu Édition.': 'Colours, number format and file name are in the Edit menu.', 'Historique des modifications': 'Edit history', 'Historique des modifications…': 'Edit history…', 'Ouverture du document': 'Document opened', 'Modification': 'Edit', 'Section ajoutée': 'Section added', 'Section supprimée': 'Section deleted', 'Sous-section ajoutée': 'Subsection added', 'Sous-section supprimée': 'Subsection deleted', 'Colonne ajoutée': 'Column added', 'Colonne supprimée': 'Column deleted', 'Éléments déplacés': 'Items moved', 'réglage': 'setting', 'Colonne': 'Column', 'texte': 'text', 'titre': 'title', 'sous-titre': 'subtitle', 'surtitre': 'overline', 'fond': 'background', 'couleur du texte': 'text colour', 'contour': 'outline', 'couleur du contour': 'outline colour', 'colonnes': 'columns', 'page': 'page', 'alignement vertical': 'vertical alignment', 'alignement': 'alignment', 'espacement': 'spacing', 'format des nombres': 'number format', 'image': 'image', 'légende': 'caption', 'logo': 'logo', 'couleurs': 'colours', 'noms des couleurs': 'colour names', 'dataviz': 'dataviz', 'carte': 'card', 'chiffre clé': 'key figure', 'type de contenu': 'content type', 'images': 'images', 'nom du fichier': 'file name', 'Élément supprimé.': 'Item deleted.', 'Annuler la suppression': 'Undo deletion', 'Contenu déplacé. Vérifiez le remplissage des pages.': 'Content moved. Check page fill.', 'Annuler le déplacement': 'Undo move', 'Marges': 'Margins', 'Sections': 'Sections', 'Sous-sections': 'Subsections', 'Colonnes': 'Columns', 'Serré': 'Tight', 'Actuel': 'Current', 'Large': 'Wide', 'Titre de section (vide = masqué)': 'Section title (empty = hidden)', 'Glisser la section (ou la page)': 'Drag the section (to reorder or change page)', 'Afficher le titre': 'Show title', 'affichage du titre': 'title visibility', 'Titre de sous-section': 'Subsection title', 'Nouvelle factsheet vierge': 'New blank factsheet', 'Créer une factsheet vierge ? Le document actuel sera remplacé : enregistrez-le d’abord (.json) si besoin.': 'Create a blank factsheet? The current document will be replaced: save it first (.json) if needed.', 'Enregistrer (.json)': 'Save (.json)', 'Ouvrir…': 'Open…', 'Exporter PDF…': 'Export PDF…', 'Aperçu 3D': '3D preview',
  'Fichier de projet invalide.': 'Invalid project file.', 'Image illisible.': 'Unreadable image.',
  'Recto': 'Front', 'Verso': 'Back', 'recto': 'front', 'verso': 'back',
  'Exporter en PDF': 'Export to PDF', 'Annuler': 'Cancel', 'Exporter': 'Export', 'Terminer': 'Done', 'Personnalisé (poignées entre les colonnes)': 'Custom (handles between the columns)', 'Importer une icône ou une image…': 'Import an icon or an image…', 'Image illisible ou trop lourde.': 'Unreadable or too large image.', 'Icônes et images importées (SVG, PNG, JPEG…) : disponibles dans chaque choix d’icône du document, par exemple comme drapeau sous une barre. Les retirer les retire partout.': 'Imported icons and images (SVG, PNG, JPEG…): available in every icon choice of the document, for example as a flag under a bar. Removing one removes it everywhere.', 'Toute la série': 'Whole series', 'Couleur de la série': 'Series colour', 'Médias importés…': 'Imported media…', 'Médias importés': 'Imported media', 'Aucun média importé.': 'No imported media.', 'Icônes SVG importées : disponibles dans chaque choix d’icône du document. Les retirer les retire partout.': 'Imported SVG icons: available in every icon choice of the document. Removing one removes it everywhere.', 'Copier l’erreur': 'Copy the error', 'Placement': 'Placement', 'Libre (glisser dans l’aperçu)': 'Free (drag in the preview)', 'Au-dessus du contenu': 'Above the content', 'En dessous du contenu': 'Below the content', 'Glisser un texte « libre » dans l’aperçu pour le placer où l’on veut dans la colonne ; « au-dessus » ou « en dessous » le met dans le flux, avant ou après le contenu.': 'Drag a “free” text in the preview to place it anywhere in the column; “above” or “below” puts it in the flow, before or after the content.', 'Titre de la dataviz (facultatif) — styles de paragraphe : titre 1, titre 2, chiffre clé…': 'Dataviz title (optional) — paragraph styles: heading 1, heading 2, key figure…', 'Textes libres': 'Free texts', 'Ajouter un texte': 'Add a text', 'Glisser un texte dans l’aperçu pour le placer où l’on veut dans la colonne.': 'Drag a text in the preview to place it anywhere in the column.', 'X (% de la colonne)': 'X (% of the column)', 'Largeur (%)': 'Width (%)', 'Y (px)': 'Y (px)', 'Chiffre clé (petit)': 'Key figure (small)', 'Position de la légende (« Dans les barres » : noms des séries écrits dans chaque barre, sans légende séparée)': 'Legend position (“Inside the bars”: series names written in each bar, no separate legend)', 'Style de paragraphe': 'Paragraph style', 'Titre 1': 'Heading 1', 'Titre 2': 'Heading 2', 'Légende': 'Caption', 'Texte libre': 'Free text', 'Position': 'Position', 'En dessous': 'Below', 'Largeur du texte (% de la colonne)': 'Text width (% of the column)', 'Un texte lié à cette colonne, quel que soit son contenu : titres, paragraphes, puces, légende.': 'A text attached to this column, whatever its content: headings, paragraphs, bullets, caption.', 'Position de la légende': 'Legend position', 'Dans les barres': 'Inside the bars', 'Épaisseur des barres': 'Bar thickness', 'Fine': 'Thin', 'Normale': 'Normal', 'Épaisse': 'Thick', 'Très épaisse': 'Extra thick', 'Espace entre les lignes': 'Space between rows', 'Espace entre les barres d’une même ligne': 'Space between bars of the same row', 'Espace entre les groupes de barres': 'Space between bar groups', 'Espace entre les barres d’un même groupe': 'Space between bars of the same group', 'Valeurs dans les barres (si elles rentrent)': 'Values inside the bars (if they fit)', 'Libellés dans les barres (au pied de la barre)': 'Labels inside the bars (at the foot of the bar)', 'Noms des séries dans les barres (écrits à la verticale)': 'Series names inside the bars (written vertically)', 'Noms des séries (légende) dans les barres': 'Series names (legend) inside the bars', 'Valeurs dans les barres (si affichées ; sinon après la barre quand ça ne rentre pas)': 'Values inside the bars (if shown; otherwise after the bar when they do not fit)', 'Exposant': 'Superscript', 'Indice': 'Subscript', 'Entrée = nouveau paragraphe · Maj + Entrée = retour à la ligne': 'Enter = new paragraph · Shift + Enter = line break', 'Cercle autour de l’icône': 'Circle around the icon', 'Espace entre les éléments': 'Space between items', 'Réduit': 'Reduced', 'Accolade : espace avant la liste': 'Bracket: space before the list', 'Accolade : trait de liaison vers l’extérieur, longueur au-delà de la colonne (px, 0 = aucun)': 'Bracket: link line outwards, length beyond the column (px, 0 = none)', 'Aucun (anneau seul)': 'None (ring only)', 'Trait de liaison : longueur au-delà de la colonne (px)': 'Link line: length beyond the column (px)', 'Trait de liaison : couleur': 'Link line: colour', 'Trait de liaison vers l’extérieur (jusqu’au bord de la colonne et au-delà)': 'Link line outwards (to the column edge and beyond)', 'Au-dessus': 'Above', 'Libellés dans les barres': 'Labels inside the bars', 'Graduations : nombre de segments dans la barre la plus longue (0 = aucune)': 'Graduations: number of segments in the longest bar (0 = none)', 'Accolade à gauche': 'Bracket on the left', 'Hachures': 'Stripes', 'Barre de progression sous le chiffre (% ; 0 = pas de barre)': 'Progress bar under the figure (%; 0 = no bar)', 'Autres chiffres à côté (jusqu’à 2)': 'Other figures beside (up to 2)', 'Barre de progression (% ; 0 = pas de barre)': 'Progress bar (%; 0 = no bar)', 'Couleur de la barre': 'Bar colour', 'Couleur du reste de la barre': 'Colour of the rest of the bar', 'En-tête (petites capitales, ex. « Sous occupation »)': 'Heading (capitals, e.g. “Under occupation”)', 'Icône de l’en-tête': 'Heading icon', 'Hauteur minimale (px, 0 = automatique)': 'Minimum height (px, 0 = automatic)', 'Ou glisser la poignée sous la colonne dans l’aperçu : elle se cale sur la colonne voisine.': 'Or drag the handle under the column in the preview: it snaps to the neighbouring column.', 'Glisser : hauteur du contenu (se cale sur la colonne voisine) · double-clic : adapter à la colonne voisine': 'Drag: content height (snaps to the neighbouring column) · double-click: match the neighbouring column', 'Hauteur du contenu': 'Content height', 'Annuler (Cmd/Ctrl + Z)': 'Undo (Cmd/Ctrl + Z)', 'Annuler la dernière modification': 'Undo the last change', 'Rétablir (Cmd/Ctrl + Maj + Z)': 'Redo (Cmd/Ctrl + Shift + Z)', 'Rétablir la modification annulée': 'Redo the undone change',
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
  'personnalisé': 'custom', 'original': 'original', 'Charger une autre image…': 'Load another image…', 'Rétablir l’original': 'Restore the original', 'Image par défaut': 'Default image', 'Défaut': 'Default', 'Mono': 'Mono', 'Blanc (white)': 'White', 'Négatif': 'Negative', 'importé': 'uploaded', 'vide': 'empty',
  'Images du header': 'Header images', 'Image affichée (132 px de haut, largeur selon l’image) — choisissez dans la bibliothèque :': 'Image shown (132 px high, width follows the image) — pick one from the library:',
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
  /* éditeur de dataviz : cartes et données */
  'Visualisation': 'Visualisation', 'Comparaison': 'Comparison', 'Proportions': 'Proportions', 'Évolution': 'Trend', 'Listes': 'Lists', 'Type': 'Type', 'Titre et source': 'Title and source', 'Titre de la dataviz (facultatif)': 'Dataviz title (optional)', 'Source (facultatif)': 'Source (optional)', 'Dimensions': 'Dimensions', 'Étiquettes': 'Labels', 'Fichier illisible.': 'Unreadable file.', 'Collez ici un tableau copié depuis Excel, Sheets ou un CSV (la 1re ligne peut contenir les en-têtes)': 'Paste a table copied from Excel, Sheets or a CSV here (the first row can hold headers)', 'Glissez un fichier CSV, TSV ou JSON ici, ou': 'Drop a CSV, TSV or JSON file here, or', 'importez-le…': 'import it…', 'Exporter en CSV': 'Export as CSV', 'Donut / camembert': 'Donut / pie',
  /* nouveaux types de dataviz */
  'Afficher la légende (groupes)': 'Show legend (groups)', 'Afficher la légende (niveau 1)': 'Show legend (level 1)', 'Afficher le nom des groupes (niveau 1)': 'Show group names (level 1)', 'Afficher le nom des groupes': 'Show group names', 'Afficher les noms': 'Show names', 'Afficher les noms sur les arcs': 'Show names on the arcs', 'Afficher le total au centre': 'Show the total in the centre', 'Afficher le contour des groupes': 'Show group outlines', 'Afficher le nom des points': 'Show point names', 'Alignement des nœuds': 'Node alignment', 'Aucune donnée': 'No data', 'Axe horizontal démarrant à zéro': 'Horizontal axis starting at zero', 'Bulles hiérarchiques': 'Hierarchy bubbles', 'Carré': 'Square', 'Couleur (niveau 1)': 'Colour (level 1)', 'Couleur de la réponse': 'Answer colour', 'Couleur du flux': 'Flow colour', 'Couleur des pictogrammes': 'Pictogram colour', 'Cœur': 'Heart', 'Décimales des axes': 'Axis decimals', 'Décimales des pourcentages': 'Percentage decimals', 'Espace entre les bulles (px)': 'Space between bubbles (px)', 'Espace entre les cases (px)': 'Space between cells (px)', 'Espace entre les nœuds (px)': 'Space between nodes (px)', 'Groupe (facultatif)': 'Group (optional)', 'Groupes par ligne (0 = automatique)': 'Groups per row (0 = automatic)', 'Importer un SVG…': 'Import an SVG…', 'Importé': 'Imported', 'Largeur des nœuds (px)': 'Node width (px)', 'Pictogrammes · barres': 'Pictograms · bars', 'Pictogrammes · barres verticales': 'Pictograms · vertical bars', 'Pictogramme simple vertical': 'Simple vertical pictogram', 'Pictogramme simple horizontal': 'Simple horizontal pictogram', 'Pictogramme': 'Pictogram', 'Pictogrammes': 'Pictograms', 'Pourcentages dans la légende': 'Percentages in the legend', 'Rayon maximal des bulles (px)': 'Maximum bubble radius (px)', 'Recolorer le SVG importé avec la couleur choisie': 'Recolour the imported SVG with the chosen colour', 'Répondants': 'Respondents', 'Répondants par point (0 = automatique)': 'Respondents per dot (0 = automatic)', 'Réponse': 'Answer', 'Résultats d’enquête': 'Survey results', 'SVG illisible ou trop lourd.': 'Unreadable or too heavy SVG.', 'Taille (facultatif)': 'Size (optional)', 'Titre de l’axe horizontal': 'Horizontal axis title', 'Titre de l’axe vertical': 'Vertical axis title', 'Trou central (0 à 0,6 du rayon)': 'Central hole (0 to 0.6 of the radius)', 'Une ligne par feuille ; laissez vides les niveaux inutiles. La couleur du niveau 1 s’applique à toute sa branche.': 'One row per leaf; leave unused levels empty. The level 1 colour applies to its whole branch.', 'Une ligne par flux. Les nœuds sont créés d’après les noms ; la couleur d’un flux est celle de sa source si elle n’est pas choisie.': 'One row per flow. Nodes are created from the names; a flow takes its source colour unless one is chosen.', 'Une ligne par groupe et par réponse. L’ordre des réponses va du centre vers l’extérieur ; laissez le groupe vide pour un seul nuage.': 'One row per group and answer. Answers run from the centre outwards; leave the group empty for a single cloud.', 'Une ligne par point. Le groupe donne la couleur ; la taille (facultative) en fait une bulle.': 'One row per point. The group sets the colour; the (optional) size makes it a bubble.', 'Nuage de points': 'Scatter plot', 'Hiérarchies': 'Hierarchies', 'Flux': 'Flows', 'Nom': 'Name', 'Cible': 'Target', 'Niveau 1': 'Level 1', 'Niveau 2': 'Level 2', 'Niveau 3': 'Level 3', 'Groupe': 'Group', 'Rond': 'Circle', 'Personne': 'Person', 'Maison': 'House', 'Trait': 'Outline', 'Flux circulaires non pris en charge': 'Circular flows are not supported', 'Importer': 'Import',
  /* hauteur des dataviz */
  'Automatique (hauteur naturelle)': 'Automatic (natural height)', 'Proportion de la largeur': 'Proportion of the width', 'Fixe': 'Fixed', 'Remplir la place disponible': 'Fill the available space', 'Hauteur': 'Height', 'Hauteur du graphique (px)': 'Chart height (px)', 'Hauteur minimale (px)': 'Minimum height (px)', 'Hauteur maximale (px)': 'Maximum height (px)', 'Place disponible pour cet aperçu (px)': 'Available space for this preview (px)', 'Dans le document, la dataviz occupe la place restante de la page (partagée s’il y en a plusieurs), entre ces deux bornes.': 'In the document, the dataviz takes the remaining space on the page (shared if there are several), between these two limits.',
  'Filet entre les sous-sections': 'Rule between subsections', 'Couleur du filet': 'Rule colour',
  /* texte du centre du donut */
  'Texte du centre': 'Centre text', 'Titre 1 (grand)': 'Heading 1 (large)', 'Titre 2 (moyen)': 'Heading 2 (medium)', 'Texte courant': 'Body text', 'Une ligne par paragraphe. {total} = somme des valeurs. Le texte passe à la ligne et ne dépasse jamais l’anneau.': 'One line per paragraph. {total} = sum of the values. The text wraps and never exceeds the ring.',
  /* frise chronologique */
  'Frise chronologique': 'Timeline', 'Orientation': 'Orientation', 'Verticale': 'Vertical', 'Horizontale': 'Horizontal', 'Alterner les événements de part et d’autre de la ligne': 'Alternate events on both sides of the line', 'Afficher les dates': 'Show dates', 'Date': 'Date', 'Une ligne par événement, dans l’ordre d’affichage. Entrée = retour à la ligne dans le titre et le texte.': 'One row per event, in display order. Enter = line break in the title and the text.',
  /* aide « ? » */
  'Petite ligne en capitales au-dessus du titre, suivie d’un filet. Entrée = retour à la ligne.': 'Small line in capitals above the title, followed by a rule. Enter = line break.',
  'Le titre du header a une taille fixe (30 px). Un avertissement apparaît si le texte déborde du bandeau.': 'The header title has a fixed size (30 px). A warning appears if the text overflows the banner.',
  'Deux lignes tiennent dans le header ; au-delà, un avertissement s’affiche. Vide = masqué.': 'Two lines fit in the header; beyond that a warning is shown. Empty = hidden.',
  'Image de 132 px de haut à gauche du header, choisie dans la bibliothèque.': '132 px high image on the left of the header, picked from the library.',
  'Logo à droite du header ; quatre versions de même taille sont disponibles.': 'Logo on the right of the header; four versions of the same size are available.',
  'Titre de la section. Entrée = retour à la ligne ; vide ou interrupteur éteint = titre masqué (la section se déplace alors par son fond).': 'Section title. Enter = line break; empty or switched off = title hidden (the section is then dragged by its background).',
  'Titre de la sous-section, sous le titre de section. Vide = masqué.': 'Subsection title, below the section title. Empty = hidden.',
  'Masque le titre sans le perdre : il reste saisi, mais n’apparaît ni à l’écran ni à l’export.': 'Hides the title without losing it: it stays typed in but appears neither on screen nor in the export.',
  'Trait de 0,5 pt sur toute la largeur de la page entre deux sous-sections de cette section.': '0.5 pt line across the full page width between two subsections of this section.',
  'Par défaut : blanc sur un fond de section, bleu léger (teinte 20 %) sur fond blanc.': 'Default: white on a section background, light blue (20 % tint) on white.',
  'Bande de couleur sur toute la largeur de la page, derrière la section.': 'Colour band across the full page width, behind the section.',
  'Contour de 0,5 pt et fond facultatif autour de la section, aligné sur les marges.': '0.5 pt outline and optional background around the section, aligned with the margins.',
  'Trait de 0,5 pt aux coins arrondis ; le contenu est alors en retrait de 12 px.': '0.5 pt line with rounded corners; the content is then inset by 12 px.',
  'Place le contenu en haut, au centre ou en bas quand la colonne est moins haute que sa voisine.': 'Places the content at the top, centre or bottom when the column is shorter than its neighbour.',
  'Échange de place le contenu de cette colonne avec celui d’une autre (alignements inclus). Annulable.': 'Swaps this column’s content with another’s (alignments included). Can be undone.',
  'Alignement vertical du contenu et du texte dans la colonne.': 'Vertical alignment of the content and text inside the column.',
  'Fond (couleur ou teinte) et contour de la colonne, indépendants l’un de l’autre.': 'Background (colour or tint) and outline of the column, independent of each other.',
  'Change le type du graphique en gardant le titre et, quand la forme est la même, les données.': 'Changes the chart type, keeping the title and, when the shape is the same, the data.',
  'Automatique : hauteur naturelle. Proportion : fraction de la largeur. Fixe : en pixels. Remplir : occupe la place restante de la page.': 'Automatic: natural height. Proportion: fraction of the width. Fixed: in pixels. Fill: takes the remaining space on the page.',
  'En mode « Remplir », la dataviz ne sera jamais plus basse.': 'In “Fill” mode the dataviz will never be shorter.',
  'En mode « Remplir », la dataviz ne sera jamais plus haute.': 'In “Fill” mode the dataviz will never be taller.',
  'Simule l’espace libre de la page pour voir l’effet du mode « Remplir » (non enregistré).': 'Simulates the free space on the page to preview “Fill” mode (not saved).',
  'Texte facultatif au-dessus (titre) et sous (source) de la dataviz.': 'Optional text above (title) and below (source) the dataviz.',
  'Collez un tableau depuis Excel ou Sheets, importez un fichier CSV, TSV ou JSON, ou saisissez directement dans les cellules. Entrée passe à la ligne suivante.': 'Paste a table from Excel or Sheets, import a CSV, TSV or JSON file, or type straight into the cells. Enter moves to the next row.',
  'Proportions du graphique.': 'Chart proportions.',
  'Légende, valeurs affichées, décimales et unité.': 'Legend, displayed values, decimals and unit.',
  'Couleurs du document ; les séries utilisent les clés de la palette, donc suivent le thème.': 'Document colours; series use palette keys, so they follow the theme.',
  'Proportion hauteur / largeur du graphique (en mode « Proportion »).': 'Height / width ratio of the chart (in “Proportion” mode).',
  'Pastilles de couleur avec le nom des séries ou des groupes sous le graphique.': 'Colour swatches with the series or group names below the chart.',
  'Nombre de décimales affichées pour les valeurs.': 'Number of decimals shown for values.',
  'Texte ajouté après chaque valeur, par exemple « % » ou « M€ ».': 'Text added after each value, e.g. “%” or “M€”.',
  'Une ligne par paragraphe. « ## » devant une ligne = titre 2, « ### » = texte courant, rien = titre 1. {total} = somme des valeurs.': 'One line per paragraph. “##” before a line = heading 2, “###” = body text, nothing = heading 1. {total} = sum of the values.',
  'Un point représente N répondants. 0 choisit une valeur pour afficher environ 400 points.': 'One dot stands for N respondents. 0 picks a value that shows about 400 dots.',
  'Nombre de nuages côte à côte quand l’enquête a plusieurs groupes.': 'Number of clouds side by side when the survey has several groups.',
  'Valeur représentée par un pictogramme entier ; le dernier peut être partiel.': 'Value represented by one whole pictogram; the last one can be partial.',
  'Valeur correspondant à un pictogramme entièrement rempli (ex. 100 pour des pourcentages).': 'Value matching a fully filled pictogram (e.g. 100 for percentages).',
  'Les événements pairs et impairs passent de chaque côté de la ligne : le texte dispose de deux fois plus de largeur.': 'Even and odd events go on either side of the line: the text gets twice the width.',
  'Épaisseur des barres verticales du diagramme de Sankey.': 'Thickness of the Sankey diagram’s vertical bars.',
  'Aide': 'Help',
  /* export CMJN */
  'Génération du PDF…': 'Generating the PDF…', 'Impossible de générer le PDF CMJN.': 'Unable to generate the CMYK PDF.', 'Télécharger le PDF CMJN': 'Download the CMYK PDF', 'PDF RVB (impression)': 'RGB PDF (browser print)', 'PDF RVB (impression du navigateur)': 'RGB PDF (browser print)',
  /* boîte d'export */
  'PDF CMJN': 'CMYK PDF', ' (pour l’imprimeur) : fichier vectoriel généré par l’app, couleurs en CMJN, polices incorporées, TrimBox et BleedBox renseignées. Les images importées sont converties en CMJN sans profil ICC.': ' (for the printer): vector file generated by the app, CMYK colours, embedded fonts, TrimBox and BleedBox set. Imported images are converted to CMYK without an ICC profile.', 'Le navigateur ouvre sa fenêtre d’impression : choisissez ': 'The browser opens its print window: choose ', ' comme destination, ': ' as destination, ', '. Le PDF contient 2 pages (recto, verso) en vectoriel avec polices incorporées, mais en RVB.': '. The PDF has 2 pages (front, back), vector, with embedded fonts, but in RGB.',
  /* PNG 3D */
  'Exporter en PNG': 'Export as PNG', 'PNG transparent': 'Transparent PNG',
  /* frise : extrémités */
  'Extrémités de la ligne': 'Line ends', 'Prolongées, en pointillés': 'Extended, dashed', 'Prolongées, en trait plein': 'Extended, solid', 'Aucune : la ligne commence au premier cercle': 'None: the line starts at the first circle', 'Avant le premier et après le dernier cercle, la ligne se prolonge (un tiers plein puis des tirets) ou non : « Aucune » fait commencer la ligne au premier cercle.': 'Before the first and after the last circle the line extends (a third solid, then dashes) or not: “None” makes the line start at the first circle.',
  /* alignement et interlignage */
  'Interlignage des textes': 'Text line spacing', 'Serré (15 px)': 'Tight (15 px)', 'Normal (18 px)': 'Normal (18 px)', 'Large (21 px)': 'Loose (21 px)', 'Alignement vertical de la dataviz': 'Dataviz vertical alignment', 'En bas': 'Bottom', 'Quand le conteneur est plus haut que le contenu : le contenu se place en haut, au centre ou en bas.': 'When the container is taller than the content: the content sits at the top, centre or bottom.', 'Espace entre les lignes des libellés : serré, normal (18 px) ou large (21 px).': 'Space between label lines: tight, normal (18 px) or loose (21 px).',
  /* filet entre sections */
  'Filet au-dessus de la section': 'Rule above the section', 'Trait de 0,5 pt sur toute la largeur de la page entre cette section et la précédente (sections sur fond blanc, ou deux bandes de couleur côte à côte).': '0.5 pt line across the full page width between this section and the previous one (sections on white, or two colour bands side by side).',
  /* hauteur : voisine, anneau */
  'Adapter à la colonne voisine': 'Match the neighbouring column', 'Position verticale de l’anneau': 'Ring vertical position', 'Centré sur le contenu': 'Centred on the content', 'La dataviz prend la hauteur de la colonne voisine la plus haute de sa rangée.': 'The dataviz takes the height of the tallest neighbouring column in its row.', 'Quand les textes autour de l’anneau sont plus hauts que lui : l’anneau se place en haut, centré sur le contenu ou en bas ; les traits de repère suivent.': 'When the texts around the ring are taller than it: the ring sits at the top, centred on the content or at the bottom; the leader lines follow.',
  /* outil main */
  'Outil main (Espace ou H)': 'Hand tool (Space or H)',
  /* poignée de hauteur */
  'Glisser : hauteur de la dataviz (se cale sur la colonne voisine) · double-clic : adapter à la colonne voisine': 'Drag: dataviz height (snaps to the neighbouring column) · double-click: match the neighbouring column', 'Hauteur de la dataviz': 'Dataviz height',
  /* grille waffle */
  'Grille de pourcentage (waffle)': 'Percentage grid (waffle)', 'Logements endommagés ou détruits': 'Housing damaged or destroyed', 'Cases par ligne': 'Cells per row', 'Nombre de lignes': 'Number of rows', 'Valeur de la grille entière (0 = somme des valeurs)': 'Value of the whole grid (0 = sum of the values)', 'Forme des cases': 'Cell shape', 'Carrée': 'Square', 'Arrondie': 'Rounded', 'Ronde': 'Round', 'Repère sur les cases pleines': 'Mark on filled cells', 'Croix': 'Cross', 'Point': 'Dot', 'Coche': 'Tick', 'Couleur du repère': 'Mark colour', 'Une ligne par catégorie : les cases se remplissent dans cet ordre, ligne par ligne.': 'One row per category: cells fill in this order, row by row.',
  /* colonnes et chiffre du waffle */
  '4 colonnes': '4 columns', '5 colonnes': '5 columns', '6 colonnes': '6 columns', '2 colonnes (3/4 + 1/4)': '2 columns (3/4 + 1/4)', '2 colonnes (1/4 + 3/4)': '2 columns (1/4 + 3/4)', '2 colonnes (3/5 + 2/5)': '2 columns (3/5 + 2/5)', '2 colonnes (2/5 + 3/5)': '2 columns (2/5 + 3/5)', '3 colonnes (1/2 + 1/4 + 1/4)': '3 columns (1/2 + 1/4 + 1/4)', '3 colonnes (1/4 + 1/2 + 1/4)': '3 columns (1/4 + 1/2 + 1/4)', '3 colonnes (1/4 + 1/4 + 1/2)': '3 columns (1/4 + 1/4 + 1/2)', 'Chiffre à côté de la grille': 'Figure beside the grid', 'Chiffre ({pct} = part de la 1re catégorie)': 'Figure ({pct} = share of the 1st category)', 'Texte sous le chiffre (vide = libellé de la 1re catégorie)': 'Text under the figure (empty = label of the 1st category)', 'Largeur de la grille (% de la dataviz)': 'Grid width (% of the dataviz)', 'Position verticale du chiffre': 'Figure vertical position',
  /* chiffre à côté, repères du waffle */
  'Chiffre à côté': 'Figure beside', 'Chiffre ({pct} = part de la 1re donnée)': 'Figure ({pct} = share of the 1st item)', 'Texte sous le chiffre (vide = libellé de la 1re donnée)': 'Text under the figure (empty = label of the 1st item)', 'Largeur de la dataviz (% de la largeur)': 'Dataviz width (% of the width)', 'Autres logements': 'Other housing', 'Repère': 'Mark', 'Icône · ': 'Icon · ', 'Une ligne par catégorie : les cases se remplissent dans cet ordre, ligne par ligne ; une catégorie blanche reste une case vide. Le repère se choisit par catégorie.': 'One row per category: cells fill in this order, row by row; a white category stays an empty cell. The mark is chosen per category.',
  'Un chiffre clé (par exemple 14 %) et son texte à côté de la dataviz, qui prend alors la part de largeur choisie.': 'A key figure (e.g. 14 %) and its text beside the dataviz, which then takes the chosen share of the width.',
  'Taille du chiffre': 'Figure size', 'Normal': 'Normal', 'Grand': 'Large', 'Très grand': 'Extra large',
  'Largeur du contenu (% de la largeur)': 'Content width (% of the width)',
  /* icônes importées */
  'Icônes importées': 'Imported icons', 'Une fois importée, l’icône est proposée dans le choix « Icône » de chaque élément (onglet Données).': 'Once imported, the icon is offered in each item’s “Icon” choice (Data tab).',
  'Taille des icônes et du texte': 'Icon and text size',
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
  'Fichier': 'File', 'Affichage': 'View', 'Version': 'Version', 'Dernières versions': 'Latest versions', 'Exporter mes données (JSON)': 'Export my data (JSON)',
  'Atelier du Factsheet creator': 'Factsheet creator Atelier', 'Cette app est prévue pour un écran d’ordinateur': 'This app is designed for a computer screen', 'Fermer le bandeau': 'Close the banner',
  'Alignement vertical dans la colonne': 'Vertical alignment in the column', 'Alignement du texte': 'Text alignment', 'Haut': 'Top', 'Centre': 'Middle', 'Bas': 'Bottom', 'Centré': 'Centred', 'Justifié': 'Justified',
  'Échanger le contenu avec…': 'Swap content with…', 'Déplacer vers la section': 'Move to section', 'Annuler le déplacement': 'Undo move',
  'Contenu déplacé. Vérifiez le remplissage des pages.': 'Content moved. Check how full the pages are.',
  'Glisser la sous-section (autre section possible)': 'Drag the subsection (other sections allowed)', 'Glisser le contenu sur une autre colonne pour l’échanger': 'Drag the content onto another column to swap them',
  /* contours, images, chiffre clé, labo */
  'Contour': 'Outline', 'Couleur du contour': 'Outline colour', 'Fond blanc': 'White background', 'Taille de l’image': 'Image size', 'Format fixe (recadrée)': 'Fixed ratio (cropped)',
  'Ajustée au conteneur (proportions conservées)': 'Fit to container (keeps proportions)', 'Taille personnalisée': 'Custom size', 'Largeur (% de la colonne)': 'Width (% of the column)', 'Hauteur (px)': 'Height (px)',
  'Remplissage': 'Fill', 'Recadrer pour remplir': 'Crop to fill', 'Image entière': 'Whole image', 'Position dans la colonne': 'Position in the column',
  'Tous les réglages de la dataviz (type, données, couleurs, options) se font dans l’éditeur.': 'All dataviz settings (type, data, colours, options) are in the editor.',
  'Icône devant le chiffre': 'Icon before the figure', 'Aucune': 'None', 'Style de l’icône': 'Icon style', 'Pictogramme seul': 'Icon only', 'Dans une pastille': 'In a circle',
  'Cartes': 'Cards', 'Options': 'Options', 'Position de l’image': 'Image position', 'En haut': 'Top', 'À gauche': 'Left', 'À droite': 'Right', 'Alignement': 'Alignment', 'Icône choisie': 'Chosen icon',
  'Image jusqu’au bord du contour': 'Image to the outline edge', 'Icône dans une pastille': 'Icon in a circle', 'Icône à côté du titre': 'Icon next to the title', 'Étiquette': 'Tag', 'Chiffre': 'Figure', 'Puces': 'Bullets', 'Lien': 'Link',
  'Réinitialiser la variante': 'Reset the variant', 'Largeur de colonne': 'Column width', 'Sur fond de section teinté': 'On a tinted section background', 'actuelle': 'current', 'Précédente': 'Previous', 'Suivante': 'Next',
  'Carte simple': 'Simple card', 'Titre et texte dans un contour : le minimum, point de départ.': 'Title and text in an outline: the minimum, a starting point.',
  'Image en haut': 'Image on top', 'Image au-dessus, étiquette, titre, texte et lien ; l’image reste dans les marges du contour.': 'Image above, tag, title, text and link; the image stays inside the outline padding.',
  'Image jusqu’au bord': 'Image to the edge', 'Comme B, mais l’image touche le contour (coins hauts arrondis de 3 px).': 'Like B, but the image touches the outline (top corners rounded to 3 px).',
  'Icône en tête': 'Icon first', 'Pastille d’icône centrée au-dessus du titre, avec des puces.': 'Icon circle centred above the title, with bullets.',
  'Image à côté': 'Image beside', 'Image à gauche (40 %), contenu à droite : pour les colonnes larges.': 'Image on the left (40 %), content on the right: for wide columns.',
  'Carte statistique : icône à côté du titre, grand chiffre, texte.': 'Stat card: icon next to the title, big figure, text.',
  'Complète': 'Complete', 'Toutes les options activées ; décochez ce que vous ne voulez pas garder.': 'All options on; untick what you do not want to keep.',
  'Sans icône': 'No icon', 'Le chiffre clé actuel : contour, fond blanc, chiffre et texte.': 'The current key figure: outline, white background, figure and text.',
  'Pictogramme au trait à la hauteur du chiffre.': 'Line icon at the height of the figure.', 'Icône en pastille': 'Icon in a circle',
  'Même icône dans une pastille ronde de 0,5 pt, comme dans la liste à icônes.': 'Same icon in a round 0.5 pt circle, as in the icon list.',
  'Centré, sans contour': 'Centred, no outline', 'Chiffre et icône centrés, pour une bande de plusieurs chiffres.': 'Centred figure and icon, for a row of several figures.',
  /* cmjn */
  'CMJN': 'CMYK', 'J': 'Y', 'N': 'K',
  /* suppression */
  'Élément supprimé.': 'Element deleted.', 'Colonne supprimée : les autres s’étendent.': 'Column deleted: the others expand.', 'Annuler la suppression': 'Undo delete', 'Supprimer (Suppr)': 'Delete (Del)', 'Supprimer la colonne': 'Delete the column',
  /* couleurs, cartes */
  'Modifier la couleur': 'Edit the colour', 'Rétablir la couleur du thème': 'Reset to the theme colour', 'Ajouter une couleur': 'Add a colour', 'Pipette': 'Eyedropper',
  'Supprimer cette couleur ? Ce qui l’utilise passera en bleu.': 'Delete this colour? Anything using it will turn blue.',
  'Carte': 'Card', 'Options de la carte': 'Card options', 'Type de carte selon la largeur de la colonne': 'Card type follows the column width', 'Puces (une par ligne)': 'Bullets (one per line)', 'Image de la carte': 'Card image',
  'NOUVEAU': 'NEW', 'Titre de la carte': 'Card title', 'Texte de la carte. Une ligne = un paragraphe, **gras** avec les astérisques.': 'Card text. One line = one paragraph, **bold** with asterisks.',
  'Premier point': 'First point', 'Deuxième point': 'Second point', 'Troisième point': 'Third point', 'En savoir plus': 'Read more',
  'retenue — colonnes moyennes': 'chosen — medium columns', 'retenue — colonnes étroites': 'chosen — narrow columns', 'retenue — colonnes larges': 'chosen — wide columns',
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
  'Glisser : tourner la feuille · clic droit ou Maj : la déplacer · molette : zoomer': 'Drag: turn the sheet · right click or Shift: move it · wheel: zoom', 'Préparation de l’aperçu…': 'Preparing the preview…',
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
  [/^Chiffre clé · (.+)$/, (_, x) => `Key figure · ${x}`],
  [/^Teinte · (.+)$/, (_, x) => `Tint · ${tr(x)}`],
  [/^Carte · (.+)$/, (_, x) => `Card · ${x}`],
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
