import type { FC } from 'react'
import type { SvgProps } from '~/icons/svg'
import type { ColorTokens, SizeTokens } from 'tamagui'

export type IconProps = SvgProps & {
  size?: number | SizeTokens
  color?: ColorTokens
}

export type IconComponent = FC<IconProps>
