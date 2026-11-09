# Design and architecture decisions

This directory is the repository's durable memory. Update this document when
the owner makes a decision; record current state, not a transcript. Distinguish
approved requirements from implementation proposals. The owner has authorized
the initial implementation and direct push to `main`, without a PR.

## Approved product and visual direction

- Replace the WordPress site with a polished static author site.
- Use **Anchored in Light**, the ocean-inspired concept, not Quiet Grace.
- Use deep navy, muted ocean teal, sunrise gold, warm ivory reading surfaces,
  literary serif headings, and clean supporting typography.
- Match `references/ocean-concept.png` for atmosphere and hierarchy, not every
  word or layout detail. That original concept predates the changes below.
- Feature the real published book cover and supplied portrait. Never generate
  a substitute face or redesign the cover. Generated renderings are visual
  references, not source photography or approved final copy.
- Homepage order: ocean/book hero, author introduction, Scripture quote,
  previews of the latest five reflections, footer. Remove the redundant book-summary band and its
  unused space.
- Navigation: My Book, My Story, Reflections, Contact. The wordmark links home. Scripture stays
  in page content, not a separate navigation destination.
- Public routes: `/anchor-of-truth/`, `/story/`, `/reflections/`, `/contact/`,
  and `/reflections/<slug>/`. Never expose `.html` in links or canonical URLs.
  Keep earlier site paths as redirects. The book route is `anchor-of-truth`,
  not `book`.
- Reflections are grouped by publication year, newest first. A right-hand index
  links to each year and shows its article count; omit empty years. Use native
  anchor links, keeping the complete archive visible without JavaScript.
  Move the year index above the list on mobile.
- Follow `references/book-page-direction.png` for the book page's sunset/ocean
  hero, large readable cover, full title, and richer author section.
- Expand My Story using the author's published reflections, retaining owner
  review for newly composed biography copy.
- Contact is a social directory without a form. Use the verified LinkedIn
  author profile. The Facebook link is a clearly labeled name search until
  the owner supplies a confirmed profile; never invent one.
- Canada is the primary Amazon marketplace, with secondary US and Mexico links
  and decorative flags alongside explicit country labels. Stock/shipping and
  the two international product pages need manual verification.
- Support responsive mobile, tablet, and desktop layouts with accessible,
  keyboard-friendly controls. Readability takes priority over cinematic effects.

## Editorial rules

- The site is openly Christian; use ESV when selecting Scripture. Verify exact
  wording, reference, and publisher attribution requirements before release.
- Book: *Anchor of Truth: From the Pit of Despair to Glorious Light*, by Bettina
  Gosselin. Purchase destination: https://www.amazon.ca/dp/B0CCCMRP1S.
- New biography and marketing copy are drafts pending owner approval. Do not
  invent facts, testimonials, awards, reviews, credentials, or contact details.
- Individual articles use the **exact author-supplied text**, not a condensed
  preview or paraphrase. Preserve paragraph sequence, intentional line breaks,
  emphasis, quoted material, and attribution. Formatting is allowed; rewriting,
  correcting grammar, changing punctuation, and adding prose are not.
- Plain-text issue submissions are valid. Convert structure to Markdown without
  changing visible wording. Ask for clarification in the issue if structure
  cannot be inferred safely; never fill gaps with invented text.
- Metadata descriptions may summarize but must not appear as original article
  text. Homepage previews should use an actual short excerpt with a read link.
- `references/studying-habakkuk-exact-text.png` shows the full-text reading layout.
  The original post is https://bettinagosselin.com/studying-habakkuk/, dated
  November 17, 2025. Earlier summary-only mockups are not editorial references.
- Do not add a newsletter, comments system, forms, analytics, tracking, or other
  external services without approval.

## Approved technical boundaries

- Plain static HTML/CSS, minimal dependency-free browser JavaScript.
- One authored HTML file per main page, located under root `src/`.
- All article sources are simple Markdown with YAML frontmatter in root
  `articles/`; build tooling compiles them into the delivered site.
- Build output goes to ignored `dist/`, not back into `src/` or `articles/`.
- Initial development was private. The owner has now made the repository public
  and authorized Pages hosting at `https://travisgosselin.github.io/bettinagosselin.com/`.
