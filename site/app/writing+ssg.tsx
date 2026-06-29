import { Head, Link, useLoader, type Href } from 'one'
import { H1, Paragraph, SizableText, View, VisuallyHidden, XStack, YStack } from 'tamagui'

import { Container } from '~/components/Container'
import { HeadInfo } from '~/components/HeadInfo'

export async function loader() {
  const { getAllFrontmatter } = await import('@vxrn/mdx')
  const frontmatters = getAllFrontmatter('data/blog')
  const isDev = process.env.NODE_ENV === 'development'
  const sortedFrontmatters = frontmatters
    .filter((x) => isDev || !x.draft)
    .sort(
      (a, b) =>
        Number(new Date(b.publishedAt || '')) - Number(new Date(a.publishedAt || ''))
    )
    .map((post) => {
      let thumbnail: string | undefined
      if (post.image) {
        const parts = post.image.split('/')
        const filename = parts.pop() || ''
        const ext = filename.substring(filename.lastIndexOf('.'))
        const name = filename.substring(0, filename.lastIndexOf('.'))
        thumbnail = `/thumbs/${name}-thumb${ext}`
      }
      return { ...post, thumbnail, isDraft: !!post.draft }
    })
  return { frontmatters: sortedFrontmatters, isDev }
}

export default function WritingIndex() {
  const { frontmatters, isDev } = useLoader(loader)

  return (
    <Container py="$4" gap="$6" flex={1}>
      <Head>
        <HeadInfo
          title="Writing"
          description="Blog posts"
          openGraph={{
            type: 'website',
            url: '/writing',
          }}
        />
      </Head>

      <VisuallyHidden>
        <H1 size="$8">Writing</H1>
      </VisuallyHidden>

      <YStack gap="$4">
        {frontmatters.map((post) => {
          const date = post.publishedAt
            ? new Date(post.publishedAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })
            : null

          return (
            <Link key={post.slug} href={`/${post.slug.replace('blog/', '')}` as Href}>
              <XStack gap="$4" p="$4" rounded="$4" hoverStyle={{ bg: '$color2' }}>
                <View
                  width={100}
                  height={70}
                  rounded="$3"
                  overflow="hidden"
                  bg="$color4"
                  shrink={0}
                >
                  {post.thumbnail && (
                    <img
                      src={post.thumbnail}
                      alt={post.title}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                  )}
                </View>
                <YStack flex={1}>
                  <XStack items="center" gap="$2">
                    <SizableText size="$7" fontWeight="600" fontFamily="$heading">
                      {post.title}
                    </SizableText>
                    {isDev && post.isDraft && (
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
                  {post.description && (
                    <Paragraph size="$4" color="$color11">
                      {post.description}
                    </Paragraph>
                  )}
                  {date && (
                    <SizableText size="$3" color="$color10" mt="$2" fontFamily="$mono">
                      {date}
                    </SizableText>
                  )}
                </YStack>
              </XStack>
            </Link>
          )
        })}
      </YStack>
    </Container>
  )
}
