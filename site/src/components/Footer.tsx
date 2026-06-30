import { SizableText, View, XStack, YStack } from 'tamagui'

import { Container } from './Container'

const FOOTER_LINKS = [
  { label: 'Privacy Policy', href: '/privacy-policy' },
  { label: 'Terms of Service', href: '/terms-of-service' },
  { label: 'Help', href: '/help' },
] as const

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

          {/* gap-separated links, no inline separators — nothing orphans when the row wraps */}
          <XStack gap="$4" rowGap="$2" flexWrap="wrap" justify="center">
            {FOOTER_LINKS.map((l) => (
              <SizableText
                key={l.href}
                render="a"
                href={l.href}
                size="$3"
                color="$color11"
                cursor="pointer"
                hoverStyle={{ color: '$color12' }}
              >
                {l.label}
              </SizableText>
            ))}
          </XStack>
        </YStack>
      </Container>
    </View>
  )
}
