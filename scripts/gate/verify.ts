// scripts/gate/verify.ts
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import pixelmatch from 'pixelmatch'
import type { Browser } from 'playwright-core'
import { PNG } from 'pngjs'
import { parseArgs } from '../args.ts'
import { serveStatic, withBrowser } from '../browser.ts'
import { capture, openWorld } from '../capture.ts'
import type { Problems, WorldPage } from '../capture.ts'
import { checkContract } from './contract.ts'
import type { Census, LiveKind } from './instrument.ts'

/** The path the staged site is served under, like the published one. */
const MOUNT = '/scenery/'

/** Where the candidate sits in the staged site. Never a real iteration number. */
const STAGED = 'i/0000/'

const THUMB = { width: 320, height: 180 }

/** Two moments far apart, so anything reading the wall clock gives itself away. */
const EPOCHS = [ Date.UTC(2031, 5, 1), Date.UTC(1999, 0, 1) ]

/** How long the page may take to react to a real drag or key, in milliseconds. */
const REACTION_BUDGET = 45_000

const LIVE_KINDS: readonly LiveKind[] = [ 'buffers', 'textures', 'programs', 'framebuffers', 'renderbuffers', 'vertexArrays' ]

/** The driver remarking that reading pixels back is slow. It is, and that is what a capture does. */
const DRIVER_CHATTER = /GL Driver Message.*ReadPixels/u

export type Verdict = 'pass' | 'fail' | 'infra-error'

export interface Check {
  name:   string
  ok:     boolean
  detail: string
}

export interface TierStats {
  draws:     number
  triangles: number
  live:      Record<LiveKind, number>
}

export interface VerifyReport {
  verdict:  Verdict
  checks:   Check[]
  warnings: string[]
  three:    string
  distHash: string
  bytes: {
    iteration: number
    vendor:    number

    /** What publishing this would add to the site. */
    new: number

    /** The site's size before this iteration. */
    site: number
  }
  stats: Record<string, TierStats>
}

export interface Budgets {
  capture:     { width: number, height: number, seconds: number, tiers: string[] }
  render:      Record<string, { draws: number, triangles: number } | string>
  live:        Record<string, number | string>
  leak:        { seconds: number, growth: number }
  blank:       { dominantShare: number, minDeviation: number }
  determinism: { pixels: number }
  bytes:       { newPerIteration: number, siteWarn: number, siteHardCap: number }
}

export interface VerifyOptions {

  /** The build to judge. Treated as data: nothing in it runs outside the browser. */
  dist: string

  /** Where to write the staged site, the shots, the payload and the report. */
  out: string

  /** The shell's static files, when the shell should be smoke-tested and published. */
  shell: string | null

  /** The published site's `iterations.json`, when there is one to measure against. */
  siteIndex: string | null
  budgets:   Budgets

  /** A `node_modules/three` this checker trusts. */
  trustedThree: string

  /** Use a real GPU. Faster, and the determinism and budget numbers stop being comparable. */
  gpu: boolean

  /** Fields for the payload's `meta.json` that only the caller knows (sha, title, date). */
  meta: Record<string, unknown>
}

interface SiteIndex {
  iterations?: { three?: string, bytes?: { site?: number }}[]
}

/** How much of a frame is one colour, and how much its brightness varies. */
type BlanknessReturnType = { share: number, deviation: number }

interface Run {
  options:  VerifyOptions
  checks:   Check[]
  warnings: string[]
  stats:    Record<string, TierStats>

  /** The staged site on disk. */
  root: string
}

interface Pictures {
  hero: Buffer
  webp: Buffer
  tiny: Buffer
}

/** What the published site already holds, as far as the size check needs to know. */
type ReadSiteReturnType = { bytes: number, vendors: Set<string> }

/** Run the world on for a while and make sure it has not allocated anything new. */
type AtType = { width: number, height: number, seconds: number }

function decode (image: Buffer): PNG {
  return PNG.sync.read(image)
}

