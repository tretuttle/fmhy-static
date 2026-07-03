// tiny localStorage wrapper replacing @take-out/helpers createStorageValue.
// ssr-safe: returns null / no-ops when localStorage is unavailable.
//
// TODO(native): [P2, task #10] localStorage is undefined on react-native, so this
// no-ops and every setting (theme, accent, amoled, nsfw filters) silently stops
// persisting. back this same StorageValue interface with mmkv/async-storage in a
// .native fork.

export type StorageValue<T> = {
  get: () => T | null
  set: (value: T) => void
}

export function createStorageValue<T>(key: string): StorageValue<T> {
  const storageKey = `fmhy.${key}`

  return {
    get() {
      if (typeof localStorage === 'undefined') return null
      try {
        const raw = localStorage.getItem(storageKey)
        return raw == null ? null : (JSON.parse(raw) as T)
      } catch {
        return null
      }
    },
    set(value: T) {
      if (typeof localStorage === 'undefined') return
      try {
        localStorage.setItem(storageKey, JSON.stringify(value))
      } catch {
        // ignore quota errors / disabled storage
      }
    },
  }
}
