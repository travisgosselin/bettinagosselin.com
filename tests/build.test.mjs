import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { parse } from 'yaml';
import { startServer } from '../scripts/serve.mjs';

test('build and local server support a Pages repository subpath', async () => {
  const env = { ...process.env, BASE_PATH: '/bettinagosselin.com/', SITE_ORIGIN: 'https://travisgosselin.github.io' };
  execFileSync(process.execPath, ['scripts/build.mjs'], { env });
  const originalBase = process.env.BASE_PATH;
  process.env.BASE_PATH = env.BASE_PATH;
  let server;
  try {
    server = await startServer({ port: 0 });
    const origin = `http://127.0.0.1:${server.address().port}`;
    const articles = JSON.parse(await readFile('dist/articles.json', 'utf8'));
    for (const route of ['', 'anchor-of-truth/', 'story/', 'reflections/', 'contact/', ...articles.map((article) => article.route)]) {
      const response = await fetch(`${origin}${env.BASE_PATH}${route}`);
      assert.equal(response.status, 200);
      const html = await response.text();
      assert.match(html, /href="\/bettinagosselin\.com\/assets\/css\/site\.css"/);
      for (const [, url] of html.matchAll(/(?:href|src)="(\/[^"]+)"/g)) {
        assert.ok(url.startsWith(env.BASE_PATH), `Incorrect subpath URL: ${url}`);
        assert.equal((await fetch(`${origin}${url}`)).status, 200, url);
      }
    }
    assert.equal((await fetch(`${origin}/`)).status, 404);
    assert.equal((await fetch(`${origin}${env.BASE_PATH}../package.json`)).status, 404);
    const sitemap = await readFile('dist/sitemap.xml', 'utf8');
    assert.match(sitemap, /https:\/\/travisgosselin.github.io\/bettinagosselin.com\/reflections\/studying-habakkuk\//);
    assert.match(sitemap, /\/anchor-of-truth\//);
    assert.match(sitemap, /\/contact\//);
    assert.doesNotMatch(sitemap, /\.html|\/blog\//);
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    if (originalBase === undefined) delete process.env.BASE_PATH;
    else process.env.BASE_PATH = originalBase;
    execFileSync(process.execPath, ['scripts/build.mjs'], { env: { ...process.env, BASE_PATH: '/' } });
  }
});

test('workflow publication is gated and PR renderer has no write access', async () => {
  const deploy = parse(await readFile('.github/workflows/deploy.yml', 'utf8'));
  assert.equal(deploy.jobs.publish.if, "vars.PAGES_ENABLED == 'true' && github.event.repository.private == false && github.ref == 'refs/heads/main'");
  assert.ok(deploy.jobs.publish.steps.some((step) => step.uses?.startsWith('actions/configure-pages@')));
  assert.ok(deploy.jobs.build.steps.every((step) => !step.uses?.includes('pages')));
  assert.deepEqual(deploy.on.push.branches, ['main']);
  const preview = parse(await readFile('.github/workflows/pr-preview.yml', 'utf8'));
  assert.deepEqual(preview.permissions, { contents: 'read' });
  assert.equal(preview.on.pull_request.paths, undefined);
  const comment = parse(await readFile('.github/workflows/pr-preview-comment.yml', 'utf8'));
  assert.equal(comment.jobs.comment.steps[0].with.ref, 'main');
  for (const file of [deploy, preview, comment]) {
    for (const job of Object.values(file.jobs)) {
      for (const step of job.steps) {
        if (step.uses) assert.match(step.uses, /@[a-f0-9]{40}$/);
      }
    }
  }
});
