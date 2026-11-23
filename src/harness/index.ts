// src/harness/index.ts
import * as THREE from 'three'
import type { App } from 'threejs-scenes/core'
import type { CameraPose, Rig } from '../rig/rig.ts'
import { VIEWS } from '../world/views.ts'
import { STEP } from '../world/world.ts'
import type { WorldState } from '../world/world.ts'

/** Default for `CaptureOptions.warmup`. */
const WARMUP = 4

/**
 * The capture contract.
 *
 * This is the only thing the gate and the screenshot tools know about a build.
 * They run from the copy of the repository that is already on `main`, against a
 * candidate that may be a day newer, so this surface is versioned and small on
 * purpose. Changing its shape means bumping `contract` and teaching the tools
 * both versions first.
 */
export interface SceneryHarness {
  contract: 1

  /** Settles once the world is built and a first frame has been drawn. */
  ready: Promise<void>

  /** Names `capture` accepts for `view`. `hero` is always among them. */
  views: string[]
  capture (options: CaptureOptions): Promise<string>
  pose (): CameraPose

  /** Uncaught errors seen since load. */
  errors: string[]
}

export interface CaptureOptions {

  /** A named view from `views`. Defaults to `hero`. */
  view?: string

  /** World time of the frame, in seconds. Defaults to 10. */
  t?:     number
  width:  number
  height: number

  /** Image type for the data URL. Defaults to PNG. */
  type?:    string
  quality?: number

  /**
   * Frames drawn at the final state before the one that is read back, for
   * effects that keep history. Defaults to 4; a tool that wants to count the
   * draw calls of exactly one frame asks for 0.
   */
  warmup?: number
}

/**
 * What draws a frame, and whether it may.
 *
 * `hold` lets a capture advance the simulation without paying for a render on
 * every step: under software WebGL a frame costs a large part of a second, and
 * reaching second ten is six hundred steps.
 */
export interface Painter {
  hold: boolean

  /** Simulation steps taken so far. */
  frame: number
  paint (): void
}

declare global {
  interface Window {
    __SCENERY__?: SceneryHarness

    /** The scene library's own readiness convention, kept for tools that expect it. */
    __SCENE_READY__?: boolean
  }
}

interface HarnessOptions {
  app:     App<WorldState>
  rig:     Rig
  painter: Painter
  canvas:  HTMLCanvasElement

  /** True under `?harness=1`: the page has no loop of its own and `capture` is allowed. */
  capturing: boolean
}

export interface HarnessHandle {
  ready (): void
  fail (reason: unknown): void
}

function describe (reason: unknown): string {
  return reason instanceof Error ? reason.message : String(reason)
}

export function installHarness ({ app, rig, painter, canvas, capturing }: HarnessOptions): HarnessHandle {
  const errors: string[] = []

  let settle = (): void => undefined
  let refuse = (_reason: unknown): void => undefined

  const ready = new Promise<void>((resolve, reject) => {
    settle = resolve
    refuse = reject
  })

  // A page that fails to boot reports it through its state attribute and
  // `errors`; nobody is required to be awaiting this promise when it rejects.
  ready.catch(() => undefined)

  window.addEventListener('error', event => errors.push(event.message))
  window.addEventListener('unhandledrejection', event => errors.push(describe(event.reason)))

  async function capture ({ view = 'hero', t = 10, width, height, type = 'image/png', quality, warmup = WARMUP }: CaptureOptions): Promise<string> {
    if (!capturing)
      throw new Error('capture needs the page loaded with ?harness=1')

    await ready

    const target = Math.round(t / STEP)

    if (painter.frame > target)
      throw new Error(`second ${t} has passed (the world is at step ${painter.frame}) · reload to capture an earlier moment`)

    const { renderer, camera } = app.ctx

    renderer.setPixelRatio(1)
    renderer.setSize(width, height, false)

    if (camera instanceof THREE.PerspectiveCamera) {
      camera.aspect = width / height
      camera.updateProjectionMatrix()
    }

    rig.pin(view)

    painter.hold = true

    while (painter.frame < target)
      app.tick(STEP)

    painter.hold = false
    rig.place(camera)

    for (let frame = 0; frame < warmup; frame += 1)
      painter.paint()

    // Drawn and read in the same task: without preserveDrawingBuffer the
    // pixels are only guaranteed to be there until the browser composites.
    painter.paint()

    return canvas.toDataURL(type, quality)
  }

  window.__SCENERY__ = {
    contract: 1,
    ready,
    views:    VIEWS.map(view => view.name),
    capture,
    pose:     () => rig.pose(),
    errors,
  }

  return {
    ready () {
      window.__SCENE_READY__ = true
      settle()
    },

    fail (reason) {
      errors.push(describe(reason))
      refuse(reason)
    },
  }
}
