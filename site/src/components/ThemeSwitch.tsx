import { useUserScheme } from '@vxrn/color-scheme'
import { styled, View } from 'tamagui'

import { CircleHalfIcon } from '~/icons/phosphor/CircleHalfIcon'
import { MoonStarsIcon } from '~/icons/phosphor/MoonStarsIcon'
import { SunIcon } from '~/icons/phosphor/SunIcon'

import { CircleButton } from './CircleButton'

const IconContainer = styled(View, {
  transition: 'quick',
  position: 'absolute',
  opacity: 0,
  pointerEvents: 'none',

  variants: {
    active: {
      true: {
        opacity: 1,
      },
    },
  } as const,
})

const schemeSettings = ['light', 'dark', 'system'] as const

const settingLabels = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
} as const

const iconSize = 18

export function ThemeSwitch() {
  const { onPress, setting } = useToggleTheme()

  return (
    <CircleButton
      tooltip={`Theme: ${settingLabels[setting]}`}
      onPress={onPress}
      aria-label="Toggle theme"
    >
      <View width={iconSize} height={iconSize} items="center" justify="center">
        <IconContainer active={setting === 'light'}>
          <SunIcon size={iconSize} />
        </IconContainer>
        <IconContainer active={setting === 'dark'}>
          <MoonStarsIcon size={iconSize} />
        </IconContainer>
        <IconContainer active={setting === 'system'}>
          <CircleHalfIcon size={iconSize} />
        </IconContainer>
      </View>
    </CircleButton>
  )
}

export function useToggleTheme() {
  const userScheme = useUserScheme()
  const Icon =
    userScheme.setting === 'system'
      ? CircleHalfIcon
      : userScheme.setting === 'dark'
        ? MoonStarsIcon
        : SunIcon

  return {
    setting: userScheme.setting,
    scheme: userScheme.value,
    Icon,
    onPress: () => {
      const currentIndex = schemeSettings.indexOf(userScheme.setting)
      const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % 3 : 0
      const next = schemeSettings[nextIndex]!
      userScheme.set(next)
    },
  }
}
