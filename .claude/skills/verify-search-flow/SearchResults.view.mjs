// /statechart view for SearchResults.tla - a flat chart of what the reader sees
// in the box. The index (loading / loaded / failed) and the network show up
// only through the arrow labels and the two failure states.
const tag = (v) => (v.query === "A" ? (v.fuzzy ? "A~" : "A=") : "none");

export const title = "Search: type, index loads, results";

export const state = (v) => {
  if (v.query === "") return "Empty box";
  if (v.isSearching) return "Spinner (searching)";
  if (v.results !== "none") return v.results === tag(v) ? "Results for your query" : "Old query's results, no spinner";
  if (v.enableNoResults) {
    if (v.lastSearch === "ok") return "No results";
    if (v.lastSearch === "replayed") return "“No results”: old failure replayed online";
    return "“No results”: index failed offline";
  }
  return "Blank list, no spinner";
};

export const group = (v) => {
  const s = state(v);
  if (s === "Results for your query" || s === "No results") return "answer";
  if (s === "Spinner (searching)" || s === "Empty box") return "working";
  if (s === "Blank list, no spinner") return "pending";   // a search is pending; breaks no rule
  return "wrong";
};
export const colors = { answer: "teal", working: "blue", pending: "yellow", wrong: "orange" };

export const step = (action, from, to) => {
  switch (action) {
    // typing and switching mode run the same effects; one arrow label
    case "YouType":
      if (to.query !== "") return "you type, or switch fuzzy/exact";
      // the clear-the-box reset exists from every state: draw it once
      return state(from) === "Results for your query" ? "you clear the box" : null;
    // TLC names a YouToggleFuzzy step after the operator it calls
    case "QueryOrModeChange":
    case "YouToggleFuzzy":
      return to.query === "" ? null : "you type, or switch fuzzy/exact";
    case "DebounceFires":
      if (to.deb === "awaiting") return "350 ms pass, the search waits for the index";
      return from.engine === "failed" ? "350 ms pass, the search gets the cached load failure" : "350 ms pass, the search runs";
    case "EngineLoads": return "the index loads";
    case "EngineFails": return "the index load fails (offline)";
    case "Stage2Lands": return "the result list is built";
    case "NetworkReturns": return "you come back online";
    default: return action;
  }
};
