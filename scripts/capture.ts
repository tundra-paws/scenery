// scripts/capture.ts
import type { Browser, BrowserContext, Page } from 'playwright-core'
import { INSTRUMENT } from './gate/instrument.ts'
import type { Census } from './gate/instrument.ts'

/**
 * How long a page may take to say it is ready, in milliseconds.
 *
 * Generous on purpose: software WebGL compiles every shader on one core, and a
 * shared runner is slower than whatever this was tuned on. It is a hang
 * detector, not a performance budget.
 */
export const READY_BUDGET = Number(process.env.SCENERY_READY_BUDGET ?? 150_000)

/** Everything a page did that a self-contained, healthy build would not. */
export interface Problems {

  /** Console errors and uncaught exceptions. */
  errors:   string[]
  warnings: string[]

  /** Requests that failed or came back as an HTTP error. */
  failed: string[]

  /** Requests that tried to leave the origin. They are blocked, and listed. */
  foreign: string[]
}

export interface OpenOptions {

  /** Address of the page's directory, with a trailing slash. */
  url:   string
  tier?: string
  seed?: number

  /** Load with `?harness=1` (no loop, capture allowed). Defaults to true. */
  harness?: boolean
  width?:   number
  height?:  number

  /**
   * Wall-clock time the page believes it started at, in milliseconds.
   *
   * A deterministic world does not care. Two loads given different answers and
   * producing different pixels is how the gate finds one that does.
   */
  epoch?: number

  /** Seed for a replacement `Math.random`, for the same reason. */
  random?: number
}

export interface WorldPage {
  page:     Page
  context:  BrowserContext
  problems: Problems

  /** The page's `data-scenery-state` once it stopped booting, or `booting` if it never did. */
  state: string
  close (): Promise<void>
}

export interface ShotOptions {
  view?: string

  /** World time of the frame, in seconds. */
  t?:       number
  width:    number
  height:   number
  type?:    string
  quality?: number
}

export interface Shot {

  /** The encoded image, as the page produced it. */
  image: Buffer

  /** What one frame of this view cost, counted from the WebGL calls. */
  census: Census | null

  /** How long the capture took, in milliseconds. A measurement, not a clock. */
  ms: number
}

/** Runs in the page: swap `Math.random` for a seeded stream. Self-contained by necessity. */
function seedRandom (seed: number): void {
  let state = seed >>> 0

  Math.random = () => {
    state = state + 0x6D_2B_79_F5 | 0

    let mixed = Math.imul(state ^ state >>> 15, 1 | state)

    mixed = mixed + Math.imul(mixed ^ mixed >>> 7, 61 | mixed) ^ mixed

    return ((mixed ^ mixed >>> 14) >>> 0) / 4_294_967_296
  }
}

/**
 * Open a build in its own browser context and wait for it to stop booting.
 *
 * The context counts WebGL calls from outside the page's code, blocks and
 * records anything that tries to leave the origin, and keeps every console
 * error. What the caller makes of those is its business.
 */
export async function openWorld (browser: Browser, options: OpenOptions): Promise<WorldPage> {
  const { url, tier, seed, harness = true, width = 1280, height = 720, epoch, random } = options
  const origin                                                                         = new URL(url).origin
  const problems: Problems                                                             = { errors: [], warnings: [], failed: [], foreign: []}

  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 })

  await context.addInitScript(INSTRUMENT)

  if (random !== undefined)
    await context.addInitScript(seedRandom, random)

  await context.route('**/*', async route => {
    const target = route.request().url()

    if (target.startsWith(origin) || target.startsWith('data:') || target.startsWith('blob:'))
      return await route.continue()

    problems.foreign.push(target)

    return await route.abort()
  })

  const page = await context.newPage()

  if (epoch !== undefined)
    await page.clock.install({ time: epoch })

  page.on('console', message => {
    if (message.type() === 'error')
      problems.errors.push(message.text())
    else if (message.type() === 'warning')
      problems.warnings.push(message.text())
  })
  page.on('pageerror', error => problems.errors.push(error.message))

  page.on('requestfailed', request => {
    // A blocked foreign request is already on its own list.
    if (request.url().startsWith(origin))
      problems.failed.push(`${request.url()} (${request.failure()?.errorText ?? 'failed'})`)
  })

  page.on('response', response => {
    if (response.status() >= 400)
      problems.failed.push(`${response.url()} (${response.status()})`)
  })

  const query = new URLSearchParams()

  if (harness)
    query.set('harness', '1')

  if (tier)
    query.set('tier', tier)

  if (seed !== undefined)
    query.set('seed', String(seed))

  const search = query.toString()

  await page.goto(search ? `${url}?${search}` : url, { waitUntil: 'load', timeout: READY_BUDGET })

  const state = await page
    .waitForFunction(() => {
      const current = document.documentElement.dataset.sceneryState

      return current && current !== 'booting' ? current : false
    }, undefined, { timeout: READY_BUDGET })
    .then(async handle => String(await handle.jsonValue()))
    .catch(() => 'booting')

  return { page, context, problems, state, close: async () => await context.close() }
}

/**
 * Photograph a view through the page's harness.
 *
 * The frame is produced by the page (simulation stepped to `t`, drawn, read back
 * in the same task) and costed from outside it: the counters are zeroed, exactly
 * one more frame of the same state is asked for, and the counters are read.
 */
export async function capture (world: WorldPage, options: ShotOptions): Promise<Shot> {
  const started = Bun.nanoseconds()

  const url = await world.page.evaluate(async asked => {
    const harness = window.__SCENERY__

    if (!harness)
      throw new Error('the page has no __SCENERY__ harness')

    return await harness.capture(asked)
  }, options)

  const census = await world.page.evaluate(async asked => {
    window.__GL__?.reset()
    await window.__SCENERY__?.capture({ ...asked, warmup: 0 })

    return window.__GL__?.read() ?? null
  }, options)

  return {
    image: Buffer.from(url.slice(url.indexOf(',') + 1), 'base64'),
    census,
    ms:    (Bun.nanoseconds() - started) / 1e6,
  }
}
