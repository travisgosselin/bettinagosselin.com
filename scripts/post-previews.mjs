import { execFileSync } from 'node:child_process';
import { lstat, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { validateManifest, validatePng } from './preview-validation.mjs';

const marker = '<!-- bettina-site-preview -->';
const gh = (args) => execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 8 * 1024 * 1024 });
const api = (route) => JSON.parse(gh(['api', route]));
const repository = process.env.GITHUB_REPOSITORY;
const runId = process.env.PREVIEW_RUN_ID;
if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository ?? '') || !/^\d+$/.test(runId ?? '')) {
  throw new Error('Missing trusted workflow identity');
}
const run = api(`repos/${repository}/actions/runs/${runId}`);
if (run.event !== 'pull_request' || run.conclusion !== 'success' || run.name !== 'PR checks and screenshots' ||
    run.repository.full_name !== repository) throw new Error('Unexpected source workflow');
const artifact = api(`repos/${repository}/actions/runs/${runId}/artifacts`).artifacts
  .find((item) => item.name === `site-previews-${runId}`);
if (!artifact || artifact.expired || artifact.size_in_bytes > 60 * 1024 * 1024) throw new Error('Invalid screenshot artifact');
const directory = path.resolve('screenshots');
const manifestFile = path.join(directory, 'manifest.json');
const manifestStat = await lstat(manifestFile);
if (!manifestStat.isFile() || manifestStat.isSymbolicLink() || manifestStat.size > 64000) throw new Error('Invalid manifest file');
const manifest = JSON.parse(await readFile(manifestFile, 'utf8'));
if (!Number.isSafeInteger(manifest.pr) || manifest.pr < 1 ||
    !run.pull_requests.some((pr) => pr.number === manifest.pr)) throw new Error('PR is not associated with source run');
const getPr = () => api(`repos/${repository}/pulls/${manifest.pr}`);
const pr = getPr();
if (pr.state !== 'open' || pr.head.sha !== run.head_sha) {
  console.log('Skipping stale or closed PR'); process.exit(0);
}
const images = validateManifest(manifest, { repository, pr: pr.number, headSha: pr.head.sha });
const allowed = new Set(['manifest.json', ...images.map((image) => image.file)]);
let total = 0;
for (const filename of await readdir(directory)) {
  const location = path.join(directory, filename);
  const info = await lstat(location);
  if (!allowed.has(filename) || !info.isFile() || info.isSymbolicLink()) throw new Error('Unexpected artifact file');
  total += info.size;
}
if (total > 60 * 1024 * 1024) throw new Error('Screenshot artifact too large');
for (const image of images) validatePng(await readFile(path.join(directory, image.file)), image.viewport);
if (!gh(['pr', 'comment', '--help']).includes('--attach')) throw new Error('Runner gh CLI lacks --attach. Install a supported version.');
const commentRoute = `repos/${repository}/issues/${pr.number}/comments`;
const comments = () => JSON.parse(gh(['api', '--paginate', '--slurp', commentRoute])).flat();
const ours = (comment) => comment.user?.login === 'github-actions[bot]' && comment.body.startsWith(marker);
const previous = comments().filter(ours);
if (previous.some((comment) => Number(comment.body.match(/preview-run:(\d+)/)?.[1] ?? 0) > Number(runId))) {
  console.log('Skipping superseded run'); process.exit(0);
}
let body = `${marker}\n<!-- preview-run:${runId} -->\n## Website previews\n\nCommit \`${pr.head.sha.slice(0, 7)}\` · [Workflow run](${run.html_url})\n\n`;
const attachments = [];
for (const image of images) {
  const name = image.route || 'Home';
  body += `### ${name} · ${image.viewport}\n\n![${name} ${image.viewport} preview](screenshots/${image.file})\n\n`;
  attachments.push('--attach', `screenshots/${image.file}`);
}
await writeFile('preview-comment.md', body);
if (getPr().head.sha !== pr.head.sha) { console.log('Skipping stale preview'); process.exit(0); }
try {
  gh(['pr', 'comment', String(pr.number), '--repo', repository, '--body-file', 'preview-comment.md', ...attachments]);
} catch (error) {
  console.error(error.stderr?.toString() || error.message);
  throw new Error('Native attachment upload failed. Verify gh --attach support and workflow-token permissions; artifacts alone are not inline previews.');
}
if (getPr().head.sha !== pr.head.sha) {
  for (const comment of comments().filter((comment) => ours(comment) && comment.body.includes(`preview-run:${runId} `))) {
    gh(['api', '--method', 'DELETE', `repos/${repository}/issues/comments/${comment.id}`]);
  }
  throw new Error('PR changed during upload; stale preview must not replace the latest comment');
}
for (const comment of previous) gh(['api', '--method', 'DELETE', `repos/${repository}/issues/comments/${comment.id}`]);
console.log(`Posted ${images.length} native image attachments to PR #${pr.number}`);
