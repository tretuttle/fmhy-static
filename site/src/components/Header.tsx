import { usePathname } from 'one'
import { useEffect, useRef, useState } from 'react'
import {
  Image,
  ScrollView,
  Separator,
  Sheet,
  SizableText,
  Spacer,
  View,
  VisuallyHidden,
  XStack,
  YStack,
  isWeb,
} from 'tamagui'

import { ArrowUpRightIcon } from '~/icons/phosphor/ArrowUpRightIcon'
import { CaretDownIcon } from '~/icons/phosphor/CaretDownIcon'
import { ChatCircleIcon } from '~/icons/phosphor/ChatCircleIcon'
import { GithubLogoIcon } from '~/icons/phosphor/GithubLogoIcon'
import {
  DiscordSolidIcon,
  GithubSolidIcon,
  RedditSolidIcon,
} from '~/icons/social/SolidSocialIcons'
import { MagnifyingGlassIcon } from '~/icons/phosphor/MagnifyingGlassIcon'

import { ThemeMenu } from '~/features/theme/ThemeMenu'
import { wikiNav } from '~/features/wiki/data'
import chrome from '~/features/wiki/generated/chrome.json'
import { openSearch } from '~/features/wiki/searchModal'
import { useSearchHotkeyLabel } from '~/features/wiki/searchHotkeyLabel'

import { CircleButton, CircleLink } from './CircleButton'
import { Container } from './Container'
import { Link } from './Link'
import { LocalNav } from './LocalNav'
import { ScrollHeader, useMobileNavHidden } from './ScrollHeader'

import type { TamaguiElement } from 'tamagui'

// fmhy social channels — upstream's shared.ts socialLinks, via chrome.json.
// upstream keys them by icon name; the icon components are ours.
const socialHref = (icon: string, fallback: string) =>
  chrome.socialLinks.find((s) => s.icon === icon)?.link ?? fallback

// header logo, copied from their docs/public at sync time (generated/home.json
// brand). Upstream swaps to the pride logo for June via a client script gated
// on getMonth() === 5 — mirror that exactly, so we're never wearing June's
// branding in August (which is precisely how this used to ship).
import homeJson from '~/features/wiki/generated/home.json'
const LOGO_SRC =
  new Date().getMonth() === 5 && homeJson.brand.juneLogo
    ? homeJson.brand.juneLogo
    : (homeJson.brand.logo ?? '/upstream/fmhy.ico')

const GITHUB_URL = socialHref('github', 'https://github.com/fmhy/edit')
const DISCORD_INVITE_URL = socialHref(
  'discord',
  'https://github.com/fmhy/FMHY/wiki/FMHY-Discord',
)
const REDDIT_URL = socialHref('reddit', 'https://www.reddit.com/r/FREEMEDIAHECKYEAH/')

// id target for the hamburger's aria-controls (VPNavScreen equivalent)
const MOBILE_NAV_SHEET_ID = 'mobile-nav-screen'

// Top nav comes from upstream's own shared.ts `nav`, generated into
// chrome.json on every content sync (see scripts/wiki/upstream.ts). It used to
// be a hand-copy, and had already drifted: it pointed Glossary at a dead
// rentry, Search at /search instead of /posts/search, and Bookmarks at the
// wrong repo. Deriving it means an upstream nav change just shows up.
type NavLink = { emoji: string; label: string; href: string; arrow?: boolean }

const isExternal = (href: string) => /^https?:\/\//.test(href)

const NAV_LINKS: NavLink[] = chrome.nav
  .filter((n) => !n.items?.length)
  .map((n) => ({
    emoji: n.emoji,
    label: n.label,
    href: n.href,
    arrow: isExternal(n.href),
  }))

// fmhy ecosystem menu, mirroring upstream shared.ts nav '🌱 Ecosystem'.
// internal where a route exists; the rest deep-link externally
type EcosystemItem = {
  emoji: string
  label: string
  href: string
  external?: boolean
}

const ECOSYSTEM_ITEMS: EcosystemItem[] = (
  chrome.nav.find((n) => n.items?.length)?.items ?? []
).map((item) => ({
  emoji: item.emoji,
  label: item.label,
  href: item.href,
  external: isExternal(item.href),
}))

// "Search" opens the live ⌘K modal instead of routing anywhere — desktop and
// mobile both need to special-case it out of the plain link-rendering loop
const isSearchItem = (item: EcosystemItem) => item.label === 'Search'

type SocialLink = {
  label: string
  href: string
  Icon: typeof GithubLogoIcon
}

