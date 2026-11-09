import { router, usePathname } from 'one'
import { useEffect, useRef } from 'react'
import { isWeb } from 'tamagui'

// route progress bar — fmhy.net theme/composables/nprogress.ts: nprogress
// (showSpinner: false) started when a client navigation begins and finished
// once it lands, a 2px brand-coloured bar with nprogress's glowing peg (styles
// in root.css #nprogress). a dependency-free port of nprogress's own
// start/trickle/done curve, driven by One's router load state. the bar is
// created on first navigation — nothing in the SSG markup, nothing at first
// paint. back/forward never starts it, like vitepress's popstate path.
//
// TODO(native): web-only; renders nothing elsewhere.

const MINIMUM = 0.08
const SPEED = 200
const TRICKLE_SPEED = 200
// a navigation that never reports back (e.g. superseded) must not trickle on
const STALL_TIMEOUT = 10_000

function createProgress() {
  let status: number | null = null
  let root: HTMLDivElement | null = null
  let bar: HTMLDivElement | null = null
  let fadeTimer: ReturnType<typeof setTimeout> | undefined
  let trickleTimer: ReturnType<typeof setTimeout> | undefined
  let stallTimer: ReturnType<typeof setTimeout> | undefined

  const render = () => {
    if (!root) {
      root = document.createElement('div')
      root.id = 'nprogress'
      root.setAttribute('aria-hidden', 'true')
      bar = document.createElement('div')
      bar.className = 'bar'
      const peg = document.createElement('div')
      peg.className = 'peg'
      bar.appendChild(peg)
      root.appendChild(bar)
    }
    if (!root.isConnected) document.body.appendChild(root)
    root.style.transition = 'none'
    root.style.opacity = '1'
  }

  const set = (n: number) => {
    clearTimeout(fadeTimer)
    const value = Math.min(Math.max(n, MINIMUM), 1)
    const starting = status === null
    status = value === 1 ? null : value
    if (starting) {
      render()
      // paint the starting position before animating from it
      bar!.style.transition = 'none'
      bar!.style.transform = `translate3d(${(MINIMUM - 1) * 100}%,0,0)`
      void bar!.offsetWidth
    }
    bar!.style.transition = `transform ${SPEED}ms linear`
    bar!.style.transform = `translate3d(${(value - 1) * 100}%,0,0)`

    if (value === 1) {
      clearTimeout(trickleTimer)
      clearTimeout(stallTimer)
      fadeTimer = setTimeout(() => {
        root!.style.transition = `opacity ${SPEED}ms linear`
        root!.style.opacity = '0'
        fadeTimer = setTimeout(() => root?.remove(), SPEED)
      }, SPEED)
    }
  }

  const inc = () => {
    if (status === null) return
    const n = status
    const amount = n < 0.2 ? 0.1 : n < 0.5 ? 0.04 : n < 0.8 ? 0.02 : n < 0.99 ? 0.005 : 0
    set(Math.min(n + amount, 0.994))
  }

  const trickle = () => {
    if (status === null) return
    inc()
    trickleTimer = setTimeout(trickle, TRICKLE_SPEED)
  }

  const done = () => {
    if (status !== null) set(1)
  }

  const start = () => {
    if (status === null) set(0)
    clearTimeout(trickleTimer)
    trickleTimer = setTimeout(trickle, TRICKLE_SPEED)
    clearTimeout(stallTimer)
    stallTimer = setTimeout(done, STALL_TIMEOUT)
  }

  const dispose = () => {
    clearTimeout(fadeTimer)
    clearTimeout(trickleTimer)
    clearTimeout(stallTimer)
    root?.remove()
    status = null
  }

  return { start, done, dispose }
}

export function RouteProgress() {
  const pathname = usePathname()
  const progress = useRef<ReturnType<typeof createProgress> | null>(null)

  useEffect(() => {
    if (!isWeb) return
    const p = createProgress()
    progress.current = p
    const dispose = router.onLoadState((state) => {
      if (state === 'loading') p.start()
      else p.done()
    })
    return () => {
      dispose()
      p.dispose()
      progress.current = null
    }
  }, [])

  // the route committed — covers navigations whose load state never settles
  useEffect(() => {
    progress.current?.done()
  }, [pathname])

  return null
}
