import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const articles = JSON.parse(await readFile('dist/articles.json', 'utf8'));
const archive = JSON.parse(await readFile('tests/fixtures/wordpress-archive.json', 'utf8'));
const pages = ['/', '/anchor-of-truth/', '/story/', '/reflections/', '/contact/',
  ...articles.map((article) => `/${article.route}`)];
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
    await expect(page.locator('header nav a')).toHaveText(['My Book', 'My Story', 'Reflections', 'Contact']);
    const links = await page.locator('a[href], link[rel="canonical"], meta[property="og:url"]').evaluateAll((nodes) =>
      nodes.map((node) => node.href || node.content));
    expect(links.every((url) => !new URL(url).pathname.endsWith('.html'))).toBe(true);
    expect(await page.title()).not.toBe('');
    await page.evaluate(async () => {
      for (const image of document.images) { image.loading = 'eager'; await image.decode(); }
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect(failures).toEqual([]);
    expect(requests.every((url) => new URL(url).hostname === '127.0.0.1')).toBe(true);
  });
}
for (const { slug } of archive.articles) {
  test(`${slug} renders the complete unchanged original text`, async ({ page }) => {
    await page.goto(`/reflections/${slug}/`);
    const original = await readFile(`tests/fixtures/${slug}.txt`, 'utf8');
    expect(normalize(await page.locator('.article-body').innerText())).toBe(normalize(original));
  });
}
test('reflections index lists every published article in publication order', async ({ page }) => {
  await page.goto('/reflections/');
  await expect(page.locator('.blog-list .post-card')).toHaveCount(articles.length);
  await expect(page.locator('.blog-list .post-card h3')).toHaveText(articles.map((article) => article.title));
});
test('year navigation has accurate nonempty buckets and adapts to the viewport', async ({ page }) => {
  await page.goto('/reflections/');
  const years = [...new Set(articles.map((article) => article.date.slice(0, 4)))];
  const navigation = page.getByRole('navigation', { name: 'Browse by year' });
  await expect(navigation.getByRole('link')).toHaveCount(years.length);
  await expect(page.locator('.archive-year-heading')).toHaveCount(years.length);
  let total = 0;
  for (const year of years) {
    const posts = articles.filter((article) => article.date.startsWith(year));
    total += posts.length;
    const label = `${year}, ${posts.length} reflection${posts.length === 1 ? '' : 's'}`;
    await expect(navigation.getByRole('link', { name: label, exact: true })).toHaveAttribute('href', `#year-${year}`);
    const section = page.locator(`section[aria-labelledby="year-${year}"]`);
    await expect(section.locator('.post-card h3')).toHaveText(posts.map((article) => article.title));
  }
  expect(total).toBe(articles.length);
  for (const width of [320, 760, 761, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    const sidebar = await page.locator('.archive-sidebar').boundingBox();
    const list = await page.locator('.blog-list').boundingBox();
    if (width > 760) expect(sidebar.x).toBeGreaterThanOrEqual(list.x + list.width);
    else expect(sidebar.y + sidebar.height).toBeLessThanOrEqual(list.y);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});
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
test('skip link and main navigation work without JavaScript', async ({ browser }, testInfo) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: testInfo.project.use.viewport, reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4322');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.locator('header nav').getByRole('link', { name: 'Reflections' }).click();
  await expect(page).toHaveURL(/\/reflections\/$/);
  const oldestYear = articles.at(-1).date.slice(0, 4);
  await page.getByRole('navigation', { name: 'Browse by year' })
    .getByRole('link', { name: new RegExp(`^${oldestYear},`) }).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(new RegExp(`/reflections/#year-${oldestYear}$`));
  await expect(page.locator(`#year-${oldestYear}`)).toBeFocused();
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
test('home shows exactly the latest five reflections in publication order', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.recent-reflections .post-card')).toHaveCount(5);
  await expect(page.locator('.recent-reflections h3')).toHaveText(articles.slice(0, 5).map((article) => article.title));
  expect(await page.locator('.recent-reflections time').evaluateAll((nodes) => nodes.map((node) => node.dateTime)))
    .toEqual(articles.slice(0, 5).map((article) => article.date));
});
test('book offers Canada first with direct US and Mexico marketplace links', async ({ page }) => {
  await page.goto('/anchor-of-truth/');
  const links = page.locator('.hero .marketplaces');
  await expect(links.locator('a').first()).toHaveAttribute('href', 'https://www.amazon.ca/dp/B0CCCMRP1S');
  await expect(links.getByRole('link', { name: /United States/ })).toHaveAttribute('href', 'https://www.amazon.com/dp/B0CCCMRP1S');
  await expect(links.getByRole('link', { name: /Mexico/ })).toHaveAttribute('href', 'https://www.amazon.com.mx/dp/B0CCCMRP1S');
});
test('contact is a social directory, not a contact form', async ({ page }) => {
  await page.goto('/contact/');
  await expect(page.locator('form, input, textarea')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Bettina on LinkedIn' })).toHaveAttribute('href', 'https://ca.linkedin.com/in/bettina-gosselin-3146a133b');
  await expect(page.getByRole('link', { name: 'Find Bettina on Facebook' })).toHaveAttribute('href', 'https://www.facebook.com/search/top?q=Bettina%20Gosselin');
});
test('original WordPress and initial site paths redirect to clean URLs', async ({ page }) => {
  for (const [legacy, current] of [
    ['/the-book.html', '/anchor-of-truth/'], ['/my-story.html', '/story/'], ['/blog/', '/reflections/'],
    ...articles.flatMap(({ slug }) => [[`/${slug}/`, `/reflections/${slug}/`], [`/blog/${slug}/`, `/reflections/${slug}/`]]),
  ]) {
    await page.goto(legacy);
    await expect(page).toHaveURL(`http://127.0.0.1:4322${current}`);
  }
});
