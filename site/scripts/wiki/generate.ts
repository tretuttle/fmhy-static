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

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import type {
  SearchCorpus,
  SearchDoc,
  SearchExcerptMap,
  SearchLinkMetadata,
  WikiEntry,
  WikiNav,
  WikiNavGroup,
  WikiNote,
  WikiNotice,
  WikiPage,
  WikiPostMeta,
  WikiProseBlock,
  WikiProsePage,
  WikiSection,
  WikiSubsection,
} from '../../src/features/wiki/types'
import {
  EXPECTED_BULLETS,
  NAV_GROUPS,
  PAGE_HEADERS,
  PAGE_ORDER,
  POST_AUTHORS,
  profileFor,
  PROSE_OTHER_PAGES,
  RECENTLY_REMOVED_HEADER,
  REDDIT_WIKI_PAGES,
} from './constants'
import { noteIdFromUrl, parsePage, stripInvisible, type PageStats } from './parse'
import { parseProse, splitForSearch, type ParsedProse } from './prose'
import { generateRemovedMarkdown } from './removed'

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
// search corpus + excerpts — section-level docs mirroring the real site's
// local-search index (docs/.vitepress/constants.ts _splitIntoSections +
// extractLinkMetadata + stripNoteBlocks) plus per-page rendered excerpt HTML
// (the build-time equivalent of VPLocalSearchBox's client-side page render).
// ---------------------------------------------------------------------------

const searchDocs: SearchDoc[] = []
const searchMetadata: SearchLinkMetadata = {}
// pageId ('video', 'other/backups', 'posts/x') → { anchor → section html }
const searchExcerpts = new Map<string, SearchExcerptMap>()

// sidebar page titles WITH the emoji our sidebar renders — the real client
// prepends the sidebar item text (findPageTitle) to every result's breadcrumb;
// we bake it into `titles` at build time. pages absent from the sidebar
// (posts/*, other/FAQ|selfhosting|wallpapers|backups) get no prepend, exactly
// like the real client when findPageTitle misses.
const SEARCH_PAGE_TITLES: Record<string, string> = {
  'beginners-guide': '📚 Beginners Guide',
  'other/contributing': '💡 Contribute',
}
for (const group of NAV_GROUPS) {
  for (const item of group.items) {
    if (!item.route.startsWith('/') || item.route.includes('#')) continue
    SEARCH_PAGE_TITLES[item.route.slice(1)] = `${item.emoji} ${item.title}`
  }
}

const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

// same token grammar as src/features/wiki/InlineMarkdown.tsx
const INLINE_TOKEN_RE =
  /(`[^`]+`)|(\*\*(?:[^*]|\*(?!\*))+\*\*)|(\[[^\]]+\]\([^()\s]+\))|(<img\b[^>]*?\/?>)/g
const INLINE_LINK_RE = /^\[([^\]]+)\]\(([^()\s]+)\)$/

type InlinePiece =
  | { kind: 'text'; text: string; bold: boolean }
  | { kind: 'code'; text: string }
  | { kind: 'link'; text: string; url: string; bold: boolean }

function parseInline(markdown: string, bold = false): InlinePiece[] {
  const out: InlinePiece[] = []
  let last = 0
  for (const m of markdown.matchAll(INLINE_TOKEN_RE)) {
    const at = m.index ?? 0
    if (at > last) out.push({ kind: 'text', text: markdown.slice(last, at), bold })
    const token = m[0]
    if (token.startsWith('`')) out.push({ kind: 'code', text: token.slice(1, -1) })
    else if (token.startsWith('**')) out.push(...parseInline(token.slice(2, -2), true))
    else if (token.startsWith('<img')) {
      // drop raw <img> from search excerpts/text (rare, note-only content)
    } else {
      const link = token.match(INLINE_LINK_RE)
      if (link) out.push({ kind: 'link', text: link[1]!, url: link[2]!, bold })
      else out.push({ kind: 'text', text: token, bold })
    }
    last = at + token.length
  }
  if (last < markdown.length) out.push({ kind: 'text', text: markdown.slice(last), bold })
  return out
}

