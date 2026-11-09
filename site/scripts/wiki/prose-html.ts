// generated prose blocks → plain html, the shape vitepress renders a post
// body in (custom-block divs, h1-h6 with ids, nested lists). used where the
// mirror must emit post html outside react: feed.rss <content:encoded>,
// mirroring upstream hooks/rss.ts (createContentLoader render: true).
//
// inline grammar = src/features/wiki/InlineMarkdown.tsx (links, **bold**,
// `code`, raw <img>, bare-url autolinks); that module pulls in react-native,
// so build scripts cannot import it.

import type { WikiProseBlock } from '../../src/features/wiki/types'

const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const TOKEN_RE =
  /(`[^`]+`)|(\*\*(?:[^*]|\*(?!\*))+\*\*)|(\[[^\]]+\]\([^()\s]+\))|(<img\b[^>]*?\/?>)|(https?:\/\/[^\s<>*)\]]+)/g
const LINK_RE = /^\[([^\]]+)\]\(([^()\s]+)\)$/
const IMG_SRC_RE = /\bsrc\s*=\s*"(https?:\/\/[^"]+)"/i
const IMG_ALT_RE = /\balt\s*=\s*"([^"]*)"/i
const URL_TRAILING_PUNCT_RE = /[.,;:!?'")\]]+$/

export type ProseHtmlOptions = {
  // absolute origin for root-relative links ("/video#x") — feed readers have
  // no page to resolve them against
  origin: string
}

function inlineHtml(markdown: string, opts: ProseHtmlOptions): string {
  const link = (url: string, text: string) => {
    const href = url.startsWith('/') ? `${opts.origin}${url}` : url
    return `<a href="${escapeHtml(href)}" target="_blank" rel="noreferrer">${text}</a>`
  }
  let html = ''
  let last = 0
  for (const m of markdown.matchAll(TOKEN_RE)) {
    const at = m.index ?? 0
    if (at > last) html += escapeHtml(markdown.slice(last, at))
    const token = m[0]
    if (token.startsWith('`')) {
      html += `<code>${escapeHtml(token.slice(1, -1))}</code>`
    } else if (token.startsWith('**')) {
      html += `<strong>${inlineHtml(token.slice(2, -2), opts)}</strong>`
    } else if (token.startsWith('<img')) {
      const src = IMG_SRC_RE.exec(token)?.[1]
      if (src) {
        const alt = IMG_ALT_RE.exec(token)?.[1] ?? ''
        html += `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}">`
      }
    } else if (/^https?:\/\//i.test(token)) {
      const url = token.replace(URL_TRAILING_PUNCT_RE, '')
      html += link(url, escapeHtml(url)) + escapeHtml(token.slice(url.length))
    } else {
      const parts = LINK_RE.exec(token)
      html += parts ? link(parts[2]!, escapeHtml(parts[1]!)) : escapeHtml(token)
    }
    last = at + token.length
  }
  if (last < markdown.length) html += escapeHtml(markdown.slice(last))
  return html
}

// vitepress's default custom-block titles (alerts carry their own)
const CONTAINER_LABELS = {
  info: 'INFO',
  tip: 'TIP',
  warning: 'WARNING',
  danger: 'DANGER',
}

function blockHtml(block: WikiProseBlock, opts: ProseHtmlOptions): string {
  switch (block.kind) {
    case 'heading':
      return `<h${block.level} id="${escapeHtml(block.id)}">${inlineHtml(block.markdown, opts)}</h${block.level}>`
    case 'paragraph':
      return `<p>${inlineHtml(block.markdown, opts)}</p>`
    case 'blockquote':
      return `<blockquote><p>${inlineHtml(block.markdown, opts)}</p></blockquote>`
    case 'list': {
      const tag = block.ordered ? 'ol' : 'ul'
      const items = block.items
        .map(
          (item) =>
            `<li>${inlineHtml(item.markdown, opts)}${proseBlocksToHtml(item.children, opts)}</li>`
        )
        .join('')
      return `<${tag}>${items}</${tag}>`
    }
    case 'container': {
      const body = proseBlocksToHtml(block.blocks, opts)
      if (block.variant === 'details') {
        return `<details class="details custom-block"><summary>${escapeHtml(block.title ?? 'Details')}</summary>${body}</details>`
      }
      const title = escapeHtml(block.title ?? CONTAINER_LABELS[block.variant])
      return `<div class="${block.variant} custom-block"><p class="custom-block-title">${title}</p>${body}</div>`
    }
    case 'code':
      return `<pre><code>${escapeHtml(block.code)}</code></pre>`
    case 'hr':
      return '<hr>'
    case 'image':
      return `<p><img src="${escapeHtml(block.src)}" alt="${escapeHtml(block.alt)}"></p>`
    case 'wallpaper':
      return (
        `<p><strong>${escapeHtml(block.title)}</strong> - ${inlineHtml(block.description, opts)}</p>` +
        `<p><img src="${escapeHtml(block.desktop)}" alt="${escapeHtml(block.title)}"></p>`
      )
    // only /recently-removed carries these, never a post — kept so the switch
    // stays exhaustive
    case 'removed':
      return `<ul>${block.sites
        .map(
          (site) =>
            `<li><strong>${escapeHtml(site.name)}</strong>` +
            (site.description ? ` - ${escapeHtml(site.description)}` : '') +
            '</li>'
        )
        .join('')}</ul>`
  }
}

export function proseBlocksToHtml(
  blocks: WikiProseBlock[],
  opts: ProseHtmlOptions
): string {
  return blocks.map((block) => blockHtml(block, opts)).join('\n')
}
