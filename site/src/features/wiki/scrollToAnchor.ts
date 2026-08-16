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

const HEADER_OFFSET = 64 // matches html { scroll-padding-top } for the fixed header

export function scrollToAnchor(id: string, { updateHash = true } = {}): boolean {
  if (typeof document === 'undefined') return false
  const el = document.getElementById(id)
  if (!el) return false

  if (updateHash && typeof history !== 'undefined') {
    history.replaceState(null, '', `#${id}`)
  }

  let attempts = 0
  let stableRuns = 0
  const MAX_ATTEMPTS = 40

  const step = () => {
    const target = Math.max(
      0,
      el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET,
    )
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
    if (!el.isConnected) return
    const target = Math.max(
      0,
      el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET,
    )
    if (Math.abs(window.scrollY - target) > 4) {
      window.scrollTo({ top: target, behavior: 'auto' })
    }
  }, 600)
  return true
}
