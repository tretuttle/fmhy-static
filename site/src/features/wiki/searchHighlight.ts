// search highlight utilities — ports of the DOM-marking half of fmhy.net's
// VPLocalSearchBox.vue (formMarkRegex / groupMarks / mergeNearbyMarks and a
// minimal mark.js equivalent) plus the post-navigation scroll-to-match logic
// from docs/.vitepress/theme/composables/searchScroll.ts.
//
// TODO(native): [P2, task #8] pure DOM (TreeWalker/Range/getBoundingClientRect) —
// part of the web search presentation; not portable, replaced wholesale on native.

const MARK_MERGE_DISTANCE_PX = 20
const MARK_SAME_LINE_THRESHOLD_PX = 5

const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Upstream formMarkRegex: longest-first alternation of all highlight terms.
 * Exact mode adds the whole raw query; fuzzy mode adds the query's words.
 */
export function formMarkRegex(
  terms: Iterable<string>,
  rawQuery: string,
  isFuzzySearch: boolean,
): RegExp | null {
  const allTerms = new Set<string>()
  for (const term of terms) allTerms.add(term)
  if (isFuzzySearch) {
    const words = rawQuery
      .trim()
      .split(/[\s\W]+/)
      .filter(Boolean)
    for (const word of words) allTerms.add(word)
  } else {
    allTerms.add(rawQuery.trim())
  }
  const parts = [...allTerms]
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)
    .map((term) => `(${escapeRegExp(term)})`)
  if (parts.length === 0) return null
  return new RegExp(parts.join('|'), 'gi')
}

/** Remove every mark this module previously inserted below `root`. */
export function unmarkAll(root: ParentNode): void {
  const marks = Array.from(root.querySelectorAll('mark[data-markjs="true"]'))
  const parents = new Set<Node>()
  for (const mark of marks) {
    const parent = mark.parentNode
    if (!parent) continue
    while (mark.firstChild) parent.insertBefore(mark.firstChild, mark)
    parent.removeChild(mark)
    parents.add(parent)
  }
  // merge the text nodes we split so the next markRegExp pass sees whole runs
  for (const parent of parents) parent.normalize()
}

/**
 * Minimal mark.js `markRegExp` equivalent (acrossElements: false): walk the
 * text nodes under `target`, skipping `exclude` selectors, and wrap regex
 * matches in `<mark data-markjs="true">`.
 */
export function markRegExpIn(target: Element, regex: RegExp, exclude: string[]): void {
  const doc = target.ownerDocument
  const excludeSelector = exclude.join(',')
  const walker = doc.createTreeWalker(target, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement
      if (!parent) return NodeFilter.FILTER_REJECT
      if (parent.closest('mark[data-markjs="true"]')) return NodeFilter.FILTER_REJECT
      if (excludeSelector && parent.closest(excludeSelector)) {
        return NodeFilter.FILTER_REJECT
      }
      return NodeFilter.FILTER_ACCEPT
    },
  })

  const textNodes: Text[] = []
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    textNodes.push(node as Text)
  }

  for (const node of textNodes) {
    const text = node.nodeValue ?? ''
    if (!text) continue
    regex.lastIndex = 0
    let match: RegExpExecArray | null
    let last = 0
    let frag: DocumentFragment | null = null
    while ((match = regex.exec(text)) !== null) {
      if (match[0] === '') {
        regex.lastIndex++
        continue
      }
      frag ??= doc.createDocumentFragment()
      if (match.index > last) {
        frag.appendChild(doc.createTextNode(text.slice(last, match.index)))
      }
      const mark = doc.createElement('mark')
      mark.setAttribute('data-markjs', 'true')
      mark.textContent = match[0]
      frag.appendChild(mark)
      last = match.index + match[0].length
    }
    if (frag) {
      if (last < text.length) frag.appendChild(doc.createTextNode(text.slice(last)))
      node.parentNode?.replaceChild(frag, node)
    }
  }
}

/**
 * Upstream groupMarks: consecutive marks in the same parent separated by at
 * most 20 chars of non-word text count as one navigable match group.
 */
