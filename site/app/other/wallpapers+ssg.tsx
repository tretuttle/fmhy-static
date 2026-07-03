/* @generated fmhy route — do not edit */
import { createRoute, Head, useLoader } from 'one'

import { HeadInfo } from '~/components/HeadInfo'
import { WikiProseContent } from '~/features/wiki/WikiProseContent'

import type { WikiProsePage } from '~/features/wiki/types'

const route = createRoute<'/other/wallpapers'>()

export const loader = route.createLoader(async () => {
  const mod = await import('~/features/wiki/generated/prose/other/wallpapers.json')
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
