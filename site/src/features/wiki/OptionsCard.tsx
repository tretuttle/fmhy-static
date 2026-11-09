import { SizableText, Switch, XStack, YStack } from 'tamagui'

import { TwemojiIcon, TWEMOJI_CODES } from '~/icons/TwemojiIcon'
import { useWikiFilters } from './useWikiFilters'

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
      {/* track/thumb colors live in root.css (.fmhy-switch): brand-1 fill +
          white thumb when on, like upstream's Switch.vue */}
      <Switch
        size="$2"
        className={checked ? 'fmhy-switch fmhy-switch-on' : 'fmhy-switch'}
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-label={label}
        borderWidth={1}
      >
        <Switch.Thumb animation="quick" className="fmhy-switch-thumb" />
      </Switch>
    </XStack>
  )
}

// legend + starred/indexes toggles, pinned in the wiki sidebar (SidebarCard.vue).
// the color/theme pickers moved to the header Appearance panel upstream
// (AppearancePanel.vue) — see ~/features/theme/AppearancePanel
export function OptionsCard() {
  const { starredOnly, indexesOnly, setStarredOnly, setIndexesOnly } =
    useWikiFilters()

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
    </YStack>
  )
}
