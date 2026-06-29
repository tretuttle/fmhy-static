import { Fragment } from 'react'

const SITE_NAME = 'FMHY'
const SITE_URL = process.env.ONE_SERVER_URL || 'https://fmhy-static.expo.app'

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
  const fullTitle = title?.includes(SITE_NAME) ? title : `${title} - ${SITE_NAME}`

  return (
    <>
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      {title && (
        <>
          <title>{fullTitle}</title>
          <meta property="og:title" content={fullTitle} />
          <meta name="twitter:title" content={fullTitle} />
        </>
      )}

      {description && (
        <>
          <meta name="description" content={description} />
          <meta property="og:description" content={description} />
          <meta name="twitter:description" content={description} />
        </>
      )}

      {openGraph && (
        <>
          <meta property="og:site_name" content={SITE_NAME} />
          <meta property="og:locale" content="en_US" />

          {openGraph.url && (
            <>
              <meta property="og:url" content={`${SITE_URL}${openGraph.url}`} />
              <link rel="canonical" href={`${SITE_URL}${openGraph.url}`} />
            </>
          )}

          {openGraph.type && <meta property="og:type" content={openGraph.type} />}

          {openGraph.images?.map((image) => {
            const imageUrl = image.url.startsWith('http')
              ? image.url
              : `${SITE_URL}${image.url}`
            return (
              <Fragment key={image.url}>
                <meta property="og:image" content={imageUrl} />
                <meta name="twitter:image" content={imageUrl} />
                <meta name="twitter:card" content="summary_large_image" />
                {image.width && (
                  <meta property="og:image:width" content={`${image.width}`} />
                )}
                {image.height && (
                  <meta property="og:image:height" content={`${image.height}`} />
                )}
              </Fragment>
            )
          })}

          {openGraph.article && (
            <>
              {openGraph.article.publishedTime && (
                <meta
                  property="article:published_time"
                  content={openGraph.article.publishedTime}
                />
              )}
              {openGraph.article.author && (
                <meta property="article:author" content={openGraph.article.author} />
              )}
            </>
          )}
        </>
      )}
    </>
  )
}
