#!/usr/bin/env bun

/**
 * post-build: emit the service worker, mirroring fmhy.net's PWA.
 *
 * upstream wires vite-plugin-pwa into their vitepress build (config.mts):
 * precache only the app shell (js/css/woff2, ≤3MB each, search index
 * excluded), CacheFirst for images, NetworkFirst for page navigations,
 * autoUpdate registration. one's build has no pwa hook, so this runs
 * workbox-build's generateSW over dist/client with the same recipe — plus a
 * NetworkFirst rule for /data/*.json, which is our SPA's equivalent of their
 * page navigations (wiki pages fetch their dataset on client-side nav).
 *
 * registration lives in app/_layout.tsx (prod-only, after `load`, so the SW
 * never competes with first paint or hydration).
 *
 * Wired into package.json as the last build step:
 *   "build": "... && bun scripts/defer-hydration.ts && bun scripts/generate-sw.ts"
 */

import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { generateSW } from 'workbox-build'

const distClient = join(process.cwd(), 'dist', 'client')

if (!existsSync(distClient)) {
  console.error('generate-sw: dist/client not found — run `one build` first')
  process.exit(1)
}

const { count, size, warnings } = await generateSW({
  swDest: join(distClient, 'sw.js'),
  globDirectory: distClient,
  // app shell only — pages and images go through runtimeCaching
  globPatterns: ['**/*.{js,css,woff2}'],
  // one's *_vxrn_loader.js chunks embed each page's full dataset — that is
  // page content, not shell; it rides the NetworkFirst rule below like
  // upstream's page navigations (precaching all 86 was an 8.6MB install)
  globIgnores: ['**/*_vxrn_loader.js', '**/*localSearchIndex*.js', 'sw.js', 'workbox-*.js'],
  maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
  skipWaiting: true,
  clientsClaim: true,
  sourcemap: false,
  runtimeCaching: [
    {
      urlPattern: /\.(?:png|jpe?g|svg|webp|ico)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'images-cache',
        expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
        cacheableResponse: { statuses: [0, 200] },
      },
    },
    {
      urlPattern: ({ request }) => request.mode === 'navigate',
      handler: 'NetworkFirst',
      options: {
        cacheName: 'pages-cache',
        expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
      },
    },
    {
      // wiki page datasets fetched on SPA navigation (route loader chunks and
      // /data json) — same freshness rules as full page navigations
      urlPattern: /(_vxrn_loader\.js|\/data\/.*\.json)$/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'data-cache',
        expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
      },
    },
  ],
})

for (const warning of warnings) {
  console.warn('generate-sw:', warning)
}
if (count === 0) {
  console.error('generate-sw: precached nothing — that cannot be right')
  process.exit(1)
}
console.info(
  `generate-sw: sw.js written — ${count} shell files precached (${(size / 1024).toFixed(0)}KB)`
)
