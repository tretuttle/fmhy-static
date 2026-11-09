// url search — port of fmhy.net's link-href matching. the build half
// (normalizeSearchUrl + extractSearchUrls) mirrors docs/.vitepress/shared.ts and
// constants.ts extractLinkMetadata; the client half (buildUrlQuery,
// looksLikeUrlQuery, matchers) mirrors VPLocalSearchBox.vue. shared by
// scripts/wiki/generate.ts and useWikiSearch.ts so both sides normalize
// identically — keep this module free of `~` imports and DOM/react deps.

const INVISIBLE_RE = /⁠|​|‌|‍|﻿/g

// upstream shared.ts: drop the scheme and a leading www. so "https://www.x.com"
// and "x.com" compare the same way
export const stripSchemeAndWww = (value: string): string =>
  value.replace(/^[a-z][a-z0-9+.-]*:\/\//, '').replace(/^www\./, '')

const TRACKING_QUERY_PARAMS = new Set(['fbclid', 'gclid', 'gbraid', 'mc_cid', 'mc_eid', 'wbraid'])

// upstream shared.ts normalizeSearchUrl: scheme/www stripped, tracking params dropped
export function normalizeSearchUrl(value: string): string {
  const stripped = stripSchemeAndWww(value)
  const hashIndex = stripped.indexOf('#')
  const withoutHash = hashIndex === -1 ? stripped : stripped.slice(0, hashIndex)
  const hash = hashIndex === -1 ? '' : stripped.slice(hashIndex + 1)
  const queryIndex = withoutHash.indexOf('?')

  if (queryIndex === -1) return hash ? `${withoutHash}#${hash}` : withoutHash

  const hostPath = withoutHash.slice(0, queryIndex)
  const params = new URLSearchParams(withoutHash.slice(queryIndex + 1))
  // snapshot the keys — deleting while iterating the live iterator skips some
  for (const key of Array.from(params.keys())) {
    if (key.startsWith('utm_') || TRACKING_QUERY_PARAMS.has(key)) params.delete(key)
  }
  const query = params.toString()
  return `${hostPath}${query ? `?${query}` : ''}${hash ? `#${hash}` : ''}`
}

// ---------------------------------------------------------------------------
// build time — constants.ts extractLinkMetadata (u / su half)
// ---------------------------------------------------------------------------

const URL_SHORTENER_HOSTS = new Set([
  'discord.gg',
  't.me',
  'redd.it',
  'youtu.be',
  'bit.ly',
  'tinyurl.com',
  't.co',
  'goo.gl',
  'is.gd',
  'cutt.ly',
  'shorturl.at',
  'rb.gy',
  'ouo.io',
  'adf.ly',
  'rebrand.ly',
  'shorte.st',
])

const MAX_STORED_URL_LENGTH = 80

const decodeHtmlAttr = (s: string): string =>
  s
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')

const isSearchableUrl = (href: string): boolean =>
  /^[a-z][a-z0-9+.-]*:\/\//i.test(href) || /^www\./i.test(href)

function cleanSearchUrl(href: string): string {
  let decoded = href
  try {
    decoded = decodeURI(href)
  } catch {
    // keep the raw href if it is not a valid encoded uri
  }
  const normalized = decoded.replace(INVISIBLE_RE, '').replace(/\s+/g, '').trim().toLowerCase()
  const hostPath = normalizeSearchUrl(normalized)
  const host = hostPath.split(/[/?#]/)[0]
  if (!host || URL_SHORTENER_HOSTS.has(host)) return ''
  return hostPath.length > MAX_STORED_URL_LENGTH
    ? hostPath.slice(0, MAX_STORED_URL_LENGTH)
    : hostPath
}

/**
 * Every searchable link href in a section's rendered html (`u`), plus the ones
 * sitting in a starred list item (`su`). Same starred test as upstream: the
 * text from the nearest preceding `<li>` to the anchor mentions "starred"/⭐/🌟.
 */
export function extractSearchUrls(html: string): { u: string[]; su: string[] } {
  const urls = new Set<string>()
  const starred = new Set<string>()
  for (const match of html.matchAll(/<a\b[^>]*>/gi)) {
    const href = decodeHtmlAttr(match[0].match(/\bhref=(["'])(.*?)\1/i)?.[2] ?? '')
    if (!isSearchableUrl(href)) continue
    const cleaned = cleanSearchUrl(href)
    if (!cleaned) continue
    urls.add(cleaned)
    const at = match.index ?? 0
    const liStart = Math.max(html.lastIndexOf('<li ', at), html.lastIndexOf('<li>', at))
    const prefix = liStart === -1 ? html.slice(Math.max(0, at - 50), at) : html.slice(liStart, at)
    if (prefix.includes('starred') || prefix.includes('⭐') || prefix.includes('🌟')) {
      starred.add(cleaned)
    }
  }
  return { u: [...urls], su: [...starred] }
}

// ---------------------------------------------------------------------------
// client — VPLocalSearchBox.vue url matching
// ---------------------------------------------------------------------------

export function normalizeUrlSearchValue(value: string): string {
  let decoded = value.trim()
  try {
    decoded = decodeURI(decoded)
  } catch {
    // keep the raw value if it is not a valid encoded uri
  }
  return decoded.replace(INVISIBLE_RE, '').replace(/\s+/g, '').toLowerCase()
}

// multi-part public suffixes and subdomain-hosting platforms: the registrable
// *label* is the part left of the suffix, so "silentaperture" resolves
// silentaperture.gitlab.io while "vercel"/"itch" don't match every site there
const URL_HOST_SUFFIXES = new Set([
  'co.uk',
  'org.uk',
  'ac.uk',
  'gov.uk',
  'com.au',
  'com.br',
  'com.mx',
  'co.jp',
  'co.in',
  'co.nz',
  'co.za',
  'co.kr',
  'github.io',
  'gitlab.io',
  'pages.dev',
  'workers.dev',
  'vercel.app',
  'netlify.app',
  'web.app',
  'firebaseapp.com',
  'surge.sh',
  'neocities.org',
  'itch.io',
  'blogspot.com',
  'wordpress.com',
  'js.org',
  'readthedocs.io',
  'notion.site',
  'sourceforge.io',
  'glitch.me',
  'repl.co',
  'fandom.com',
  'gitbook.io',
  'substack.com',
  'ghost.io',
  'pythonanywhere.com',
  'herokuapp.com',
])

// ubiquitous shared platforms where the domain isn't the entry's identity —
// domain-mode search skips them so "github"/"reddit" don't flood; a path query
// ("github.com/yt-dlp") still reaches them
const URL_SHARED_DOMAINS = new Set([
  'github.com',
  'gitlab.com',
  'codeberg.org',
  'bitbucket.org',
  'sourceforge.net',
  'greasyfork.org',
  'reddit.com',
  'discord.com',
  'x.com',
  'twitter.com',
  'youtube.com',
  'facebook.com',
  'instagram.com',
  'medium.com',
  'archive.org',
  'play.google.com',
  'apps.apple.com',
  'chromewebstore.google.com',
  'addons.mozilla.org',
  'docs.google.com',
  'drive.google.com',
  'sites.google.com',
  'cse.google.com',
  'support.google.com',
])

const MAX_URL_MATCHES_PER_DOMAIN = 8
const MAX_URL_MATCHES_TOTAL = 60
// below this a bare query matches a label by prefix only ("wco" → wcofun, not showcode)
const MIN_SUBSTRING_NEEDLE_LENGTH = 4

// punctuation-insensitive form so "pihole" matches "pi-hole"
const compactUrlValue = (value: string): string => value.replace(/[^a-z0-9]/g, '')

function urlRegistrable(host: string): { label: string; registrable: string } {
  const labels = host.split('.')
  for (let i = 0; i < labels.length - 1; i++) {
    if (URL_HOST_SUFFIXES.has(labels.slice(i + 1).join('.'))) {
      return { label: labels[i]!, registrable: labels.slice(i).join('.') }
    }
  }
  return {
    label: labels[labels.length - 2] ?? labels[0]!,
    registrable: labels.slice(-2).join('.'),
  }
}

export type UrlQuery = {
  // 'path': the user typed a "/" → match host+path; 'domain': match the domain
  mode: 'path' | 'domain'
  needle: string
  needles: string[]
  // the query had a tld ("pi-hole.net") → match the full host, not the label
  matchFullHost: boolean
  // typed scheme / leading www. → anchor to the host start (prefix only)
  anchored: boolean
}

export function buildUrlQuery(query: string): UrlQuery | null {
  const normalized = normalizeUrlSearchValue(query)
  if (normalized.length < 3) return null
  const anchored = /^[a-z][a-z0-9+.-]*:\/\//.test(normalized) || normalized.startsWith('www.')
  const stripped = normalizeSearchUrl(normalized)
  if (stripped.includes('/')) {
    return { mode: 'path', needle: stripped, needles: [], matchFullHost: false, anchored }
  }
  return {
    mode: 'domain',
    needle: '',
    needles: [...new Set([stripped, compactUrlValue(stripped)].filter(Boolean))],
    matchFullHost: stripped.includes('.'),
    anchored,
  }
}

export function looksLikeUrlQuery(query: string): boolean {
  const normalized = normalizeUrlSearchValue(query)
  const stripped = stripSchemeAndWww(normalized)
  const isSingleToken = !/\s/.test(query.trim())
  return (
    /^[a-z][a-z0-9+.-]*:\/\//.test(normalized) ||
    normalized.startsWith('www.') ||
    (isSingleToken && stripped.includes('.')) ||
    (isSingleToken && stripped.includes('/'))
  )
}

// boolean matcher for a raw href (excerpt link highlighting)
export function urlMatchesQuery(href: string, urlQuery: UrlQuery): boolean {
  const hostPath = normalizeSearchUrl(normalizeUrlSearchValue(href))
  if (urlQuery.mode === 'path') return hostPath.includes(urlQuery.needle)
  const host = hostPath.split(/[/?#]/)[0]!
  const { label, registrable } = urlRegistrable(host)
  if (URL_SHARED_DOMAINS.has(host) || URL_SHARED_DOMAINS.has(registrable)) return false
  const target = urlQuery.matchFullHost ? host : label
  const haystacks = [target, compactUrlValue(target)]
  return urlQuery.needles.some((needle) => {
    const prefixOnly = urlQuery.anchored || needle.length < MIN_SUBSTRING_NEEDLE_LENGTH
    return haystacks.some((h) => (prefixOnly ? h.startsWith(needle) : h.includes(needle)))
  })
}

// a stored url with its host parts parsed once, so the per-keystroke path
// never re-splits the same url
export type UrlRecord = {
  id: string
  hostPath: string
  host: string
  label: string
  registrable: string
  compactHost: string
  compactLabel: string
  isShared: boolean
  starred: boolean
}

// decode generated/search-urls.json (see SearchUrlMap: '*' marks starred hrefs)
export function buildUrlRecords(urlMap: Record<string, string[]>): UrlRecord[] {
  const records: UrlRecord[] = []
  for (const id in urlMap) {
    for (const entry of urlMap[id]!) {
      const starred = entry.startsWith('*')
      const hostPath = stripSchemeAndWww(starred ? entry.slice(1) : entry)
      const host = hostPath.split(/[/?#]/)[0]!
      const { label, registrable } = urlRegistrable(host)
      records.push({
        id,
        hostPath,
        host,
        label,
        registrable,
        compactHost: compactUrlValue(host),
        compactLabel: compactUrlValue(label),
        isShared: URL_SHARED_DOMAINS.has(host) || URL_SHARED_DOMAINS.has(registrable),
        starred,
      })
    }
  }
  return records
}

// 3 = exact, 2 = prefix, 1 = substring, 0 = none
function matchStrength(haystack: string, needle: string): number {
  if (haystack === needle) return 3
  if (haystack.startsWith(needle)) return 2
  if (haystack.includes(needle)) return 1
  return 0
}

function recordMatchRank(rec: UrlRecord, urlQuery: UrlQuery): number {
  if (urlQuery.mode === 'path') return matchStrength(rec.hostPath, urlQuery.needle)
  if (rec.isShared) return 0
  const haystacks = urlQuery.matchFullHost
    ? [rec.host, rec.compactHost]
    : [rec.label, rec.compactLabel]
  let best = 0
  for (const needle of urlQuery.needles) {
    const minStrength = urlQuery.anchored || needle.length < MIN_SUBSTRING_NEEDLE_LENGTH ? 2 : 1
    for (const haystack of haystacks) {
      const s = matchStrength(haystack, needle)
      if (s >= minStrength) best = Math.max(best, s)
    }
  }
  return best
}

export type UrlMatch = { id: string; starred: boolean }

/**
 * Upstream findUrlMatches: one candidate per section (its best-ranked url),
 * curated + stronger matches kept first, capped per registrable domain and in
 * total so no single domain or broad query floods the list. `hasDoc` filters
 * ids the text index doesn't know (upstream getStoredFields miss).
 */
export function findUrlMatches(
  records: UrlRecord[],
  query: string,
  hasDoc: (id: string) => boolean,
): UrlMatch[] {
  const urlQuery = buildUrlQuery(query)
  if (!urlQuery) return []

  const candidates = new Map<string, UrlRecord & { rank: number }>()
  for (const rec of records) {
    const rank = recordMatchRank(rec, urlQuery)
    if (rank === 0) continue
    const existing = candidates.get(rec.id)
    if (!existing || rank > existing.rank || (rank === existing.rank && rec.starred)) {
      candidates.set(rec.id, { ...rec, rank })
    }
  }

  const ranked = [...candidates.values()].sort(
    (a, b) => Number(b.starred) - Number(a.starred) || b.rank - a.rank,
  )

  const matches: UrlMatch[] = []
  const perDomain = new Map<string, number>()
  for (const rec of ranked) {
    const seen = perDomain.get(rec.registrable) ?? 0
    if (seen >= MAX_URL_MATCHES_PER_DOMAIN) continue
    if (!hasDoc(rec.id)) continue
    perDomain.set(rec.registrable, seen + 1)
    matches.push({ id: rec.id, starred: rec.starred })
    if (matches.length >= MAX_URL_MATCHES_TOTAL) break
  }
  return matches
}
