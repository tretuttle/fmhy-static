import { useLinkTo, usePathname } from 'one'
import { useState } from 'react'
import { SizableText, styled, XStack, YStack } from 'tamagui'

import { wikiNav } from '~/features/wiki/data'
import { OptionsCard } from '~/features/wiki/OptionsCard'
import { scrollToAnchor } from '~/features/wiki/scrollToAnchor'
import { CaretDownIcon } from '~/icons/phosphor/CaretDownIcon'
import { TwemojiIcon } from '~/icons/TwemojiIcon'

import type { WikiNavGroup, WikiNavItem } from '~/features/wiki/types'

// standalone top rows (not in a nav group) — generated from upstream's
// sidebar (shared.ts) into nav.json, same as the groups
const TOP_ITEMS: WikiNavItem[] = wikiNav.topLinks

// row frame: 6px pill whose hover / active tints are the accent mixes in
// app/root.css (.fmhy-sidebar-link, upstream's .VPSidebarItem link rules) —
// subtle on hover, muted behind the active page's brand-colored label
const SidebarRowFrame = styled(XStack, {
  cursor: 'pointer',
  height: 32,
  px: '$3',
  rounded: 6,
  items: 'center',
  gap: '$2.5',
  // no bg here: tamagui's `:root ._bg-*` atomics would tie the root.css
  // hover/active rules on specificity and win on source order
  textDecorationLine: 'none',
})

function SidebarRow({ item, onNavigate }: { item: WikiNavItem; onNavigate?: () => void }) {
  const pathname = usePathname()
  const external = !!item.externalUrl
  const href = item.externalUrl ?? item.route
  const active = !external && pathname === item.route.split('#')[0]
  // internal rows must client-navigate like ~/components/Link — a bare href
  // full-loads the document, refetching every asset per click (which once
  // rate-limited the host to 429s). useLinkTo's onPress leaves modifier and
  // middle clicks to the browser, so open-in-new-tab works off the real href.
  const linkProps = useLinkTo({ href: item.route })

  return (
    <SidebarRowFrame
      render="a"
      href={href}
      {...(external && { target: '_blank', rel: 'noopener noreferrer' })}
      className="fmhy-sidebar-link"
      {...(active ? ({ 'aria-current': 'page' } as object) : {})}
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
      {item.icon ? (
        <XStack width={22} justify="center">
          <TwemojiIcon code={item.icon} size={16} />
        </XStack>
      ) : (
        <SizableText size="$3" width={22} text="center">
          {item.emoji}
        </SizableText>
      )}
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
      gap={20}
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
