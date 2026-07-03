import { useState } from 'react'
import { Separator, SizableText, XStack, YStack } from 'tamagui'

import { Link } from '~/components/Link'
import { CaretDownIcon } from '~/icons/phosphor/CaretDownIcon'
import { ChatCircleIcon } from '~/icons/phosphor/ChatCircleIcon'
import { H1, H2, H3, H4 } from '~/interface/text/Headings'
import { Text } from '~/interface/text/Text'

import { InlineMarkdown } from './InlineMarkdown'
import { openExternal } from './openExternal'
import { AuthorAvatar, ProseImage, WallpaperPreview } from './proseImages'

import type { Href } from 'one'
import type { ReactNode } from 'react'
import type {
  WikiProseAuthor,
  WikiProseBlock,
  WikiProseContainerVariant,
  WikiProseListItem,
  WikiProsePage,
} from './types'

// ---------------------------------------------------------------------------
// building blocks
// ---------------------------------------------------------------------------

// real ids let /#anchor hash-navigation work and data-toc-* feeds the ToC —
// same raw-div idiom as WikiSectionList
const Anchor = ({
  id,
  tocLevel,
  tocTitle,
  children,
}: {
  id: string
  tocLevel: 0 | 1
  tocTitle: string
  children: ReactNode
}) => (
  <div id={id} data-toc-level={tocLevel} data-toc-title={tocTitle}>
    {children}
  </div>
)

const Paragraph = ({ markdown }: { markdown: string }) => (
  <Text size="$4" lineHeight={26} color="$color11" my="$2">
    <InlineMarkdown markdown={markdown} />
  </Text>
)

const Heading = ({
  block,
}: {
  block: Extract<WikiProseBlock, { kind: 'heading' }>
}) => {
  const title = <InlineMarkdown markdown={block.markdown} />
  const heading =
    block.level <= 1 ? (
      <H2 fontSize={26} lineHeight={34} mt="$6" mb="$2" color="$color12">
        {title}
      </H2>
    ) : block.level === 2 ? (
      <H2 fontSize={22} lineHeight={30} mt="$6" mb="$2" color="$color12">
        {title}
      </H2>
    ) : block.level === 3 ? (
      <H3 fontSize={19} lineHeight={26} mt="$5" mb="$2" color="$color12">
        {title}
      </H3>
    ) : (
      <H4 fontSize={16} lineHeight={24} mt="$4" mb="$1" color="$color12">
        {title}
      </H4>
    )
  return (
    <Anchor
      id={block.id}
      tocLevel={block.level <= 2 ? 0 : 1}
      tocTitle={block.markdown.replace(/\[([^\]]+)\]\([^()]*\)/g, '$1')}
    >
      {heading}
    </Anchor>
  )
}

const ListItemRow = ({
  item,
  marker,
}: {
  item: WikiProseListItem
  marker: string
}) => (
  <XStack gap="$2.5" items="flex-start">
    <SizableText size="$4" lineHeight={26} color="$color9" select="none">
      {marker}
    </SizableText>
    <YStack flex={1} minW={0}>
      <Text size="$4" lineHeight={26} color="$color11">
        <InlineMarkdown markdown={item.markdown} />
      </Text>
      {item.children.length > 0 && (
        <YStack pl="$2">
          <ProseBlocks blocks={item.children} />
        </YStack>
      )}
    </YStack>
  </XStack>
)

const List = ({ block }: { block: Extract<WikiProseBlock, { kind: 'list' }> }) => (
  <YStack my="$2" gap="$1.5">
    {block.items.map((item, index) => (
      <ListItemRow
        key={index}
        item={item}
        marker={block.ordered ? `${index + 1}.` : '•'}
      />
    ))}
  </YStack>
)

const Blockquote = ({ markdown }: { markdown: string }) => (
  <XStack my="$2" pl="$3.5" borderLeftWidth={2} borderLeftColor="$color6">
    <Text flex={1} size="$4" lineHeight={26} color="$color10">
      <InlineMarkdown markdown={markdown} />
    </Text>
  </XStack>
)

// container palette: info = fmhy swarm-blue accent ramp, tip/warning reuse the
// WikiNotice tokens, danger tints red via alpha so it works in every theme
const CONTAINER_STYLES: Record<
  Exclude<WikiProseContainerVariant, 'details'>,
  { bg: string; border: string; text: string; label: string }
