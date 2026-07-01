import MiniSearch from 'minisearch'
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'

import { createEmitter } from '~/lib/emitter'
import { createStorageValue } from '~/lib/storage'

import { loadSearchCorpus, loadWikiPage } from './data'
import { parseInlineMarkdown } from './InlineMarkdown'
import {
  buildHighlightSegments,
  normalize,
  tokenize,
  windowExcerpt,
  type HighlightSegment,
} from './searchHighlight'
import { recentSearchesStorage, useShowNsfw } from './wikiSettingsStorage'

import type { SearchDoc, WikiEntry, WikiPage, WikiSubsection } from './types'

// re-export for callers that imported it from here previously
export function normalizeSearchText(text: string): string {
  return normalize(text)
}

const fuzzyStorage = createStorageValue<boolean>('wiki.searchFuzzy')
const detailedViewStorage = createStorageValue<boolean>('wiki.searchDetailedView')

// mirrors fmhy.net's own search config (docs/.vitepress/theme/components/
// VPLocalSearchBox.vue, minisearch-backed): title > text (description) >
// titles (breadcrumb), prefix search on, fuzzy off unless toggled
const FIELD_BOOST = { title: 4, text: 2, titles: 1 }
const FUZZINESS = 0.2
export const MAX_RESULTS = 100

type IndexedDoc = {
  id: string
  title: string
  text: string
  titles: string
}

type SearchIndex = {
  mini: MiniSearch<IndexedDoc>
  byId: Map<string, SearchDoc>
}

let indexPromise: Promise<SearchIndex> | null = null

async function getSearchIndex(): Promise<SearchIndex> {
  indexPromise ??= loadSearchCorpus().then((docs) => {
    const byId = new Map(docs.map((doc) => [doc.id, doc]))
    const mini = new MiniSearch<IndexedDoc>({
      idField: 'id',
      fields: ['title', 'text', 'titles'],
      storeFields: [],
      tokenize,
      searchOptions: {
        prefix: true,
        fuzzy: false,
        boost: FIELD_BOOST,
        combineWith: 'AND',
        // fmhy.net upranks starred entries the same way
        boostDocument: (id) => (byId.get(id)?.starred ? 1.5 : 1),
      },
    })
    mini.addAll(
      docs.map((doc) => ({
        id: doc.id,
        title: doc.title,
        text: doc.description ?? '',
        titles: [doc.pageTitle, doc.sectionPath, ...doc.altTitles].join(' '),
      }))
    )
    return { mini, byId }
  })
  return indexPromise
}

export type WikiSearchResult = {
  doc: SearchDoc
  score: number
  titleSegments: HighlightSegment[]
  descriptionSegments: HighlightSegment[]
  pageTitle: string
  // normalized query terms that produced this hit — reused to highlight the
  // detailed-view excerpt (see loadExcerptSource/getExcerptMatches below)
  matchTerms: string[]
}

function buildResult(doc: SearchDoc, score: number, words: string[]): WikiSearchResult {
  return {
    doc,
    score,
    titleSegments: buildHighlightSegments(doc.title, words),
    descriptionSegments: doc.description
      ? buildHighlightSegments(doc.description, words)
      : [],
    pageTitle: doc.pageTitle,
    matchTerms: words,
  }
}

function runSearch(
  index: SearchIndex,
  rawQuery: string,
  showNsfw: boolean,
  fuzzy: boolean
): WikiSearchResult[] {
  const query = normalize(rawQuery)
  if (!query) return []
  const words = query.split(/\s+/).filter(Boolean)

  const hits = index.mini.search(query, {
    prefix: true,
    fuzzy: fuzzy ? FUZZINESS : false,
    boost: FIELD_BOOST,
    combineWith: 'AND',
  })

  const results: WikiSearchResult[] = []
  const seen = new Set<string>()
  for (const hit of hits) {
    const doc = index.byId.get(hit.id)
    if (!doc) continue
    if (doc.nsfw === true && !showNsfw) continue
    seen.add(hit.id)
    results.push(buildResult(doc, hit.score, words))
  }

  // minisearch's prefix mode only matches from the start of a token
  // ("fire" -> "firefox"). fmhy.net's exact mode also catches mid-token
  // substrings ("efox" -> "firefox") by scanning cached index terms; we
  // approximate that with a direct haystack scan, capped like theirs.
  if (!fuzzy) {
    for (const doc of index.byId.values()) {
      if (results.length >= MAX_RESULTS) break
      if (seen.has(doc.id)) continue
      if (doc.nsfw === true && !showNsfw) continue
      const haystack = normalize(
        `${doc.title} ${doc.pageTitle} ${doc.sectionPath} ${doc.description ?? ''} ${doc.altTitles.join(' ')}`
      )
      if (words.every((word) => haystack.includes(word))) {
        results.push(buildResult(doc, 0, words))
      }
    }
  }

  return results.slice(0, MAX_RESULTS)
}

