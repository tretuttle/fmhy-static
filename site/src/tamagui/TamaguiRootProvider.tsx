import './tamagui.css'

import { MetaTheme, SchemeProvider, useUserScheme } from '@vxrn/color-scheme'
import { type ReactNode } from 'react'
import { isWeb, TamaguiProvider, Theme, useTheme } from 'tamagui'

import { config } from './tamagui.config'

export const TamaguiRootProvider = ({ children }: { children: ReactNode }) => {
  return (
    <SchemeProvider>
      <TamaguiInnerProvider>{children}</TamaguiInnerProvider>
    </SchemeProvider>
  )
}

const TamaguiInnerProvider = ({ children }: { children: ReactNode }) => {
  const userScheme = useUserScheme()

  return (
    // defaultTheme is initial-only: TamaguiProvider never re-applies it after
    // mount, so without the explicit <Theme name> below the RUNTIME theme
    // context stays frozen at the boot scheme forever while the html class
    // (and every compiled var() style) flips — the split that left dark menu
    // segments/header internals on a light page. The Theme wrapper keeps
    // JS-resolved styles in lockstep with the scheme.
    <TamaguiProvider disableInjectCSS config={config} defaultTheme={userScheme.value}>
      {isWeb && <ThemeMetaTag />}
      <Theme name={userScheme.value}>{children}</Theme>
    </TamaguiProvider>
  )
}

const ThemeMetaTag = () => {
  const theme = useTheme()
  return <MetaTheme color={theme.background.val} darkColor={'#000'} lightColor="#fff" />
}
