import { Image } from 'react-native'

// native half of the platform fork (InlineImage.tsx). RN Image can't size to
// natural dimensions, so use the parsed width (capped like the web half) in a
// 4:3 box and letterbox the actual image inside it with resizeMode contain.
export const InlineImage = ({
  src,
  alt,
  width,
}: {
  src: string
  alt?: string
  width?: number
}) => (
  <Image
    source={{ uri: src }}
    accessibilityLabel={alt}
    resizeMode="contain"
    style={{
      width: width ? Math.min(width, 320) : 320,
      aspectRatio: 4 / 3,
      borderRadius: 4,
      marginTop: 6,
    }}
  />
)
