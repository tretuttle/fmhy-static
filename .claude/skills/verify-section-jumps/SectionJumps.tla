---------------------------- MODULE SectionJumps ----------------------------
(***************************************************************************)
(* "Jump to a section" scroll ownership in site/ (fmhy-static).            *)
(*                                                                         *)
(* Who may scroll the page, and who may freeze the mobile header, when a   *)
(* reader jumps to a section (TOC / "On this page" / sidebar row / #hash) *)
(* or picks a search result that scrolls to the matched line.             *)
(*                                                                         *)
(* Every action is one JavaScript callback (one macrotask / rAF callback): *)
(* the browser runs it to the end before anything else runs.  The code    *)
(* each action stands for is named above it; SKILL.md has the full map.    *)
(***************************************************************************)
EXTENDS Integers, FiniteSets

\* How many navigation requests the reader makes in one run.
CONSTANT MaxReq

\* Two wiki pages are enough: "this page" and "another page".
Other(p) == IF p = "A" THEN "B" ELSE "A"

\* scrolledFor value when the page was scrolled to no request's target:
\* One's router's single pre-settle hash scroll, the browser's native #hash
\* jump, or a stale jump measuring a detached element.
OffTarget == -1

VARIABLES
  path,        \* window.location.pathname (a page)
  visit,       \* bumps on every route change: a section element from an
               \* older visit is detached (el.isConnected = false)
  atTop,       \* the page on screen sits at scrollY 0 (router reset), as
               \* opposed to scrolled down (back/forward restore, hash scroll)
  req,         \* number of navigation requests the reader made; req is newest
  landable,    \* landable[r]: request r has a target the code can find
               \* (FALSE only for a search result whose match is missing)
  scrolledFor, \* the request whose target the page was last scrolled to
  activeJump,  \* scrollToAnchor.ts `activeJump`
  jumps,       \* scrollToAnchor() calls whose rAF loop or timers are pending
  navFreezes,  \* scrollOffset.ts `navFreezes`
  lock,        \* <html> has class vp-search-scrolling
  search,      \* the live scheduleScrollToMatch() op (older ones are stale)
  hashPoll,    \* watchHashNavigations settle poller: request id, 0 = none
  dropped,     \* history: the newest request's jump ended without scrolling
  wrongPage    \* history: a jump scrolled while another page was on screen

vars == <<path, visit, atTop, req, landable, scrolledFor, activeJump, jumps,
          navFreezes, lock, search, hashPoll, dropped, wrongPage>>

NoSearch == [phase |-> "idle", req |-> 0, path |-> "A", visit |-> 0,
             findable |-> TRUE]

Init ==
  /\ path = "A"
  /\ visit = 0
  /\ atTop = TRUE
  /\ req = 0
  /\ landable = [r \in 0..MaxReq |-> TRUE]
  /\ scrolledFor = 0
  /\ activeJump = 0
  /\ jumps = {}
  /\ navFreezes = 0
  /\ lock = FALSE
  /\ search = NoSearch
  /\ hashPoll = 0
  /\ dropped = FALSE
  /\ wrongPage = FALSE

(***************************************************************************)
(* Helpers                                                                 *)
(***************************************************************************)

\* A jump record is finished once its rAF loop stopped and its last timer ran.
Update(j, k) ==
  IF k.loop = "off" /\ k.timer = "fired"
    THEN jumps \ {j}
    ELSE (jumps \ {j}) \cup {k}

\* scrollToAnchor.ts: superseded = () => jump !== activeJump || isSearchScrolling()
Superseded(j) == j.gen # activeJump \/ lock

\* scrollToAnchor(id): the element exists. freezeMobileNav(); ++activeJump;
\* the first step() runs synchronously inside the call: it scrolls unless
\* superseded() already holds (search lock), in which case the loop never
\* reschedules. Both 600ms/700ms timers are armed either way.
StartJump(r) ==
  /\ navFreezes' = navFreezes + 1
  /\ activeJump' = activeJump + 1
  /\ jumps' = jumps \cup {[gen      |-> activeJump + 1,
                           req      |-> r,
                           visit    |-> visit,
                           loop     |-> IF lock THEN "off" ELSE "on",
                           timer    |-> "late",
                           scrolled |-> ~lock]}
  /\ scrolledFor' = IF lock THEN scrolledFor ELSE r

CanAsk == req < MaxReq

