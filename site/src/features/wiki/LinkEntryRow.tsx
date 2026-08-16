import { memo, useState, type ReactNode } from 'react'
import { Tooltip, YStack } from 'tamagui'

import { TwemojiIcon, TWEMOJI_CODES } from '~/icons/TwemojiIcon'
import { Text } from '~/interface/text/Text'

import {
  BlueskyEntrySvg,
  DiscordLogoEntrySvg,
  GithubLogoEntrySvg,
  GitlabLogoEntrySvg,
  InfoFilledEntrySvg,
  MastodonEntrySvg,
  RedditLogoEntrySvg,
  SourceCodeEntrySvg,
  TelegramLogoEntrySvg,
  TorBrowserEntrySvg,
  WarningCircleEntrySvg,
  XLogoEntrySvg,
  AndroidEntrySvg,
  IosEntrySvg,
  LinuxEntrySvg,
  MacEntrySvg,
  WebEntrySvg,
  WindowsEntrySvg,
  type EntryIcon,
} from './entryIcons'
import { InlineImage } from './InlineImage'
import { InlineMarkdown, parseInlineMarkdown, type InlineSpan } from './InlineMarkdown'
import { loadNote, parseNoteLink } from './notes'
import { toPlatformWikiRoute } from './routes'

import type { WikiEntry, WikiNote } from './types'

// SOURCE-ORDER ROWS: upstream's transformer.ts never decomposes an entry —
// it regex-substitutes tokens in place (icon links, platform words, emoji)
// and lets markdown render the line verbatim, so commas, "or", "(MV3)",
// mirror digits and sub-link order all read exactly as authored. This
// renderer does the same over entry.raw (the marker-stripped source line,
// internal urls pre-resolved at generate time). The structured fields on
// WikiEntry still power search, filters and the parity gate.
//
// Rows stay flattened plain markup (wk-* classes in root.css): external
// links are native anchors, in-app links carry data-spa for the delegated
// handler in WikiSectionList, static icon tooltips are the css wk-tip
// bubble. Only note tooltips (lazy content) are components.
//
// TODO(native): plain DOM is web-only — native needs a LinkEntryRow.native
// fork when that lands.

// icon sub-links, exactly upstream transformer.ts's label set (tooltip is the
// label itself except [Subreddit], which reads 'Reddit')
const ICON_LINKS: Record<string, { tip: string; Icon: EntryIcon }> = {
  Discord: { tip: 'Discord', Icon: DiscordLogoEntrySvg },
  GitHub: { tip: 'GitHub', Icon: GithubLogoEntrySvg },
  GitLab: { tip: 'GitLab', Icon: GitlabLogoEntrySvg },
  'Source Code': { tip: 'Source Code', Icon: SourceCodeEntrySvg },
  Telegram: { tip: 'Telegram', Icon: TelegramLogoEntrySvg },
  Subreddit: { tip: 'Reddit', Icon: RedditLogoEntrySvg },
  X: { tip: 'X', Icon: XLogoEntrySvg },
  Mastodon: { tip: 'Mastodon', Icon: MastodonEntrySvg },
  BlueSky: { tip: 'BlueSky', Icon: BlueskyEntrySvg },
  '.onion': { tip: '.onion', Icon: TorBrowserEntrySvg },
}

// platform indicator words after a ' / ' become icons (upstream's "Platform
// indicators" rules, same tooltips — note macOS, not Mac)
const PLATFORM_WORDS: Record<string, { tip: string; Icon: EntryIcon }> = {
  Windows: { tip: 'Windows', Icon: WindowsEntrySvg },
  Mac: { tip: 'macOS', Icon: MacEntrySvg },
  macOS: { tip: 'macOS', Icon: MacEntrySvg },
  Linux: { tip: 'Linux', Icon: LinuxEntrySvg },
  Android: { tip: 'Android', Icon: AndroidEntrySvg },
  iOS: { tip: 'iOS', Icon: IosEntrySvg },
  Web: { tip: 'Web', Icon: WebEntrySvg },
}

// a platform word counts only as a standalone atom between separators
const PLATFORM_TEXT_RE = /(^|[/,]\s*|\s)(Windows|macOS|Mac|Linux|Android|iOS|Web)(?=\s*(?:[/,]|$))/g

// colorful twemoji markers, exactly like fmhy.net (transformer.ts rewrites
// ⭐→:star:, 🌐→:globe-with-meridians:, ↪→:repeat-button:)
const MARKER_TWEMOJI: Record<string, string> = {
  starred: TWEMOJI_CODES.star,
  index: TWEMOJI_CODES.globeWithMeridians,
  crossref: TWEMOJI_CODES.repeatButton,
}

