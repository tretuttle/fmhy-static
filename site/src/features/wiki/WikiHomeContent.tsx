import { Button, isWeb, SizableText, styled, XStack, YStack } from 'tamagui'

import { Link } from '~/components/Link'
import { H1, SubHeading } from '~/interface/text/Headings'

import { CategoryCard } from './CategoryCard'
import { homeFeatures } from './homeFeatures'
import { openExternal } from './openExternal'

// hero action links, mirroring fmhy.net
const UPDATES_URL = 'https://fmhy.net/posts'
const POSTS_URL = 'https://fmhy.net/posts'
const CONTRIBUTE_URL = 'https://fmhy.net/other/contributing'
const DISCORD_URL = 'https://github.com/fmhy/FMHY/wiki/FMHY-Discord'

// gradient-text heading (web-only css), matches the live fmhy.net rainbow name
const HeroTitle = styled(H1, {
  size: '$12',

  '$platform-web': {
    backgroundImage:
      'linear-gradient(120deg, #f97316, #facc15, #4ade80, #22d3ee, #818cf8)',
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    color: 'transparent' as any,
    hyphens: 'none' as any,
  },
})

// responsive grid: 1 col phone, 2 col >=sm (500), 3 col >=xl (1024), 4 col >=xxl (1240)
// (fmhy.net stays 2-col until the container nears its ~1152 max, then 4-col)
const GridItem = styled(YStack, {
  width: '100%',
  $sm: { width: '50%' },
  $xl: { width: '33.333%' },
  $xxl: { width: '25%' },
})

export function WikiHomeContent() {
  return (
    <YStack gap="$10" py="$8" pb="$12" px="$4" mx="auto" width="100%" maxW={1152}>
      {/* hero: logo on top + centered up to lg; text-left / logo-right at lg+ */}
      <XStack
        items="center"
        justify="center"
        gap="$8"
        flexDirection="column"
        $xl={{ flexDirection: 'row-reverse', justify: 'space-between' }}
      >
        {isWeb && (
          <YStack
            width={300}
            height={300}
            $xl={{ width: 400, height: 400 }}
            items="center"
            justify="center"
          >
            {/* fmhy.net play-button mark (glow baked into the png) */}
            <img
              src="/fmhy-hero.png"
              alt="FMHY"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </YStack>
        )}

        <YStack minW={280} gap="$5" items="center" $xl={{ flex: 1, items: 'flex-start' }}>
          <SizableText
            render="a"
            href={UPDATES_URL}
            target="_blank"
            rel="noopener noreferrer"
            px="$3"
            py="$1.5"
            rounded="$10"
            bg="$color3"
            borderWidth={1}
            borderColor="$color5"
            size="$2"
            color="$color11"
            fontWeight="600"
            cursor="pointer"
            hoverStyle={{ bg: '$color4' }}
          >
            June 2026 Updates ✨
          </SizableText>

          <HeroTitle text="center" $xl={{ text: 'left' }}>
            freemediaheckyeah
          </HeroTitle>

          <SubHeading size="$6" text="center" $xl={{ text: 'left' }} maxW={520}>
            The largest collection of free stuff on the internet!
          </SubHeading>

          <XStack
            gap="$3"
            flexWrap="wrap"
            justify="center"
            $xl={{ justify: 'flex-start' }}
            mt="$2"
          >
            <Link href="/beginners-guide" asChild>
              <Button bg="$accent9" hoverStyle={{ bg: '$accent10' }}>
                <Button.Text color="$color1">See Beginners Guide</Button.Text>
              </Button>
            </Link>

            <Button onPress={() => openExternal(POSTS_URL)}>Posts</Button>

            <Button onPress={() => openExternal(CONTRIBUTE_URL)}>Contribute</Button>

            <Button onPress={() => openExternal(DISCORD_URL)}>Discord</Button>
          </XStack>
        </YStack>
      </XStack>

      {/* browse pages */}
      <YStack id="home-categories" gap="$5">
        <SizableText size="$6" color="$color11" fontWeight="600" text="center">
          Or browse these pages ✨
        </SizableText>

        <XStack flexWrap="wrap" rowGap="$4" columnGap={0} mx="$-2">
          {homeFeatures.map((feature) => (
            <GridItem key={feature.link} px="$2">
              <CategoryCard
                title={feature.title}
                description={feature.details}
                color={feature.color}
                href={feature.link}
                paths={feature.paths}
              />
            </GridItem>
          ))}
        </XStack>
      </YStack>
    </YStack>
  )
}
