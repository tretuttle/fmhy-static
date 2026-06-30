import { usePathname } from 'one'
import { SizableText, styled, XStack, YStack } from 'tamagui'

type NavItem = { slug: string; title: string; emoji: string }
type NavGroup = { label: string; items: NavItem[] }

// inlined from src/features/wiki/generated/nav.json in fmhy-app (swap to generated nav later)
const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Wiki',
    items: [
      { slug: 'privacy', title: 'Adblocking / Privacy', emoji: '📛' },
      { slug: 'ai', title: 'Artificial Intelligence', emoji: '🤖' },
      { slug: 'video', title: 'Movies / TV / Anime', emoji: '📺' },
      { slug: 'audio', title: 'Music / Podcasts / Radio', emoji: '🎵' },
      { slug: 'gaming', title: 'Gaming / Emulation', emoji: '🎮' },
      { slug: 'reading', title: 'Books / Comics / Manga', emoji: '📗' },
      { slug: 'downloading', title: 'Downloading', emoji: '💾' },
      { slug: 'torrenting', title: 'Torrenting', emoji: '🌀' },
      { slug: 'educational', title: 'Educational', emoji: '🧠' },
      { slug: 'mobile', title: 'Android / iOS', emoji: '📱' },
      { slug: 'linux-macos', title: 'Linux / macOS', emoji: '🐧' },
      { slug: 'non-english', title: 'Non-English', emoji: '🌏' },
      { slug: 'misc', title: 'Miscellaneous', emoji: '📁' },
    ],
  },
  {
    label: 'Tools',
    items: [
      { slug: 'system-tools', title: 'System Tools', emoji: '💻' },
      { slug: 'file-tools', title: 'File Tools', emoji: '🗃️' },
      { slug: 'internet-tools', title: 'Internet Tools', emoji: '📎' },
      { slug: 'social-media-tools', title: 'Social Media Tools', emoji: '🗨️' },
      { slug: 'text-tools', title: 'Text Tools', emoji: '📝' },
      { slug: 'gaming-tools', title: 'Gaming Tools', emoji: '👾' },
      { slug: 'image-tools', title: 'Image Tools', emoji: '📷' },
      { slug: 'video-tools', title: 'Video Tools', emoji: '📼' },
      { slug: 'audio-tools', title: 'Audio Tools', emoji: '🔊' },
      { slug: 'educational-tools', title: 'Educational Tools', emoji: '🍎' },
      { slug: 'developer-tools', title: 'Developer Tools', emoji: '👨‍💻' },
    ],
  },
  {
    label: 'More',
    items: [
      { slug: 'nsfw', title: 'NSFW', emoji: '🔞' },
      { slug: 'unsafe', title: 'Unsafe Sites', emoji: '⚠️' },
      { slug: 'storage', title: 'Storage', emoji: '📦' },
    ],
  },
]

// standalone rows that bracket the groups in SOURCE
const TOP_ITEM: NavItem = { slug: 'beginners-guide', title: 'Beginners Guide', emoji: '📚' }
const FEEDBACK_ITEM: NavItem = { slug: 'feedback', title: 'Feedback', emoji: '💙' }

// row frame mirrors SOURCE SidebarRowFrame (height 36, rounded, hover/press, active bg)
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

  hoverStyle: {
    bg: '$color3',
  },

  pressStyle: {
    bg: '$color4',
    scale: 0.98,
  },

  variants: {
    active: {
      true: {
        bg: '$color3',
      },
    },
  } as const,
})

function SidebarRow({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const pathname = usePathname()
  const active = pathname === `/${item.slug}`

  return (
    <SidebarRowFrame render="a" href={`/${item.slug}`} active={active} onPress={onNavigate}>
      <SizableText size="$3" width={22} text="center">
        {item.emoji}
      </SizableText>
      <SizableText
        size="$3"
        fontFamily="$mono"
        fontWeight={active ? '600' : '400'}
        color={active ? '$color12' : '$color11'}
      >
        {item.title}
      </SizableText>
    </SidebarRowFrame>
  )
}

// uppercase group label mirrors SOURCE ListTitle (mono, faded, non-selectable)
function GroupLabel({ label }: { label: string }) {
  return (
    <SizableText
      size="$2"
      fontFamily="$mono"
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

      {NAV_GROUPS.map((group) => (
        <YStack key={group.label} gap="$0.5">
          <GroupLabel label={group.label} />
          {group.items.map((item) => (
            <SidebarRow key={item.slug} item={item} onNavigate={onNavigate} />
          ))}
          {group.label === 'More' && <SidebarRow item={FEEDBACK_ITEM} onNavigate={onNavigate} />}
        </YStack>
      ))}
    </YStack>
  )
}
