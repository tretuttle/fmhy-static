import { useEffect, useRef, useState } from 'react'
import { Button, isWeb, SizableText, styled, XStack, YStack } from 'tamagui'

import { H1, SubHeading } from '~/interface/text/Headings'

import homeJson from './generated/home.json'
import { LucideIcon } from './LucideIcon'

import type { HomeFeature } from './homeFeatures'

// hero action links, mirroring docs/index.md hero.actions (posts + contribute
// are in-app routes)
//
// the announcement is generated from docs/index.md frontmatter every sync —
// upstream rolls it monthly, so hardcoding it here left the hero pointing at
// July's post halfway through August.
const ANNOUNCEMENT = homeJson.announcement
const FEATURES = homeJson.features as HomeFeature[]
const POSTS_ROUTE = '/posts'
const CONTRIBUTE_ROUTE = '/other/contributing'
const DISCORD_URL = 'https://github.com/fmhy/FMHY/wiki/FMHY-Discord'

// gradient-text heading — the real --vp-home-hero-name-background from
// upstream style.scss (the rainbow variant only exists behind html.june)
// VPHero name scale: 32px phones, 48px tablets, 56px desktop — the previous
// fixed $12 rendered 52px+ on a 390px viewport and clipped at both edges
const HeroTitle = styled(H1, {
  fontSize: 32,
  lineHeight: 40,
  maxW: '100%',
  $md: { fontSize: 48, lineHeight: 56 },
  $xl: { fontSize: 56, lineHeight: 64 },

  '$platform-web': {
    backgroundImage: 'linear-gradient(120deg, #c4b5fd 30%, #7bc5e4)',
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

// low-opacity tint for the feature icon tile, derived from the card's own
// lucide-stroke hex so each category reads as a distinct soft color chip
function hexToRgba(hex: string, alpha: number): string {
  const value = hex.replace('#', '')
  const r = Number.parseInt(value.slice(0, 2), 16)
  const g = Number.parseInt(value.slice(2, 4), 16)
  const b = Number.parseInt(value.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// VPFeature parity: uniform soft-neutral card whose border (same color as the
// bg, so invisible at rest) brightens to the accent on hover. no fill change,
// no underlines. icon box is a uniform default-soft square — only the lucide
// stroke itself is colored.
const FeatureCardFrame = styled(YStack, {
  bg: '$color2',
  borderWidth: 1,
  borderColor: '$color2',
  rounded: 12,
  p: 24,
  height: '100%',
  cursor: 'pointer',
  transition: '200ms',

  hoverStyle: {
    borderColor: '$accent11',
  },
})

const FeatureCard = ({ feature }: { feature: HomeFeature }) => (
  <FeatureCardFrame {...({ render: 'a', href: feature.link } as object)}>
      <YStack
        width={48}
        height={48}
        rounded={6}
        items="center"
        justify="center"
        bg={hexToRgba(feature.color, 0.14) as '$color4'}
        mb={20}
      >
        <LucideIcon paths={feature.paths} color={feature.color} size={24} />
      </YStack>

      <SizableText fontSize={16} lineHeight={24} fontWeight="600" color="$color12">
        {feature.title}
      </SizableText>

      <SizableText fontSize={14} lineHeight={24} fontWeight="500" color="$color10" pt={8}>
        {feature.details}
      </SizableText>
  </FeatureCardFrame>
)

export function WikiHomeContent() {
  // uwu easter egg, ported from docs/index.md: ?uwu=true/false persists to
  // localStorage, 5 clicks on the hero logo toggles it, swaps the hero image
  const [uwu, setUwu] = useState(false)
  const logoClicks = useRef(0)

  useEffect(() => {
    if (!isWeb) return
    let preferredKawaii: string | null = null
    try {
      preferredKawaii = localStorage.getItem('uwu')
    } catch {}
    const kawaii = new URLSearchParams(window.location.search).get('uwu')
    if (kawaii === 'true') {
      try {
        localStorage.setItem('uwu', 'true')
      } catch {}
      console.log('uwu mode enabled. Disable with "?uwu=false".')
      setUwu(true)
    } else if (kawaii === 'false') {
      try {
        localStorage.removeItem('uwu')
      } catch {}
      setUwu(false)
    } else if (preferredKawaii) {
      setUwu(true)
    }
  }, [])

  const handleLogoClick = () => {
    logoClicks.current += 1
    if (logoClicks.current < 5) return
    logoClicks.current = 0
    const next = !uwu
    try {
      if (next) {
        localStorage.setItem('uwu', 'true')
      } else {
        localStorage.removeItem('uwu')
      }
    } catch {}
    console.log(next ? 'uwu mode enabled after 5 clicks.' : 'uwu mode disabled.')
    setUwu(next)
  }

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
            width={192}
            height={192}
            $md={{ width: 300, height: 300 }}
            $xl={{ width: 400, height: 400 }}
            items="center"
            justify="center"
          >
            {/* fmhy.net play-button mark (glow baked into the png) */}
            <img
              src={uwu ? '/logo-uwu.svg' : '/fmhy-hero.png'}
              alt="FMHY"
              onClick={handleLogoClick}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </YStack>
        )}

        <YStack
          minW={0}
          maxW="100%"
          gap="$5"
          items="center"
          $md={{ minW: 280 }}
          $xl={{ flex: 1, items: 'flex-start' }}
        >
          {/* announcement badge (upstream Announcement.vue): soft pill, no border */}
          {ANNOUNCEMENT && (
            <XStack
              {...({ render: 'a', href: ANNOUNCEMENT.link } as object)}
              items="center"
              px={16}
              py={4}
              rounded={8}
              bg="$color3"
              cursor="pointer"
            >
              <SizableText
                fontSize={14}
                lineHeight={20}
                fontWeight="600"
                color="$color12"
              >
                {ANNOUNCEMENT.title}
              </SizableText>
            </XStack>
          )}

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
            <Button {...({ render: 'a', href: '/beginners-guide' } as object)} bg="$accent9" hoverStyle={{ bg: '$accent10' }}>
              <Button.Text color="$color1">See Beginners Guide</Button.Text>
            </Button>

            <Button
              {...({ render: 'a', href: POSTS_ROUTE } as object)}
              bg="$color3"
              hoverStyle={{ bg: '$color4' }}
            >
              Posts
            </Button>

            <Button
              {...({ render: 'a', href: CONTRIBUTE_ROUTE } as object)}
              bg="$color3"
              hoverStyle={{ bg: '$color4' }}
            >
              Contribute
            </Button>

            <Button
              {...({ render: 'a', href: DISCORD_URL, target: '_blank', rel: 'noopener noreferrer' } as object)}
              bg="$color3"
              hoverStyle={{ bg: '$color4' }}
            >
              Discord
            </Button>
          </XStack>
        </YStack>
      </XStack>

      {/* browse pages */}
      <YStack id="home-categories" gap="$5">
        <SizableText size="$6" color="$color11" fontWeight="600" text="center">
          Or browse these pages ✨
        </SizableText>

        <XStack flexWrap="wrap" rowGap="$4" columnGap={0} mx="$-2">
          {FEATURES.map((feature) => (
            <GridItem key={feature.link} px="$2">
              <FeatureCard feature={feature} />
            </GridItem>
          ))}
        </XStack>
      </YStack>
    </YStack>
  )
}