> = {
  info: { bg: '$accent2', border: '$accent5', text: '$accent12', label: 'Info' },
  tip: { bg: '$tipBg', border: '$tipBorder', text: '$tipText', label: 'Tip' },
  warning: { bg: '$warnBg', border: '$warnBorder', text: '$warnText', label: 'Warning' },
  danger: {
    bg: 'hsla(0, 70%, 50%, 0.08)',
    border: 'hsla(0, 70%, 50%, 0.35)',
    text: '$dangerText',
    label: 'Danger',
  },
}

const Details = ({
  title,
  children,
}: {
  title: string | null
  children: ReactNode
}) => {
  const [open, setOpen] = useState(false)
  return (
    <YStack
      my="$2"
      rounded="$5"
      borderWidth={1}
      borderColor="$color4"
      bg="$color2"
      overflow="hidden"
    >
      <XStack
        items="center"
        gap="$2"
        px="$3.5"
        py="$3"
        cursor="pointer"
        hoverStyle={{ bg: '$color3' }}
        onPress={() => setOpen((value) => !value)}
      >
        <YStack rotate={open ? '0deg' : '-90deg'} transition="200ms">
          <CaretDownIcon size={14} color="$color10" />
        </YStack>
        <SizableText size="$3" fontWeight="600" color="$color12" select="none">
          {title ?? 'Details'}
        </SizableText>
      </XStack>
      {open && (
        <YStack px="$3.5" pb="$3">
          {children}
        </YStack>
      )}
    </YStack>
  )
}

const Container = ({
  block,
}: {
  block: Extract<WikiProseBlock, { kind: 'container' }>
}) => {
  if (block.variant === 'details') {
    return (
      <Details title={block.title}>
        <ProseBlocks blocks={block.blocks} />
      </Details>
    )
  }
  const style = CONTAINER_STYLES[block.variant]
  return (
    <YStack
      my="$2"
      p="$3.5"
      rounded="$5"
      borderWidth={1}
      bg={style.bg as '$color2'}
      borderColor={style.border as '$color4'}
      gap="$1"
    >
      <SizableText size="$3" fontWeight="700" color={style.text as '$color12'}>
        {block.title ?? style.label}
      </SizableText>
      <YStack my="$-2">
        <ProseBlocks blocks={block.blocks} />
      </YStack>
    </YStack>
  )
}

const CodeBlock = ({
  block,
}: {
  block: Extract<WikiProseBlock, { kind: 'code' }>
}) => (
  <YStack my="$2" rounded="$4" borderWidth={1} borderColor="$color4" bg="$color2">
    <pre
      style={{
        margin: 0,
        padding: 14,
        overflowX: 'auto',
        fontFamily: 'var(--f-family-mono, monospace)',
        fontSize: 13,
        lineHeight: '20px',
      }}
    >
      <Text render="code" fontFamily="$mono" fontSize={13} color="$color12">
        {block.code}
      </Text>
    </pre>
  </YStack>
)

// wallpaper card — mirrors fmhy/edit WallpaperCard.vue (title, description,
// desktop preview, mobile/desktop download links)
const WallpaperCard = ({
  block,
}: {
  block: Extract<WikiProseBlock, { kind: 'wallpaper' }>
}) => (
  <YStack
    my="$3"
    maxW={448}
    width="100%"
    rounded="$6"
    borderWidth={1}
    borderColor="$color4"
    bg="$color2"
    overflow="hidden"
  >
    <YStack p="$4" pb="$3" gap="$1">
      <H4 fontSize={20} lineHeight={26} color="$color12">
        {block.title}
      </H4>
      <SizableText size="$3" color="$color10">
        {block.description}
      </SizableText>
    </YStack>
    <YStack px="$4">
      <WallpaperPreview src={block.desktop} alt={`${block.title} wallpaper preview`} />
    </YStack>
    <XStack items="center" gap="$2" p="$4">
      {(
        [
          ['Mobile', block.mobile],
          ['Desktop', block.desktop],
        ] as const
      ).map(([label, url], index) => (
        <XStack key={label} items="center" gap="$2">
          {index > 0 && (
            <SizableText size="$3" color="$color9">
              •
            </SizableText>
          )}
          <Link
            href={url as Href}
            target="_blank"
            color="$accent11"
            fontSize="$3"
            hoverStyle={{ color: '$accent12' }}
            onPress={(e) => {
              e.preventDefault()
              openExternal(url)
            }}
          >
            {label}
          </Link>
        </XStack>
      ))}
    </XStack>
  </YStack>
)

