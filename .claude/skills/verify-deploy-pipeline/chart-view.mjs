// /statechart view for DeployPipeline.tla: labels in the words of someone
// who runs the mirror. Works for chart.cfg (main flow) and for the full
// configs (bug paths only, since those exceed the chart budget).

const BUILD_STEPS = ["sync", "upbuild", "parity", "build"];

const current = (v) => v.live.up === v.upHead && v.live.site === v.siteHead;
const atRest = (v) =>
  v.enabled && v.phase === "idle" && v.pending.event === "none" && v.record === v.upHead;

export const title = "fmhy-static: an upstream or site change reaching the live mirror";

export const state = (v) => {
  if (v.phase === "check") return "Run started: comparing fmhy/edit HEAD to the recorded sha";
  if (BUILD_STEPS.includes(v.phase)) return "Syncing, building both sites, parity check";
  if (v.phase === "eas") return "Built and checked: deploying to EAS";
  if (v.phase === "record")
    return v.hourlyRedeploy
      ? "Hourly run re-deployed the same build, recording sha"
      : "Deployed, recording the upstream sha";
  // idle
  if (!v.enabled) return "Workflow disabled";
  if (atRest(v) && !current(v)) return "New site code on main, hourly run skips it";
  if (v.lastRun === "red" && v.lastDeployed) return "Run red, but the site went live";
  if (v.lastRun === "red") return "Run failed at a step, nothing shipped";
  if (v.lastRun === "shipped" && !(v.live.og && v.live.sp))
    return "Green run shipped without OG cards or single-page.md";
  if (v.record !== v.recordBuilt) return "Live, but the record names another commit";
  if (current(v)) return "Mirror is current";
  return "A change is waiting for the next run";
};

export const group = (v) => {
  if (v.phase !== "idle") return "running";
  if (!v.enabled) return "off";
  if (v.lastRun === "red") return "failed";
  return current(v) ? "current" : "behind";
};

export const colors = {
  running: "blue",
  current: "teal",
  behind: "yellow",
  failed: "pink",
  off: "tan",
};

export const step = (action, from, to) => {
  switch (action) {
    case "UpstreamCommit":
      return "fmhy/edit gets a commit";
    case "SiteCommit":
      // hidden from a failed run: the same arrow leaves "Mirror is current"
      return from.phase === "idle" && from.lastRun === "red" ? null : "you push site code to main";
    case "Queue":
    case "StartWaitingRun":
      return to.run.event === "dispatch" ? "you run the workflow by hand" : "the hourly run starts";
    case "CheckGate":
      if (to.phase === "idle") return "check: sha equals the record, deploy job skipped";
      if (to.run.sha === -1) return "check: git ls-remote fails, sha is empty, so 'changed'";
      if (to.run.event === "schedule" && to.run.sha === from.record)
        return "check: gh api read fails, record reads empty, so 'changed'";
      return "check: changed (or a manual run)";
    case "Sync":
      return "fmhy/edit main cloned and data regenerated";
    case "UpstreamBuild":
      return "their VitePress build passes";
    case "Parity":
      return "parity check passes";
    case "SiteBuild":
      return to.run.og && to.run.sp
        ? "parity OK and site built"
        : "site built, OG cards or single-page.md silently skipped";
    case "StepFails":
      return from.phase === "eas" ? "EAS deploy fails" : "a sync, build or parity step exits 1";
    case "EasDeploy":
      return "EAS deploy succeeds";
    case "RecordSha":
      if (to.lastRun === "red") return "record push fails or rebase conflicts";
      if (to.record === -1 && from.record !== -1)
        return "empty sha committed: 'deployed fmhy/edit @ '";
      return "sha recorded (or unchanged)";
    case "DisableWorkflow":
      return "the workflow gets disabled";
    case "EnableWorkflow":
      return "the workflow gets enabled";
    default:
      return action;
  }
};
