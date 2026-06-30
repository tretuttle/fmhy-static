import { Button, isWeb, SizableText, styled, XStack, YStack } from 'tamagui'

import { Link } from '~/components/Link'
import { H1, SubHeading } from '~/interface/text/Headings'

import { CategoryCard } from './CategoryCard'
import { homeFeatures } from './homeFeatures'
import { openExternal } from './openExternal'

// the wiki source lives in these repos; backups + feedback have no in-app route
const BACKUPS_URL = 'https://github.com/fmhy/FMHY'
const FEEDBACK_URL = 'https://www.reddit.com/r/FREEMEDIAHECKYEAH/'
const UPDATES_URL = 'https://fmhy.net/posts'

// gradient-text heading (web-only css), matches the live fmhy.net rainbow name
const HeroTitle = styled(H1, {
  size: '$12',

  '$platform-web': {
    backgroundImage:
      'linear-gradient(120deg, #f97316, #facc15, #4ade80, #22d3ee, #818cf8)',
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    color: 'transparent' as any,
  },
})

// responsive grid item: 1 col phone, 2 col >=sm (500), 4 col >=lg (800)
const GridItem = styled(YStack, {
  width: '100%',
  $sm: { width: '50%' },
  $lg: { width: '25%' },
})

// web-only smooth scroll to the category grid (the home is the wiki landing)
function scrollToCategories() {
  if (typeof document === 'undefined') return
  document
    .getElementById('home-categories')
    ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export function WikiHomeContent() {
  return (
    <YStack gap="$10" py="$8" pb="$12" px="$4" self="center" width="100%" maxW={1152}>
      {/* hero: logo on top + centered up to lg; text-left / logo-right at lg+ */}
      <XStack
        items="center"
        justify="center"
        gap="$8"
        flexDirection="column"
        $lg={{ flexDirection: 'row-reverse', justify: 'space-between' }}
      >
        {isWeb && (
          <YStack
            position="relative"
            width={280}
            height={280}
            $lg={{ width: 360, height: 360 }}
            items="center"
            justify="center"
          >
            {/* soft blurred gradient glow behind the logo */}
            <YStack
              position="absolute"
              width={220}
              height={220}
              $lg={{ width: 300, height: 300 }}
              opacity={0.6}
              $platform-web={{
                backgroundImage: 'linear-gradient(-45deg, #c4b5fd 50%, #47caff 50%)',
                filter: 'blur(90px)',
              }}
            />
            <img
              src="/favicon.svg"
              alt="FMHY"
              width={200}
              height={200}
              style={{ position: 'relative', objectFit: 'contain' }}
            />
          </YStack>
        )}

        <YStack minW={280} gap="$5" items="center" $lg={{ flex: 1, items: 'flex-start' }}>
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
            June 2026 Updates 🌈
          </SizableText>

          <HeroTitle text="center" $lg={{ text: 'left' }}>
            freemediaheckyeah
          </HeroTitle>

          <SubHeading size="$6" text="center" $lg={{ text: 'left' }} maxW={520}>
            The largest collection of free stuff on the internet!
          </SubHeading>

          <XStack
            gap="$3"
            flexWrap="wrap"
            justify="center"
            $lg={{ justify: 'flex-start' }}
            mt="$2"
          >
            <Button bg="$color12" hoverStyle={{ bg: '$color11' }} onPress={scrollToCategories}>
              <Button.Text color="$color1">Browse Wiki</Button.Text>
            </Button>

            <Link href="/beginners-guide" asChild>
              <Button>Beginners</Button>
            </Link>

            <Button onPress={() => openExternal(BACKUPS_URL)}>Backups</Button>

            <Button onPress={() => openExternal(FEEDBACK_URL)}>Feedback</Button>
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
