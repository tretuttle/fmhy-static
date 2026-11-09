import { usePathname } from 'one'
import { useEffect, useRef, useState } from 'react'
import { XStack, isWeb } from 'tamagui'

import { isMobileNavFrozen, observeScrollInset } from '~/features/wiki/scrollOffset'
import {
  alignInitialHashScroll,
  watchHashNavigations,
} from '~/features/wiki/scrollToAnchor'
import { breakpoints } from '~/tamagui/breakpoints'

import type { ReactNode } from 'react'
import type { TamaguiElement } from 'tamagui'

// fixed header height — must match HEADER_H in app/_layout.tsx, which pads the
// page content to clear this bar (fmhy.net: --vp-nav-height, 64px there)
export const HEADER_HEIGHT = 64

// fmhy.net's VPNav.vue refuses to hide the bar while the mobile "On this page"
// dropdown is open (it checks for `.VPLocalNavOutlineDropdown .items` in the
// DOM). LocalNav reports its dropdown state here so the scroll handler can do
// the same without a DOM query.
let localNavDropdownOpen = false
export const setLocalNavDropdownOpen = (open: boolean) => {
  localNavDropdownOpen = open
}

// distance from the last show/hide flip before the bar flips again
// (VPNav.vue SCROLL_THRESHOLD — measured from the flip, not per scroll event,
// so slow scrolling still accumulates)
const SCROLL_THRESHOLD = 12

// ported from fmhy.net's custom VPNav.vue scroll logic: the bar NEVER hides on
// desktop; below the mobile-nav breakpoint (960px there — our hamburger
// breakpoint $lg here) scrolling down 12px past the last flip hides it,
// scrolling up 12px brings it back, reaching the very top always shows it.
// while the "On this page" dropdown is open only hiding is blocked, and
// programmatic/search jumps freeze it entirely (freezeMobileNav)
export function useMobileNavHidden(): boolean {
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    // isWeb, not isClient: isClient is true on react-native, where these
    // window scroll/resize APIs don't exist
    if (!isWeb) return

    let lastY = window.scrollY

    const onScroll = () => {
      const y = window.scrollY

      if (y <= 0) {
        setHidden(false)
        lastY = 0
        return
      }

      // desktop: static bar, never hidden
      if (window.innerWidth >= breakpoints.lg) {
        setHidden(false)
        lastY = y
        return
      }

      const diff = y - lastY

      // a scroll-to-anchor or search jump owns the bar until it settles
      if (isMobileNavFrozen()) {
        lastY = y
        return
      }

      // keep the bar while the mobile ToC dropdown is open — scrolling up may
      // still reveal it
      if (diff > 0 && localNavDropdownOpen) {
        lastY = y
        return
      }

      if (Math.abs(diff) > SCROLL_THRESHOLD) {
        setHidden(diff > 0)
        lastY = y
      }
    }

    // resizing up to desktop resets the bar to visible
    const onResize = () => {
      if (window.innerWidth >= breakpoints.lg) {
        setHidden(false)
        lastY = window.scrollY
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return hidden
}

// the fixed top bar, mirroring VPNavBar: a static full-width bar with a solid
// background and a 1px bottom divider. it is transparent only at the very top
// of the home page (VPNavBar's `.home.top` state). on mobile it slides away
// via translateY(-100%) when `hidden` (VPNav.vue's `.nav-hidden`).
export const ScrollHeader = ({
  children,
  hidden = false,
}: {
  children: ReactNode
  hidden?: boolean
}) => {
  const pathname = usePathname()
  const isHome = pathname === '/'
  const [atTop, setAtTop] = useState(true)
  const headerRef = useRef<TamaguiElement>(null)

  // publish the shared scroll inset (header + visible "On this page" bar +
  // 16px) — re-observed per route since the local-nav only exists on pages
  // with an outline (fmhy.net Layout.vue observeScrollInset)
  useEffect(() => {
    if (!isWeb) return
    const header = headerRef.current as HTMLElement | null
    if (!header) return
    return observeScrollInset(header, document.getElementById('local-nav'))
  }, [pathname])

  // #hash targets land on the shared inset: re-aligned once after first load
  // (fonts/images/content-visibility settle), and after client navigations
  useEffect(() => {
    if (!isWeb) return
    void alignInitialHashScroll()
    return watchHashNavigations()
  }, [])

  useEffect(() => {
    if (!isWeb) return
    const onScroll = () => setAtTop(window.scrollY < 1)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const transparent = isHome && atTop

  return (
    <XStack
      ref={headerRef}
      render="header"
      t={0}
      l={0}
      r={0}
      z={50}
      width="100%"
      height={HEADER_HEIGHT}
      items="center"
      justify="center"
      bg={transparent ? 'transparent' : '$background'}
      $platform-web={{ position: 'fixed', maxW: '100vw' }}
      style={{
        transform: hidden ? 'translateY(-100%)' : 'translateY(0)',
        // VPNav: background-color .5s, transform .25s ease-in-out
        transition:
          'transform 0.25s ease-in-out, background-color 0.5s, border-bottom-color 0.5s',
      }}
    >
      {/* 1440 = the shared layout max width (Shell / Container) so the header
          columns align with the sidebar and aside at wide viewports */}
      <XStack width="100%" maxW={1440} items="center">
        {children}
      </XStack>
      {/* divider element instead of a border: from $xl it starts after the
          sidebar column (root.css .hdr-divider), like VPNavBar.has-sidebar */}
      <div className="hdr-divider" style={{ opacity: transparent ? 0 : 1 }} />
    </XStack>
  )
}
