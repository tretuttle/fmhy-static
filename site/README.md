# FMHY Static

An unofficial, auto-updating static mirror of [FMHY](https://fmhy.net) — the largest collection of free stuff on the internet — built with [One](https://onestack.dev) and [Tamagui](https://tamagui.dev), deployed at [fmhy-static.expo.app](https://fmhy-static.expo.app).

Wiki content lives in the repo-root `docs/` folder (a mirror of [fmhy/edit](https://github.com/fmhy/edit)) and is parsed into structured JSON that the app renders.

## Features

- **Static Site Generation** — every wiki page prerendered with One's SSG mode
- **Wiki parity** — sections, entries, starred items, notices, tooltips and NSFW entries matching fmhy.net rendering
- **MiniSearch-powered search** — flat results, detailed view, excerpts, match cycling and pagination mirroring fmhy.net's local search
- **Catppuccin / Monochrome theming** — dark/light/system with the fmhy.net theme palettes
- **SEO / head parity** — per-page canonical, Open Graph and Twitter tags with the `:title • freemediaheckyeah` title scheme
- **OG cards** — 1200x630 branded Open Graph image generated per route at prebuild (satori + sharp)
- **PWA basics** — `manifest.webmanifest`, favicon.ico, apple-touch and PWA icons generated from the FMHY logo
- **sitemap.xml + robots.txt** — sitemap generated from the SSG output after each build

### Performance

- **Aggressive Script Loading** — deferred JS loading after LCP for fast initial paint
- **Inline Layout CSS** — critical CSS inlined for instant styling
- **React Compiler** — automatic memoization for optimal re-renders
- **Tamagui Optimization** — style extraction and tree-shaking in production

## Getting Started

```bash
# install dependencies
bun install

# start dev server
bun dev

# build for production (runs prebuild image generation + post-build sitemap)
bun run build
```

Open [http://localhost:8081](http://localhost:8081) to see the site.

## Project Structure

```
app/                     # routes (generated wiki routes + home/feedback)
  _layout.tsx            # root layout: header, sidebar, toc, search modal
  index+ssg.tsx          # homepage
  <category>+ssg.tsx     # one route per wiki category

docs/                    # site docs (auto-linked as claude code skills)

public/                  # static assets
  og/                    # generated og cards (gitignored, built by prebuild)
  favicon.ico            # generated from fmhy-logo.webp at prebuild
  manifest.webmanifest   # PWA manifest
  robots.txt

scripts/
  generate-images.tsx    # prebuild: og cards + favicon/pwa icons
  sitemap-gen.ts         # post-build: sitemap.xml (+ feed.rss when posts exist)
  wiki/                  # docs/*.md -> src/features/wiki/generated/*.json
  sync-fmhy.ts           # pull latest wiki content from fmhy/edit
  generate-skills.ts     # claude code skill generation

src/
  components/            # header, sidebar, toc, head meta, ...
  features/wiki/         # wiki rendering, search, filters, generated data
  tamagui/               # tamagui config & themes
```

## Content Pipeline

1. `bun scripts/sync-fmhy.ts` — sync `docs/` from the fmhy/edit mirror
2. `bun scripts/wiki/generate.ts` — parse markdown into `src/features/wiki/generated/`
3. `bun run build` — prebuild og/icon generation, `one build`, then sitemap generation

## Scripts

| Command | Description |
|---------|-------------|
| `bun dev` | Start dev server |
| `bun run build` | Production build (prebuild images + SSG + sitemap) |
| `bun images` | Regenerate og cards and icons only |
| `bun skills` | Generate Claude Code skills |
| `bun lint:fix` | Lint and format |
| `ANALYZE=1 bun run build` | Build with bundle analysis |

## Deployment

Static output lands in `dist/client/` and is served by EAS Hosting (`eas deploy`).

## Tech Stack

- [One](https://onestack.dev) - Universal React framework
- [Tamagui](https://tamagui.dev) - Universal UI components
- [Vite](https://vitejs.dev) - Build tool
- [MiniSearch](https://lucaong.github.io/minisearch/) - Client-side search
- [satori](https://github.com/vercel/satori) + [sharp](https://sharp.pixelplumbing.com/) - OG image generation

## License

Parsing/transform rules in `scripts/wiki/**` derive from Apache-2.0 licensed code, Copyright (c) taskylizard (the fmhy/edit website source). Site code MIT.
