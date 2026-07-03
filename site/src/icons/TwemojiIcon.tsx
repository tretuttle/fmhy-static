// colorful twemoji markers, matching fmhy.net's i-twemoji-* spans (uno
// preset-icons over @iconify-json/twemoji — see upstream markdown/emoji.ts).
// the SVGs are self-hosted in site/public/twemoji, fetched from
// https://cdn.jsdelivr.net/gh/jdecked/twemoji (the set iconify mirrors).
//
// web half of the platform fork (TwemojiIcon.native.tsx): the raw <img> is
// deliberate — exact fmhy.net parity, lazy-loaded, no wrapper element.
export { TWEMOJI_CODES } from './twemojiCodes'

export const TwemojiIcon = ({
  code,
  size = 14,
}: {
  code: string
  size?: number
}) => (
  <img
    src={`/twemoji/${code}.svg`}
    alt=""
    aria-hidden
    width={size}
    height={size}
    loading="lazy"
    draggable={false}
    style={{ display: 'block' }}
  />
)
