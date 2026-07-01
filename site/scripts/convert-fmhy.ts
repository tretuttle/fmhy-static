/**
 * Generates one static +ssg route per wiki page produced by scripts/wiki/generate.ts.
 * Each route statically loads its page JSON and renders WikiCategoryContent — matching
 * fmhy-app's structured rendering (no MDX runtime). EAS Hosting serves One as static,
 * and the dynamic [slug] route's client loader builds a malformed chunk path that 404s
 * on hydration, so we emit param-free routes instead.
 *
 * Run AFTER scripts/wiki/generate.ts (sync-fmhy does both). Run: bun scripts/convert-fmhy.ts
 */
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join } from 'node:path'

import { profileFor } from './wiki/constants'
import { parsePage } from './wiki/parse'

const SITE = join(import.meta.dir, '..')
const ROOT = join(SITE, '..')
const PAGES = join(SITE, 'src', 'features', 'wiki', 'generated', 'pages')
const APP = join(SITE, 'app')
const MARKER = '/* @generated fmhy route — do not edit */'

if (!existsSync(PAGES)) {
  console.error('missing generated pages — run scripts/wiki/generate.ts first')
  process.exit(1)
}

// extra header-linked pages (backups + changelog) that live outside PAGE_ORDER:
// parse their markdown into the same generated-pages JSON so the route loop below
// emits app/<id>+ssg.tsx for each. not in nav.json, so they stay out of the sidebar.
type ExtraPage = {
  id: string
  title: string
  description: string
  /** route path when it differs from the id — must match the real fmhy.net URL */
  route?: string
  file?: string
  content?: string
}

const EXTRA: ExtraPage[] = [
  {
    id: 'backups',
    title: 'Backups',
    description: 'FMHY mirrors & backups',
    route: 'other/backups',
    file: join(ROOT, 'docs', 'other', 'backups.md'),
  },
  {
    // changelog-sites.md is a prose post (no wiki bullets), so render its key
    // links as entries instead — keeps the page useful without the MDX runtime.
    id: 'changelog',
    title: 'Changelog',
    description: 'Links added, updated, or removed — tracked from GitHub.',
    route: 'posts/changelog-sites',
    content: [
      '* ⭐ **[FMHY Tracker](https://fmhy-tracker.pages.dev/)** - Links added, updated, or removed, tracked by watching GitHub for changes',
      '* **[Discord](https://redd.it/17f8msf)** - We post the bigger monthly changes here — follow along',
      '* **[Commits Page](https://github.com/fmhy/edit/commits/main/)** - Watch every change on GitHub',
    ].join('\n'),
  },
]

for (const ex of EXTRA) {
  const source =
    ex.content ?? (ex.file && existsSync(ex.file) ? readFileSync(ex.file, 'utf8') : null)
  if (source == null) {
    console.warn(`skipping ${ex.id}: missing source`)
    continue
  }
  const { page } = parsePage(ex.id, ex.title, ex.description, profileFor(ex.id), source)
  writeFileSync(join(PAGES, `${ex.id}.json`), JSON.stringify(page))
  console.info(`✓ parsed extra page ${ex.id} → generated/pages/${ex.id}.json`)
}

// feedback.md is prose testimonials (`* *"quote"*`), not wiki link-entry
// bullets, so it doesn't go through parsePage — extract the quoted strings
// directly into generated/feedback.json for app/feedback+ssg.tsx (hand-authored).
const FEEDBACK_SOURCE = join(ROOT, 'docs', 'feedback.md')

// strips the bullet marker + a surrounding *"…"* (italic + straight quotes) —
// tolerant of quotes missing one side (seen once upstream) since each mark
// is stripped independently rather than matched as a single pattern
function extractFeedbackQuote(line: string): string | null {
  const bulletText = line.match(/^\*\s+(.*)$/)?.[1]
  if (bulletText == null) return null
  const text = bulletText
    .trim()
    .replace(/^\*/, '')
    .replace(/\*$/, '')
    .trim()
    .replace(/^"/, '')
    .replace(/"$/, '')
    .trim()
  return text.length > 0 ? text : null
}

if (existsSync(FEEDBACK_SOURCE)) {
  const quotes = readFileSync(FEEDBACK_SOURCE, 'utf8')
    .split('\n')
    .map(extractFeedbackQuote)
    .filter((quote): quote is string => !!quote)
  writeFileSync(
    join(SITE, 'src', 'features', 'wiki', 'generated', 'feedback.json'),
    JSON.stringify(quotes),
  )
  console.info(`✓ parsed ${quotes.length} feedback quotes → generated/feedback.json`)
} else {
  console.warn('skipping feedback quotes: docs/feedback.md missing')
}

// pages whose URL differs from their JSON id — must match the real fmhy.net URL
const ROUTE_OVERRIDES: Record<string, string> = Object.fromEntries(
  EXTRA.filter((ex) => ex.route).map((ex) => [ex.id, ex.route!]),
)

const slugs = readdirSync(PAGES)
  .filter((f) => f.endsWith('.json'))
  .map((f) => f.replace(/\.json$/, ''))
  .sort()

// fresh slate: drop prior generated routes (index+ssg is hand-authored, no
// marker), including nested ones emitted for ROUTE_OVERRIDES
for (const f of readdirSync(APP, { recursive: true }) as string[]) {
  const full = join(APP, f)
  if (
    f.endsWith('+ssg.tsx') &&
    statSync(full).isFile() &&
    readFileSync(full, 'utf8').startsWith(MARKER)
  ) {
    rmSync(full)
  }
}

for (const slug of slugs) {
  const routePath = ROUTE_OVERRIDES[slug] ?? slug
  const routeFile = join(APP, `${routePath}+ssg.tsx`)
  mkdirSync(dirname(routeFile), { recursive: true })
  writeFileSync(
    routeFile,
    `${MARKER}
import { createRoute, Head, useLoader } from 'one'

import { HeadInfo } from '~/components/HeadInfo'
import { WikiCategoryContent } from '~/features/wiki/WikiCategoryContent'

import type { WikiPage } from '~/features/wiki/types'

const route = createRoute<'/${routePath}'>()

export const loader = route.createLoader(async () => {
  const mod = await import('~/features/wiki/generated/pages/${slug}.json')
  return { page: mod.default as unknown as WikiPage }
})

export default function Page() {
  const { page } = useLoader(loader)
  return (
    <>
      <Head>
        <HeadInfo title={page.title} description={page.description} />
      </Head>
      <WikiCategoryContent page={page} />
    </>
  )
}
`,
  )
}

console.info(`✓ generated ${slugs.length} wiki routes → app/*+ssg.tsx`)
