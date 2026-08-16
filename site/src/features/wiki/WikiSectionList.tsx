import { router } from 'one'
import { SizableText, XStack, YStack } from 'tamagui'

import { Link } from '~/components/Link'
import { ArrowBendUpRightIcon } from '~/icons/phosphor/ArrowBendUpRightIcon'
import { SepHeading } from '~/interface/text/Headings'

import {
  countVisible,
  filterEntries,
  type EntryVisibilityFilters,
} from './entryVisibility'
import { InlineMarkdown } from './InlineMarkdown'
import { LinkEntryRow } from './LinkEntryRow'
import { openExternal } from './openExternal'
import { useWikiFilters } from './useWikiFilters'
import { WikiNotice } from './WikiNotice'

import type {
  WikiGuideBlock,
  WikiNotice as WikiNoticeType,
  WikiPage,
  WikiSection,
  WikiSubsection,
} from './types'
import type { Href } from 'one'
import type { ReactNode } from 'react'

// VitePress .vp-doc blockquote: left divider border, muted 16px text
const Blockquote = ({ markdown }: { markdown: string }) => (
  <YStack my={16} pl={16} borderLeftWidth={2} borderColor="$color4">
    <SizableText fontSize={16} lineHeight={24} color="$color10">
      <InlineMarkdown markdown={markdown} />
    </SizableText>
  </YStack>
)

// a notice whose kind is 'blockquote' is legacy data — render as a blockquote
const NoticeOrBlockquote = ({ notice }: { notice: WikiNoticeType }) => {
  if ((notice.kind as string) === 'blockquote') {
    return <Blockquote markdown={notice.markdown} />
  }
  return <WikiNotice notice={notice} />
}

// guide pages carry a full-fidelity ordered block stream (types.ts: render it
// INSTEAD of the legacy merged notice): prose stays a plain paragraph like the
// real .vp-doc, quotes get blockquote styling, !!!note/!!!info get info boxes
const GuideBlocks = ({ blocks }: { blocks: WikiGuideBlock[] }) => (
  <YStack>
    {blocks.map((block, i) => {
      if (block.kind === 'blockquote') return <Blockquote key={i} markdown={block.markdown} />
      if (block.kind === 'notice') return <WikiNotice key={i} notice={block.notice} />
      return (
        <SizableText key={i} my={8} fontSize={16} lineHeight={26} color="$color11">
          <InlineMarkdown markdown={block.markdown} />
        </SizableText>
      )
    })}
  </YStack>
)

const ContainerProse = ({
  node,
}: {
  node: { blocks?: WikiGuideBlock[]; notice: WikiNoticeType | null }
}) => {
  if (node.blocks && node.blocks.length > 0) return <GuideBlocks blocks={node.blocks} />
  if (node.notice) return <NoticeOrBlockquote notice={node.notice} />
  return null
}

// real ids let /#anchor hash-navigation work, and data-toc-* feeds the Phase-3
// ToC. raw div keeps content-visibility untouched by tamagui's style system so
// the browser can skip layout/paint for below-fold sections on the huge SSG
// pages; hash navigation still forces them rendered
//
// TODO(native): the raw <div> + content-visibility strategy is
// web-only (invariant violation on react-native); native needs a FlatList/FlashList
// fork of this list with its own below-fold virtualization.
const Anchor = ({
  id,
  tocLevel,
  tocTitle,
  children,
}: {
  id: string
  tocLevel?: 0 | 1
  tocTitle?: string
  children: ReactNode
}) => {
  return (
    <div
      id={id}
      data-toc-level={tocLevel}
      data-toc-title={tocTitle}
      style={{ contentVisibility: 'auto', containIntrinsicSize: '1px 2000px' }}
    >
      {children}
    </div>
  )
}

const CrossrefRow = ({
  title,
  refUrl,
  crossrefRoute,
}: {
  title: string
  refUrl: string
  crossrefRoute: string | null
}) => {
  const inner = (
    <XStack items="center" gap="$2" py="$2">
      <ArrowBendUpRightIcon size={14} color="$color10" />
      <SizableText size="$4" color="$accent11" hoverStyle={{ color: '$accent12' }}>
        {title}
      </SizableText>
    </XStack>
  )

  if (crossrefRoute) {
    return (
      <Link href={crossrefRoute as Href} asChild>
        {inner}
      </Link>
    )
  }

  return (
    <XStack
      items="center"
      gap="$2"
      py="$2"
      cursor="pointer"
      onPress={() => openExternal(refUrl)}
    >
      <ArrowBendUpRightIcon size={14} color="$color10" />
      <SizableText size="$4" color="$accent11" hoverStyle={{ color: '$accent12' }}>
        {title}
      </SizableText>
    </XStack>
  )
}

