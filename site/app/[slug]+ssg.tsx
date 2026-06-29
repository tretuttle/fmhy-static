import { createRoute, useLoader } from 'one'
import remarkSmartypants from 'remark-smartypants'

import { BlogPostLayout } from '~/components/BlogPostLayout'

import type { UnifiedPlugin } from '@vxrn/mdx'

const route = createRoute<'/[slug]'>()

export async function generateStaticParams() {
  const { getAllFrontmatter } = await import('@vxrn/mdx')
  const frontmatters = getAllFrontmatter('data/blog')
  return frontmatters
    .filter((x) => !x.draft)
    .map(({ slug }) => ({
      slug: slug.replace('blog/', ''),
    }))
}

export const loader = route.createLoader(async ({ params }) => {
  const { getMDXBySlug } = await import('@vxrn/mdx')
  const { frontmatter, code } = await getMDXBySlug('data/blog', params.slug, [
    remarkSmartypants,
  ] as UnifiedPlugin)
  return { frontmatter, code, ogImage: `/og/${params.slug}.png` }
})

export default function BlogPost() {
  const { code, frontmatter, ogImage } = useLoader(loader)
  return <BlogPostLayout code={code} frontmatter={frontmatter} ogImage={ogImage} />
}
