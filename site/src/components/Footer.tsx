import { SizableText, View, XStack } from 'tamagui'

import { GitHubIcon } from '~/icons/GitHubIcon'
import { XIcon } from '~/icons/XIcon'

import { CircleLink } from './CircleButton'
import { Container } from './Container'
import { ThemeSwitch } from './ThemeSwitch'

export function Footer() {
  return (
    <View render="footer" py="$6">
      <Container>
        <XStack items="center" justify="space-between">
          <SizableText size="$3" color="$color10" fontFamily="$mono">
            FMHY · unofficial mirror
          </SizableText>

          <XStack items="center" gap="$1">
            <CircleLink href="https://fmhy.net" tooltip="Official site">
              <XIcon size={18} />
            </CircleLink>

            <CircleLink href="https://github.com/fmhy/edit" tooltip="FMHY on GitHub">
              <GitHubIcon size={18} />
            </CircleLink>

            <ThemeSwitch />
          </XStack>
        </XStack>
      </Container>
    </View>
  )
}
