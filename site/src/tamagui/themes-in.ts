import { sandDark, sand } from '@tamagui/colors'
import { createThemes } from '@tamagui/theme-builder'

import { opacify } from './opacify'

const darkPalette = [
  '#1a1a1a',
  '#242424',
  '#282828',
  '#353535',
  '#444',
  '#484848',
  '#525252',
  '#686868',
  '#757575',
  '#9a9a9a',
  '#ccc',
  '#fefefe',
]

const lightPalette = [
  '#fff',
  '#f8f8f8',
  'hsl(0, 0%, 93%)',
  'hsl(0, 0%, 87%)',
  'hsl(0, 0%, 80%)',
  'hsl(0, 0%, 74%)',
  'hsl(0, 0%, 68%)',
  'hsl(0, 0%, 60%)',
  'hsl(0, 0%, 48%)',
  'hsl(0, 0%, 38%)',
  'hsl(0, 0%, 20%)',
  'hsl(0, 0%, 2%)',
]

const whiteBlack = {
  white: 'rgba(255,255,255,1)',
  white0: 'rgba(255,255,255,0)',
  white02: 'rgba(255,255,255,0.2)',
  white04: 'rgba(255,255,255,0.4)',
  white06: 'rgba(255,255,255,0.6)',
  white08: 'rgba(255,255,255,0.8)',
  black: 'rgba(0,0,0,1)',
  black0: 'rgba(0,0,0,0)',
  black02: 'rgba(0,0,0,0.2)',
  black04: 'rgba(0,0,0,0.4)',
  black06: 'rgba(0,0,0,0.6)',
  black08: 'rgba(0,0,0,0.8)',
}

const extraColorsDark = {
  highlight: `rgba(28,28,28, 1)`,
  highlight0: `rgba(28,28,28, 0)`,
  highlight02: `rgba(28,28,28, 0.2)`,
  highlight04: `rgba(28,28,28, 0.4)`,
  highlight06: `rgba(28,28,28, 0.6)`,
  highlight08: `rgba(28,28,28, 0.8)`,
  color1pt5: 'rgba(20,20,20)',
  color2pt5: '#222',
  surface: '#1E1E1E',
  surface0: 'rgba(30, 30, 30, 0)',
  surface02: 'rgba(30, 30, 30, 0.2)',
  surface04: 'rgba(30, 30, 30, 0.4)',
  surface06: 'rgba(30, 30, 30, 0.6)',
  surface08: 'rgba(30, 30, 30, 0.8)',
  surface085: 'rgba(30, 30, 30, 0.85)',
  surface09: 'rgba(30, 30, 30, 0.9)',
  surface095: 'rgba(30, 30, 30, 0.95)',
  color01: opacify(darkPalette[darkPalette.length - 1]!, 0.1),
  color0075: opacify(darkPalette[darkPalette.length - 1]!, 0.075),
  color005: opacify(darkPalette[darkPalette.length - 1]!, 0.05),
  color0025: opacify(darkPalette[darkPalette.length - 1]!, 0.025),
  background01: opacify(darkPalette[0]!, 0.1),
  background0075: opacify(darkPalette[0]!, 0.075),
  background005: opacify(darkPalette[0]!, 0.05),
  background0025: opacify(darkPalette[0]!, 0.025),
  gold: '#fbbf24',
  goldSoft: 'hsla(43, 96%, 56%, 0.16)',
  tipBg: 'hsl(146, 30%, 11%)',
  tipBorder: 'hsl(146, 28%, 24%)',
  tipText: 'hsl(146, 45%, 68%)',
  warnBg: 'hsl(40, 48%, 11%)',
  warnBorder: 'hsl(40, 52%, 26%)',
  warnText: 'hsl(43, 88%, 64%)',
  dangerText: 'hsl(0, 72%, 66%)',
}

const extraColorsLight = {
  highlight: whiteBlack.white,
  highlight0: whiteBlack.white0,
  highlight02: whiteBlack.white02,
  highlight04: whiteBlack.white04,
  highlight06: whiteBlack.white06,
  highlight08: whiteBlack.white08,
  color1pt5: '#f9f9f9',
  color2pt5: '#f4f4f4',
  surface: '#f5f5f7',
  surface0: 'rgba(245, 245, 247, 0)',
  surface02: 'rgba(245, 245, 247, 0.2)',
  surface04: 'rgba(245, 245, 247, 0.4)',
  surface06: 'rgba(245, 245, 247, 0.6)',
  surface08: 'rgba(245, 245, 247, 0.8)',
  surface085: 'rgba(245, 245, 247, 0.85)',
  surface09: 'rgba(245, 245, 247, 0.9)',
  surface095: 'rgba(245, 245, 247, 0.95)',
  color01: opacify(lightPalette[lightPalette.length - 1]!, 0.1),
  color0075: opacify(lightPalette[lightPalette.length - 1]!, 0.075),
  color005: opacify(lightPalette[lightPalette.length - 1]!, 0.05),
  color0025: opacify(lightPalette[lightPalette.length - 1]!, 0.025),
  background01: opacify(lightPalette[0]!, 0.1),
  background0075: opacify(lightPalette[0]!, 0.075),
  background005: opacify(lightPalette[0]!, 0.05),
  background0025: opacify(lightPalette[0]!, 0.025),
  gold: '#d98a04',
  goldSoft: 'hsla(38, 92%, 50%, 0.14)',
  tipBg: 'hsl(146, 50%, 96%)',
  tipBorder: 'hsl(146, 40%, 80%)',
  tipText: 'hsl(146, 45%, 30%)',
  warnBg: 'hsl(42, 85%, 95%)',
  warnBorder: 'hsl(42, 60%, 75%)',
  warnText: 'hsl(33, 80%, 38%)',
  dangerText: 'hsl(0, 68%, 45%)',
}

