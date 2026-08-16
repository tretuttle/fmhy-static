# fmhy-static

An unofficial, auto-updating static mirror of [FMHY](https://fmhy.net) — the internet's largest collection of free stuff — live at **[fmhy-static.expo.app](https://fmhy-static.expo.app)**.

Every wiki page is prerendered to static HTML, restyled with [Tamagui](https://tamagui.dev), and kept in lockstep with the real site by an hourly, parity-gated pipeline.

## How it stays current

The mirror never hand-copies content. A scheduled workflow polls [fmhy/edit](https://github.com/fmhy/edit) hourly, and when upstream moves it runs the full pipeline:

1. **Sync** — clone/update fmhy/edit and regenerate the wiki dataset (sections, entries, notes, sidebar, nav, emoji, brand assets) directly from their source at a single commit.
2. **Reference build** — build *their* VitePress site at that same commit.
3. **Parity gate** — every external link their rendered HTML contains must exist in the generated dataset (~27,000 links at last count). Any miss stops the deploy.
4. **Build & deploy** — static-render all pages and ship `dist/client` to EAS Hosting.

Gates check existence, never today's shape, so upstream growth can't wedge a deploy — and nothing upstream is ever snapshotted into this repo where it could go stale.

## Performance

The wiki pages are large (the Movies / TV / Anime page renders ~900 entries), so the renderer is built around keeping the first paint free and hydration off the critical path:

- Entry rows render as plain flattened markup styled by a few shared CSS classes, instead of per-element styled components — halving the HTML and most of the hydration work.
- Hydration is deferred until after the first frame commits, so the fully server-rendered page paints immediately and React attaches afterwards.
- The body font is preloaded, so the first paint is also the final paint (no font-swap repaint, zero layout shift).

Measured on the heaviest page: **LCP ~200 ms, CLS 0.00**.

## Stack

[One](https://onestack.dev) (SSG) · [Tamagui](https://tamagui.dev) · [Bun](https://bun.sh) · [MiniSearch](https://lucaong.github.io/minisearch/) · [satori](https://github.com/vercel/satori)/[sharp](https://sharp.pixelplumbing.com/) OG cards

Development docs live in [`site/README.md`](site/README.md).

## Credits & disclaimer

This project is not affiliated with or endorsed by FMHY. All wiki content belongs to the [FMHY community](https://github.com/fmhy/edit) — this mirror exists to render it fast and faithfully, and links back to [fmhy.net](https://fmhy.net) throughout. Parsing/transform rules in `site/scripts/wiki/` derive from the Apache-2.0 licensed fmhy/edit site source, Copyright (c) taskylizard. Site code is MIT.
