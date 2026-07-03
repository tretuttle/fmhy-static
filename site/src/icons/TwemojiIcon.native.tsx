import { Text } from 'react-native'

export { TWEMOJI_CODES } from './twemojiCodes'

// native half of the platform fork (TwemojiIcon.tsx): render the platform's
// own emoji glyph — the self-hosted twemoji SVGs are a web-parity concern, and
// public/ assets aren't bundled on native anyway
const emojiFromCode = (code: string) =>
  String.fromCodePoint(...code.split('-').map((part) => Number.parseInt(part, 16)))

export const TwemojiIcon = ({
  code,
  size = 14,
}: {
  code: string
  size?: number
}) => (
  <Text accessible={false} style={{ fontSize: size, lineHeight: size + 2 }}>
    {emojiFromCode(code)}
  </Text>
)