const linkOpen = (url: string): string =>
  url.startsWith('/')
    ? `<a href="${escapeHtml(url)}">`
    : `<a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">`

function inlineToHtml(markdown: string): string {
  let html = ''
  for (const piece of parseInline(markdown)) {
    if (piece.kind === 'code') html += `<code>${escapeHtml(piece.text)}</code>`
    else if (piece.kind === 'link') {
      const inner = `${linkOpen(piece.url)}${escapeHtml(piece.text)}</a>`
      html += piece.bold ? `<strong>${inner}</strong>` : inner
    } else {
      html += piece.bold
        ? `<strong>${escapeHtml(piece.text)}</strong>`
        : escapeHtml(piece.text)
    }
  }
  return html
}

const inlineToText = (markdown: string): string =>
  parseInline(markdown)
    .map((piece) => piece.text)
    .join('')

// hyperlink phrases inside inline markdown, for the l/s metadata tiers
const inlineLinkPhrases = (markdown: string): { text: string; bold: boolean }[] =>
  parseInline(markdown)
    .filter((piece): piece is Extract<InlinePiece, { kind: 'link' }> => piece.kind === 'link')
    .map((piece) => ({ text: piece.text, bold: piece.bold }))

// extractLinkMetadata's cleanText: strip invisibles, collapse ws, lowercase
const cleanPhrase = (s: string): string =>
  stripInvisible(s).replace(/\s+/g, ' ').trim().toLowerCase()

type LinkPhrase = { phrase: string; starredBold: boolean }

const MARKER_TWEMOJI_CODE: Record<string, string> = {
  starred: '2b50',
  index: '1f310',
  crossref: '1f501',
}

// entry → excerpt <li> html, mirroring the real page's rendered list rows:
// ⭐ <a><strong>Name</strong></a> [2] or Alt - Description / SubLink / icons
// the parser flattens inline description links ("Use [Adblock](url)") into
// plain text AND extracts them into entry.links — rendering both duplicates
// the label ("Use Adblock / Adblock") where the real page shows one inline
// anchor. Re-linkify the first word-bounded occurrence of each such label
// back into the description markdown and mark that link consumed so the
// trailing sub-link loop skips it.
function relinkifyDescription(entry: WikiEntry): {
  description: string | null
  consumed: Set<number>
} {
  const consumed = new Set<number>()
  let description = entry.description
  if (!description) return { description, consumed }
  entry.links.forEach((link, i) => {
    if (link.icon || link.noteId) return
    const href = link.route ?? link.url
    // label/url must survive the [label](url) inline grammar round-trip
    if (/[[\]()]/.test(link.label) || /[()\s]/.test(href)) return
    const idx = description!.indexOf(link.label)
    if (idx === -1) return
    const before = description![idx - 1]
    const after = description![idx + link.label.length]
    if (before && /[\p{L}\p{N}]/u.test(before)) return
    if (after && /[\p{L}\p{N}]/u.test(after)) return
    description =
      description!.slice(0, idx) +
      `[${link.label}](${href})` +
      description!.slice(idx + link.label.length)
    consumed.add(i)
  })
  return { description, consumed }
}

