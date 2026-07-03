import { readdir, stat } from 'node:fs/promises'
import { join, parse } from 'node:path'

import sharp from 'sharp'

const PUBLIC_DIR = 'public'
const MAX_WIDTH = 1640 // 820px container × 2 for retina
const QUALITY = 50

async function optimizeImages() {
  const files = await readdir(PUBLIC_DIR)
  const images = files.filter(
    (f) => /\.(png|jpg|jpeg|webp)$/i.test(f) && !f.includes('-optimized')
  )

  for (const file of images) {
    const inputPath = join(PUBLIC_DIR, file)
    const { name } = parse(file)
    const outputPath = join(PUBLIC_DIR, `${name}.webp`)

    const before = (await stat(inputPath)).size

    const image = sharp(inputPath)
    const metadata = await image.metadata()

    const needsResize = metadata.width && metadata.width > MAX_WIDTH

    let pipeline = image
    if (needsResize) {
      pipeline = pipeline.resize(MAX_WIDTH, null, {
        withoutEnlargement: true,
      })
    }

    await pipeline.webp({ quality: QUALITY, effort: 6 }).toFile(outputPath + '.tmp')

    // replace original
    const { rename } = await import('node:fs/promises')
    await rename(outputPath + '.tmp', outputPath)

    const after = (await stat(outputPath)).size
    const saved = (((before - after) / before) * 100).toFixed(1)
    const newWidth = needsResize ? MAX_WIDTH : metadata.width

    console.info(
      `${file}: ${(before / 1024).toFixed(0)}KB → ${(after / 1024).toFixed(0)}KB (${saved}% saved, ${newWidth}px wide)`
    )
  }
}

optimizeImages().catch(console.error)
