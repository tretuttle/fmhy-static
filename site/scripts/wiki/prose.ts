// prose-page markdown parser for the fmhy wiki generator — see
// scripts/wiki/generate.ts for the NOTICE. handles the "regular markdown"
// pages (docs/other/*, docs/posts/*, sandbox, recently-removed): headings,
// paragraphs, lists, blockquotes, ::: containers, github alerts, code fences,
// images and the two vue components used in content (<Post/>, <WallpaperCard/>)

import type {
  WikiProseBlock,
  WikiProseContainerVariant,
  WikiProseListItem,
} from '../../src/features/wiki/types'
import { Slugger, stripInvisible } from './parse'

// ---------------------------------------------------------------------------
// frontmatter
// ---------------------------------------------------------------------------

export type ProseFrontmatter = Record<string, string>

export function splitFrontmatter(source: string): {
  frontmatter: ProseFrontmatter
  body: string
} {
  const frontmatter: ProseFrontmatter = {}
  if (!source.startsWith('---')) return { frontmatter, body: source }
  const end = source.indexOf('\n---', 3)
  if (end < 0) return { frontmatter, body: source }
  const header = source.slice(3, end)
  for (const line of header.split(/\r?\n/)) {
    const m = /^([A-Za-z][\w.-]*):\s*(.*)$/.exec(line)
    if (!m) continue
    let value = m[2]!.trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    frontmatter[m[1]!] = value
  }
  const body = source.slice(end + 4).replace(/^\r?\n/, '')
  return { frontmatter, body }
}

// ---------------------------------------------------------------------------
// block parser
// ---------------------------------------------------------------------------

export type ParsedProse = {
  frontmatter: ProseFrontmatter
  // authors="a,b" from a <Post/> tag, hoisted out of the block stream
  authorNames: string[]
  blocks: WikiProseBlock[]
}

const HR_RE = /^\s{0,3}(\*{3,}|-{3,}|_{3,})\s*$/
const HEADING_RE = /^(#{1,6})\s+(.+?)\s*#*\s*$/
const FENCE_RE = /^\s*(```+)\s*([\w-]*)\s*$/
const CONTAINER_OPEN_RE = /^:{3,}\s*(info|tip|warning|danger|details)\s*(.*)$/i
const CONTAINER_CLOSE_RE = /^:{3,}\s*$/
const ALERT_RE = /^>\s*\[!(NOTE|INFO|TIP|WARNING|CAUTION|DANGER|IMPORTANT)\]\s*(.*)$/i
const LIST_ITEM_RE = /^(\s*)([-*+]|\d{1,3}[.)])\s+(\S.*)$/
const IMAGE_RE = /^!\[([^\]]*)\]\(([^()\s]+(?:\s+"[^"]*")?)\)\s*$/
const POST_TAG_RE = /<Post\s+authors="([^"]*)"\s*\/>/

const ALERT_VARIANTS: Record<string, WikiProseContainerVariant> = {
  note: 'info',
  info: 'info',
  important: 'info',
  tip: 'tip',
  warning: 'warning',
  caution: 'danger',
  danger: 'danger',
}

const stripComments = (line: string) => line.replace(/<!--[\s\S]*?-->/g, '')

// drops html comments and trims stray whitespace inside link targets
// ("[x](url )" appears upstream) so the inline renderer's link regex matches
const cleanInline = (line: string) =>
  stripComments(line).replace(/\]\(\s*([^()\s]+)\s*\)/g, ']($1)')

const isBlank = (line: string | undefined) => line === undefined || line.trim() === ''

// structural test: does this line start a non-paragraph block?
function isStructural(line: string): boolean {
  return (
    HR_RE.test(line) ||
    HEADING_RE.test(line) ||
    FENCE_RE.test(line) ||
    CONTAINER_OPEN_RE.test(line) ||
    line.trimStart().startsWith('> ') ||
    line.trimStart() === '>' ||
    LIST_ITEM_RE.test(line) ||
    IMAGE_RE.test(line.trim()) ||
    line.trimStart().startsWith('<WallpaperCard') ||
    POST_TAG_RE.test(line) ||
    line.trimStart().startsWith('<script')
  )
}

// collapses multi-line component tags (<WallpaperCard\n  title=... />) onto a
// single line so the line-based scanner can regex their attributes
function joinComponentTags(lines: string[]): string[] {
  const out: string[] = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!
    if (line.trimStart().startsWith('<WallpaperCard') && !line.includes('/>')) {
      let joined = line
      while (i + 1 < lines.length && !joined.includes('/>')) {
        i++
        joined += ` ${lines[i]!.trim()}`
      }
      out.push(joined)
      continue
    }
    out.push(line)
  }
  return out
}

const attr = (tag: string, name: string): string => {
  const m = new RegExp(`${name}="([^"]*)"`).exec(tag)
  return m?.[1] ?? ''
}

