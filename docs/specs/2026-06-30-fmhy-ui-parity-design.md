# FMHY UI-Parity Refactor — Complete Scope

- **Date:** 2026-06-30
- **Status:** In progress (Phase 0 done, Phase 1 chrome done pending build)
- **Target:** `/home/trent/fmhy-static/site` (branch `feat/ui-parity`)
- **Source of truth UI:** `/home/trent/fmhy-app` (branch `feat/home-layout-rework`)

## Goal

Make this static site (One + Tamagui, SSG → EAS Hosting) **visually and behaviorally
identical** to `fmhy-app`'s entire FMHY wiki UI — all chrome, content, and interaction —
with content flowing live from upstream `fmhy/edit` markdown via the daily sync.

## Strategy (decided)

- **Wholesale look, adapted construction.** Both repos share Tamagui *tokens*, not the
  245-file `~/interface/` component lib. So re-implement each `fmhy-app` component on raw
  Tamagui + static's own primitives (`~/components/Link`, `CircleButton`, `~/interface/text`,
  Tamagui `Button`/`Popover`/`Sheet`). Match the look; never drag in `@take-out/*` runtime.
- **Content = Option A:** reuse `fmhy-app`'s parser (`scripts/wiki/parse.ts`) to turn synced
  `.md` → `data/wiki/<slug>.json`, static-imported by each param-free `+ssg` route. Prose
  pages stay on the MDX runtime. `.mdx` stays the on-disk format + sync path.
- **Routing:** keep generated param-free `<slug>+ssg.tsx` routes (EAS-static hydration fix).
  One `_layout` shell branches home (full-width) vs content (3-column).
- **Breakpoints:** static is `md=600/lg=800/xl=1024` (min-width); `fmhy-app` uses Tamagui
  defaults (~md768/lg1024). Translate intent per surface, never copy `$md/$lg` blindly.

## Complete component ledger (every fmhy-app file → target)

Legend: ✅ done · 🔜 next · ⏳ later · ➖ web-skip (native track) · ☐ optional

### Chrome — `features/site/ui` + `features/theme` + layout
| source | target | approach | status |
|---|---|---|---|
| `SiteHeader.tsx` | `src/components/Header.tsx` | adapt (3-tier) | ✅ P1 |
| `interface/headers/ScrollHeader.tsx` | `src/components/ScrollHeader.tsx` | adapt | ✅ P1 |
| `SiteFooter.tsx` | `src/components/Footer.tsx` | adapt | ✅ P1 |
| `SiteRootLayout` + `(wiki)/_layout.tsx` | `app/_layout.tsx` | merge → 1 shell | ✅ P1 |
| `EcosystemMenu.tsx` | inlined in Header (Popover) | adapt | ✅ P1 |
| `SocialLinksRow.tsx` | inlined in Header | adapt | ✅ P1 |
| `HeaderSearchBox.tsx` | placeholder in Header | adapt | ⏳ P3 (wire) |
| `WikiSidebar.tsx` (nav) | `src/components/WikiSidebar.tsx` | adapt | ✅ P1 nav / ⏳ P3 OptionsCard |
| `ThemeController.tsx` | `src/features/theme/ThemeController.tsx` | port | ✅ P0 |
| `themeSettings.ts` | `src/features/theme/themeSettings.ts` | port | ✅ P0 |
| `HeaderOverflowMenu.tsx` | Header md-tier overflow | adapt | ⏳ P4 |
| `ThemeMenu.tsx` | real theme menu (replace placeholder) | adapt | ⏳ P3 |
| `useIsDark.ts` | `src/features/theme/useIsDark.ts` | port | ⏳ P3 |
| `InfoCard.tsx`, `LegalPage.tsx` | legal/help pages | adapt | ☐ P4 |

### Foundation / shared
| source | target | status |
|---|---|---|
| `@take-out/helpers` (emitter/storage) | `src/lib/emitter.ts`, `src/lib/storage.ts` | ✅ P0 |
| 16 Phosphor icons | `src/icons/phosphor/*` | ✅ P0 |
| `PageContainer` | `src/components/Container.tsx` (responsive) | ✅ P0 |
| root.css theme overrides + scroll-padding | `app/root.css` | ✅ P0 |

