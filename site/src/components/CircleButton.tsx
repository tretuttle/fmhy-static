import { styled, View, type ViewProps } from 'tamagui'

import { Link } from './Link'
import { TooltipSimple } from './TooltipSimple'

import type { Href } from 'one'

type CircleLinkProps = {
  href: Href
  tooltip: string
  children: React.ReactNode
}

const Circle = styled(View, {
  width: 36,
  height: 36,
  items: 'center',
  justify: 'center',
  rounded: 100,
  cursor: 'pointer',
  hoverStyle: { bg: '$color3' },
  pressStyle: { bg: '$color2' },
})

type CircleButtonProps = ViewProps & {
  tooltip: string
  children: React.ReactNode
}

export function CircleButton({ tooltip, children, ...props }: CircleButtonProps) {
  return (
    <TooltipSimple label={tooltip}>
      {/* render as a real <button> — a plain styled(View) is a <div onClick>,
          not reachable by Tab or operable with Enter/Space for keyboard users */}
      <Circle render="button" {...props}>
        {children}
      </Circle>
    </TooltipSimple>
  )
}

export function CircleLink({ href, tooltip, children }: CircleLinkProps) {
  return (
    <TooltipSimple label={tooltip}>
      <Link asChild href={href} target="_blank" aria-label={tooltip}>
        <Circle>{children}</Circle>
      </Link>
    </TooltipSimple>
  )
}
