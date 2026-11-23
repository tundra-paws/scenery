// src/rig/step.ts
import type { Ground } from '../world/shared/ground.ts'
import type { Pose } from '../world/views.ts'
import { smootherstep, tourPose } from './tour.ts'
import type { Tour } from './tour.ts'

/** Seconds of stillness before an orbiting camera drifts back to the tour. */
export const ORBIT_IDLE = 8

/** Seconds the drift back takes. */
export const RETURN_TIME = 3

/** Eye height above the surface when walking. */
export const EYE = 1.7

const LOOK       = 0.0045

const MIN_RADIUS = 4

const MAX_RADIUS = 240

const WALK       = 9

const SPRINT     = 26

const RISE       = 0.7

const SINK       = 5

const CLEARANCE  = 1.2

/** Scratch for the tour pose, so a step allocates nothing. */
const onTour: Pose = { position: [ 0, 0, 0 ], target: [ 0, 0, 0 ]}

/**
 * The camera rig as a pure step.
 *
 * `stepRig` takes where the camera is, what the visitor did since the last
 * step, and the time, and writes where the camera is now. No DOM, no three, no
 * clock of its own: the same sequence of inputs always produces the same
 * sequence of poses, which is what the tests check and what a capture relies on.
 */

export type RigMode = 'tour' | 'orbit' | 'explore'

/** What the visitor did since the last step. Adapters write it; the step reads it. */
export interface RigInput {

  /** Pixels dragged, summed since the last step. */
  dragX: number
  dragY: number

  /** Zoom as a factor on distance, multiplied up since the last step. 1 is none. */
  zoom: number

  /** Strafe, -1 (left) to 1 (right). */
  moveX: number

  /** Advance, -1 (back) to 1 (forward). */
  moveZ: number

  /** Rise, -1 (down) to 1 (up). */
  lift:   number
  sprint: boolean
}

export interface RigState {
  mode: RigMode

  /** Where the camera is and what it looks at. The step's output. */
  pose:   Pose
  theta:  number
  phi:    number
  radius: number

  /** Seconds spent orbiting with no input. */
  idle: number

  /** Whether the camera is easing back onto the tour. */
  returning: boolean
  blend:     number
  from:      Pose
  yaw:       number
  pitch:     number
}

export interface RigEnv {
  tour:   Tour
  ground: Ground

  /** Whether the visitor has asked to walk or fly. */
  explore: boolean
}

function clamp (value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value))
}

function copyPose (from: Pose, to: Pose): void {
  for (let axis = 0; axis < 3; axis += 1) {
    to.position[axis] = from.position[axis]!
    to.target[axis]   = from.target[axis]!
  }
}

/** The surface a camera can stand over: the ground, or the water where the ground is under it. */
function surfaceAt (ground: Ground, x: number, z: number): number {
  return Math.max(ground.heightAt(x, z), ground.waterLevel)
}

export function createRigState (): RigState {
  return {
    mode:      'tour',
    pose:      { position: [ 0, 0, 0 ], target: [ 0, 0, 0 ]},
    theta:     0,
    phi:       0,
    radius:    MIN_RADIUS,
    idle:      0,
    returning: false,
    blend:     0,
    from:      { position: [ 0, 0, 0 ], target: [ 0, 0, 0 ]},
    yaw:       0,
    pitch:     0,
  }
}

/** Start orbiting the current look-at point from wherever the camera is. */
function enterOrbit (state: RigState): void {
  const { position, target } = state.pose
  const dx                   = position[0] - target[0]
  const dy                   = position[1] - target[1]
  const dz                   = position[2] - target[2]
  const radius               = clamp(Math.hypot(dx, dy, dz), MIN_RADIUS, MAX_RADIUS)

  state.radius    = radius
  state.theta     = Math.atan2(dx, dz)
  state.phi       = Math.asin(clamp(dy / radius, -1, 1))
  state.mode      = 'orbit'
  state.returning = false
  state.idle      = 0
}

