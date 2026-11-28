// src/world/shared/burn.ts
import { smoothstep } from 'threejs-scenes/primitives'

import type { Ground } from './ground.ts'
import { distanceToSpan } from './path.ts'
import type { Path, Waypoint } from './path.ts'
import { RANGE } from './tide.ts'

/**
 * Where the burn rises: a spring under the cairn, at the head of the one
 * gully on the brae. Chosen by looking: from `hero` its water comes down the
 * middle of the picture, from under the cairn to the landing.
 */
const SPRING = { x: 21.2, z: 63.4 } as const

/** Step of the walk downhill that finds the course, and the distance between the finished course's points. */
const STRIDE  = 0.2
const SPACING = 0.6

/** Sample spacing for the land's fall, each way. */
const REACH = 0.4

/** How deep under the sea the course is followed before it stops: its last strides are under the water. */
const DROWNED = 0.45

/**
 * The landing lies where this gully meets the sea, so the burn is kept off
 * the path there, and off the slip of stones that runs up the beach from
 * the landing for `SLIP`: nearer either than `SHY` it turns aside, as hard as
 * the land's own fall at `NEAR`.
 */
const SHY  = 8.5
const NEAR = 5
const SLIP = 9

/** Half the water's width at the spring and at the sea, and what the beach adds to it as the burn spreads out over the sand. */
const HALF = [ 0.42, 0.92 ] as const
const FAN  = 0.9

/** Where the land falls less than `STILL[1]` a unit the burn slows and widens, fully at `STILL[0]`; a pool is that much wider again. */
const STILL = [ 0.22, 0.5 ] as const
const POOL  = 0.95

/** The least ground left between the water's edge and the middle of a round wall it passes (the fold's). */
const WALL_FOOT = 0.75

/** Height over the sea below which the burn is on the beach. */
const BEACH = 1.6

/** How fast the water runs, in units a second, on the level and for each unit of fall. */
const PACE  = 0.7
const HASTE = 1.9

/** Something round the water passes and must not widen into. */
type Round = Waypoint & { readonly radius: number }

/** A place on the burn: one cross-section of its water. */
export interface Reach extends Waypoint {

  /** Distance from the spring, down the water. */
  readonly along: number

  /** Seconds the water takes to get here from the spring. */
  readonly since: number

  /** Unit direction downstream. */
  readonly ahead: readonly [number, number]

  /** How far the land falls for each unit the burn runs here. */
  readonly fall: number

  /** Half the width of the water. */
  readonly half: number
}

/**
 * The burn: the island's one stream, as a line on the ground.
 *
 * Found, not drawn, like the path: from its spring it goes the way the land
 * falls, stride by stride, until it is under the sea. Where the land is
 * steep it is narrow and fast, where it eases it slows into a pool, and on
 * the sand it spreads. DOM-free and GPU-free: the feature lays the water and
 * the stones on it, the grass, the boulders and the sheep keep out of it,
 * the land keeps its crags from under it, and a test can ask where it runs.
 */
export interface Burn {

  /** Where it rises. */
  readonly spring: Waypoint

  /** The middle of its widest still water. */
  readonly pool: Reach

  /** Where it steepens most below the pool: the falls. */
  readonly falls: Reach

  /** Where it meets the sea. */
  readonly mouth: Reach

  /** Its cross-sections from the spring down, `SPACING` apart, the last few under the sea. */
  readonly reaches: readonly Reach[]
  readonly length:  number

  /** How far a place is from the middle of the water. */
  distanceTo (x: number, z: number): number
}

/** The land's fall at a place: the unit direction downhill, and the drop for each unit that way. */
type FallAtReturnType = { down: [number, number], drop: number }

function fallAt (ground: Ground, x: number, z: number): FallAtReturnType {
  const dx   = (ground.heightAt(x + REACH, z) - ground.heightAt(x - REACH, z)) / (2 * REACH)
  const dz   = (ground.heightAt(x, z + REACH) - ground.heightAt(x, z - REACH)) / (2 * REACH)
  const drop = Math.hypot(dx, dz)

  return { down: drop > 1e-6 ? [ -dx / drop, -dz / drop ] : [ 0, 1 ], drop }
}

/** Walk downhill from the spring to under the sea, leaning off the path where it comes near. */
function descend (ground: Ground, path: Path): Waypoint[] {
  const line: Waypoint[] = [{ ...SPRING }]

  // The slip, as places up the beach from the landing, a stride apart.
  const { landing } = path
  const slip        = Array.from({ length: SLIP }, (_, stride) => ({ x: landing.x - landing.seaward[0] * (stride + 1), z: landing.z - landing.seaward[1] * (stride + 1) }))
  const ways        = [ ...path.points, ...slip ]

  let { x, z } = SPRING

  // More strides than any course on this island needs: a hollow with no way
  // out would otherwise walk for ever.
  for (let stride = 0; stride < 2000 && ground.heightAt(x, z) > ground.waterLevel - RANGE - DROWNED; stride += 1) {
    const { down, drop } = fallAt(ground, x, z)
    const near           = ways.reduce((best, point) => Math.hypot(point.x - x, point.z - z) < Math.hypot(best.x - x, best.z - z) ? point : best)
    const off            = Math.hypot(x - near.x, z - near.z) || 1
    const lean           = drop * (1 - smoothstep(NEAR, SHY, off))

    // Aside only, never back up the hill: water turned by what is in its
    // way goes round it. To the side the landing is not on, all the way down.
    const aside   = (x - landing.x) * -down[1] + (z - landing.z) * down[0] < 0 ? -1 : 1
    const hx      = down[0] * drop - down[1] * aside * lean
    const hz      = down[1] * drop + down[0] * aside * lean
    const heading = Math.hypot(hx, hz) || 1

    x += hx / heading * STRIDE
    z += hz / heading * STRIDE
    line.push({ x, z })
  }

  return line
}

