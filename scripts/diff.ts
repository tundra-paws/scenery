// scripts/diff.ts
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

import pixelmatch from 'pixelmatch'
import { PNG } from 'pngjs'

import { parseArgs } from './args.ts'
import { build, shoot } from './shot.ts'


/**
 * What changed on screen, measured.
 *
 *   bun run diff                         the working tree against origin/main, every view
 *   bun run diff --views hero --tier mobile
 *   bun run diff --ref HEAD~3            against another commit
 *   bun run diff --ref-only              only build the reference (a head start for later)
 *   bun run diff --tolerance 0.1         forgive small colour differences (0 to 1)
 *   bun run diff --clean                 forget the cached reference builds
 *
 * Two numbers per view. `changed` is the share of the frame that differs;
 * `max block` is the worst 32-pixel square, which is what catches a small thing
 * that changed completely while the rest of the frame held still. A run that
 * claims a visible change and moves neither has not made one.
 */

const ROOT = resolve(import.meta.dir, '..')
const WORK = join(ROOT, '.scenery')

/** Side of the squares `max block` is measured over, in pixels. */
const BLOCK = 32

/**
 * How different two pixels must be to count as different, from 0 to 1.
 *
 * Low on purpose. Both frames come from the same software renderer, so there is
 * no noise to forgive, and a change of palette is exactly the kind of difference
 * a forgiving comparison would call nothing.
 */
const TOLERANCE = 0.02

/** Percent of the frame that has to differ for a view to count as moved. */
const THRESHOLD = 0.5

export interface Measured {

  /** Percent of the frame that differs. */
  changed: number

  /** Percent of the worst block that differs. */
  maxBlock: number
  image:    PNG
}

interface Row {
  view:     string
  tier:     string
  changed:  number
  maxBlock: number
  note:     string
}

function git (...args: string[]): string | null {
  try {
    return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: [ 'ignore', 'pipe', 'ignore' ]}).trim()
  }
  catch {
    return null
  }
}

/** Compare two frames of the same size. */
export function compare (before: PNG, after: PNG, tolerance: number): Measured {
  const { width, height } = before
  const image             = new PNG({ width, height })
  const changed           = pixelmatch(before.data, after.data, image.data, width, height, { threshold: tolerance })

  let maxBlock = 0

  for (let top = 0; top < height; top += BLOCK)
    for (let left = 0; left < width; left += BLOCK) {
      const right  = Math.min(left + BLOCK, width)
      const bottom = Math.min(top + BLOCK, height)

      let hits = 0

      // pixelmatch paints a differing pixel red in its output and leaves the
      // rest grey, so a pixel differs where red is not equal to green.
      for (let y = top; y < bottom; y += 1)
        for (let x = left; x < right; x += 1) {
          const offset = (y * width + x) * 4

          if (image.data[offset] !== image.data[offset + 1])
            hits += 1
        }

      maxBlock = Math.max(maxBlock, hits / ((right - left) * (bottom - top)))
    }

  return { changed: 100 * changed / (width * height), maxBlock: 100 * maxBlock, image }
}

async function run (command: string[], cwd: string): Promise<boolean> {
  const child = Bun.spawn(command, { cwd, stdout: 'ignore', stderr: 'inherit' })

  return await child.exited === 0
}

/**
 * A build of another commit, made in a throwaway worktree and kept.
 *
 * Kept because building it is the slow half and it never changes: a commit's
 * build is that commit's build. Returns null when that commit has nothing to
 * build, which is true of every commit from before the framework existed.
 */
async function reference (sha: string): Promise<string | null> {
  const home = join(WORK, 'ref', sha)
  const dist = join(home, 'dist')
  const tree = join(home, 'tree')

  if (existsSync(join(dist, 'index.html')))
    return dist

  mkdirSync(home, { recursive: true })

  if (git('worktree', 'add', '--detach', '--force', tree, sha) === null)
    throw new Error(`could not check out ${sha} to build a reference from`)

  try {
    if (!existsSync(join(tree, 'vite.config.ts')))
      return null

    const lock     = (dir: string): string => existsSync(join(dir, 'bun.lock')) ? readFileSync(join(dir, 'bun.lock'), 'utf8') : ''
    const prepared = lock(tree) === lock(ROOT)
      ? (symlinkSync(join(ROOT, 'node_modules'), join(tree, 'node_modules')), true)
      : await run([ 'bun', 'install', '--frozen-lockfile' ], tree)

    if (!prepared || !await run([ 'bunx', 'vite', 'build', '--logLevel', 'warn', '--outDir', dist, '--emptyOutDir' ], tree))
      return null

    return dist
  }
  finally {
    git('worktree', 'remove', '--force', tree)
  }
}

