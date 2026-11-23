// scripts/brief.ts
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { parseFrontMatter } from './gate/policy.ts'
import { readLedger } from './site/ledger.ts'
import type { LedgerLine } from './site/ledger.ts'

/**
 * Where things stand, in one screen.
 *
 *   bun run brief
 *
 * A run starts with no memory of the last one. This replaces searching: what
 * happened to the last few pushes, what was asked for, what was planned, how
 * much room the budgets have left, and where the code has grown heavy. Read
 * this, then read only the files it points to.
 */

const ROOT = resolve(import.meta.dir, '..')

/** A source file longer than this is on its way to the 666-line ceiling. */
const LONG = 450

const LEDGER_LINES  = 6

const JOURNAL_LINES = 8

const LIST_LINES    = 8

interface Report {
  stats?: Record<string, { draws: number, triangles: number }>
  bytes?: { iteration: number }
}

interface Budgets {
  render: Record<string, { draws: number, triangles: number } | string>
  bytes:  { newPerIteration: number, siteHardCap: number }
}

function read (path: string): string {
  return existsSync(path) ? readFileSync(path, 'utf8') : ''
}

function git (...args: string[]): string {
  try {
    return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: [ 'ignore', 'pipe', 'ignore' ]}).trim()
  }
  catch {
    return ''
  }
}

function files (dir: string): string[] {
  if (!existsSync(dir))
    return []

  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name)

    return statSync(path).isDirectory() ? files(path) : [ path ]
  })
}

function section (title: string, lines: string[]): void {
  console.log(`\n${title}`)

  for (const line of lines.length > 0 ? lines : [ '(nothing)' ])
    console.log(`  ${line}`)
}

function describeLine (line: LedgerLine): string {
  const what = line.journal?.title ? ` "${line.journal.title}"` : ''
  const head = `${line.ts.slice(0, 10)}  ${line.verdict.padEnd(11)}${line.iteration ? ` #${line.iteration}` : ''}${what}`

  if (line.verdict !== 'rejected' && line.verdict !== 'infra-error')
    return head

  // A rejected candidate's branch is still on the remote: its work can be salvaged.
  return `${head}\n      on ${line.ref} · ${(line.failed ?? []).slice(0, 3).join('\n      ')}`
}

/**
 * Unticked items of a markdown checklist.
 *
 * Comments are dropped first: the templates carry an example item inside one,
 * and an example read as a request is a day spent building something nobody
 * asked for.
 */
function open (path: string): string[] {
  return read(path).replaceAll(/<!--[\s\S]*?-->/gu, '')
    .split('\n')
    .filter(line => (/^\s*[-*] \[ \]/u).test(line))
    .map(line => line.replace(/^\s*[-*] \[ \]\s*/u, ''))
    .slice(0, LIST_LINES)
}

/** The first lines under a heading, up to the next heading. */
function under (path: string, heading: RegExp): string[] {
  const lines = read(path).split('\n')
  const start = lines.findIndex(line => heading.test(line))

  if (start === -1)
    return []

  const rest = lines.slice(start + 1)
  const end  = rest.findIndex(line => line.startsWith('#'))

  return rest.slice(0, end === -1 ? undefined : end).filter(line => line.trim() !== '')
    .slice(0, LIST_LINES)
}

function journal (): string[] {
  const dir = join(ROOT, 'journal')

  if (!existsSync(dir))
    return []

  return readdirSync(dir).filter(name => (/^\d{4}-\d{2}-\d{2}-.*\.md$/u).test(name))
    .sort()
    .slice(-JOURNAL_LINES)
    .reverse()
    .map(name => {
      const fields = parseFrontMatter(read(join(dir, name)))

      return `${name.slice(0, 10)}  ${(fields?.kind ?? '?').padEnd(9)} ${fields?.title ?? name}`
    })
}

function budgets (): string[] {
  const report = JSON.parse(read(join(ROOT, '.scenery', 'gate', 'report.json')) || '{}') as Report
  const limits = JSON.parse(read(join(ROOT, 'budgets.json')) || '{"render":{},"bytes":{}}') as Budgets

  if (!report.stats)
    return [ 'not measured in this checkout yet: bun run gate' ]

  const lines = Object.entries(report.stats).map(([ tier, cost ]) => {
    const limit = limits.render[tier]

    return typeof limit === 'object'
      ? `${tier.padEnd(8)} draws ${cost.draws}/${limit.draws} (${Math.round(100 * cost.draws / limit.draws)}%)  triangles ${cost.triangles}/${limit.triangles} (${Math.round(100 * cost.triangles / limit.triangles)}%)`
      : `${tier.padEnd(8)} draws ${cost.draws}  triangles ${cost.triangles}`
  })

  if (report.bytes)
    lines.push(`build    ${report.bytes.iteration} bytes of ${limits.bytes.newPerIteration} per iteration`)

  return lines
}

function world (): string[] {
  const features = join(ROOT, 'src', 'world', 'features')
  const names    = existsSync(features) ? readdirSync(features).sort() : []
  const source   = files(join(ROOT, 'src')).filter(path => path.endsWith('.ts') && !path.endsWith('.test.ts'))

  const long = source
    .map(path => ({ path: relative(ROOT, path), lines: read(path).split('\n').length }))
    .filter(file => file.lines > LONG)
    .sort((a, b) => b.lines - a.lines)
    .map(file => `${file.path} is ${file.lines} lines (the ceiling is 666)`)

  return [
    `${names.length} features, built in the order of src/world/index.ts: ${names.join(', ')}`,
    `${source.length} source files`,
    ...long,
  ]
}

/** How long until the site is full, at the pace of the last iterations. */
function storage (): string[] {
  const manifest = git('show', 'origin/site-store:iterations.json')

  if (!manifest)
    return [ 'the site has no iterations yet, or its branch is not fetched' ]

  const iterations = (JSON.parse(manifest) as { iterations: { bytes: { new: number, site: number }}[] }).iterations
  const newest     = iterations.at(-1)
  const recent     = iterations.slice(-30)
  const pace       = recent.reduce((sum, iteration) => sum + iteration.bytes.new, 0) / Math.max(1, recent.length)
  const limits     = JSON.parse(read(join(ROOT, 'budgets.json'))) as Budgets

  if (!newest)
    return [ 'the site has no iterations yet' ]

  const left = limits.bytes.siteHardCap - newest.bytes.site

  return [ `${iterations.length} iterations · ${Math.round(newest.bytes.site / 1e6)} MB of ${Math.round(limits.bytes.siteHardCap / 1e6)} MB · about ${Math.round(left / Math.max(1, pace) / 365)} years left at ${Math.round(pace / 1000)} KB a day` ]
}

function main (): void {
  console.log(`brief · ${git('rev-parse', '--abbrev-ref', 'HEAD') || '?'} @ ${git('log', '-1', '--format=%h %s').slice(0, 90)}`)

  section('ledger (what CI did with the last pushes, newest last)', readLedger(join(ROOT, 'ci', 'ledger.jsonl'), LEDGER_LINES).map(describeLine))
  section('requests (REQUESTS.md, open)', open(join(ROOT, 'REQUESTS.md')))
  section('roadmap (ROADMAP.md, next)', under(join(ROOT, 'ROADMAP.md'), /^#+\s*next/iu))
  section('journal (newest first)', journal())
  section('budgets (last local gate)', budgets())
  section('world', world())
  section('storage', storage())
  console.log('')
}

main()
