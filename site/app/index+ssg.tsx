import { Head } from 'one'

import { HeadInfo } from '~/components/HeadInfo'
import { WikiHomeContent } from '~/features/wiki/WikiHomeContent'

// home reads homeFeatures statically — keep a no-op loader so the +ssg shape holds
export function loader() {
  return {}
}

export default function HomePage() {
  return (
    <>
      <Head>
        <HeadInfo
          title="FMHY"
          description="An unofficial, auto-updating mirror of FMHY — the largest collection of free stuff on the internet."
          openGraph={{ type: 'website', url: '/' }}
        />
      </Head>

      <WikiHomeContent />
    </>
  )
}
