import { router, type Href } from 'one'
import { useEffect, useMemo, useState } from 'react'
import {
  Input,
  ScrollView,
  Separator,
  SizableText,
  Spinner,
  XStack,
  YStack,
  styled,
} from 'tamagui'

import { Link } from '~/components/Link'
import { MagnifyingGlassIcon } from '~/icons/phosphor/MagnifyingGlassIcon'
import { StarIcon } from '~/icons/phosphor/StarIcon'
import { Text } from '~/interface/text/Text'

import { openExternal } from './openExternal'
import { toPlatformWikiRoute } from './routes'
import { closeSearch, useSearchOpen } from './searchModal'
import { useWikiSearch, type WikiSearchResult } from './useWikiSearch'

import type { HighlightSegment } from './searchHighlight'
import type { SearchDoc } from './types'

// inline highlight renderer — must live inside a SizableText/Text parent
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

function routeFor(doc: SearchDoc): string {
  return toPlatformWikiRoute(`/${doc.pageId}#${doc.anchor}`) ?? `/${doc.pageId}#${doc.anchor}`
}

type FlatItem = { result: WikiSearchResult; firstInGroup: boolean }

function flatten(results: WikiSearchResult[]): FlatItem[] {
  const out: FlatItem[] = []
  let lastPage: string | null = null
  for (const result of results) {
    const firstInGroup = result.pageTitle !== lastPage
    lastPage = result.pageTitle
    out.push({ result, firstInGroup })
  }
  return out
}

const Row = styled(XStack, {
  items: 'center',
  gap: '$2',
  px: '$3',
  py: '$2',
  rounded: '$4',
  cursor: 'pointer',
  hoverStyle: { bg: '$color3' },

  variants: {
    selected: {
      true: { bg: '$color4' },
    },
  } as const,
})

function ResultRow({
  item,
  selected,
  onHover,
  onOpen,
  onCommit,
}: {
  item: FlatItem
  selected: boolean
  onHover: () => void
  // url results + keyboard activation: navigate programmatically
  onOpen: () => void
  // in-app results: <Link> navigates, this just commits the recent + closes
  onCommit: () => void
}) {
  const { doc, titleSegments, descriptionSegments } = item.result

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

  return (
    <YStack>
      {item.firstInGroup && (
        <SizableText
          size="$2"
          fontWeight="600"
          color="$color10"
          textTransform="uppercase"
          letterSpacing={0.5}
          px="$3"
          pt="$2"
          pb="$1"
        >
          {item.result.pageTitle}
        </SizableText>
      )}
      {doc.url ? (
        <Row
          render="button"
          aria-label={doc.title}
          selected={selected}
          onMouseEnter={onHover}
          onPress={onOpen}
        >
          {body}
        </Row>
      ) : (
        <Link href={routeFor(doc) as Href} asChild onPress={onCommit}>
          <Row
            aria-label={doc.title}
            selected={selected}
            onMouseEnter={onHover}
          >
            {body}
          </Row>
        </Link>
      )}
    </YStack>
  )
}

