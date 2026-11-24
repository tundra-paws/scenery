// scripts/gate/policy.ts
// Runs under plain `node` (type stripping) as well as bun: node built-ins only,
// so the job that decides whether a push is a candidate installs nothing.
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from '../args.ts'

/**
 * Paths a candidate may never touch.
 *
 * `.github/` because GitHub refuses a push that changes a workflow file when it
 * is made with the Actions token, which is the token that promotes a candidate;
 * a commit touching it anywhere in the range would block the promotion of
 * everything after it. `ci/` because the ledger is CI's own record.
 */
const NEVER = [ '.github/**', 'ci/**' ]

/**
 * The framework's own controls.
 *
 * Editable, but only in a change that says so (`kind: framework`) and touches
 * nothing in the world. Such a change is judged by the gate as it was before,
 * takes effect the next day, and is flagged in the ledger.
 */
const GUARDED = [
  'scripts/gate/**',
  'scripts/site/**',
  'scripts/stack/**',
  'scripts/browser.ts',
  'scripts/capture.ts',
  'scripts/args.ts',
  'src/harness/**',
  'budgets.json',
  'CLAUDE.md',
  '.claude/settings.json',
  '.claude/hooks/**',
  '.claude/skills/curate/**',
  'eslint.config.mjs',
  'tsconfig.json',
  'vite.config.ts',
  'package.json',
  'bun.lock',
]

/** What a framework change must leave alone. */
const WORLD = [ 'src/world/**', 'src/rig/**' ]

/**
 * What main may gain while a candidate is being made without making it stale:
 * documents and the ledger. Neither changes what gets built.
 */
const INERT = [ '*.md', '**/*.md', 'ci/**' ]

const KINDS = [ 'feature', 'polish', 'fix', 'framework', 'skip' ]

/** `journal/2026-12-05-first-light.md` */
const ENTRY = /^journal\/\d{4}-\d{2}-\d{2}-[a-z0-9][a-z0-9-]*\.md$/u

/** Lockfiles are large by nature and are not what the file-size cap is for. */
const UNCAPPED = new Set([ 'bun.lock' ])

const DEPENDENCY_FIELDS = [ 'dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies' ]

const MAX_TITLE   = 80

const MAX_SUMMARY = 200

export type Verdict = 'candidate' | 'ignored' | 'rejected'

export type Mode = 'candidate' | 'main'

export interface JournalEntry {
  path:    string
  title:   string
  summary: string
  kind:    string
  model:   string
}

export interface PolicyResult {
  verdict:  Verdict
  failures: string[]
  warnings: string[]
  journal:  JournalEntry | null

  /** Whether the change touches the framework's own controls. */
  framework: boolean

  /** Guarded paths the change touches, for the ledger. */
  guarded: string[]
  changed: number

  /**
   * Main moved on after this branch was cut, but only by documents or ledger
   * lines. The candidate is still what was judged; it lands with a merge.
   */
  stale: boolean
}

interface Origin {

  /** The commit the candidate's own work starts from. */
  fork:  string
  stale: boolean

  /** Why the candidate cannot be judged at all, or ''. */
  problem: string
}

interface PolicyOptions {

  /** Repository to read. Its `budgets.json` on disk is the trusted one. */
  repo: string
  base: string
  head: string
  mode: Mode
}

interface Budgets {
  bytes: { addedFile: number }
  docs:  Record<string, number | string>
}

/** What changed in a range, as paths, plus the ones that were added. */
type ChangesReturnType = { paths: string[], added: string[] }

function git (repo: string, ...args: string[]): string {
  // stderr is dropped: a failure is reported by the caller in its own words,
  // and git's own complaint would only be noise in a log a person has to read.
  return execFileSync('git', args, { cwd: repo, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: [ 'ignore', 'pipe', 'ignore' ]}).trimEnd()
}

function tryGit (repo: string, ...args: string[]): string | null {
  try {
    return git(repo, ...args)
  }
  catch {
    return null
  }
}

/** Glob match with `**` (any depth) and `*` (within one segment). */
export function matches (path: string, pattern: string): boolean {
  const source = pattern
    .replaceAll(/[.+^${}()|[\]\\]/gu, String.raw `\$&`)
    .replaceAll('**', '\u0000')
    .replaceAll('*', '[^/]*')
    .replaceAll('\u0000', '.*')

  return new RegExp(`^${source}$`, 'u').test(path)
}

function matchesAny (path: string, patterns: readonly string[]): boolean {
  return patterns.some(pattern => matches(path, pattern))
}

/**
 * The `key: value` block between `---` fences at the top of a file.
 *
 * Deliberately not a YAML parser: the entries are four flat strings, and a real
 * parser would be a dependency in the one job that must not need any.
 */
