// port of fmhy.net's startpage/Bookmarks.vue: the default bookmarks merged
// with the reader's own (add / edit / delete, persisted by customBookmarks.ts),
// two-letter chord navigation with prefix highlighting, and the reka-ui
// dialogs as ModalDialog. web-only (WikiStartpage gates on isWeb).
import { router } from 'one'
import { useEffect, useRef, useState } from 'react'

import { ModalDialog } from '~/components/ModalDialog'

import {
  DEFAULT_BOOKMARKS,
  loadCustomBookmarks,
  saveCustomBookmarks,
  type Bookmark,
} from './customBookmarks'
import { IconifyIcon } from './startpageIcons'

import type { FormEvent } from 'react'

const CHORD_TIMEOUT_MS = 2000

const EMPTY_FORM: Bookmark = {
  name: '',
  chord: '',
  url: '',
  icon: '',
  color: '',
  isCustom: true,
  customSvg: '',
}

const isInternal = (url: string) => url.startsWith('/')

function go(url: string) {
  if (isInternal(url)) router.navigate(url as Parameters<typeof router.navigate>[0])
  else window.location.href = url
}

const isTypingTarget = (el: Element | null) =>
  !!el &&
  (el.tagName === 'INPUT' ||
    el.tagName === 'TEXTAREA' ||
    (el instanceof HTMLElement && el.isContentEditable))

