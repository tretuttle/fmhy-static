import { styled, View } from 'tamagui'

export const Container = styled(View, {
  mx: 'auto',
  px: '$4',
  width: '100%',
  maxW: 820,

  $sm: {
    px: '$6',
  },
})
