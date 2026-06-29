import { getMDXComponent } from 'mdx-bundler/client'
import { Head, useParams } from 'one'
import { useMemo } from 'react'
import { H1, SizableText, View, XStack, YStack } from 'tamagui'

import { Container } from '~/components/Container'
import { HeadInfo } from '~/components/HeadInfo'
import { components } from '~/components/MDXComponents'
import { TableOfContents } from '~/components/TableOfContents'

import type { Frontmatter } from '@vxrn/mdx'

type BlogPostLayoutProps = {
  code: string
  frontmatter: Frontmatter
  isDraft?: boolean
  ogImage?: string
}

export function BlogPostLayout({
  code,
  frontmatter,
  isDraft,
  ogImage,
}: BlogPostLayoutProps) {
  const { slug } = useParams()
  const Component = useMemo(() => getMDXComponent(code), [code])

  const date = frontmatter.publishedAt
    ? new Date(frontmatter.publishedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null

  const hasImage = Boolean(frontmatter.image && frontmatter.imageMeta)

  return (
    <Container position="relative" py="$5" gap="$5" flex={1}>
      <Head>
        <HeadInfo
          title={isDraft ? `${frontmatter.title} (Draft)` : frontmatter.title}
          description={frontmatter.description}
          noindex={isDraft}
          openGraph={{
            type: 'article',
            url: isDraft ? `/_draft/${slug}` : `/${slug}`,
            images: ogImage
              ? [{ url: ogImage, width: 1200, height: 630 }]
              : frontmatter.image
                ? [
                    {
                      url: frontmatter.image,
                      width: frontmatter.imageMeta?.width,
                      height: frontmatter.imageMeta?.height,
                    },
                  ]
                : undefined,
            article: {
              publishedTime: frontmatter.publishedAt,
              author: 'Your Name',
            },
          }}
        />
      </Head>

      <YStack
        $lg={{
          pr: hasImage ? 260 : 0,
        }}
        gap="$2"
        pt="$10"
      >
        <XStack items="center" gap="$3" flexWrap="wrap">
          <H1
            size="$10"
            $md={{ size: '$12', letterSpacing: -3 }}
            letterSpacing={-2}
            select="none"
          >
            {frontmatter.title}
          </H1>
          {isDraft && (
            <SizableText
              size="$2"
              bg="$color4"
              color="$color11"
              px="$2"
              py="$1"
              rounded="$2"
              fontFamily="$mono"
              fontWeight="600"
            >
              DRAFT
            </SizableText>
          )}
        </XStack>

        <XStack>
          <SizableText size="$5" color="$color9" fontFamily="$mono" select="none">
            {!!date && date}
            {!!frontmatter.description && <> · {frontmatter.description}</>}
          </SizableText>
        </XStack>
      </YStack>

      {hasImage && (
        <View
          my="$2"
          mb="$4"
          rounded="$4"
          overflow="hidden"
          $lg={{
            position: 'absolute',
            t: 15,
            r: -10,
            width: 280,
            maxH: 280,
            rotate: '3deg',
          }}
          style={{
            aspectRatio: `${frontmatter.imageMeta!.width} / ${frontmatter.imageMeta!.height}`,
            background: frontmatter.imageMeta!.blurDataURL
              ? `url(${frontmatter.imageMeta!.blurDataURL}) center/cover no-repeat`
              : undefined,
          }}
        >
          <img
            src={frontmatter.image}
            alt={frontmatter.title}
            width={frontmatter.imageMeta!.width}
            height={frontmatter.imageMeta!.height}
            style={{
              width: '100%',
              height: 'auto',
              display: 'block',
              borderRadius: 8,
            }}
          />
        </View>
      )}

      <TableOfContents hasImage={hasImage} headings={frontmatter.headings} />

      <YStack py="$2">
        <Component components={components} />
      </YStack>
    </Container>
  )
}