export function groupMarks(marks: HTMLElement[]): HTMLElement[][] {
  const groups: HTMLElement[][] = []
  if (marks.length === 0) return groups
  if (typeof document === 'undefined') return [marks]

  let currentGroup = [marks[0]!]
  for (let i = 1; i < marks.length; i++) {
    const prev = marks[i - 1]!
    const curr = marks[i]!
    if (prev.parentNode !== curr.parentNode) {
      groups.push(currentGroup)
      currentGroup = [curr]
      continue
    }
    try {
      const range = document.createRange()
      range.setStartAfter(prev)
      range.setEndBefore(curr)
      const textBetween = range.toString()
      if (/^[\s\W]{0,20}$/.test(textBetween)) {
        currentGroup.push(curr)
      } else {
        groups.push(currentGroup)
        currentGroup = [curr]
      }
    } catch {
      groups.push(currentGroup)
      currentGroup = [curr]
    }
  }
  groups.push(currentGroup)
  return groups
}

/**
 * Upstream mergeNearbyMarks (fuzzy mode): marks on the same line within 20px
 * horizontally are merged into a single mark to reduce navigation stops.
 */
export function mergeNearbyMarks(excerpts: Element[]): void {
  for (const excerpt of excerpts) {
    const marks = Array.from(
      excerpt.querySelectorAll('mark[data-markjs="true"]'),
    ) as HTMLElement[]
    if (marks.length <= 1) continue

    type Rect = { left: number; right: number; top: number }
    const rects: Rect[] = marks.map((m) => {
      const r = m.getBoundingClientRect()
      return { left: r.left, right: r.right, top: r.top }
    })

    let i = 0
    while (i < marks.length - 1) {
      if (marks[i]!.parentNode !== marks[i + 1]!.parentNode) {
        i++
        continue
      }

      const distance = rects[i + 1]!.left - rects[i]!.right
      const onSameLine =
        Math.abs(rects[i]!.top - rects[i + 1]!.top) < MARK_SAME_LINE_THRESHOLD_PX

      if (distance >= 0 && distance < MARK_MERGE_DISTANCE_PX && onSameLine) {
        let node = marks[i]!.nextSibling
        while (node && node !== marks[i + 1]) {
          const next = node.nextSibling
          marks[i]!.appendChild(node)
          node = next
        }
        while (marks[i + 1]!.firstChild) {
          marks[i]!.appendChild(marks[i + 1]!.firstChild as Node)
        }
        marks[i + 1]!.remove()
        marks.splice(i + 1, 1)
        rects[i]!.right = rects[i + 1]!.right
        rects.splice(i + 1, 1)
      } else {
        i++
      }
    }
  }
}

export function getRelativeOffsetTop(element: HTMLElement, ancestor: HTMLElement): number {
  let offsetTop = 0
  let curr: HTMLElement | null = element
  while (curr && curr !== ancestor) {
    offsetTop += curr.offsetTop
    curr = curr.offsetParent as HTMLElement | null
  }
  return offsetTop
}

/** Scroll an excerpt so the given mark sits vertically centered. */
export function centerMarkInExcerpt(
  mark: HTMLElement,
  excerpt: HTMLElement,
  smooth: boolean,
): void {
  const markRelTop = getRelativeOffsetTop(mark, excerpt)
  const top = markRelTop - excerpt.clientHeight / 2 + mark.offsetHeight / 2
  if (smooth) excerpt.scrollTo({ top, behavior: 'smooth' })
  else excerpt.scrollTop = top
}

// ---------------------------------------------------------------------------
// post-navigation scroll-to-match — searchScroll.ts port adapted to our DOM:
// content root is #main-content, section anchors are the generated wrapper
// divs (WikiSectionList's Anchor), the navbar is the fixed 56px header.
// ---------------------------------------------------------------------------

const HEADER_HEIGHT = 56
const HIGHLIGHT_CLASS = 'vp-search-highlight-target'
// freezes the (mobile) hide-on-scroll header + local-nav while we jump
// (upstream html.vp-search-scrolling, style.scss)
const SCROLLING_CLASS = 'vp-search-scrolling'

let activeScrollId = 0
let activeObserver: MutationObserver | null = null
let highlightTimeout: ReturnType<typeof setTimeout> | null = null

function getContentRoot(): Element | null {
  return document.getElementById('main-content') ?? document.body
}

