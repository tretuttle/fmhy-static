// markdown parsing for the fmhy wiki generator — see scripts/wiki/generate.ts for the NOTICE

import type {
  WikiAlternative,
  WikiEntry,
  WikiNotice,
  WikiPage,
  WikiSection,
  WikiSubLink,
  WikiSubsection,
} from '../../src/features/wiki/types'
import { PLATFORM_TOKENS, SUBLINK_ICONS, type PageProfile } from './constants'

// U+2060 word joiner, U+200B/U+200C/U+200D zero-widths, U+FEFF BOM
const INVISIBLE_RE = /[\u2060\u200B\u200C\u200D\uFEFF]/g

export const stripInvisible = (s: string) => s.replace(INVISIBLE_RE, '')

// github-slugger compatible: lowercase, strip punctuation except '-'/'_' and
// unicode letters/numbers/marks, spaces to '-', dedupe with -1/-2 suffixes
const slugify = (value: string) =>
  stripInvisible(value)
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\p{M} _-]/gu, '')
    .replace(/ /g, '-')

export class Slugger {
  private occurrences = new Map<string, number>()

  slug(value: string): string {
    const original = slugify(value)
    let result = original
    while (this.occurrences.has(result)) {
      const n = (this.occurrences.get(original) ?? 0) + 1
      this.occurrences.set(original, n)
      result = `${original}-${n}`
    }
    if (!this.occurrences.has(result)) this.occurrences.set(result, 0)
    return result
  }
}

const NOTE_LINK_RE = /\.vitepress\/notes\/([\w-]+)(?:\.md)?$/

export const noteIdFromUrl = (url: string): string | null =>
  NOTE_LINK_RE.exec(url)?.[1] ?? null

// ---------------------------------------------------------------------------
// low-level scanners
// ---------------------------------------------------------------------------

type Seg =
  | { kind: 'link'; name: string; url: string; bold: boolean }
  | { kind: 'text'; text: string; bold: boolean }

const cleanUrl = (raw: string): string => {
  let url = raw.trim()
  if (url.startsWith('<') && url.endsWith('>')) url = url.slice(1, -1).trim()
  return url
}

function tryParseLink(
  s: string,
  start: number,
): { name: string; url: string; end: number } | null {
  // start points at '['
  let depth = 1
  let i = start + 1
  while (i < s.length && depth > 0) {
    if (s[i] === '[') depth++
    else if (s[i] === ']') depth--
    i++
  }
  if (depth !== 0) return null
  const nameEnd = i - 1
  if (s[i] !== '(') return null
  let pdepth = 1
  let j = i + 1
  while (j < s.length && pdepth > 0) {
    if (s[j] === '(') pdepth++
    else if (s[j] === ')') pdepth--
    j++
  }
  if (pdepth !== 0) return null
  return {
    name: s.slice(start + 1, nameEnd).trim(),
    url: cleanUrl(s.slice(i + 1, j - 1)),
    end: j,
  }
}

const AUTOLINK_RE = /^<((?:https?|irc|ftp):\/\/[^>\s]+)>/
const BARE_URL_RE = /^https?:\/\/[^\s]+/

export function scanSegments(s: string): Seg[] {
  const segs: Seg[] = []
  let bold = false
  let pos = 0
  let textStart = -1

  const flushText = (end: number) => {
    if (textStart >= 0 && end > textStart) {
      const text = s.slice(textStart, end)
      if (text.length > 0) segs.push({ kind: 'text', text, bold })
    }
    textStart = -1
  }

  while (pos < s.length) {
    if (s.startsWith('**', pos)) {
      flushText(pos)
      bold = !bold
      pos += 2
      continue
    }
    if (s[pos] === '[') {
      const link = tryParseLink(s, pos)
      if (link) {
        flushText(pos)
        segs.push({ kind: 'link', name: link.name, url: link.url, bold })
        pos = link.end
        continue
      }
    }
    if (s[pos] === '<') {
      const m = AUTOLINK_RE.exec(s.slice(pos))
      if (m) {
        flushText(pos)
        segs.push({ kind: 'link', name: m[1]!, url: m[1]!, bold })
        pos += m[0].length
        continue
      }
    }
    const prev = pos === 0 ? ' ' : s[pos - 1]!
    if (/[\s(,/]/.test(prev) && s[pos] === 'h') {
      const m = BARE_URL_RE.exec(s.slice(pos))
      if (m) {
        flushText(pos)
        let url = m[0]
        // trim trailing punctuation that belongs to the sentence
        while (/[).,;:]$/.test(url) && !(url.endsWith(')') && url.includes('('))) {
          url = url.slice(0, -1)
        }
        segs.push({ kind: 'link', name: url, url, bold })
        pos += url.length
        continue
      }
    }
    if (textStart < 0) textStart = pos
    pos++
  }
  flushText(pos)
  return segs
}

