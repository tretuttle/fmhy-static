import { Head } from 'one'
import { Separator, Text, YStack } from 'tamagui'

import { HeadInfo } from '~/components/HeadInfo'
import { Link } from '~/components/Link'

// mirrors VitePress's NotFound page (fmhy.net serves the stock one)
export default function NotFound() {
  return (
    <>
      <Head>
        <HeadInfo title="404" description="Page not found" noindex />
      </Head>
      <YStack flex={1} items="center" justify="center" px="$4" py="$12" gap="$0">
        <Text fontSize={64} fontWeight="600" color="$color12" lineHeight={64}>
          404
        </Text>
        <Text
          fontSize={20}
          fontWeight="700"
          letterSpacing={2}
          color="$color12"
          mt="$3"
        >
          PAGE NOT FOUND
        </Text>
        <Separator width={64} my="$6" borderColor="$color6" />
        <Text
          maxW={256}
          text="center"
          fontSize={14}
          fontWeight="500"
          color="$color9"
        >
          But if you don't change your direction, and if you keep looking, you may
          end up where you are heading.
        </Text>
        <YStack mt="$6">
          <Link
            href="/"
            aria-label="go to home"
            px="$4"
            py="$1.5"
            rounded={16}
            borderWidth={1}
            borderColor="$accent9"
            color="$accent11"
            fontSize={14}
            fontWeight="500"
            hoverStyle={{ borderColor: '$accent10', color: '$accent12' }}
          >
            Take me home
          </Link>
        </YStack>
      </YStack>
    </>
  )
}
