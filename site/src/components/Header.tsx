import { useState } from 'react'
import {
  Image,
  Popover,
  ScrollView,
  Separator,
  Sheet,
  SizableText,
  Spacer,
  XStack,
  YStack,
} from 'tamagui'

import { ArrowUpRightIcon } from '~/icons/phosphor/ArrowUpRightIcon'
import { CaretDownIcon } from '~/icons/phosphor/CaretDownIcon'
import { ChatCircleIcon } from '~/icons/phosphor/ChatCircleIcon'
import { DiscordLogoIcon } from '~/icons/phosphor/DiscordLogoIcon'
import { GithubLogoIcon } from '~/icons/phosphor/GithubLogoIcon'
import { ListIcon } from '~/icons/phosphor/ListIcon'
import { MagnifyingGlassIcon } from '~/icons/phosphor/MagnifyingGlassIcon'
import { RedditLogoIcon } from '~/icons/phosphor/RedditLogoIcon'

import { ThemeMenu } from '~/features/theme/ThemeMenu'
import { wikiNav } from '~/features/wiki/data'
import { openSearch } from '~/features/wiki/searchModal'

import { CircleButton, CircleLink } from './CircleButton'
import { Container } from './Container'
import { Link } from './Link'
import { ScrollHeader } from './ScrollHeader'

// fmhy social channels, mirrored from fmhy-app's constants/app.ts
const GITHUB_URL = 'https://github.com/fmhy/edit'
const DISCORD_INVITE_URL = 'https://github.com/fmhy/FMHY/wiki/FMHY-Discord'
const REDDIT_URL = 'https://www.reddit.com/r/FREEMEDIAHECKYEAH/'

// top-nav links mirroring fmhy.net; external deep-links until in-app routes land
type NavLink = { emoji: string; label: string; href: string; arrow?: boolean }

const NAV_LINKS: NavLink[] = [
  { emoji: '📋', label: 'Changelog', href: '/changelog' },
  {
    emoji: '📖',
    label: 'Glossary',
    href: 'https://rentry.org/The-Piracy-Glossary',
    arrow: true,
  },
  { emoji: '💾', label: 'Backups', href: '/backups' },
]

// fmhy ecosystem menu. internal where a route exists; the rest deep-link to fmhy.net
type EcosystemItem = {
  emoji: string
  label: string
  href: string
  external?: boolean
}

const ECOSYSTEM_ITEMS: EcosystemItem[] = [
  { emoji: '🌐', label: 'Search', href: '/search' },
  { emoji: '❓', label: 'FAQ', href: 'https://fmhy.net/other/FAQ', external: true },
  {
    emoji: '🔖',
    label: 'Bookmarks',
    href: 'https://github.com/fmhy/bookmarks',
    external: true,
  },
  {
    emoji: '✅',
    label: 'SafeGuard',
    href: 'https://fmhy.github.io/FMHY-SafeGuard/',
    external: true,
  },
  { emoji: '🚀', label: 'Startpage', href: 'https://fmhy.net/startpage', external: true },
  {
    emoji: '🔍',
    label: 'SearXNG',
    href: 'https://searxng.canine.tools/',
    external: true,
  },
  {
    emoji: '💡',
    label: 'Site Hunting',
    href: 'https://www.reddit.com/r/FREEMEDIAHECKYEAH/wiki/find-new-sites/',
    external: true,
  },
  { emoji: '😎', label: 'SFW FMHY', href: 'https://fmhy.xyz/', external: true },
  {
    emoji: '🏠',
    label: 'Selfhosting',
    href: 'https://fmhy.net/other/selfhosting',
    external: true,
  },
  {
    emoji: '🖼️',
    label: 'Wallpapers',
    href: 'https://fmhy.net/other/wallpapers',
    external: true,
  },
  { emoji: '💙', label: 'Feedback', href: '/feedback' },
]

// "Search" opens the live ⌘K modal instead of routing anywhere — desktop and
// mobile both need to special-case it out of the plain link-rendering loop
const isSearchItem = (item: EcosystemItem) => item.label === 'Search'

type SocialLink = {
  label: string
  href: string
  Icon: typeof GithubLogoIcon
}

const SOCIAL_LINKS: SocialLink[] = [
  { label: 'GitHub', href: GITHUB_URL, Icon: GithubLogoIcon },
  { label: 'Discord', href: DISCORD_INVITE_URL, Icon: DiscordLogoIcon },
  { label: 'Reddit', href: REDDIT_URL, Icon: RedditLogoIcon },
]

const Logo = () => (
  <Link href="/" aria-label="Home">
    <XStack items="center" gap="$2">
      <Image src="/fmhy-logo.webp" width={22} height={22} alt="FMHY logo" />
      <SizableText
        select="none"
        fontFamily="$heading"
        fontSize={16}
        fontWeight="600"
        letterSpacing={0.5}
      >
        FMHY
      </SizableText>
    </XStack>
  </Link>
)