/** The same line at even spacing, its corners eased. */
function pace (line: readonly Waypoint[]): Waypoint[] {
  const every = Math.round(SPACING / STRIDE)
  const paced = line.filter((_, index) => index % every === 0)

  return paced.map((point, index) => {
    const before = paced[Math.max(index - 1, 0)]!
    const after  = paced[Math.min(index + 1, paced.length - 1)]!

    return { x: (before.x + point.x * 2 + after.x) / 4, z: (before.z + point.z * 2 + after.z) / 4 }
  })
}

/** A running mean over `span` neighbours each side, so the water widens and narrows over a few strides and not at one. */
function eased (values: readonly number[], span: number): number[] {
  return values.map((_, index) => {
    const from = Math.max(index - span, 0)
    const to   = Math.min(index + span, values.length - 1)

    return values.slice(from, to + 1).reduce((sum, value) => sum + value, 0) / (to - from + 1)
  })
}

export function createBurn (ground: Ground, path: Path, walls: readonly Round[] = []): Burn {
  const line   = pace(descend(ground, path))
  const height = line.map(point => ground.heightAt(point.x, point.z))
  const steps  = line.map((_, index) => {
    const next = line[Math.min(index + 1, line.length - 1)]!
    const last = line[Math.max(index - 1, 0)]!

    return Math.hypot(next.x - last.x, next.z - last.z) / (index === 0 || index === line.length - 1 ? 1 : 2)
  })

  // The fall is the land's own along the water, eased; the width follows it.
  const falls = eased(line.map((_, index) => {
    const next = Math.min(index + 1, line.length - 1)
    const last = Math.max(index - 1, 0)

    return Math.max(0, (height[last]! - height[next]!) / (steps[index]! * (next - last) || 1))
  }), 2)

  const total = steps.reduce((sum, step) => sum + step, 0) - steps[0]!

  let along = 0
  let since = 0

  const halves = eased(line.map((_, index) => {
    const down  = index / (line.length - 1)
    const still = 1 - smoothstep(STILL[0], STILL[1], falls[index]!)
    const beach = 1 - smoothstep(0, BEACH, height[index]! - ground.waterLevel)

    return (HALF[0] + (HALF[1] - HALF[0]) * down) * (1 + still * POOL) + beach * FAN
  }), 2)

  const reaches = line.map((point, index): Reach => {
    const next = line[Math.min(index + 1, line.length - 1)]!
    const last = line[Math.max(index - 1, 0)]!
    const span = Math.hypot(next.x - last.x, next.z - last.z) || 1

    if (index > 0) {
      along += steps[index]!
      since += steps[index]! / (PACE + HASTE * falls[index]!)
    }

    // A pool widens as far as the wall beside it lets it.
    const room = Math.min(...walls.map(wall => Math.hypot(point.x - wall.x, point.z - wall.z) - wall.radius - WALL_FOOT))

    return { ...point, along, since, ahead: [ (next.x - last.x) / span, (next.z - last.z) / span ], fall: falls[index]!, half: Math.min(halves[index]!, Math.max(room, HALF[0])) }
  })

  // The pool is the stillest water above the beach; the falls, the steepest below it.
  const upland  = reaches.filter((reach, index) => height[index]! - ground.waterLevel > BEACH * 2 && reach.along > 4)
  const pool    = upland.reduce((best, reach) => reach.fall < best.fall ? reach : best)
  const falling = upland.filter(reach => reach.along > pool.along).reduce((best, reach) => reach.fall > best.fall ? reach : best, pool)
  const mouth   = reaches.find((_, index) => height[index]! <= ground.waterLevel) ?? reaches.at(-1)!

  return {
    spring: { ...SPRING },
    pool,
    falls:  falling,
    mouth,
    reaches,
    length: total,

    distanceTo (x, z) {
      let nearest = Infinity

      for (let index = 1; index < reaches.length; index += 1)
        nearest = Math.min(nearest, distanceToSpan(x, z, reaches[index - 1]!, reaches[index]!))

      return nearest
    },
  }
}

// perf: cheap, once — a couple of hundred strides of two ground samples each,
// and each asks the path for its nearest point. `distanceTo` is some sixty
// spans: ask it at build time, not per frame.
