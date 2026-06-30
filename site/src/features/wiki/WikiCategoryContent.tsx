import { SizableText, XStack, YStack } from 'tamagui'

import { Link } from '~/components/Link'
import { ChatCircleIcon } from '~/icons/phosphor/ChatCircleIcon'
import { H1, SubHeading } from '~/interface/text/Headings'

import { countVisible, type EntryVisibilityFilters } from './entryVisibility'
import { useWikiFilters } from './useWikiFilters'
import { WikiSectionList } from './WikiSectionList'
import { useShowNsfw } from './wikiSettingsStorage'

import type { WikiPage } from './types'
import type { Href } from 'one'

const countPageVisible = (page: WikiPage, filters: EntryVisibilityFilters) =>
  page.sections.reduce(
    (sum, section) =>
      sum +
      countVisible(section.entries, filters) +
      section.subsections.reduce(
        (subSum, sub) => subSum + countVisible(sub.entries, filters),
        0
      ),
    0
  )

// fmhy.net's subtle "Got feedback?" card under the page title
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

export function WikiCategoryContent({ page }: { page: WikiPage }) {
  const { starredOnly, indexesOnly } = useWikiFilters()
  const [showNsfw] = useShowNsfw()
  const visible = countPageVisible(page, { starredOnly, indexesOnly, showNsfw })

  return (
    <YStack pb="$10" gap="$2">
      <YStack gap="$2" pt="$4" pb="$2">
        <H1
          fontSize={32}
          lineHeight={40}
          fontWeight="600"
          color="$accent11"
          textDecorationLine="underline"
        >
          {page.title}
        </H1>

        {!!page.description && <SubHeading size="$5">{page.description}</SubHeading>}

        <FeedbackCard />

        <SizableText size="$3" color="$color9">
          {visible === page.entryCount
            ? `${page.entryCount} entries`
            : `${visible} of ${page.entryCount} entries shown`}
        </SizableText>
      </YStack>

      <WikiSectionList page={page} />
    </YStack>
  )
}
