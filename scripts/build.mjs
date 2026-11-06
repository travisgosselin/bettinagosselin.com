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
  const articles = await loadArticles(path.join(root, 'articles'), undefined, base);
  const staging = path.join(root, '.build-staging');
  const output = path.join(root, 'dist');
  await rm(staging, { recursive: true, force: true });
  try {
    await mkdir(staging, { recursive: true });
    await cp(path.join(root, 'src'), staging, { recursive: true, filter: (source) =>
      !source.includes(`${path.sep}templates`) && !source.endsWith('.gitkeep') });
    const partials = Object.fromEntries(await Promise.all(['header', 'footer', 'scripture', 'book_cta', 'marketplaces'].map(async (name) =>
      [name, await readFile(path.join(root, 'src/templates', `${name}.html`), 'utf8')])));
    const card = (article, home = false, latest = false) => `<article class="post-card${latest ? ' post-card--featured' : ''}">
      <p class="eyebrow">${latest ? 'Latest reflection <span aria-hidden="true">/</span> ' : ''}<time datetime="${article.date}">${esc(displayDate(article.date))}</time></p>
      <h${home ? '3' : '2'}><a href="${base}reflections/${article.slug}/">${esc(article.title)}</a></h${home ? '3' : '2'}>
      <p>${esc(article.excerpt)}</p>
      <a class="text-link" href="${base}reflections/${article.slug}/">Read the reflection <span aria-hidden="true">↗</span><span class="sr-only">: ${esc(article.title)}</span></a>
    </article>`;
    const globals = { base, origin, year: String(new Date().getUTCFullYear()) };
    const shared = { ...globals,
      ...Object.fromEntries(Object.entries(partials).map(([name, html]) => [name, render(html, globals)])),
      latest_posts: articles.slice(0, 5).map((article, index) => card(article, true, index === 0)).join('\n') || '<p>New reflections are on their way. Thank you for being here.</p>',
      article_list: articles.map((article) => card(article)).join('\n') || '<p>New reflections are on their way.</p>' };
    const expand = render;
    for (const file of await htmlFiles(staging)) {
      const relative = path.relative(staging, file).split(path.sep).join('/');
      const pageUrl = ['index.html', '404.html'].includes(relative) ? '' : relative.replace(/index\.html$/, '');
      const values = { ...shared, canonical: `${origin}${base}${pageUrl}` };
      await writeFile(file, expand(await readFile(file, 'utf8'), values));
    }
    const template = await readFile(path.join(root, 'src/templates/article.html'), 'utf8');
    const manifest = [];
    async function redirect(file, route, title) {
      const destination = `${base}${route}`;
      const location = path.join(staging, file);
      await mkdir(path.dirname(location), { recursive: true });
      await writeFile(location, `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta http-equiv="refresh" content="0;url=${destination}"><link rel="canonical" href="${esc(`${origin}${destination}`)}"><title>${esc(title)}</title></head><body><p>This page has moved: <a href="${destination}">${esc(title)}</a>.</p></body></html>`);
    }
    for (const article of articles) {
      const route = `reflections/${article.slug}/`;
      const directory = path.join(staging, route);
      await mkdir(directory, { recursive: true });
      await writeFile(path.join(directory, 'index.html'), expand(template, {
        ...shared, canonical: `${origin}${base}${route}`, title: esc(article.title),
        description: esc(article.description), date: article.date, display_date: esc(displayDate(article.date)),
        body: article.html,
      }));
      await redirect(`${article.slug}/index.html`, route, article.title);
      await redirect(`blog/${article.slug}/index.html`, route, article.title);
      manifest.push({ slug: article.slug, title: article.title, date: article.date, route, plainText: article.plainText });
    }
    await writeFile(path.join(staging, 'articles.json'), `${JSON.stringify(manifest, null, 2)}\n`);
    await redirect('the-book.html', 'anchor-of-truth/', 'Anchor of Truth');
    await redirect('my-story.html', 'story/', 'My Story');
    await redirect('blog/index.html', 'reflections/', 'My Reflections');
    const routes = ['', 'anchor-of-truth/', 'story/', 'reflections/', 'contact/', ...articles.map((a) => `reflections/${a.slug}/`)];
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
