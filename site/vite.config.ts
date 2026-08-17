import { execFileSync } from 'node:child_process'

import { tamaguiPlugin } from '@tamagui/vite-plugin'
import { one } from 'one/vite'
import { visualizer } from 'rollup-plugin-visualizer'

import type { UserConfig } from 'vite'

function getGitRev() {
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
      encoding: 'utf-8',
    }).trim()
  } catch {
    return 'dev'
  }
}

export default {
  envPrefix: ['VITE_', 'TAMAGUI_'],

  define: {
    __GIT_REV__: JSON.stringify(getGitRev()),
  },

  // NO react-native-svg alias here: app code imports ~/icons/svg (web →
  // @tamagui/react-native-svg shim, native → real react-native-svg via the
  // .native.ts extension). The old global alias rewrote the shim's own
  // `export * from 'react-native-svg'` back onto itself, so the native
  // bundle saw zero svg exports.
  server: {
    port: 8081,
  },

  ssr: {
    noExternal: true,
    external: ['sharp'],
  },

  // DO NOT enable experimentalMinChunkSize: it merges away one's per-route
  // `*_vxrn_loader.js` modules, which the client router fetches by
  // constructed URL at runtime — every SPA navigation then 404s and renders
  // blank (verified in production, 2026-07-03). If chunk consolidation is
  // revisited, loader chunks must be excluded and SPA nav click-tested.
  //
  // manualChunks below is the safe version of that consolidation: it groups
  // MODULES (our icon components — previously ~15 one-icon chunks fanned out
  // as a modulepreload waterfall on every page) into one shared chunk, and
  // never touches entry chunks, so the per-route loader files keep their
  // constructed URLs. Verified against dist: *_vxrn_loader.js files intact,
  // SPA nav click-tested.
  plugins: [
    // web-only icons chunk. As a static build.rollupOptions.output it would
    // also reach the native bundle, whose preserveModules output rejects
    // manualChunks outright — so it's applied via outputOptions and skipped
    // whenever preserveModules is set.
    {
      name: 'icons-chunk-web-only',
      outputOptions(options) {
        if (options.preserveModules) return null
        return {
          ...options,
          manualChunks(id: string) {
            if (id.includes('/src/icons/')) return 'icons'
            return undefined
          },
        }
      },
    },

    tamaguiPlugin({
      optimize: process.env.NODE_ENV === 'production',
      // caused hydration mis-matches
      disableServerOptimization: true,
      components: ['tamagui'],
      config: './src/tamagui/tamagui.config.ts',
      outputCSS: './src/tamagui/tamagui.css',
      themeBuilder: {
        input: './src/tamagui/themes-in.ts',
        output: './src/tamagui/themes-out.ts',
      },
    }),

    one({
      setupFile: {
        client: './src/setupClient.ts',
        server: './src/setupServer.ts',
      },

      react: {
        compiler: true,
      },

      web: {
        experimental_scriptLoading: 'after-lcp-aggressive',
        inlineLayoutCSS: true,
        defaultRenderMode: 'ssg',
        // EAS Hosting serves One's output as static — emit plain static dist/
        // (no worker preset; eas deploy runs the static client, not the worker).
      },
    }),

    ...(process.env.ANALYZE
      ? [
          visualizer({
            filename: './bundle_stats.html',
            open: false,
            gzipSize: true,
            brotliSize: true,
          }),
          visualizer({
            filename: './bundle_stats.json',
            template: 'raw-data',
            gzipSize: true,
            brotliSize: true,
          }),
        ]
      : []),
  ],
} satisfies UserConfig
