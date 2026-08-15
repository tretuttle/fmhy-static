#!/usr/bin/env bun

/**
 * prebuild image generation:
 *
 * 1. og cards — 1200x630 branded card per route (satori + sharp), mirroring
 *    fmhy.net's opengraph hook (docs/.vitepress/hooks/opengraph.ts upstream):
 *    "freemediaheckyeah" wordmark + FMHY mark up top, page title + description
 *    bottom-left on a dark purple/cyan gradient. Written to public/og/<slug>.webp.
 *    The slug scheme matches ogSlugFromPathname() in src/components/HeadInfo.tsx:
 *    '/' -> 'home', '/other/backups' -> 'other-backups'.
 *
 * 2. favicons / pwa icons — favicon.ico (16/32/48 png-in-ico), apple-touch-icon.png
 *    (180px), pwa-192.png and pwa-512.png, all derived from public/upstream/pwa_icon.png (copied from fmhy/edit at sync).
 */

import { createHash } from 'node:crypto'
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { join } from 'node:path'

import satori from 'satori'
import sharp from 'sharp'

const cwd = process.cwd()
const publicDir = join(cwd, 'public')
const ogDir = join(publicDir, 'og')
const generatedDir = join(cwd, 'src', 'features', 'wiki', 'generated')
const pagesDir = join(generatedDir, 'pages')
const buildCacheDir = join(cwd, 'node_modules', '.cache', 'fmhy-og')
const fontCacheDir = join(buildCacheDir, 'fonts')

const OG_WIDTH = 1200
const OG_HEIGHT = 630

// bump to invalidate every cached og card when the design changes
const DESIGN_VERSION = 1

// page ids whose route is not simply `/${id}` (mirrors app/ route filenames)
const ID_ROUTE_OVERRIDES: Record<string, string> = {
  backups: '/other/backups',
  changelog: '/posts/changelog-sites',
}

type OgPage = { route: string; title: string; description: string | null }

