# FMHY Static — Complete Scope (fmhy.net visual parity)

- **Date:** 2026-06-30 (rev: target corrected to fmhy.net)
- **Target repo:** `/home/trent/fmhy-static/site` (branch `feat/ui-parity`)
- **Canonical visual target:** **fmhy.net (live)** — NOT `fmhy-app`. fmhy-app was a
  structural reference; it diverges from fmhy.net (mono font, restructured entries). Where
  they differ, **fmhy.net wins**. Always diff in-browser against fmhy.net.

## 1. Decisions (made — not pending)
- **Entry layout = INLINE** to match fmhy.net (`⭐ **Name** - desc / links / chips` on one
  flowing line). Rework `LinkEntryRow`. Reversible if user objects.
- **Background = `#1A1A1A`** (fmhy.net) — lighten from current near-black `#080808`.
- **Native (iOS/Android) = in scope**, Track N, after web parity + deploy.
- **Inter** loaded via temporary Google `<link>`; **self-host before prod**.

## 2. Status
| phase | state |
|---|---|
| P0 foundation (shims, theme vars, icons, Container) | ✅ committed |
| P1 chrome (`_layout`, Header, WikiSidebar, Footer) | ✅ committed |
| P2 structured content (parser→JSON, 25 pages, render, home) | ✅ committed |
| P3 interactive (WikiToc, ⌘K search, filters, theme menu) | ✅ committed |
| Typography → Inter (the big "nothing like fmhy.net" fix) | ✅ committed |
Build green; dev-verified home + `/ai`.

## 3. fmhy.net reference tokens (captured live)
- link/brand: `hsl(207,65%,68%)` = `rgb(120,179,226)` (≈ my `$accent11` — keep)
- bg: `#1A1A1A` · text-1: `#dfdfd6` (warm off-white)
- tip callout: bg `rgb(12,42,32)` / border `rgb(24,70,51)` / text `rgb(176,235,201)` (≈ my `$tip*`)
- page title h1: blue, 32px, weight 600, **underlined** (it's a link)
- entry primary name: blue, weight 700, **underlined**
- in-content links underlined; nav / sidebar / card-titles / page-title-on-home NOT

## 4. Visual-parity delta audit (current → fmhy.net)
### 4A · Global / theme
- Font → Inter ✅
- **Background** `#080808` → `#1A1A1A`: shift `darkPalette[0..2]` lighter (themes-in.ts → rebuild)
- **Text** `#fefefe` → `#dfdfd6` (soften `color12`) — minor
- **Link underline scope**: currently over-underlined (card titles, etc.). Restrict underline to in-content/entry links; remove from nav/sidebar/card-titles
- Accent blue ≈ matches ✅ (verify)

### 4B · Header
- **Logo**: fmhy.net ▶ play-button mark; mine cactus favicon → swap asset (header + favicon)
- search box / nav / ecosystem / theme / socials present → verify spacing + hover

### 4C · Home
- **Hero image**: glowing ▶ play button vs cactus → swap
- title Inter ✅
- **Card titles**: remove underline (bold, no underline) + match hover
- badge / buttons / 4-col grid present → verify spacing

### 4D · Content page
- **Page title**: blue + underlined link (32/600) vs plain white → restyle H1
- **Entry rows → INLINE** (the big rework of `LinkEntryRow`)
- **Entry primary name** → blue + underlined
- **"Got feedback?" card** under the title (fmhy.net has it) → add (currently shows entry count)
- section headings (+ feedback envelope icon) → verify
- TIP/notice tokens ≈ match → verify
- ToC right rail, blue active ✅ → verify

### 4E · Search modal & mobile
- search modal: functional; styling vs fmhy.net ⌘K modal → audit + match
- mobile (<md): hamburger + single column → verify vs fmhy.net mobile

## 5. Remaining phases (dependency-ordered, each with done-criterion)

### P4 — Visual parity to fmhy.net
- 4.1 theme: bg `#1A1A1A`, soften text, scope link-underline, verify accent
- 4.2 logo asset swap (header + hero + favicon → FMHY play-button)
- 4.3 **`LinkEntryRow` → inline** (name blue+underlined, then `- desc / links / chips` inline) ← biggest
- 4.4 page-title blue+underline; add "Got feedback?" card; section/notice polish
- 4.5 home card de-underline + hover states
- **Done when:** side-by-side home + a wiki page match fmhy.net at desktop width.

### P4b — Route completeness
- feedback page + `FeedbackForm`; `/search` page; help/legal pages; header md-overflow tier;
  reconcile remaining links (footer Privacy/Terms/Help, feedback)
- **Done when:** no nav/footer/ecosystem link 404s.

### P5 — Cleanup + hardening + deploy
- delete dead MDX engine (`BlogPostLayout`, `MDXComponents`, stale `data/blog/*.mdx`),
  old `Sidebar.tsx`, `TableOfContents.tsx`, `writing+ssg`, `_draft`
- self-host Inter (replace Google `<link>`)
- breakpoint sweep xs→xxl vs fmhy.net; a11y labels
- EAS-static hydration check (search modal / popover / sheet / ToC)
- full build → EAS preview → **prod promote**; daily GitHub Action regenerates nav/corpus
- **Done when:** prod matches fmhy.net, auto-updates daily, all interactions work on static host.

### Track N — Native (iOS/Android) [after web]
- native route tree (tabs/stack), `WikiCategoryList`/`WikiHomeList` (LegendList),
  `WikiSearchContent.native`, `clipboard.native`, SafeArea, `toNativeWikiRoute`;
  reuses the JSON data layer + cross-platform Tamagui components
- **Done when:** iOS + Android simulator builds run with parity.

## 6. Dependencies
- 4.3 (inline entries) is independent — do first in P4.
- Self-host Inter (P5) before any prod deploy.
- Track N depends on web parity complete (reuses data + components).

## 7. Definition of Done
Pixel-faithful to fmhy.net across home + all 25 wiki pages + search + theme menu at every
breakpoint; all routes resolve; ⌘K search / filters / ToC / theme menu work on the deployed
EAS-static site; content auto-refreshes daily from upstream; no `@take-out`/Zero runtime;
Inter self-hosted; prod deployed. (Native: iOS + Android simulator builds run, if pursued.)
