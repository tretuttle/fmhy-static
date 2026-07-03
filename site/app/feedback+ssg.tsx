import { createRoute, Head, useLoader } from 'one'

import { HeadInfo } from '~/components/HeadInfo'
import { WikiFeedbackContent } from '~/features/wiki/WikiFeedbackContent'

const route = createRoute<'/feedback'>()

export const loader = route.createLoader(async () => {
  const mod = await import('~/features/wiki/generated/feedback.json')
  return { quotes: (mod.default ?? mod) as unknown as string[] }
})

export default function Page() {
  const { quotes } = useLoader(loader)
  return (
    <>
      <Head>
        <HeadInfo
          title="Feedback"
          description="Anonymous comments taken from Reddit, Discord, X.com and our feedback system."
        />
      </Head>
      <WikiFeedbackContent quotes={quotes} />
    </>
  )
}
