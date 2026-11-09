---------------------------- MODULE DeployPipeline ----------------------------
(***************************************************************************)
(* "An upstream change reaches the live mirror": the hourly deploy pipeline *)
(* of tretuttle/fmhy-static, as written in .github/workflows/deploy.yml     *)
(* plus the scripts its steps run. Every action names the workflow step or  *)
(* script it stands for. See SKILL.md for the coverage record.              *)
(*                                                                         *)
(* Commits are numbered: upstream fmhy/edit main is 0, 1, 2, ... and this   *)
(* repo's site code on main is 0, 1, ... A higher number is newer.          *)
(* Empty (-1) is the empty string a step writes when `git ls-remote` fails. *)
(***************************************************************************)
EXTENDS Integers

CONSTANTS
  MaxUp,      \* how many new fmhy/edit commits can land
  MaxSite,    \* how many site-code commits can land on this repo's main
  Flaky,      \* which outside calls and steps may fail (see Outcome / CanFail)
  CanDisable  \* whether someone (or GitHub's inactivity rule) can disable the workflow

Empty == -1

\* Steps of the `deploy` job, in workflow order. "sync" also stands for the
\* setup steps before it (checkout, setup-node, setup-bun, corepack, bun
\* install): any of them failing has the same effect, a red run at that point.
DeploySteps == {"sync", "upbuild", "parity", "build", "eas"}

\* An outside call either works or, when its name is in Flaky, may fail.
Outcome(k) == IF k \in Flaky THEN BOOLEAN ELSE {TRUE}
CanFail(step) == step \in Flaky

VARIABLES
  upHead,          \* fmhy/edit refs/heads/main
  siteHead,        \* this repo's main, site code (site/**) only
  record,          \* .github/last-deployed-upstream-sha on this repo's main
  recordBuilt,     \* the fmhy/edit commit the run that last wrote `record` actually deployed
  recordByDeploy,  \* the run that last wrote `record` had finished its EAS deploy
  live,            \* what EAS Hosting serves: [up, site, og, sp, parity]
  wentBack,        \* some deploy moved the live mirror to an older commit
  hourlyRedeploy,  \* the latest EAS deploy was a scheduled run re-shipping exactly what was live
  enabled,         \* the workflow is enabled (GitHub: Actions > Disable workflow)
  pending,         \* the run waiting in concurrency group `deploy` (at most one)
  phase,           \* where the running run is: "idle" | "check" | DeploySteps | "record"
  run,             \* the running run's values
  lastRun,         \* outcome of the last finished run: "none" | "skipped" | "shipped" | "red"
  stoppedAt,       \* the step a red run stopped at
  note,            \* what the red run's summary annotation says
  lastDeployed     \* the last finished run got past its EAS deploy

vars == <<upHead, siteHead, record, recordBuilt, recordByDeploy, live, wentBack,
          hourlyRedeploy, enabled, pending, phase, run, lastRun, stoppedAt, note,
          lastDeployed>>

NoPending == [event |-> "none", site |-> 0, recIn |-> 0]
NoRun == [event |-> "none", site |-> 0, recIn |-> 0, sha |-> 0, built |-> 0,
          parity |-> FALSE, og |-> FALSE, sp |-> FALSE, deployed |-> FALSE]

Init ==
  /\ upHead = 0
  /\ siteHead = 0
  /\ record = 0
  /\ recordBuilt = 0
  /\ recordByDeploy = TRUE
  /\ live = [up |-> 0, site |-> 0, og |-> TRUE, sp |-> TRUE, parity |-> TRUE]
  /\ wentBack = FALSE
  /\ hourlyRedeploy = FALSE
  /\ enabled = TRUE
  /\ pending = NoPending
  /\ phase = "idle"
  /\ run = NoRun
  /\ lastRun = "none"
  /\ stoppedAt = "none"
  /\ note = "none"
  /\ lastDeployed = FALSE

Bookkeeping == <<recordBuilt, recordByDeploy, wentBack, hourlyRedeploy, lastDeployed>>

-----------------------------------------------------------------------------
(* The world outside the workflow *)

\* someone merges to fmhy/edit main
UpstreamCommit ==
  /\ upHead < MaxUp
  /\ upHead' = upHead + 1
  /\ UNCHANGED <<siteHead, record, live, enabled, pending, phase, run, lastRun,
                 stoppedAt, note>>
  /\ UNCHANGED Bookkeeping

\* someone pushes site code to this repo's main (deploy.yml has no `push:` trigger)
SiteCommit ==
  /\ siteHead < MaxSite
  /\ siteHead' = siteHead + 1
  /\ UNCHANGED <<upHead, record, live, enabled, pending, phase, run, lastRun,
                 stoppedAt, note>>
  /\ UNCHANGED Bookkeeping

DisableWorkflow ==
  /\ CanDisable /\ enabled
  /\ enabled' = FALSE
  /\ UNCHANGED <<upHead, siteHead, record, live, pending, phase, run, lastRun,
                 stoppedAt, note>>
  /\ UNCHANGED Bookkeeping

EnableWorkflow ==
  /\ CanDisable /\ ~enabled
  /\ enabled' = TRUE
  /\ UNCHANGED <<upHead, siteHead, record, live, pending, phase, run, lastRun,
                 stoppedAt, note>>
  /\ UNCHANGED Bookkeeping

-----------------------------------------------------------------------------
(* Triggers and the concurrency group                                       *)
(* on: schedule '7 * * * *' and workflow_dispatch; concurrency: group deploy, *)
(* cancel-in-progress false. A new run's GITHUB_SHA is main at trigger time:  *)
(* that fixes its site code and the copy of the record file its checkout has. *)

Queue(ev) ==
  LET r == [event |-> ev, site |-> siteHead, recIn |-> record] IN
  /\ enabled
  /\ ~(phase = "idle" /\ pending.event # "none")   \* a waiting run starts first
  /\ IF phase = "idle"
       THEN /\ phase' = "check"
            /\ run' = [NoRun EXCEPT !.event = ev, !.site = siteHead, !.recIn = record]
            /\ UNCHANGED pending
       ELSE /\ pending' = r        \* replaces (cancels) any run already waiting
            /\ UNCHANGED <<phase, run>>
  /\ UNCHANGED <<upHead, siteHead, record, live, enabled, lastRun, stoppedAt, note>>
  /\ UNCHANGED Bookkeeping

HourlyTick == Queue("schedule")
ManualDispatch == Queue("dispatch")

StartWaitingRun ==
  /\ phase = "idle"
  /\ pending.event # "none"
  /\ phase' = "check"
  /\ run' = [NoRun EXCEPT !.event = pending.event, !.site = pending.site,
                          !.recIn = pending.recIn]
  /\ pending' = NoPending
  /\ UNCHANGED <<upHead, siteHead, record, live, enabled, lastRun, stoppedAt, note>>
  /\ UNCHANGED Bookkeeping

-----------------------------------------------------------------------------
(* Job `check`, step "Compare upstream HEAD to last deployed sha" (bash -e,  *)
(* no pipefail). `sha=$(git ls-remote ... | cut -f1)`: a failed ls-remote    *)
(* leaves sha="" because the pipeline's status is cut's. `last=$(gh api ...  *)
(* | base64 -d | tr -d '[:space:]' || echo "none")`: a failed gh api gives   *)
(* last="" for the same reason; `|| echo none` never runs. An empty record   *)
(* file also reads as "". changed = dispatch || sha != last.                 *)

CheckGate ==
  /\ phase = "check"
  /\ \E lsOk \in Outcome("lsremote"), apiOk \in Outcome("ghapi"):
       LET sha  == IF lsOk THEN upHead ELSE Empty
           last == IF apiOk THEN record ELSE Empty
       IN IF run.event = "dispatch" \/ sha # last
            THEN /\ phase' = "sync"
                 /\ run' = [run EXCEPT !.sha = sha]
                 /\ UNCHANGED <<lastRun, stoppedAt, note>>
            ELSE /\ phase' = "idle"            \* job `deploy` skipped: a green run
                 /\ run' = NoRun
                 /\ lastRun' = "skipped"
                 /\ stoppedAt' = "none"
                 /\ note' = "none"
  /\ lastDeployed' = FALSE
  /\ UNCHANGED <<upHead, siteHead, record, live, enabled, pending>>
  /\ UNCHANGED <<recordBuilt, recordByDeploy, wentBack, hourlyRedeploy>>

-----------------------------------------------------------------------------
(* Job `deploy` *)

\* "Sync fmhy/edit + regenerate": site/scripts/sync-fmhy.ts clones fmhy/edit
\* `--branch main` NOW (not the sha `check` resolved), then wiki/generate.ts and
\* convert-fmhy.ts regenerate the dataset from that clone.
Sync ==
  /\ phase = "sync"
  /\ phase' = "upbuild"
  /\ run' = [run EXCEPT !.built = upHead]
  /\ UNCHANGED <<upHead, siteHead, record, live, enabled, pending, lastRun, stoppedAt, note>>
  /\ UNCHANGED Bookkeeping

\* "Build upstream site (parity reference)": corepack pnpm docs:build in .fmhy-edit
UpstreamBuild ==
  /\ phase = "upbuild"
  /\ phase' = "parity"
  /\ UNCHANGED <<upHead, siteHead, record, live, enabled, pending, run, lastRun, stoppedAt, note>>
  /\ UNCHANGED Bookkeeping

\* "Parity check (ours vs theirs, same commit)": site/scripts/parity-check.ts,
\* exit 1 on any missing external link. Both sides come from the same clone.
Parity ==
  /\ phase = "parity"
  /\ phase' = "build"
  /\ run' = [run EXCEPT !.parity = TRUE]
  /\ UNCHANGED <<upHead, siteHead, record, live, enabled, pending, lastRun, stoppedAt, note>>
  /\ UNCHANGED Bookkeeping

\* "Build static site": bun run build. Its prebuild, generate-images.tsx,
\* exits 0 with NO og cards when the Inter font fetch fails (public/og/ is
\* gitignored and the CI cache is empty). single-page.ts exits 0 with no
\* dist/client/single-page.md when .fmhy-edit/scripts/generate-single-page.js
\* is missing. Every other failure in the chain fails the step.
SiteBuild ==
  /\ phase = "build"
  /\ \E og \in Outcome("fonts"), sp \in Outcome("singlepage"):
       /\ phase' = "eas"
       /\ run' = [run EXCEPT !.og = og, !.sp = sp]
  /\ UNCHANGED <<upHead, siteHead, record, live, enabled, pending, lastRun, stoppedAt, note>>
  /\ UNCHANGED Bookkeeping

\* "Deploy to EAS Hosting (production)": the live site changes here, atomically.
EasDeploy ==
  /\ phase = "eas"
  /\ live' = [up |-> run.built, site |-> run.site, og |-> run.og, sp |-> run.sp,
              parity |-> run.parity]
  /\ wentBack' = (wentBack \/ run.built < live.up \/ run.site < live.site)
  /\ hourlyRedeploy' = (run.event = "schedule" /\ run.built = live.up /\ run.site = live.site)
  /\ run' = [run EXCEPT !.deployed = TRUE]
  /\ phase' = "record"
  /\ UNCHANGED <<upHead, siteHead, record, enabled, pending, lastRun, stoppedAt, note,
                 recordBuilt, recordByDeploy, lastDeployed>>

Finish(outcome, step) ==
  /\ phase' = "idle"
  /\ run' = NoRun
  /\ lastRun' = outcome
  /\ stoppedAt' = step
  \* every step is a plain `run:`; none writes ::error:: or $GITHUB_STEP_SUMMARY,
  \* so the only annotation a failed step leaves is GitHub's generic one
  /\ note' = IF outcome = "red" THEN "exit code 1" ELSE "none"
  /\ lastDeployed' = run.deployed

\* "Record deployed upstream sha": writes needs.check.outputs.sha into the file
\* of THIS run's checkout (GITHUB_SHA); `git diff --quiet` against that copy;
\* else commit and `git push || (git pull --rebase --autostash && git push)`.
\* If another deploy moved the file since this run's trigger, the rebase drops
\* an identical change and conflicts on a different one.
RecordSha ==
  /\ phase = "record"
  /\ IF run.sha = run.recIn
       THEN /\ Finish("shipped", "none")              \* no diff: exit 0
            /\ UNCHANGED <<record, recordBuilt, recordByDeploy>>
       ELSE \E pushOk \in Outcome("push"):
              IF record = run.recIn /\ pushOk
                THEN /\ record' = run.sha
                     /\ recordBuilt' = IF run.deployed THEN run.built ELSE Empty
                     /\ recordByDeploy' = run.deployed
                     /\ Finish("shipped", "none")
                ELSE IF record # run.recIn /\ record = run.sha
                  THEN /\ Finish("shipped", "none")   \* rebase drops our commit
                       /\ UNCHANGED <<record, recordBuilt, recordByDeploy>>
                  ELSE /\ Finish("red", "record")     \* push failed or rebase conflict
                       /\ UNCHANGED <<record, recordBuilt, recordByDeploy>>
  /\ UNCHANGED <<upHead, siteHead, live, enabled, pending, wentBack, hourlyRedeploy>>

\* any deploy step exits non-zero: the job stops, later steps are skipped
StepFails ==
  /\ phase \in DeploySteps
  /\ CanFail(phase)
  /\ Finish("red", phase)
  /\ UNCHANGED <<upHead, siteHead, record, live, enabled, pending>>
  /\ UNCHANGED <<recordBuilt, recordByDeploy, wentBack, hourlyRedeploy>>

Next ==
  \/ UpstreamCommit \/ SiteCommit \/ DisableWorkflow \/ EnableWorkflow
  \/ HourlyTick \/ ManualDispatch \/ StartWaitingRun
  \/ CheckGate \/ Sync \/ UpstreamBuild \/ Parity \/ SiteBuild \/ EasDeploy
  \/ RecordSha \/ StepFails

Spec == Init /\ [][Next]_vars

-----------------------------------------------------------------------------
(* Rules. Each is one plain sentence in SKILL.md. R1-R6 break on the       *)
(* current code (findings F1-F8); R7-R9 hold and guard against regressions. *)

\* What the hourly `check` computes when ls-remote and gh api both work.
HourlyCheckWouldSkip == record = upHead
AtRest == enabled /\ phase = "idle" /\ pending.event = "none" /\ HourlyCheckWouldSkip

\* R1: once the hourly check would skip, the live mirror has the newest
\* upstream commit and the newest site code.
ChangesGoLive == AtRest => (live.up = upHead /\ live.site = siteHead)

\* R2: the record names the upstream commit that the run which wrote it deployed.
RecordIsTrue == record = recordBuilt

\* R3: a scheduled run only deploys when what it ships differs from what is
\* live. (EasDeploy sets the flag and always moves to "record", so this
\* catches every such deploy in the state right after it.)
HourlyDeploysOnlyOnChange == ~(phase = "record" /\ hourlyRedeploy)

\* R4: a failed run's summary names the step that stopped it. (A run always
\* ends in "idle", so checking there catches every failed run.)
FailureSaysWhichGate == (phase = "idle" /\ lastRun = "red") => note = stoppedAt

\* R5: a red run did not change the live site.
RedRunShippedNothing == (phase = "idle" /\ lastRun = "red") => ~lastDeployed

\* R6: a green run that deployed shipped the OG cards and single-page.md.
GreenShipsComplete == (phase = "idle" /\ lastRun = "shipped") => (live.og /\ live.sp)

\* R7: the live mirror only ever carries a build that passed the parity check.
OnlyParityCheckedBuildsGoLive == live.parity

\* R8: the record only moves in a run whose EAS deploy succeeded.
FailedRunLeavesRecord == recordByDeploy

\* R9: the live mirror never moves back to an older upstream commit or site code.
LiveNeverGoesBack == ~wentBack

\* Used only by chart.cfg to keep the drawn chart under 500 states: no run
\* waiting in the concurrency queue, one new commit in total. The checks
\* (MC.cfg, finding-*.cfg) never use it.
ChartLimit == pending.event = "none" /\ upHead + siteHead <= 1

TypeOK ==
  /\ upHead \in 0..MaxUp /\ siteHead \in 0..MaxSite
  /\ record \in {Empty} \cup 0..MaxUp
  /\ phase \in {"idle", "check", "record"} \cup DeploySteps
  /\ lastRun \in {"none", "skipped", "shipped", "red"}
=============================================================================