const SubsectionBlock = ({
  subsection,
  filters,
  filterActive,
  unsafe,
}: {
  subsection: WikiSubsection
  filters: EntryVisibilityFilters
  filterActive: boolean
  unsafe: boolean
}) => {
  const visible = filterEntries(subsection.entries, filters)

  if (filterActive && visible.length === 0 && !subsection.refUrl) {
    return null
  }

  return (
    <Anchor id={subsection.id} tocLevel={1} tocTitle={subsection.title}>
      <YStack>
        <SepHeading size="$5" anchorId={subsection.id}>
          {subsection.title}
        </SepHeading>
        <ContainerProse node={subsection} />
        {subsection.refUrl ? (
          <CrossrefRow
            title={subsection.title}
            refUrl={subsection.refUrl}
            crossrefRoute={subsection.crossrefRoute}
          />
        ) : (
          visible.map((entry) => (
            <LinkEntryRow key={entry.id} entry={entry} unsafe={unsafe} />
          ))
        )}
      </YStack>
    </Anchor>
  )
}

const SectionBlock = ({
  section,
  filters,
  filterActive,
  unsafe,
}: {
  section: WikiSection
  filters: EntryVisibilityFilters
  filterActive: boolean
  unsafe: boolean
}) => {
  const visibleOwn = filterEntries(section.entries, filters)
  const visibleTotal =
    visibleOwn.length +
    section.subsections.reduce((sum, sub) => sum + countVisible(sub.entries, filters), 0)
  const hasRef =
    !!section.refUrl || section.subsections.some((subsection) => !!subsection.refUrl)

  if (filterActive && visibleTotal === 0 && !hasRef) {
    return null
  }

  return (
    <Anchor id={section.id} tocLevel={0} tocTitle={section.title}>
      <YStack>
        <SepHeading size="$6" anchorId={section.id} feedbackHref="/feedback">
          {section.title}
        </SepHeading>
        <ContainerProse node={section} />
        {section.refUrl ? (
          <CrossrefRow
            title={section.title}
            refUrl={section.refUrl}
            crossrefRoute={section.crossrefRoute}
          />
        ) : (
          visibleOwn.map((entry) => (
            <LinkEntryRow key={entry.id} entry={entry} unsafe={unsafe} />
          ))
        )}
        {section.subsections.map((subsection) => (
          <SubsectionBlock
            key={subsection.id}
            subsection={subsection}
            filters={filters}
            filterActive={filterActive}
            unsafe={unsafe}
          />
        ))}
      </YStack>
    </Anchor>
  )
}

// one delegated click handler covers every flattened in-app link in the entry
// rows (LinkEntryRow renders plain <a data-spa> instead of a Link component per
// anchor — the per-anchor hooks were the page's hydration cost). modified
// clicks and middle clicks fall through to native anchor behavior.
function onEntryLinkClick(event: React.MouseEvent) {
  if (event.defaultPrevented || event.button !== 0) return
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  const anchor = (event.target as Element).closest?.('a[data-spa]')
  if (!anchor) return
  const href = anchor.getAttribute('href')
  if (!href) return
  event.preventDefault()
  router.navigate(href as Parameters<typeof router.navigate>[0])
}

export function WikiSectionList({ page }: { page: WikiPage }) {
  const { starredOnly, indexesOnly } = useWikiFilters()
  const filters: EntryVisibilityFilters = { starredOnly, indexesOnly }
  const filterActive = starredOnly || indexesOnly
  const unsafe = page.kind === 'unsafe'

  return (
    // raw div, same reasoning as Anchor: keep the delegation target a plain
    // DOM node with a real MouseEvent (button/metaKey), untouched by tamagui
    <div onClick={onEntryLinkClick}>
      <YStack>
        {page.sections.map((section) => (
          <SectionBlock
            key={section.id}
            section={section}
            filters={filters}
            filterActive={filterActive}
            unsafe={unsafe}
          />
        ))}
      </YStack>
    </div>
  )
}
