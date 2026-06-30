import { SizableText, styled, YStack } from 'tamagui'

import { Link } from '~/components/Link'
import { H4 } from '~/interface/text/Headings'

import { LucideIcon } from './LucideIcon'

import type { LucidePrimitive } from './homeFeatures'
import type { Href } from 'one'

export const CategoryCardFrame = styled(YStack, {
  rounded: '$6',
  p: '$4',
  gap: '$2.5',
  bg: '$color2',
  borderWidth: 1,
  borderColor: '$color3',
  cursor: 'pointer',
  height: '100%',
  transition: '200ms',

  hoverStyle: {
    bg: '$color3',
    borderColor: '$color5',
  },

  pressStyle: {
    scale: 0.98,
  },
})

export type CategoryCardProps = {
  title: string
  description: string
  color: string
  href: string
  paths: LucidePrimitive[]
}

export function CategoryCard({
  title,
  description,
  color,
  href,
  paths,
}: CategoryCardProps) {
  return (
    <Link href={href as Href} asChild>
      <CategoryCardFrame>
        <YStack
          width={44}
          height={44}
          rounded="$5"
          items="center"
          justify="center"
          // raw hex + alpha tint — dynamic-color escape hatch past the token type
          bg={`${color}26` as any}
        >
          <LucideIcon paths={paths} color={color} size={24} />
        </YStack>

        <H4 size="$6" textDecorationLine="underline">
          {title}
        </H4>

        <SizableText size="$3" color="$color10" textDecorationLine="underline">
          {description}
        </SizableText>
      </CategoryCardFrame>
    </Link>
  )
}
