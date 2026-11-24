// src/world/shared/shelter.ts
import type { Ground } from './ground.ts'
import type { Waypoint } from './path.ts'

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

/**
 * The shelter, as a place on the ground.
 *
 * DOM-free and GPU-free, like the ground and the path: the feature builds on
 * it, the scatterers keep off it, and a test can ask where it is. Its own
 * frame is `across` (downhill, at right angles to the ridge) and `along` (out
 * of the door), both measured from the middle of the floor.
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

  /** A place given in the shelter's own frame, on the ground. */
  place (across: number, along: number): Waypoint

  /** How far a place is from the walls. Nothing, inside them. */
  distanceTo (x: number, z: number): number
}

export function createShelter (ground: Ground): Shelter {
  const { x, z } = SITE
  const dx       = ground.heightAt(x + REACH, z) - ground.heightAt(x - REACH, z)
  const dz       = ground.heightAt(x, z + REACH) - ground.heightAt(x, z - REACH)
  const grade    = Math.hypot(dx, dz) || 1

  // Built along the hill, not up it: the long walls follow the contour, so
  // the back one is dug in and the front one stands on what was dug out.
  const fall = [ -dx / grade, -dz / grade ] as const
  const door = [ -fall[1], fall[0] ] as const

  return {
    x,
    z,
    fall,
    door,
    floor: ground.heightAt(x, z),
    yaw:   Math.atan2(door[0], door[1]),

    place (across, along) {
      return { x: x + fall[0] * across + door[0] * along, z: z + fall[1] * across + door[1] * along }
    },

    distanceTo (px, pz) {
      const across = (px - x) * fall[0] + (pz - z) * fall[1]
      const along  = (px - x) * door[0] + (pz - z) * door[1]

      return Math.hypot(Math.max(0, Math.abs(across) - SHELTER_DEEP / 2), Math.max(0, Math.abs(along) - SHELTER_LONG / 2))
    },
  }
}

// perf: trivial — five ground samples, once.