function entryHtml(entry: WikiEntry): string {
  const parts: string[] = []
  const code = entry.marker ? MARKER_TWEMOJI_CODE[entry.marker] : undefined
  if (code) parts.push(`<img class="vpe-tw" src="/twemoji/${code}.svg" alt="" /> `)

  const title = entry.title ?? entry.url ?? ''
  const nameUrl = entry.crossrefRoute ?? entry.url
  if (nameUrl) {
    const inner = `${linkOpen(nameUrl)}${escapeHtml(title)}</a>`
    parts.push(entry.bold ? `<strong>${inner}</strong>` : inner)
  } else if (title) {
    parts.push(`<strong>${escapeHtml(title)}</strong>`)
  }

  entry.mirrors.forEach((mirror, i) => {
    parts.push(` <sup>${linkOpen(mirror)}${i + 2}</a></sup>`)
  })

  for (const alt of entry.alternatives) {
    const inner = `${linkOpen(alt.route ?? alt.url)}${escapeHtml(alt.title)}</a>`
    parts.push(` or ${alt.bold ? `<strong>${inner}</strong>` : inner}`)
    alt.mirrors.forEach((mirror, i) => {
      parts.push(` <sup>${linkOpen(mirror)}${i + 2}</a></sup>`)
    })
  }

  const tail: string[] = []
  const { description, consumed } = relinkifyDescription(entry)
  if (description) tail.push(inlineToHtml(description))
  for (const [linkIndex, link] of entry.links.entries()) {
    if (consumed.has(linkIndex)) continue // rendered inline in the description
    if (link.noteId) continue // real site strips <Tooltip> notes from search
    const href = link.route ?? link.url
    if (link.icon) {
      tail.push(
        `${linkOpen(href)}<span class="vpsic vpsic-${link.icon}" title="${escapeHtml(link.label)}"></span></a>`,
      )
    } else {
      tail.push(`${linkOpen(href)}${escapeHtml(link.label)}</a>`)
    }
  }
  if (entry.platforms.length > 0) {
    tail.push(
      entry.platforms
        .map((p) => `<span class="vpsic vpsic-${p}" title="${escapeHtml(p)}"></span>`)
        .join(' '),
    )
  }
  tail.forEach((piece, i) => {
    parts.push(i === 0 ? ' - ' : ' / ')
    parts.push(piece)
  })

  const cls = entry.starred ? ' class="starred"' : ''
  return `<li${cls}>${parts.join('')}</li>`
}

// entry → tag-free searchable text (what clearHtmlTags(sectionHtml) yields on
// the real site: names + descriptions + text sub-link labels; icons are empty)
function entryText(entry: WikiEntry): string {
  const parts: string[] = []
  const title = entry.title ?? entry.url ?? ''
  if (title) parts.push(title)
  for (const alt of entry.alternatives) parts.push(`or ${alt.title}`)
  if (entry.description) parts.push(`- ${inlineToText(entry.description)}`)
  const { consumed } = relinkifyDescription(entry)
  for (const [linkIndex, link] of entry.links.entries()) {
    if (link.noteId || link.icon) continue
    if (consumed.has(linkIndex)) continue // its label is already in the description text
    parts.push(`/ ${link.label}`)
  }
  return parts.join(' ')
}

function entryLinkPhrases(entry: WikiEntry): LinkPhrase[] {
  const phrases: LinkPhrase[] = []
  const starredLi = entry.starred
  const title = entry.title ?? entry.url ?? ''
  if ((entry.url || entry.crossrefRoute) && title) {
    phrases.push({ phrase: title, starredBold: starredLi && entry.bold })
  }
  entry.mirrors.forEach((_, i) => phrases.push({ phrase: String(i + 2), starredBold: false }))
  for (const alt of entry.alternatives) {
    phrases.push({ phrase: alt.title, starredBold: starredLi && alt.bold })
    alt.mirrors.forEach((_, i) =>
      phrases.push({ phrase: String(i + 2), starredBold: false }),
    )
  }
  if (entry.description) {
    for (const link of inlineLinkPhrases(entry.description)) {
      phrases.push({ phrase: link.text, starredBold: starredLi && link.bold })
    }
  }
  for (const link of entry.links) {
    if (link.noteId || link.icon) continue
    phrases.push({ phrase: link.label, starredBold: false })
  }
  return phrases
}

// register a section's curated-link metadata (constants.ts globalLinkMetadata)
function registerMetadata(sectionId: string, phrases: LinkPhrase[]) {
  const links = new Set<string>()
  const starredBold = new Set<string>()
  for (const { phrase, starredBold: sb } of phrases) {
    const cleaned = cleanPhrase(phrase)
    if (!cleaned) continue
    if (sb) starredBold.add(cleaned)
    else links.add(cleaned)
  }
  starredBold.forEach((w) => links.delete(w))
  if (links.size > 0 || starredBold.size > 0) {
    searchMetadata[sectionId] = { l: [...links], s: [...starredBold] }
  }
}