const NavTextLink = ({ emoji, label, href, arrow }: NavLink) => {
  const external = href.startsWith('http')
  return (
    <Link
      href={href as never}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      <XStack items="center" gap="$1" opacity={0.85} hoverStyle={{ opacity: 1 }}>
        <SizableText fontFamily="$body" size="$3" color="$color12">
          {emoji} {label}
        </SizableText>
        {arrow ? <ArrowUpRightIcon size={11} color="$color9" /> : null}
      </XStack>
    </Link>
  )
}

const EcosystemRowInner = ({ item }: { item: EcosystemItem }) => (
  <XStack
    items="center"
    gap="$2.5"
    px="$2.5"
    py="$2"
    rounded="$3"
    cursor="pointer"
    bg="transparent"
    borderWidth={0}
    width="100%"
    hoverStyle={{ bg: '$color4' }}
  >
    <SizableText size="$4">{item.emoji}</SizableText>
    <SizableText flex={1} size="$3" color="$color12">
      {item.label}
    </SizableText>
    {item.external ? <ArrowUpRightIcon size={12} color="$color9" /> : null}
  </XStack>
)

const EcosystemRow = ({ item }: { item: EcosystemItem }) => {
  // "Search" opens the live ⌘K content-search modal, not a route
  if (isSearchItem(item)) {
    return (
      <XStack render="button" bg="transparent" borderWidth={0} onPress={() => openSearch()}>
        <EcosystemRowInner item={item} />
      </XStack>
    )
  }
  return (
    <Link
      href={item.href as never}
      {...(item.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      asChild
    >
      <EcosystemRowInner item={item} />
    </Link>
  )
}

const EcosystemMenu = () => (
  <Popover placement="bottom-end" allowFlip>
    <Popover.Trigger asChild>
      <XStack
        render="button"
        items="center"
        gap="$1.5"
        cursor="pointer"
        bg="transparent"
        borderWidth={0}
        opacity={0.85}
        hoverStyle={{ opacity: 1 }}
        aria-label="Ecosystem"
      >
        <SizableText fontFamily="$body" size="$3" color="$color12">
          🌐 Ecosystem
        </SizableText>
        <CaretDownIcon size={12} color="$color11" />
      </XStack>
    </Popover.Trigger>

    <Popover.Content
      bg="$color2"
      borderWidth={1}
      borderColor="$color5"
      rounded="$4"
      p="$2"
      elevate
    >
      <YStack gap="$0.5" width={240}>
        {ECOSYSTEM_ITEMS.map((item) => (
          <EcosystemRow key={item.label} item={item} />
        ))}
      </YStack>
    </Popover.Content>
  </Popover>
)

const SocialLinksRow = () => (
  <XStack items="center">
    {SOCIAL_LINKS.map(({ label, href, Icon }) => (
      <CircleLink key={label} href={href as never} tooltip={label}>
        <Icon size={20} />
      </CircleLink>
    ))}
  </XStack>
)

// expanded search trigger beside the logo on wide screens (phase 1 placeholder)
const HeaderSearchBox = () => (
  <XStack
    render="button"
    onPress={openSearch}
    aria-label="Search"
    width={240}
    maxW="100%"
    px="$3"
    py="$1.5"
    gap="$2"
    rounded="$4"
    borderWidth={0.5}
    borderColor="$color5"
    bg="$color2"
    items="center"
    cursor="pointer"
    hoverStyle={{ bg: '$color3', borderColor: '$color6' }}
    pressStyle={{ bg: '$color4' }}
  >
    <MagnifyingGlassIcon size={15} color="$color8" />
    <SizableText flex={1} text="left" size="$3" color="$color9">
      Search
    </SizableText>
    <SizableText
      size="$2"
      color="$color8"
      fontFamily="$body"
      letterSpacing={1}
      px="$1.5"
      py="$0.5"
      rounded="$2"
      bg="$color3"
      borderWidth={0.5}
      borderColor="$color5"
    >
      ⌘K
    </SizableText>
  </XStack>
)

// a simple pressable row for the mobile sheet (no ListItem dependency)
type SheetRowProps = {
  label: string
  emoji?: string
  icon?: React.ReactNode
  href?: string
  external?: boolean
  onPress: () => void
}

const SheetRow = ({ label, emoji, icon, href, external, onPress }: SheetRowProps) => {
  const inner = (
    <XStack
      items="center"
      gap="$3"
      px="$2"
      py="$2.5"
      rounded="$4"
      cursor="pointer"
      hoverStyle={{ bg: '$color4' }}
      pressStyle={{ bg: '$color5' }}
    >
      {icon ?? (emoji ? <SizableText size="$5">{emoji}</SizableText> : null)}
      <SizableText flex={1} size="$4" color="$color12">
        {label}
      </SizableText>
      {external ? <ArrowUpRightIcon size={13} color="$color9" /> : null}
    </XStack>
  )

  if (href) {
    return (
      <Link
        href={href as never}
        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        onPress={onPress}
        asChild
      >
        {inner}
      </Link>
    )
  }

  return (
    <XStack render="button" onPress={onPress}>
      {inner}
    </XStack>
  )
}

// uppercase group label mirrors WikiSidebar's GroupLabel, for the wiki-category
// fold-out below — below $lg there's no persistent sidebar, so the sheet is the
// only place a phone user can get from one wiki category to another
const SheetGroupLabel = ({ label }: { label: string }) => (
  <SizableText
    size="$2"
    fontFamily="$body"
    textTransform="uppercase"
    opacity={0.225}
    select="none"
    px="$2"
    pt="$2"
  >
    {label}
  </SizableText>
)

const MobileMenu = () => {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  return (
    <>
      <CircleButton tooltip="Menu" aria-label="Menu" onPress={() => setOpen(true)}>
        <ListIcon size={20} />
      </CircleButton>

      <Sheet
        open={open}
        onOpenChange={setOpen}
        modal
        dismissOnSnapToBottom
        snapPoints={[50]}
      >
        <Sheet.Overlay
          bg="$background"
          opacity={0.5}
          enterStyle={{ opacity: 0 }}
          exitStyle={{ opacity: 0 }}
        />
        <Sheet.Handle />

        <Sheet.Frame bg="$color2" p="$4">
          <YStack flex={1} gap="$2">
            <XStack items="center" justify="space-between">
              <Logo />
              <ThemeMenu />
            </XStack>

            <Separator my="$2" />

            <ScrollView flex={1}>
              <YStack gap="$0.5">
                <SheetRow
                  label="Search"
                  icon={<MagnifyingGlassIcon size={20} />}
                  onPress={() => {
                    close()
                    openSearch()
                  }}
                />
                <SheetRow
                  label="Feedback"
                  icon={<ChatCircleIcon size={20} />}
                  href="/feedback"
                  onPress={close}
                />

                <Separator my="$2" />

                {/* wiki categories: below $lg there's no persistent sidebar, so this
                    sheet is the only way to switch categories on a phone */}
                <SheetRow
                  label="Beginners Guide"
                  emoji="📚"
                  href="/beginners-guide"
                  onPress={close}
                />
                {wikiNav.groups.map((group) => (
                  <YStack key={group.title} gap="$0.5">
                    <SheetGroupLabel label={group.title} />
                    {group.items.map((item) => (
                      <SheetRow
                        key={item.slug}
                        label={item.title}
                        emoji={item.emoji}
                        href={item.externalUrl ?? item.route}
                        external={!!item.externalUrl}
                        onPress={close}
                      />
                    ))}
                  </YStack>
                ))}

                <Separator my="$2" />

                {NAV_LINKS.map((l) => (
                  <SheetRow
                    key={l.label}
                    label={l.label}
                    emoji={l.emoji}
                    href={l.href}
                    external={l.href.startsWith('http')}
                    onPress={close}
                  />
                ))}

                <Separator my="$2" />

                {ECOSYSTEM_ITEMS.filter((item) => !isSearchItem(item)).map((item) => (
                  <SheetRow
                    key={item.label}
                    label={item.label}
                    emoji={item.emoji}
                    href={item.href}
                    external={item.external}
                    onPress={close}
                  />
                ))}
              </YStack>
            </ScrollView>

            <Separator my="$2" />

            <XStack width="100%" items="center" justify="center">
              <SocialLinksRow />
            </XStack>
          </YStack>
        </Sheet.Frame>
      </Sheet>
    </>
  )
}

export function Header() {
  return (
    <ScrollHeader>
      <Container py="$2">
        <XStack testID="site-header" width="100%" items="center" gap="$3">
          <Logo />

          {/* wide only: full search box beside the logo */}
          <XStack display="none" $xl={{ display: 'flex' }}>
            <HeaderSearchBox />
          </XStack>

          <Spacer flex={1} />

          {/* below wide: compact search icon */}
          <XStack display="flex" $xl={{ display: 'none' }} items="center">
            <CircleButton tooltip="Search" aria-label="Search" onPress={openSearch}>
              <MagnifyingGlassIcon size={18} />
            </CircleButton>
          </XStack>

          {/* lg+ : nav links, ecosystem, theme, socials */}
          <XStack display="none" $lg={{ display: 'flex' }} gap="$4" items="center">
            {NAV_LINKS.map((l) => (
              <NavTextLink key={l.label} {...l} />
            ))}
            <EcosystemMenu />
            <ThemeMenu />
            <SocialLinksRow />
          </XStack>

          {/* below lg: hamburger menu */}
          <XStack display="flex" $lg={{ display: 'none' }} items="center">
            <MobileMenu />
          </XStack>
        </XStack>
      </Container>
    </ScrollHeader>
  )
}
