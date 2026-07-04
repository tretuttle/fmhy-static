import { SizableText, View, YStack } from 'tamagui'

import { Container } from './Container'

const dotted = {
  textDecorationLine: 'underline',
  textDecorationStyle: 'dotted',
} as const

export function Footer() {
  return (
    <View render="footer" py="$6" mt="auto">
      <Container>
        <YStack mx="auto" width="100%" maxW={840} gap="$2">
          <SizableText size="$2" color="$color10" text="center">
            <SizableText size="$2" color="$color10" {...dotted}>
              Made with
            </SizableText>{' '}
            ❤️ (rev:{' '}
            <SizableText size="$2" color="$color10" {...dotted}>
              {__GIT_REV__}
            </SizableText>
            )
          </SizableText>

          <SizableText size="$2" color="$color10" text="center">
            © 2026,{' '}
            <SizableText size="$2" color="$color10" {...dotted}>
              Estd 2018
            </SizableText>
            .
          </SizableText>

          <SizableText size="$2" color="$color10" text="center">
            This site does not host any files.
          </SizableText>

          <SizableText size="$1" color="$color9" text="center">
            Unofficial build of{' '}
            <SizableText
              render="a"
              href="https://fmhy.net"
              target="_blank"
              rel="noopener noreferrer"
              size="$1"
              color="$color9"
              cursor="pointer"
              hoverStyle={{ color: '$color11' }}
            >
              fmhy.net
            </SizableText>{' '}
            (
            <SizableText
              render="a"
              href="https://github.com/fmhy/edit"
              target="_blank"
              rel="noopener noreferrer"
              size="$1"
              color="$color9"
              cursor="pointer"
              hoverStyle={{ color: '$color11' }}
            >
              github.com/fmhy/edit
            </SizableText>
            )
          </SizableText>
        </YStack>
      </Container>
    </View>
  )
}
