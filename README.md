# joulestandard-site

The website for [the Joule Standard](https://joulestandard.org) — an Astro site that publishes the specification and its companion essay.

Content is not authored here. It's pulled at build time from [Joule-Standard/spec](https://github.com/Joule-Standard/spec), which is the source of truth for `SPEC.md`, `MANIFESTO.md`, and the figure SVGs. This repo only owns presentation: layout, styling, and the remark plugins that turn that markdown into the styled page.

## Commands

```
pnpm dev      # sync content, then start the dev server at localhost:4321
pnpm build    # sync content, typecheck, then build the static site to dist/
pnpm preview  # serve the last build of dist/
```

`content:sync` (`scripts/fetch-content.mjs`) always runs before `dev`/`build`. It:

- Fetches `SPEC.md` and `MANIFESTO.md` from the spec repo into `src/content/docs/`, rewriting `assets/figures/...` links to `/figures/...`.
- Fetches the figure SVGs into `public/figures/`, adding an `xmlns` attribute if missing (the source files are authored to be inlined in HTML and don't declare one, which some browsers reject when the file is loaded standalone via `<img src>`).
- Clears Astro's content-layer cache (`node_modules/.astro`). That cache doesn't invalidate on remark-plugin or config changes, only on content changes — without clearing it, edits to the plugins in `src/remark/` can silently render stale output.

All of this fetches through [jsDelivr's GitHub CDN mirror](https://www.jsdelivr.com/documentation#id-github) (`cdn.jsdelivr.net` / `data.jsdelivr.com`), not GitHub's own raw/API endpoints — that isn't part of GitHub's rate-limit bucket, so repeated CI builds don't 403 and no token is needed. Its one quirk: the very first request to a ref jsDelivr hasn't mirrored yet can briefly 503 while it fetches from GitHub in the background; the script retries with backoff to ride that out.

The pinned ref lives in [`.spec-ref`](.spec-ref) — that's what the spec repo's release workflow bumps automatically on each new tag (see Deployment below). Override it locally with `SPEC_REF`, which always wins over the file:

```
SPEC_REF=v0.1.1 pnpm build
```

None of `src/content/docs/*.md` or `public/figures/*.svg` are committed — they're regenerated every sync. `docs/` at the repo root is unrelated: local design-reference mockups, gitignored, not part of the build.

## How the markdown becomes the page

The spec and manifesto use a handful of conventions with no native markdown equivalent — a `remark` plugin in `src/remark/` handles each one:

| Plugin | Convention it matches |
|---|---|
| `masthead.mjs` | Leading title/subtitle/standfirst/meta-line block at the top of each doc |
| `figures.mjs` | `![**Figure N — Title.** Caption](path)` + duplicate italic caption line → `<figure>` |
| `callouts.mjs` | `> 🔹 **In plain terms:**` / `> 📜 **Lineage:**` blockquotes |
| `lede.mjs` | The paragraph immediately following an `<h2>` |
| `failureModes.mjs` | `**FM-1 — Title**` / `**AO-1 — "Quote"**` blocks, with an optional `***Counter**...*` line |
| `rules.mjs` | `**C-1.** **Title.** Body` (constitution/ordering rule lists) |
| `glossary.mjs` | `**Term**\n: definition\n *(Plainly: ...)*` glossary entries |
| `parts.mjs` | Standalone `*Part label*` markers → `<section class="part">` with the eyebrow rule |

They run in that order (see `astro.config.mjs`) because `parts.mjs` regroups whatever's left into sections last.

## Deployment

Static output, deployed as a Cloudflare Worker with static assets (see [`wrangler.jsonc`](wrangler.jsonc)) — no server code, `assets.directory` just points at `dist`. Cloudflare's git integration builds and deploys automatically on every push to this repo's `main` (build command `pnpm build`).

### Release pipeline

Releasing a new spec version is: **push a `v*` tag to `Joule-Standard/spec`.** Nothing to touch in this repo. That triggers:

1. **`spec` repo**: [`.github/workflows/bump-site.yml`](https://github.com/Joule-Standard/spec/blob/main/.github/workflows/bump-site.yml) runs on the tag push. It checks out this repo (using a `SITE_REPO_TOKEN` secret stored on the `spec` repo — a fine-grained PAT scoped only to `Joule-Standard/site`, Contents: read/write), rewrites `.spec-ref` to the new tag name, and pushes.
2. **This repo**: that push (authored by `github-actions[bot]`) lands on `main` like any other commit.
3. **Cloudflare**: its git integration sees the push and rebuilds automatically. `content:sync` reads the freshly-bumped `.spec-ref` and fetches exactly that tag via jsDelivr (see above).

So the full chain is: `spec` tag → GitHub Action → commit here → Cloudflare build → live. Each step is independently inspectable if something goes wrong:

- Did the tag trigger the workflow? `gh run list --repo Joule-Standard/spec --workflow=bump-site.yml`
- Did it push the bump commit? `gh api repos/Joule-Standard/site/commits/main` should show a recent `github-actions[bot]` commit.
- Did Cloudflare build and deploy it? Check the Worker's **Deployments** tab in the Cloudflare dashboard — build logs live there if it failed.

No Cloudflare-side build variables should be needed for normal operation (we briefly used a temporary `SPEC_REF=main` override while bootstrapping this pipeline — it's been removed).
