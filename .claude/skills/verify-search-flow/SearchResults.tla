----------------------------- MODULE SearchResults -----------------------------
EXTENDS Sequences
(***************************************************************************)
(* The search engine behind the modal: lazy index load, debounced query,  *)
(* stage 2 (display results), spinner and "No results".                   *)
(*                                                                         *)
(* Code: site/src/features/wiki/useWikiSearch.ts                           *)
(*   getSearchEngine   enginePromise ??= loadSearchCorpus().then(...);    *)
(*                     a rejection sets enginePromise = null              *)
(*   useWikiSearch     effects, run in declaration order in a commit:     *)
(*     warm-up         getSearchEngine() on mount                         *)
(*     immediate       [query, fuzzy, urlSearch]: setEnableNoResults(false)*)
(*                     and setSearchFailed(false)                         *)
(*     debounced       [query, fuzzy, urlSearch]: empty query ->          *)
(*                     setAllResults([]), setIsSearching(false); else     *)
(*                     setIsSearching(true) + setTimeout(350 ms) -> await *)
(*                     getSearchEngine().catch(() => null) -> searchGen   *)
(*                     check -> runSearch -> setAllResults,               *)
(*                     setEnableNoResults(true); engine null ->           *)
(*                     setAllResults([]), setIsSearching(false),          *)
(*                     setSearchFailed(true)                              *)
(*     stage 2         [allResults, resultLimit, detailedView,            *)
(*                     activeCategory, enableNoResults, fuzzy,            *)
(*                     usedSubstring]: stageGen++; empty -> setResults([])*)
(*                     and setIsSearching(prev => enableNoResults ? false *)
(*                     : prev) (query empty: false), synchronously;       *)
(*                     non-empty -> async buildDisplayResults (excerpt    *)
(*                     fetch), stageGen check, setResults,                *)
(*                     setIsSearching(false)                              *)
(* site/src/features/wiki/data.ts  fetchData: clientFetches deletes a    *)
(*   path whose fetch rejects, so the next load requests it again.        *)
(* site/src/features/wiki/WikiSearchModal.tsx  showNoResults =            *)
(*   !!query && !hasResults && !isSearching && enableNoResults; the       *)
(*   "Search could not load" row renders when searchFailed.               *)
(*                                                                         *)
(* SearchBox (and so this hook) mounts on the first open and never        *)
(* unmounts (hasOpenedOnce), so closing the modal does not touch any of   *)
(* this state; the model starts at that first mount.                      *)
(*                                                                         *)
(* One step = one event plus the React commits it causes: the commit that *)
(* runs the effects above, and the re-render their setState calls queue   *)
(* (React flushes both before the next paint, event, timer or network     *)
(* callback). Stage 2's async half is its own step (Stage2Lands).         *)
(*                                                                         *)
(* Abstractions:                                                          *)
(*  - Queries: "" (empty box), "A" (has matches), "B" (no matches).       *)
(*    A result list is tagged with the query and mode it was computed     *)
(*    for: "A=" exact, "A~" fuzzy; "none" is an empty list.               *)
(*  - Stage 2's contiguous-phrase filter keeps a non-empty hit list       *)
(*    non-empty.                                                          *)
(*  - The network is up or down; it can come back, not drop again. The   *)
(*    corpus fetch fails exactly when the network is down (or a rejected  *)
(*    fetch is still cached, which the code no longer allows).            *)
(***************************************************************************)

Queries == {"", "A", "B"}
HasHits(q) == q = "A"
Tag(q, f) == IF HasHits(q) THEN q \o (IF f THEN "~" ELSE "=") ELSE "none"

VARIABLES
  query,            \* input value (useWikiSearch `query`)
  fuzzy,            \* fuzzy mode toggle
  hits,             \* allResults, tagged with what it was computed for
  results,          \* displayed `results`, tagged the same way
  isSearching,      \* spinner
  enableNoResults,  \* gate for the "No results for ..." row
  searchFailed,     \* gate for the "Search could not load" row
  deb,              \* debounced search: "idle" | "timer" (armed) | "awaiting" (awaiting getSearchEngine)
  s2,               \* stage 2 async half: "idle" | "fetching"
  engine,           \* enginePromise: "idle" (null) | "loading" | "ready"
  corpus,           \* clientFetches['/data/search-corpus.json']: "clear" | "rejected"
                    \* (kept so a break of either cache is a one-line edit)
  net,              \* "up" | "down"
  lastSearch        \* ghost (not in the code): how the debounced search for the
                    \* current query and mode ended: "none" (not yet) | "ok" |
                    \* "failed" (the load failed while offline) | "replayed"
                    \* (failed while online: the old failure was replayed)

vars == <<query, fuzzy, hits, results, isSearching, enableNoResults, searchFailed,
          deb, s2, engine, corpus, net, lastSearch>>

\* Init = SearchBox's first mount: the warm-up effect has started the load.
\* The query comes from sessionStorage (a ?q= link primes it). On mount every
\* effect runs: the debounced one arms its timer for a non-empty query, stage 2
\* takes the empty branch with enableNoResults FALSE (isSearching unchanged).
Init ==
  /\ query \in {"", "A"}
  /\ fuzzy \in BOOLEAN
  /\ hits = "none"
  /\ results = "none"
  /\ isSearching = (query # "")
  /\ enableNoResults = FALSE
  /\ searchFailed = FALSE
  /\ deb = IF query # "" THEN "timer" ELSE "idle"
  /\ s2 = "idle"
  /\ engine = "loading"
  /\ corpus = "clear"
  /\ net \in {"up", "down"}
  /\ lastSearch = "none"

\* The stage 2 effect body, given the values its closure sees. `isS` is the
\* isSearching value queued before it in the same batch. Returns the new
\* <<results, isSearching, s2>>; a run bumps stageGen, cancelling an in-flight
\* async half.
Stage2(h, q, isS, eNR, res) ==
  IF h = "none"
  THEN <<"none", IF q # "" THEN (IF eNR THEN FALSE ELSE isS) ELSE FALSE, "idle">>
  ELSE <<res, isS, "fetching">>

\* A query or mode change. Commit 1 runs the immediate and debounced effects,
\* and the stage 2 effect only if one of its deps changed (fuzzy is one, query
\* is not) - with the pre-change allResults / enableNoResults. Commit 2 re-runs
\* stage 2 if commit 1's setState changed a stage 2 dep: enableNoResults
\* (TRUE -> FALSE) or allResults (setAllResults([]) for an empty query).
QueryOrModeChange(q, f) ==
  LET hits1 == IF q = "" THEN "none" ELSE hits
      isS1  == (q # "")
      c1    == IF f # fuzzy
               THEN Stage2(hits, q, isS1, enableNoResults, results)
               ELSE <<results, isS1, s2>>
      c2    == IF enableNoResults \/ q = ""
               THEN Stage2(hits1, q, c1[2], FALSE, c1[1])
               ELSE c1
  IN /\ query' = q
     /\ fuzzy' = f
     /\ deb' = IF q = "" THEN "idle" ELSE "timer"   \* old timer cleared / old callback dropped by searchGen
     /\ hits' = hits1
     /\ enableNoResults' = FALSE
     /\ searchFailed' = FALSE
     /\ results' = c2[1]
     /\ isSearching' = c2[2]
     /\ s2' = c2[3]
     /\ lastSearch' = "none"      \* ghost: a new search is now pending
     /\ UNCHANGED <<engine, corpus, net>>

YouType == \E q \in Queries \ {query} : QueryOrModeChange(q, fuzzy)

YouToggleFuzzy == QueryOrModeChange(query, ~fuzzy)

\* The debounced callback continues with the engine: runSearch, then the
\* commit that re-runs stage 2 (allResults is a new array).
SearchRuns ==
  LET out == Stage2(Tag(query, fuzzy), query, isSearching, TRUE, results)
  IN /\ hits' = Tag(query, fuzzy)
     /\ enableNoResults' = TRUE
     /\ UNCHANGED searchFailed
     /\ lastSearch' = "ok"
     /\ deb' = "idle"
     /\ results' = out[1] /\ isSearching' = out[2] /\ s2' = out[3]

\* ... or with null (getSearchEngine().catch(() => null)).
SearchGetsNoEngine(outcome) ==
  LET out == Stage2("none", query, FALSE, enableNoResults, results)
  IN /\ hits' = "none"
     /\ searchFailed' = TRUE
     /\ UNCHANGED enableNoResults
     /\ lastSearch' = outcome
     /\ deb' = "idle"
     /\ results' = out[1] /\ isSearching' = out[2] /\ s2' = out[3]

\* The 350 ms debounce timeout fires and awaits getSearchEngine(). After a
\* failed load enginePromise is null, so the call starts a new load.
DebounceFires ==
  /\ deb = "timer"
  /\ IF engine = "ready"
     THEN SearchRuns /\ UNCHANGED engine
     ELSE /\ deb' = "awaiting"
          /\ engine' = "loading"
          /\ UNCHANGED <<hits, results, isSearching, enableNoResults, searchFailed,
                         s2, lastSearch>>
  /\ UNCHANGED <<query, fuzzy, corpus, net>>

\* The corpus fetch settles: it succeeds when the network is up and
\* clientFetches holds no rejected promise for it. A search awaiting the
\* engine continues in the same task.
EngineLoads ==
  /\ engine = "loading"
  /\ net = "up" /\ corpus = "clear"
  /\ engine' = "ready"
  /\ IF deb = "awaiting" THEN SearchRuns
     ELSE UNCHANGED <<hits, results, isSearching, enableNoResults, searchFailed, deb, s2,
                      lastSearch>>
  /\ UNCHANGED <<query, fuzzy, corpus, net>>

EngineFails ==
  /\ engine = "loading"
  /\ ~(net = "up" /\ corpus = "clear")
  /\ engine' = "idle"      \* enginePromise = null
  /\ corpus' = "clear"     \* fetchData's catch deletes the clientFetches entry
  \* online, the only way to fail is a rejection still cached in clientFetches
  /\ IF deb = "awaiting" THEN SearchGetsNoEngine(IF net = "up" THEN "replayed" ELSE "failed")
     ELSE UNCHANGED <<hits, results, isSearching, enableNoResults, searchFailed, deb, s2,
                      lastSearch>>
  /\ UNCHANGED <<query, fuzzy, net>>

\* buildDisplayResults resolves and the stageGen check passes.
Stage2Lands ==
  /\ s2 = "fetching"
  /\ results' = hits
  /\ isSearching' = FALSE
  /\ s2' = "idle"
  /\ UNCHANGED <<query, fuzzy, hits, enableNoResults, searchFailed, deb, engine, corpus, net,
                 lastSearch>>

NetworkReturns ==
  /\ net = "down"
  /\ net' = "up"
  /\ UNCHANGED <<query, fuzzy, hits, results, isSearching, enableNoResults, searchFailed,
                 deb, s2, engine, corpus, lastSearch>>

Next ==
  \/ YouType \/ YouToggleFuzzy \/ DebounceFires
  \/ EngineLoads \/ EngineFails \/ Stage2Lands \/ NetworkReturns

Spec == Init /\ [][Next]_vars

TypeOK ==
  /\ query \in Queries /\ fuzzy \in BOOLEAN
  /\ hits \in {"none", "A=", "A~"} /\ results \in {"none", "A=", "A~"}
  /\ isSearching \in BOOLEAN /\ enableNoResults \in BOOLEAN /\ searchFailed \in BOOLEAN
  /\ deb \in {"idle", "timer", "awaiting"} /\ s2 \in {"idle", "fetching"}
  /\ engine \in {"idle", "loading", "ready"}
  /\ corpus \in {"clear", "rejected"} /\ net \in {"up", "down"}
  /\ lastSearch \in {"none", "ok", "failed", "replayed"}

(* Rule: an empty box lists nothing and shows no spinner.               *)
EmptyBoxShowsNothing == query = "" => (results = "none" /\ ~isSearching)

(* Rule: the spinner is on only while a search or its display work is   *)
(* still pending - it never spins forever.                               *)
SpinnerOnlyWhileWorking == isSearching => (deb # "idle" \/ s2 = "fetching")

ShowsNoResults == query # "" /\ results = "none" /\ ~isSearching /\ enableNoResults

(* Rule 1: "No results" is shown only after a search really ran against  *)
(* the loaded index - a failed load is never shown as "No results".      *)
FailureNotShownAsNoResults == ShowsNoResults => lastSearch = "ok"

(* Rule 2: after a temporary failure, a search made once the network is  *)
(* back is not failed by the old failure (cached in enginePromise or in  *)
(* clientFetches).                                                       *)
RetryAfterFailure == lastSearch # "replayed"

(* Rule 3: a search whose index load failed says so.                     *)
FailureShownAsFailure == lastSearch = "failed" => searchFailed

(* Rule 4: results listed without the spinner belong to the query and    *)
(* mode in the box.                                                      *)
ResultsMatchQuery == (~isSearching /\ results # "none") => results = Tag(query, fuzzy)
=============================================================================
