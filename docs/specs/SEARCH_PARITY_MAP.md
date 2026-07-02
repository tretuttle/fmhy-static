# Search parity map — fmhy.net ↔ fmhy-static

Two-sided, file-complete map of the search feature. **Theirs** = fmhy's customized
VitePress search (synced in-repo under `docs/.vitepress/`, tracking `fmhy/edit@main`).
**Ours** = the React/One port under `site/`. Every behavior is classified as one of:

- **MATCH** — same logic, often line-for-line
- **IDIOM** — differs only as a Vue→React / VitePress→One translation, same observable behavior
- **ADAPTED** — architecture forced a different mechanism with the same outcome (each one justified)
- **DELTA** — a real divergence (see the Divergence Register — the only list that matters day-to-day)

Audited 2026-07-02 against `docs/.vitepress` @ fmhy/edit 2026-07-01 sync.
Re-audit trigger: any sync that touches `docs/.vitepress/theme/components/VPLocalSearchBox.vue`,
`docs/.vitepress/theme/composables/searchScroll.ts`, or the search blocks of
`docs/.vitepress/constants.ts` / `shared.ts` (`git log -p <sync-commit> -- <those paths>`).

## File inventory

| Theirs | Lines | Ours | Lines |
|---|---|---|---|
| `theme/components/VPLocalSearchBox.vue` script (1–1638) | engine + interaction | `site/src/features/wiki/useWikiSearch.ts` + interaction half of `WikiSearchModal.tsx` | 696 + ~600 |
| same file, template (1640–1985) | markup | render half of `WikiSearchModal.tsx` | ~370 |
| same file, styles (1987–2759) | scoped CSS | `site/src/features/wiki/search.css` | 1006 |
| `theme/composables/searchScroll.ts` (498) | post-nav scroll+flash | `site/src/features/wiki/searchHighlight.ts` (217–498) | port |
| `theme/composables/sanitize.ts` (38) | DOMPurify wrappers | build-time escaping in `scripts/wiki/generate.ts` | ADAPTED |
| `constants.ts` search block (27–370) | index build (`_render`, `_splitIntoSections`, `extractLinkMetadata`, `stripNoteBlocks`, tokenize/processTerm, `boostDocument`) | `scripts/wiki/generate.ts` corpus/excerpt section + tokenizer copies in `useWikiSearch.ts` | port |
| `shared.ts` `excluded[]` + `search.options` | config | hardcoded equivalents (detailed default ON, persistence ON) + generator exclusions | MATCH |
| mark.js (dep) | DOM marking | `searchHighlight.ts` 1–215 (markRegExpIn/unmarkAll) | ADAPTED¹ |
| `@localSearchIndexroot` virtual module | serialized index | `/data/search-corpus.json` (docs + customMetadata), MiniSearch built client-side | ADAPTED² |
| client page-component mounting for excerpts (`fetchExcerpt`/`processExcerpts`, .vue 991–1094) | anchor→HTML harvesting | build-time `/data/excerpts/<page>.json` via `entryHtml`/`containerSearchParts` | ADAPTED³ |

¹ mark.js is DOM-only; the port keeps identical semantics (`data-markjs` attr, acrossElements:false, exclude selectors) without the web-only dep (RN constraint).
² Same MiniSearch options; theirs pre-serializes at build, ours indexes the fetched corpus once per session (module singleton). Same tokenizer both sides → same index.
³ Theirs mounts the Vue page component client-side and slices heading-to-heading HTML; we have no Vue pages, so the generator renders the same per-anchor HTML at build time from the structured data, including the note-block exclusion both sides apply.

## Feature matrix

### A. Index build
| Feature | Theirs | Ours | Verdict |
|---|---|---|---|
| Section-level docs `{id: page#anchor, title, titles, text}` | `_splitIntoSections` | `buildWikiPageSearch`/prose builder | MATCH |
| Breadcrumb `titles` with sidebar page title (emoji) prepended when ≠ h1 | client `findPageTitle` at query time | baked at build (`SEARCH_PAGE_TITLES`) | IDIOM |
| Curated-link metadata `{l, s}` per section (starred-bold → `s`) | `extractLinkMetadata` over HTML | `entryLinkPhrases`/`registerMetadata` over structured entries | MATCH |
| Note/infobox content excluded from index text | `stripNoteBlocks` | `block.kind === 'notice'` skip | MATCH |
| `<Tooltip>` note content excluded | regex strip in `_render` | `link.noteId` skip | MATCH |
| `<!-- search-exclude -->` spans dropped | `_render` | generator (incl. recently-removed re-parse) | MATCH |
| Exclusions: readme, single-page, feedback, index, sandbox, startpage | `shared.excluded` | generator emits none of these | MATCH |
| Posts indexed only if < 60 days old | `_render` date check | generator date check | MATCH |
| `other/*` indexed (and downranked at query time) | yes | yes | MATCH |
| tokenize / processTerm (split regex, stop words, min len 2, dot-trim, dotted-split on `text` field only) | `constants.ts` | verbatim copies | MATCH |
| Page-lead docs (h1 section: page title + description text) | h1 sections emitted | **missing for wiki pages** (prose pages have lead docs) | **DELTA D3** |

