import { useCallback, useEffect, useState, type ReactElement, type ReactNode } from 'react'
import { Paragraph, Tooltip, isWeb } from 'tamagui'

import { InfoIcon } from '~/icons/phosphor/InfoIcon'
import { InlineMarkdown } from '~/features/wiki/InlineMarkdown'
import { loadNote, parseNoteLink } from '~/features/wiki/notes'

import { Link } from './Link'

import type { WikiNote } from '~/features/wiki/types'

const cache = new Map<string, WikiNote | null>()

// github.com/<o>/<r>/blob/<branch>/<path>  ->  raw.githubusercontent.com/<o>/<r>/<branch>/<path>
// used only as a fallback link when a note id isn't in our generated corpus yet
// (e.g. content sync lagging behind upstream)
function toGithubUrl(noteId: string): string {
  return `https://github.com/fmhy/edit/blob/main/docs/.vitepress/notes/${noteId}.md`
}

// upstream Tooltip.vue opens on hover where the device can hover and on click
// where it can't; resolved after mount (ssr renders the hover variant)
function useCanHover() {
  const [canHover, setCanHover] = useState(true)
  useEffect(() => {
    if (!isWeb) return
    setCanHover(window.matchMedia('(hover: hover)').matches)
  }, [])
  return canHover
}

// the note popup shared by inline note links and entry-row note sub-links:
// upstream's .tooltip-card on the shared popup surface (.fmhy-popup), no
// arrow, 16px padding, title 16/600, body 14/1.6, capped at 28rem both ways
// and scrolling past that. on touch the trigger toggles it (with a 36px tap
// target, .fmhy-note-trigger) and a tap outside closes it.
export function NoteTooltip({
  trigger,
  title,
  onOpen,
  children,
}: {
  trigger: ReactElement
  title?: string | null
  onOpen?: () => void
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const canHover = useCanHover()

  const onOpenChange = (next: boolean) => {
    setOpen(next)
    if (next) onOpen?.()
  }

  useEffect(() => {
    if (canHover || !open) return
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null
      if (target?.closest('.fmhy-note-card, .fmhy-note-trigger')) return
      setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [canHover, open])

  return (
    <Tooltip
      open={open}
      // touch: ignore the hover/focus machinery entirely — a tap's synthetic
      // pointerleave would close the card the moment it opened
      onOpenChange={canHover ? onOpenChange : undefined}
      placement="top"
      delay={{ open: 120, close: 120 }}
      restMs={120}
      allowFlip
    >
      <Tooltip.Trigger
        asChild="except-style"
        onPress={canHover ? undefined : () => onOpenChange(!open)}
      >
        {trigger}
      </Tooltip.Trigger>

      <Tooltip.Content
        bg="transparent"
        p={0}
        borderWidth={0}
        z={100000}
        enterStyle={{ y: -4, opacity: 0 }}
        exitStyle={{ y: -4, opacity: 0 }}
        // @ts-ignore css-only config lacks animation types (same pattern as TooltipSimple.tsx)
        animation="quick"
      >
        <div className="fmhy-popup fmhy-note-card">
          <div className="fmhy-note-content">
            {!!title && (
              <Paragraph
                className="fmhy-note-title"
                fontSize={16}
                lineHeight={22}
                fontWeight="600"
                color="$color12"
              >
                {title}
              </Paragraph>
            )}
            {children}
          </div>
        </div>
      </Tooltip.Content>
    </Tooltip>
  )
}

// note body text: 14px / 1.6 in the primary text color
export function NoteBody({ children }: { children: ReactNode }) {
  return (
    <Paragraph
      className="fmhy-note-body"
      fontSize={14}
      lineHeight={22.4}
      color="$color12"
      whiteSpace="pre-wrap"
    >
      {children}
    </Paragraph>
  )
}

// muted status line (loading / unavailable)
export function NoteStatus({ children }: { children: ReactNode }) {
  return (
    <Paragraph className="fmhy-note-body" fontSize={14} lineHeight={22.4} color="$color10">
      {children}
    </Paragraph>
  )
}

export function NoteLink({ href, children: _children }: { href: string; children?: ReactNode }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [note, setNote] = useState<WikiNote | null>(null)

  const noteId = parseNoteLink(href)

  const load = useCallback(async () => {
    if (!noteId) return setStatus('error')
    const hit = cache.get(noteId)
    if (hit !== undefined) {
      setNote(hit)
      return setStatus(hit ? 'done' : 'error')
    }
    setStatus('loading')
    const resolved = await loadNote(noteId)
    cache.set(noteId, resolved)
    setNote(resolved)
    setStatus(resolved ? 'done' : 'error')
  }, [noteId])

  return (
    <NoteTooltip
      title={status === 'done' ? note?.title : null}
      onOpen={() => {
        if (status === 'idle') void load()
      }}
      trigger={
        <Paragraph
          render="span"
          tag="span"
          className="fmhy-note-trigger"
          display="inline-flex"
          cursor="pointer"
          mx={2}
          color="$accent11"
          hoverStyle={{ color: '$accent12' }}
          style={{ verticalAlign: '-0.2em' }}
          aria-label="Note"
        >
          <InfoIcon size={15} color="$accent11" />
        </Paragraph>
      }
    >
      {status === 'loading' && <NoteStatus>Loading note…</NoteStatus>}
      {status === 'error' && (
        <NoteStatus>
          Couldn’t load note.{' '}
          <Link href={noteId ? toGithubUrl(noteId) : href} target="_blank" color="$accent11">
            Open on GitHub
          </Link>
        </NoteStatus>
      )}
      {status === 'done' && note && (
        <NoteBody>
          <InlineMarkdown markdown={note.markdown} />
        </NoteBody>
      )}
    </NoteTooltip>
  )
}
