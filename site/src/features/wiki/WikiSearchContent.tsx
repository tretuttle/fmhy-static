import { type Href } from 'one'
import { useMemo } from 'react'
import { Button, Input, SizableText, Spinner, XStack, YStack, styled } from 'tamagui'

import { Link } from '~/components/Link'
import { TooltipSimple } from '~/components/TooltipSimple'
import { ArrowBendUpRightIcon } from '~/icons/phosphor/ArrowBendUpRightIcon'
import { MagnifyingGlassIcon } from '~/icons/phosphor/MagnifyingGlassIcon'
import { StarIcon } from '~/icons/phosphor/StarIcon'
import { H2 } from '~/interface/text/Headings'
import { Text } from '~/interface/text/Text'

import { openExternal } from './openExternal'
import { toPlatformWikiRoute } from './routes'
import { useWikiSearch, type WikiSearchResult } from './useWikiSearch'

import type { HighlightSegment } from './searchHighlight'

function HighlightedText({ segments }: { segments: HighlightSegment[] }) {
  if (segments.length === 0) return null
  return (
    <>
      {segments.map((segment, index) =>
        segment.match ? (
          <Text key={index} color="$accent10" fontWeight="700">
            {segment.text}
          </Text>
        ) : (
          <Text key={index}>{segment.text}</Text>
        ),
      )}
    </>
  )
}

// pill toggle replacing the native Switch — keeps the surface within tamagui primitives
function FuzzyToggle({
  value,
  onChange,
}: {
  value: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <XStack
      render="button"
      aria-label="Toggle fuzzy search"
      aria-pressed={value}
      onPress={() => onChange(!value)}
      items="center"
      gap="$2"
      px="$2.5"
      py="$1.5"
      rounded="$4"
      cursor="pointer"
      borderWidth={1}
      borderColor={value ? '$accent8' : '$color5'}
      bg={value ? '$accent4' : '$color2'}
      hoverStyle={{ borderColor: value ? '$accent9' : '$color7' }}
    >
      <SizableText size="$2" color={value ? '$accent11' : '$color10'}>
        Fuzzy
      </SizableText>
    </XStack>
  )
}

type ResultGroup = {
  pageTitle: string
  results: WikiSearchResult[]
}

const groupByPage = (results: WikiSearchResult[]): ResultGroup[] => {
  const groups: ResultGroup[] = []
  const byTitle = new Map<string, ResultGroup>()
  for (const result of results) {
    let group = byTitle.get(result.doc.pageTitle)
    if (!group) {
      group = { pageTitle: result.doc.pageTitle, results: [] }
      byTitle.set(result.doc.pageTitle, group)
      groups.push(group)
    }
    group.results.push(result)
  }
  return groups
}

const Row = styled(XStack, {
  items: 'center',
  gap: '$2',
  px: '$3',
  py: '$2',
  rounded: '$4',
  cursor: 'pointer',
  hoverStyle: { bg: '$color3' },
  pressStyle: { bg: '$color4' },
})

