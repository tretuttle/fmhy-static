import './root.css'

import { Slot } from 'one'
import { View } from 'tamagui'

import { Footer } from '~/components/Footer'
import { Header } from '~/components/Header'
import { GlobalTooltipProvider } from '~/components/TooltipSimple'
import { TamaguiRootProvider } from '~/tamagui/TamaguiRootProvider'

export function Layout() {
  return (
    <html lang="en-US">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta property="og:site_name" content="Takeout Static" />
        <meta property="og:locale" content="en_US" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=5.0"
        />
        <link rel="icon" href="/favicon.svg" />
        <link
          rel="preload"
          href="/JetBrainsMono.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/JetBrainsMono-Bold.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>

      <body>
        <TamaguiRootProvider>
          <GlobalTooltipProvider>
            <View className="body-scrollable">
              <Header />
              <View render="main" pt={55}>
                <Slot />
              </View>
              <Footer />
            </View>
          </GlobalTooltipProvider>
        </TamaguiRootProvider>
      </body>
    </html>
  )
}
