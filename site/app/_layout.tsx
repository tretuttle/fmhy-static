import './root.css'

import { Slot, usePathname } from 'one'
import { ScrollView, View, XStack } from 'tamagui'

import { Footer } from '~/components/Footer'
import { Header } from '~/components/Header'
import { GlobalTooltipProvider } from '~/components/TooltipSimple'
import { WikiSidebar } from '~/components/WikiSidebar'
import { ThemeController } from '~/features/theme/ThemeController'
import { TamaguiRootProvider } from '~/tamagui/TamaguiRootProvider'

// fixed header height; content clears it and the rails stick beneath it
const HEADER_H = 56

export function Layout() {
  return (
    <html lang="en-US">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta property="og:site_name" content="FMHY" />
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
            <ThemeController />
            <View className="body-scrollable">
              <Header />
              <Shell />
              <Footer />
            </View>
          </GlobalTooltipProvider>
        </TamaguiRootProvider>
      </body>
    </html>
  )
}

// home renders full-width (hero + grid centers itself); content routes get the
// 3-column wiki shell (sidebar | content | toc). toc lands in phase 3.
function Shell() {
  const isHome = usePathname() === '/'

  if (isHome) {
    return (
      <View render="main" flex={1} minW={0} pt={HEADER_H}>
        <Slot />
      </View>
    )
  }

  return (
    <XStack flex={1} width="100%" pt={HEADER_H} items="flex-start">
      <View
        width={260}
        shrink={0}
        display="none"
        borderRightWidth={1}
        borderRightColor="$color2"
        $md={{
          display: 'flex',
          position: 'sticky',
          t: HEADER_H,
          height: `calc(100dvh - ${HEADER_H}px)`,
        }}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <WikiSidebar />
        </ScrollView>
      </View>

      <View
        render="main"
        flex={1}
        minW={0}
        maxW={900}
        mx="auto"
        px="$2"
        $md={{ px: '$6' }}
      >
        <Slot />
      </View>
    </XStack>
  )
}
