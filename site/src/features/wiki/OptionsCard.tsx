import { Separator, SizableText, Switch, XStack, YStack } from 'tamagui'

import { ArrowsClockwiseIcon } from '~/icons/phosphor/ArrowsClockwiseIcon'
import { GlobeIcon } from '~/icons/phosphor/GlobeIcon'
import { StarIcon } from '~/icons/phosphor/StarIcon'
import {
  ACCENT_NAMES,
  ACCENT_SWATCHES,
  THEME_NAMES,
  THEME_SWATCHES,
  useAccent,
  useThemeName,
} from '~/features/theme/themeSettings'

import { useWikiFilters } from './useWikiFilters'

import type { ColorTokens } from 'tamagui'
import type { IconComponent } from '~/icons/types'

// "blue-violet" -> "Blue violet"
function capitalizeAccent(name: string) {
  const spaced = name.replaceAll('-', ' ')
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

// emoji legend mirrors fmhy.net SidebarCard: globe / repeat / star
const LEGEND: { Icon: IconComponent; label: string; color: ColorTokens }[] = [
  { Icon: GlobeIcon, label: 'Indexes', color: '$color11' },
  { Icon: ArrowsClockwiseIcon, label: 'Section Links', color: '$color11' },
  { Icon: StarIcon, label: 'Recommendations', color: '$gold' },
]

function Heading({ children }: { children: string }) {
  return (
    <SizableText size="$2" fontFamily="$body" fontWeight="700" color="$color12">
      {children}
    </SizableText>
  )
}

function ToggleRow({
  label,
  checked,
  onCheckedChange,
}: {
  label: string
  checked: boolean
  onCheckedChange: (on: boolean) => void
}) {
  return (
    <XStack items="center" justify="space-between">
      <SizableText size="$2" color="$color11">
        {label}
      </SizableText>
      <Switch
        size="$2"
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-label={label}
        bg={checked ? '$color8' : '$color5'}
        borderWidth={1}
        borderColor="$color6"
      >
        <Switch.Thumb animation="quick" bg="$color12" />
      </Switch>
    </XStack>
  )
}

// round swatch per accent; active gets a 2px ring (mirrors the fmhy.net ColorPicker).
function AccentPicker() {
  const [accent, setAccent] = useAccent()

  return (
    <XStack flexWrap="wrap" gap="$2">
      {ACCENT_NAMES.map((name) => {
        const isActive = accent === name
        const label = capitalizeAccent(name)
        return (
          <XStack
            key={name}
            render="button"
            onPress={() => setAccent(name)}
            aria-label={label}
            width={24}
            height={24}
            rounded={100}
            cursor="pointer"
            borderWidth={2}
            borderColor={isActive ? '$color12' : 'transparent'}
            hoverStyle={{ borderColor: isActive ? '$color12' : '$color7' }}
            style={{ backgroundColor: ACCENT_SWATCHES[name] }}
          />
        )
      })}
    </XStack>
  )
}

// full palette themes (catppuccin, monochrome) — independent from the accent
// scale above; swaps background/text/callout colors too, not just the brand
// scale (mirrors fmhy.net's separate ThemeSelector, docs/.vitepress/theme/
// themes/README.md). "Default" clears back to the base light/dark palette.
function ThemePicker() {
  const [themeName, setThemeName] = useThemeName()

  return (
    <XStack flexWrap="wrap" gap="$2">
      <XStack
        render="button"
        onPress={() => setThemeName('default')}
        aria-label="Default"
        width={24}
        height={24}
        rounded={100}
        cursor="pointer"
        borderWidth={2}
        borderColor={themeName === 'default' ? '$color12' : '$color6'}
        hoverStyle={{ borderColor: '$color12' }}
        bg="$color4"
      />
      {THEME_NAMES.filter((name) => name !== 'default').map((name) => {
        const isActive = themeName === name
        const label = capitalizeAccent(name)
        return (
          <XStack
            key={name}
            render="button"
            onPress={() => setThemeName(name)}
            aria-label={label}
            width={24}
            height={24}
            rounded={100}
            cursor="pointer"
            borderWidth={2}
            borderColor={isActive ? '$color12' : 'transparent'}
            hoverStyle={{ borderColor: isActive ? '$color12' : '$color7' }}
            style={{
              backgroundColor: THEME_SWATCHES[name as Exclude<typeof name, 'default'>],
            }}
          />
        )
      })}
    </XStack>
  )
}

// legend + starred/indexes toggles + accent/theme pickers, pinned in the wiki sidebar
export function OptionsCard() {
  const { starredOnly, indexesOnly, setStarredOnly, setIndexesOnly } =
    useWikiFilters()
  const [accent] = useAccent()
  const [themeName] = useThemeName()

  return (
    <YStack
      mx="$2"
      mt="$2"
      p="$3"
      gap="$2.5"
      rounded="$5"
      borderWidth={1}
      borderColor="$color3"
      bg="$color2"
    >
      <Heading>Emoji Legend</Heading>
      {LEGEND.map(({ Icon, label, color }) => (
        <XStack key={label} items="center" gap="$2.5">
          <Icon size={18} color={color} />
          <SizableText size="$2" color="$color11">
            {label}
          </SizableText>
        </XStack>
      ))}

      <Separator my="$1" />

      <Heading>Options</Heading>
      <ToggleRow
        label="Toggle Starred"
        checked={starredOnly}
        onCheckedChange={setStarredOnly}
      />
      <ToggleRow
        label="Toggle Indexes"
        checked={indexesOnly}
        onCheckedChange={setIndexesOnly}
      />

      <SizableText size="$2" color="$color10">
        Accent
      </SizableText>
      <AccentPicker />

      <SizableText size="$2" color="$color10">
        Theme
      </SizableText>
      <ThemePicker />

      <SizableText size="$2" color="$color10">
        {themeName === 'default' ? capitalizeAccent(accent) : capitalizeAccent(themeName)}
      </SizableText>
    </YStack>
  )
}
