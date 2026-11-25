// src/world/shared/mill.ts
import type { Burn, Reach } from './burn.ts'
import type { Ground } from './ground.ts'
import type { Infield } from './infield.ts'
import { distanceToSpan } from './path.ts'
import type { Path, Waypoint } from './path.ts'

/**
 * How far up the burn from the middle of its pool the mill's own water is:
 * on the last of the fall above the still water, so the wheel has the
 * burn's weight and the tail-race drops straight into the pool. Chosen by
 * looking, like the shelter's site: from `hero` the mill stands in the
 * middle of the picture, under the spring and the cairn, clear of the fold
 * on one side and the path on the other.
 */
const ABOVE_POOL = 4.3

/** The walls' outer line: along the ridge of the roof, which lies across the burn, and across it, down the burn. */
export const MILL_LONG = 4.8
export const MILL_DEEP = 3.6

/**
 * Where the burn goes under, along the ridge from the middle of the floor:
 * toward the path's end of the house, so the room's other end is the
 * miller's, and its door.
 */
export const MILL_RACE = -0.9

/** Height of the hole the burn comes in by, under the wall it meets first: the floor is that far over the water there. */
export const MILL_INLET = 0.7

/** Where along the upstream wall the door is, from the middle of it. */
export const MILL_DOOR = 1.25

/** How far out of the door its step lies. */
const STEP = 0.8

/**
 * The bridge: slabs over the burn where it goes in under the wall, so the
 * way to the door crosses dry. How far out from the wall's line its middle
 * lies, and half the length of its slabs.
 */
const BRIDGE_OUT  = 1.15
const BRIDGE_HALF = 1.25

/** How far past each end of the bridge the way to the door runs before it turns, and the distance between the way's points. */
const LANDED = 0.7
const PACE   = 0.5

/** Half the gap the head-dyke leaves for the burn, measured along the wall. */
const GATE_HALF = 1.15

/** A slab laid over the burn: its middle, the way it lies from the path's bank to the door's, and half its length. */
export interface Bridge extends Waypoint {
  readonly along: readonly [number, number]
  readonly half:  number
}

/** Where the burn goes under the head-dyke: a gap in the wall, hung with poles so the flock cannot follow the water through. */
export interface WaterGate extends Waypoint {

  /** Unit direction along the wall there. */
  readonly along: readonly [number, number]

  /** Half the width of the gap. */
  readonly half: number
}

/**
 * The mill, as a place on the ground.
 *
 * A click mill: one small room over the burn, its wheel lying flat under the
 * floor, turned by the water that comes in under one wall and goes out under
 * the other. DOM-free and GPU-free, like the shelter: the feature builds on
 * it, everything that grows or grazes keeps off it, the terrain wears the
 * way to its door, and a test can ask where it is. Its own frame is `fall`
 * (down the burn, at right angles to the ridge) and `ridge` (across the
 * burn), both measured from the middle of the floor.
 */
export interface Mill extends Waypoint {

  /** World height of the floor. */
  readonly floor: number

  /** Unit direction down the burn. */
  readonly fall: readonly [number, number]

  /** Unit direction along the ridge, across the burn. */
  readonly ridge: readonly [number, number]

  /** The turn about the vertical that takes a mesh's own x and z to `fall` and `ridge`. */
  readonly yaw: number

  /** Distances down the burn between which its water is under the roof. */
  readonly under: readonly [number, number]

  /** The trodden way to the door: from where it leaves the path, over the bridge, to the step. */
  readonly spur: readonly Waypoint[]

  /** The slabs the way to the door crosses the burn on, at the foot of the wall the water goes in under. */
  readonly bridge: Bridge

  /** The gap in the head-dyke the burn goes through, below the mill. */
  readonly gate: WaterGate

  /** A place given in the mill's own frame, on the ground. */
  place (across: number, along: number): Waypoint

  /** How far a place is from the walls. Nothing, inside them. */
  distanceTo (x: number, z: number): number

  /** How far a place is from the middle of the way to the door. */
  distanceToSpur (x: number, z: number): number
}

/** The reach nearest a distance down the burn. */
function reachAt (burn: Burn, along: number): Reach {
  return burn.reaches.reduce((best, reach) => Math.abs(reach.along - along) < Math.abs(best.along - along) ? reach : best)
}

