// recently-removed page generation — port of fmhy/edit scripts/generate-removed.js
// (Apache-2.0, Copyright (c) taskylizard — see scripts/wiki/generate.ts NOTICE;
// tracks the markdown-parsing rewrite from fmhy/edit#6617). Modified: reads
// the .fmhy-edit clone's history without fetching (sync-fmhy.ts owns its
// depth), drops the on-disk history cache, and returns structured groups for
// the app alongside the exact markdown body upstream deploys at
// /recently-removed (kept byte-comparable for parity checks).
//
// Detection walks the last 30 days of first-parent docs/ commits, parses the
// before/after blob of every changed page with markdown-it configured like
// vitepress's createMarkdownRenderer, and reports a resource as removed when
// its URL left the page, was not added anywhere in the same commit, is not on
// any current page, and was not merely renamed (same name, new URL).

import { execFileSync } from 'node:child_process'
import crypto from 'node:crypto'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import MarkdownIt from 'markdown-it'

import { Slugger } from './parse'
import { parseProse } from './prose'

import type { WikiProseBlock, WikiRemovedSite } from '../../src/features/wiki/types'
import type { StateCore, Token } from 'markdown-it'

const DAYS = 30
const OUTPUT_FILE = 'docs/recently-removed.md'

const IGNORED_FILES = [
  'docs/posts.md',
  'docs/unsafe.md',
  'docs/sandbox.md',
  'docs/feedback.md',
  'docs/index.md',
  'docs/startpage.md',
  'docs/single-page.md',
  'docs/public/single-page.md',
  OUTPUT_FILE,
]

const IGNORED_DIRS = ['docs/posts/', 'docs/.vitepress/']

function isIgnored(file: string): boolean {
  return (
    !file ||
    !file.endsWith('.md') ||
    IGNORED_FILES.includes(file) ||
    IGNORED_DIRS.some((dir) => file.startsWith(dir))
  )
}

// repo-relative doc paths ('docs/...')
function getAllDocFiles(root: string, dir: string): string[] {
  const results: string[] = []
  for (const entry of readdirSync(join(root, dir), { withFileTypes: true })) {
    const child = `${dir}/${entry.name}`
    if (entry.isDirectory()) {
      if (IGNORED_DIRS.some((d) => `${child}/`.startsWith(d))) continue
      results.push(...getAllDocFiles(root, child))
    } else if (entry.name.endsWith('.md') && !isIgnored(child)) {
      results.push(child)
    }
  }
  return results
}

