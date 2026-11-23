// scripts/gate/index.ts
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

import { parseArgs } from '../args.ts'
import { checkContract } from './contract.ts'
import { checkPolicy } from './policy.ts'
import { formatReport, verify } from './verify.ts'
import type { Budgets } from './verify.ts'


/**
 * The gate, run locally.
 *
 *   bun run gate            everything CI will check, in the order CI checks it
 *   bun run gate --quick    no browser: policy, typecheck, lint, tests, build, contract
 *   bun run gate --gpu      use a real GPU (faster; the picture checks stop being exact)
 *
 * CI runs the same stages from the copy of these scripts that is already on
 * main, so passing here is necessary and not quite sufficient: a change to the
 * gate itself is judged by the old gate.
 */

const ROOT = resolve(import.meta.dir, '..', '..')
const OUT  = join(ROOT, '.scenery', 'gate')

interface Stage {
  name:   string
  ok:     boolean
  ms:     number
  detail: string
}

/** Run a command, keep its output, and only show it if it failed. */
async function run (name: string, command: string[]): Promise<Stage> {
  const started = Bun.nanoseconds()
  const child   = Bun.spawn(command, { cwd: ROOT, stdout: 'pipe', stderr: 'pipe' })

  const [ stdout, stderr, code ] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ])

  return { name, ok: code === 0, ms: (Bun.nanoseconds() - started) / 1e6, detail: code === 0 ? '' : `${stdout}${stderr}`.trim() }
}

function git (...args: string[]): string | null {
  try {
    return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: [ 'ignore', 'pipe', 'ignore' ]}).trim()
  }
  catch {
    return null
  }
}

/** Judge the committed work against main, if there is a main to judge against. */
function policy (): Stage {
  const started = Bun.nanoseconds()

  if (git('rev-parse', '--verify', '--quiet', 'origin/main') === null)
    return { name: 'policy', ok: true, ms: 0, detail: 'skipped: no origin/main to compare with' }

  const result = checkPolicy({ repo: ROOT, base: 'origin/main', head: 'HEAD', mode: 'candidate' })
  const dirty  = (git('status', '--porcelain') ?? '') !== ''

  const notes = [
    ...result.failures,
    ...result.warnings.map(warning => `(warning) ${warning}`),
    result.verdict === 'ignored' ? 'no journal entry committed yet: CI ignores a branch without one' : '',
    dirty ? 'uncommitted changes are not part of what policy judged' : '',
  ].filter(Boolean)

  return { name: 'policy', ok: result.verdict !== 'rejected', ms: (Bun.nanoseconds() - started) / 1e6, detail: notes.join('\n') }
}

/** The published site's manifest, when the storage branch can be read from here. */
function siteIndex (): string | null {
  const manifest = git('show', 'origin/site-store:iterations.json')

  if (manifest === null)
    return null

  const path = join(OUT, 'site-index.json')

  writeFileSync(path, manifest)

  return path
}

function show (stage: Stage): void {
  console.log(`  ${stage.ok ? 'ok  ' : 'FAIL'}  ${stage.name.padEnd(12)} ${(stage.ms / 1000).toFixed(1).padStart(6)} s`)
}

async function main (): Promise<void> {
  const args            = parseArgs(process.argv.slice(2))
  const stages: Stage[] = []

  mkdirSync(OUT, { recursive: true })
  console.log(`gate · ${args.has('quick') ? 'quick' : 'full'}`)

  const record = (stage: Stage): boolean => {
    stages.push(stage)
    show(stage)

    return stage.ok
  }

  record(policy())

  // Two at a time and no more: five heavy processes at once is what gets a
  // gate killed for memory on a four-core cloud container.
  const [ types, lint ] = await Promise.all([
    run('typecheck', [ 'bunx', 'tsc', '--noEmit' ]),
    run('lint', [ 'bunx', 'eslint', '.', '--max-warnings', '0', '--cache', '--cache-location', 'node_modules/.cache/eslint/' ]),
  ])

  record(types)
  record(lint)
  record(await run('test', [ 'bun', 'test' ]))

  const built = record(await run('build', [ 'bunx', 'vite', 'build', '--logLevel', 'warn' ]))

  if (built && args.has('quick')) {
    const started  = Bun.nanoseconds()
    const contract = checkContract({ dist: join(ROOT, 'dist'), trustedThree: join(ROOT, 'node_modules', 'three') })

    record({ name: 'contract', ok: contract.failures.length === 0, ms: (Bun.nanoseconds() - started) / 1e6, detail: contract.failures.join('\n') })
  }

  if (built && !args.has('quick')) {
    const started = Bun.nanoseconds()

    const report = await verify({
      dist:         join(ROOT, 'dist'),
      out:          OUT,
      shell:        join(ROOT, 'shell'),
      siteIndex:    siteIndex(),
      budgets:      JSON.parse(readFileSync(join(ROOT, 'budgets.json'), 'utf8')) as Budgets,
      trustedThree: join(ROOT, 'node_modules', 'three'),
      gpu:          args.has('gpu'),
      meta:         {},
    })

    writeFileSync(join(OUT, 'report.json'), `${JSON.stringify(report, null, 2)}\n`)
    record({ name: 'verify', ok: report.verdict === 'pass', ms: (Bun.nanoseconds() - started) / 1e6, detail: formatReport(report) })
  }

  const failed = stages.filter(stage => !stage.ok)

  for (const stage of stages)
    if (stage.detail && (!stage.ok || stage.name === 'verify' || stage.name === 'policy'))
      console.log(`\n── ${stage.name} ──\n${stage.detail}`)

  console.log(failed.length === 0
    ? '\ngate · green · shots and report are in .scenery/gate/'
    : `\ngate · RED · ${failed.map(stage => stage.name).join(', ')}`)

  if (failed.length > 0)
    process.exitCode = 1
}

await main()
