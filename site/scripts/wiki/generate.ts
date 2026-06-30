/**
 * FMHY wiki content generator — parses content/fmhy/docs/*.md into the JSON
 * bundle consumed by src/features/wiki/data.ts.
 *
 * Run: ~/.bun/bin/bun scripts/wiki/generate.ts  (or: bun wiki:generate)
 *
 * NOTICE: the parsing/transform rules implemented in scripts/wiki/** derive
 * from Apache-2.0 licensed code, Copyright (c) taskylizard — the fmhy/edit
 * website source (docs/.vitepress transformer, search and markdown plugins).
 * See http://www.apache.org/licenses/LICENSE-2.0. Modified: ported to a
 * standalone bun generator emitting structured JSON.
 */

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type {
  SearchDoc,
  WikiNav,
  WikiNavGroup,
  WikiNote,
  WikiNotice,
  WikiPage,
  WikiSection,
  WikiSubsection,
} from '../../src/features/wiki/types'
import {
  EXPECTED_BULLETS,
  NAV_GROUPS,
  PAGE_HEADERS,
  PAGE_ORDER,
  profileFor,
  REDDIT_WIKI_PAGES,
} from './constants'
import { noteIdFromUrl, parsePage, stripInvisible, type PageStats } from './parse'

const SITE = join(import.meta.dirname, '..', '..')
const ROOT = join(import.meta.dirname, '..', '..', '..')
const DOCS_DIR = join(ROOT, 'docs')
const NOTES_DIR = join(ROOT, 'docs', '.vitepress', 'notes')
const OUT_DIR = join(SITE, 'src', 'features', 'wiki', 'generated')

// ---------------------------------------------------------------------------
// parse all pages
// ---------------------------------------------------------------------------

const pages = new Map<string, WikiPage>()
const statsById = new Map<string, PageStats>()

for (const pageId of PAGE_ORDER) {
  const header = PAGE_HEADERS[pageId]!
  const source = readFileSync(join(DOCS_DIR, `${pageId}.md`), 'utf8')
  const { page, stats } = parsePage(
    pageId,
    header.title,
    header.description,
    profileFor(pageId),
    source,
  )
  pages.set(pageId, page)
  statsById.set(pageId, stats)
}

// ---------------------------------------------------------------------------
// crossref resolution (reddit wiki urls → in-app routes)
// ---------------------------------------------------------------------------

type SlugTable = { slugs: Set<string>; norms: Map<string, string> }

const normalize = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')

const slugTables = new Map<string, SlugTable>()
for (const page of pages.values()) {
  const table: SlugTable = { slugs: new Set(), norms: new Map() }
  const add = (id: string) => {
    table.slugs.add(id)
    const n = normalize(id)
    if (!table.norms.has(n)) table.norms.set(n, id)
  }
  for (const section of page.sections) {
    add(section.id)
    for (const sub of section.subsections) add(sub.id)
  }
  slugTables.set(page.id, table)
}