### B. Query pipeline (engine)
| Feature | Theirs (.vue) | Ours | Verdict |
|---|---|---|---|
| Constants: page size 16, debounce 350ms, fuzzy 0.2, max-in-memory 200, substring cap 100, recents 20, suggestions 3, candidate pool ≥32 | 4–13 | `useWikiSearch.ts` 18–25 | MATCH |
| MiniSearch searchOptions (AND, prefix, boosts 4/2/1, fuzzy off) | 215–225 | 162–168 | MATCH |
| `boostDocument`: title-match boost `10000 − titleIndex`; `/posts` & `/other` ×0.1 | constants.ts 345+ | 128–150 | MATCH |
| Debounced search watcher, cancel-on-supersede | 424–635 | effect + generation counter | IDIOM |
| Fuzzy structured query (words AND + dashed-join, OR) | 462–482 | 237–249 | MATCH |
| Exact-mode substring/suffix expansion over index term keys (len>2, shortest-first, cap 100, OR) | 489–507 | 252–266 | MATCH |
| 6-tier boost sort (starredExact→exact→starredPrefix→prefix→starredWord→linkWord→score) | 538–619 | 280–328 | MATCH |
| Detailed+exact: candidate pool (max(32, 2×limit)), contiguous-phrase `filterResults`, `mayHaveMore` `+` | 675–703, 1096–1117 | 386–446 | MATCH |
| Fuzzy/substring path: slice to limit, total = shown + remainder | 704–727 | 448–460 | MATCH |
| autoSuggest (fuzzy len≥5?2:1, prefix; sort prefix > starred-link > link > score; single-word; ≠query; top 3) | 311–353 | 467–507 | MATCH |
| Results/marks state survives close/reopen | module-scope `global*` refs + `matchesGlobalState` skip | modal stays mounted; React state persists | IDIOM |
| Query in sessionStorage; fuzzy/detailed/recents in localStorage; detailed defaults ON | vueuse storages + theme config | our storage helpers, same semantics | MATCH |

### C. Marking & match navigation
| Feature | Theirs | Ours | Verdict |
|---|---|---|---|
| `formMarkRegex` (longest-first alternation; exact adds raw query; fuzzy adds matched terms + words) | 1568–1592 | `searchHighlight.ts` 15–37 | MATCH |
| Mark titles + excerpts, exclude `.title-icon` | mark.js markRegExp | `markRegExpIn` TreeWalker | ADAPTED¹ |
| unmark → remark on every result-set change | watcher 2 | marking effect | MATCH |
| Fuzzy `mergeNearbyMarks` (same line <5px, gap <20px) | 840–892 | 150–193 | MATCH |
| `groupMarks` (same parent, ≤20 chars non-word between) | 1534–1566 | 112–144 | MATCH |
| Excerpt auto-scroll centering first mark (batch read→write) | 769–790 | marking effect 236–255 | MATCH |
| `current` (gold) mark group per result; moves on select/cycle; smooth-centered | 899–964, 1187–1217 | selection effect + `cycleMatch` | MATCH |
| Keyboard-only excerpt smooth-scroll (`isKeyboardAction`) | 1149, 1196–1215 | `isKeyboardAction` ref | MATCH |
| ‹ N/M › pill shown when >1 group, fade transition | template + `.match-actions-fade` | `markGroups > 1` + CSS | MATCH |

### D. Interaction & keyboard
All exact ports (`WikiSearchModal.tsx` 439–556): ArrowUp/Down wrap with input↔list focus dance; Enter falls back to first result, saves recent, ignores non-submit buttons and composition; Escape closes; ArrowLeft/Right hijack only at caret start/end (modifiers force, shift-right passes), else cycle matches when detailed+marks; `event.repeat` ignored; `disableMouseOver` until a real mousemove (position compared); mouseenter/focus selects; click navigates unless meta/ctrl/shift/middle; pointer-up on the bar refocuses (mouse only); selection follows result identity across show-more (kept) vs new search (reset to −1). Input attributes (`maxlength=64`, `type=search`, `enterkeyhint=go`, autocap/complete/correct/spellcheck off) — MATCH.

