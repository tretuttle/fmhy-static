// static tables for the fmhy wiki generator — see scripts/wiki/generate.ts for the NOTICE

export type PageProfile = 'wiki' | 'guide' | 'unsafe' | 'storage'

// canonical 25-file order (fmhy/edit scripts/generate-single-page.js)
export const PAGE_ORDER = [
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
] as const

// page titles/descriptions (fmhy/edit docs/.vitepress/transformer/constants.ts headers map)
export const PAGE_HEADERS: Record<string, { title: string; description: string }> = {
  privacy: {
    title: 'Adblocking / Privacy',
    description: 'Adblocking, Privacy, VPNs, Proxies, Antiviruses',
  },
  ai: {
    title: 'Artificial Intelligence',
    description: 'Chatbots, Text Generators, Image Generators, Chatbot Tools',
  },
  video: {
    title: 'Movies / TV / Anime',
    description: 'Stream Videos, Download Videos, Torrent Videos',
  },
  audio: {
    title: 'Music / Podcasts / Radio',
    description: 'Stream Audio, Download Audio, Torrent Audio',
  },
  gaming: {
    title: 'Gaming / Emulation',
    description: 'Download Games, ROMs, Gaming Tools',
  },
  reading: {
    title: 'Books / Comics / Manga',
    description: 'Books, Comics, Magazines, Newspapers',
  },
  downloading: {
    title: 'Downloading',
    description: 'Download Sites, Software Sites, Open Directories',
  },
  torrenting: {
    title: 'Torrenting',
    description: 'Torrent Clients, Torrent Sites, Trackers',
  },
  educational: {
    title: 'Educational',
    description: 'Courses, Documentaries, Learning Resources',
  },
  mobile: {
    title: 'Android / iOS',
    description: 'Apps, Jailbreaking, Android Emulators',
  },
  'linux-macos': {
    title: 'Linux / macOS',
    description: 'Apps, Software Sites, Gaming',
  },
  'non-english': {
    title: 'Non-English',
    description: 'International Free Sites',
  },
  misc: {
    title: 'Miscellaneous',
    description: 'Extensions, Indexes, News, Health, Food, Fun',
  },
  'system-tools': {
    title: 'System Tools',
    description: 'System Tools, Hardware Tools, Windows ISOs, Customization',
  },
  'file-tools': {
    title: 'File Tools',
    description: 'Download Managers, File Hosting, File Archivers',
  },
  'internet-tools': {
    title: 'Internet Tools',
    description: 'Browsers, Extensions, Search Engines',
  },
  'social-media-tools': {
    title: 'Social Media Tools',
    description: 'Discord Tools, Reddit Tools, YouTube Tools',
  },
  'text-tools': {
    title: 'Text Tools',
    description: 'Text Editors, Pastebins, Fonts, Translators',
  },
  'gaming-tools': {
    title: 'Gaming Tools',
    description: 'Gaming Optimization, Game Launchers, Multiplayer',
  },
  'image-tools': {
    title: 'Image Tools',
    description: 'Image Editors, Generators, Compress',
  },
  'video-tools': {
    title: 'Video Tools',
    description: 'Video Players, Video Editors, Live Streaming, Animation',
  },
  'developer-tools': {
    title: 'Developer Tools',
    description: 'Git, Hosting, App Dev, Software Dev',
  },
  storage: {
    title: 'Storage',
    description: 'Sections too big to fit on main pages',
  },
  unsafe: {
    title: 'Unsafe Sites',
    description: 'Unsafe/harmful sites to avoid.',
  },
  'beginners-guide': {
    title: 'Beginners Guide',
    description: 'A Guide for Beginners + FAQs',
  },
}

// expected `* ` bullet counts per page (content-schema spec §1.1), ±3% drift allowed
export const EXPECTED_BULLETS: Record<string, number> = {
  privacy: 344,
  ai: 357,
  video: 902,
  audio: 796,
  gaming: 890,
  reading: 821,
  downloading: 144,
  torrenting: 103,
  educational: 1485,
  mobile: 1065,
  'linux-macos': 687,
  'non-english': 1391,
  misc: 1452,
  'system-tools': 364,
  'file-tools': 346,
  'internet-tools': 714,
  'social-media-tools': 542,
  'text-tools': 472,
  'gaming-tools': 897,
  'image-tools': 688,
  'video-tools': 398,
  'developer-tools': 944,
  storage: 204,
  unsafe: 67,
  'beginners-guide': 41,
}

export function profileFor(pageId: string): PageProfile {
  if (pageId === 'storage') return 'storage'
  if (pageId === 'unsafe') return 'unsafe'
  if (pageId === 'beginners-guide') return 'guide'
  return 'wiki'
}

// reddit wiki path → app page slug ('@audio-tools' = section inside /audio)
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

// sidebar taxonomy (fmhy/edit docs/.vitepress/shared.ts) — twemoji names mapped to unicode
type NavItemSpec = {
  slug: string
  title: string
  emoji: string
  route: string
  externalUrl: string | null
  description?: string
}

