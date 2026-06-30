/* @generated fmhy route — do not edit */
import { createRoute, useLoader } from 'one'
import remarkSmartypants from 'remark-smartypants'

import { BlogPostLayout } from '~/components/BlogPostLayout'

import type { UnifiedPlugin } from '@vxrn/mdx'

const route = createRoute<'/gaming-tools'>()

export const loader = route.createLoader(async () => {
  const { getMDXBySlug } = await import('@vxrn/mdx')
  const { frontmatter, code } = await getMDXBySlug('data/blog', 'gaming-tools', [
    remarkSmartypants,
  ] as UnifiedPlugin)
  return { frontmatter, code, ogImage: `/og/gaming-tools.png` }
})

export default function Page() {
  const { code, frontmatter, ogImage } = useLoader(loader)
  return <BlogPostLayout code={code} frontmatter={frontmatter} ogImage={ogImage} />
}
