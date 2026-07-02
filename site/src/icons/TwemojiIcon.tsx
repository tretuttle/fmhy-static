// colorful twemoji markers, matching fmhy.net's i-twemoji-* spans (uno
// preset-icons over @iconify-json/twemoji — see upstream markdown/emoji.ts).
// the SVGs are self-hosted in site/public/twemoji, fetched from
// https://cdn.jsdelivr.net/gh/jdecked/twemoji (the set iconify mirrors).
export const TWEMOJI_CODES = {
  // ⭐ :star:
  star: '2b50',
  // 🌐 :globe-with-meridians:
  globeWithMeridians: '1f310',
  // 🔁 :repeat-button: (upstream transformer.ts rewrites ↪ to this)
  repeatButton: '1f501',
} as const

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
