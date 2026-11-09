// wiki search engine — a faithful React port of fmhy.net's customized local
// search (docs/.vitepress/theme/components/VPLocalSearchBox.vue script block):
// MiniSearch over the section-level corpus with the exact upstream tokenizer,
// substring/suffix expansion in exact mode, fuzzy structured queries, the
// 6-tier curated-link boost sort, detailed-mode contiguous phrase filtering
// with a dynamic candidate pool, url search (link hrefs, searchUrl.ts),
// section filter chips, autosuggest, and recent searches.

import MiniSearch, { type Query, type SearchResult } from 'minisearch'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { createStorageValue } from '~/lib/storage'

import { loadExcerpts, loadSearchCorpus, loadSearchUrls, peekExcerptMap, wikiNav } from './data'
import {
  buildUrlRecords,
  findUrlMatches,
  looksLikeUrlQuery,
  type UrlRecord,
} from './searchUrl'
import { recentSearchesStorage } from './wikiSettingsStorage'

import type { SearchLinkMetadata } from './types'

export const RESULTS_PAGE_SIZE = 16
export const SEARCH_DEBOUNCE_MS = 350
const MAX_RESULTS_IN_MEMORY = 200
const MAX_SUBSTRING_TERMS = 100
const MAX_RECENT_SEARCHES = 20
const MAX_SUGGESTIONS = 3
const FUZZY_THRESHOLD = 0.2
const MIN_CANDIDATE_POOL = 32

const fuzzyStorage = createStorageValue<boolean>('wiki.searchFuzzy')
const detailedViewStorage = createStorageValue<boolean>('wiki.searchDetailedView')
// opt-in: also match results by the link hrefs they contain (upstream default off)
const urlSearchStorage = createStorageValue<boolean>('wiki.searchUrl')

// query persists for the session like vitepress:local-search-filter
const QUERY_SESSION_KEY = 'fmhy.wiki.searchQuery'

const readSessionQuery = (): string => {
  if (typeof sessionStorage === 'undefined') return ''
  try {
    return sessionStorage.getItem(QUERY_SESSION_KEY) ?? ''
  } catch {
    return ''
  }
}

const writeSessionQuery = (value: string) => {
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.setItem(QUERY_SESSION_KEY, value)
  } catch {
    // ignore disabled storage
  }
}

// seed the query the next mounted search box starts with (?q= deep links)
export const primeSearchQuery = writeSessionQuery

// ---------------------------------------------------------------------------
// section filter chips — categories are the sidebar's pages keyed by the first
// path segment of a result id ("/gaming#anchor" → "/gaming"); entries sharing
// a segment (Contribute + other/* pages) keep the first sidebar label
// ---------------------------------------------------------------------------

export type SearchCategory = { id: string; label: string }

export function resultCategoryOf(id: string): string {
  const segment = id.split('#')[0]!.replace(/\.html$/, '').split('/').filter(Boolean)[0]
  return segment ? `/${segment}` : '/'
}

const SEARCH_CATEGORIES: SearchCategory[] = (() => {
  const entries: SearchCategory[] = []
  const seen = new Set<string>()
  const items = [...wikiNav.topLinks, ...wikiNav.groups.flatMap((g) => g.items)]
  for (const item of items) {
    if (item.externalUrl || !item.route.startsWith('/')) continue
    const id = resultCategoryOf(item.route)
    if (seen.has(id)) continue
    seen.add(id)
    entries.push({ id, label: item.title })
  }
  return entries
})()

function computeCategoryCounts(results: { id: string }[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const r of results) {
    const category = resultCategoryOf(r.id)
    counts.set(category, (counts.get(category) ?? 0) + 1)
  }
  return counts
}

// ---------------------------------------------------------------------------
// tokenizer — exact ports of docs/.vitepress/constants.ts (miniSearch.options)
// and VPLocalSearchBox.vue's tokenizeIndexLike. if these drift from the build
// tokenizer, ranking breaks silently.
// ---------------------------------------------------------------------------