export function parseFrontMatter (text: string): Record<string, string> | null {
  const match = (/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u).exec(text)

  if (!match)
    return null

  const fields: Record<string, string> = {}

  for (const line of match[1]!.split(/\r?\n/u)) {
    const colon = line.indexOf(':')

    if (colon === -1 || line.trimStart().startsWith('#'))
      continue

    fields[line.slice(0, colon).trim()] = line.slice(colon + 1).trim()
      .replace(/^(["'])(.*)\1$/u, '$2')
  }

  return fields
}

function readEntry (repo: string, head: string, path: string, failures: string[]): JournalEntry | null {
  if (!ENTRY.test(path)) {
    failures.push(`journal entry "${path}" is not named journal/YYYY-MM-DD-slug.md`)

    return null
  }

  const fields = parseFrontMatter(git(repo, 'show', `${head}:${path}`))

  if (!fields) {
    failures.push(`${path} has no front-matter block (--- title / summary / kind / model ---)`)

    return null
  }

  const entry = {
    path,
    title:   fields.title ?? '',
    summary: fields.summary ?? '',
    kind:    fields.kind ?? '',
    model:   fields.model ?? '',
  }

  if (!entry.title || entry.title.length > MAX_TITLE)
    failures.push(`${path}: title is required and at most ${MAX_TITLE} characters`)

  if (!entry.summary || entry.summary.length > MAX_SUMMARY)
    failures.push(`${path}: summary is required and at most ${MAX_SUMMARY} characters (it is shown in the gallery)`)

  if (!KINDS.includes(entry.kind))
    failures.push(`${path}: kind must be one of ${KINDS.join(', ')}`)

  if (!entry.model)
    failures.push(`${path}: model is required (which model made this change)`)

  return entry
}

function dependencyNames (source: string | null): Set<string> {
  const names = new Set<string>()

  if (!source)
    return names

  const manifest = JSON.parse(source) as Record<string, Record<string, string> | undefined>

  for (const field of DEPENDENCY_FIELDS)
    for (const name of Object.keys(manifest[field] ?? {}))
      names.add(name)

  return names
}

function sizeAt (repo: string, head: string, path: string): number {
  return Number(tryGit(repo, 'cat-file', '-s', `${head}:${path}`) ?? 0)
}

function changes (repo: string, range: string): ChangesReturnType {
  const entries = (tryGit(repo, 'diff', '--name-status', '--no-renames', range) ?? '').split('\n')
    .filter(Boolean)
    .map(line => line.split('\t'))

  return {
    paths: entries.map(([ , path ]) => path!),
    added: entries.filter(([ kind ]) => kind === 'A').map(([ , path ]) => path!),
  }
}

/**
 * Commits that touch what a candidate may never touch.
 *
 * Every commit in the range, not just the net difference: a commit that touched
 * a workflow and a later one that reverted it still blocks the push.
 */
function forbiddenTouches (repo: string, range: string): string[] {
  const touched = new Set((tryGit(repo, 'log', '--format=', '--name-only', range) ?? '').split('\n').filter(Boolean))

  return [ ...touched ]
    .filter(path => matchesAny(path, NEVER))
    .map(path => `${path} is not the curator's to change (a commit in this branch touches it): ask in PROPOSALS.md`)
}

function newPackages (repo: string, base: string, head: string): string[] {
  const before = dependencyNames(tryGit(repo, 'show', `${base}:package.json`))

  return [ ...dependencyNames(tryGit(repo, 'show', `${head}:package.json`)) ]
    .filter(name => !before.has(name))
    .map(name => `new package "${name}": packages are added by a person, so ask in PROPOSALS.md`)
}

/** A change to the framework's controls must say so, and must leave the world alone. */
function frameworkRules (paths: readonly string[], guarded: readonly string[], journal: JournalEntry | null): string[] {
  if (guarded.length === 0)
    return []

  const world              = paths.filter(path => matchesAny(path, WORLD))
  const problems: string[] = []

  if (journal && journal.kind !== 'framework')
    problems.push(`touches framework controls (${guarded.slice(0, 4).join(', ')}) but the journal says kind: ${journal.kind}; a framework change is its own change, with kind: framework`)

  if (world.length > 0)
    problems.push(`a framework change may not also change the world (${world.slice(0, 4).join(', ')}): split it into two days`)

  return problems
}

/** Documents and new files that are over their ceilings. */
function sizeRules (repo: string, head: string, paths: readonly string[], added: readonly string[], budgets: Budgets): string[] {
  const problems: string[] = []

  for (const [ pattern, limit ] of Object.entries(budgets.docs)) {
    if (typeof limit !== 'number')
      continue

    for (const path of paths.filter(candidate => matches(candidate, pattern))) {
      const size = sizeAt(repo, head, path)

      if (size > limit)
        problems.push(`${path} is ${size} bytes, over its ${limit} byte ceiling: recompose it instead of appending`)
    }
  }

  for (const path of added) {
    const size = sizeAt(repo, head, path)

    if (size > budgets.bytes.addedFile && !UNCAPPED.has(path))
      problems.push(`${path} is ${size} bytes, over the ${budgets.bytes.addedFile} byte cap for a new file`)
  }

  return problems
}

/**
 * Where a candidate's own work starts, and whether main has moved since.
 *
 * A person may edit REQUESTS.md while a run is under way, and CI appends to the
 * ledger after every push. Neither changes what gets built, so a candidate cut
 * before them is still the thing that was judged. If main gained anything else,
 * the candidate was made against a world that no longer exists.
 */
function originOf (repo: string, base: string, head: string): Origin {
  const fork = tryGit(repo, 'merge-base', base, head)
  const tip  = tryGit(repo, 'rev-parse', '--verify', `${base}^{commit}`)

  if (!fork || !tip)
    return { fork: '', stale: false, problem: `shares no history with ${base}: start from the current main` }

  if (fork === tip)
    return { fork, stale: false, problem: '' }

  const moving = (tryGit(repo, 'diff', '--name-only', `${fork}..${tip}`) ?? '').split('\n')
    .filter(path => path !== '' && !matchesAny(path, INERT))

  return moving.length === 0
    ? { fork, stale: true, problem: '' }
    : { fork, stale: false, problem: `main has moved on since this branch was cut (${moving.slice(0, 4).join(', ')}): redo the change on top of the current main and push again` }
}

/** The commits a push to main is judged over: all it brought, when it says where main was. */
function pushedRange (repo: string, base: string, head: string): string {
  const known = base !== head && tryGit(repo, 'merge-base', '--is-ancestor', base, head) !== null

  return known ? `${base}..${head}` : `${head}~1..${head}`
}

/**
 * Judge a change by what it touches, without running any of it.
 *
 * Everything here reads git objects as data. That is the point: this is the
 * step that decides whether a pushed branch is a candidate at all, so it must be
 * safe to run on a branch nobody has looked at.
 */
export function checkPolicy ({ repo, base, head, mode }: PolicyOptions): PolicyResult {
  const failures: string[] = []
  const warnings: string[] = []
  const budgets            = JSON.parse(readFileSync(resolve(repo, 'budgets.json'), 'utf8')) as Budgets
  const candidate          = mode === 'candidate'

  const origin = candidate ? originOf(repo, base, head) : { fork: '', stale: false, problem: '' }

  const result = (verdict: Verdict, journal: JournalEntry | null, guarded: string[], changed: number): PolicyResult =>
    ({ verdict, failures, warnings, journal, framework: guarded.length > 0, guarded, changed, stale: origin.stale })

  if (origin.problem) {
    failures.push(origin.problem)

    return result('rejected', null, [], 0)
  }

  // A candidate is judged over its own commits; a push to main over what it brought.
  const range            = candidate ? `${origin.fork}..${head}` : pushedRange(repo, base, head)
  const { paths, added } = changes(repo, range)
  const journalled       = added.filter(path => matches(path, 'journal/*.md') && path !== 'journal/README.md')

  // A push with no journal entry is somebody's working branch, not a day's
  // iteration. It is not judged, not landed and not recorded.
  if (candidate && journalled.length === 0)
    return result('ignored', null, [], paths.length)

  // A person pushing to main is warned where the curator would be refused.
  const sink = candidate ? failures : warnings

  if (journalled.length > 1)
    sink.push(`one journal entry per change, found ${journalled.length}: ${journalled.join(', ')}`)

  const journal = journalled.length > 0 ? readEntry(repo, head, journalled[0]!, sink) : null
  const guarded = paths.filter(path => matchesAny(path, GUARDED))

  if (candidate)
    failures.push(...forbiddenTouches(repo, range), ...newPackages(repo, base, head), ...frameworkRules(paths, guarded, journal))

  sink.push(...sizeRules(repo, head, paths, added, budgets))

  return result(failures.length > 0 ? 'rejected' : 'candidate', journal, guarded, paths.length)
}

function main (): void {
  const args   = parseArgs(process.argv.slice(2))
  const repo   = resolve(args.str('repo', '.'))
  const mode   = args.str('mode', 'candidate') === 'main' ? 'main' : 'candidate'
  const result = checkPolicy({ repo, base: args.str('base', 'origin/main'), head: args.str('head', 'HEAD'), mode })
  const out    = args.str('out')

  if (out)
    writeFileSync(out, `${JSON.stringify(result, null, 2)}\n`)

  console.log(`policy · ${result.verdict} · ${result.changed} files changed${result.framework ? ' · framework change' : ''}`)

  for (const failure of result.failures)
    console.log(`  FAIL  ${failure}`)

  for (const warning of result.warnings)
    console.log(`  warn  ${warning}`)

  if (result.verdict === 'rejected')
    process.exitCode = 1
}

if (process.argv[1] === fileURLToPath(import.meta.url))
  main()
