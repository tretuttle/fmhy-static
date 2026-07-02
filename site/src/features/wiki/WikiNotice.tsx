import { XStack, YStack } from 'tamagui'

import { InfoIcon } from '~/icons/phosphor/InfoIcon'
import { LightbulbIcon } from '~/icons/phosphor/LightbulbIcon'
import { WarningIcon } from '~/icons/phosphor/WarningIcon'
import { Text } from '~/interface/text/Text'

import { InlineMarkdown } from './InlineMarkdown'

import type { WikiNotice as WikiNoticeType } from './types'
import type { ColorTokens } from 'tamagui'
import type { IconComponent } from '~/icons/types'

// vitepress custom blocks (fmhy.net): a title row ("TIP"/"WARNING"/"INFO")
// with a per-kind icon above the body, everything tinted the block color.
// upstream style.scss masks lucide icons (lightbulb / alert-triangle / info)
// into .custom-block-title::before; we use the phosphor equivalents.
// info has no dedicated theme tokens, so it rides the accent (swarm-blue)
// ramp — the same hues upstream's --vp-custom-block-info-* resolve to.
type NoticeStyle = {
  label: string
  Icon: IconComponent
  bg: ColorTokens
  border: ColorTokens
  text: ColorTokens
}

const INFO_STYLE: NoticeStyle = {
  label: 'INFO',
  Icon: InfoIcon,
  bg: '$accent2',
  border: '$accent4',
  text: '$accent11',
}

const NOTICE_STYLES: Record<string, NoticeStyle> = {
  tip: {
    label: 'TIP',
    Icon: LightbulbIcon,
    bg: '$tipBg',
    border: '$tipBorder',
    text: '$tipText',
  },
  warning: {
    label: 'WARNING',
    Icon: WarningIcon,
    bg: '$warnBg',
    border: '$warnBorder',
    text: '$warnText',
  },
  info: INFO_STYLE,
}

export function WikiNotice({ notice }: { notice: WikiNoticeType }) {
  // kind is treated as an open string — unknown future kinds fall back to info
  const style = NOTICE_STYLES[notice.kind as string] ?? INFO_STYLE

  return (
    <YStack
      gap="$1.5"
      p="$3.5"
      my="$2"
      rounded="$5"
      borderWidth={1}
      bg={style.bg}
      borderColor={style.border}
    >
      <XStack gap="$2" items="center">
        <style.Icon size={16} color={style.text} />
        <Text size="$3" fontWeight="600" color={style.text}>
          {style.label}
        </Text>
      </XStack>
      <Text size="$3" lineHeight={20} color={style.text}>
        <InlineMarkdown markdown={notice.markdown} linkColor={style.text} />
      </Text>
    </YStack>
  )
}
