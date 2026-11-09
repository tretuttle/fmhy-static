// minimal modal dialog for the reka-ui DialogRoot/Overlay/Content surfaces
// fmhy.net uses (Base64Dialog, startpage bookmark dialogs): portal to body,
// blurred backdrop (click closes), Escape closes, Tab is trapped inside, page
// scroll is locked, focus lands on the first focusable and is restored on
// close. plain DOM + modalDialog.css like the search modal — it only ever
// mounts client-side, after interaction, so it costs nothing at first paint.
//
// TODO(native): DOM-only (portal, document listeners) — web callers only.
import './modalDialog.css'

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

import type { ReactNode } from 'react'

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function ModalDialog({
  onClose,
  labelledBy,
  describedBy,
  className,
  children,
}: {
  onClose: () => void
  labelledBy: string
  describedBy?: string
  // variant class on the root, so it can restyle backdrop and content
  className?: string
  children: ReactNode
}) {
  const contentRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    const content = contentRef.current
    if (!content) return

    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    content.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)?.focus()

    const html = document.documentElement
    const prevOverflow = html.style.overflow
    html.style.overflow = 'hidden'

    // capture + stopPropagation: page-level key handlers (search hotkeys,
    // startpage chords) never see keys meant for the dialog's Escape/Tab
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab') return
      const focusables = Array.from(
        content.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      )
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (!first || !last) {
        event.preventDefault()
        return
      }
      const active = document.activeElement
      const inside = active instanceof HTMLElement && content.contains(active)
      if (event.shiftKey) {
        if (!inside || active === first) {
          event.preventDefault()
          last.focus()
        }
      } else if (!inside || active === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown, true)

    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      html.style.overflow = prevOverflow
      if (previouslyFocused?.isConnected) previouslyFocused.focus({ preventScroll: true })
    }
  }, [])

  return createPortal(
    <div className={className ? `md-root ${className}` : 'md-root'}>
      <div
        className="md-backdrop"
        aria-hidden="true"
        onClick={() => onCloseRef.current()}
      />
      <div
        ref={contentRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        className="md-content"
      >
        {children}
      </div>
    </div>,
    document.body
  )
}
