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
import {
  getExcerptMatches,
  MAX_RESULTS,
  peekExcerptSource,
  useExcerptSource,
  useWikiSearch,
  type WikiSearchResult,
} from './useWikiSearch'

import type { HighlightSegment } from './searchHighlight'
import type { SearchDoc } from './types'

// initial slice + "show more" growth increment — mirrors fmhy.net's
// RESULTS_PAGE_SIZE (VPLocalSearchBox.vue), just a slightly larger first page
// since we don't paginate a results-info line update on every keystroke
const INITIAL_RESULTS = 20
const RESULTS_PAGE_SIZE = 16

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
        )
      )}
    </>
  )
}

// detailed-view excerpt renderer: like HighlightedText, but each matched span
// gets a stable id (for scrollIntoView) and the currently-active occurrence
// is emphasized so match-cycling has something to visually land on
function ExcerptText({
  docId,
  segments,
  activeMatch,
}: {
  docId: string
  segments: HighlightSegment[]
  activeMatch: number
}) {
  let matchIndex = -1
  return (
    <>
      {segments.map((segment, index) => {
        if (!segment.match) {
          return <Text key={index}>{segment.text}</Text>
        }
        matchIndex += 1
        const isActive = matchIndex === activeMatch
        return (
          <Text
            key={index}
            id={`search-match-${docId}-${matchIndex}`}
            color={isActive ? '$color1' : '$accent10'}
            bg={isActive ? '$accent9' : undefined}
            fontWeight="700"
            rounded="$1"
          >
            {segment.text}
          </Text>
        )
      })}
    </>
  )
}

// pill toggle replacing the native Switch — keeps the surface within tamagui primitives
function PillToggle({
  label,
  ariaLabel,
  value,
  onChange,
}: {
  label: string
  ariaLabel: string
  value: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <XStack
      render="button"
      aria-label={ariaLabel}
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
        {label}
      </SizableText>
    </XStack>
  )
}

function routeFor(doc: SearchDoc): string {
  return (
    toPlatformWikiRoute(`/${doc.pageId}#${doc.anchor}`) ?? `/${doc.pageId}#${doc.anchor}`
  )
}

