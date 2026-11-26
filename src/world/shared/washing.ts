// src/world/shared/washing.ts
import type { Ground } from './ground.ts'
import { distanceToSpan } from './path.ts'
import type { Waypoint } from './path.ts'

/**
 * Where the washing hangs: the middle of the line, on the green between the
 * house's low wall and the field.
 *
 * Typed in, like the shelter it belongs to, because it was chosen by
 * looking: it is in the `hero` frame under the house, on the one stretch of
 * that slope clear of the walls, the stumps and the way to the door. Which
 * way the line runs is read from the land.
 */
const GREEN: Waypoint = { x: 61.7, z: 63.9 }

/** How far apart the two poles stand, and how high a pole's head is over its own foot. */
export const SPAN   = 5.6
export const HEIGHT = 2.3

/** Half the distance over which the fall of the land under the line is measured. */
const REACH = 2

/** How far the line hangs under the poles' heads in the middle of its span. */
export const SAG = 0.14

/** A pole: where it stands, the land at its foot and the height of its head. */
export interface Pole extends Waypoint {
  readonly foot: number
  readonly top:  number
}

/**
 * The washing line, as a place on the ground.
 *
 * DOM-free and GPU-free, like the shelter: the feature hangs the washing on
 * it, the flock grazes round it, and a test can ask where it is. It runs
 * along the hill, not down it, so both poles stand at one height and what
 * hangs from it clears the grass from end to end.
 */
export interface Washing {

  /** The two poles, the first the one further up the island. */
  readonly poles: readonly [Pole, Pole]

  /** Unit direction from the first pole to the second. */
  readonly along: readonly [number, number]

  /** Where the line is, `part` (0 to 1) of the way from the first pole to the second: on the ground, and how high. */
  lineAt (part: number): { x: number, y: number, z: number }

  /** How far a place is from the line between the poles, on the ground. */
  distanceTo (x: number, z: number): number
}

export function createWashing (ground: Ground): Washing {
  const { x, z } = GREEN
  const dx       = ground.heightAt(x + REACH, z) - ground.heightAt(x - REACH, z)
  const dz       = ground.heightAt(x, z + REACH) - ground.heightAt(x, z - REACH)
  const grade    = Math.hypot(dx, dz) || 1

  // Along the contour, toward the field: the first pole is the one up the island.
  const turn  = dx > 0 ? 1 : -1
  const along = [ -dz / grade * turn, dx / grade * turn ] as const

  const stand = (side: number): Pole => {
    const px   = x + along[0] * side * SPAN / 2
    const pz   = z + along[1] * side * SPAN / 2
    const foot = ground.heightAt(px, pz)

    return { x: px, z: pz, foot, top: foot + HEIGHT }
  }

  const poles = [ stand(-1), stand(1) ] as const

  return {
    poles,
    along,

    lineAt (part) {
      return {
        x: poles[0].x + (poles[1].x - poles[0].x) * part,
        y: poles[0].top + (poles[1].top - poles[0].top) * part - SAG * 4 * part * (1 - part),
        z: poles[0].z + (poles[1].z - poles[0].z) * part,
      }
    },

    distanceTo (px, pz) {
      return distanceToSpan(px, pz, poles[0], poles[1])
    },
  }
}

// perf: trivial — six ground samples, once.
