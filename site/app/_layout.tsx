import '@fontsource-variable/inter'
import './root.css'
import '~/features/wiki/search.css'

import { Slot, usePathname } from 'one'
import { useEffect, useRef } from 'react'
import { View, XStack } from 'tamagui'

import { Footer } from '~/components/Footer'
import { Header } from '~/components/Header'
import { GlobalTooltipProvider } from '~/components/TooltipSimple'
import { WikiSidebar } from '~/components/WikiSidebar'
import { WikiToc } from '~/components/WikiToc'
import { ThemeController } from '~/features/theme/ThemeController'
import { THEME_PRE_PAINT_SCRIPT } from '~/features/theme/themePrePaint'
import {
  closeSearch,
  isSearchOpen,
  openSearch,
  toggleSearch,
} from '~/features/wiki/searchModal'
import { WikiFiltersProvider } from '~/features/wiki/useWikiFilters'
import { WikiSearchModal } from '~/features/wiki/WikiSearchModal'
import { TamaguiRootProvider } from '~/tamagui/TamaguiRootProvider'

// fixed header height; content clears it and the rails stick beneath it
const HEADER_H = 56

// skip-link + route-change focus target — the <main> content wrapper in Shell
const MAIN_CONTENT_ID = 'main-content'

// bounce out of iframes to the real site (upstream config.mts head script)
const IFRAME_BUSTER_SCRIPT = `(function(){if(window.self!==window.top){window.top.location=window.location.href}})();`

// June seasonal icon swap (upstream config.mts applyJuneTheme, month-gated so
// it is dormant outside June). simplified from upstream: the swap only runs
// once the asset actually loads (no broken-icon fallback if /june_icon.webp is
// missing), re-applies on popstate instead of a MutationObserver (which would
// fight react's DOM ownership), and skips upstream's <img> logo swap (react
// re-renders would revert it without the observer).
const JUNE_THEME_SCRIPT = `(function(){try{
if(new Date().getMonth()!==5)return;
document.documentElement.classList.add('june');
var img=new Image();
img.onload=function(){
var apply=function(){
document.querySelectorAll("link[rel*='icon']").forEach(function(link){
if(link.getAttribute('href')!=='/june_icon.webp'){
link.setAttribute('href','/june_icon.webp');
if(link.hasAttribute('type'))link.setAttribute('type','image/webp');
}
});
};
apply();
window.addEventListener('popstate',apply);
};
img.src='/june_icon.webp';
}catch(e){}})();`

// mirrors the fmhy.net search hotkey guard: '/' must keep typing normally
// inside form fields and editable regions
function isEditingContent(event: KeyboardEvent) {
  const el = event.target as HTMLElement | null
  if (!el) {
    return false
  }
  const tag = el.tagName
  return el.isContentEditable || tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA'
}

// global ⌘K / Ctrl-K toggles search, '/' opens it (fmhy.net parity); Escape closes
function SearchHotkey() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        toggleSearch()
      } else if (e.key === '/' && !isEditingContent(e)) {
        e.preventDefault()
        openSearch()
      } else if (e.key === 'Escape' && isSearchOpen()) {
        closeSearch()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  return null
}

// first element in <body>: visually-hidden skip link (visible on focus), and on
// client navigations move focus to the main content region — mirrors
// VitePress's VPSkipLink (a tabindex=-1 target refocused per navigation)
function SkipLink() {
  const pathname = usePathname()
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (isFirstRender.current) {
      // initial load: leave focus where the browser put it
      isFirstRender.current = false
      return
    }
    // preventScroll: the router owns scroll position (incl. #anchor targets)
    document.getElementById(MAIN_CONTENT_ID)?.focus({ preventScroll: true })
  }, [pathname])

  return (
    <a
      className="skip-link"
      href={`#${MAIN_CONTENT_ID}`}
      onClick={(e) => {
        const main = document.getElementById(MAIN_CONTENT_ID)
        if (main) {
          // handle it ourselves so the router never sees the hash change
          e.preventDefault()
          main.focus()
          window.scrollTo(0, 0)
        }
      }}
    >
      Skip to content
    </a>
  )
}

// TODO(native): [P0, task #1] this layout renders <html>/<head>/<body> and imports
// root.css/search.css — web-only by nature. a native target needs a _layout.native.tsx
// fork plus expo/react-native deps in package.json before anything can boot on ios/android.
export function Layout() {
  return (
    <html lang="en-US">
      <head>
        <meta charSet="utf-8" />
        {/* run before paint: iframe buster + saved theme classes (see themePrePaint.ts) */}
        <script dangerouslySetInnerHTML={{ __html: IFRAME_BUSTER_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: THEME_PRE_PAINT_SCRIPT }} />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta property="og:site_name" content="FMHY" />
        <meta property="og:locale" content="en_US" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=5.0"
        />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/fmhy-logo.webp" type="image/webp" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="alternate" type="application/rss+xml" title="FMHY" href="/feed.rss" />
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
        {/* after the icon links: june seasonal swap (dormant outside June) */}
        <script dangerouslySetInnerHTML={{ __html: JUNE_THEME_SCRIPT }} />
      </head>

      <body>
        <SkipLink />
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
        id={MAIN_CONTENT_ID}
        tabIndex={-1}
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
      {/* sidebar is its own sticky rail beneath the header (VPSidebar parity):
          it scrolls independently of the page, so the OptionsCard at the
          bottom is reached by scrolling the rail itself */}
      <View
        width={260}
        shrink={0}
        self="flex-start"
        display="none"
        borderRightWidth={1}
        borderRightColor="$color2"
        $md={{
          display: 'flex',
          position: 'sticky',
          t: HEADER_H,
          height: `calc(100dvh - ${HEADER_H}px)`,
        }}
        style={{ overflowY: 'auto', overscrollBehavior: 'contain' }}
      >
        <WikiSidebar />
      </View>

      <View
        render="main"
        id={MAIN_CONTENT_ID}
        tabIndex={-1}
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