function applyOrbit (state: RigState, input: RigInput, ground: Ground): void {
  const { position, target } = state.pose

  state.theta -= input.dragX * LOOK
  state.phi    = clamp(state.phi + input.dragY * LOOK, -0.2, 1.45)
  state.radius = clamp(state.radius * input.zoom, MIN_RADIUS, MAX_RADIUS)

  const flat = Math.cos(state.phi) * state.radius
  const x    = target[0] + Math.sin(state.theta) * flat
  const z    = target[2] + Math.cos(state.theta) * flat

  position[0] = x
  position[2] = z

  // Never under the ground or the water, however far the visitor tilts.
  position[1] = Math.max(target[1] + Math.sin(state.phi) * state.radius, surfaceAt(ground, x, z) + CLEARANCE)
}

/** Take the camera where it is and keep looking the way it was looking. */
function enterExplore (state: RigState): void {
  const { position, target } = state.pose
  const dx                   = target[0] - position[0]
  const dy                   = target[1] - position[1]
  const dz                   = target[2] - position[2]
  const length               = Math.hypot(dx, dy, dz) || 1

  state.yaw       = Math.atan2(dx, dz)
  state.pitch     = Math.asin(clamp(dy / length, -1, 1))
  state.mode      = 'explore'
  state.returning = false
}

function stepExplore (state: RigState, input: RigInput, dt: number, ground: Ground): void {
  const { position, target } = state.pose

  state.yaw  -= input.dragX * LOOK
  state.pitch = clamp(state.pitch - input.dragY * LOOK, -1.35, 1.35)

  const speed = input.sprint ? SPRINT : WALK
  const sin   = Math.sin(state.yaw)
  const cos   = Math.cos(state.yaw)

  // Forward is (sin, cos) on the ground plane; right is (-cos, sin).
  let x = position[0] + (sin * input.moveZ - cos * input.moveX) * speed * dt
  let z = position[2] + (cos * input.moveZ + sin * input.moveX) * speed * dt

  const limit = ground.size * 0.49
  const reach = Math.hypot(x, z)

  if (reach > limit) {
    x *= limit / reach
    z *= limit / reach
  }

  // Walking and flying are one motion: rising is a key, and letting go sinks
  // gently back to eye height, where the camera then follows the ground.
  const floor = surfaceAt(ground, x, z) + EYE
  let y       = position[1] + input.lift * speed * RISE * dt

  if (input.lift <= 0)
    y -= SINK * dt

  position[0] = x
  position[1] = Math.max(y, floor)
  position[2] = z

  const level = Math.cos(state.pitch)

  target[0] = x + sin * level * 10
  target[1] = position[1] + Math.sin(state.pitch) * 10
  target[2] = z + cos * level * 10
}

/** Start easing from the current pose back onto the tour. */
function beginReturn (state: RigState): void {
  copyPose(state.pose, state.from)
  state.blend     = 0
  state.returning = true
  state.mode      = 'tour'
}

/**
 * Advance the rig by one step of `dt` seconds, at time `t`.
 *
 * Explore wins while it is on. Otherwise any drag or zoom takes the camera into
 * orbit around what it was looking at, stillness sends it back, and with no
 * input at all it simply is the tour.
 */
export function stepRig (state: RigState, input: RigInput, t: number, dt: number, env: RigEnv): RigState {
  tourPose(env.tour, t, onTour)

  if (env.explore) {
    if (state.mode !== 'explore')
      enterExplore(state)

    stepExplore(state, input, dt, env.ground)

    return state
  }

  if (state.mode === 'explore')
    beginReturn(state)

  if (input.dragX !== 0 || input.dragY !== 0 || input.zoom !== 1) {
    if (state.mode !== 'orbit')
      enterOrbit(state)

    applyOrbit(state, input, env.ground)
    state.idle = 0

    return state
  }

  if (state.mode === 'orbit') {
    state.idle += dt

    if (state.idle < ORBIT_IDLE)
      return state

    beginReturn(state)
  }

  if (state.returning) {
    state.blend = Math.min(1, state.blend + dt / RETURN_TIME)

    const along = smootherstep(state.blend)

    for (let axis = 0; axis < 3; axis += 1) {
      state.pose.position[axis] = state.from.position[axis]! + (onTour.position[axis]! - state.from.position[axis]!) * along
      state.pose.target[axis]   = state.from.target[axis]! + (onTour.target[axis]! - state.from.target[axis]!) * along
    }

    if (state.blend >= 1)
      state.returning = false

    return state
  }

  copyPose(onTour, state.pose)

  return state
}
