import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { siteConfig } from './build.mjs';

export async function startServer({ port = Number(process.env.PORT ?? 4321) } = {}) {
  const directory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
  await stat(path.join(directory, 'index.html'));
  const { base } = siteConfig();
  const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.jpg': 'image/jpeg',
    '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.xml': 'application/xml', '.txt': 'text/plain' };
  const server = createServer(async (request, response) => {
    try {
      if (!['GET', 'HEAD'].includes(request.method)) {
        response.writeHead(405, { Allow: 'GET, HEAD' }).end(); return;
      }
      const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      if (!pathname.startsWith(base)) { response.writeHead(404).end('Not found'); return; }
      let file = path.resolve(directory, pathname.slice(base.length));
      if (!file.startsWith(`${directory}${path.sep}`) && file !== directory) {
        response.writeHead(403).end('Forbidden'); return;
      }
      if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
      const body = await readFile(file);
      response.writeHead(200, { 'Content-Type': types[path.extname(file)] ?? 'application/octet-stream',
        'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' });
      response.end(request.method === 'HEAD' ? undefined : body);
    } catch (error) {
      if (['ENOENT', 'ENOTDIR', 'EISDIR'].includes(error.code)) response.writeHead(404).end('Not found');
      else if (error instanceof URIError) response.writeHead(400).end('Invalid URL');
      else { console.error(error); response.writeHead(500).end('Server error'); }
    }
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });
  console.log(`Serving dist/ at http://127.0.0.1:${server.address().port}${base}`);
  return server;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { await startServer(); }
  catch (error) { console.error(`Server failed: ${error.message}. Run npm run build first.`); process.exitCode = 1; }
}
