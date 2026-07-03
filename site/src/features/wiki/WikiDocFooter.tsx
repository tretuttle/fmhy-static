import Svg, { Path } from 'react-native-svg'
import { SizableText, styled, XStack, YStack, isWeb, useTheme } from 'tamagui'

import { Link } from '~/components/Link'

import { wikiNav } from './data'

import type { WikiPage } from './types'
import type { Href } from 'one'

// VitePress VPDocFooter parity: "📝 Edit this page" (upstream config.mts editLink)
// above a prev/next pager whose sequence is the flattened sidebar (shared.ts):
// three standalone top links, then the Wiki / Tools / More groups in order.
// VitePress dedupes pager candidates on the link sans hash/query keeping the
// first hit, which is what drops "/audio#audio-tools" + "/educational#…" from
// the sequence (verified against fmhy.net/developer-tools: prev Video Tools,
// next NSFW).

const EDIT_URL_BASE = 'https://github.com/fmhy/edit/edit/main/docs/'

type PagerEntry = {
  emoji: string
  title: string
  link: string
  external: boolean
}

// standalone sidebar rows above the groups (upstream shared.ts sidebar)
const TOP_LINKS: PagerEntry[] = [
  { emoji: '📚', title: 'Beginners Guide', link: '/beginners-guide', external: false },
  { emoji: '📰', title: 'Posts', link: '/posts', external: false },
  { emoji: '💡', title: 'Contribute', link: '/other/contributing', external: false },
]

const stripHash = (link: string) => link.replace(/[?#].*$/, '')

const buildSequence = (): PagerEntry[] => {
  const all = [...TOP_LINKS]
  for (const group of wikiNav.groups) {
    for (const item of group.items) {
      const link = item.externalUrl ?? item.route
      if (!link) continue
      all.push({
        emoji: item.emoji,
        title: item.title,
        link,
        external: !!item.externalUrl,
      })
    }
  }
  const seen = new Set<string>()
  return all.filter((entry) => {
    const key = stripHash(entry.link)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const SEQUENCE = buildSequence()

// pages that don't live at docs/<id>.md — route + edit path both derive from
// it. `pager: false` mirrors a `prev: false` / `next: false` frontmatter.
const PAGE_OVERRIDES: Record<string, { route: string; docPath: string; pager?: false }> =
  {
    backups: { route: '/other/backups', docPath: 'other/backups.md' },
    changelog: {
      route: '/posts/changelog-sites',
      docPath: 'posts/changelog-sites.md',
      pager: false,
    },
    contributing: { route: '/other/contributing', docPath: 'other/contributing.md' },
    faq: { route: '/other/FAQ', docPath: 'other/FAQ.md' },
    selfhosting: { route: '/other/selfhosting', docPath: 'other/selfhosting.md' },
    wallpapers: { route: '/other/wallpapers', docPath: 'other/wallpapers.md' },
  }

// .pager-link: bordered card, border brightens to brand on hover
const PagerLinkFrame = styled(YStack, {
  width: '100%',
  height: '100%',
  borderWidth: 1,
  borderColor: '$color4',
  rounded: 8,
  px: 16,
  pt: 11,
  pb: 13,
  cursor: 'pointer',
  transition: '200ms',

  hoverStyle: {
    borderColor: '$accent11',
  },
})

const PagerCard = ({ entry, kind }: { entry: PagerEntry; kind: 'prev' | 'next' }) => {
  const content = (
    <>
      <SizableText fontSize={12} lineHeight={20} fontWeight="500" color="$color10">
        {kind === 'prev' ? 'Previous page' : 'Next page'}
      </SizableText>
      <SizableText fontSize={14} lineHeight={20} fontWeight="500" color="$accent11">
        {entry.emoji} {entry.title}
      </SizableText>
    </>
  )

  if (entry.external) {
    return (
      <PagerLinkFrame
        // element-render is a DOM anchor; native falls back to the plain frame
        render={isWeb ? <a href={entry.link} target="_blank" rel="noreferrer" /> : undefined}
        items={kind === 'next' ? 'flex-end' : 'flex-start'}
      >
        {content}
      </PagerLinkFrame>
    )
  }

  return (
    <Link asChild href={entry.link as Href}>
      {/* render="a": asChild link target must be a real anchor — see CircleLink */}
      <PagerLinkFrame render="a" items={kind === 'next' ? 'flex-end' : 'flex-start'}>
        {content}
      </PagerLinkFrame>
    </Link>
  )
}

// lucide square-pen, the vpi-square-pen icon before the edit-link text
const SquarePenIcon = () => {
  const theme = useTheme()
  // .get() resolves to var(--accent11) on web (ssr-safe), a real color on native
  const stroke = theme.accent11.get()
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" aria-hidden>
      <Path
        d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
        stroke={stroke}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M18.375 2.625a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4Z"
        stroke={stroke}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

const EditLink = ({ docPath }: { docPath: string }) => (
  <XStack
    render={
      isWeb ? <a href={`${EDIT_URL_BASE}${docPath}`} target="_blank" rel="noreferrer" /> : undefined
    }
    self="flex-start"
    items="center"
    gap="$2"
    cursor="pointer"
  >
    <SquarePenIcon />
    <SizableText
      fontSize={14}
      lineHeight={32}
      fontWeight="500"
      color="$accent11"
      hoverStyle={{ color: '$accent12' }}
    >
      📝 Edit this page
    </SizableText>
  </XStack>
)

export function WikiDocFooter({ page }: { page: WikiPage }) {
  const override = PAGE_OVERRIDES[page.id]
  const route = override?.route ?? `/${page.id}`
  const docPath = override?.docPath ?? `${page.id}.md`

  // index -1 → prev undefined, next = first sidebar link: that's what VitePress
  // does for pages missing from the sidebar (verified live: fmhy.net/other/backups
  // shows only "Next page → Beginners Guide")
  const index = SEQUENCE.findIndex((entry) => stripHash(entry.link) === route)
  const showPager = override?.pager !== false
  const prev = showPager ? SEQUENCE[index - 1] : undefined
  const next = showPager ? SEQUENCE[index + 1] : undefined

  return (
    <YStack mt={64}>
      <XStack pb={14} items="center" justify="space-between">
        <EditLink docPath={docPath} />
      </XStack>

      {(prev || next) && (
        <XStack
          render="nav"
          aria-label="Pager"
          borderTopWidth={1}
          borderColor="$color4"
          pt={24}
          gap={8}
          flexDirection="column"
          $md={{ flexDirection: 'row', gap: 16 }}
        >
          <YStack $md={{ flex: 1 }}>
            {prev && <PagerCard entry={prev} kind="prev" />}
          </YStack>
          <YStack $md={{ flex: 1 }}>
            {next && <PagerCard entry={next} kind="next" />}
          </YStack>
        </XStack>
      )}
    </YStack>
  )
}
