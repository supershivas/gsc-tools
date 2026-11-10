/*
  Batch Logo Export  (v10)
  Illustrator : export des artboards par langue (jeux de variables), avec fenêtre d'options.
  Illustrator: batch export of artboards per language (variable data sets), with an options window.

  - Document CMYK -> EPS et/ou PDF print / CMYK document -> EPS and/or print PDF
  - Document RGB  -> PNG (fond transparent possible) et/ou SVG / RGB document -> PNG and/or SVG
  - Nom de fichier / File name : prefixe + nom d'artboard + _couleur + _langue + suffixe + extension
  - Interface FR / EN, fenêtre en formulaire (intitulés | options)
  - Chaque fichier ne contient que son artboard. Le document d'origine n'est jamais enregistré.
*/

#target illustrator

(function () {

    if (app.documents.length === 0) {
        alert("Aucun document ouvert. / No document open.");
        return;
    }

    var doc = app.activeDocument;
    var estCMYK = (doc.documentColorSpace === DocumentColorSpace.CMYK);
    var CODE_COULEUR = estCMYK ? "cmyk" : "rgb";

    // ------------------------------------------------------------------
    // Textes de l'interface (FR / EN)
    // ------------------------------------------------------------------
    var S = {
        fr: {
            title: "Batch Logo Export",
            lbl_options: "Options",
            lbl_content: "Contenu",
            lbl_orga: "Organisation",
            lbl_folder: "Dossier",
            lbl_artboards: "Artboards",
            lbl_langs: "Langues",
            lbl_select: "Sélection",
            lbl_fmt_rgb: "Formats RGB",
            lbl_fmt_cmyk: "Formats CMYK",
            tip_lower: "Noms de fichiers et de dossiers en minuscules (EN devient en).",
            tip_lang: "Ajoute _en, _fr… à la fin du nom, avant le suffixe.",
            tip_color: "Ajoute _cmyk ou _rgb selon le mode du document. Un code déjà présent dans le nom de l'artboard n'est pas doublé.",
            lbl_example: "Exemple",
            lbl_compose: "Composition",
            lbl_name: "Nom du fichier",
            tip_reminder: "Rappel de ce que le fichier doit contenir",
            lbl_check: "Vérifications",
            lbl_document: "Document",
            no_ds: "Aucun jeu de variables (dataset) dans ce document.",
            doc_info: "Document : {0}   |   mode {1}   |   {2} langue(s), {3} artboard(s)",
            ui_lang: "Interface :",
            panel_check: "Vérifications du fichier",
            btn_reminder: "Prérequis…",
            panel_names: "Nom des fichiers",
            prefix: "Préfixe :",
            suffix: "Suffixe :",
            cb_color: "+ code couleur (cmyk / rgb)",
            cb_lang: "+ langue",
            cb_lower: "langue en minuscules",
            example: "Exemple : {0}",
            fmt_cmyk: "Formats d'export  (document CMYK : EPS et PDF print)",
            fmt_rgb: "Formats d'export  (document RGB : PNG et SVG)",
            cb_pdf: "PDF print",
            cb_trim: "avec repères de coupe",
            cb_transp: "fond transparent",
            resolution: "résolution :",
            cb_outline: "texte converti en contours",
            panel_langs: "Langues (variables)",
            panel_artboards: "Artboards",
            all: "Tout",
            none: "Aucun",
            panel_dest: "Destination",
            folder_label: "Dossier :",
            browse: "Parcourir…",
            browse_title: "Choisis le dossier d'export",
            orga_label: "Organisation :",
            orga0: "Un dossier par langue",
            orga1: "Langue puis format",
            orga2: "Tout dans un dossier",
            cb_skip: "Ignorer les fichiers déjà présents",
            panel_content: "Contenu des fichiers exportés",
            cb_crop: "Rogner au contenu (crop to art)",
            cb_break: "Casser le lien des symboles",
            cb_test: "Mode TEST (1 langue, 1 artboard)",
            tip_crop: "L'artboard de chaque fichier est ajusté aux limites du dessin.",
            tip_break: "Transforme les symboles en tracés simples dans les fichiers exportés. Le document d'origine n'est pas touché.",
            tip_skip: "Sinon, les fichiers existants sont écrasés.",
            tip_test: "Exporte uniquement la première langue et le premier artboard de la sélection.",
            tip_orga: "Un dossier par langue ; ou langue puis sous-dossier par format ; ou tous les fichiers à plat (la langue doit alors figurer dans le nom).",
            cb_open: "Ouvrir le dossier à la fin",
            cancel: "Annuler",
            run: "Exporter",
            err_format: "Coche au moins un format d'export.",
            err_lang: "Sélectionne au moins une langue.",
            err_artboard: "Sélectionne au moins un artboard.",
            err_folder: "Le dossier d'export n'existe pas.\nChoisis-en un avec « Parcourir… ».",
            err_flat: "Avec « tous les fichiers dans le même dossier », la langue doit être ajoutée au nom,\nsinon les fichiers de langues différentes s'écraseraient.",
            pf_ds: "[OK] {0} jeu(x) de variables : {1}",
            pf_var_ok: "[OK] {0} variable(s) dans le panneau Variables",
            pf_var_none: "[!] Aucune variable dans le panneau Variables : le contenu ne changera pas d'une langue à l'autre",
            pf_ab: "[OK] {0} artboard(s)",
            pf_dup: "[!] Noms d'artboards en double (les fichiers s'écraseraient) : {0}",
            pf_special: "[!] Caractères interdits dans : {0} (remplacés par « - » dans le nom de fichier)",
            pf_color_mismatch: "[i] Artboard(s) dont le nom contient un autre code couleur que le document ({0}) : le code sera aligné sur le mode du document dans le nom de fichier : {1}",
            pf_locks: "[i] Calques verrouillés : {0} (exportés quand même) | masqués : {1} (non exportés)",
            pf_sym: "[i] {0} instance(s) de symbole(s) : voir l'option « casser le lien des symboles »",
            pf_links_missing: "[!] {0} image(s) liée(s) introuvable(s) sur {1}",
            pf_links_ok: "[i] {0} image(s) liée(s), toutes présentes (elles seront incorporées dans les exports)",
            rappel:
                "CE QUE LE FICHIER DOIT CONTENIR\n\n" +
                "1. Un jeu de variables (dataset) par langue, nommé avec le code de la langue (EN, FR, ES…).\n" +
                "   Création : panneau Variables > « Capturer un jeu de données ».\n" +
                "   Tous les jeux du fichier sont proposés ; décoche ceux à ignorer.\n\n" +
                "2. Des variables liées aux objets (texte dynamique, etc.) dans le panneau Variables,\n" +
                "   avec les valeurs de chaque langue enregistrées dans son jeu.\n\n" +
                "3. Des artboards au nom unique : ce nom sert au fichier\n" +
                "   (préfixe + nom + _cmyk ou _rgb + _langue). Si le nom de l'artboard contient déjà un code\n" +
                "   couleur, il est repris et aligné sur le mode du document.\n" +
                "   Éviter les caractères / \\ : * ? \" < > |\n\n" +
                "4. Un mode colorimétrique cohérent : CMYK pour EPS et PDF, RGB pour PNG et SVG.\n\n" +
                "5. Calques et objets : les éléments verrouillés sont exportés (déverrouillés le temps de l'export,\n" +
                "   puis reverrouillés) ; les calques et objets masqués ne sont pas exportés.\n\n" +
                "6. Le contenu de chaque artboard posé sur l'artboard : ce qui est entièrement en dehors n'est pas exporté.\n\n" +
                "7. Les polices installées et les images liées présentes (sinon polices remplacées, images manquantes).\n\n" +
                "8. Symboles : acceptés. Ils sont copiés avec le dessin ; l'option « casser le lien des symboles »\n" +
                "   les transforme en tracés simples dans les fichiers exportés (le fichier d'origine n'est pas touché).\n" +
                "   Attention : les variables ne pilotent pas forcément le contenu d'un symbole, à tester.",
            progress_title: "Export en cours…",
            log_doc: "Document : {0} ({1})",
            log_formats: "Formats : {0}",
            log_counts: "Langues : {0} | Artboards : {1} | Mode : {2}",
            mode_test: "TEST",
            mode_full: "COMPLET",
            log_options: "Rogner au contenu : {0} | Casser les symboles : {1}",
            yes: "oui",
            no: "non",
            log_unlock: "Déverrouillage temporaire : {0} calque(s), {1} objet(s)",
            log_lang: "Langue {0} appliquée",
            log_skipped: "  IGNORÉ {0} (existe déjà)",
            log_empty: "  VIDE  {0}/{1} (aucun objet visible sur l'artboard : calques masqués ?)",
            err_empty: "{0}/{1} : aucun objet trouvé sur l'artboard",
            log_sym: "  symboles cassés : {0}",
            log_sym_fail: "  ATTENTION : impossible de casser le lien des symboles (fonction indisponible)",
            log_crop_fail: "  ATTENTION : rognage impossible : {0}",
            log_ok: "  OK    {0}  ({1} x {2} pt)",
            log_err: "  ERREUR {0} : {1}",
            log_locks_restored: "Verrous restaurés",
            log_summary: "{0} fichier(s) exporté(s), {1} ignoré(s), {2} erreur(s)",
            done: "{0} fichier(s) exporté(s) dans :\n{1}",
            done_skipped: "{0} fichier(s) ignoré(s) car déjà présents.",
            done_errors: "{0} erreur(s), voir export_log.txt :\n{1}",
            done_test: "MODE TEST : vérifie le fichier créé, puis relance sans le mode test."
        },
        en: {
            title: "Batch Logo Export",
            lbl_options: "Options",
            lbl_content: "Content",
            lbl_orga: "Organisation",
            lbl_folder: "Folder",
            lbl_artboards: "Artboards",
            lbl_langs: "Languages",
            lbl_select: "Selection",
            lbl_fmt_rgb: "RGB formats",
            lbl_fmt_cmyk: "CMYK formats",
            tip_lower: "File and folder names in lowercase (EN becomes en).",
            tip_lang: "Adds _en, _fr… at the end of the name, before the suffix.",
            tip_color: "Adds _cmyk or _rgb according to the document mode. A code already present in the artboard name is not duplicated.",
            lbl_example: "Example",
            lbl_compose: "Composition",
            lbl_name: "File name",
            tip_reminder: "Reminder of what the file must contain",
            lbl_check: "File checks",
            lbl_document: "Document",
            no_ds: "No variable data set in this document.",
            doc_info: "Document: {0}   |   {1} mode   |   {2} language(s), {3} artboard(s)",
            ui_lang: "Interface:",
            panel_check: "File checks",
            btn_reminder: "Requirements…",
            panel_names: "File names",
            prefix: "Prefix:",
            suffix: "Suffix:",
            cb_color: "+ colour code (cmyk / rgb)",
            cb_lang: "+ language",
            cb_lower: "lowercase language",
            example: "Example: {0}",
            fmt_cmyk: "Export formats  (CMYK document: EPS and print PDF)",
            fmt_rgb: "Export formats  (RGB document: PNG and SVG)",
            cb_pdf: "Print PDF",
            cb_trim: "with trim marks",
            cb_transp: "transparent background",
            resolution: "resolution:",
            cb_outline: "text converted to outlines",
            panel_langs: "Languages (variables)",
            panel_artboards: "Artboards",
            all: "All",
            none: "None",
            panel_dest: "Destination",
            folder_label: "Folder:",
            browse: "Browse…",
            browse_title: "Choose the export folder",
            orga_label: "Organisation:",
            orga0: "One folder per language",
            orga1: "Language, then format",
            orga2: "Everything in one folder",
            cb_skip: "Skip files that already exist",
            panel_content: "Content of exported files",
            cb_crop: "Crop to art",
            cb_break: "Break symbol links",
            cb_test: "TEST mode (1 language, 1 artboard)",
            tip_crop: "Each file's artboard is fitted to the artwork bounds.",
            tip_break: "Turns symbols into plain paths in the exported files. The original document is not touched.",
            tip_skip: "Otherwise existing files are overwritten.",
            tip_test: "Exports only the first language and the first artboard of the selection.",
            tip_orga: "One folder per language; or language then one subfolder per format; or all files flat (the language must then be part of the name).",
            cb_open: "Open the folder when done",
            cancel: "Cancel",
            run: "Export",
            err_format: "Tick at least one export format.",
            err_lang: "Select at least one language.",
            err_artboard: "Select at least one artboard.",
            err_folder: "The export folder does not exist.\nChoose one with “Browse…”.",
            err_flat: "With “all files in the same folder”, the language must be added to the name,\notherwise files of different languages would overwrite each other.",
            pf_ds: "[OK] {0} variable data set(s): {1}",
            pf_var_ok: "[OK] {0} variable(s) in the Variables panel",
            pf_var_none: "[!] No variable in the Variables panel: the content will not change from one language to another",
            pf_ab: "[OK] {0} artboard(s)",
            pf_dup: "[!] Duplicate artboard names (files would overwrite each other): {0}",
            pf_special: "[!] Forbidden characters in: {0} (replaced by “-” in the file name)",
            pf_color_mismatch: "[i] Artboard name(s) containing a colour code different from the document ({0}): the code will be aligned with the document mode in the file name: {1}",
            pf_locks: "[i] Locked layers: {0} (exported anyway) | hidden: {1} (not exported)",
            pf_sym: "[i] {0} symbol instance(s): see the “break symbol links” option",
            pf_links_missing: "[!] {0} linked image(s) missing out of {1}",
            pf_links_ok: "[i] {0} linked image(s), all present (they will be embedded in the exports)",
            rappel:
                "WHAT THE FILE MUST CONTAIN\n\n" +
                "1. One variable data set per language, named with the language code (EN, FR, ES…).\n" +
                "   Create it in the Variables panel > “Capture Data Set”.\n" +
                "   All data sets in the file are listed; untick the ones to skip.\n\n" +
                "2. Variables bound to objects (dynamic text, etc.) in the Variables panel,\n" +
                "   with each language's values stored in its data set.\n\n" +
                "3. Artboards with unique names: the name is used in the file name\n" +
                "   (prefix + name + _cmyk or _rgb + _language). If the artboard name already contains a\n" +
                "   colour code, it is kept and aligned with the document mode.\n" +
                "   Avoid the characters / \\ : * ? \" < > |\n\n" +
                "4. A consistent colour mode: CMYK for EPS and PDF, RGB for PNG and SVG.\n\n" +
                "5. Layers and objects: locked items are exported (unlocked during the export, then locked again);\n" +
                "   hidden layers and objects are not exported.\n\n" +
                "6. Each artboard's content placed on the artboard: anything entirely outside it is not exported.\n\n" +
                "7. Fonts installed and linked images present (otherwise fonts are replaced and images missing).\n\n" +
                "8. Symbols: supported. They are copied with the artwork; the “break symbol links” option turns\n" +
                "   them into plain paths in the exported files (the original file is not touched).\n" +
                "   Note: variables may not drive the content of a symbol, test it.",
            progress_title: "Exporting…",
            log_doc: "Document: {0} ({1})",
            log_formats: "Formats: {0}",
            log_counts: "Languages: {0} | Artboards: {1} | Mode: {2}",
            mode_test: "TEST",
            mode_full: "FULL",
            log_options: "Crop to art: {0} | Break symbols: {1}",
            yes: "yes",
            no: "no",
            log_unlock: "Temporary unlock: {0} layer(s), {1} object(s)",
            log_lang: "Language {0} applied",
            log_skipped: "  SKIPPED {0} (already exists)",
            log_empty: "  EMPTY {0}/{1} (no visible object on the artboard: hidden layers?)",
            err_empty: "{0}/{1}: no object found on the artboard",
            log_sym: "  symbols broken: {0}",
            log_sym_fail: "  WARNING: could not break symbol links (function unavailable)",
            log_crop_fail: "  WARNING: crop failed: {0}",
            log_ok: "  OK    {0}  ({1} x {2} pt)",
            log_err: "  ERROR {0}: {1}",
            log_locks_restored: "Locks restored",
            log_summary: "{0} file(s) exported, {1} skipped, {2} error(s)",
            done: "{0} file(s) exported to:\n{1}",
            done_skipped: "{0} file(s) skipped because they already exist.",
            done_errors: "{0} error(s), see export_log.txt:\n{1}",
            done_test: "TEST MODE: check the created file, then run again without test mode."
        }
    };

    var UI = "fr";

    function t(key) {
        var s = S[UI][key];
        if (s === undefined) { s = S.fr[key]; }
        for (var i = 1; i < arguments.length; i++) {
            s = s.split("{" + (i - 1) + "}").join(String(arguments[i]));
        }
        return s;
    }

    // ------------------------------------------------------------------
    // Utilitaires
    // ------------------------------------------------------------------
    function nettoyer(nom) {
        return String(nom).replace(/[\\\/:*?"<>|]/g, "-");
    }

    function creerDossier(chemin) {
        var f = new Folder(chemin);
        if (f.exists) { return f; }
        var parent = f.parent;
        if (parent && !parent.exists) { creerDossier(parent.fsName); }
        f.create();
        return f;
    }

    function bornesSelection(sel) {
        var b = null;
        for (var i = 0; i < sel.length; i++) {
            var g;
            try { g = sel[i].geometricBounds; } catch (e) { continue; }
            if (b === null) {
                b = [g[0], g[1], g[2], g[3]];
            } else {
                if (g[0] < b[0]) b[0] = g[0];
                if (g[1] > b[1]) b[1] = g[1];
                if (g[2] > b[2]) b[2] = g[2];
                if (g[3] < b[3]) b[3] = g[3];
            }
        }
        return b;
    }

    // Nom de base d'un artboard avec le code couleur du document :
    //  - pas de code dans le nom        -> "neg_v" devient "neg_v_cmyk"
    //  - code déjà présent et identique -> inchangé
    //  - autre code (ex. "rgb" dans un document CMYK) -> remplacé par le code du document
    var RE_CODE = /(^|_)(rgb|cmyk)(_|$)/i;
    function baseArtboard(nomArtboard, ajouterCouleur) {
        var n = nettoyer(nomArtboard);
        if (!ajouterCouleur) { return n; }
        if (RE_CODE.test(n)) {
            return n.replace(RE_CODE, "$1" + CODE_COULEUR + "$3");
        }
        return n + "_" + CODE_COULEUR;
    }

    function nomComplet(prefix, suffix, ajouterCouleur, ajouterLangue, nomArtboard, langue, ext) {
        return prefix + baseArtboard(nomArtboard, ajouterCouleur) +
            (ajouterLangue ? "_" + langue : "") + suffix + "." + ext;
    }

    // ------------------------------------------------------------------
    // Réglages mémorisés
    // ------------------------------------------------------------------
    var fichierReglages = new File(Folder.userData.fsName + "/batch_logo_export_settings.txt");

    function reglagesParDefaut() {
        var dossierDefaut;
        try { dossierDefaut = doc.path.fsName; } catch (e) { dossierDefaut = Folder.desktop.fsName; }
        return {
            ui: "fr",
            prefix: "pec_",
            suffix: "",
            addColor: true,
            addLang: true,
            lower: true,
            eps: true,
            pdf: true,
            png: true,
            svg: true,
            trim: false,
            transparent: true,
            ppiIndex: 0,
            outlineSvg: true,
            folder: dossierDefaut,
            orga: 0,
            skip: false,
            open: true,
            cropArt: false,
            breakSym: true
        };
    }

    function chargerReglages() {
        var cfg = reglagesParDefaut();
        try {
            if (fichierReglages.exists) {
                fichierReglages.open("r");
                var txt = fichierReglages.read();
                fichierReglages.close();
                var saved = eval(txt);
                for (var k in saved) {
                    if (cfg.hasOwnProperty(k)) { cfg[k] = saved[k]; }
                }
            }
        } catch (e) {}
        if (cfg.ui !== "fr" && cfg.ui !== "en") { cfg.ui = "fr"; }
        return cfg;
    }

    function sauverReglages(cfg) {
        try {
            fichierReglages.open("w");
            fichierReglages.write(cfg.toSource());
            fichierReglages.close();
        } catch (e) {}
    }

    // ------------------------------------------------------------------
    // Vérifications automatiques du fichier
    // ------------------------------------------------------------------
    function compterCalques(calques, etat) {
        for (var i = 0; i < calques.length; i++) {
            var c = calques[i];
            try {
                if (c.locked) { etat.verrouilles++; }
                if (!c.visible) { etat.masques++; }
                compterCalques(c.layers, etat);
            } catch (e) {}
        }
    }

    function verifierFichier() {
        var l = [];

        var noms = [];
        for (var i = 0; i < doc.dataSets.length; i++) { noms.push(doc.dataSets[i].name); }
        var liste = noms.slice(0, 12).join(", ") + (noms.length > 12 ? "…" : "");
        l.push(t("pf_ds", noms.length, liste));

        var nbVar = 0;
        try { nbVar = doc.variables.length; } catch (e1) {}
        l.push(nbVar > 0 ? t("pf_var_ok", nbVar) : t("pf_var_none"));

        var vus = {};
        var doublons = [];
        var speciaux = [];
        var autreCode = [];
        for (var j = 0; j < doc.artboards.length; j++) {
            var n = doc.artboards[j].name;
            if (vus[n]) { doublons.push(n); }
            vus[n] = true;
            if (/[\\\/:*?"<>|]/.test(n)) { speciaux.push(n); }
            var m = n.match(RE_CODE);
            if (m && m[2].toLowerCase() !== CODE_COULEUR) { autreCode.push(n); }
        }
        l.push(t("pf_ab", doc.artboards.length));
        if (doublons.length > 0) { l.push(t("pf_dup", doublons.join(", "))); }
        if (speciaux.length > 0) { l.push(t("pf_special", speciaux.join(", "))); }
        if (autreCode.length > 0) { l.push(t("pf_color_mismatch", CODE_COULEUR, autreCode.join(", "))); }

        var etat = { verrouilles: 0, masques: 0 };
        compterCalques(doc.layers, etat);
        if (etat.verrouilles > 0 || etat.masques > 0) {
            l.push(t("pf_locks", etat.verrouilles, etat.masques));
        }

        var nbSym = 0;
        try { nbSym = doc.symbolItems.length; } catch (e2) {}
        if (nbSym > 0) { l.push(t("pf_sym", nbSym)); }

        var nbLies = 0, manquants = 0;
        try {
            nbLies = doc.placedItems.length;
            for (var k = 0; k < nbLies; k++) {
                try {
                    var f = doc.placedItems[k].file;
                    if (!f || !f.exists) { manquants++; }
                } catch (e3) { manquants++; }
            }
        } catch (e4) {}
        if (manquants > 0) {
            l.push(t("pf_links_missing", manquants, nbLies));
        } else if (nbLies > 0) {
            l.push(t("pf_links_ok", nbLies));
        }

        return l;
    }

    // ------------------------------------------------------------------
    // Fenêtre d'options
    // ------------------------------------------------------------------
    var PPI = [72, 144, 300, 600];

    function afficherDialogue(cfg) {
        var langues = [];
        for (var i = 0; i < doc.dataSets.length; i++) { langues.push(doc.dataSets[i].name); }
        var artboards = [];
        for (var j = 0; j < doc.artboards.length; j++) { artboards.push(doc.artboards[j].name); }

        var LABEL_W = 120;

        var w = new Window("dialog", t("title"));
        w.orientation = "column";
        w.alignChildren = ["fill", "top"];
        w.margins = 16;
        w.spacing = 4;

        // Une ligne du formulaire : intitulé à gauche, options à droite
        function ligne(libelle, alignHaut) {
            var g = w.add("group");
            g.orientation = "row";
            g.alignChildren = ["left", alignHaut ? "top" : "center"];
            g.spacing = 10;
            var lab = g.add("group");
            lab.orientation = "column";
            lab.alignChildren = ["right", "top"];
            lab.spacing = 4;
            lab.preferredSize = [LABEL_W, -1];
            if (libelle !== "") {
                var st = lab.add("statictext", undefined, libelle);
                st.justify = "right";
                st.preferredSize = [LABEL_W, 20];
            }
            var c = g.add("group");
            c.orientation = "row";
            c.alignChildren = ["left", "center"];
            c.spacing = 10;
            return { label: lab, ctrl: c };
        }

        function separateur() {
            var l = w.add("panel", undefined, undefined);
            l.alignment = ["fill", "top"];
        }

        // --- Document et interface ---
        var rDoc = ligne(t("lbl_document"));
        var stDoc = rDoc.ctrl.add("statictext", undefined,
            doc.name + "  (" + (estCMYK ? "CMYK" : "RGB") + ")", { truncate: "middle" });
        stDoc.preferredSize = [330, 20];
        rDoc.ctrl.add("statictext", undefined, t("ui_lang"));
        var ddUI = rDoc.ctrl.add("dropdownlist", undefined, ["Français", "English"]);
        ddUI.selection = (UI === "en") ? 1 : 0;

        // --- Vérifications du fichier ---
        var rChk = ligne(t("lbl_check"), true);
        var etV = rChk.ctrl.add("edittext", undefined, verifierFichier().join("\n"),
            { multiline: true, readonly: true, scrollable: true });
        etV.preferredSize = [490, 64];
        var bReq = rChk.label.add("button", undefined, t("btn_reminder"));
        bReq.helpTip = t("tip_reminder");
        bReq.onClick = function () { alert(t("rappel")); };

        separateur();

        // --- Nom des fichiers ---
        var rNom = ligne(t("lbl_name"));
        rNom.ctrl.add("statictext", undefined, t("prefix"));
        var etPre = rNom.ctrl.add("edittext", undefined, cfg.prefix);
        etPre.characters = 10;
        rNom.ctrl.add("statictext", undefined, t("suffix"));
        var etSuf = rNom.ctrl.add("edittext", undefined, cfg.suffix);
        etSuf.characters = 10;

        var rCompo = ligne(t("lbl_compose"));
        var cbColor = rCompo.ctrl.add("checkbox", undefined, t("cb_color"));
        cbColor.value = cfg.addColor;
        cbColor.helpTip = t("tip_color");
        var cbLang = rCompo.ctrl.add("checkbox", undefined, t("cb_lang"));
        cbLang.value = cfg.addLang;
        cbLang.helpTip = t("tip_lang");
        var cbLower = rCompo.ctrl.add("checkbox", undefined, t("cb_lower"));
        cbLower.value = cfg.lower;
        cbLower.helpTip = t("tip_lower");

        var rEx = ligne(t("lbl_example"));
        var stPrev = rEx.ctrl.add("statictext", undefined, "");
        stPrev.preferredSize = [490, 20];

        separateur();

        // --- Formats (grisés selon le mode du document) ---
        var rF1 = ligne(t("lbl_fmt_cmyk"));
        var cbEPS = rF1.ctrl.add("checkbox", undefined, "EPS");
        cbEPS.value = estCMYK && cfg.eps;
        cbEPS.enabled = estCMYK;
        var cbPDF = rF1.ctrl.add("checkbox", undefined, t("cb_pdf"));
        cbPDF.value = estCMYK && cfg.pdf;
        cbPDF.enabled = estCMYK;
        var cbTrim = rF1.ctrl.add("checkbox", undefined, t("cb_trim"));
        cbTrim.value = cfg.trim;
        cbTrim.enabled = estCMYK;

        var rF2 = ligne(t("lbl_fmt_rgb"));
        var cbPNG = rF2.ctrl.add("checkbox", undefined, "PNG");
        cbPNG.value = !estCMYK && cfg.png;
        cbPNG.enabled = !estCMYK;
        var cbTransp = rF2.ctrl.add("checkbox", undefined, t("cb_transp"));
        cbTransp.value = cfg.transparent;
        cbTransp.enabled = !estCMYK;
        var ddPpi = rF2.ctrl.add("dropdownlist", undefined, ["72 ppi (1x)", "144 ppi (2x)", "300 ppi", "600 ppi"]);
        ddPpi.selection = cfg.ppiIndex;
        ddPpi.enabled = !estCMYK;

        var rF3 = ligne("");
        var cbSVG = rF3.ctrl.add("checkbox", undefined, "SVG");
        cbSVG.value = !estCMYK && cfg.svg;
        cbSVG.enabled = !estCMYK;
        var cbOutline = rF3.ctrl.add("checkbox", undefined, t("cb_outline"));
        cbOutline.value = cfg.outlineSvg;
        cbOutline.enabled = !estCMYK;

        separateur();

        // --- Sélection : langues et artboards côte à côte ---
        var rSel = ligne(t("lbl_select"), true);

        function colonneListe(titre, items) {
            var col = rSel.ctrl.add("group");
            col.orientation = "column";
            col.alignChildren = ["left", "top"];
            col.spacing = 4;
            col.add("statictext", undefined, titre);
            var lb = col.add("listbox", undefined, items, { multiselect: true });
            lb.preferredSize = [240, 100];
            for (var n = 0; n < lb.items.length; n++) { lb.items[n].selected = true; }
            var g = col.add("group");
            g.orientation = "row";
            var bAll = g.add("button", undefined, t("all"));
            var bNone = g.add("button", undefined, t("none"));
            bAll.onClick = function () { for (var n2 = 0; n2 < lb.items.length; n2++) { lb.items[n2].selected = true; } };
            bNone.onClick = function () { lb.selection = null; };
            return lb;
        }
        var lbL = colonneListe(t("lbl_langs"), langues);
        var lbA = colonneListe(t("lbl_artboards"), artboards);

        separateur();

        // --- Destination ---
        var rDir = ligne(t("lbl_folder"));
        var etDir = rDir.ctrl.add("edittext", undefined, cfg.folder);
        etDir.characters = 38;
        var bBrowse = rDir.ctrl.add("button", undefined, t("browse"));

        var rOrga = ligne(t("lbl_orga"));
        var ddOrga = rOrga.ctrl.add("dropdownlist", undefined, [t("orga0"), t("orga1"), t("orga2")]);
        ddOrga.selection = cfg.orga;
        ddOrga.helpTip = t("tip_orga");
        var cbSkip = rOrga.ctrl.add("checkbox", undefined, t("cb_skip"));
        cbSkip.value = cfg.skip;
        cbSkip.helpTip = t("tip_skip");

        separateur();

        // --- Contenu et options ---
        var rCont = ligne(t("lbl_content"));
        var cbCrop = rCont.ctrl.add("checkbox", undefined, t("cb_crop"));
        cbCrop.value = cfg.cropArt;
        cbCrop.helpTip = t("tip_crop");
        var cbBreak = rCont.ctrl.add("checkbox", undefined, t("cb_break"));
        cbBreak.value = cfg.breakSym;
        cbBreak.helpTip = t("tip_break");

        var rOpt = ligne(t("lbl_options"));
        var cbTest = rOpt.ctrl.add("checkbox", undefined, t("cb_test"));
        cbTest.value = false;
        cbTest.helpTip = t("tip_test");
        var cbOpen = rOpt.ctrl.add("checkbox", undefined, t("cb_open"));
        cbOpen.value = cfg.open;

        // --- Boutons ---
        var gB = w.add("group");
        gB.alignment = ["right", "top"];
        gB.add("button", undefined, t("cancel"), { name: "cancel" });
        var bOk = gB.add("button", undefined, t("run"), { name: "ok" });

        // --- Aperçu du nom ---
        function extensionApercu() {
            if (cbEPS.value) return "eps";
            if (cbPDF.value) return "pdf";
            if (cbPNG.value) return "png";
            if (cbSVG.value) return "svg";
            return "ext";
        }
        function majApercu() {
            var l = langues[0];
            if (lbL.selection && lbL.selection.length > 0) { l = lbL.selection[0].text; }
            var a = artboards[0];
            if (lbA.selection && lbA.selection.length > 0) { a = lbA.selection[0].text; }
            l = nettoyer(l);
            if (cbLower.value) { l = l.toLowerCase(); }
            stPrev.text = nomComplet(nettoyer(etPre.text), nettoyer(etSuf.text),
                cbColor.value, cbLang.value, a, l, extensionApercu());
        }
        etPre.onChanging = majApercu;
        etSuf.onChanging = majApercu;
        cbColor.onClick = majApercu;
        cbLang.onClick = majApercu;
        cbLower.onClick = majApercu;
        cbEPS.onClick = majApercu;
        cbPDF.onClick = majApercu;
        cbPNG.onClick = majApercu;
        cbSVG.onClick = majApercu;
        lbL.onChange = majApercu;
        lbA.onChange = majApercu;
        majApercu();

        bBrowse.onClick = function () {
            var f = Folder.selectDialog(t("browse_title"));
            if (f !== null) { etDir.text = f.fsName; }
        };

        // Lecture des valeurs du formulaire (sans validation)
        function lireFormulaire(dossierTexte) {
            var iLangues = [];
            if (lbL.selection) {
                for (var i2 = 0; i2 < lbL.selection.length; i2++) { iLangues.push(lbL.selection[i2].index); }
            }
            var iArtboards = [];
            if (lbA.selection) {
                for (var j2 = 0; j2 < lbA.selection.length; j2++) { iArtboards.push(lbA.selection[j2].index); }
            }
            return {
                ui: UI,
                prefix: nettoyer(etPre.text),
                suffix: nettoyer(etSuf.text),
                addColor: cbColor.value,
                addLang: cbLang.value,
                lower: cbLower.value,
                eps: cbEPS.value,
                pdf: cbPDF.value,
                png: cbPNG.value,
                svg: cbSVG.value,
                trim: cbTrim.value,
                transparent: cbTransp.value,
                ppiIndex: ddPpi.selection.index,
                outlineSvg: cbOutline.value,
                folder: dossierTexte,
                orga: ddOrga.selection.index,
                skip: cbSkip.value,
                open: cbOpen.value,
                cropArt: cbCrop.value,
                breakSym: cbBreak.value,
                test: cbTest.value,
                langues: iLangues,
                artboards: iArtboards
            };
        }

        var resultat = null;

        // Changement de langue de l'interface : on ferme et on rouvre dans l'autre langue
        ddUI.onChange = function () {
            var nouvelle = (ddUI.selection.index === 1) ? "en" : "fr";
            if (nouvelle === UI) { return; }
            resultat = lireFormulaire(etDir.text);
            resultat.switchUI = nouvelle;
            w.close(2);
        };

        bOk.onClick = function () {
            if (!(cbEPS.value || cbPDF.value || cbPNG.value || cbSVG.value)) {
                alert(t("err_format"));
                return;
            }
            if (!lbL.selection || lbL.selection.length === 0) {
                alert(t("err_lang"));
                return;
            }
            if (!lbA.selection || lbA.selection.length === 0) {
                alert(t("err_artboard"));
                return;
            }
            var dossier = new Folder(etDir.text);
            if (etDir.text === "" || !dossier.exists) {
                alert(t("err_folder"));
                return;
            }
            if (ddOrga.selection.index === 2 && !cbLang.value && lbL.selection.length > 1) {
                alert(t("err_flat"));
                return;
            }
            resultat = lireFormulaire(dossier.fsName);
            w.close(1);
        };

        w.show();
        return resultat;
    }

    // ------------------------------------------------------------------
    // Options d'export par format
    // ------------------------------------------------------------------
    function optionsEPS() {
        var o = new EPSSaveOptions();
        o.cmykPostScript = true;
        o.embedAllFonts = false;
        o.embedLinkedFiles = true;
        o.includeDocumentThumbnails = true;
        o.saveMultipleArtboards = false;
        o.preview = EPSPreview.COLORTIFF;
        o.postScript = EPSPostScriptLevelEnum.LEVEL3;
        try {
            o.compatibility = Compatibility.ILLUSTRATOR24;
        } catch (e1) {
            try { o.compatibility = Compatibility.ILLUSTRATOR17; } catch (e2) {}
        }
        return o;
    }

    function optionsPDF(cfg) {
        var p = new PDFSaveOptions();
        p.compatibility = PDFCompatibility.ACROBAT6;
        p.preserveEditability = false;
        p.generateThumbnails = true;
        p.viewAfterSaving = false;
        p.trimMarks = cfg.trim;
        return p;
    }

    function optionsPNG(cfg) {
        var o = new ExportOptionsPNG24();
        o.antiAliasing = true;
        o.artBoardClipping = true;
        o.transparency = cfg.transparent;
        if (!cfg.transparent) {
            o.matte = true;
            var blanc = new RGBColor();
            blanc.red = 255; blanc.green = 255; blanc.blue = 255;
            o.matteColor = blanc;
        }
        var echelle = PPI[cfg.ppiIndex] / 72 * 100;
        o.horizontalScale = echelle;
        o.verticalScale = echelle;
        return o;
    }

    // SVG : classe ExportOptionsSVG (pas SVGSaveOptions) avec exportFile + ExportType.SVG
    function optionsSVG(cfg) {
        var s = new ExportOptionsSVG();
        try { s.documentEncoding = SVGDocumentEncoding.UTF8; } catch (e1) {}
        try { s.cssProperties = SVGCSSPropertyLocation.PRESENTATIONATTRIBUTES; } catch (e2) {}
        try { s.embedRasterImages = true; } catch (e3) {}
        try { s.fontType = cfg.outlineSvg ? SVGFontType.OUTLINEFONT : SVGFontType.SVGFONT; } catch (e4) {}
        try { s.compressed = false; } catch (e5) {}
        return s;
    }

    // ------------------------------------------------------------------
    // Verrous et symboles
    // ------------------------------------------------------------------
    // Déverrouille calques et objets verrouillés (sinon la sélection native les ignore).
    // Seul l'état en mémoire change, rien n'est enregistré.
    function deverrouillerTout() {
        var calques = [];
        var objets = [];

        function parcourir(couches) {
            for (var i = 0; i < couches.length; i++) {
                var c = couches[i];
                try {
                    if (c.locked) { calques.push(c); c.locked = false; }
                    parcourir(c.layers);
                } catch (e) {}
            }
        }
        parcourir(doc.layers);

        try {
            for (var j = 0; j < doc.pageItems.length; j++) {
                var it = doc.pageItems[j];
                try {
                    if (it.locked) { objets.push(it); it.locked = false; }
                } catch (e2) {}
            }
        } catch (e3) {}

        return { calques: calques, objets: objets };
    }

    function reverrouillerTout(etat) {
        var i;
        for (i = 0; i < etat.objets.length; i++) {
            try { etat.objets[i].locked = true; } catch (e) {}
        }
        for (i = etat.calques.length - 1; i >= 0; i--) {
            try { etat.calques[i].locked = true; } catch (e2) {}
        }
    }

    // Casse le lien de toutes les instances de symboles d'un document (plusieurs passes
    // pour les symboles imbriqués). Retourne le nombre cassé, ou -1 si la fonction échoue.
    function casserSymboles(d) {
        var total = 0;
        for (var passe = 0; passe < 10; passe++) {
            var n = d.symbolItems.length;
            if (n === 0) { break; }
            for (var i = n - 1; i >= 0; i--) {
                try {
                    d.symbolItems[i].breakLink();
                    total++;
                } catch (e) {
                    return -1;
                }
            }
        }
        return total;
    }

    // ------------------------------------------------------------------
    // Programme principal
    // ------------------------------------------------------------------
    var cfg0 = chargerReglages();
    UI = cfg0.ui;

    if (doc.dataSets.length === 0) {
        alert(t("no_ds"));
        return;
    }

    var cfg = null;
    while (true) {
        var r = afficherDialogue(cfg0);
        if (r === null) { return; }
        if (r.switchUI) {
            for (var k in cfg0) {
                if (r.hasOwnProperty(k)) { cfg0[k] = r[k]; }
            }
            cfg0.ui = r.switchUI;
            UI = r.switchUI;
            continue;
        }
        cfg = r;
        break;
    }

    // Mémorise les réglages (sans le mode test ni les sélections)
    sauverReglages({
        ui: cfg.ui, prefix: cfg.prefix, suffix: cfg.suffix, addColor: cfg.addColor,
        addLang: cfg.addLang, lower: cfg.lower,
        eps: cfg.eps, pdf: cfg.pdf, png: cfg.png, svg: cfg.svg,
        trim: cfg.trim, transparent: cfg.transparent, ppiIndex: cfg.ppiIndex,
        outlineSvg: cfg.outlineSvg, folder: cfg.folder, orga: cfg.orga,
        skip: cfg.skip, open: cfg.open, cropArt: cfg.cropArt, breakSym: cfg.breakSym
    });

    var racine = new Folder(cfg.folder);

    var formats = [];
    if (cfg.eps) formats.push("eps");
    if (cfg.pdf) formats.push("pdf");
    if (cfg.png) formats.push("png");
    if (cfg.svg) formats.push("svg");

    var iLangues = cfg.langues;
    var iArtboards = cfg.artboards;
    if (cfg.test) {
        iLangues = [iLangues[0]];
        iArtboards = [iArtboards[0]];
    }

    var nomsLangues = [];
    for (var d = 0; d < doc.dataSets.length; d++) { nomsLangues.push(doc.dataSets[d].name); }
    var nomsArtboards = [];
    for (var a0 = 0; a0 < doc.artboards.length; a0++) { nomsArtboards.push(doc.artboards[a0].name); }

    // Journal
    var logFile = new File(racine.fsName + "/export_log.txt");
    logFile.encoding = "UTF-8";
    logFile.open("w");
    function log(txt) {
        logFile.writeln(txt);
        logFile.close();
        logFile.open("a");
    }
    log(t("log_doc", doc.name, estCMYK ? "CMYK" : "RGB"));
    log(t("log_formats", formats.join(", ")));
    log(t("log_counts", iLangues.length, iArtboards.length, cfg.test ? t("mode_test") : t("mode_full")));
    log(t("log_options", cfg.cropArt ? t("yes") : t("no"), cfg.breakSym ? t("yes") : t("no")));
    log("-----");

    // Fenêtre de progression
    var total = iLangues.length * iArtboards.length;
    var pw = new Window("palette", t("progress_title"));
    pw.orientation = "column";
    pw.alignChildren = ["fill", "top"];
    pw.pbar = pw.add("progressbar", undefined, 0, total);
    pw.pbar.preferredSize = [360, 12];
    pw.txt = pw.add("statictext", undefined, "");
    pw.txt.preferredSize = [360, 20];
    pw.show();

    function dossierFormat(langue, ext) {
        var chemin = racine.fsName;
        if (cfg.orga === 0) { chemin += "/" + langue; }
        if (cfg.orga === 1) { chemin += "/" + langue + "/" + ext; }
        return creerDossier(chemin);
    }

    var compteur = 0;
    var ignores = 0;
    var erreurs = [];
    var fait = 0;
    var espace = doc.documentColorSpace;

    // Les calques/objets verrouillés doivent être exportés : déverrouillage temporaire
    var verrous = deverrouillerTout();
    log(t("log_unlock", verrous.calques.length, verrous.objets.length));

    for (var l = 0; l < iLangues.length; l++) {
        var nomLangueBrut = nomsLangues[iLangues[l]];
        var langue = nettoyer(nomLangueBrut);
        if (cfg.lower) { langue = langue.toLowerCase(); }

        app.activeDocument = doc;
        doc.dataSets.getByName(nomLangueBrut).display();
        log(t("log_lang", langue));

        for (var a = 0; a < iArtboards.length; a++) {
            var idxA = iArtboards[a];
            var nomA = nomsArtboards[idxA];
            var nouveau = null;

            fait++;
            pw.pbar.value = fait;
            pw.txt.text = langue + "  /  " + nomA + "   (" + fait + "/" + total + ")";
            pw.update();

            // Formats à produire pour cet artboard (selon "ignorer l'existant")
            var aFaire = [];
            for (var f = 0; f < formats.length; f++) {
                var ext = formats[f];
                var nomF = nomComplet(cfg.prefix, cfg.suffix, cfg.addColor, cfg.addLang, nomA, langue, ext);
                var cible = new File(dossierFormat(langue, ext).fsName + "/" + nomF);
                if (cfg.skip && cible.exists) {
                    ignores++;
                    log(t("log_skipped", cible.name));
                } else {
                    aFaire.push({ ext: ext, fichier: cible });
                }
            }
            if (aFaire.length === 0) { continue; }

            try {
                app.activeDocument = doc;
                doc.artboards.setActiveArtboardIndex(idxA);
                doc.selectObjectsOnActiveArtboard();

                var sel = doc.selection;
                if (!sel || sel.length === 0) {
                    log(t("log_empty", langue, nomA));
                    erreurs.push(t("err_empty", langue, nomA));
                    continue;
                }

                var rectSrc = doc.artboards[idxA].artboardRect;
                var bornesSrc = bornesSelection(sel);
                var largeur = rectSrc[2] - rectSrc[0];
                var hauteur = rectSrc[1] - rectSrc[3];

                app.copy();

                nouveau = app.documents.add(espace, largeur, hauteur);
                app.paste();

                // Symboles : on casse le lien dans le nouveau document uniquement
                if (cfg.breakSym) {
                    var nbCasses = casserSymboles(nouveau);
                    if (nbCasses > 0) {
                        log(t("log_sym", nbCasses));
                        app.executeMenuCommand("selectall");
                    } else if (nbCasses < 0) {
                        log(t("log_sym_fail"));
                    }
                }

                var rectDst = nouveau.artboards[0].artboardRect;
                var selDst = nouveau.selection;
                var bornesDst = bornesSelection(selDst);
                var dx = (rectDst[0] + (bornesSrc[0] - rectSrc[0])) - bornesDst[0];
                var dy = (rectDst[1] - (rectSrc[1] - bornesSrc[1])) - bornesDst[1];
                for (var s = 0; s < selDst.length; s++) { selDst[s].translate(dx, dy); }

                // Crop to art : l'artboard épouse les limites du dessin
                if (cfg.cropArt) {
                    try {
                        nouveau.fitArtboardToSelectedArt(0);
                        var rc = nouveau.artboards[0].artboardRect;
                        largeur = rc[2] - rc[0];
                        hauteur = rc[1] - rc[3];
                    } catch (errCrop) {
                        log(t("log_crop_fail", errCrop));
                    }
                }

                for (var k2 = 0; k2 < aFaire.length; k2++) {
                    var job = aFaire[k2];
                    try {
                        if (job.ext === "eps") { nouveau.saveAs(job.fichier, optionsEPS()); }
                        if (job.ext === "pdf") { nouveau.saveAs(job.fichier, optionsPDF(cfg)); }
                        if (job.ext === "png") { nouveau.exportFile(job.fichier, ExportType.PNG24, optionsPNG(cfg)); }
                        if (job.ext === "svg") { nouveau.exportFile(job.fichier, ExportType.SVG, optionsSVG(cfg)); }
                        compteur++;
                        log(t("log_ok", job.fichier.name, Math.round(largeur), Math.round(hauteur)));
                    } catch (errFmt) {
                        log(t("log_err", job.fichier.name, errFmt));
                        erreurs.push(job.fichier.name + " : " + errFmt);
                    }
                }

                nouveau.close(SaveOptions.DONOTSAVECHANGES);
                nouveau = null;

            } catch (err) {
                log(t("log_err", langue + "/" + nomA, err));
                erreurs.push(langue + "/" + nomA + " : " + err);
                if (nouveau !== null) {
                    try { nouveau.close(SaveOptions.DONOTSAVECHANGES); } catch (eClose) {}
                }
            }
        }
    }

    pw.close();
    app.activeDocument = doc;
    doc.selection = null;
    reverrouillerTout(verrous);
    log(t("log_locks_restored"));

    log("-----");
    log(t("log_summary", compteur, ignores, erreurs.length));
    logFile.close();

    var msg = t("done", compteur, racine.fsName);
    if (ignores > 0) { msg += "\n" + t("done_skipped", ignores); }
    if (erreurs.length > 0) {
        msg += "\n\n" + t("done_errors", erreurs.length, erreurs.slice(0, 5).join("\n"));
    }
    if (cfg.test) {
        msg += "\n\n" + t("done_test");
    }
    alert(msg);

    if (cfg.open) { racine.execute(); }

})();