function blankness (png: PNG): BlanknessReturnType {
  const buckets = new Map<number, number>()
  const pixels  = png.width * png.height

  let sum     = 0
  let squares = 0
  let largest = 0

  for (let offset = 0; offset < png.data.length; offset += 4) {
    const red   = png.data[offset]!
    const green = png.data[offset + 1]!
    const blue  = png.data[offset + 2]!
    const key   = red >> 4 << 8 | green >> 4 << 4 | blue >> 4
    const count = (buckets.get(key) ?? 0) + 1
    const light = 0.2126 * red + 0.7152 * green + 0.0722 * blue

    buckets.set(key, count)
    largest  = Math.max(largest, count)
    sum     += light
    squares += light * light
  }

  const mean = sum / pixels

  return { share: largest / pixels, deviation: Math.sqrt(Math.max(0, squares / pixels - mean * mean)) }
}

function complaints (problems: Problems): string[] {
  return [
    ...problems.errors.map(text => `console error: ${text}`),
    ...problems.failed.map(text => `failed request: ${text}`),
    ...problems.foreign.map(text => `left the origin: ${text}`),
  ]
}

function dirSize (dir: string): number {
  let total = 0

  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    const stat = statSync(path)

    total += stat.isDirectory() ? dirSize(path) : stat.size
  }

  return total
}

/** Lay the build out the way the site will hold it, under a number no real iteration uses. */
function stage (options: VerifyOptions, three: string): string {
  const root = join(options.out, 'stage')

  rmSync(root, { recursive: true, force: true })
  mkdirSync(join(root, STAGED), { recursive: true })

  for (const name of readdirSync(options.dist))
    if (name !== 'v')
      cpSync(join(options.dist, name), join(root, STAGED, name), { recursive: true })

  cpSync(join(options.dist, 'v'), join(root, 'v'), { recursive: true })

  if (options.shell) {
    cpSync(options.shell, root, { recursive: true })

    writeFileSync(join(root, 'iterations.json'), JSON.stringify({
      schema:     1,
      repo:       'staged/staged',
      updated:    '1970-01-01T00:00:00Z',
      iterations: [{
        id:        0,
        dir:       STAGED,
        date:      '1970-01-01',
        sha:       '0'.repeat(40),
        title:     'Staged',
        summary:   'The candidate, staged for its checks.',
        kind:      'feature',
        model:     '',
        journal:   '',
        shots:     { hero: 'shot.webp', thumb: 'thumb.webp' },
        three,
        withdrawn: false,
      }],
    }))
  }

  return root
}

/** Ask the browser what it will draw with, before trusting any picture from it. */
async function preflight (browser: Browser, url: string): Promise<{ webgl2: boolean, renderer: string }> {
  const context = await browser.newContext()
  const page    = await context.newPage()

  try {
    await page.goto(`${url}v/`, { waitUntil: 'commit' }).catch(() => undefined)

    return await page.evaluate(() => {
      const gl    = document.createElement('canvas').getContext('webgl2')
      const debug = gl?.getExtension('WEBGL_debug_renderer_info')

      return {
        webgl2:   Boolean(gl),
        renderer: gl && debug ? String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)) : '',
      }
    })
  }
  finally {
    await context.close()
  }
}

/** Shrink an image in the page, so no image library has to be installed to make a thumbnail. */
async function shrink (world: WorldPage, image: Buffer, width: number, height: number): Promise<Buffer> {
  const url = await world.page.evaluate(async asked => {
    const picture = new Image()

    picture.src = asked.source
    await picture.decode()

    const canvas  = document.createElement('canvas')
    const context = canvas.getContext('2d')

    canvas.width  = asked.width
    canvas.height = asked.height

    if (!context)
      throw new Error('no 2d context to draw the thumbnail with')

    context.imageSmoothingQuality = 'high'
    context.drawImage(picture, 0, 0, asked.width, asked.height)

    return canvas.toDataURL('image/webp', 0.82)
  }, { source: `data:image/png;base64,${image.toString('base64')}`, width, height })

  return Buffer.from(url.slice(url.indexOf(',') + 1), 'base64')
}

/**
 * Drive the page the way a visitor would: drag to orbit, then press W to walk.
 *
 * The only check that uses the page's own loop and real input events, so it is
 * the one that notices when the camera stops answering.
 */
