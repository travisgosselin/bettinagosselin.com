import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import MarkdownIt from 'markdown-it';
import { parseDocument } from 'yaml';

const markdown = new MarkdownIt({ html: false, breaks: false, typographer: false });
const fields = ['title', 'date', 'slug', 'author', 'description', 'source_url'];
export const escapeHtml = (value) => String(value).replace(/[&<>"']/g,
  (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

export function todayToronto() {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Toronto', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date()).map(({ type, value }) => [type, value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function parseArticle(source, filename, today = todayToronto()) {
  const match = source.replace(/\r\n/g, '\n').match(/^---\n([\s\S]*?)\n---\n([\s\S]+)$/);
  if (!match) throw new Error(`${filename}: expected YAML frontmatter and article body`);
  const document = parseDocument(match[1], { uniqueKeys: true });
  if (document.errors.length) throw new Error(`${filename}: ${document.errors[0].message}`);
  const data = document.toJS({ maxAliasCount: 0 });
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error(`${filename}: invalid metadata`);
  for (const key of Object.keys(data)) {
    if (!fields.includes(key)) throw new Error(`${filename}: unknown frontmatter field "${key}"`);
  }
  for (const field of fields.filter((key) => key !== 'source_url')) {
    if (typeof data[field] !== 'string' || !data[field].trim()) {
      throw new Error(`${filename}: "${field}" must be a nonempty string`);
    }
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.slug) || data.slug.length > 100) {
    throw new Error(`${filename}: invalid slug`);
  }
  if (path.basename(filename, '.md') !== data.slug) throw new Error(`${filename}: filename must match slug`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date) ||
      Number.isNaN(Date.parse(`${data.date}T12:00:00Z`)) ||
      new Date(`${data.date}T12:00:00Z`).toISOString().slice(0, 10) !== data.date) {
    throw new Error(`${filename}: date must be a valid YYYY-MM-DD string`);
  }
  if (data.date > today) throw new Error(`${filename}: future publication dates are not supported`);
  if (data.author !== 'Bettina Gosselin') throw new Error(`${filename}: unexpected author`);
  if (data.source_url !== undefined) {
    if (typeof data.source_url !== 'string' || !URL.canParse(data.source_url) ||
        new URL(data.source_url).protocol !== 'https:') throw new Error(`${filename}: invalid source_url`);
  }
  const body = match[2].trim();
  if (!body) throw new Error(`${filename}: article body is empty`);
  const tokens = markdown.parse(body, {});
  const prose = [];
  function inspect(items) {
    for (const token of items) {
      if (token.type === 'image') throw new Error(`${filename}: article images are not supported yet; request an asset review`);
      if (token.type === 'link_open') {
        const href = token.attrGet('href');
        if (!/^(https?:\/\/|mailto:|#)/i.test(href ?? '')) {
          throw new Error(`${filename}: only HTTP(S), mailto, and fragment article links are supported`);
        }
      }
      if (token.type === 'text' || token.type === 'code_inline') prose.push(token.content);
      if (token.type === 'softbreak' || token.type === 'hardbreak') prose.push(' ');
      if (token.children) inspect(token.children);
    }
  }
  inspect(tokens);
  const plainText = prose.join(' ').replace(/\s+/g, ' ').trim();
  const firstParagraph = tokens.find((token) => token.type === 'inline')?.children ?? [];
  const excerpt = firstParagraph.map((token) => token.type.endsWith('break') ? ' ' : token.content)
    .join('').replace(/\s+/g, ' ').trim();
  const shortExcerpt = excerpt.length > 240 ? `${excerpt.slice(0, 237).replace(/\s+\S*$/, '')}…` : excerpt;
  return { ...data, body, html: markdown.render(body), plainText, excerpt: shortExcerpt };
}

export async function loadArticles(directory, today) {
  const articles = [];
  for (const filename of (await readdir(directory)).filter((name) => name.endsWith('.md')).sort()) {
    articles.push(parseArticle(await readFile(path.join(directory, filename), 'utf8'), filename, today));
  }
  const slugs = new Set();
  for (const article of articles) {
    if (slugs.has(article.slug)) throw new Error(`Duplicate article slug: ${article.slug}`);
    slugs.add(article.slug);
  }
  return articles.sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
}

export function displayDate(date) {
  return new Intl.DateTimeFormat('en-CA', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));
}