function ProseBlocks({ blocks }: { blocks: WikiProseBlock[] }) {
  return (
    <>
      {blocks.map((block, index) => {
        switch (block.kind) {
          case 'heading':
            return <Heading key={index} block={block} />
          case 'paragraph':
            return <Paragraph key={index} markdown={block.markdown} />
          case 'list':
            return <List key={index} block={block} />
          case 'blockquote':
            return <Blockquote key={index} markdown={block.markdown} />
          case 'container':
            return <Container key={index} block={block} />
          case 'code':
            return <CodeBlock key={index} block={block} />
          case 'hr':
            return <Separator key={index} my="$4" opacity={0.5} />
          case 'image':
            return <ProseImage key={index} src={block.src} alt={block.alt} />
          case 'wallpaper':
            return <WallpaperCard key={index} block={block} />
        }
      })}
    </>
  )
}

// ---------------------------------------------------------------------------
// page headers
// ---------------------------------------------------------------------------

const AuthorsRow = ({ authors }: { authors: WikiProseAuthor[] }) => {
  if (authors.length === 0) return null
  return (
    <XStack items="center" gap="$2" flexWrap="wrap" pt="$1">
      {authors.map((author, index) => (
        <XStack key={author.name} items="center" gap="$2">
          {index > 0 && (
            <SizableText size="$3" color="$color9">
              •
            </SizableText>
          )}
          <AuthorAvatar src={`${author.github}.png`} alt={author.name} />
          <Link
            href={author.github as Href}
            target="_blank"
            color="$accent11"
            fontSize="$3"
            hoverStyle={{ color: '$accent12' }}
            onPress={(e) => {
              e.preventDefault()
              openExternal(author.github)
            }}
          >
            {author.name}
          </Link>
        </XStack>
      ))}
    </XStack>
  )
}

// deterministic across server/client (UTC) to avoid hydration drift
const formatPostDate = (raw: string): string =>
  new Date(raw).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })

// same subtle "Got feedback?" card WikiCategoryContent shows under wiki titles
const FeedbackCard = () => (
  <XStack
    items="center"
    gap="$3"
    mt="$2"
    p="$3"
    bg="$color2"
    borderWidth={1}
    borderColor="$color4"
    rounded="$4"
  >
    <ChatCircleIcon size={20} color="$color10" />
    <YStack flex={1} gap="$0.5">
      <SizableText size="$4" fontWeight="600" color="$color12">
        Got feedback?
      </SizableText>
      <SizableText size="$3" color="$color10">
        We'd love to know what you think about this page.
      </SizableText>
    </YStack>
    <Link asChild href={'/feedback' as Href} aria-label="Share Feedback">
      <XStack
        items="center"
        px="$3"
        py="$2"
        rounded="$4"
        borderWidth={1}
        borderColor="$color6"
        bg="$color3"
        cursor="pointer"
        hoverStyle={{ bg: '$color4', borderColor: '$color8' }}
        pressStyle={{ bg: '$color2' }}
      >
        <SizableText size="$3" fontWeight="600" color="$color12">
          Share Feedback
        </SizableText>
      </XStack>
    </Link>
  </XStack>
)

const PageTitle = ({ title }: { title: string }) => (
  <H1
    fontSize={32}
    lineHeight={40}
    fontWeight="600"
    color="$accent11"
    textDecorationLine="underline"
  >
    {title}
  </H1>
)

export function WikiProseContent({ page }: { page: WikiProsePage }) {
  return (
    <YStack pb="$10" gap="$1">
      {page.header === 'page' && (
        <YStack gap="$2" pt="$4" pb="$2">
          <PageTitle title={page.title} />
          {!!page.description && (
            <SizableText size="$5" color="$color10" fontWeight="300">
              {page.description}
            </SizableText>
          )}
          <FeedbackCard />
        </YStack>
      )}

      {page.header === 'post' && (
        <YStack gap="$2" pt="$4" pb="$2">
          <PageTitle title={page.title} />
          <SizableText size="$5" color="$color10" fontWeight="300">
            {page.description}
            {!!page.date && ` • ${formatPostDate(page.date)}`}
          </SizableText>
          <AuthorsRow authors={page.authors} />
        </YStack>
      )}

      {page.header === 'none' && <YStack pt="$2" />}

      <ProseBlocks blocks={page.blocks} />
    </YStack>
  )
}
