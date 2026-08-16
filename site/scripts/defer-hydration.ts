#!/usr/bin/env bun

/**
 * post-build: push hydration off the LCP critical path.
 *
 * one's SSG pages carry an inline loader that injects the module scripts
 * after five setTimeout hops (buildPage's waitIdle(5)). on a big wiki page
 * those hops complete while the HTML is still parsing, so React's single
 * synchronous hydrateRoot call (~750ms on /video) runs BEFORE the browser
 * commits the first frame — LCP waits for hydration to finish. measured on
 * /video: LCP 1,248ms with the stock loader, 191ms with no loader at all;
 * the SSR paint itself is nearly free.
 *
 * this rewrites the trigger to a double-requestAnimationFrame (fires only
 * after the first frame is committed) plus a 3s setTimeout fallback so
 * hidden tabs (where rAF is suspended) still hydrate. nothing visible
 * depends on hydration — rows are render-idempotent plain markup — so the
 * only observable change is content painting ~1s sooner.
 *
 * the gate is existence-based, never shape-of-today: every page that carries
 * one's loader must contain the exact trigger we rewrite. if a one upgrade
 * changes the template, this FAILS THE BUILD instead of silently shipping
 * the old paint-blocking behavior.
 *
 * Wired into package.json:
 *   "build": "one build && bun scripts/sitemap-gen.ts && bun scripts/defer-hydration.ts"
 * (after sitemap-gen so the flattened <dir>.html copies get rewritten too —
 * they are copies, so both the copy and the original pass through here)
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const cwd = process.cwd()
const distClient = join(cwd, 'dist', 'client')

if (!existsSync(distClient)) {
  console.error('defer-hydration: dist/client not found — run `one build` first')
  process.exit(1)
}

// the loader's IIFE body defines loadScripts() then fires waitIdle(5);
// we replace only the trigger, inside the same closure
const LOADER_MARK = 'function loadScripts()'
const TRIGGER = 'waitIdle(5);'
const REPLACEMENT = `var fired = false;
  function go() { if (!fired) { fired = true; loadScripts(); } }
  requestAnimationFrame(function() {
    requestAnimationFrame(function() {
      setTimeout(go, 0);
    });
  });
  setTimeout(go, 3000);`

function collectHtmlFiles(dir: string): string[] {
  const files: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...collectHtmlFiles(full))
    } else if (entry.name.endsWith('.html')) {
      files.push(full)
    }
  }
  return files
}

let rewritten = 0
for (const file of collectHtmlFiles(distClient)) {
  const rel = relative(distClient, file).replaceAll('\\', '/')
  const html = readFileSync(file, 'utf-8')

  if (!html.includes(LOADER_MARK)) {
    continue // no module loader on this page (nothing to hydrate)
  }

  const count = html.split(TRIGGER).length - 1
  if (count !== 1) {
    console.error(
      `defer-hydration: ${rel} carries one's script loader but ${count === 0 ? 'no' : count} ` +
        `"${TRIGGER}" trigger(s) — one's buildPage template changed, refusing to ship ` +
        `paint-blocking hydration silently. update this script for the new template.`
    )
    process.exit(1)
  }

  writeFileSync(file, html.replace(TRIGGER, REPLACEMENT))
  rewritten++
}

if (rewritten === 0) {
  console.error('defer-hydration: found no pages carrying the loader — that cannot be right')
  process.exit(1)
}

console.info(`defer-hydration: hydration deferred until after first paint on ${rewritten} pages`)
