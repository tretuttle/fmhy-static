import { useEffect } from 'react'

import {
  ACCENT_NAMES,
  accentStorage,
  amoledStorage,
  monochromeStorage,
  useAccent,
  useAmoled,
  useMonochrome,
} from './themeSettings'

import type { AccentName } from './themeSettings'

function applyClasses(amoled: boolean, accent: AccentName, monochrome: boolean) {
  if (typeof document === 'undefined') {
    return
  }

  const list = document.documentElement.classList

  list.toggle('amoled', amoled)
  list.toggle('monochrome', monochrome)

  for (const name of ACCENT_NAMES) {
    // swarm is the shipped baseline, no class
    list.toggle(`accent-${name}`, name !== 'swarm' && accent === name)
  }
}

// pre-paint: apply straight from storage before react state settles (avoids a flash).
// runs once at module import on web.
if (typeof document !== 'undefined') {
  try {
    applyClasses(
      amoledStorage.get() ?? false,
      accentStorage.get() ?? 'swarm',
      monochromeStorage.get() ?? false,
    )
  } catch (err) {
    console.info('[ThemeController] pre-paint apply skipped', err)
  }
}

// mount once in app/_layout. returns null; only side-effects the html classes.
export function ThemeController() {
  const [amoled] = useAmoled()
  const [accent] = useAccent()
  const [monochrome] = useMonochrome()

  useEffect(() => {
    applyClasses(amoled, accent, monochrome)
  }, [amoled, accent, monochrome])

  return null
}
