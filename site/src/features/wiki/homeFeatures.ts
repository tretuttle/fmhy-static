// the 12 home feature cards, parsed from content/fmhy/docs/index.md `features:`
// each `paths` entry is the list of <path>/<line>/<rect>/<circle> primitives
// from that card's inline lucide svg (viewBox 0 0 24 24, stroke = color)

export type LucidePrimitive =
  | { type: 'path'; d: string }
  | { type: 'line'; x1: number; y1: number; x2: number; y2: number }
  | { type: 'rect'; x: number; y: number; width: number; height: number; rx?: number }
  | { type: 'circle'; cx: number; cy: number; r: number }

export type HomeFeature = {
  title: string
  link: string
  details: string
  color: string
  paths: LucidePrimitive[]
}

export const homeFeatures: HomeFeature[] = [
  {
    title: 'Adblocking / Privacy',
    link: '/privacy',
    details: 'Learn how to block ads, trackers and other nasty things.',
    color: '#D05A6E',
    paths: [
      {
        type: 'path',
        d: 'M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z',
      },
      { type: 'path', d: 'M8 12h.01' },
      { type: 'path', d: 'M12 12h.01' },
      { type: 'path', d: 'M16 12h.01' },
    ],
  },
  {
    title: 'Artificial Intelligence',
    link: '/ai',
    details: 'Explore the world of AI and machine learning.',
    color: '#91989F',
    paths: [
      { type: 'path', d: 'M12 8V4H8' },
      { type: 'rect', x: 4, y: 8, width: 16, height: 12, rx: 2 },
      { type: 'path', d: 'M2 14h2' },
      { type: 'path', d: 'M20 14h2' },
      { type: 'path', d: 'M15 13v2' },
      { type: 'path', d: 'M9 13v2' },
    ],
  },
  {
    title: 'Streaming',
    link: '/video',
    details: 'Stream, download, torrent and binge all your favourite movies and shows!',
    color: '#7aa2f7',
    paths: [
      {
        type: 'path',
        d: 'M15.033 9.44a.647.647 0 0 1 0 1.12l-4.065 2.352a.645.645 0 0 1-.968-.56V7.648a.645.645 0 0 1 .967-.56z',
      },
      { type: 'path', d: 'M7 21h10' },
      { type: 'rect', x: 2, y: 3, width: 20, height: 14, rx: 2 },
    ],
  },
  {
    title: 'Listening',
    link: '/audio',
    details: 'Stream, download and torrent songs, podcasts and more!',
    color: '#7c82fe',
    paths: [
      { type: 'path', d: 'M9 18V5l12-2v13' },
      { type: 'circle', cx: 6, cy: 18, r: 3 },
      { type: 'circle', cx: 18, cy: 16, r: 3 },
    ],
  },
  {
    title: 'Gaming',
    link: '/gaming',
    details:
      'Download and play all your favourite games or emulate some old but gold ones!',
    color: '#49d3e9',
    paths: [
      { type: 'line', x1: 6, x2: 10, y1: 11, y2: 11 },
      { type: 'line', x1: 8, x2: 8, y1: 9, y2: 13 },
      { type: 'line', x1: 15, x2: 15.01, y1: 12, y2: 12 },
      { type: 'line', x1: 18, x2: 18.01, y1: 10, y2: 10 },
      {
        type: 'path',
        d: 'M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z',
      },
    ],
  },
  {
    title: 'Reading',
    link: '/reading',
    details:
      "Whether you're a bookworm, otaku or comic book fan, you'll be able to find your favourite pieces of literature here!",
    color: '#3ccd93',
    paths: [
      {
        type: 'path',
        d: 'M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20',
      },
      { type: 'path', d: 'M8 11h8' },
      { type: 'path', d: 'M8 7h6' },
    ],
  },
  {
    title: 'Downloading',
    link: '/downloading',
    details:
      'Download all your favourite software, movies, shows, music, games and more!',
    color: '#BEC23F',
    paths: [
      { type: 'path', d: 'M12 2v8' },
      { type: 'path', d: 'm16 6-4 4-4-4' },
      { type: 'rect', x: 2, y: 14, width: 20, height: 8, rx: 2 },
      { type: 'path', d: 'M6 18h.01' },
      { type: 'path', d: 'M10 18h.01' },
    ],
  },
  {
    title: 'Torrenting',
    link: '/torrenting',
    details: 'Download your favourite media using the BitTorrent protocol.',
    color: '#8A6BBE',
    paths: [
      { type: 'path', d: 'm12 15 4 4' },
      {
        type: 'path',
        d: 'M2.352 10.648a1.205 1.205 0 0 0 0 1.704l2.296 2.296a1.205 1.205 0 0 0 1.704 0l6.029-6.029a1 1 0 1 1 3 3l-6.029 6.029a1.205 1.205 0 0 0 0 1.704l2.296 2.296a1.205 1.205 0 0 0 1.704 0l6.365-6.367A1 1 0 0 0 8.716 4.282z',
      },
      { type: 'path', d: 'm5 8 4 4' },
    ],
  },
  {
    title: 'Educational',
    link: '/educational',
    details: 'Educational content for all ages.',
    color: '#A8D8B9',
    paths: [
      {
        type: 'path',
        d: 'M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z',
      },
      { type: 'path', d: 'M22 10v6' },
      { type: 'path', d: 'M6 12.5V16a6 3 0 0 0 12 0v-3.5' },
    ],
  },
  {
    title: 'Android / iOS',
    link: '/mobile',
    details: 'All forms of content for Android and iOS.',
    color: '#DAC9A6',
    paths: [
      { type: 'rect', x: 5, y: 2, width: 14, height: 20, rx: 2 },
      { type: 'path', d: 'M12 18h.01' },
    ],
  },
  {
    title: 'Linux / macOS',
    link: '/linux-macos',
    details: 'The $HOME of Linux and macOS.',
    color: '#f17c67',
    paths: [
      { type: 'path', d: 'm7 11 2-2-2-2' },
      { type: 'path', d: 'M11 13h4' },
      { type: 'rect', x: 3, y: 3, width: 18, height: 18, rx: 2 },
    ],
  },
  {
    title: 'Non-English',
    link: '/non-english',
    details: 'Content in languages other than English.',
    color: '#FB9966',
    paths: [
      { type: 'path', d: 'm5 8 6 6' },
      { type: 'path', d: 'm4 14 6-6 2-3' },
      { type: 'path', d: 'M2 5h12' },
      { type: 'path', d: 'M7 2h1' },
      { type: 'path', d: 'm22 22-5-10-5 10' },
      { type: 'path', d: 'M14 18h6' },
    ],
  },
  {
    title: 'Miscellaneous',
    link: '/misc',
    details: 'Various topics like food, travel, news, shopping, fun sites and more!',
    color: '#DDD23B',
    paths: [
      {
        type: 'path',
        d: 'M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-5.5l-5-3-4.03 2.42Z',
      },
      { type: 'path', d: 'm7 16.5-4.74-2.85' },
      { type: 'path', d: 'm7 16.5 5-3' },
      { type: 'path', d: 'M7 16.5v5.17' },
      {
        type: 'path',
        d: 'M12 13.5V19l3.97 2.38a2 2 0 0 0 2.06 0l3-1.8a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L17 10.5l-5 3Z',
      },
      { type: 'path', d: 'm17 16.5-5-3' },
      { type: 'path', d: 'm17 16.5 4.74-2.85' },
      { type: 'path', d: 'M17 16.5v5.17' },
      {
        type: 'path',
        d: 'M7.97 4.42A2 2 0 0 0 7 6.13v4.37l5 3 5-3V6.13a2 2 0 0 0-.97-1.71l-3-1.8a2 2 0 0 0-2.06 0l-3 1.8Z',
      },
      { type: 'path', d: 'M12 8 7.26 5.15' },
      { type: 'path', d: 'm12 8 4.74-2.85' },
      { type: 'path', d: 'M12 13.5V8' },
    ],
  },
]
