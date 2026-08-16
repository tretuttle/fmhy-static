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
  // render="button" keeps the UA's default button chrome (buttonface bg +
  // outset border) — reset it so the circle is bare like fmhy.net's icons
  bg: 'transparent',
  borderWidth: 0,
  p: 0,
  hoverStyle: { bg: '$color3' },
  pressStyle: { bg: '$color2' },
  focusVisibleStyle: {
    outlineWidth: 2,
    outlineColor: '$color02',
    outlineOffset: 1,
    outlineStyle: 'solid',
  },
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
      {/* render="a": asChild hands the link props to this element — without a
          real anchor it becomes a <div role="link"> that keyboard users can't
          reach (no tabindex) and middle-click/context-menu can't act on */}
      <Link asChild href={href} target="_blank" aria-label={tooltip}>
        <Circle render="a">{children}</Circle>
      </Link>
    </TooltipSimple>
  )
}
