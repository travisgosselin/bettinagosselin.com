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
  latest-post preview, footer. Remove the redundant book-summary band and its
  unused space.
- Navigation: The Book, My Story, Blog. The wordmark links home. Scripture stays
  in page content, not a separate navigation destination.
- Provide dedicated book, biography, blog index, and article pages.
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
- Build the initial version privately. Pages is not enabled and must remain
  disabled until the owner explicitly makes the repository public.
- Prepare a publish workflow with working build/check jobs and a separate gated
  Pages job. Use `PAGES_ENABLED == 'true'`, a public-repository check, and a
  `main`-branch check. Gate every Pages integration step, including configuration
  and artifact upload. Prefer executable, gated YAML over commented-out steps.
- Once public and explicitly enabled, pushes to `main`, including merges,
  automatically deploy. Public visibility alone must not enable publishing.
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
- Main sources: `src/index.html`, `src/the-book.html`, `src/my-story.html`,
  `src/blog/index.html`, and `src/templates/article.html`.
- Build emits articles at `<base>/blog/<slug>/index.html`; retain established
  WordPress paths through static compatibility pages where necessary.
- Required frontmatter: `title`, quoted ISO `date`, explicit `slug`, `author`,
  `description`. The slug determines the URL and must match the Markdown filename.
  Never derive it from a title at build time. Optional `source_url` for new posts;
  required for migrations.
- Date-only publication uses `America/Toronto`. Future dates are rejected for
  now: scheduled posts need a scheduled rebuild and are outside this first pass.
- For future issue automation, label `article:request` identifies form submissions.
  Only maintainers apply
  `article:ready`; that second label authorizes an agent run. Re-labeling must
  not create duplicate tasks or PRs.

## Activation gates

- Keep the repository private and Pages disabled now. Later, the owner must
  explicitly authorize public visibility, enable Pages, and opt into the
  publish gate. Do not change visibility, Pages settings, or DNS during preparation.
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
