import { H1, H2, H3, H4, Paragraph, Text, View, YStack, styled } from 'tamagui'

import { ArrowUpRightIcon } from '~/icons/ArrowUpRightIcon'

import { Link } from './Link'
import { Notice } from './Notice'

const LI = styled(Paragraph, {
  display: 'list-item' as any,
  render: 'li',
  size: '$5',
  pb: '$1',
})

const UL = styled(YStack, {
  render: 'ul',
  my: '$2',
  ml: '$4',
})

const OL = styled(YStack, {
  render: 'ol',
  my: '$2',
  ml: '$4',
})

const CodeInline = styled(Text, {
  render: 'code',
  fontFamily: '$mono',
  fontSize: '$3',
  bg: '$color3',
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

export const components = {
  h1: (props: any) => <H1 size="$9" mt="$6" mb="$4" {...props} />,

  h2: (props: any) => <H2 size="$8" mt="$8" mb="$4" pt="$4" {...props} />,

  h3: (props: any) => <H3 size="$6" mt="$6" mb="$3" {...props} />,

  h4: (props: any) => <H4 size="$5" mt="$4" mb="$2" {...props} />,

  p: (props: any) => <Paragraph size="$6" my="$3" {...props} />,

  ul: (props: any) => <UL {...props} />,

  ol: (props: any) => <OL {...props} />,

  li: (props: any) => <LI size="$6" {...props} />,

  a: ({ href = '', children }: any) => {
    const isExternal = href?.startsWith('http')
    return (
      <>
        <Link href={href} {...(isExternal && { target: '_blank' })}>
          {children}
          {isExternal && (
            <Text render="span" display="inline" whiteSpace="nowrap">
              &#8288;
              <View
                render="span"
                ml={4}
                opacity={0.5}
                display="inline-flex"
                style={{
                  marginRight: -5,
                  transform: 'translateY(-9px) translateX(-2px)',
                }}
              >
                <ArrowUpRightIcon size={8} />
              </View>
            </Text>
          )}
        </Link>
        {/* word joiner after link to prevent line break before following punctuation */}
        &#8288;
      </>
    )
  },

  strong: (props: any) => (
    <Text whiteSpace="normal" render="strong" fontWeight="600" {...props} />
  ),

  em: (props: any) => <Text render="em" fontStyle="italic" {...props} />,

  blockquote: (props: any) => (
    <View mt="$4" mb="$2" px="$4" ml="$2" borderLeftWidth={3} borderLeftColor="$color6">
      <Paragraph size="$5" color="$color11" fontStyle="italic" {...props} />
    </View>
  ),

  hr: () => (
    <YStack my="$8" mx="auto" width="50%">
      <View height={1} bg="$color2" />
    </YStack>
  ),

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