const ResultRow = ({
  result,
  onCommit,
}: {
  result: WikiSearchResult
  onCommit: () => void
}) => {
  const { doc, titleSegments, descriptionSegments } = result
  const anchorRoute =
    toPlatformWikiRoute(`/${doc.pageId}#${doc.anchor}`) ?? `/${doc.pageId}#${doc.anchor}`

  const body = (
    <YStack flex={1} gap="$0.5">
      <XStack items="center" gap="$2">
        {doc.starred && <StarIcon size={12} color="$accent9" />}
        <SizableText size="$4" fontWeight="600" color="$color12">
          <HighlightedText segments={titleSegments} />
        </SizableText>
      </XStack>
      <SizableText size="$2" color="$color9">
        {doc.sectionPath}
      </SizableText>
      {descriptionSegments.length > 0 && (
        <SizableText size="$3" color="$color10" numberOfLines={2}>
          <HighlightedText segments={descriptionSegments} />
        </SizableText>
      )}
    </YStack>
  )

  // external entries: the row opens the link, a side button jumps to the section.
  // stays a pressable div (not render="button") so the nested section <a> is valid html
  if (doc.url) {
    return (
      <Row
        aria-label={doc.title}
        onPress={() => {
          onCommit()
          openExternal(doc.url!)
        }}
      >
        {body}
        <TooltipSimple label="Open in category page">
          <Link
            href={anchorRoute as Href}
            asChild
            aria-label="Open in category page"
            onPress={(e) => {
              e.stopPropagation()
              onCommit()
            }}
          >
            <Button
              size="$2"
              circular
              chromeless
              icon={<ArrowBendUpRightIcon size={16} color="$color10" />}
            />
          </Link>
        </TooltipSimple>
      </Row>
    )
  }

  // in-app entries: the whole row navigates to the section
  return (
    <Link href={anchorRoute as Href} asChild onPress={onCommit}>
      <Row aria-label={doc.title}>{body}</Row>
    </Link>
  )
}

export function WikiSearchContent() {
  const {
    query,
    setQuery,
    results,
    loading,
    fuzzy,
    setFuzzy,
    recent,
    clearRecent,
    commitRecent,
    suggestions,
  } = useWikiSearch()

  const groups = useMemo(() => groupByPage(results), [results])
  const onCommit = () => commitRecent(query)

  return (
    <YStack gap="$4" py="$4" pb="$10">
      <H2 size="$8">Search</H2>

      <XStack items="center" gap="$3">
        <MagnifyingGlassIcon size={20} color="$color10" />
        <Input
          flex={1}
          placeholder="Search the wiki..."
          value={query}
          onChangeText={setQuery}
          autoFocus
        />
      </XStack>

      <XStack items="center" gap="$2" justify="flex-end">
        <FuzzyToggle value={fuzzy} onChange={setFuzzy} />
      </XStack>

      {!query.trim() && recent.length > 0 && (
        <YStack gap="$2">
          <XStack items="center" justify="space-between">
            <SizableText size="$3" color="$color10">
              Recent searches
            </SizableText>
            <Button size="$2" chromeless onPress={clearRecent}>
              Clear
            </Button>
          </XStack>
          <XStack gap="$2" flexWrap="wrap">
            {recent.map((item) => (
              <Button
                key={item}
                size="$2"
                borderWidth={1}
                borderColor="$color6"
                bg="$color2"
                onPress={() => setQuery(item)}
              >
                {item}
              </Button>
            ))}
          </XStack>
        </YStack>
      )}

      {loading && (
        <YStack items="center" py="$6" gap="$3">
          <Spinner size="large" />
          <SizableText size="$3" color="$color10">
            Searching...
          </SizableText>
        </YStack>
      )}

      {!loading && !!query.trim() && results.length === 0 && (
        <YStack items="center" py="$6" gap="$3">
          <SizableText size="$4" color="$color10">
            No results found
          </SizableText>
          {suggestions.length > 0 && (
            <XStack gap="$2" flexWrap="wrap" justify="center">
              {suggestions.map((suggestion) => (
                <Button
                  key={suggestion}
                  size="$2"
                  borderWidth={1}
                  borderColor="$color6"
                  bg="$color2"
                  onPress={() => setQuery(suggestion)}
                >
                  {suggestion}
                </Button>
              ))}
            </XStack>
          )}
        </YStack>
      )}

      {!loading &&
        groups.map((group) => (
          <YStack key={group.pageTitle} gap="$1">
            <SizableText
              size="$2"
              fontWeight="600"
              color="$color10"
              textTransform="uppercase"
              letterSpacing={0.5}
              px="$3"
            >
              {group.pageTitle}
            </SizableText>
            {group.results.map((result) => (
              <ResultRow key={result.doc.id} result={result} onCommit={onCommit} />
            ))}
          </YStack>
        ))}
    </YStack>
  )
}