// upstream v-html's the pasted svg through DOMPurify; an <img> data: url gets
// the same safety from the browser instead (svg-as-image never runs scripts or
// loads anything), at the cost of currentColor not inheriting the text color
const svgDataUrl = (svg: string) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`

function BookmarkIcon({ bookmark }: { bookmark: Bookmark }) {
  if (bookmark.customSvg) {
    return (
      <img
        src={svgDataUrl(bookmark.customSvg)}
        alt=""
        aria-hidden="true"
        className="sp-bm-icon"
        draggable={false}
      />
    )
  }
  return (
    <IconifyIcon
      name={bookmark.icon || 'i-lucide:globe'}
      className="sp-bm-icon"
      color={bookmark.color || undefined}
    />
  )
}

type DialogState =
  | { kind: 'add' }
  | { kind: 'edit'; index: number }
  | { kind: 'delete'; index: number }
  | null

export function StartpageBookmarks({ searchFocused }: { searchFocused: boolean }) {
  // defaults render at build time; the reader's own join after hydration
  const [custom, setCustom] = useState<Bookmark[]>([])
  const [chordInput, setChordInput] = useState('')
  const [possible, setPossible] = useState<Bookmark[]>([])
  const [dialog, setDialog] = useState<DialogState>(null)

  const all = [...DEFAULT_BOOKMARKS, ...custom]

  // refs mirror state for the document key handler
  const allRef = useRef(all)
  allRef.current = all
  const chordRef = useRef(chordInput)
  chordRef.current = chordInput
  const possibleRef = useRef(possible)
  possibleRef.current = possible
  const searchFocusedRef = useRef(searchFocused)
  searchFocusedRef.current = searchFocused
  const dialogOpenRef = useRef(false)
  dialogOpenRef.current = dialog !== null
  const chordTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setCustom(loadCustomBookmarks())
  }, [])

  const updateCustom = (next: Bookmark[]) => {
    setCustom(next)
    saveCustomBookmarks(next)
  }

  useEffect(() => {
    const resetChord = () => {
      setChordInput('')
      setPossible([])
      if (chordTimeout.current) clearTimeout(chordTimeout.current)
      chordTimeout.current = null
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (searchFocusedRef.current || dialogOpenRef.current) return
      if (e.altKey || e.metaKey || e.ctrlKey || e.shiftKey) return
      if (isTypingTarget(document.activeElement)) return

      const key = e.key.toUpperCase()
      if (chordTimeout.current) clearTimeout(chordTimeout.current)

      const current = chordRef.current
      if (!current) {
        const matches = allRef.current.filter((b) => b.chord.startsWith(key))
        if (matches.length) {
          e.preventDefault()
          setChordInput(key)
          setPossible(matches)
          chordTimeout.current = setTimeout(resetChord, CHORD_TIMEOUT_MS)
        }
        return
      }

      const next = current + key
      const match = possibleRef.current.find((b) => b.chord === next)
      if (match) {
        resetChord()
        go(match.url)
        return
      }
      const filtered = allRef.current.filter((b) => b.chord.startsWith(next))
      if (filtered.length) {
        setChordInput(next)
        setPossible(filtered)
        chordTimeout.current = setTimeout(resetChord, CHORD_TIMEOUT_MS)
      } else {
        resetChord()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      if (chordTimeout.current) clearTimeout(chordTimeout.current)
    }
  }, [])

  const isChordTaken = (chord: string, excludeChord?: string) =>
    all.some(
      (b) => b.chord.toUpperCase() === chord.toUpperCase() && b.chord !== excludeChord
    )

  // upstream: chord upper-cased, isCustom forced, globe when no icon at all
  const normalize = (form: Bookmark): Bookmark => {
    const bookmark = { ...form, chord: form.chord.toUpperCase(), isCustom: true }
    if (!bookmark.icon && !bookmark.customSvg) bookmark.icon = 'i-lucide:globe'
    return bookmark
  }

  const closeDialog = () => setDialog(null)

  const editing = dialog?.kind === 'edit' ? custom[dialog.index] : undefined
  const deleting = dialog?.kind === 'delete' ? custom[dialog.index] : undefined

  return (
    <div className="sp-bookmarks">
      <div className="sp-bm-header">
        <div className="sp-bm-heading">
          <IconifyIcon name="lucide:bookmark" size={20} />
          <h2 className="sp-bm-title">Bookmarks</h2>
        </div>
        <div className="sp-bm-tools">
          {chordInput ? (
            <div className="sp-chord-badge">Chord: {chordInput}...</div>
          ) : null}
          <button
            type="button"
            className="sp-add"
            onClick={() => setDialog({ kind: 'add' })}
          >
            <IconifyIcon name="lucide:plus" size={16} />
            Add Bookmark
          </button>
        </div>
      </div>

      <div className="sp-bm-grid">
        {all.map((bookmark, index) => {
          const isPossible = possible.some((b) => b.chord === bookmark.chord)
          const state = isPossible
            ? bookmark.chord === chordInput
              ? ' is-exact'
              : ' is-possible'
            : chordInput
              ? ' is-dimmed'
              : ''
          const customIndex = index - DEFAULT_BOOKMARKS.length
          return (
            <div key={`${bookmark.chord}-${index}`} className="sp-bm-item">
              <a
                className={`sp-bm${state}`}
                href={bookmark.url}
                onClick={(e) => {
                  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
                    return
                  if (!isInternal(bookmark.url)) return
                  e.preventDefault()
                  go(bookmark.url)
                }}
              >
                <div className="sp-bm-inner">
                  <div className="sp-bm-label sp-truncate">
                    <BookmarkIcon bookmark={bookmark} />
                    <span className="sp-bm-name sp-truncate">{bookmark.name}</span>
                  </div>
                  <div className="sp-keys sp-hide-mobile">
                    {bookmark.chord.split('').map((char, i) => (
                      <kbd key={i} className="sp-keycap">
                        {char}
                      </kbd>
                    ))}
                  </div>
                </div>
              </a>

              {bookmark.isCustom && customIndex >= 0 ? (
                <div className="sp-bm-actions">
                  <button
                    type="button"
                    className="sp-bm-action"
                    title="Edit bookmark"
                    aria-label={`Edit ${bookmark.name}`}
                    onClick={() => setDialog({ kind: 'edit', index: customIndex })}
                  >
                    <IconifyIcon name="lucide:edit-2" size={12} />
                  </button>
                  <button
                    type="button"
                    className="sp-bm-action is-danger"
                    title="Delete bookmark"
                    aria-label={`Delete ${bookmark.name}`}
                    onClick={() => setDialog({ kind: 'delete', index: customIndex })}
                  >
                    <IconifyIcon name="lucide:trash-2" size={12} />
                  </button>
                </div>
              ) : null}
            </div>
          )
        })}
      </div>

      {dialog?.kind === 'add' ? (
        <BookmarkFormDialog
          title="Add New Bookmark"
          description="Add a new bookmark"
          submitLabel="Add Bookmark"
          initial={EMPTY_FORM}
          isChordTaken={(chord) => isChordTaken(chord)}
          onSubmit={(form) => {
            updateCustom([...custom, normalize(form)])
            closeDialog()
          }}
          onClose={closeDialog}
        />
      ) : null}

      {dialog?.kind === 'edit' && editing ? (
        <BookmarkFormDialog
          title="Edit Bookmark"
          description={`Editing "${editing.name}"`}
          submitLabel="Save Changes"
          initial={editing}
          isChordTaken={(chord) => isChordTaken(chord, editing.chord)}
          onSubmit={(form) => {
            updateCustom(custom.map((b, i) => (i === dialog.index ? normalize(form) : b)))
            closeDialog()
          }}
          onClose={closeDialog}
        />
      ) : null}

      {dialog?.kind === 'delete' && deleting ? (
        <ModalDialog
          onClose={closeDialog}
          labelledBy="sp-delete-title"
          describedBy="sp-delete-description"
        >
          <h2 id="sp-delete-title" className="md-title" style={{ marginBottom: 8 }}>
            Delete Bookmark
          </h2>
          <p id="sp-delete-description" className="md-description">
            Are you sure you want to delete "{deleting.name}"? This action cannot be
            undone.
          </p>
          <div className="md-row">
            <button
              type="button"
              className="md-action md-action-danger"
              onClick={() => {
                updateCustom(custom.filter((_, i) => i !== dialog.index))
                closeDialog()
              }}
            >
              Delete
            </button>
            <button
              type="button"
              className="md-action md-action-secondary"
              onClick={closeDialog}
            >
              Cancel
            </button>
          </div>
        </ModalDialog>
      ) : null}
    </div>
  )
}

function BookmarkFormDialog({
  title,
  description,
  submitLabel,
  initial,
  isChordTaken,
  onSubmit,
  onClose,
}: {
  title: string
  description: string
  submitLabel: string
  initial: Bookmark
  isChordTaken: (chord: string) => boolean
  onSubmit: (form: Bookmark) => void
  onClose: () => void
}) {
  const [form, setForm] = useState<Bookmark>({ ...initial })
  const set = (patch: Partial<Bookmark>) => setForm((f) => ({ ...f, ...patch }))

  const chordTaken = isChordTaken(form.chord)
  const valid = !!(
    form.name.trim() &&
    form.chord.trim() &&
    form.url.trim() &&
    !chordTaken
  )

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (valid) onSubmit(form)
  }

  return (
    <ModalDialog
      onClose={onClose}
      labelledBy="sp-form-title"
      describedBy="sp-form-description"
    >
      <h2 id="sp-form-title" className="md-title">
        {title}
      </h2>
      <p id="sp-form-description" className="md-description">
        {description}
      </p>
      <form className="md-form" onSubmit={handleSubmit}>
        <div>
          <label className="md-label" htmlFor="sp-form-name">
            Name
          </label>
          <input
            id="sp-form-name"
            className="md-input"
            type="text"
            required
            placeholder="Bookmark name"
            value={form.name}
            onChange={(e) => set({ name: e.target.value })}
          />
        </div>

        <div>
          <label className="md-label" htmlFor="sp-form-chord">
            Chord (2 letters)
          </label>
          <input
            id="sp-form-chord"
            className="md-input md-input-upper"
            type="text"
            required
            maxLength={2}
            placeholder="AB"
            value={form.chord}
            onChange={(e) => set({ chord: e.target.value.toUpperCase() })}
          />
          {chordTaken ? <p className="md-error">This chord is already taken</p> : null}
        </div>

        <div>
          <label className="md-label" htmlFor="sp-form-url">
            URL
          </label>
          <input
            id="sp-form-url"
            className="md-input"
            type="url"
            required
            placeholder="https://example.com"
            value={form.url}
            onChange={(e) => set({ url: e.target.value })}
          />
        </div>

        <div>
          <label className="md-label" htmlFor="sp-form-icon">
            Icon (UnoCSS class)
          </label>
          <input
            id="sp-form-icon"
            className="md-input"
            type="text"
            placeholder="i-lucide:globe (optional)"
            value={form.icon ?? ''}
            onChange={(e) => set({ icon: e.target.value })}
          />
        </div>

        <div>
          <label className="md-label" htmlFor="sp-form-svg">
            Custom SVG Icon
          </label>
          <textarea
            id="sp-form-svg"
            className="md-input"
            placeholder="Paste SVG code here (optional)"
            value={form.customSvg ?? ''}
            onChange={(e) => set({ customSvg: e.target.value })}
          />
          <p className="md-hint">If provided, this will override the icon class</p>
        </div>

        <div>
          <label className="md-label" htmlFor="sp-form-color">
            Color
          </label>
          <input
            id="sp-form-color"
            className="md-input"
            type="text"
            placeholder="#3B82F6 (optional)"
            value={form.color ?? ''}
            onChange={(e) => set({ color: e.target.value })}
          />
        </div>

        <div className="md-row md-row-top">
          <button type="submit" className="md-action md-action-primary" disabled={!valid}>
            {submitLabel}
          </button>
          <button
            type="button"
            className="md-action md-action-secondary"
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </form>
    </ModalDialog>
  )
}
