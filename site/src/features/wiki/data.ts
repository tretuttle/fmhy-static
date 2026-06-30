// data access layer for the generated FMHY wiki content
// regenerate with: bun scripts/wiki/generate.ts

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

// static import map — vite requires statically analyzable dynamic import paths
const pageLoaders: Record<string, () => Promise<unknown>> = {
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

export const WIKI_SLUGS: string[] = Object.keys(pageLoaders)

export async function loadWikiPage(slug: string): Promise<WikiPage> {
  const loader = pageLoaders[slug]
  if (!loader) {
    throw new Error(`unknown wiki page: ${slug}`)
  }
  return fromJsonModule<WikiPage>(await loader())
}

export async function loadSearchCorpus(): Promise<SearchDoc[]> {
  return fromJsonModule<SearchDoc[]>(await import('./generated/search-corpus.json'))
}

export async function loadNotes(): Promise<Record<string, WikiNote>> {
  return fromJsonModule<Record<string, WikiNote>>(await import('./generated/notes.json'))
}
