# Takeout Static

A beautiful, minimal personal site and blog template built with [One](https://onestack.dev) and [Tamagui](https://tamagui.dev).

## Features

### Core

- **Static Site Generation** - Fast, SEO-friendly pages with One's SSG mode
- **MDX Blog** - Write posts in markdown with React components
- **Tamagui UI** - Beautiful, performant universal components
- **Dark/Light/System Mode** - Three-way theme toggle with system preference support
- **Responsive Design** - Mobile-first with configurable breakpoints

### Performance

- **Aggressive Script Loading** - Deferred JS loading after LCP for fast initial paint
- **Inline Layout CSS** - Critical CSS inlined for instant styling
- **React Compiler** - Automatic memoization for optimal re-renders
- **Tamagui Optimization** - Style extraction and tree-shaking in production
- **Chunk Optimization** - Aggressive code splitting with 30KB minimum chunks

### Images

- **OG Image Generation** - Dynamic Open Graph images via `/og/[slug]` API route
- **Automatic Thumbnails** - `bun thumbs` generates 400px thumbnails from blog images
- **Image Optimization** - Convert and resize images to WebP at 2x retina (1640px max)
- **Blur Placeholders** - Low-quality image placeholders for smooth loading

### Blog

- **Auto Table of Contents** - Horizontal scrolling section links extracted from headings
- **Smart Typography** - Automatic curly quotes, em-dashes via remark-smartypants
- **Rich MDX Components** - Styled headings, code blocks, blockquotes, lists, notices, details/summary
- **External Link Icons** - Automatic arrow indicator on outbound links
- **Draft Support** - Hide posts with `draft: true` in production

### Developer Experience

- **Claude Code Skills** - Auto-generated AI coding assistant documentation from `docs/`
- **oxlint + oxfmt** - Fast linting and formatting
- **TypeScript** - Full type safety with strict mode
- **Vercel Deploy** - Zero-config deployment with `vercel.json`
- **Bundle Analysis** - `ANALYZE=1 bun build` for size visualization

### UI Polish

- **Floating Header** - Scroll-aware header with blur backdrop and shadow
- **Tooltips** - Hover tooltips on icon buttons
- **JetBrains Mono** - Clean monospace typography throughout
- **Smooth Transitions** - CSS-only animations for theme and hover states

## Getting Started

```bash
# install dependencies
bun install

# start dev server
bun dev

# build for production
bun build

# generate thumbnails
bun thumbs
```

Open [http://localhost:8081](http://localhost:8081) to see your site.

## Project Structure

```
app/                    # routes
  _layout.tsx          # root layout with header/footer
  index+ssg.tsx        # homepage
  writing+ssg.tsx      # blog index
  [slug]+ssg.tsx       # blog post pages
  og/[slug]+api.tsx    # dynamic OG image generation

data/
  blog/                # mdx blog posts

docs/                  # documentation (auto-linked as claude code skills)

public/                # static assets
  *.webp              # images
  thumbs/             # auto-generated thumbnails
  *.woff2             # fonts
  favicon.svg

scripts/
  generate-thumbnails.ts  # thumbnail generation
  generate-skills.ts      # claude code skill generation
  optimize-images.ts      # image optimization

src/
  components/          # ui components
  icons/              # svg icons
  interface/          # shared ui primitives
  tamagui/            # tamagui config & themes
```

## Customization

### Site Info

Update these files with your details:

1. `src/components/HeadInfo.tsx` - `SITE_NAME` and `SITE_URL`
2. `src/components/Header.tsx` - Name and social links
3. `src/components/Footer.tsx` - Name and social links
4. `app/_layout.tsx` - `og:site_name` meta tag
5. `app/[slug]+ssg.tsx` - Article author name
6. `app/og/[slug]+api.tsx` - OG image site name

### Homepage

Edit `app/index+ssg.tsx`:
- `projects` array - Your work/projects
- `timeline` array - Your history/experience

### Theme

Edit `src/tamagui/themes-in.ts` to customize colors and `src/tamagui/breakpoints.ts` for responsive breakpoints.

## Writing Blog Posts

Create a new file in `data/blog/your-post.mdx`:

```mdx
---
title: Your Post Title
publishedAt: '2024-01-15'
description: 'A brief description for SEO and previews.'
image: '/your-image.webp'
draft: false
---

Your content here...
```

### Frontmatter

| Field | Required | Description |
|-------|----------|-------------|
| `title` | Yes | Post title |
| `publishedAt` | Yes | Publication date (YYYY-MM-DD) |
| `description` | No | SEO description |
| `image` | No | Featured image path (triggers OG image + thumbnail) |
| `draft` | No | Set to `true` to hide in production |

### MDX Components

Available custom components:

- `<Notice>` - Callout box for important info
- `<Details>` / `<Summary>` - Collapsible sections

## Image Workflow

1. Add image to `public/` (any format)
2. Run `bun scripts/optimize-images.ts` to convert to WebP
3. Reference in frontmatter: `image: '/your-image.webp'`
4. Run `bun thumbs` to generate thumbnail
5. Blur placeholder is auto-generated by @vxrn/mdx

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import in [Vercel](https://vercel.com)
3. Deploy

### Other Platforms

```bash
bun build
```

Static output: `.vercel/output/static/`

## Scripts

| Command | Description |
|---------|-------------|
| `bun dev` | Start dev server |
| `bun build` | Production build |
| `bun thumbs` | Generate thumbnails |
| `bun skills` | Generate Claude Code skills |
| `bun lint:fix` | Lint and format |
| `ANALYZE=1 bun build` | Build with bundle analysis |

## Tech Stack

- [One](https://onestack.dev) - Universal React framework
- [Tamagui](https://tamagui.dev) - Universal UI components
- [Vite](https://vitejs.dev) - Build tool
- [MDX](https://mdxjs.com) - Markdown with React
- [@vercel/og](https://vercel.com/docs/functions/edge-functions/og-image-generation) - OG image generation
- [sharp](https://sharp.pixelplumbing.com/) - Image processing

## License

MIT
