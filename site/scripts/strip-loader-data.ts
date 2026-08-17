#!/usr/bin/env bun

/**
 * post-build: remove the loaderData duplicate from SSG HTML.
 *
 * one's buildPage inlines the full loader result into every page twice:
 * once rendered as HTML, and again as JSON inside the
 * `globalThis["__one_server_context__"] = {...}` script so hydration can
 * seed useLoader synchronously. the identical JSON also ships as the page's
 * /assets/<route>_<key>_vxrn_loader.js chunk (replaceLoader bakes it in for
 * SPA nav). on /video that inline JSON is 483KB of a 1.37MB page.
 *
 * useLoader's client path (one/dist/esm/useLoader.mjs) treats a missing
 * loaderData exactly like an SPA navigation: it dynamic-imports the page's
 * own loader chunk and suspends until it resolves. the server-rendered HTML
 * stays on screen while that happens, so dropping the inline copy changes
 * bytes, not pixels. loaderProps stays — the path match is how useLoader
 * decides there is nothing preloaded.
 *
 * the gate is existence-based like defer-hydration: every page must carry
 * exactly one server-context assignment whose object parses as JSON and
 * contains loaderData. if a one upgrade changes the serialization, this
 * FAILS THE BUILD rather than silently shipping either the old fat pages or
 * a mangled context object.
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const cwd = process.cwd()
const distClient = join(cwd, 'dist', 'client')

if (!existsSync(distClient)) {
  console.error('strip-loader-data: dist/client not found — run `one build` first')
  process.exit(1)
}

const ASSIGN = 'globalThis["__one_server_context__"] = '

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

// find the end of the JSON object starting at `start` (the opening brace),
// tracking string/escape state so braces inside string values don't count
function matchObjectEnd(text: string, start: number): number {
  let depth = 0
  let inString = false
  for (let i = start; i < text.length; i++) {
    const ch = text[i]
    if (inString) {
      if (ch === '\\') i++
      else if (ch === '"') inString = false
    } else if (ch === '"') inString = true
    else if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) return i + 1
    }
  }
  return -1
}

let stripped = 0
let saved = 0
for (const file of collectHtmlFiles(distClient)) {
  const rel = relative(distClient, file).replaceAll('\\', '/')
  const html = readFileSync(file, 'utf-8')

  const at = html.indexOf(ASSIGN)
  if (at === -1) {
    console.error(
      `strip-loader-data: ${rel} has no server-context assignment — one's buildPage ` +
        `template changed, refusing to guess. update this script.`
    )
    process.exit(1)
  }
  if (html.indexOf(ASSIGN, at + 1) !== -1) {
    console.error(`strip-loader-data: ${rel} has multiple server-context assignments — bailing`)
    process.exit(1)
  }

  const objStart = at + ASSIGN.length
  const objEnd = matchObjectEnd(html, objStart)
  if (objEnd === -1) {
    console.error(`strip-loader-data: ${rel} server-context object never closes — bailing`)
    process.exit(1)
  }

  let context: Record<string, unknown>
  try {
    context = JSON.parse(html.slice(objStart, objEnd))
  } catch (err) {
    console.error(`strip-loader-data: ${rel} server-context is not valid JSON — bailing`, err)
    process.exit(1)
  }

  if (!('loaderData' in context)) {
    console.error(`strip-loader-data: ${rel} server-context has no loaderData — bailing`)
    process.exit(1)
  }

  delete context.loaderData
  // \/ is a legal JSON string escape; keeps any "</script>" in remaining
  // values from terminating the inline script tag early
  const replacement = JSON.stringify(context).replaceAll('</', '<\\/')
  writeFileSync(file, html.slice(0, objStart) + replacement + html.slice(objEnd))
  saved += objEnd - objStart - replacement.length
  stripped++
}

if (stripped === 0) {
  console.error('strip-loader-data: no pages processed — that cannot be right')
  process.exit(1)
}

console.info(
  `strip-loader-data: removed inline loaderData from ${stripped} pages ` +
    `(${(saved / 1024 / 1024).toFixed(2)}MB total)`
)