type ParseState = {
  lines: string[]
  pos: number
  slugger: Slugger
  authorNames: string[]
}

function parseListRun(state: ParseState, baseIndent: number): WikiProseBlock {
  const { lines } = state
  const first = LIST_ITEM_RE.exec(lines[state.pos]!)!
  const ordered = /^\d/.test(first[2]!)
  const items: WikiProseListItem[] = []

  while (state.pos < lines.length) {
    const line = lines[state.pos]
    if (isBlank(line)) {
      // a blank line ends the list unless it's followed by more list content
      let j = state.pos + 1
      while (j < lines.length && isBlank(lines[j])) j++
      const next = lines[j]
      if (next === undefined) break
      const nm = LIST_ITEM_RE.exec(next)
      const indent = next.length - next.trimStart().length
      if ((nm && nm[1]!.length === baseIndent) || indent > baseIndent) {
        state.pos = j
        continue
      }
      break
    }

    const m = LIST_ITEM_RE.exec(line!)
    const indent = line!.length - line!.trimStart().length

    if (m && m[1]!.length === baseIndent) {
      // new item at this level
      items.push({ markdown: cleanInline(m[3]!).trim(), children: [] })
      state.pos++
      continue
    }

    if (indent > baseIndent && items.length > 0) {
      // nested content: collect the deeper-indented run and parse recursively
      const childLines: string[] = []
      const childIndent = indent
      while (state.pos < lines.length) {
        const cl = lines[state.pos]
        if (isBlank(cl)) {
          // keep blank lines that are internal to the nested run
          let j = state.pos + 1
          while (j < lines.length && isBlank(lines[j])) j++
          const next = lines[j]
          const nIndent =
            next === undefined ? 0 : next.length - next.trimStart().length
          if (next !== undefined && nIndent > baseIndent) {
            childLines.push('')
            state.pos = j
            continue
          }
          break
        }
        const clIndent = cl!.length - cl!.trimStart().length
        if (clIndent <= baseIndent) break
        childLines.push(cl!.slice(Math.min(childIndent, clIndent)))
        state.pos++
      }
      const childState: ParseState = {
        lines: childLines,
        pos: 0,
        slugger: state.slugger,
        authorNames: state.authorNames,
      }
      items[items.length - 1]!.children.push(...parseBlockStream(childState))
      continue
    }

    break
  }

  return { kind: 'list', ordered, items }
}

