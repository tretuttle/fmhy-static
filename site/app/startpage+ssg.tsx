import { Head } from 'one'

import { HeadInfo } from '~/components/HeadInfo'
import { WikiStartpage } from '~/features/wiki/WikiStartpage'

// static interactive page — keep a no-op loader so the +ssg shape holds
export function loader() {
  return {}
}

export default function Page() {
  return (
    <>
      <Head>
        <HeadInfo
          title="Startpage"
          description="FMHY startpage — clock, quick search, and bookmarks."
        />
      </Head>
      <WikiStartpage />
    </>
  )
}
