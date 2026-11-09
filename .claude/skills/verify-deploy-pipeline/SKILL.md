---
name: verify-deploy-pipeline
description: Model-check the fmhy-static deploy pipeline (how an fmhy/edit or site-code change reaches the live mirror) with TLA+/TLC. Use when a change touches .github/workflows/deploy.yml, .github/last-deployed-upstream-sha, site/scripts/sync-fmhy.ts, site/scripts/wiki/generate.ts, site/scripts/convert-fmhy.ts, site/scripts/parity-check.ts, the build chain in site/package.json (generate-images.tsx, single-page.ts, sitemap-gen.ts, defer-hydration.ts, strip-loader-data.ts, generate-sw.ts), or when asked whether a deploy, retry, record, or gate behaves right.
---

# Verify the deploy pipeline

`DeployPipeline.tla` is a small TLA+ model of `.github/workflows/deploy.yml` and the
scripts its steps run. TLC checks every order of these events, within the bounds
below: fmhy/edit commits, site-code pushes, the hourly run, a manual run, the
concurrency queue, each step passing or failing, `git ls-remote` / `gh api` /
`git push` failing, the font fetch failing, and upstream's single-page script
missing.

It is a hand model, not the code. It covers only what the coverage record names.
If you change the code, you change the model to match. Then you run the check.

## 1. Does your change touch the verified code?

```sh
git diff --name-only fb43561 -- .github/workflows/deploy.yml .github/last-deployed-upstream-sha \
  site/scripts/sync-fmhy.ts site/scripts/wiki/generate.ts site/scripts/convert-fmhy.ts \
  site/scripts/parity-check.ts site/package.json site/scripts/generate-images.tsx \
  site/scripts/single-page.ts site/scripts/sitemap-gen.ts site/scripts/defer-hydration.ts \
  site/scripts/strip-loader-data.ts site/scripts/generate-sw.ts
```

`fb43561` is the sync commit, the last commit at which the model was confirmed
to describe the code (see Coverage). Add your working-tree diff too (`git diff`,
`git diff --cached`). If nothing in that list changed, the check still passes
for your change and you can stop.

