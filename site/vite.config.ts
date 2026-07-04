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

  resolve: {
    alias: {
      'react-native-svg': '@tamagui/react-native-svg',
    },
  },

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

  plugins: [
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
