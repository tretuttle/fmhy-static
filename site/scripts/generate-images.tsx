#!/usr/bin/env bun

/**
 * generates thumbnail and og images for blog posts
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, parse } from 'node:path'

import satori from 'satori'
import sharp from 'sharp'

const cwd = process.cwd()
const blogDir = join(cwd, 'data', 'blog')
const publicDir = join(cwd, 'public')
const thumbDir = join(publicDir, 'thumbs')
const ogDir = join(publicDir, 'og')

const THUMB_WIDTH = 400
const OG_WIDTH = 1200
const OG_HEIGHT = 630

// extract frontmatter from mdx
function getFrontmatter(content: string): Record<string, string> {
  if (!content.startsWith('---')) return {}
  const endIndex = content.indexOf('---', 3)
  if (endIndex === -1) return {}
  const frontmatter = content.slice(3, endIndex)
  const result: Record<string, string> = {}
  for (const line of frontmatter.split('\n')) {
    const match = line.match(/^(\w+):\s*['"]?([^'"]+)['"]?$/)
    if (match?.[1] && match[2]) {
      result[match[1]] = match[2]
    }
  }
  return result
}

let fontData: Buffer | null = null
let fontBoldData: Buffer | null = null

async function loadFonts() {
  if (!fontData) {
    const res = await fetch(
      'https://cdn.jsdelivr.net/npm/@fontsource/jetbrains-mono@5.2.5/files/jetbrains-mono-latin-400-normal.woff'
    )
    fontData = Buffer.from(await res.arrayBuffer())
  }
  if (!fontBoldData) {
    const res = await fetch(
      'https://cdn.jsdelivr.net/npm/@fontsource/jetbrains-mono@5.2.5/files/jetbrains-mono-latin-700-normal.woff'
    )
    fontBoldData = Buffer.from(await res.arrayBuffer())
  }
  return { fontData, fontBoldData }
}

async function generateOgImage(
  slug: string,
  frontmatter: Record<string, string>
): Promise<boolean> {
  const ogPath = join(ogDir, `${slug}.png`)

  // skip if already exists
  if (existsSync(ogPath)) {
    return false
  }

  const date = frontmatter.publishedAt
    ? new Date(frontmatter.publishedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null

  // load and convert image to png
  let imageData: string | null = null
  if (frontmatter.image) {
    const imagePath = join(publicDir, frontmatter.image)
    if (existsSync(imagePath)) {
      const rawImage = readFileSync(imagePath)
      const pngBuffer = await sharp(rawImage)
        .resize(OG_WIDTH, OG_HEIGHT, { fit: 'inside', withoutEnlargement: true })
        .png({ compressionLevel: 9 })
        .toBuffer()
      imageData = `data:image/png;base64,${pngBuffer.toString('base64')}`
    }
  }

  const fonts = await loadFonts()

  const svg = await satori(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        backgroundColor: '#fff',
        fontFamily: 'JetBrains Mono',
        position: 'relative',
      }}
    >
      {imageData && (
        <img
          src={imageData}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            objectPosition: 'center top',
          }}
        />
      )}

      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '320px',
          background:
            'linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,1) 60%)',
          display: 'flex',
        }}
      />

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          padding: '48px',
          paddingTop: '0',
          position: 'relative',
          gap: '12px',
        }}
      >
        <div
          style={{
            fontSize: '56px',
            fontWeight: 700,
            color: '#000',
            lineHeight: 1.1,
            maxWidth: '900px',
          }}
        >
          {frontmatter.title}
        </div>

        <div
          style={{
            fontSize: '24px',
            fontWeight: 400,
            color: '#666',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <span>example.com</span>
          {date && <span style={{ color: '#999' }}>·</span>}
          {date && <span>{date}</span>}
        </div>
      </div>
    </div>,
    {
      width: OG_WIDTH,
      height: OG_HEIGHT,
      fonts: [
        {
          name: 'JetBrains Mono',
          data: fonts.fontData!,
          weight: 400,
          style: 'normal' as const,
        },
        {
          name: 'JetBrains Mono',
          data: fonts.fontBoldData!,
          weight: 700,
          style: 'normal' as const,
        },
      ],
    }
  )

  const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer()
  writeFileSync(ogPath, pngBuffer)
  return true
}

console.info()
console.info('🖼️  Generate Images')
console.info()

if (!existsSync(blogDir)) {
  console.info('No blog directory found')
  process.exit(0)
}

// ensure directories exist
if (!existsSync(thumbDir)) mkdirSync(thumbDir, { recursive: true })
if (!existsSync(ogDir)) mkdirSync(ogDir, { recursive: true })

const posts = readdirSync(blogDir).filter((f) => f.endsWith('.mdx'))
let thumbsGenerated = 0
let ogGenerated = 0

for (const file of posts) {
  const content = readFileSync(join(blogDir, file), 'utf-8')
  const frontmatter = getFrontmatter(content)
  const slug = parse(file).name

  // skip drafts for og images
  const isDraft = frontmatter.draft === 'true'

  // generate thumbnail
  if (frontmatter.image) {
    const imagePath = join(publicDir, frontmatter.image)
    if (existsSync(imagePath)) {
      const { name, ext } = parse(frontmatter.image)
      const thumbPath = join(thumbDir, `${name}-thumb${ext}`)

      if (existsSync(thumbPath)) {
        const sourceStat = Bun.file(imagePath)
        const thumbStat = Bun.file(thumbPath)
        if (thumbStat.lastModified >= sourceStat.lastModified) {
          console.info(`  ✓ thumb: ${name} - up to date`)
        } else {
          await sharp(imagePath).resize(THUMB_WIDTH).toFile(thumbPath)
          thumbsGenerated++
          console.info(`  ✓ thumb: ${name} - generated`)
        }
      } else {
        await sharp(imagePath).resize(THUMB_WIDTH).toFile(thumbPath)
        thumbsGenerated++
        console.info(`  ✓ thumb: ${name} - generated`)
      }
    }
  }

  // generate og image (skip drafts)
  if (!isDraft) {
    const generated = await generateOgImage(slug, frontmatter)
    if (generated) {
      ogGenerated++
      console.info(`  ✓ og: ${slug} - generated`)
    } else {
      console.info(`  ✓ og: ${slug} - up to date`)
    }
  }
}

console.info()
console.info(`✓ ${thumbsGenerated} thumbnails, ${ogGenerated} og images generated`)
console.info()
