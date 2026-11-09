// seasonal branding (upstream theme/index.ts applySeasonalBranding). runs
// twice, like upstream's init + onAfterRouteChanged calls: inlined into the
// SSG <head> after the icon links (so it lands before first paint), then
// again from ThemeController after hydration and on every navigation — react
// re-creates the head links it owns during hydration, so a head-script-only
// swap would be undone. month-gated, dormant outside June and October:
//   - html.june / html.halloween classes: app/root.css swaps the navbar logo,
//     home hero and uwu egg images off them (css `content`, so nothing the
//     SSG baked has to re-render, and it can never go stale at build time)
//   - favicon / alternate / apple-touch icons -> the seasonal mark, only once
//     the asset actually loads (no broken icon if it's missing)
//   - October: theme-color -> halloween orange
// self-contained on purpose: the inline script is this function's source.

// fmhy.net's default theme-color (config.mts head)
export const THEME_COLOR = '#7bc5e4'

export function applySeasonalBranding() {
  try {
    const month = new Date().getMonth()
    if (month !== 5 && month !== 9) return
    const june = month === 5
    document.documentElement.classList.add(june ? 'june' : 'halloween')
    if (!june) {
      document.querySelectorAll("meta[name='theme-color']").forEach((meta) => {
        meta.setAttribute('content', '#EA580C')
      })
    }
    // brand assets copied from their docs/public by scripts/wiki/generate.ts
    const src = june ? '/june_icon.webp' : '/upstream/hall.png'
    const type = june ? 'image/webp' : 'image/png'
    const img = new Image()
    img.onload = () => {
      document.querySelectorAll("link[rel*='icon']").forEach((link) => {
        if (link.getAttribute('href') !== src) {
          link.setAttribute('href', src)
          if (link.hasAttribute('type')) link.setAttribute('type', type)
        }
      })
    }
    img.src = src
  } catch {}
}

export const SEASONAL_BRANDING_SCRIPT = `(${applySeasonalBranding.toString()})();`