function parseBlockStream(state: ParseState): WikiProseBlock[] {
  const blocks: WikiProseBlock[] = []
  const { lines } = state

  while (state.pos < lines.length) {
    const raw = lines[state.pos]!
    const line = raw.trimEnd()
    const trimmed = line.trim()

    if (trimmed === '') {
      state.pos++
      continue
    }

    // <script setup> blocks (vue component imports) — skip entirely
    if (trimmed.startsWith('<script')) {
      while (state.pos < lines.length && !lines[state.pos]!.includes('</script>')) {
        state.pos++
      }
      state.pos++
      continue
    }

    // pure comment lines
    if (stripComments(trimmed).trim() === '' && trimmed.startsWith('<!--')) {
      state.pos++
      continue
    }

    // <Post authors="..."/> → hoist authors
    const post = POST_TAG_RE.exec(trimmed)
    if (post) {
      for (const name of post[1]!.split(',')) {
        const n = name.trim()
        if (n) state.authorNames.push(n)
      }
      state.pos++
      continue
    }

    // <WallpaperCard .../> (already joined onto one line)
    if (trimmed.startsWith('<WallpaperCard')) {
      blocks.push({
        kind: 'wallpaper',
        title: attr(trimmed, 'title'),
        description: attr(trimmed, 'description'),
        mobile: attr(trimmed, 'mobile'),
        desktop: attr(trimmed, 'desktop'),
      })
      state.pos++
      continue
    }

    // code fences
    const fence = FENCE_RE.exec(line)
    if (fence) {
      const codeLines: string[] = []
      state.pos++
      while (state.pos < lines.length && !FENCE_RE.test(lines[state.pos]!)) {
        codeLines.push(lines[state.pos]!)
        state.pos++
      }
      state.pos++ // closing fence
      blocks.push({
        kind: 'code',
        language: fence[2] || null,
        code: codeLines.join('\n'),
      })
      continue
    }

    // ::: containers
    const container = CONTAINER_OPEN_RE.exec(trimmed)
    if (container) {
      const variant = container[1]!.toLowerCase() as WikiProseContainerVariant
      const title = container[2]?.trim() || null
      const inner: string[] = []
      let depth = 1
      state.pos++
      while (state.pos < lines.length) {
        const cl = lines[state.pos]!.trim()
        if (CONTAINER_OPEN_RE.test(cl)) depth++
        else if (CONTAINER_CLOSE_RE.test(cl)) {
          depth--
          if (depth === 0) break
        }
        inner.push(lines[state.pos]!)
        state.pos++
      }
      state.pos++ // closing :::
      const innerState: ParseState = {
        lines: inner,
        pos: 0,
        slugger: state.slugger,
        authorNames: state.authorNames,
      }
      blocks.push({
        kind: 'container',
        variant,
        title,
        blocks: parseBlockStream(innerState),
      })
      continue
    }

    // github-style alerts: > [!INFO] TITLE + following "> " lines
    const alert = ALERT_RE.exec(trimmed)
    if (alert) {
      const variant = ALERT_VARIANTS[alert[1]!.toLowerCase()] ?? 'info'
      const title = alert[2]?.trim() || null
      const inner: string[] = []
      state.pos++
      while (state.pos < lines.length) {
        const cl = lines[state.pos]!.trim()
        if (cl === '>') {
          inner.push('')
          state.pos++
          continue
        }
        if (!cl.startsWith('> ')) break
        inner.push(cl.slice(2))
        state.pos++
      }
      const innerState: ParseState = {
        lines: inner,
        pos: 0,
        slugger: state.slugger,
        authorNames: state.authorNames,
      }
      blocks.push({
        kind: 'container',
        variant,
        title,
        blocks: parseBlockStream(innerState),
      })
      continue
    }

    // blockquotes
    if (trimmed.startsWith('> ') || trimmed === '>') {
      const quote: string[] = []
      while (state.pos < lines.length) {
        const cl = lines[state.pos]!.trim()
        if (cl === '>') quote.push('')
        else if (cl.startsWith('> ')) quote.push(cleanInline(cl.slice(2)).trim())
        else break
        state.pos++
      }
      blocks.push({ kind: 'blockquote', markdown: quote.join('\n').trim() })
      continue
    }

    // horizontal rules
    if (HR_RE.test(line)) {
      blocks.push({ kind: 'hr' })
      state.pos++
      continue
    }

    // headings
    const heading = HEADING_RE.exec(line)
    if (heading) {
      const markdown = cleanInline(heading[2]!).trim()
      blocks.push({
        kind: 'heading',
        level: heading[1]!.length as 1 | 2 | 3 | 4 | 5 | 6,
        id: state.slugger.slug(plainifyInline(markdown)),
        markdown,
      })
      state.pos++
      continue
    }

    // lists
    const listItem = LIST_ITEM_RE.exec(line)
    if (listItem) {
      blocks.push(parseListRun(state, listItem[1]!.length))
      continue
    }

    // standalone images
    const image = IMAGE_RE.exec(trimmed)
    if (image) {
      const src = image[2]!.replace(/\s+"[^"]*"$/, '')
      blocks.push({ kind: 'image', src, alt: image[1] ?? '' })
      state.pos++
      continue
    }

    // paragraph: merge consecutive plain lines
    const para: string[] = [cleanInline(trimmed)]
    state.pos++
    while (state.pos < lines.length) {
      const next = lines[state.pos]
      if (isBlank(next) || isStructural(next!)) break
      para.push(cleanInline(next!.trim()))
      state.pos++
    }
    const text = para.join(' ').replace(/\s+/g, ' ').trim()
    if (text) blocks.push({ kind: 'paragraph', markdown: text })
  }

  return blocks
}

