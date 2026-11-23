// scripts/site/ledger.ts
// Runs under plain `node` (type stripping): node built-ins only.
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

import { parseArgs } from '../args.ts'


/**
 * The ledger: one line per pipeline run, written by CI and nobody else.
 *
 * It is how tomorrow's run learns what happened to today's. The run starts from
 * a fresh clone with no memory and no promise of API access, so the outcome of
 * the last push has to be a file in the repository: what was judged, the
 * verdict, and for a rejection the reasons and the branch the work is still on.
 */
export interface LedgerLine {

  /** When the run finished, ISO. */
  ts: string

  /** Link to the pipeline run. */
  run:     string
  mode:    string
  ref:     string
  sha:     string
  verdict: 'published' | 'no-change' | 'rejected' | 'superseded' | 'infra-error'

  /** The iteration number, when the run put one on the site. */
  iteration?: number
  journal?:   { title: string, summary: string }

  /** Checks that failed, each as "name: detail". */
  failed?:   string[]
  warnings?: string[]

  /** Whether the change touched the framework's own controls, and which. */
  framework?: string[]
  stats?:     unknown
  bytes?:     { new: number, site: number }
}

export function appendLedger (file: string, line: LedgerLine): void {
  mkdirSync(dirname(file), { recursive: true })
  appendFileSync(file, `${JSON.stringify(line)}\n`)
}

/** The newest `count` lines, oldest first. Lines that are not JSON are skipped. */
export function readLedger (file: string, count = 10): LedgerLine[] {
  if (!existsSync(file))
    return []

  const lines: LedgerLine[] = []

  for (const text of readFileSync(file, 'utf8').split('\n')
    .filter(Boolean)
    .slice(-count))
    try {
      lines.push(JSON.parse(text) as LedgerLine)
    }
    catch {
      // A damaged line must not hide the ones around it.
    }

  return lines
}

function main (): void {
  const args = parseArgs(process.argv.slice(2))
  const file = resolve(args.str('file', 'ci/ledger.jsonl'))
  const line = JSON.parse(args.str('line', '{}')) as LedgerLine

  appendLedger(file, { ...line, ts: line.ts || new Date().toISOString() })
  console.log(`ledger · ${line.verdict} · ${line.ref}`)
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename))
  main()
