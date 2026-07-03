// shared open/close store for the wiki ⌘K search modal, built on the local
// emitter shim. the integrator mounts <WikiSearchModal /> once and registers the
// global key listener in _layout — this module just exposes the toggle surface.

import { createEmitter, useEmitterValue } from '~/lib/emitter'

// seeds false so ssr + first client render match
const searchOpenEmitter = createEmitter<boolean>('wiki.searchOpen', false)

export function openSearch() {
  searchOpenEmitter.emit(true)
}

export function closeSearch() {
  searchOpenEmitter.emit(false)
}

export function toggleSearch() {
  searchOpenEmitter.emit(!searchOpenEmitter.value)
}

// non-hook getter for the global key listener (e.g. Escape while unfocused)
export function isSearchOpen(): boolean {
  return searchOpenEmitter.value
}

export function useSearchOpen(): boolean {
  return useEmitterValue(searchOpenEmitter)
}
