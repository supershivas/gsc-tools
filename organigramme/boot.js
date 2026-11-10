/* Démarrage : lit la version puis charge CSS et modules avec ?v=<version>, pour que le cache de
   GitHub Pages (10 min) ne mêle jamais anciens et nouveaux fichiers après une mise à jour.
   Les modules s’importent par des noms (« org/… », « gsc/… ») résolus ici par une import map :
   TOUT nouveau module de js/ doit être ajouté à MODULES (scripts/verifier.mjs le contrôle). */
(function () {
  var MODULES = ['main.js', 'model.js', 'layout.js', 'theme.js', 'render.js', 'store.js', 'pdf.js'];
  var SHELL = ['shell.js', 'dialog.js'];
  var CSS = ['../css/tokens.css', '../css/mobile.css', '../css/shell.css', 'css/organigramme.css'];

  function start(version) {
    var q = version ? '?v=' + encodeURIComponent(version) : '';
    var imports = {};
    MODULES.forEach(function (m) { imports['org/' + m] = new URL('js/' + m + q, document.baseURI).href; });
    SHELL.forEach(function (m) { imports['gsc/' + m] = new URL('../js/' + m + q, document.baseURI).href; });
    var map = document.createElement('script');
    map.type = 'importmap';
    map.textContent = JSON.stringify({ imports: imports });
    document.head.appendChild(map);

    var pending = CSS.length;
    var show = function () { if (--pending <= 0) document.documentElement.classList.remove('booting'); };
    CSS.forEach(function (href) {
      var link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href + q;
      link.onload = link.onerror = show;
      document.head.appendChild(link);
    });

    var main = document.createElement('script');
    main.type = 'module';
    main.src = imports['org/main.js'];
    var run = function () { document.body.appendChild(main); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
    else run();
  }

  fetch('../version.json', { cache: 'no-store' })
    .then(function (r) { return r.json(); })
    .then(function (j) { start(j.version); }, function () { start(''); });
})();
