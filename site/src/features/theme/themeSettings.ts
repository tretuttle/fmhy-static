import { useEffect } from 'react'

import { createEmitter, useEmitterValue } from '~/lib/emitter'
import { createStorageValue } from '~/lib/storage'

// note: base light/dark/system mode lives in the tamagui scheme provider.
// these settings cover the extra fmhy.net theming layers: amoled, accent, theme.
//
// "accent" and "theme" are independent axes on fmhy.net (ColorPicker vs
// ThemeSelector, docs/.vitepress/theme/themes/README.md): accent only
// recolors the brand/link scale, while a theme (catppuccin, monochrome)
// replaces the full palette — backgrounds, text, tip/warning callouts, and
// the brand scale together. A theme's own brand colors win over the accent
// pick while active (see the CSS cascade in app/root.css).

// the 7 named accent palettes from fmhy.net (docs/.vitepress/theme/utils/colors.ts)
export type AccentName =
  | 'swarm'
  | 'turquoise'
  | 'carnation'
  | 'cerise'
  | 'meadow'
  | 'merlin'
  | 'blue-violet'

export const ACCENT_NAMES: readonly AccentName[] = [
  'swarm',
  'turquoise',
  'carnation',
  'cerise',
  'meadow',
  'merlin',
  'blue-violet',
] as const

// swatch = each palette's 500 shade, mirroring the fmhy.net ColorPicker swatches
export const ACCENT_SWATCHES: Record<AccentName, string> = {
  swarm: 'hsl(211, 63%, 61%)',
  turquoise: 'hsl(188, 86%, 43%)',
  carnation: 'hsl(0, 84%, 60%)',
  cerise: 'hsl(346, 77%, 57%)',
  meadow: 'hsl(158, 77%, 42%)',
  merlin: 'hsl(45, 93%, 47%)',
  'blue-violet': 'hsl(242, 91%, 64%)',
}

// full palette themes from fmhy.net (docs/.vitepress/theme/themes/configs) —
// each replaces background/surface/text/callout/brand colors together, not
// just the accent scale
export type ThemeName = 'default' | 'catppuccin' | 'monochrome' | 'monolith'

export const THEME_NAMES: readonly ThemeName[] = [
  'default',
  'catppuccin',
  'monochrome',
  'monolith',
] as const

export const THEME_SWATCHES: Record<Exclude<ThemeName, 'default'>, string> = {
  catppuccin: '#9345ed',
  monochrome: '#808080',
  monolith: '#f42a8b',
}

export const amoledStorage = createStorageValue<boolean>('theme.amoled')
export const accentStorage = createStorageValue<AccentName>('theme.accent')
export const themeStorage = createStorageValue<ThemeName>('theme.name')

// emitters seed with defaults so ssr + first client render match; storage syncs after mount
const amoledEmitter = createEmitter<boolean>('theme.amoled', false)
const accentEmitter = createEmitter<AccentName>('theme.accent', 'swarm')
const themeEmitter = createEmitter<ThemeName>('theme.name', 'default')

export function setAmoled(value: boolean) {
  amoledStorage.set(value)
  if (amoledEmitter.value !== value) {
    amoledEmitter.emit(value)
  }
}

export function setAccent(value: AccentName) {
  accentStorage.set(value)
  if (accentEmitter.value !== value) {
    accentEmitter.emit(value)
  }
}

export function setThemeName(value: ThemeName) {
  themeStorage.set(value)
  if (themeEmitter.value !== value) {
    themeEmitter.emit(value)
  }
}

export function useAmoled(): readonly [boolean, (value: boolean) => void] {
  const value = useEmitterValue(amoledEmitter)

  useEffect(() => {
    const stored = amoledStorage.get()
    if (stored != null && stored !== amoledEmitter.value) {
      amoledEmitter.emit(stored)
    }
  }, [])

  return [value, setAmoled] as const
}

export function useAccent(): readonly [AccentName, (value: AccentName) => void] {
  const value = useEmitterValue(accentEmitter)

  useEffect(() => {
    const stored = accentStorage.get()
    if (stored != null && stored !== accentEmitter.value) {
      accentEmitter.emit(stored)
    }
  }, [])

  return [value, setAccent] as const
}

export function useThemeName(): readonly [ThemeName, (value: ThemeName) => void] {
  const value = useEmitterValue(themeEmitter)

  useEffect(() => {
    const stored = themeStorage.get()
    if (stored != null && stored !== themeEmitter.value) {
      themeEmitter.emit(stored)
    }
  }, [])

  return [value, setThemeName] as const
}
