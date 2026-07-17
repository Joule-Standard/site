// Pulls the spec and manifesto markdown + figure SVGs from Joule-Standard/spec
// at build time, so this repo never carries its own stale copy. Pin the ref
// via SPEC_REF, or by editing .spec-ref (what the spec repo's release
// workflow bumps automatically on each tag); SPEC_REF wins when both are
// set, for local overrides.
//
// Fetches via jsDelivr's GitHub CDN mirror (cdn.jsdelivr.net / data.jsdelivr.com)
// rather than GitHub's own raw/API endpoints — jsDelivr isn't part of GitHub's
// rate-limit bucket, so it doesn't need a token and won't 403 under repeated
// CI builds the way api.github.com does. Its one quirk: the very first
// request to a ref jsDelivr hasn't mirrored yet can 503 while it fetches from
// GitHub in the background; retryFetch below rides that out.
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const REPO = 'Joule-Standard/spec';
const rootDir = path.resolve(import.meta.dirname, '..');
const docsDir = path.join(rootDir, 'src/content/docs');
const figuresDir = path.join(rootDir, 'public/figures');
const REF = process.env.SPEC_REF || (await readFile(path.join(rootDir, '.spec-ref'), 'utf8')).trim();
const RAW_BASE = `https://cdn.jsdelivr.net/gh/${REPO}@${REF}/`;
// Astro's content-layer cache doesn't invalidate when only remark plugins or
// astro.config.mjs change (only on content changes it notices), so it can
// silently serve stale pre-rendered markdown. Clearing it here guarantees
// every `content:sync` is followed by a fresh render.
const contentCacheDir = path.join(rootDir, 'node_modules/.astro');

async function retryFetch(url, attempts = 4) {
  for (let i = 0; i < attempts; i += 1) {
    const res = await fetch(url);
    if (res.ok) return res;
    if (i === attempts - 1) throw new Error(`Fetch failed (${res.status}) for ${url}`);
    const delayMs = 2 ** i * 1000;
    console.log(`  ${url} -> ${res.status}, retrying in ${delayMs}ms...`);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
}

async function fetchText(url) {
  const res = await retryFetch(url);
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
  const res = await retryFetch(
    `https://data.jsdelivr.com/v1/packages/gh/${REPO}@${REF}?structure=flat`,
  );
  const { files } = await res.json();
  const figures = files.filter((f) => f.name.startsWith('/assets/figures/') && f.name.endsWith('.svg'));

  await Promise.all(
    figures.map(async (f) => {
      const name = f.name.split('/').pop();
      const svg = ensureSvgNamespace(await fetchText(`${RAW_BASE}${f.name.slice(1)}`));
      await writeFile(path.join(figuresDir, name), svg, 'utf8');
      console.log(`  wrote public/figures/${name}`);
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