// fmhy.net's result list is flat — every row shows its own full breadcrumb
// (their `p.titles` array with chevron separators) instead of a shared
// section header, e.g. "Internet Tools › Browser Tools"
function breadcrumbFor(doc: SearchDoc): string {
  return doc.sectionPath ? `${doc.pageTitle} › ${doc.sectionPath}` : doc.pageTitle
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

// small "‹ N / M ›" match navigator shown under a detailed-view excerpt when
// it has more than one highlighted occurrence — mirrors fmhy.net's
// match-nav-button / match-count (VPLocalSearchBox.vue ~:1804-1832)
function MatchNav({
  active,
  count,
  onPrev,
  onNext,
}: {
  active: number
  count: number
  onPrev: () => void
  onNext: () => void
}) {
  const safeActive = ((active % count) + count) % count
  return (
    <XStack items="center" gap="$1.5">
      <SizableText
        render="button"
        aria-label="Previous match"
        size="$3"
        color="$color10"
        cursor="pointer"
        px="$1"
        hoverStyle={{ color: '$color12' }}
        onPress={onPrev}
      >
        ‹
      </SizableText>
      <SizableText size="$2" color="$color9" fontFamily="$mono">
        {safeActive + 1} / {count}
      </SizableText>
      <SizableText
        render="button"
        aria-label="Next match"
        size="$3"
        color="$color10"
        cursor="pointer"
        px="$1"
        hoverStyle={{ color: '$color12' }}
        onPress={onNext}
      >
        ›
      </SizableText>
    </XStack>
  )
}

function ResultRow({
  result,
  selected,
  detailedView,
  activeMatch,
  onHover,
  onOpen,
  onCommit,
  onCycleMatch,
}: {
  result: WikiSearchResult
  selected: boolean
  detailedView: boolean
  // current occurrence index within this result's excerpt (only meaningful
  // once it has 2+ matches — see MatchNav)
  activeMatch: number
  onHover: () => void
  // url results + keyboard activation: navigate programmatically
  onOpen: () => void
  // in-app results: <Link> navigates, this just commits the recent + closes
  onCommit: () => void
  onCycleMatch: (matchCount: number, direction: 1 | -1) => void
}) {
  const { doc, titleSegments, descriptionSegments, matchTerms } = result
  const excerptSource = useExcerptSource(doc, detailedView)
  const excerpt = detailedView ? getExcerptMatches(excerptSource, matchTerms) : null

  const body = (
    <YStack flex={1} gap="$0.5">
      <SizableText size="$2" color="$color9">
        {breadcrumbFor(doc)}
      </SizableText>
      <XStack items="center" gap="$2">
        {doc.starred && <StarIcon size={12} color="$accent9" />}
        <SizableText size="$4" fontWeight="600" color="$color12">
          <HighlightedText segments={titleSegments} />
        </SizableText>
      </XStack>
      {!detailedView && descriptionSegments.length > 0 && (
        <SizableText size="$3" color="$color10" numberOfLines={2}>
          <HighlightedText segments={descriptionSegments} />
        </SizableText>
      )}
    </YStack>
  )

  // detailed view's excerpt + match-nav sit outside the pressable row/link so
  // a nested <button> never lands inside an <a> (invalid + focus-order bugs)
  const detailPanel = detailedView && (
    <YStack px="$3" pb="$2" gap="$1.5" bg={selected ? '$color4' : undefined} rounded="$4">
      {excerpt && excerpt.segments.length > 0 ? (
        <>
          <SizableText size="$3" color="$color10" lineHeight={20}>
            <ExcerptText
              docId={doc.id}
              segments={excerpt.segments}
              activeMatch={activeMatch}
            />
          </SizableText>
          {excerpt.matchCount > 1 && (
            <MatchNav
              active={activeMatch}
              count={excerpt.matchCount}
              onPrev={() => onCycleMatch(excerpt.matchCount, -1)}
              onNext={() => onCycleMatch(excerpt.matchCount, 1)}
            />
          )}
        </>
      ) : excerptSource === undefined ? (
        <SizableText size="$3" color="$color8" fontStyle="italic">
          Loading preview…
        </SizableText>
      ) : (
        descriptionSegments.length > 0 && (
          <SizableText size="$3" color="$color10" numberOfLines={2}>
            <HighlightedText segments={descriptionSegments} />
          </SizableText>
        )
      )}
    </YStack>
  )

  return (
    <YStack>
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
          <Row aria-label={doc.title} selected={selected} onMouseEnter={onHover}>
            {body}
          </Row>
        </Link>
      )}
      {detailPanel}
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
    detailedView,
    setDetailedView,
    recent,
    commitRecent,
    removeRecent,
    clearRecent,
    suggestions,
  } = useWikiSearch()

  const [selected, setSelected] = useState(0)
  const [visibleCount, setVisibleCount] = useState(INITIAL_RESULTS)
  const [activeMatchByDoc, setActiveMatchByDoc] = useState<Record<string, number>>({})
  // bumped every time the modal opens so the input remounts and autoFocus
  // re-fires — everything else here (query/results/selection/scroll) stays
  // mounted across opens, so reopening ⌘K shows the same search state, the
  // same way fmhy.net's module-level singleton refs survive modal remounts
  const open = useSearchOpen()
  const [openCount, setOpenCount] = useState(0)
  useEffect(() => {
    if (open) setOpenCount((c) => c + 1)
  }, [open])

  const visibleResults = useMemo(
    () => results.slice(0, visibleCount),
    [results, visibleCount]
  )
  const hasMore = visibleCount < results.length

  useEffect(() => {
    setSelected(0)
    setVisibleCount(INITIAL_RESULTS)
    setActiveMatchByDoc({})
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

  const cycleMatch = (docId: string, matchCount: number, direction: 1 | -1) => {
    if (matchCount <= 0) return
    const current = activeMatchByDoc[docId] ?? 0
    const next = (((current + direction) % matchCount) + matchCount) % matchCount
    setActiveMatchByDoc((prev) => ({ ...prev, [docId]: next }))
    if (typeof document !== 'undefined') {
      document
        .getElementById(`search-match-${docId}-${next}`)
        ?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }
  }

  const onInputKeyDown = (e: { nativeEvent: KeyboardEvent }) => {
    const ne = e.nativeEvent
    const key = ne.key

    if (key === 'ArrowDown') {
      setSelected((s) => (visibleResults.length ? (s + 1) % visibleResults.length : 0))
    } else if (key === 'ArrowUp') {
      setSelected((s) =>
        visibleResults.length
          ? (s - 1 + visibleResults.length) % visibleResults.length
          : 0
      )
    } else if (key === 'ArrowLeft' || key === 'ArrowRight') {
      // detailed-view-only: cycle matches within the selected result when the
      // caret sits at the edge the arrow points toward, so normal cursor
      // movement inside the query text is left alone everywhere else
      const target = visibleResults[selected]
      if (!target || !detailedView) return
      const excerpt = getExcerptMatches(peekExcerptSource(target.doc), target.matchTerms)
      if (!excerpt || excerpt.matchCount <= 1) return
      const input = ne.target as HTMLInputElement | null
      const atStart = !input || (input.selectionStart === 0 && input.selectionEnd === 0)
      const atEnd =
        !input ||
        (input.selectionStart === input.value.length &&
          input.selectionEnd === input.value.length)
      if (key === 'ArrowLeft' && atStart) {
        ne.preventDefault()
        cycleMatch(target.doc.id, excerpt.matchCount, -1)
      } else if (key === 'ArrowRight' && atEnd) {
        ne.preventDefault()
        cycleMatch(target.doc.id, excerpt.matchCount, 1)
      }
    } else if (key === 'Enter') {
      const result = visibleResults[selected] ?? visibleResults[0]
      if (result) openResult(result)
    } else if (key === 'Escape') {
      closeSearch()
    }
  }

  return (
    <YStack gap="$3">
      <XStack items="center" gap="$3">
        <MagnifyingGlassIcon size={20} color="$color10" />
        <Input
          key={openCount}
          flex={1}
          placeholder="Search the wiki..."
          value={query}
          onChangeText={setQuery}
          onKeyDown={onInputKeyDown}
          autoFocus
        />
      </XStack>

      <XStack items="center" justify="space-between" px="$1">
        <SizableText size="$2" color="$color10">
          {fuzzy ? 'Fuzzy matching on' : 'Exact matching'}
        </SizableText>
        <XStack items="center" gap="$2">
          <PillToggle
            label="Detailed"
            ariaLabel="Toggle detailed view"
            value={detailedView}
            onChange={setDetailedView}
          />
          <PillToggle
            label="Fuzzy"
            ariaLabel="Toggle fuzzy search"
            value={fuzzy}
            onChange={setFuzzy}
          />
        </XStack>
      </XStack>

      <Separator opacity={0.4} />

      <ScrollView maxHeight={440} showsVerticalScrollIndicator={false}>
        <YStack gap="$1">
          {!query.trim() && recent.length > 0 && (
            <YStack gap="$2" px="$2" pb="$2">
              <XStack items="center" justify="space-between">
                <SizableText
                  size="$2"
                  fontWeight="600"
                  color="$color10"
                  textTransform="uppercase"
                  letterSpacing={0.5}
                >
                  Recent
                </SizableText>
                <SizableText
                  size="$2"
                  color="$color9"
                  cursor="pointer"
                  onPress={clearRecent}
                >
                  Clear all
                </SizableText>
              </XStack>
              <XStack gap="$2" flexWrap="wrap">
                {recent.map((item) => (
                  <XStack
                    key={item}
                    items="center"
                    gap="$1.5"
                    pl="$3"
                    pr="$2"
                    py="$1.5"
                    rounded="$10"
                    borderWidth={1}
                    borderColor="$color5"
                    bg="$color2"
                    hoverStyle={{ borderColor: '$color7' }}
                  >
                    <SizableText
                      render="button"
                      aria-label={item}
                      size="$3"
                      color="$color11"
                      cursor="pointer"
                      onPress={() => setQuery(item)}
                    >
                      {item}
                    </SizableText>
                    <SizableText
                      render="button"
                      aria-label={`Remove ${item}`}
                      size="$3"
                      color="$color9"
                      cursor="pointer"
                      hoverStyle={{ color: '$color11' }}
                      onPress={() => removeRecent(item)}
                    >
                      ×
                    </SizableText>
                  </XStack>
                ))}
              </XStack>
            </YStack>
          )}

          {loading && (
            <YStack items="center" py="$6" gap="$3">
              <Spinner size="large" />
            </YStack>
          )}

          {!loading && !!query.trim() && visibleResults.length === 0 && (
            <YStack py="$4" gap="$3">
              <SizableText size="$4" color="$color10" text="center">
                No results found
              </SizableText>
              {!fuzzy && (
                <XStack justify="center">
                  <SizableText
                    render="button"
                    aria-label="Try fuzzy search"
                    size="$3"
                    color="$accent10"
                    cursor="pointer"
                    onPress={() => setFuzzy(true)}
                  >
                    Try fuzzy search?
                  </SizableText>
                </XStack>
              )}
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

          {!loading && !!query.trim() && results.length > 0 && (
            <SizableText size="$2" color="$color9" px="$2" pb="$1">
              Showing {visibleResults.length} of {results.length}
              {results.length >= MAX_RESULTS ? '+' : ''} matches
            </SizableText>
          )}

          {!loading &&
            visibleResults.map((result, index) => (
              <ResultRow
                key={result.doc.id}
                result={result}
                selected={index === selected}
                detailedView={detailedView}
                activeMatch={activeMatchByDoc[result.doc.id] ?? 0}
                onHover={() => setSelected(index)}
                onOpen={() => openResult(result)}
                onCommit={finish}
                onCycleMatch={(matchCount, direction) =>
                  cycleMatch(result.doc.id, matchCount, direction)
                }
              />
            ))}

          {!loading && hasMore && (
            <XStack justify="center" py="$2">
              <SizableText
                render="button"
                aria-label="Show more results"
                size="$3"
                color="$accent10"
                cursor="pointer"
                onPress={() =>
                  setVisibleCount((c) => Math.min(results.length, c + RESULTS_PAGE_SIZE))
                }
              >
                Show more results ({results.length - visibleResults.length} remaining)
              </SizableText>
            </XStack>
          )}
        </YStack>
      </ScrollView>
    </YStack>
  )
}

// the integrator mounts this once in _layout and owns the global ⌘K listener;
// here we only render the overlay while the shared store says it is open.
// ModalInner stays mounted after the first open (just hidden) so query/
// results/scroll state survives closing and reopening the modal.
export function WikiSearchModal() {
  const open = useSearchOpen()
  const [hasOpenedOnce, setHasOpenedOnce] = useState(false)

  useEffect(() => {
    if (open) setHasOpenedOnce(true)
  }, [open])

  if (!hasOpenedOnce) return null

  return (
    <YStack
      position="fixed"
      inset={0}
      z={400_000}
      items="center"
      pt="$10"
      px="$4"
      display={open ? 'flex' : 'none'}
      pointerEvents={open ? 'auto' : 'none'}
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
