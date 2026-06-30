import { useCallback, useState, type ReactNode } from 'react'
import { Paragraph, Tooltip, YStack } from 'tamagui'

import { InfoIcon } from '~/icons/phosphor/InfoIcon'

import { Link } from './Link'

type Note = { title: string; body: string }
const cache = new Map<string, Note>()

// github.com/<o>/<r>/blob/<branch>/<path>  ->  raw.githubusercontent.com/<o>/<r>/<branch>/<path>
function toRawUrl(href: string): string | null {
  const blob = href.match(/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)$/)
  if (blob) return `https://raw.githubusercontent.com/${blob[1]}/${blob[2]}/${blob[3]}/${blob[4]}`
  const note = href.match(/\.vitepress\/notes\/([^/?#]+\.md)/)
  if (note) return `https://raw.githubusercontent.com/fmhy/edit/main/docs/.vitepress/notes/${note[1]}`
  return null
}

function stripMd(s: string): string {
  return s
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[`*_>]/g, '')
}

function parseNote(md: string): Note {
  const lines = md.split('\n')
  let title = ''
  const body: string[] = []
  for (const line of lines) {
    const h = line.match(/^#{1,6}\s+(.*)$/)
    if (h && !title) {
      title = stripMd(h[1].trim())
      continue
    }
    body.push(line)
  }
  return {
    title,
    body: stripMd(body.join('\n'))
      .replace(/\n{3,}/g, '\n\n')
      .trim(),
  }
}

export function NoteLink({ href, children: _children }: { href: string; children?: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [note, setNote] = useState<Note | null>(null)

  const load = useCallback(async () => {
    const raw = toRawUrl(href)
    if (!raw) return setStatus('error')
    const hit = cache.get(raw)
    if (hit) {
      setNote(hit)
      return setStatus('done')
    }
    setStatus('loading')
    try {
      const text = await (await fetch(raw)).text()
      const parsed = parseNote(text)
      cache.set(raw, parsed)
      setNote(parsed)
      setStatus('done')
    } catch {
      setStatus('error')
    }
  }, [href])

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
              <Link href={href} target="_blank" color="$accent11">
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
                {note.body}
              </Paragraph>
            </>
          )}
        </YStack>
      </Tooltip.Content>
    </Tooltip>
  )
}
