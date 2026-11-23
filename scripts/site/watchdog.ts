// scripts/site/watchdog.ts
// Runs under plain `node` (type stripping): node built-ins only.
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parseArgs } from '../args.ts'
import { readLedger } from './ledger.ts'
import type { LedgerLine } from './ledger.ts'


const HOUR = 3_600_000

/** A day with nothing on the ledger, plus slack for a late run. */
const SILENCE = 36 * HOUR

/** How far back a landed framework change is worth mentioning. */
const RECENT = 26 * HOUR

/** A candidate older than this is not re-dispatched: the world has moved on. */
const STALE_CANDIDATE = 3 * 24 * HOUR

/** A branch older than this is deleted. */
const STALE_BRANCH = 14 * 24 * HOUR

/** Rejections in a row before a person is told. */
const REJECTIONS = 3

export interface Branch {
  name: string
  sha:  string

  /** When its newest commit was made, in milliseconds since the epoch. */
  committed: number

  /** Whether its tip adds a journal entry that main does not have. */
  journalled: boolean
}

export interface WatchFacts {
  now:      number
  paused:   boolean
  ledger:   LedgerLine[]
  branches: Branch[]

  /** Bytes at which the site's size is worth a warning. */
  siteWarn: number
}

export interface WatchPlan {

  /** Reasons a person should look. Empty means all is well. */
  alerts: string[]

  /** Candidates that were pushed and never judged. */
  dispatch: { ref: string, sha: string }[]

  /** Whether to publish main again because the last attempt broke. */
  republish: boolean

  /** Branches old enough to delete. */
  prune: string[]
}

/**
 * Text from the ledger, made safe to post in an issue.
 *
 * Titles and failure details were written by a model or by the page it built.
 * An `@name` in one would notify a stranger, so the sign that makes it a mention
 * is taken out, along with anything that could start a new line of markdown.
 */
function plain (text: string): string {
  return text.replaceAll('@', '(at)').replaceAll(/[\r\n`]+/gu, ' ')
    .slice(0, 300)
}

function isLanded (line: LedgerLine): boolean {
  return line.verdict === 'published' || line.verdict === 'no-change'
}

/** The daily run has gone quiet. Expected while paused, so not an alert then. */
function silenceAlert ({ now, paused, ledger }: WatchFacts): string[] {
  const newest = ledger.at(-1)

  if (paused || newest && now - Date.parse(newest.ts) <= SILENCE)
    return []

  return [ `Nothing has reached the ledger since ${newest?.ts ?? 'the start'}. The daily run may have stopped: check the routine at claude.ai/code/routines and its GitHub connection.` ]
}

/** The curator keeps being turned away, or the pipeline itself keeps breaking. */
function streakAlerts ({ ledger }: WatchFacts): string[] {
  const alerts: string[] = []
  const rejected         = ledger.slice(-REJECTIONS)
  const broken           = ledger.slice(-2)

  if (rejected.length === REJECTIONS && rejected.every(line => line.verdict === 'rejected'))
    alerts.push(`The last ${REJECTIONS} candidates were rejected. Latest reasons: ${plain((ledger.at(-1)?.failed ?? []).slice(0, 3).join(' | '))}`)

  if (broken.length === 2 && broken.every(line => line.verdict === 'infra-error'))
    alerts.push('The pipeline itself failed twice in a row (not the world): see the linked runs.')

  return alerts
}

/**
 * The curator changed the framework's own controls since the last look.
 *
 * Only the curator's changes: the owner does not need telling what the owner pushed.
 */
function frameworkAlerts ({ now, ledger }: WatchFacts): string[] {
  return ledger
    .filter(line => line.mode === 'candidate' && isLanded(line) && line.framework && now - Date.parse(line.ts) < RECENT)
    .map(line => `A framework change landed (${plain((line.framework ?? []).slice(0, 6).join(', '))}): "${plain(line.journal?.title ?? line.sha.slice(0, 7))}". It takes effect from the next run.`)
}

function sizeAlert ({ ledger, siteWarn }: WatchFacts): string[] {
  const size = ledger.findLast(isLanded)?.bytes?.site ?? 0

  return size > siteWarn
    ? [ `The site is ${Math.round(size / 1e6)} MB of GitHub Pages' 1000 MB. Time to decide what to prune.` ]
    : []
}

function alertsFor (facts: WatchFacts): string[] {
  return [ ...silenceAlert(facts), ...streakAlerts(facts), ...frameworkAlerts(facts), ...sizeAlert(facts) ]
}

/**
 * Decide what the daily check should do. Pure: the workflow gathers the facts
 * and carries the plan out, and this is the part that can be tested.
 */
export function planWatch (facts: WatchFacts): WatchPlan {
  const { now, paused, ledger, branches } = facts
  const judged                            = new Set(ledger.map(line => line.sha))
  const newest                            = ledger.at(-1)

  const dispatch = paused
    ? []
    : branches
      .filter(branch => branch.journalled && !judged.has(branch.sha) && now - branch.committed < STALE_CANDIDATE)
      .map(branch => ({ ref: branch.name, sha: branch.sha }))

  // One retry, not a loop: only when the newest line is the first failure.
  const republish = !paused &&
    newest?.verdict === 'infra-error' &&
    ledger.at(-2)?.verdict !== 'infra-error' &&
    now - Date.parse(newest.ts) > 2 * HOUR

  return {
    alerts: alertsFor(facts),
    dispatch,
    republish,
    prune:  branches.filter(branch => now - branch.committed > STALE_BRANCH).map(branch => branch.name),
  }
}

function git (repo: string, ...args: string[]): string {
  try {
    return execFileSync('git', args, { cwd: repo, encoding: 'utf8', stdio: [ 'ignore', 'pipe', 'ignore' ]}).trim()
  }
  catch {
    return ''
  }
}

/** Every `claude/*` branch on the remote, with what the plan needs to know about it. */
function readBranches (repo: string): Branch[] {
  return git(repo, 'for-each-ref', '--format=%(refname:short)\t%(objectname)\t%(committerdate:unix)', 'refs/remotes/origin/claude')
    .split('\n')
    .filter(Boolean)
    .map(line => {
      const [ name, sha, seconds ] = line.split('\t')
      const added                  = git(repo, 'diff', '--name-status', '--no-renames', `origin/main...${sha!}`)

      return {
        name:       name!.replace(/^origin\//u, ''),
        sha:        sha!,
        committed:  Number(seconds) * 1000,
        journalled: (/^A\tjournal\/\d{4}-\d{2}-\d{2}-.*\.md$/mu).test(added),
      }
    })
}

function main (): void {
  const args    = parseArgs(process.argv.slice(2))
  const repo    = resolve(args.str('repo', '.'))
  const budgets = JSON.parse(readFileSync(resolve(repo, 'budgets.json'), 'utf8')) as { bytes: { siteWarn: number }}

  const plan = planWatch({
    now:      Date.now(),
    paused:   args.str('paused', 'false') === 'true',
    ledger:   readLedger(resolve(repo, 'ci', 'ledger.jsonl'), 60),
    branches: readBranches(repo),
    siteWarn: budgets.bytes.siteWarn,
  })

  const out = args.str('out')

  if (out)
    writeFileSync(out, `${JSON.stringify(plan, null, 2)}\n`)

  console.log(`watchdog · ${plan.alerts.length} alerts · ${plan.dispatch.length} to dispatch · ${plan.prune.length} to prune${plan.republish ? ' · republish' : ''}`)

  for (const alert of plan.alerts)
    console.log(`  ${alert}`)
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename))
  main()
