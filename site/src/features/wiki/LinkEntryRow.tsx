import { Fragment, memo, useState, type ComponentProps, type ReactNode } from 'react'
import { Paragraph, Tooltip, YStack } from 'tamagui'

import { Link } from '~/components/Link'
import { TooltipSimple } from '~/components/TooltipSimple'
import { DiscordLogoIcon } from '~/icons/phosphor/DiscordLogoIcon'
import { GithubLogoIcon } from '~/icons/phosphor/GithubLogoIcon'
import { GitlabLogoIcon } from '~/icons/phosphor/GitlabLogoIcon'
import { RedditLogoIcon } from '~/icons/phosphor/RedditLogoIcon'
import { TelegramLogoIcon } from '~/icons/phosphor/TelegramLogoIcon'
import { WarningCircleIcon } from '~/icons/phosphor/WarningCircleIcon'
import { XLogoIcon } from '~/icons/phosphor/XLogoIcon'
import { TwemojiIcon, TWEMOJI_CODES } from '~/icons/TwemojiIcon'
import { AndroidIcon } from '~/icons/wiki/AndroidIcon'
import { IosIcon } from '~/icons/wiki/IosIcon'
import { LinuxIcon } from '~/icons/wiki/LinuxIcon'
import { MacIcon } from '~/icons/wiki/MacIcon'
import { SourceCodeIcon } from '~/icons/wiki/SourceCodeIcon'
import { TorBrowserIcon } from '~/icons/wiki/TorBrowserIcon'
import { WebIcon } from '~/icons/wiki/WebIcon'
import { WindowsIcon } from '~/icons/wiki/WindowsIcon'
import { Text } from '~/interface/text/Text'

import { InlineMarkdown } from './InlineMarkdown'
import { loadNote } from './notes'
import { openExternal } from './openExternal'
import { toPlatformWikiRoute } from './routes'

import type { WikiAlternative, WikiEntry, WikiNote, WikiSubLink } from './types'
import type { Href } from 'one'
import type { IconComponent } from '~/icons/types'

const SUB_LINK_ICONS: Record<string, IconComponent> = {
  discord: DiscordLogoIcon,
  github: GithubLogoIcon,
  gitlab: GitlabLogoIcon,
  telegram: TelegramLogoIcon,
  reddit: RedditLogoIcon,
  x: XLogoIcon,
  onion: TorBrowserIcon,
  source: SourceCodeIcon,
}

// fmhy.net tooltip text per icon sub-link (transformer.ts v-tooltip values) —
// every label maps to itself except [Subreddit], whose tooltip reads 'Reddit'
const iconTooltipLabel = (label: string) => (label === 'Subreddit' ? 'Reddit' : label)

// platform indicator icons trailing an entry (upstream transformer.ts
// "Platform indicators" rules — same iconify glyphs, same tooltip labels)
const PLATFORM_ICONS: Record<string, { label: string; Icon: IconComponent }> = {
  windows: { label: 'Windows', Icon: WindowsIcon },
  mac: { label: 'Mac', Icon: MacIcon },
  linux: { label: 'Linux', Icon: LinuxIcon },
  android: { label: 'Android', Icon: AndroidIcon },
  ios: { label: 'iOS', Icon: IosIcon },
  web: { label: 'Web', Icon: WebIcon },
}

// $platform-web overrides that drop Link.tsx's inherit pins so the chosen
// props win on web. each variant inherits only what should flow from the line.
const INHERIT_SIZE = { fontSize: 'inherit', lineHeight: 'inherit' } as const
const INHERIT_SIZE_WEIGHT = {
  fontSize: 'inherit',
  fontWeight: 'inherit',
  lineHeight: 'inherit',
} as const
const INHERIT_WEIGHT = { fontWeight: 'inherit', lineHeight: 'inherit' } as const

function hostnameOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