// vitepress note sub-links have no toast on web, so reveal the note in a lazy
// tooltip. the one stateful row piece that stays a component (content loads on
// hover) — a handful per page, so its tamagui weight doesn't matter.
const NoteSubLink = ({ noteId, label }: { noteId: string; label: string }) => {
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
          style={{ verticalAlign: '-0.25em' }}
          aria-label={label}
        >
          <InfoFilledEntrySvg />
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

const IconAnchor = ({
  tip,
  Icon,
  url,
}: {
  tip: string
  Icon: EntryIcon
  url: string
}) => {
  const route = url.startsWith('/') ? toPlatformWikiRoute(url) : null
  return route ? (
    <a className="wk-icon wk-tip" data-tip={tip} aria-label={tip} href={route} data-spa="">
      <Icon />
    </a>
  ) : (
    <a
      className="wk-icon wk-tip"
      data-tip={tip}
      aria-label={tip}
      href={url}
      target="_blank"
      rel="noopener noreferrer"
    >
      <Icon />
    </a>
  )
}

// text runs pass through verbatim except standalone platform words, which
// become tooltip icons like upstream's transformer
const TextRun = ({ text, bold }: { text: string; bold?: boolean }) => {
  const out: ReactNode[] = []
  let last = 0
  for (const m of text.matchAll(PLATFORM_TEXT_RE)) {
    const platform = PLATFORM_WORDS[m[2]!]!
    const start = m.index! + m[1]!.length
    if (start > last) out.push(text.slice(last, start))
    out.push(
      <span
        key={start}
        className="wk-icon wk-tip"
        data-tip={platform.tip}
        aria-label={platform.tip}
      >
        <platform.Icon />
      </span>
    )
    last = start + m[2]!.length
  }
  if (last < text.length) out.push(text.slice(last))
  const body = <>{out}</>
  return bold ? <strong>{body}</strong> : body
}

const LinkSpan = ({
  span,
  prevText,
}: {
  span: Extract<InlineSpan, { kind: 'link' }>
  prevText: string
}) => {
  // note links reveal the lazy note tooltip in place (their v-popper trigger)
  const noteId = parseNoteLink(span.url)
  if (noteId) {
    return <NoteSubLink noteId={noteId} label={span.text} />
  }

  // icon sub-links (GitLab only replaces after a '/ ' — upstream's lookbehind,
  // so an entry NAMED GitLab stays a text link)
  const icon = ICON_LINKS[span.text]
  if (icon && !(span.text === 'GitLab' && !/\/\s*$/.test(prevText))) {
    return <IconAnchor tip={icon.tip} Icon={icon.Icon} url={span.url} />
  }

  const className = span.bold ? 'wk-bold' : undefined
  if (span.url.startsWith('/')) {
    const route = toPlatformWikiRoute(span.url)
    if (route) {
      return (
        <a className={className} href={route} data-spa="">
          {span.text}
        </a>
      )
    }
    // no route target — keep the text, drop the dead link
    return <span className="wk-accent">{span.text}</span>
  }
  return (
    <a className={className} href={span.url} target="_blank" rel="noopener noreferrer">
      {span.text}
    </a>
  )
}

// the whole entry line in source order
const SourceLine = ({ markdown }: { markdown: string }) => {
  const spans = parseInlineMarkdown(markdown)
  return (
    <>
      {spans.map((span, index) => {
        const prev = spans[index - 1]
        const prevText = prev?.kind === 'text' ? prev.text : ''
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
          case 'link':
            return <LinkSpan key={index} span={span} prevText={prevText} />
          case 'text':
            return <TextRun key={index} text={span.text} bold={span.bold} />
        }
      })}
    </>
  )
}

export const LinkEntryRow = memo(
  ({ entry, unsafe = false }: { entry: WikiEntry; unsafe?: boolean }) => {
    // unsafe-page rows: never a clickable recommendation — warning marker,
    // bold plain name, then the evidence host as the only link
    if (unsafe) {
      const title = entry.title ?? entry.url ?? ''
      let host = entry.url
      try {
        host = entry.url ? new URL(entry.url).hostname.replace(/^www\./, '') : null
      } catch {}
      return (
        <p className="wk-entry">
          <span className="wk-icon wk-danger">
            <WarningCircleEntrySvg />
          </span>{' '}
          <strong className="wk-name-text wk-bold">{title}</strong>
          {entry.description ? <> - {entry.description}</> : null}
          {entry.url ? (
            <>
              {' / '}
              <a href={entry.url} target="_blank" rel="noopener noreferrer">
                {host}
              </a>
            </>
          ) : null}
        </p>
      )
    }

    const markerCode = entry.marker ? MARKER_TWEMOJI[entry.marker] : undefined
    // rows with nothing to open render as a plain warning (upstream style)
    const isWarningOnly = !entry.url && entry.links.length === 0 && !entry.crossrefRoute

    const rowClass =
      'wk-entry' +
      (entry.starred ? ' wk-starred' : '') +
      (entry.marker === 'index' ? ' wk-index' : '')

    return (
      // display: list-item — the disc marker every row wears comes from css
      // (vitepress renders these as real <li>s); marker emoji follow the disc.
      // wk-starred / wk-index let the filter toggles hide rows in PLACE, like
      // upstream's ToggleStarred css — no re-render, headings stay, the
      // browser's own scroll anchoring absorbs the height change
      <p className={rowClass}>
        {isWarningOnly ? (
          <>
            <span className="wk-icon wk-warn">
              <WarningCircleEntrySvg />
            </span>{' '}
          </>
        ) : markerCode ? (
          <>
            <span className="wk-icon">
              <TwemojiIcon code={markerCode} size={19} />
            </span>{' '}
          </>
        ) : null}
        <SourceLine markdown={entry.raw} />
      </p>
    )
  }
)
