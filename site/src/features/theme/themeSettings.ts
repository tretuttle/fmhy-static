import { useEffect } from 'react'

import { createEmitter, useEmitterValue } from '~/lib/emitter'
import { createStorageValue } from '~/lib/storage'

// note: base light/dark/system mode lives in the tamagui scheme provider.
// these settings cover the extra fmhy.net theming layers: amoled, accent, monochrome.

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

export const amoledStorage = createStorageValue<boolean>('theme.amoled')
export const accentStorage = createStorageValue<AccentName>('theme.accent')
export const monochromeStorage = createStorageValue<boolean>('theme.monochrome')

// emitters seed with defaults so ssr + first client render match; storage syncs after mount
const amoledEmitter = createEmitter<boolean>('theme.amoled', false)
const accentEmitter = createEmitter<AccentName>('theme.accent', 'swarm')
const monochromeEmitter = createEmitter<boolean>('theme.monochrome', false)

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

export function setMonochrome(value: boolean) {
  monochromeStorage.set(value)
  if (monochromeEmitter.value !== value) {
    monochromeEmitter.emit(value)
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

export function useMonochrome(): readonly [boolean, (value: boolean) => void] {
  const value = useEmitterValue(monochromeEmitter)

  useEffect(() => {
    const stored = monochromeStorage.get()
    if (stored != null && stored !== monochromeEmitter.value) {
      monochromeEmitter.emit(stored)
    }
  }, [])

  return [value, setMonochrome] as const
}
