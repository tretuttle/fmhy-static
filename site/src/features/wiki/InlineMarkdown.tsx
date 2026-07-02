import { Fragment } from 'react'

import { Link } from '~/components/Link'
import { NoteLink } from '~/components/NoteLink'
import { Text } from '~/interface/text/Text'

import { parseNoteLink } from './notes'
import { openExternal } from './openExternal'
import { toPlatformWikiRoute } from './routes'

import type { Href } from 'one'
import type { ColorTokens } from 'tamagui'

export type InlineSpan =
  | { kind: 'text'; text: string; bold?: boolean }
  | { kind: 'code'; text: string }
  | { kind: 'link'; text: string; url: string; bold?: boolean }
  // raw html <img> (only http(s) srcs survive parsing); text stays '' so
  // consumers that flatten spans to plain text (useWikiSearch) are unaffected
  | {
      kind: 'image'
      text: string
      src: string
      alt: string
      width?: number
      height?: number
    }

const TOKEN_RE =
  /(`[^`]+`)|(\*\*(?:[^*]|\*(?!\*))+\*\*)|(\[[^\]]+\]\([^()\s]+\))|(<img\b[^>]*?\/?>)/g
const LINK_RE = /^\[([^\]]+)\]\(([^()\s]+)\)$/
const ATTR_RE = /([a-zA-Z-]+)\s*=\s*"([^"]*)"/g

function parseImgTag(token: string): InlineSpan | null {
  const attrs: Record<string, string> = {}
  for (const match of token.matchAll(ATTR_RE)) {
    const [, key, value] = match
    if (key && value !== undefined) {
      attrs[key.toLowerCase()] = value
    }
  }
  const src = attrs.src ?? ''
  // sanitize: only render http(s) images, drop anything else silently
  if (!/^https?:\/\//i.test(src)) {
    return null
  }
  const width = Number.parseInt(attrs.width ?? '', 10)
  const height = Number.parseInt(attrs.height ?? '', 10)
  return {
    kind: 'image',
    text: '',
    src,
    alt: attrs.alt ?? '',
    width: Number.isFinite(width) ? width : undefined,
    height: Number.isFinite(height) ? height : undefined,
  }
}

// tiny renderer for the markdown subset in wiki content: links, **bold**,
// `code`, and the occasional raw <img> (csrin-search note)
export function parseInlineMarkdown(markdown: string, bold = false): InlineSpan[] {
  const spans: InlineSpan[] = []
  let lastIndex = 0

  for (const match of markdown.matchAll(TOKEN_RE)) {
    const index = match.index ?? 0
    if (index > lastIndex) {
      spans.push({ kind: 'text', text: markdown.slice(lastIndex, index), bold })
    }
    const token = match[0]
    if (token.startsWith('`')) {
      spans.push({ kind: 'code', text: token.slice(1, -1) })
    } else if (token.startsWith('**')) {
      spans.push(...parseInlineMarkdown(token.slice(2, -2), true))
    } else if (token.startsWith('<img')) {
      const image = parseImgTag(token)
      if (image) {
        spans.push(image)
      }
    } else {
      const link = token.match(LINK_RE)
      if (link) {
        spans.push({ kind: 'link', text: link[1], url: link[2], bold })
      } else {
        spans.push({ kind: 'text', text: token, bold })
      }
    }
    lastIndex = index + token.length
  }

  if (lastIndex < markdown.length) {
    spans.push({ kind: 'text', text: markdown.slice(lastIndex), bold })
  }

  return spans
}

// the target Link pins $platform-web color/weight to 'inherit'; re-declare it
// without those so the base color/fontWeight props win on web (same trick as
// MDXComponents) while size/line-height still inherit from the surrounding text
const inlineLinkPlatformWeb = { fontSize: 'inherit', lineHeight: 'inherit' } as const

// fmhy.net's `.vp-doc a` mechanic: constant brand color with an always-present
// transparent underline that fades in on hover (4px offset)
const underlineRevealProps = {
  color: '$accent11' as ColorTokens,
  textDecorationLine: 'underline',
  textDecorationColor: 'transparent',
  hoverStyle: { textDecorationColor: '$accent11' },
  style: { textUnderlineOffset: 4, transition: 'text-decoration-color 0.25s' },
} as const

// inside notices, fmhy.net's `.custom-block a` keeps the block's text color
// with a solid visible underline (2px offset) and dims to 0.7 on hover
const noticeLinkProps = (linkColor: ColorTokens) =>
  ({
    color: linkColor,
    textDecorationLine: 'underline',
    hoverStyle: { opacity: 0.7 },
    style: { textUnderlineOffset: 2, transition: 'opacity 0.25s' },
  }) as const

const MarkdownLink = ({
  span,
  linkColor,
}: {
  span: Extract<InlineSpan, { kind: 'link' }>
  linkColor?: ColorTokens
}) => {
  // notice links render at 500 like `.custom-block a`; elsewhere weight flows
  // from the surrounding text unless the source bolded the link
  const weight = span.bold ? '700' : linkColor ? '500' : undefined
  const linkProps = linkColor ? noticeLinkProps(linkColor) : underlineRevealProps

  // vitepress note links render an inline tooltip instead of navigating
  if (parseNoteLink(span.url)) {
    return <NoteLink href={span.url}>{span.text}</NoteLink>
  }

  // internal "/slug#anchor" links navigate in-app
  if (span.url.startsWith('/')) {
    const route = toPlatformWikiRoute(span.url)
    if (route) {
      return (
        <Link
          href={route as Href}
          fontWeight={weight}
          {...linkProps}
          $platform-web={inlineLinkPlatformWeb}
        >
          {span.text}
        </Link>
      )
    }
    // no route target — keep the text, drop the dead link
    return (
      <Text color={linkColor ?? '$accent11'} fontWeight={weight}>
        {span.text}
      </Text>
    )
  }

  // external links open in a new tab, severing the opener via openExternal
  return (
    <Link
      href={span.url as Href}
      target="_blank"
      fontWeight={weight}
      {...linkProps}
      $platform-web={inlineLinkPlatformWeb}
      onPress={(e) => {
        e.preventDefault()
        openExternal(span.url)
      }}
    >
      {span.text}
    </Link>
  )
}

export function InlineMarkdown({
  markdown,
  linkColor,
}: {
  markdown: string
  // when set (wiki notices), links keep the notice's text color instead of
  // the accent blue — mirrors upstream `.custom-block a`
  linkColor?: ColorTokens
}) {
  const spans = parseInlineMarkdown(markdown)

  return (
    <>
      {spans.map((span, index) => {
        switch (span.kind) {
          case 'code':
            return (
              <Text
                key={index}
                render="code"
                fontFamily="$mono"
                fontSize="$2"
                bg="$color4"
                px={4}
                rounded="$2"
              >
                {span.text}
              </Text>
            )
          case 'link':
            return <MarkdownLink key={index} span={span} linkColor={linkColor} />
          case 'image':
            return (
              <img
                key={index}
                src={span.src}
                alt={span.alt}
                loading="lazy"
                style={{
                  display: 'block',
                  width: span.width ? Math.min(span.width, 320) : undefined,
                  maxWidth: '100%',
                  height: 'auto',
                  borderRadius: 4,
                  marginTop: 6,
                }}
              />
            )
          case 'text':
            return (
              <Fragment key={index}>
                {span.bold ? (
                  <Text render="strong" fontWeight="700">
                    {span.text}
                  </Text>
                ) : (
                  span.text
                )}
              </Fragment>
            )
        }
      })}
    </>
  )
}
