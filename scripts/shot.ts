// scripts/shot.ts
import { mkdirSync } from 'node:fs'
import { join, resolve } from 'node:path'

import { parseArgs } from './args.ts'
import { serveStatic, withBrowser } from './browser.ts'
import { capture, openWorld } from './capture.ts'
import type { Problems } from './capture.ts'


/**
 * Photograph the world.
 *
 *   bun run shot                              every view, desktop tier, 800x500
 *   bun run shot --views hero --tier mobile   one view, the phone's budget
 *   bun run shot --t 40 --size 1280x720       a later moment, larger
 *   bun run shot --out .scenery/shots/before  somewhere to keep a "before"
 *   bun run shot --gpu                        fast, and not comparable to anything
 *
 * It builds first, then captures through the page's harness on software WebGL,
 * so the same commit always produces the same pictures. Read the PNGs: a change
 * that was not looked at has not been verified.
 */

export interface ShotResult {
  view:    string
  tier:    string
  file:    string
  ok:      boolean
  ms:      number
  draws:   number
  tris:    number
  message: string
}

interface ShootOptions {

  /** Directory holding a build (`index.html`, `a/`, `v/`). */
  dist:   string
  views:  readonly string[]
  tiers:  readonly string[]
  t:      number
  width:  number
  height: number
  out:    string
  gpu:    boolean
}

function complaints (problems: Problems): string[] {
  return [
    ...problems.errors.map(text => `error: ${text}`),
    ...problems.failed.map(text => `failed request: ${text}`),
    ...problems.foreign.map(text => `left the origin: ${text}`),
  ]
}

/** Capture every asked view at every asked tier from a built `dist`. */
export async function shoot (options: ShootOptions): Promise<ShotResult[]> {
  const { dist, views, tiers, t, width, height, out, gpu } = options
  const server                                             = serveStatic(dist)
  const results: ShotResult[]                              = []

  mkdirSync(out, { recursive: true })

  try {
    await withBrowser(gpu, async browser => {
      // One tier at a time, one page per tier: a second software-rendered page
      // would halve the speed of both and blow the ready budget on four cores.
      for (const tier of tiers) {
        const world = await openWorld(browser, { url: server.url, tier, width, height })

        try {
          const known = world.state === 'ready'
            ? await world.page.evaluate(() => window.__SCENERY__?.views ?? [])
            : []

          const wanted = views.includes('all') ? known : views

          for (const view of wanted) {
            const file = join(out, `${view}.${tier}.png`)

            if (world.state !== 'ready') {
              results.push({ view, tier, file, ok: false, ms: 0, draws: 0, tris: 0, message: `page is "${world.state}", not ready` })
              continue
            }

            try {
              const shot = await capture(world, { view, t, width, height })

              await Bun.write(file, shot.image)
              results.push({ view, tier, file, ok: true, ms: shot.ms, draws: shot.census?.draws ?? 0, tris: shot.census?.triangles ?? 0, message: '' })
            }
            catch (error) {
              results.push({ view, tier, file, ok: false, ms: 0, draws: 0, tris: 0, message: error instanceof Error ? error.message : String(error) })
            }
          }

          const said = complaints(world.problems)

          if (said.length > 0)
            results.push({ view: '(page)', tier, file: '', ok: false, ms: 0, draws: 0, tris: 0, message: said.join(' · ') })
        }
        finally {
          await world.close()
        }
      }
    })
  }
  finally {
    server.stop()
  }

  return results
}

export function formatResult (result: ShotResult): string {
  const name = `${result.view}.${result.tier}`.padEnd(22)

  return result.ok
    ? `  ${name} ok    ${(result.ms / 1000).toFixed(1).padStart(5)} s  ${String(result.draws).padStart(4)} draws  ${(result.tris / 1000).toFixed(0).padStart(5)}k tris  ${result.file}`
    : `  ${name} FAIL  ${result.message}`
}

/** Build the working tree into `dist`. Vite only: typechecking is the gate's job. */
export async function build (cwd: string): Promise<void> {
  const child = Bun.spawn([ 'bunx', 'vite', 'build', '--logLevel', 'warn' ], { cwd, stdout: 'inherit', stderr: 'inherit' })

  if (await child.exited !== 0)
    throw new Error('the build failed, so there is nothing to photograph')
}

async function main (): Promise<void> {
  const args     = parseArgs(process.argv.slice(2))
  const root     = resolve(import.meta.dir, '..')
  const dist     = resolve(root, args.str('dist', 'dist'))
  const [ w, h ] = args.str('size', '800x500').split('x')
    .map(Number)

  if (!args.has('no-build'))
    await build(root)

  const results = await shoot({
    dist,
    views:  args.csv('views', [ 'all' ]),
    tiers:  args.csv('tier', [ 'desktop' ]),
    t:      args.num('t', 10),
    width:  w || 800,
    height: h || 500,
    out:    resolve(root, args.str('out', '.scenery/shots')),
    gpu:    args.has('gpu'),
  })

  console.log(`shot · t=${args.num('t', 10)}s · ${args.has('gpu') ? 'gpu' : 'software'}`)

  for (const result of results)
    console.log(formatResult(result))

  if (results.length === 0 || results.some(result => !result.ok))
    process.exitCode = 1
}

if (import.meta.main)
  await main()