type NavGroupSpec = { title: string; collapsed: boolean; items: NavItemSpec[] }

export const NAV_GROUPS: NavGroupSpec[] = [
  {
    title: 'Wiki',
    collapsed: false,
    items: [
      {
        slug: 'privacy',
        title: 'Adblocking / Privacy',
        emoji: '📛',
        route: '/privacy',
        externalUrl: null,
      },
      {
        slug: 'ai',
        title: 'Artificial Intelligence',
        emoji: '🤖',
        route: '/ai',
        externalUrl: null,
      },
      {
        slug: 'video',
        title: 'Movies / TV / Anime',
        emoji: '📺',
        route: '/video',
        externalUrl: null,
      },
      {
        slug: 'audio',
        title: 'Music / Podcasts / Radio',
        emoji: '🎵',
        route: '/audio',
        externalUrl: null,
      },
      {
        slug: 'gaming',
        title: 'Gaming / Emulation',
        emoji: '🎮',
        route: '/gaming',
        externalUrl: null,
      },
      {
        slug: 'reading',
        title: 'Books / Comics / Manga',
        emoji: '📗',
        route: '/reading',
        externalUrl: null,
      },
      {
        slug: 'downloading',
        title: 'Downloading',
        emoji: '💾',
        route: '/downloading',
        externalUrl: null,
      },
      {
        slug: 'torrenting',
        title: 'Torrenting',
        emoji: '🌀',
        route: '/torrenting',
        externalUrl: null,
      },
      {
        slug: 'educational',
        title: 'Educational',
        emoji: '🧠',
        route: '/educational',
        externalUrl: null,
      },
      {
        slug: 'mobile',
        title: 'Android / iOS',
        emoji: '📱',
        route: '/mobile',
        externalUrl: null,
      },
      {
        slug: 'linux-macos',
        title: 'Linux / macOS',
        emoji: '🐧',
        route: '/linux-macos',
        externalUrl: null,
      },
      {
        slug: 'non-english',
        title: 'Non-English',
        emoji: '🌏',
        route: '/non-english',
        externalUrl: null,
      },
      {
        slug: 'misc',
        title: 'Miscellaneous',
        emoji: '📁',
        route: '/misc',
        externalUrl: null,
      },
    ],
  },
  {
    title: 'Tools',
    collapsed: false,
    items: [
      {
        slug: 'system-tools',
        title: 'System Tools',
        emoji: '💻',
        route: '/system-tools',
        externalUrl: null,
      },
      {
        slug: 'file-tools',
        title: 'File Tools',
        emoji: '🗃️',
        route: '/file-tools',
        externalUrl: null,
      },
      {
        slug: 'internet-tools',
        title: 'Internet Tools',
        emoji: '📎',
        route: '/internet-tools',
        externalUrl: null,
      },
      {
        slug: 'social-media-tools',
        title: 'Social Media Tools',
        emoji: '🗨️',
        route: '/social-media-tools',
        externalUrl: null,
      },
      {
        slug: 'text-tools',
        title: 'Text Tools',
        emoji: '📝',
        route: '/text-tools',
        externalUrl: null,
      },
      {
        slug: 'gaming-tools',
        title: 'Gaming Tools',
        emoji: '👾',
        route: '/gaming-tools',
        externalUrl: null,
      },
      {
        slug: 'image-tools',
        title: 'Image Tools',
        emoji: '📷',
        route: '/image-tools',
        externalUrl: null,
      },
      {
        slug: 'video-tools',
        title: 'Video Tools',
        emoji: '📼',
        route: '/video-tools',
        externalUrl: null,
      },
      {
        slug: 'audio-tools',
        title: 'Audio Tools',
        emoji: '🔊',
        route: '/audio#audio-tools',
        externalUrl: null,
        description: 'Audio Players, Audio Editors, Audio Downloaders',
      },
      {
        slug: 'educational-tools',
        title: 'Educational Tools',
        emoji: '🍎',
        route: '/educational#educational-tools',
        externalUrl: null,
      },
      {
        slug: 'developer-tools',
        title: 'Developer Tools',
        emoji: '👨‍💻',
        route: '/developer-tools',
        externalUrl: null,
      },
    ],
  },
  {
    title: 'More',
    collapsed: true,
    items: [
      {
        slug: 'nsfw',
        title: 'NSFW',
        emoji: '🔞',
        route: '',
        externalUrl: 'https://rentry.org/NSFW-Checkpoint',
        description: 'NSFW Indexes, Streaming, Downloading',
      },
      {
        slug: 'unsafe',
        title: 'Unsafe Sites',
        emoji: '⚠️',
        route: '/unsafe',
        externalUrl: null,
      },
      // 'Recently Removed' intentionally omitted (generated server-side, not in this app)
      {
        slug: 'storage',
        title: 'Storage',
        emoji: '📦',
        route: '/storage',
        externalUrl: null,
      },
    ],
  },
]
