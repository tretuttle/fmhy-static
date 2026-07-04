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
//
// Default color scheme (fmhy.net parity): a brand-new visitor with no
// 'vxrn-scheme' key should land on DARK, not light and not system-tracking.
// @vxrn/color-scheme's own SchemeProvider has no defaultScheme prop to ask for
// this (see node_modules/@vxrn/color-scheme/src/index.tsx — only `children`
// and `getClassName`); its inlined script falls back to
// prefers-color-scheme whenever the key is 'system' or unset. So this script
// seeds 'vxrn-scheme' = 'dark' in localStorage the first time it's missing,
// BEFORE that script runs (this one is injected in <head>, SchemeProvider's
// is rendered lower in <body> — see app/_layout.tsx) — its script then reads
// back the 'dark' we just wrote instead of falling through to the OS
// preference. The html class is also set directly here as a belt-and-suspenders
// against any future reordering; 't_' is SchemeProvider's default
// getClassName prefix (TamaguiRootProvider.tsx never overrides it).
export const THEME_PRE_PAINT_SCRIPT = `(function(){try{
var c=document.documentElement.classList;
function r(k){try{return JSON.parse(localStorage.getItem('fmhy.'+k))}catch(e){return null}}
if(r('theme.amoled')===true)c.add('${AMOLED_CLASS}');
var a=${JSON.stringify(accentClassMap)}[r('theme.accent')];if(a)c.add(a);
var t=${JSON.stringify(themeClassMap)}[r('theme.name')];if(t)c.add(t);
if(!localStorage.getItem('vxrn-scheme')){
localStorage.setItem('vxrn-scheme','dark');
c.remove('t_light');
c.add('t_dark');
}
}catch(e){}})();`
