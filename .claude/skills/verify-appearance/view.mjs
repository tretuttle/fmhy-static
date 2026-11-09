// Reader's-words view of Appearance.tla for the /statechart skill.
// Two regions: the display mode, and the palette (colour / preset).

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

const shownMode = (v) => (v.look.dark ? (v.look.amoled ? "AMOLED" : "Dark") : "Light");

const modeLabel = (v) => {
  if (v.sScheme === "none" || v.sScheme === "system") {
    return `${shownMode(v)}, following your OS`;
  }
  // the saved modes are merged into one chart state to keep the chart small;
  // the report still names Light / Dark / AMOLED in each step
  return "Light, Dark or AMOLED, saved";
};

const paletteSaved = (v) =>
  v.sAccent !== "none" || v.sTheme === "default" || v.sTheme === "halloween" ||
  v.sTheme === "catppuccin";

const paletteLabel = (v) => {
  const shown =
    v.look.theme !== "default"
      ? cap(v.look.theme)
      : v.look.accent === "swarm"
        ? "Default colours"
        : cap(v.look.accent);
  if (paletteSaved(v)) return `${shown}, saved`;
  if (shown === "Halloween") return "Halloween, October default";
  return v.sTheme === "none" ? shown : `${shown}, unknown theme name saved`;
};

export const title = "Choosing how the site looks";

export const state = (v) => ({ Mode: modeLabel(v), Palette: paletteLabel(v) });

export const step = (action, from, to) => {
  switch (action) {
    case "Hydrate":
      return "the page finishes loading";
    case "YouPickMode":
      return `you click ${to.pickedMode === "amoled" ? "AMOLED" : cap(to.pickedMode)}`;
    case "YouPickColor":
      return to.pickedPalette === "swarm" ? "you click the default colour" : "you click a colour";
    case "YouPickPreset":
      return `you click ${cap(to.pickedPalette)}`;
    case "YourOsSwitches":
      return `your OS turns ${to.os}`;
    case "YouReload":
      if (to.october && !from.october) return "you come back in October";
      if (!to.october && from.october) return "you come back after October";
      return "you reload";
    default:
      return action;
  }
};
