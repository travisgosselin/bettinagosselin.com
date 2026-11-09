# Implementation plan

**Current scope:** the owner authorized the initial site, all 46 published WordPress articles,
compiler, local npm commands, styles, tests, workflows, and a direct push to
`main` without an initial PR. The owner has since made the repository public and
authorized deployment to the temporary GitHub Pages URL.

**Implemented:** steps 1–2, local screenshot capture, PR screenshot and native
attachment workflow code (steps 3–4), and the gated publishing workflow (step 5).
Local unit, content-fidelity, subpath, and responsive browser checks pass.
The first real PR must still verify GitHub-hosted screenshot rendering and
workflow-token attachment uploads. Do not equate local captures with that proof.

**Deferred:** step 6, credential acquisition, custom-domain activation, and DNS
cutover. See the root README for actual commands and status.

## 1. Build and content contract

Establish a pinned Node LTS toolchain, lockfile, a small build script, and
documented `build`, `check`, `preview`, and screenshot commands once they work.
Use maintained Markdown/frontmatter parsers rather than handwritten parsers.
Keep the browser dependency-free and avoid a framework or general-purpose CMS.

Create these sources:

```text
articles/<slug>.md
src/index.html
src/anchor-of-truth/index.html
src/story/index.html
src/reflections/index.html
src/contact/index.html
src/templates/article.html
src/assets/css/site.css
src/assets/images/
scripts/                       # build, validation, and screenshot helpers
dist/                          # generated, ignored
```

The build copies authored static files, renders articles through the article
template, fills explicit listing/latest-five-post placeholders, and writes `dist/`.
Keep common navigation consistent across the separate main HTML files; test it
rather than introducing a frontend router. Never commit generated article HTML.

Validate frontmatter before producing output: nonempty strings, valid ISO
calendar date, date not in the future in Toronto, unique safe lowercase
hyphenated slugs, no path traversal, and approved author. Reject unknown schema
fields until intentionally supported. Descriptions and titles must be escaped.
Require an explicit frontmatter slug matching the filename; it determines the
output URL. Never infer a missing slug from the title or filename during build.
Disable arbitrary raw HTML in article Markdown, reject unsafe URL protocols,
and disallow executable frontmatter/template expressions. Preserve Markdown
hard breaks and meaningful emphasis without converting punctuation.

Sort posts newest first by date, then slug for stable ties. Derive latest-post
previews from original text, not an AI rewrite. Empty listings need a deliberate
empty state. Fail clearly on malformed or duplicate posts.

**Acceptance:** deterministic builds; tests for invalid dates/slugs, unsafe
content, missing metadata, duplicates, sorting, empty content, links and exact
article text. Build successfully at both `/` and `/bettinagosselin.com/` base
paths. Derive URLs from a single configured origin/base path.

## 2. Pages and approved assets

Depends on step 1. Implement the responsive ocean design and all six page
types. Use the actual portrait and cover, optimized local images, system or
approved self-hosted fonts, and no tracking. The homepage omits the redundant
book section and includes the five latest article previews after Hebrews 6:19.
Use clean directory URLs (`/anchor-of-truth/`, `/story/`, `/reflections/`,
`/contact/`) without `.html` in public links. Contact contains social links only.

Migrate Studying Habakkuk using owner-supplied exact text, preserving paragraphs,
line breaks, italic lyrics, and attribution. Compare rendered visible article
text against its canonical source, accounting only for Markdown syntax and
browser whitespace. Do not compare screenshots alone as a text-integrity test.
Review third-party quotation rights before public release.

Add title/description, canonical/social metadata, favicon, verified structured
data, sitemap, accessible landmarks, skip link, focus styles, and reduced motion.
Map existing WordPress article paths to static compatibility pages or preserve
them; verify old inbound links. No DNS cutover or WordPress removal in this step.

**Acceptance:** usable without JavaScript; narrow mobile, tablet and desktop;
no overflow at 320px or 200% zoom; keyboard navigation and WCAG 2.2 AA contrast;
no missing images or dead internal links; original article text unchanged.

## Initial PR checks

After steps 1–2, add a read-only `pull_request` workflow for lockfile installation,
validation, and static build, without path filters or publishing credentials.
Include screenshot capture in the unprivileged workflow described in step 3,
with native image comments handled separately in step 4. Local browser inspection
remains required for responsive design verification.

