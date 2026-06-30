import type { WikiEntry } from './types'

export type EntryVisibilityFilters = {
  starredOnly: boolean
  indexesOnly: boolean
  showNsfw: boolean
}

// nsfw === 'partial' stays visible, nsfw === true is hidden unless showNsfw
export function isEntryVisible(
  entry: WikiEntry,
  filters: EntryVisibilityFilters,
): boolean {
  if (entry.nsfw === true && !filters.showNsfw) return false
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
