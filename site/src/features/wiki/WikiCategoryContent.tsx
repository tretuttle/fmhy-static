import { YStack } from 'tamagui'

import { H1, SubHeading } from '~/interface/text/Headings'

import { FeedbackCard } from './FeedbackCard'
import { WikiDocFooter } from './WikiDocFooter'
import { WikiSectionList } from './WikiSectionList'

import type { WikiPage } from './types'

export function WikiCategoryContent({ page }: { page: WikiPage }) {
  return (
    <YStack pb="$10">
      <YStack gap="$2">
        {/* .vp-doc h1: 32px/40px 600, tight tracking — fmhy.net underlines and
            accents CATEGORY page H1s (e.g. "Adblocking / Privacy") but leaves
            PROSE page H1s (e.g. "Changelog Sites" under /posts) plain — see
            WikiProseContent's PageTitle */}
        <H1
          fontSize={32}
          lineHeight={40}
          fontWeight="600"
          letterSpacing={-0.64}
          color="$accent11"
          textDecorationLine="underline"
        >
          {page.title}
        </H1>

        {!!page.description && <SubHeading size="$5">{page.description}</SubHeading>}

        <FeedbackCard />
      </YStack>

      <WikiSectionList page={page} />

      <WikiDocFooter page={page} />
    </YStack>
  )
}
