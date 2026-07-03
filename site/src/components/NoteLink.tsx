import { useCallback, useState, type ReactNode } from 'react'
import { Paragraph, Tooltip, YStack } from 'tamagui'

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

export function NoteLink({ href, children: _children }: { href: string; children?: ReactNode }) {
  const [open, setOpen] = useState(false)
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
    <Tooltip
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (o && status === 'idle') void load()
      }}
      placement="top"
      delay={{ open: 120, close: 120 }}
      restMs={120}
      allowFlip
    >
      <Tooltip.Trigger asChild="except-style">
        <Paragraph
          render="span"
          tag="span"
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
      </Tooltip.Trigger>

      <Tooltip.Content
        maxW={360}
        p="$3"
        bg="$color2"
        borderWidth={2}
        borderColor="$color4"
        rounded="$4"
        z={100000}
        enterStyle={{ y: -4, opacity: 0 }}
        exitStyle={{ y: -4, opacity: 0 }}
        // @ts-ignore css-only config lacks animation types (same pattern as TooltipSimple.tsx)
        animation="quick"
      >
        <Tooltip.Arrow size="$3" borderWidth={1} borderColor="$color4" />
        <YStack gap="$2" maxH={320} overflow="hidden">
          {status === 'loading' && (
            <Paragraph size="$2" fontFamily="$mono" color="$color10">
              Loading note…
            </Paragraph>
          )}
          {status === 'error' && (
            <Paragraph size="$2" color="$color10">
              Couldn’t load note.{' '}
              <Link href={noteId ? toGithubUrl(noteId) : href} target="_blank" color="$accent11">
                Open on GitHub
              </Link>
            </Paragraph>
          )}
          {status === 'done' && note && (
            <>
              {!!note.title && (
                <Paragraph size="$4" fontWeight="700" color="$color12">
                  {note.title}
                </Paragraph>
              )}
              <Paragraph size="$3" lineHeight={20} color="$color11" whiteSpace="pre-wrap">
                <InlineMarkdown markdown={note.markdown} />
              </Paragraph>
            </>
          )}
        </YStack>
      </Tooltip.Content>
    </Tooltip>
  )
}
