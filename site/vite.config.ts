import { tamaguiPlugin } from '@tamagui/vite-plugin'
import { one } from 'one/vite'
import { visualizer } from 'rollup-plugin-visualizer'

import type { UserConfig } from 'vite'

export default {
  envPrefix: ['VITE_', 'TAMAGUI_'],

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

  // NOTE: chunk optimization can be enabled but may cause issues
  // environments: {
  //   client: {
  //     build: {
  //       rollupOptions: {
  //         output: {
  //           experimentalMinChunkSize: 30_000,
  //         },
  //       },
  //     },
  //   },
  // },

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
