// phosphor duotone glyphs for the theme switcher, matching fmhy.net's
// ThemeDropdown (i-ph-sun-duotone / i-ph-moon-duotone /
// i-ph-moon-stars-duotone). two layers: a 20%-opacity fill + solid detail,
// both currentColor so the wrapper's text color themes them.

type Props = { size?: number }

export const SunDuotoneIcon = ({ size = 18 }: Props) => (
  <svg width={size} height={size} viewBox="0 0 256 256" fill="none" aria-hidden="true">
      <path d="M184,128a56,56,0,1,1-56-56A56,56,0,0,1,184,128Z" fill="currentColor" opacity={0.2} />
      <path d="M120,40V16a8,8,0,0,1,16,0V40a8,8,0,0,1-16,0Zm72,88a64,64,0,1,1-64-64A64.07,64.07,0,0,1,192,128Zm-16,0a48,48,0,1,0-48,48A48.05,48.05,0,0,0,176,128ZM58.34,69.66A8,8,0,0,0,69.66,58.34l-16-16A8,8,0,0,0,42.34,53.66Zm0,116.68-16,16a8,8,0,0,0,11.32,11.32l16-16a8,8,0,0,0-11.32-11.32ZM192,72a8,8,0,0,0,5.66-2.34l16-16a8,8,0,0,0-11.32-11.32l-16,16A8,8,0,0,0,192,72Zm5.66,114.34a8,8,0,0,0-11.32,11.32l16,16a8,8,0,0,0,11.32-11.32ZM48,128a8,8,0,0,0-8-8H16a8,8,0,0,0,0,16H40A8,8,0,0,0,48,128Zm80,80a8,8,0,0,0-8,8v24a8,8,0,0,0,16,0V216A8,8,0,0,0,128,208Zm112-88H216a8,8,0,0,0,0,16h24a8,8,0,0,0,0-16Z" fill="currentColor" />
  </svg>
)

export const MoonDuotoneIcon = ({ size = 18 }: Props) => (
  <svg width={size} height={size} viewBox="0 0 256 256" fill="none" aria-hidden="true">
      <path d="M227.89,147.89A96,96,0,1,1,108.11,28.11,96.09,96.09,0,0,0,227.89,147.89Z" fill="currentColor" opacity={0.2} />
      <path d="M233.54,142.23a8,8,0,0,0-8-2,88.08,88.08,0,0,1-109.8-109.8,8,8,0,0,0-10-10,104.84,104.84,0,0,0-52.91,37A104,104,0,0,0,136,224a103.09,103.09,0,0,0,62.52-20.88,104.84,104.84,0,0,0,37-52.91A8,8,0,0,0,233.54,142.23ZM188.9,190.34A88,88,0,0,1,65.66,67.11a89,89,0,0,1,31.4-26A106,106,0,0,0,96,56,104.11,104.11,0,0,0,200,160a106,106,0,0,0,14.92-1.06A89,89,0,0,1,188.9,190.34Z" fill="currentColor" />
  </svg>
)

export const MoonStarsDuotoneIcon = ({ size = 18 }: Props) => (
  <svg width={size} height={size} viewBox="0 0 256 256" fill="none" aria-hidden="true">
      <path d="M210.69,158.18A88,88,0,1,1,97.82,45.31,96.08,96.08,0,0,0,192,160,96.78,96.78,0,0,0,210.69,158.18Z" fill="currentColor" opacity={0.2} />
      <path d="M240,96a8,8,0,0,1-8,8H216v16a8,8,0,0,1-16,0V104H184a8,8,0,0,1,0-16h16V72a8,8,0,0,1,16,0V88h16A8,8,0,0,1,240,96ZM144,56h8v8a8,8,0,0,0,16,0V56h8a8,8,0,0,0,0-16h-8V32a8,8,0,0,0-16,0v8h-8a8,8,0,0,0,0,16Zm72.77,97a8,8,0,0,1,1.43,8A96,96,0,1,1,95.07,37.8a8,8,0,0,1,10.6,9.06A88.07,88.07,0,0,0,209.14,150.33,8,8,0,0,1,216.77,153Zm-19.39,14.88c-1.79.09-3.59.14-5.38.14A104.11,104.11,0,0,1,88,64c0-1.79,0-3.59.14-5.38A80,80,0,1,0,197.38,167.86Z" fill="currentColor" />
  </svg>
)

// i-ph-palette-duotone — the Appearance panel trigger (ThemeDropdown.vue)
export const PaletteDuotoneIcon = ({ size = 20 }: Props) => (
  <svg width={size} height={size} viewBox="0 0 256 256" fill="none" aria-hidden="true">
    <path
      d="M224 127.17a96.5 96.5 0 0 1-2.39 22.18a24 24 0 0 1-23.4 18.65H152a24 24 0 0 0-24 24a24 24 0 0 1-32 22.61c-37.27-13.17-64-44.8-64-86.61a96 96 0 0 1 95-96c52.84-.53 96.55 42.35 97 95.17"
      fill="currentColor"
      opacity={0.2}
    />
    <path
      d="M200.77 53.89A103.27 103.27 0 0 0 128 24h-1.07A104 104 0 0 0 24 128c0 43 26.58 79.06 69.36 94.17A32 32 0 0 0 136 192a16 16 0 0 1 16-16h46.21a31.81 31.81 0 0 0 31.2-24.88a104.4 104.4 0 0 0 2.59-24a103.28 103.28 0 0 0-31.23-73.23m13 93.71a15.89 15.89 0 0 1-15.56 12.4H152a32 32 0 0 0-32 32a16 16 0 0 1-21.31 15.07C62.49 194.3 40 164 40 128a88 88 0 0 1 87.09-88h.9a88.35 88.35 0 0 1 88 87.25a89 89 0 0 1-2.18 20.35ZM140 76a12 12 0 1 1-12-12a12 12 0 0 1 12 12m-44 24a12 12 0 1 1-12-12a12 12 0 0 1 12 12m0 56a12 12 0 1 1-12-12a12 12 0 0 1 12 12m88-56a12 12 0 1 1-12-12a12 12 0 0 1 12 12"
      fill="currentColor"
    />
  </svg>
)

// i-ph-check (regular weight) — active row / swatch marks in the panel
export const CheckThinIcon = ({ size = 16 }: Props) => (
  <svg width={size} height={size} viewBox="0 0 256 256" fill="none" aria-hidden="true">
    <path
      d="m229.66 77.66l-128 128a8 8 0 0 1-11.32 0l-56-56a8 8 0 0 1 11.32-11.32L96 188.69L218.34 66.34a8 8 0 0 1 11.32 11.32"
      fill="currentColor"
    />
  </svg>
)
