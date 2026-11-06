<div align="center">
  <a href="https://www.amazon.ca/dp/B0CCCMRP1S">
    <img src="src/assets/images/book-cover.jpg" alt="Anchor of Truth by Bettina Gosselin" width="145">
  </a>
  <h1>Bettina Gosselin</h1>
  <p><strong>Faith for the journey. Hope for the heart.</strong></p>
  <p>A thoughtfully built author website for <em>Anchor of Truth:<br>From the Pit of Despair to Glorious Light.</em></p>
  <p><a href="#quick-start">Run locally</a> · <a href="#add-a-reflection">Add an article</a> · <a href="#workflows">Workflows</a> · <a href="design/decisions.md">Design decisions</a></p>
</div>

---

An ocean-inspired, responsive home for Bettina's book, her story, and reflections
on Scripture and everyday life. Built with plain HTML and CSS, a small Markdown
compiler, and **no browser JavaScript, database, or runtime service**.

**Private development:** GitHub Pages remains disabled. This source is ready for
local review; pushing to `main` checks and packages the site, but does not publish
it. WordPress and DNS are unchanged. Biography/marketing copy still needs final
owner review before launch.

## Quick start

Use **Node.js 24 LTS** and npm. An `.nvmrc` is included for Node version managers.

```bash
npm ci
npm run build
npm start
```

Open **http://127.0.0.1:4321**. The server serves only `dist/` and binds to your
local machine. Stop it with `Ctrl+C`.

| Command | What it does |
| --- | --- |
| `npm run articles` | Translate Markdown posts and refresh the full static output, including listing/latest post |
| `npm run build` | Package all HTML, articles, metadata, CSS, and images into `dist/` |
| `npm start` | Serve the existing `dist/` locally on port 4321; does not build |
| `npm run dev` | Build once, then start the local server |
| `npm run check` | Validate compiler behavior, original article text, preview selection, and artifact safeguards |
| `npm run browser:install` | Install Chromium for browser checks and screenshots |
| `npm test` | Run checks, rebuild, and test desktop/mobile pages in Chromium |
| `npm run screenshots` | Capture full-page desktop/mobile previews into ignored `screenshots/` |

`npm run articles` and `npm run build` intentionally use the same pipeline:
article HTML, the listing, and the homepage cannot drift out of sync. Neither
command edits Markdown or writes generated files into `src/`.

After editing HTML, CSS, or Markdown, run `npm run build` again and refresh your
browser. There is no watcher or hot-reload dependency. If port 4321 is occupied:

```bash
PORT=4323 npm start
```

The compiler rejects invalid content and leaves the previous successful `dist/`
in place on validation errors. Read the command's error output before previewing.

## Add a reflection

Create `articles/your-article-slug.md`:

```markdown
---
title: "A Quiet Reminder"
date: "2026-11-06"
slug: "a-quiet-reminder"
author: "Bettina Gosselin"
description: "A short, plain-language description for search and sharing."
---

The author's original opening paragraph goes here.

Another paragraph, with *italic emphasis* if needed.
```

1. **Name it:** the filename must match the explicit `slug`. Slugs use lowercase
   letters, numbers, and single hyphens; they must be unique.
2. **Date it:** use a real quoted `YYYY-MM-DD` publication date. Future dates
   are rejected, using `America/Toronto` as the publication calendar.
3. **Keep the words:** preserve the author's wording, punctuation, paragraphs,
   quotations, and attribution. Markdown controls formatting, not rewriting.
4. **Preview it:** run `npm run articles`, then `npm start`, and visit
   `/reflections/a-quiet-reminder/`. The reflections index and homepage update automatically.
5. **Check and commit:** run `npm test` after installing the browser once.
   Commit the Markdown, not `dist/`. Review the PR's screenshots before merging.

All five frontmatter fields above are required. Migrated posts also include
`source_url: "https://bettinagosselin.com/original-post/"`.
Descriptions are metadata; the homepage excerpt comes from the original opening
paragraph, never from an AI summary. Newest dates appear first.

