import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseArticle, loadArticles } from '../scripts/content.mjs';
import { render, siteConfig } from '../scripts/build.mjs';
import { selectRoutes } from '../scripts/screenshots.mjs';
import { validateManifest, validatePng } from '../scripts/preview-validation.mjs';

const valid = `---\ntitle: "A story"\ndate: "2025-11-17"\nslug: "a-story"\nauthor: "Bettina Gosselin"\ndescription: "A description"\n---\n\nA paragraph with “original punctuation.”  \nAnd an intentional break.\n`;
const parse = (input = valid) => parseArticle(input, 'a-story.md', '2026-11-06');
test('preserves wording, punctuation and hard breaks', () => {
  const article = parse();
  assert.match(article.html, /“original punctuation.”<br>/);
  assert.match(article.plainText, /And an intentional break/);
});
for (const [label, input] of [
  ['missing slug', valid.replace('slug: "a-story"\n', '')],
  ['mismatched slug', valid.replace('slug: "a-story"', 'slug: "different"')],
  ['traversal slug', valid.replace('slug: "a-story"', 'slug: "../a-story"')],
  ['future date', valid.replace('2025-11-17', '2099-11-17')],
  ['invalid calendar date', valid.replace('2025-11-17', '2025-02-30')],
  ['duplicate key', valid.replace('title: "A story"', 'title: "A story"\ntitle: "Other"')],
  ['unknown field', valid.replace('slug: "a-story"', 'slug: "a-story"\nscript: true')],
  ['unsafe link', valid.replace('A paragraph', '[bad](../secret)\nA paragraph')],
  ['article image', valid.replace('A paragraph', '![image](https://example.com/image.jpg)\nA paragraph')],
  ['empty body', valid.slice(0, valid.indexOf('\n\nA paragraph')) + '\n'],
]) {
  test(`rejects ${label}`, () => assert.throws(() => parse(input)));
}
test('raw HTML is escaped, not executed', () => {
  assert.match(parse(valid.replace('A paragraph', '<script>alert(1)</script>\nA paragraph')).html, /&lt;script&gt;/);
});
test('slug does not change when title changes', () => assert.equal(parse(valid.replace('A story', 'Another title')).slug, 'a-story'));
test('only approved source URL protocols', () => {
  assert.throws(() => parse(valid.replace('---\n\n', 'source_url: "javascript:alert(1)"\n---\n\n')));
});
test('template values are substituted without evaluating expressions', () => {
  assert.equal(render('Hello {{body}}', { body: '{{unchanged}}' }), 'Hello {{unchanged}}');
  assert.throws(() => render('{{missing}}', {}));
});
test('base paths are explicit and safe', () => {
  assert.equal(siteConfig({ BASE_PATH: '/bettinagosselin.com/' }).base, '/bettinagosselin.com/');
  for (const base of ['../foo', '/a/../', '//', '/foo']) assert.throws(() => siteConfig({ BASE_PATH: base }));
  assert.throws(() => siteConfig({ SITE_ORIGIN: 'https://example.com/path' }));
});
test('real articles are newest first and preserve source text', async () => {
  const posts = await loadArticles('articles', '2026-11-06');
  assert.deepEqual(posts.map((post) => post.slug), ['studying-habakkuk', 'thanksgiving-2024']);
  for (const post of posts) {
    const source = await readFile(`tests/fixtures/${post.slug}.txt`, 'utf8');
    assert.equal(post.plainText, source.replace(/\s+/g, ' ').trim());
  }
});
test('preview selection includes affected articles and supporting pages', () => {
  const posts = [{ slug: 'one', route: 'blog/one/' }, { slug: 'two', route: 'blog/two/' }];
  assert.deepEqual(selectRoutes(['articles/two.md'], posts), ['', 'blog/', 'blog/two/']);
  assert.deepEqual(selectRoutes(['articles/deleted.md'], posts), ['', 'blog/']);
  assert.deepEqual(selectRoutes(['README.md'], posts), ['', 'the-book.html', 'my-story.html', 'blog/', 'blog/one/']);
});
test('publisher rejects unbound or unsafe artifacts', () => {
  const identity = { repository: 'owner/repo', pr: 1, headSha: 'a'.repeat(40) };
  const manifest = { version: 1, ...identity, images: [{ file: 'home-desktop.png', route: '', viewport: 'desktop' }] };
  assert.equal(validateManifest(manifest, identity).length, 1);
  assert.throws(() => validateManifest({ ...manifest, pr: 2 }, identity));
  assert.throws(() => validateManifest({ ...manifest, images: [{ ...manifest.images[0], file: '../escape.png' }] }, identity));
  assert.throws(() => validatePng(Buffer.from('<html>bad'), 'desktop'));
});