async function exploreSmoke (browser: Browser, url: string): Promise<Check> {
  const world = await openWorld(browser, { url, tier: 'desktop', harness: false, width: 480, height: 300 })

  try {
    if (world.state !== 'ready')
      return { name: 'explore', ok: false, detail: `the page is "${world.state}" when loaded normally` }

    const { page } = world
    const start    = await page.evaluate(() => window.__SCENERY__?.pose().position ?? [ 0, 0, 0 ])

    await page.mouse.move(240, 150)
    await page.mouse.down()
    await page.mouse.move(360, 175, { steps: 10 })
    await page.mouse.up()

    const orbiting = await page.waitForFunction(from => {
      const pose = window.__SCENERY__?.pose()

      return Boolean(pose) && pose!.mode === 'orbit' && Math.hypot(pose!.position[0] - from[0]!, pose!.position[2] - from[2]!) > 0.5
    }, start, { timeout: REACTION_BUDGET }).then(() => true)
      .catch(() => false)

    if (!orbiting)
      return { name: 'explore', ok: false, detail: 'a drag on the canvas did not take the camera into orbit' }

    // No button is clicked: a movement key is itself the request to explore, and
    // a check that hunted for a button would break the day the page is restyled.
    const before = await page.evaluate(() => window.__SCENERY__?.pose().position ?? [ 0, 0, 0 ])

    await page.keyboard.down('KeyW')

    const walking = await page.waitForFunction(from => {
      const pose = window.__SCENERY__?.pose()

      return Boolean(pose) && pose!.mode === 'explore' && Math.hypot(pose!.position[0] - from[0]!, pose!.position[2] - from[2]!) > 1
    }, before, { timeout: REACTION_BUDGET }).then(() => true)
      .catch(() => false)

    await page.keyboard.up('KeyW')

    if (!walking)
      return { name: 'explore', ok: false, detail: 'the W key did not start a walk' }

    const said = complaints(world.problems)

    return { name: 'explore', ok: said.length === 0, detail: said.length === 0 ? 'a drag orbits, W walks' : said.join(' · ') }
  }
  finally {
    await world.close()
  }
}

/** Load the gallery around the staged iteration and make sure it starts cleanly. */
async function shellSmoke (browser: Browser, url: string): Promise<Check> {
  const problems: Problems = { errors: [], warnings: [], failed: [], foreign: []}
  const context            = await browser.newContext({ viewport: { width: 640, height: 400 }, deviceScaleFactor: 1 })
  const page               = await context.newPage()

  page.on('console', message => {
    if (message.type() === 'error')
      problems.errors.push(message.text())
  })
  page.on('pageerror', error => problems.errors.push(error.message))

  page.on('response', response => {
    if (response.status() >= 400)
      problems.failed.push(`${response.url()} (${response.status()})`)
  })

  try {
    await page.goto(url, { waitUntil: 'load' })

    const framed = await page.waitForFunction(staged => {
      const frame = document.querySelector('iframe')

      return Boolean(frame?.src.includes(staged))
    }, STAGED, { timeout: REACTION_BUDGET }).then(() => true)
      .catch(() => false)

    if (!framed)
      return { name: 'shell', ok: false, detail: 'the gallery did not load the staged iteration into its frame' }

    const said = complaints(problems)

    return { name: 'shell', ok: said.length === 0, detail: said.length === 0 ? 'the gallery loads the iteration' : said.join(' · ') }
  }
  finally {
    await context.close()
  }
}

/** Hold what one frame of the hero view cost against the tier's budget. */
function checkCost (run: Run, tier: string, census: Census | null): void {
  const limit = run.options.budgets.render[tier]

  if (!census || typeof limit !== 'object')
    return

  run.stats[tier] = { draws: census.draws, triangles: census.triangles, live: census.live }
  run.checks.push({ name: `draw calls (${tier})`, ok: census.draws <= limit.draws, detail: `${census.draws} of ${limit.draws}` })
  run.checks.push({ name: `triangles (${tier})`, ok: census.triangles <= limit.triangles, detail: `${census.triangles} of ${limit.triangles}` })
}

