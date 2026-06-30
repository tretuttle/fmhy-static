import { useEffect } from 'react'

import { createEmitter, useEmitterValue } from '~/lib/emitter'
import { createStorageValue } from '~/lib/storage'

// note: base light/dark/system mode lives in the tamagui scheme provider.
// these settings cover the extra fmhy.net theming layers: amoled, accent, monochrome.

export type AccentName = 'swarm' | 'purple' | 'green' | 'pink' | 'orange'

export const ACCENT_NAMES: readonly AccentName[] = [
  'swarm',
  'purple',
  'green',
  'pink',
  'orange',
] as const

// swatch hexes for the picker ui (accent9-ish solid)
export const ACCENT_SWATCHES: Record<AccentName, string> = {
  swarm: '#5d99da',
  purple: '#8b5cf6',
  green: '#18bd75',
  pink: '#ec4c80',
  orange: '#f59e0b',
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
