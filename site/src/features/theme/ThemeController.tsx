import { useEffect } from 'react'

import {
  ACCENT_NAMES,
  THEME_NAMES,
  accentStorage,
  amoledStorage,
  themeStorage,
  useAccent,
  useAmoled,
  useThemeName,
} from './themeSettings'

import type { AccentName, ThemeName } from './themeSettings'

function applyClasses(amoled: boolean, accent: AccentName, themeName: ThemeName) {
  if (typeof document === 'undefined') {
    return
  }

  const list = document.documentElement.classList

  list.toggle('amoled', amoled)

  for (const name of ACCENT_NAMES) {
    // swarm is the shipped baseline, no class
    list.toggle(`accent-${name}`, name !== 'swarm' && accent === name)
  }

  for (const name of THEME_NAMES) {
    // default is the shipped baseline, no class. a theme's own palette
    // overrides the accent classes above via CSS cascade order (root.css).
    list.toggle(`theme-${name}`, name !== 'default' && themeName === name)
  }
}

// pre-paint: apply straight from storage before react state settles (avoids a flash).
// runs once at module import on web.
if (typeof document !== 'undefined') {
  try {
    applyClasses(
      amoledStorage.get() ?? false,
      accentStorage.get() ?? 'swarm',
      themeStorage.get() ?? 'default',
    )
  } catch (err) {
    console.info('[ThemeController] pre-paint apply skipped', err)
  }
}

// mount once in app/_layout. returns null; only side-effects the html classes.
export function ThemeController() {
  const [amoled] = useAmoled()
  const [accent] = useAccent()
  const [themeName] = useThemeName()

  useEffect(() => {
    applyClasses(amoled, accent, themeName)
  }, [amoled, accent, themeName])

  return null
}
