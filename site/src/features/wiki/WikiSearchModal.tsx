// wiki search modal — a faithful React port of fmhy.net's customized
// VPLocalSearchBox.vue (template + behavior). markup keeps the upstream class
// names and is styled by ./search.css (imported from app/_layout.tsx); the
// engine lives in useWikiSearch.ts, DOM marking + scroll-to-match in
// searchHighlight.ts.
//
// TODO(native): [P2, task #8] deliberately web-locked (raw DOM markup + search.css +
// searchHighlight's DOM marking, ~2,550 lines total). the engine in useWikiSearch.ts
// is fully portable; native needs its own presentation layer built on top of it.

import { router, type Href } from 'one'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

import { closeSearch, useSearchOpen } from './searchModal'
import {
  centerMarkInExcerpt,
  cancelPendingScroll,
  formMarkRegex,
  groupMarks,
  isSamePath,
  markRegExpIn,
  mergeNearbyMarks,
  scheduleScrollToMatch,
  unmarkAll,
} from './searchHighlight'
import { useWikiSearch, type WikiDisplayResult } from './useWikiSearch'

// tabbable-element query for the native focus trap — mirrors what
// focus-trap/tabbable considers focusable within the modal shell
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

const LEAVE_DURATION_MS = 100

const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

// upstream customTitles
const TITLES = {
  prevMatch: 'Previous match',
  nextMatch: 'Next match',
  fuzzyOn: 'Switch to Exact Search',
  fuzzyOff: 'Switch to Fuzzy Search',
  searching: 'Searching...',
  cycleMatches: 'to cycle matches',
  displayDetails: 'Display detailed list',
  resetButtonTitle: 'Reset search',
  backButtonTitle: 'Close search',
  noResultsText: 'No results for',
  buttonText: 'Search',
}

export function WikiSearchModal() {
  const open = useSearchOpen()
  const [hasOpenedOnce, setHasOpenedOnce] = useState(false)
  // exit animation state: keep rendering with .vpl-leaving for a beat
  const [visible, setVisible] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const visibleRef = useRef(false)

  useEffect(() => {
    if (open) {
      setHasOpenedOnce(true)
      setVisible(true)
      visibleRef.current = true
      setLeaving(false)
      return
    }
    if (!visibleRef.current) return
    setLeaving(true)
    const timeout = setTimeout(() => {
      setVisible(false)
      visibleRef.current = false
      setLeaving(false)
    }, LEAVE_DURATION_MS)
    return () => clearTimeout(timeout)
  }, [open])

  if (!hasOpenedOnce) return null
  return <SearchBox open={open} visible={visible} leaving={leaving} />
}

