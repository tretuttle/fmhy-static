import { SizableText, XStack, YStack } from 'tamagui'

import { Link } from '~/components/Link'
import { EnvelopeIcon } from '~/icons/phosphor/EnvelopeIcon'

import type { Href } from 'one'

// fmhy.net's subtle "Got feedback?" card, shown under both wiki category
// page titles (WikiCategoryContent) and prose page titles (WikiProseContent)
export const FeedbackCard = () => (
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
    <YStack
      width={36}
      height={36}
      rounded={100}
      items="center"
      justify="center"
      bg="$accent9"
    >
      <EnvelopeIcon size={18} color="$color1" />
    </YStack>
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