export function parseProse(source: string): ParsedProse {
  const { frontmatter, body } = splitFrontmatter(stripInvisible(source))
  const state: ParseState = {
    lines: joinComponentTags(body.split(/\r?\n/)),
    pos: 0,
    slugger: new Slugger(),
    authorNames: [],
  }
  const blocks = parseBlockStream(state)
  return { frontmatter, authorNames: state.authorNames, blocks }
}

// ---------------------------------------------------------------------------
// plain-text extraction (search corpus)
// ---------------------------------------------------------------------------

// strips inline markdown down to readable text: [text](url) → text, **/*/`
// markers dropped, images → alt text
export function plainifyInline(markdown: string): string {
  return markdown
    .replace(/!\[([^\]]*)\]\([^()]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^()]*\)/g, '$1')
    .replace(/\*\*|__/g, '')
    .replace(/`/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export type ProseSearchSection = {
  // heading trail leading to this section, outermost first ([] = page intro)
  path: string[]
  // heading anchor id ('' = page intro)
  anchor: string
  // section heading text ('' = page intro)
  title: string
  text: string
}

// splits a parsed prose page into per-heading search sections, mirroring the
// real site's minisearch splitter. admonition containers are excluded from the
// indexed text (upstream stripNoteBlocks) — :::details content stays.
export function splitForSearch(blocks: WikiProseBlock[]): ProseSearchSection[] {
  const sections: ProseSearchSection[] = [
    { path: [], anchor: '', title: '', text: '' },
  ]
  // heading trail by level
  const trail: { level: number; title: string }[] = []

  const appendText = (text: string) => {
    const target = sections[sections.length - 1]!
    if (!text) return
    target.text = target.text ? `${target.text} ${text}` : text
  }

  const walkText = (block: WikiProseBlock) => {
    switch (block.kind) {
      case 'paragraph':
      case 'blockquote':
        appendText(plainifyInline(block.markdown))
        break
      case 'list':
        for (const item of block.items) {
          appendText(plainifyInline(item.markdown))
          for (const child of item.children) walkText(child)
        }
        break
      case 'code':
        appendText(block.code.replace(/\s+/g, ' ').trim())
        break
      case 'container':
        if (block.variant === 'details') {
          for (const child of block.blocks) walkText(child)
        }
        break
      case 'wallpaper':
        appendText(`${block.title} ${block.description}`.trim())
        break
      case 'image':
        appendText(block.alt)
        break
      default:
        break
    }
  }

  for (const block of blocks) {
    if (block.kind === 'heading') {
      while (trail.length > 0 && trail[trail.length - 1]!.level >= block.level) {
        trail.pop()
      }
      const title = plainifyInline(block.markdown)
      sections.push({
        path: trail.map((t) => t.title),
        anchor: block.id,
        title,
        text: '',
      })
      trail.push({ level: block.level, title })
      continue
    }
    walkText(block)
  }

  return sections.filter((s) => s.title || s.text)
}
