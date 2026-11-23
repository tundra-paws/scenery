// scripts/site/record.ts
// Runs under plain `node` (type stripping): node built-ins only.
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parseArgs } from '../args.ts'
import { appendLedger } from './ledger.ts'
import type { LedgerLine } from './ledger.ts'

/** How many failed checks a ledger line carries. The rest are in the run's log. */
const MAX_FAILURES = 8

/** One job's entry in the workflow's `needs` context. */
interface Job {
  result:   'success' | 'failure' | 'cancelled' | 'skipped'
  outputs?: Record<string, string>
}

interface PolicyFile {
  verdict:  string
  failures: string[]
  warnings: string[]
  journal:  { title: string, summary: string } | null
  guarded:  string[]
}

interface ReportFile {
  verdict:  string
  checks:   { name: string, ok: boolean, detail: string }[]
  warnings: string[]
  stats:    unknown
}

interface ResultFile {
  verdict: 'published' | 'no-change'
  id:      number
  bytes:   { new: number, site: number }
}

interface Trouble {
  verdict: LedgerLine['verdict']
  failed:  string[]
}

export interface RunFacts {
  needs: Record<string, Job | undefined>
  mode:  string
  ref:   string
  sha:   string

  /** Link to the pipeline run. */
  run:    string
  now:    string
  policy: PolicyFile | null
  report: ReportFile | null
  result: ResultFile | null
}

function load<T> (path: string | undefined): T | null {
  return path && existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) as T : null
}

function failedChecks (report: ReportFile | null): string[] {
  return (report?.checks ?? []).filter(check => !check.ok).map(check => `${check.name}: ${check.detail}`.slice(0, 400))
}

/** Trouble before anything was landed: the change itself, or the machinery judging it. */
function judgingTrouble ({ needs, policy, report }: RunFacts): Trouble | null {
  const job = (name: string): string => needs[name]?.result ?? 'skipped'

  if (policy?.verdict === 'rejected')
    return { verdict: 'rejected', failed: policy.failures }

  if (job('policy') !== 'success')
    return { verdict: 'infra-error', failed: [ 'policy: the job did not finish' ]}

  if (job('build') !== 'success')
    return { verdict: 'rejected', failed: [ 'build: typecheck, lint, tests or the build failed (see the run)' ]}

  if (report?.verdict === 'fail')
    return { verdict: 'rejected', failed: failedChecks(report) }

  if (report?.verdict !== 'pass')
    return { verdict: 'infra-error', failed: failedChecks(report).concat('verify: no usable verdict (see the run)') }

  return null
}

/** Trouble after a pass: landing the change on main, or putting it on the site. */
function landingTrouble ({ needs, mode }: RunFacts): Trouble | null {
  const job = (name: string): string => needs[name]?.result ?? 'skipped'

  if (needs.promote?.outputs?.superseded === 'true')
    return { verdict: 'superseded', failed: []}

  if (mode === 'candidate' && job('promote') !== 'success')
    return { verdict: 'rejected', failed: [ 'promote: main could not be fast-forwarded to this commit (did main move? rebase and push again)' ]}

  if (job('publish') !== 'success')
    return { verdict: 'infra-error', failed: [ 'publish: the site was not updated (see the run); the watchdog will retry' ]}

  return null
}

/** The parts of a line that are only there when there is something to say. */
function annotate (line: LedgerLine, { policy, report }: RunFacts): void {
  const warnings = [ ...policy?.warnings ?? [], ...report?.warnings ?? [] ]

  if (policy?.journal)
    line.journal = { title: policy.journal.title, summary: policy.journal.summary }

  if (policy && policy.guarded.length > 0)
    line.framework = policy.guarded

  if (warnings.length > 0)
    line.warnings = warnings.slice(0, MAX_FAILURES)

  if (report?.stats)
    line.stats = report.stats
}

/**
 * Turn a finished pipeline run into its ledger line.
 *
 * Returns null for a push that was never a candidate: those leave no record.
 */
export function describeRun (facts: RunFacts): LedgerLine | null {
  if (facts.policy?.verdict === 'ignored')
    return null

  // The first job that did not succeed is the reason; nothing after it ran.
  const trouble = judgingTrouble(facts) ?? landingTrouble(facts)

  const line: LedgerLine = {
    ts:      facts.now,
    run:     facts.run,
    mode:    facts.mode,
    ref:     facts.ref,
    sha:     facts.sha,
    verdict: trouble?.verdict ?? facts.result?.verdict ?? 'infra-error',
  }

  if (trouble && trouble.failed.length > 0)
    line.failed = trouble.failed.slice(0, MAX_FAILURES)

  if (!trouble && facts.result) {
    line.iteration = facts.result.id
    line.bytes     = facts.result.bytes
  }

  annotate(line, facts)

  return line
}

function main (): void {
  const args = parseArgs(process.argv.slice(2))

  const line = describeRun({
    needs:  JSON.parse(args.str('needs', '{}')) as RunFacts['needs'],
    mode:   args.str('mode', 'candidate'),
    ref:    args.str('ref', ''),
    sha:    args.str('sha', ''),
    run:    args.str('run', ''),
    now:    new Date().toISOString(),
    policy: load<PolicyFile>(args.str('policy')),
    report: load<ReportFile>(args.str('report')),
    result: load<ResultFile>(args.str('result')),
  })

  if (!line) {
    console.log('record · nothing to record (not a candidate)')

    return
  }

  appendLedger(resolve(args.str('file', 'ci/ledger.jsonl')), line)
  console.log(`record · ${line.verdict} · ${line.ref}${line.iteration ? ` · iteration ${line.iteration}` : ''}`)

  for (const failure of line.failed ?? [])
    console.log(`  ${failure}`)
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename))
  main()
