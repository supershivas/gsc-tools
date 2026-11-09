/* Serveur statique minimal (module http intégré, aucune dépendance) : sert la racine du dépôt,
   comme GitHub Pages. Usage : `node tests/server.js [port]` (port 4173 par défaut, ou variable PORT). */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.icc': 'application/vnd.iccprofile', '.md': 'text/markdown; charset=utf-8',
};

function createServer() {
  return http.createServer((req, res) => {
    let file;
    try { file = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname)); } catch (e) { res.writeHead(400).end('Bad request'); return; }
    if (file !== ROOT && !file.startsWith(ROOT + path.sep)) { res.writeHead(403).end('Forbidden'); return; }
    fs.stat(file, (err, st) => {
      if (!err && st.isDirectory()) { file = path.join(file, 'index.html'); }
      fs.readFile(file, (err2, data) => {
        if (err2) { res.writeHead(404, { 'content-type': 'text/plain' }).end('Not found'); return; }
        res.writeHead(200, { 'content-type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' });
        res.end(data);
      });
    });
  });
}

module.exports = { createServer, ROOT };

if (require.main === module) {
  const port = Number(process.argv[2] || process.env.PORT || 4173);
  createServer().listen(port, '127.0.0.1', () => console.log(`Serveur statique : http://127.0.0.1:${port}/ (racine ${ROOT})`));
}
