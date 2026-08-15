// recently-removed page generation — port of fmhy/edit scripts/generate-removed.js
// (Apache-2.0, Copyright (c) taskylizard — see scripts/wiki/generate.ts NOTICE).
// scans the last 30 days of docs/ history of the .fmhy-edit clone
// and emits the same markdown body the real site deploys at /recently-removed.

import { execFileSync } from 'node:child_process'
import crypto from 'node:crypto'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const DAYS = 30

const IGNORED_FILES = [
  'docs/posts.md',
  'docs/unsafe.md',
  'docs/sandbox.md',
  'docs/feedback.md',
  'docs/index.md',
  'docs/startpage.md',
  'docs/recently-removed.md',
]

const IGNORED_DIRS = ['docs/posts/', 'docs/.vitepress/']

function isIgnored(file: string): boolean {
  return (
    !file ||
    IGNORED_FILES.includes(file) ||
    IGNORED_DIRS.some((dir) => file.startsWith(dir))
  )
}

// repo-relative doc paths ('docs/...') for the "url still exists" check
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

export type RemovedResult = {
  // markdown body (intro + alert + list), no page-title heading
  markdown: string
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

export function generateRemovedMarkdown(root: string): RemovedResult {
  const git = (...args: string[]): string =>
    execFileSync('git', ['-C', root, ...args], {
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
    })

  // root is the .fmhy-edit clone of fmhy/edit — its history carries the
  // removals. sync-fmhy.ts keeps ~31 days around; deepen if we're short.
  let logOutput = ''
  try {
    if (existsSync(join(root, '.git', 'shallow'))) {
      try {
        git('fetch', '--quiet', `--shallow-since=${DAYS + 1} days ago`, 'origin', 'main')
      } catch {
        // offline / already deep enough — the log below decides what we have
      }
    }
    logOutput = git(
      'log',
      `--since=${DAYS} days ago`,
      '--pretty=format:---COMMIT---%H---MSG---%s',
      '-p',
      '--unified=0',
      'HEAD',
      '--',
      'docs/',
    )
  } catch {
    return {
      markdown: `${INTRO}\nThis list is regenerated at every deploy. Removal history was unavailable when this mirror was built.\n`,
      entryCount: 0,
      fromHistory: false,
    }
  }

  const commits = logOutput.split('---COMMIT---').filter(Boolean)

  type Removed = {
    text: string
    urls: string[]
    file: string
    lineNum: number
    hash: string
    msg: string
    pr: string | null
  }
  const removedSites: Removed[] = []

  // current state of all valid wiki docs — a url present anywhere here was
  // moved, not removed
  const allCurrentDocs = getAllDocFiles(root, 'docs')
    .map((file) => readFileSync(join(root, file), 'utf8'))
    .join('\n')

  for (const commit of commits) {
    const lines = commit.split('\n')
    const header = lines[0]!
    const [hash = '', ...msgParts] = header.split('---MSG---')
    const msg = msgParts.join('---MSG---')

    let currentFile = ''
    let currentLineNum = 0
    const deletions: { text: string; file: string; lineNum: number }[] = []
    const additions: string[] = []

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]!
      if (line.startsWith('diff --git')) {
        currentFile = line.split(' b/')[1] ?? ''
        currentLineNum = 0
        continue
      }
      if (isIgnored(currentFile)) continue
      if (line.startsWith('@@ ')) {
        const match = line.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/)
        if (match) currentLineNum = Number.parseInt(match[1]!, 10)
        continue
      }
      if (line.startsWith('-')) {
        if (line.includes('](')) {
          deletions.push({
            text: line.substring(1),
            file: currentFile,
            lineNum: currentLineNum,
          })
        }
        currentLineNum++
      } else if (line.startsWith('+')) {
        if (line.includes('](')) additions.push(line.substring(1))
      } else if (line.startsWith(' ')) {
        currentLineNum++
      }
    }

    for (const del of deletions) {
      const urls = [...del.text.matchAll(/\[.*?\]\((.*?)\)/g)].map((m) => m[1]!)
      const names = [...del.text.matchAll(/\[(.*?)\]/g)].map((m) => m[1]!)
      if (urls.length === 0) continue

      const isStillPresent =
        urls.some(
          (url) =>
            additions.some((add) => add.includes(url)) || allCurrentDocs.includes(url),
        ) ||
        names.some(
          (name) =>
            name.length > 3 && additions.some((add) => add.includes(`[${name}]`)),
        )
      if (isStillPresent) continue

      const prMatch = msg.match(/\(#(\d+)\)/) || msg.match(/Merge pull request #(\d+)/)
      const pr = prMatch ? prMatch[1]! : null

      let cleanText = del.text.trim()
      cleanText = cleanText.replace(/^\*+\s*/, '')
      cleanText = cleanText.replace(/^⭐\s*/, '')

      let cleanMsg = msg.trim()
      cleanMsg = cleanMsg.replace(/:?\s*updated \d+ pages/i, '').trim()

      removedSites.push({
        text: cleanText,
        urls,
        file: del.file,
        lineNum: del.lineNum,
        hash,
        msg: cleanMsg,
        pr,
      })
    }
  }

  // deduplicate by first url (keep most recent — log is newest-first)
  const uniqueRemoved = new Map<string, Removed>()
  for (const site of removedSites) {
    const firstUrl = site.urls[0]!
    if (!uniqueRemoved.has(firstUrl)) uniqueRemoved.set(firstUrl, site)
  }
  const sortedRemoved = [...uniqueRemoved.values()]

  let markdown = INTRO
  if (sortedRemoved.length === 0) {
    markdown += `\nNo sites were removed in the last ${DAYS} days.\n`
  } else {
    markdown += '\n'
    for (const site of sortedRemoved) {
      const fileHash = crypto.createHash('sha256').update(site.file).digest('hex')
      const lineAnchor = site.lineNum ? `L${site.lineNum}` : ''
      const commitLink = `https://github.com/fmhy/edit/commit/${site.hash}#diff-${fileHash}${lineAnchor}`
      const prLink = site.pr
        ? `, [PR #${site.pr}](https://github.com/fmhy/edit/pull/${site.pr})`
        : ''

      const linkMatch = site.text.match(/^(.*\[.*?\]\(.*?\)(?:\*\*)?)(.*)/)
      let searchablePart = site.text
      let hiddenPart = ''
      if (linkMatch) {
        searchablePart = linkMatch[1]!
        hiddenPart = linkMatch[2]!
      }

      const stripLinks = (t: string) =>
        t
          .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
          .replace(/https?:\/\/[^\s)]+/g, '')
          .replace(/\s+/g, ' ')

      const cleanSearchable = stripLinks(searchablePart).trim()
      let cleanHidden = stripLinks(hiddenPart)
      if (hiddenPart.trim().startsWith('-') && !cleanHidden.trim().startsWith('-')) {
        cleanHidden = ` - ${cleanHidden.trim()}`
      }
      const cleanMsg = site.msg ? `: ${stripLinks(site.msg).trim()}` : ''

      markdown += `- ${cleanSearchable} <!-- search-exclude -->${cleanHidden} (Removed in [\`${site.hash.slice(0, 7)}\`](${commitLink})${prLink}${cleanMsg})<!-- /search-exclude -->\n`
    }
  }

  return { markdown, entryCount: sortedRemoved.length, fromHistory: true }
}
