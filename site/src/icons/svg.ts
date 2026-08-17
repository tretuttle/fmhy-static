// single import point for svg primitives. web uses tamagui's lite shim (what
// the old vite alias pointed at); svg.native.ts uses the real react-native-svg.
// the alias itself is gone — it rewrote the shim's internal
// `export * from 'react-native-svg'` back onto the shim, which left the
// native entry with zero exports.
export { Circle, Line, Path, Rect, Svg } from '@tamagui/react-native-svg'
export type { SvgProps } from '@tamagui/react-native-svg'

// icons do `import Svg, { Path }` — mirror the package default export
export { Svg as default } from '@tamagui/react-native-svg'
