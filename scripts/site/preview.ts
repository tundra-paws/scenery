// scripts/site/preview.ts
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

import { parseArgs } from '../args.ts'
import { serveStatic } from '../browser.ts'
import { parseFrontMatter } from '../gate/policy.ts'
import { formatReport, verify } from '../gate/verify.ts'
import type { Budgets } from '../gate/verify.ts'
import { applyPayload } from './apply.ts'


/**
 * The published site, assembled locally.
 *
 *   bun run site             build, verify, add the working tree as the next iteration, serve it
 *   bun run site --fresh     start again from what is published (or from nothing)
 *   bun run site --no-serve  assemble into .site/ and stop
 *
 * It goes through the same verify and apply steps CI uses and serves the result
 * under /scenery/, the path Pages serves it under, so a link that only works at
 * the root of a domain breaks here first.
 */

const ROOT = resolve(import.meta.dir, '..', '..')
const SITE = join(ROOT, '.site')
const OUT  = join(ROOT, '.scenery', 'gate')

function git (...args: string[]): string | null {
  try {
    return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: [ 'ignore', 'pipe', 'ignore' ]}).trim()
  }
  catch {
    return null
  }
}

/** Start the preview from the published site when its storage branch can be read. */
function seed (): void {
  rmSync(SITE, { recursive: true, force: true })
  mkdirSync(SITE, { recursive: true })

  if (git('rev-parse', '--verify', '--quiet', 'origin/site-store') === null)
    return

  execFileSync('sh', [ '-c', `git archive origin/site-store | tar -x -C "${SITE}"` ], { cwd: ROOT })
}

/** What to call this iteration: the newest journal entry's words, or a plain label. */
function describe (): Record<string, string> {
  const dir     = join(ROOT, 'journal')
  const entries = existsSync(dir)
    ? readdirSync(dir).filter(name => (/^\d{4}-\d{2}-\d{2}-.*\.md$/u).test(name))
      .sort()
    : []
  const newest = entries.at(-1)
  const fields = newest ? parseFrontMatter(readFileSync(join(dir, newest), 'utf8')) : null

  return {
    title:   fields?.title ?? 'Working tree',
    summary: fields?.summary ?? 'The world as it is on this machine, not yet published.',
    kind:    fields?.kind ?? 'feature',
    model:   fields?.model ?? '',
    journal: newest ? `journal/${newest}` : '',
  }
}

async function main (): Promise<void> {
  const args = parseArgs(process.argv.slice(2))

  if (args.has('fresh') || !existsSync(SITE))
    seed()

  const build = Bun.spawn([ 'bunx', 'vite', 'build', '--logLevel', 'warn' ], { cwd: ROOT, stdout: 'inherit', stderr: 'inherit' })

  if (await build.exited !== 0)
    throw new Error('the build failed, so there is nothing to preview')

  mkdirSync(OUT, { recursive: true })

  const report = await verify({
    dist:         join(ROOT, 'dist'),
    out:          OUT,
    shell:        join(ROOT, 'shell'),
    siteIndex:    existsSync(join(SITE, 'iterations.json')) ? join(SITE, 'iterations.json') : null,
    budgets:      JSON.parse(readFileSync(join(ROOT, 'budgets.json'), 'utf8')) as Budgets,
    trustedThree: join(ROOT, 'node_modules', 'three'),
    gpu:          args.has('gpu'),
    meta:         { sha:  git('rev-parse', 'HEAD') ?? '',
      date: new Date().toISOString()
        .slice(0, 10),
      ...describe() },
  })

  writeFileSync(join(OUT, 'report.json'), `${JSON.stringify(report, null, 2)}\n`)
  console.log(formatReport(report))

  if (!existsSync(join(OUT, 'payload', 'meta.json')))
    throw new Error('verify left no payload, so there is nothing to add to the preview')

  const result = applyPayload({ payload: join(OUT, 'payload'), site: SITE, repo: 'tundra-paws/scenery' })

  console.log(`site · ${result.verdict} · ${result.dir} · the preview holds ${result.bytes.site} bytes`)

  if (args.has('no-serve'))
    return

  const server = serveStatic(SITE, { port: args.num('port', 4190), mount: '/scenery/' })

  console.log(`\n  ${server.url}            the gallery\n  ${server.url}${result.dir}    this iteration on its own\n\n  ctrl-c to stop`)
}

await main()