// ---------------------------------------------------------------------------
// detailed-view excerpts
//
// fmhy.net's detailed view dynamically imports and mounts the live vue page
// component around each match, then regex-highlights the mounted DOM with
// mark.js (VPLocalSearchBox.vue fetchExcerpt/processExcerpts). that approach
// is vue/DOM-mutation specific and doesn't translate to react. instead we
// build a plain-text excerpt from the already-loaded structured page JSON
// (loadWikiPage) and highlight it with the same buildHighlightSegments
// infrastructure used for title/description today.
// ---------------------------------------------------------------------------

// strips the entry description's markdown syntax down to plain readable text
// (reuses the same tiny parser InlineMarkdown renders with, so "[text](url)"
// becomes "text" instead of leaking markdown punctuation into the excerpt)
function plainText(markdown: string): string {
  return parseInlineMarkdown(markdown)
    .map((span) => span.text)
    .join('')
}

function findEntryInContainer(container: WikiSubsection, id: string): WikiEntry | null {
  return container.entries.find((entry) => entry.id === id) ?? null
}

// doc.anchor is the (sub)section id an entry lives under (see generate.ts) —
// check that container first, then fall back to a full scan in case anchor
// slugging ever drifts from the entry id itself
function findEntry(page: WikiPage, doc: SearchDoc): WikiEntry | null {
  for (const section of page.sections) {
    if (section.id === doc.anchor) {
      const found = findEntryInContainer(section, doc.id)
      if (found) return found
    }
    for (const sub of section.subsections) {
      if (sub.id === doc.anchor) {
        const found = findEntryInContainer(sub, doc.id)
        if (found) return found
      }
    }
  }
  for (const section of page.sections) {
    const found = findEntryInContainer(section, doc.id)
    if (found) return found
    for (const sub of section.subsections) {
      const found2 = findEntryInContainer(sub, doc.id)
      if (found2) return found2
    }
  }
  return null
}

// an entry's own card is a one-liner, so the "excerpt" pulls together every
// text field on the entry (description, alternatives, tags, platforms, sub-
// link labels) into one blob — enough surrounding text for a query term to
// plausibly appear more than once, which is what makes match-cycling useful
function buildExcerptText(entry: WikiEntry | null): string | null {
  if (!entry) return null
  const parts: string[] = []
  if (entry.description) parts.push(plainText(entry.description))
  if (entry.alternatives.length) {
    parts.push(entry.alternatives.map((a) => a.title).join(' · '))
  }
  if (entry.tags.length) parts.push(entry.tags.join(' · '))
  if (entry.platforms.length) parts.push(entry.platforms.join(' · '))
  if (entry.links.length) parts.push(entry.links.map((link) => link.label).join(' · '))
  const text = parts.join('  —  ')
  return text || null
}

// permanent cache keyed by doc id (entry text is stable for the life of the
// generated build, like fmhy.net's own globalExcerptCache) plus an in-flight
// promise map so concurrent rows requesting the same entry share one load.
// exposed through the same useSyncExternalStore-backed emitter idiom the rest
// of the app uses for shared reactive state (searchOpen, showNsfw) — a plain
// useState+setTimeout tick was tried first but proved unreliable here: with
// many rows resolving in the same batch (e.g. toggling detailed view after a
// large result set is already mounted), some rows' re-renders were silently
// dropped and stayed stuck on "loading" forever. useSyncExternalStore doesn't
// have that failure mode since react itself owns re-subscribing correctly.
const excerptCache = new Map<string, string | null>()
const excerptPromises = new Map<string, Promise<string | null>>()
const excerptGeneration = createEmitter<number>('wiki.searchExcerptGeneration', 0)

function loadExcerptSource(doc: SearchDoc): Promise<string | null> {
  const cached = excerptCache.get(doc.id)
  if (cached !== undefined) return Promise.resolve(cached)

  let promise = excerptPromises.get(doc.id)
  if (!promise) {
    promise = loadWikiPage(doc.pageId)
      .then((page) => buildExcerptText(findEntry(page, doc)))
      .catch(() => null)
      .then((text) => {
        excerptCache.set(doc.id, text)
        excerptGeneration.emit(excerptGeneration.value + 1)
        return text
      })
      .finally(() => excerptPromises.delete(doc.id))
    excerptPromises.set(doc.id, promise)
  }
  return promise
}

