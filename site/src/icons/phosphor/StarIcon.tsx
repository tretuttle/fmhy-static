import Svg, { Path } from 'react-native-svg'

import { useIconProps } from '~/icons/useIconProps'

import type { IconProps } from '~/icons/types'

export const StarIcon = (props: IconProps) => {
  const { width, height, fill, ...svgProps } = useIconProps(props)

  return (
    <Svg width={width} height={height} viewBox="0 0 256 256" fill="none" {...svgProps}>
      <Path
        d="M234.5,114.38l-45.1,39.36,13.51,58.6a16,16,0,0,1-23.84,17.34L128,199.85,77,231.69a16,16,0,0,1-23.84-17.34l13.51-58.6L21.5,114.38a16,16,0,0,1,9.11-28.06l59.46-5.15,23.21-54.84a15.95,15.95,0,0,1,29.44,0l23.21,54.84,59.45,5.15a16,16,0,0,1,9.11,28.06Z"
        fill={fill}
      />
    </Svg>
  )
}
