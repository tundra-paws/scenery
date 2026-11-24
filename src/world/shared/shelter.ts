// src/world/shared/shelter.ts
import type { Ground } from './ground.ts'
import { distanceToSpan } from './path.ts'
import type { Path, Waypoint } from './path.ts'

/**
 * Where the shelter stands: the shoulder above the path's first hairpin, a
 * few strides off the path, where the first leg of the way up points.
 *
 * Typed in, like a postcard, because it was chosen by looking: it is in the
 * `hero` frame, clear of the path and its waymark, and the walk comes up
 * straight at its door. How it sits there (which way it faces, how high its
 * floor is) is read from the land.
 */
const SITE: Waypoint = { x: 56, z: 58 }

/** The walls' outer line: along the ridge of the roof, and across it. */
export const SHELTER_LONG = 8
export const SHELTER_DEEP = 5.6

/** Half the distance over which the fall of the land under the walls is measured. */
const REACH = 4

/** How far out of the door its step lies, and how far beyond that a walker leaving looks for the path. */
const STEP   = 0.9
const STRIDE = 5

/**
 * How far the way to the door swings downhill between the path and the step.
 * It leaves the path where the path turns, and the waymark of that turn
 * stands on the straight line to the door: the feet go round it.
 */
const SWING = 2.6

/** Spans the way to the door is drawn in. */
const SPANS = 10

/**
 * The shelter, as a place on the ground.
 *
 * DOM-free and GPU-free, like the ground and the path: the feature builds on
 * it, the scatterers keep off it, the terrain wears the way to its door, and
 * a test can ask where it is. Its own frame is `across` (downhill, at right
 * angles to the ridge) and `along` (out of the door), both measured from the
 * middle of the floor.
 */
export interface Shelter extends Waypoint {

  /** World height of the floor. */
  readonly floor: number

  /** Unit direction out of the door. The ridge runs along it, level with the hill. */
  readonly door: readonly [number, number]

  /** Unit direction across the ridge, the way the land falls. */
  readonly fall: readonly [number, number]

  /** The turn about the vertical that takes a mesh's own x and z to `fall` and `door`. */
  readonly yaw: number

  /** The trodden way to the door, from where it leaves the path to the step. */
  readonly spur: readonly Waypoint[]

  /** A place given in the shelter's own frame, on the ground. */
  place (across: number, along: number): Waypoint

  /** How far a place is from the walls. Nothing, inside them. */
  distanceTo (x: number, z: number): number

  /** How far a place is from the middle of the way to the door. */
  distanceToSpur (x: number, z: number): number
}

/**
 * The way from the path to a door: out of the door square to the wall, then
 * round to the nearest of the path, as one curve.
 */
function wearSpur (path: Path, step: Waypoint, out: Waypoint, round: Waypoint): Waypoint[] {
  const join = path.points.reduce((best, point) => Math.hypot(point.x - out.x, point.z - out.z) < Math.hypot(best.x - out.x, best.z - out.z) ? point : best)

  return Array.from({ length: SPANS + 1 }, (_, index) => {
    const t = index / SPANS

    return {
      x: join.x * (1 - t) ** 2 + round.x * 2 * t * (1 - t) + step.x * t ** 2,
      z: join.z * (1 - t) ** 2 + round.z * 2 * t * (1 - t) + step.z * t ** 2,
    }
  })
}

export function createShelter (ground: Ground, path: Path): Shelter {
  const { x, z } = SITE
  const dx       = ground.heightAt(x + REACH, z) - ground.heightAt(x - REACH, z)
  const dz       = ground.heightAt(x, z + REACH) - ground.heightAt(x, z - REACH)
  const grade    = Math.hypot(dx, dz) || 1

  // Built along the hill, not up it: the long walls follow the contour, so
  // the back one is dug in and the front one stands on what was dug out.
  const fall = [ -dx / grade, -dz / grade ] as const
  const door = [ -fall[1], fall[0] ] as const

  const place = (across: number, along: number): Waypoint => ({ x: x + fall[0] * across + door[0] * along, z: z + fall[1] * across + door[1] * along })
  const sill  = SHELTER_LONG / 2 + STEP
  const spur  = wearSpur(path, place(0, sill), place(0, sill + STRIDE), place(SWING, sill + STRIDE * 0.6))

  return {
    x,
    z,
    fall,
    door,
    spur,
    place,
    floor: ground.heightAt(x, z),
    yaw:   Math.atan2(door[0], door[1]),

    distanceTo (px, pz) {
      const across = (px - x) * fall[0] + (pz - z) * fall[1]
      const along  = (px - x) * door[0] + (pz - z) * door[1]

      return Math.hypot(Math.max(0, Math.abs(across) - SHELTER_DEEP / 2), Math.max(0, Math.abs(along) - SHELTER_LONG / 2))
    },

    distanceToSpur (px, pz) {
      let nearest = Infinity

      for (let index = 1; index < spur.length; index += 1)
        nearest = Math.min(nearest, distanceToSpan(px, pz, spur[index - 1]!, spur[index]!))

      return nearest
    },
  }
}

// perf: trivial — five ground samples and one pass over the path's points,
// once. `distanceToSpur` is ten spans: ask it at build time, not per frame.
