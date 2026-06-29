/**
 * Pull the latest fmhy/edit docs from the tracked remote and regenerate the
 * blog posts. This is the "content auto-updates" path: run it on a schedule
 * (cron / CI / prebuild) and every deploy carries current fmhy.net content
 * with zero manual editing. Run: bun scripts/sync-fmhy.ts
 */
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'

const ROOT = join(import.meta.dir, '..', '..') // the fmhy/edit clone
const SITE = join(import.meta.dir, '..')

const git = (...args: string[]) =>
  execFileSync('git', ['-C', ROOT, ...args], { stdio: 'inherit' })

// fetch fmhy/edit (the `upstream` remote) and take only the docs subtree —
// never touches our app files, so it can't conflict with the takeout-static
// code we layered on top. `origin` is our own repo; `upstream` is fmhy/edit.
git('fetch', '--depth', '1', 'upstream', 'main')
git('checkout', 'upstream/main', '--', 'docs/')

execFileSync('bun', [join(import.meta.dir, 'convert-fmhy.ts')], {
  stdio: 'inherit',
  cwd: SITE,
})

console.info('✓ synced fmhy content + regenerated posts')
