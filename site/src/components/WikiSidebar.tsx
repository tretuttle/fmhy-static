import { useLinkTo, usePathname } from 'one'
import { useState } from 'react'
import { SizableText, styled, XStack, YStack } from 'tamagui'

import { wikiNav } from '~/features/wiki/data'
import { OptionsCard } from '~/features/wiki/OptionsCard'
import { scrollToAnchor } from '~/features/wiki/scrollToAnchor'
import { CaretDownIcon } from '~/icons/phosphor/CaretDownIcon'

import type { WikiNavGroup, WikiNavItem } from '~/features/wiki/types'

// standalone top rows (not in a nav group) — mirrors fmhy.net's sidebar
// (fmhy/edit docs/.vitepress/shared.ts): Beginners Guide, Posts, Contribute
const TOP_ITEMS: WikiNavItem[] = [
  {
    slug: 'beginners-guide',
    title: 'Beginners Guide',
    emoji: '📚',
    description: '',
    route: '/beginners-guide',
    externalUrl: null,
    entryCount: 0,
  },
  {
    slug: 'posts',
    title: 'Posts',
    emoji: '📰',
    description: '',
    route: '/posts',
    externalUrl: null,
    entryCount: 0,
  },
  {
    slug: 'contribute',
    title: 'Contribute',
    emoji: '💡',
    description: '',
    route: '/other/contributing',
    externalUrl: null,
    entryCount: 0,
  },
]

// row frame mirrors fmhy-app SidebarRowFrame (height 36, rounded, hover/press, active bg)
const SidebarRowFrame = styled(XStack, {
  cursor: 'pointer',
  height: 36,
  px: '$3',
  rounded: '$3',
  items: 'center',
  gap: '$2.5',
  bg: 'transparent',
  textDecorationLine: 'none',
  transition: '200ms',

  hoverStyle: { bg: '$color3' },
  pressStyle: { bg: '$color4', scale: 0.98 },

  variants: {
    active: {
      // fmhy.net's active row is colored text, no background pill — hover
      // feedback (defined above) still applies to non-active rows as normal.
      true: { bg: 'transparent' },
    },
  } as const,
})

function SidebarRow({ item, onNavigate }: { item: WikiNavItem; onNavigate?: () => void }) {
  const pathname = usePathname()
  const external = !!item.externalUrl
  const href = item.externalUrl ?? item.route
  const active = !external && pathname === item.route.split('#')[0]
  // internal rows must client-navigate like ~/components/Link — a bare href
  // full-loads the document, refetching every asset per click (the 429
  // incident, task #19). useLinkTo's onPress leaves modifier/middle clicks
  // to the browser, so open-in-new-tab still works off the real href.
  const linkProps = useLinkTo({ href: item.route })

  return (
    <SidebarRowFrame
      render="a"
      href={href}
      {...(external && { target: '_blank', rel: 'noopener noreferrer' })}
      active={active}
      onPress={(e) => {
        onNavigate?.()
        if (external) return
        linkProps.onPress(e as Parameters<typeof linkProps.onPress>[0])
        // hash routes: the router's own scroll fires before content-visibility
        // placeholders settle and lands ~1500px off — run the app's
        // settle-scroll once the target section exists (same path as
        // LocalNav/WikiToc clicks). no-ops if the id never appears (e.g.
        // modifier-click opened a new tab instead of navigating).
        const hashIndex = item.route.indexOf('#')
        if (hashIndex === -1) return
        const id = item.route.slice(hashIndex + 1)
        let attempts = 0
        const settle = () => {
          if (scrollToAnchor(id) || ++attempts >= 30) return
          setTimeout(settle, 100)
        }
        setTimeout(settle, 50)
      }}
    >
      <SizableText size="$3" width={22} text="center">
        {item.emoji}
      </SizableText>
      <SizableText
        size="$3"
        fontFamily="$body"
        fontWeight={active ? '600' : '400'}
        color={active ? '$accent11' : '$color11'}
      >
        {item.title}
      </SizableText>
    </SidebarRowFrame>
  )
}

// bold, mixed-case, pressable group header mirrors fmhy.net's collapsible
// sidebar sections — chevron on the right rotates to reflect expanded state.
function GroupHeader({
  label,
  expanded,
  onToggle,
}: {
  label: string
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <XStack
      render="button"
      onPress={onToggle}
      aria-expanded={expanded}
      items="center"
      justify="space-between"
      bg="transparent"
      borderWidth={0}
      cursor="pointer"
      select="none"
      px="$3"
      pt="$2"
    >
      <SizableText size="$3" fontFamily="$body" fontWeight="700" color="$color12">
        {label}
      </SizableText>
      <YStack rotate={expanded ? '0deg' : '-90deg'} transition="200ms">
        <CaretDownIcon size={14} color="$color11" />
      </YStack>
    </XStack>
  )
}

// per-group collapse state, seeded from the generated nav's `collapsed` flag
// (nav.json ships "More" pre-collapsed) — session-only, no persistence.
function WikiNavGroupSection({
  group,
  onNavigate,
}: {
  group: WikiNavGroup
  onNavigate?: () => void
}) {
  const [expanded, setExpanded] = useState(() => !group.collapsed)

  return (
    <YStack gap="$0.5">
      <GroupHeader
        label={group.title}
        expanded={expanded}
        onToggle={() => setExpanded((value) => !value)}
      />
      {expanded &&
        group.items.map((item) => (
          <SidebarRow key={item.slug} item={item} onNavigate={onNavigate} />
        ))}
    </YStack>
  )
}

export function WikiSidebar({ onNavigate }: { onNavigate?: () => void } = {}) {
  return (
    <YStack
      render="nav"
      aria-label="Sidebar Navigation"
      px="$3"
      py="$2"
      pb="$8"
      gap="$4"
      select="none"
    >
      <YStack gap="$0.5" pt="$2">
        {TOP_ITEMS.map((item) => (
          <SidebarRow key={item.slug} item={item} onNavigate={onNavigate} />
        ))}
      </YStack>

      {wikiNav.groups.map((group) => (
        <WikiNavGroupSection key={group.title} group={group} onNavigate={onNavigate} />
      ))}

      <OptionsCard />
    </YStack>
  )
}
