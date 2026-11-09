---
name: verify-search-flow
description: Formal verification (TLA+ / TLC) of the wiki search flow in site/ - opening and closing the search modal (focus, fade-out, scroll lock) and the index load -> debounced query -> results / "No results" pipeline. Use before and after any change to WikiSearchModal.tsx, searchModal.ts, useWikiSearch.ts, the fetch caches in data.ts, emitter.ts or the SearchHotkey in app/_layout.tsx, or when a bug report mentions search focus, a spinner, stale results, or "No results" after a network problem.
---

# Verify the search flow

Two small TLA+ models, checked by TLC, describe how the search modal opens and closes and how a query becomes a result list. TLC tries every order of the modelled steps (key presses, React commits, the 100 ms fade timer, the 350 ms debounce, the index fetch settling, the result list being built, the network coming back) and reports the shortest path to any state that breaks a rule.

Tool: TLA+ with the TLC model checker. The bugs here are about the order of events (React effects run while a box is still hidden, a stale effect run lands after you typed, a rejected promise is cached), which is what a model checker covers and what unit tests rarely reach. The TLC runner `.claude/verify/tlc.sh` pins TLC 1.7.4 and Temurin 25 through mise.

## Run the check

```sh
sh .claude/skills/verify-search-flow/check.sh       # ~4 s; add -v for TLC's full output
```

| Exit | Meaning | What to do |
| --- | --- | --- |
| 0 | Every rule that held at the sync commit still holds, and each open finding below still breaks exactly as recorded. | Nothing. |
| 1 | `REGRESSION`: a rule that held now breaks. The trace is printed. | Treat it as a real bug until you show otherwise (see "Real bug or modelling error"). |
| 2 | `FIXED?`: an open finding no longer breaks. | See "When a finding stops reproducing". |
| 3 | TLC could not run a model (syntax error, deadlock, or a finding broke a different rule). | Fix the model. |

`check.sh` calls `.claude/verify/tlc.sh <spec> <cfg>` for each config. To check an edited copy of this folder kept elsewhere, for example while you evaluate a change in another worktree, run that copy's `check.sh` with `TLC_SH=/home/trent/fmhy-static/.claude/verify/tlc.sh`. You can run any one directly; TLC's exit status is 0 only when every invariant in that config holds. Do not pipe it through `tail`, because that hides the status. Deadlock checking is on.

