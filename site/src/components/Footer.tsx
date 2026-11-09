import { SizableText, View, YStack } from 'tamagui'

import chrome from '~/features/wiki/generated/chrome.json'

import { Container } from './Container'
import { Link } from './Link'

// upstream config.mts themeConfig.footer: shared.ts `feedback` + `commitRef`
// as the message, the Estd 2018 image link + no-hosting line as copyright.
// rev is the fmhy/edit commit the wiki data was generated from (chrome.json),
// not the mirror's own sha. VPFooter links: dashed underline, text-1 on hover.
const { commit } = chrome as typeof chrome & { commit?: string | null }

const footerLink = {
  size: '$2',
  color: '$color10',
  cursor: 'pointer',
  textDecorationLine: 'underline',
  textDecorationStyle: 'dashed',
  style: { textUnderlineOffset: 5 },
  hoverStyle: { color: '$color12' },
} as const

const ExternalLink = ({ href, children }: { href: string; children: string }) => (
  <SizableText render={<a href={href} target="_blank" rel="noreferrer" />} {...footerLink}>
    {children}
  </SizableText>
)

export function Footer() {
  return (
    <View render="footer" py="$6" mt="auto">
      <Container>
        <YStack mx="auto" width="100%" maxW={840} gap="$2">
          <SizableText size="$2" color="$color10" text="center">
            <Link href="/feedback" {...footerLink}>
              Made with ❤
            </Link>{' '}
            (rev:{' '}
            {commit ? (
              <ExternalLink href={`https://github.com/fmhy/edit/commit/${commit}`}>
                {commit.slice(0, 8)}
              </ExternalLink>
            ) : (
              'dev'
            )}
            )
          </SizableText>

          <SizableText size="$2" color="$color10" text="center">
            © {new Date().getFullYear()},{' '}
            <ExternalLink href="https://i.ibb.co/VJQmQ9t/image.png">Estd 2018.</ExternalLink>
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
