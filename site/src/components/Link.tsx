import { router, useLinkTo, type Href, type LinkProps as OneLinkProps } from 'one'
import { SizableText, useDebounce, type SizableTextProps } from 'tamagui'

export type LinkProps = OneLinkProps<Href> &
  SizableTextProps & {
    replace?: boolean
  }

export function Link({ href, replace, asChild, children, ...props }: LinkProps) {
  const linkProps = useLinkTo({ href: href as string, replace })

  const handlePress = useDebounce(
    (e: any) => {
      props.onPress?.(e)

      if (e.defaultPrevented) {
        return
      }

      if (replace) {
        e.preventDefault()
        router.replace(href)
        return
      }

      linkProps.onPress(e)
    },
    1000,
    { leading: true }
  )

  return (
    <SizableText
      render="a"
      asChild={asChild ? 'except-style' : false}
      className="t_Link"
      cursor="pointer"
      $platform-web={{
        color: 'inherit',
        fontSize: 'inherit',
        fontWeight: 'inherit',
        lineHeight: 'inherit',
      }}
      focusVisibleStyle={{
        outlineWidth: 2,
        outlineColor: '$color02',
        outlineOffset: 1,
        outlineStyle: 'solid',
        rounded: '$4',
      }}
      {...props}
      {...linkProps}
      onPress={handlePress}
    >
      {children}
    </SizableText>
  )
}