// a (sub)section's OWN searchable content: guide prose blocks (notices
// excluded, mirroring stripNoteBlocks) followed by its entry list
function containerSearchParts(container: WikiSubsection): {
  text: string
  html: string
  phrases: LinkPhrase[]
} {
  const textParts: string[] = []
  const htmlParts: string[] = []
  const phrases: LinkPhrase[] = []

  for (const block of container.blocks) {
    if (block.kind === 'notice') continue // stripNoteBlocks equivalent
    const inner = inlineToHtml(block.markdown)
    if (block.kind === 'blockquote') htmlParts.push(`<blockquote><p>${inner}</p></blockquote>`)
    else htmlParts.push(`<p>${inner}</p>`)
    textParts.push(inlineToText(block.markdown))
    for (const link of inlineLinkPhrases(block.markdown)) {
      phrases.push({ phrase: link.text, starredBold: false })
    }
  }

  if (container.entries.length > 0) {
    htmlParts.push(`<ul>${container.entries.map(entryHtml).join('')}</ul>`)
    for (const entry of container.entries) {
      textParts.push(entryText(entry))
      phrases.push(...entryLinkPhrases(entry))
    }
  }

  return {
    text: stripInvisible(textParts.join(' ')).replace(/\s+/g, ' ').trim(),
    html: htmlParts.join(''),
    phrases,
  }
}

// build docs + metadata + excerpts for one structured wiki page
function buildWikiPageSearch(page: WikiPage, routeBase: string, excerptPageId: string) {
  const pageTitle = SEARCH_PAGE_TITLES[excerptPageId] ?? SEARCH_PAGE_TITLES[page.id] ?? null
  const excerptMap: SearchExcerptMap = {}
  let emitted = 0

  const addDoc = (container: WikiSubsection, ancestors: string[]) => {
    const { text, html, phrases } = containerSearchParts(container)
    if (!container.title || !text) return
    const id = `${routeBase}#${container.id}`
    searchDocs.push({
      id,
      title: container.title,
      titles: pageTitle ? [pageTitle, ...ancestors] : [...ancestors],
      text,
    })
    if (html) excerptMap[container.id] = html
    registerMetadata(id, phrases)
    emitted++
  }

  for (const section of page.sections) {
    addDoc(section, [])
    for (const sub of section.subsections) addDoc(sub, [section.title])
  }

  // heading-less pages (other/backups.md is bold-paragraph structured): emit a
  // single lead doc for the whole page — lead docs (no '#') carry no excerpt,
  // matching the real client's lookupExcerptText early-return for hash-less ids
  if (emitted === 0) {
    const texts: string[] = []
    const phrases: LinkPhrase[] = []
    for (const section of page.sections) {
      for (const container of [section, ...section.subsections]) {
        const parts = containerSearchParts(container)
        if (parts.text) texts.push(parts.text)
        phrases.push(...parts.phrases)
      }
    }
    const text = texts.join(' ')
    if (text) {
      searchDocs.push({
        id: routeBase,
        title: page.title,
        titles: pageTitle ? [pageTitle] : [],
        text,
      })
      registerMetadata(routeBase, phrases)
    }
    return
  }

  if (Object.keys(excerptMap).length > 0) searchExcerpts.set(excerptPageId, excerptMap)
}

for (const page of pages.values()) {
  buildWikiPageSearch(page, `/${page.id}`, page.id)
}

// other/backups.md is a wiki-bullet page routed at /other/backups (parsed for
// routes in convert-fmhy.ts) — the real site indexes it, so parse it here too
{
  const backupsFile = join(DOCS_DIR, 'other', 'backups.md')
  if (existsSync(backupsFile)) {
    const { page: backupsPage } = parsePage(
      'backups',
      'Backups',
      'FMHY mirrors & backups',
      profileFor('backups'),
      readFileSync(backupsFile, 'utf8'),
    )
    buildWikiPageSearch(backupsPage, '/other/backups', 'other/backups')
  } else {
    console.warn('missing docs/other/backups.md — skipped from search corpus')
  }
}