### E. Open/close & chrome
Backdrop click closes; body scroll lock (ADAPTED: html+body inline overflow because our page scroller is `html`); focus trap (ADAPTED: native Tab-cycling port of focus-trap's behavior, verified against the production bundle) with focus restore; `pushState(null)` on open + popstate close, entry deliberately left stranded on non-popstate close (matches bundle); enter/leave animation (150ms in / 100ms reverse, same keyframes & bezier); ARIA (`role=button` wrapper + `aria-haspopup=listbox` + `aria-activedescendant` + `role=option`/`aria-selected`) — all MATCH per the bundle-verified pattern. Recents chips with per-item delete + Clear all; "Try fuzzy search?" + "Did you mean:" pills; "Showing X of Y(+) matches" dashed info row; "Show more results (N remaining)"; kbd footer (↑↓/↵/←→ when detailed/esc) — MATCH.

### F. Navigate-to-result & post-nav scroll (`searchScroll.ts` port)
| Feature | Theirs | Ours | Verdict |
|---|---|---|---|
| `getMatchContext` (li/p/td/dd/blockquote of active mark) | 1446–1457 | modal 371–380 | MATCH |
| Same-page: close, push `#hash`, delayed scroll (80ms desktop / 300ms mobile) | 1494–1507 | modal 399–408 | MATCH |
| Cross-page: navigate + path-guarded pending scroll | `pendingScrollQuery` consumed by router hook | `scheduleScrollToMatch(expectedPath)` at nav time | IDIOM |
| 5-pass match (context exact → containment(>10) → link text ⊆/⊇ → phrase → all words → any word); never the heading itself | 44–211 | 234–338 | MATCH |
| Section boundary = heading until next same-or-higher heading | compareDocumentPosition walk | scoped query on our nested section wrapper | ADAPTED (equivalent containment) |
| Instant scroll w/ scrollBehavior override + double-rAF restore; target at nav + 18% of remaining viewport | 213–255 | 340–368 | MATCH |
| Flash: `.vp-search-highlight-target` outline 2s, reduced-motion + forced-colors variants | style.scss 411–447 | search.css 902–920 | MATCH |
| Poll 15×120ms after rAF+delay → MutationObserver fallback (50ms debounce, 5s safety), supersede via id | 297–461 | 406–498 | MATCH |
| Navbar lock during scroll (`html.vp-search-scrolling` freezes nav transform) | style.scss 559–562 + schedule | **missing** | **DELTA D1** |
| Dynamic navbar height (+ mobile local-nav height <960px) for scroll offset | `getNavbarHeight` 468–498 | constant 56 | **DELTA D2** |
| `onBeforeScroll`/`onComplete` (restore router-hijacked scroll fns) | plumbing | dropped — our router never hijacks scroll functions | ADAPTED |

### G. Sanitization
Theirs DOMPurifies titles (`sanitizeSearchHtml`) and rich excerpts (`sanitizeRichHtml`) client-side.
Ours escapes ALL text/attributes at generation (`escapeHtml` in the generator; titles rendered via
`escapeHtml` then DOM-marked), so no unsanitized HTML ever reaches `innerHTML`. ADAPTED — equal
posture, no web-only dep. If excerpt generation ever starts passing through raw upstream HTML,
add sanitization back at that boundary.

### H. Deliberate React-necessity additions (documented, not drift)
- `Excerpt` owns its `innerHTML` imperatively with an applied-html guard — React 19 re-commits
  `dangerouslySetInnerHTML` on subtree reappear, which erased marks (root-caused via instrumented
  `innerHTML` setter). Vue never re-renders that node, so upstream needs no equivalent.
- Generator `relinkifyDescription`: our parser flattens inline description links into text +
  separate sublinks; excerpts re-linkify them so rows render single inline anchors like the
  real page (upstream renders the original markdown, so it never has this problem).

## Divergence register (every known non-idiom delta)

| # | Delta | Impact | Fix |
|---|---|---|---|
| D1 | No `vp-search-scrolling` navbar lock during post-nav scroll | Mobile hide-on-scroll header can animate away during the programmatic jump | Toggle the class in `scheduleScrollToMatch`; CSS freezes the header transform |
| D2 | Scroll offset uses constant 56px; ignores the mobile LocalNav bar | Match lands ~48px too high under the sticky local-nav on <1024px | Port `getNavbarHeight`: 56 + LocalNav height when visible |
| D3 | No page-lead search docs for wiki pages (h1 + description text) | Queries matching a page description (e.g. "chatbots") miss the page-level result fmhy.net returns | Emit one lead doc per wiki page: `{id: route, title: page.title, titles: [sidebarTitle], text: description}` |
| — | Match totals differ for the same query (e.g. adblock 62 vs 40) | Superset: we index recently-removed + more current posts than their static bundle snapshot | None — content, not behavior |

Fixed earlier this session (kept for the record): excerpt mark wipe (React reappear), inline
description-link duplication, detailed-view default, hover/preload perf work.

## Known upstream features intentionally without an equivalent
- Locale/translation plumbing (`createSearchTranslate`, `localeIndex`) — single-locale site; strings hardcoded to the same defaults.
- HMR index hot-swap (`import.meta.hot`) — dev nicety, One HMR reloads the module instead.
- `disableQueryPersistence` / `disableDetailedView` config branches — fmhy.net ships them off/on respectively; we hardcode those outcomes.
- Vue page-component mounting for excerpts — replaced at build time (see ³).
