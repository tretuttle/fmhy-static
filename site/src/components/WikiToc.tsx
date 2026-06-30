import { usePathname } from 'one'
import { useEffect, useState } from 'react'
import { isWeb, YStack } from 'tamagui'

import { WIKI_SLUGS } from '~/features/wiki/data'
import { Text } from '~/interface/text/Text'

type TocEntry = {
  id: string
  title: string
  depth: 0 | 1
}

// pathname like "/video" or "/video#anchor" -> "video"
function slugFromPathname(pathname: string): string | undefined {
  const path = pathname.split('#')[0]?.split('?')[0] ?? ''
  const slug = path.replace(/^\/+/, '').replace(/\/+$/, '')
  return slug || undefined
}

// derive the outline from the rendered section anchors (tagged with
// data-toc-* by WikiSectionList) — guaranteed to match what's on screen and
// avoids re-loading the page data in the layout
function scanEntries(): TocEntry[] {
  if (typeof document === 'undefined') return []
  const nodes = Array.from(document.querySelectorAll<HTMLElement>('[data-toc-level]'))
  const entries: TocEntry[] = []
  for (const node of nodes) {
    const id = node.id
    const title = node.getAttribute('data-toc-title') ?? ''
    const depth = node.getAttribute('data-toc-level') === '1' ? 1 : 0
    if (id && title) entries.push({ id, title, depth })
  }
  return entries
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
      cursor="pointer"
      display="block"
      py="$1.5"
      pl={entry.depth === 1 ? '$4' : '$2.5'}
      borderLeftWidth={2}
      borderLeftColor={active ? '$accent10' : 'transparent'}
      fontSize={entry.depth === 1 ? '$2' : '$3'}
      lineHeight="$1"
      color={active ? '$accent10' : '$color10'}
      hoverStyle={{ color: active ? '$accent10' : '$color12' }}
      textDecorationLine="none"
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
  const pathname = usePathname()
  const slug = slugFromPathname(pathname)
  const isCategory = !!slug && WIKI_SLUGS.includes(slug)

  const [entries, setEntries] = useState<TocEntry[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)

  // rescan the DOM whenever the route changes; retry briefly because section
  // content streams in just after navigation (and for fully-rendered static html)
  useEffect(() => {
    if (!isWeb || !isCategory) {
      setEntries([])
      return
    }
    let tries = 0
    const tick = () => {
      const found = scanEntries()
      if (found.length > 0 || tries > 20) {
        setEntries(found)
        return
      }
      tries += 1
      timer = window.setTimeout(tick, 150)
    }
    let timer = window.setTimeout(tick, 50)
    return () => window.clearTimeout(timer)
  }, [isCategory, slug])

  // track topmost visible section
  useEffect(() => {
    if (!isWeb || typeof document === 'undefined' || entries.length === 0) return

    const visible = new Set<string>()
    const recompute = () => {
      for (const entry of entries) {
        if (visible.has(entry.id)) {
          setActiveId(entry.id)
          return
        }
      }
    }
    const observer = new IntersectionObserver(
      (records) => {
        for (const record of records) {
          if (record.isIntersecting) visible.add(record.target.id)
          else visible.delete(record.target.id)
        }
        recompute()
      },
      { rootMargin: '-64px 0px -70% 0px', threshold: 0 },
    )
    for (const entry of entries) {
      const el = document.getElementById(entry.id)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [entries])

  if (!isCategory || entries.length === 0) return null

  const onPress = (id: string) => {
    if (typeof document === 'undefined') return
    const el = document.getElementById(id)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth' })
    setActiveId(id)
    if (typeof history !== 'undefined') {
      history.replaceState(null, '', `#${id}`)
    }
  }

  return (
    <YStack
      render="nav"
      aria-label="On this page"
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
      overflow="scroll"
    >
      <Text
        size="$1"
        color="$color10"
        textTransform="uppercase"
        letterSpacing={0.5}
        mb="$2"
        pl="$2.5"
      >
        On this page
      </Text>
      {entries.map((entry) => (
        <TocRow
          key={entry.id}
          entry={entry}
          active={activeId === entry.id}
          onPress={onPress}
        />
      ))}
    </YStack>
  )
}