// first ' - ' outside any [] or () nesting splits link group from description
export function splitDescription(s: string): { head: string; tail: string | null } {
  let depth = 0
  for (let i = 0; i < s.length - 2; i++) {
    const c = s[i]
    if (c === '[' || c === '(') depth++
    else if (c === ']' || c === ')') depth = Math.max(0, depth - 1)
    else if (depth === 0 && c === ' ' && s[i + 1] === '-' && s[i + 2] === ' ') {
      return { head: s.slice(0, i), tail: s.slice(i + 3) }
    }
  }
  return { head: s, tail: null }
}

export function splitTopLevel(s: string, sep: string): string[] {
  const out: string[] = []
  let depth = 0
  let start = 0
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (c === '[' || c === '(') depth++
    else if (c === ']' || c === ')') depth = Math.max(0, depth - 1)
    else if (depth === 0 && s.startsWith(sep, i)) {
      out.push(s.slice(start, i))
      start = i + sep.length
      i = start - 1
    }
  }
  out.push(s.slice(start))
  return out
}

// ---------------------------------------------------------------------------
// entry tokenizer
// ---------------------------------------------------------------------------

export type ParsedEntry = Omit<WikiEntry, 'id' | 'crossrefRoute'>

const MARKER_RE = /^(⭐|🌟|🌐|↪)️?\s*/u

const DIGIT_NAME_RE = /^\d{1,2}$/

const iconFor = (label: string): string | null => SUBLINK_ICONS[label] ?? null

const makeSubLink = (label: string, url: string): WikiSubLink => ({
  label,
  url,
  icon: iconFor(label),
  noteId: null,
  route: null,
})

// pure connector text between head links: commas, slashes, ampersands, plus, "or"
const CONNECTOR_TEXT_RE = /^(?:[\s,/&+]+|or)*$/

const cleanTitle = (s: string): string =>
  s.trim().replace(/:$/, '').replace(/\*+$/, '').trim()

