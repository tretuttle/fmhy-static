import { usePathname } from 'one'
import { useEffect, useRef, useState } from 'react'
import { SizableText, View, XStack, YStack, isWeb } from 'tamagui'

import { CaretDownIcon } from '~/icons/phosphor/CaretDownIcon'
import { breakpoints } from '~/tamagui/breakpoints'

import { HEADER_HEIGHT, setLocalNavDropdownOpen } from './ScrollHeader'
import { WikiSidebar } from './WikiSidebar'
import { useTocEntries, type TocEntry } from './WikiToc'

// aria-controls target for the menu button, mirroring VPSidebarNav
const SIDEBAR_DRAWER_ID = 'sidebar-drawer'

import type { TamaguiElement } from 'tamagui'
import { scrollToAnchor } from '~/features/wiki/scrollToAnchor'

// mobile "On this page" sub-bar under the header, ported from vitepress
// VPLocalNav + VPLocalNavOutlineDropdown (theme bundle + fmhy style.scss):
// - sticky full-width bar with a bottom divider, shown below the desktop-ToC
//   breakpoint (vitepress: <1280px; here: below $xl where WikiToc is hidden)
// - its `top` follows the mobile header: nav visible -> below it, nav hidden
//   on scroll -> pinned to the viewport top (transition top .25s ease-in-out,
//   fmhy VPNav.vue's vp-nav-shown-mobile override)
// - the button opens a flyout listing the page outline with a "Return to top"
//   row at the top (theme returnToTopLabel default); Escape / outside click /
//   route change / link click all close it
// - active link tracked on scroll like fmhy Layout.vue's
//   runUpdateMobileActiveLink: last anchor whose top is above 120px
export function LocalNav({ navHidden }: { navHidden: boolean }) {
  const pathname = usePathname()
  const entries = useTocEntries()

  const [open, setOpenState] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const rootRef = useRef<TamaguiElement>(null)

  const setOpen = (value: boolean) => {
    setOpenState(value)
    // let the header's hide-on-scroll logic know (VPNav.vue keeps the bar
    // visible while the dropdown is open)
    setLocalNavDropdownOpen(value)
  }

  // route change closes the dropdown (upstream onContentUpdated)
  useEffect(() => {
    setOpen(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  // clear the shared flag if we unmount while open
  useEffect(() => () => setLocalNavDropdownOpen(false), [])

  // Escape and outside-click close (VPLocalNavOutlineDropdown behavior)
  useEffect(() => {
    // isWeb, not isClient: isClient is true on react-native, where document
    // doesn't exist. native needs its own dropdown-dismiss + scroll wiring.
    if (!isWeb || !open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    const onClick = (e: MouseEvent) => {
      const root = rootRef.current as HTMLElement | null
      if (root && e.target instanceof Node && !root.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('click', onClick)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('click', onClick)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // active-link tracking ported from fmhy Layout.vue runUpdateMobileActiveLink:
  // rAF-throttled scroll handler, active = LAST anchor whose top is above
  // 120px, only below the desktop-ToC breakpoint (there: innerWidth < 1280)
  useEffect(() => {
    if (!isWeb || entries.length === 0) return

    let scheduled = false
    const update = () => {
      if (window.innerWidth >= breakpoints.xl) return
      let active: string | null = null
      for (const entry of entries) {
        const el = document.getElementById(entry.id)
        if (!el) continue
        if (el.getBoundingClientRect().top < 120) {
          active = entry.id
        } else {
          break
        }
      }
      setActiveId(active)
    }
    const schedule = () => {
      // gate BEFORE scheduling: at desktop widths the bar is hidden, so don't
      // burn a rAF per scroll event just to early-return inside update()
      if (window.innerWidth >= breakpoints.xl) return
      if (scheduled) return
      scheduled = true
      requestAnimationFrame(() => {
        scheduled = false
        update()
      })
    }

    schedule()
    window.addEventListener('scroll', schedule, { passive: true })
    return () => window.removeEventListener('scroll', schedule)
  }, [entries])

  if (entries.length === 0) return null

  const returnToTop = () => {
    setOpen(false)
    if (!isWeb) return
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
  }

  const onLinkPress = (id: string) => {
    setOpen(false)
    // settle-scroll: content-visibility placeholders break scrollIntoView on
    // Firefox/WebKit (see scrollToAnchor.ts)
    if (scrollToAnchor(id)) setActiveId(id)
  }

  return (
    <>
    <YStack
      ref={rootRef}
      display="flex"
      $xl={{ display: 'none' }}
      z={40}
      width="100%"
      // search's post-navigation scroll measures this bar (offset) and locks
      // it (html.vp-search-scrolling) — see searchHighlight.ts getNavbarHeight
      {...({ id: 'local-nav' } as object)}
      // the header is fixed (out of flow): clear it, then hand the space back
      // so page content (padded for the header only) starts right below us
      mt={HEADER_HEIGHT}
      mb={-HEADER_HEIGHT}
      borderBottomWidth={1}
      borderBottomColor="$color4"
      bg="$background"
      // .VPLocalNav.has-sidebar: the bar spans full width but its content is
      // padded past the sidebar column (260px in _layout, shown from $md)
      $md={{ pl: 272 }}
      style={{
        position: 'sticky',
        top: navHidden ? 0 : HEADER_HEIGHT,
        transition: 'top 0.25s ease-in-out, background-color 0.5s',
      }}
    >
      {/* VPLocalNavOutlineDropdown: padding 12px 20px 11px (12px 36px 11px
          once the sidebar is visible) */}
      <XStack
        position="relative"
        width="100%"
        pl={20}
        pr={20}
        pt={12}
        pb={11}
        items="center"
        // VPLocalNav: menu button left, outline dropdown right
        justify="space-between"
        $md={{ pl: 36, pr: 36 }}
      >
        {/* VPLocalNav menu button: toggles the sidebar as a left drawer at
            widths where the rail is hidden (fmhy.net parity — their bar's
            "Menu" button, aria-controls VPSidebarNav). From $md the rail is
            pinned, so the button disappears exactly like theirs does. */}
        <XStack
          render="button"
          onPress={() => setMenuOpen(true)}
          aria-expanded={menuOpen}
          aria-controls={SIDEBAR_DRAWER_ID}
          display="flex"
          $md={{ display: 'none' }}
          items="center"
          gap={6}
          bg="transparent"
          borderWidth={0}
          cursor="pointer"
        >
          {/* no tamagui `group` here: t_group_true is a container-type
              inline-size container, whose size containment collapses the
              button's intrinsic width to its padding (12px) */}
          <SizableText
            fontSize={12}
            lineHeight={24}
            fontWeight="500"
            color="$color11"
            hoverStyle={{ color: '$color12' }}
            style={{ transition: 'color 0.25s', whiteSpace: 'nowrap' }}
            shrink={0}
          >
            ☰ Menu
          </SizableText>
        </XStack>

        <XStack
          render="button"
          onPress={() => setOpen(!open)}
          aria-expanded={open}
          items="center"
          self="flex-start"
          gap={2}
          bg="transparent"
          borderWidth={0}
          cursor="pointer"
        >
          <SizableText
            fontSize={12}
            lineHeight={24}
            fontWeight="500"
            color={open ? '$color12' : '$color11'}
            hoverStyle={{ color: '$color12' }}
            // the button sizes to min-content in its column parent — without
            // nowrap the label wraps per-word into a ~200px-tall bar
            style={{ transition: 'color 0.25s', whiteSpace: 'nowrap' }}
            shrink={0}
          >
            On this page
          </SizableText>
          {/* vpi-chevron-right rotating to 90deg when open — our caret points
              down, so idle is -90deg (right) and open is 0 (down) */}
          <View
            style={{
              transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
              transition: 'transform 0.25s',
            }}
          >
            <CaretDownIcon size={14} color={open ? '$color12' : '$color11'} />
          </View>
        </XStack>

        {open ? (
          // .items: full-width (16px inset) on mobile; once the sidebar shows
          // it becomes a 320px box hanging 32px off the sidebar edge
          // (vitepress: left calc(sidebar-width + 32px), here relative to the
          // sidebar-padded container)
          <YStack
            position="absolute"
            t={40}
            l={16}
            r={16}
            $md={{ l: 32, r: 'auto', width: 320 }}
            z={10}
            borderWidth={1}
            borderColor="$color5"
            rounded={8}
            // gutter background shows through the 1px gaps as hairlines
            bg="$color4"
            gap={1}
            maxH="50vh"
            style={{
              overflowX: 'hidden',
              overflowY: 'auto',
              // --vp-shadow-3
              boxShadow:
                '0 12px 32px rgba(0, 0, 0, 0.1), 0 2px 6px rgba(0, 0, 0, 0.08)',
            }}
            enterStyle={{ opacity: 0, y: -16 }}
            transition="200ms"
          >
            <YStack bg="$color2">
              <SizableText
                render="a"
                {...({ href: '#' } as object)}
                display="block"
                px={16}
                lineHeight={48}
                fontSize={14}
                fontWeight="500"
                color="$accent10"
                cursor="pointer"
                textDecorationLine="none"
                onPress={(e: { preventDefault?: () => void }) => {
                  e.preventDefault?.()
                  returnToTop()
                }}
              >
                Return to top
              </SizableText>
            </YStack>

            <YStack bg="$color2" py={8}>
              {entries.map((entry) => (
                <OutlineLink
                  key={entry.id}
                  entry={entry}
                  active={activeId === entry.id}
                  onPress={onLinkPress}
                />
              ))}
            </YStack>
          </YStack>
        ) : null}
      </XStack>
    </YStack>

      {/* sidebar drawer (VPSidebar.open parity): backdrop + left panel with
          the full wiki sidebar, for widths where the rail is hidden. it lives
          OUTSIDE the sticky bar: the bar is z=40 (a stacking context below
          the z=50 header), so anything inside it — whatever its own z —
          paints under the header. real css position:fixed via style — the
          tamagui position prop degrades to absolute (react-native has no
          fixed), which pinned the drawer to the bar instead of the viewport */}
      {menuOpen ? (
        <>
          <View
            z={60}
            bg="rgba(0,0,0,0.6)"
            onPress={() => setMenuOpen(false)}
            {...({ 'aria-hidden': true } as object)}
            style={{ position: 'fixed', inset: 0 }}
          />
          <YStack
            {...({ id: SIDEBAR_DRAWER_ID } as object)}
            z={61}
            width={300}
            maxW="85vw"
            bg="$background"
            borderRightWidth={1}
            borderRightColor="$color4"
            pt={8}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              bottom: 0,
              overflowY: 'auto',
              overscrollBehavior: 'contain',
            }}
            enterStyle={{ x: -300 }}
            transition="200ms"
          >
            <WikiSidebar onNavigate={() => setMenuOpen(false)} />
          </YStack>
        </>
      ) : null}
    </>
  )
}

function OutlineLink({
  entry,
  active,
  onPress,
}: {
  entry: TocEntry
  active: boolean
  onPress: (id: string) => void
}) {
  return (
    <SizableText
      render="a"
      {...({ href: `#${entry.id}` } as object)}
      display="block"
      // .outline-link: 32px rows, 14px regular; nested list indents 16px.
      // fmhy's mobile override colors the active row brand + semibold
      lineHeight={32}
      fontSize={14}
      fontWeight={active ? '600' : '400'}
      pl={entry.depth === 1 ? 13 : 0}
      color={active ? '$accent10' : '$color11'}
      hoverStyle={{ color: active ? '$accent10' : '$color12' }}
      cursor="pointer"
      textDecorationLine="none"
      style={{
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        transition: 'color 0.25s',
      }}
      onPress={(e: { preventDefault?: () => void }) => {
        e.preventDefault?.()
        onPress(entry.id)
      }}
    >
      {entry.title}
    </SizableText>
  )
}
