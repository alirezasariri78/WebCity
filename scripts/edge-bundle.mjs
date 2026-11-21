// Packs the built game (dist/) into one script for ArvanCloud Edge Computing:
//   npm run build:edge  →  dist-edge/bundle.js
//   arvan ec deploy -f dist-edge/bundle.js webcity
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

const DIST = 'dist';
const OUT = 'dist-edge';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

const files = (dir) =>
  readdirSync(dir).flatMap((name) => (statSync(join(dir, name)).isDirectory() ? files(join(dir, name)) : [join(dir, name)]));

const table = {};
for (const file of files(DIST)) {
  const path = `/${relative(DIST, file).replaceAll('\\', '/')}`;
  const type = TYPES[extname(file)] ?? 'application/octet-stream';
  const text = type.startsWith('text/') || type.includes('json') || type.includes('svg');
  table[path] = { type, text, body: readFileSync(file).toString(text ? 'utf8' : 'base64') };
}

const bundle = `const FILES = ${JSON.stringify(table)};
const decode = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

function handle(request) {
  const url = new URL(request.url);
  let path = url.pathname.replace(/\\/+$/, '') || '/';
  if (path === '/') path = '/index.html';
  const file = FILES[path] || (path.includes('.') ? null : FILES['/index.html']);
  if (!file) return new Response('Not found', { status: 404, headers: { 'content-type': 'text/plain' } });
  const cache = path.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache';
  return new Response(file.text ? file.body : decode(file.body), { headers: { 'content-type': file.type, 'cache-control': cache } });
}

addEventListener('fetch', (event) => event.respondWith(handle(event.request)));
`;

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'bundle.js'), bundle);
console.log(`${Object.keys(table).length} files → ${OUT}/bundle.js (${Math.round(bundle.length / 1024)} KB)`);