### Content pipeline — `scripts/wiki` + data
| source | target | approach | status |
|---|---|---|---|
| `scripts/wiki/parse.ts` | `site/scripts/wiki/parse.ts` | port ~verbatim | 🔜 P2 |
| `scripts/wiki/constants.ts` | `site/scripts/wiki/constants.ts` | port (headers map, reddit pages, sublink icons, platform tokens) | 🔜 P2 |
| `scripts/wiki/generate.ts` | `site/scripts/wiki/generate.ts` | adapt: read synced `docs/`, emit `data/wiki/*.json` + `nav.json` + `search-corpus.json` + `notes.json` | 🔜 P2 |
| `scripts/convert-fmhy.ts` | rewrite: branch prose(MDX) vs wiki(JSON); emit per-type route templates | 🔜 P2 |
| `scripts/sync-fmhy.ts` | update: run wiki generate in the sync | 🔜 P2 |
| `features/wiki/types.ts` | `src/features/wiki/types.ts` | port verbatim | 🔜 P2 |
| `features/wiki/data.ts` | `src/features/wiki/data.ts` | adapt: static JSON imports | 🔜 P2 |
| `generated/json-modules.d.ts` | `src/features/wiki/generated/` | port | 🔜 P2 |
| `useWikiPage.ts` | likely drop (SSG loads per route) | evaluate | 🔜 P2 |

### Content rendering
| source | target | approach | status |
|---|---|---|---|
| `InlineMarkdown.tsx` | port | adapt links → `~/components/Link` + `openExternal` + note tooltip | 🔜 P2 |
| `LinkEntryRow.tsx` (+ MarkerIcon/TitleLink/MirrorChips/AlternativeInline/SubLinkChip/copy) | port | adapt to raw Tamagui + `~/icons` | 🔜 P2 |
| `WikiNotice.tsx` | port | remap `$green/$yellow` → `tip*/warn*` tokens | 🔜 P2 |
| `WikiSectionList.tsx` | port | + `Anchor` (data-toc attrs), CrossrefRow, filters | 🔜 P2 |
| `WikiCategoryContent.tsx` | port | page header + entry count | 🔜 P2 |
| `interface/text/Headings` (`SepHeading`) | verify/extend static `src/interface/text/Headings.tsx` | 🔜 P2 |
| `Anchor` (toc hooks) | create (data-toc-level/title + id) | 🔜 P2 |
| `notes.ts` | port (note-link parse → tooltip) | 🔜 P2 |
| `entryVisibility.ts` | port (filter logic) | 🔜 P2 (wired P3) |
| `openExternal.ts`, `clipboard.ts`, `routes.ts` | port (web variants; skip `.native`) | 🔜 P2 |

### Home
| source | target | status |
|---|---|---|
| `WikiHomeContent.tsx` | rewrite `app/index+ssg.tsx` body | 🔜 P2 |
| `CategoryCard.tsx` | `src/features/wiki/CategoryCard.tsx` | 🔜 P2 |
| `LucideIcon.tsx` | port (needs `lucide-react-native` or inline subset) | 🔜 P2 |
| `homeFeatures.ts` | port (category card data) | 🔜 P2 |

### Interactive rails
| source | target | status |
|---|---|---|
| `WikiToc.tsx` | `src/components/WikiToc.tsx` + wire into `_layout` content branch | ⏳ P3 |
| `useWikiSearch.ts` | port (8-tier rank, fuzzy, recent) | ⏳ P3 |
| `searchHighlight.ts` | port | ⏳ P3 |
| `WikiSearchModal.tsx` | port (Tamagui Dialog/Sheet, ⌘K) | ⏳ P3 |
| `WikiSearchContent.tsx` | port | ⏳ P3 |
| `WikiSearchButton.tsx` | port + wire header search box/compact button (emitter open) | ⏳ P3 |
| `useWikiFilters.tsx` | port (context) | ⏳ P3 |
| `wikiSettingsStorage.ts` | port (storage shim: showNsfw/fuzzy/recent) | ⏳ P3 |
| `WikiFilterButtons.tsx` / OptionsCard | port into WikiSidebar | ⏳ P3 |
| `ThemeMenu.tsx` (mode segment + accent picker + monochrome) | replace header placeholder | ⏳ P3 |

