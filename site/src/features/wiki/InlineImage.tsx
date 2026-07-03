// web half of the platform fork (InlineImage.native.tsx): a plain <img> keeps
// exact fmhy.net rendering for the occasional inline wiki image — lazy-loaded,
// natural height, capped at the upstream 320px width
export const InlineImage = ({
  src,
  alt,
  width,
}: {
  src: string
  alt?: string
  width?: number
}) => (
  <img
    src={src}
    alt={alt}
    loading="lazy"
    style={{
      display: 'block',
      width: width ? Math.min(width, 320) : undefined,
      maxWidth: '100%',
      height: 'auto',
      borderRadius: 4,
      marginTop: 6,
    }}
  />
)
