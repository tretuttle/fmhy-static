// pure search text helpers shared by the wiki search hook + ui:
// normalize/tokenize match the fmhy.net build tokenizer, and buildHighlightSegments
// produces case-insensitive highlight spans over the original display text.

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
  terms: string[],
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
