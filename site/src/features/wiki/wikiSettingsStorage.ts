import { createStorageValue } from '~/lib/storage'

export const recentSearchesStorage = createStorageValue<string[]>('wiki.recentSearches')
