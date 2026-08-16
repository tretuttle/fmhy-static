import { Fragment, memo, useState, type ReactNode } from 'react'
import { Tooltip, YStack } from 'tamagui'

import { NoteLink } from '~/components/NoteLink'
import { TwemojiIcon, TWEMOJI_CODES } from '~/icons/TwemojiIcon'
import { Text } from '~/interface/text/Text'

import {
  AndroidEntrySvg,
  DiscordLogoEntrySvg,
  GithubLogoEntrySvg,
  GitlabLogoEntrySvg,
  InfoEntrySvg,
  IosEntrySvg,
  LinuxEntrySvg,
  MacEntrySvg,
  RedditLogoEntrySvg,
  SourceCodeEntrySvg,
  TelegramLogoEntrySvg,
  TorBrowserEntrySvg,
  WarningCircleEntrySvg,
  WebEntrySvg,
  WindowsEntrySvg,
  XLogoEntrySvg,
  type EntryIcon,
} from './entryIcons'
import { InlineImage } from './InlineImage'
import { InlineMarkdown, parseInlineMarkdown } from './InlineMarkdown'
import { loadNote, parseNoteLink } from './notes'
import { toPlatformWikiRoute } from './routes'

import type { WikiAlternative, WikiEntry, WikiNote, WikiSubLink } from './types'

// FLATTENED ROWS (perf): ~900 entries per big wiki page made the old
// tamagui-per-element markup the whole performance story - ~1.4MB of atomic
// class attributes in the SSG HTML and a >1s hydration block (a Link component
// with a useDebounce hook per anchor, a Tooltip.Trigger per icon). Rows now
// render plain <p>/<a>/<span> with the wk-* classes in root.css (same resolved
// styles, written once), external links are native anchors (target=_blank +
// rel severs the opener exactly like openExternal did), in-app links carry
// data-spa and WikiSectionList's single delegated click handler does the SPA
// navigation, and static icon tooltips are the pure-css wk-tip bubble. Only
// note tooltips (lazy-loaded content, a handful per page) stay as components.
//
// TODO(native): plain DOM is web-only, same as WikiSectionList's
// raw-div Anchor - native needs a LinkEntryRow.native fork when that lands.

const SUB_LINK_ICONS: Record<string, EntryIcon> = {
  discord: DiscordLogoEntrySvg,
  github: GithubLogoEntrySvg,
  gitlab: GitlabLogoEntrySvg,
  telegram: TelegramLogoEntrySvg,
  reddit: RedditLogoEntrySvg,
  x: XLogoEntrySvg,
  onion: TorBrowserEntrySvg,
  source: SourceCodeEntrySvg,
}

// fmhy.net tooltip text per icon sub-link (transformer.ts v-tooltip values) —
// every label maps to itself except [Subreddit], whose tooltip reads 'Reddit'
const iconTooltipLabel = (label: string) => (label === 'Subreddit' ? 'Reddit' : label)

// platform indicator icons trailing an entry (upstream transformer.ts
// "Platform indicators" rules — same iconify glyphs, same tooltip labels)
const PLATFORM_ICONS: Record<string, { label: string; Icon: EntryIcon }> = {
  windows: { label: 'Windows', Icon: WindowsEntrySvg },
  mac: { label: 'Mac', Icon: MacEntrySvg },
  linux: { label: 'Linux', Icon: LinuxEntrySvg },
  android: { label: 'Android', Icon: AndroidEntrySvg },
  ios: { label: 'iOS', Icon: IosEntrySvg },
  web: { label: 'Web', Icon: WebEntrySvg },
}

function hostnameOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

// colorful twemoji markers, exactly like fmhy.net (transformer.ts rewrites
// ⭐→:star:, 🌐→:globe-with-meridians:, ↪→:repeat-button: and emoji.ts
// renders them as i-twemoji-* spans)
const MARKER_TWEMOJI: Record<string, string> = {
  starred: TWEMOJI_CODES.star,
  index: TWEMOJI_CODES.globeWithMeridians,
  crossref: TWEMOJI_CODES.repeatButton,
}

// fmhy.net's primary name: constant blue, 500-weight like vitepress's
// `.vp-doc a`, bold only when the source wraps it in ** (entry.bold)
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
  const className = bold ? 'wk-name wk-bold' : 'wk-name'

  if (crossrefRoute) {
    return (
      <a className={className} href={crossrefRoute} data-spa="">
        {title}
      </a>
    )
  }

  // no link target — a plain bold name, not a dead blue link
  if (!url) {
    return <strong className={bold ? 'wk-name-text wk-bold' : 'wk-name-text'}>{title}</strong>
  }

  return (
    <a className={className} href={url} target="_blank" rel="noopener noreferrer">
      {title}
    </a>
  )
}