// wraps an svg so it rides the text baseline within the flowing line (NoteLink
// trick). rest props are forwarded so tooltip triggers can attach handlers.
const InlineIcon = ({
  children,
  ...rest
}: { children: ReactNode } & ComponentProps<typeof Text>) => (
  <Text
    render="span"
    tag="span"
    display="inline-flex"
    style={{ verticalAlign: '-0.15em' }}
    {...rest}
  >
    {children}
  </Text>
)

// colorful twemoji markers, exactly like fmhy.net (transformer.ts rewrites
// ⭐→:star:, 🌐→:globe-with-meridians:, ↪→:repeat-button: and emoji.ts
// renders them as i-twemoji-* spans)
const MARKER_TWEMOJI: Record<string, string> = {
  starred: TWEMOJI_CODES.star,
  index: TWEMOJI_CODES.globeWithMeridians,
  crossref: TWEMOJI_CODES.repeatButton,
}

const MarkerIcon = ({ marker }: { marker: WikiEntry['marker'] }) => {
  const code = marker ? MARKER_TWEMOJI[marker] : undefined
  return code ? <TwemojiIcon code={code} size={14} /> : null
}

// fmhy.net's link mechanic (upstream style.scss .vp-doc a): constant brand
// color; the underline is always present but transparent and fades in on
// hover via text-decoration-color, offset 4px below the baseline. A plain CSS
// class (root.css .vp-link-reveal): the tamagui textDecorationColor prop
// leaked onto the DOM as an unknown attribute (React warning), and an inline
// style could never be overridden by the :hover rule.
const underlineRevealProps = {
  className: 'vp-link-reveal',
} as const

// fmhy.net's primary name: constant blue rgb(120,179,226); bold only when the
// source wraps it in ** (entry.bold — most entries are 500-weight like
// vitepress's `.vp-doc a`, bolded via `#VPContent strong > a`)
const NameLink = ({
  title,
  url,
  crossrefRoute,
  bold = false,
}: {
  title: string
  url: string | null
  crossrefRoute?: string | null
  bold?: boolean
}) => {
  const weight = bold ? '700' : '500'

  if (crossrefRoute) {
    return (
      <Link
        href={crossrefRoute as Href}
        color="$accent11"
        fontWeight={weight}
        {...underlineRevealProps}
        $platform-web={INHERIT_SIZE}
        aria-label={title}
      >
        {title}
      </Link>
    )
  }

  // no link target — a plain bold name, not a dead blue link
  if (!url) {
    return (
      <Text render="strong" fontWeight={weight} color="$color12">
        {title}
      </Text>
    )
  }

  return (
    <Link
      href={url as Href}
      target="_blank"
      rel="noopener noreferrer"
      color="$accent11"
      fontWeight={weight}
      {...underlineRevealProps}
      $platform-web={INHERIT_SIZE}
      aria-label={title}
      onPress={(e) => {
        e.preventDefault()
        openExternal(url)
      }}
    >
      {title}
    </Link>
  )
}

// small superscript "[2] [3]" mirror links trailing the name
const MirrorLink = ({ url, index }: { url: string; index: number }) => (
  <Link
    href={url as Href}
    fontSize={12}
    color="$accent11"
    {...underlineRevealProps}
    $platform-web={INHERIT_WEIGHT}
    style={{ verticalAlign: 'super' }}
    aria-label={`Mirror ${index}`}
    onPress={(e) => {
      e.preventDefault()
      openExternal(url)
    }}
  >
    [{index}]
  </Link>
)

// shared blue text-link style for sub-links (regular weight, same constant
// color + underline-reveal hover as every other wiki link)
const subLinkProps = {
  color: '$accent11',
  ...underlineRevealProps,
  '$platform-web': INHERIT_SIZE_WEIGHT,
} as const

