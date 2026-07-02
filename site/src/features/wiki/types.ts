// data contract for the generated FMHY wiki content — see DESIGN-WIKI.md

// 'info' = fmhy.net's blue :::info block (!!!note/!!!info in guide markdown)
export type WikiNoticeKind = 'tip' | 'warning' | 'info'

export type WikiNotice = {
  kind: WikiNoticeKind
  markdown: string
}

export type WikiMarker = 'starred' | 'index' | 'crossref' | null

export type WikiSubLink = {
  label: string
  url: string
  // icon key for known labels: discord | github | gitlab | telegram | reddit | x | onion | source
  icon: string | null
  // id into notes.json when this link resolves to a vitepress note tooltip
  noteId: string | null
  // in-app route when the url is a reddit-wiki cross-reference, else null
  route: string | null
}

export type WikiAlternative = {
  title: string
  url: string
  mirrors: string[]
  bold: boolean
  // in-app route when the url is a reddit-wiki cross-reference, else null
  route: string | null
}

export type WikiEntry = {
  id: string
  marker: WikiMarker
  starred: boolean
  bold: boolean
  title: string | null
  url: string | null
  mirrors: string[]
  alternatives: WikiAlternative[]
  description: string | null
  tags: string[]
  platforms: string[]
  nsfw: boolean | 'partial'
  links: WikiSubLink[]
  code: string[]
  // in-app route ("/video#anchor") when this is a resolvable crossref, else null
  crossrefRoute: string | null
}

// ordered guide-profile prose (beginners-guide): '> ' questions stay real
// blockquotes, !!!note/!!!info become 'info' notices, plain lines are prose.
// when `blocks` is non-empty it is the full-fidelity representation of the
// container's prose IN DOCUMENT ORDER and should be rendered INSTEAD of the
// legacy merged `notice` (which is kept as a fallback for older renderers).
export type WikiGuideBlock =
  | { kind: 'prose'; markdown: string }
  | { kind: 'blockquote'; markdown: string }
  | { kind: 'notice'; notice: WikiNotice }

export type WikiSubsection = {
  id: string
  title: string
  refUrl: string | null
  crossrefRoute: string | null
  notice: WikiNotice | null
  blocks: WikiGuideBlock[]
  entries: WikiEntry[]
}

export type WikiSection = WikiSubsection & {
  subsections: WikiSubsection[]
}

export type WikiPageKind = 'wiki' | 'guide' | 'unsafe' | 'storage'

export type WikiPage = {
  id: string
  title: string
  description: string
  kind: WikiPageKind
  pageNotice: WikiNotice | null
  sections: WikiSection[]
  entryCount: number
}

export type WikiNavItem = {
  slug: string
  title: string
  emoji: string
  description: string
  // in-app route, e.g. "/video" or "/audio#audio-tools"
  route: string
  // external urls (NSFW checkpoint) — open externally instead of routing
  externalUrl: string | null
  entryCount: number
}

export type WikiNavGroup = {
  title: string
  collapsed: boolean
  items: WikiNavItem[]
}

export type WikiNav = {
  generatedAt: string
  groups: WikiNavGroup[]
}

export type WikiNote = {
  title: string
  markdown: string
}

// ---------------------------------------------------------------------------
// prose pages (docs/other/*, docs/posts/*, sandbox, recently-removed) —
// regular markdown parsed into an ordered block model, rendered by
// WikiProseContent (no MDX runtime). generated as generated/prose/<id>.json
// ---------------------------------------------------------------------------

export type WikiProseListItem = {
  // inline markdown for the item's own line
  markdown: string
  // indented continuation content (nested lists, images, paragraphs)
  children: WikiProseBlock[]
}

export type WikiProseContainerVariant = 'info' | 'tip' | 'warning' | 'danger' | 'details'

export type WikiProseBlock =
  | { kind: 'heading'; level: 1 | 2 | 3 | 4 | 5 | 6; id: string; markdown: string }
  | { kind: 'paragraph'; markdown: string }
  | { kind: 'list'; ordered: boolean; items: WikiProseListItem[] }
  | { kind: 'blockquote'; markdown: string }
  | {
      kind: 'container'
      variant: WikiProseContainerVariant
      title: string | null
      blocks: WikiProseBlock[]
    }
  | { kind: 'code'; language: string | null; code: string }
  | { kind: 'hr' }
  | { kind: 'image'; src: string; alt: string }
  | {
      kind: 'wallpaper'
      title: string
      description: string
      mobile: string
      desktop: string
    }

export type WikiProseAuthor = {
  name: string
  github: string
}

// 'none'  = body provides its own headings (other/*, sandbox)
// 'page'  = wiki-style H1 + description + feedback card (recently-removed)
// 'post'  = post layout: H1 + "description • date" + authors row
export type WikiProseHeader = 'none' | 'page' | 'post'

export type WikiProsePage = {
  // repo-relative page id, e.g. 'posts/june-2026', 'other/FAQ', 'sandbox'
  id: string
  // absolute in-app route, e.g. '/posts/june-2026' — matches fmhy.net URLs
  route: string
  kind: 'prose'
  header: WikiProseHeader
  title: string
  description: string | null
  // 'YYYY-MM-DD' frontmatter date (posts), else null
  date: string | null
  authors: WikiProseAuthor[]
  blocks: WikiProseBlock[]
}

// generated/posts.json manifest — shape is a cross-agent contract (RSS feed
// generation reads it): [{ slug, title, date, description }]
export type WikiPostMeta = {
  slug: string
  title: string
  date: string
  description: string
}

export type SearchDoc = {
  id: string
  pageId: string
  pageTitle: string
  // "Section › Subsection"
  sectionPath: string
  // anchor of the (sub)section containing the entry
  anchor: string
  title: string
  altTitles: string[]
  url: string | null
  description: string | null
  tags: string[]
  starred: boolean
  isIndex: boolean
  nsfw: boolean | 'partial'
}
