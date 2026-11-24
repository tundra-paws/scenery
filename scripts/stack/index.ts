// scripts/stack/index.ts
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { parseArgs } from '../args.ts'
import type { Outcome } from './apply.ts'
import { PACKAGE, STACK, ensureStack, isCurrent, port, readStack, restore } from './install.ts'
import type { Report } from './install.ts'
import { StackError } from './parse.ts'

/**
 * The library stack: improvements to the scene library, kept here until
 * upstream ships them, and applied to the installed package meanwhile.
 *
 *   bun run stack                     make node_modules match the stack (also runs after every install)
 *   bun run stack --check             say whether it does, and change nothing
 *   bun run stack --list              the improvements, in order
 *   bun run stack --restore           the package as published, with no stack
 *   bun run stack --to ../checkout    apply the stack to a checkout of the library (--dry to only report)
 *
 * `lib-stack/README.md` says how an improvement is written.
 */

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..', '..')

const MARKS: Record<Outcome['status'], string> = { applied: 'applied ', present: 'present ', conflict: 'CONFLICT' }

function list (): void {
  const stack = readStack(ROOT)

  console.log(`stack · ${stack.length} improvements to ${PACKAGE} in ${STACK}/`)

  for (const improvement of stack)
    console.log(`  ${improvement.id.padEnd(34)} ${improvement.kind.padEnd(5)} ${improvement.released ? `released in ${improvement.released}` : `on ${improvement.base}`.padEnd(9)}  ${improvement.title}`)
}

function show (report: Report): void {
  const count = `${report.applied.length} improvement${report.applied.length === 1 ? '' : 's'}`

  const lines: Record<Report['status'], string> = {
    current:  `${count} on ${PACKAGE} ${report.version}, already in place`,
    applied:  `${count} applied to ${PACKAGE} ${report.version}: ${report.applied.join(', ')}`,
    restored: `empty: ${PACKAGE} ${report.version} is as published`,
    skipped:  `skipped: ${report.note}`,
    failed:   `FAILED on ${PACKAGE} ${report.version}; the package is as published`,
  }

  console.log(`stack · ${lines[report.status]}`)

  for (const id of report.released)
    console.log(`  ${id} is released in this version: delete it from ${STACK}/`)

  for (const problem of report.problems)
    console.log(`  ${problem}`)
}

/** Report what each improvement did to an upstream checkout. */
function showPort (target: string, dry: boolean, outcomes: readonly Outcome[]): void {
  console.log(`stack · ${dry ? 'would apply' : 'applied'} to ${target}`)

  for (const outcome of outcomes) {
    console.log(`  ${MARKS[outcome.status]}  ${outcome.id}${outcome.files.length > 0 ? `  (${outcome.files.join(', ')})` : ''}`)

    for (const problem of outcome.problems)
      console.log(`            ${problem}`)
  }

  console.log(dry
    ? '  nothing was written (--dry)'
    : `  source only: build, test and release there, then set "released:" on each improvement here`)
}

async function main (): Promise<void> {
  const args   = parseArgs(process.argv.slice(2))
  const target = args.str('to')

  if (args.has('list'))
    return list()

  if (args.has('restore'))
    return console.log(`stack · ${restore(ROOT) ? `${PACKAGE} is as published` : 'nothing to restore'}`)

  if (args.has('check')) {
    const current = isCurrent(ROOT)

    console.log(`stack · ${current ? 'in place' : 'NOT in place: bun run stack'}`)
    process.exitCode = current ? 0 : 1

    return
  }

  if (target) {
    const outcomes = port(ROOT, resolve(target), args.has('dry'))

    showPort(resolve(target), args.has('dry'), outcomes)
    process.exitCode = outcomes.some(outcome => outcome.status === 'conflict') ? 1 : 0

    return
  }

  const report = await ensureStack(ROOT)

  show(report)
  process.exitCode = report.status === 'failed' ? 1 : 0
}

try {
  await main()
}
catch (error) {
  if (!(error instanceof StackError))
    throw error

  console.log(`stack · ${error.message}`)
  process.exitCode = 1
}
