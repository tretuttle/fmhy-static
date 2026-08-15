/**
 * Parity gate: prove the mirror is 1:1 with fmhy.net for the same commit.
 *
 * Their vitepress build (.fmhy-edit/docs/.vitepress/dist) is the exact HTML
 * fmhy.net serves. For every wiki page we compare the set of EXTERNAL links in
 * their rendered content region against the external links in our generated
 * page JSON. External links are the wiki's actual content — every entry, every
 * mirror, every sublink — so if the sets match, the mirror carries the same
 * content as the real site, verified against their own tooling, offline.
 *
 * Internal-route links are our own dialect by design (their /video#x vs our
 * crossrefRoute) and are not compared here.
 *
 * Run their build first:
 *   bun scripts/sync-fmhy.ts --install
 *   cd .fmhy-edit && corepack pnpm docs:build
 * Then: bun scripts/parity-check.ts
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { assertFmhyRoot } from './wiki/fmhy-root'

const SITE = join(import.meta.dir, '..')
const ROOT = assertFmhyRoot()
const DIST = join(ROOT, 'docs', '.vitepress', 'dist')
const PAGES = join(SITE, 'src', 'features', 'wiki', 'generated', 'pages')

if (!existsSync(join(DIST, 'index.html'))) {
  console.error(
    `their build output not found at ${DIST} — run \`corepack pnpm docs:build\` in .fmhy-edit first`,
  )
  process.exit(2)
}

// wiki pages = what our generator emitted (already derived from their config)
import { loadUpstream } from './wiki/upstream'
const upstream = await loadUpstream(join(ROOT, 'docs'))

const decodeEntities = (s: string): string =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')

// normalize an external url so cosmetic differences don't count as drift:
// entity decoding, percent-encoding, trailing slash (also before a fragment)
const norm = (u: string): string | null => {
  let url = decodeEntities(u.trim())
  if (!/^https?:\/\//i.test(url)) return null
  try {
    url = decodeURI(url)
  } catch {
    // malformed escapes — compare as-is
  }
  url = url.replace(/\/+(?=#|$)/, '')
  // fragments: their renderer slugifies even external anchors (digit-leading
  // gets a "_" prefix, "_" becomes "-"), and reddit-era fragments carry
  // wiki_/.25B7 junk their transform strips. Ours stay source-faithful, so
  // compare on a fragment-normalized form — the target resource is identical.
  const hash = url.indexOf('#')
  if (hash < 0) return url
  const frag = url
    .slice(hash + 1)
    .toLowerCase()
    .replace(/^wiki[_-]/, '')
    .replace(/\.25b[a7][_-]?/g, '')
    .replace(/_/g, '-')
    .replace(/^[-]+/, '')
  return `${url.slice(0, hash)}#${frag}`
}

/** external hrefs inside their rendered content region (main > .vp-doc) */
const theirLinks = (html: string): Set<string> => {
  const main = /<main\b[^>]*>([\s\S]*?)<\/main>/.exec(html)?.[1] ?? ''
  const out = new Set<string>()
  for (const m of main.matchAll(/href="([^"]+)"/g)) {
    const n = norm(m[1]!)
    if (n) out.add(n)
  }
  return out
}

/** every external url anywhere in our generated page JSON — walks the parsed
 *  tree so urls in plain fields survive intact (parens included), and scans
 *  longer strings (notice/prose markdown) for markdown-style links */
const MD_URL_RE = /\((https?:\/\/[^()\s]+(?:\([^()\s]*\)[^()\s]*)*)\)|https?:\/\/[^()\s"<>\]]+/g
const ourLinks = (json: string): Set<string> => {
  const out = new Set<string>()
  const walk = (v: unknown): void => {
    if (typeof v === 'string') {
      if (v.startsWith('http://') || v.startsWith('https://')) {
        const n = norm(v)
        if (n) out.add(n)
      } else if (v.includes('http')) {
        for (const m of v.matchAll(MD_URL_RE)) {
          const n = norm(m[1] ?? m[0]!)
          if (n) out.add(n)
        }
      }
    } else if (Array.isArray(v)) {
      for (const x of v) walk(x)
    } else if (v && typeof v === 'object') {
      for (const x of Object.values(v)) walk(x)
    }
  }
  walk(JSON.parse(json))
  return out
}

let failed = false
let totalTheirs = 0
let totalMissing = 0

console.info('parity: our generated data vs their rendered HTML (same commit)')
console.info('page                  theirs   ours   missing-from-ours')
for (const pageId of upstream.pageOrder) {
  const htmlFile = join(DIST, `${pageId}.html`)
  const jsonFile = join(PAGES, `${pageId}.json`)
  if (!existsSync(htmlFile) || !existsSync(jsonFile)) {
    console.error(`FAIL ${pageId}: missing ${existsSync(htmlFile) ? jsonFile : htmlFile}`)
    failed = true
    continue
  }
  const theirs = theirLinks(readFileSync(htmlFile, 'utf8'))
  const ours = ourLinks(readFileSync(jsonFile, 'utf8'))
  const missing = [...theirs].filter((u) => !ours.has(u))
  totalTheirs += theirs.size
  totalMissing += missing.length
  const ok = missing.length === 0
  if (!ok) failed = true
  console.info(
    `${pageId.padEnd(22)} ${String(theirs.size).padStart(5)} ${String(ours.size).padStart(6)} ` +
      `${String(missing.length).padStart(6)}  ${ok ? 'OK' : 'FAIL'}`,
  )
  for (const u of missing.slice(0, 5)) console.info(`    ! ${u.slice(0, 110)}`)
}

console.info('-----------------------------------------')
console.info(
  `their content links: ${totalTheirs} · missing from our data: ${totalMissing}`,
)
if (failed) {
  console.error('\nPARITY FAILED — the mirror does not carry everything fmhy.net renders')
  process.exit(1)
}
console.info('\nparity OK — every external link fmhy.net renders is in the mirror data')
