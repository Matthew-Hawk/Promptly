// Test-only server and fixtures. Never published with dist/.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../dist');
http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/checks.html') {
    res.setHeader('Content-Type', 'text/html');
    res.end(fs.readFileSync(path.resolve(__dirname, '../tests/browser.html')));
    return;
  }
  if (url.pathname === '/fixture.html') {
    let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    if (url.searchParams.has('clipboard-failure')) html = html.replace('<script type="module"', '<script>Object.defineProperty(navigator, "clipboard", {value: {writeText: async () => {throw new Error("Test permission denial");}}});</script><script type="module"');
    res.setHeader('Content-Type', 'text/html');
    res.end(html);
    return;
  }
  const file = path.resolve(root, '.' + url.pathname);
  if (!file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (error, content) => {
    if (error) { res.writeHead(404); res.end(); return; }
    res.setHeader('Content-Type', ({ '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' })[path.extname(file)] || 'application/octet-stream');
    res.end(content);
  });
}).listen(5175, '127.0.0.1', () => console.log('Isolated browser checks: http://127.0.0.1:5175/checks.html'));
