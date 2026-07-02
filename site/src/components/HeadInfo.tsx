import { usePathname } from 'one'
import { Fragment } from 'react'

// tab titles mirror fmhy.net's vitepress titleTemplate ':title • freemediaheckyeah'
const TITLE_SUFFIX = 'freemediaheckyeah'
const SITE_URL = process.env.ONE_SERVER_URL || 'https://fmhy-static.expo.app'

const OG_IMAGE_WIDTH = 1200
const OG_IMAGE_HEIGHT = 630

// og cards are prebuilt into public/og/<slug>.webp by scripts/generate-images.tsx.
// the slug scheme must match ogSlugForRoute() there: '/' -> 'home', nested
// routes join segments with '-' ('/other/backups' -> 'other-backups').
function ogSlugFromPathname(pathname: string): string {
  const clean = pathname.split(/[?#]/)[0]!.replace(/^\/+|\/+$/g, '')
  return clean === '' ? 'home' : clean.replace(/\//g, '-')
}

export function HeadInfo({
  title,
  description,
  noindex,
  openGraph,
}: {
  title?: string
  description?: string
  noindex?: boolean
  openGraph?: {
    type?: 'website' | 'article'
    url?: string
    images?: { url: string; width?: number; height?: number }[]
    article?: {
      publishedTime?: string
      author?: string
    }
  }
}) {
  const pathname = usePathname()

  // canonical/og:url derive from the active route; the explicit override wins
  const path = openGraph?.url ?? pathname ?? '/'
  const pageUrl = `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`

  // fmhy.net emits the suffixed title only in <title>; og/twitter get the raw title
  const fullTitle = title?.includes(TITLE_SUFFIX) ? title : `${title} • ${TITLE_SUFFIX}`

  const images = openGraph?.images?.length
    ? openGraph.images
    : [
        {
          url: `/og/${ogSlugFromPathname(path)}.webp`,
          width: OG_IMAGE_WIDTH,
          height: OG_IMAGE_HEIGHT,
        },
      ]

  return (
    <>
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      <link rel="canonical" href={pageUrl} />
      <meta property="og:url" content={pageUrl} />
      <meta name="twitter:url" content={pageUrl} />
      <meta property="og:type" content={openGraph?.type ?? 'website'} />

      {title && (
        <>
          <title>{fullTitle}</title>
          <meta property="og:title" content={title} />
          <meta name="twitter:title" content={title} />
        </>
      )}

      {description && (
        <>
          <meta name="description" content={description} />
          <meta property="og:description" content={description} />
          <meta name="twitter:description" content={description} />
        </>
      )}

      {images.map((image) => {
        const imageUrl = image.url.startsWith('http') ? image.url : `${SITE_URL}${image.url}`
        return (
          <Fragment key={image.url}>
            <meta property="og:image" content={imageUrl} />
            {image.width && <meta property="og:image:width" content={`${image.width}`} />}
            {image.height && <meta property="og:image:height" content={`${image.height}`} />}
            {title && <meta property="og:image:alt" content={title} />}
            <meta name="twitter:image" content={imageUrl} />
            {image.width && <meta name="twitter:image:width" content={`${image.width}`} />}
            {image.height && <meta name="twitter:image:height" content={`${image.height}`} />}
            {title && <meta name="twitter:image:alt" content={title} />}
          </Fragment>
        )
      })}

      {openGraph?.article && (
        <>
          {openGraph.article.publishedTime && (
            <meta property="article:published_time" content={openGraph.article.publishedTime} />
          )}
          {openGraph.article.author && (
            <meta property="article:author" content={openGraph.article.author} />
          )}
        </>
      )}
    </>
  )
}
