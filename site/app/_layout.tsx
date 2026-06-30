import './root.css'

import { Slot, usePathname } from 'one'
import { useEffect } from 'react'
import { ScrollView, View, XStack } from 'tamagui'

import { Footer } from '~/components/Footer'
import { Header } from '~/components/Header'
import { GlobalTooltipProvider } from '~/components/TooltipSimple'
import { WikiSidebar } from '~/components/WikiSidebar'
import { WikiToc } from '~/components/WikiToc'
import { ThemeController } from '~/features/theme/ThemeController'
import { closeSearch, isSearchOpen, toggleSearch } from '~/features/wiki/searchModal'
import { WikiFiltersProvider } from '~/features/wiki/useWikiFilters'
import { WikiSearchModal } from '~/features/wiki/WikiSearchModal'
import { TamaguiRootProvider } from '~/tamagui/TamaguiRootProvider'

// fixed header height; content clears it and the rails stick beneath it
const HEADER_H = 56

// global ⌘K / Ctrl-K toggles search; Escape closes it
function SearchHotkey() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        toggleSearch()
      } else if (e.key === 'Escape' && isSearchOpen()) {
        closeSearch()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  return null
}

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
        <link rel="icon" href="/fmhy-logo.webp" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
        />
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
            <WikiFiltersProvider>
              <ThemeController />
              <SearchHotkey />
              <View className="body-scrollable">
                <Header />
                <Shell />
                <Footer />
              </View>
              <WikiSearchModal />
            </WikiFiltersProvider>
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

  // flex: 1 0 auto — grow to fill short pages, never cap below content (footer stays put)
  if (isHome) {
    return (
      <View
        render="main"
        flexGrow={1}
        flexShrink={0}
        flexBasis="auto"
        minW={0}
        pt={HEADER_H}
        minH={`calc(100dvh - ${HEADER_H}px)`}
      >
        <Slot />
      </View>
    )
  }

  return (
    <XStack
      flexGrow={1}
      flexShrink={0}
      flexBasis="auto"
      width="100%"
      pt={HEADER_H}
      minH={`calc(100dvh - ${HEADER_H}px)`}
      items="flex-start"
    >
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

      <WikiToc />
    </XStack>
  )
}
