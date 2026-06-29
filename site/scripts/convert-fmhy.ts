/**
 * Converts the tracked fmhy/edit wiki docs (../docs/*.md) into takeout-static
 * blog posts (data/blog/*.mdx). The page list + titles/descriptions come from
 * fmhy's own headers map, so adding/renaming a page upstream flows through on
 * the next `git pull` + re-run. Run: bun scripts/convert-fmhy.ts
 */
import { execSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const SITE = join(import.meta.dir, '..')
const ROOT = join(SITE, '..') // the fmhy/edit clone
const DOCS = join(ROOT, 'docs')
const OUT = join(SITE, 'data', 'blog')
const CONSTANTS = join(DOCS, '.vitepress', 'transformer', 'constants.ts')

// fmhy injects page title/description at build from this map — it's also the
// canonical list of which docs are real wiki pages (excludes index/feedback/etc).
const src = readFileSync(CONSTANTS, 'utf8')
const headers: Record<string, { title: string; description: string }> = {}
const re =
  /'([\w-]+\.md)':\s*\{\s*title:\s*'((?:[^'\\]|\\.)*)',\s*description:\s*'((?:[^'\\]|\\.)*)'/g
let m: RegExpExecArray | null
while ((m = re.exec(src))) {
  headers[m[1]] = {
    title: m[2].replace(/\\'/g, "'"),
    description: m[3].replace(/\\'/g, "'"),
  }
}

// content snapshot date (depth-1 clone → HEAD commit date)
let date = '2026-06-29'
try {
  date = execSync('git log -1 --format=%cs', { cwd: ROOT }).toString().trim() || date
} catch {}

// MDX is JSX-strict: bare `<`, `{`, `}` break the parse. Escape them outside
// fenced code (where MDX leaves content alone).
function sanitize(md: string): string {
  let fence = false
  return md
    .split('\n')
    .map((line) => {
      if (/^\s*(```|~~~)/.test(line)) {
        fence = !fence
        return line
      }
      if (fence) return line
      return line.replace(/</g, '&lt;').replace(/\{/g, '&#123;').replace(/\}/g, '&#125;')
    })
    .join('\n')
}

// fresh slate: drop any prior generated/demo posts
for (const f of readdirSync(OUT)) if (f.endsWith('.mdx')) rmSync(join(OUT, f))

let n = 0
for (const [file, meta] of Object.entries(headers)) {
  const path = join(DOCS, file)
  if (!existsSync(path)) {
    console.warn('skip (missing upstream):', file)
    continue
  }
  const slug = file.replace(/\.md$/, '')
  const body = sanitize(readFileSync(path, 'utf8').trim())
  const frontmatter = [
    '---',
    `title: ${JSON.stringify(meta.title)}`,
    `publishedAt: '${date}'`,
    `description: ${JSON.stringify(meta.description)}`,
    'draft: false',
    '---',
    '',
    '',
  ].join('\n')
  writeFileSync(join(OUT, `${slug}.mdx`), frontmatter + body + '\n')
  n++
}

console.info(`✓ converted ${n} fmhy pages → data/blog/*.mdx (content @ ${date})`)
