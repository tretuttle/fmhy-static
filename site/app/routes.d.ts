// deno-lint-ignore-file
/* eslint-disable */
// biome-ignore: needed import
import type { OneRouter } from 'one'

declare module 'one' {
  export namespace OneRouter {
    export interface __routes<T extends string = string> extends Record<string, unknown> {
      StaticRoutes: `/` | `/_draft` | `/_sitemap` | `/ai` | `/audio` | `/backups` | `/beginners-guide` | `/changelog` | `/developer-tools` | `/downloading` | `/educational` | `/file-tools` | `/gaming` | `/gaming-tools` | `/image-tools` | `/internet-tools` | `/linux-macos` | `/misc` | `/mobile` | `/non-english` | `/privacy` | `/reading` | `/social-media-tools` | `/storage` | `/system-tools` | `/text-tools` | `/torrenting` | `/unsafe` | `/video` | `/video-tools` | `/writing`
      DynamicRoutes: `/_draft/${OneRouter.SingleRoutePart<T>}`
      DynamicRouteTemplate: `/_draft/[slug]`
      IsTyped: true
      RouteTypes: {
        '/_draft/[slug]': RouteInfo<{ slug: string }>
      }
    }
  }
}

/**
 * Helper type for route information
 */
type RouteInfo<Params = Record<string, never>> = {
  Params: Params
  LoaderProps: { path: string; params: Params; request?: Request }
}