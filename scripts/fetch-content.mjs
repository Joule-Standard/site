// Pulls the spec and manifesto markdown + figure SVGs from Joule-Standard/spec
// at build time, so this repo never carries its own stale copy. Pin the ref
// via SPEC_REF, or by editing .spec-ref (what the spec repo's release
// workflow bumps automatically on each tag); SPEC_REF wins when both are
// set, for local overrides. Set GITHUB_TOKEN to raise the GitHub API rate
// limit for the figures listing.
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const REPO = 'Joule-Standard/spec';
const rootDir = path.resolve(import.meta.dirname, '..');
const docsDir = path.join(rootDir, 'src/content/docs');
const figuresDir = path.join(rootDir, 'public/figures');
const REF = process.env.SPEC_REF || (await readFile(path.join(rootDir, '.spec-ref'), 'utf8')).trim();
const RAW_BASE = `https://raw.githubusercontent.com/${REPO}/${REF}/`;
// Astro's content-layer cache doesn't invalidate when only remark plugins or
// astro.config.mjs change (only on content changes it notices), so it can
// silently serve stale pre-rendered markdown. Clearing it here guarantees
// every `content:sync` is followed by a fresh render.
const contentCacheDir = path.join(rootDir, 'node_modules/.astro');

const ghHeaders = process.env.GITHUB_TOKEN
  ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
  : {};

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed (${res.status}) for ${url}`);
  return res.text();
}

async function fetchMarkdown(file, destName) {
  const text = await fetchText(`${RAW_BASE}${file}`);
  const rewritten = text.replace(/assets\/figures\//g, '/figures/');
  await writeFile(path.join(docsDir, destName), rewritten, 'utf8');
  console.log(`  wrote src/content/docs/${destName} (${rewritten.length} bytes)`);
}

// The source figures are authored to be inlined directly into HTML (as the
// original mockups did), so their root <svg> tag has no xmlns — harmless
// inline, since the parser already knows it's in SVG context, but it makes
// the file an invalid standalone document when referenced via <img src>,
// which some renderers refuse to decode (shows as a broken image).
function ensureSvgNamespace(svg) {
  if (/<svg[^>]*\sxmlns=/.test(svg)) return svg;
  return svg.replace(/<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
}

async function fetchFigures() {
  const res = await fetch(
    `https://api.github.com/repos/${REPO}/contents/assets/figures?ref=${REF}`,
    { headers: ghHeaders },
  );
  if (!res.ok) throw new Error(`GitHub API failed (${res.status}) listing assets/figures`);
  const entries = await res.json();

  await Promise.all(
    entries
      .filter((entry) => entry.type === 'file')
      .map(async (entry) => {
        const svg = ensureSvgNamespace(await fetchText(entry.download_url));
        await writeFile(path.join(figuresDir, entry.name), svg, 'utf8');
        console.log(`  wrote public/figures/${entry.name}`);
      }),
  );
}

async function main() {
  console.log(`Syncing content from ${REPO}@${REF}...`);
  await mkdir(docsDir, { recursive: true });
  await mkdir(figuresDir, { recursive: true });

  await fetchMarkdown('SPEC.md', 'spec.md');
  await fetchMarkdown('MANIFESTO.md', 'manifesto.md');
  await fetchFigures();

  await rm(contentCacheDir, { recursive: true, force: true });

  console.log('Content sync complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
