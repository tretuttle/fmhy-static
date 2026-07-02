// port of fmhy.net's docs/.vitepress/theme/themes/themeTransition.ts (upstream
// fmhy/edit): light/dark/AMOLED switches reveal the new theme as a radial
// clip-path growing from the click point, via the View Transitions API.
// adapted for react: callers flush the class flip synchronously inside `apply`
// (e.g. flushSync) instead of vue's nextTick. the ::view-transition-* layering
// and the `.theme-view-transition` transition-freeze rules live in app/root.css.

const REVEAL_DURATION = 400
const REVEAL_EASING = 'ease-in-out'

export type RevealPoint = { x: number; y: number }

// last pointer press on the page — fallback origin for controls that don't
// hand us their event (e.g. tamagui Switch's onCheckedChange)
let lastPointer: (RevealPoint & { time: number }) | null = null

if (typeof window !== 'undefined') {
  window.addEventListener(
    'pointerdown',
    (event) => {
      lastPointer = { x: event.clientX, y: event.clientY, time: Date.now() }
    },
    { capture: true, passive: true },
  )
}

// dig client coordinates out of a tamagui/react press event. keyboard "clicks"
// report (0,0) — treat those as no origin so the reveal falls back to a
// recent pointer press or the viewport center (mirrors upstream).
export function pointFromPressEvent(event: unknown): RevealPoint | undefined {
  let current = event as { clientX?: unknown; clientY?: unknown; nativeEvent?: unknown } | null
  for (let depth = 0; depth < 3 && current; depth++) {
    const { clientX, clientY } = current
    if (typeof clientX === 'number' && typeof clientY === 'number') {
      if (clientX === 0 && clientY === 0) {
        return undefined
      }
      return { x: clientX, y: clientY }
    }
    current = current.nativeEvent as typeof current
  }
  return undefined
}

/** Whether the animated light/dark reveal should run. */
function canAnimate(): boolean {
  return (
    typeof document !== 'undefined' &&
    'startViewTransition' in document &&
    window.matchMedia('(prefers-reduced-motion: no-preference)').matches
  )
}

/**
 * Apply a light/dark/AMOLED change as a radial clip-path reveal growing from
 * `origin` (falling back to the last pointer press, then viewport center).
 *
 * `apply` must perform the actual switch synchronously (toggle classes) — wrap
 * react state updates in flushSync so both snapshots capture around it.
 *
 * While the reveal runs `.theme-view-transition` on <html> disables every CSS
 * transition (root.css) so the clip reveal is the only animation; the clip
 * itself is a Web Animations API animation on a pseudo-element, untouched by
 * `transition: none`.
 *
 * Falls back to applying the change instantly when View Transitions are
 * unavailable or the user prefers reduced motion.
 */
export async function revealThemeChange(
  origin: RevealPoint | undefined,
  isDarkAfter: boolean,
  apply: () => void,
): Promise<void> {
  if (!canAnimate()) {
    apply()
    return
  }

  const fallback =
    lastPointer && Date.now() - lastPointer.time < 1000
      ? { x: lastPointer.x, y: lastPointer.y }
      : { x: window.innerWidth / 2, y: window.innerHeight / 2 }
  const { x, y } = origin ?? fallback

  const endRadius =
    Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y)) +
    30
  const clipPath = [
    `circle(0px at ${x}px ${y}px)`,
    `circle(${endRadius}px at ${x}px ${y}px)`,
  ]

  const root = document.documentElement
  root.classList.add('theme-view-transition')

  const transition = (
    document as Document & {
      startViewTransition: (cb: () => void | Promise<void>) => {
        ready: Promise<void>
        finished: Promise<void>
      }
    }
  ).startViewTransition(() => {
    apply()
  })

  // Re-enable normal transitions once the reveal finishes, even if it is
  // interrupted, so the page is never left with transitions disabled.
  transition.finished.finally(() => {
    root.classList.remove('theme-view-transition')
  })

  try {
    await transition.ready
  } catch {
    // If the transition fails to start (interrupted/aborted), do not animate.
    await transition.finished.catch(() => {})
    return
  }

  // Going to dark: shrink the old (light) layer away to reveal dark beneath.
  // Going to light: grow the new (light) layer over the dark beneath.
  // The z-index layering that puts the clipped layer on top lives in root.css's
  // `::view-transition-*(root)` rules.
  root.animate(
    { clipPath: isDarkAfter ? [...clipPath].reverse() : clipPath },
    {
      duration: REVEAL_DURATION,
      easing: REVEAL_EASING,
      // Hold the final frame. Going to dark we shrink the old (light) layer to
      // circle(0); without `forwards` its clip-path reverts to "no clip" for
      // the frame between the animation ending and the snapshot being removed,
      // briefly flashing the whole old theme back into view.
      fill: 'forwards',
      pseudoElement: `::view-transition-${isDarkAfter ? 'old' : 'new'}(root)`,
    },
  )

  // Resolve only once the reveal has fully finished, so callers can defer
  // cleanup until the end.
  await transition.finished.catch(() => {})
}
