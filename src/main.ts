// src/main.ts
import './ui/style.css'
import * as THREE from 'three'
import { WebGPURenderer } from 'three/webgpu'
import { createApp, createClock } from 'threejs-scenes'
import type { QualityTier } from 'threejs-scenes'
import { detectTier, getQualitySettings } from 'threejs-scenes/core'
import { installHarness } from './harness/index.ts'
import type { HarnessHandle, Painter } from './harness/index.ts'
import { readOverrides } from './overrides.ts'
import { createRig } from './rig/rig.ts'
import { setStatus, watchContext } from './status.ts'
import { mountUi, showFailure } from './ui/ui.ts'
import { createFeatures } from './world/index.ts'
import { PALETTE } from './world/shared/palette.ts'
import { STEP, createWorld } from './world/world.ts'
import type { WorldState } from './world/world.ts'


/**
 * The most device pixels the canvas may hold, by tier.
 *
 * The pixel ratio alone does not bound what a frame costs to fill: at a ratio
 * of 2 a large desktop window is eight million pixels, antialiased. Past its
 * budget a canvas is drawn at a lower ratio instead: a large tablet on the
 * mobile tier, a window bigger than a 2560 x 1440 monitor on desktop, bigger
 * than a 4K one on highEnd. Inside its budget it is drawn exactly as before.
 */
const MAX_PIXELS: Record<QualityTier, number> = { mobile: 2_500_000, desktop: 3_686_400, highEnd: 8_294_400 }

const session: SessionType = { harness: null }

/** Filled in once the world exists, so a failure after that point can still be reported through it. */
type SessionType = { harness: HarnessHandle | null }

/**
 * Boot: one app, one fixed clock, the world's features, and the camera rig last.
 *
 * Under `?harness=1` the page never starts its loop. Time then moves only when a
 * capture asks for a moment, which is what makes that moment reproducible.
 */
async function boot (): Promise<void> {
  const canvas = document.querySelector('canvas')

  if (!canvas)
    throw new Error('index.html has no canvas')

  const overrides = readOverrides(window.location.search)

  // A capture pins the tier rather than detecting one: the runner it happens on
  // has four cores and would otherwise be judged a phone.
  const tier    = overrides.tier ?? (overrides.harness ? 'desktop' : detectTier())
  const quality = getQualitySettings(tier)
  const world   = createWorld({ seed: overrides.seed, quality })

  const rig = createRig({
    world,
    canvas,
    stick:       document.querySelector<HTMLElement>('scenery-stick'),
    interactive: !overrides.harness,

    onMove () {
      if (!app.getState().explore)
        app.setState({ explore: true })
    },
  })

  const painter: Painter = {
    hold:  false,
    frame: 0,
    paint: () => app.ctx.renderer.render(app.ctx.scene, app.ctx.camera),
  }

  const renderer = new WebGPURenderer({ canvas, antialias: true, forceWebGL: true, powerPreference: 'high-performance' })

  // Each material finds its own way to the screen (`world/shared/output.ts`):
  // the renderer is to pass on what it is given, with no pass of its own.
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace
  renderer.toneMapping      = THREE.NoToneMapping

  await renderer.init()

  // three keeps a small instanced mesh's matrices in a uniform array, and
  // names the array after a node made for that one draw: so no two instanced
  // meshes, and no two passes of one mesh, could share a program, and this
  // world linked ninety. Told that there is no room for such arrays, it puts
  // every mesh's matrices in attributes, and the stones, the sheep and the
  // seals are one program again.
  const { capabilities } = renderer.backend as unknown as { capabilities: { getUniformBufferLimit: () => number }}

  capabilities.getUniformBufferLimit = () => 0

  const app = createApp<WorldState>({
    canvas,
    rendererInstance: renderer as unknown as THREE.WebGLRenderer,
    state:            { explore: false },
    seed:             overrides.seed,
    clock:            createClock({ mode: 'fixed', step: STEP }),

    // The world moves in steps of a sixtieth of a second. On a faster display
    // some frames fall between two steps, and drawing them would be drawing
    // the same picture twice.
    renderOn: 'step',

    // Shadows are switched on by the environment feature, with a shadow map
    // type this three version still supports.
    renderer:   { shadows: false, pixelRatioMax: overrides.harness ? 1 : quality.pixelRatio, maxPixels: MAX_PIXELS[tier] },
    camera:     { fov: 55, near: 0.5, far: 3000 },
    background: PALETTE.horizon,
    lighting:   false,
    orbit:      false,
    modules:    [ ...createFeatures(world), rig.module ],

    onFrame (_state, frame) {
      painter.frame = frame.frame
    },

    render () {
      if (!painter.hold)
        painter.paint()
    },
  })

  session.harness = installHarness({ app, rig, painter, canvas, capturing: overrides.harness })

  watchContext(canvas)
  mountUi(app)

  // One step and one frame before saying "ready", so the word means a picture
  // exists and not merely that the code ran.
  app.tick(STEP)

  if (!overrides.harness)
    app.start()

  setStatus('ready')
  session.harness.ready()
}

boot().catch((error: unknown) => {
  setStatus('failed')
  showFailure('This world could not start on this device.')
  session.harness?.fail(error)
  console.error(error)
})
