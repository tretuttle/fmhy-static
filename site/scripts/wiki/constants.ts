// Mappings the mirror OWNS — see scripts/wiki/generate.ts for the NOTICE.
//
// Nothing upstream owns belongs in this file. The page list, page titles and
// descriptions, the sidebar taxonomy, the header nav, social links, the prose
// page list, the recently-removed header and the post-author roster are all
// read from fmhy/edit's own .vitepress config at generate time — see
// scripts/wiki/upstream.ts. fmhy/edit changes many times a day, so any copy of
// its state kept here is stale the moment it is written: a per-page bullet
// count table gated CI and wedged the nightly deploy for 41 consecutive runs,
// and a copied hero announcement left the home page advertising July's post in
// the middle of August.
//
// The rule: if upstream can change it, DERIVE it. What stays below is ours —
// our route scheme, our icon tokens, our page-profile choices.

export type PageProfile = 'wiki' | 'guide' | 'unsafe' | 'storage'

// which parse profile each page uses — our rendering decision, not upstream's
export function profileFor(pageId: string): PageProfile {
  if (pageId === 'storage') return 'storage'
  if (pageId === 'unsafe') return 'unsafe'
  if (pageId === 'beginners-guide') return 'guide'
  return 'wiki'
}

// reddit wiki path → app page slug ('@audio-tools' = section inside /audio).
// OURS: upstream links out to its reddit wiki; this maps those to our routes.
export const REDDIT_WIKI_PAGES: Record<string, string> = {
  'adblock-vpn-privacy': 'privacy',
  ai: 'ai',
  android: 'mobile',
  games: 'gaming',
  reading: 'reading',
  download: 'downloading',
  torrent: 'torrenting',
  edu: 'educational',
  'system-tools': 'system-tools',
  'file-tools': 'file-tools',
  'internet-tools': 'internet-tools',
  'social-media': 'social-media-tools',
  'text-tools': 'text-tools',
  'video-tools': 'video-tools',
  'audio-tools': '@audio-tools',
  'game-tools': 'gaming-tools',
  video: 'video',
  audio: 'audio',
  linux: 'linux-macos',
  'non-eng': 'non-english',
  misc: 'misc',
  storage: 'storage',
  'dev-tools': 'developer-tools',
  'image-tools': 'image-tools',
}

// sidebar sub-link labels rendered as icon badges on the site
export const SUBLINK_ICONS: Record<string, string> = {
  Discord: 'discord',
  GitHub: 'github',
  GitLab: 'gitlab',
  Telegram: 'telegram',
  Subreddit: 'reddit',
  X: 'x',
  '.onion': 'onion',
  'Source Code': 'source',
}

export const PLATFORM_TOKENS: Record<string, string> = {
  Windows: 'windows',
  Mac: 'mac',
  Linux: 'linux',
  Android: 'android',
  iOS: 'ios',
  Web: 'web',
}
