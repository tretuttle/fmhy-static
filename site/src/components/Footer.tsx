import { SizableText, View, YStack } from 'tamagui'

import { Container } from './Container'

export function Footer() {
  return (
    <View render="footer" py="$6" mt="auto">
      <Container>
        <YStack mx="auto" width="100%" maxW={840} gap="$3">
          <SizableText size="$2" color="$color9" text="center">
            An unofficial build of FMHY — content from{' '}
            <SizableText
              render="a"
              href="https://fmhy.net"
              target="_blank"
              rel="noopener noreferrer"
              size="$2"
              color="$color11"
              cursor="pointer"
              hoverStyle={{ color: '$color12' }}
            >
              fmhy.net
            </SizableText>{' '}
            (
            <SizableText
              render="a"
              href="https://github.com/fmhy/edit"
              target="_blank"
              rel="noopener noreferrer"
              size="$2"
              color="$color11"
              cursor="pointer"
              hoverStyle={{ color: '$color12' }}
            >
              github.com/fmhy/edit
            </SizableText>
            )
          </SizableText>

          <SizableText size="$2" color="$color8" text="center">
            This site does not host any files.
          </SizableText>
        </YStack>
      </Container>
    </View>
  )
}
