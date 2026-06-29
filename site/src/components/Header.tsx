import { Link, usePathname, type Href } from 'one'
import { H1, Separator, SizableText, Spacer, XStack } from 'tamagui'

import { GitHubIcon } from '~/icons/GitHubIcon'
import { XIcon } from '~/icons/XIcon'

import { CircleLink } from './CircleButton'
import { Container } from './Container'
import { ScrollHeader } from './ScrollHeader'
import { ThemeSwitch } from './ThemeSwitch'

const navLinks: { name: string; href: Href }[] = [{ name: 'Browse', href: '/writing' }]

export function Header() {
  const pathname = usePathname()

  return (
    <ScrollHeader>
      <Container py="$2">
        <XStack items="center" justify="space-between">
          <XStack items="center" gap="$3" $sm={{ gap: '$6' }}>
            <Link href="/" asChild>
              <H1
                render="a"
                size="$4"
                fontWeight="400"
                cursor="pointer"
                whiteSpace="nowrap"
                color="$color"
                hoverStyle={{ opacity: 0.7 }}
                $sm={{ size: '$5' }}
              >
                FMHY
              </H1>
            </Link>

            {navLinks.length > 0 && (
              <>
                <Separator vertical minH={10} />

                {navLinks.map((link) => {
                  const isWritingLink = link.href === '/writing'
                  const isActive = isWritingLink
                    ? pathname !== '/'
                    : pathname.startsWith(link.href as string)
                  return (
                    <Link key={link.name} href={link.href} asChild>
                      <SizableText
                        render="a"
                        size="$3"
                        fontFamily="$mono"
                        fontWeight={isActive ? '600' : '400'}
                        cursor="pointer"
                        color={isActive ? '$color12' : '$color'}
                        hoverStyle={{ color: '$color12' }}
                        $sm={{ size: '$4', fontWeight: isActive ? '600' : '400' }}
                      >
                        {link.name}
                      </SizableText>
                    </Link>
                  )
                })}
              </>
            )}
          </XStack>

          <Spacer flex={1} />

          <XStack items="center" gap="$1" $sm={{ gap: '$2' }}>
            <XStack items="center">
              <CircleLink href="https://fmhy.net" tooltip="Official site">
                <XIcon size={16} />
              </CircleLink>

              <CircleLink href="https://github.com/fmhy/edit" tooltip="FMHY on GitHub">
                <GitHubIcon size={18} />
              </CircleLink>
            </XStack>

            <Separator vertical minH={10} />

            <ThemeSwitch />
          </XStack>
        </XStack>
      </Container>
    </ScrollHeader>
  )
}
