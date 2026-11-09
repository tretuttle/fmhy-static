---
name: verify-appearance
description: Model-check the site's Appearance flow (light/dark/AMOLED mode, colour and preset palette, the October Halloween default, the inline pre-paint script vs the hydrated app) with TLA+. Use when a change touches site/src/features/theme/, site/src/lib/storage.ts, the theme head scripts in site/app/_layout.tsx, the html.amoled / theme-* / accent-* rules in site/app/root.css, or the @vxrn/color-scheme version, or when asked whether a theme, dark-mode or "flash on load" change is safe.
---

# Verify the Appearance flow

`Appearance.tla` is a small TLA+ model of one browser tab choosing how the site looks: display mode × palette × season, with first paint, hydration, panel clicks, OS light/dark switches and reloads in any month. TLC checks every order of those steps, for the constants in the config, against the rules below.

## The rules (what a pass means)

| Rule | In plain words | Harm if broken |
| --- | --- | --- |
| `NoFlipOnLoad` | What you see on first paint is what you see after the page finishes loading. | The page visibly flips palette or mode a moment after it appears. |
| `ModeSticks` | The mode you click is the mode you get: now, when your OS changes, and after reload. | You click Dark and the site later turns light anyway. |
| `PaletteSticks` | The colour or preset you click is the one you get, now and after a reload in any month. | Your colour pick is lost or overridden (e.g. by Halloween). |
| `FollowsOsUntilPicked` | Until you pick a mode, the site is light or dark exactly as your OS is. | A first-time visitor gets the wrong mode, or it does not follow the OS live. |
| `PaletteSavedOnlyWhenPicked` | Nothing about your palette (so no seasonal default) is saved until you click a swatch. | The October default gets frozen in and you still have Halloween in November without choosing it. |
| `AmoledOnlyInDark` | AMOLED black is only ever on while the site is dark. | Light mode with black AMOLED backgrounds. |
| `CanFollowOsAgain` (temporal) | You can always get back to following your OS. | One click on a mode pins the site to it forever. |
| `TypeOK` | Model sanity (the variables hold expected values). | A modelling error. |

"Click" means any click, including one on the option that is already checked. That is the code's own stated intent in `selectMode` ("persist the mode even when it matches what the OS resolved to").

## Coverage record

Sync commit: **8771c44**. The model was checked line by line against the code below at fb43561, and `YouPickMode` again at 8771c44, after the only change to covered code since then. Move the sync commit forward only after you confirm, at the new commit, that each action below still describes its code.

| Code (path: function) | Model |
| --- | --- |
| `site/src/features/theme/themePrePaint.ts`: `THEME_PRE_PAINT_SCRIPT`, `accentClassMap`, `themeClassMap` | `PrePaintDark`, `PrePaintTheme`, `PrePaintLook`, used by `Init` and `YouReload` |
| `site/app/_layout.tsx`: the `<head>` script order (pre-paint inline, seasonal branding) | `YouReload` (first paint is one step) |
| `site/node_modules/@vxrn/color-scheme` 1.2.71 (pinned in `site/bun.lock`): `SchemeProvider` inline script + class effect, `useUserScheme` restore, `setUserScheme`, `startWebListener`, `resolveValue` | `PrePaintDark`, `Hydrate` (`setting'`), `SchemeDark`, `YouPickMode`, `YourOsSwitches` |
| `site/src/features/theme/themeSettings.ts`: `resolveStoredThemeName`, `isOctober`, emitter seeds, `setAmoled`/`setAccent`/`setThemeName`, `useAmoled`/`useAccent`/`useThemeName` effects | `ResolveTheme`, `Hydrate`, `YouReload` (seeds), `YouPickColor`, `YouPickPreset` |
| `site/src/lib/storage.ts`: `createStorageValue` (JSON under `fmhy.` keys) | the `s*` storage variables |
| `site/src/features/theme/ThemeController.tsx`: module IIFE, `applyClasses`, `ThemeController` effects | `Hydrate`, `AppLook` |
| `site/src/features/theme/AppearancePanel.tsx`: `MODES`, `selectMode` (`setAmoled` then `userScheme.set` on every click), `ColorPicker` `selectAccent` and preset `onSelect` | `Modes`, `YouPickMode`, `YouPickColor`, `YouPickPreset` |
| `site/app/root.css`: `html.amoled.t_dark`, `html.accent-*.t_*`, `html.theme-*.t_*` (a preset wins over an accent) | `Look`, `ModeShown`, `PaletteShown` |

