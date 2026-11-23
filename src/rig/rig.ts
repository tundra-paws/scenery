// src/rig/rig.ts
import * as THREE from 'three'

import { VIEWS, findView, resolveView } from '../world/views.ts'
import type { Pose } from '../world/views.ts'
import { STEP } from '../world/world.ts'
import type { Feature, World } from '../world/world.ts'
import { attachInput, clearInput, createInput } from './input.ts'
import { createRigState, stepRig } from './step.ts'
import type { RigEnv, RigMode } from './step.ts'
import { TOUR_CLEARANCE, createTour } from './tour.ts'


/** Where the camera is, in the form a test or a capture tool can compare. */
export interface CameraPose {
  position:   [number, number, number]
  quaternion: [number, number, number, number]
  mode:       RigMode
}

export interface Rig {

  /** The rig as a world module. Mounted last, because it owns the camera. */
  module: Feature

  /** Hold the camera on a named view, or pass null to let it move again. */
  pin (view: string | null): void

  /** Put the camera where the rig currently says it is, without advancing time. */
  place (camera: THREE.Camera): void
  pose (): CameraPose
}

interface RigOptions {
  world:  World
  canvas: HTMLCanvasElement
  stick?: HTMLElement | null

  /** False under the capture harness: no listeners, so nothing but time moves the camera. */
  interactive: boolean

  /** Called when the visitor starts to move, from outside the tick. */
  onMove: () => void
}

/**
 * The camera: a tour through the postcard views, an orbit when the visitor
 * drags, and walking or flying when they ask to explore.
 *
 * The library's own scaffolds each build a whole app and animate from the raw
 * frame loop, so none of them can be stepped, combined or captured. This is one
 * module on the shared fixed clock instead; the logic is the pure step in
 * `step.ts` and this file only wires it to three and to the page.
 */
export function createRig ({ world, canvas, stick = null, interactive, onMove }: RigOptions): Rig {
  const { ground }  = world
  const surface     = (x: number, z: number): number => Math.max(ground.heightAt(x, z), ground.waterLevel)
  const tour        = createTour(VIEWS.map(view => resolveView(view, ground)), { floor: { surface, clearance: TOUR_CLEARANCE }})
  const state       = createRigState()
  const input       = createInput()
  const env: RigEnv = { tour, ground, explore: false }
  const lookAt      = new THREE.Vector3()

  let pinned: Pose | null         = null
  let camera: THREE.Camera | null = null
  let detach                      = (): void => undefined

  function place (onto: THREE.Camera): void {
    const pose = pinned ?? state.pose

    onto.position.set(pose.position[0], pose.position[1], pose.position[2])
    onto.lookAt(lookAt.set(pose.target[0], pose.target[1], pose.target[2]))
  }

  return {
    module: {
      name: 'rig',

      build (ctx) {
        camera = ctx.camera

        if (interactive)
          detach = attachInput({ canvas, stick, input, onMove })

        stepRig(state, input, 0, 0, env)
        place(ctx.camera)
      },

      update (app, frame, ctx) {
        env.explore = app.explore
        stepRig(state, input, frame.frame * STEP, STEP, env)
        clearInput(input)
        place(ctx.camera)
      },

      dispose () {
        detach()
        camera = null
      },
    },

    pin (name) {
      if (name === null) {
        pinned = null

        return
      }

      const view = findView(name)

      if (!view)
        throw new Error(`no view named "${name}" · known: ${VIEWS.map(known => known.name).join(', ')}`)

      pinned = resolveView(view, ground)
    },

    place,

    pose () {
      const { x, y, z }                = camera?.position ?? lookAt.set(0, 0, 0)
      const { x: qx, y: qy, z: qz, w } = camera?.quaternion ?? new THREE.Quaternion()

      return { position: [ x, y, z ], quaternion: [ qx, qy, qz, w ], mode: pinned ? 'tour' : state.mode }
    },
  }
}

// perf: trivial — one pure step and one lookAt per sim step.