// upstream getNavbarHeight: fixed header plus the sticky mobile local-nav bar
// when it is visible — without it the match lands hidden under the bar
function getNavbarHeight(): number {
  let navHeight = HEADER_HEIGHT
  const localNav = document.getElementById('local-nav')
  if (localNav) {
    const rect = localNav.getBoundingClientRect()
    if (rect.height > 0) navHeight += rect.height
  }
  return navHeight
}

function scrollToMatchInSection(
  sectionEl: HTMLElement | null,
  query: string,
  matchContext: string | null,
): boolean {
  if (!query.trim()) return false

  const queryLower = query.trim().toLowerCase()
  const queryWords = queryLower.split(/\s+/).filter(Boolean)
  if (queryWords.length === 0) return false

  const contentRoot = getContentRoot()
  if (!contentRoot) return false

  // our section anchors are wrapper divs containing the whole (sub)section,
  // so candidate collection is a simple scoped query
  const scope: Element = sectionEl ?? contentRoot
  const candidates = Array.from(scope.querySelectorAll('p, li, td, dd, blockquote'))
  if (candidates.length === 0) return false

  let bestMatch: Element | null = null
  const contextLower = matchContext?.trim().toLowerCase() || null

  const linkMatchesQuery = (el: Element): boolean => {
    const links = Array.from(el.querySelectorAll('a'))
    for (const link of links) {
      const linkText = (link.textContent ?? '').trim().toLowerCase()
      if (linkText.length === 0) continue
      if (linkText.includes(queryLower) || queryLower.includes(linkText)) return true
    }
    return false
  }

  // pass 0: match by the excerpt context (the li/p the user was looking at)
  if (contextLower && contextLower.length > 0) {
    for (const el of candidates) {
      const text = (el.textContent ?? '').trim().toLowerCase()
      if (text === contextLower) {
        bestMatch = el
        break
      }
    }
    if (!bestMatch) {
      for (const el of candidates) {
        const text = (el.textContent ?? '').trim().toLowerCase()
        if (text.length > 10 && contextLower.includes(text)) {
          bestMatch = el
          break
        }
        if (contextLower.length > 10 && text.includes(contextLower)) {
          bestMatch = el
          break
        }
      }
    }
  }

  // pass 1: exact link text match
  if (!bestMatch) {
    for (const el of candidates) {
      if (linkMatchesQuery(el)) {
        bestMatch = el
        break
      }
    }
  }

  // pass 2: full query phrase in element text
  if (!bestMatch) {
    for (const el of candidates) {
      if ((el.textContent ?? '').toLowerCase().includes(queryLower)) {
        bestMatch = el
        break
      }
    }
  }

  // pass 3: all query words present
  if (!bestMatch) {
    for (const el of candidates) {
      const text = (el.textContent ?? '').toLowerCase()
      if (queryWords.every((w) => text.includes(w))) {
        bestMatch = el
        break
      }
    }
  }

  // pass 4: any query word present
  if (!bestMatch) {
    for (const el of candidates) {
      const text = (el.textContent ?? '').toLowerCase()
      if (queryWords.some((w) => text.includes(w))) {
        bestMatch = el
        break
      }
    }
  }

  if (!bestMatch) return false
  if (sectionEl && bestMatch === sectionEl) return false

  doScrollAndHighlight(bestMatch)
  return true
}

function doScrollAndHighlight(el: Element): void {
  const prev = document.querySelector(`.${HIGHLIGHT_CLASS}`)
  if (prev) prev.classList.remove(HIGHLIGHT_CLASS)
  if (highlightTimeout) {
    clearTimeout(highlightTimeout)
    highlightTimeout = null
  }

  // place the match at 18% of the remaining viewport height below the navbar
  const navHeight = getNavbarHeight()
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800
  const remainingHeight = Math.max(200, viewportHeight - navHeight)
  const desiredOffset = navHeight + Math.floor(remainingHeight * 0.18)

  const rect = el.getBoundingClientRect()
  const targetY = Math.max(0, rect.top + window.scrollY - desiredOffset)

  const docEl = document.documentElement
  const prevBehavior = docEl.style.scrollBehavior
  docEl.style.scrollBehavior = 'auto'
  window.scrollTo({ top: targetY, behavior: 'auto' })
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      docEl.style.scrollBehavior = prevBehavior
    })
  })

  el.classList.add(HIGHLIGHT_CLASS)
  highlightTimeout = setTimeout(() => el.classList.remove(HIGHLIGHT_CLASS), 2000)
}

