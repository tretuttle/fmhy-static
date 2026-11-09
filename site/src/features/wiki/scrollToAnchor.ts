// cross-engine anchor scrolling for pages whose sections use
// content-visibility: auto with fixed containIntrinsicSize placeholders.
//
// Anchor targets below the fold sit at PLACEHOLDER-derived positions until the
// sections above them actually render, so a single scrollIntoView/scrollTo
// lands thousands of pixels off (Chromium self-corrects during the scroll;
// Firefox and WebKit don't — clicks appear to do nothing or land wrong).
// The cure is to jump, let the newly-visible sections lay out, re-measure,
// and correct until the target position is stable.
//
// TODO(native): the `typeof document` guard makes this a safe no-op on
// react-native — meaning TOC taps, local-nav links and #hash navigation all go dead
// there. native needs a scroll-registry equivalent behind this same signature.

import { freezeMobileNav, getAnchorScrollTop } from './scrollOffset'

// a newer jump supersedes an older one still settling, and a search
// scroll-to-match (html.vp-search-scrolling) supersedes both
let activeJump = 0

const isSearchScrolling = () =>
  document.documentElement.classList.contains('vp-search-scrolling')

export function scrollToAnchor(id: string, { updateHash = true } = {}): boolean {
  if (typeof document === 'undefined') return false
  const el = document.getElementById(id)
  if (!el) return false

  if (updateHash && typeof history !== 'undefined') {
    history.replaceState(null, '', `#${id}`)
  }

  // hold the mobile header where it is while we jump: a downward jump would
  // otherwise hide it mid-flight and the target would settle with a gap above
  const releaseNav = freezeMobileNav()
  const jump = ++activeJump
  const superseded = () => jump !== activeJump || isSearchScrolling()

  let attempts = 0
  let stableRuns = 0
  const MAX_ATTEMPTS = 40

  const step = () => {
    if (superseded()) return
    // lands on the shared measured inset (header + mobile local-nav + 16px)
    // via the anchor's scroll-margin-top — see scrollOffset.ts
    const target = getAnchorScrollTop(el)
    const settled = Math.abs(window.scrollY - target) <= 1
    if (!settled) {
      stableRuns = 0
      window.scrollTo({ top: target, behavior: 'auto' })
    } else {
      stableRuns++
    }
    attempts++
    // deep targets keep shifting as placeholder sections realize their true
    // heights for several frames after each jump — require the position to
    // hold for a few consecutive frames before trusting it
    if (attempts < MAX_ATTEMPTS && stableRuns < 3) {
      requestAnimationFrame(() => requestAnimationFrame(step))
    }
  }
  step()
  // late correction: image/emoji loads and stragglers can still shift layout
  // after the loop settles
  setTimeout(() => {
    if (el.isConnected && !superseded()) {
      const target = getAnchorScrollTop(el)
      if (Math.abs(window.scrollY - target) > 4) {
        window.scrollTo({ top: target, behavior: 'auto' })
      }
    }
    // let the last scroll event dispatch before the header may react again
    setTimeout(releaseNav, 100)
  }, 600)
  return true
}

