---
name: blog-images
description: Blog post image sourcing and processing. INVOKE WHEN: finding images, Renaissance engravings, Dürer, cross-hatch, image processing, black and white conversion, thumbnails.
---

# blog images

guide for sourcing and processing blog post images in this site.

## style

blog images use **Renaissance/Baroque engravings** with fine cross-hatch detail:

- artists: Dürer, Rembrandt, Goltzius, Piranesi, De Bry
- style: detailed cross-hatching, fine linework
- format: pure black and white (no discoloration/yellowing)
- cropped to remove borders/margins

## processing pipeline

### 1. download source image

```bash
curl -L "https://upload.wikimedia.org/..." -o /tmp/source.jpg
```

### 2. convert to pure black & white

using imagemagick:

```bash
# convert to grayscale, increase contrast, threshold to pure b/w
magick /tmp/source.jpg \
  -colorspace Gray \
  -contrast-stretch 2%x1% \
  -unsharp 0x1 \
  /tmp/processed.png
```

or using gemini for intelligent b/w conversion (api key in ~/chat/.env):

```bash
export GOOGLE_GENERATIVE_AI_API_KEY=$(grep GOOGLE_GENERATIVE_AI_API_KEY ~/chat/.env | cut -d= -f2)
```

### 3. crop borders

```bash
# auto-crop whitespace borders
magick /tmp/processed.png -trim +repage /tmp/cropped.png
```

### 4. convert to webp and resize

```bash
# resize to max 1640px wide (820 × 2 for retina), convert to webp
magick /tmp/cropped.png \
  -resize "1640x>" \
  -quality 50 \
  public/image-name.webp
```

### 5. generate thumbnail

run the thumbnail script:

```bash
bun scripts/generate-thumbnails.ts
```

or manually:

```bash
magick public/image-name.webp \
  -resize 400x \
  public/thumbs/image-name-thumb.webp
```

## using in blog posts

add to mdx frontmatter:

```yaml
---
title: Post Title
image: '/image-name.webp'
---
```

## existing images

current blog images in `public/`:

- `genesis-flood.webp` - dramatic scene (metamorphoses post)
- `deucalion-flood.webp` - flood scene
- `large-horse.webp` - Dürer's Large Horse (1505)
- `erasmus.webp` - portrait

## thematic suggestions

| theme | search terms |
|-------|--------------|
| growth | botanical, tree, plant, flora |
| complexity | architecture, machinery, Tower of Babel, Piranesi |
| technology | instruments, armillary sphere, printing press |
| launching | ships, Icarus, Phaeton, flight, chariot |
| transformation | Ovid, metamorphoses, mythology |