### Routes / misc pages
| source | target | status |
|---|---|---|
| `(wiki)/[category]+ssg.tsx` | per-slug `<slug>+ssg.tsx` (rewrite body → WikiCategoryContent) | 🔜 P2 |
| `(wiki)/search.tsx` | `app/search.tsx` (full-page search) | ⏳ P3 |
| `(wiki)/feedback.tsx` + `FeedbackForm.tsx` | `app/feedback.tsx` (POST api.fmhy.net) | ☐ P4 |
| `help+ssg.tsx`, `(legal)/*` | help/legal pages (footer links) | ☐ P4 |

### Native track (SEPARATE, optional) — `app/(app)/home/(tabs)/*`
`WikiCategoryList`, `WikiHomeList`, `WikiSearchContent.native`, `clipboard.native`, native tab
routes, `toNativeWikiRoute`, SafeArea. ➖ Not in the web-parity core. Pursue only if iOS/Android
builds are still wanted; the JSON data layer is reusable, but the route tree + virtualized lists
are a distinct build. **Decision needed before starting Track N.**

## Phases (dependency-ordered, each independently buildable/deployable)

- **P0 Foundation** ✅ — shims, theme variants, icons, root.css, Container.
- **P1 Static chrome** ✅(pending build) — `_layout` shell, Header+ScrollHeader, WikiSidebar(nav), Footer.
- **P2 Content + home** 🔜 — parser/constants/generate port; convert-fmhy/sync rewrite; types/data; InlineMarkdown, LinkEntryRow, WikiNotice, WikiSectionList, WikiCategoryContent, SepHeading, Anchor, notes; route-body rewrite; home (WikiHomeContent, CategoryCard, LucideIcon, homeFeatures); slug/route reconciliation.
- **P3 Interactive** ⏳ — WikiToc; search (modal/content/button/useWikiSearch/highlight/corpus); filters (useWikiFilters/settings/OptionsCard/entryVisibility wiring); theme menu (ThemeMenu/useIsDark); mount modal + ⌘K listener in `_layout`.
- **P4 Completeness** ⏳ — feedback page+form, search/help/legal routes, HeaderOverflowMenu md-tier, reconcile every nav/footer/ecosystem link to a real route.
- **P5 Parity audit** ⏳ — breakpoint sweep (xs→xxl) via browser screenshots vs SOURCE; fix `$md/$lg/$xl` drift (grep every ported file); exact ScrollHeader/Container px; a11y; delete dead files (old `Sidebar.tsx`, superseded MDX entry styling); EAS-static hydration check (modal/ToC/popover/Sheet); full `one build` → preview → prod promote.
- **Track N Native** ☐ — separate, gated on a go/no-go decision.

## Cross-cutting

- **Data/build:** `sync-fmhy` → fetch upstream `docs/` → `generate.ts` (parse → `data/wiki/*.json` + `nav.json` + `search-corpus.json` + `notes.json`) → `convert-fmhy` emits routes (JSON template for wiki pages, MDX template for prose). Daily GitHub Action runs the chain; nav + corpus regenerate so content stays hand-free.
- **Route/slug reconciliation:** the page set must come from one source (fmhy's headers map) so sidebar/footer/ecosystem links never 404. Known gaps today: `audio-tools`, `educational-tools`, `nsfw`, `feedback`, `/privacy-policy`, `/terms-of-service`, `/help`.
- **Deps to add:** likely `lucide-react-native` (LucideIcon) — confirm in P2; nothing else beyond existing Tamagui/One.

## Risks

1. **Breakpoint translation** (#1 bug source): grep `$md/$lg/$xl` in every ported file vs static scale.
2. **EAS-static hydration**: Sheet/Popover/SearchModal/ToC + any `navigator.platform`/`window` read — guard behind mounted flag, stable SSR shell, post-mount ToC scan w/ retry.
3. **Parser vs sanitizer**: JSON parser reads raw `docs/*.md` (not the `<{}`-escaped MDX). Option A reads raw → fine.
4. **Two-pipeline classification**: prose vs wiki driven off fmhy headers map; misclassify = wrong layout.
5. **lucide dep weight** on web-static — inline the used glyph subset if the package bloats the bundle.

## Definition of done

Every wiki category page, prose page, and the home page render pixel-faithful to `fmhy-app`
at all breakpoints; ⌘K search, starred/index/NSFW filters, right-rail ToC, and the
AMOLED/accent/monochrome theme menu all work on the deployed EAS-static site; content
auto-refreshes daily from upstream; no `@take-out/*` runtime or Zero deps pulled in;
`one build` green and promoted to prod.
