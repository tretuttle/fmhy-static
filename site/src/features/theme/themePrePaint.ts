import { ACCENT_NAMES, THEME_NAMES } from './themeSettings'

import type { AccentName, ThemeName } from './themeSettings'

// single source for the html class names used by both ThemeController (react,
// post-hydration) and the inline pre-paint script below (SSG head). fmhy.net
// does the same in config.mts ("Apply the saved theme synchronously").

export const AMOLED_CLASS = 'amoled'

// swarm / default are the shipped baselines — no class
export const ACCENT_BASELINE: AccentName = 'swarm'
export const THEME_BASELINE: ThemeName = 'default'

export function accentClassName(name: AccentName): string {
  return `accent-${name}`
}

export function themeClassName(name: ThemeName): string {
  return `theme-${name}`
}

// value -> class maps for the non-baseline names, embedded into the script so
// unknown/stale localStorage values can never inject an arbitrary class
const accentClassMap = Object.fromEntries(
  ACCENT_NAMES.filter((name) => name !== ACCENT_BASELINE).map((name) => [
    name,
    accentClassName(name),
  ]),
)

const themeClassMap = Object.fromEntries(
  THEME_NAMES.filter((name) => name !== THEME_BASELINE).map((name) => [
    name,
    themeClassName(name),
  ]),
)

// Inlined synchronously into the SSG <head> by app/_layout so saved
// accent/theme/amoled apply before first paint. ThemeController's own pre-paint
// IIFE lives in a deferred chunk (One's after-lcp loading), so without this the
// first paint flashes the default theme. Storage encoding mirrors
// ~/lib/storage.ts: JSON values under 'fmhy.'-prefixed keys (keep in sync).
// Only ADDS classes; ThemeController reconciles (add + remove) after hydration.
export const THEME_PRE_PAINT_SCRIPT = `(function(){try{
var c=document.documentElement.classList;
function r(k){try{return JSON.parse(localStorage.getItem('fmhy.'+k))}catch(e){return null}}
if(r('theme.amoled')===true)c.add('${AMOLED_CLASS}');
var a=${JSON.stringify(accentClassMap)}[r('theme.accent')];if(a)c.add(a);
var t=${JSON.stringify(themeClassMap)}[r('theme.name')];if(t)c.add(t);
}catch(e){}})();`
