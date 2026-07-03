---
name: takeout-static
description: Project guidelines for Takeout Static site. INVOKE WHEN: starting session, project structure, One framework, SSG routes, file organization, code style.
---

# process

core guidelines for working in this codebase.

## approach

- ultrathink - explore, research, and plan before attempting fixes
- **check skills first** - scan available skills for keyword matches and invoke relevant skills
- use sub-tasks to parallelize work
- prefer strong models for complex tasks

## don't cheat

- never comment out code just to make it work
- never turn a type to "any" just to make it work
- never disable some feature just to make it work

## verification

after completing work:

- run `npx tsc --noEmit` to check types
- run `bun lint:fix` to fix formatting

## code style

- run `bun lint:fix` after code changes
- use `~` alias for imports
- use `console.info()` not `console.log()`
- use `node:` prefix for built-in modules
- write FEW, LOWERCASE comments - code should be self-documenting

## tech stack

- **Framework**: One (React for web + native)
- **UI**: Tamagui v4 with CSS-only animations
- **Styling**: JetBrains Mono font, dark/light themes
- **Content**: MDX for blog posts
- **Deployment**: Vercel

## tamagui v4 shorthands

This project uses `onlyAllowShorthands: true`. Available shorthands:

- Layout: `b`, `l`, `r`, `t`, `z`
- Flex: `items`, `justify`, `content`, `grow`, `shrink`, `self`
- Spacing: `m`, `mb`, `ml`, `mr`, `mt`, `mx`, `my`, `p`, `pb`, `pl`, `pr`, `pt`, `px`, `py`
- Sizing: `maxH`, `maxW`, `minH`, `minW`
- Other: `bg`, `rounded`, `select`, `text`

**NOT available** (use full names): `w`, `h`, `f`, `ai`, `jc`, `cur`, `br`, `bw`, `bc`, `mih`

## project structure

```
app/                 # One routes
  _layout.tsx       # Root layout with Header/Footer
  (site)/           # Site routes
    index+ssg.tsx   # Homepage
    blog/           # Blog routes
src/
  components/       # UI components
  icons/           # SVG icons
  tamagui/         # Tamagui config
data/
  blog/            # MDX blog posts
docs/              # Documentation (auto-linked as Claude skills)
scripts/           # Build scripts
```

## skills

run `bun skills` to regenerate Claude Code skills from docs.
