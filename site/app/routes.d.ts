// deno-lint-ignore-file
/* eslint-disable */
// biome-ignore: needed import
import type { OneRouter } from 'one'

declare module 'one' {
  export namespace OneRouter {
    export interface __routes<T extends string = string> extends Record<string, unknown> {
      StaticRoutes: `/` | `/_sitemap` | `/ai` | `/audio` | `/backups` | `/beginners-guide` | `/changelog` | `/developer-tools` | `/downloading` | `/educational` | `/feedback` | `/file-tools` | `/gaming` | `/gaming-tools` | `/image-tools` | `/internet-tools` | `/linux-macos` | `/misc` | `/mobile` | `/non-english` | `/privacy` | `/reading` | `/social-media-tools` | `/storage` | `/system-tools` | `/text-tools` | `/torrenting` | `/unsafe` | `/video` | `/video-tools`
      DynamicRoutes: never
      DynamicRouteTemplate: never
      IsTyped: true
      
    }
  }
}