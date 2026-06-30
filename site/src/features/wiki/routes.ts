// web build of the wiki route helpers. on web the in-app route IS the markdown
// route ("/video#anchor"), so toPlatformWikiRoute returns it untouched. the
// native stack rewrite ("/slug" -> "/home/wiki/slug") has no web target, so the
// native helper is stubbed to yield no route.

export function toNativeWikiRoute(_route: string | null): string | null {
  return null
}

export function toPlatformWikiRoute(route: string | null | undefined): string | null {
  return route ?? null
}