/** Cancel any in-progress scroll-to-match operation. */
export function cancelPendingScroll(): void {
  activeScrollId++
  if (activeObserver) {
    activeObserver.disconnect()
    activeObserver = null
  }
  if (highlightTimeout) {
    clearTimeout(highlightTimeout)
    highlightTimeout = null
  }
  if (typeof document !== 'undefined') {
    document.documentElement.classList.remove(SCROLLING_CLASS)
  }
}

const cleanPath = (p: string): string => {
  const cleaned = p
    .replace(/^\.?\//, '/')
    .replace(/\.html$/, '')
    .replace(/\/index$/, '')
    .replace(/\/$/, '')
    .toLowerCase()
  return cleaned || '/'
}

export function isSamePath(destPath: string): boolean {
  if (!destPath) return true
  if (typeof window === 'undefined') return false
  return cleanPath(window.location.pathname) === cleanPath(destPath)
}

/**
 * Wait for the destination page DOM, then scroll to the match. Polls with
 * retries and falls back to a MutationObserver, aborting when superseded.
 *
 * @param expectedPath cross-page navigations pass the destination path so a
 *                     stale schedule never scrolls the wrong page
 */
export function scheduleScrollToMatch(
  hash: string,
  query: string,
  initialDelay = 16,
  matchContext: string | null = null,
  expectedPath: string | null = null,
): void {
  cancelPendingScroll()

  // lock the (mobile) navbar in place so the instant jump can't animate it
  // away mid-scroll (upstream html.vp-search-scrolling)
  if (typeof document !== 'undefined') {
    document.documentElement.classList.add(SCROLLING_CLASS)
  }

  const scrollId = activeScrollId
  let attempts = 0
  const maxAttempts = 15
  const intervalMs = 120

  const isStale = () => scrollId !== activeScrollId

  // only the active operation may remove the lock; a stale op must not strip
  // the class belonging to a newer scroll (upstream complete())
  function unlock() {
    if (!isStale() && typeof document !== 'undefined') {
      document.documentElement.classList.remove(SCROLLING_CLASS)
    }
  }

  function tryScroll(): boolean {
    if (isStale()) return true
    if (expectedPath && !isSamePath(expectedPath)) return false

    let sectionEl: HTMLElement | null = null
    if (hash) {
      try {
        sectionEl = document.getElementById(decodeURIComponent(hash))
      } catch {
        /* malformed URI */
      }
    }
    if (hash && !sectionEl) return false

    const found = scrollToMatchInSection(sectionEl, query, matchContext)
    if (found) {
      if (activeObserver && !isStale()) {
        activeObserver.disconnect()
        activeObserver = null
      }
      // defer so the browser processes the scroll before the navbar unfreezes
      setTimeout(unlock, 100)
    }
    return found
  }

  function poll() {
    if (isStale()) return
    attempts++
    if (tryScroll()) return
    if (attempts < maxAttempts) {
      setTimeout(poll, intervalMs)
    } else {
      startObserver()
    }
  }

  function startObserver() {
    if (isStale()) return
    const contentRoot = getContentRoot()
    if (!contentRoot) {
      unlock()
      return
    }

    let debounceTimer: ReturnType<typeof setTimeout> | null = null

    activeObserver = new MutationObserver(() => {
      if (isStale()) {
        activeObserver?.disconnect()
        activeObserver = null
        return
      }
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        debounceTimer = null
        if (tryScroll()) {
          activeObserver?.disconnect()
          activeObserver = null
        }
      }, 50)
    })

    activeObserver.observe(contentRoot, { childList: true, subtree: true })

    // safety: disconnect after 5 seconds to prevent leaks
    const observerScrollId = scrollId
    setTimeout(() => {
      if (activeObserver && observerScrollId === activeScrollId) {
        activeObserver.disconnect()
        activeObserver = null
      }
      if (debounceTimer) {
        clearTimeout(debounceTimer)
        debounceTimer = null
      }
      unlock()
    }, 5000)
  }

  requestAnimationFrame(() => {
    if (isStale()) return
    setTimeout(poll, initialDelay)
  })
}
