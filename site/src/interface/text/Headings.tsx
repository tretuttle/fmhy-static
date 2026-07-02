import { useState } from 'react'
import { Separator, SizableText, XStack, styled, type FontSizeTokens } from 'tamagui'

import type { ReactNode } from 'react'

export const H1 = styled(SizableText, {
  render: 'h1',
  role: 'heading',
  fontFamily: '$heading',
  size: '$10',
  fontWeight: '700',
})

export const H2 = styled(SizableText, {
  render: 'h2',
  role: 'heading',
  fontFamily: '$heading',
  size: '$9',
  fontWeight: '700',
})

export const H3 = styled(SizableText, {
  render: 'h3',
  role: 'heading',
  fontFamily: '$heading',
  size: '$8',
  fontWeight: '600',
})

export const H4 = styled(SizableText, {
  render: 'h4',
  role: 'heading',
  fontFamily: '$heading',
  size: '$6',
  fontWeight: '600',
})

export const H5 = styled(SizableText, {
  render: 'h5',
  role: 'heading',
  fontFamily: '$heading',
  size: '$5',
  fontWeight: '500',
})

export const H6 = styled(SizableText, {
  render: 'h6',
  role: 'heading',
  fontFamily: '$heading',
  size: '$4',
  fontWeight: '500',
})

export const SubHeading = styled(SizableText, {
  size: '$5',
  color: '$color10',
  fontWeight: '300',

  $lg: {
    size: '$6',
  },
})

// VitePress .header-anchor: a real <a href="#id"> permalink on the heading,
// invisible until the heading is hovered (or the anchor is keyboard-focused),
// accent colored. hover is tracked in state since tamagui has no parent-hover
// selector to reach the child from here.
export const SepHeading = ({
  children,
  size = '$4',
  anchorId,
}: {
  children: ReactNode
  size?: FontSizeTokens
  anchorId?: string
}) => {
  const [hovered, setHovered] = useState(false)

  return (
    <XStack
      mt="$6"
      mb="$4"
      items="center"
      gap="$6"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <XStack items="center" gap="$2">
        <H3 size={size} color="$color10">
          {children}
        </H3>
        {!!anchorId && (
          <SizableText
            render={
              <a
                href={`#${anchorId}`}
                aria-label={
                  typeof children === 'string'
                    ? `Permalink to "${children}"`
                    : 'Permalink'
                }
              />
            }
            size={size}
            fontWeight="500"
            color="$accent11"
            textDecorationLine="none"
            select="none"
            opacity={hovered ? 1 : 0}
            transition="200ms"
            hoverStyle={{ color: '$accent12' }}
            focusVisibleStyle={{ opacity: 1 }}
          >
            #
          </SizableText>
        )}
      </XStack>
      <Separator opacity={0.5} />
    </XStack>
  )
}
