import { execFileSync } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { startServer } from './serve.mjs';
import { siteConfig } from './build.mjs';

export function selectRoutes(changes, articles) {
  const main = ['', 'anchor-of-truth/', 'story/', 'reflections/', 'contact/'];
  const articleOnly = changes.length > 0 && changes.every((file) => file.startsWith('articles/'));
  const changedSlugs = new Set(changes.filter((file) => /^articles\/[^/]+\.md$/.test(file))
    .map((file) => file.slice('articles/'.length, -3)));
  const changed = articles.filter((article) => changedSlugs.has(article.slug)).map((article) => article.route);
  return [...new Set(articleOnly
    ? ['', 'reflections/', ...changed]
    : [...main, ...(articles[0] ? [articles[0].route] : []), ...changed])];
}

async function main() {
  const articles = JSON.parse(await readFile('dist/articles.json', 'utf8'));
  const baseSha = process.env.PREVIEW_BASE_SHA;
  const headSha = process.env.PREVIEW_HEAD_SHA ?? execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  for (const sha of [baseSha, headSha].filter(Boolean)) {
    if (!/^[a-f0-9]{40}$/.test(sha)) throw new Error('Invalid preview commit SHA');
  }
  const changes = baseSha
    ? execFileSync('git', ['diff', '--name-only', `${baseSha}...${headSha}`], { encoding: 'utf8' }).trim().split('\n').filter(Boolean)
    : [];
  const routes = selectRoutes(changes, articles);
  const directory = 'screenshots';
  await rm(directory, { recursive: true, force: true });
  await mkdir(directory);
  const server = await startServer({ port: 0 });
  let browser;
  try {
    browser = await chromium.launch();
    const port = server.address().port;
    const { base } = siteConfig();
    const localOrigin = `http://127.0.0.1:${port}`;
    const images = [];
    for (const [viewport, width] of [['desktop', 1440], ['mobile', 390]]) {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, deviceScaleFactor: 1,
        locale: 'en-CA', timezoneId: 'America/Toronto', reducedMotion: 'reduce', serviceWorkers: 'block' });
      await context.route('**/*', (route) => new URL(route.request().url()).origin === localOrigin ? route.continue() : route.abort());
      try {
        for (const route of routes) {
          const page = await context.newPage();
          const errors = [];
          page.on('pageerror', (error) => errors.push(error.message));
          page.on('response', (response) => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
          const response = await page.goto(`${localOrigin}${base}${route}`, { waitUntil: 'networkidle' });
          if (!response?.ok()) throw new Error(`Preview failed for ${route}`);
          await page.evaluate(async () => {
            await document.fonts.ready;
            for (const image of document.images) {
              image.loading = 'eager';
              await image.decode();
            }
          });
          if (errors.length) throw new Error(errors.join('\n'));
          const file = `${route.replace(/[^a-z0-9]+/g, '-') || 'home'}-${viewport}.png`;
          await page.screenshot({ path: `${directory}/${file}`, fullPage: true, animations: 'disabled' });
          images.push({ file, route, viewport });
          await page.close();
        }
      } finally { await context.close(); }
    }
    const pr = Number(process.env.PREVIEW_PR ?? 0);
    await writeFile(`${directory}/manifest.json`, JSON.stringify({
      version: 1, repository: process.env.GITHUB_REPOSITORY ?? 'travisgosselin/bettinagosselin.com',
      pr, headSha, images,
    }, null, 2));
    console.log(`Captured ${images.length} full-page screenshots in screenshots/`);
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

if (process.argv[1]?.endsWith('/screenshots.mjs') || process.argv[1] === 'scripts/screenshots.mjs') {
  main().catch((error) => { console.error(`Screenshots failed: ${error.message}`); process.exitCode = 1; });
}
