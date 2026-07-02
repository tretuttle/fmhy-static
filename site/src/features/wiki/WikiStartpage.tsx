// functional port of fmhy/edit's /startpage (docs/.vitepress/theme/components/
// startpage/*.vue): live clock, search box with platform targets (Alt+A/S/D/F),
// '/' to focus, and chord-navigable bookmarks. custom user bookmarks
// (localStorage add/edit dialogs) are not ported — the default set is static.
import { useEffect, useRef, useState } from 'react'
import { SizableText, XStack, YStack } from 'tamagui'

import { MagnifyingGlassIcon } from '~/icons/phosphor/MagnifyingGlassIcon'
import { Text } from '~/interface/text/Text'

type Platform = {
  name: string
  key: string
  url: string
}

const PLATFORMS: Platform[] = [
  { name: 'SearXNG', key: 'a', url: 'https://searx.fmhy.net/search?q=' },
  { name: 'ChatGPT', key: 's', url: 'https://chat.openai.com/?q=' },
  { name: 'Claude', key: 'd', url: 'https://claude.ai/chat/' },
  { name: 'Perplexity', key: 'f', url: 'https://www.perplexity.ai/search?q=' },
]

type Bookmark = {
  name: string
  chord: string
  url: string
}

const BOOKMARKS: Bookmark[] = [
  { name: 'Hacker News', chord: 'HN', url: 'https://news.ycombinator.com/' },
  { name: 'GitHub', chord: 'GH', url: 'https://github.com/' },
  { name: 'Reddit', chord: 'RD', url: 'https://reddit.com/' },
  { name: 'Twitter', chord: 'TW', url: 'https://twitter.com/' },
  { name: 'YouTube', chord: 'YT', url: 'https://youtube.com/' },
  { name: 'Wikipedia', chord: 'WK', url: 'https://wikipedia.org/' },
  { name: "Beginner's Guide", chord: 'BG', url: '/beginners-guide' },
  { name: 'Wotaku', chord: 'WT', url: 'https://wotaku.wiki/' },
  { name: 'privateersclub', chord: 'PC', url: 'https://megathread.pages.dev/' },
]

const navigate = (url: string) => {
  window.location.href = url
}

