import Svg, { Path } from 'react-native-svg'
import { SizableText, styled, XStack, YStack, isWeb, useTheme } from 'tamagui'

import { Link } from '~/components/Link'
import { TwemojiIcon } from '~/icons/TwemojiIcon'

import { wikiNav } from './data'

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
  icon?: string
  title: string
  link: string
  external: boolean
}

const stripHash = (link: string) => link.replace(/[?#].*$/, '')

const buildSequence = (): PagerEntry[] => {
  const all: PagerEntry[] = []
  // standalone rows above the groups, then the groups — both generated from
  // upstream's sidebar (shared.ts); the top links used to be a hand-copy here
  for (const item of [...wikiNav.topLinks, ...wikiNav.groups.flatMap((g) => g.items)]) {
    {
      const link = item.externalUrl ?? item.route
      if (!link) continue
      all.push({
        emoji: item.emoji,
        icon: item.icon,
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

// keyed by page.id — category WikiPages use a bare slug ('backups'), while
// WikiProsePages already carry their doc-relative id ('other/contributing',
// 'posts/changelog-sites' — see types.ts), so most of these only need to
// override `pager`. `pager: false` mirrors a `prev: false` / `next: false`
// frontmatter for pages that don't belong in the sidebar sequence.
const PAGE_OVERRIDES: Record<string, { route?: string; docPath?: string; pager?: false }> =
  {
    backups: { route: '/other/backups', docPath: 'other/backups.md' },
    'posts/changelog-sites': { pager: false },
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
      <XStack items="center" gap={6}>
        {entry.icon ? <TwemojiIcon code={entry.icon} size={14} /> : null}
        <SizableText fontSize={14} lineHeight={20} fontWeight="500" color="$accent11">
          {entry.icon ? entry.title : `${entry.emoji} ${entry.title}`}
        </SizableText>
      </XStack>
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

// only `page.id` is read, so this accepts both the category WikiPage and the
// prose WikiProsePage shapes (WikiCategoryContent / WikiProseContent)
export function WikiDocFooter({
  page,
  pager,
}: {
  page: { id: string }
  // explicit override for callers that know better than PAGE_OVERRIDES (e.g.
  // WikiProseContent suppresses the pager for 'post'-header pages, which
  // aren't part of the sidebar sequence at all)
  pager?: boolean
}) {
  const override = PAGE_OVERRIDES[page.id]
  const route = override?.route ?? `/${page.id}`
  const docPath = override?.docPath ?? `${page.id}.md`

  // index -1 → prev undefined, next = first sidebar link: that's what VitePress
  // does for pages missing from the sidebar (verified live: fmhy.net/other/backups
  // shows only "Next page → Beginners Guide")
  const index = SEQUENCE.findIndex((entry) => stripHash(entry.link) === route)
  const showPager = pager ?? (override?.pager !== false)
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
