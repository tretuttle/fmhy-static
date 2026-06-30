import { Fragment, memo, useState, type ReactNode } from 'react'
import { Paragraph, Tooltip, YStack } from 'tamagui'

import { Link } from '~/components/Link'
import { ArrowBendUpRightIcon } from '~/icons/phosphor/ArrowBendUpRightIcon'
import { DiscordLogoIcon } from '~/icons/phosphor/DiscordLogoIcon'
import { GithubLogoIcon } from '~/icons/phosphor/GithubLogoIcon'
import { GitlabLogoIcon } from '~/icons/phosphor/GitlabLogoIcon'
import { GlobeIcon } from '~/icons/phosphor/GlobeIcon'
import { RedditLogoIcon } from '~/icons/phosphor/RedditLogoIcon'
import { StarIcon } from '~/icons/phosphor/StarIcon'
import { TelegramLogoIcon } from '~/icons/phosphor/TelegramLogoIcon'
import { WarningCircleIcon } from '~/icons/phosphor/WarningCircleIcon'
import { XLogoIcon } from '~/icons/phosphor/XLogoIcon'
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

// wraps an svg so it rides the text baseline within the flowing line (NoteLink trick)
const InlineIcon = ({ children }: { children: ReactNode }) => (
  <Text
    render="span"
    tag="span"
    display="inline-flex"
    style={{ verticalAlign: '-0.15em' }}
  >
    {children}
  </Text>
)

const MarkerIcon = ({ marker }: { marker: WikiEntry['marker'] }) => {
  switch (marker) {
    case 'starred':
      return <StarIcon size={14} color="$gold" />
    case 'index':
      return <GlobeIcon size={14} color="$color10" />
    case 'crossref':
      return <ArrowBendUpRightIcon size={14} color="$color10" />
    case null:
      return null
  }
}

// fmhy.net's primary name: blue rgb(120,179,226), bold, underlined
const NameLink = ({
  title,
  url,
  crossrefRoute,
  bold = true,
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
        textDecorationLine="underline"
        hoverStyle={{ color: '$accent12' }}
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
      textDecorationLine="underline"
      hoverStyle={{ color: '$accent12' }}
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
    textDecorationLine="none"
    hoverStyle={{ color: '$accent12', textDecorationLine: 'underline' }}
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

// shared blue text-link style for sub-links (regular weight, underline on hover)
const subLinkProps = {
  color: '$accent11',
  textDecorationLine: 'none',
  hoverStyle: { color: '$accent12', textDecorationLine: 'underline' },
  '$platform-web': INHERIT_SIZE_WEIGHT,
} as const

const IconSubLink = ({ link, Icon }: { link: WikiSubLink; Icon: IconComponent }) => {
  const route = toPlatformWikiRoute(link.route)
  const icon = <Icon size={14} color="$accent11" />

  if (route) {
    return (
      <Link
        href={route as Href}
        display="inline-flex"
        style={{ verticalAlign: '-0.15em' }}
        hoverStyle={{ opacity: 0.7 }}
        aria-label={link.label}
      >
        {icon}
      </Link>
    )
  }

  return (
    <Link
      href={link.url as Href}
      display="inline-flex"
      style={{ verticalAlign: '-0.15em' }}
      hoverStyle={{ opacity: 0.7 }}
      aria-label={link.label}
      onPress={(e) => {
        e.preventDefault()
        openExternal(link.url)
      }}
    >
      {icon}
    </Link>
  )
}

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
          <NameLink title={title} url={entry.url} crossrefRoute={crossrefRoute} />
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
