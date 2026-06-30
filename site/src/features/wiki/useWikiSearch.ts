import { useCallback, useEffect, useRef, useState } from 'react'

import { createStorageValue } from '~/lib/storage'

import { loadSearchCorpus } from './data'
import {
  buildHighlightSegments,
  normalize,
  tokenize,
  type HighlightSegment,
} from './searchHighlight'
import { recentSearchesStorage, useShowNsfw } from './wikiSettingsStorage'

import type { SearchDoc } from './types'

// re-export for callers that imported it from here previously
export function normalizeSearchText(text: string): string {
  return normalize(text)
}

const fuzzyStorage = createStorageValue<boolean>('wiki.searchFuzzy')

type PreparedDoc = {
  doc: SearchDoc
  title: string
  altTitles: string[]
  titleTokens: string[]
  description: string
  sectionPath: string
  pageTitle: string
  haystack: string
}

let preparedCorpus: PreparedDoc[] | null = null
let corpusPromise: Promise<PreparedDoc[]> | null = null

async function getPreparedCorpus(): Promise<PreparedDoc[]> {
  if (preparedCorpus) return preparedCorpus
  corpusPromise ??= loadSearchCorpus().then((docs) => {
    preparedCorpus = docs.map((doc) => {
      const title = normalize(doc.title)
      const altTitles = doc.altTitles.map(normalize)
      const description = normalize(doc.description ?? '')
      const sectionPath = normalize(doc.sectionPath)
      const pageTitle = normalize(doc.pageTitle)
      const haystack = [title, ...altTitles, description, sectionPath].join('\n')
      return {
        doc,
        title,
        altTitles,
        titleTokens: tokenize(doc.title),
        description,
        sectionPath,
        pageTitle,
        haystack,
      }
    })
    return preparedCorpus
  })
  return corpusPromise
}

// capped levenshtein: returns distance, or max+1 once it provably exceeds max
function boundedLevenshtein(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1
  const prev = Array.from<number>({ length: b.length + 1 })
  const curr = Array.from<number>({ length: b.length + 1 })
  for (let j = 0; j <= b.length; j++) prev[j] = j
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i
    let rowMin = curr[0]
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost)
      if (curr[j] < rowMin) rowMin = curr[j]
    }
    if (rowMin > max) return max + 1
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j]
  }
  return prev[b.length]
}

// is `term` an ordered subsequence of `text` (gaps allowed)
function isSubsequence(term: string, text: string): boolean {
  let i = 0
  for (let j = 0; j < text.length && i < term.length; j++) {
    if (text[j] === term[i]) i++
  }
  return i === term.length
}

// fuzzy match of a single word against a doc: returns a small penalty score
// (0 best) or null when it does not match at all
function fuzzyWordScore(word: string, prepared: PreparedDoc): number | null {
  if (word.length < 2) return prepared.haystack.includes(word) ? 0 : null
  if (prepared.haystack.includes(word)) return 0

  let best: number | null = null
  for (const token of prepared.titleTokens) {
    const dist = boundedLevenshtein(word, token, 2)
    if (dist <= 2) {
      const score = dist + 1
      if (best === null || score < best) best = score
    }
  }
  // subsequence fallback over the whole title (e.g. "cnby" -> "cineby")
  if (best === null && isSubsequence(word, prepared.title)) {
    best = 4
  }
  return best
}

// tiers: 1 starredExact, 2 exact, 3 starredPrefix, 4 prefix, 5 starredWord,
// 6 word, 7 title substring, 8 description/sectionPath substring
function rankTier(prepared: PreparedDoc, query: string, words: string[]): number {
  const { title, altTitles, titleTokens, doc } = prepared
  const starred = doc.starred

  if (title === query || altTitles.includes(query)) return starred ? 1 : 2
  if (title.startsWith(query) || altTitles.some((alt) => alt.startsWith(query))) {
    return starred ? 3 : 4
  }
  if (words.every((word) => titleTokens.includes(word))) return starred ? 5 : 6
  if (words.every((word) => title.includes(word))) return 7
  return 8
}