// ---------------------------------------------------------------------------
// prose pages (docs/other/*, docs/posts/*, sandbox, recently-removed)
// ---------------------------------------------------------------------------

// `<!-- @include: path -->` (vitepress) — other/contributing.md pulls in
// .github/CONTRIBUTING.md, which our docs-only sync doesn't check out; fall
// back to reading it from the upstream ref.
function resolveIncludes(source: string, baseDir: string): string {
  return source.replace(/<!--\s*@include:\s*(\S+)\s*-->/g, (full, relPath: string) => {
    const local = join(baseDir, relPath)
    if (existsSync(local)) return readFileSync(local, 'utf8')
    // normalize '../../.github/CONTRIBUTING.md' → repo-relative
    const parts: string[] = []
    for (const seg of join(baseDir, relPath).slice(ROOT.length + 1).split('/')) {
      if (seg === '..') parts.pop()
      else if (seg !== '.') parts.push(seg)
    }
    try {
      return execFileSync(
        'git',
        ['-C', ROOT, 'show', `upstream/main:${parts.join('/')}`],
        { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
      )
    } catch {
      console.warn(`could not resolve include ${relPath} (${full})`)
      return ''
    }
  })
}

const prosePages: WikiProsePage[] = []
const postsManifest: WikiPostMeta[] = []
let proseMissing = 0

function buildProsePage(
  id: string,
  header: WikiProsePage['header'],
  parsed: ParsedProse,
): WikiProsePage {
  const authors = parsed.authorNames
    .filter((name) => POST_AUTHORS[name])
    .map((name) => ({ name, github: POST_AUTHORS[name]! }))
  return {
    id,
    route: `/${id}`,
    kind: 'prose',
    header,
    title: parsed.frontmatter.title ?? id,
    description: parsed.frontmatter.description ?? null,
    date: parsed.frontmatter.date ?? null,
    authors,
    blocks: parsed.blocks,
  }
}

// other/* pages (body carries its own h1 — header 'none')
for (const name of PROSE_OTHER_PAGES) {
  const file = join(DOCS_DIR, 'other', `${name}.md`)
  if (!existsSync(file)) {
    console.warn(`missing prose page docs/other/${name}.md`)
    proseMissing++
    continue
  }
  const source = resolveIncludes(readFileSync(file, 'utf8'), join(DOCS_DIR, 'other'))
  prosePages.push(buildProsePage(`other/${name}`, 'none', parseProse(source)))
}

// posts (post layout header) + posts.json manifest for the RSS feed
const postFiles = readdirSync(join(DOCS_DIR, 'posts'))
  .filter((f) => f.endsWith('.md'))
  .sort()
for (const file of postFiles) {
  const slug = file.replace(/\.md$/, '')
  const source = readFileSync(join(DOCS_DIR, 'posts', file), 'utf8')
  const page = buildProsePage(`posts/${slug}`, 'post', parseProse(source))
  prosePages.push(page)
  postsManifest.push({
    slug,
    title: page.title,
    date: page.date ?? '',
    description: page.description ?? '',
  })
}
postsManifest.sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug))

// sandbox (admonition showcase — body h3 carries the heading)
{
  const file = join(DOCS_DIR, 'sandbox.md')
  if (existsSync(file)) {
    prosePages.push(
      buildProsePage('sandbox', 'none', parseProse(readFileSync(file, 'utf8'))),
    )
  } else {
    console.warn('missing docs/sandbox.md')
    proseMissing++
  }
}

// recently-removed — regenerated from upstream docs/ git history like the
// real site does at deploy (scripts/generate-removed.js)
const removed = generateRemovedMarkdown(ROOT)
{
  const parsed = parseProse(removed.markdown)
  const page = buildProsePage('recently-removed', 'page', parsed)
  page.title = RECENTLY_REMOVED_HEADER.title
  page.description = RECENTLY_REMOVED_HEADER.description
  prosePages.push(page)
}