(***************************************************************************)
(* The reader                                                              *)
(***************************************************************************)

\* WikiToc tocScrollTo / LocalNav onLinkPress / a WikiSidebar row whose
\* page#hash is this page: scrollToAnchor(id) (updateHash: replaceState).
YouTapAHeading ==
  /\ CanAsk
  /\ req' = req + 1
  /\ StartJump(req + 1)
  /\ UNCHANGED <<path, visit, atTop, landable, lock, search, hashPoll,
                 dropped, wrongPage>>

\* watchHashNavigations onHashChange: an edited address bar, a plain in-page
\* <a href="#x">, back/forward between anchors. The browser's native jump
\* lands off; then `if (isSearchScrolling() ...) return` or scrollToAnchor.
\* This listener never retries, so under the lock the request is over.
YouChangeTheHash ==
  /\ CanAsk
  /\ req' = req + 1
  /\ IF lock
       THEN /\ scrolledFor' = OffTarget
            /\ dropped' = TRUE
            /\ UNCHANGED <<activeJump, jumps, navFreezes>>
       ELSE /\ StartJump(req + 1)
            /\ UNCHANGED dropped
  /\ UNCHANGED <<path, visit, atTop, landable, lock, search, hashPoll, wrongPage>>

\* A link or sidebar row to otherPage#section: router.navigate. One scrolls
\* to the hash once, before content-visibility sections settle (lands off);
\* routerStore.subscribeToRootState arms the watchHashNavigations poller.
YouOpenASectionOnAnotherPage ==
  /\ CanAsk
  /\ req' = req + 1
  /\ path' = Other(path)
  /\ visit' = visit + 1
  /\ atTop' = FALSE
  /\ scrolledFor' = OffTarget
  /\ hashPoll' = req + 1
  /\ UNCHANGED <<landable, activeJump, jumps, navFreezes, lock, search,
                 dropped, wrongPage>>

\* A plain link to another page (the router puts it at the top) or
\* back/forward to it (the browser restores a scrolled-down position).
\* The router state change clears the watchHashNavigations poll timer.
YouOpenAnotherPage ==
  /\ CanAsk
  /\ req' = req + 1
  /\ path' = Other(path)
  /\ visit' = visit + 1
  /\ atTop' \in BOOLEAN
  /\ scrolledFor' = req + 1
  /\ hashPoll' = 0
  /\ UNCHANGED <<landable, activeJump, jumps, navFreezes, lock, search,
                 dropped, wrongPage>>

\* WikiSearchModal navigateToResult: cancelPendingScroll() (an older search
\* op goes stale), then either same page (pushState, no scroll) or
\* router.navigate(page#hash) (route change, the router's one-shot hash
\* scroll; the new watchHashNavigations poll sees the lock and returns, so
\* it is not modelled), then scheduleScrollToMatch adds the lock class.
\* `findable`: findMatchInSection will find an element (FALSE when the
\* compact view passes no matchContext and no p/li/td/dd/blockquote holds a
\* query word, e.g. a fuzzy typo, or the hash id is missing).
YouPickASearchResult ==
  /\ CanAsk
  /\ req' = req + 1
  /\ \E samePage \in BOOLEAN, findable \in BOOLEAN :
       /\ path' = IF samePage THEN path ELSE Other(path)
       /\ visit' = IF samePage THEN visit ELSE visit + 1
       /\ atTop' = IF samePage THEN atTop ELSE FALSE
       /\ scrolledFor' = IF samePage THEN scrolledFor ELSE OffTarget
       /\ hashPoll' = IF samePage THEN hashPoll ELSE 0
       /\ landable' = [landable EXCEPT ![req + 1] = findable]
       /\ search' = [phase |-> "waiting", req |-> req + 1, path |-> path',
                     visit |-> 0, findable |-> findable]
  /\ lock' = TRUE
  /\ UNCHANGED <<activeJump, jumps, navFreezes, dropped, wrongPage>>

(***************************************************************************)
(* searchHighlight.ts scheduleScrollToMatch                                *)
(***************************************************************************)

