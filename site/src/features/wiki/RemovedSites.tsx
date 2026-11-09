import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import type { WikiRemovedSite } from './types'

// /recently-removed rows — fmhy.net's generate-removed.js emits
//   <button class="removed-site-name" v-tooltip=…>Name</button>
//   <span class="removed-site-description">- desc</span>
//   <span class="removed-site-meta">· PR #n · hash</span>
// per entry (styles: their style.scss .removed-site-*). Plain markup with
// wk-removed-* classes (app/root.css) like the other flattened wiki rows; the
// li keeps .wk-entry, so the starred/indexes filters hide these rows exactly as
// upstream's `.vp-doc li:not(.starred)` rules do.
//
// TODO(native): plain DOM is web-only, same as LinkEntryRow.

const GITHUB_PULL = 'https://github.com/fmhy/edit/pull/'

export function RemovedSites({ sites }: { sites: WikiRemovedSite[] }) {
  return (
    <ul className="wk-removed">
      {sites.map((site) => (
        <li key={site.commitUrl + site.name} className="wk-entry">
          <button type="button" className="wk-removed-name" data-removed-date={site.date}>
            {site.name}
          </button>
          {/* template strings keep react's <!-- --> text separators out of
              306 rows of static html */}
          {!!site.description && (
            <span className="wk-removed-description">{`- ${site.description}`}</span>
          )}
          <span className="wk-removed-meta">
            {'· '}
            {!!site.pr && (
              <>
                <a href={`${GITHUB_PULL}${site.pr}`} target="_blank" rel="noreferrer">
                  {`PR #${site.pr}`}
                </a>
                {' · '}
              </>
            )}
            <a href={site.commitUrl} target="_blank" rel="noreferrer">
              {site.hash}
            </a>
          </span>
        </li>
      ))}
    </ul>
  )
}

// upstream theme/index.ts removedDateTooltip: relative day count against the
// viewer's UTC today, then the long-form date
const removalDateFormat = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'long',
  timeZone: 'UTC',
})

function removedDateLabel(date: string): { relative: string; full: string } {
  const removedAt = new Date(`${date}T00:00:00Z`)
  const now = new Date()
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const days = Math.round((today - removedAt.getTime()) / 86_400_000)
  const relative =
    days === 0
      ? 'Today'
      : days > 0
        ? `${days} day${days === 1 ? '' : 's'} ago`
        : `In ${-days} day${days === -1 ? '' : 's'}`
  return { relative, full: removalDateFormat.format(removedAt) }
}

const TIP_ID = 'wk-removed-tip'
// floating-vue tooltip theme: placement top, 5px distance, flips below when
// there's no room above (here: under the fixed 64px header)
const TIP_DISTANCE = 5
const HEADER_CLEARANCE = 64 + 64
const VIEWPORT_PADDING = 8

type TipState = { date: string; x: number; y: number; below: boolean }

// one delegated tooltip for every .wk-removed-name on the page — the date is
// relative to "now", so it's computed on open rather than baked into the SSG
// html. Triggers match upstream's $removedDateTriggers: hover + focus where
// the primary pointer can hover, tap (click, autoHide on outside tap) on touch.
export function RemovedDateTooltip() {
  const [tip, setTip] = useState<TipState | null>(null)
  const tipRef = useRef<HTMLDivElement>(null)

  // keep the bubble inside the viewport (floating-vue's preventOverflow
  // shift) — matters for names near the edge on phones
  useLayoutEffect(() => {
    const el = tipRef.current
    if (!tip || !el) return
    const half = el.offsetWidth / 2
    const min = window.scrollX + half + VIEWPORT_PADDING
    const max =
      window.scrollX + document.documentElement.clientWidth - half - VIEWPORT_PADDING
    el.style.left = `${Math.max(min, Math.min(tip.x, max))}px`
  }, [tip])

  useEffect(() => {
    let current: HTMLElement | null = null

    const show = (el: HTMLElement) => {
      const date = el.dataset.removedDate
      if (!date) return
      current?.removeAttribute('aria-describedby')
      current = el
      el.setAttribute('aria-describedby', TIP_ID)
      const rect = el.getBoundingClientRect()
      const below = rect.top < HEADER_CLEARANCE
      setTip({
        date,
        x: rect.left + rect.width / 2 + window.scrollX,
        y:
          (below ? rect.bottom + TIP_DISTANCE : rect.top - TIP_DISTANCE) + window.scrollY,
        below,
      })
    }
    const hide = () => {
      current?.removeAttribute('aria-describedby')
      current = null
      setTip(null)
    }
    const trigger = (target: EventTarget | null) =>
      target instanceof Element
        ? target.closest<HTMLElement>('.wk-removed-name[data-removed-date]')
        : null

    const canHover = window.matchMedia('(hover: hover)').matches
    const onOver = (event: MouseEvent) => {
      const el = trigger(event.target)
      if (el && el !== current) show(el)
    }
    const onOut = (event: MouseEvent) => {
      if (
        current &&
        trigger(event.target) === current &&
        !current.contains(event.relatedTarget as Node)
      ) {
        hide()
      }
    }
    const onFocusIn = (event: FocusEvent) => {
      const el = trigger(event.target)
      if (el) show(el)
    }
    const onFocusOut = (event: FocusEvent) => {
      if (current && trigger(event.target) === current) hide()
    }
    const onClick = (event: MouseEvent) => {
      const el = trigger(event.target)
      if (el && el !== current) show(el)
      else hide()
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') hide()
    }

    if (canHover) {
      document.addEventListener('mouseover', onOver)
      document.addEventListener('mouseout', onOut)
      document.addEventListener('focusin', onFocusIn)
      document.addEventListener('focusout', onFocusOut)
    } else {
      document.addEventListener('click', onClick)
    }
    document.addEventListener('keydown', onKey)
    window.addEventListener('resize', hide)
    return () => {
      document.removeEventListener('mouseover', onOver)
      document.removeEventListener('mouseout', onOut)
      document.removeEventListener('focusin', onFocusIn)
      document.removeEventListener('focusout', onFocusOut)
      document.removeEventListener('click', onClick)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', hide)
      hide()
    }
  }, [])

  if (!tip) return null
  const { relative, full } = removedDateLabel(tip.date)
  return createPortal(
    <div
      ref={tipRef}
      id={TIP_ID}
      role="tooltip"
      className="font_body wk-removed-tip"
      data-placement={tip.below ? 'bottom' : 'top'}
      style={{ left: tip.x, top: tip.y }}
    >
      <strong>{relative}</strong>
      <br />
      <time dateTime={tip.date}>{full}</time>
    </div>,
    document.body
  )
}