const IconSubLink = ({ link, Icon }: { link: WikiSubLink; Icon: IconComponent }) => {
  const route = toPlatformWikiRoute(link.route)
  const icon = <Icon size={14} color="$accent11" />
  const tooltip = iconTooltipLabel(link.label)

  if (route) {
    return (
      <TooltipSimple label={tooltip}>
        <Link
          href={route as Href}
          display="inline-flex"
          style={{ verticalAlign: '-0.15em' }}
          aria-label={tooltip}
        >
          {icon}
        </Link>
      </TooltipSimple>
    )
  }

  return (
    <TooltipSimple label={tooltip}>
      <Link
        href={link.url as Href}
        display="inline-flex"
        style={{ verticalAlign: '-0.15em' }}
        aria-label={tooltip}
        onPress={(e) => {
          e.preventDefault()
          openExternal(link.url)
        }}
      >
        {icon}
      </Link>
    </TooltipSimple>
  )
}

// plain (non-link) platform indicators at the entry tail with tooltips, like
// fmhy.net's v-tooltip divs — several platforms sit space-separated after one
// " / " separator, mirroring upstream's transformed markup
const PlatformIndicators = ({ platforms }: { platforms: string[] }) => (
  <>
    {platforms.map((token, index) => {
      const platform = PLATFORM_ICONS[token]
      if (!platform) {
        return null
      }
      return (
        <Fragment key={token}>
          {index > 0 && ' '}
          <TooltipSimple label={platform.label}>
            <InlineIcon aria-label={platform.label}>
              <platform.Icon size={14} />
            </InlineIcon>
          </TooltipSimple>
        </Fragment>
      )
    })}
  </>
)

// vitepress note sub-links have no toast on web, so reveal the note in a lazy tooltip
const NoteSubLink = ({
  noteId,
  label,
  Icon,
}: {
  noteId: string
  label: string
  Icon?: IconComponent
}) => {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle')
  const [note, setNote] = useState<WikiNote | null>(null)

  return (
    <Tooltip
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next && status === 'idle') {
          setStatus('loading')
          void loadNote(noteId).then((resolved) => {
            setNote(resolved)
            setStatus('done')
          })
        }
      }}
      placement="top"
      delay={{ open: 120, close: 120 }}
      restMs={120}
      allowFlip
    >
      <Tooltip.Trigger asChild="except-style">
        <Text
          render="span"
          tag="span"
          display="inline-flex"
          cursor="pointer"
          color="$accent11"
          hoverStyle={{ color: '$accent12', textDecorationLine: 'underline' }}
          style={Icon ? { verticalAlign: '-0.15em' } : undefined}
          aria-label={label}
        >
          {Icon ? <Icon size={14} color="$accent11" /> : label}
        </Text>
      </Tooltip.Trigger>

      <Tooltip.Content
        maxW={360}
        p="$3"
        bg="$color2"
        borderWidth={2}
        borderColor="$color4"
        rounded="$4"
        z={100000}
        enterStyle={{ y: -4, opacity: 0 }}
        exitStyle={{ y: -4, opacity: 0 }}
        // @ts-ignore css-only config lacks animation types (same pattern as NoteLink.tsx)
        animation="quick"
      >
        <Tooltip.Arrow size="$3" borderWidth={1} borderColor="$color4" />
        <YStack gap="$1.5" maxW={336} maxH={320} overflow="hidden">
          {status === 'loading' && (
            <Text size="$2" fontFamily="$mono" color="$color10">
              Loading note…
            </Text>
          )}
          {status === 'done' && note && (
            <>
              {!!note.title && (
                <Text size="$3" fontWeight="700" color="$color12">
                  {note.title}
                </Text>
              )}
              <Text size="$2" lineHeight={18} color="$color11">
                <InlineMarkdown markdown={note.markdown} />
              </Text>
            </>
          )}
          {status === 'done' && !note && (
            <Text size="$2" color="$color10">
              Note unavailable.
            </Text>
          )}
        </YStack>
      </Tooltip.Content>
    </Tooltip>
  )
}