// solid marks like fmhy.net's VPSocialLinks (simple-icons, filled)
const SOCIAL_LINKS: SocialLink[] = [
  { label: 'GitHub', href: GITHUB_URL, Icon: GithubSolidIcon as never },
  { label: 'Discord', href: DISCORD_INVITE_URL, Icon: DiscordSolidIcon as never },
  { label: 'Reddit', href: REDDIT_URL, Icon: RedditSolidIcon as never },
]

const Logo = () => (
  <Link href="/" aria-label="Home">
    <XStack items="center" gap="$2">
      {/* bare mark like fmhy.net's VPNavBarTitle img — the ico carries its own
          rounded black plate, so any tile background shows as a halo on themes
          whose surface isn't that exact black */}
      <YStack width={28} height={28} items="center" justify="center">
        <Image src={LOGO_SRC} width={28} height={28} alt="FMHY Logo" />
      </YStack>
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

// screen-reader-only label, mirroring VPNavBarMenu's visually-hidden
// "Main Navigation" span that its <nav aria-labelledby> points at
const VisuallyHiddenLabel = ({ id, children }: { id: string; children: string }) => (
  <VisuallyHidden id={id}>
    <SizableText>{children}</SizableText>
  </VisuallyHidden>
)

const NavTextLink = ({ emoji, label, href, arrow }: NavLink) => {
  const external = href.startsWith('http')
  const pathname = usePathname()
  const active = !external && pathname.startsWith(href)
  return (
    <Link
      href={href as never}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      <XStack items="center" gap="$1" opacity={active ? 1 : 0.85} hoverStyle={{ opacity: 1 }}>
        <SizableText fontFamily="$body" size="$3" color={active ? '$accent11' : '$color12'}>
          {emoji} {label}
        </SizableText>
        {arrow ? (
          <ArrowUpRightIcon size={11} color={active ? '$accent11' : '$color9'} />
        ) : null}
      </XStack>
    </Link>
  )
}

// render="a" when this row is the Link asChild target — see CircleLink
const EcosystemRowInner = ({ item, render }: { item: EcosystemItem; render?: 'a' }) => (
  <XStack
    render={render}
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
      <EcosystemRowInner item={item} render="a" />
    </Link>
  )
}

