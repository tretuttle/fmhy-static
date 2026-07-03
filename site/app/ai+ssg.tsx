/* @generated fmhy route — do not edit */
import { createRoute, Head, useLoader } from 'one'

import { HeadInfo } from '~/components/HeadInfo'
import { WikiCategoryContent } from '~/features/wiki/WikiCategoryContent'

import type { WikiPage } from '~/features/wiki/types'

const route = createRoute<'/ai'>()

export const loader = route.createLoader(async () => {
  const mod = await import('~/features/wiki/generated/pages/ai.json')
  return { page: mod.default as unknown as WikiPage }
})

export default function Page() {
  const { page } = useLoader(loader)
  return (
    <>
      <Head>
        <HeadInfo title={page.title} description={page.description} />
      </Head>
      <WikiCategoryContent page={page} />
    </>
  )
}
