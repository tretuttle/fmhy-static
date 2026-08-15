/**
 * Adapter over fmhy/edit's OWN site config.
 *
 * fmhy/edit keeps its vitepress config INSIDE docs/ (.vitepress/), and
 * scripts/sync-fmhy.ts already checks that entire tree out on every run. This
 * module reads it as data, so the mirror DERIVES its structure from upstream
 * instead of us re-typing it into constants that silently rot.
 *
 * That rot is not hypothetical. A hand-copied per-page count table wedged the
 * nightly deploy for 41 straight runs, and a hand-copied hero announcement left
 * the home page advertising July's post halfway through August. Anything
 * upstream owns — the page list, page titles/descriptions, the sidebar
 * taxonomy, the header nav, social links, the post-author roster — is read from
 * here. constants.ts keeps ONLY what is genuinely ours (our route scheme, our
 * icon tokens, our page profiles).
 *
 * These are .ts modules and the generator runs under bun, so they are imported
 * rather than regex-scraped. shared.ts's only import is `import type` (erased
 * at runtime); transformer/constants.ts pulls .vitepress/constants.ts, which is
 * plain data. Nothing here needs vitepress itself installed.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

export type UpstreamHeader = { title: string; description: string }

export type UpstreamNavItem = {
  slug: string
  title: string
  emoji: string
  /** twemoji codepoint (e.g. "1f4d7") when the icon came from an i-twemoji span */
  icon?: string
  route: string
  externalUrl: string | null
  description?: string
}

export type UpstreamNavGroup = {
  title: string
  collapsed: boolean
  items: UpstreamNavItem[]
}

/** header-bar entry; `items` is a dropdown (upstream's Ecosystem menu) */
export type UpstreamNavLink = {
  emoji: string
  label: string
  href: string
  items?: { emoji: string; label: string; href: string }[]
}

/** the svg primitives a lucide icon is built from (viewBox 0 0 24 24) */
export type LucidePrimitive =
  | { type: 'path'; d: string }
  | { type: 'line'; x1: number; y1: number; x2: number; y2: number }
  | { type: 'rect'; x: number; y: number; width: number; height: number; rx?: number }
  | { type: 'circle'; cx: number; cy: number; r: number }

export type HomeFeature = {
  title: string
  link: string
  details: string
  color: string
  paths: LucidePrimitive[]
}

export type HomeAnnouncement = { title: string; link: string }

export type Upstream = {
  /** wiki page ids, in upstream's own header order */
  pageOrder: string[]
  pageHeaders: Record<string, UpstreamHeader>
  /** sidebar entries that sit above the groups (Beginners Guide, Posts, ...) */
  navTopLinks: UpstreamNavItem[]
  navGroups: UpstreamNavGroup[]
  headerNav: UpstreamNavLink[]
  socialLinks: { icon: string; link: string }[]
  postAuthors: Record<string, string>
  /** home hero badge — upstream rolls this monthly */
  homeAnnouncement: HomeAnnouncement | null
  /** the home page feature cards, icons included */
  homeFeatures: HomeFeature[]
  /** hero.image.src from index.md, relative to docs/public (e.g. "test.png") */
  homeHeroImage: string | null
  /** upstream carries a header for recently-removed even though it emits no file */
  recentlyRemovedHeader: UpstreamHeader
  /** docs/other/*.md rendered through the prose pipeline */
  proseOtherPages: string[]
  /** twemoji SVGs the nav actually uses — generate.ts writes these into public/twemoji/ */
  twemojiAssets: { code: string; svg: string }[]
  /** twemoji icon names the package doesn't know (surfaced by validation) */
  unknownEmoji: string[]
}

// docs/other/backups.md is wiki-bullet content, not prose — convert-fmhy.ts
// keeps its structured treatment, so it is the one file held out of the prose
// pipeline. Everything else in docs/other/ is prose by definition.
const PROSE_OTHER_EXCLUDED = new Set(['backups'])

// upstream renders sidebar icons as iconify classes (`i-twemoji:green-book`)
// resolved by UnoCSS from @iconify-json/twemoji. We resolve them from the SAME
// package: chars.json gives name → codepoint (for the unicode fallback string)
// and icons.json gives the SVG body that generate.ts writes into
// public/twemoji/ for TwemojiIcon. Nothing here is hand-maintained — a new
// upstream icon resolves the day their package dependency knows it.
import twemojiChars from '@iconify-json/twemoji/chars.json'
import { icons as twemojiIconSet } from '@iconify-json/twemoji'

