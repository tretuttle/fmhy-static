import Svg, { Circle, Line, Path, Rect } from '~/icons/svg'

import type { LucidePrimitive } from './homeFeatures'

type LucideIconProps = {
  paths: LucidePrimitive[]
  color: string
  size?: number
}

// renders a lucide svg (viewBox 0 0 24 24) from parsed primitives, tinted with color.
// source depended on ~/interface/icons/svg; target has none, so we build straight on
// react-native-svg (the same primitive every ~/icons/phosphor icon uses).
export function LucideIcon({ paths, color, size = 24 }: LucideIconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths.map((p, i) => {
        switch (p.type) {
          case 'path':
            return <Path key={i} d={p.d} />
          case 'line':
            return <Line key={i} x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2} />
          case 'rect':
            return (
              <Rect key={i} x={p.x} y={p.y} width={p.width} height={p.height} rx={p.rx} />
            )
          case 'circle':
            return <Circle key={i} cx={p.cx} cy={p.cy} r={p.r} />
        }
      })}
    </Svg>
  )
}