To read a result, use the pstack **/statechart** skill (`/pstack:statechart` in Claude Code). Give it a spec, its `*.all.cfg` (every rule), and its `*.view.mjs` (labels in the reader's words). It turns each violation into its shortest path in plain words and draws the flow. Write its output outside the repo.

## Files

| File | What it is |
| --- | --- |
| `SearchModalOpen.tla` | Modal lifecycle: emitter `open`, React commits, `hasOpenedOnce`/`visible`/`leaving`, leave timer, focus, scroll lock. |
| `SearchModalOpen.cfg` | Rules that hold (regression gate). |
| `SearchResults.tla` | Engine: `enginePromise`, `clientFetches` corpus entry, network, debounce, stage 2, spinner, "No results". |
| `SearchResults.cfg` | Rules that hold (regression gate). |
| `SearchResults.noresults.cfg`, `.retry.cfg`, `.stale.cfg` | Open findings F2, F3, F4 (one each, since TLC stops at the first violation). |
| `*.all.cfg` | Every rule, for /statechart. |
| `*.view.mjs` | /statechart views. |
| `check.sh` | The one-command check. |

## Rules

Each rule is an INVARIANT in the spec named in brackets.

| Rule (reader's words) | Harm if broken | Invariant | Status at sync commit |
| --- | --- | --- | --- |
| Once an open search box has rendered, it is on screen, not hidden and not fading. | Search "opens" but nothing is visible. | `BoxShownWhileOpen` (Modal) | holds |
| The page behind is scroll-locked while search is open and scrolls again after it closes. | The page stays frozen after search closes. | `ScrollLockedOnlyWhileOpen` (Modal) | holds |
| Whenever search is open and rendered, the cursor is in the search box. | You press Ctrl+K and type, and your keystrokes go nowhere. | `FocusInBoxWhenOpen` (Modal) | holds |
| An empty box lists nothing and shows no spinner. | Old results or a stuck spinner under an empty box. | `EmptyBoxShowsNothing` (Results) | holds |
| The spinner is on only while a search or its list-building is pending. | The spinner spins forever. | `SpinnerOnlyWhileWorking` (Results) | holds |
| "No results" appears only after a search really ran on the loaded index. | A failed download tells the reader the wiki has nothing, which is a false answer. | `FailureNotShownAsNoResults` (Results) | **breaks: F2** |
| Once the network is back, a new search is not failed by the old failure. | One blip offline breaks search until a full page reload. | `RetryAfterFailure` (Results) | **breaks: F3** |
| Results listed without the spinner belong to the query and mode in the box. | The reader sees, and may click, results for a query they no longer have, with nothing saying they are stale. | `ResultsMatchQuery` (Results) | **breaks: F4** |

Old results that stay listed while the spinner shows are allowed on purpose. That matches upstream VitePress, which keeps the old list visible during the debounce.

## Open findings (reproduced in a browser against `site/dist`)

**F2. A failed index download shows "No results for …".** (`FailureNotShownAsNoResults`, 2 steps)
1. Search is open with a query (for example a `?q=` link) and `/data/search-corpus.json` is still loading. The 350 ms debounce fires and awaits `getSearchEngine()`.
2. The fetch rejects (offline). `getSearchEngine().catch(() => null)` gives `null`, so the callback runs `setAllResults([])`, `setIsSearching(false)` and `setEnableNoResults(true)`. Stage 2 then takes its empty branch, and `showNoResults` renders `No results for "proxy"` with "Try fuzzy search?".

**F3. That failure is permanent for the session.** (`RetryAfterFailure`, 3 steps)
1. The corpus fetch rejects while offline. `enginePromise` keeps the rejected promise (`??=` never resets), and so does `clientFetches` in `data.ts`, which deletes only `!res.ok` entries.
2. The network comes back.
3. The next debounced search calls `getSearchEngine()`, gets the cached rejection without a request, and shows "No results" again (F2). Closing and reopening does not help: in the browser, exactly one corpus request is made per page load.

The model shows that resetting `enginePromise` alone is not enough, because the reload then gets the rejected `clientFetches` entry. Both caches must drop a rejection.

**F4. Stale results without a spinner.** (`ResultsMatchQuery`, 4 steps; the audit's "first keystroke after a completed search" is a longer path to the same state)
1. A search for "proxy" lands: `setAllResults(hits)` and `setEnableNoResults(true)`. Stage 2 starts `buildDisplayResults` (excerpt fetch).
2. You type "zzqxv". Commit 1 runs the immediate effect (`setEnableNoResults(false)`) and the debounced effect (`setIsSearching(true)`, a new 350 ms timer).
3. Commit 2: `enableNoResults` is a stage-2 dep, so stage 2 re-runs with the old `allResults` (proxy hits) and `queryRef.current="zzqxv"`.
4. The list is built: `setResults(old hits)` and `setIsSearching(false)`. For about 350 ms the box shows "zzqxv", no spinner, and "Showing 16 of 33 matches" of proxy results. Then the real search lands with "No results". Switching fuzzy/exact goes the same way, because `fuzzy` is also a stage-2 dep.

Browser replays: F4 on a normal visit, and F2/F3 with `page.route(...).abort('internetdisconnected')` on a first visit. In the browser the service worker (`sw.js`, Workbox) serves `/data/*.json` NetworkFirst from a 24 h `data-cache`. F2 therefore needs the corpus to be missing from that cache: a first visit, an expired or evicted entry, or no service worker. F3 holds whenever F2 happened, because nothing ever refetches. To intercept the excerpt fetches in Playwright, create the context with `serviceWorkers: 'block'`.

## Does my change touch this? (coverage record)

**Sync commit: `b7c1d75`** (fix/search-focus). The models were last confirmed to describe the code below at this commit.

| Code | Covered | Model element |
| --- | --- | --- |
| `site/src/features/wiki/WikiSearchModal.tsx` `WikiSearchModal` | `hasOpenedOnce`, `visible`, `leaving`, `visibleRef`, the `[open]` effect and `LEAVE_DURATION_MS` timeout, conditional `SearchBox` render | Modal `Commit` (parent part), `LeaveTimerFires` |
| same, `SearchBox` | the `[open, focusSearchInput]` effect (focus+select, overflow lock and restore, focus restore); `style={{ display: open || visible ? 'flex' : 'none' }}`; `showNoResults`; spinner render; Esc / backdrop / back button / `navigateToResult` → `closeSearch` | Modal `Commit` (child part), `YouClose`; Results `ShowsNoResults` |
| same, `useSearchFromQuery` | `?q=` → `primeSearchQuery` + `openSearch` | Modal `YouOpen`; Results `Init` with query `"A"` |
| `site/src/features/wiki/searchModal.ts` | `openSearch`, `closeSearch`, `toggleSearch` | `YouOpen`, `YouClose` |
| `site/src/lib/emitter.ts` | `useEmitterValue` (`useSyncExternalStore`): emitting the same value causes no render | `YouOpen` enabled only when closed |
| `site/app/_layout.tsx` `SearchHotkey` | Ctrl/⌘K toggle, `/` open, Esc close | `YouOpen`, `YouClose` |
| `site/src/features/wiki/useWikiSearch.ts` | `getSearchEngine` (`enginePromise ??=`); the effects in `useWikiSearch`: warm-up, immediate `[query, fuzzy, urlSearch]`, debounced (`searchGen`, `SEARCH_DEBOUNCE_MS`, the `!engine` branch), stage 2 (`stageGen`, both branches, its dep list); `setQuery`, `setFuzzy` | Results: all actions, `Stage2`, `QueryOrModeChange`, `SearchRuns`, `SearchGetsNoEngine` |
| `site/src/features/wiki/data.ts` | `fetchData` / `clientFetches` (rejection kept, `!res.ok` deleted), `loadSearchCorpus` | Results `corpus`, `EngineLoads`, `EngineFails` |

To see whether covered code changed since the sync commit, run this in the checkout whose code you are evaluating (add `-C <worktree>` when that is not the current directory). Committed and uncommitted changes both show.

```sh
git diff b7c1d75 -- site/src/features/wiki/WikiSearchModal.tsx site/src/features/wiki/searchModal.ts site/src/features/wiki/useWikiSearch.ts site/src/features/wiki/data.ts site/src/lib/emitter.ts site/app/_layout.tsx
```

A diff that only touches code the table does not name (ranking in `runSearch`, the tokenizer, markup classes, `searchHighlight.ts`, keyboard selection) needs no model change. Run `check.sh` anyway.

## When the code changes

1. Read the diff against the table. For each changed line in covered code, find the model element and decide whether its behaviour changed. Watch especially: effect dependency arrays and declaration order (React runs effects in declaration order, children before parents), what renders before an effect (`display`), which `setState` calls happen in which effect, generation checks (`searchGen`, `stageGen`), and what is cached where (`enginePromise`, `urlRecordsPromise`, `clientFetches`).
2. If it changed, edit the model to match **before** running the check. Keep one step equal to one indivisible thing in the browser (an event plus the React commits it triggers, a timer callback, a promise settling). Name new variables after the code.
3. Run `check.sh`. Then:
   - Exit 0: if you changed the model, also run /statechart on the `*.all.cfg` and confirm the shortest paths still read as the code behaves.
   - Exit 1 (regression): replay the trace (below). If it reproduces, it is a bug in the change, so report it. Never weaken a rule or the model to make it pass.
4. After you confirm the models describe the code at the new HEAD, move the sync commit above to that commit. Do it only then.
5. If you edited a copy of the models (for example while reviewing another worktree): on a regression, keep this folder as it is and report the trace. For an intended change that passes, apply the same model edit to this folder in the same commit as the code change.

### Real bug or modelling error

Replay the trace step by step against the real app before you believe or dismiss it. Build `site/`, serve `site/dist` with `bun x one serve --port <port>` from `site/`, and drive it with Playwright.
- Focus: read `document.activeElement` after each open.
- Network: use `page.route('**/data/search-corpus.json', r => r.abort('internetdisconnected'))`, then `unroute`.
- Stale results: sample `#localsearch-input` value, `.vp-search-spinner`, `.result-item` count and `.results-info` every few ms after typing.

If a step in the trace cannot happen in the browser, the model is wrong. Find the code line it misdescribes and fix that part of the model. Do not add a guard just to block the trace.

### When a finding stops reproducing (exit 2)

If the change was meant to fix it, check that the fix is in the model, not just in the code. Then:
- Move the invariant from its `*.focus|noresults|retry|stale.cfg` into the spec's main `.cfg`, delete the finding config, and remove its entry from `check.sh` and from "Open findings".
- Update the Rules table.
- Replay the old counterexample in the browser to confirm it is gone.

If the change was not meant to fix it, the model drifted. Recheck it against the code.

## Bounds, assumptions, what is not covered

- **Exhaustive, but over a small abstraction.** Queries are `""`, `"A"` (has hits) and `"B"` (no hits), in exact or fuzzy mode. The modal model has 11 states and the results model 114. Both are checked completely; there is no depth bound.
- **React timing.** A commit, its passive effects, and the re-render their `setState` calls queue are flushed before the next user event, timer or fetch callback. This holds for discrete events, which run at sync priority. Stage 2's async half (`buildDisplayResults` and its excerpt fetch) is a separate step, so you can type while it is in flight.
- **Stage 2's phrase filter** is assumed to keep a non-empty hit list non-empty. The model's network can come back, but it never drops again. In the model, a load fails exactly when the network is down or a rejected fetch is still cached.
- **Focus abstraction.** "page" means "not the search input". In the browser, when the earlier focus was `<body>`, the input keeps focus during the fade (`body.focus()` is a no-op) until `display:none` blurs it. No rule depends on this.
- **Not modelled:**
  - URL search (`urlSearch`, `getUrlRecords`, whose reset-on-failure is defeated by the same `clientFetches` rejection cache).
  - Section chips, show-more paging, detailed/compact view, suggestions.
  - Ranking (`runSearch`), highlight marking, keyboard selection, the Tab focus trap.
  - `pushState`/`popstate` history entries.
  - Excerpt-load failures (`loadExcerpts` caches an empty map on failure).
  - HTTP error responses (`!res.ok`: `clientFetches` drops them, but `enginePromise` still caches the failure).
  - The service worker's data cache.
  - `/startpage`, where `<WikiSearchModal />` is not rendered.
  - Dev-mode StrictMode double effects.
