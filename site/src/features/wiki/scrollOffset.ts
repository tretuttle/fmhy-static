// one shared, measured scroll offset — fmhy.net Layout.vue updateScrollInset +
// config.mts `scrollOffset: { selector: '.fmhy-scroll-inset' }`: the fixed
// header, plus the mobile "On this page" bar while it is displayed, plus 16px.
// published as --fmhy-scroll-inset on <html> (root.css turns it into
// scroll-margin-top on content anchors, so native #hash jumps agree) and read
// back with getScrollOffset() by every js scroller and active-anchor tracker.
//
// TODO(native): DOM-only; every export is a safe no-op / fallback off-web.

export const SCROLL_INSET_VAR = '--fmhy-scroll-inset'

const INSET_PADDING = 16
// root.css default when nothing has been measured or parsed yet
const FALLBACK_INSET = 80

let measuredInset: number | null = null

export function getScrollOffset(): number {
  if (measuredInset !== null) return measuredInset
  if (typeof document === 'undefined') return FALLBACK_INSET
  // before the observer's first measure: root.css's static per-breakpoint value
  const css = Number.parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue(SCROLL_INSET_VAR)
  )
  return Number.isFinite(css) ? css : FALLBACK_INSET
}

// header + local-nav heights (getBoundingClientRect ignores the header's
// hide-on-scroll translate, like upstream), kept current with a ResizeObserver
// — the local-nav collapses to display:none from $xl, which RO reports
export function observeScrollInset(
  header: HTMLElement,
  localNav: HTMLElement | null
): () => void {
  if (typeof ResizeObserver === 'undefined') return () => {}

  const visibleHeight = (el: HTMLElement | null) =>
    el && getComputedStyle(el).display !== 'none' ? el.getBoundingClientRect().height : 0

  const update = () => {
    const next = visibleHeight(header) + visibleHeight(localNav) + INSET_PADDING
    if (next === measuredInset) return
    measuredInset = next
    document.documentElement.style.setProperty(SCROLL_INSET_VAR, `${next}px`)
  }

  const observer = new ResizeObserver(update)
  observer.observe(header)
  if (localNav) observer.observe(localNav)
  update()
  return () => observer.disconnect()
}

// how far below the inset an anchor's top edge lands — the rest of its
// scroll-margin-top. section wrappers carry their heading's top margin, so
// root.css gives some of the inset back to land the heading itself there.
// constant per element (the margin is always inset minus a fixed amount), so
// trackers can afford it on every scroll frame
const anchorLeads = new WeakMap<Element, number>()

function getAnchorLead(el: Element): number {
  let lead = anchorLeads.get(el)
  if (lead === undefined) {
    const margin = Number.parseFloat(getComputedStyle(el).scrollMarginTop)
    lead = Number.isFinite(margin) ? getScrollOffset() - margin : 0
    anchorLeads.set(el, lead)
  }
  return lead
}

// viewport y an anchor's top edge lands at when scrolled to (its effective
// scroll-margin-top). trackers count an anchor as reached once its top is
// within 4px of this line (vitepress useActiveAnchor's slack)
export function getAnchorLandingTop(el: Element): number {
  return getScrollOffset() - getAnchorLead(el)
}

// absolute scrollY that lands `el` at its landing line
export function getAnchorScrollTop(el: Element): number {
  return Math.max(
    0,
    el.getBoundingClientRect().top + window.scrollY - getAnchorLandingTop(el)
  )
}

// freeze the mobile header's hide-on-scroll state during programmatic jumps
// (fmhy.net VPNav.vue honours html.vp-search-scrolling the same way — that
// class is still respected too). ref-counted; call the returned release once
// the jump has settled
let navFreezes = 0

export function freezeMobileNav(): () => void {
  navFreezes++
  let released = false
  return () => {
    if (released) return
    released = true
    navFreezes--
  }
}

export function isMobileNavFrozen(): boolean {
  if (navFreezes > 0) return true
  return (
    typeof document !== 'undefined' &&
    document.documentElement.classList.contains('vp-search-scrolling')
  )
}
