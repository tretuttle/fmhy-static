import Svg, { Path } from '~/icons/svg'

import { useIconProps } from '~/icons/useIconProps'

import type { IconProps } from '~/icons/types'

// iconify gravity-ui:code — fmhy.net's [Source Code] sub-link icon
// (upstream transformer.ts "i-gravity-ui:code")
export const SourceCodeIcon = (props: IconProps) => {
  const { width, height, fill, ...svgProps } = useIconProps(props)

  return (
    <Svg width={width} height={height} viewBox="0 0 16 16" fill="none" {...svgProps}>
      <Path
        d="M10.218 3.216a.75.75 0 0 0-1.436-.431l-3 10a.75.75 0 0 0 1.436.43zM4.53 4.97a.75.75 0 0 1 0 1.06L2.56 8l1.97 1.97a.75.75 0 0 1-1.06 1.06l-2.5-2.5a.75.75 0 0 1 0-1.06l2.5-2.5a.75.75 0 0 1 1.06 0m6.94 6.06a.75.75 0 0 1 0-1.06L13.44 8l-1.97-1.97a.75.75 0 0 1 1.06-1.06l2.5 2.5a.75.75 0 0 1 0 1.06l-2.5 2.5a.75.75 0 0 1-1.06 0"
        fill={fill}
        fillRule="evenodd"
        clipRule="evenodd"
      />
    </Svg>
  )
}
