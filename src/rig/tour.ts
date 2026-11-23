// src/rig/tour.ts
import type { Pose } from '../world/views.ts'


/** Air the world's tour keeps under the camera on its way from one view to the next. */
export const TOUR_CLEARANCE = 5

/** Points along a leg at which its way is checked against the floor. */
const SAMPLES = 64

/**
 * How close to an end of a leg the full air under the camera is asked for.
 *
 * A view may stand lower over its own ground than the tour likes to fly, so
 * the margin grows from nothing at the view to its full size by the time the
 * camera's arc has reached this fraction of its height.
 */
const EASE_IN = 0.3

/**
 * The cinematic camera path: a closed loop through the postcard views.
 *
 * Everything here is a pure function of time. The camera at second 40 is the
 * same camera whether it got there frame by frame or was asked for directly,
 * which is what lets a capture pick a moment and trust what it finds there.
 */
export interface Tour {
  poses: readonly Pose[]

  /** Seconds the camera rests at each view. */
  dwell: number

  /** Seconds it takes to move from one view to the next. */
  travel: number

  /**
   * How far each leg lifts the camera at its middle, so the way from one view
   * to the next goes over whatever lies between them and not through it.
   */
  rise: readonly number[]
}

/** What the camera must stay above on its way between views. */
export interface Floor {

  /** Height of the land or the water at a point. */
  surface (x: number, z: number): number

  /** Air to keep between the camera and that surface. */
  clearance: number
}

interface TourOptions {
  dwell?:  number
  travel?: number

  /** Without one the camera goes straight from view to view, whatever is in the way. */
  floor?: Floor
}

/** Catmull-Rom through `b` and `c`, shaped by their neighbours. */
function spline (a: number, b: number, c: number, d: number, t: number): number {
  const t2 = t * t
  const t3 = t2 * t

  return 0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (3 * b - a - 3 * c + d) * t3)
}

/** The shape of a leg's lift: nothing at either view, all of it half way. */
function arc (along: number): number {
  return Math.sin(Math.PI * along)
}

/** Where leg `index` is when it is `along` (0 to 1) of the way to the next view, before any lift or drift. */
function legPose (poses: readonly Pose[], index: number, along: number, out: Pose): Pose {
  const count  = poses.length
  const before = poses[(index + count - 1) % count]!
  const from   = poses[index]!
  const to     = poses[(index + 1) % count]!
  const after  = poses[(index + 2) % count]!

  for (let axis = 0; axis < 3; axis += 1) {
    out.position[axis] = spline(before.position[axis]!, from.position[axis]!, to.position[axis]!, after.position[axis]!, along)
    out.target[axis]   = spline(before.target[axis]!, from.target[axis]!, to.target[axis]!, after.target[axis]!, along)
  }

  return out
}

/**
 * The smallest lift that takes leg `index` over the floor all the way along.
 *
 * Worked out once, from the views and the land alone, so the camera's height
 * stays a pure function of time: one smooth arc per leg, as high as its worst
 * obstacle needs and no higher, and nothing at all over open water.
 */
function riseOver (poses: readonly Pose[], index: number, floor: Floor): number {
  const at = { position: [ 0, 0, 0 ], target: [ 0, 0, 0 ]} satisfies Pose

  let rise = 0

  for (let step = 1; step < SAMPLES; step += 1) {
    const along       = step / SAMPLES
    const [ x, y, z ] = legPose(poses, index, along, at).position
    const margin      = floor.clearance * Math.min(1, arc(along) / EASE_IN)

    rise = Math.max(rise, (floor.surface(x, z) + margin - y) / arc(along))
  }

  return rise
}

export function createTour (poses: readonly Pose[], { dwell = 5, travel = 15, floor }: TourOptions = {}): Tour {
  if (poses.length === 0)
    throw new Error('a tour needs at least one view')

  return { poses, dwell, travel, rise: poses.map((_, index) => floor ? riseOver(poses, index, floor) : 0) }
}

/** Seconds for one full loop. */
export function tourDuration (tour: Tour): number {
  return tour.poses.length * (tour.dwell + tour.travel)
}

/** Ease that starts and ends with zero velocity and zero acceleration. */
export function smootherstep (value: number): number {
  const t = Math.min(1, Math.max(0, value))

  return t * t * t * (t * (t * 6 - 15) + 10)
}

/**
 * The camera pose at time `t`, written into `out`.
 *
 * Each leg rests at its view for `dwell` seconds, then eases along a spline to
 * the next one, lifted over the land in between. A slow drift is added
 * throughout so a resting camera is never perfectly still, which reads as a
 * frozen page.
 */
export function tourPose (tour: Tour, t: number, out: Pose): Pose {
  const count = tour.poses.length
  const leg   = tour.dwell + tour.travel
  const loop  = count * leg
  const time  = (t % loop + loop) % loop
  const index = Math.min(count - 1, Math.floor(time / leg))
  const along = smootherstep((time - index * leg - tour.dwell) / tour.travel)

  legPose(tour.poses, index, along, out)

  out.position[1] += tour.rise[index]! * arc(along)

  out.position[0] += Math.sin(t * 0.21) * 0.6
  out.position[1] += Math.sin(t * 0.17) * 0.3
  out.position[2] += Math.cos(t * 0.19) * 0.6

  return out
}

// perf: trivial — a few dozen multiplies per step, no allocation. The rise of
// each leg is found once, at 64 ground samples a leg.