\* poll()/observer -> tryScroll(): isSamePath(expectedPath) (or, same-page,
\* getElementById(hash) on whatever page is shown; section ids are assumed
\* unique to their page) -> findMatchInSection -> landOnMatch's first step.
\* Timing: the first poll runs >= 96ms after the pick (rAF + initialDelay
\* 80/150/300ms), and a running settle loop steps every 2 frames (~33ms), so
\* every loop has already seen the lock and stopped (`loop` off) by then.
SearchFindsTheMatch ==
  /\ search.phase = "waiting"
  /\ \A j \in jumps : j.loop = "off"
  /\ search.findable
  /\ search.path = path
  /\ search' = [search EXCEPT !.phase = "landing", !.visit = visit]
  /\ scrolledFor' = search.req
  /\ UNCHANGED <<path, visit, atTop, req, landable, activeJump, jumps,
                 navFreezes, lock, hashPoll, dropped, wrongPage>>

\* landOnMatch step(): `!el.isConnected` -> finish(); else scroll to the
\* match and either loop again or finish() (stable / 40 attempts).
SearchLandingStep ==
  /\ search.phase = "landing"
  /\ IF search.visit = visit
       THEN /\ scrolledFor' = search.req
            /\ \E finish \in BOOLEAN :
                 search' = IF finish THEN [search EXCEPT !.phase = "unlocking"]
                                     ELSE search
       ELSE /\ search' = [search EXCEPT !.phase = "unlocking"]
            /\ UNCHANGED scrolledFor
  /\ UNCHANGED <<path, visit, atTop, req, landable, activeJump, jumps,
                 navFreezes, lock, hashPoll, dropped, wrongPage>>

\* onDone -> setTimeout(unlock, 100): the live op removes the lock class.
SearchUnlocks ==
  /\ search.phase = "unlocking"
  /\ lock' = FALSE
  /\ search' = NoSearch
  /\ UNCHANGED <<path, visit, atTop, req, landable, scrolledFor, activeJump,
                 jumps, navFreezes, hashPoll, dropped, wrongPage>>

\* 15 polls x 120ms find nothing, then the observer's 5s safety timer calls
\* unlock(): about 7s after the pick. Only when the match cannot be found
\* (assumes the destination page renders within that time).
SearchGivesUp ==
  /\ search.phase = "waiting"
  /\ ~(search.findable /\ search.path = path)
  /\ lock' = FALSE
  /\ search' = NoSearch
  /\ UNCHANGED <<path, visit, atTop, req, landable, scrolledFor, activeJump,
                 jumps, navFreezes, hashPoll, dropped, wrongPage>>

(***************************************************************************)
(* scrollToAnchor.ts                                                       *)
(***************************************************************************)

\* watchHashNavigations settle(): `if (isSearchScrolling()) return` (the
\* poll stops for good), else scrollToAnchor(id, {updateHash: false}).
\* The poll is cleared on every router state change, so its section belongs
\* to the page on screen.
HashPollFires ==
  /\ hashPoll # 0
  /\ hashPoll' = 0
  /\ IF lock
       THEN /\ dropped' = (dropped \/ hashPoll = req)
            /\ UNCHANGED <<activeJump, jumps, navFreezes, scrolledFor>>
       ELSE /\ StartJump(hashPoll)
            /\ UNCHANGED dropped
  /\ UNCHANGED <<path, visit, atTop, req, landable, lock, search, wrongPage>>

\* step() in the requestAnimationFrame x2 settle loop. No isConnected check:
\* a detached element measures getBoundingClientRect().top = 0, so the
\* target is scrollY minus its landing line and the loop scrolls the page on
\* screen upward, unless that page already sits at 0.
JumpSettleStep(j) ==
  /\ j.loop = "on"
  /\ IF Superseded(j)
       THEN /\ jumps' = Update(j, [j EXCEPT !.loop = "off"])
            /\ UNCHANGED <<scrolledFor, wrongPage>>
       ELSE \E more \in {"on", "off"} :
              IF j.visit = visit
                THEN /\ scrolledFor' = j.req
                     /\ jumps' = Update(j, [j EXCEPT !.loop = more, !.scrolled = TRUE])
                     /\ UNCHANGED wrongPage
                ELSE IF atTop
                  THEN /\ jumps' = Update(j, [j EXCEPT !.loop = more])
                       /\ UNCHANGED <<scrolledFor, wrongPage>>
                  ELSE /\ scrolledFor' = OffTarget
                       /\ wrongPage' = TRUE
                       /\ jumps' = Update(j, [j EXCEPT !.loop = more])
  /\ UNCHANGED <<path, visit, atTop, req, landable, activeJump, navFreezes,
                 lock, search, hashPoll, dropped>>

