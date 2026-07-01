import { SizableText, XStack, YStack } from 'tamagui'

import { ChatCircleIcon } from '~/icons/phosphor/ChatCircleIcon'
import { H1, SubHeading } from '~/interface/text/Headings'

// one card per anonymous testimonial, mirroring fmhy.net's feedback page —
// static curated quotes only, no submission form (that's a separate,
// out-of-scope backend flow on fmhy.net)
const QuoteCard = ({ quote }: { quote: string }) => (
  <XStack
    items="flex-start"
    gap="$3"
    p="$4"
    bg="$color2"
    borderWidth={1}
    borderColor="$color4"
    rounded="$5"
  >
    <ChatCircleIcon size={18} color="$accent9" />
    <SizableText flex={1} size="$3" lineHeight={22} color="$color11" fontStyle="italic">
      “{quote}”
    </SizableText>
  </XStack>
)

export function WikiFeedbackContent({ quotes }: { quotes: string[] }) {
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
          Feedback
        </H1>
        <SubHeading size="$5">
          Anonymous comments taken from Reddit, Discord, X.com and our feedback system.
        </SubHeading>
        <SizableText size="$3" color="$color9">
          {quotes.length} comments
        </SizableText>
      </YStack>

      <YStack gap="$3" pt="$2">
        {quotes.map((quote, index) => (
          <QuoteCard key={index} quote={quote} />
        ))}
      </YStack>
    </YStack>
  )
}
