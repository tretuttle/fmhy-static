---
name: verify-section-jumps
description: Model-check "jump to a section" scroll ownership in site/ (TLA+, TLC) — who may scroll the page and freeze the mobile header when a reader taps a TOC / "On this page" / sidebar page#hash row, changes the #hash, opens another page, or picks a search result that scrolls to its match. Use when a change touches scrollToAnchor.ts, scrollOffset.ts (freezeMobileNav / isMobileNavFrozen), searchHighlight.ts scheduleScrollToMatch / landOnMatch / cancelPendingScroll, WikiSearchModal navigateToResult, ScrollHeader's hide-on-scroll or hash watchers, or the scrollToAnchor callers in WikiToc, LocalNav and WikiSidebar.
---

# Verify section jumps (scroll ownership)

`SectionJumps.tla` is a TLA+ model of every callback that can scroll the page
or freeze the mobile header during a section jump or a search scroll-to-match.
TLC checks every order in which those callbacks can run, within the bounds below,
against four rules. JavaScript is single-threaded, so each model action is one
callback (a click handler, a `setTimeout`, or a `requestAnimationFrame` callback)
that runs to the end before anything else runs.

## The rules

| Rule (INVARIANT) | The reader's sentence | Harm when broken | Status at sync commit |
| --- | --- | --- | --- |
| `NewestRequestLands` | Once everything settles, the page sits where my newest request sent it. (A search result whose match can't be found is exempt.) | You land on an older target. The URL can show `#x` while the page sits somewhere else. | **breaks** (findings 1, 3, 4) |
| `NoSilentDrop` | A jump I ask for is never silently ignored. | A tap or `#hash` change does nothing for up to ~7s, while the URL and the "On this page" highlight claim it worked. | **breaks** (finding 1) |
| `HeaderFreeOnceIdle` | Once no jump is running, the mobile header hides and shows again. | The header stays pinned (or hidden) for good. | holds |
| `JumpStaysOnItsPage` | A jump never scrolls a page other than its own. | The next page drifts up by hundreds or thousands of px right after you open it. | **breaks** (finding 2) |

`TypeOK` is a sanity check. TLC's deadlock check is on. `Done` is the no-op
end state, reached once the reader has made every request and everything has settled.

## Is my change covered?

Coverage record. The model was last confirmed against these files at the
**sync commit `fb43561`** (`fb43561cc7355afc69c8890d4cd0467bd26ff3f7`):

| File | What the model covers |
| --- | --- |
| `site/src/features/wiki/scrollToAnchor.ts` | `activeJump`, `isSearchScrolling`, `scrollToAnchor` (replaceState, freeze, sync first `step()`, rAF settle loop, 600ms late correction, `releaseNav` at +100ms), `alignInitialHashScroll` (bail-outs only, see "left out"), `watchHashNavigations` (router poll + `hashchange`) |
| `site/src/features/wiki/scrollOffset.ts` | `freezeMobileNav`, `navFreezes`, `isMobileNavFrozen` (lock class counts as frozen) |
| `site/src/features/wiki/searchHighlight.ts` | `scheduleScrollToMatch` (lock class add, `poll`, `tryScroll`, `startObserver` + 5s safety `unlock`, `unlock`), `landOnMatch` (`isStale` / `isConnected` / finish), `cancelPendingScroll`, `isSamePath` |
| `site/src/features/wiki/WikiSearchModal.tsx` | `navigateToResult` (cancel, same-page pushState vs `router.navigate`, `scheduleScrollToMatch` args), `getMatchContext` (null in the compact view) |
| `site/src/components/ScrollHeader.tsx` | `useMobileNavHidden` honours `isMobileNavFrozen`; mounts `alignInitialHashScroll` + `watchHashNavigations` |
| `site/src/components/WikiToc.tsx` | `tocScrollTo` → `scrollToAnchor(id)` |
| `site/src/components/LocalNav.tsx` | `onLinkPress` → `scrollToAnchor(id)` then `setActiveId` |
| `site/src/components/WikiSidebar.tsx` | `SidebarRow` onPress: `page#hash` rows → 30×100ms `scrollToAnchor` poll |

To see what changed since the sync commit:

```sh
git log --oneline fb43561..HEAD -- site/src/features/wiki/scrollToAnchor.ts site/src/features/wiki/scrollOffset.ts site/src/features/wiki/searchHighlight.ts site/src/features/wiki/WikiSearchModal.tsx site/src/components/ScrollHeader.tsx site/src/components/WikiToc.tsx site/src/components/LocalNav.tsx site/src/components/WikiSidebar.tsx
git diff fb43561 -- <same paths>
```

If your diff touches any line the map below names, or adds a new caller of
`scrollToAnchor`, `scheduleScrollToMatch`, `cancelPendingScroll`,
`freezeMobileNav`, `window.scrollTo`, or the `vp-search-scrolling` class, it is covered.

## Run the check

From the repo root:

```sh
.claude/skills/verify-section-jumps/check.sh
```

It runs `.claude/verify/tlc.sh` (pinned TLC 1.7.4 + Temurin 25 via mise, so it
needs the network once) once per rule, with `<Rule>.cfg` (MaxReq = 3), which
takes about 3s in total. Then it compares each result with `expected.txt`: `holds`, or
`breaks:` followed by the actions on TLC's shortest counterexample.
Exit 0 means every rule matches `expected.txt`, so the known findings are unchanged and
`HeaderFreeOnceIdle` still holds. A `CHANGED` line means your change moved a
result. To see one rule's full TLC trace:

```sh
.claude/verify/tlc.sh .claude/skills/verify-section-jumps/SectionJumps.tla .claude/skills/verify-section-jumps/NoSilentDrop.cfg
```

`SectionJumps.cfg` (the default when you run `tlc.sh` on the model with no config) has all
four rules. TLC stops at the first one that breaks. `tlc.sh` alone returns 0 only when every invariant in that config holds. Three
rules break on the current code, so `tlc.sh` exits 12 on those configs. That is expected
until the findings are fixed.

Read every result with the pstack **`/statechart`** skill. Point it at
`SectionJumps.tla` with `Chart.cfg` (MaxReq = 2, plus `VIEW ChartView`, which
keeps the run under the chart's 500-state budget) and the view module
`view.mjs` (the reader's words for states and steps), and write its output
outside the repo. It prints each broken rule's shortest path in plain words and
draws the user-flow chart. `view.mjs` hides some redundant arrows. They are listed
in its `hidden()` function, and the hand-off must name them.

## Code → model map

| Model action | Code (one callback) |
| --- | --- |
| `YouTapAHeading` | `WikiToc` `tocScrollTo`, `LocalNav` `onLinkPress`, same-page `WikiSidebar` row → `scrollToAnchor(id)`: `replaceState(null, …)`, `freezeMobileNav()`, `++activeJump`, first `step()` synchronously (no scroll if the lock class is on) |
| `YouChangeTheHash` | `watchHashNavigations` `onHashChange`: under the lock it `return`s for good, otherwise `scrollToAnchor(id, {updateHash:false})` |
| `YouOpenASectionOnAnotherPage` | `router.navigate(page#hash)` (link or sidebar row): route change plus One's one-shot hash scroll, then `subscribeToRootState` arms the poll |
| `YouOpenAnotherPage` | link without a hash (the router puts the page at the top) or back/forward (the browser restores a scrolled position). The router state change runs `clearTimeout(poll)` |
| `YouPickASearchResult` | `navigateToResult`: `cancelPendingScroll()`, same page (`pushState`, no scroll) or `router.navigate`, then `scheduleScrollToMatch` adds `vp-search-scrolling` |
| `SearchFindsTheMatch` | `poll`/observer → `tryScroll` → `findMatchInSection` → `landOnMatch` first `step()` |
| `SearchLandingStep` | `landOnMatch` `step()`: `!el.isConnected` → finish, else scroll, then loop or finish |
| `SearchUnlocks` | `setTimeout(unlock, 100)` after `finish()` |
| `SearchGivesUp` | 15 polls × 120ms, then the observer's 5s safety `unlock()`, about 7s after the pick |
| `HashPollFires` | `watchHashNavigations` `settle()`: `if (isSearchScrolling()) return`, else `scrollToAnchor` |
| `JumpSettleStep` | `scrollToAnchor` rAF×2 `step()`: `superseded()` → stop, else measure and `window.scrollTo`. **No `isConnected` check.** |
| `JumpLateCorrection` | the 600ms `setTimeout`: `el.isConnected && !superseded()` → re-scroll |
| `JumpReleasesHeader` | `setTimeout(releaseNav, 100)` → `navFreezes--` |

Variables: `lock` = `<html>` has `vp-search-scrolling`; `activeJump`,
`navFreezes` = the module variables of the same name; `search` = the live
`activeScrollId` op (older ops are stale and do nothing); `visit` = page
identity (an element from an older visit is detached); `scrolledFor` = whose
target the page was last scrolled to (`-1` = off target).

## Known findings at the sync commit

Each was replayed against a production build (`site/dist`, served with
`bun x one serve`, driven by Playwright + `/usr/bin/chromium`).

1. **A search whose match can't be found makes every jump do nothing for about 7s**
   (`NoSilentDrop`, and `NewestRequestLands` once it settles). TLC: (1)
   `YouPickASearchResult`: a typo in fuzzy search with the compact view
   (`getMatchContext` → null, and no `p/li/td/dd/blockquote` contains a query
   word), so `findMatchInSection` returns null and the lock stays on.
   (2) `YouChangeTheHash`: `onHashChange` sees `isSearchScrolling()` and
   returns, leaving only the browser's native jump. (3) `SearchGivesUp` about 7s
   later. The page never settles on the hash. A TOC tap does the same:
   `scrollToAnchor` returns `true`, but `superseded()` is already true, so it
   never scrolls. The 600ms check is still superseded, and the URL already
   says `#x`. Replay on /ai and /educational: the lock was held 6.7–6.9s.
   A TOC tap on `#ai-benchmarks` 1.5s in left scrollY at 0, with the heading
   24735px down, even after the lock ended (control: it lands at 15px). An
   `#encyclopedias` hash change left the heading at −302px (control: 55px). At
   phone width the header stayed shown while the reader scrolled 2000px
   (control: it hides).
2. **A jump keeps scrolling after you leave its page** (`JumpStaysOnItsPage`).
   TLC: (1) `YouTapAHeading` (or a `#hash` change) on page A. (2) the reader opens
   another page while the settle loop runs. (3) `JumpSettleStep`: the loop has no
   `el.isConnected` check, and a detached element measures `top = 0`, so the
   target becomes `scrollY − scroll-margin-top` and it scrolls the new page up.
   Replay: tap `#ai-benchmarks`, then 60ms later press Back to /audio (restored
   to 8000). The old loop scrolled /audio up 15px every ~33ms, 38 times
   (8000 → 7445) at 1440px wide, and 63px at a time (8000 → 5669) at 390px. With a
   sidebar `page#hash` row instead, it made one stray scroll (22546 → 22531)
   before the new page's jump superseded it.
3. **An older tap's 600ms re-check undoes a newer search**
   (`NewestRequestLands`). (1) `YouTapAHeading`. (2) `YouPickASearchResult`
   (same page). (3) `SearchFindsTheMatch` → landing. (4) `SearchUnlocks`.
   (5) `JumpLateCorrection`: the search never bumps `activeJump`, and the lock
   is gone, so `superseded()` is false and the page jumps back to the heading.
   Replay (pick 169ms after the tap): the search landed at 3749 and unlocked at 510ms,
   then the re-check scrolled to 18871 at 602ms. A human can't pick a result
   that fast after a tap. It needs a jump that starts without a tap (the hash poll
   after a slow page load, `alignInitialHashScroll`) while the reader is in
   the search box.
4. **An older search beats a newer `#hash` change** (`NewestRequestLands`).
   (1) `YouPickASearchResult` (its match exists). (2) `YouChangeTheHash` while the
   lock is on (dropped, as in finding 1). (3) `SearchFindsTheMatch`, then landing and
   unlock. Only a newer search calls `cancelPendingScroll`. Replay (same page, `ollama`): the hash changed to
   `#ai-benchmarks` about 40ms after the pick, while the lock was on. The search
   still landed at 3749, and the URL kept `#ai-benchmarks` with that heading
   15137px below.

Findings 3 and 4 hide behind finding 1 in TLC's shortest trace for
`NewestRequestLands`. To see them, constrain the model in a copy outside the repo.
Restrict `Next` to findable searches, with no route change during a search and no
stale scroll, rather than using an ACTION_CONSTRAINT: TLC still checks the
rules after the steps an ACTION_CONSTRAINT excludes.

Not modelled, but checked: `replaceState(null, …)` replaces One's
`history.state` `{id}` with `null`. Back, then Forward, still rendered /ai at
`#ai-benchmarks` (One made a fresh id), so the replay found no visible harm.

## Real bug or modelling error?

When a rule breaks in a new way, replay TLC's trace against the real code, one
step per action, before you believe it. Build `site/` (or use an existing
`site/dist`), serve it with `cd site && bun x one serve --port <free port>`,
and drive it with Playwright. Wrap `window.scrollTo` to log
`{t, path, from, to}`, and watch `document.documentElement.classList` for
`vp-search-scrolling`. Steps that need fast timing can be dispatched with
`element.click()` (the search modal covers the TOC). If the replay can't
produce the trace, suspect the model. Check the map above for an action that
is not one callback, or an ordering that real timings rule out. One such
ordering is already encoded: `SearchFindsTheMatch` requires every settle loop
to have stopped, because the first poll comes ≥96ms after the pick and a loop
sees the lock within ~33ms.

## When you change the covered code on purpose

1. Mirror the change in a copy of the model outside the repo first. Edit the
   action the map names, and keep one action per callback.
2. Run `check.sh /path/to/copy/SectionJumps.tla` (it copies the rule configs
   next to the copy). A `CHANGED` line is either your fix (a finding now
   `holds`) or a new break. Read the trace with `/statechart`.
3. When the result is what you intend, copy the model back. Update
   `expected.txt`, this file's rule table and findings, and `view.mjs` if a
   state's meaning changed. Never weaken a rule to make it pass.
4. Move the sync commit (both the short and full hash above) forward only
   after you have re-read every covered file at the new commit and confirmed
   the map still matches it.

## Bounds and assumptions

- Two pages and at most 3 reader requests (`MaxReq = 3`): 13,953 distinct
  states, complete. The chart uses `MaxReq = 2` with `VIEW ChartView`, which
  only merges states that agree on every comparison the rules and actions read.
- Section ids are unique to their page. A page renders within the search's
  ~7s give-up. Timers fire in any order, except as stated above.
- Opening another page is one step: the click and the new DOM replacing the
  old. Steps in between could only scroll the old page.
- One's router scroll, the browser's native hash jump and back/forward
  restore count as "lands off" or "lands where asked". They are not modelled in detail.

Left out: user wheel/touch/key interrupts of `landOnMatch`, and scrolling by hand.
The `WikiSidebar` 30×100ms poll is folded into the router poll (both call
`scrollToAnchor` for the same id; the sidebar's skips the lock check, but the
outcome under the lock is the same). Also left out: `alignInitialHashScroll`
(an initial-load jump with the same bail-outs), the search's 5s safety
`unlock()` firing while a late observer-found landing is still running,
`LocalNav`'s smooth "return to top", the skip link, the `getAnchorScrollTop`
arithmetic and layout settling, and react-native (`typeof document` no-ops).
