import { loadNotes } from './data'

import type { WikiNote } from './types'

// note links in wiki markdown point at .vitepress/notes/<id>(.md)
const NOTE_LINK_RE = /\.vitepress\/notes\/([^/#?]+?)(?:\.md)?(?:[#?].*)?$/

export function parseNoteLink(href: string): string | null {
  return href.match(NOTE_LINK_RE)?.[1] ?? null
}

// resolve a note id to its generated note, or null when unknown. the source
// popped a toast here; web has no toast primitive, so the render layer takes
// the resolved note and renders it with its own components.
export async function loadNote(noteId: string): Promise<WikiNote | null> {
  const notes = await loadNotes()
  return notes[noteId] ?? null
}