Use a blank line for a new paragraph. For a deliberate line break inside a
paragraph, end the preceding line with **two spaces**. Preserve emphasis and
quotation credits, including song lyrics. Raw HTML is escaped, not executed.
Reviewed local JPEG photographs are supported:

```markdown
![Describe what is in the photograph](/assets/images/articles/your-photo.jpg)
```

Store the file in `src/assets/images/articles/` and use a lowercase, hyphenated
filename. The compiler checks that the file exists, validates its JPEG dimensions,
adds intrinsic sizing/lazy loading, and applies the configured site base path.
Remote images, SVGs, embeds, traversal paths, and images without alt text are
rejected. Normal HTTP(S) links, `mailto:` links, and same-page anchors are supported.

Seven posts have been migrated: **Studying Habakkuk**, **Thanksgiving 2024**,
**A Beautiful Reminder**, **17 Years Ago**, **My Journey and the Power of Prayer**,
**Reflections on Good Friday**, and **Hope Amidst Natural Disasters**.
The homepage shows exactly the latest five, newest first; the reflections index
lists all seven. Their text is checked against fixtures imported independently
from the original WordPress feed. Dates use the original Toronto publication
calendar, not the next day's UTC feed date. If intentionally editing one, review
the source change before updating its corresponding fixture.

Public URLs are extension-free: `/anchor-of-truth/`, `/story/`, `/reflections/`,
`/contact/`, and `/reflections/<slug>/`. Old WordPress root article paths, `/blog/`
article paths, `/the-book.html`, and `/my-story.html` redirect to these canonical
URLs. Those compatibility files are not used in navigation or the sitemap.
The slugs `anchor-of-truth`, `story`, `reflections`, `contact`, and `blog` are
reserved so an article cannot overwrite a main page or redirect.

## Inside the repository

```text
articles/                 Markdown posts with YAML frontmatter
src/
  index.html              Home: book, author, Scripture, latest five reflections
  anchor-of-truth/         index.html: book details and Amazon marketplaces
  story/                  index.html: expanded author introduction
  reflections/            index.html: automatically populated article listing
  contact/                index.html: social links, no form
  templates/              Shared header, footer, article, and feature sections
  assets/css/site.css     Responsive ocean-inspired design
  assets/images/          Local portrait, cover, ocean image, favicon
scripts/                  Compiler, local server, screenshots, PR publisher
tests/                    Unit/browser checks and original-text fixtures
design/                   Decisions, implementation notes, visual references
.github/                  Copilot instructions, issue form, Actions workflows
dist/                     Generated deployable site; ignored by Git
```

Edit one source HTML file per main page. The build inserts shared partials and
generated content through explicit `{{placeholder}}` markers. Article body text
is never evaluated as template code. Shared navigation lives in
`src/templates/header.html`; the footer includes ESV attribution.

The main design is **Anchored in Light**: navy, ocean teal, sunrise gold, ivory
reading surfaces, and literary typography. Mobile layouts stack naturally;
keyboard navigation, reduced motion, and JavaScript-free use are supported.
The book page uses a golden coastal sunset and a prominent, full book title,
following the latest [book-page reference](design/references/book-page-direction.png).

The Contact page links to Bettina's verified LinkedIn author profile. Its
Facebook link is explicitly a **name search**, not a verified profile; replace
it when the owner supplies the exact profile/page URL. No contact form, embed,
tracker, or messaging service is used. Biography copy is an owner-review draft
based on her published reflections, not new personal-history claims.

Amazon Canada remains the primary purchase destination. US and Mexico links use
the same published ASIN (`B0CCCMRP1S`) on `amazon.com` and `amazon.com.mx`.
Amazon blocked automated product checks for those two marketplaces; their stock
and shipping availability must be reviewed manually, not inferred from the links.

## Workflows

| Workflow | Trigger | Behavior |
| --- | --- | --- |
| **Build and publish** | Push to `main`, or manual dispatch | Checks content, tests responsive pages, packages `dist/`; Pages job is gated off by default |
| **PR checks and screenshots** | Every PR creation/update | Checks/builds/tests, then captures desktop/mobile page images |
| **Attach PR screenshots** | Successful preview workflow | Validates image artifacts and posts native GitHub image attachments in one replacement bot comment |

