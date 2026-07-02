// data access layer for the generated FMHY wiki content
// regenerate with: bun scripts/wiki/generate.ts
//
// At build/SSG time (SSR) the JSON is imported straight from generated/.
// In the browser the SAME files are fetched from /data/*.json (copied into
// public/data by convert-fmhy): bundling them as JS shipped every page's data
// to the client twice (as a JSON-module chunk and again inside One's
// serialized loader files) and let One's hover-preload pull megabytes per
// mouse-over. Fetching keeps them out of the JS graph entirely — JSON.parse
// is faster than JS parse and the responses are HTTP-cacheable.

import navJson from './generated/nav.json'
import type { SearchDoc, WikiNav, WikiNote, WikiPage } from './types'

// a static json import is already the parsed value, a dynamic import() resolves
// to a module namespace with the json under `default` — unwrap whichever we get
const fromJsonModule = <T>(mod: unknown): T => {
  if (mod && typeof mod === 'object' && 'default' in mod) {
    const def = (mod as { default: unknown }).default
    if (def != null) return def as T
  }
  return mod as T
}

export const wikiNav = fromJsonModule<WikiNav>(navJson)

export const WIKI_SLUGS: string[] = [
  'privacy',
  'ai',
  'mobile',
  'audio',
  'beginners-guide',
  'developer-tools',
  'downloading',
  'educational',
  'file-tools',
  'gaming-tools',
  'gaming',
  'image-tools',
  'internet-tools',
  'linux-macos',
  'misc',
  'non-english',
  'reading',
  'social-media-tools',
  'storage',
  'system-tools',
  'text-tools',
  'torrenting',
  'unsafe',
  'video-tools',
  'video',
]

// build-time-only import map — `import.meta.env.SSR` is statically replaced,
// so the whole branch (and every JSON module behind it) is eliminated from
// the client bundle. vite requires statically analyzable dynamic import paths.
const ssrPageLoaders: Record<string, () => Promise<unknown>> = import.meta.env.SSR
  ? {
      privacy: () => import('./generated/pages/privacy.json'),
      ai: () => import('./generated/pages/ai.json'),
      mobile: () => import('./generated/pages/mobile.json'),
      audio: () => import('./generated/pages/audio.json'),
      'beginners-guide': () => import('./generated/pages/beginners-guide.json'),
      'developer-tools': () => import('./generated/pages/developer-tools.json'),
      downloading: () => import('./generated/pages/downloading.json'),
      educational: () => import('./generated/pages/educational.json'),
      'file-tools': () => import('./generated/pages/file-tools.json'),
      'gaming-tools': () => import('./generated/pages/gaming-tools.json'),
      gaming: () => import('./generated/pages/gaming.json'),
      'image-tools': () => import('./generated/pages/image-tools.json'),
      'internet-tools': () => import('./generated/pages/internet-tools.json'),
      'linux-macos': () => import('./generated/pages/linux-macos.json'),
      misc: () => import('./generated/pages/misc.json'),
      'non-english': () => import('./generated/pages/non-english.json'),
      reading: () => import('./generated/pages/reading.json'),
      'social-media-tools': () => import('./generated/pages/social-media-tools.json'),
      storage: () => import('./generated/pages/storage.json'),
      'system-tools': () => import('./generated/pages/system-tools.json'),
      'text-tools': () => import('./generated/pages/text-tools.json'),
      torrenting: () => import('./generated/pages/torrenting.json'),
      unsafe: () => import('./generated/pages/unsafe.json'),
      'video-tools': () => import('./generated/pages/video-tools.json'),
      video: () => import('./generated/pages/video.json'),
    }
  : {}

// in-flight/settled fetches dedupe per path so repeated excerpt loads reuse one request
const clientFetches = new Map<string, Promise<unknown>>()

const fetchData = <T>(path: string): Promise<T> => {
  let pending = clientFetches.get(path)
  if (!pending) {
    pending = fetch(path).then((res) => {
      if (!res.ok) {
        clientFetches.delete(path)
        throw new Error(`failed to load ${path}: ${res.status}`)
      }
      return res.json()
    })
    clientFetches.set(path, pending)
  }
  return pending as Promise<T>
}

export async function loadWikiPage(slug: string): Promise<WikiPage> {
  if (import.meta.env.SSR) {
    const loader = ssrPageLoaders[slug]
    if (!loader) {
      throw new Error(`unknown wiki page: ${slug}`)
    }
    return fromJsonModule<WikiPage>(await loader())
  }
  if (!WIKI_SLUGS.includes(slug)) {
    throw new Error(`unknown wiki page: ${slug}`)
  }
  return fetchData<WikiPage>(`/data/pages/${slug}.json`)
}

export async function loadSearchCorpus(): Promise<SearchDoc[]> {
  if (import.meta.env.SSR) {
    return fromJsonModule<SearchDoc[]>(await import('./generated/search-corpus.json'))
  }
  return fetchData<SearchDoc[]>('/data/search-corpus.json')
}

export async function loadNotes(): Promise<Record<string, WikiNote>> {
  if (import.meta.env.SSR) {
    return fromJsonModule<Record<string, WikiNote>>(await import('./generated/notes.json'))
  }
  return fetchData<Record<string, WikiNote>>('/data/notes.json')
}