const TWEMOJI_BY_NAME = (() => {
  const byName = new Map<string, string>()
  for (const [code, name] of Object.entries(twemojiChars as Record<string, string>)) {
    // chars maps many sequences to one name — the shortest is the base glyph
    const prev = byName.get(name)
    if (!prev || code.length < prev.length) byName.set(name, code)
  }
  return byName
})()

const codeToUnicode = (code: string): string =>
  code
    .split('-')
    .map((c) => String.fromCodePoint(Number.parseInt(c, 16)))
    .join('')

const twemojiSvg = (name: string): string | null => {
  const icon = (twemojiIconSet.icons as Record<string, { body: string }>)[name]
  if (!icon) return null
  const w = twemojiIconSet.width ?? 36
  const h = twemojiIconSet.height ?? 36
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">${icon.body}</svg>`
}

const FALLBACK_EMOJI = '🔗'

// upstream's header key for a sidebar slug when the two names differ. OURS:
// our route is /nsfw, upstream files that page as nsfwpiracy.md. Sidebar
// entries like audio-tools / recently-removed carry a header upstream but emit
// no page, which is exactly where their sidebar descriptions come from.
const HEADER_FILE_ALIAS: Record<string, string> = { nsfw: 'nsfwpiracy' }

const ICON_SPAN_RE = /^<span class="i-twemoji:([a-z0-9-]+)"><\/span>\s*(.*)$/
// upstream's header nav writes the emoji inline ("📑 Changelog")
const LEADING_EMOJI_RE = /^(\S+)\s+(.*)$/

type RawSidebarItem = { text: string; link?: string; items?: RawSidebarItem[]; collapsed?: boolean }

/** slug for a sidebar link: '/audio#audio-tools' → 'audio-tools', '/misc' → 'misc' */
function slugFor(link: string | undefined, title: string): string {
  if (!link || !link.startsWith('/')) {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  }
  const hash = link.indexOf('#')
  return hash >= 0 ? link.slice(hash + 1) : link.slice(1)
}

const num = (raw: string | undefined, fallback = 0): number => {
  const n = Number(raw)
  return Number.isFinite(n) ? n : fallback
}

const attr = (tag: string, name: string): string | undefined =>
  new RegExp(`${name}="([^"]*)"`).exec(tag)?.[1]

/**
 * Flatten an inline lucide <svg> into the primitives the app's LucideIcon
 * renders. Upstream authors these by hand in index.md, so only the shapes it
 * actually uses are supported; anything else is skipped rather than guessed at,
 * and <title> is dropped (the card already has a visible heading).
 */
function svgToPrimitives(svg: string): LucidePrimitive[] {
  const out: LucidePrimitive[] = []
  for (const m of svg.matchAll(/<(path|line|rect|circle)\b([^>]*)>/g)) {
    const kind = m[1]!
    const tag = m[2]!
    if (kind === 'path') {
      const d = attr(tag, 'd')
      if (d) out.push({ type: 'path', d })
    } else if (kind === 'line') {
      out.push({
        type: 'line',
        x1: num(attr(tag, 'x1')),
        y1: num(attr(tag, 'y1')),
        x2: num(attr(tag, 'x2')),
        y2: num(attr(tag, 'y2')),
      })
    } else if (kind === 'rect') {
      const rect: LucidePrimitive = {
        type: 'rect',
        x: num(attr(tag, 'x')),
        y: num(attr(tag, 'y')),
        width: num(attr(tag, 'width')),
        height: num(attr(tag, 'height')),
      }
      const rx = attr(tag, 'rx')
      if (rx !== undefined) (rect as { rx?: number }).rx = num(rx)
      out.push(rect)
    } else {
      out.push({
        type: 'circle',
        cx: num(attr(tag, 'cx')),
        cy: num(attr(tag, 'cy')),
        r: num(attr(tag, 'r')),
      })
    }
  }
  return out
}

type HomeFrontmatter = {
  announcement: HomeAnnouncement | null
  features: HomeFeature[]
  /** hero.image.src from index.md (e.g. "test.png"), relative to docs/public */
  heroImage: string | null
}

