import { Paragraph, ScrollView, SizableText, View, XStack, useTheme } from 'tamagui'

type Heading = {
  title: string
  priority: number
  id: string
}

export function TableOfContents({
  headings,
  hasImage,
}: {
  headings?: Heading[]
  hasImage?: boolean
}) {
  const theme = useTheme()
  const h2s = headings?.filter((h) => h.priority === 2) || []

  if (h2s.length === 0) {
    return hasImage ? <View height={5} /> : null
  }

  const bg = theme.background.val

  return (
    <View position="relative">
      {/* sections label */}
      <SizableText
        position="absolute"
        l={0}
        t={0}
        b={0}
        z={2}
        size="$3"
        fontWeight="700"
        fontFamily="$mono"
        select="none"
        bg="$background"
        pr="$3"
        style={{ display: 'flex', alignItems: 'center' }}
      >
        Sections
      </SizableText>

      {/* left fade */}
      <View
        position="absolute"
        l={70}
        t={0}
        b={0}
        width={40}
        z={1}
        pointerEvents="none"
        style={{
          background: `linear-gradient(to right, ${bg}, transparent)`,
        }}
      />

      {/* right fade */}
      <View
        position="absolute"
        r={0}
        t={0}
        b={0}
        width={40}
        z={1}
        pointerEvents="none"
        style={{
          background: `linear-gradient(to right, transparent, ${bg})`,
        }}
      />

      {/* scrollable content */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={
          {
            paddingLeft: 100,
            paddingRight: 50,
            gap: 12,
            alignItems: 'center',
          } as any
        }
      >
        <XStack render="nav" gap="$3" items="center">
          {h2s.map((heading, i) => (
            <XStack key={heading.id} gap="$3" items="center">
              {i > 0 && (
                <SizableText size="$3" color="$color7" select="none">
                  ·
                </SizableText>
              )}
              <XStack render="a" {...{ href: `#${heading.id}` }} items="center">
                <Paragraph
                  size="$3"
                  color="$color10"
                  fontFamily="$mono"
                  hoverStyle={{ color: '$color12' }}
                  cursor="pointer"
                  whiteSpace="nowrap"
                >
                  {heading.title}
                </Paragraph>
              </XStack>
            </XStack>
          ))}
        </XStack>
      </ScrollView>
    </View>
  )
}