const REDDIT_URL_RE =
  /^https?:\/\/(?:www\.)?reddit\.com\/r\/FREEMEDIAHECKYEAH\/wiki\/([^#]+?)\/?(?:#(.+))?$/i

const cleanFragment = (frag: string): string =>
  frag
    .replace(/^wiki_/, '')
    .replace(/\.25BA_?/gi, '')
    .replace(/\.25B7_?/gi, '')
    .replace(/_?\.2F_?/gi, '-')
    .replace(/_?\.26amp\.3B_?/gi, '-')
    .replace(/(_[a-z]+)2$/, '$1-1')
    .replace(/\.(?=[a-z]+_)/g, '-')
    .replace(/_/g, '-')
    .toLowerCase()

const crossrefStats = {
  resolved: 0,
  anchorFuzzy: 0,
  anchorDropped: 0,
  unresolvable: 0,
}

function resolveRedditUrl(url: string): string | null {
  const m = REDDIT_URL_RE.exec(url.trim())
  if (!m) return null
  const key = m[1]!.toLowerCase().replace(/\/$/, '')
  const mapped = REDDIT_WIKI_PAGES[key]
  if (!mapped) {
    crossrefStats.unresolvable++
    return null
  }
  const pageId = mapped === '@audio-tools' ? 'audio' : mapped
  const defaultAnchor = mapped === '@audio-tools' ? 'audio-tools' : null
  const base = `/${pageId}`
  const frag = m[2]
  if (!frag) {
    crossrefStats.resolved++
    return defaultAnchor ? `${base}#${defaultAnchor}` : base
  }

  const table = slugTables.get(pageId)!
  const f = cleanFragment(frag)
  if (table.slugs.has(f)) {
    crossrefStats.resolved++
    return `${base}#${f}`
  }
  const n = normalize(f)
  const byNorm = table.norms.get(n)
  if (byNorm) {
    crossrefStats.resolved++
    return `${base}#${byNorm}`
  }
  // drop residual percent-escape pairs (reddit encodes '%' as '.') and retry
  const f2 = normalize(f.replace(/\.[0-9a-f]{2}/gi, ''))
  const byNorm2 = f2.length > 0 ? table.norms.get(f2) : undefined
  if (byNorm2) {
    crossrefStats.resolved++
    crossrefStats.anchorFuzzy++
    return `${base}#${byNorm2}`
  }
  if (f2.length >= 3) {
    const candidates = [...table.slugs].filter((slug) => {
      const ns = normalize(slug)
      return ns.startsWith(f2) || f2.startsWith(ns)
    })
    if (candidates.length === 1) {
      crossrefStats.resolved++
      crossrefStats.anchorFuzzy++
      return `${base}#${candidates[0]}`
    }
  }
  // page resolves but the anchor doesn't — drop the stale fragment
  crossrefStats.anchorDropped++
  return base
}

// ---------------------------------------------------------------------------
// notes resolution
// ---------------------------------------------------------------------------

const notes: Record<string, WikiNote> = {}
const missingNotes = new Set<string>()

function resolveNote(noteId: string): boolean {
  if (notes[noteId]) return true
  const file = join(NOTES_DIR, `${noteId}.md`)
  if (!existsSync(file)) {
    missingNotes.add(noteId)
    return false
  }
  const raw = stripInvisible(readFileSync(file, 'utf8')).trim()
  const lines = raw.split('\n')
  let title = noteId
  let bodyLines = lines
  const hi = lines.findIndex((l) => /^#{1,6}\s+\S/.test(l))
  if (hi >= 0) {
    title = lines[hi]!.replace(/^#{1,6}\s+/, '').trim()
    bodyLines = [...lines.slice(0, hi), ...lines.slice(hi + 1)]
  }
  notes[noteId] = { title, markdown: bodyLines.join('\n').trim() }
  return true
}

// ---------------------------------------------------------------------------
// notice markdown: rewrite reddit-wiki links to in-app routes, resolve note refs
// ---------------------------------------------------------------------------

function processNotice(notice: WikiNotice | null): WikiNotice | null {
  if (!notice) return notice
  const markdown = notice.markdown.replace(/\]\(([^()]+)\)/g, (full, target: string) => {
    const url = target.trim()
    const noteId = noteIdFromUrl(url)
    if (noteId) {
      // keep the github href — the UI intercepts note links by pattern
      resolveNote(noteId)
      return full
    }
    const route = resolveRedditUrl(url)
    return route ? `](${route})` : full
  })
  return markdown === notice.markdown ? notice : { kind: notice.kind, markdown }
}

// ---------------------------------------------------------------------------
// walk pages: set crossrefRoute + sub-link/alternative routes + noteId
// ---------------------------------------------------------------------------

let crossrefEntries = 0
let starredEntries = 0
let indexEntries = 0
let refUrlSections = 0
let totalEntries = 0
let nsfwEntries = 0

const eachContainer = function* (
  page: WikiPage,
): Generator<WikiSection | WikiSubsection> {
  for (const section of page.sections) {
    yield section
    for (const sub of section.subsections) yield sub
  }
}

for (const page of pages.values()) {
  page.pageNotice = processNotice(page.pageNotice)
  for (const container of eachContainer(page)) {
    container.notice = processNotice(container.notice)
    if (container.refUrl) {
      refUrlSections++
      container.crossrefRoute = resolveRedditUrl(container.refUrl)
    }
    for (const entry of container.entries) {
      totalEntries++
      if (entry.marker === 'crossref') crossrefEntries++
      if (entry.marker === 'starred') starredEntries++
      if (entry.marker === 'index') indexEntries++
      if (entry.nsfw !== false) nsfwEntries++
      if (entry.url) entry.crossrefRoute = resolveRedditUrl(entry.url)
      for (const alt of entry.alternatives) alt.route = resolveRedditUrl(alt.url)
      for (const link of entry.links) {
        link.route = resolveRedditUrl(link.url)
        const noteId = noteIdFromUrl(link.url)
        if (noteId && resolveNote(noteId)) link.noteId = noteId
      }
    }
  }
}

// ---------------------------------------------------------------------------
// nav
// ---------------------------------------------------------------------------

const sectionEntryCount = (pageId: string, sectionId: string): number => {
  const page = pages.get(pageId)
  const section = page?.sections.find((s) => s.id === sectionId)
  if (!section) return 0
  return (
    section.entries.length +
    section.subsections.reduce((sum, s) => sum + s.entries.length, 0)
  )
}

const sectionDescription = (pageId: string, sectionId: string): string => {
  const page = pages.get(pageId)
  const section = page?.sections.find((s) => s.id === sectionId)
  if (!section) return ''
  return section.subsections
    .map((s) => s.title)
    .filter((t, i, arr) => arr.indexOf(t) === i)
    .slice(0, 4)
    .join(', ')
}

const navGroups: WikiNavGroup[] = NAV_GROUPS.map((group) => ({
  title: group.title,
  collapsed: group.collapsed,
  items: group.items.map((item) => {
    let entryCount = 0
    let description = item.description ?? ''
    if (item.slug === 'audio-tools') {
      entryCount = sectionEntryCount('audio', 'audio-tools')
    } else if (item.slug === 'educational-tools') {
      entryCount = sectionEntryCount('educational', 'educational-tools')
      description = description || sectionDescription('educational', 'educational-tools')
    } else if (pages.has(item.slug)) {
      const page = pages.get(item.slug)!
      entryCount = page.entryCount
      description = description || page.description
    }
    return {
      slug: item.slug,
      title: item.title,
      emoji: item.emoji,
      description,
      route: item.route,
      externalUrl: item.externalUrl,
      entryCount,
    }
  }),
}))

const nav: WikiNav = { generatedAt: new Date().toISOString(), groups: navGroups }

// ---------------------------------------------------------------------------
// search corpus
// ---------------------------------------------------------------------------

const searchDocs: SearchDoc[] = []
let skippedUntitled = 0

for (const page of pages.values()) {
  for (const section of page.sections) {
    const walk = (container: WikiSubsection, sectionPath: string) => {
      for (const entry of container.entries) {
        if (!entry.title) {
          skippedUntitled++
          continue
        }
        searchDocs.push({
          id: entry.id,
          pageId: page.id,
          pageTitle: page.title,
          sectionPath,
          anchor: container.id,
          title: entry.title,
          altTitles: entry.alternatives.map((a) => a.title),
          url: entry.url,
          description: entry.description,
          tags: entry.tags,
          starred: entry.starred,
          isIndex: entry.marker === 'index',
          nsfw: entry.nsfw,
        })
      }
    }
    walk(section, section.title)
    for (const sub of section.subsections) walk(sub, `${section.title} › ${sub.title}`)
  }
}

// ---------------------------------------------------------------------------
// emit
// ---------------------------------------------------------------------------

rmSync(OUT_DIR, { recursive: true, force: true })
mkdirSync(join(OUT_DIR, 'pages'), { recursive: true })

writeFileSync(join(OUT_DIR, 'nav.json'), JSON.stringify(nav))
for (const page of pages.values()) {
  writeFileSync(join(OUT_DIR, 'pages', `${page.id}.json`), JSON.stringify(page))
}
writeFileSync(join(OUT_DIR, 'search-corpus.json'), JSON.stringify(searchDocs))
writeFileSync(join(OUT_DIR, 'notes.json'), JSON.stringify(notes))
writeFileSync(
  join(OUT_DIR, 'json-modules.d.ts'),
  [
    '// generated by scripts/wiki/generate.ts — ambient typing for the generated',
    '// JSON bundle (the repo tsconfig does not enable resolveJsonModule)',
    "declare module '*.json' {",
    '  const data: unknown',
    '  export default data',
    '}',
    '',
  ].join('\n'),
)

// ---------------------------------------------------------------------------
// validation summary
// ---------------------------------------------------------------------------

const DRIFT = 0.03
let failed = false

console.info('\nFMHY wiki generation — validation summary')
console.info('=========================================')
console.info('page                 expected  parsed  notices  total  drift')

for (const pageId of [...PAGE_ORDER].sort()) {
  const stats = statsById.get(pageId)!
  const expected = EXPECTED_BULLETS[pageId]!
  const comparable = stats.countedEntries + stats.noticeBullets
  const drift = Math.abs(comparable - expected) / expected
  const ok = drift <= DRIFT
  if (!ok) failed = true
  console.info(
    `${pageId.padEnd(22)} ${String(expected).padStart(6)} ${String(stats.countedEntries).padStart(7)} ${String(
      stats.noticeBullets,
    ).padStart(
      8,
    )} ${String(stats.entries).padStart(6)}  ${(drift * 100).toFixed(2)}%  ${ok ? 'OK' : 'FAIL'}`,
  )
  for (const u of stats.unexpected.slice(0, 5)) {
    console.info(`  ! unexpected line ${u.line}: ${u.text}`)
  }
}

// aggregate totals are informational only: this mirror live-syncs upstream, so
// totals legitimately grow over time. per-page parse validation is the real gate.
const aggregate = (
  label: string,
  actual: number,
  expected: number,
  tolerance = DRIFT,
) => {
  const drift = Math.abs(actual - expected) / expected
  const ok = drift <= tolerance
  console.info(`${label}: ${actual} (expect ≈${expected}) ${ok ? 'OK' : 'drift'}`)
}

console.info('-----------------------------------------')
aggregate('total entries', totalEntries, 16_100)
aggregate('starred entries', starredEntries, 1_985)
aggregate('index entries', indexEntries, 570)
aggregate('crossref entries', crossrefEntries, 353)
aggregate('sections with refUrl', refUrlSections, 49)
console.info(
  `crossref urls: resolved=${crossrefStats.resolved} (fuzzy-anchor=${crossrefStats.anchorFuzzy}), unverified-anchor-dropped=${crossrefStats.anchorDropped}, unresolvable=${crossrefStats.unresolvable}`,
)
{
  const ok = nsfwEntries >= 60
  if (!ok) failed = true
  console.info(`nsfw-tagged entries: ${nsfwEntries} (expect >= 60) ${ok ? 'OK' : 'FAIL'}`)
}
console.info(
  `notes: ${Object.keys(notes).length} resolved${missingNotes.size ? `, MISSING: ${[...missingNotes].join(', ')}` : ''}`,
)
console.info(
  `search corpus: ${searchDocs.length} docs (${skippedUntitled} untitled entries skipped)`,
)
console.info(`pages written: ${pages.size} → src/features/wiki/generated/`)

if (failed) {
  console.error('\nVALIDATION FAILED — counts drifted beyond tolerance, see above')
  process.exitCode = 1
} else {
  console.info('\nvalidation passed')
}
