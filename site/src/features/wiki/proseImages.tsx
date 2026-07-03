// web half of the platform fork (proseImages.native.tsx): the three raw-<img>
// roles used by WikiProseContent. plain <img> is deliberate — exact fmhy.net
// rendering, lazy-loaded, natural sizing.

export const ProseImage = ({ src, alt }: { src: string; alt: string }) => (
  <img
    src={src}
    alt={alt}
    loading="lazy"
    style={{
      display: 'block',
      maxWidth: '100%',
      borderRadius: 8,
      margin: '8px 0',
    }}
  />
)

export const WallpaperPreview = ({ src, alt }: { src: string; alt: string }) => (
  <img
    src={src}
    alt={alt}
    loading="lazy"
    style={{
      display: 'block',
      width: '100%',
      aspectRatio: '3 / 2',
      objectFit: 'cover',
      borderRadius: 8,
    }}
  />
)

export const AuthorAvatar = ({ src, alt }: { src: string; alt: string }) => (
  <img src={src} alt={alt} width={28} height={28} loading="lazy" style={{ borderRadius: 999 }} />
)
