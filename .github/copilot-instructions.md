# Project purpose

Create a polished, professional, static author website for Bettina Gosselin,
replacing her WordPress site at https://bettinagosselin.com. Feature her book,
Anchor of Truth: From the Pit of Despair to Glorious Light, its published cover,
Amazon marketplace links, her supplied portrait, and an expanded biography. The voice
should be warm, candid, hopeful, and openly Christian.

The current design direction is Anchored in Light: deep navy, ocean teal,
sunrise gold, warm ivory reading surfaces, ocean photography, and literary serif
headings. Keep a focused homepage with a book-first hero, author introduction,
Scripture quote, and five latest-post previews
after the quote. Omit the redundant homepage book-summary band with unused space.
Navigation destinations are The Book, My Story, Reflections, and Contact, at
`/anchor-of-truth/`, `/story/`, `/reflections/`, and `/contact/`. Article URLs are
`/reflections/<slug>/`. All public links/canonicals must be extension-free;
HTML index files are an implementation detail. Keep legacy URLs as redirects,
not navigation destinations. Provide dedicated book, biography, reflections,
contact, and individual article pages. Scripture belongs
within page content, not a separate navigation destination. The initial site
implementation is authorized, with direct pushes to `main` and no initial PR.
Keep the managed worktree isolated; do not edit the main checkout.

Read `design/decisions.md` for durable requirements and
`design/implementation-plan.md` for implementation order. Update those records
and these instructions when the owner makes a new decision. Do not treat
proposed or blocked automation as implemented.

# Product and content boundaries

- Follow the approved ocean design and exact-text article reference.
- Use the real supplied portrait and published book cover. Do not replace them
  with generated likenesses or redesigned cover artwork.
- Verify biographical and book details against user-provided information or
  primary sources. Never invent endorsements, reviews, credentials, awards,
  sales figures, contact details, or personal history.
- Treat new marketing copy and biography wording as drafts for owner approval.
  Do not reproduce sensitive stories from the old blog without explicit approval.
- Prefer ESV when quoting Scripture. Verify wording, include the passage and
  translation, and check the publisher's current quotation and attribution
  requirements before publication.
- Use https://www.amazon.ca/dp/B0CCCMRP1S as the primary book purchase link,
  with secondary US (`amazon.com`) and Mexico (`amazon.com.mx`) links using
  the same ASIN. Country names must accompany decorative flags.
- The Contact page is a social directory, not a form. Never guess profile URLs.
  Until the owner confirms the Facebook URL, label its link as a name search.
- A static reflections archive and latest-five homepage previews are approved. Preserve verified post
  titles, author attribution, dates, and source URLs when migrating content.
  Individual blog pages must preserve the author's exact original text,
  paragraph order, quotations, and attribution. Do not replace articles with
  summaries, paraphrases, or rewritten copy. Style the original content without
  changing its wording. Homepage previews may use clearly identified excerpts.
- Do not add a newsletter, contact form, analytics, tracking, or external
  service integration without approval. Never imply a form works without a
  working, approved submission destination.

# Implementation standards

- Ship plain static HTML and CSS with one source HTML file per main page under
  root `src/`. Use small, dependency-free browser JavaScript only where necessary.
  No browser framework, backend, or CMS.
- Store article Markdown with simple YAML frontmatter in root `articles/`.
  Use the Node build with markdown-it, yaml, and Playwright for tests/screenshots.
  Pin dependencies in package-lock.json and use `npm ci`. Write
  generated site output to ignored `dist/`, not source folders.
- Use required frontmatter `title`, quoted ISO `date`, `slug`, `author`, and
  `description`; migrated posts also retain `source_url`. The explicit slug
  determines the URL and must match the filename. Never infer a missing slug
  during the build. Read the scoped
  article instructions before converting issue content.
- Reviewed article JPEGs live in `src/assets/images/articles/`, referenced as
  `/assets/images/articles/<name>.jpg` in Markdown with meaningful alt text.
  Validate files and dimensions, rewrite for `BASE_PATH`, and never load remote
  images or embeds. Keep alt text out of article-prose fidelity comparisons.
- Keep the site compatible with static hosting, including GitHub Pages at a
  custom domain or repository subpath. Use relative asset paths and no
  server-dependent routing. Build the initial version privately with Pages
  disabled. Prepare a future publishing workflow with build/check jobs and a
  separate Pages job gated on `PAGES_ENABLED == 'true'`, public visibility, and
  `main`. Every Pages integration step must be inside the gate; builds cannot
  depend on Pages being enabled. Prefer gated valid YAML over commented-out steps.
  The owner must make the repo public and explicitly enable publishing later.
  Do not change DNS, visibility, or activate services during preparation.
- Include desktop/mobile screenshots in every PR using native GitHub image
  attachments and one updated bot comment. Article-only changes show affected
  articles, blog index and homepage; any other path shows all main pages and a
  representative article. Verify runner CLI and workflow-token upload support;
  do not substitute artifact-only links or require an external image host.
  Separate read-only rendering from trusted attachment publication, reject
  stale results, and retain ordinary build/content checks and local review.
- Issue-to-article automation remains deferred. Retain its notes in
  `design/implementation-plan.md`; do not implement it or acquire/store a PAT
  now. Author articles directly as Markdown.
- For any future automation, treat issue bodies and PR artifacts as untrusted
  data; never execute them in privileged workflows.
- Follow least-privilege permissions, reviewed pinned Actions, and a strict
  separation between untrusted rendering and trusted image publication.
  Never invent credentials or bypass Copilot workflow approval controls.
- Keep changes focused and readable. Reuse existing patterns and avoid premature
  abstractions. Update these instructions when an approved decision changes.
- Keep copy and links usable without JavaScript. Prefer native browser features.
- Use semantic landmarks, one descriptive h1, logical headings, a skip link,
  keyboard-accessible controls, visible focus, meaningful alt text, and WCAG 2.2
  AA contrast. Respect reduced-motion preferences.
- Design mobile-first without horizontal overflow. Preserve the portrait's
  proportions and keep the book title readable at its intended display size.
- Optimize local images, supply intrinsic dimensions and responsive sizes,
  and lazy-load below-the-fold images. Do not lazy-load the main hero image.
- Prefer system fonts or approved locally hosted fonts. Avoid third-party
  runtime requests except explicit destination links.
- Include a descriptive page title, meta description, canonical URL, favicon,
  and social sharing metadata before release. Use only verified structured data.
- Never commit secrets, personal contact information not approved for publication,
  or generated scratch artifacts.

# Definition of done

- Run `npm run check` for compiler/content checks and `npm test` for a full
  build and responsive browser checks. Install Chromium with
  `npm run browser:install` when missing. `npm run screenshots` captures previews.
- `npm run articles` translates posts and refreshes the full `dist/` so homepage
  and listing cannot become stale. `npm start` serves only `dist/` on localhost
  port 4321; rebuild after changes. Browser tests use their own port 4322 and
  must not reuse or stop another project's server.
- Inspect the current files before editing; preserve unrelated user changes.
- Verify local links, image loading, and the actual Amazon destination.
- Check the rendered page at narrow mobile, tablet, and desktop sizes, including
  keyboard navigation, focus, contrast, zoom, and reduced motion.
- Use existing validation tools when available; do not introduce dependencies
  solely for routine checks. Report blocked checks honestly.
- Review final public copy, asset usage rights, Scripture attribution, and
  metadata with the owner before deployment.