function SearchBox({
  open,
  visible,
  leaving,
}: {
  open: boolean
  visible: boolean
  leaving: boolean
}) {
  const {
    query,
    setQuery,
    results,
    totalResultsCount,
    mayHaveMore,
    isSearching,
    enableNoResults,
    fuzzy,
    setFuzzy,
    detailedView,
    setDetailedView,
    showMore,
    recent,
    commitRecent,
    removeRecent,
    clearRecent,
    suggestions,
    shouldResetScrollRef,
  } = useWikiSearch()

  const [selectedIndex, setSelectedIndex] = useState(-1)
  // match-navigation state per visible result index
  const [resultMarks, setResultMarks] = useState<Map<number, HTMLElement[][]>>(new Map())
  const [currentMarkIndex, setCurrentMarkIndex] = useState<Map<number, number>>(new Map())

  const shellRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsElRef = useRef<HTMLUListElement>(null)

  const disableMouseOver = useRef(true)
  const isKeyboardAction = useRef(false)

  // latest-value refs for the document-level keyboard handlers
  const stateRef = useRef({
    query,
    results,
    selectedIndex,
    detailedView,
    resultMarks,
    currentMarkIndex,
  })
  stateRef.current = { query, results, selectedIndex, detailedView, resultMarks, currentMarkIndex }

  const focusSearchInput = useCallback((select = true) => {
    inputRef.current?.focus()
    if (select) inputRef.current?.select()
  }, [])

  // -------------------------------------------------------------------------
  // open side-effects: focus + select, scroll lock, pushState/popstate close,
  // focus trap, focus restore (all verified against the production bundle)
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!open || typeof document === 'undefined') return

    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null

    focusSearchInput()

    const html = document.documentElement
    const body = document.body
    const prevHtmlOverflow = html.style.overflow
    const prevBodyOverflow = body.style.overflow
    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'

    if (window.history.pushState) window.history.pushState(null, '', null)
    const onPopState = () => closeSearch()
    window.addEventListener('popstate', onPopState)

    const onTrapKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
      const shell = shellRef.current
      if (!shell) return
      const focusables = Array.from(shell.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (!first || !last) {
        event.preventDefault()
        return
      }
      const active = document.activeElement
      const activeInShell = active instanceof HTMLElement && shell.contains(active)
      if (event.shiftKey) {
        if (!activeInShell || active === first) {
          event.preventDefault()
          last.focus()
        }
      } else if (!activeInShell || active === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onTrapKeyDown, true)

    return () => {
      document.removeEventListener('keydown', onTrapKeyDown, true)
      window.removeEventListener('popstate', onPopState)
      html.style.overflow = prevHtmlOverflow
      body.style.overflow = prevBodyOverflow
      if (previouslyFocused?.isConnected) previouslyFocused.focus()
    }
  }, [open, focusSearchInput])

  // -------------------------------------------------------------------------
  // highlight marking — runs only when the rendered result set changes
  // (upstream watcher 2's DOM half: mark → merge → center → group)
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!open) return
    const resultsEl = resultsElRef.current
    if (!resultsEl) return

    unmarkAll(resultsEl)

    const newResultMarks = new Map<number, HTMLElement[][]>()
    const newCurrentMarkIndex = new Map<number, number>()

    if (query.trim() && results.length > 0) {
      const terms = new Set<string>()
      if (fuzzy) {
        for (const r of results) for (const t of r.matchedTerms) terms.add(t)
      } else {
        terms.add(query)
      }
      const regex = formMarkRegex(terms, query, fuzzy)
      const items = Array.from(resultsEl.querySelectorAll('.result-item'))
      if (regex) {
        for (const item of items) {
          for (const target of Array.from(item.querySelectorAll('.titles, .excerpt'))) {
            markRegExpIn(target, regex, ['.title-icon'])
          }
        }
      }

      const excerpts = Array.from(
        resultsEl.querySelectorAll('.result .excerpt'),
      ) as HTMLElement[]

      if (fuzzy) mergeNearbyMarks(excerpts)

      // batch-read then batch-write: center each excerpt on its first mark
      const scrollTargets: { excerpt: HTMLElement; scrollTop: number }[] = []
      for (const excerpt of excerpts) {
        const markElement = excerpt.querySelector(
          'mark[data-markjs="true"]',
        ) as HTMLElement | null
        if (markElement) {
          let offsetTop = 0
          let curr: HTMLElement | null = markElement
          while (curr && curr !== excerpt) {
            offsetTop += curr.offsetTop
            curr = curr.offsetParent as HTMLElement | null
          }
          const scrollTop =
            offsetTop - (excerpt.clientHeight || 80) / 2 + markElement.offsetHeight / 2
          scrollTargets.push({ excerpt, scrollTop })
        }
      }
      for (const { excerpt, scrollTop } of scrollTargets) {
        excerpt.scrollTop = scrollTop
      }

      items.forEach((item, index) => {
        const marks = Array.from(
          item.querySelectorAll('.excerpt mark[data-markjs="true"]'),
        ) as HTMLElement[]
        if (marks.length > 0) {
          newResultMarks.set(index, groupMarks(marks))
          newCurrentMarkIndex.set(index, 0)
        }
      })
    }

    setResultMarks(newResultMarks)
    setCurrentMarkIndex(newCurrentMarkIndex)

    if (shouldResetScrollRef.current) {
      resultsEl.scrollTop = 0
      shouldResetScrollRef.current = false
    }
  }, [open, results, query, fuzzy, detailedView, shouldResetScrollRef])

  // -------------------------------------------------------------------------
  // selection bookkeeping
  // -------------------------------------------------------------------------

  const scrollToSelectedResult = useCallback(() => {
    requestAnimationFrame(() => {
      const selectedEl = resultsElRef.current?.querySelector('.result-item .result.selected')
      selectedEl?.scrollIntoView({ block: 'nearest' })
    })
  }, [])

  // results changed: keep selection on the same id when possible, else -1
  const prevResultsRef = useRef<WikiDisplayResult[]>([])
  useEffect(() => {
    const oldR = prevResultsRef.current
    prevResultsRef.current = results
    // show-more expansion: first result unchanged and list grew — keep position
    if (oldR.length > 0 && results.length > oldR.length && results[0]?.id === oldR[0]?.id) {
      return
    }
    let newIdx = -1
    const prevSelected = stateRef.current.selectedIndex
    if (oldR.length > 0 && prevSelected >= 0 && prevSelected < oldR.length) {
      const prevId = oldR[prevSelected]?.id
      const foundIdx = results.findIndex((r) => r.id === prevId)
      if (foundIdx !== -1) newIdx = foundIdx
    }
    setSelectedIndex(newIdx)
    scrollToSelectedResult()
  }, [results, scrollToSelectedResult])

  // selection changed: move the yellow 'current' mark, keyboard-scroll excerpt
  const prevSelectedIndexRef = useRef(-1)
  useEffect(() => {
    const oldIdx = prevSelectedIndexRef.current
    prevSelectedIndexRef.current = selectedIndex

    if (oldIdx >= 0 && oldIdx !== selectedIndex) {
      const marks = resultMarks.get(oldIdx)
      const curr = currentMarkIndex.get(oldIdx) ?? 0
      marks?.[curr]?.forEach((m) => m.classList.remove('current'))
    }

    if (selectedIndex >= 0) {
      const isKb = isKeyboardAction.current
      isKeyboardAction.current = false
      const marks = resultMarks.get(selectedIndex)
      const curr = currentMarkIndex.get(selectedIndex) ?? 0
      marks?.[curr]?.forEach((m) => m.classList.add('current'))
      const activeMark = marks?.[curr]?.[0]
      const excerpt = activeMark?.closest('.excerpt') as HTMLElement | null
      // only smooth-scroll on keyboard-driven selection (upstream isKeyboardAction)
      if (isKb && excerpt && activeMark) {
        centerMarkInExcerpt(activeMark, excerpt, true)
      }
    }
  }, [selectedIndex, resultMarks, currentMarkIndex])

  // -------------------------------------------------------------------------
  // match cycling (‹ N/M › + ArrowLeft/Right)
  // -------------------------------------------------------------------------

  const cycleMatch = useCallback(
    (index: number, direction: 1 | -1) => {
      const { resultMarks: marksMap, currentMarkIndex: currentMap } = stateRef.current
      if (stateRef.current.selectedIndex !== index) setSelectedIndex(index)
      const marks = marksMap.get(index)
      if (!marks) return
      let curr = currentMap.get(index) ?? 0

      marks[curr]?.forEach((m) => m.classList.remove('current'))
      curr = (curr + direction + marks.length) % marks.length

      const nextMap = new Map(currentMap)
      nextMap.set(index, curr)
      setCurrentMarkIndex(nextMap)

      const newGroup = marks[curr]
      if (newGroup && newGroup.length > 0) {
        newGroup.forEach((m) => m.classList.add('current'))
        const newMark = newGroup[0]!
        const excerpt = newMark.closest('.excerpt') as HTMLElement | null
        if (excerpt) centerMarkInExcerpt(newMark, excerpt, true)
      }
    },
    [],
  )

  // -------------------------------------------------------------------------
  // navigation
  // -------------------------------------------------------------------------

  // text content of the container holding the active mark group — identifies
  // the SPECIFIC item the user was looking at so we scroll to the right one
  const getMatchContext = useCallback((resultIndex: number): string | null => {
    const { resultMarks: marksMap, currentMarkIndex: currentMap } = stateRef.current
    const marks = marksMap.get(resultIndex)
    const curr = currentMap.get(resultIndex) ?? 0
    if (!marks || !marks[curr] || marks[curr].length === 0) return null
    const mark = marks[curr][0]!
    const container = mark.closest('li, p, td, dd, blockquote')
    if (!container) return null
    return container.textContent?.trim() || null
  }, [])

  const navigateToResult = useCallback((id: string, matchContext: string | null) => {
    // dismiss the mobile keyboard so the viewport settles before scrolling
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }

    const [path = '', hash] = id.split('#')
    const searchQuery = stateRef.current.query
    let decodedHash: string | null = null
    try {
      decodedHash = hash ? decodeURIComponent(hash) : null
    } catch {
      /* malformed URI */
    }

    cancelPendingScroll()

    if (decodedHash && isSamePath(path)) {
      const targetEl = document.getElementById(decodedHash)
      if (targetEl) {
        closeSearch()
        window.history.pushState(null, '', `#${hash}`)
        const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
        scheduleScrollToMatch(hash!, searchQuery, isMobile ? 300 : 80, matchContext)
        return
      }
    }

    closeSearch()
    router.navigate(id as Href)
    if (hash) {
      scheduleScrollToMatch(hash, searchQuery, 150, matchContext, path)
    }
  }, [])

  const activateResult = useCallback(
    (index: number) => {
      const result = stateRef.current.results[index]
      if (!result) return
      commitRecent(stateRef.current.query)
      navigateToResult(result.id, getMatchContext(index))
    },
    [commitRecent, navigateToResult, getMatchContext],
  )

  const handleResultClick = useCallback(
    (e: React.MouseEvent, index: number) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return
      e.preventDefault()
      activateResult(index)
    },
    [activateResult],
  )

  // -------------------------------------------------------------------------
  // keyboard — exact onKeyStroke ports
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      const { results: res, selectedIndex: selected, detailedView: detailed } = stateRef.current
      const resultsEl = resultsElRef.current
      const input = inputRef.current

      if (event.key === 'ArrowUp') {
        event.preventDefault()
        isKeyboardAction.current = true
        if (resultsEl && document.activeElement === resultsEl && selected === 0) {
          setSelectedIndex(-1)
          input?.focus()
          return
        }
        if (resultsEl && document.activeElement === input) {
          resultsEl.focus()
          // fall through to wrap to bottom
        }
        let next = selected - 1
        if (next < 0) next = res.length - 1
        setSelectedIndex(next)
        disableMouseOver.current = true
        scrollToSelectedResult()
        return
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault()
        isKeyboardAction.current = true
        if (resultsEl && document.activeElement === input) {
          resultsEl.focus()
          // fall through to select first item (from -1 to 0)
        }
        let next = selected + 1
        if (next >= res.length) next = 0
        setSelectedIndex(next)
        disableMouseOver.current = true
        scrollToSelectedResult()
        return
      }

      if (event.key === 'Enter') {
        if (event.isComposing) return
        if (event.target instanceof HTMLButtonElement && event.target.type !== 'submit') {
          return
        }
        let index = selected
        // fall back to first result when Enter is pressed with no selection
        if (index < 0 || index >= res.length) {
          index = selected === -1 && res.length > 0 ? 0 : -1
        }
        if (event.target instanceof HTMLInputElement && index === -1) {
          event.preventDefault()
          return
        }
        if (index >= 0) activateResult(index)
        return
      }

      if (event.key === 'Escape') {
        closeSearch()
        return
      }

      if (event.key === 'ArrowLeft') {
        if (event.repeat) return
        const targetIndex = selected === -1 ? 0 : selected
        if (document.activeElement === input && input) {
          if (event.altKey || event.ctrlKey) {
            // modifier always forces nav
          } else {
            // hijack only when the caret sits at the start of the input
            const { selectionStart, selectionEnd } = input
            if (selectionStart !== 0 || selectionEnd !== 0) return
            isKeyboardAction.current = true
            if (selected === -1) setSelectedIndex(0)
            resultsEl?.focus()
            event.preventDefault()
            return
          }
        }
        if (detailed && (stateRef.current.resultMarks.get(targetIndex)?.length ?? 0) > 0) {
          event.preventDefault()
          cycleMatch(targetIndex, -1)
        }
        return
      }

      if (event.key === 'ArrowRight') {
        if (event.repeat) return
        const targetIndex = selected === -1 ? 0 : selected
        if (document.activeElement === input && input) {
          if (event.shiftKey) return
          if (event.altKey || event.ctrlKey) {
            // allow modifier to force nav
          } else {
            // hijack only when the caret sits at the end of the input
            const { selectionStart, selectionEnd, value } = input
            if (selectionStart !== value.length || selectionEnd !== value.length) return
            isKeyboardAction.current = true
            if (selected === -1) setSelectedIndex(0)
            resultsEl?.focus()
            event.preventDefault()
            return
          }
        }
        if (detailed && (stateRef.current.resultMarks.get(targetIndex)?.length ?? 0) > 0) {
          event.preventDefault()
          cycleMatch(targetIndex, 1)
        }
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, activateResult, cycleMatch, scrollToSelectedResult])

  // disableMouseOver pattern: keyboard nav disables hover selection until a
  // REAL mouse move (position actually changed)
  const lastMouse = useRef({ x: 0, y: 0 })
  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (e.clientX === lastMouse.current.x && e.clientY === lastMouse.current.y) return
    lastMouse.current = { x: e.clientX, y: e.clientY }
    if (disableMouseOver.current) {
      disableMouseOver.current = false
      return
    }
    const el = (e.target as HTMLElement | null)?.closest<HTMLElement>('.result-item')
    const index = el?.dataset?.index ? Number.parseInt(el.dataset.index) : -1
    if (index >= 0 && index !== stateRef.current.selectedIndex) {
      setSelectedIndex(index)
    }
  }, [])

  const onSearchBarPointerUp = useCallback(
    (event: React.PointerEvent) => {
      if (event.pointerType === 'mouse') focusSearchInput(false)
    },
    [focusSearchInput],
  )

  const applySuggestion = useCallback(
    (s: string) => {
      setQuery(s)
      focusSearchInput(false)
    },
    [setQuery, focusSearchInput],
  )

  const resetSearch = useCallback(() => {
    setQuery('')
    requestAnimationFrame(() => focusSearchInput(false))
  }, [setQuery, focusSearchInput])

  // -------------------------------------------------------------------------
  // render
  // -------------------------------------------------------------------------

  const hasResults = results.length > 0
  const listId = hasResults ? 'localsearch-list' : undefined
  const showNoResults = !!query && !hasResults && !isSearching && enableNoResults
  const showMoreVisible = !isSearching && (results.length < totalResultsCount || mayHaveMore)

  return (
    <div
      role="button"
      aria-owns={listId}
      aria-expanded={true}
      aria-haspopup="listbox"
      aria-labelledby="localsearch-label"
      className={`VPLocalSearchBox${leaving ? ' vpl-leaving' : ''}`}
      style={{ display: visible ? 'flex' : 'none' }}
    >
      <div className="backdrop" onClick={() => closeSearch()} />

      <div className="shell" ref={shellRef}>
        <form
          className="search-bar"
          onPointerUp={onSearchBarPointerUp}
          onSubmit={(e) => e.preventDefault()}
        >
          <label id="localsearch-label" title={TITLES.buttonText} htmlFor="localsearch-input">
            <span aria-hidden="true" className="vpi-search search-icon local-search-icon" />
          </label>
          <div className="search-actions before">
            <button
              type="button"
              className="back-button"
              title={TITLES.backButtonTitle}
              onClick={() => closeSearch()}
            >
              <span className="vpi-arrow-left local-search-icon" />
            </button>
          </div>
          <input
            id="localsearch-input"
            ref={inputRef}
            value={query}
            aria-activedescendant={
              selectedIndex > -1 ? `localsearch-item-${selectedIndex}` : undefined
            }
            aria-autocomplete="both"
            aria-controls={listId}
            aria-labelledby="localsearch-label"
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            className="search-input"
            enterKeyHint="go"
            maxLength={64}
            placeholder={TITLES.buttonText}
            spellCheck={false}
            type="search"
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="search-actions">
            {isSearching && (
              <span
                className="vp-search-spinner"
                style={{ alignSelf: 'center', margin: '0 4px' }}
                title={TITLES.searching}
              />
            )}

            <button
              className={`toggle-layout-button${detailedView ? ' detailed-list' : ''}`}
              type="button"
              aria-pressed={detailedView}
              title={TITLES.displayDetails}
              onClick={() => setDetailedView(!detailedView)}
            >
              <span className="vpi-layout-list local-search-icon" />
            </button>

            <button
              className={`toggle-fuzzy-button${fuzzy ? ' fuzzy-active' : ''}`}
              type="button"
              aria-pressed={fuzzy}
              title={fuzzy ? TITLES.fuzzyOn : TITLES.fuzzyOff}
              onClick={() => setFuzzy(!fuzzy)}
            >
              {fuzzy ? (
                <span className="fuzzy-icon">~</span>
              ) : (
                <span className="exact-icon">=</span>
              )}
              <span className="visually-hidden">
                {fuzzy ? 'Fuzzy Search Active' : 'Exact Search Active'}
              </span>
            </button>

            <button
              className="clear-button"
              type="reset"
              disabled={!query}
              title={TITLES.resetButtonTitle}
              onClick={resetSearch}
            >
              <span className="vpi-delete local-search-icon" />
            </button>
          </div>
        </form>

        <ul
          id={listId}
          ref={resultsElRef}
          role={hasResults ? 'listbox' : undefined}
          aria-labelledby={hasResults ? 'localsearch-label' : undefined}
          className="results"
          tabIndex={-1}
          onMouseMove={onMouseMove}
        >
          {!!query && hasResults && (
            <li className="results-info">
              Showing {results.length} of {totalResultsCount}
              {mayHaveMore ? '+' : ''} matches
            </li>
          )}

          {results.map((p, index) => (
            <ResultItem
              key={p.id}
              result={p}
              index={index}
              selected={selectedIndex === index}
              detailedView={detailedView}
              markGroups={resultMarks.get(index)?.length ?? 0}
              currentMark={currentMarkIndex.get(index) ?? 0}
              disableMouseOver={disableMouseOver}
              onSelect={setSelectedIndex}
              onClickResult={handleResultClick}
              onPrevMatch={() => cycleMatch(index, -1)}
              onNextMatch={() => cycleMatch(index, 1)}
            />
          ))}

          {showNoResults && (
            <li className="no-results">
              <div>
                {TITLES.noResultsText} &quot;{query}&quot;
              </div>
              {!fuzzy && (
                <div className="no-results-actions">
                  <button type="button" className="try-fuzzy-btn" onClick={() => setFuzzy(true)}>
                    Try fuzzy search?
                  </button>
                  {suggestions.length > 0 && (
                    <>
                      <span className="did-you-mean">Did you mean:</span>
                      {suggestions.map((s) => (
                        <button
                          key={s}
                          type="button"
                          className="suggestion-btn"
                          onClick={() => applySuggestion(s)}
                        >
                          {s}
                        </button>
                      ))}
                    </>
                  )}
                </div>
              )}
            </li>
          )}

          {!query && recent.length > 0 && (
            <li className="recent-searches">
              <div className="recent-header">
                <span className="recent-label">Recent</span>
                <button type="button" className="clear-all-btn" onClick={clearRecent}>
                  Clear all
                </button>
              </div>
              <div className="recent-items">
                {recent.map((s) => (
                  <div key={s} className="recent-item-wrapper">
                    <button
                      type="button"
                      className="recent-item"
                      onClick={() => applySuggestion(s)}
                    >
                      {s}
                    </button>
                    <button
                      type="button"
                      className="recent-delete-btn"
                      title="Remove search"
                      onClick={(e) => {
                        e.stopPropagation()
                        e.preventDefault()
                        removeRecent(s)
                        requestAnimationFrame(() => focusSearchInput(false))
                      }}
                    >
                      <span className="vpi-delete delete-icon-mini" />
                    </button>
                  </div>
                ))}
              </div>
            </li>
          )}

          {showMoreVisible && (
            <li className="show-more-item">
              <button type="button" className="show-more-btn" onClick={showMore}>
                Show more results
                {!mayHaveMore && totalResultsCount > results.length && (
                  <> ({totalResultsCount - results.length} remaining)</>
                )}
              </button>
            </li>
          )}
        </ul>

        <div className="search-keyboard-shortcuts">
          <span>
            <kbd aria-label="up arrow">
              <span className="vpi-arrow-up navigate-icon" />
            </kbd>
            <kbd aria-label="down arrow">
              <span className="vpi-arrow-down navigate-icon" />
            </kbd>
            {' to navigate'}
          </span>
          <span>
            <kbd aria-label="enter">
              <span className="vpi-corner-down-left navigate-icon" />
            </kbd>
            {' to select'}
          </span>
          {detailedView && (
            <span>
              <kbd>
                <span className="vpi-arrow-left navigate-icon" />
              </kbd>
              <kbd>
                <span className="vpi-arrow-right navigate-icon" />
              </kbd>
              {' '}
              {TITLES.cycleMatches}
            </span>
          )}
          <span>
            <kbd aria-label="escape">esc</kbd>
            {' to close'}
          </span>
        </div>
      </div>
    </div>
  )
}

