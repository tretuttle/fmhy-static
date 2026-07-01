// pure search text helpers shared by the wiki search hook + ui:
// normalize/tokenize match the fmhy.net build tokenizer, buildHighlightSegments
// produces case-insensitive highlight spans over the original display text, and
// windowExcerpt trims a longer excerpt down to a readable snippet around a match
// (fmhy.net's detailed search view does the same, just via a full rendered page
// section instead of our flattened entry text).

const INVISIBLE_RE = /[⁠​‌‍﻿]/g
// fmhy tokenizer split set: whitespace + # % * , = / : ; ? [ ] { } ( ) &
const TOKEN_SPLIT_RE = /[\n\r #%*,=/:;?[\]{}()&]+/u

// strip invisible chars, lowercase, trim
export function normalize(text: string): string {
  return text.replace(INVISIBLE_RE, '').toLowerCase().trim()
}

// tokenizer matching the spec: split on the punctuation set, drop terms < 2 chars
export function tokenize(text: string): string[] {
  return normalize(text)
    .split(TOKEN_SPLIT_RE)
    .map((term) => term.replace(/^\.+|\.+$/g, ''))
    .filter((term) => term.length >= 2)
}

export type HighlightSegment = {
  text: string
  match: boolean
}

// returns segments of the ORIGINAL display string, marking spans that
// case-insensitively contain any of the given terms. terms are matched as
// substrings (longest first so overlapping terms prefer the bigger match).
export function buildHighlightSegments(
  display: string,
  terms: string[]
): HighlightSegment[] {
  if (!display) return []
  const cleaned = terms
    .map((term) => normalize(term))
    .filter((term) => term.length >= 1)
    .sort((a, b) => b.length - a.length)
  if (cleaned.length === 0) return [{ text: display, match: false }]

  const lower = display.toLowerCase()
  const matched = Array.from<boolean>({ length: display.length }).fill(false)

  for (const term of cleaned) {
    let from = 0
    while (from <= lower.length - term.length) {
      const at = lower.indexOf(term, from)
      if (at === -1) break
      for (let i = at; i < at + term.length; i++) matched[i] = true
      from = at + term.length
    }
  }

  const segments: HighlightSegment[] = []
  let start = 0
  for (let i = 1; i <= display.length; i++) {
    if (i === display.length || matched[i] !== matched[start]) {
      segments.push({ text: display.slice(start, i), match: matched[start] })
      start = i
    }
  }
  return segments
}

const EXCERPT_WINDOW = 220

// trims `text` down to a ~EXCERPT_WINDOW-char slice centered on the first
// occurrence of any term, with ellipses where content was cut. text shorter
// than the window (the common case for our per-entry excerpts) passes through
// unchanged; falls back to a leading slice when no term is found.
export function windowExcerpt(
  text: string,
  terms: string[],
  window = EXCERPT_WINDOW
): string {
  if (text.length <= window) return text

  const lower = text.toLowerCase()
  let at = -1
  for (const term of terms) {
    const needle = normalize(term)
    if (!needle) continue
    const idx = lower.indexOf(needle)
    if (idx !== -1 && (at === -1 || idx < at)) at = idx
  }
  if (at === -1) return `${text.slice(0, window)}…`

  const half = Math.floor(window / 2)
  let start = Math.max(0, at - half)
  const end = Math.min(text.length, start + window)
  start = Math.max(0, end - window)

  const prefix = start > 0 ? '…' : ''
  const suffix = end < text.length ? '…' : ''
  return `${prefix}${text.slice(start, end)}${suffix}`
}
