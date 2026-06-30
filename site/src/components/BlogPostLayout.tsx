import { getMDXComponent } from 'mdx-bundler/client'
import { Head, useParams } from 'one'
import { useMemo } from 'react'
import { H1, Paragraph, SizableText, XStack, YStack } from 'tamagui'

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

  return (
    <Container position="relative" py="$4" gap="$3" maxW={880} flex={1}>
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

      <YStack gap="$2" pt="$2">
        <XStack items="center" gap="$3" flexWrap="wrap">
          <H1
            size="$8"
            $md={{ size: '$9' }}
            fontFamily="$heading"
            fontWeight="700"
            color="$color12"
            letterSpacing={-0.5}
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

        {!!frontmatter.description && (
          <Paragraph size="$5" color="$color10" maxW={760}>
            {frontmatter.description}
          </Paragraph>
        )}
      </YStack>

      <TableOfContents headings={frontmatter.headings} />

      <YStack pt="$1">
        <Component components={components} />
      </YStack>
    </Container>
  )
}