function normalizeName(name: string): string {
  return name
    .replace(/[⁠​‌‍﻿]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function normalizeUrl(value: string): string {
  try {
    const url = new URL(value)
    if (url.pathname !== '/') url.pathname = url.pathname.replace(/\/+$/, '') || '/'
    return url.href
  } catch {
    return value
  }
}

// bare URLs in text tokens (linkify misses some, e.g. inside emphasis runs)
function extractUrls(text: string): Set<string> {
  const urls = new Set<string>()
  for (const match of text.matchAll(/https?:\/\/[^\s<>"`]+/g)) {
    let url = match[0]
    const angleWrapped =
      text[match.index - 1] === '<' && text[match.index + url.length] === '>'
    if (!angleWrapped) {
      let parentheses = [...url].reduce(
        (balance, char) => balance + (char === '(' ? 1 : char === ')' ? -1 : 0),
        0
      )
      while (/[),.;]$/.test(url)) {
        if (url.endsWith(')')) {
          if (parentheses >= 0) break
          parentheses++
        }
        url = url.slice(0, -1)
      }
    }
    urls.add(normalizeUrl(url))
  }
  return urls
}

type InlineLink = { name: string; url: string; index: number; end: number }
type Resource = InlineLink

function resourceKey(link: { name: string; url: string }): string {
  return `${normalizeName(link.name)}\0${link.url}`
}

// which links of a bullet are listed resources (vs supporting links such as
// "/ GitHub"), plus the shared description
function extractResources(
  text: string,
  links: InlineLink[],
  knownResources: Set<string> = new Set()
): { resources: Resource[]; description: string } {
  if (!/^\s*[*+-]\s+/.test(text) || /^\s*[*+-]\s+↪/.test(text)) {
    return { resources: [], description: '' }
  }
  if (!links.length) return { resources: [], description: '' }

  // The description separator must be outside a link's label or destination.
  let descriptionIndex = text.length
  let end = 0
  for (const link of [...links, { index: text.length, end: text.length }]) {
    const separator = text.slice(end, link.index).match(/\s+[-–—]\s+/)
    if (separator) {
      descriptionIndex = end + separator.index!
      break
    }
    end = link.end
  }

  const resources = links.filter((link, index) => {
    if (
      link.index >= descriptionIndex ||
      !normalizeName(link.name) ||
      /^https?:\/\/\S+$/i.test(normalizeName(link.name))
    )
      return false
    if (index === 0 || knownResources.has(resourceKey(link))) return true
    if (/^\d+$/.test(normalizeName(link.name))) return false

    const previous = links[index - 1]!
    const separator = text.slice(previous.end, link.index)
    // Slashes usually introduce supporting links, except between bold peers.
    const boldPeers =
      text.slice(previous.index - 2, previous.index) === '**' &&
      /^\*\*\s+\/\s+\*\*$/.test(separator) &&
      text.slice(link.end, link.end + 2) === '**'
    return (
      boldPeers ||
      /^[\s*_]+$/.test(separator) ||
      /^[\s*_]*(?:\([^)]*\)\s*)?(?:,\s*(?:or\s+)?|or\s+)[\s*_]*$/.test(separator)
    )
  })
  let description = text.slice(descriptionIndex).trim()
  if (descriptionIndex === text.length) {
    // Keep metadata between links as well as after the last link, while
    // excluding peer names and their separators from the shared description.
    const peers = new Set(resources.map((link) => link.index))
    let end = links[0]!.end
    for (const link of links.slice(1)) {
      const gap = text.slice(end, link.index)
      if (!peers.has(link.index) || !/^[\s*_,/]*(?:or)?[\s*_]*$/.test(gap)) {
        description += gap.replace(/\*\*/g, '')
      }
      if (!peers.has(link.index)) description += link.name
      end = link.end
    }
    description += text.slice(end).replace(/^\*+/, '')
    description = description.trim()
  }
  return { resources, description }
}

// ---------------------------------------------------------------------------
// markdown-it, configured like vitepress's createMarkdownRenderer as far as
// the tokens this generator reads are concerned: html + linkify (no fuzzy
// links) and restoreEntities' text_join. The render-only plugins (anchors,
// containers, highlighting, sfc/frontmatter render hooks) don't touch them.
// ---------------------------------------------------------------------------

// vitepress restoreEntities (MIT, Copyright (c) 2019-present Evan You & VitePress
// contributors): joined text keeps entities in their source spelling
function textJoin(state: StateCore) {
  const getContent = (token: Token) =>
    token.info === 'entity'
      ? token.markup
      : token.info === 'escape' && token.content === '&'
        ? '&amp;'
        : token.content
  for (const blockToken of state.tokens) {
    if (blockToken.type !== 'inline') continue
    const tokens = blockToken.children || []
    const max = tokens.length
    let curr: number
    let last: number
    for (curr = 0; curr < max; ++curr) {
      if (tokens[curr]!.type === 'text_special') tokens[curr]!.type = 'text'
    }
    for (curr = last = 0; curr < max; ++curr) {
      if (
        tokens[curr]!.type === 'text' &&
        curr + 1 < max &&
        tokens[curr + 1]!.type === 'text'
      ) {
        tokens[curr + 1]!.content =
          getContent(tokens[curr]!) + getContent(tokens[curr + 1]!)
        tokens[curr + 1]!.info = ''
        tokens[curr + 1]!.markup = ''
      } else {
        if (curr !== last) tokens[last] = tokens[curr]!
        ++last
      }
    }
    if (curr !== last) tokens.length = last
  }
}

// identical inline sources recur across every historical blob of a page —
// reuse their parsed children (upstream cacheInlineTokens)
function cacheInlineTokens(markdown: MarkdownIt) {
  const cache = new Map<string, Token[]>()
  const keys = new WeakMap<Token, string>()
  markdown.core.ruler.before('inline', 'reuse_removed_inlines', (state) => {
    const references = JSON.stringify(state.env.references || {})
    for (const token of state.tokens) {
      if (token.type !== 'inline') continue
      const key = `${references}\0${token.content}`
      keys.set(token, key)
      const cached = cache.get(key)
      if (cached) {
        token.type = 'removed_cached_inline'
        token.children = cached
      }
    }
  })
  markdown.core.ruler.push('save_removed_inlines', (state) => {
    for (const token of state.tokens) {
      if (token.type === 'removed_cached_inline') token.type = 'inline'
      else {
        const key = keys.get(token)
        if (key === undefined) continue
        if (cache.size >= 50000) cache.clear()
        cache.set(key, token.children ?? [])
      }
    }
  })
}

function createMarkdown(): MarkdownIt {
  const markdown = MarkdownIt({ html: true, linkify: true })
  markdown.linkify.set({ fuzzyLink: false })
  markdown.core.ruler.at('text_join', textJoin)
  cacheInlineTokens(markdown)
  return markdown
}

function extractHtmlUrls(markdown: MarkdownIt, html: string): Set<string> {
  const urls = new Set<string>()
  const visible = html.replace(/<!--[\s\S]*?-->/g, '')
  for (const match of visible.matchAll(
    /<a\b[^>]*\bhref\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/gi
  )) {
    const value = markdown.utils.unescapeAll(match[1] ?? match[2] ?? match[3]!)
    if (/^https?:\/\//i.test(value)) urls.add(normalizeUrl(value))
  }
  return urls
}

type ParsedInline = { text: string; links: InlineLink[]; urls: Set<string> }
const parsedInlines = new WeakMap<Token[], ParsedInline>()

// flattens an inline token stream to '* '-prefixed text (keeping ** / _
// markers outside links) with link offsets into that text
function parseInlineLinks(markdown: MarkdownIt, children: Token[]): ParsedInline {
  const cached = parsedInlines.get(children)
  if (cached) return cached
  const urls = new Set<string>()
  let text = '* '
  const links: InlineLink[] = []
  let link: InlineLink | null = null
  for (const child of children) {
    if (child.type === 'link_open') {
      link = { name: '', url: child.attrGet('href') ?? '', index: text.length, end: 0 }
    } else if (child.type === 'link_close') {
      if (link && /^https?:\/\//i.test(link.url)) {
        link.url = normalizeUrl(link.url)
        link.end = text.length
        links.push(link)
        urls.add(link.url)
      }
      link = null
    } else if (child.type === 'text' || child.type === 'code_inline') {
      text += child.content
      if (link) link.name += child.content
      else if (child.type === 'text') {
        for (const url of extractUrls(child.content)) urls.add(url)
      }
    } else if (child.type === 'image') {
      if (link) {
        const alt = child.children
          ? child.children
              .filter((token) => token.type === 'text' || token.type === 'code_inline')
              .map((token) => token.content)
              .join('')
          : child.content || child.attrGet('alt') || ''
        text += alt
        link.name += alt
      }
    } else if (child.type === 'html_inline') {
      for (const url of extractHtmlUrls(markdown, child.content)) urls.add(url)
    } else if (child.type === 'softbreak' || child.type === 'hardbreak') {
      text += ' '
      if (link) link.name += ' '
    } else if (!link && /^(strong|em)_(open|close)$/.test(child.type)) {
      text += child.type.startsWith('strong') ? '**' : '_'
    }
  }
  const result = { text, links, urls }
  parsedInlines.set(children, result)
  return result
}

type Bullet = {
  text: string
  links: InlineLink[]
  // heading trail (h1 = page title on wiki pages is absent, so [0] is the h2)
  section: string[]
  lineNum: number
}
type ParsedDocument = { urls: Set<string>; bullets: Bullet[] }

function parseDocument(markdown: MarkdownIt, source: string): ParsedDocument {
  const urls = new Set<string>()
  const bullets: Bullet[] = []
  const headings: string[] = []
  const lines = source.split('\n')
  const tokens = markdown.parse(source, {})
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index]!
    if (token.type === 'heading_open') {
      const heading = tokens[index + 1]
      const level = Number(token.tag.slice(1))
      const title = (heading?.children || [])
        .filter((child) => ['text', 'code_inline', 'image'].includes(child.type))
        .map((child) => child.content)
        .join('')
        .replace(/^[►▷\s]+/, '')
        .replace(/\s+/g, ' ')
        .trim()
      headings[level - 1] = title
      headings.length = level
    }
    if (token.type === 'html_block') {
      for (const url of extractHtmlUrls(markdown, token.content)) urls.add(url)
    }
    if (token.type !== 'inline') continue
    const {
      text,
      links,
      urls: inlineUrls,
    } = parseInlineLinks(markdown, token.children ?? [])
    for (const url of inlineUrls) urls.add(url)
    const [start] = token.map ?? [0]
    if (/^\s*[*+-]\s+/.test(lines[start!] ?? '')) {
      bullets.push({
        text,
        links,
        section: headings.filter(Boolean),
        lineNum: start! + 1,
      })
    }
  }
  return { urls, bullets }
}

// ---------------------------------------------------------------------------
// generation
// ---------------------------------------------------------------------------

type RemovedEntry = {
  name: string
  description: string
  url: string
  file: string
  section: string[]
  lineNum: number
  hash: string
  date: string
  pr: string | null
}

export type RemovedResult = {
  // upstream's docs/recently-removed.md body (intro + grouped list), no page header
  markdown: string
  // page body for the app: intro, h2 page / h3 section / h4 subsection
  // headings and one `removed` list per subsection
  blocks: WikiProseBlock[]
  // the same body as fmhy.net's search index sees it: search-exclude spans
  // (intro, descriptions, commit meta) dropped, site names as list items
  searchBlocks: WikiProseBlock[]
  entryCount: number
  // false when git history was unavailable and the fallback body was emitted
  fromHistory: boolean
}

const INTRO = [
  '<!-- search-exclude -->',
  `This page lists sites that were removed from the wiki in the last ${DAYS} days. This helps you find sites that may have gone down or were moved.`,
  '',
  '> [!TIP]',
  '> For more information about why a site was removed, feel free to join our [Discord](https://github.com/fmhy/FMHY/wiki/FMHY-Discord).',
  '<!-- /search-exclude -->',
  '',
].join('\n')

const stripLinks = (text: string) =>
  text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/https?:\/\/[^\s)]+/g, '')
    .replace(/\s+/g, ' ')