function readPng (path: string): PNG | null {
  return existsSync(path) ? PNG.sync.read(readFileSync(path)) : null
}

function formatRow (row: Row): string {
  const numbers = row.note === 'new' || row.note === 'missing'
    ? ''.padEnd(22)
    : `${row.changed.toFixed(2).padStart(8)}%  ${row.maxBlock.toFixed(1).padStart(8)}%`

  return `  ${`${row.view}.${row.tier}`.padEnd(22)} ${numbers}  ${row.note}`
}

/** Measure one freshly taken shot against the reference shot of the same name. */
function weigh (view: string, tier: string, file: string, threshold: number, tolerance: number): Row {
  const name = `${view}.${tier}`
  const old  = readPng(join(WORK, 'diff', 'ref', `${name}.png`))
  const now  = readPng(file)

  if (!now || !old)
    return { view, tier, changed: 0, maxBlock: 0, note: now ? 'new' : 'missing' }

  if (old.width !== now.width || old.height !== now.height)
    return { view, tier, changed: 100, maxBlock: 100, note: 'size changed' }

  const measured = compare(old, now, tolerance)
  const moved    = measured.changed >= threshold || measured.maxBlock >= 50
  const picture  = join(WORK, 'diff', `${name}.diff.png`)

  if (moved)
    writeFileSync(picture, PNG.sync.write(measured.image))

  return { view, tier, changed: measured.changed, maxBlock: measured.maxBlock, note: moved ? `moved  ${picture}` : '' }
}

function clean (): void {
  rmSync(join(WORK, 'ref'), { recursive: true, force: true })
  git('worktree', 'prune')
  console.log('diff · cached reference builds removed')
}

function report (rows: readonly Row[], label: string, t: number): void {
  const moved = rows.filter(row => row.note !== '' && row.note !== 'missing').length

  console.log(`diff · ${label} → working tree · t=${t}s`)
  console.log(`  ${'view'.padEnd(22)} ${'changed'.padStart(9)}  ${'max block'.padStart(9)}`)

  for (const row of rows)
    console.log(formatRow(row))

  console.log(moved > 0
    ? `  → ${moved} of ${rows.length} views moved · before: .scenery/diff/ref/ · after: .scenery/diff/head/`
    : '  → nothing moved. If this change is meant to be visible, it is not.')
}

async function main (): Promise<void> {
  const args = parseArgs(process.argv.slice(2))

  if (args.has('clean'))
    return clean()

  const rev = args.str('ref', git('rev-parse', '--verify', '--quiet', 'origin/main') === null ? 'HEAD' : 'origin/main')
  const sha = git('rev-parse', '--verify', `${rev}^{commit}`)

  if (!sha)
    throw new Error(`"${rev}" is not a commit`)

  const label  = `${rev} (${sha.slice(0, 7)})`
  const before = await reference(sha)

  if (!before || args.has('ref-only'))
    return console.log(before ? `diff · reference ${label} is built` : `diff · ${label} has no world to build, so there is nothing to compare with`)

  const [ width, height ] = args.str('size', '800x500').split('x')
    .map(Number)

  const options = {
    views:  args.csv('views', [ 'all' ]),
    tiers:  args.csv('tier', [ 'desktop' ]),
    t:      args.num('t', 10),
    width:  width || 800,
    height: height || 500,
    gpu:    false,
  }

  await build(ROOT)

  // One after the other: two software-rendered browsers at once halve each
  // other and miss their ready budgets.
  await shoot({ ...options, dist: before, out: join(WORK, 'diff', 'ref') })

  const shots = await shoot({ ...options, dist: join(ROOT, 'dist'), out: join(WORK, 'diff', 'head') })

  const rows = shots
    .filter(shot => shot.ok)
    .map(shot => weigh(shot.view, shot.tier, shot.file, args.num('threshold', THRESHOLD), args.num('tolerance', TOLERANCE)))

  report(rows, label, options.t)
}

if (import.meta.main)
  await main()
