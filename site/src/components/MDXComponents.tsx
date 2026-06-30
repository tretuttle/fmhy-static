import { Children } from 'react'
import { H1, H2, H3, H4, Paragraph, Text, View, XStack, YStack, styled } from 'tamagui'

import { GlobeIcon } from '~/icons/phosphor/GlobeIcon'
import { StarIcon } from '~/icons/phosphor/StarIcon'

import { Link } from './Link'
import { NoteLink } from './NoteLink'
import { Notice } from './Notice'

const UL = styled(YStack, {
  render: 'ul',
  my: '$2',
  ml: 0,
  gap: '$0.5',
  style: { listStyleType: 'none', paddingLeft: 0 } as any,
})

const OL = styled(YStack, {
  render: 'ol',
  my: '$2',
  ml: 0,
  gap: '$0.5',
  style: { listStyleType: 'none', paddingLeft: 0 } as any,
})

const CodeInline = styled(Text, {
  render: 'code',
  fontFamily: '$mono',
  fontSize: '$3',
  bg: '$color4',
  px: '$1.5',
  py: '$0.5',
  rounded: '$2',
})

const CodeBlock = styled(View, {
  render: 'pre',
  bg: '$color2',
  p: '$4',
  rounded: '$4',
  my: '$4',
  overflow: 'auto' as any,
})

const Details = styled(View, {
  render: 'details',
  my: '$6',
  bg: '$color2',
  rounded: '$6',
  overflow: 'hidden',
  borderWidth: 1,
  borderColor: '$color4',
})

const Summary = styled(Text, {
  render: 'summary',
  cursor: 'pointer',
  p: '$4',
  px: '$5',
  fontWeight: '600',
  fontSize: '$5',
  color: '$color12',
  display: 'block',
  hoverStyle: {
    bg: '$color3',
  },
})

// flatten children to a string (back-link hide + note detection)
function getNodeText(node: any): string {
  if (node == null || node === false) return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(getNodeText).join('')
  if (node?.props?.children) return getNodeText(node.props.children)
  return ''
}

const STAR_RE = /^\s*(?:⭐|🌟|✅)\s*/u
const INDEX_RE = /^\s*🌐\s*/u

// detect/strip a leading ⭐/🌐 marker on a list item
function getLeadingMarker(children: any): { kind: 'star' | 'index' | null; rest: any[] } {
  const arr = Children.toArray(children)
  const first = arr[0]
  if (typeof first === 'string') {
    if (STAR_RE.test(first))
      return { kind: 'star', rest: [first.replace(STAR_RE, ''), ...arr.slice(1)] }
    if (INDEX_RE.test(first))
      return { kind: 'index', rest: [first.replace(INDEX_RE, ''), ...arr.slice(1)] }
  }
  return { kind: null, rest: arr }
}

export const components = {
  h1: (props: any) => (
    <H1
      size="$8"
      mt="$7"
      mb="$3"
      fontFamily="$heading"
      fontWeight="700"
      color="$color12"
      letterSpacing={-0.5}
      {...props}
    />
  ),

  h2: (props: any) => (
    <H2
      size="$7"
      mt="$8"
      mb="$4"
      pt="$5"
      fontFamily="$heading"
      fontWeight="700"
      color="$color12"
      letterSpacing={-0.4}
      borderTopWidth={1}
      borderColor="$color4"
      {...props}
    />
  ),

  h3: (props: any) => (
    <H3 size="$6" mt="$6" mb="$2" fontFamily="$heading" fontWeight="700" color="$color12" {...props} />
  ),

  h4: (props: any) => <H4 size="$5" mt="$4" mb="$2" color="$color12" {...props} />,

  p: (props: any) => <Paragraph size="$5" my="$2.5" lineHeight={26} color="$color11" {...props} />,

  ul: (props: any) => <UL {...props} />,

  ol: (props: any) => <OL {...props} />,

  li: ({ children, ...props }: any) => {
    const { kind, rest } = getLeadingMarker(children)
    const marker =
      kind === 'star' ? (
        <StarIcon size={14} color="$gold" />
      ) : kind === 'index' ? (
        <GlobeIcon size={14} color="$color10" />
      ) : (
        <View render="span" width={5} height={5} rounded={9999} bg="$color7" />
      )
    return (
      <XStack
        render="li"
        gap="$2.5"
        items="flex-start"
        py="$0.5"
        style={{ listStyleType: 'none' } as any}
        {...props}
      >
        <View render="span" flexShrink={0} display="inline-flex" mt={kind ? 6 : 10}>
          {marker}
        </View>
        <Paragraph flex={1} size="$5" lineHeight={26} color="$color11">
          {rest}
        </Paragraph>
      </XStack>
    )
  },

  a: ({ href = '', children }: any) => {
    const text = getNodeText(children)
    // hide the redundant "◄◄ Back to Wiki Index" ornament (site has its own Header + Sidebar nav)
    if (/◄◄|Back to Wiki Index/.test(text)) return null
    // FMHY note/warning tooltip
    if (href.includes('.vitepress/notes/')) return <NoteLink href={href}>{children}</NoteLink>

    const isExternal = href?.startsWith('http')
    return (
      <>
        <Link
          href={href}
          {...(isExternal && { target: '_blank' })}
          color="$accent11"
          textDecorationLine="none"
          hoverStyle={{ color: '$accent12', textDecorationLine: 'underline' }}
          // replaces Link.tsx's own $platform-web (which pins color:'inherit') so the blue applies on web,
          // while still inheriting size/weight from the surrounding text/strong
          $platform-web={{ fontSize: 'inherit', fontWeight: 'inherit', lineHeight: 'inherit' }}
        >
          {children}
        </Link>
        {/* word-joiner keeps trailing " / " separators from wrapping oddly */}
        &#8288;
      </>
    )
  },

  strong: (props: any) => (
    <Text render="strong" fontWeight="700" whiteSpace="normal" {...props} />
  ),

  em: (props: any) => <Text render="em" fontStyle="italic" {...props} />,

  blockquote: (props: any) => (
    <View mt="$4" mb="$2" px="$4" ml="$2" borderLeftWidth={3} borderLeftColor="$color6">
      <Paragraph size="$5" color="$color11" fontStyle="italic" {...props} />
    </View>
  ),

  hr: () => <View render="hr" my="$2" height={1} width="100%" bg="$color4" borderWidth={0} />,

  img: (props: any) => (
    <View render="span" display="block" my="$4">
      <img style={{ maxWidth: '100%', borderRadius: 8 }} {...props} />
    </View>
  ),

  pre: ({ children }: any) => <>{children}</>,

  code: ({ className, children, ...props }: any) => {
    const isBlock = className?.includes('language-')
    if (isBlock) {
      return (
        <CodeBlock>
          <Text fontFamily="$mono" fontSize="$3" {...props}>
            {children}
          </Text>
        </CodeBlock>
      )
    }
    return <CodeInline {...props}>{children}</CodeInline>
  },

  Notice,

  Details: ({ children, ...props }: any) => <Details {...props}>{children}</Details>,
  Summary: (props: any) => <Summary {...props} />,
}
