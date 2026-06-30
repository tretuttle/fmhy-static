import { Separator, SizableText, Switch, XStack, YStack } from 'tamagui'

import { useWikiFilters } from './useWikiFilters'
import { useShowNsfw } from './wikiSettingsStorage'

// emoji legend mirrors the entry markers rendered in LinkEntryRow
const LEGEND = [
  { emoji: '⭐', label: 'Starred' },
  { emoji: '🌐', label: 'Index' },
  { emoji: '↪️', label: 'Crossref' },
] as const

function SectionLabel({ children }: { children: string }) {
  return (
    <SizableText
      size="$2"
      fontFamily="$body"
      fontWeight="600"
      textTransform="uppercase"
      color="$color10"
    >
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
        bg={checked ? '$color8' : '$color5'}
        borderWidth={1}
        borderColor="$color6"
      >
        <Switch.Thumb animation="quick" bg="$color12" />
      </Switch>
    </XStack>
  )
}

// legend + starred/indexes/nsfw toggles, pinned at the bottom of the wiki nav
export function OptionsCard() {
  const { starredOnly, indexesOnly, setStarredOnly, setIndexesOnly } = useWikiFilters()
  const [showNsfw, setShowNsfw] = useShowNsfw()

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
      <SectionLabel>Legend</SectionLabel>
      {LEGEND.map((row) => (
        <XStack key={row.label} items="center" gap="$2.5">
          <SizableText size="$2" width={20} text="center">
            {row.emoji}
          </SizableText>
          <SizableText size="$2" color="$color11">
            {row.label}
          </SizableText>
        </XStack>
      ))}

      <Separator my="$1" />

      <SectionLabel>Options</SectionLabel>
      <ToggleRow label="Starred only" checked={starredOnly} onCheckedChange={setStarredOnly} />
      <ToggleRow label="Indexes only" checked={indexesOnly} onCheckedChange={setIndexesOnly} />
      <ToggleRow label="Show NSFW" checked={showNsfw} onCheckedChange={setShowNsfw} />
    </YStack>
  )
}