const darkShadows = {
  shadow1: 'rgba(0,0,0,0.1)',
  shadow2: 'rgba(0,0,0,0.18)',
  shadow3: 'rgba(0,0,0,0.25)',
  shadow4: 'rgba(0,0,0,0.4)',
  shadow5: 'rgba(0,0,0,0.55)',
  shadow6: 'rgba(0,0,0,0.66)',
}

const lightShadows = {
  shadow1: 'rgba(0,0,0,0.025)',
  shadow2: 'rgba(0,0,0,0.04)',
  shadow3: 'rgba(0,0,0,0.06)',
  shadow4: 'rgba(0,0,0,0.095)',
  shadow5: 'rgba(0,0,0,0.195)',
  shadow6: 'rgba(0,0,0,0.3)',
}

const blackColors = {
  black1: darkPalette[0]!,
  black2: darkPalette[1]!,
  black3: darkPalette[2]!,
  black4: darkPalette[3]!,
  black5: darkPalette[4]!,
  black6: darkPalette[5]!,
  black7: darkPalette[6]!,
  black8: darkPalette[7]!,
  black9: darkPalette[8]!,
  black10: darkPalette[9]!,
  black11: darkPalette[10]!,
  black12: darkPalette[11]!,
}

const whiteColors = {
  white1: lightPalette[0]!,
  white2: lightPalette[1]!,
  white3: lightPalette[2]!,
  white4: lightPalette[3]!,
  white5: lightPalette[4]!,
  white6: lightPalette[5]!,
  white7: lightPalette[6]!,
  white8: lightPalette[7]!,
  white9: lightPalette[8]!,
  white10: lightPalette[9]!,
  white11: lightPalette[10]!,
  white12: lightPalette[11]!,
}

// FMHY swarm-blue accent ramp (brand-1 = step 11 ≈ swarm.400)
const swarmDark = [
  'hsl(212, 45%, 9%)',  'hsl(212, 46%, 12%)', 'hsl(212, 50%, 17%)', 'hsl(212, 53%, 22%)',
  'hsl(213, 55%, 28%)', 'hsl(214, 56%, 35%)', 'hsl(215, 57%, 43%)', 'hsl(214, 60%, 51%)',
  'hsl(211, 63%, 61%)', 'hsl(208, 64%, 66%)', 'hsl(207, 65%, 70%)', 'hsl(205, 72%, 89%)',
]
const swarmLight = [
  'hsl(206, 70%, 98%)', 'hsl(206, 66%, 95%)', 'hsl(206, 65%, 90%)', 'hsl(206, 65%, 84%)',
  'hsl(207, 65%, 78%)', 'hsl(207, 64%, 70%)', 'hsl(208, 62%, 62%)', 'hsl(211, 60%, 56%)',
  'hsl(215, 57%, 53%)', 'hsl(217, 55%, 49%)', 'hsl(218, 53%, 45%)', 'hsl(220, 48%, 24%)',
]

export const themes = createThemes({
  componentThemes: {},

  base: {
    palette: {
      dark: darkPalette,
      light: lightPalette,
    },
    extra: {
      light: {
        ...sand,
        ...lightShadows,
        ...blackColors,
        ...whiteColors,
        shadowColor: lightShadows.shadow1,
        ...whiteBlack,
        ...extraColorsLight,
      },
      dark: {
        ...sandDark,
        ...darkShadows,
        ...blackColors,
        ...whiteColors,
        shadowColor: darkShadows.shadow1,
        ...whiteBlack,
        ...extraColorsDark,
      },
    },
  },

  accent: {
    palette: {
      dark: swarmDark,
      light: swarmLight,
    },
  },

  childrenThemes: {
    black: {
      palette: {
        dark: Object.values(blackColors),
        light: Object.values(blackColors),
      },
    },
    white: {
      palette: {
        dark: Object.values(whiteColors),
        light: Object.values(whiteColors),
      },
    },
    tan: {
      palette: {
        dark: Object.values(sandDark),
        light: Object.values(sand),
      },
    },
  },
})