/** tokenize one entry body (bullet text after the list marker, or one paragraph-list item) */
export function parseEntryBody(body: string): ParsedEntry | null {
  let s = body.trim()
  if (!s) return null

  // strip stray unmatched '**' (video.md:181 style typo)
  const boldMarks = s.match(/\*\*/g)
  if (boldMarks && boldMarks.length % 2 === 1) {
    const i = s.lastIndexOf('**')
    s = (s.slice(0, i) + s.slice(i + 2)).trim()
  }

  let marker: WikiEntry['marker'] = null
  const m = MARKER_RE.exec(s)
  if (m) {
    marker = m[1] === '🌐' ? 'index' : m[1] === '↪' ? 'crossref' : 'starred'
    s = s.slice(m[0].length)
  }

  const { head, tail } = splitDescription(s)

  let primary: { title: string | null; url: string | null; bold: boolean } | null = null
  let primaryText = ''
  let primaryTextBold = false
  const mirrors: string[] = []
  const alternatives: WikiAlternative[] = []
  const links: WikiSubLink[] = []
  const tags: string[] = []
  const platforms: string[] = []
  const code: string[] = []
  const descParts: string[] = []
  let nsfw: WikiEntry['nsfw'] = false

  // classifies ' / '-separated atoms (tags, platforms, nsfw, sub-links, code,
  // parentheticals) — used for the tail and for substantive head remainders
  const classifyAtoms = (text: string) => {
    for (const atomRaw of splitTopLevel(text, ' / ')) {
      const atom = atomRaw.trim()
      if (!atom || !/[\p{L}\p{N}]/u.test(atom)) continue
      const segs = scanSegments(atom)
      const atomLinks = segs.filter((x) => x.kind === 'link')
      if (atomLinks.length === 0) {
        const pieces = atom.split(/,\s+/).map((p) => p.trim())
        if (pieces.every((p) => p in PLATFORM_TOKENS)) {
          for (const p of pieces) {
            const key = PLATFORM_TOKENS[p]!
            if (!platforms.includes(key)) platforms.push(key)
          }
          continue
        }
        if (atom === 'NSFW') nsfw = true
        else if (atom === 'Some NSFW' && nsfw !== true) nsfw = 'partial'
        if (atom.includes('`')) {
          for (const cm of atom.matchAll(/`([^`]+)`/g)) code.push(cm[1]!.trim())
          descParts.push(atom)
          continue
        }
        descParts.push(atom)
        if (!atom.startsWith('(')) tags.push(atom)
        continue
      }
      for (const link of atomLinks) {
        links.push(makeSubLink(cleanTitle(link.name) || link.name, link.url))
      }
      const flattened = segs
        .map((x) => (x.kind === 'link' ? x.name : x.text))
        .join('')
        .trim()
      const isPureLinks = segs.every(
        (x) => x.kind === 'link' || CONNECTOR_TEXT_RE.test(x.text),
      )
      if (!isPureLinks && flattened.replace(/[\s.,;:/]+/g, '').length > 0) {
        descParts.push(flattened)
      }
    }
  }

  let connector: 'comma' | 'or' | 'slash' | 'none' = 'none'
  let lastTarget: 'primary' | 'alt' | 'sublink' | null = null

  const headSegs = scanSegments(head)
  let headRemainder: string | null = null

  for (let si = 0; si < headSegs.length; si++) {
    const seg = headSegs[si]!
    if (seg.kind === 'text') {
      if (!primary && links.length === 0 && alternatives.length === 0) {
        primaryText += seg.text
        primaryTextBold ||= seg.bold && seg.text.trim().length > 0
        connector = 'none'
        continue
      }
      if (!CONNECTOR_TEXT_RE.test(seg.text)) {
        // substantive head text (tags / qualifiers without a ' - ' separator):
        // route the rest of the head through the tail atom classifier
        headRemainder = headSegs
          .slice(si)
          .map((x) => (x.kind === 'link' ? `[${x.name}](${x.url})` : x.text))
          .join('')
        break
      }
      const t = seg.text.trim()
      if (t === ',') connector = 'comma'
      else if (t === 'or' || t === ', or') connector = 'or'
      else if (t === '/' || t === '+' || t === '&') connector = 'slash'
      else if (t.includes('/')) connector = 'slash'
      else if (/(^|,)\s*or$/.test(t)) connector = 'or'
      else if (t.startsWith(',')) connector = 'comma'
      else connector = 'none'
      continue
    }

    const name = seg.name
    const isDigit = DIGIT_NAME_RE.test(name)

    if (!primary) {
      if (primaryText.trim() === '') {
        primary = {
          title: cleanTitle(name) || null,
          url: seg.url || null,
          bold: seg.bold,
        }
        lastTarget = 'primary'
        connector = 'none'
        continue
      }
      // text primary (toolkit / label row / plain text) followed by links
      primary = {
        title: cleanTitle(primaryText) || null,
        url: null,
        bold: primaryTextBold,
      }
      lastTarget = 'primary'
    }

    if (isDigit) {
      if (lastTarget === 'sublink' || primary.url === null) {
        links.push(makeSubLink(name, seg.url))
        lastTarget = 'sublink'
      } else if (lastTarget === 'alt' && alternatives.length > 0) {
        alternatives[alternatives.length - 1]!.mirrors.push(seg.url)
      } else {
        mirrors.push(seg.url)
      }
    } else if (connector === 'comma' || connector === 'or') {
      alternatives.push({
        title: cleanTitle(name),
        url: seg.url,
        mirrors: [],
        bold: seg.bold,
        route: null,
      })
      lastTarget = 'alt'
    } else {
      links.push(makeSubLink(cleanTitle(name), seg.url))
      lastTarget = 'sublink'
    }
    connector = 'none'
  }

  if (!primary) {
    const text = cleanTitle(primaryText)
    if (!text && !tail) return null
    primary = { title: text || null, url: null, bold: primaryTextBold }
  }

  // head qualifiers (parentheticals, tag runs) come before the tail description
  if (headRemainder) classifyAtoms(headRemainder)
  if (tail) classifyAtoms(tail)

  return {
    marker,
    starred: marker === 'starred',
    bold: primary.bold,
    title: primary.title,
    url: primary.url,
    mirrors,
    alternatives,
    description: descParts.length > 0 ? descParts.join(' / ') : null,
    tags,
    platforms,
    nsfw,
    links,
    code,
  }
}

// ---------------------------------------------------------------------------
// page parser
// ---------------------------------------------------------------------------

type RawEntry = { body: string; counted: boolean; paragraph: boolean }

type Container = {
  title: string
  refUrl: string | null
  notice: WikiNotice | null
  rawEntries: RawEntry[]
  noticeParts: string[]
  subsections: SubContainer[]
}

type SubContainer = Omit<Container, 'subsections'>

export type ParsedPage = {
  page: WikiPage
  stats: PageStats
}

export type PageStats = {
  // entries parsed from '* ' bullet lines (the unit the expected-counts table measures)
  countedEntries: number
  noticeBullets: number
  entries: number
  paragraphEntries: number
  unexpected: { line: number; text: string }[]
}

const headingLink = (title: string): { title: string; refUrl: string | null } => {
  const segs = scanSegments(title.trim())
  if (segs.length === 1 && segs[0]!.kind === 'link') {
    return { title: segs[0].name.trim(), refUrl: segs[0].url }
  }
  return { title: title.trim(), refUrl: null }
}

const BANNER_RES = [
  /^\*\*\[◄◄ Back to Wiki Index\]/,
  /^\*\*\[Table of Contents\]\(https?:\/\/.*?ibb\.co/,
]

const NOTICE_BULLET_RE = /^\*\s{1,2}\*\*(Note|Warning)\*\*\s*-\s*(.*)$/
const NOTICE_BARE_RE = /^(?:\*\*)?(Note|Warning)(?:\*\*)?\s+-\s+(.*)$/
const BULLET_RE = /^[*-]\s{1,2}(\S.*)$/
const TIGHT_BULLET_RE = /^\*(\[.*)$/

export function parsePage(
  pageId: string,
  title: string,
  description: string,
  kind: PageProfile,
  source: string,
): ParsedPage {
  const stats: PageStats = {
    countedEntries: 0,
    noticeBullets: 0,
    entries: 0,
    paragraphEntries: 0,
    unexpected: [],
  }

  const lines = stripInvisible(source).split('\n')

  let pageNotice: WikiNotice | null = null
  const containers: Container[] = []
  let section: Container | null = null
  let sub: SubContainer | null = null
  let lastWasEntry = false

  const current = (): SubContainer | Container | null => sub ?? section

  const addNotice = (kindWord: string, markdown: string) => {
    const noticeKind = kindWord === 'Warning' ? 'warning' : 'tip'
    const target = current()
    const existing = target ? target.notice : pageNotice
    const merged: WikiNotice = existing
      ? { kind: existing.kind, markdown: `${existing.markdown}\n\n${markdown.trim()}` }
      : { kind: noticeKind, markdown: markdown.trim() }
    if (target) target.notice = merged
    else pageNotice = merged
  }

  const openSection = (rawTitle: string) => {
    const { title: t, refUrl } = headingLink(rawTitle)
    section = {
      title: t,
      refUrl,
      notice: null,
      rawEntries: [],
      noticeParts: [],
      subsections: [],
    }
    sub = null
    containers.push(section)
  }

  const openSubsection = (rawTitle: string) => {
    if (!section) openSection('')
    const { title: t, refUrl } = headingLink(rawTitle)
    sub = { title: t, refUrl, notice: null, rawEntries: [], noticeParts: [] }
    section!.subsections.push(sub)
  }

  const pushEntry = (body: string, counted: boolean, paragraph = false) => {
    if (!section) openSection('')
    const target = current()!
    target.rawEntries.push({ body, counted, paragraph })
    lastWasEntry = true
  }

  for (let li = 0; li < lines.length; li++) {
    const rawLine = lines[li]!
    const line = rawLine.trimEnd()
    const wasEntry = lastWasEntry
    lastWasEntry = false

    if (line.trim() === '') continue
    if (/^\*{3,}\s*$/.test(line)) continue
    if (BANNER_RES.some((re) => re.test(line))) continue

    // headings per profile
    let h: RegExpExecArray | null = null
    if (kind === 'wiki') {
      if ((h = /^# ►\s*(.+)$/.exec(line))) {
        openSection(h[1]!)
        continue
      }
      if ((h = /^## ▷\s*(.+)$/.exec(line))) {
        openSubsection(h[1]!)
        continue
      }
      if ((h = /^###+\s+(.+)$/.exec(line))) {
        openSubsection(h[1]!)
        continue
      }
      // lenient fallbacks (the glyphs are always present today)
      if ((h = /^# (.+)$/.exec(line))) {
        openSection(h[1]!)
        continue
      }
      if ((h = /^## (.+)$/.exec(line))) {
        openSubsection(h[1]!)
        continue
      }
    } else if (kind === 'storage') {
      if ((h = /^## (.+)$/.exec(line))) {
        openSection(h[1]!)
        continue
      }
      if ((h = /^### (.+)$/.exec(line))) {
        openSubsection(h[1]!)
        continue
      }
    } else {
      // unsafe + guide use '### Title' sections
      if ((h = /^###\s+(.+)$/.exec(line))) {
        openSection(h[1]!)
        continue
      }
    }

    // notices
    let n = NOTICE_BULLET_RE.exec(line)
    if (n) {
      stats.noticeBullets++
      addNotice(n[1]!, n[2]!)
      continue
    }
    n = NOTICE_BARE_RE.exec(line)
    if (n && !BULLET_RE.test(line)) {
      addNotice(n[1]!, n[2]!)
      continue
    }

    // guide prose: blockquote questions, !!!callouts, paragraphs
    if (kind === 'guide') {
      const target = (() => {
        if (!section) openSection('')
        return current()!
      })()
      const bang = /^!!!(note|info|warning)\s+(.+)$/.exec(line)
      if (bang) {
        target.noticeParts.push(
          `**${bang[1] === 'warning' ? 'Warning' : 'Note'}:** ${bang[2]}`,
        )
        continue
      }
      if (line.startsWith('> ')) {
        // blockquote questions: the inline renderer has no '>' support — bold them
        target.noticeParts.push(`**${line.slice(2).trim()}**`)
        continue
      }
      const bq = BULLET_RE.exec(line)
      if (bq) {
        pushEntry(bq[1]!, line.startsWith('* '))
        continue
      }
      target.noticeParts.push(line.trim())
      continue
    }

    // bullets
    let b = BULLET_RE.exec(line)
    if (b) {
      pushEntry(b[1]!, line.startsWith('* '))
      continue
    }
    b = TIGHT_BULLET_RE.exec(line)
    if (b) {
      pushEntry(b[1]!, false)
      continue
    }

    // storage paragraph link lists
    if (kind === 'storage' && line.startsWith('[') && line.includes('](')) {
      for (const item of splitTopLevel(line.trim(), ', ')) {
        if (item.trim()) pushEntry(item.trim(), false, true)
      }
      lastWasEntry = false
      continue
    }

    // unsafe page intro prose before the first heading
    if (kind === 'unsafe' && !section) {
      pageNotice = pageNotice
        ? { kind: pageNotice.kind, markdown: `${pageNotice.markdown}\n\n${line.trim()}` }
        : { kind: 'tip', markdown: line.trim() }
      continue
    }

    // lazy continuation of the previous list item
    if (wasEntry) {
      const target = current()
      const last = target?.rawEntries[target.rawEntries.length - 1]
      if (last) {
        const cont = line.trim()
        last.body = cont.startsWith(',') ? last.body + cont : `${last.body} ${cont}`
        lastWasEntry = true
        continue
      }
    }

    stats.unexpected.push({ line: li + 1, text: line.slice(0, 120) })
  }

  // assemble typed page
  const slugger = new Slugger()
  const sections: WikiSection[] = []
  let entryCount = 0

  const buildSub = (
    c: Container | SubContainer,
    parentTitle: string | null,
  ): WikiSubsection => {
    const id = slugger.slug(c.title || (parentTitle ?? 'section'))
    let notice = c.notice
    if (c.noticeParts.length > 0) {
      const prose = c.noticeParts.join('\n\n')
      notice = notice
        ? { kind: notice.kind, markdown: `${notice.markdown}\n\n${prose}` }
        : { kind: 'tip', markdown: prose }
    }
    const entries: WikiEntry[] = []
    for (const raw of c.rawEntries) {
      const parsed = parseEntryBody(raw.body)
      if (!parsed) continue
      entries.push({
        ...parsed,
        id: `${pageId}/${id}/${entries.length}`,
        crossrefRoute: null,
      })
      stats.entries++
      if (raw.counted) stats.countedEntries++
      if (raw.paragraph) stats.paragraphEntries++
    }
    entryCount += entries.length
    return { id, title: c.title, refUrl: c.refUrl, crossrefRoute: null, notice, entries }
  }

  for (const c of containers) {
    const base = buildSub(c, null)
    const subsections = c.subsections.map((sc) => buildSub(sc, c.title))
    sections.push({ ...base, subsections })
  }

  return {
    page: { id: pageId, title, description, kind, pageNotice, sections, entryCount },
    stats,
  }
}
