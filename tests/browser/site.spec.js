import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const pages = ['/', '/the-book.html', '/my-story.html', '/blog/',
  '/blog/studying-habakkuk/', '/blog/thanksgiving-2024/'];
const normalize = (text) => text.replace(/\s+/g, ' ').trim();

for (const route of pages) {
  test(`${route} is readable, responsive and self-contained`, async ({ page }) => {
    const failures = [];
    page.on('pageerror', (error) => failures.push(error.message));
    page.on('response', (response) => { if (response.status() >= 400) failures.push(response.url()); });
    const requests = [];
    page.on('request', (request) => requests.push(request.url()));
    await page.goto(route);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    expect(await page.title()).not.toBe('');
    await page.evaluate(async () => {
      for (const image of document.images) { image.loading = 'eager'; await image.decode(); }
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect(failures).toEqual([]);
    expect(requests.every((url) => new URL(url).hostname === '127.0.0.1')).toBe(true);
  });
}
for (const slug of ['studying-habakkuk', 'thanksgiving-2024']) {
  test(`${slug} renders the complete unchanged original text`, async ({ page }) => {
    await page.goto(`/blog/${slug}/`);
    const original = await readFile(`tests/fixtures/${slug}.txt`, 'utf8');
    expect(normalize(await page.locator('.article-body').innerText())).toBe(normalize(original));
  });
}
test('local links and images resolve', async ({ page, request }) => {
  const urls = new Set();
  for (const route of pages) {
    await page.goto(route);
    for (const url of await page.locator('a[href], img[src], link[rel="stylesheet"], link[rel="icon"]').evaluateAll((nodes) =>
      nodes.map((node) => node.href || node.src))) {
      if (new URL(url).origin === 'http://127.0.0.1:4322') urls.add(url.split('#')[0]);
    }
  }
  for (const url of urls) expect((await request.get(url)).status(), url).toBe(200);
});
test('skip link and main navigation work without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4322');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.locator('header nav').getByRole('link', { name: 'Blog' }).click();
  await expect(page).toHaveURL(/\/blog\/$/);
  await page.getByRole('heading', { name: 'Studying Habakkuk' }).getByRole('link').click();
  await expect(page.locator('h1')).toHaveText('Studying Habakkuk');
  await context.close();
});
test('no overflow at 320px or 200% desktop zoom-equivalent width', async ({ page }) => {
  for (const width of [320, 720]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of pages) {
      await page.goto(route);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${route} at ${width}`).toBe(true);
    }
  }
});
test('original WordPress article paths remain usable', async ({ page }) => {
  await page.goto('/studying-habakkuk/');
  await expect(page).toHaveURL(/\/blog\/studying-habakkuk\/$/);
});
