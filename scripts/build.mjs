import { cp, mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { displayDate, escapeHtml as esc, loadArticles } from './content.mjs';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export function siteConfig(env = process.env) {
  const origin = env.SITE_ORIGIN ?? 'https://bettinagosselin.com';
  const url = new URL(origin);
  if (!['http:', 'https:'].includes(url.protocol) || url.pathname !== '/' || url.search || url.hash || url.username || url.password) {
    throw new Error('SITE_ORIGIN must be an HTTP(S) origin without a path or credentials');
  }
  let base = env.BASE_PATH ?? '/';
  if (!/^\/(?:[a-zA-Z0-9._-]+\/)*$/.test(base) || base.split('/').some((part) => part === '.' || part === '..')) {
    throw new Error('BASE_PATH must start/end with / and contain only safe path segments');
  }
  return { origin: url.origin, base };
}

export function render(template, values) {
  return template.replace(/\{\{([a-zA-Z_]+)\}\}/g, (_, key) => {
    if (!(key in values)) throw new Error(`Unknown template placeholder: ${key}`);
    return values[key];
  });
}

async function htmlFiles(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const location = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await htmlFiles(location));
    else if (entry.name.endsWith('.html')) result.push(location);
  }
  return result;
}

export async function build({ articlesOnly = false } = {}) {
  const { origin, base } = siteConfig();
  const articles = await loadArticles(path.join(root, 'articles'));
  const staging = path.join(root, '.build-staging');
  const output = path.join(root, 'dist');
  await rm(staging, { recursive: true, force: true });
  try {
    await mkdir(staging, { recursive: true });
    await cp(path.join(root, 'src'), staging, { recursive: true, filter: (source) =>
      !source.includes(`${path.sep}templates`) && !source.endsWith('.gitkeep') });
    const partials = Object.fromEntries(await Promise.all(['header', 'footer', 'scripture', 'book_cta'].map(async (name) =>
      [name, await readFile(path.join(root, 'src/templates', `${name}.html`), 'utf8')])));
    const card = (article, latest = false) => `<article class="post-card${latest ? ' post-card--featured' : ''}">
      <p class="eyebrow">${latest ? 'Latest reflection <span aria-hidden="true">/</span> ' : ''}<time datetime="${article.date}">${esc(displayDate(article.date))}</time></p>
      <h${latest ? '3' : '2'}><a href="${base}blog/${article.slug}/">${esc(article.title)}</a></h${latest ? '3' : '2'}>
      <p>${esc(article.excerpt)}</p>
      <a class="text-link" href="${base}blog/${article.slug}/">Read the reflection <span aria-hidden="true">↗</span><span class="sr-only">: ${esc(article.title)}</span></a>
    </article>`;
    const globals = { base, origin, year: String(new Date().getUTCFullYear()) };
    const shared = { ...globals,
      ...Object.fromEntries(Object.entries(partials).map(([name, html]) => [name, render(html, globals)])),
      latest_post: articles[0] ? card(articles[0], true) : '<p>New reflections are on their way. Thank you for being here.</p>',
      article_list: articles.map((article) => card(article)).join('\n') || '<p>New reflections are on their way.</p>' };
    const expand = render;
    for (const file of await htmlFiles(staging)) {
      const relative = path.relative(staging, file).split(path.sep).join('/');
      const pageUrl = relative === 'index.html' ? '' : relative.replace(/index\.html$/, '');
      const values = { ...shared, canonical: `${origin}${base}${pageUrl}` };
      await writeFile(file, expand(await readFile(file, 'utf8'), values));
    }
    const template = await readFile(path.join(root, 'src/templates/article.html'), 'utf8');
    const manifest = [];
    for (const article of articles) {
      const route = `blog/${article.slug}/`;
      const directory = path.join(staging, route);
      await mkdir(directory, { recursive: true });
      await writeFile(path.join(directory, 'index.html'), expand(template, {
        ...shared, canonical: `${origin}${base}${route}`, title: esc(article.title),
        description: esc(article.description), date: article.date, display_date: esc(displayDate(article.date)),
        body: article.html,
      }));
      const legacy = path.join(staging, article.slug);
      await mkdir(legacy, { recursive: true });
      await writeFile(path.join(legacy, 'index.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta http-equiv="refresh" content="0;url=${base}${route}"><link rel="canonical" href="${esc(`${origin}${base}${route}`)}"><title>${esc(article.title)}</title></head><body><p>This reflection has moved: <a href="${base}${route}">${esc(article.title)}</a>.</p></body></html>`);
      manifest.push({ slug: article.slug, title: article.title, date: article.date, route, plainText: article.plainText });
    }
    await writeFile(path.join(staging, 'articles.json'), `${JSON.stringify(manifest, null, 2)}\n`);
    const routes = ['', 'the-book.html', 'my-story.html', 'blog/', ...articles.map((a) => `blog/${a.slug}/`)];
    await writeFile(path.join(staging, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${routes.map((route) => `<url><loc>${esc(`${origin}${base}${route}`)}</loc></url>`).join('')}</urlset>\n`);
    await writeFile(path.join(staging, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${origin}${base}sitemap.xml\n`);
    await writeFile(path.join(staging, '.nojekyll'), '');
    await rm(output, { recursive: true, force: true });
    await rename(staging, output);
    console.log(`${articlesOnly ? 'Translated' : 'Built site with'} ${articles.length} articles → dist/ (base ${base})`);
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { await build({ articlesOnly: process.argv.includes('--articles') }); }
  catch (error) { console.error(`Build failed: ${error.message}`); process.exitCode = 1; }
}
