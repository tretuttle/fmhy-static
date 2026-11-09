import type { InlineSpan } from './InlineMarkdown'

// upstream transformer.ts "Platform indicators", applied to one entry line:
//   (?<=\/ (\/>|[^/\r\n])*)(,\s)?(?<![a-z]\s)Word(?=,|[ \t]\/|$)
// a word becomes an icon only after a '/ ' with no other '/' since (link urls
// carry slashes, so any link in between breaks the run), never right after
// lowercase-word + space ("Run Docker on Android" stays text), and only when
// followed by ',', ' /' or the end of the line. a leading ', ' is consumed,
// so "Windows, macOS" reads as two icons with no comma. the mirror walks the
// line as inline spans, so the slash state is threaded from span to span.

export type PlatformWord =
  | 'Windows'
  | 'Mac'
  | 'macOS'
  | 'Linux'
  | 'Android'
  | 'iOS'
  | 'Web'
  | 'Docker'

const WORD_RE =
  /(?<![\p{L}\p{N}])(Windows|macOS|Mac|Linux|Android|iOS|Web|Docker)(?=,|[ \t]\/|$)/gu

// [start, end) is the replaced range (including a consumed ', ')
export type PlatformMatch = { start: number; end: number; word: PlatformWord }

// slash state after reading `text`: open while the last '/' seen was a '/ '
const slashStateAfter = (open: boolean, text: string): boolean => {
  let state = open
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '/') state = text[i + 1] === ' '
  }
  return state
}

export function findPlatformWords(
  text: string,
  slashOpen: boolean,
  atLineEnd: boolean
): PlatformMatch[] {
  const out: PlatformMatch[] = []
  let state = slashOpen
  let scanned = 0
  for (const m of text.matchAll(WORD_RE)) {
    const index = m.index!
    const end = index + m[1]!.length
    state = slashStateAfter(state, text.slice(scanned, index))
    scanned = index
    if (!state) continue
    if (end === text.length && !atLineEnd) continue
    if (/[a-z]/.test(text[index - 2] ?? '') && /\s/.test(text[index - 1] ?? '')) continue
    const start = text.startsWith(', ', index - 2) ? index - 2 : index
    out.push({ start, end, word: m[1] as PlatformWord })
  }
  return out
}

// the slash state each span starts in (links/images carry a url, so they
// close the run; text and code are scanned)
export function spanSlashStates(spans: InlineSpan[]): boolean[] {
  const states: boolean[] = []
  let open = false
  for (const span of spans) {
    states.push(open)
    open =
      span.kind === 'text' || span.kind === 'code'
        ? slashStateAfter(open, span.text)
        : false
  }
  return states
}
