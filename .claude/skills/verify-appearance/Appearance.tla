------------------------------ MODULE Appearance ------------------------------
(***************************************************************************)
(* "Choose how the site looks": display mode x palette x season, for one   *)
(* browser tab of the fmhy-static site (site/).                            *)
(*                                                                         *)
(* Every action names the code it stands for. One action = one stretch of  *)
(* code that runs without the browser painting in between:                 *)
(*   - YouReload: a fresh page load up to FIRST PAINT, i.e. the inline      *)
(*     <head> script THEME_PRE_PAINT_SCRIPT (themePrePaint.ts, inlined by  *)
(*     app/_layout.tsx) plus SchemeProvider's inline <body> script         *)
(*     (@vxrn/color-scheme src/index.tsx). Both read the same storage and  *)
(*     the same scheme rule, so they are one step.                         *)
(*   - Hydrate: everything from the ThemeController module IIFE            *)
(*     (ThemeController.tsx) through the first React commit and its        *)
(*     effects: useUserScheme's restore (userScheme.ts), the SchemeProvider *)
(*     class effect, the useAmoled/useAccent/useThemeName storage syncs    *)
(*     (themeSettings.ts) and applyClasses. Intermediate class flips in    *)
(*     that stretch (applyClasses with the seeded defaults; SchemeProvider *)
(*     t_dark->t_light->t_dark) happen inside one task with no frame in    *)
(*     between, so they are not drawn on screen and are not modelled.      *)
(*   - YouPickMode / YouPickColor / YouPickPreset: one click in the        *)
(*     Appearance panel (AppearancePanel.tsx selectMode, ColorPicker       *)
(*     selectAccent / setThemeName).                                       *)
(*   - YourOsSwitches: prefers-color-scheme flips; @vxrn/color-scheme's    *)
(*     matchMedia listener (userScheme.ts startWebListener) follows it     *)
(*     only while the setting is 'system'.                                 *)
(***************************************************************************)
EXTENDS TLC

CONSTANTS
    Accents,     \* colour swatches modelled, a subset of ACCENT_NAMES (themeSettings.ts); "swarm" is the baseline
    Presets,     \* preset swatches modelled, a subset of PRESET_NAMES; must hold "halloween"
    StaleNames   \* strings that may sit in fmhy.theme.name but are not in THEME_NAMES (renamed/removed presets)

ASSUME "swarm" \in Accents /\ "halloween" \in Presets
ASSUME StaleNames \cap ({"default", "none"} \cup Presets) = {}

None       == "none"                         \* key absent: localStorage.getItem(...) === null
Modes      == {"light", "dark", "amoled"}    \* AppearancePanel.tsx MODES
ThemeNames == {"default"} \cup Presets       \* themeSettings.ts THEME_NAMES

VARIABLES
    \* localStorage, shared by every tab and kept across reloads
    sScheme,    \* 'vxrn-scheme' (raw string): none | "light" | "dark" | "system"
    sAmoled,    \* 'fmhy.theme.amoled': none | "true" | "false"
    sAccent,    \* 'fmhy.theme.accent': none | an accent
    sTheme,     \* 'fmhy.theme.name':   none | "default" | a preset | a stale name
    \* the world
    os,         \* prefers-color-scheme: "light" | "dark"
    october,    \* new Date().getMonth() === 9 (isOctober / the pre-paint month test)
    \* this tab
    phase,      \* "painted": head scripts ran, React not hydrated; "ready": hydrated
    setting,    \* @vxrn/color-scheme currentSetting: "system" | "light" | "dark"
    amoledE,    \* amoledEmitter.value  (seeded FALSE)
    accentE,    \* accentEmitter.value  (seeded "swarm")
    themeE,     \* themeEmitter.value   (seeded "default")
    look,       \* the <html> classes, i.e. what the visitor sees
    paintLook,  \* the look at first paint; kept until the first step after Hydrate, else NoLook
    \* what the visitor has done (history for the rules; not in the code)
    pickedMode,     \* last mode button clicked, or none
    pickedPalette   \* last colour/preset swatch clicked, or none

storage == <<sScheme, sAmoled, sAccent, sTheme>>
app     == <<setting, amoledE, accentE, themeE>>
vars    == <<sScheme, sAmoled, sAccent, sTheme, os, october, phase,
             setting, amoledE, accentE, themeE, look, paintLook,
             pickedMode, pickedPalette>>

\* a look is the html class set: t_dark/t_light, amoled, accent-<x> (none for
\* swarm), theme-<x> (none for default)
Look(dark, amoled, accent, theme) ==
    [dark |-> dark, amoled |-> amoled, accent |-> accent, theme |-> theme]
NoLook == Look(FALSE, FALSE, None, None)

(***************************************************************************)
(* First paint: THEME_PRE_PAINT_SCRIPT + SchemeProvider's inline script.   *)
(***************************************************************************)
PrePaintDark(o) ==        \* var d=s==='dark'||((!s||s==='system')&&matchMedia(dark))
    sScheme = "dark" \/ (sScheme \in {None, "system"} /\ o = "dark")
PrePaintTheme(oct) ==     \* var t=themeClassMap[n]; if(!t&&n==null&&r('theme.accent')==null&&month===9)t=halloween
    IF sTheme \in Presets THEN sTheme
    ELSE IF sTheme = None /\ sAccent = None /\ oct THEN "halloween"
    ELSE "default"
PrePaintLook(o, oct) ==
    Look(PrePaintDark(o),
         sAmoled = "true",                              \* r('theme.amoled')===true
         IF sAccent = None THEN "swarm" ELSE sAccent,   \* accentClassMap[r('theme.accent')]
         PrePaintTheme(oct))

(***************************************************************************)
(* After hydration: the app's own state.                                   *)
(***************************************************************************)
\* themeSettings.ts resolveStoredThemeName
ResolveTheme(oct) ==
    IF sTheme \in ThemeNames THEN sTheme
    ELSE IF sAccent = None /\ oct THEN "halloween"
    ELSE "default"
\* userScheme.ts resolveValue
SchemeDark(st, o) == st = "dark" \/ (st = "system" /\ o = "dark")
\* ThemeController applyClasses + SchemeProvider class effect
AppLook(st, o, am, ac, th) == Look(SchemeDark(st, o), am, ac, th)

-----------------------------------------------------------------------------
Init ==
    /\ sScheme = None /\ sAmoled = None /\ sAccent = None
    /\ sTheme \in {None} \cup StaleNames          \* first visit, or a leftover name
    /\ os \in {"light", "dark"}
    /\ october \in BOOLEAN
    /\ phase = "painted"
    /\ setting = "system" /\ amoledE = FALSE /\ accentE = "swarm" /\ themeE = "default"
    /\ look = PrePaintLook(os, october)
    /\ paintLook = look
    /\ pickedMode = None /\ pickedPalette = None

\* ThemeController IIFE + first commit + effects (see header). The scheme
\* restore is useUserScheme's `if (stored) updateScheme(stored)`.
Hydrate ==
    /\ phase = "painted"
    /\ phase' = "ready"
    /\ setting' = IF sScheme = None THEN "system" ELSE sScheme
    /\ amoledE' = (sAmoled = "true")                         \* useAmoled: stored ?? seed FALSE
    /\ accentE' = IF sAccent = None THEN "swarm" ELSE sAccent \* useAccent: stored ?? seed swarm
    /\ themeE'  = ResolveTheme(october)                      \* useThemeName
    /\ look' = AppLook(setting', os, amoledE', accentE', themeE')
    /\ UNCHANGED <<storage, os, october, paintLook, pickedMode, pickedPalette>>

\* AppearancePanel.tsx selectMode. Each click runs in one flushSync:
\* setAmoled(mode === 'amoled') then userScheme.set(dark|light)
\* (setUserScheme writes 'vxrn-scheme').
YouPickMode(m) ==
    /\ phase = "ready"
    /\ pickedMode' = m
    /\ paintLook' = NoLook
    /\ sAmoled' = IF m = "amoled" THEN "true" ELSE "false"
    /\ amoledE' = (m = "amoled")
    /\ sScheme' = IF m = "light" THEN "light" ELSE "dark"
    /\ setting' = sScheme'
    /\ look' = AppLook(setting', os, amoledE', accentE, themeE)
    /\ UNCHANGED <<sAccent, sTheme, accentE, themeE, os, october, phase, pickedPalette>>

\* ColorPicker selectAccent: setAccent(name); setThemeName('default').
\* Both setters always write storage, even when the value is unchanged.
YouPickColor(a) ==
    /\ phase = "ready"
    /\ sAccent' = a /\ accentE' = a
    /\ sTheme' = "default" /\ themeE' = "default"
    /\ look' = AppLook(setting, os, amoledE, a, "default")
    /\ pickedPalette' = a
    /\ paintLook' = NoLook
    /\ UNCHANGED <<sScheme, sAmoled, os, october, phase, setting, amoledE, pickedMode>>

\* preset swatch: onSelect={() => setThemeName(name)}; always writes storage,
\* also when the swatch is already the active (e.g. seasonal) one.
YouPickPreset(p) ==
    /\ phase = "ready"
    /\ sTheme' = p /\ themeE' = p
    /\ look' = AppLook(setting, os, amoledE, accentE, p)
    /\ pickedPalette' = p
    /\ paintLook' = NoLook
    /\ UNCHANGED <<sScheme, sAmoled, sAccent, os, october, phase, setting, amoledE, accentE, pickedMode>>

\* prefers-color-scheme changes; startWebListener's onSystemChange only acts
\* while currentSetting === 'system'. (Between paint and hydration nothing
\* listens; that window is not modelled.)
YourOsSwitches ==
    /\ phase = "ready"
    /\ os' = IF os = "dark" THEN "light" ELSE "dark"
    /\ look' = AppLook(setting, os', amoledE, accentE, themeE)
    /\ paintLook' = NoLook
    /\ UNCHANGED <<storage, october, phase, app, pickedMode, pickedPalette>>

\* reload, a new tab, or coming back another day (the month may change).
\* Module state resets to the emitter seeds; storage survives.
YouReload ==
    /\ phase = "ready"
    /\ \E oct \in BOOLEAN :
         /\ october' = oct
         /\ look' = PrePaintLook(os, oct)
    /\ paintLook' = look'
    /\ phase' = "painted"
    /\ setting' = "system" /\ amoledE' = FALSE /\ accentE' = "swarm" /\ themeE' = "default"
    /\ UNCHANGED <<storage, os, pickedMode, pickedPalette>>

Next ==
    \/ Hydrate
    \/ \E m \in Modes : YouPickMode(m)
    \/ \E a \in Accents : YouPickColor(a)
    \/ \E p \in Presets : YouPickPreset(p)
    \/ YourOsSwitches
    \/ YouReload

\* Fairness only matters for CanFollowOsAgain: the page finishes loading, and
\* a visitor who keeps using the panel eventually clicks every button.
Fairness ==
    /\ WF_vars(Hydrate)
    /\ \A m \in Modes : SF_vars(YouPickMode(m))
    /\ \A a \in Accents : SF_vars(YouPickColor(a))
    /\ \A p \in Presets : SF_vars(YouPickPreset(p))

Spec == Init /\ [][Next]_vars /\ Fairness

-----------------------------------------------------------------------------
(* What the visitor sees, in the panel's words. *)
ModeShown    == IF look.dark THEN (IF look.amoled THEN "amoled" ELSE "dark") ELSE "light"
PaletteShown == IF look.theme # "default" THEN look.theme ELSE look.accent
FollowingOs  == sScheme \in {None, "system"}

TypeOK ==
    /\ sScheme \in {None, "light", "dark", "system"}
    /\ sAmoled \in {None, "true", "false"}
    /\ sAccent \in {None} \cup Accents
    /\ sTheme \in {None} \cup ThemeNames \cup StaleNames
    /\ setting \in {"system", "light", "dark"}
    /\ themeE \in ThemeNames

(* RULES *)

\* What you see on first paint is what you see after the page finishes loading.
NoFlipOnLoad == paintLook # NoLook => look = paintLook

\* The mode you click is the mode you get: now, when your OS changes, and after reload.
ModeSticks == pickedMode # None => ModeShown = pickedMode

\* The colour or preset you click is the one you get: now and after reload, in any month.
PaletteSticks == pickedPalette # None => PaletteShown = pickedPalette

\* Until you pick a mode, the site is light or dark exactly as your OS is.
FollowsOsUntilPicked == pickedMode = None => look.dark = (os = "dark")

\* Nothing about your palette (so no seasonal default) is saved until you click a swatch.
PaletteSavedOnlyWhenPicked ==
    pickedPalette = None => (sAccent = None /\ sTheme \in {None} \cup StaleNames)

\* AMOLED black is only ever on while the site is dark.
AmoledOnlyInDark == look.amoled => look.dark

\* You can always get back to following your OS: a visitor who keeps using the
\* panel ends up following the OS again, again and again.
CanFollowOsAgain == []<>FollowingOs
=============================================================================