/** The images that get published, taken from the page that is already open. */
async function takePictures (run: Run, world: WorldPage, hero: Buffer): Promise<Pictures> {
  const { width, height, seconds } = run.options.budgets.capture

  const webp = (await capture(world, { view: 'hero', t: seconds, width, height, type: 'image/webp', quality: 0.86 })).image
  const tiny = await shrink(world, hero, THUMB.width, THUMB.height)

  // Into the staged iteration straight away: the gallery check loads them,
  // exactly as it will on the site.
  writeFileSync(join(run.root, STAGED, 'shot.webp'), webp)
  writeFileSync(join(run.root, STAGED, 'thumb.webp'), tiny)

  return { hero, webp, tiny }
}

/**
 * Load the build at one quality tier and judge the hero frame it draws.
 *
 * The first tier is also the one the published pictures come from, and the one
 * the leak check runs on, since both need a page that is already warm.
 */
async function checkTier (run: Run, browser: Browser, url: string, tier: string, primary: boolean): Promise<Pictures | null> {
  const { budgets }                = run.options
  const { width, height, seconds } = budgets.capture
  const world                      = await openWorld(browser, { url, tier, width, height })

  try {
    if (world.state !== 'ready') {
      run.checks.push({ name: `ready (${tier})`, ok: false, detail: `the page is "${world.state}" · ${complaints(world.problems).join(' · ')}` })

      return null
    }

    const shot  = await capture(world, { view: 'hero', t: seconds, width, height })
    const empty = blankness(decode(shot.image))

    writeFileSync(join(run.options.out, 'shots', `hero.${tier}.png`), shot.image)
    run.checks.push({ name: `ready (${tier})`, ok: true, detail: `${(shot.ms / 1000).toFixed(1)} s` })

    run.checks.push({
      name:   `not blank (${tier})`,
      ok:     empty.share <= budgets.blank.dominantShare && empty.deviation >= budgets.blank.minDeviation,
      detail: `one colour covers ${(empty.share * 100).toFixed(0)}% · brightness deviation ${empty.deviation.toFixed(1)}`,
    })

    checkCost(run, tier, shot.census)

    const pictures = primary ? await takePictures(run, world, shot.image) : null

    if (primary && shot.census) {
      checkLive(run.checks, budgets, shot.census)
      await checkLeak(run.checks, budgets, world, shot.census, { width, height, seconds })
    }

    const said = complaints(world.problems)

    run.checks.push({ name: `clean page (${tier})`, ok: said.length === 0, detail: said.join(' · ') || 'no errors, nothing fetched from elsewhere' })

    run.warnings.push(...world.problems.warnings
      .filter(warning => !DRIVER_CHATTER.test(warning))
      .map(warning => `console warning (${tier}): ${warning}`))

    return pictures
  }
  finally {
    await world.close()
  }
}

function readSite (path: string | null): ReadSiteReturnType {
  if (!path || !existsSync(path))
    return { bytes: 0, vendors: new Set() }

  const index      = JSON.parse(readFileSync(path, 'utf8')) as SiteIndex
  const iterations = index.iterations ?? []

  return {
    bytes:   iterations.at(-1)?.bytes?.site ?? 0,
    vendors: new Set(iterations.map(iteration => iteration.three ?? '')),
  }
}

/**
 * Judge a build: its shape, what it draws, what that costs, and whether it
 * draws the same thing twice.
 *
 * On a pass it leaves a payload behind (`payload/iteration`, `payload/vendor`,
 * `payload/shell`, `payload/meta.json`) that the publish step copies into place
 * without running anything.
 */
