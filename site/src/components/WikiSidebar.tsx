import { usePathname } from 'one'
import { SizableText, styled, XStack, YStack } from 'tamagui'

import { wikiNav } from '~/features/wiki/data'
import { OptionsCard } from '~/features/wiki/OptionsCard'

import type { WikiNavItem } from '~/features/wiki/types'

// beginners-guide is a standalone top row in fmhy-app's sidebar (not in a nav group)
const TOP_ITEM: WikiNavItem = {
  slug: 'beginners-guide',
  title: 'Beginners Guide',
  emoji: '📚',
  description: '',
  route: '/beginners-guide',
  externalUrl: null,
  entryCount: 0,
}

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
      true: { bg: '$color3' },
    },
  } as const,
})

function SidebarRow({ item, onNavigate }: { item: WikiNavItem; onNavigate?: () => void }) {
  const pathname = usePathname()
  const external = !!item.externalUrl
  const href = item.externalUrl ?? item.route
  const active = !external && pathname === item.route.split('#')[0]

  return (
    <SidebarRowFrame
      render="a"
      href={href}
      {...(external && { target: '_blank', rel: 'noopener noreferrer' })}
      active={active}
      onPress={onNavigate}
    >
      <SizableText size="$3" width={22} text="center">
        {item.emoji}
      </SizableText>
      <SizableText
        size="$3"
        fontFamily="$body"
        fontWeight={active ? '600' : '400'}
        color={active ? '$color12' : '$color11'}
      >
        {item.title}
      </SizableText>
    </SidebarRowFrame>
  )
}

// uppercase group label mirrors fmhy-app ListTitle (mono, faded, non-selectable)
function GroupLabel({ label }: { label: string }) {
  return (
    <SizableText
      size="$2"
      fontFamily="$body"
      textTransform="uppercase"
      opacity={0.225}
      select="none"
      px="$3"
      pt="$2"
    >
      {label}
    </SizableText>
  )
}

export function WikiSidebar({ onNavigate }: { onNavigate?: () => void } = {}) {
  return (
    <YStack p="$2" pb="$8" gap="$4" select="none">
      <YStack gap="$0.5" pt="$2">
        <SidebarRow item={TOP_ITEM} onNavigate={onNavigate} />
      </YStack>

      {wikiNav.groups.map((group) => (
        <YStack key={group.title} gap="$0.5">
          <GroupLabel label={group.title} />
          {group.items.map((item) => (
            <SidebarRow key={item.slug} item={item} onNavigate={onNavigate} />
          ))}
        </YStack>
      ))}

      <OptionsCard />
    </YStack>
  )
}