// The excerpt HTML is managed imperatively, outside React's reconciler: the
// parent's marking effect wraps matches in <mark> elements after render, and
// React 19 re-commits dangerouslySetInnerHTML whenever the row re-renders
// (new {__html} object identity), silently erasing those marks — e.g. the
// moment the match-count pill state lands. Owning innerHTML in a layout
// effect keyed on the html string means React can never rewrite the content;
// child layout effects also run before parent effects, so a fresh excerpt is
// always populated before the parent marks it.
function Excerpt({ html }: { html: string }) {
  const ref = useRef<HTMLDivElement & { __excerptHtml?: string }>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    // layout effects re-fire whenever React re-reveals a hidden subtree
    // (reappearLayoutEffects) — skip when this html is already applied so a
    // re-fire never erases the <mark> elements the marking effect added
    if (el.__excerptHtml === html) return
    el.innerHTML = html
    el.__excerptHtml = html
  }, [html])
  return (
    <div className="excerpt" inert>
      <div className="vp-doc" ref={ref} />
    </div>
  )
}

function ResultItem({
  result,
  index,
  selected,
  detailedView,
  markGroups,
  currentMark,
  disableMouseOver,
  onSelect,
  onClickResult,
  onPrevMatch,
  onNextMatch,
}: {
  result: WikiDisplayResult
  index: number
  selected: boolean
  detailedView: boolean
  markGroups: number
  currentMark: number
  disableMouseOver: React.RefObject<boolean>
  onSelect: (index: number) => void
  onClickResult: (e: React.MouseEvent, index: number) => void
  onPrevMatch: () => void
  onNextMatch: () => void
}) {
  return (
    <li
      id={`localsearch-item-${index}`}
      data-id={result.id}
      aria-selected={selected ? 'true' : 'false'}
      role="option"
      className="result-item"
      data-index={index}
    >
      <div
        className={`result${selected ? ' selected' : ''}`}
        onMouseEnter={() => {
          if (!disableMouseOver.current) onSelect(index)
        }}
        onFocus={() => onSelect(index)}
        onClick={(e) => onClickResult(e, index)}
      >
        <div>
          <div className="titles">
            <span className="title-icon">#</span>
            {result.titles.map((t, titleIndex) => (
              <span key={titleIndex} className="title">
                <span
                  className="text"
                  dangerouslySetInnerHTML={{ __html: escapeHtml(t) }}
                />
                <span className="vpi-chevron-right local-search-icon" />
              </span>
            ))}
            <span className="title main">
              <a
                href={result.id}
                className="result-link"
                aria-label={[...result.titles, result.title].join(' > ')}
              >
                <span
                  className="text"
                  dangerouslySetInnerHTML={{ __html: escapeHtml(result.title) }}
                />
              </a>
            </span>
          </div>
          {detailedView && (
            <div className="excerpt-wrapper">
              {result.text && <Excerpt html={result.text} />}
              <div className="excerpt-gradient-bottom" />
              <div className="excerpt-gradient-top" />
              {markGroups > 1 && (
                <div
                  className="excerpt-actions"
                  onClick={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                  }}
                >
                  <button
                    type="button"
                    className="match-nav-button"
                    title={TITLES.prevMatch}
                    onClick={(e) => {
                      e.stopPropagation()
                      e.preventDefault()
                      onPrevMatch()
                    }}
                  >
                    <span className="vpi-chevron-left navigate-icon" />
                  </button>
                  <span className="match-count">
                    {currentMark + 1}/{markGroups}
                  </span>
                  <button
                    type="button"
                    className="match-nav-button"
                    title={TITLES.nextMatch}
                    onClick={(e) => {
                      e.stopPropagation()
                      e.preventDefault()
                      onNextMatch()
                    }}
                  >
                    <span className="vpi-chevron-right navigate-icon" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </li>
  )
}