If something changed, read the diff against the coverage table. A change can
alter what a step does: its order, whether it can fail, whether a failure
stops the job, what it reads or writes, which commit it uses, or its exit code
on an error. Then edit the action named in the table so it says what the new
code does. Keep names and comments in the code's words. Edits that change none
of that, such as log text, comments, or parser internals in generate.ts, need
no model change. When you edit an action, also check `chart-view.mjs`. Its
arrow labels describe what each action does (for example "parity check
passes"), so change any label that the new code makes untrue.

## 2. Run the check

From the repo root:

```sh
sh .claude/skills/verify-deploy-pipeline/check.sh
```

It runs each config through the repo's pinned runner, `.claude/verify/tlc.sh`
(TLC 1.7.4 and Temurin 25 through mise; the first run needs the network). At
fb43561 it takes about 25 s, and `MC.cfg` reaches 2.6 M distinct states. Both
numbers grow when an edit adds behavior. Exit 0 means every config got what it expects. TLC's output
for each config stays in the folder it prints (set `OUT=dir` to choose it). TLC
writes its state files under `$TMPDIR`; if `/tmp` is small, set
`TMPDIR=/home/...`.

| Config | Expect | Meaning |
| --- | --- | --- |
| `MC.cfg` | pass | R7, R8, R9 and `TypeOK` hold on the current code. This is the regression check. |
| `finding-1-...cfg` to `finding-8-...cfg` | the named rule breaks | Known findings F1-F8. They break today. Each config keeps its finding visible and tracks whether it still exists. |

To run one config by hand:
`.claude/verify/tlc.sh .claude/skills/verify-deploy-pipeline/DeployPipeline.tla .claude/skills/verify-deploy-pipeline/MC.cfg`
TLC exits 0 when all invariants hold. It exits 12 on an invariant violation,
11 on a deadlock, 150 on a parse or semantic error, and 255 when it cannot find
a file. `tlc.sh` changes into the model's folder and passes TLC only the
config's file name, so a config must sit next to `DeployPipeline.tla`. Delete
any scratch config you add there when you are done.

TLC stops at the first broken rule. To check the rules after it, run a scratch
copy of the config without that rule. To get a shorter path that shows only
your change, run a scratch copy whose `Flaky` holds only the steps your path
needs. A full `Flaky` lets TLC pick a path that also goes through another
finding.

## 3. Read the result

Read every TLC result with the pstack `/statechart` skill. It cannot be
invoked as a skill, so read its SKILL.md and run its command yourself. It gives the
shortest path to each broken rule in plain words. Give it `DeployPipeline.tla`
with the config and the view `chart-view.mjs` from this folder. Write its output
outside the repo. For a picture of the main flow, use `chart.cfg`. It is kept
under the chart's state budget by the `ChartLimit` constraint, which only that
config uses. `chart-findings.cfg` draws the bug paths of F2-F5 and F8.

- **`MC` MISMATCH (a rule that held now breaks).** Treat it as a bug in the
  change until you show otherwise. Turn the path into steps of the workflow and
  replay it on the code (see Replaying). If the code really does that, report it.
  Do not weaken the rule or narrow the model to get a pass. If the replay shows
  the code cannot do it, the model is wrong. Fix the action that disagrees with
  the code, and say which line of code it now matches.
- **A `finding-*` config got `pass`.** Either the code fixed that finding, or
  your model edit removed the behavior by mistake. Check the code. If it is
  fixed: add the rule to `MC.cfg`, but only when no other open finding still
  breaks it. Then delete that finding config, and mark the finding fixed below.
  If not, undo the model edit.
- **A `finding-*` config broke a different rule, or `error(exit N)`.** 150 is a
  syntax or semantic error in your edit. 11 is a deadlock: a state with no step
  out. If it is a correct end state, give it a no-op `Done` action. If not,
  you removed a step.

## Rules

Steps run in workflow order. "Live" means what EAS Hosting serves.

| Rule (TLA name) | Plain sentence | Harm when broken | Today |
| --- | --- | --- | --- |
| R1 `ChangesGoLive` | Once the hourly check would skip, the live mirror has the newest fmhy/edit commit and the newest site code. | Pushed site code never ships. | breaks: F1 |
| R2 `RecordIsTrue` | `.github/last-deployed-upstream-sha` names the fmhy/edit commit that the run which wrote it actually deployed. | The audit trail lies (an empty sha, or a commit that was never built). | breaks: F2, F3 |
| R3 `HourlyDeploysOnlyOnChange` | A scheduled run deploys only when what it ships differs from what is live. | Needless production redeploys every hour. | breaks: F4, F5 |
| R4 `FailureSaysWhichGate` | A failed run's summary annotation names the step that stopped it. | Hundreds of failures look the same. | breaks: F6 |
| R5 `RedRunShippedNothing` | A red run did not change the live site. | "Failed" runs that actually shipped. | breaks: F4, F8 |
| R6 `GreenShipsComplete` | A green run that deployed shipped the OG cards and `single-page.md`. | Broken link previews or a 404 for `/single-page.md`, with a green run. | breaks: F7 |
| R7 `OnlyParityCheckedBuildsGoLive` | The live mirror only ever carries a build that passed the parity check for its own fmhy/edit commit. | The mirror stops being 1:1 with fmhy.net. | holds |
| R8 `FailedRunLeavesRecord` | The record only moves in a run whose EAS deploy succeeded. | A failed deploy is never retried. | holds |
| R9 `LiveNeverGoesBack` | The live mirror never moves back to an older fmhy/edit commit or older site code. | Users see old content. | holds |

R7-R9 were each shown to fail on a broken variant: `continue-on-error: true`
on the parity step breaks R7, the record step moved before the EAS deploy
breaks R8, and sync building a cached clone after a swallowed fetch failure
breaks R9.

## Findings (open at fb43561)

| # | Config | What happens, in the workflow's words |
| --- | --- | --- |
| F1 | `finding-1-site-code-never-ships` | Site code is pushed to main. The hourly `check` compares only `git ls-remote fmhy/edit` with the record, finds them equal, and skips `deploy`. There is no `push:` trigger. The code ships only when fmhy/edit moves or someone runs the workflow by hand. |
| F2 | `finding-2-empty-sha-recorded` | `git ls-remote` fails. The step runs `bash -e` without pipefail, so `sha=""` and `"" != last`, so changed=true. Every deploy step passes. "Record deployed upstream sha" writes an empty line and commits `chore: deployed fmhy/edit @`. The next hour redeploys. |
| F3 | `finding-3-record-names-unbuilt-commit` | `check` resolves fmhy/edit at U1. fmhy/edit gets U2. `sync-fmhy.ts` clones `--branch main`, which is U2. U2 is built, checked and deployed, and the footer `rev:` shows U2, but U1 is recorded. The next hour redeploys U2. |
| F4 | `finding-4-push-fails-hourly-redeploy` | The EAS deploy succeeds, then `git push` and the rebase fallback fail. The run is red with the site live. The record is unchanged, so every next hour redeploys the same build until a push works. |
| F5 | `finding-5-gh-api-fails-hourly-redeploy` | `gh api` fails. Without pipefail, `last=""` (`|| echo none` never runs), so an unchanged hour still deploys. |
| F6 | `finding-6-failure-summary-generic` | No step writes `::error::` or `$GITHUB_STEP_SUMMARY`. Every failure, parity or EAS or build, leaves only "Process completed with exit code 1." The failed step shows only in the job's step list or the logs. |
| F7 | `finding-7-green-run-missing-artifacts` | `generate-images.tsx` exits 0 when the font fetch fails. `public/og/` is gitignored and CI starts with no cache, so no OG card ships, yet `HeadInfo.tsx` links `/og/<slug>.webp`. `single-page.ts` exits 0 with no `single-page.md` when `.fmhy-edit/scripts/generate-single-page.js` is missing. Either way the run is green. |
| F8 | `finding-8-queued-run-record-conflict` | Run B waits in concurrency group `deploy` behind run A. B's checkout is its trigger commit, before A's record commit. A records U1. B deploys U2, its push is rejected, and `git pull --rebase` conflicts on the record file. B is red with the site live, and the next hour redeploys. |

## Coverage (sync commit: fb43561)

| Code (at fb43561) | Model |
| --- | --- |
| `deploy.yml` 15-18 `on: schedule` / `workflow_dispatch` | `HourlyTick`, `ManualDispatch`. No `push:` trigger. |
| `deploy.yml` 27-29 `concurrency: deploy`, `cancel-in-progress: false` | `Queue` (one running run, one waiting run that a newer one replaces), `StartWaitingRun`. One run at a time is built into the model (single `phase`). |
| `deploy.yml` 39-52, `check` gate (`bash -e`, no pipefail) | `CheckGate`: `sha`, `last`, changed = dispatch or `sha != last` |
| `deploy.yml` 58 `if: needs.check.outputs.changed == 'true'` | `CheckGate` skip branch |
| `deploy.yml` 64-80 checkout (GITHUB_SHA), setup-node, setup-bun, corepack, `bun install` | Folded into `Sync`'s failure (`StepFails`); the checkout fixes `run.site` and `run.recIn` at trigger time (`Queue`) |
| `deploy.yml` 85 + `site/scripts/sync-fmhy.ts` 32-52 (clone `--branch main`), 65-75 (generate.ts, convert-fmhy.ts); `wiki/generate.ts` 1405 (`exitCode = 1`), 1156 (chrome.json commit = clone HEAD); `convert-fmhy.ts` 32-34 | `Sync` (`run.built = upHead` at sync time), `StepFails` at "sync" |
| `deploy.yml` 89 `corepack pnpm docs:build` | `UpstreamBuild`, `StepFails` at "upbuild" |
| `deploy.yml` 95 + `site/scripts/parity-check.ts` 30-35, 147-151 | `Parity`, `StepFails` at "parity" |
| `deploy.yml` 98 + `site/package.json` 13-14; `generate-images.tsx` 315-321 (fonts: exit 0); `single-page.ts` 28-31 (exit 0); sitemap-gen, defer-hydration, strip-loader-data, generate-sw (exit 1 on error) | `SiteBuild` (`og`, `sp`), `StepFails` at "build" |
| `deploy.yml` 104 EAS deploy | `EasDeploy`, `StepFails` at "eas" |
| `deploy.yml` 112-125 Record step (`git diff --quiet`, commit, push, `pull --rebase --autostash`) + `.github/last-deployed-upstream-sha` | `RecordSha`, `record` |

When you have confirmed that the model describes the code at a newer commit,
update the sync commit in this file (here and in step 1), and the line numbers
in this table. Do that only after the confirmation, never just because the
check passed.

## Bounds and assumptions

- `MC.cfg` and the finding configs: up to 2 new fmhy/edit commits, 1 site-code
  push, the workflow can be disabled and enabled, and every outside call or step
  in `Flaky` can fail. That gives 2.6 M states. A pass covers these bounds only.
- One EAS deploy is atomic. Upstream main never moves backwards (no force-push).
  GitHub starts a queued run as soon as the running one ends, in trigger order.
- Rules R1 and R4-R6 are judged when no run is in progress. A run always
  ends there, so no break is missed.

## What the model leaves out

- Running two runs at once. If the `concurrency` block is removed, the model
  must become two processes. As written it cannot show that race.
- Manual runs from a branch other than main (the "Use workflow from" picker):
  that ships that branch's site code, and `git push origin main` fails. Not
  modeled.
- What parity-check and the generators compute (link sets, the
  recently-removed history window in `wiki/removed.ts`). Only pass or fail is
  modeled.
- Timing: hourly ticks are unconstrained events. Real GitHub cron can skip
  or delay a run.
- GitHub disabling the schedule after 60 days with no repository activity. Here
  it is just the `DisableWorkflow` event. R1 does not ask for progress while the
  workflow is disabled.
- `bunx eas-cli@latest` is unpinned, and EAS can partly succeed. Neither is modeled.
- Autostash conflicts on regenerated files during the rebase fallback are assumed
  not to fail the step.

## Replaying a counterexample on the real code

You cannot run Actions locally. Run the workflow's own shell instead:

- **Gate and Record steps.** Copy the `run:` text out of `deploy.yml`. Replace
  `${{ github.event_name }}`, `${{ github.repository }}` and
  `${{ needs.check.outputs.sha }}` with the path's values. Run it with
  `bash -e` (what GitHub uses, no pipefail), with `GITHUB_OUTPUT` set to a
  file. Put stub `git` and `gh` scripts first on `PATH` to make `ls-remote` or
  `gh api` fail or return a sha. For the Record step, use a scratch bare repo
  as `origin`, with clones checked out at the run's trigger commit.
- **Upstream timing (F3).** Point real git at a local bare repo:
  `GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=url.<bare>.insteadOf GIT_CONFIG_VALUE_0=https://github.com/fmhy/edit.git`.
  Then run the gate, commit to the bare repo, and run the clone command from
  `sync-fmhy.ts`.
- **Build scripts.** `generate-images.tsx` and `single-page.ts` read and write
  under the current directory and `FMHY_ROOT`. Run them from a scratch
  directory, never from `site/`. For `generate-images.tsx`, block the font fetch
  with `HTTPS_PROXY=http://127.0.0.1:9`.
- **GitHub Actions semantics** (`continue-on-error`, `if:`, `needs`,
  `concurrency`). These cannot run locally. Cite GitHub's workflow-syntax docs
  for the behavior, and quote the changed line of `deploy.yml`.
- **Run history.** `gh run list -R tretuttle/fmhy-static`, then
  `gh run view <id> -R tretuttle/fmhy-static` (and `--log-failed`). Use them
  read-only.

## Files

`DeployPipeline.tla` (model), `MC.cfg`, `finding-*.cfg`, `check.sh`, `chart.cfg`,
`chart-findings.cfg`, `chart-view.mjs` (the `/statechart` view).