Not covered on purpose: `themeTransition.ts` (animation only; the click's `apply` always runs), `seasonalBranding.ts` (logos and favicon, not the palette), `ThemeMenu.tsx` (popup open/close), `src/components/ThemeSwitch.tsx` (not rendered anywhere at 8771c44; if it ever is, it adds a `'system'` setting and `CanFollowOsAgain` must be rechecked).

## Does a change touch this?

```sh
git diff --name-only 8771c44 -- site/src/features/theme site/src/lib/storage.ts site/app/_layout.tsx site/app/root.css site/bun.lock site/package.json
```

Then read the hunks against the table. A change in `root.css` or `_layout.tsx` only matters if it touches the selectors or head scripts named above; a `bun.lock` change only if `@vxrn/color-scheme` moved off 1.2.71.

## Run the check

From the repo root (each run takes about a second):

```sh
.claude/verify/tlc.sh .claude/skills/verify-appearance/Appearance.tla .claude/skills/verify-appearance/Holding.cfg   # regressions: must exit 0
.claude/verify/tlc.sh .claude/skills/verify-appearance/Appearance.tla                                                 # every rule
```

- `Holding.cfg` checks the rules that held at the sync commit. Exit 0 means none of them regressed. Non-zero means a regression or a model error: read the printed trace.
- `Appearance.cfg` checks every rule. At the sync commit it exits 12 because of the two known findings below; TLC stops at the first one (`NoFlipOnLoad`). A new rule breaking here, or a known finding with a different path, is news.
- Read every result with the pstack **`/statechart`** skill: give it `Appearance.tla` with `Appearance.cfg` to get every broken rule as its shortest path in plain words (it re-runs TLC past each break), and give it the view module `view.mjs` in this folder for the reader's words. For a whole-flow chart, give it `AppearanceChart.cfg` (one colour, one preset; 240 states, under its chart budget). Write its output outside the repo.

## Known findings at 8771c44 (do not "fix" the model to hide them)

1. **`NoFlipOnLoad`: an unknown saved theme name flips to Halloween after first paint, in October.** (1) In October, `fmhy.theme.name` holds a string that is not in `THEME_NAMES` (e.g. a preset renamed or removed in a later release) and `fmhy.theme.accent` is empty. (2) `THEME_PRE_PAINT_SCRIPT` paints the default palette: its halloween fallback needs `n==null`. (3) The `ThemeController` IIFE runs `resolveStoredThemeName()`, which treats an unknown name as no pick and returns `'halloween'`, so `theme-halloween` is added. Replay on the built site (fake date 2026-10-15, OS dark, `fmhy.theme.name = "retired"`): first paint `t_dark`, then `theme-halloween` added at ~185 ms, five animation frames later: **reproduced**.
2. **`CanFollowOsAgain`: no way back to following the OS.** `MODES` has only Light/Dark/AMOLED, and each writes `'light'` or `'dark'` to `vxrn-scheme`. No rendered control ever writes `'system'` or clears the key (`ThemeSwitch` would, but nothing renders it). TLC's lasso: pick any mode, then keep clicking every button forever, and the OS is never followed again. Replay: the panel's mode buttons were `["Light","Dark","AMOLED"]`; `vxrn-scheme` after each click was dark/light/dark/dark/light, and a later OS switch to dark left the page `t_light`: **reproduced**. Also, before commit 8db54b4 the pre-paint script wrote `vxrn-scheme='dark'` for every first visitor, so those returning visitors are pinned to dark without having chosen it.

Related behaviour that is **not** a rule break under the rules as written: in October with nothing saved, clicking the already-checked Halloween swatch runs `setThemeName('halloween')`, which always writes storage, so the visitor still has Halloween in November. The replay reproduced this. A click counts as a pick, so `PaletteSavedOnlyWhenPicked` holds. Modes behave the same way since 8771c44: a click on the checked mode is saved too. If the product decides that such a click is not a pick, change the rules (both ways) with the user's agreement, never one-sidedly to make a check pass.

## Able to fail (confirmed at fb43561)

Each rule was seen failing on a model of a plausible code break, and each failing rule passing on a model of its fix:

| Code change mirrored in the model | Result |
| --- | --- |
| `selectMode`: `if (mode !== 'light') setAmoled(...)` (Light keeps AMOLED) | `AmoledOnlyInDark` violated |
| `selectAccent` without `setThemeName('default')` | `PaletteSticks` violated |
| `startWebListener` never subscribes to the OS change | `FollowsOsUntilPicked` violated |
| `useThemeName` effect calls `setThemeName(resolveStoredThemeName())` | `PaletteSavedOnlyWhenPicked` violated |
| `setThemeName` writes storage only when the value changes (scratch break in the real code, run end to end through this skill) | `Holding.cfg` exit 12: `PaletteSticks` violated (click the checked seasonal Halloween in October, come back after October: default colours) |
| pre-paint fallback uses the same test as `resolveStoredThemeName` | `NoFlipOnLoad` holds |
| early return only when the mode is already *saved* | `ModeSticks` holds |
| `selectMode` returns early when the clicked mode equals the resolved mode (the code before 8771c44) | `Holding.cfg` exit 12: `ModeSticks` violated (OS dark, click Dark, the OS turns light) |
| a fourth "System" row calling `userScheme.set('system')` | `CanFollowOsAgain` holds |

## Real bug or modelling error?

1. Re-read the action in the trace against the code it cites in the table above. If the model does something the code cannot do, or misses a step the code takes, fix the model, say so, and rerun.
2. Otherwise replay the trace on the real site, one step per action: `cd site && bun run build`, serve `dist` with `bun x one serve --port <port>`, and drive it with Playwright. Seed `localStorage` with `addInitScript` (keys `vxrn-scheme` as a raw string; `fmhy.theme.amoled`, `fmhy.theme.accent`, `fmhy.theme.name` as JSON), fake the month with `page.clock.setFixedTime`, switch the OS with `page.emulateMedia({ colorScheme })`, open the panel with `button[aria-label="Appearance and themes"]` (viewport ≥1280px), and read `document.documentElement.className`. For "first paint vs loaded", log `<html>` class mutations from an init script with a `requestAnimationFrame` counter: changes in one MutationObserver batch happen in one task and are never painted.
3. If it reproduces, it is a finding: report it with the steps in code terms. Do not weaken the rule, and do not change product code unless asked.

## When you change the flow on purpose

1. Edit the action whose code changed (the comments name the code), and add a variable only if a rule needs it.
2. Run both commands. A rule that newly breaks is a finding until a replay shows otherwise. When a known finding is fixed, the full run must pass that rule; then add the rule to `Holding.cfg` and delete the finding above.
3. Update the coverage table, then move the sync commit to the commit you checked.

## Scope and bounds

- Bounds: one tab; colours {swarm, turquoise}; presets {halloween, catppuccin}; one stale theme name; OS light/dark; month October / not October. The rules do not depend on which colour or which non-seasonal preset, so more of them add nothing. 480 states.
- Atomic steps: first paint (head pre-paint + SchemeProvider body script); hydration (controller IIFE through the first commit's effects); each click; each OS switch. Replays at fb43561 show that the class churn inside hydration (`applyClasses` with the seeded defaults stripping `amoled`/`accent-*`/`theme-*`, and SchemeProvider's `t_dark`→`t_light`→`t_dark`) happens in one MutationObserver batch, so it is never painted.
- Left out: a second open tab (no `storage` listener, so it stays stale until it reloads or opens the panel, whose hooks re-read storage); the month changing while a page stays open; an OS switch between first paint and hydration; storage that throws or is full; malformed `vxrn-scheme` values; the view-transition animation; seasonal logos and favicons; React Native.