const SubLink = ({ link }: { link: WikiSubLink }) => {
  const Icon = link.icon ? SUB_LINK_ICONS[link.icon] : undefined

  // note sub-link: lazy tooltip trigger (icon when known, else the label text)
  if (link.noteId) {
    return <NoteSubLink noteId={link.noteId} label={link.label} Icon={Icon} />
  }

  // known platform icon renders as the link itself
  if (Icon) {
    return <IconSubLink link={link} Icon={Icon} />
  }

  // reddit-wiki cross-references resolve to in-app routes
  const route = toPlatformWikiRoute(link.route)
  if (route) {
    return (
      <Link href={route as Href} {...subLinkProps}>
        {link.label}
      </Link>
    )
  }

  return (
    <Link
      href={link.url as Href}
      target="_blank"
      {...subLinkProps}
      onPress={(e) => {
        e.preventDefault()
        openExternal(link.url)
      }}
    >
      {link.label}
    </Link>
  )
}

const AlternativeInline = ({ alternative }: { alternative: WikiAlternative }) => (
  <>
    {' '}
    <Text color="$color11">or</Text>{' '}
    <NameLink
      title={alternative.title}
      url={alternative.url}
      crossrefRoute={toPlatformWikiRoute(alternative.route)}
      bold={alternative.bold}
    />
    {alternative.mirrors.map((mirror, index) => (
      <Fragment key={mirror}>
        {' '}
        <MirrorLink url={mirror} index={index + 2} />
      </Fragment>
    ))}
  </>
)

export const LinkEntryRow = memo(
  ({ entry, unsafe = false }: { entry: WikiEntry; unsafe?: boolean }) => {
    const title = entry.title ?? entry.url ?? ''
    // every resolvable reddit-wiki crossref navigates in-app, like fmhy.net
    const crossrefRoute = unsafe ? null : toPlatformWikiRoute(entry.crossrefRoute)
    // unsafe-page style entries: nothing to open, render as a plain warning
    const isWarningOnly =
      unsafe || (!entry.url && entry.links.length === 0 && !crossrefRoute)
    const showMarker = isWarningOnly || entry.marker !== null

    // everything after the name flows inline: description first (if any), then the
    // unsafe evidence host or each sub-link. fmhy.net joins the first part with
    // " - " and every following part with " / "
    const tail: ReactNode[] = []
    if (entry.description) {
      tail.push(<InlineMarkdown markdown={entry.description} />)
    }
    if (unsafe && entry.url) {
      tail.push(
        <SubLink
          link={{
            label: hostnameOf(entry.url),
            url: entry.url,
            icon: null,
            noteId: null,
            route: null,
          }}
        />
      )
    }
    if (!unsafe) {
      for (const link of entry.links) {
        tail.push(<SubLink link={link} />)
      }
      if (entry.platforms.length > 0) {
        tail.push(<PlatformIndicators platforms={entry.platforms} />)
      }
    }

    return (
      <Paragraph size="$5" lineHeight={26} color="$color11" my={0} py="$1">
        {showMarker && (
          <>
            <InlineIcon>
              {isWarningOnly ? (
                <WarningCircleIcon
                  size={14}
                  color={unsafe ? '$dangerText' : '$warnText'}
                />
              ) : (
                <MarkerIcon marker={entry.marker} />
              )}
            </InlineIcon>{' '}
          </>
        )}

        {unsafe ? (
          // never a clickable recommendation — bold plain text only
          <Text render="strong" fontWeight="700" color="$color12">
            {title}
          </Text>
        ) : (
          <NameLink
            title={title}
            url={entry.url}
            crossrefRoute={crossrefRoute}
            bold={entry.bold}
          />
        )}

        {entry.mirrors.map((mirror, index) => (
          <Fragment key={mirror}>
            {' '}
            <MirrorLink url={mirror} index={index + 2} />
          </Fragment>
        ))}

        {entry.alternatives.map((alternative) => (
          <AlternativeInline key={alternative.title} alternative={alternative} />
        ))}

        {tail.map((node, index) => (
          <Fragment key={index}>
            {index === 0 ? ' - ' : ' / '}
            {node}
          </Fragment>
        ))}
      </Paragraph>
    )
  }
)