function Clock() {
  const [time, setTime] = useState<string>('--:--:--')
  useEffect(() => {
    const update = () => {
      const now = new Date()
      const h = String(now.getHours()).padStart(2, '0')
      const m = String(now.getMinutes()).padStart(2, '0')
      const s = String(now.getSeconds()).padStart(2, '0')
      setTime(`${h}:${m}:${s}`)
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [])
  return (
    <SizableText fontSize={56} lineHeight={64} fontWeight="700" color="$color12">
      {time}
    </SizableText>
  )
}

const Kbd = ({ children, active }: { children: string; active?: boolean }) => (
  <SizableText
    render="kbd"
    px={6}
    py={1}
    rounded="$2"
    bg={active ? '$accent3' : '$color3'}
    borderWidth={1}
    borderColor={active ? '$accent8' : '$color5'}
    fontFamily="$mono"
    fontSize={11}
    fontWeight="600"
    color="$color11"
    whiteSpace="nowrap"
  >
    {children}
  </SizableText>
)

export function WikiStartpage() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [chord, setChord] = useState('')

  // refs mirror state for the global key handlers
  const queryRef = useRef(query)
  queryRef.current = query
  const focusedRef = useRef(focused)
  focusedRef.current = focused
  const chordRef = useRef(chord)
  chordRef.current = chord
  const chordTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const searchWith = (platform: Platform) => {
    const value = queryRef.current.trim()
    if (!value) return
    navigate(platform.url + encodeURIComponent(value))
  }

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement
      const isSearchFocused = inputRef.current === active
      const typingInInput =
        !!active &&
        (active.tagName === 'INPUT' ||
          active.tagName === 'TEXTAREA' ||
          (active instanceof HTMLElement && active.isContentEditable))

      // '/' focuses the search box from anywhere
      if (e.key === '/' && !isSearchFocused) {
        if (!typingInInput) {
          e.preventDefault()
          inputRef.current?.focus()
        }
        return
      }

      // Alt + platform key searches that platform
      if (e.altKey) {
        setShowShortcuts(true)
        let key = e.key.toLowerCase()
        if (e.code.startsWith('Key') && e.code.length === 4) {
          key = e.code.slice(3).toLowerCase()
        }
        const platform = PLATFORMS.find((p) => p.key === key)
        if (platform && focusedRef.current && queryRef.current.trim()) {
          e.preventDefault()
          searchWith(platform)
        }
        return
      }

      // bookmark chords when the search box is not focused
      if (!typingInInput && /^[a-z]$/i.test(e.key)) {
        const next = (chordRef.current + e.key.toUpperCase()).slice(-2)
        setChord(next)
        if (chordTimeout.current) clearTimeout(chordTimeout.current)
        const match = BOOKMARKS.find((b) => b.chord === next)
        if (match) {
          setChord('')
          navigate(match.url)
          return
        }
        chordTimeout.current = setTimeout(() => setChord(''), 1000)
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (!e.altKey) setShowShortcuts(false)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      if (chordTimeout.current) clearTimeout(chordTimeout.current)
    }
  }, [])

  const disabled = !query.trim()
  const highlight = showShortcuts && focused

  return (
    <YStack items="center" px="$4" pt="$12" pb="$10" $md={{ pt: '$16' }}>
      <YStack width="100%" maxW={1100} gap="$6">
        <YStack gap="$4" items="flex-start" width="100%">
          <Clock />

          {/* search box */}
          <form
            style={{ width: '100%' }}
            onSubmit={(e) => {
              e.preventDefault()
              searchWith(PLATFORMS[0]!)
            }}
          >
            <XStack
              width="100%"
              items="center"
              gap="$2.5"
              px="$3.5"
              py="$3"
              rounded="$4"
              bg="$color2"
              borderWidth={2}
              borderColor={focused ? '$accent8' : '$color4'}
              hoverStyle={{ borderColor: '$accent8' }}
            >
              <MagnifyingGlassIcon size={20} color="$color10" />
              <input
                ref={inputRef}
                value={query}
                placeholder="What would you like to search for?"
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                style={{
                  flex: 1,
                  minWidth: 0,
                  fontSize: 18,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'inherit',
                  fontFamily: 'inherit',
                }}
              />
            </XStack>
          </form>

          {/* platform targets */}
          <XStack width="100%" gap="$3" flexWrap="wrap">
            {PLATFORMS.map((platform) => (
              <XStack
                key={platform.name}
                flex={1}
                minW={180}
                items="center"
                justify="space-between"
                gap="$2"
                p="$2.5"
                rounded="$4"
                bg="$color2"
                borderWidth={highlight ? 2 : 1}
                borderColor={highlight ? '$accent8' : '$color4'}
                cursor={disabled ? 'not-allowed' : 'pointer'}
                opacity={disabled ? 0.6 : 1}
                hoverStyle={disabled ? {} : { bg: '$color3', borderColor: '$color6' }}
                onPress={() => searchWith(platform)}
              >
                <SizableText size="$3" fontWeight="600" color="$color12">
                  {platform.name}
                </SizableText>
                <XStack items="center" gap="$1" display="none" $md={{ display: 'flex' }}>
                  <Kbd>Alt</Kbd>
                  <SizableText size="$2" color="$color10">
                    +
                  </SizableText>
                  <Kbd>{platform.key.toUpperCase()}</Kbd>
                </XStack>
              </XStack>
            ))}
          </XStack>
        </YStack>

        {/* bookmarks */}
        <XStack width="100%" gap="$3" flexWrap="wrap">
          {BOOKMARKS.map((bookmark) => {
            const partial = chord.length === 1 && bookmark.chord.startsWith(chord)
            return (
              <XStack
                key={bookmark.chord}
                render="a"
                {...({ href: bookmark.url, style: { textDecoration: 'none' } } as object)}
                flex={1}
                minW={160}
                items="center"
                justify="space-between"
                gap="$2"
                p="$2.5"
                rounded="$4"
                bg="$color2"
                borderWidth={1}
                borderColor={partial ? '$accent8' : '$color4'}
                cursor="pointer"
                hoverStyle={{ bg: '$color3', borderColor: '$color6' }}
              >
                <SizableText size="$3" fontWeight="500" color="$color12">
                  {bookmark.name}
                </SizableText>
                <XStack items="center" gap="$1" display="none" $md={{ display: 'flex' }}>
                  {bookmark.chord.split('').map((letter, index) => (
                    <Kbd key={index} active={partial && index === 0}>
                      {letter}
                    </Kbd>
                  ))}
                </XStack>
              </XStack>
            )
          })}
        </XStack>

        {/* keyboard hints */}
        <YStack gap="$1.5" display="none" $md={{ display: 'flex' }}>
          <Text size="$3" color="$color10">
            Press <Kbd>/</Kbd> anywhere to focus the search box
          </Text>
          <Text size="$3" color="$color10">
            Use <Kbd>Alt + a/s/d/f</Kbd> to search different platforms
          </Text>
          <Text size="$3" color="$color10">
            Type bookmark chords (like <Kbd>H</Kbd> <Kbd>N</Kbd> for Hacker News) when
            search is not focused
          </Text>
          <Text size="$3" color="$color10">
            Press <Kbd>Enter</Kbd> to search SearXNG (hosted by us) by default
          </Text>
        </YStack>
      </YStack>
    </YStack>
  )
}
