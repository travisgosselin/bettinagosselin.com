import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseArticle, loadArticles, jpegSize } from '../scripts/content.mjs';
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
  ['reserved slug', valid.replace('slug: "a-story"', 'slug: "anchor-of-truth"')],
  ['future date', valid.replace('2025-11-17', '2099-11-17')],
  ['invalid calendar date', valid.replace('2025-11-17', '2025-02-30')],
  ['duplicate key', valid.replace('title: "A story"', 'title: "A story"\ntitle: "Other"')],
  ['unknown field', valid.replace('slug: "a-story"', 'slug: "a-story"\nscript: true')],
  ['unsafe link', valid.replace('A paragraph', '[bad](../secret)\nA paragraph')],
  ['article image', valid.replace('A paragraph', '![image](https://example.com/image.jpg)\nA paragraph')],
  ['traversal image', valid.replace('A paragraph', '![image](/assets/images/articles/../private.jpg)\nA paragraph')],
  ['image without alt text', valid.replace('A paragraph', '![](/assets/images/articles/photo.jpg)\nA paragraph')],
  ['empty body', valid.slice(0, valid.indexOf('\n\nA paragraph')) + '\n'],
]) {
  test(`rejects ${label}`, () => assert.throws(() => parse(input)));
}
test('raw HTML is escaped, not executed', () => {
  assert.match(parse(valid.replace('A paragraph', '<script>alert(1)</script>\nA paragraph')).html, /&lt;script&gt;/);
});
test('local article images honor the site base and stay out of prose excerpts', () => {
  const article = parseArticle(`${valid}\n![A lake at sunset](/assets/images/articles/a-beautiful-reminder.jpg)`, 'a-story.md', '2026-11-06', '/site/');
  assert.match(article.html, /src="\/site\/assets\/images\/articles\/a-beautiful-reminder.jpg"/);
  assert.match(article.html, /loading="lazy"/);
  assert.doesNotMatch(article.plainText, /A lake at sunset/);
  assert.doesNotMatch(article.excerpt, /A lake at sunset/);
  const imageFirst = parse(valid.replace('\n\nA paragraph', '\n\n![A lake at sunset](/assets/images/articles/a-beautiful-reminder.jpg)\n\nA paragraph'));
  assert.match(imageFirst.excerpt, /^A paragraph/);
  assert.doesNotMatch(imageFirst.excerpt, /A lake at sunset/);
  assert.throws(() => jpegSize(Buffer.from('not a JPEG')));
  assert.throws(() => jpegSize(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 20])));
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
  assert.deepEqual(posts.map((post) => post.slug), ['studying-habakkuk', 'thanksgiving-2024',
    'a-beautiful-reminder', '17-years-ago', 'my-journey-and-the-power-of-prayer',
    'reflections-on-good-friday', 'hope-amidst-natural-disasters']);
  assert.equal(posts.find((post) => post.slug === '17-years-ago').date, '2021-01-11');
  assert.equal(posts.find((post) => post.slug === 'my-journey-and-the-power-of-prayer').date, '2020-06-28');
  for (const post of posts) {
    const source = await readFile(`tests/fixtures/${post.slug}.txt`, 'utf8');
    assert.equal(post.plainText, source.replace(/\s+/g, ' ').trim());
    if (post.images.length) assert.match(post.html, /width="\d+" height="\d+"/);
  }
});
test('preview selection includes affected articles and supporting pages', () => {
  const posts = [{ slug: 'one', route: 'reflections/one/' }, { slug: 'two', route: 'reflections/two/' }];
  assert.deepEqual(selectRoutes(['articles/two.md'], posts), ['', 'reflections/', 'reflections/two/']);
  assert.deepEqual(selectRoutes(['articles/deleted.md'], posts), ['', 'reflections/']);
  assert.deepEqual(selectRoutes(['README.md'], posts), ['', 'anchor-of-truth/', 'story/', 'reflections/', 'contact/', 'reflections/one/']);
});
test('publisher rejects unbound or unsafe artifacts', () => {
  const identity = { repository: 'owner/repo', pr: 1, headSha: 'a'.repeat(40) };
  const manifest = { version: 1, ...identity, images: [{ file: 'home-desktop.png', route: '', viewport: 'desktop' }] };
  assert.equal(validateManifest(manifest, identity).length, 1);
  for (const route of ['anchor-of-truth/', 'story/', 'reflections/', 'contact/', 'reflections/a-story/']) {
    assert.equal(validateManifest({ ...manifest, images: [{ ...manifest.images[0], route }] }, identity).length, 1);
  }
  assert.throws(() => validateManifest({ ...manifest, images: [{ ...manifest.images[0], route: 'the-book.html' }] }, identity));
  assert.throws(() => validateManifest({ ...manifest, pr: 2 }, identity));
  assert.throws(() => validateManifest({ ...manifest, images: [{ ...manifest.images[0], file: '../escape.png' }] }, identity));
  assert.throws(() => validatePng(Buffer.from('<html>bad'), 'desktop'));
});
