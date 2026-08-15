/**
 * Sync the mirror's source: maintain a real clone of fmhy/edit at .fmhy-edit/
 * (gitignored), then regenerate the wiki dataset and +ssg routes from it.
 *
 * This replaced a scheme that checked upstream's docs/ out INTO this repo.
 * A full clone is what "reliable mirror" actually needs:
 *   - upstream modules import with their whole dependency closure available
 *     (pnpm install in the clone), instead of only-works-if-dep-free imports
 *   - removed-page history comes from their real git log
 *   - CI can run THEIR vitepress build on the same commit and parity-check
 *     our parse against the exact HTML fmhy.net serves (scripts/parity-check.ts)
 *
 * Run: bun scripts/sync-fmhy.ts            — clone/update + regenerate
 *      bun scripts/sync-fmhy.ts --install  — also pnpm-install the clone
 *                                            (needed before parity-check)
 */
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

import { FMHY_ROOT } from './wiki/fmhy-root'

const SITE = join(import.meta.dir, '..')
const UPSTREAM_URL = 'https://github.com/fmhy/edit.git'
// generate-removed walks 31 days of docs/ history — keep that much around
const HISTORY_WINDOW = '31 days ago'

const run = (cmd: string, args: string[], cwd?: string) =>
  execFileSync(cmd, args, { stdio: 'inherit', cwd })

// --- clone or update the fmhy/edit checkout --------------------------------
if (!existsSync(join(FMHY_ROOT, '.git'))) {
  console.info(`cloning fmhy/edit → ${FMHY_ROOT}`)
  run('git', [
    'clone',
    `--shallow-since=${HISTORY_WINDOW}`,
    '--single-branch',
    '--branch',
    'main',
    UPSTREAM_URL,
    FMHY_ROOT,
  ])
} else {
  console.info(`updating fmhy/edit clone at ${FMHY_ROOT}`)
  try {
    run('git', ['-C', FMHY_ROOT, 'fetch', `--shallow-since=${HISTORY_WINDOW}`, 'origin', 'main'])
  } catch {
    // odd remote states (upstream force-push, expired shallow point)
    run('git', ['-C', FMHY_ROOT, 'fetch', '--depth', '1', 'origin', 'main'])
  }
  run('git', ['-C', FMHY_ROOT, 'reset', '--hard', 'origin/main'])
  run('git', ['-C', FMHY_ROOT, 'clean', '-fdq'])
}
run('git', ['-C', FMHY_ROOT, 'log', '-1', '--format=mirroring fmhy/edit @ %h %s (%ci)'])

// --- optionally install their dependencies ---------------------------------
// Only the parity check (their vitepress build) needs this; plain generation
// reads their files directly. `corepack pnpm` honors their pinned
// packageManager version without a global pnpm install.
if (process.argv.includes('--install')) {
  run('corepack', ['pnpm', 'install', '--frozen-lockfile'], FMHY_ROOT)
}

// --- regenerate --------------------------------------------------------------
// generate.ts must run first — convert-fmhy reads its output and refuses to
// run without it.
execFileSync('bun', [join(import.meta.dir, 'wiki', 'generate.ts')], {
  stdio: 'inherit',
  cwd: SITE,
})

execFileSync('bun', [join(import.meta.dir, 'convert-fmhy.ts')], {
  stdio: 'inherit',
  cwd: SITE,
})

console.info('✓ synced fmhy content + regenerated wiki data and routes')
