import {
  Children,
  memo,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { Paragraph, Tooltip, type TooltipProps } from 'tamagui'

export type TooltipSimpleProps = TooltipProps & {
  label?: React.ReactNode
  children?: React.ReactNode
}

// Simple emitter for tooltip state
type TooltipState = TooltipSimpleProps
type Listener = (state: TooltipState) => void

const createTooltipEmitter = () => {
  let state: TooltipState = {}
  const listeners = new Set<Listener>()

  return {
    get value() {
      return state
    },
    emit(next: TooltipState) {
      state = next
      listeners.forEach((l) => l(next))
    },
    listen(listener: Listener): () => void {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

const tooltipEmitter = createTooltipEmitter()

export const TooltipSimple = memo(({ children, label, ...props }: TooltipSimpleProps) => {
  const child = Children.only(children)
  const isHoveredRef = useRef(false)

  useEffect(() => {
    if (isHoveredRef.current) {
      tooltipEmitter.emit({ label, ...props })
    }
  }, [label])

  return (
    <Tooltip.Trigger
      scope="tooltip"
      {...(typeof label === 'string' && {
        'aria-label': label,
      })}
      asChild="except-style"
      onMouseEnter={() => {
        isHoveredRef.current = true
        tooltipEmitter.emit({ label, ...props })
      }}
      onMouseLeave={() => {
        isHoveredRef.current = false
      }}
      onFocus={() => {
        isHoveredRef.current = true
        tooltipEmitter.emit({ label, ...props })
      }}
      onBlur={() => {
        isHoveredRef.current = false
      }}
    >
      {child}
    </Tooltip.Trigger>
  )
})

export const GlobalTooltipProvider = ({
  children: providerChildren,
}: {
  children: ReactNode
}) => {
  const [open, setOpen] = useState(false)
  const [props, setProps] = useState<TooltipState>({})

  useLayoutEffect(() => {
    const unsubscribe = tooltipEmitter.listen(setProps)
    return unsubscribe
  }, [])

  const { label, children: _children, ...tooltipProps } = props
  const disabled = !label

  return (
    <Tooltip
      scope="tooltip"
      disableRTL
      offset={16}
      restMs={200}
      delay={{ open: 200, close: 100 }}
      open={open}
      onOpenChange={setOpen}
      allowFlip
      stayInFrame={{
        padding: {
          bottom: 14,
          left: 14,
          right: 14,
          top: 14,
        },
      }}
      {...tooltipProps}
      {...(disabled ? { open: false } : null)}
    >
      {providerChildren}

      <Tooltip.Content
        enterStyle={{ x: 0, y: -3, opacity: 0 }}
        exitStyle={{ x: 0, y: -3, opacity: 0 }}
        x={0}
        scale={1}
        y={0}
        opacity={disabled ? 0 : 1}
        pointerEvents="none"
        py="$1.5"
        px="$2.5"
        rounded="$2"
        borderWidth={1}
        borderColor="$color4"
        transition="100ms"
        // @ts-ignore - css-only config doesn't have animation types
        enableAnimationForPositionChange
        // @ts-ignore - css-only config doesn't have animation types
        animation="quick"
        z={100000}
      >
        <Tooltip.Arrow size="$3" borderWidth={1} borderColor="$color4" />
        <Paragraph pointerEvents="none" fontFamily="$mono" size="$2">
          {label}
        </Paragraph>
      </Tooltip.Content>
    </Tooltip>
  )
}
