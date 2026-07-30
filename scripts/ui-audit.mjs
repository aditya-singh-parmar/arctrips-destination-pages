#!/usr/bin/env node
/**
 * Static UI-law scan. Every rule in CLAUDE.md section 4 that can be checked without
 * rendering, checked in about a second and for zero tokens.
 *
 * The ui-law.sh hook catches violations one file at a time as they are written. This
 * catches the ones already in the tree, across the whole repo, in one pass. A model
 * reading files to find these is the expensive way to get a worse answer.
 *
 *   node scripts/ui-audit.mjs              whole repo
 *   node scripts/ui-audit.mjs --changed    only files changed vs HEAD
 *   node scripts/ui-audit.mjs --json       machine-readable
 */

import { readFile, glob } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import path from 'node:path'

const ROOT = process.env.CLAUDE_PROJECT_DIR || process.cwd()
const argv = process.argv.slice(2)
const JSON_OUT = argv.includes('--json')
const CHANGED_ONLY = argv.includes('--changed')

const SPACING = new Set(['0', '1', '2', '3', '4', '6', '8', '12', '16', '24', 'px', 'auto'])
const TYPE = new Set(['sm', 'base', 'lg', 'xl', '2xl', '4xl'])
const RADIUS = new Set(['md', 'lg', 'full'])
const WEIGHT = new Set(['normal', 'medium', 'semibold'])

const PALETTE =
  'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose'

// Strip responsive/state variants (md:, hover:, dark:, group-hover:) before testing.
const bare = (cls) => cls.replace(/^(?:[a-z0-9-]+:)+/, '').replace(/^[!-]/, '')

/**
 * Class-token rules run only on the contents of class/className attributes, never on
 * whole lines. SVG path data is the reason: `d="M6530 4076 m-2854 ..."` contains
 * literal relative-moveto commands that read exactly like `m-2854`, and a line-level
 * regex reports every icon in the repo as an off-scale margin.
 */