// small superscript "[2] [3]" mirror links trailing the name
const MirrorLink = ({ url, index }: { url: string; index: number }) => (
  <a
    className="wk-mirror"
    href={url}
    target="_blank"
    rel="noopener noreferrer"
    aria-label={`Mirror ${index}`}
  >
    [{index}]
  </a>
)

// vitepress note sub-links have no toast on web, so reveal the note in a lazy
// tooltip. the one stateful row piece that stays a component (content loads on
// hover) — a handful per page, so its tamagui weight doesn't matter.
const NoteSubLink = ({
  noteId,
  label,
  Icon,
}: {
  noteId: string
  label: string
  Icon?: EntryIcon
}) => {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle')
  const [note, setNote] = useState<WikiNote | null>(null)

  const TriggerIcon = Icon ?? InfoEntrySvg

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
          style={{ verticalAlign: '-0.15em' }}
          aria-label={label}
        >
          <TriggerIcon />
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

  const route = toPlatformWikiRoute(link.route)

  // known platform icon renders as the link itself, tooltip is the css bubble
  if (Icon) {
    const tooltip = iconTooltipLabel(link.label)
    return route ? (
      <a className="wk-icon wk-tip" data-tip={tooltip} aria-label={tooltip} href={route} data-spa="">
        <Icon />
      </a>
    ) : (
      <a
        className="wk-icon wk-tip"
        data-tip={tooltip}
        aria-label={tooltip}
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
      >
        <Icon />
      </a>
    )
  }

  // reddit-wiki cross-references resolve to in-app routes
  if (route) {
    return (
      <a href={route} data-spa="">
        {link.label}
      </a>
    )
  }

  return (
    <a href={link.url} target="_blank" rel="noopener noreferrer">
      {link.label}
    </a>
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
          <span className="wk-icon wk-tip" data-tip={platform.label} aria-label={platform.label}>
            <platform.Icon />
          </span>
        </Fragment>
      )
    })}
  </>
)

// flattened sibling of InlineMarkdown for entry descriptions: same span parse,
// plain elements out. notices/blockquotes/notes keep the tamagui renderer (they
// carry per-context link colors); note links still get the NoteLink tooltip.
const InlineMarkdownFlat = ({ markdown }: { markdown: string }) => (
  <>
    {parseInlineMarkdown(markdown).map((span, index) => {
      switch (span.kind) {
        case 'code':
          return (
            <code key={index} className="wk-code">
              {span.text}
            </code>
          )
        case 'image':
          return (
            <InlineImage key={index} src={span.src} alt={span.alt} width={span.width} />
          )
        case 'link': {
          if (parseNoteLink(span.url)) {
            return (
              <NoteLink key={index} href={span.url}>
                {span.text}
              </NoteLink>
            )
          }
          const className = span.bold ? 'wk-bold' : undefined
          if (span.url.startsWith('/')) {
            const route = toPlatformWikiRoute(span.url)
            if (route) {
              return (
                <a key={index} className={className} href={route} data-spa="">
                  {span.text}
                </a>
              )
            }
            // no route target — keep the text, drop the dead link
            return (
              <span key={index} className={span.bold ? 'wk-accent wk-bold' : 'wk-accent'}>
                {span.text}
              </span>
            )
          }
          return (
            <a
              key={index}
              className={className}
              href={span.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {span.text}
            </a>
          )
        }
        case 'text':
          return span.bold ? (
            <strong key={index}>{span.text}</strong>
          ) : (
            <Fragment key={index}>{span.text}</Fragment>
          )
      }
    })}
  </>
)

const AlternativeInline = ({ alternative }: { alternative: WikiAlternative }) => (
  <>
    {' or '}
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
    const markerCode = entry.marker ? MARKER_TWEMOJI[entry.marker] : undefined

    // everything after the name flows inline: description first (if any), then the
    // unsafe evidence host or each sub-link. fmhy.net joins the first part with
    // " - " and every following part with " / "
    const tail: ReactNode[] = []
    if (entry.description) {
      tail.push(<InlineMarkdownFlat markdown={entry.description} />)
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
      // display: list-item — the disc marker every row wears comes from css
      // (vitepress renders these as real <li>s); marker emoji follow the disc
      <p className="wk-entry">
        {showMarker ? (
          <>
            <span className={isWarningOnly ? (unsafe ? 'wk-icon wk-danger' : 'wk-icon wk-warn') : 'wk-icon'}>
              {isWarningOnly ? (
                <WarningCircleEntrySvg />
              ) : markerCode ? (
                <TwemojiIcon code={markerCode} size={19} />
              ) : null}
            </span>{' '}
          </>
        ) : null}
        {unsafe ? (
          // never a clickable recommendation — bold plain text only
          <strong className="wk-name-text wk-bold">{title}</strong>
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
      </p>
    )
  }
)
