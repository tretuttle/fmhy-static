// /statechart view for SearchModalOpen.tla - labels in the reader's words.
const settled = (v) => v.open === v.openSeen && !v.due;

export const title = "Search modal: open, close, reopen - where the cursor lands";

export const state = (v) => {
  if (!v.hasOpenedOnce && !v.open) return "Search never opened";
  if (v.open) {
    if (settled(v)) return v.focus === "input" ? "Open, cursor in the box" : "Open, cursor NOT in the box";
    if (!v.mounted) return "Opening: box not built yet";
    if (v.openSeen) return "Opening: box on screen, cursor in the box";
    return v.visible ? "Opening: box still on screen (fading out)" : "Opening: box still hidden";
  }
  if (v.timer === "armed" || v.openSeen || v.due) return "Fading out";
  return "Closed";
};

export const group = (v) => {
  const s = state(v);
  if (s.startsWith("Open,")) return "open";
  if (s.startsWith("Opening")) return "opening";
  return "closed";
};
export const colors = { open: "teal", opening: "yellow", closed: "tan" };

export const step = (action, from, to) => {
  switch (action) {
    case "YouOpen": return "you open search (Ctrl/⌘K, /, button, ?q= link)";
    case "YouClose": return "you close search (Esc, backdrop, back, pick a result)";
    case "LeaveTimerFires": return "the 100 ms fade-out ends";
    case "Commit":
      if (from.open && from.openSeen !== from.open) {
        // the commit that runs the [open] effects
        if (!from.hasOpenedOnce) return "React schedules building the box";
        return "the box shows and focus() puts the cursor in the input";
      }
      if (from.open && !from.mounted) return "the box is built and the input gets focus";
      if (from.open) return "the box finishes showing";
      return "focus returns to the page, fade-out starts";
    default: return action;
  }
};