// ---------------------------------------------------------------------------
// prose search docs — mirrors the real site's indexing rules
// (docs/.vitepress/constants.ts): other/* always, posts younger than 60 days,
// sandbox/startpage/feedback excluded, <!-- search-exclude --> spans dropped,
// admonition-container prose dropped (stripNoteBlocks), :::details kept,
// preamble before the first heading dropped (result.shift()). excerpts render
// the FULL page blocks (the real site renders the live page component, where
// search-exclude spans still exist).
// ---------------------------------------------------------------------------

const SEARCH_EXCLUDE_SPAN_RE =
  /<!--\s*search-exclude\s*-->[\s\S]*?<!--\s*\/search-exclude\s*-->/gi

const postCutoff = new Date()
postCutoff.setMonth(postCutoff.getMonth() - 2)

let proseSearchDocs = 0

// prose block → simple excerpt HTML. info/tip/warning/danger containers are
// excluded like the real excerpt builder (processExcerpts skips custom
// blocks); :::details content stays.
function proseBlockHtml(block: WikiProseBlock): string {
  switch (block.kind) {
    case 'paragraph':
      return `<p>${inlineToHtml(block.markdown)}</p>`
    case 'blockquote':
      return `<blockquote><p>${inlineToHtml(block.markdown)}</p></blockquote>`
    case 'list': {
      const items = block.items
        .map(
          (item) =>
            `<li>${inlineToHtml(item.markdown)}${item.children.map(proseBlockHtml).join('')}</li>`,
        )
        .join('')
      return block.ordered ? `<ol>${items}</ol>` : `<ul>${items}</ul>`
    }
    case 'code':
      return `<pre><code>${escapeHtml(block.code)}</code></pre>`
    case 'container':
      if (block.variant === 'details') return block.blocks.map(proseBlockHtml).join('')
      return ''
    case 'image':
      return `<p><img src="${escapeHtml(block.src)}" alt="${escapeHtml(block.alt)}" loading="lazy" /></p>`
    default:
      return ''
  }
}

// hyperlink phrases in a prose block (details recursed, notices skipped)
function proseBlockPhrases(block: WikiProseBlock, out: LinkPhrase[]) {
  switch (block.kind) {
    case 'paragraph':
    case 'blockquote':
      for (const link of inlineLinkPhrases(block.markdown)) {
        out.push({ phrase: link.text, starredBold: false })
      }
      break
    case 'list':
      for (const item of block.items) {
        const starredLi = item.markdown.includes('⭐') || item.markdown.includes('🌟')
        for (const link of inlineLinkPhrases(item.markdown)) {
          out.push({ phrase: link.text, starredBold: starredLi && link.bold })
        }
        for (const child of item.children) proseBlockPhrases(child, out)
      }
      break
    case 'container':
      if (block.variant === 'details') {
        for (const child of block.blocks) proseBlockPhrases(child, out)
      }
      break
    default:
      break
  }
}

// per-anchor excerpt html + metadata phrases for a prose block stream
function proseSectionData(blocks: WikiProseBlock[]): {
  excerpts: SearchExcerptMap
  phrasesByAnchor: Map<string, LinkPhrase[]>
} {
  const excerpts: SearchExcerptMap = {}
  const phrasesByAnchor = new Map<string, LinkPhrase[]>()
  let anchor: string | null = null
  let html = ''
  let phrases: LinkPhrase[] = []
  const flush = () => {
    if (anchor) {
      if (html) excerpts[anchor] = html
      if (phrases.length > 0) phrasesByAnchor.set(anchor, phrases)
    }
    html = ''
    phrases = []
  }
  for (const block of blocks) {
    if (block.kind === 'heading') {
      flush()
      anchor = block.id
      continue
    }
    html += proseBlockHtml(block)
    proseBlockPhrases(block, phrases)
  }
  flush()
  return { excerpts, phrasesByAnchor }
}

