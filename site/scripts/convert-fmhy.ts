/**
 * Generates one static +ssg route per wiki page produced by scripts/wiki/generate.ts.
 * Each route statically loads its page JSON and renders WikiCategoryContent — matching
 * fmhy-app's structured rendering (no MDX runtime). EAS Hosting serves One as static,
 * and the dynamic [slug] route's client loader builds a malformed chunk path that 404s
 * on hydration, so we emit param-free routes instead.
 *
 * Run AFTER scripts/wiki/generate.ts (sync-fmhy does both). Run: bun scripts/convert-fmhy.ts
 */
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const SITE = join(import.meta.dir, '..')
const PAGES = join(SITE, 'src', 'features', 'wiki', 'generated', 'pages')
const APP = join(SITE, 'app')
const MARKER = '/* @generated fmhy route — do not edit */'

if (!existsSync(PAGES)) {
  console.error('missing generated pages — run scripts/wiki/generate.ts first')
  process.exit(1)
}

const slugs = readdirSync(PAGES)
  .filter((f) => f.endsWith('.json'))
  .map((f) => f.replace(/\.json$/, ''))
  .sort()

// fresh slate: drop prior generated routes (index+ssg is hand-authored, no marker)
for (const f of readdirSync(APP)) {
  if (
    f.endsWith('+ssg.tsx') &&
    readFileSync(join(APP, f), 'utf8').startsWith(MARKER)
  ) {
    rmSync(join(APP, f))
  }
}

for (const slug of slugs) {
  writeFileSync(
    join(APP, `${slug}+ssg.tsx`),
    `${MARKER}
import { createRoute, Head, useLoader } from 'one'

import { HeadInfo } from '~/components/HeadInfo'
import { WikiCategoryContent } from '~/features/wiki/WikiCategoryContent'

import type { WikiPage } from '~/features/wiki/types'

const route = createRoute<'/${slug}'>()

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
