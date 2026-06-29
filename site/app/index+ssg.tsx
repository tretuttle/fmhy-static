import { Head, Link, useLoader, type Href } from 'one'
import { H2, Paragraph, XStack, YStack, Anchor, SizableText, View } from 'tamagui'

import { Container } from '~/components/Container'
import { HeadInfo } from '~/components/HeadInfo'

export async function loader() {
  const { getAllFrontmatter } = await import('@vxrn/mdx')
  const frontmatters = getAllFrontmatter('data/blog')
  const sortedFrontmatters = frontmatters
    .filter((x) => !x.draft)
    .sort(
      (a, b) =>
        Number(new Date(b.publishedAt || '')) - Number(new Date(a.publishedAt || ''))
    )
    .map((post) => {
      // compute thumbnail path from image
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
  return { frontmatters: sortedFrontmatters }
}

// example projects - replace with your own
const projects = [
  {
    name: 'Project One',
    url: 'https://example.com',
    description: 'A cool project',
    logo: '/one-logo.svg',
  },
  {
    name: 'Project Two',
    url: 'https://example.com',
    description: 'Another project',
    logo: '/tamagui-logo.svg',
  },
]

// example timeline - replace with your own
const timeline: {
  year: string
  endYear?: string
  title: string
  description: string
  link?: { url: string; text: string }
}[] = [
  { year: '2024', title: 'Senior Engineer', description: 'ACME Corp' },
  {
    year: '2022',
    endYear: '2024',
    title: 'Software Engineer',
    description: 'Startup Inc',
  },
  { year: '2020', endYear: '2022', title: 'Junior Developer', description: 'Tech Co' },
]

export default function HomePage() {
  const { frontmatters } = useLoader(loader)

  return (
    <Container py="$6" gap="$6">
      <Head>
        <HeadInfo
          title="Your Name"
          description="Personal site and blog"
          openGraph={{
            type: 'website',
            url: '/',
          }}
        />
      </Head>

      <YStack gap="$4">
        <H2 size="$6" select="none">
          Works
        </H2>
        <XStack flexWrap="wrap" gap="$3">
          {projects.map((project) => (
            <View
              key={project.name}
              width="100%"
              $md={{
                width: 'calc((100% - 32px) / 3)' as any,
              }}
            >
              <Anchor href={project.url} target="_blank">
                <XStack
                  py="$3"
                  px="$3"
                  rounded="$4"
                  gap="$4"
                  items="center"
                  hoverStyle={{ bg: '$color2' }}
                  pressStyle={{ bg: '$color3' }}
                >
                  <View width={32} height={32} items="center" justify="center" shrink={0}>
                    <img
                      src={project.logo}
                      alt={project.name}
                      width={32}
                      height={32}
                      style={{ objectFit: 'contain' }}
                    />
                  </View>
                  <YStack flex={1} minW={0}>
                    <SizableText size="$4" fontWeight="600" fontFamily="$heading" mb={-2}>
                      {project.name}
                    </SizableText>
                    <Paragraph size="$3" color="$color9" select="none" numberOfLines={1}>
                      {project.description}
                    </Paragraph>
                  </YStack>
                </XStack>
              </Anchor>
            </View>
          ))}
        </XStack>
      </YStack>

      <YStack gap="$3">
        <Link href="/writing">
          <XStack gap="$2" items="center" hoverStyle={{ opacity: 0.8 }}>
            <SizableText
              render="h2"
              size="$6"
              select="none"
              fontFamily="$mono"
              fontWeight="600"
            >
              Writing
            </SizableText>
            <SizableText size="$5" color="$color8" fontFamily="$mono">
              →
            </SizableText>
          </XStack>
        </Link>
      </YStack>

      <XStack flexWrap="wrap" gap="$3">
        {frontmatters.slice(0, 3).map((post) => {
          const date = post.publishedAt
            ? new Date(post.publishedAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
              })
            : null

          return (
            <View
              key={post.slug}
              width="100%"
              $md={{
                width: 'calc((100% - 32px) / 3)' as any,
              }}
            >
              <Link href={`/${post.slug.replace('blog/', '')}` as Href} asChild>
                <YStack
                  render="a"
                  rounded="$4"
                  overflow="hidden"
                  bg="$color2"
                  hoverStyle={{ bg: '$color3' }}
                  cursor="pointer"
                >
                  <View height={140} bg="$color4" overflow="hidden" shrink={0}>
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
                  <YStack p="$3" gap="$1">
                    <SizableText
                      size="$4"
                      fontWeight="600"
                      fontFamily="$heading"
                      numberOfLines={1}
                    >
                      {post.title}
                    </SizableText>
                    <SizableText size="$2" color="$color10" fontFamily="$mono">
                      {date}
                    </SizableText>
                  </YStack>
                </YStack>
              </Link>
            </View>
          )
        })}
      </XStack>

      <YStack gap="$3" pt="$4">
        <H2 size="$6" select="none">
          History
        </H2>
        <YStack gap="$2.5">
          {timeline.map((item, i) => (
            <XStack key={i} gap="$4" py="$2">
              <YStack pt="$1" minW={80} shrink={0} items="flex-end">
                <SizableText text="right" size="$4" color="$color9" fontFamily="$mono">
                  {item.year}
                </SizableText>
                {item.endYear && (
                  <SizableText text="right" size="$2" color="$color6" fontFamily="$mono">
                    {item.endYear}
                  </SizableText>
                )}
              </YStack>
              <YStack flex={1}>
                <SizableText
                  mt={-2}
                  mb={-2}
                  size="$5"
                  fontWeight="600"
                  fontFamily="$heading"
                >
                  {item.title}
                </SizableText>
                <XStack gap="$2" items="center" flexWrap="wrap">
                  <Paragraph size="$4" color="$color9" select="none">
                    {item.description}
                  </Paragraph>
                  {item.link && (
                    <Anchor href={item.link.url} target="_blank">
                      <SizableText
                        size="$3"
                        color="$color10"
                        fontFamily="$mono"
                        hoverStyle={{ color: '$color11' }}
                      >
                        ({item.link.text})
                      </SizableText>
                    </Anchor>
                  )}
                </XStack>
              </YStack>
            </XStack>
          ))}
        </YStack>
      </YStack>
    </Container>
  )
}
