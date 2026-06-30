import { memo, useState, type ReactNode } from 'react'
import { styled, Tooltip, XStack, YStack } from 'tamagui'

import { Link } from '~/components/Link'
import { TooltipSimple } from '~/components/TooltipSimple'
import { ArrowBendUpRightIcon } from '~/icons/phosphor/ArrowBendUpRightIcon'
import { CopyIcon } from '~/icons/phosphor/CopyIcon'
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

import { copyText } from './clipboard'
import { InlineMarkdown } from './InlineMarkdown'
import { loadNote } from './notes'
import { openExternal } from './openExternal'
import { toPlatformWikiRoute } from './routes'

import type { IconComponent } from '~/icons/types'
import type { Href } from 'one'
import type { WikiAlternative, WikiEntry, WikiNote, WikiSubLink } from './types'

const SUB_LINK_ICONS: Record<string, IconComponent> = {
  discord: DiscordLogoIcon,
  github: GithubLogoIcon,
  gitlab: GitlabLogoIcon,
  telegram: TelegramLogoIcon,
  reddit: RedditLogoIcon,
  x: XLogoIcon,
}

function hostnameOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

// small pill used for mirror numbers, sub-link icons/labels, evidence and copy
const Chip = styled(XStack, {
  items: 'center',
  justify: 'center',
  gap: '$1',
  height: 18,
  minWidth: 18,
  px: 5,
  rounded: '$3',
  borderWidth: 1,
  borderColor: '$color6',
  bg: '$color2',
  cursor: 'pointer',
  hoverStyle: { bg: '$color4', borderColor: '$color8' },
  pressStyle: { bg: '$color3' },
})

const ChipLabel = ({ children }: { children: ReactNode }) => (
  <Text fontFamily="$mono" fontSize={11} lineHeight={14} color="$color11">
    {children}
  </Text>
)

const MirrorChips = ({ mirrors, offset = 2 }: { mirrors: string[]; offset?: number }) => {
  if (mirrors.length === 0) return null
  return (
    <>
      {mirrors.map((mirror, index) => (
        <TooltipSimple key={mirror} label={`Mirror ${index + offset}`}>
          <Chip
            render="button"
            aria-label={`Mirror ${index + offset}`}
            onPress={() => openExternal(mirror)}
          >
            <ChipLabel>{String(index + offset)}</ChipLabel>
          </Chip>
        </TooltipSimple>
      ))}
    </>
  )
}

// vitepress note sub-links have no toast on web, so reveal the note in a lazy tooltip
const NoteChip = ({
  noteId,
  label,
  children,
}: {
  noteId: string
  label: string
  children: ReactNode
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
        <Chip render="button" aria-label={label}>
          {children}
        </Chip>
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

const SubLinkChip = ({ link }: { link: WikiSubLink }) => {
  const Icon = link.icon ? SUB_LINK_ICONS[link.icon] : undefined
  // reddit-wiki cross-references resolve to in-app routes
  const route = link.noteId ? null : toPlatformWikiRoute(link.route)

  const inner = Icon ? <Icon size={12} color="$color11" /> : <ChipLabel>{link.label}</ChipLabel>

  if (link.noteId) {
    return (
      <NoteChip noteId={link.noteId} label={link.label}>
        {inner}
      </NoteChip>
    )
  }

  if (route) {
    return (
      <TooltipSimple label={link.label}>
        <Link asChild href={route as Href} aria-label={link.label}>
          <Chip>{inner}</Chip>
        </Link>
      </TooltipSimple>
    )
  }

  return (
    <TooltipSimple label={link.label}>
      <Chip render="button" aria-label={link.label} onPress={() => openExternal(link.url)}>
        {inner}
      </Chip>
    </TooltipSimple>
  )
}

const TitleLink = ({
  title,
  url,
  bold,
  crossrefRoute,
}: {
  title: string
  url: string | null
  bold: boolean
  crossrefRoute?: string | null
}) => {
  const weight = bold ? '700' : '500'

  // the inner Text carries the styling so it survives Link's $platform-web inherit pins
  if (crossrefRoute) {
    return (
      <Link href={crossrefRoute as Href} aria-label={title}>
        <Text size="$4" fontWeight={weight} color="$color12" hoverStyle={{ color: '$accent11' }}>
          {title}
        </Text>
      </Link>
    )
  }

  if (!url) {
    return (
      <Text size="$4" fontWeight={weight} color="$color12">
        {title}
      </Text>
    )
  }

  return (
    <Link href={url as Href} target="_blank" rel="noopener noreferrer" aria-label={title}>
      <Text size="$4" fontWeight={weight} color="$color12" hoverStyle={{ color: '$accent11' }}>
        {title}
      </Text>
    </Link>
  )
}

const AlternativeInline = ({ alternative }: { alternative: WikiAlternative }) => (
  <>
    <Text size="$3" color="$color10">
      or
    </Text>
    <TitleLink
      title={alternative.title}
      url={alternative.url}
      bold={alternative.bold}
      crossrefRoute={toPlatformWikiRoute(alternative.route)}
    />
    <MirrorChips mirrors={alternative.mirrors} />
  </>
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

export const LinkEntryRow = memo(
  ({ entry, unsafe = false }: { entry: WikiEntry; unsafe?: boolean }) => {
    const title = entry.title ?? entry.url ?? ''
    // every resolvable reddit-wiki crossref navigates in-app, like fmhy.net
    const crossrefRoute = unsafe ? null : toPlatformWikiRoute(entry.crossrefRoute)
    // unsafe-page style entries: nothing to open, render as a plain warning
    const isWarningOnly =
      unsafe || (!entry.url && entry.links.length === 0 && !crossrefRoute)

    return (
      <YStack py="$2" gap="$1">
        <XStack items="center" gap="$2" flexWrap="wrap">
          {isWarningOnly ? (
            <WarningCircleIcon size={14} color={unsafe ? '$dangerText' : '$warnText'} />
          ) : (
            <MarkerIcon marker={entry.marker} />
          )}

          {unsafe ? (
            // never a clickable recommendation — bold plain text only
            <Text size="$4" fontWeight="700" color="$color12">
              {title}
            </Text>
          ) : (
            <TitleLink
              title={title}
              url={entry.url}
              bold={entry.bold}
              crossrefRoute={crossrefRoute}
            />
          )}

          {unsafe && !!entry.url && (
            <TooltipSimple label={entry.url}>
              <Chip
                render="button"
                aria-label={`Evidence: ${hostnameOf(entry.url)}`}
                onPress={() => openExternal(entry.url!)}
              >
                <ChipLabel>{hostnameOf(entry.url)}</ChipLabel>
              </Chip>
            </TooltipSimple>
          )}

          <MirrorChips mirrors={entry.mirrors} />

          {entry.alternatives.map((alternative) => (
            <AlternativeInline key={alternative.title} alternative={alternative} />
          ))}

          {entry.links.map((link, index) => (
            <SubLinkChip key={`${link.url}-${index}`} link={link} />
          ))}

          {!!entry.url && (
            <TooltipSimple label="Copy link">
              <Chip
                render="button"
                aria-label="Copy link"
                bg="transparent"
                borderColor="transparent"
                hoverStyle={{ bg: '$color4' }}
                onPress={() => void copyText(entry.url!)}
              >
                <CopyIcon size={12} color="$color10" />
              </Chip>
            </TooltipSimple>
          )}
        </XStack>

        {!!entry.description && (
          <Text size="$3" color="$color10" pl="$5">
            <InlineMarkdown markdown={entry.description} />
          </Text>
        )}
      </YStack>
    )
  },
)
