import { styled, View } from 'tamagui'

// responsive max-width container, matching fmhy-app PageContainer
// (full width below md, then 920 -> 1120 -> 1200)
export const Container = styled(View, {
  position: 'relative',
  mx: 'auto',
  px: '$4',
  width: '100%',
  minW: 340,

  $sm: {
    px: '$6',
  },
  $md: {
    maxW: 920,
  },
  $lg: {
    maxW: 1120,
  },
  $xl: {
    // matches the wiki shell's 1440 layout max width (_layout Shell) so the
    // header/footer columns line up with the sidebar/aside at wide viewports
    maxW: 1440,
  },
})
