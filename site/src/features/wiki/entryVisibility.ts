import type { WikiEntry } from './types'

export type EntryVisibilityFilters = {
  starredOnly: boolean
  indexesOnly: boolean
}

// nsfw entries always render — fmhy.net has no client-side nsfw filter; its
// nsfw segregation is editorial (separate pages), not a display toggle
export function isEntryVisible(
  entry: WikiEntry,
  filters: EntryVisibilityFilters,
): boolean {
  if (filters.starredOnly && !entry.starred) return false
  if (filters.indexesOnly && entry.marker !== 'index') return false
  return true
}

export function filterEntries(
  entries: WikiEntry[],
  filters: EntryVisibilityFilters,
): WikiEntry[] {
  return entries.filter((entry) => isEntryVisible(entry, filters))
}

export function countVisible(
  entries: WikiEntry[],
  filters: EntryVisibilityFilters,
): number {
  let count = 0
  for (const entry of entries) {
    if (isEntryVisible(entry, filters)) count++
  }
  return count
}
