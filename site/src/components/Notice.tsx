import React from 'react'
import { H3, Paragraph, YStack, styled } from 'tamagui'

function unwrapText(children: any) {
  return React.Children.toArray(children).map((x) => {
    // @ts-ignore
    return x?.props?.children ? x.props.children : x
  })
}

export const Notice = ({
  children,
  disableUnwrap,
  title,
  ...props
}: {
  children: React.ReactNode
  disableUnwrap?: boolean
  title?: string
}) => {
  return (
    <NoticeFrame {...props}>
      {title && <H3 size="$5">{title}</H3>}
      <Paragraph color="$color11">
        {disableUnwrap ? children : unwrapText(children)}
      </Paragraph>
    </NoticeFrame>
  )
}

const NoticeFrame = styled(YStack, {
  borderWidth: 1,
  borderColor: '$borderColor',
  p: '$4',
  bg: '$color2',
  rounded: '$4',
  gap: '$2',
  my: '$4',
})
