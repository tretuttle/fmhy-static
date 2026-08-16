import { usePathname } from 'one'
import { useEffect, useRef, useState } from 'react'
import { isWeb, YStack } from 'tamagui'

import { fromJsonModule, WIKI_SLUGS } from '~/features/wiki/data'
import tocJson from '~/features/wiki/generated/toc.json'
import { breakpoints } from '~/tamagui/breakpoints'
import { Text } from '~/interface/text/Text'

import type { TamaguiElement } from 'tamagui'
import { scrollToAnchor } from '~/features/wiki/scrollToAnchor'

export type TocEntry = {
  id: string
  title: string
  depth: 0 | 1
}

// pathname like "/video" or "/video#anchor" -> "video"
export function slugFromPathname(pathname: string): string | undefined {
  const path = pathname.split('#')[0]?.split('?')[0] ?? ''
  const slug = path.replace(/^\/+/, '').replace(/\/+$/, '')
  return slug || undefined
}

// the outline comes straight from the generated wiki data (same source
// WikiSectionList renders its anchors from), statically imported like
// nav.json. being synchronous, it renders during SSG — the aside ToC and the
// "On this page" bar are in the static HTML at first paint instead of waiting
// for deferred JS to hydrate and DOM-scan (~2s of empty outline before).
//
// TODO(native): entries are portable now, but the active-anchor
// tracking below is DOM-implemented — on native the TOC renders with no
// tracking. reimplement over ScrollView onScroll when the target exists.
const tocBySlug = fromJsonModule<Record<string, TocEntry[]>>(tocJson)

// shared by the desktop aside ToC and the mobile LocalNav dropdown
export function useTocEntries(): TocEntry[] {
  const pathname = usePathname()
  const slug = slugFromPathname(pathname)
  const isCategory = !!slug && WIKI_SLUGS.includes(slug)
  return isCategory ? (tocBySlug[slug] ?? []) : []
}

// vitepress site data ships scrollOffset: 134 (fmhy.net html); useActiveAnchor
// adds 4px of slack on top of it
const SCROLL_OFFSET = 134

// active-anchor tracking ported from vitepress useActiveAnchor: on scroll
// (throttled+debounced at 100ms like upstream) pick the LAST anchor whose
// absolute top sits above scrollY + scrollOffset — so nested subsection rows
// activate while reading them. no active link at the very top; last link
// active when the page is scrolled to the bottom.
function useActiveAnchor(entries: TocEntry[], enabledMinWidth: number) {
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => {
    if (!isWeb || entries.length === 0) return

    const compute = () => {
      // like upstream's isAsideEnabled: only track while this outline is shown
      if (window.innerWidth < enabledMinWidth) return

      const scrollY = window.scrollY
      const innerHeight = window.innerHeight
      const offsetHeight = document.body.offsetHeight
      const isBottom = Math.abs(scrollY + innerHeight - offsetHeight) < 1

      const anchors = entries
        .map((entry) => {
          const el = document.getElementById(entry.id)
          if (!el) return null
          return { id: entry.id, top: el.getBoundingClientRect().top + scrollY }
        })
        .filter((a): a is { id: string; top: number } => a !== null && !Number.isNaN(a.top))
        .sort((a, b) => a.top - b.top)

      if (anchors.length === 0 || scrollY < 1) {
        setActiveId(null)
        return
      }
      if (isBottom) {
        setActiveId(anchors[anchors.length - 1]!.id)
        return
      }

      let active: string | null = null
      for (const { id, top } of anchors) {
        if (top > scrollY + SCROLL_OFFSET + 4) break
        active = id
      }
      setActiveId(active)
    }

    // throttle-and-debounce(100ms), mirroring upstream's scroll handler
    let last = 0
    let trailing: number | undefined
    const onScroll = () => {
      const now = Date.now()
      if (now - last > 100) {
        last = now
        compute()
      }
      window.clearTimeout(trailing)
      trailing = window.setTimeout(compute, 100)
    }

    const raf = requestAnimationFrame(compute)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(trailing)
      window.removeEventListener('scroll', onScroll)
    }
  }, [entries, enabledMinWidth])

  return [activeId, setActiveId] as const
}

