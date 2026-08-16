import { createContext, use, useEffect, useMemo, useState, type ReactNode } from 'react'

export type WikiFiltersValue = {
  starredOnly: boolean
  indexesOnly: boolean
  setStarredOnly: (on: boolean) => void
  setIndexesOnly: (on: boolean) => void
}

const defaultValue: WikiFiltersValue = {
  starredOnly: false,
  indexesOnly: false,
  setStarredOnly: () => {},
  setIndexesOnly: () => {},
}

const WikiFiltersContext = createContext<WikiFiltersValue>(defaultValue)

// session-scoped starred/indexes toggles. filtering itself is pure css like
// upstream's ToggleStarred/ToggleIndexes: html classes hide non-matching rows
// in place — no re-render, headings stay, the browser's own scroll anchoring
// absorbs the height change. both can be on at once (union), like theirs.
export function WikiFiltersProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState({ starredOnly: false, indexesOnly: false })

  useEffect(() => {
    if (typeof document === 'undefined') return
    document.documentElement.classList.toggle('starred-only', state.starredOnly)
    document.documentElement.classList.toggle('indexes-only', state.indexesOnly)
  }, [state])

  const value = useMemo<WikiFiltersValue>(
    () => ({
      ...state,
      setStarredOnly: (on) => setState((prev) => ({ ...prev, starredOnly: on })),
      setIndexesOnly: (on) => setState((prev) => ({ ...prev, indexesOnly: on })),
    }),
    [state],
  )

  return (
    <WikiFiltersContext.Provider value={value}>{children}</WikiFiltersContext.Provider>
  )
}

export function useWikiFilters(): WikiFiltersValue {
  return use(WikiFiltersContext)
}
