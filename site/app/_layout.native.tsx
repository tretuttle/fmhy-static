import { Slot } from 'one'

import { TamaguiRootProvider } from '~/tamagui/TamaguiRootProvider'

// native shell, P0: providers + router outlet only. The web _layout's chrome
// (header/sidebar/toc/search) is DOM-coupled; native grows its own from here.
export default function Layout() {
  return (
    <TamaguiRootProvider>
      <Slot />
    </TamaguiRootProvider>
  )
}
