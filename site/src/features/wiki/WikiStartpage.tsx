// port of fmhy.net's /startpage (docs/.vitepress/theme/components/startpage/
// *.vue): live clock, search box with platform targets (Alt+A/S/D/F), '/' to
// focus, and chord-navigable bookmarks with the reader's own additions
// (StartpageBookmarks). upstream renders it with `layout: false`, so _layout
// mounts this route bare — no header, sidebar, toc, footer or site search.
// plain DOM + startpage.css (uno class port), like the search modal.
import './startpage.css'

import { useEffect, useRef, useState } from 'react'
import { isWeb } from 'tamagui'

import { StartpageBookmarks } from './StartpageBookmarks'
import { IconifyIcon } from './startpageIcons'

type Platform = {
  name: string
  key: string
  url: string
  icon: string
}

const PLATFORMS: Platform[] = [
  {
    name: 'SearXNG',
    key: 'a',
    url: 'https://searx.fmhy.net/search?q=',
    icon: 'simple-icons:searxng',
  },
  {
    name: 'ChatGPT',
    key: 's',
    url: 'https://chat.openai.com/?q=',
    icon: 'simple-icons:openai',
  },
  { name: 'Claude', key: 'd', url: 'https://claude.ai/chat/', icon: 'logos:claude-icon' },
  {
    name: 'Perplexity',
    key: 'f',
    url: 'https://www.perplexity.ai/search?q=',
    icon: 'logos:perplexity-icon',
  },
]

function Clock() {
  const [time, setTime] = useState<string>('--:--:--')
  useEffect(() => {
    const update = () => {
      const now = new Date()
      const h = String(now.getHours()).padStart(2, '0')
      const m = String(now.getMinutes()).padStart(2, '0')
      const s = String(now.getSeconds()).padStart(2, '0')
      setTime(`${h}:${m}:${s}`)
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [])
  return <div className="sp-clock">{time}</div>
}

// lucide:search, frozen
const SearchIcon = () => (
  <svg
    className="sp-search-icon"
    width={20}
    height={20}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="m21 21l-4.34-4.34" />
    <circle cx="11" cy="11" r="8" />
  </svg>
)

const Kbd = ({ children }: { children: string }) => (
  <kbd className="sp-kbd">{children}</kbd>
)

export function WikiStartpage() {
  // the startpage is keyboard-driven (chords, '/' focus, raw form/input) — a
  // native version needs its own design, not a port. web-gate the whole thing.
  if (!isWeb) return null
  return <WikiStartpageWeb />
}

function WikiStartpageWeb() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)

  // refs mirror state for the global key handlers
  const queryRef = useRef(query)
  queryRef.current = query
  const focusedRef = useRef(focused)
  focusedRef.current = focused

  const searchWith = (platform: Platform) => {
    const value = queryRef.current.trim()
    if (!value) return
    window.location.href = platform.url + encodeURIComponent(value)
  }

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement
      const isSearchFocused = inputRef.current === active

      // '/' focuses the search box from anywhere
      if (e.key === '/' && !isSearchFocused) {
        const typingInInput =
          !!active &&
          (active.tagName === 'INPUT' ||
            active.tagName === 'TEXTAREA' ||
            (active instanceof HTMLElement && active.isContentEditable))
        if (!typingInInput) {
          e.preventDefault()
          inputRef.current?.focus()
        }
        return
      }

      // Alt + platform key searches that platform
      if (focusedRef.current && e.altKey) {
        let platform = PLATFORMS.find((p) => p.key === e.key.toLowerCase())
        if (!platform && e.code.startsWith('Key') && e.code.length === 4) {
          const codeKey = e.code.slice(3).toLowerCase()
          platform = PLATFORMS.find((p) => p.key === codeKey)
        }
        if (platform && queryRef.current.trim()) {
          e.preventDefault()
          searchWith(platform)
        }
      }

      if (e.altKey) setShowShortcuts(true)
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (!e.altKey) setShowShortcuts(false)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  const disabled = !query.trim()
  const highlight = showShortcuts && focused

  return (
    <div className="sp-root">
      <div className="sp-container">
        <div className="sp-search">
          <Clock />

          <form
            className="sp-search-form"
            onSubmit={(e) => {
              e.preventDefault()
              searchWith(PLATFORMS[0]!)
            }}
          >
            <SearchIcon />
            <input
              ref={inputRef}
              className="sp-search-input"
              value={query}
              placeholder="What would you like to search for?"
              aria-label="Search"
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
            />
          </form>

          <div className="sp-platforms">
            {PLATFORMS.map((platform) => (
              <button
                key={platform.name}
                type="button"
                className={highlight ? 'sp-platform is-highlight' : 'sp-platform'}
                disabled={disabled}
                onClick={() => searchWith(platform)}
              >
                <IconifyIcon name={platform.icon} size={20} />
                <span className="sp-platform-name sp-truncate">{platform.name}</span>
                <div className="sp-keys sp-hide-mobile">
                  <kbd className="sp-keycap">Alt</kbd>
                  <span className="sp-plus">+</span>
                  <kbd className="sp-keycap">{platform.key.toUpperCase()}</kbd>
                </div>
              </button>
            ))}
          </div>
        </div>

        <StartpageBookmarks searchFocused={focused} />

        <div className="sp-hints sp-hide-mobile">
          <p>
            Press <Kbd>/</Kbd> anywhere to focus the search box
          </p>
          <p>
            Use <Kbd>Alt + a/s/d/f</Kbd> to search different platforms
          </p>
          <p>
            Type bookmark chords (like <Kbd>H</Kbd> <Kbd>N</Kbd> for Hacker News) when
            search is not focused
          </p>
          <p>
            Press <Kbd>Enter</Kbd> to search SearXNG (hosted by us) by default
          </p>
        </div>
      </div>
    </div>
  )
}
