import { Head, Link, useLoader, type Href } from 'one'
import { H1, Paragraph, SizableText, View, XStack, YStack } from 'tamagui'

import { Container } from '~/components/Container'
import { HeadInfo } from '~/components/HeadInfo'

export async function loader() {
  const { getAllFrontmatter } = await import('@vxrn/mdx')
  const frontmatters = getAllFrontmatter('data/blog')
  const drafts = frontmatters
    .filter((x) => x.draft)
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
      return { ...post, thumbnail }
    })
  return { drafts }
}

export default function DraftsIndex() {
  const { drafts } = useLoader(loader)

  return (
    <Container py="$4" gap="$6" flex={1}>
      <Head>
        <HeadInfo title="Drafts" description="Draft posts" noindex />
      </Head>

      <H1 size="$8">Drafts</H1>

      <YStack gap="$4">
        {drafts.map((post) => {
          const date = post.publishedAt
            ? new Date(post.publishedAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })
            : null

          return (
            <Link
              key={post.slug}
              href={`/_draft/${post.slug.replace('blog/', '')}` as Href}
            >
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
                  <SizableText size="$7" fontWeight="600" fontFamily="$heading">
                    {post.title}
                  </SizableText>
                  {post.description && (
                    <Paragraph size="$4" color="$color11" mt="$1">
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

        {drafts.length === 0 && <Paragraph color="$color10">No drafts</Paragraph>}
      </YStack>
    </Container>
  )
}
