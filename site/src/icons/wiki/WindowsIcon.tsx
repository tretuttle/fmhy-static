import Svg, { Path } from 'react-native-svg'

import { useIconProps } from '~/icons/useIconProps'

import type { IconProps } from '~/icons/types'

// iconify qlementine-icons:windows-24 — fmhy.net's Windows platform indicator
// (upstream transformer.ts "i-qlementine-icons:windows-24")
export const WindowsIcon = (props: IconProps) => {
  const { width, height, fill, ...svgProps } = useIconProps(props)

  return (
    <Svg width={width} height={height} viewBox="0 0 24 24" fill="none" {...svgProps}>
      <Path
        d="M11.5 2.568L23 1v10H11.5zm-2 .272L1 4v7h8.5zM1 13v7l8.5 1.16V13zm10.5 8.4L23 22.97v-10H11.5z"
        fill={fill}
      />
    </Svg>
  )
}
