import { CircleButton } from '~/components/CircleButton'
import { MagnifyingGlassIcon } from '~/icons/phosphor/MagnifyingGlassIcon'

import { openSearch } from './searchModal'
import { useSearchHotkeyLabel } from './searchHotkeyLabel'

// header trigger for the ⌘K/Ctrl-K wiki search modal — drop into the site header
export function WikiSearchButton() {
  const hotkeyLabel = useSearchHotkeyLabel()
  return (
    <CircleButton
      tooltip={`Search (${hotkeyLabel})`}
      aria-label="Search the wiki"
      onPress={() => openSearch()}
    >
      <MagnifyingGlassIcon size={18} />
    </CircleButton>
  )
}
