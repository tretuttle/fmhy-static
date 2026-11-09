import { useEffect } from 'react'

import { createEmitter, useEmitterValue } from '~/lib/emitter'
import { createStorageValue } from '~/lib/storage'

// note: base light/dark/system mode lives in the tamagui scheme provider.
// these settings cover the extra fmhy.net theming layers: amoled, accent, theme.
//
// fmhy.net stores ONE theme name: a generated `color-<accent>` theme or a
// preset (catppuccin, halloween, …), picked from the same Appearance panel.
// We keep two keys (accent + theme) but drive them as one pick: a color
// swatch sets the accent and resets the theme to 'default', a preset swatch
// sets the theme and leaves the stored accent inert underneath it (a preset's
// own brand colors win the CSS cascade, see app/root.css).

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
// just the accent scale. order = their registry order (configs/index.ts),
// which is the order the THEME PRESETS swatches render in.
export type ThemeName = 'default' | 'catppuccin' | 'halloween' | 'monochrome' | 'monolith'

export const THEME_NAMES: readonly ThemeName[] = [
  'default',
  'catppuccin',
  'halloween',
  'monochrome',
  'monolith',
] as const

export type PresetName = Exclude<ThemeName, 'default'>

export const PRESET_NAMES = THEME_NAMES.filter(
  (name): name is PresetName => name !== 'default',
)

export const THEME_SWATCHES: Record<PresetName, string> = {
  catppuccin: '#9345ed',
  halloween: '#ea580c',
  monochrome: '#808080',
  monolith: '#f42a8b',
}

// each config's displayName — the swatch title / aria-label
export const PRESET_LABELS: Record<PresetName, string> = {
  catppuccin: 'Catppuccin',
  halloween: 'Halloween',
  monochrome: 'Monochrome',
  monolith: 'Monolith',
}

// "blue-violet" -> "Blue violet" (their normalizeColorName)
export function accentLabel(name: AccentName): string {
  const spaced = name.replaceAll('-', ' ')
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

// fmhy.net makes halloween the default theme through October
// (themeHandler.ts resolveThemeName) — a default, not an override: anyone who
// has picked a theme or color keeps it
export function isOctober(date = new Date()): boolean {
  return date.getMonth() === 9
}

export const amoledStorage = createStorageValue<boolean>('theme.amoled')
export const accentStorage = createStorageValue<AccentName>('theme.accent')
export const themeStorage = createStorageValue<ThemeName>('theme.name')

// the theme to show when storage holds no explicit theme pick. upstream stores
// one name for color + preset, so a saved color counts as a pick here too.
export function resolveStoredThemeName(): ThemeName {
  const stored = themeStorage.get()
  if (stored != null && THEME_NAMES.includes(stored)) {
    return stored
  }
  if (accentStorage.get() == null && isOctober()) {
    return 'halloween'
  }
  return 'default'
}

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
    const stored = resolveStoredThemeName()
    if (stored !== themeEmitter.value) {
      themeEmitter.emit(stored)
    }
  }, [])

  return [value, setThemeName] as const
}
