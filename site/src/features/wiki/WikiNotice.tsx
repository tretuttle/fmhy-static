import { XStack, YStack } from 'tamagui'

import { InfoIcon } from '~/icons/phosphor/InfoIcon'
import { WarningCircleIcon } from '~/icons/phosphor/WarningCircleIcon'
import { Text } from '~/interface/text/Text'

import { InlineMarkdown } from './InlineMarkdown'

import type { WikiNotice as WikiNoticeType } from './types'

export function WikiNotice({ notice }: { notice: WikiNoticeType }) {
  const isTip = notice.kind === 'tip'

  return (
    <XStack
      gap="$2.5"
      p="$3.5"
      my="$2"
      rounded="$5"
      borderWidth={1}
      bg={isTip ? '$tipBg' : '$warnBg'}
      borderColor={isTip ? '$tipBorder' : '$warnBorder'}
    >
      <YStack pt={2}>
        {isTip ? (
          <InfoIcon size={16} color="$tipText" />
        ) : (
          <WarningCircleIcon size={16} color="$warnText" />
        )}
      </YStack>
      <Text flex={1} size="$3" lineHeight={20} color={isTip ? '$tipText' : '$warnText'}>
        <InlineMarkdown markdown={notice.markdown} />
      </Text>
    </XStack>
  )
}