// VPFlyout port: opens on hover (mouseenter/mouseleave), stays click- and
// keyboard-operable (the trigger is a real button toggling aria-expanded),
// closes on Escape and when focus leaves the flyout
const EcosystemMenu = () => {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<TamaguiElement>(null)

  // close when keyboard focus moves outside the flyout (VPFlyout onBlur)
  useEffect(() => {
    // isWeb: on react-native rootRef.current is a native view with no
    // addEventListener, and `document` below doesn't exist
    if (!isWeb) return
    const node = rootRef.current as HTMLElement | null
    if (!node) return
    const onFocusOut = (e: FocusEvent) => {
      if (!node.contains(e.relatedTarget as Node | null)) setOpen(false)
    }
    node.addEventListener('focusout', onFocusOut)
    return () => node.removeEventListener('focusout', onFocusOut)
  }, [])

  // Escape closes, even when open via hover with focus elsewhere
  useEffect(() => {
    if (!isWeb || !open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <XStack
      ref={rootRef}
      position="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
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
        {...({ 'aria-haspopup': 'true' } as object)}
        aria-expanded={open}
        onPress={() => setOpen(!open)}
      >
        <SizableText fontFamily="$body" size="$3" color="$color12">
          🌱 Ecosystem
        </SizableText>
        <CaretDownIcon size={12} color="$color11" />
      </XStack>

      {/* .menu: fades in/out (opacity/visibility .25s), sits right under the
          trigger; the pt bridges the gap so hover isn't lost crossing it */}
      <YStack
        position="absolute"
        t="100%"
        r={0}
        z={100}
        pt="$2"
        opacity={open ? 1 : 0}
        style={{
          visibility: open ? 'visible' : 'hidden',
          transition: 'opacity 0.25s, visibility 0.25s',
        }}
      >
        <YStack
          bg="$color2"
          borderWidth={1}
          borderColor="$color5"
          rounded="$4"
          p="$2"
          gap="$0.5"
          width={240}
          // --vp-shadow-3
          style={{
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.1), 0 2px 6px rgba(0, 0, 0, 0.08)',
          }}
        >
          {ECOSYSTEM_ITEMS.map((item) => (
            <EcosystemRow key={item.label} item={item} />
          ))}
        </YStack>
      </YStack>
    </XStack>
  )
}

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
const HeaderSearchBox = () => {
  const hotkeyLabel = useSearchHotkeyLabel()
  return (
    <XStack
      render="button"
      onPress={openSearch}
      aria-label="Search"
      // DocSearch-Button: compact 40px pill, radius 8, bg-alt (not a wide
      // input box) — width hugs its content like fmhy.net's
      height={40}
      pl={12}
      pr={10}
      gap="$2"
      rounded={8}
      borderWidth={1}
      borderColor="transparent"
      bg="$color2"
      items="center"
      cursor="pointer"
      hoverStyle={{ bg: '$color3', borderColor: '$color6' }}
      pressStyle={{ bg: '$color4' }}
    >
      <MagnifyingGlassIcon size={15} color="$color8" />
      <SizableText text="left" size="$3" color="$color9">
        Search
      </SizableText>
      {/* bordered kbd-style badge, mirroring fmhy.net's boxed "Ctrl K" hint */}
      <SizableText
        size="$2"
        color="$color9"
        fontFamily="$body"
        letterSpacing={0.5}
        px="$1.5"
        py="$0.5"
        rounded="$2"
        bg="$color3"
        borderWidth={1}
        borderColor="$color6"
      >
        {hotkeyLabel}
      </SizableText>
    </XStack>
  )
}

// VPNavBarHamburger port: three 16x2 bars in a clipped 16x14 box, staggered at
// rest, sliding on hover, morphing into an X when active (top/bottom rotate,
// middle slides out of the clip box). geometry from the production theme css.
const NavBarHamburger = ({
  active,
  onPress,
}: {
  active: boolean
  onPress: () => void
}) => {
  const [hovered, setHovered] = useState(false)

  const bars = active
    ? [
        { top: 6, x: 0, deg: 225 },
        { top: 6, x: 16, deg: 0 },
        { top: 6, x: 0, deg: 135 },
      ]
    : hovered
      ? [
          { top: 0, x: 4, deg: 0 },
          { top: 6, x: 0, deg: 0 },
          { top: 12, x: 8, deg: 0 },
        ]
      : [
          { top: 0, x: 0, deg: 0 },
          { top: 6, x: 8, deg: 0 },
          { top: 12, x: 4, deg: 0 },
        ]

  return (
    <XStack
      render="button"
      aria-label="mobile navigation"
      aria-expanded={active}
      {...({ 'aria-controls': MOBILE_NAV_SHEET_ID } as object)}
      onPress={onPress}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      width={48}
      height={48}
      items="center"
      justify="center"
      bg="transparent"
      borderWidth={0}
      cursor="pointer"
    >
      <View position="relative" width={16} height={14} overflow="hidden">
        {bars.map((bar, i) => (
          <View
            key={i}
            position="absolute"
            l={0}
            t={bar.top}
            width={16}
            height={2}
            bg={active && hovered ? '$color11' : '$color12'}
            style={{
              transform: `translateX(${bar.x}px) rotate(${bar.deg}deg)`,
              transition:
                active && hovered
                  ? 'top 0.25s, background-color 0.25s, transform 0.25s'
                  : 'top 0.25s, background-color 0.5s, transform 0.25s',
            }}
          />
        ))}
      </View>
    </XStack>
  )
}

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
  // render="a" when this row is the Link asChild target — see CircleLink
  const inner = (
    <XStack
      render={href ? 'a' : undefined}
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
      <NavBarHamburger active={open} onPress={() => setOpen(!open)} />

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

        <Sheet.Frame id={MOBILE_NAV_SHEET_ID} bg="$color2" p="$4">
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
  // fmhy's VPNav: static bar on desktop; on mobile it hides on scroll-down and
  // returns on scroll-up. LocalNav follows the same state so the "On this
  // page" bar slides up to the viewport top when the header is away.
  const hidden = useMobileNavHidden()

  return (
    <>
      <ScrollHeader hidden={hidden}>
        <Container py="$2">
          <XStack testID="site-header" width="100%" items="center" gap="$3">
            {/* VPNavBar.has-sidebar: the title block spans the sidebar column
                (272px) so the search button starts at the content column */}
            <XStack $xl={{ width: 272, shrink: 0 }} items="center">
              <Logo />
            </XStack>

            {/* wide only: search button at the content column start */}
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

            {/* lg+ : nav links + ecosystem in a labelled <nav> (VPNavBarMenu),
                then theme + socials beside it */}
            <XStack display="none" $lg={{ display: 'flex' }} gap="$4" items="center">
              <XStack
                render="nav"
                {...({ 'aria-labelledby': 'main-nav-aria-label' } as object)}
                gap="$4"
                items="center"
              >
                <VisuallyHiddenLabel id="main-nav-aria-label">
                  Main Navigation
                </VisuallyHiddenLabel>
                {NAV_LINKS.map((l) => (
                  <NavTextLink key={l.label} {...l} />
                ))}
                <EcosystemMenu />
              </XStack>
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

      {/* mobile/tablet "On this page" sub-bar (VPLocalNav) — rendered from the
          header so it shares the scroll-hide state; sticky below the bar */}
      <LocalNav navHidden={hidden} />
    </>
  )
}
