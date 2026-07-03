import { Image } from 'react-native'

// native half of the platform fork (proseImages.tsx). RN Image can't size to
// natural dimensions, so ProseImage letterboxes into a 4:3 box; the other two
// roles have fixed geometry and map directly.

export const ProseImage = ({ src, alt }: { src: string; alt: string }) => (
  <Image
    source={{ uri: src }}
    accessibilityLabel={alt}
    resizeMode="contain"
    style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: 8, marginVertical: 8 }}
  />
)

export const WallpaperPreview = ({ src, alt }: { src: string; alt: string }) => (
  <Image
    source={{ uri: src }}
    accessibilityLabel={alt}
    resizeMode="cover"
    style={{ width: '100%', aspectRatio: 3 / 2, borderRadius: 8 }}
  />
)

export const AuthorAvatar = ({ src, alt }: { src: string; alt: string }) => (
  <Image
    source={{ uri: src }}
    accessibilityLabel={alt}
    style={{ width: 28, height: 28, borderRadius: 999 }}
  />
)
