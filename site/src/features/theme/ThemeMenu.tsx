import { useEffect, useState } from 'react'
import { Popover, XStack, isWeb } from 'tamagui'

import { PaletteDuotoneIcon } from '~/icons/social/ThemeDuotoneIcons'

import { AppearancePanel } from './AppearancePanel'

// fmhy.net ThemeDropdown.vue (desktop half): a rounded-square palette button
// opening the Appearance panel in a popup that stays open while picking —
// only outside clicks, Escape, or a layout switch (the 1280px breakpoint,
// where the panel moves into the "…" menu) close it. styling lives in
// app/root.css (.fmhy-theme-trigger, .fmhy-popup).
const DESKTOP_QUERY = '(min-width: 1280px)'

export function ThemeMenu() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!isWeb) return
    const media = window.matchMedia(DESKTOP_QUERY)
    const close = () => setOpen(false)
    media.addEventListener('change', close)
    return () => media.removeEventListener('change', close)
  }, [])

  return (
    <Popover open={open} onOpenChange={setOpen} placement="bottom-end" offset={12} allowFlip>
      <Popover.Trigger asChild>
        <XStack
          render="button"
          className="fmhy-theme-trigger"
          {...({ title: 'Appearance and themes' } as object)}
          aria-label="Appearance and themes"
          width={36}
          height={36}
          items="center"
          justify="center"
          cursor="pointer"
          borderWidth={0}
          p={0}
        >
          <PaletteDuotoneIcon size={20} />
        </XStack>
      </Popover.Trigger>

      <Popover.Content bg="transparent" borderWidth={0} p={0} z={1000}>
        <div className="fmhy-popup fmhy-theme-popup">
          <AppearancePanel />
        </div>
      </Popover.Content>
    </Popover>
  )
}

ThemeMenu.title = 'Theme Menu'