- Keep a publish workflow with working build/check jobs and a separate gated
  Pages job. Use `PAGES_ENABLED == 'true'`, a public-repository check, and a
  `main`-branch check. Gate every Pages integration step, including configuration
  and artifact upload. Prefer executable, gated YAML over commented-out steps.
- Pushes to `main`, including merges, automatically deploy with the explicit
  publishing gate enabled. Public visibility alone must not enable publishing.
- PR screenshots and inline image comments are part of the initial implementation
  plan, alongside ordinary PR build/content checks. Capture affected articles,
  blog listing and homepage for article-only changes; any other changed file
  triggers all main pages and a representative article. Include desktop/mobile
  screenshots and use native GitHub attachments, not an external image host.
- Issue-to-article automation is deferred. Retain the form and implementation
  notes for later; no agent dispatch or token setup now. Initial authoring is
  direct Markdown editing. Human review and merge remain required.

## Implementation choices

- A small Node LTS build script, a maintained Markdown parser, YAML frontmatter
  parser, and Playwright for screenshots/testing.   Pin resolved versions with a lockfile. The initial build uses markdown-it,
  yaml, and Playwright; the published site has no JavaScript.
- Main sources: `src/index.html`, `src/anchor-of-truth/index.html`,
  `src/story/index.html`, `src/reflections/index.html`, `src/contact/index.html`,
  and `src/templates/article.html`.
- Build emits articles at `<base>/reflections/<slug>/index.html`; retain established
  WordPress paths through static compatibility pages where necessary.
- Required frontmatter: `title`, quoted ISO `date`, explicit `slug`, `author`,
  `description`. The slug determines the URL and must match the Markdown filename.
  Never derive it from a title at build time. Optional `source_url` for new posts;
  required for migrations.
- Date-only publication uses `America/Toronto`. Future dates are rejected for
  now: scheduled posts need a scheduled rebuild and are outside this first pass.
- All 46 published WordPress posts, September 2009 through November 2025, are
  migrated. The public WordPress API reports 46 posts in one page; retain the
  source inventory and independent original-text fixtures in `tests/fixtures/`.
  Preserve original slugs, titles, local publication dates, and external links.
  Their 28 original images are local JPEG assets with alt text, intrinsic
  dimensions, and base-path-aware URLs; the static Mozambique flag was converted
  from GIF to JPEG. No remote image requests. The homepage still shows five posts.
- For future issue automation, label `article:request` identifies form submissions.
  Only maintainers apply
  `article:ready`; that second label authorizes an agent run. Re-labeling must
  not create duplicate tasks or PRs.

## Activation gates

- The temporary Pages deployment is owner-approved. Repository variables use
  `SITE_ORIGIN=https://travisgosselin.github.io`, `BASE_PATH=/bettinagosselin.com/`,
  and `PAGES_ENABLED=true`; the `github-pages` environment allows `main` only.
  Keep the existing WordPress site and DNS untouched. Custom-domain activation
  requires separate owner approval.
- Inline PR images will use GitHub's native attachments through
  `gh pr comment --attach`; no separate public image host is required. Current
  GitHub documentation supports CLI uploads and repository-scoped access for
  private attachments. Local CLI 2.102.1 exposes this flag. Verify runner CLI
  support and upload authentication with the intended Actions token before
  implementing. Do not assume CLI support proves `GITHUB_TOKEN` compatibility.
  Private Actions artifact download links alone are not inline attachments.
  Verify actual inline image display in a private-repository test PR before
  declaring screenshot automation complete. Credential limitations are blockers;
  artifacts alone do not satisfy the requirement.
- The initial source is pushed directly to `main` with no PR, per owner request.
  Local captures and workflow code are delivered now; actual PR uploads must be
  exercised on the first later PR. Do not create a test PR during initial delivery.
- Deferred Copilot API assignment requires an approved user token and enabled
  repository access. The owner can provide a PAT later; this is not authorization
  to acquire or store one now. Do not assume `GITHUB_TOKEN` can start the agent.
- Verify asset rights and Scripture/third-party quotation permissions before
  publication. Preserve text; flag rights concerns instead of silently editing.
