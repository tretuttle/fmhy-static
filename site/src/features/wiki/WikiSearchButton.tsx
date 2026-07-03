import { CircleButton } from '~/components/CircleButton'
import { MagnifyingGlassIcon } from '~/icons/phosphor/MagnifyingGlassIcon'

import { openSearch } from './searchModal'

// header trigger for the ⌘K wiki search modal — drop into the site header
export function WikiSearchButton() {
  return (
    <CircleButton
      tooltip="Search (⌘K)"
      aria-label="Search the wiki"
      onPress={() => openSearch()}
    >
      <MagnifyingGlassIcon size={18} />
    </CircleButton>
  )
}
