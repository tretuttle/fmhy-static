import { usePathname } from 'one'
import { useEffect, useState } from 'react'
import { XStack, isWeb } from 'tamagui'

import { breakpoints } from '~/tamagui/breakpoints'

import type { ReactNode } from 'react'

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

// minimum scroll delta before the mobile bar toggles (VPNav.vue SCROLL_THRESHOLD)
const SCROLL_THRESHOLD = 12

// ported from fmhy.net's custom VPNav.vue scroll logic: the bar NEVER hides on
// desktop; below the mobile-nav breakpoint (960px there — our hamburger
// breakpoint $lg here) scrolling down more than 12px hides it, scrolling up or
// reaching the very top brings it back
export function useMobileNavHidden(): boolean {
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    // isWeb, not isClient: isClient is true on react-native, where these
    // window scroll/resize APIs don't exist
    if (!isWeb) return

    let lastY = window.scrollY

    const onScroll = () => {
      const y = window.scrollY
      const diff = y - lastY
      lastY = y

      // keep the bar pinned while the mobile ToC dropdown is open
      if (localNavDropdownOpen) return

      // at the very top, always show
      if (y <= 0) {
        setHidden(false)
        return
      }

      // desktop: static bar, never hidden
      if (window.innerWidth >= breakpoints.lg) {
        setHidden(false)
        return
      }

      if (Math.abs(diff) > SCROLL_THRESHOLD) {
        setHidden(diff > 0)
      }
    }

    // resizing up to desktop resets the bar to visible
    const onResize = () => {
      if (window.innerWidth >= breakpoints.lg) setHidden(false)
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
  const isHome = usePathname() === '/'
  const [atTop, setAtTop] = useState(true)

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
      borderBottomWidth={1}
      borderBottomColor={transparent ? 'transparent' : '$color4'}
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
    </XStack>
  )
}