export type WikiSearchResult = {
  doc: SearchDoc
  tier: number
  fuzzyScore: number
  titleSegments: HighlightSegment[]
  descriptionSegments: HighlightSegment[]
  pageTitle: string
}

function buildResult(
  prepared: PreparedDoc,
  tier: number,
  fuzzyScore: number,
  words: string[],
): WikiSearchResult {
  return {
    doc: prepared.doc,
    tier,
    fuzzyScore,
    titleSegments: buildHighlightSegments(prepared.doc.title, words),
    descriptionSegments: prepared.doc.description
      ? buildHighlightSegments(prepared.doc.description, words)
      : [],
    pageTitle: prepared.doc.pageTitle,
  }
}

function runSearch(
  corpus: PreparedDoc[],
  rawQuery: string,
  showNsfw: boolean,
  fuzzy: boolean,
) {
  const query = normalize(rawQuery)
  if (!query) return [] as WikiSearchResult[]
  const words = query.split(/\s+/).filter(Boolean)
  const results: WikiSearchResult[] = []

  for (const prepared of corpus) {
    if (prepared.doc.nsfw === true && !showNsfw) continue

    if (fuzzy) {
      let total = 0
      let ok = true
      for (const word of words) {
        const score = fuzzyWordScore(word, prepared)
        if (score === null) {
          ok = false
          break
        }
        total += score
      }
      if (!ok) continue
      const tier = rankTier(prepared, query, words)
      results.push(buildResult(prepared, tier, total, words))
    } else {
      let ok = true
      for (const word of words) {
        if (!prepared.haystack.includes(word)) {
          ok = false
          break
        }
      }
      if (!ok) continue
      const tier = rankTier(prepared, query, words)
      results.push(buildResult(prepared, tier, 0, words))
    }
  }

  results.sort((a, b) => {
    if (a.tier !== b.tier) return a.tier - b.tier
    if (a.fuzzyScore !== b.fuzzyScore) return a.fuzzyScore - b.fuzzyScore
    if (a.doc.title.length !== b.doc.title.length) {
      return a.doc.title.length - b.doc.title.length
    }
    return a.doc.title.localeCompare(b.doc.title)
  })

  return results.slice(0, 100)
}

// up to ~5 autocomplete suggestions: titles whose tokens prefix-match the
// last query word, used when a search returns nothing
function buildSuggestions(corpus: PreparedDoc[], rawQuery: string, showNsfw: boolean) {
  const words = normalize(rawQuery).split(/\s+/).filter(Boolean)
  const last = words[words.length - 1]
  if (!last || last.length < 2) return []

  const seen = new Set<string>()
  const out: string[] = []
  for (const prepared of corpus) {
    if (prepared.doc.nsfw === true && !showNsfw) continue
    if (!prepared.titleTokens.some((token) => token.startsWith(last))) continue
    const title = prepared.doc.title
    if (seen.has(title)) continue
    seen.add(title)
    out.push(title)
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
  const [showNsfw] = useShowNsfw()
  const generation = useRef(0)

  useEffect(() => {
    setRecent(recentSearchesStorage.get() ?? [])
    const storedFuzzy = fuzzyStorage.get()
    if (storedFuzzy != null) setFuzzyState(storedFuzzy)
  }, [])

  // warm the corpus on mount so the download overlaps with typing
  useEffect(() => {
    getPreparedCorpus().catch(() => {})
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
      const corpus = await getPreparedCorpus()
      if (generation.current !== id) return
      const next = runSearch(corpus, query, showNsfw, fuzzy)
      setResults(next)
      setSuggestions(next.length === 0 ? buildSuggestions(corpus, query, showNsfw) : [])
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

  const commitRecent = useCallback((value: string) => {
    const trimmed = value.trim()
    if (trimmed.length < 2) return
    const existing = recentSearchesStorage.get() ?? []
    const next = [trimmed, ...existing.filter((item) => item !== trimmed)].slice(
      0,
      MAX_RECENT,
    )
    recentSearchesStorage.set(next)
    setRecent(next)
  }, [])

  // storage shim has no remove(); an empty list is equivalent for recents
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
    recent,
    commitRecent,
    clearRecent,
    suggestions,
  }
}