// triggers (and caches) the excerpt load for a result row when detailed view
// is enabled, re-rendering the row once it resolves; returns undefined while
// loading/disabled so callers can distinguish "not ready" from "no excerpt"
export function useExcerptSource(
  doc: SearchDoc,
  enabled: boolean
): string | null | undefined {
  useEffect(() => {
    if (!enabled) return
    if (excerptCache.has(doc.id)) return
    // fire-and-forget: the module-level cache + generation emitter are what
    // drive re-rendering, not this effect's own lifecycle, so there's
    // nothing to cancel if the row unmounts before it resolves
    loadExcerptSource(doc)
  }, [doc.id, enabled])

  return useSyncExternalStore(
    excerptGeneration.subscribe,
    () => (enabled ? excerptCache.get(doc.id) : undefined),
    () => undefined
  )
}

// synchronous read of whatever useExcerptSource has already loaded — used by
// the modal's keyboard handler to cycle matches on the selected result
// without mounting its own copy of the loading hook
export function peekExcerptSource(doc: SearchDoc): string | null | undefined {
  return excerptCache.get(doc.id)
}

export type ExcerptMatches = {
  windowed: string
  segments: HighlightSegment[]
  matchCount: number
}

// windows the raw excerpt around the first match, then highlights every
// occurrence of the query terms within that window — one highlighted segment
// is treated as one "match" for the N/M counter and cycling controls
export function getExcerptMatches(
  source: string | null | undefined,
  terms: string[]
): ExcerptMatches | null {
  if (!source) return null
  const windowed = windowExcerpt(source, terms)
  const segments = buildHighlightSegments(windowed, terms)
  const matchCount = segments.filter((segment) => segment.match).length
  return { windowed, segments, matchCount }
}

// up to ~5 autocomplete suggestions: titles whose tokens prefix-match the
// last query word, used when a search returns nothing
function buildSuggestions(index: SearchIndex, rawQuery: string, showNsfw: boolean) {
  const words = normalize(rawQuery).split(/\s+/).filter(Boolean)
  const last = words[words.length - 1]
  if (!last || last.length < 2) return []

  const seen = new Set<string>()
  const out: string[] = []
  for (const doc of index.byId.values()) {
    if (doc.nsfw === true && !showNsfw) continue
    if (!tokenize(doc.title).some((token) => token.startsWith(last))) continue
    if (seen.has(doc.title)) continue
    seen.add(doc.title)
    out.push(doc.title)
    if (out.length >= 5) break
  }
  return out
}

const MAX_RECENT = 20

export function useWikiSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<WikiSearchResult[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [recent, setRecent] = useState<string[]>([])
  const [fuzzy, setFuzzyState] = useState(false)
  const [detailedView, setDetailedViewState] = useState(false)
  const [showNsfw] = useShowNsfw()
  const generation = useRef(0)

  useEffect(() => {
    setRecent(recentSearchesStorage.get() ?? [])
    const storedFuzzy = fuzzyStorage.get()
    if (storedFuzzy != null) setFuzzyState(storedFuzzy)
    const storedDetailed = detailedViewStorage.get()
    if (storedDetailed != null) setDetailedViewState(storedDetailed)
  }, [])

  // warm the index on mount so building it overlaps with typing
  useEffect(() => {
    getSearchIndex().catch(() => {})
  }, [])

  useEffect(() => {
    const id = ++generation.current

    if (!query.trim()) {
      setResults([])
      setSuggestions([])
      setLoading(false)
      return
    }

    setLoading(true)
    const timeout = setTimeout(async () => {
      const index = await getSearchIndex()
      if (generation.current !== id) return
      const next = runSearch(index, query, showNsfw, fuzzy)
      setResults(next)
      setSuggestions(next.length === 0 ? buildSuggestions(index, query, showNsfw) : [])
      setLoading(false)
    }, 250)

    return () => {
      clearTimeout(timeout)
    }
  }, [query, showNsfw, fuzzy])

  const setFuzzy = useCallback((value: boolean) => {
    setFuzzyState(value)
    fuzzyStorage.set(value)
  }, [])

  const setDetailedView = useCallback((value: boolean) => {
    setDetailedViewState(value)
    detailedViewStorage.set(value)
  }, [])

  const commitRecent = useCallback((value: string) => {
    const trimmed = value.trim()
    if (trimmed.length < 2) return
    const existing = recentSearchesStorage.get() ?? []
    const next = [trimmed, ...existing.filter((item) => item !== trimmed)].slice(
      0,
      MAX_RECENT
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
    loading,
    fuzzy,
    setFuzzy,
    detailedView,
    setDetailedView,
    recent,
    commitRecent,
    removeRecent,
    clearRecent,
    suggestions,
  }
}
