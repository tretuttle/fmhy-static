import { createRoute, Head, useLoader } from 'one'

import { HeadInfo } from '~/components/HeadInfo'
import { WikiPostsIndex } from '~/features/wiki/WikiPostsIndex'

import type { WikiPostMeta } from '~/features/wiki/types'

const route = createRoute<'/posts'>()

export const loader = route.createLoader(async () => {
  const mod = await import('~/features/wiki/generated/posts.json')
  return { posts: mod.default as unknown as WikiPostMeta[] }
})

export default function Page() {
  const { posts } = useLoader(loader)
  return (
    <>
      <Head>
        <HeadInfo title="Posts" description="All our posts, sorted by date." />
      </Head>
      <WikiPostsIndex posts={posts} />
    </>
  )
}