export function tocScrollTo(id: string) {
  // settle-scroll instead of scrollIntoView: content-visibility placeholder
  // layout makes scrollIntoView land wrong (or not at all) in Firefox/WebKit
  scrollToAnchor(id)
}

function TocRow({
  entry,
  active,
  onPress,
}: {
  entry: TocEntry
  active: boolean
  onPress: (id: string) => void
}) {
  return (
    <Text
      render="a"
      {...({ href: `#${entry.id}` } as object)}
      className="outline-link"
      cursor="pointer"
      display="block"
      // VPDocOutlineItem: block links, 32px line height, 14px, regular weight;
      // nested list indents by 16px. desktop active/hover color is text-1 (NOT
      // brand — only the marker is brand-colored)
      lineHeight={32}
      fontSize={14}
      fontWeight="400"
      pl={entry.depth === 1 ? 16 : 0}
      color={active ? '$color12' : '$color11'}
      hoverStyle={{ color: '$color12' }}
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
    </Text>
  )
}

export function WikiToc() {
  const entries = useTocEntries()
  // the aside outline is only displayed from $xl up
  const [activeId, setActiveId] = useActiveAnchor(entries, breakpoints.xl)

  const containerRef = useRef<TamaguiElement>(null)
  const markerRef = useRef<TamaguiElement>(null)

  // vitepress's animated .outline-marker: a 2x18px brand bar that translates
  // to the active row (transition top .25s cubic-bezier(0,1,.5,1)). upstream
  // sets top = activeLink.offsetTop + 39: the links' offsetParent is the
  // relative list wrapper sitting below the 32px title, and +7px centers the
  // 18px marker in the 32px row — our structure mirrors that exactly.
  // inactive: top 33px, opacity 0.
  useEffect(() => {
    const container = containerRef.current as HTMLElement | null
    const marker = markerRef.current as HTMLElement | null
    if (!container || !marker) return
    const link = activeId
      ? container.querySelector<HTMLElement>(`a[href="#${activeId}"]`)
      : null
    if (link) {
      marker.style.top = `${link.offsetTop + 39}px`
      marker.style.opacity = '1'
    } else {
      marker.style.top = '33px'
      marker.style.opacity = '0'
    }
  }, [activeId, entries])

  if (entries.length === 0) return null

  const onPress = (id: string) => {
    tocScrollTo(id)
    setActiveId(id)
  }

  return (
    <YStack
      render="nav"
      {...({ 'aria-labelledby': 'doc-outline-aria-label' } as object)}
      width={220}
      shrink={0}
      display="none"
      $xl={{
        display: 'flex',
        position: 'sticky',
        t: 64,
        height: 'calc(100vh - 80px)',
      }}
      pt="$6"
      pl="$4"
      // wk-rail (root.css): overflow-y auto + hidden x + upstream's thin 4px
      // scrollbar — overflow="scroll" forced permanent h+v bars on windows
      className="wk-rail"
    >
      {/* VPDocAsideOutline .content: relative rail with a 1px divider the
          marker slides along */}
      <YStack
        ref={containerRef}
        position="relative"
        borderLeftWidth={1}
        borderLeftColor="$color4"
        pl={16}
      >
        <YStack
          ref={markerRef}
          position="absolute"
          t={33}
          l={-1}
          z={0}
          width={2}
          height={18}
          rounded={2}
          bg="$accent10"
          opacity={0}
          style={{
            transition:
              'top 0.25s cubic-bezier(0, 1, 0.5, 1), background-color 0.5s, opacity 0.25s',
          }}
        />
        <Text
          id="doc-outline-aria-label"
          {...({ role: 'heading', 'aria-level': 2 } as object)}
          fontSize={14}
          fontWeight="600"
          lineHeight={32}
          color="$color12"
        >
          On this page
        </Text>
        {/* like ul.root (z-index 1), rows render above the marker */}
        <YStack position="relative" z={1}>
          {entries.map((entry) => (
            <TocRow
              key={entry.id}
              entry={entry}
              active={activeId === entry.id}
              onPress={onPress}
            />
          ))}
        </YStack>
      </YStack>
    </YStack>
  )
}
