// data contract for the generated FMHY wiki content — see DESIGN-WIKI.md

export type WikiNoticeKind = 'tip' | 'warning'

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

export type WikiSubsection = {
  id: string
  title: string
  refUrl: string | null
  crossrefRoute: string | null
  notice: WikiNotice | null
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