function readHomeFrontmatter(indexFile: string): HomeFrontmatter {
  if (!existsSync(indexFile)) return { announcement: null, features: [], heroImage: null }
  const src = readFileSync(indexFile, 'utf8')
  if (!src.startsWith('---')) return { announcement: null, features: [], heroImage: null }
  const end = src.indexOf('\n---', 3)
  if (end < 0) return { announcement: null, features: [], heroImage: null }

  // Bun ships a YAML parser, so the multi-line `icon: |` blocks and wrapped
  // `details:` values parse correctly without adding a dependency.
  const doc = Bun.YAML.parse(src.slice(4, end)) as {
    hero?: { announcement?: { title?: string; link?: string }; image?: { src?: string } }
    features?: { title?: string; link?: string; details?: string; icon?: string }[]
  }

  const a = doc.hero?.announcement
  const announcement =
    a?.title && a?.link ? { title: String(a.title), link: String(a.link) } : null

  const features: HomeFeature[] = (doc.features ?? [])
    .filter((f) => f.title && f.link)
    .map((f) => {
      const icon = String(f.icon ?? '')
      return {
        title: String(f.title),
        link: String(f.link),
        details: String(f.details ?? '').replace(/\s+/g, ' ').trim(),
        color: /stroke="(#[0-9a-fA-F]{3,8})"/.exec(icon)?.[1] ?? 'currentColor',
        paths: svgToPrimitives(icon),
      }
    })

  return { announcement, features, heroImage: doc.hero?.image?.src ?? null }
}

