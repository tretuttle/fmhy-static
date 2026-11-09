---------------------------- MODULE SearchModalOpen ----------------------------
(***************************************************************************)
(* The search modal's open / close lifecycle and where the keyboard focus *)
(* lands, as React runs it.                                                *)
(*                                                                         *)
(* Code: site/src/features/wiki/WikiSearchModal.tsx                       *)
(*   WikiSearchModal  - hasOpenedOnce, visible, leaving, visibleRef and   *)
(*                      the [open] effect with the 100 ms leave timeout   *)
(*   SearchBox        - the [open, focusSearchInput] effect: focus +      *)
(*                      select the input; its cleanup restores the focus  *)
(*                      that was there before (previouslyFocused)         *)
(*                      style={{ display: open || visible ? 'flex' :     *)
(*                      'none' }}                                         *)
(* site/src/features/wiki/searchModal.ts - openSearch / closeSearch        *)
(*   emit on a useSyncExternalStore emitter (site/src/lib/emitter.ts).     *)
(*                                                                         *)
(* One step = one indivisible thing in the browser:                       *)
(*   YouOpen / YouClose  the emitter flips `open` (no render yet).         *)
(*   Commit              React renders the current state, commits the DOM *)
(*                       and runs the passive effects whose deps changed, *)
(*                       children before parents. setState calls inside  *)
(*                       those effects queue another Commit (`due`).      *)
(*   LeaveTimerFires     the 100 ms setTimeout callback and its render.   *)
(* Assumption: React flushes a commit, its effects and the re-renders     *)
(* they queue before the next user event or timer (discrete events run   *)
(* at sync priority), so user and timer steps wait while a commit is due. *)
(***************************************************************************)

VARIABLES
  open,          \* searchOpenEmitter value (useSearchOpen)
  openSeen,      \* value of `open` at the last commit: effects with [open] deps run when it differs
  hasOpenedOnce, \* WikiSearchModal state: SearchBox is rendered once this is TRUE
  mounted,       \* SearchBox has mounted (it never unmounts afterwards)
  visible,       \* WikiSearchModal state (+ visibleRef): display flex (TRUE) or none (FALSE)
  leaving,       \* WikiSearchModal state: .vpl-leaving fade-out class
  timer,         \* the LEAVE_DURATION_MS setTimeout: "off" | "armed"
  focus,         \* document.activeElement: "input" (#localsearch-input) | "page" (anything else)
  locked,        \* html/body style.overflow = 'hidden' (page scroll lock)
  due            \* a setState from an effect has queued another commit

vars == <<open, openSeen, hasOpenedOnce, mounted, visible, leaving, timer, focus, locked, due>>

Settled == open = openSeen /\ ~due

Init ==
  /\ open = FALSE
  /\ openSeen = FALSE
  /\ hasOpenedOnce = FALSE
  /\ mounted = FALSE
  /\ visible = FALSE
  /\ leaving = FALSE
  /\ timer = "off"
  /\ focus = "page"
  /\ locked = FALSE
  /\ due = FALSE

\* openSearch(): Ctrl/Cmd+K (toggleSearch while closed), "/", a header search
\* button, or a ?q= link on first load (useSearchFromQuery). Emitting TRUE while
\* already open changes nothing, so it is not a step.
YouOpen ==
  /\ Settled
  /\ open = FALSE
  /\ open' = TRUE
  /\ UNCHANGED <<openSeen, hasOpenedOnce, mounted, visible, leaving, timer, focus, locked, due>>

\* closeSearch(): Esc (SearchBox keydown and SearchHotkey), backdrop click, the
\* back button, browser back (popstate), Ctrl/Cmd+K (toggleSearch), or picking a
\* result (navigateToResult).
YouClose ==
  /\ Settled
  /\ open = TRUE
  /\ open' = FALSE
  /\ UNCHANGED <<openSeen, hasOpenedOnce, mounted, visible, leaving, timer, focus, locked, due>>

\* One React commit. The DOM shows display = `open \/ visible` as rendered
\* NOW, i.e. before the effects below update `visible`.
Commit ==
  /\ ~Settled
  /\ LET openChanged == open # openSeen
         mountNow    == hasOpenedOnce /\ ~mounted
         \* SearchBox [open] effect: runs on mount when open, or when open changed
         childRuns   == (mounted /\ openChanged) \/ (mountNow /\ open)
         \* open: focusSearchInput() - this commit rendered display:flex
         \* close: cleanup restores previouslyFocused
         focus1      == IF ~childRuns THEN focus
                        ELSE IF open THEN "input"
                        ELSE "page"
         \* open: overflow = 'hidden'; close: cleanup restores the saved values
         locked1     == IF ~childRuns THEN locked ELSE open
         \* WikiSearchModal [open] effect (runs after the child's)
         openRun     == openChanged /\ open
         closeRun    == openChanged /\ ~open /\ visible   \* `if (!visibleRef.current) return`
         hoo1        == IF openRun THEN TRUE ELSE hasOpenedOnce
         vis1        == IF openRun THEN TRUE ELSE visible
         lv1         == IF openRun THEN FALSE ELSE IF closeRun THEN TRUE ELSE leaving
         \* re-running the effect on open runs the old cleanup: clearTimeout
         tm1         == IF openRun THEN "off" ELSE IF closeRun THEN "armed" ELSE timer
     IN /\ focus' = focus1
        /\ locked' = locked1
        /\ hasOpenedOnce' = hoo1
        /\ visible' = vis1
        /\ leaving' = lv1
        /\ timer' = tm1
        /\ due' = (hoo1 # hasOpenedOnce \/ vis1 # visible \/ lv1 # leaving)
        /\ mounted' = (mounted \/ mountNow)
        /\ openSeen' = open
  /\ UNCHANGED open

\* setTimeout(..., LEAVE_DURATION_MS): setVisible(false), visibleRef = false,
\* setLeaving(false). No effect depends on these, so its render is part of it.
LeaveTimerFires ==
  /\ Settled
  /\ timer = "armed"
  /\ visible' = FALSE
  /\ leaving' = FALSE
  /\ timer' = "off"
  /\ UNCHANGED <<open, openSeen, hasOpenedOnce, mounted, focus, locked, due>>

Next == YouOpen \/ YouClose \/ Commit \/ LeaveTimerFires

Spec == Init /\ [][Next]_vars

TypeOK ==
  /\ open \in BOOLEAN /\ openSeen \in BOOLEAN /\ hasOpenedOnce \in BOOLEAN
  /\ mounted \in BOOLEAN /\ visible \in BOOLEAN /\ leaving \in BOOLEAN
  /\ timer \in {"off", "armed"} /\ focus \in {"input", "page"}
  /\ locked \in BOOLEAN /\ due \in BOOLEAN

(* Rule: once it has finished rendering, an open search box is on screen *)
(* (not hidden, not fading out).                                         *)
BoxShownWhileOpen ==
  (Settled /\ open) => (visible /\ ~leaving)

(* Rule: the page behind is scroll-locked while search is open, and      *)
(* scrolls again once search closes.                                     *)
ScrollLockedOnlyWhileOpen ==
  Settled => (locked = open)

(* Rule: whenever the search box is open and has finished rendering, the *)
(* cursor is in the search input. (The model has no step where the       *)
(* reader moves focus themselves, so this is about where opening puts    *)
(* it.)                                                                  *)
FocusInBoxWhenOpen ==
  (Settled /\ open) => focus = "input"
=============================================================================