const escapeText = (text: string) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/[\\`*_[\]]/g, '\\$&')

function readHeaders(root: string): Record<string, { title?: string }> {
  const file = join(root, 'docs', '.vitepress', 'transformer', 'headers.json')
  if (!existsSync(file)) return {}
  return JSON.parse(readFileSync(file, 'utf8')) as Record<string, { title?: string }>
}

export function generateRemoved(root: string): RemovedResult {
  const git = (args: string[]): string =>
    execFileSync('git', args, {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    })

  const fallback = (reason: string): RemovedResult => {
    console.warn(`recently-removed: ${reason}`)
    const blocks = parseProse(
      `${INTRO}\nThis list is regenerated at every deploy. Removal history was unavailable when this mirror was built.\n`
    ).blocks
    return {
      markdown: INTRO,
      blocks,
      searchBlocks: [],
      entryCount: 0,
      fromHistory: false,
    }
  }

  // root is the .fmhy-edit clone of fmhy/edit — sync-fmhy.ts keeps 31 days of
  // history. Upstream deepens past shallow roots that land inside the window
  // (their parents are hidden, so those commits would diff as all-added);
  // we only read the clone, so flag it instead.
  let logOutput: string
  try {
    if (git(['rev-parse', '--is-shallow-repository']).trim() === 'true') {
      const roots = git([
        'rev-list',
        '--first-parent',
        '--max-parents=0',
        `--since=${DAYS} days ago`,
        'HEAD',
      ])
        .split('\n')
        .filter(Boolean)
      const truncated = roots.filter((rootCommit) =>
        /^parent [a-f0-9]+$/m.test(git(['cat-file', '-p', rootCommit]).split('\n\n')[0]!)
      )
      if (truncated.length > 0) {
        console.warn(
          `recently-removed: shallow history ends inside the ${DAYS}-day window at ` +
            `${truncated.map((c) => c.slice(0, 7)).join(', ')} — re-run sync-fmhy.ts for a deeper clone`
        )
      }
    }
    logOutput = git([
      'log',
      '-z',
      '--first-parent',
      `--since=${DAYS} days ago`,
      '--format=%H%x00%P%x00%s%x00%ct',
      'HEAD',
      '--',
      'docs/',
    ])
  } catch {
    return fallback('git history unavailable')
  }

  const headers = readHeaders(root)
  const categoryForFile = (file: string): string => {
    const name = file.replace(/^docs\//, '')
    return (
      headers[name]?.title ||
      name
        .replace(/\.md$/, '')
        .split('/')
        .map((part) =>
          part
            .split('-')
            .map((word) => word[0]!.toUpperCase() + word.slice(1))
            .join(' ')
        )
        .join(' / ')
    )
  }

  const markdown = createMarkdown()
  const currentUrls = new Set<string>()
  const knownResources = new Set<string>()
  const parsedBlobs = new Map<string, ParsedDocument>()
  const emptyDocument: ParsedDocument = { urls: new Set(), bullets: [] }

  const rememberResources = (document: ParsedDocument): ParsedDocument => {
    for (const bullet of document.bullets) {
      for (const resource of extractResources(bullet.text, bullet.links).resources) {
        knownResources.add(resourceKey(resource))
      }
    }
    return document
  }

  for (const file of getAllDocFiles(root, 'docs')) {
    const document = rememberResources(
      parseDocument(markdown, readFileSync(join(root, file), 'utf8'))
    )
    for (const url of document.urls) currentUrls.add(url)
  }

  const readDocument = (blob: string, file: string): ParsedDocument => {
    if (!blob || /^0+$/.test(blob) || isIgnored(file)) return emptyDocument
    let document = parsedBlobs.get(blob)
    if (!document) {
      if (parsedBlobs.size >= 128) parsedBlobs.clear()
      document = rememberResources(
        parseDocument(markdown, git(['cat-file', 'blob', blob]))
      )
      parsedBlobs.set(blob, document)
    }
    return document
  }

  type Change = {
    file: string
    removedUrls: Set<string>
    addedUrls: Set<string>
    removedBullets: Bullet[]
    addedBullets: Bullet[]
  }
  const commits: { hash: string; msg: string; date: string; changes: Change[] }[] = []
  const fields = logOutput.split('\0')
  for (let index = 0; index + 3 < fields.length; index += 4) {
    const hash = fields[index]!.trim()
    const parent = fields[index + 1]!.split(' ')[0]
    const msg = fields[index + 2]!
    const date = new Date(Number(fields[index + 3]) * 1000).toISOString().slice(0, 10)
    if (!hash) continue
    const diff = git([
      'diff-tree',
      '--no-commit-id',
      '--raw',
      '-z',
      '-r',
      '--root',
      '--no-renames',
      '--no-abbrev',
      '--no-ext-diff',
      '--no-textconv',
      ...(parent ? [parent, hash] : [hash]),
      '--',
      'docs/',
    ])
    const changes: Change[] = []
    const records = diff.split('\0')
    for (let offset = 0; offset + 1 < records.length; offset += 2) {
      const match = records[offset]!.match(
        /^:[0-7]{6} [0-7]{6} ([a-f0-9]+) ([a-f0-9]+) [A-Z]$/
      )
      if (!match) throw new Error(`Unexpected Git diff record: ${records[offset]}`)
      const file = records[offset + 1]!
      if (isIgnored(file)) continue
      const before = readDocument(match[1]!, file)
      const after = readDocument(match[2]!, file)
      const removedUrls = new Set([...before.urls].filter((url) => !after.urls.has(url)))
      const addedUrls = new Set([...after.urls].filter((url) => !before.urls.has(url)))
      changes.push({
        file,
        removedUrls,
        addedUrls,
        removedBullets: before.bullets.filter((bullet) =>
          bullet.links.some((link) => removedUrls.has(link.url))
        ),
        addedBullets: after.bullets.filter((bullet) =>
          bullet.links.some((link) => addedUrls.has(link.url))
        ),
      })
    }
    commits.push({ hash, msg, date, changes })
  }

  // Historical primary occurrences can establish ambiguous grouped peers.
  const removedSites: RemovedEntry[] = []
  type Found = Resource & {
    description: string
    file?: string
    section?: string[]
    lineNum?: number
  }
  for (const { hash, msg, date, changes } of commits) {
    const addedUrls = new Set(changes.flatMap((change) => [...change.addedUrls]))
    const removed: (Found & { file: string; section: string[]; lineNum: number })[] = []
    const added: Found[] = []
    for (const change of changes) {
      for (const bullet of change.removedBullets) {
        const { resources, description } = extractResources(
          bullet.text,
          bullet.links,
          knownResources
        )
        for (const resource of resources) {
          if (change.removedUrls.has(resource.url))
            removed.push({
              ...resource,
              description,
              file: change.file,
              section: bullet.section,
              lineNum: bullet.lineNum,
            })
        }
      }
      for (const bullet of change.addedBullets) {
        const { resources, description } = extractResources(
          bullet.text,
          bullet.links,
          knownResources
        )
        for (const resource of resources) {
          if (change.addedUrls.has(resource.url)) added.push({ ...resource, description })
        }
      }
    }

    const oldByName = new Map<string, Map<string, Found>>()
    const newByName = new Map<string, Map<string, Found>>()
    for (const item of removed) {
      if (addedUrls.has(item.url) || currentUrls.has(item.url)) continue
      const name = normalizeName(item.name)
      if (!oldByName.has(name)) oldByName.set(name, new Map())
      oldByName.get(name)!.set(resourceKey(item), item)
    }
    for (const item of added) {
      const name = normalizeName(item.name)
      if (!newByName.has(name)) newByName.set(name, new Map())
      newByName.get(name)!.set(resourceKey(item), item)
    }
    const updated = new Set<string>()
    for (const [name, oldItems] of oldByName) {
      const newItems = newByName.get(name)
      if (!newItems) continue
      const usedNew = new Set<string>()
      const oldValues = [...oldItems.values()]
      const newValues = [...newItems.values()]
      // Distinct descriptions can identify several URL changes with one name.
      for (const oldItem of oldValues) {
        const oldDescription = normalizeName(oldItem.description)
        const oldPeers = oldValues.filter(
          (item) => normalizeName(item.description) === oldDescription
        )
        const newPeers = newValues.filter(
          (item) => normalizeName(item.description) === oldDescription
        )
        if (oldPeers.length !== 1 || newPeers.length !== 1) continue
        updated.add(resourceKey(oldItem))
        usedNew.add(resourceKey(newPeers[0]!))
      }
      const remainingOld = oldValues.filter((item) => !updated.has(resourceKey(item)))
      const remainingNew = newValues.filter((item) => !usedNew.has(resourceKey(item)))
      if (remainingOld.length !== 1 || remainingNew.length !== 1) continue
      const oldItem = remainingOld[0]!
      const newItem = remainingNew[0]!
      const oldDescription = normalizeName(oldItem.description)
      const newDescription = normalizeName(newItem.description)
      const sharedPrefix =
        oldDescription &&
        newDescription &&
        [',', ' /', ' -'].some(
          (separator) =>
            oldDescription.startsWith(newDescription + separator) ||
            newDescription.startsWith(oldDescription + separator)
        )
      if (
        sharedPrefix ||
        (oldItem.file === newItem.file && oldItem.lineNum === newItem.lineNum)
      )
        updated.add(resourceKey(oldItem))
    }
    for (const item of removed) {
      if (
        updated.has(resourceKey(item)) ||
        addedUrls.has(item.url) ||
        currentUrls.has(item.url)
      )
        continue
      const prMatch = msg.match(/\(#(\d+)\)/) || msg.match(/Merge pull request #(\d+)/)
      removedSites.push({
        name: item.name,
        description: item.description,
        url: item.url,
        file: item.file,
        section: item.section,
        lineNum: item.lineNum,
        hash,
        date,
        pr: prMatch ? prMatch[1]! : null,
      })
    }
  }

  // Deduplicate by resource URL (keep most recent — the log is newest-first)
  const uniqueRemoved = new Map<string, RemovedEntry>()
  for (const site of removedSites) {
    if (!uniqueRemoved.has(site.url)) uniqueRemoved.set(site.url, site)
  }

  const sortedRemoved = [...uniqueRemoved.values()].sort((a, b) =>
    b.date.localeCompare(a.date)
  )
  // page title → section (h2 of the source page) → subsection trail
  const byPage = new Map<string, Map<string, Map<string, RemovedEntry[]>>>()
  for (const site of sortedRemoved) {
    const page = categoryForFile(site.file)
    if (!byPage.has(page)) byPage.set(page, new Map())
    const sections = byPage.get(page)!
    const major = site.section[0] || 'Unsectioned'
    const minor = site.section.slice(1).join(' › ')
    if (!sections.has(major)) sections.set(major, new Map())
    const subsections = sections.get(major)!
    if (!subsections.has(minor)) subsections.set(minor, [])
    subsections.get(minor)!.push(site)
  }
  const byTitle = <T>(entries: Map<string, T>) =>
    [...entries].sort(([a], [b]) => a.localeCompare(b))

  const toSite = (site: RemovedEntry): WikiRemovedSite => {
    const fileHash = crypto.createHash('sha256').update(site.file).digest('hex')
    const lineAnchor = site.lineNum ? `L${site.lineNum}` : ''
    return {
      name: stripLinks(site.name).trim(),
      description:
        stripLinks(site.description || '')
          .trim()
          .replace(/^[-–—]\s*/, '') || null,
      date: site.date,
      pr: site.pr,
      hash: site.hash.slice(0, 7),
      commitUrl: `https://github.com/fmhy/edit/commit/${site.hash}#diff-${fileHash}${lineAnchor}`,
    }
  }

  // Generate Markdown (upstream's exact output) and the app's block model
  let output = `${INTRO}\n`
  const intro = parseProse(INTRO).blocks
  const blocks: WikiProseBlock[] = [...intro]
  const searchBlocks: WikiProseBlock[] = []
  const slugger = new Slugger()
  const heading = (level: 2 | 3 | 4, title: string) => {
    // vitepress slugs the heading's text tokens, where restoreEntities keeps
    // escapeText's &amp; / &lt; / &gt; spelled out ("…-amp-modifiers")
    const id = slugger.slug(
      title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    )
    const block: WikiProseBlock = { kind: 'heading', level, id, markdown: title }
    blocks.push(block)
    searchBlocks.push(block)
  }

  if (sortedRemoved.length === 0) {
    output += `No sites were removed in the last ${DAYS} days.\n`
    blocks.push({
      kind: 'paragraph',
      markdown: `No sites were removed in the last ${DAYS} days.`,
    })
  } else {
    for (const [page, sections] of byTitle(byPage)) {
      output += `## ${escapeText(page)}\n\n`
      heading(2, page)
      for (const [section, subsections] of byTitle(sections)) {
        output += `### ${escapeText(section)}\n\n`
        heading(3, section)
        for (const [subsection, entries] of byTitle(subsections)) {
          if (subsection) {
            output += `#### ${escapeText(subsection)}\n\n`
            heading(4, subsection)
          }
          const sites = entries.map(toSite)
          for (const site of sites) {
            const prLink = site.pr
              ? `[PR #${site.pr}](https://github.com/fmhy/edit/pull/${site.pr}) · `
              : ''
            const cleanHidden = site.description
              ? `<span class="removed-site-description">- ${escapeText(site.description)}</span>`
              : ''
            output += `- <button type="button" class="removed-site-name" v-tooltip="{ content: () => $removedDateTooltip('${site.date}'), html: true, triggers: $removedDateTriggers, autoHide: true }">${escapeText(site.name)}</button><!-- search-exclude -->${cleanHidden}<span class="removed-site-meta">· ${prLink}[${site.hash}](${site.commitUrl})</span><!-- /search-exclude -->\n`
          }
          output += '\n'
          blocks.push({ kind: 'removed', sites })
          searchBlocks.push({
            kind: 'list',
            ordered: false,
            items: sites.map((site) => ({ markdown: site.name, children: [] })),
          })
        }
      }
    }
  }

  return {
    markdown: output,
    blocks,
    searchBlocks,
    entryCount: sortedRemoved.length,
    fromHistory: true,
  }
}