export const INVISIBLE_CHARS_RE = /\u2060|\u200B|\u200C|\u200D|\uFEFF/g
const TOKEN_SPLIT_RE = /[\n\r #%*,=/:;?[\]{}()&]+/u
const MIN_TERM_LENGTH = 2
const TOKEN_STOP_WORDS = new Set([
  'frontmatter',
  '$frontmatter.synopsis',
  'and',
  'about',
  'but',
  'now',
  'the',
  'with',
  'you',
])

const tokenize = (text: string): string[] =>
  text.replace(INVISIBLE_CHARS_RE, '').split(TOKEN_SPLIT_RE)

function processTerm(term: string, fieldName?: string): string | string[] | false {
  term = term.trim().toLowerCase().replace(/^\.+/, '').replace(/\.+$/, '')
  if (term.length < MIN_TERM_LENGTH || TOKEN_STOP_WORDS.has(term)) return false
  if (fieldName === 'text') {
    const parts = term.split('.')
    if (parts.length > 1) {
      return [term, ...parts]
        .filter((t) => t.length >= MIN_TERM_LENGTH)
        .filter((t) => !TOKEN_STOP_WORDS.has(t))
    }
  }
  return term
}

export function tokenizeIndexLike(text: string, splitDottedParts = false): string[] {
  const out: string[] = []
  const raw = text.replace(INVISIBLE_CHARS_RE, '').split(TOKEN_SPLIT_RE)
  for (const piece of raw) {
    if (!piece) continue
    const t = piece.trim().toLowerCase().replace(/^\.+/, '').replace(/\.+$/, '')
    if (t.length < MIN_TERM_LENGTH || TOKEN_STOP_WORDS.has(t)) continue
    out.push(t)
    if (splitDottedParts && t.includes('.')) {
      for (const part of t.split('.')) {
        if (part.length >= MIN_TERM_LENGTH && !TOKEN_STOP_WORDS.has(part)) out.push(part)
      }
    }
  }
  return out
}

// ---------------------------------------------------------------------------
// engine (module-level singleton, kept once loaded; a failed load is dropped so the next search retries)
// ---------------------------------------------------------------------------

type IndexedDoc = {
  id: string
  title: string
  titles: string[]
  text: string
}

type SearchEngine = {
  mini: MiniSearch<IndexedDoc>
  customMetadata: SearchLinkMetadata
  // cached index term keys for substring matching (upstream cachedTermKeys)
  termKeys: string[]
  globalStarredLinks: Set<string>
  globalLinks: Set<string>
}

// upstream boostDocument (constants.ts searchOptions): uprate title matches
// (higher levels win), downrank posts and other/* pages
const boostDocument = (
  documentId: string,
  term: string,
  storedFields?: Record<string, unknown>,
): number => {
  const titles = ((storedFields?.titles as string[]) || [])
    .filter((t) => Boolean(t))
    .map((t) => t.toLowerCase())

  let boost = 1
  const titleIndex =
    titles.map((t, i) => (t?.includes(term) ? i : -1)).find((i) => i >= 0) ?? -1
  if (titleIndex >= 0) {
    boost = 10000 - titleIndex
  }

  if (documentId.match(/\/posts/)) {
    boost *= 0.1
  } else if (documentId.match(/\/other/)) {
    boost *= 0.1
  }
  return boost
}

let enginePromise: Promise<SearchEngine> | null = null

export function getSearchEngine(): Promise<SearchEngine> {
  enginePromise ??= loadSearchCorpus().then((corpus) => {
    const mini = new MiniSearch<IndexedDoc>({
      idField: 'id',
      fields: ['title', 'titles', 'text'],
      storeFields: ['title', 'titles'],
      tokenize,
      processTerm,
      searchOptions: {
        combineWith: 'AND',
        fuzzy: false,
        prefix: true,
        boost: { title: 4, text: 2, titles: 1 },
        boostDocument,
      },
    })
    mini.addAll(corpus.docs)

    const customMetadata = corpus.customMetadata ?? {}
    const internal = mini as unknown as { _index?: Map<string, unknown> }
    const termKeys = internal._index ? [...internal._index.keys()] : []

    const globalStarredLinks = new Set<string>()
    const globalLinks = new Set<string>()
    for (const key in customMetadata) {
      const item = customMetadata[key]!
      if (item.s) {
        for (const phrase of item.s) {
          for (const w of tokenizeIndexLike(phrase, true)) globalStarredLinks.add(w)
        }
      }
      if (item.l) {
        for (const phrase of item.l) {
          for (const w of tokenizeIndexLike(phrase, true)) globalLinks.add(w)
        }
      }
    }

    return { mini, customMetadata, termKeys, globalStarredLinks, globalLinks }
  }).catch((error: unknown) => {
    enginePromise = null
    throw error
  })
  return enginePromise
}

// url records load lazily (search-urls.json is ~0.75 MB) — only once url search
// is toggled on or a query looks like a url
let urlRecordsPromise: Promise<UrlRecord[]> | null = null

function getUrlRecords(): Promise<UrlRecord[]> {
  urlRecordsPromise ??= loadSearchUrls()
    .then(buildUrlRecords)
    .catch((error: unknown) => {
      urlRecordsPromise = null
      throw error
    })
  return urlRecordsPromise
}

// ---------------------------------------------------------------------------
// query execution — debounced watcher port (index query + 6-tier boost sort)
// ---------------------------------------------------------------------------

export type WikiSearchHit = SearchResult & {
  title: string
  titles: string[]
  // matched through a link href (url search), not the indexed text
  urlMatched?: boolean
  urlMatchedStarred?: boolean
}

type RunOutcome = {
  allResults: WikiSearchHit[]
  usedSubstringExpansion: boolean
}

type BoostFlags = {
  hasStarredExact: boolean
  hasExact: boolean
  hasStarredPrefix: boolean
  hasPrefix: boolean
  hasStarredWord: boolean
  hasStarredUrl: boolean
  hasLinkWord: boolean
  hasLinkUrl: boolean
}

const TIER_KEYS: (keyof BoostFlags)[] = [
  'hasStarredExact',
  'hasExact',
  'hasStarredPrefix',
  'hasPrefix',
  'hasStarredWord',
  'hasStarredUrl',
  'hasLinkWord',
  'hasLinkUrl',
]

// urlRecords non-null = url search active (toggle or url-like query)
function runSearch(
  engine: SearchEngine,
  filterTextValue: string,
  isFuzzySearch: boolean,
  urlRecords: UrlRecord[] | null,
): RunOutcome {
  let query: Query = filterTextValue
  let usedSubstringExpansion = false

  if (isFuzzySearch) {
    const parts = filterTextValue.split(/\s+/).filter((p) => p)
    if (parts.length > 0) {
      const dashed = parts.join('-')
      query = {
        combineWith: 'OR',
        queries: [
          { queries: parts, combineWith: 'AND', fuzzy: FUZZY_THRESHOLD },
          { queries: [dashed], combineWith: 'AND', fuzzy: FUZZY_THRESHOLD },
        ],
      }
    }
  }

  // suffix search / substring matching for exact mode ("abolic" → "parabolic")
  if (!isFuzzySearch && filterTextValue.length > 2) {
    const candidateTerms: string[] = []
    const match = filterTextValue.toLowerCase()
    for (const term of engine.termKeys) {
      if (term.includes(match) && term !== match) {
        candidateTerms.push(term)
      }
    }
    if (candidateTerms.length > 0) {
      candidateTerms.sort((a, b) => a.length - b.length)
      const capped = candidateTerms.slice(0, MAX_SUBSTRING_TERMS)
      usedSubstringExpansion = true
      query = { combineWith: 'OR', queries: [filterTextValue, ...capped] }
    }
  }

  const searchOptions = {
    combineWith: 'AND' as const,
    fuzzy: isFuzzySearch && typeof query === 'string' ? FUZZY_THRESHOLD : false,
  }

  // pasted urls search urls only — url punctuation run through the text index
  // turns into generic terms and leaks unrelated results
  const rawResults = looksLikeUrlQuery(filterTextValue)
    ? []
    : (engine.mini.search(query, searchOptions) as unknown as WikiSearchHit[])

  const merged = new Map<string, WikiSearchHit>()
  for (const r of rawResults) merged.set(r.id, r)
  if (urlRecords) {
    const urlMatches = findUrlMatches(urlRecords, filterTextValue, (id) => engine.mini.has(id))
    for (const m of urlMatches) {
      const existing = merged.get(m.id)
      if (existing) {
        existing.score += 1
        existing.urlMatched = true
        existing.urlMatchedStarred = existing.urlMatchedStarred || m.starred
        continue
      }
      const stored = engine.mini.getStoredFields(m.id) as
        | { title?: string; titles?: string[] }
        | undefined
      merged.set(m.id, {
        id: m.id,
        score: 1,
        terms: [filterTextValue],
        queryTerms: [filterTextValue],
        match: {},
        title: stored?.title ?? '',
        titles: stored?.titles ?? [],
        urlMatched: true,
        urlMatchedStarred: m.starred,
      })
    }
  }

  const currentResults = [...merged.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_RESULTS_IN_MEMORY)

  // 8-tier ranking: starredExact > exact > starredPrefix > prefix >
  // starredWord > starredUrl > linkWord > linkUrl > raw score. exact/prefix
  // compare the full cleaned query against whole hyperlink phrases; word tiers
  // compare matched terms against phrase tokens; url tiers are href-only hits.
  const q = filterTextValue.replace(INVISIBLE_CHARS_RE, '').trim().toLowerCase()

  const boostedResults = currentResults.map((r) => {
    const meta = engine.customMetadata[r.id]
    const flags: BoostFlags = {
      hasStarredExact: false,
      hasExact: false,
      hasStarredPrefix: false,
      hasPrefix: false,
      hasStarredWord: false,
      hasStarredUrl: false,
      hasLinkWord: false,
      hasLinkUrl: false,
    }

    const lowerTerms = r.terms ? r.terms.map((t) => t.toLowerCase()) : []

    const processPhrases = (phrases: string[] | undefined, isStarred: boolean) => {
      if (!phrases) return
      for (const phrase of phrases) {
        if (q && phrase === q) {
          flags.hasExact = true
          if (isStarred) flags.hasStarredExact = true
        } else if (q && phrase.startsWith(q)) {
          flags.hasPrefix = true
          if (isStarred) flags.hasStarredPrefix = true
        }
        if (lowerTerms.length > 0) {
          const tokens = new Set(tokenizeIndexLike(phrase, true))
          if (lowerTerms.some((t) => tokens.has(t))) {
            if (isStarred) flags.hasStarredWord = true
            else flags.hasLinkWord = true
          }
        }
      }
    }

    processPhrases(meta?.s, true)
    processPhrases(meta?.l, false)

    // href hits never fire the phrase tiers — give them their own, keyed off
    // whether the href sits in a starred item
    flags.hasStarredUrl = !!r.urlMatchedStarred
    flags.hasLinkUrl = !!r.urlMatched && !flags.hasStarredUrl

    return { ...r, ...flags }
  })

  boostedResults.sort((a, b) => {
    for (const key of TIER_KEYS) {
      const av = a[key] ? 1 : 0
      const bv = b[key] ? 1 : 0
      if (av !== bv) return bv - av
    }
    if (b.score !== a.score) return b.score - a.score
    // deterministic tie-break so equal scores (every url-only hit) keep a
    // stable order across re-runs
    return (a.title || '').localeCompare(b.title || '') || a.id.localeCompare(b.id)
  })

  return { allResults: boostedResults, usedSubstringExpansion }
}

// ---------------------------------------------------------------------------
// stage 2 — slicing, excerpt fetching, contiguous phrase filtering
// ---------------------------------------------------------------------------

export type WikiDisplayResult = {
  id: string
  title: string
  titles: string[]
  // rendered excerpt html for detailed view ('' when unavailable / compact)
  text: string
  // matched index terms (fuzzy mode) — feeds the highlight regex
  matchedTerms: string[]
  // matched through a link href — the modal marks the matching excerpt links
  urlMatched: boolean
}

// upstream lookupExcerptText: excerpts only exist for '#anchor' ids; recover
// slug drift via unique-prefix matching, never returning an ambiguous sibling
function lookupExcerptText(resultId: string): string {
  const hashIndex = resultId.indexOf('#')
  if (hashIndex === -1) return ''
  const pageId = resultId.slice(1, hashIndex)
  const map = peekExcerptMap(pageId)
  if (!map) return ''
  const anchor = resultId.slice(hashIndex + 1)
  const direct = map.get(anchor)
  if (direct) return direct
  const prefix = anchor + '-'
  let found: string | null = null
  for (const [key, html] of map) {
    if (!key.startsWith(prefix)) continue
    if (found !== null) return ''
    found = html
  }
  return found ?? ''
}

const excerptPageIdOf = (resultId: string): string | null => {
  const hashIndex = resultId.indexOf('#')
  if (hashIndex === -1) return null
  return resultId.slice(1, hashIndex)
}

async function fetchExcerptsFor(hits: WikiSearchHit[]): Promise<void> {
  const pageIds = new Set<string>()
  for (const hit of hits) {
    const pageId = excerptPageIdOf(hit.id)
    if (pageId && !peekExcerptMap(pageId)) pageIds.add(pageId)
  }
  if (pageIds.size === 0) return
  await Promise.all([...pageIds].map((pageId) => loadExcerpts(pageId)))
}

// upstream filterResults: detailed exact search keeps only true contiguous
// phrase matches (title, breadcrumb, or excerpt text contains the query)
function filterResults(results: WikiDisplayResult[], filterTextValue: string) {
  const clean = (s: string) =>
    s
      .replace(INVISIBLE_CHARS_RE, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase()

  const phrase = clean(filterTextValue)
  if (!phrase) return results

  return results.filter((r) => {
    if (clean(r.title).includes(phrase)) return true
    if (r.titles.some((t) => clean(t).includes(phrase))) return true
    if (r.urlMatched) return true
    if (!r.text) return true // keep optimistically if text is not fetched yet
    return clean(r.text).includes(phrase)
  })
}

type StageTwoOutcome = {
  results: WikiDisplayResult[]
  totalCount: number
  mayHaveMore: boolean
  // the contiguous-filtered candidate pool (exact mode) — null when the raw
  // pool is what's shown; chip counts come from whichever is displayed
  postFiltered: WikiDisplayResult[] | null
}

// allResults here is already scoped to the active section chip
async function buildDisplayResults(
  allResults: WikiSearchHit[],
  limit: number,
  showDetailedList: boolean,
  isFuzzySearch: boolean,
  usedSubstringExpansion: boolean,
  filterTextValue: string,
  isCanceled: () => boolean,
): Promise<StageTwoOutcome | null> {
  const mapResult = (r: WikiSearchHit, text: string): WikiDisplayResult => ({
    id: r.id,
    title: r.title,
    titles: r.titles ?? [],
    text,
    matchedTerms: isFuzzySearch ? Object.keys(r.match || {}) : [],
    urlMatched: !!r.urlMatched,
  })

  const isExactSearch = !isFuzzySearch && !usedSubstringExpansion

  if (isExactSearch) {
    // exact mode filters in both views (upstream 8fff220): a dynamic candidate
    // pool so contiguous matches aren't lost to ranking, and the list + chip
    // counts read the same in compact and detailed
    const candidateLimit = Math.max(MIN_CANDIDATE_POOL, limit * 2)
    const candidates = allResults.slice(0, candidateLimit)
    await fetchExcerptsFor(candidates)
    if (isCanceled()) return null

    const mapped = candidates.map((r) => mapResult(r, lookupExcerptText(r.id)))
    const filtered = filterResults(mapped, filterTextValue)
    return {
      results: filtered.slice(0, limit),
      totalCount: filtered.length,
      // untested remainder beyond the pool may contain more matches
      mayHaveMore: allResults.length > candidateLimit,
      postFiltered: filtered,
    }
  }

  const sliced = allResults.slice(0, limit)
  if (showDetailedList) {
    await fetchExcerptsFor(sliced)
    if (isCanceled()) return null
  }
  const mapped = sliced.map((r) =>
    mapResult(r, showDetailedList ? lookupExcerptText(r.id) : ''),
  )
  return {
    results: mapped,
    totalCount: mapped.length + Math.max(0, allResults.length - limit),
    mayHaveMore: false,
    postFiltered: null,
  }
}

// ---------------------------------------------------------------------------
// autosuggest — "Did you mean:" pills for the no-results state
// ---------------------------------------------------------------------------

function computeSuggestions(engine: SearchEngine, filterText: string): string[] {
  if (!filterText) return []
  const query = filterText.trim()
  if (/\s/.test(query)) return []

  try {
    const rawSuggestions = engine.mini.autoSuggest(query, {
      fuzzy: (term: string) => (term.length >= 5 ? 2 : 1),
      prefix: true,
    }) as { suggestion: string; terms: string[]; score: number }[]

    const { globalStarredLinks, globalLinks } = engine

    const cleanQuery = query.toLowerCase()
    const sortedSuggestions = [...rawSuggestions].sort((a, b) => {
      const aSug = a.suggestion.toLowerCase()
      const bSug = b.suggestion.toLowerCase()

      const aPrefix = aSug.startsWith(cleanQuery) ? 1 : 0
      const bPrefix = bSug.startsWith(cleanQuery) ? 1 : 0
      if (aPrefix !== bPrefix) return bPrefix - aPrefix

      const aStarred = globalStarredLinks.has(aSug) ? 1 : 0
      const bStarred = globalStarredLinks.has(bSug) ? 1 : 0
      if (aStarred !== bStarred) return bStarred - aStarred

      const aLink = globalLinks.has(aSug) ? 1 : 0
      const bLink = globalLinks.has(bSug) ? 1 : 0
      if (aLink !== bLink) return bLink - aLink

      return (b.score || 0) - (a.score || 0)
    })

    return sortedSuggestions
      .map((s) => s.suggestion)
      .filter((s) => s && !/\s/.test(s) && s !== query.toLowerCase())
      .slice(0, MAX_SUGGESTIONS)
  } catch {
    return []
  }
}

// ---------------------------------------------------------------------------
// hook
// ---------------------------------------------------------------------------

export function useWikiSearch() {
  const [query, setQueryState] = useState(() => readSessionQuery())
  const [fuzzy, setFuzzyState] = useState(() => fuzzyStorage.get() ?? false)
  const [urlSearch, setUrlSearchState] = useState(() => urlSearchStorage.get() ?? false)
  // detailed view defaults ON, like fmhy.net (search.options.detailedView)
  const [detailedView, setDetailedViewState] = useState(
    () => detailedViewStorage.get() ?? true,
  )
  const [recent, setRecent] = useState<string[]>(() => recentSearchesStorage.get() ?? [])

  const [allResults, setAllResults] = useState<WikiSearchHit[]>([])
  const [usedSubstring, setUsedSubstring] = useState(false)
  const [results, setResults] = useState<WikiDisplayResult[]>([])
  const [totalResultsCount, setTotalResultsCount] = useState(0)
  const [mayHaveMore, setMayHaveMore] = useState(false)
  const [isSearching, setIsSearching] = useState(() => !!readSessionQuery().trim())
  const [enableNoResults, setEnableNoResults] = useState(false)
  const [searchFailed, setSearchFailed] = useState(false)
  const [resultLimit, setResultLimit] = useState(RESULTS_PAGE_SIZE)
  const [suggestions, setSuggestions] = useState<string[]>([])
  // active section chip ('' = all) and per-section counts of what's displayed
  const [activeCategory, setActiveCategory] = useState('')
  const [categoryCounts, setCategoryCounts] = useState<Map<string, number>>(() => new Map())

  // consumed (and reset) by the modal after it applies the new result list
  const shouldResetScrollRef = useRef(false)
  const queryRef = useRef(query)
  queryRef.current = query

  // url matching also kicks in when the query looks like a url, toggle or not
  const urlSearchAuto = !urlSearch && !!query && looksLikeUrlQuery(query)

  // warm the index so building it overlaps with typing
  useEffect(() => {
    getSearchEngine().catch(() => {})
  }, [])

  // likewise the url records once url search is switched on
  useEffect(() => {
    if (urlSearch) getUrlRecords().catch(() => {})
  }, [urlSearch])

  // immediate watcher: reset paging, section filter + spinner on every
  // query/mode change
  const searchGen = useRef(0)
  useEffect(() => {
    setActiveCategory('')
    setEnableNoResults(false)
    setSearchFailed(false)
    setResultLimit(RESULTS_PAGE_SIZE)
    shouldResetScrollRef.current = true
  }, [query, fuzzy, urlSearch])

  // debounced index query (SEARCH_DEBOUNCE_MS, like upstream debouncedWatch)
  useEffect(() => {
    const gen = ++searchGen.current

    if (!query.trim()) {
      setAllResults([])
      setUsedSubstring(false)
      setIsSearching(false)
      setSuggestions([])
      return
    }

    setIsSearching(true)
    const timeout = setTimeout(async () => {
      const engine = await getSearchEngine().catch(() => null)
      if (searchGen.current !== gen) return
      if (!engine) {
        setAllResults([])
        setIsSearching(false)
        setSearchFailed(true)
        return
      }
      const wantUrls = urlSearch || looksLikeUrlQuery(query)
      // a failed url-data fetch degrades to text-only search
      const urlRecords = wantUrls ? await getUrlRecords().catch(() => null) : null
      if (searchGen.current !== gen) return
      const outcome = runSearch(engine, query, fuzzy, urlRecords)
      setEnableNoResults(true)
      setUsedSubstring(outcome.usedSubstringExpansion)
      setAllResults(outcome.allResults)
    }, SEARCH_DEBOUNCE_MS)

    return () => clearTimeout(timeout)
  }, [query, fuzzy, urlSearch])

  // stage 2: section scoping + slicing + excerpt fetching + contiguous
  // filtering. chip counts rebuild only when the result set itself changed
  // (new results, paging, view) — switching sections keeps them, or the other
  // chips would vanish and you couldn't switch back
  const stageGen = useRef(0)
  const countedFor = useRef<{ all: WikiSearchHit[]; limit: number; detailed: boolean } | null>(
    null,
  )
  useEffect(() => {
    const gen = ++stageGen.current
    const canceled = () => stageGen.current !== gen
    const counted = countedFor.current
    const resultSetChanged =
      !counted ||
      counted.all !== allResults ||
      counted.limit !== resultLimit ||
      counted.detailed !== detailedView
    const commitCounts = (source: { id: string }[]) => {
      if (!resultSetChanged) return
      setCategoryCounts(computeCategoryCounts(source))
      countedFor.current = { all: allResults, limit: resultLimit, detailed: detailedView }
    }

    const scoped = activeCategory
      ? allResults.filter((r) => resultCategoryOf(r.id) === activeCategory)
      : allResults

    if (scoped.length === 0) {
      setResults([])
      setTotalResultsCount(0)
      setMayHaveMore(false)
      commitCounts(allResults)
      if (queryRef.current.trim()) {
        // only stop the spinner once a completed (empty) search landed
        setIsSearching((prev) => (enableNoResults ? false : prev))
      } else {
        setIsSearching(false)
      }
      if (enableNoResults && queryRef.current.trim()) {
        getSearchEngine()
          .then((engine) => {
            if (canceled()) return
            setSuggestions(fuzzy ? [] : computeSuggestions(engine, queryRef.current))
          })
          .catch(() => {})
      }
      return
    }

    ;(async () => {
      const outcome = await buildDisplayResults(
        scoped,
        resultLimit,
        detailedView,
        fuzzy,
        usedSubstring,
        queryRef.current,
        canceled,
      )
      if (!outcome || canceled()) return
      setResults(outcome.results)
      setTotalResultsCount(outcome.totalCount)
      setMayHaveMore(outcome.mayHaveMore)
      // with a section active the excerpt filter only covered that section,
      // so count the raw pool; otherwise count what's displayed
      commitCounts(outcome.postFiltered && !activeCategory ? outcome.postFiltered : allResults)
      setSuggestions(
        outcome.results.length === 0 && !fuzzy
          ? computeSuggestions(await getSearchEngine(), queryRef.current)
          : [],
      )
      setIsSearching(false)
    })().catch(() => {
      if (!canceled()) setIsSearching(false)
    })
  }, [
    allResults,
    resultLimit,
    detailedView,
    activeCategory,
    enableNoResults,
    fuzzy,
    usedSubstring,
  ])

  // chips: sections with matches (plus the active one), most matches first;
  // ties keep sidebar order (stable sort)
  const visibleCategories = useMemo(
    () =>
      SEARCH_CATEGORIES.filter(
        (c) => (categoryCounts.get(c.id) ?? 0) > 0 || activeCategory === c.id,
      ).sort((a, b) => (categoryCounts.get(b.id) ?? 0) - (categoryCounts.get(a.id) ?? 0)),
    [categoryCounts, activeCategory],
  )

  const totalCategoryCount = useMemo(() => {
    let sum = 0
    for (const n of categoryCounts.values()) sum += n
    return sum
  }, [categoryCounts])

  const activeCategoryLabel =
    SEARCH_CATEGORIES.find((c) => c.id === activeCategory)?.label ?? ''

  const selectCategory = useCallback((id: string) => {
    setActiveCategory((current) => (current === id ? '' : id))
    setResultLimit(RESULTS_PAGE_SIZE)
    shouldResetScrollRef.current = true
  }, [])

  const setQuery = useCallback((value: string) => {
    setQueryState(value)
    writeSessionQuery(value)
  }, [])

  const setFuzzy = useCallback((value: boolean) => {
    setFuzzyState(value)
    fuzzyStorage.set(value)
  }, [])

  const setUrlSearch = useCallback((value: boolean) => {
    setUrlSearchState(value)
    urlSearchStorage.set(value)
  }, [])

  const setDetailedView = useCallback((value: boolean) => {
    setDetailedViewState(value)
    detailedViewStorage.set(value)
  }, [])

  const showMore = useCallback(() => {
    setResultLimit((limit) => limit + RESULTS_PAGE_SIZE)
  }, [])

  const commitRecent = useCallback((value: string) => {
    const q = value.trim()
    if (!q) return
    const existing = recentSearchesStorage.get() ?? []
    const next = [q, ...existing.filter((item) => item !== q)].slice(
      0,
      MAX_RECENT_SEARCHES,
    )
    recentSearchesStorage.set(next)
    setRecent(next)
  }, [])

  const removeRecent = useCallback((value: string) => {
    const next = (recentSearchesStorage.get() ?? []).filter((item) => item !== value)
    recentSearchesStorage.set(next)
    setRecent(next)
  }, [])

  const clearRecent = useCallback(() => {
    recentSearchesStorage.set([])
    setRecent([])
  }, [])

  return {
    query,
    setQuery,
    results,
    totalResultsCount,
    mayHaveMore,
    isSearching,
    enableNoResults,
    searchFailed,
    fuzzy,
    setFuzzy,
    urlSearch,
    urlSearchAuto,
    setUrlSearch,
    detailedView,
    setDetailedView,
    showMore,
    recent,
    commitRecent,
    removeRecent,
    clearRecent,
    suggestions,
    shouldResetScrollRef,
    activeCategory,
    selectCategory,
    visibleCategories,
    categoryCounts,
    totalCategoryCount,
    activeCategoryLabel,
  }
}