function ModalInner() {
  const {
    query,
    setQuery,
    results,
    loading,
    fuzzy,
    setFuzzy,
    recent,
    commitRecent,
    clearRecent,
    suggestions,
  } = useWikiSearch()

  const items = useMemo(() => flatten(results), [results])
  const [selected, setSelected] = useState(0)

  useEffect(() => {
    setSelected(0)
  }, [results])

  const finish = () => {
    commitRecent(query)
    closeSearch()
  }

  const openResult = (result: WikiSearchResult) => {
    finish()
    if (result.doc.url) {
      openExternal(result.doc.url)
    } else {
      router.navigate(routeFor(result.doc) as Href)
    }
  }

  const onInputKeyDown = (key: string) => {
    if (key === 'ArrowDown') {
      setSelected((s) => Math.min(s + 1, items.length - 1))
    } else if (key === 'ArrowUp') {
      setSelected((s) => Math.max(s - 1, 0))
    } else if (key === 'Enter') {
      const item = items[selected]
      if (item) openResult(item.result)
    } else if (key === 'Escape') {
      closeSearch()
    }
  }

  return (
    <YStack gap="$3">
      <XStack items="center" gap="$3">
        <MagnifyingGlassIcon size={20} color="$color10" />
        <Input
          flex={1}
          placeholder="Search the wiki..."
          value={query}
          onChangeText={setQuery}
          onKeyDown={(e) => onInputKeyDown(e.nativeEvent.key)}
          autoFocus
        />
      </XStack>

      <XStack items="center" justify="space-between" px="$1">
        <SizableText size="$2" color="$color10">
          {fuzzy ? 'Fuzzy matching on' : 'Exact matching'}
        </SizableText>
        <FuzzyToggle value={fuzzy} onChange={setFuzzy} />
      </XStack>

      <Separator opacity={0.4} />

      <ScrollView maxHeight={440} showsVerticalScrollIndicator={false}>
        <YStack gap="$1">
          {!query.trim() && recent.length > 0 && (
            <YStack gap="$2">
              <XStack items="center" justify="space-between" px="$2">
                <SizableText size="$3" color="$color10">
                  Recent searches
                </SizableText>
                <SizableText
                  size="$2"
                  color="$color9"
                  cursor="pointer"
                  onPress={clearRecent}
                >
                  Clear
                </SizableText>
              </XStack>
              {recent.map((item) => (
                <XStack
                  key={item}
                  render="button"
                  aria-label={item}
                  px="$3"
                  py="$2"
                  rounded="$4"
                  cursor="pointer"
                  hoverStyle={{ bg: '$color3' }}
                  onPress={() => setQuery(item)}
                >
                  <SizableText size="$4" color="$color11">
                    {item}
                  </SizableText>
                </XStack>
              ))}
            </YStack>
          )}

          {loading && (
            <YStack items="center" py="$6" gap="$3">
              <Spinner size="large" />
            </YStack>
          )}

          {!loading && !!query.trim() && items.length === 0 && (
            <YStack py="$4" gap="$3">
              <SizableText size="$4" color="$color10" text="center">
                No results found
              </SizableText>
              {suggestions.length > 0 && (
                <YStack gap="$1">
                  <SizableText size="$2" color="$color9" px="$2">
                    Did you mean
                  </SizableText>
                  {suggestions.map((suggestion) => (
                    <XStack
                      key={suggestion}
                      render="button"
                      aria-label={suggestion}
                      px="$3"
                      py="$2"
                      rounded="$4"
                      cursor="pointer"
                      hoverStyle={{ bg: '$color3' }}
                      onPress={() => setQuery(suggestion)}
                    >
                      <SizableText size="$4" color="$color11">
                        {suggestion}
                      </SizableText>
                    </XStack>
                  ))}
                </YStack>
              )}
            </YStack>
          )}

          {!loading &&
            items.map((item, index) => (
              <ResultRow
                key={item.result.doc.id}
                item={item}
                selected={index === selected}
                onHover={() => setSelected(index)}
                onOpen={() => openResult(item.result)}
                onCommit={finish}
              />
            ))}
        </YStack>
      </ScrollView>
    </YStack>
  )
}

// the integrator mounts this once in _layout and owns the global ⌘K listener;
// here we only render the overlay while the shared store says it is open
export function WikiSearchModal() {
  const open = useSearchOpen()

  if (!open) return null

  return (
    <YStack
      position="fixed"
      inset={0}
      z={400_000}
      items="center"
      pt="$10"
      px="$4"
      onPress={() => closeSearch()}
    >
      <YStack position="absolute" inset={0} bg="$shadow6" backdropFilter="blur(3px)" />
      <YStack
        position="relative"
        z={1}
        width="100%"
        maxW={640}
        maxH="70vh"
        overflow="hidden"
        bg="$background08"
        borderWidth={0.5}
        borderColor="$color3"
        rounded="$8"
        p="$3"
        gap="$2"
        backdropFilter="blur(25px)"
        shadowColor="$shadow3"
        shadowRadius={20}
        shadowOffset={{ height: 20, width: 0 }}
        onPress={(e) => e.stopPropagation()}
      >
        <ModalInner />
      </YStack>
    </YStack>
  )
}
