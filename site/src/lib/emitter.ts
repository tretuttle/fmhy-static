import { useSyncExternalStore } from 'react'

// tiny local pub/sub replacing @take-out/helpers (not a declared dep here).
// seeds with a default so ssr + first client render match; storage syncs after mount.

export type Emitter<T> = {
  readonly value: T
  emit: (next: T) => void
  subscribe: (listener: () => void) => () => void
}

export function createEmitter<T>(_key: string, initial: T): Emitter<T> {
  let current = initial
  const listeners = new Set<() => void>()

  return {
    get value() {
      return current
    },
    emit(next: T) {
      current = next
      for (const listener of listeners) listener()
    },
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

export function useEmitterValue<T>(emitter: Emitter<T>): T {
  return useSyncExternalStore(
    emitter.subscribe,
    () => emitter.value,
    () => emitter.value,
  )
}