\* setTimeout(..., 600): `if (el.isConnected && !superseded())` re-measure
\* and scroll to the target (a no-op when already there).
JumpLateCorrection(j) ==
  /\ j.timer = "late"
  /\ LET fires == j.visit = visit /\ ~Superseded(j) IN
       /\ scrolledFor' = IF fires THEN j.req ELSE scrolledFor
       /\ jumps' = Update(j, [j EXCEPT !.timer = "release",
                                       !.scrolled = j.scrolled \/ fires])
  /\ UNCHANGED <<path, visit, atTop, req, landable, activeJump, navFreezes,
                 lock, search, hashPoll, dropped, wrongPage>>

\* setTimeout(releaseNav, 100) inside the 600ms timer: navFreezes--.
\* After this nothing of the jump can scroll toward its own target again.
JumpReleasesHeader(j) ==
  /\ j.timer = "release"
  /\ navFreezes' = navFreezes - 1
  /\ jumps' = Update(j, [j EXCEPT !.timer = "fired"])
  /\ dropped' = (dropped \/ (~j.scrolled /\ j.req = req))
  /\ UNCHANGED <<path, visit, atTop, req, landable, scrolledFor, activeJump,
                 lock, search, hashPoll, wrongPage>>

\* Named wrappers so TLC's traces name the step, not `Next`.
AJumpSettleStep == \E j \in jumps : JumpSettleStep(j)
AJumpLateCorrection == \E j \in jumps : JumpLateCorrection(j)
AJumpReleasesHeader == \E j \in jumps : JumpReleasesHeader(j)

(***************************************************************************)

\* Some jump or search is still running: a rAF loop, a timer, or a poll.
Busy == jumps # {} \/ search.phase # "idle" \/ hashPoll # 0

\* The reader has made every request and everything has settled.
Done == ~Busy /\ req = MaxReq /\ UNCHANGED vars

Next ==
  \/ YouTapAHeading
  \/ YouChangeTheHash
  \/ YouOpenASectionOnAnotherPage
  \/ YouOpenAnotherPage
  \/ YouPickASearchResult
  \/ SearchFindsTheMatch
  \/ SearchLandingStep
  \/ SearchUnlocks
  \/ SearchGivesUp
  \/ HashPollFires
  \/ AJumpSettleStep
  \/ AJumpLateCorrection
  \/ AJumpReleasesHeader
  \/ Done

Spec == Init /\ [][Next]_vars

\* For the chart only (Chart.cfg): request ids, page visits and jump
\* generations matter only compared with the newest one, and the two pages
\* only compared with each other, so TLC may count states that agree on
\* those comparisons as one. The rules read the same in such states and
\* their futures match, so the verdicts do not change; check.sh runs
\* without this VIEW.
JumpView(j) == [cur |-> j.gen = activeJump, newest |-> j.req = req,
                here |-> j.visit = visit, loop |-> j.loop, timer |-> j.timer,
                scrolled |-> j.scrolled]
ChartView == <<atTop, req, landable[req], scrolledFor = req,
               scrolledFor = OffTarget, {JumpView(j) : j \in jumps},
               navFreezes, lock, search.phase, search.req = req,
               search.path = path, search.visit = visit, search.findable,
               hashPoll = req, hashPoll = 0, dropped, wrongPage>>

(***************************************************************************)
(* Rules (INVARIANTS). The reader's sentence is above each.                *)
(***************************************************************************)

TypeOK ==
  /\ path \in {"A", "B"}
  /\ req \in 0..MaxReq
  /\ navFreezes \in 0..MaxReq
  /\ lock \in BOOLEAN
  /\ search.phase \in {"idle", "waiting", "landing", "unlocking"}

\* "Once everything settles, the page sits where my newest request sent it."
\* (Not asked of a search result whose match cannot be found.)
NewestRequestLands ==
  (~Busy /\ landable[req]) => scrolledFor = req

\* "A jump I ask for is never silently ignored." The newest request's jump
\* must scroll at least once before it ends.
NoSilentDrop == ~dropped

\* "Once no jump is running, the mobile header hides and shows again."
HeaderFreeOnceIdle == ~Busy => (navFreezes = 0 /\ ~lock)

\* "A jump never scrolls a page other than its own."
JumpStaysOnItsPage == ~wrongPage

=============================================================================
