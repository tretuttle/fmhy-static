// /statechart view for SectionJumps.tla + Chart.cfg: the reader's words for
// each state and step. Two regions: what is moving the page, and what became
// of the reader's newest request.

const jumpsOf = (v) => (Array.isArray(v.jumps) ? v.jumps : Object.values(v.jumps ?? {}))
const landableNow = (v) => {
  const l = v.landable
  const x = l?.[v.req] ?? l?.[String(v.req)]
  return x !== false
}
const busy = (v) => jumpsOf(v).length > 0 || v.search.phase !== 'idle' || v.hashPoll !== 0

// Flat chart. Order matters: a broken rule names the state first, then what
// is moving the page.
export const title = 'Jump to a section: who moves the page'

export const state = (v) => {
  const s = v.search
  // HeaderFreeOnceIdle: nothing is running but the header is still frozen
  if (!busy(v) && (v.navFreezes > 0 || v.lock)) return 'Nothing running, header stuck frozen'
  if (v.wrongPage) {
    return busy(v) ? 'An old jump is scrolling the new page' : 'Left where the old jump scrolled'
  }
  if (v.dropped) {
    return busy(v) ? 'Your jump was ignored, search holds the page' : 'Your jump was ignored, page settled elsewhere'
  }
  if (s.phase === 'waiting' && !(s.findable && s.path === v.path)) {
    return 'Search holds the page, no match to find'
  }
  if (s.phase !== 'idle') return 'Search finding and landing on the match'
  if (v.hashPoll !== 0) return 'Waiting for the section to render'
  if (jumpsOf(v).length > 0) return 'Section jump settling'
  if (v.req === 0 || v.scrolledFor === v.req) return 'Reading where you asked'
  if (!landableNow(v)) return 'Reading near the section, match never found'
  return 'Settled where an older request sent you'
}

export const group = (v) => {
  const s = v.search.phase
  if (s !== 'idle') return 'search'
  if (v.hashPoll !== 0 || jumpsOf(v).length > 0) return 'jump'
  return 'reading'
}

export const colors = { reading: 'teal', jump: 'blue', search: 'purple' }

// Arrows hidden to keep the chart readable (each repeats what another arrow
// shows; every state stays reachable and keeps a step out). SKILL.md lists
// them for the hand-off.
const USER = new Set([
  'YouTapAHeading',
  'YouChangeTheHash',
  'YouOpenASectionOnAnotherPage',
  'YouOpenAnotherPage',
  'YouPickASearchResult',
])
const hidden = (action, a, b) =>
  // new requests made while a section is still rendering: same as from Reading
  (a === 'Waiting for the section to render' && USER.has(action)) ||
  // after a search that found nothing, only the next tap is drawn
  (a === 'Reading near the section, match never found' &&
    USER.has(action) && b !== 'Section jump settling') ||
  // a newer search replacing an older one: same as from Reading
  (a.startsWith('Search') && action === 'YouPickASearchResult' && b.startsWith('Search')) ||
  // background work finishing in a different order than the main arrows show
  (a === 'Search holds the page, no match to find' && action === 'SearchGivesUp' &&
    b !== 'Reading where you asked' && b !== 'Reading near the section, match never found') ||
  (a === 'Search finding and landing on the match' && b === 'Waiting for the section to render') ||
  (a === 'Section jump settling' && action === 'YouPickASearchResult' && b !== 'Search finding and landing on the match') ||
  (a === 'Section jump settling' && b === 'Reading near the section, match never found') ||
  (a === 'Section jump settling' && b === 'Left where the old jump scrolled')

export const step = (action, from, to) => {
  if (hidden(action, state(from), state(to))) return null
  switch (action) {
    case 'YouTapAHeading':
      return 'you tap a heading'
    case 'YouChangeTheHash':
      return 'you change the #hash'
    case 'YouOpenASectionOnAnotherPage':
      return 'you open a section on another page'
    case 'YouOpenAnotherPage':
      return 'you open another page'
    case 'YouPickASearchResult':
      return to.search.findable
        ? 'you pick a search result'
        : "you pick a result whose match isn't on the page"
    case 'SearchFindsTheMatch':
      return 'search finds the match'
    case 'SearchLandingStep':
      return 'search finishes landing'
    case 'SearchUnlocks':
      return 'search lets go of the header'
    case 'SearchGivesUp':
      return 'search gives up after about 7s'
    case 'HashPollFires':
      return from.lock ? 'the section renders, search still holds the page' : 'the section renders'
    case 'AJumpSettleStep':
      return to.wrongPage && !from.wrongPage ? "the previous page's jump scrolls this page" : 'the jump settles'
    case 'AJumpLateCorrection':
      return 'the 600ms re-check runs'
    case 'AJumpReleasesHeader':
      return 'the jump lets go of the header'
    case 'Done':
      return null
    default:
      return action
  }
}