/** Where the burn crosses a wall: the reach nearest one, and the way the wall runs there. */
function findGate (burn: Burn, infield: Infield): WaterGate {
  const reach = burn.reaches.reduce((best, each) => infield.distanceTo(each.x, each.z) < infield.distanceTo(best.x, best.z) ? each : best)

  let along   = [ 1, 0 ] as readonly [number, number]
  let nearest = Infinity

  for (const run of infield.runs)
    for (let index = 1; index < run.length; index += 1) {
      const from = run[index - 1]!
      const to   = run[index]!
      const away = distanceToSpan(reach.x, reach.z, from, to)
      const span = Math.hypot(to.x - from.x, to.z - from.z) || 1

      if (away < nearest) {
        nearest = away
        along   = [ (to.x - from.x) / span, (to.z - from.z) / span ]
      }
    }

  return { x: reach.x, z: reach.z, along, half: GATE_HALF }
}

/** A line through `stops`, with a point every `PACE` or so. */
function pace (stops: readonly Waypoint[]): Waypoint[] {
  const line = [ stops[0]! ]

  for (let index = 1; index < stops.length; index += 1) {
    const from  = stops[index - 1]!
    const to    = stops[index]!
    const spans = Math.max(1, Math.round(Math.hypot(to.x - from.x, to.z - from.z) / PACE))

    for (let span = 1; span <= spans; span += 1)
      line.push({ x: from.x + (to.x - from.x) * span / spans, z: from.z + (to.z - from.z) * span / spans })
  }

  return line
}

export function createMill (ground: Ground, path: Path, burn: Burn, infield: Infield): Mill {
  const middle = reachAt(burn, burn.pool.along - ABOVE_POOL)
  const above  = reachAt(burn, middle.along - MILL_DEEP / 2)
  const below  = reachAt(burn, middle.along + MILL_DEEP / 2)
  const span   = Math.hypot(below.x - above.x, below.z - above.z) || 1

  // Square to the water where it goes under: the ridge lies across the burn.
  const fall  = [ (below.x - above.x) / span, (below.z - above.z) / span ] as const
  const ridge = [ -fall[1], fall[0] ] as const
  const x     = (above.x + below.x) / 2 - ridge[0] * MILL_RACE
  const z     = (above.z + below.z) / 2 - ridge[1] * MILL_RACE

  const place = (across: number, along: number): Waypoint => ({ x: x + fall[0] * across + ridge[0] * along, z: z + fall[1] * across + ridge[1] * along })
  const wet   = place(-MILL_DEEP / 2, MILL_RACE)

  // The bridge lies along the wall, over the water, from the bank the path
  // is on to the bank the door is on.
  const out    = -MILL_DEEP / 2 - BRIDGE_OUT
  const bridge = { ...place(out, MILL_RACE), along: ridge, half: BRIDGE_HALF }
  const near   = place(out, MILL_RACE - BRIDGE_HALF - LANDED)
  const join   = path.points.reduce((best, point) => Math.hypot(point.x - near.x, point.z - near.z) < Math.hypot(best.x - near.x, best.z - near.z) ? point : best)
  const spur   = pace([ join, near, place(out, MILL_RACE + BRIDGE_HALF + LANDED * 0.4), place(-MILL_DEEP / 2 - STEP, MILL_DOOR) ])

  return {
    x,
    z,
    fall,
    ridge,
    spur,
    bridge,
    place,
    floor: ground.heightAt(wet.x, wet.z) + MILL_INLET,
    yaw:   Math.atan2(ridge[0], ridge[1]),
    under: [ middle.along - MILL_DEEP / 2, middle.along + MILL_DEEP / 2 ],
    gate:  findGate(burn, infield),

    distanceTo (px, pz) {
      const across = (px - x) * fall[0] + (pz - z) * fall[1]
      const along  = (px - x) * ridge[0] + (pz - z) * ridge[1]

      return Math.hypot(Math.max(0, Math.abs(across) - MILL_DEEP / 2), Math.max(0, Math.abs(along) - MILL_LONG / 2))
    },

    distanceToSpur (px, pz) {
      let nearest = Infinity

      for (let index = 1; index < spur.length; index += 1)
        nearest = Math.min(nearest, distanceToSpan(px, pz, spur[index - 1]!, spur[index]!))

      return nearest
    },
  }
}

// perf: trivial — a few passes over the burn's sixty reaches and the walls'
// forty spans, once. `distanceTo` is a rectangle; `distanceToSpur` twenty spans.
