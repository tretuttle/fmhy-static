import { useUserScheme } from '@vxrn/color-scheme'
import { flushSync } from 'react-dom'
import { Popover, XStack, YStack } from 'tamagui'

import { CheckIcon } from '~/icons/phosphor/CheckIcon'
import {
  MoonDuotoneIcon,
  MoonStarsDuotoneIcon,
  SunDuotoneIcon,
} from '~/icons/social/ThemeDuotoneIcons'
import { Text } from '~/interface/text/Text'

import { AMOLED_CLASS } from './themePrePaint'
import { useAmoled } from './themeSettings'
import { pointFromPressEvent, revealThemeChange } from './themeTransition'

// fmhy.net parity: the header popup only ever offers Light / Dark / AMOLED —
// no System (the underlying @vxrn/color-scheme 'system' setting still exists,
// it's just not offered here) and no theme-name section (that lives only in
// the sidebar OptionsCard, see themeSettings.ts).
type Row = 'light' | 'dark' | 'amoled'

// icons mirror their ThemeDropdown: i-ph-sun/moon/moon-stars-duotone
const ROWS: { id: Row; label: string; Icon: typeof SunDuotoneIcon }[] = [
  { id: 'light', label: 'Light', Icon: SunDuotoneIcon },
  { id: 'dark', label: 'Dark', Icon: MoonDuotoneIcon },
  { id: 'amoled', label: 'AMOLED', Icon: MoonStarsDuotoneIcon },
]

const ROW_ICONS: Record<Row, typeof SunDuotoneIcon> = {
  light: SunDuotoneIcon,
  dark: MoonDuotoneIcon,
  amoled: MoonStarsDuotoneIcon,
}

function MenuRow({
  label,
  Icon,
  active,
  onPress,
}: {
  label: string
  Icon: typeof SunDuotoneIcon
  active: boolean
  onPress: (event?: unknown) => void
}) {
  return (
    <XStack
      render="button"
      onPress={(event) => onPress(event)}
      aria-label={label}
      items="center"
      justify="space-between"
      gap="$2"
      px="$3.5"
      py="$2.5"
      cursor="pointer"
      bg="transparent"
      // reset the UA button chrome — without this every row wears the
      // browser's default border (same trap as CircleButton)
      borderWidth={0}
      hoverStyle={{ bg: '$color3' }}
      pressStyle={{ bg: '$color4' }}
    >
      <XStack items="center" gap="$2.5">
        <Text render="span" display="inline-flex" color={active ? '$accent11' : '$color11'}>
          <Icon size={18} />
        </Text>
        <Text size="$3" color={active ? '$accent11' : '$color12'} fontWeight={active ? '600' : '400'}>
          {label}
        </Text>
      </XStack>
      {active && <CheckIcon size={14} color="$accent11" />}
    </XStack>
  )
}

// inner theme controls, reusable inside any popover/sheet (e.g. the header overflow menu)
export function ThemeMenuContents() {
  const userScheme = useUserScheme()
  const [amoled, setAmoled] = useAmoled()

  const activeRow: Row = amoled ? 'amoled' : userScheme.value === 'dark' ? 'dark' : 'light'

  // light/dark flips run inside a radial view-transition reveal from the click
  // point (fmhy.net's themeTransition.ts). flushSync forces the scheme
  // provider's class flip to commit inside the transition callback so both
  // snapshots capture around it.
  const onSelectMode = (mode: 'light' | 'dark', event?: unknown) => {
    const isDarkAfter = mode === 'dark'
    const noVisualChange = isDarkAfter === (userScheme.value === 'dark') && !amoled

    if (noVisualChange && mode === userScheme.setting) {
      return
    }

    if (noVisualChange) {
      // setting changes (e.g. was 'system' resolving to the same value) but
      // nothing on screen flips, so skip the reveal and just persist it
      userScheme.set(mode)
      return
    }

    void revealThemeChange(pointFromPressEvent(event), isDarkAfter, () => {
      flushSync(() => {
        userScheme.set(mode)
        if (amoled) {
          setAmoled(false)
        }
      })
    })
  }

  // amoled is a dark-mode variant, so enabling it forces the dark scheme to
  // take effect.
  const onSelectAmoled = (event?: unknown) => {
    if (amoled) {
      return
    }

    void revealThemeChange(pointFromPressEvent(event), true, () => {
      flushSync(() => {
        setAmoled(true)
        if (userScheme.value !== 'dark') {
          userScheme.set('dark')
        }
      })
      // ThemeController toggles this from a passive effect that may land after
      // the new snapshot is captured — set it directly so the reveal shows it
      // (the later effect re-applies the same class, a no-op).
      document.documentElement.classList.add(AMOLED_CLASS)
    })
  }

  const onSelectRow = (row: Row, event?: unknown) => {
    if (row === 'amoled') {
      onSelectAmoled(event)
      return
    }
    onSelectMode(row, event)
  }

  return (
    <YStack width={200} py="$1.5">
      {ROWS.map(({ id, label, Icon }) => (
        <MenuRow
          key={id}
          label={label}
          Icon={Icon}
          active={activeRow === id}
          onPress={(event) => onSelectRow(id, event)}
        />
      ))}
    </YStack>
  )
}

export function ThemeMenu() {
  const userScheme = useUserScheme()
  const [amoled] = useAmoled()
  const TriggerIcon =
    ROW_ICONS[amoled ? 'amoled' : userScheme.value === 'dark' ? 'dark' : 'light']
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
          <TriggerIcon size={18} />
        </XStack>
      </Popover.Trigger>

      <Popover.Content
        bg="$color2"
        borderWidth={1}
        borderColor="$color5"
        rounded="$4"
        p="$0"
        overflow="hidden"
        elevate
      >
        <Popover.Arrow bg="$color2" borderWidth={1} borderColor="$color5" />
        <ThemeMenuContents />
      </Popover.Content>
    </Popover>
  )
}

ThemeMenu.title = 'Theme Menu'