function classRegions(lines) {
  const regions = lines.map(() => '')
  let open = null

  lines.forEach((line, i) => {
    let idx = 0
    while (idx <= line.length) {
      if (open) {
        const end = line.indexOf(open, idx)
        if (end === -1) {
          regions[i] += ' ' + line.slice(idx)
          return
        }
        regions[i] += ' ' + line.slice(idx, end)
        idx = end + 1
        open = null
        continue
      }
      const m = /\bclass(?:Name)?\s*=\s*(\{`|["'`]|\{)/.exec(line.slice(idx))
      if (!m) return
      idx += m.index + m[0].length
      open = m[1] === '{`' ? '`' : m[1] === '{' ? '}' : m[1]
    }
  })

  return regions
}

const tokenise = (text) => text.split(/[\s"'`{}(),;]+/).filter(Boolean)

const CLASS_RULES = [
  {
    id: 'arbitrary-value',
    law: '§4.2',
    message: 'Arbitrary Tailwind value — use the scale',
    test: (t) => /^[a-z][a-z0-9-]*-\[[^\]]+\]$/.test(bare(t)),
  },
  {
    id: 'raw-palette',
    law: '§4.4',
    message: 'Raw palette colour — use semantic tokens (breaks dark mode)',
    test: (t) =>
      new RegExp(`^(?:bg|text|border|ring|from|via|to|fill|stroke)-(?:${PALETTE})-\\d{2,3}$`).test(
        bare(t)
      ),
  },
  {
    id: 'off-scale-spacing',
    law: '§4.5',
    message: 'Off-scale spacing — the scale is 1 2 3 4 6 8 12 16 24',
    test: (t) => {
      const c = bare(t)
      const m = /^(?:[pm][trblxyse]?|gap(?:-[xy])?|space-[xy])-(.+)$/.exec(c)
      return m ? !SPACING.has(m[1]) : false
    },
  },
  {
    id: 'off-scale-type',
    law: '§4.6',
    message: 'Off-scale type — the scale is sm base lg xl 2xl 4xl',
    test: (t) => {
      const m = /^text-(xs|\dxl)$/.exec(bare(t))
      return m ? !TYPE.has(m[1]) : false
    },
  },
  {
    id: 'off-scale-weight',
    law: '§4.6',
    message: 'Off-scale weight — use font-normal, font-medium or font-semibold',
    test: (t) => {
      const m = /^font-(thin|extralight|light|bold|extrabold|black)$/.exec(bare(t))
      return m ? !WEIGHT.has(m[1]) : false
    },
  },
  {
    id: 'off-scale-radius',
    law: '§4.7',
    message: 'Off-scale radius — use rounded-md, rounded-lg or rounded-full',
    test: (t) => {
      const m = /^rounded(?:-[trbl]{1,2})?-(none|sm|xl|\dxl)$/.exec(bare(t))
      return m ? !RADIUS.has(m[1]) : false
    },
  },
]

const LINE_RULES = [
  {
    id: 'inline-style',
    law: '§4.1',
    message: 'Inline style={{ }} — not permitted',
    test: (line) => (/style=\{\{/.test(line) ? ['style={{'] : []),
  },
  {
    id: 'hand-rolled-control',
    law: '§4.3',
    message: 'Hand-rolled control — import the shadcn primitive instead',
    test: (line) => line.match(/<(?:button|input|select|textarea|dialog)(?=[\s/>])/g) ?? [],
  },
  {
    id: 'missing-alt',
    law: '§4.11',
    message: 'Image without alt',
    // A tag that spreads props may well receive alt from the caller — not a defect
    // this scan can prove, so it stays quiet rather than crying wolf.
    test: (line) =>
      (line.match(/<(?:img|Image)\b[^>]*>/g) ?? [])
        .filter((t) => !/\balt\s*=/.test(t) && !/\{\.\.\./.test(t))
        .map((t) => t.slice(0, 60)),
  },
]

const EXEMPT = [
  /\/components\/ui\//,
  /\/docs\/ideation\//,
  /\/\.ideation\//,
  /\/node_modules\//,
  /\/\.next\//,
  /\/dist\//,
  /\/build\//,
  /\.test\.[jt]sx?$/,
  /\.spec\.[jt]sx?$/,
]

const isExempt = (file) => EXEMPT.some((rx) => rx.test('/' + file.replace(/^\/+/, '')))

async function targetFiles() {
  if (CHANGED_ONLY) {
    try {
      const out = execFileSync('git', ['diff', '--name-only', '--diff-filter=ACMR', 'HEAD'], {
        cwd: ROOT,
        encoding: 'utf8',
      })
      return out.split('\n').filter((f) => /\.(tsx|jsx|css)$/.test(f))
    } catch {
      // Not a git repo, or no HEAD yet — fall through to a full scan.
    }
  }
  const files = []
  for await (const f of glob('**/*.{tsx,jsx,css}', {
    cwd: ROOT,
    exclude: (name) => name === 'node_modules' || name === '.next' || name === 'dist',
  }))
    files.push(f)
  return files
}

const files = (await targetFiles()).filter((f) => !isExempt(f))
const findings = []

for (const file of files) {
  let source
  try {
    source = await readFile(path.join(ROOT, file), 'utf8')
  } catch {
    continue
  }

  if (file.endsWith('.css')) {
    if (!/globals\.css$/.test(file))
      findings.push({
        file,
        line: 1,
        rule: 'new-css-file',
        law: '§4.1',
        message: 'CSS file outside globals.css — express this with utility classes',
        match: path.basename(file),
      })
    continue
  }

  const lines = source.split('\n')
  const regions = classRegions(lines)

  lines.forEach((line, i) => {
    if (/^\s*(?:\/\/|\*|\/\*)/.test(line)) return

    const add = (rule, match) =>
      findings.push({ file, line: i + 1, rule: rule.id, law: rule.law, message: rule.message, match })

    for (const token of tokenise(regions[i]))
      for (const rule of CLASS_RULES) if (rule.test(token)) add(rule, token)

    for (const rule of LINE_RULES) for (const match of rule.test(line)) add(rule, match)
  })
}

if (JSON_OUT) {
  console.log(JSON.stringify({ scanned: files.length, violations: findings.length, findings }, null, 2))
  process.exit(findings.length ? 1 : 0)
}

if (!findings.length) {
  console.log(`\n  ui-audit: ${files.length} files scanned, clean.\n`)
  process.exit(0)
}

const byRule = new Map()
for (const f of findings) {
  if (!byRule.has(f.rule)) byRule.set(f.rule, [])
  byRule.get(f.rule).push(f)
}

console.log(`\n  ui-audit: ${findings.length} violations in ${files.length} files scanned\n`)

for (const [, hits] of [...byRule].sort((a, b) => b[1].length - a[1].length)) {
  const { law, message } = hits[0]
  console.log(`  ${law}  ${message}  (${hits.length})`)
  for (const h of hits.slice(0, 12)) console.log(`      ${h.file}:${h.line}  ${h.match}`)
  if (hits.length > 12) console.log(`      … and ${hits.length - 12} more`)
  console.log()
}

process.exit(1)