export async function loadUpstream(docsDir: string): Promise<Upstream> {
  const unknownEmoji: string[] = []
  // upstream's full header registry, including entries that emit no page
  // (audio-tools, nsfwpiracy, recently-removed). Assigned below, before any
  // nav item is built — those fileless entries are where sidebar descriptions
  // for section links and external links come from.
  let allHeaders: Record<string, UpstreamHeader> = {}

  const twemojiAssets = new Map<string, string>()

  const splitIcon = (text: string): { emoji: string; title: string; icon?: string } => {
    const m = ICON_SPAN_RE.exec(text.trim())
    if (m) {
      const name = m[1]!
      const code = TWEMOJI_BY_NAME.get(name)
      const svg = twemojiSvg(name)
      if (code && svg) {
        twemojiAssets.set(code, svg)
        return { emoji: codeToUnicode(code), title: m[2]!.trim(), icon: code }
      }
      if (!unknownEmoji.includes(name)) unknownEmoji.push(name)
      return { emoji: FALLBACK_EMOJI, title: m[2]!.trim() }
    }
    const inline = LEADING_EMOJI_RE.exec(text.trim())
    // a leading token with no letters/digits is an emoji, not a word
    if (inline && !/[\p{L}\p{N}]/u.test(inline[1]!)) {
      return { emoji: inline[1]!, title: inline[2]!.trim() }
    }
    return { emoji: '', title: text.trim() }
  }

  const toNavItem = (raw: RawSidebarItem): UpstreamNavItem => {
    const { emoji, title, icon } = splitIcon(raw.text)
    const link = raw.link ?? ''
    const external = /^https?:\/\//.test(link)
    const slug = slugFor(raw.link, title)
    const header = allHeaders[`${HEADER_FILE_ALIAS[slug] ?? slug}.md`]
    const item: UpstreamNavItem = {
      slug,
      title,
      emoji,
      route: external ? '' : link,
      externalUrl: external ? link : null,
    }
    if (icon) item.icon = icon
    if (header?.description) item.description = header.description
    return item
  }

  // --- upstream module imports -------------------------------------------
  const shared = (await import(
    pathToFileURL(join(docsDir, '.vitepress', 'shared.ts')).href
  )) as {
    sidebar: RawSidebarItem[]
    nav: RawSidebarItem[]
    socialLinks: { icon: string; link: string }[]
  }
  const transformer = (await import(
    pathToFileURL(join(docsDir, '.vitepress', 'transformer', 'constants.ts')).href
  )) as { headers: Record<string, UpstreamHeader>; excluded: string[] }
  allHeaders = transformer.headers

  // --- pages --------------------------------------------------------------
  // upstream's `headers` map is the page registry. Intersect it with what is
  // actually on disk and drop upstream's own exclusions: entries like
  // nsfwpiracy.md / audio-tools.md / base64.md have headers but no file, and
  // posts.md has a file but no header. That intersection IS the wiki page set,
  // so a page added or removed upstream flows through with no edit here.
  const excluded = new Set(transformer.excluded)
  // their docs:build writes docs/recently-removed.md (generate-removed.js)
  // into the working tree — we derive that page from git history ourselves
  // (removed.ts), so it must never be picked up as a wiki page even when the
  // parity build has run in the clone first.
  excluded.add('recently-removed.md')
  const pageOrder: string[] = []
  const pageHeaders: Record<string, UpstreamHeader> = {}
  for (const [file, header] of Object.entries(transformer.headers)) {
    if (excluded.has(file) || !file.endsWith('.md')) continue
    if (!existsSync(join(docsDir, file))) continue
    const id = file.slice(0, -3)
    pageOrder.push(id)
    pageHeaders[id] = { title: header.title, description: header.description }
  }

  // --- sidebar ------------------------------------------------------------
  const navTopLinks: UpstreamNavItem[] = []
  const navGroups: UpstreamNavGroup[] = []
  for (const entry of shared.sidebar) {
    if (entry.items) {
      navGroups.push({
        title: entry.text,
        collapsed: entry.collapsed ?? false,
        items: entry.items.map(toNavItem),
      })
    } else {
      navTopLinks.push(toNavItem(entry))
    }
  }

  // --- header nav ---------------------------------------------------------
  const headerNav: UpstreamNavLink[] = shared.nav.map((entry) => {
    const { emoji, title } = splitIcon(entry.text)
    const link: UpstreamNavLink = { emoji, label: title, href: entry.link ?? '' }
    if (entry.items) {
      link.items = entry.items.map((sub) => {
        const s = splitIcon(sub.text)
        return { emoji: s.emoji, label: s.title, href: sub.link ?? '' }
      })
    }
    return link
  })

  // --- post authors -------------------------------------------------------
  // Authors.vue is an SFC, so its roster is scraped rather than imported: the
  // `data` array is plain `{ name, github }` literals in <script setup>.
  const postAuthors: Record<string, string> = {}
  const authorsFile = join(docsDir, '.vitepress', 'theme', 'components', 'Authors.vue')
  if (existsSync(authorsFile)) {
    const src = readFileSync(authorsFile, 'utf8')
    for (const m of src.matchAll(
      /name:\s*'([^']+)'[^}]*?github:\s*'([^']+)'/g,
    )) {
      postAuthors[m[1]!] = m[2]!
    }
  }

  // --- home page (docs/index.md frontmatter) ------------------------------
  // hero announcement + the feature-card grid. Upstream bumps the announcement
  // every month and occasionally re-cuts the cards; both are read, never kept.
  const home = readHomeFrontmatter(join(docsDir, 'index.md'))

  // entry-marker twemoji (⭐ 🌐 🔁 — see src/icons/twemojiCodes.ts): OUR
  // parser's vocabulary, but the SVGs come from the package like everything
  // else, so public/twemoji/ never needs a hand-fetched file.
  for (const name of ['star', 'globe-with-meridians', 'repeat-button']) {
    const code = TWEMOJI_BY_NAME.get(name)
    const svg = twemojiSvg(name)
    if (code && svg) twemojiAssets.set(code, svg)
    else if (!unknownEmoji.includes(name)) unknownEmoji.push(name)
  }

  // --- prose pages under docs/other/ --------------------------------------
  const otherDir = join(docsDir, 'other')
  const proseOtherPages = existsSync(otherDir)
    ? readdirSync(otherDir)
        .filter((f) => f.endsWith('.md'))
        .map((f) => f.slice(0, -3))
        .filter((id) => !PROSE_OTHER_EXCLUDED.has(id))
        .sort()
    : []

  const removedHeader = transformer.headers['recently-removed.md']

  return {
    pageOrder,
    pageHeaders,
    navTopLinks,
    navGroups,
    headerNav,
    socialLinks: shared.socialLinks,
    postAuthors,
    homeAnnouncement: home.announcement,
    homeFeatures: home.features,
    homeHeroImage: home.heroImage,
    recentlyRemovedHeader: removedHeader ?? {
      title: 'Recently Removed Sites',
      description: 'List of sites recently removed from the wiki',
    },
    proseOtherPages,
    twemojiAssets: [...twemojiAssets].map(([code, svg]) => ({ code, svg })),
    unknownEmoji,
  }
}
