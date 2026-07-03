/* @generated fmhy route — do not edit */
import { createRoute, Head, useLoader } from 'one'

import { HeadInfo } from '~/components/HeadInfo'
import { WikiProseContent } from '~/features/wiki/WikiProseContent'

import type { WikiProsePage } from '~/features/wiki/types'

const route = createRoute<'/posts/april-2024'>()

export const loader = route.createLoader(async () => {
  const mod = await import('~/features/wiki/generated/prose/posts/april-2024.json')
  return { page: mod.default as unknown as WikiProsePage }
})

export default function Page() {
  const { page } = useLoader(loader)
  return (
    <>
      <Head>
        <HeadInfo title={page.title} description={page.description ?? undefined} />
      </Head>
      <WikiProseContent page={page} />
    </>
  )
}
