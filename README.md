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

Pin the content to a specific tag with `SPEC_REF` (defaults to `v0.1.0`):

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

Static output, deployed to Cloudflare Pages (build command `pnpm build`, output directory `dist`). The update pipeline: a GitHub Action in the `spec` repo hits a Cloudflare Pages deploy hook on push to a tag, which triggers a rebuild here — `content:sync` then pulls whatever `SPEC_REF` is pinned to.