Article-only changes capture affected articles, the blog index, and homepage.
Other file changes, including documentation, capture all main pages, a
representative article, and any affected articles. Deletions update listing/home
previews rather than trying to capture removed pages.

The renderer has read-only permissions and no secrets. The attachment job runs
trusted `main` code, never PR code, and validates run/PR/SHA identity, filenames,
PNG dimensions, and artifact sizes. Stale results are rejected. Screenshot
artifacts expire after 14 days; no automatic deletion of native attachments
is promised.

Native uploads require a runner GitHub CLI with `gh pr comment --attach`.
The workflow checks this explicitly and starts with `GITHUB_TOKEN`, not a PAT.
**End-to-end PR attachment uploads have not yet been exercised**, because the
initial version is being pushed directly to `main` without a PR. If GitHub
rejects the workflow token or the runner CLI lacks the flag, the job reports
an error; artifacts are not passed off as inline images. Approve any alternative
credential setup separately. Fork PRs and Copilot PRs may require normal
maintainer approval before Actions runs.

### Enable Pages later

Do not enable it during private development. When ready:

1. Review public copy, photo/cover rights, and third-party quotation permissions.
   This includes the preserved lyric quotation in Studying Habakkuk.
2. Explicitly make the repository public.
3. In repository **Settings → Pages**, select **GitHub Actions** as the source.
4. Configure the `github-pages` environment to permit deployments from `main`.
5. Set Actions repository variables for the final origin and base path:

   | Variable | GitHub-hosted project site | Custom domain, after approval |
   | --- | --- | --- |
   | `SITE_ORIGIN` | `https://travisgosselin.github.io` | `https://bettinagosselin.com` |
   | `BASE_PATH` | `/bettinagosselin.com/` | `/` |
   | `PAGES_ENABLED` | `true` | `true` |

6. Run **Build and publish**, or push to `main`. Verify the deployment URL and
   navigation before any separate domain/DNS cutover.

The Pages job requires **all three**: `PAGES_ENABLED == 'true'`, public repository
visibility, and the `main` ref. With the variable unset, it skips all Pages
configuration, artifact upload, and deployment. The repository becoming public
alone does not publish anything. No CNAME is included.

You can test a subpath build locally without enabling Pages:

```bash
SITE_ORIGIN=https://travisgosselin.github.io BASE_PATH=/bettinagosselin.com/ npm run build
BASE_PATH=/bettinagosselin.com/ npm start
```

Open http://127.0.0.1:4321/bettinagosselin.com/. Rebuild with `npm run build`
and restart without `BASE_PATH` to return to the default local layout.

### Later: article request automation

The **New blog post** issue form is manual intake only. Issue-to-Copilot-to-draft-PR
automation remains deferred, including label creation and any PAT setup.
Its design is retained in [the implementation plan](design/implementation-plan.md).

## Assets and editorial review

- **Portrait:** owner-supplied photograph, resized locally; the original likeness is unchanged.
- **Book:** published cover of [Anchor of Truth](https://www.amazon.ca/dp/B0CCCMRP1S).
- **Ocean:** locally hosted [Unsplash source image](https://images.unsplash.com/photo-1471922694854-ff1b63b20054), under the [Unsplash license](https://unsplash.com/license).
- **Book-page sunset:** [Philippe Bontemps on Unsplash](https://unsplash.com/photos/golden-sunset-over-a-rocky-beach-and-ocean-3PaKagdVXy0), under the same license.
- **Article photographs:** migrated from the corresponding original WordPress posts and hosted locally. Their `source_url` fields identify the originals.
- **Typography:** system fonts only; no external font, tracking, or image requests at runtime.
- **Scripture:** Hebrews 6:19, ESV; attribution appears in the footer.

Keep the public launch review separate from development. The current WordPress
site, older posts not yet migrated, and domain/email DNS remain untouched.
