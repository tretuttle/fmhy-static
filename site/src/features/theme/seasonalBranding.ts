// seasonal branding (upstream theme/index.ts applySeasonalBranding), inlined
// into the SSG <head> after the icon links so it runs before first paint.
// month-gated, dormant outside June and October:
//   - html.june / html.halloween classes: app/root.css swaps the navbar logo,
//     home hero and uwu egg images off them (css `content`, so nothing the
//     SSG baked has to re-render, and it can never go stale at build time)
//   - favicon / alternate / apple-touch icons -> the seasonal mark
//   - October: theme-color -> halloween orange
// simplified from upstream: icons swap only once the asset actually loads
// (no broken-icon fallback if it's missing), and re-apply on popstate
// instead of a MutationObserver (which would fight react's DOM ownership).

// fmhy.net's default theme-color (config.mts head) and its October swap
export const THEME_COLOR = '#7bc5e4'
const HALLOWEEN_THEME_COLOR = '#EA580C'

// brand assets copied from their docs/public by scripts/wiki/generate.ts
const JUNE_ICON = '/june_icon.webp'
const HALLOWEEN_ICON = '/upstream/hall.png'

export const SEASONAL_BRANDING_SCRIPT = `(function(){try{
var m=new Date().getMonth();
if(m!==5&&m!==9)return;
var june=m===5;
document.documentElement.classList.add(june?'june':'halloween');
if(!june){
var tc=document.querySelector("meta[name='theme-color']");
if(tc)tc.setAttribute('content','${HALLOWEEN_THEME_COLOR}');
}
var src=june?'${JUNE_ICON}':'${HALLOWEEN_ICON}';
var type=june?'image/webp':'image/png';
var img=new Image();
img.onload=function(){
var apply=function(){
document.querySelectorAll("link[rel*='icon']").forEach(function(link){
if(link.getAttribute('href')!==src){
link.setAttribute('href',src);
if(link.hasAttribute('type'))link.setAttribute('type',type);
}
});
};
apply();
window.addEventListener('popstate',apply);
};
img.src=src;
}catch(e){}})();`
