// deno-lint-ignore-file
/* eslint-disable */
// biome-ignore: needed import
import type { OneRouter } from 'one'

declare module 'one' {
  export namespace OneRouter {
    export interface __routes<T extends string = string> extends Record<string, unknown> {
      StaticRoutes: `/` | `/_sitemap` | `/ai` | `/audio` | `/beginners-guide` | `/developer-tools` | `/downloading` | `/educational` | `/feedback` | `/file-tools` | `/gaming` | `/gaming-tools` | `/image-tools` | `/internet-tools` | `/linux-macos` | `/misc` | `/mobile` | `/non-english` | `/other/FAQ` | `/other/backups` | `/other/contributing` | `/other/selfhosting` | `/other/wallpapers` | `/posts` | `/posts/FCC` | `/posts/Internet-Archive` | `/posts/KeepAndroidOpen` | `/posts/Nov-2025` | `/posts/WWH` | `/posts/april-2023` | `/posts/april-2024` | `/posts/april-2025` | `/posts/april-2026` | `/posts/aug-2023` | `/posts/aug-2024` | `/posts/aug-2025` | `/posts/aug-2026` | `/posts/changelog-sites` | `/posts/dec-2023` | `/posts/dec-2024` | `/posts/dec-2025` | `/posts/discord` | `/posts/feb-2024` | `/posts/feb-2025` | `/posts/feb-2026` | `/posts/jan-2024` | `/posts/jan-2025` | `/posts/jan-2026` | `/posts/july-2023` | `/posts/july-2024` | `/posts/july-2025` | `/posts/july-2026` | `/posts/jun-2023` | `/posts/june-2024` | `/posts/june-2025` | `/posts/june-2026` | `/posts/mar-2025` | `/posts/mar-2026` | `/posts/march-2024` | `/posts/may-2023` | `/posts/may-2024` | `/posts/may-2025` | `/posts/may-2026` | `/posts/new-site` | `/posts/nov-2023` | `/posts/nov-2024` | `/posts/oct-2023` | `/posts/oct-2024` | `/posts/oct-2025` | `/posts/search` | `/posts/sept-2023` | `/posts/sept-2024` | `/posts/sept-2025` | `/posts/support-ia` | `/privacy` | `/reading` | `/recently-removed` | `/sandbox` | `/social-media-tools` | `/startpage` | `/storage` | `/system-tools` | `/text-tools` | `/torrenting` | `/unsafe` | `/video` | `/video-tools`
      DynamicRoutes: never
      DynamicRouteTemplate: never
      IsTyped: true
      
    }
  }
}