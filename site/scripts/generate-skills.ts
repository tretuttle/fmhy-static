#!/usr/bin/env bun

/**
 * @description Generate Claude Code skills from documentation
 */

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  symlinkSync,
  unlinkSync,
  lstatSync,
} from 'node:fs'
import { join, relative } from 'node:path'

const cwd = process.cwd()
const docsDir = join(cwd, 'docs')
const skillsDir = join(cwd, '.claude', 'skills')

const SKILL_PREFIX = 'takeout-static-'

// check if content has yaml frontmatter with required skill fields
function hasSkillFrontmatter(content: string): boolean {
  if (!content.startsWith('---')) return false
  const endIndex = content.indexOf('---', 3)
  if (endIndex === -1) return false
  const frontmatter = content.slice(3, endIndex)
  return frontmatter.includes('name:') && frontmatter.includes('description:')
}

// convert doc name to skill-friendly name
function toSkillName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64)
}

console.info()
console.info('🧠 Generate Claude Code Skills')
console.info()

if (!existsSync(docsDir)) {
  console.info('No docs directory found')
  process.exit(0)
}

const docs = readdirSync(docsDir).filter((f) => f.endsWith('.md'))

if (docs.length === 0) {
  console.info('No documentation files found')
  process.exit(0)
}

console.info(`Found ${docs.length} documentation files`)
console.info()

// ensure skills directory exists
if (!existsSync(skillsDir)) {
  mkdirSync(skillsDir, { recursive: true })
}

let symlinked = 0

for (const file of docs) {
  const name = file.replace(/\.md$/, '')
  const docPath = join(docsDir, file)
  const content = readFileSync(docPath, 'utf-8')

  if (!hasSkillFrontmatter(content)) {
    console.info(`  ⚠ ${name} - missing frontmatter, skipping`)
    continue
  }

  const skillName = `${SKILL_PREFIX}${toSkillName(name)}`
  const skillDir = join(skillsDir, skillName)
  const skillFile = join(skillDir, 'SKILL.md')

  // ensure skill directory exists
  if (!existsSync(skillDir)) {
    mkdirSync(skillDir, { recursive: true })
  }

  // remove existing symlink if present
  if (existsSync(skillFile)) {
    try {
      const stat = lstatSync(skillFile)
      if (stat.isSymbolicLink()) {
        unlinkSync(skillFile)
      }
    } catch {}
  }

  // create symlink
  const relativePath = relative(skillDir, docPath)
  symlinkSync(relativePath, skillFile)
  symlinked++

  console.info(`  ⟷ ${skillName}`)
}

console.info()
console.info(`✓ ${symlinked} skills symlinked`)
console.info(`  Skills in ${skillsDir}`)
console.info()
