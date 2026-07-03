import { createContext, use, useMemo, useState, type ReactNode } from 'react'

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

// session-scoped starred/indexes toggles, mutually exclusive like the site
export function WikiFiltersProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState({ starredOnly: false, indexesOnly: false })

  const value = useMemo<WikiFiltersValue>(
    () => ({
      ...state,
      setStarredOnly: (on) =>
        setState((prev) => ({
          starredOnly: on,
          indexesOnly: on ? false : prev.indexesOnly,
        })),
      setIndexesOnly: (on) =>
        setState((prev) => ({
          indexesOnly: on,
          starredOnly: on ? false : prev.starredOnly,
        })),
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