## 3. PR screenshot rendering

Depends on steps 1–2. Add `.github/workflows/pr-preview.yml` for
`pull_request` opened, synchronize, reopened, and ready-for-review events.
Do not use path filters: every PR must produce previews. Use read-only
permissions, no secrets, no persisted checkout credentials, pinned Actions,
timeouts, and concurrency per PR that cancels superseded runs.

Run installation from the lockfile, validation, build, and pinned Playwright
Chromium screenshots on isolated hosted runners. Diff against the PR merge base:

| Changes | Required screenshots, desktop and mobile |
| --- | --- |
| Only `articles/**` | Added/modified articles, blog index, homepage |
| Article deletions | Blog index and homepage; report removed posts |
| Any other path, including documentation | Home, book, story, reflections index, contact, representative article, plus changed articles |

Capture full-page PNGs at 1440px desktop and 390px mobile with fixed locale,
timezone, browser version and device scale; await local fonts and images.
Serve only `dist/` bound to localhost. Block external network requests during
capture. Fail on missing expected pages, failed captures, browser errors or
unresolved assets. Use collision-safe screenshot names.

Upload screenshot artifacts and a JSON manifest binding PR number, repository,
head SHA, page paths and filenames. Check source head SHA after rendering.
Artifact retention should be limited (proposed: 14 days).

## 4. Post images in PRs

Depends on step 3 and verified GitHub attachment upload authentication. Add
`.github/workflows/pr-preview-comment.yml` triggered by successful completion
of the named preview workflow through `workflow_run`. Its code comes from the
default branch; **never checkout or execute PR code in this privileged job**.

Validate triggering workflow ID, repository, PR association, current head SHA,
artifact name, bounded archive size, safe filenames, real PNG signatures and
dimensions. Treat the manifest and all artifact bytes as untrusted. Do not
execute scripts, parse HTML, or publish the entire artifact as a website.
Reject stale runs and unexpected files. Trusted code generates comment text.

Upload only validated PNGs using GitHub CLI's documented
`gh pr comment --attach` support. GitHub hosts the attachments; a separate public
image host is not required. Private attachments follow repository access rules.
Verify the runner CLI exposes this flag and test upload with the intended
workflow credential; local CLI support does not establish Actions-token support.
If a different credential is needed, obtain explicit approval before setup.
Do not substitute artifact links or raw-repository links for native attachments.
Verify this capability early in implementation. An authentication limitation
must be reported as a blocker, not silently reduced to artifact-only previews.

Create/update one bot comment containing embedded desktop/mobile images,
current commit, page labels, and artifact/run links. Minimize write permissions:
comment writing and attachment-upload access only where verified as required.
Fork PRs follow the same untrusted-data boundary. An old workflow result must
never overwrite the latest comment. Establish supported native-attachment
retention/cleanup behavior before promising automatic deletion.

**Acceptance:** new article, normal code change, docs-only change, deletion,
fork, stale run, and malformed artifact tests. Confirm actual inline image
display in a test PR before marking preview automation complete.

## 5. GitHub Pages publishing

The initial private-development gate is retained, but publishing is now enabled
for `https://travisgosselin.github.io/bettinagosselin.com/`. Pages uses GitHub
Actions; the `github-pages` environment permits only `main`. Repository variables
set the GitHub origin, repository base path, and `PAGES_ENABLED=true`.

Depends on steps 1–2. Add `.github/workflows/deploy.yml` on pushes to `main`
and manual dispatch. No path filters. Build and check from the exact selected
commit using the same build command as PRs. Build/check jobs must work with
Pages entirely absent, using explicit origin/base-path inputs for local and CI
builds, not calls to `configure-pages`.

Prepare a separate dependent Pages job whose job-level condition requires all
three: `vars.PAGES_ENABLED == 'true'`, public repository visibility from the event
payload, and `github.ref == 'refs/heads/main'`. Keep the variable unset/false now.
Place all Pages integration inside this job: configuration/metadata, Pages
artifact upload, environment binding, and deployment. Use a valid gated job
rather than commented-out steps. Do not attempt to enable Pages from workflow code.
Transfer validated build output through an ordinary Actions artifact if needed.
Verify configured build base path matches Pages metadata before uploading.

