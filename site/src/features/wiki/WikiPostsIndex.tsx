import { SizableText, XStack, YStack } from 'tamagui'

import { Link } from '~/components/Link'
import { ArrowUpRightIcon } from '~/icons/phosphor/ArrowUpRightIcon'
import { H1, H2 } from '~/interface/text/Headings'
import { Text } from '~/interface/text/Text'

import type { Href } from 'one'
import type { WikiPostMeta } from './types'

// deterministic across server/client (UTC) to avoid hydration drift —
// mirrors fmhy/edit Posts.vue formatDate (month short, 2-digit day)
const formatDate = (raw: string): string => {
  if (!raw) return ''
  return new Date(raw).toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    timeZone: 'UTC',
  })
}

function groupByYear(posts: WikiPostMeta[]): { year: string; posts: WikiPostMeta[] }[] {
  const groups = new Map<string, WikiPostMeta[]>()
  for (const post of posts) {
    const year = (post.date || '').slice(0, 4) || 'Undated'
    const list = groups.get(year) ?? []
    list.push(post)
    groups.set(year, list)
  }
  return [...groups.keys()]
    .sort((a, b) => b.localeCompare(a))
    .map((year) => ({
      year,
      posts: groups
        .get(year)!
        .slice()
        .sort((a, b) => b.date.localeCompare(a.date)),
    }))
}

function PostRow({ post }: { post: WikiPostMeta }) {
  return (
    <Link asChild href={`/posts/${post.slug}` as Href}>
      <XStack
        group
        items="center"
        justify="space-between"
        py="$2"
        pl="$3.5"
        pr="$3"
        ml={-2}
        borderLeftWidth={2}
        borderLeftColor="transparent"
        cursor="pointer"
        hoverStyle={{ bg: '$color2', borderLeftColor: '$accent10' }}
      >
        <XStack items="baseline" gap="$4" minW={0}>
          <SizableText
            size="$2"
            fontFamily="$mono"
            fontWeight="500"
            color="$color9"
            textTransform="uppercase"
            whiteSpace="nowrap"
            minW={55}
          >
            {formatDate(post.date)}
          </SizableText>
          <SizableText
            size="$4"
            fontWeight="500"
            color="$color12"
            $group-hover={{ color: '$accent11' }}
          >
            {post.title}
          </SizableText>
        </XStack>
        <YStack
          opacity={0}
          x={-4}
          transition="200ms"
          $group-hover={{ opacity: 1, x: 4 }}
        >
          <ArrowUpRightIcon size={16} color="$accent11" />
        </YStack>
      </XStack>
    </Link>
  )
}

export function WikiPostsIndex({ posts }: { posts: WikiPostMeta[] }) {
  const grouped = groupByYear(posts)

  return (
    <YStack pb="$10">
      <YStack gap="$2" pt="$4" pb="$2">
        <H1
          fontSize={32}
          lineHeight={40}
          fontWeight="600"
          color="$accent11"
          textDecorationLine="underline"
        >
          Posts
        </H1>
        <SizableText size="$5" color="$color10" fontWeight="300">
          Monthly updates, announcements, and more.
        </SizableText>
        <Text size="$4" color="$color11">
          We also have an{' '}
          <Link
            href={'/feed.rss' as Href}
            target="_blank"
            color="$accent11"
            hoverStyle={{ color: '$accent12' }}
          >
            RSS feed
          </Link>
          .
        </Text>
      </YStack>

      <YStack mt="$6" gap="$8">
        {grouped.map((group) => (
          <YStack key={group.year}>
            <H2 fontSize={26} lineHeight={34} mb="$4" color="$color12">
              {group.year}
            </H2>
            <YStack ml="$1" borderLeftWidth={2} borderLeftColor="$color4">
              {group.posts.map((post) => (
                <PostRow key={post.slug} post={post} />
              ))}
            </YStack>
          </YStack>
        ))}
      </YStack>
    </YStack>
  )
}
