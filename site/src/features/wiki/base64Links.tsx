// fmhy.net's base64-link interception (theme/Layout.vue handleClick): a click
// on any rentry.co/FMHYB64 link — entry rows, prose, search excerpts — opens
// a dialog explaining the link must be decoded, unless the reader ticked
// "Don't show again". one window capture listener covers every surface (the
// rows are plain anchors, so there is no per-link handler to hook), and the
// dialog module + css load on the first such click, never at first paint.
//
// TODO(native): DOM-only (window listener, localStorage) — web only.
import { Suspense, lazy, useEffect, useState } from 'react'

const Base64Dialog = lazy(() => import('./Base64Dialog'))

const BASE64_LINK_PREFIX = 'https://rentry.co/FMHYB64'

// upstream's key and value ('true'), unprefixed so it matches fmhy.net
export const BASE64_DIALOG_PREFERENCE_KEY = 'fmhy-base64-dialog-preference'

function dialogDismissed(): boolean {
  try {
    return localStorage.getItem(BASE64_DIALOG_PREFERENCE_KEY) === 'true'
  } catch {
    return false
  }
}

export function Base64LinkGuard() {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest?.('a')
      if (!link || !link.href.includes(BASE64_LINK_PREFIX)) return
      if (dialogDismissed()) return
      event.preventDefault()
      event.stopPropagation()
      setUrl(link.href)
    }
    window.addEventListener('click', onClick, { capture: true })
    return () => window.removeEventListener('click', onClick, { capture: true })
  }, [])

  if (!url) return null
  return (
    <Suspense fallback={null}>
      <Base64Dialog url={url} onClose={() => setUrl(null)} />
    </Suspense>
  )
}
