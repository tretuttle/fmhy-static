# Shell & theming diagnosis — 2026-07-02

Evidence-first diagnosis of the reported foundation problems (theming wrong in
sidebar + mode toggle, broken layout/scroll containers, state chaos, hydration,
flash-on-toggle). Method: CDP-instrumented sessions against the production
build and dev, matched-styles cascade dumps, load-timeline screenshots
(scratchpad `prod-*`/`diag-*`/`verify-*`).

## Root-cause register

| # | Root cause | Evidence | Status |
|---|---|---|---|
| RC1 | **Tamagui runtime theme frozen at boot.** `TamaguiProvider defaultTheme` is initial-only; nothing re-applied the scheme, so every JS-resolved style (theme-menu segments, header internals, MetaTheme, animated styles) stayed at the boot scheme while the html class + var() styles flipped. | Light page with dark menu pills/header internals (`prod-light.png`); classes flip, runtime doesn't. | **FIXED** — explicit `<Theme name={userScheme.value}>` wrapper in TamaguiRootProvider; verified header/content follow the toggle (`verify-light-clean.png`). |
| RC2 | **Custom themes exist only as CSS variables.** Catppuccin/Monochrome/accents live in root.css `html.theme-*` var overrides; Tamagui's runtime resolver only knows the base light/dark config themes. Any runtime-resolved token diverges under a custom theme (sidebar link rgb(5,5,5) vs themed --color12 #353638). | Sidebar link color bypasses the var override under catppuccin. | **OPEN — rebuild**: define catppuccin/monochrome (and accent ramps) as real themes in `themes-in.ts` so class CSS and runtime resolution agree; keep the pre-paint class script. Interim: prefer var-consuming styles over dynamic token props in chrome components. |
| RC3 | **Legacy Takeout link CSS fighting the design.** `.is_Paragraph a, p a, [data-tint-link] { text-decoration: underline 2px var(--color5) }` outranked the entry-link mechanic (cascade dump showed it winning); separately `textDecorationColor` as a Tamagui prop leaked onto the DOM (React unknown-prop warning). | CSS.getMatchedStylesForNode cascade; console warning. | **FIXED** — rule deleted; link mechanic is now a plain `.vp-link-reveal` class (root.css) with the `:hover` reveal. |
| RC4 | **Shell scroll model diverges from VitePress.** Sidebar is `position: static`, 1800px+ tall, scrolling away with the document (its bottom shows mid-page); real VPSidebar is fixed under the nav with its own overflow-y. ToC uses `overflow: scroll` → permanent vertical scrollbar gutter + a horizontal one. | `prod-starred-100ms.png` (sidebar bottom mid-page), layout probe (`position: static`, parents all static/visible). | **OPEN — rebuild**: fixed sidebar (top: header, bottom: 0, overflow-y auto, stable gutter) + content offset, matching VPSidebar; ToC overflow auto + hidden/thin scrollbar per VPDocAside. |
| RC5 | **Dev-mode 1–3s blank before first paint.** Vite dev injects CSS via JS modules; production is fine (FCP 104ms, content visible without JS, pre-paint themes correct on first frame — `prod-load-200ms.png`). | dev `diag-load-*.png` blank at 350/1000ms; prod paint timeline. | OPEN (dev-only): investigate critical-CSS ordering / disabling after-lcp script mode in dev. |
| RC6 | Misc: view-transition reveal centers at (0,0)/center for keyboard/synthetic activation (pointer coords missing); vxrn two-pass hydration briefly renders boot-scheme runtime styles post-hydration (invisible once RC2 lands and chrome styles are var-driven); Tamagui duplicate-bundle warning appears in dev deps optimization only (absent from production dist). | dev console; `prod-toggle-250ms.png`. | OPEN (small) |

## Architecture target (theirs vs ours)

- **Scheme:** one source of truth — vxrn scheme (class `t_dark`/`t_light` pre-paint + resolved value) driving BOTH the html class and the Tamagui `<Theme>` (done, RC1).
- **Custom palettes:** defined once in the Tamagui theme config (generating both the
  CSS classes/vars AND runtime values), selected by html class exactly like
  VitePress's `.dark` + palette classes. root.css keeps only what the config
  cannot express. (RC2 rebuild.)
- **Scroll:** the document is the only page scroller (true today); rails
  (sidebar, ToC) are fixed/sticky with their own hidden-scrollbar overflow,
  never members of the document flow taller than the viewport. (RC4 rebuild.)
- **State:** persisted UI state reads must be hydration-stable: SSR default →
  storage sync in an effect (already the pattern), with all visual consequences
  expressed through vars/classes applied pre-paint so nothing flashes.