for (const page of prosePages) {
  if (page.id === 'sandbox') continue
  if (page.id.startsWith('posts/')) {
    if (!page.date || new Date(page.date) < postCutoff) continue
  }
  // recently-removed hides its removal metadata from search via
  // search-exclude comments — re-parse with those spans dropped
  const blocks =
    page.id === 'recently-removed'
      ? parseProse(removed.markdown.replace(SEARCH_EXCLUDE_SPAN_RE, '')).blocks
      : page.blocks

  const pageTitle = SEARCH_PAGE_TITLES[page.id] ?? null
  const { excerpts, phrasesByAnchor } = proseSectionData(page.blocks)
  // metadata must respect search-exclude spans (index-time semantics) — for
  // recently-removed recompute the phrases from the stripped blocks
  const indexPhrases =
    page.id === 'recently-removed' ? proseSectionData(blocks).phrasesByAnchor : phrasesByAnchor

  let emitted = false
  for (const section of splitForSearch(blocks)) {
    // the real splitter drops content before the first heading
    if (!section.anchor || !section.title) continue
    if (!section.text) continue
    const id = `${page.route}#${section.anchor}`
    searchDocs.push({
      id,
      title: section.title,
      titles: pageTitle ? [pageTitle, ...section.path] : [...section.path],
      text: stripInvisible(section.text).replace(/\s+/g, ' ').trim(),
    })
    registerMetadata(id, indexPhrases.get(section.anchor) ?? [])
    emitted = true
    proseSearchDocs++
  }
  if (emitted && Object.keys(excerpts).length > 0) {
    searchExcerpts.set(page.id, excerpts)
  }

  // heading-less prose (recently-removed's generated body): one lead doc for
  // the whole page — no excerpt, same as the real client's hash-less ids
  if (!emitted) {
    const text = splitForSearch(blocks)
      .map((s) => s.text)
      .filter(Boolean)
      .join(' ')
    if (text) {
      const phrases: LinkPhrase[] = []
      for (const block of blocks) proseBlockPhrases(block, phrases)
      searchDocs.push({
        id: page.route,
        title: page.title,
        titles: pageTitle ? [pageTitle] : [],
        text: stripInvisible(text).replace(/\s+/g, ' ').trim(),
      })
      registerMetadata(page.route, phrases)
      proseSearchDocs++
    }
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
for (const page of prosePages) {
  const file = join(OUT_DIR, 'prose', `${page.id}.json`)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, JSON.stringify(page))
}
writeFileSync(join(OUT_DIR, 'posts.json'), JSON.stringify(postsManifest))
const searchCorpus: SearchCorpus = { docs: searchDocs, customMetadata: searchMetadata }
writeFileSync(join(OUT_DIR, 'search-corpus.json'), JSON.stringify(searchCorpus))
for (const [excerptPageId, excerptMap] of searchExcerpts) {
  const file = join(OUT_DIR, 'excerpts', `${excerptPageId}.json`)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, JSON.stringify(excerptMap))
}
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
{
  // section-level corpus gate: every wiki page should contribute docs, and
  // the metadata/excerpt maps must be populated alongside them
  const ok =
    searchDocs.length >= 500 &&
    Object.keys(searchMetadata).length >= 400 &&
    searchExcerpts.size >= pages.size
  if (!ok) failed = true
  console.info(
    `search corpus: ${searchDocs.length} section docs (${proseSearchDocs} prose), ` +
      `${Object.keys(searchMetadata).length} metadata sections, ` +
      `${searchExcerpts.size} excerpt pages ${ok ? 'OK' : 'FAIL'}`,
  )
}
console.info(`pages written: ${pages.size} → src/features/wiki/generated/`)
{
  // prose pipeline gate: all nav-linked pages must exist, and the posts
  // manifest is a cross-agent contract (RSS) — an empty one is a build bug
  const ok = proseMissing === 0 && postsManifest.length >= 40
  if (!ok) failed = true
  console.info(
    `prose pages: ${prosePages.length} (posts manifest: ${postsManifest.length}, missing: ${proseMissing}) ${ok ? 'OK' : 'FAIL'}`,
  )
  console.info(
    `recently-removed: ${removed.entryCount} entries${removed.fromHistory ? '' : ' (git history unavailable — emitted fallback body)'}`,
  )
}

if (failed) {
  console.error('\nVALIDATION FAILED — counts drifted beyond tolerance, see above')
  process.exitCode = 1
} else {
  console.info('\nvalidation passed')
}
