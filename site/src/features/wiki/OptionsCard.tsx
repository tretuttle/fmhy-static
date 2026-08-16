import { SizableText, Switch, XStack, YStack } from 'tamagui'

import { TwemojiIcon, TWEMOJI_CODES } from '~/icons/TwemojiIcon'
import {
  ACCENT_NAMES,
  ACCENT_SWATCHES,
  THEME_NAMES,
  THEME_SWATCHES,
  useAccent,
  useThemeName,
} from '~/features/theme/themeSettings'

import { useWikiFilters } from './useWikiFilters'

import type { ThemeName } from '~/features/theme/themeSettings'

// "blue-violet" -> "Blue violet"
function capitalizeAccent(name: string) {
  const spaced = name.replaceAll('-', ' ')
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

// emoji legend mirrors fmhy.net SidebarCard: the colorful twemoji themselves
// (i-twemoji-globe-with-meridians / repeat-button / star)
const LEGEND: { code: string; label: string }[] = [
  { code: TWEMOJI_CODES.globeWithMeridians, label: 'Indexes' },
  { code: TWEMOJI_CODES.repeatButton, label: 'Section Links' },
  { code: TWEMOJI_CODES.star, label: 'Recommendations' },
]

function Heading({ children, mt }: { children: string; mt?: string }) {
  return (
    <SizableText size="$2" fontFamily="$body" fontWeight="700" color="$color12" mt={mt as never}>
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

// single flat swatch grid mirroring fmhy.net's ColorPicker.vue: the 7 named
// accent swatches render first, then the full-palette theme swatches
// (catppuccin, monochrome) — no group headers, no selection rings. Picking an
// accent swatch also resets back to the 'default' theme (an accent swatch is
// a "default theme, this accent" pick, same as ColorPicker.vue always driving
// a generated `color-<name>` theme); picking a theme swatch replaces the full
// palette and leaves the stored accent inert until 'default' is picked again.
function ThemeSwatchGrid() {
  const [, setAccent] = useAccent()
  const [, setThemeName] = useThemeName()

  const nonDefaultThemes = THEME_NAMES.filter(
    (name): name is Exclude<ThemeName, 'default'> => name !== 'default',
  )

  return (
    <XStack flexWrap="wrap" gap="$2.5" maxW={190}>
      {ACCENT_NAMES.map((name) => (
        <XStack
          key={name}
          render="button"
          onPress={() => {
            setAccent(name)
            setThemeName('default')
          }}
          aria-label={capitalizeAccent(name)}
          width={26}
          height={26}
          rounded={100}
          borderWidth={0}
          cursor="pointer"
          hoverStyle={{ opacity: 0.8 }}
          pressStyle={{ opacity: 0.6 }}
          style={{ backgroundColor: ACCENT_SWATCHES[name] }}
        />
      ))}
      {nonDefaultThemes.map((name) => (
        <XStack
          key={name}
          render="button"
          onPress={() => setThemeName(name)}
          aria-label={capitalizeAccent(name)}
          width={26}
          height={26}
          rounded={100}
          borderWidth={0}
          cursor="pointer"
          overflow="hidden"
          hoverStyle={{ opacity: 0.8 }}
          pressStyle={{ opacity: 0.6 }}
          // catppuccin wears its circle logo, like their ThemeSelector preview
          style={
            name === 'catppuccin'
              ? {
                  backgroundImage: 'url(/catppuccin.png)',
                  backgroundSize: 'cover',
                }
              : { backgroundColor: THEME_SWATCHES[name] }
          }
        />
      ))}
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
      {LEGEND.map(({ code, label }) => (
        <XStack key={label} items="center" gap="$2.5">
          <TwemojiIcon code={code} size={20} />
          <SizableText size="$2" color="$color11">
            {label}
          </SizableText>
        </XStack>
      ))}

      <Heading mt="$2">Options</Heading>
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

      <ThemeSwatchGrid />

      <SizableText size="$2" color="$color11">
        Theme:{' '}
        {themeName === 'default' ? capitalizeAccent(accent) : capitalizeAccent(themeName)}
      </SizableText>
    </YStack>
  )
}