export async function verify (options: VerifyOptions): Promise<VerifyReport> {
  const { budgets }                      = options
  const checks: Check[]                  = []
  const warnings: string[]               = []
  const stats: Record<string, TierStats> = {}
  const { tiers }                        = budgets.capture

  const contract = checkContract({ dist: options.dist, trustedThree: options.trustedThree })
  const site     = readSite(options.siteIndex)

  const report = (verdict: Verdict, added = 0): VerifyReport => ({
    verdict,
    checks,
    warnings,
    three:    contract.three,
    distHash: contract.distHash,
    bytes:    { iteration: contract.bytes.iteration, vendor: contract.bytes.vendor, new: added, site: site.bytes },
    stats,
  })

  checks.push({ name: 'contract', ok: contract.failures.length === 0, detail: contract.failures.join(' · ') || `three ${contract.three}, ${contract.files} files` })

  if (contract.failures.length > 0)
    return report('fail')

  mkdirSync(join(options.out, 'shots'), { recursive: true })

  const root   = stage(options, contract.three)
  const server = serveStatic(root, { mount: MOUNT })
  const url    = `${server.url}${STAGED}`

  let hero: Buffer | null = null
  let webp: Buffer | null = null
  let tiny: Buffer | null = null
  let unusable            = ''

  try {
    await withBrowser(options.gpu, async browser => {
      const adapter = await preflight(browser, server.url)

      if (!adapter.webgl2) {
        unusable = 'this browser has no WebGL2, so nothing it draws says anything about the build'

        return
      }

      if (!options.gpu && !(/swiftshader/iu).test(adapter.renderer))
        warnings.push(`expected software rendering, got "${adapter.renderer}": pixel comparisons may not be exact`)

      for (const tier of tiers) {
        const pictures = await checkTier({ options, checks, warnings, stats, root }, browser, url, tier, tier === tiers[0])

        if (pictures) {
          hero = pictures.hero
          webp = pictures.webp
          tiny = pictures.tiny
        }
      }

      if (hero)
        await checkDeterminism(checks, options, browser, url, hero)

      checks.push(await exploreSmoke(browser, url))

      if (options.shell)
        checks.push(await shellSmoke(browser, server.url))
    })
  }
  finally {
    server.stop()
  }

  if (unusable) {
    checks.push({ name: 'browser', ok: false, detail: unusable })

    return report('infra-error')
  }

  if (!hero || !webp || !tiny)
    return report('fail')

  const payload = join(options.out, 'payload')

  rmSync(payload, { recursive: true, force: true })
  cpSync(join(root, STAGED), join(payload, 'iteration'), { recursive: true })
  cpSync(join(root, 'v'), join(payload, 'vendor'), { recursive: true })

  if (options.shell)
    cpSync(options.shell, join(payload, 'shell'), { recursive: true })

  const own   = dirSize(join(payload, 'iteration'))
  const added = own + (site.vendors.has(contract.three) ? 0 : contract.bytes.vendor)

  checks.push({
    name:   'new bytes',
    ok:     own <= budgets.bytes.newPerIteration,
    detail: `${own} of ${budgets.bytes.newPerIteration} for this iteration${site.vendors.has(contract.three) ? '' : ` · plus ${contract.bytes.vendor} once for three ${contract.three}`}`,
  })

  checks.push({
    name:   'site size',
    ok:     site.bytes + added <= budgets.bytes.siteHardCap,
    detail: `${site.bytes + added} of ${budgets.bytes.siteHardCap}`,
  })

  if (site.bytes + added > budgets.bytes.siteWarn)
    warnings.push(`the site is at ${site.bytes + added} bytes, past the ${budgets.bytes.siteWarn} byte warning line`)

  const result = report(checks.every(check => check.ok) ? 'pass' : 'fail', added)

  writeFileSync(join(payload, 'meta.json'), `${JSON.stringify({
    ...options.meta,
    three:    contract.three,
    distHash: contract.distHash,
    stats,
    bytes:    { new: added },
    shots:    { hero: 'shot.webp', thumb: 'thumb.webp' },
  }, null, 2)}\n`)

  return result
}

function checkLive (checks: Check[], budgets: Budgets, census: Census): void {
  const over = LIVE_KINDS
    .filter(kind => typeof budgets.live[kind] === 'number' && census.live[kind] > (budgets.live[kind] as number))
    .map(kind => `${kind} ${census.live[kind]} of ${String(budgets.live[kind])}`)

  checks.push({
    name:   'gpu objects',
    ok:     over.length === 0,
    detail: over.join(' · ') || LIVE_KINDS.map(kind => `${kind} ${census.live[kind]}`).join(' · '),
  })
}

