// Resolves the fmhy/edit checkout that everything derives from.
//
// The mirror no longer vendors upstream's docs/ into this repo. Instead,
// scripts/sync-fmhy.ts maintains a real clone of fmhy/edit at .fmhy-edit/
// (gitignored) — full repo, real git history, their lockfile — and every
// generator reads from it. That buys two things a docs/-only checkout cannot:
// upstream modules import with their whole dependency closure available, and
// CI can run THEIR vitepress build on the same commit to parity-check ours.
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const SITE = join(import.meta.dirname, '..', '..')

/** absolute path to the fmhy/edit clone (env FMHY_ROOT overrides) */
export const FMHY_ROOT = process.env.FMHY_ROOT ?? join(SITE, '.fmhy-edit')

export function assertFmhyRoot(): string {
  if (!existsSync(join(FMHY_ROOT, 'docs', 'index.md'))) {
    throw new Error(
      `fmhy/edit checkout not found at ${FMHY_ROOT} — run \`bun scripts/sync-fmhy.ts\` ` +
        'first (it clones/updates the mirror source), or set FMHY_ROOT.',
    )
  }
  return FMHY_ROOT
}