function ogSlugForRoute(route: string): string {
  const clean = route.replace(/^\/+|\/+$/g, '')
  return clean === '' ? 'home' : clean.replace(/\//g, '-')
}

// ---------------------------------------------------------------------------
// page list: generated wiki pages + hardcoded home/feedback (+ posts if present)
// ---------------------------------------------------------------------------

function collectPages(): OgPage[] {
  const pages: OgPage[] = [
    {
      // mirrors upstream's home og card (hero name + tagline)
      route: '/',
      title: 'freemediaheckyeah',
      description: 'The largest collection of free stuff on the internet!',
    },
    {
      route: '/feedback',
      title: 'Feedback',
      description: 'Anonymous comments taken from Reddit, Discord, X.com and our feedback system.',
    },
  ]

  for (const file of readdirSync(pagesDir).sort()) {
    if (!file.endsWith('.json')) continue
    const page = JSON.parse(readFileSync(join(pagesDir, file), 'utf8')) as {
      id: string
      title: string
      description?: string | null
    }
    pages.push({
      route: ID_ROUTE_OVERRIDES[page.id] ?? `/${page.id}`,
      title: page.title,
      description: page.description ?? null,
    })
  }

  // blog posts manifest is produced by a separate generator and may not exist
  const postsManifest = join(generatedDir, 'posts.json')
  if (existsSync(postsManifest)) {
    const posts = JSON.parse(readFileSync(postsManifest, 'utf8')) as {
      slug: string
      title: string
      description?: string | null
    }[]
    pages.push({ route: '/posts', title: 'Posts', description: 'FMHY Blog' })
    for (const post of posts) {
      pages.push({
        route: `/posts/${post.slug}`,
        title: post.title,
        description: post.description ?? null,
      })
    }
  }

  // last write wins on duplicate routes (e.g. a posts entry for changelog-sites)
  const byRoute = new Map(pages.map((p) => [p.route, p]))
  return [...byRoute.values()]
}

// ---------------------------------------------------------------------------
// fonts (satori needs static ttf/otf/woff — Inter, same family fmhy.net uses)
// ---------------------------------------------------------------------------

const FONT_FILES = [
  { weight: 400 as const, file: 'inter-latin-400-normal.woff' },
  { weight: 600 as const, file: 'inter-latin-600-normal.woff' },
  { weight: 700 as const, file: 'inter-latin-700-normal.woff' },
]

async function loadFonts() {
  mkdirSync(fontCacheDir, { recursive: true })
  const fonts: { name: string; data: Buffer; weight: 400 | 600 | 700; style: 'normal' }[] = []
  for (const { weight, file } of FONT_FILES) {
    const cached = join(fontCacheDir, file)
    let data: Buffer
    if (existsSync(cached)) {
      data = readFileSync(cached)
    } else {
      const res = await fetch(`https://cdn.jsdelivr.net/npm/@fontsource/inter@5.2.5/files/${file}`)
      if (!res.ok) throw new Error(`font fetch failed: ${file} (${res.status})`)
      data = Buffer.from(await res.arrayBuffer())
      writeFileSync(cached, data)
    }
    fonts.push({ name: 'Inter', data, weight, style: 'normal' })
  }
  return fonts
}

// ---------------------------------------------------------------------------
// og card template
// ---------------------------------------------------------------------------

function OgCard({
  title,
  description,
  logo,
}: {
  title: string
  description: string | null
  logo: string
}) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '40px',
        backgroundColor: '#101018',
        backgroundImage: 'linear-gradient(135deg, #1d1440 0%, #131325 55%, #0d0d16 100%)',
        fontFamily: 'Inter',
        position: 'relative',
      }}
    >
      {/* gradient accents approximating fmhy.net's og-base backdrop */}
      <div
        style={{
          position: 'absolute',
          top: '-180px',
          left: '-120px',
          width: '760px',
          height: '620px',
          backgroundImage:
            'radial-gradient(circle at 40% 40%, rgba(217, 70, 239, 0.45) 0%, rgba(217, 70, 239, 0) 65%)',
          display: 'flex',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '40px',
          right: '-160px',
          width: '640px',
          height: '560px',
          backgroundImage:
            'radial-gradient(circle at 55% 45%, rgba(34, 211, 238, 0.3) 0%, rgba(34, 211, 238, 0) 60%)',
          display: 'flex',
        }}
      />

      <div style={{ display: 'flex', alignItems: 'center' }}>
        <img
          src={logo}
          width={64}
          height={64}
          style={{ borderRadius: '14px', marginRight: '20px' }}
        />
        <span style={{ fontSize: '48px', fontWeight: 600, color: '#f4f4f5' }}>
          freemediaheckyeah
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          paddingRight: '200px',
        }}
      >
        <span
          style={{
            fontSize: '60px',
            fontWeight: 700,
            color: '#f3f4f6',
            lineHeight: 1.15,
          }}
        >
          {title}
        </span>
        {description && (
          <span
            style={{
              marginTop: '10px',
              fontSize: '36px',
              fontWeight: 400,
              color: '#c0caf5',
              lineHeight: 1.3,
            }}
          >
            {description}
          </span>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// icons
// ---------------------------------------------------------------------------

// single-file ICO container with png-encoded entries (supported by every
// modern browser; 256+ px would need the 0-size convention, we stay small)
function pngsToIco(pngs: { size: number; data: Buffer }[]): Buffer {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0) // reserved
  header.writeUInt16LE(1, 2) // type: icon
  header.writeUInt16LE(pngs.length, 4)

  const entries: Buffer[] = []
  let offset = 6 + 16 * pngs.length
  for (const { size, data } of pngs) {
    const entry = Buffer.alloc(16)
    entry.writeUInt8(size, 0) // width
    entry.writeUInt8(size, 1) // height
    entry.writeUInt8(0, 2) // palette count
    entry.writeUInt8(0, 3) // reserved
    entry.writeUInt16LE(1, 4) // color planes
    entry.writeUInt16LE(32, 6) // bits per pixel
    entry.writeUInt32LE(data.length, 8)
    entry.writeUInt32LE(offset, 12)
    entries.push(entry)
    offset += data.length
  }
  return Buffer.concat([header, ...entries, ...pngs.map((p) => p.data)])
}

async function generateIcons(logoPath: string) {
  const logo = readFileSync(logoPath)
  const resize = (size: number) =>
    sharp(logo).resize(size, size).png({ compressionLevel: 9 }).toBuffer()

  const [png16, png32, png48, png180, png192, png512] = await Promise.all([
    resize(16),
    resize(32),
    resize(48),
    resize(180),
    resize(192),
    resize(512),
  ])

  writeFileSync(
    join(publicDir, 'favicon.ico'),
    pngsToIco([
      { size: 16, data: png16! },
      { size: 32, data: png32! },
      { size: 48, data: png48! },
    ])
  )
  writeFileSync(join(publicDir, 'apple-touch-icon.png'), png180!)
  writeFileSync(join(publicDir, 'pwa-192.png'), png192!)
  writeFileSync(join(publicDir, 'pwa-512.png'), png512!)
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

console.info()
console.info('generate-images: favicons + og cards')
console.info()

// raster source derived from upstream's own docs/public (see generate.ts brand
// assets) — never a checked-in copy that can go stale
const logoPath = join(publicDir, 'upstream', 'pwa_icon.png')
if (!existsSync(logoPath)) {
  console.error('  missing public/upstream/pwa_icon.png — run bun scripts/sync-fmhy.ts first')
  process.exit(1)
}

await generateIcons(logoPath)
console.info('  icons: favicon.ico, apple-touch-icon.png, pwa-192.png, pwa-512.png')

mkdirSync(ogDir, { recursive: true })

const pages = collectPages()

// content-hash cache so unchanged cards skip the satori render on rebuilds
// (lives outside public/ so it never ships with the site)
mkdirSync(buildCacheDir, { recursive: true })
const cacheFile = join(buildCacheDir, 'cards.json')
let cache: Record<string, string> = {}
if (existsSync(cacheFile) && !process.env.OG_FORCE) {
  try {
    cache = JSON.parse(readFileSync(cacheFile, 'utf8'))
  } catch {
    cache = {}
  }
}

// the logo bytes are part of the key: when upstream swaps their icon (they do
// it seasonally), every card re-renders automatically — no version bump needed
const logoHash = createHash('sha256').update(readFileSync(logoPath)).digest('hex').slice(0, 12)

const hashFor = (page: OgPage) =>
  createHash('sha256')
    .update(`${DESIGN_VERSION}\0${logoHash}\0${page.title}\0${page.description ?? ''}`)
    .digest('hex')
    .slice(0, 16)

let fonts: Awaited<ReturnType<typeof loadFonts>>
try {
  fonts = await loadFonts()
} catch (error) {
  // don't fail the whole build offline — existing og cards keep working
  console.warn(`  og: skipped (fonts unavailable: ${error})`)
  process.exit(0)
}

const logoPng = await sharp(readFileSync(logoPath)).resize(128, 128).png().toBuffer()
const logoDataUrl = `data:image/png;base64,${logoPng.toString('base64')}`

let rendered = 0
let cached = 0
const nextCache: Record<string, string> = {}

for (const page of pages) {
  const slug = ogSlugForRoute(page.route)
  const outFile = join(ogDir, `${slug}.webp`)
  const hash = hashFor(page)
  nextCache[slug] = hash

  if (cache[slug] === hash && existsSync(outFile)) {
    cached++
    continue
  }

  const svg = await satori(
    <OgCard title={page.title} description={page.description} logo={logoDataUrl} />,
    { width: OG_WIDTH, height: OG_HEIGHT, fonts }
  )
  const webp = await sharp(Buffer.from(svg)).webp({ quality: 75 }).toBuffer()
  writeFileSync(outFile, webp)
  rendered++
}

// prune cards for routes that no longer exist
let pruned = 0
for (const file of readdirSync(ogDir)) {
  if (!file.endsWith('.webp')) continue
  if (!(file.slice(0, -5) in nextCache)) {
    unlinkSync(join(ogDir, file))
    pruned++
  }
}

writeFileSync(cacheFile, `${JSON.stringify(nextCache, null, 2)}\n`)

console.info(
  `  og: ${pages.length} cards (${rendered} rendered, ${cached} cached, ${pruned} pruned)`
)
console.info()