async function checkLeak (checks: Check[], budgets: Budgets, world: WorldPage, before: Census, at: AtType): Promise<void> {
  const later = await capture(world, { view: 'hero', t: at.seconds + budgets.leak.seconds, width: at.width, height: at.height })

  if (!later.census)
    return

  const grown = LIVE_KINDS
    .filter(kind => later.census!.live[kind] - before.live[kind] > budgets.leak.growth)
    .map(kind => `${kind} ${before.live[kind]} → ${later.census!.live[kind]}`)

  checks.push({
    name:   'no leak',
    ok:     grown.length === 0,
    detail: grown.join(' · ') || `nothing new after ${budgets.leak.seconds} more seconds`,
  })
}

/**
 * Load the build twice more, each time lying differently about the time and
 * handing it a different random stream, and expect the same picture.
 */
async function checkDeterminism (checks: Check[], options: VerifyOptions, browser: Browser, url: string, hero: Buffer): Promise<void> {
  const { width, height, seconds } = options.budgets.capture
  const reference                  = decode(hero)

  let worst = 0

  for (const [ index, epoch ] of EPOCHS.entries()) {
    const world = await openWorld(browser, { url, tier: options.budgets.capture.tiers[0], width, height, epoch, random: index + 1 })

    try {
      if (world.state !== 'ready') {
        checks.push({ name: 'deterministic', ok: false, detail: `the page is "${world.state}" under a different clock` })

        return
      }

      // Let any timer the page set fire, so a world that waits on one shows it.
      await world.page.clock.fastForward(97_000)

      const again  = decode((await capture(world, { view: 'hero', t: seconds, width, height })).image)
      const diff   = new PNG({ width, height })
      const differ = pixelmatch(reference.data, again.data, diff.data, width, height, { threshold: 0 })

      if (differ > worst) {
        worst = differ
        writeFileSync(join(options.out, 'shots', 'determinism-diff.png'), PNG.sync.write(diff))
      }
    }
    finally {
      await world.close()
    }
  }

  checks.push({
    name:   'deterministic',
    ok:     worst <= options.budgets.determinism.pixels,
    detail: worst === 0
      ? 'the same picture under two other clocks and random streams'
      : `${worst} pixels differ between loads: something reads the wall clock or Math.random (see shots/determinism-diff.png)`,
  })
}

export function formatReport (report: VerifyReport): string {
  const lines = report.checks.map(check => `  ${check.ok ? 'ok  ' : 'FAIL'}  ${check.name.padEnd(22)} ${check.detail}`)

  for (const warning of report.warnings)
    lines.push(`  warn  ${warning}`)

  return [ `verify · ${report.verdict} · three ${report.three}`, ...lines ].join('\n')
}

async function main (): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  const root = resolve(import.meta.dir, '..', '..')
  const out  = resolve(args.str('out', join(root, '.scenery', 'gate')))
  const meta = args.str('meta')

  mkdirSync(out, { recursive: true })

  const report = await verify({
    dist:         resolve(args.str('dist', join(root, 'dist'))),
    out,
    shell:        args.has('no-shell') ? null : resolve(args.str('shell', join(root, 'shell'))),
    siteIndex:    args.str('site-index') ?? null,
    budgets:      JSON.parse(readFileSync(resolve(args.str('budgets', join(root, 'budgets.json'))), 'utf8')) as Budgets,
    trustedThree: join(root, 'node_modules', 'three'),
    gpu:          args.has('gpu'),
    meta:         meta ? JSON.parse(readFileSync(meta, 'utf8')) as Record<string, unknown> : {},
  })

  writeFileSync(join(out, 'report.json'), `${JSON.stringify(report, null, 2)}\n`)
  console.log(formatReport(report))

  if (report.verdict === 'fail')
    process.exitCode = 1

  if (report.verdict === 'infra-error')
    process.exitCode = 3
}

if (import.meta.main)
  await main()
