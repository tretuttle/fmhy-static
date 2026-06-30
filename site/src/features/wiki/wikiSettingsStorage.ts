import { useEffect } from 'react'

import { createEmitter, useEmitterValue } from '~/lib/emitter'
import { createStorageValue } from '~/lib/storage'

export const showNsfwStorage = createStorageValue<boolean>('wiki.showNsfw')
export const recentSearchesStorage = createStorageValue<string[]>('wiki.recentSearches')

// emitter starts false so ssr + first client render match, storage syncs after mount
const showNsfwEmitter = createEmitter<boolean>('wiki.showNsfw', false)

export function setShowNsfw(value: boolean) {
  showNsfwStorage.set(value)
  if (showNsfwEmitter.value !== value) {
    showNsfwEmitter.emit(value)
  }
}

export function useShowNsfw(): readonly [boolean, (value: boolean) => void] {
  const value = useEmitterValue(showNsfwEmitter)

  useEffect(() => {
    const stored = showNsfwStorage.get()
    if (stored != null && stored !== showNsfwEmitter.value) {
      showNsfwEmitter.emit(stored)
    }
  }, [])

  return [value, setShowNsfw] as const
}
