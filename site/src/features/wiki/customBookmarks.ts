// startpage bookmarks: the built-in set plus the reader's own, persisted in
// localStorage under fmhy.net's key and shape (startpage/Bookmarks.vue) so a
// stored list reads exactly like upstream's.

export type Bookmark = {
  name: string
  chord: string
  url: string
  // uno icon class, e.g. 'i-lucide:globe'
  icon?: string
  color?: string
  isCustom?: boolean
  customSvg?: string
}

const STORAGE_KEY = 'customBookmarks'

export const DEFAULT_BOOKMARKS: Bookmark[] = [
  {
    name: 'Hacker News',
    chord: 'HN',
    url: 'https://news.ycombinator.com/',
    icon: 'i-logos:ycombinator',
  },
  {
    name: 'GitHub',
    chord: 'GH',
    url: 'https://github.com/',
    icon: 'i-simple-icons:github',
  },
  {
    name: 'Reddit',
    chord: 'RD',
    url: 'https://reddit.com/',
    icon: 'i-logos:reddit-icon',
  },
  { name: 'Twitter', chord: 'TW', url: 'https://twitter.com/', icon: 'i-logos:twitter' },
  {
    name: 'YouTube',
    chord: 'YT',
    url: 'https://youtube.com/',
    icon: 'i-logos:youtube-icon',
  },
  {
    name: 'Wikipedia',
    chord: 'WK',
    url: 'https://wikipedia.org/',
    icon: 'i-simple-icons:wikipedia',
  },
  {
    name: "Beginner's Guide",
    chord: 'BG',
    url: '/beginners-guide',
    icon: 'i-lucide:book-open-text',
  },
  {
    name: 'Wotaku',
    chord: 'WT',
    url: 'https://wotaku.wiki/',
    icon: 'i-twemoji:flag-japan',
  },
  {
    name: 'privateersclub',
    chord: 'PC',
    url: 'https://megathread.pages.dev/',
    icon: 'i-custom:privateersclub',
  },
]

const isBookmark = (value: unknown): value is Bookmark => {
  if (!value || typeof value !== 'object') return false
  const b = value as Record<string, unknown>
  return (
    typeof b.name === 'string' && typeof b.chord === 'string' && typeof b.url === 'string'
  )
}

export function loadCustomBookmarks(): Bookmark[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []
    const parsed: unknown = JSON.parse(stored)
    return Array.isArray(parsed) ? parsed.filter(isBookmark) : []
  } catch {
    return []
  }
}

export function saveCustomBookmarks(bookmarks: Bookmark[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks))
  } catch {
    // storage disabled / quota: the list still works for this visit
  }
}
