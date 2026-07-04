import { useEffect, useState } from 'react'
import { isWeb } from 'tamagui'

// fmhy.net's search hint reads "Ctrl K" everywhere except macOS, where it
// reads "⌘K". SSG has no notion of the visitor's OS, so we always bake the
// "Ctrl K" default into the static HTML and only flip to the Mac label after
// mount — this keeps hydration deterministic (no server/client text
// mismatch) at the cost of a one-frame correction for Mac visitors.
const DEFAULT_LABEL = 'Ctrl K'
const MAC_LABEL = '⌘K'

function detectIsMac(): boolean {
  if (!isWeb) return false
  const nav = navigator as Navigator & {
    userAgentData?: { platform?: string }
  }
  const platform = nav.userAgentData?.platform ?? nav.platform ?? ''
  return /mac/i.test(platform)
}

// use inside the header search box + WikiSearchButton tooltip so both show
// the same platform-correct hotkey hint
export function useSearchHotkeyLabel(): string {
  const [label, setLabel] = useState(DEFAULT_LABEL)

  useEffect(() => {
    if (detectIsMac()) setLabel(MAC_LABEL)
  }, [])

  return label
}
