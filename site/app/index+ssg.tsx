import { Anchor, H1, H2, Paragraph, SizableText, View, XStack, YStack } from 'tamagui'
import { Head, Link, useLoader, type Href } from 'one'

import { Container } from '~/components/Container'
import { HeadInfo } from '~/components/HeadInfo'

export async function loader() {
  const { getAllFrontmatter } = await import('@vxrn/mdx')
  const frontmatters = getAllFrontmatter('data/blog')
    .filter((x) => !x.draft)
    .sort((a, b) => (a.title || '').localeCompare(b.title || ''))
  return { frontmatters }
}

export default function HomePage() {
  const { frontmatters } = useLoader(loader)

  return (
    <Container py="$6" gap="$7">
      <Head>
        <HeadInfo
          title="FMHY"
          description="An unofficial, auto-updating mirror of FMHY — the largest collection of free stuff on the internet."
          openGraph={{ type: 'website', url: '/' }}
        />
      </Head>

      {/* hero */}
      <YStack gap="$3" pt="$4">
        <H1 size="$11" fontFamily="$mono" fontWeight="700" select="none" letterSpacing={-1}>
          FMHY
        </H1>
        <Paragraph size="$6" color="$color12" maxW={640} fontFamily="$heading">
          Free Media Heck Yeah — the largest collection of free stuff on the internet.
        </Paragraph>
        <Paragraph size="$3" color="$color10" maxW={640} fontFamily="$mono">
          An unofficial, auto-updating build. Content syncs daily from the official{' '}
          <Anchor
            href="https://fmhy.net"
            target="_blank"
            color="$color12"
            hoverStyle={{ color: '$color11' }}
          >
            fmhy.net
          </Anchor>
          . This site does not host any files.
        </Paragraph>
      </YStack>

      {/* categories */}
      <YStack gap="$4">
        <XStack items="baseline" justify="space-between">
          <H2 size="$6" fontFamily="$mono" fontWeight="600" select="none">
            Categories
          </H2>
          <SizableText size="$2" color="$color9" fontFamily="$mono" select="none">
            {frontmatters.length} pages
          </SizableText>
        </XStack>

        <XStack flexWrap="wrap" gap="$3">
          {frontmatters.map((post) => (
            <View
              key={post.slug}
              width="100%"
              $sm={{ width: 'calc((100% - 12px) / 2)' as any }}
              $md={{ width: 'calc((100% - 24px) / 3)' as any }}
            >
              <Link href={`/${post.slug.replace('blog/', '')}` as Href} asChild>
                <YStack
                  render="a"
                  height="100%"
                  p="$3.5"
                  gap="$1.5"
                  rounded="$4"
                  bg="$color2"
                  borderWidth={1}
                  borderColor="$color4"
                  cursor="pointer"
                  hoverStyle={{ bg: '$color3', borderColor: '$color7' }}
                  pressStyle={{ bg: '$color4' }}
                >
                  <SizableText
                    size="$5"
                    fontWeight="600"
                    fontFamily="$heading"
                    numberOfLines={1}
                  >
                    {post.title}
                  </SizableText>
                  <Paragraph size="$3" color="$color10" numberOfLines={2} select="none">
                    {post.description}
                  </Paragraph>
                </YStack>
              </Link>
            </View>
          ))}
        </XStack>
      </YStack>
    </Container>
  )
}
