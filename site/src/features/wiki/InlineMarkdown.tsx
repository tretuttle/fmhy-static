import { Fragment } from 'react'

import { Link } from '~/components/Link'
import { NoteLink } from '~/components/NoteLink'
import { Text } from '~/interface/text/Text'

import { parseNoteLink } from './notes'
import { openExternal } from './openExternal'
import { toPlatformWikiRoute } from './routes'

import type { Href } from 'one'

export type InlineSpan =
  | { kind: 'text'; text: string; bold?: boolean }
  | { kind: 'code'; text: string }
  | { kind: 'link'; text: string; url: string; bold?: boolean }

const TOKEN_RE = /(`[^`]+`)|(\*\*(?:[^*]|\*(?!\*))+\*\*)|(\[[^\]]+\]\([^()\s]+\))/g
const LINK_RE = /^\[([^\]]+)\]\(([^()\s]+)\)$/

// tiny renderer for the markdown subset in wiki content: links, **bold**, `code`
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

const MarkdownLink = ({ span }: { span: Extract<InlineSpan, { kind: 'link' }> }) => {
  const weight = span.bold ? '700' : undefined

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
          color="$accent11"
          fontWeight={weight}
          hoverStyle={{ color: '$accent12' }}
          $platform-web={inlineLinkPlatformWeb}
        >
          {span.text}
        </Link>
      )
    }
    // no route target — keep the text, drop the dead link
    return (
      <Text color="$accent11" fontWeight={weight}>
        {span.text}
      </Text>
    )
  }

  // external links open in a new tab, severing the opener via openExternal
  return (
    <Link
      href={span.url as Href}
      target="_blank"
      color="$accent11"
      fontWeight={weight}
      hoverStyle={{ color: '$accent12' }}
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

export function InlineMarkdown({ markdown }: { markdown: string }) {
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
            return <MarkdownLink key={index} span={span} />
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
