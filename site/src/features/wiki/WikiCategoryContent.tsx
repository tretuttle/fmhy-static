import { SizableText, XStack, YStack } from 'tamagui'

import { H1, SubHeading } from '~/interface/text/Headings'

import { wikiNav } from './data'
import { countVisible, type EntryVisibilityFilters } from './entryVisibility'
import { useWikiFilters } from './useWikiFilters'
import { WikiSectionList } from './WikiSectionList'
import { useShowNsfw } from './wikiSettingsStorage'

import type { WikiPage } from './types'

const findNavItem = (slug: string) =>
  wikiNav.groups.flatMap((group) => group.items).find((item) => item.slug === slug)

const countPageVisible = (page: WikiPage, filters: EntryVisibilityFilters) =>
  page.sections.reduce(
    (sum, section) =>
      sum +
      countVisible(section.entries, filters) +
      section.subsections.reduce(
        (subSum, sub) => subSum + countVisible(sub.entries, filters),
        0,
      ),
    0,
  )

export function WikiCategoryContent({ page }: { page: WikiPage }) {
  const { starredOnly, indexesOnly } = useWikiFilters()
  const [showNsfw] = useShowNsfw()
  const navItem = findNavItem(page.id)
  const visible = countPageVisible(page, { starredOnly, indexesOnly, showNsfw })

  return (
    <YStack pb="$10" gap="$2">
      <YStack gap="$2" pt="$4" pb="$2">
        <XStack items="center" gap="$3">
          {!!navItem?.emoji && <SizableText size="$8">{navItem.emoji}</SizableText>}
          <H1 size="$9">{page.title}</H1>
        </XStack>

        {!!page.description && <SubHeading size="$5">{page.description}</SubHeading>}

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
