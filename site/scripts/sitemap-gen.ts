#!/usr/bin/env bun

/**
 * post-build: writes dist/client/sitemap.xml from the SSG html output, and
 * dist/client/feed.rss from src/features/wiki/generated/posts.json when that
 * manifest exists (mirrors fmhy.net's hooks/rss.ts channel fields).
 *
 * Wired into package.json: "build": "one build && bun scripts/sitemap-gen.ts"
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const SITE_URL = process.env.ONE_SERVER_URL || 'https://fmhy-static.expo.app'

const cwd = process.cwd()
const distClient = join(cwd, 'dist', 'client')
const postsManifest = join(cwd, 'src', 'features', 'wiki', 'generated', 'posts.json')

if (!existsSync(distClient)) {
  console.error('sitemap-gen: dist/client not found — run `one build` first')
  process.exit(1)
}

const escapeXml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')

// ---------------------------------------------------------------------------
// sitemap.xml
// ---------------------------------------------------------------------------

function collectHtmlFiles(dir: string): string[] {
  const files: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...collectHtmlFiles(full))
    } else if (entry.name.endsWith('.html')) {
      files.push(full)
    }
  }
  return files
}

const routes = collectHtmlFiles(distClient)
  .map((file) => relative(distClient, file).replaceAll('\\', '/'))
  // '+not-found.html' and any other special files aren't real routes
  .filter((path) => !path.split('/').some((segment) => segment.startsWith('+')))
  .map((path) => {
    const noExt = path.slice(0, -'.html'.length)
    if (noExt === 'index') return '/'
    if (noExt.endsWith('/index')) return `/${noExt.slice(0, -'/index'.length)}`
    return `/${noExt}`
  })
  .sort()

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes.map((route) => `  <url><loc>${escapeXml(`${SITE_URL}${route}`)}</loc></url>`).join('\n')}
</urlset>
`

writeFileSync(join(distClient, 'sitemap.xml'), sitemap)
console.info(`sitemap-gen: sitemap.xml written (${routes.length} urls)`)

// ---------------------------------------------------------------------------
// feed.rss (only when the posts manifest exists)
// ---------------------------------------------------------------------------

if (existsSync(postsManifest)) {
  type Post = { slug: string; title: string; date?: string; description?: string | null }
  const posts = (JSON.parse(readFileSync(postsManifest, 'utf8')) as Post[])
    .filter((post) => post.slug && post.title)
    .sort((a, b) => Number(new Date(b.date ?? 0)) - Number(new Date(a.date ?? 0)))

  const items = posts
    .map((post) => {
      const url = `${SITE_URL}/posts/${post.slug}`
      return [
        '    <item>',
        `      <title>${escapeXml(post.title)}</title>`,
        `      <link>${escapeXml(url)}</link>`,
        `      <guid>${escapeXml(url)}</guid>`,
        post.date ? `      <pubDate>${new Date(post.date).toUTCString()}</pubDate>` : null,
        post.description
          ? `      <description>${escapeXml(post.description)}</description>`
          : null,
        '    </item>',
      ]
        .filter(Boolean)
        .join('\n')
    })
    .join('\n')

  // channel fields mirror upstream docs/.vitepress/hooks/rss.ts
  const rss = `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0">
  <channel>
    <title>FMHY blog</title>
    <link>${escapeXml(SITE_URL)}</link>
    <description>The largest collection of free stuff on the internet!</description>
    <language>en-US</language>
    <copyright>Copyright (c) 2023-present FMHY</copyright>
    <image>
      <title>FMHY blog</title>
      <url>https://github.com/fmhy.png</url>
      <link>${escapeXml(SITE_URL)}</link>
    </image>
${items}
  </channel>
</rss>
`

  writeFileSync(join(distClient, 'feed.rss'), rss)
  console.info(`sitemap-gen: feed.rss written (${posts.length} posts)`)
} else {
  console.info('sitemap-gen: no generated/posts.json — feed.rss skipped')
}
