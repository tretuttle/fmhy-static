import { useUserScheme } from '@vxrn/color-scheme'
import { Popover, Switch, XStack, YStack } from 'tamagui'

import { CircleHalfIcon } from '~/icons/phosphor/CircleHalfIcon'
import { MoonStarsIcon } from '~/icons/phosphor/MoonStarsIcon'
import { SunIcon } from '~/icons/phosphor/SunIcon'
import { Text } from '~/interface/text/Text'

import { useAmoled, useMonochrome } from './themeSettings'

import type { IconComponent } from '~/icons/types'

// base light/dark/system reuses the tamagui scheme provider (same mechanism as ThemeSwitch).
// amoled/accent/monochrome are the extra fmhy theming layers wired through themeSettings.
type ModeId = 'light' | 'dark' | 'system'

const MODES: { id: ModeId; label: string; Icon: IconComponent }[] = [
  { id: 'light', label: 'Light', Icon: SunIcon },
  { id: 'dark', label: 'Dark', Icon: MoonStarsIcon },
  { id: 'system', label: 'System', Icon: CircleHalfIcon },
]

function SectionLabel({ children }: { children: string }) {
  return (
    <Text
      size="$1"
      color="$color10"
      fontWeight="600"
      letterSpacing={0.5}
      textTransform="uppercase"
    >
      {children}
    </Text>
  )
}

function ModeSegment({
  active,
  onSelect,
}: {
  active: ModeId
  onSelect: (mode: ModeId) => void
}) {
  return (
    <XStack gap="$1" bg="$color3" rounded="$4" p="$1">
      {MODES.map(({ id, label, Icon }) => {
        const isActive = active === id
        return (
          <XStack
            key={id}
            render="button"
            onPress={() => onSelect(id)}
            aria-label={`${label} mode`}
            flex={1}
            items="center"
            justify="center"
            gap="$1.5"
            py="$1.5"
            rounded="$3"
            cursor="pointer"
            bg={isActive ? '$color1' : 'transparent'}
            hoverStyle={isActive ? {} : { bg: '$color2' }}
            pressStyle={{ bg: '$color4' }}
          >
            <Icon size={14} color={isActive ? '$color12' : '$color10'} />
            <Text
              size="$2"
              color={isActive ? '$color12' : '$color10'}
              fontWeight={isActive ? '600' : '400'}
            >
              {label}
            </Text>
          </XStack>
        )
      })}
    </XStack>
  )
}

function ToggleRow({
  label,
  checked,
  onCheckedChange,
}: {
  label: string
  checked: boolean
  onCheckedChange: (value: boolean) => void
}) {
  return (
    <XStack items="center" justify="space-between" gap="$3">
      <Text size="$3" color="$color11">
        {label}
      </Text>
      <Switch
        size="$2"
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-label={label}
        bg={checked ? '$color9' : '$color6'}
      >
        <Switch.Thumb bg="$color12" />
      </Switch>
    </XStack>
  )
}

// inner theme controls, reusable inside any popover/sheet (e.g. the header overflow menu)
export function ThemeMenuContents() {
  const userScheme = useUserScheme()
  const [amoled, setAmoled] = useAmoled()
  const [monochrome, setMonochrome] = useMonochrome()

  const onSelectMode = (mode: ModeId) => {
    userScheme.set(mode)
  }

  // amoled is a dark-mode variant, so enabling it forces the dark scheme to take effect
  const onAmoledChange = (next: boolean) => {
    setAmoled(next)
    if (next && userScheme.value !== 'dark') {
      userScheme.set('dark')
    }
  }

  return (
    <YStack gap="$3.5" p="$3.5" width={280}>
      <YStack gap="$2">
        <SectionLabel>Mode</SectionLabel>
        <ModeSegment active={userScheme.setting} onSelect={onSelectMode} />
      </YStack>

      <YStack gap="$2.5">
        <ToggleRow label="AMOLED" checked={amoled} onCheckedChange={onAmoledChange} />
        <ToggleRow
          label="Monochrome"
          checked={monochrome}
          onCheckedChange={setMonochrome}
        />
      </YStack>
    </YStack>
  )
}

export function ThemeMenu() {
  return (
    <Popover placement="bottom-end" allowFlip>
      <Popover.Trigger asChild>
        <XStack
          render="button"
          aria-label="Theme settings"
          width={36}
          height={36}
          items="center"
          justify="center"
          rounded={100}
          cursor="pointer"
          bg="transparent"
          borderWidth={0}
          hoverStyle={{ bg: '$color3' }}
          pressStyle={{ bg: '$color2' }}
        >
          <MoonStarsIcon size={18} color="$color12" />
        </XStack>
      </Popover.Trigger>

      <Popover.Content
        bg="$color2"
        borderWidth={1}
        borderColor="$color5"
        rounded="$4"
        p="$0"
        elevate
      >
        <ThemeMenuContents />
      </Popover.Content>
    </Popover>
  )
}

ThemeMenu.title = 'Theme Menu'
