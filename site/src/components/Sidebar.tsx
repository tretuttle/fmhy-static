import { Link, usePathname, type Href } from 'one'
import { SizableText, YStack } from 'tamagui'

type Item = { slug: string; title: string }

const wiki: Item[] = [
  { slug: 'beginners-guide', title: 'Beginners Guide' },
  { slug: 'privacy', title: 'Adblocking / Privacy' },
  { slug: 'ai', title: 'Artificial Intelligence' },
  { slug: 'video', title: 'Movies / TV / Anime' },
  { slug: 'audio', title: 'Music / Podcasts / Radio' },
  { slug: 'gaming', title: 'Gaming / Emulation' },
  { slug: 'reading', title: 'Books / Comics / Manga' },
  { slug: 'downloading', title: 'Downloading' },
  { slug: 'torrenting', title: 'Torrenting' },
  { slug: 'educational', title: 'Educational' },
  { slug: 'mobile', title: 'Android / iOS' },
  { slug: 'linux-macos', title: 'Linux / macOS' },
  { slug: 'non-english', title: 'Non-English' },
  { slug: 'misc', title: 'Miscellaneous' },
  { slug: 'storage', title: 'Storage' },
  { slug: 'unsafe', title: 'Unsafe Sites' },
]

const tools: Item[] = [
  { slug: 'system-tools', title: 'System Tools' },
  { slug: 'file-tools', title: 'File Tools' },
  { slug: 'internet-tools', title: 'Internet Tools' },
  { slug: 'social-media-tools', title: 'Social Media Tools' },
  { slug: 'text-tools', title: 'Text Tools' },
  { slug: 'gaming-tools', title: 'Gaming Tools' },
  { slug: 'image-tools', title: 'Image Tools' },
  { slug: 'video-tools', title: 'Video Tools' },
  { slug: 'developer-tools', title: 'Developer Tools' },
]

function Group({ label, items, pathname }: { label: string; items: Item[]; pathname: string }) {
  return (
    <YStack gap="$1.5">
      <SizableText
        size="$2"
        fontFamily="$mono"
        fontWeight="700"
        color="$color9"
        letterSpacing={1}
        textTransform="uppercase"
        select="none"
      >
        {label}
      </SizableText>
      {items.map((it) => {
        const active = pathname === `/${it.slug}`
        return (
          <Link key={it.slug} href={`/${it.slug}` as Href} asChild>
            <SizableText
              render="a"
              size="$3"
              fontFamily="$mono"
              cursor="pointer"
              py="$1"
              color={active ? '$color12' : '$color10'}
              fontWeight={active ? '700' : '400'}
              hoverStyle={{ color: '$color12' }}
            >
              {it.title}
            </SizableText>
          </Link>
        )
      })}
    </YStack>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  return (
    <YStack
      tag="nav"
      $maxMD={{ display: 'none' }}
      width={250}
      shrink={0}
      position="sticky"
      t={55}
      height="calc(100dvh - 55px)"
      overflow="scroll"
      px="$4"
      py="$5"
      gap="$5"
      borderRightWidth={1}
      borderRightColor="$color3"
    >
      <Group label="Wiki" items={wiki} pathname={pathname} />
      <Group label="Tools" items={tools} pathname={pathname} />
    </YStack>
  )
}