Keep build permissions read-only. Deploy alone receives `pages: write` and
`id-token: write`, uses the `github-pages` environment restricted to `main`,
and publishes the returned deployment URL. Serialize deployments so an older
run cannot replace newer output. Pin official actions to reviewed commit SHAs.

Keep the public-repository and explicit-enable gates. Visibility change alone
must not trigger publication. Do not add a custom domain or change DNS until
approved. Use the temporary GitHub Pages address and verify live pages, CSS,
images, articles, and base-path navigation.
Rollback is a normal revert commit to `main`, followed by redeployment.

**Initial acceptance:** build/check succeeds while Pages does not exist; deployment
is skipped when the variable is missing/false, the repo is private even if the
variable is true, or manual dispatch targets a non-main branch. No Pages API is
called on those paths. No visibility changes or live publication during this phase.

**Later activation acceptance:** merge a reviewed test change after public
visibility and explicit enablement; verify deployment and live output. PR events
must never deploy production.

## 6. Deferred: issue-to-article Copilot automation

Future work only; the owner may supply a PAT at that time. No credential setup
now. Depends on step 1 and enabled Copilot access; screenshots are an independent
enhancement, not a prerequisite for article authoring. The prepared issue form
collects title, date, description, optional slug/source URL, and body as plain
text or Markdown. It applies only `article:request`, not the agent trigger.
Create both labels when enabling the feature.

Add `.github/workflows/article-request.yml` for `issues: [labeled]`, gated
specifically on a maintainer applying `article:ready` to an open form issue.
Check the actor's current repository permission via API; accept only write,
maintain or admin. A request form alone must not trigger compute costs.

Run trusted default-branch workflow code without checking out issue-supplied
branches. Pass issue fields as data, never interpolate them into shell code.
Validate required fields and dates, use per-issue concurrency, and check a
durable task/PR marker before dispatching. Repeated label events must not
launch duplicate work; ambiguous API results require reconciliation, not retry.

Use the documented Copilot issue-assignment REST API with an explicitly
approved user-authorized credential stored as an Actions secret. Verify enabled
Copilot access first. Do not use an installation token or assume the ordinary
`GITHUB_TOKEN` is sufficient. Do not acquire credentials in repository code.

Agent task: follow repository and article instructions; produce exactly one
Markdown article with validated frontmatter; preserve wording while converting
formatting; change no workflows or unrelated files; run build/content checks;
create a **draft PR** linked to the issue. Include an explicit slug in frontmatter
even when it was derived from the submitted title during authoring. If details are missing, leave the
issue with an actionable explanation rather than inventing content.

GitHub Copilot's own PR/workflow approval restrictions must be respected:
document the maintainer's approval action when preview runs are held. Never
bypass that control to obtain automatic screenshots.

Report assignment failures visibly on the issue and in Actions. Store task
identity before accepting new requests. Leave publication to review and merge.
The deployment workflow, not the agent, publishes merged content.

**Acceptance:** plain-text and Markdown submissions; preserved lyric line breaks;
missing/invalid fields; duplicate labels; unauthorized label actor; injection
attempt; agent failure; draft PR creation; screenshots after any required
approval; reviewed merge and deployment. Use a test post and do not publish
it to production during automation development.

## Completion gates and documentation

Initial readiness requires text fidelity, responsive pages, normal PR checks,
desktop/mobile screenshots embedded in PR comments through native attachments,
and a proven publish gate. Pages is now enabled for the temporary URL;
issue-to-draft-PR and custom-domain cutover remain excluded until separately
activated. Preserve their notes here without
implementing them prematurely.
Add verified setup/development commands and credential permission instructions
to the root README as the corresponding features become real. Keep decisions
and Copilot instructions synchronized. No auto-merge.

References:

- [Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [Copilot API authentication and issue assignment](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/cloud-agent/use-cloud-agent-via-the-api)
- [Secure use of GitHub Actions](https://docs.github.com/en/actions/reference/security/secure-use)
- [Native attachments through GitHub CLI](https://docs.github.com/en/github-cli/github-cli/attaching-files-with-github-cli)
